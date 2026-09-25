package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.cliente.CrearReservaRequest;
import com.wimbledon.backend.cliente.ReservaResponse;
import com.wimbledon.backend.cliente.ReservaService;
import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Lógica de negocio del módulo de Recepción.
 *
 * Principio rector: la recepcionista ve SOLO lo que necesita para hacer
 * su trabajo en el turno actual. NUNCA el historial completo de un cliente.
 */
@Service
@RequiredArgsConstructor
public class RecepcionService {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaService reservaService;

    /**
     * Estados que Recepción puede asignar a una habitación.
     * EN_PROCESO y LISTA son exclusivos de Limpieza.
     * MANTENIMIENTO es exclusivo de Admin.
     */
    private static final Set<EstadoHabitacion> ESTADOS_PERMITIDOS_RECEPCION = Set.of(
            EstadoHabitacion.OCUPADA,
            EstadoHabitacion.DISPONIBLE,
            EstadoHabitacion.LIMPIEZA_PENDIENTE
    );

    // ── Agenda del día ────────────────────────────────────────────────────────

    /**
     * Lista las reservas del día actual (o de la fecha indicada).
     * Devuelve SOLO los datos operativos de cada reserva —
     * sin email, sin teléfono, sin historial previo del cliente.
     */
    public List<AgendaItemResponse> agendaDelDia() {
        return reservaRepository.findAgendaDelDia(LocalDate.now())
                .stream()
                .map(this::toAgendaItem)
                .toList();
    }

    public List<AgendaItemResponse> agendaDeFecha(LocalDate fecha) {
        return reservaRepository.findAgendaDelDia(fecha)
                .stream()
                .map(this::toAgendaItem)
                .toList();
    }

    // ── Check-in con QR ───────────────────────────────────────────────────────

    /**
     * Valida el token QR escaneado y realiza el check-in.
     *
     * Validaciones:
     *  - El token debe existir en la BD
     *  - El QR no debe haber sido usado antes
     *  - La reserva no debe estar cancelada ni finalizada
     *
     * Efecto secundario: marca la habitación como OCUPADA automáticamente.
     */
    @Transactional
    public CheckinResponse realizarCheckin(String token) {
        Reserva reserva = reservaRepository.findByQrToken(token)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Código QR no reconocido. Verifica el código e inténtalo de nuevo."));

        if (reserva.getQrUsado()) {
            throw new IllegalStateException(
                    "Este código ya fue utilizado para un check-in previo.");
        }

        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            throw new IllegalStateException("Esta reserva fue cancelada.");
        }

        if (reserva.getEstado() == EstadoReserva.FINALIZADA) {
            throw new IllegalStateException("Esta reserva ya fue finalizada.");
        }

        // Actualizar estado de la reserva
        reserva.setEstado(EstadoReserva.CHECKIN);
        reserva.setQrUsado(true);
        reservaRepository.save(reserva);

        // Marcar la habitación como ocupada automáticamente
        Habitacion habitacion = reserva.getHabitacion();
        habitacion.setEstado(EstadoHabitacion.OCUPADA);
        habitacionRepository.save(habitacion);

        return new CheckinResponse(
                reserva.getNombreHuesped(),
                habitacion.getNombre(),
                reserva.getHoraIngreso(),
                reserva.getHoraSalida(),
                "Bienvenido/a. Check-in completado exitosamente."
        );
    }

    // ── Reserva manual (walk-in / telefónica) ─────────────────────────────────

    /**
     * Crea una reserva walk-in o telefónica desde recepción.
     * Reutiliza el flujo completo del cliente (validación de horario + QR + correo).
     * La diferencia es que el origen queda registrado como MANUAL.
     */
    @Transactional
    public ReservaResponse crearReservaManual(CrearReservaRequest request) {
        return reservaService.crearReservaManual(request);
    }

    /**
     * Confirma una reserva pendiente desde el counter de Recepción (ej. tras pago presencial o verificación).
     */
    @Transactional
    public ReservaResponse confirmarReserva(Integer reservaId) {
        return reservaService.confirmarReserva(reservaId);
    }

    // ── Estado de habitación ──────────────────────────────────────────────────

    /**
     * Actualiza el estado de una habitación desde Recepción.
     *
     * Estados permitidos para este rol:
     *  OCUPADA           → huésped ingresó (normalmente automático en check-in)
     *  DISPONIBLE        → reset manual tras check-out
     *  LIMPIEZA_PENDIENTE → la habitación necesita limpieza
     *
     * No se permite: EN_PROCESO, LISTA (Limpieza), MANTENIMIENTO (Admin).
     */
    @Transactional
    public void actualizarEstadoHabitacion(Integer habitacionId, EstadoHabitacion nuevoEstado) {
        if (!ESTADOS_PERMITIDOS_RECEPCION.contains(nuevoEstado)) {
            throw new IllegalArgumentException(
                    "Recepción no puede asignar el estado '" + nuevoEstado.name() + "'. " +
                    "Estados permitidos: OCUPADA, DISPONIBLE, LIMPIEZA_PENDIENTE.");
        }

        Habitacion habitacion = habitacionRepository.findById(habitacionId)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada."));

        EstadoHabitacion actual = habitacion.getEstado();
        if (actual == EstadoHabitacion.MANTENIMIENTO && nuevoEstado != EstadoHabitacion.MANTENIMIENTO) {
            throw new IllegalStateException("La habitación está en mantenimiento y no puede ser alterada desde Recepción.");
        }
        if ((actual == EstadoHabitacion.LIMPIEZA_PENDIENTE || actual == EstadoHabitacion.EN_PROCESO) && nuevoEstado == EstadoHabitacion.OCUPADA) {
            throw new IllegalStateException("La habitación requiere aseo o desinfección antes de ser ocupada.");
        }

        habitacion.setEstado(nuevoEstado);
        habitacionRepository.save(habitacion);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AgendaItemResponse toAgendaItem(Reserva r) {
        return new AgendaItemResponse(
                r.getId(),
                r.getNombreHuesped(),
                r.getHabitacion().getNombre(),
                r.getHabitacion().getTipo(),
                r.getHoraIngreso(),
                r.getHoraSalida(),
                r.getEstado(),
                r.getOrigen(),
                r.getQrUsado()
        );
    }
}
