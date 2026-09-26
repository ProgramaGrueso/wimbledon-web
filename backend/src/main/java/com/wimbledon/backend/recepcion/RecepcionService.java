package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.cliente.CrearReservaRequest;
import com.wimbledon.backend.cliente.ReservaResponse;
import com.wimbledon.backend.cliente.ReservaService;
import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
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
    private final CheckinService checkinService;

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
     * Delega en {@link CheckinService}, que es la ruta de consumo compartida con
     * \`GET /api/checkin/validar/{token}\`. NO lleva \`@Transactional\` propio a
     * proposito: envolver la unidad transaccional de \`OperacionConsumoCheckin\`
     * en una transaccion anidada ocultaria la frontera del bloqueo de fila, que
     * es la garantia que hace unico el consumo.
     *
     * @deprecated El controlador ya invoca {@link CheckinService#consumir}
     *             directamente. Este metodo se conserva como punto de entrada
     *             unico del bloque de check-in dentro de este servicio; no tiene
     *             llamadores y es candidato a retirada en un hito propio.
     */
    public CheckinResponse realizarCheckin(String token, OperadorOperacion operador) {
        return checkinService.consumir(token, operador);
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
        if (nuevoEstado == EstadoHabitacion.OCUPADA) {
            exigirAseoPrevio(actual);
        }

        habitacion.setEstado(nuevoEstado);
        habitacionRepository.save(habitacion);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Invariante de aseo previo: nunca se escribe OCUPADA sobre una habitacion
     * que requiere limpieza o desinfeccion.
     *
     * Se extrajo como metodo para que {@link OperacionConsumoCheckin} comparta
     * exactamente la misma regla, en vez de duplicarla. Su semantica en
     * {@code actualizarEstadoHabitacion} no cambia: el mensaje de rechazo es el
     * mismo texto libre de siempre, que alli sigue produciendose por el
     * manejador generico de IllegalStateException con CONFLITO_ESTADO.
     */
    static void exigirAseoPrevio(EstadoHabitacion actual) {
        if (actual == EstadoHabitacion.LIMPIEZA_PENDIENTE || actual == EstadoHabitacion.EN_PROCESO) {
            throw new IllegalStateException("La habitación requiere aseo o desinfección antes de ser ocupada.");
        }
    }

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
