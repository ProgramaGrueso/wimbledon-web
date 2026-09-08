package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import com.wimbledon.backend.reserva.ReservaConfirmacionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Servicio principal del módulo de Cliente.
 *
 * Responsabilidades:
 *  - Catálogo público (sin auth)
 *  - Crear reservas (con o sin cuenta — privacidad first)
 *  - Historial del cliente autenticado (ficha propia)
 *  - Reprogramar y cancelar con ventana de tiempo parametrizable
 */
@Service
@RequiredArgsConstructor
public class ReservaService {

    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final ReservaConfirmacionService confirmacionService;

    /**
     * Horas mínimas previas al ingreso para poder cancelar o reprogramar.
     * Configurado en application.properties (wimbledon.reservas.horas-cancelacion).
     */
    @Value("${wimbledon.reservas.horas-cancelacion:2}")
    private int horasCancelacion;

    // ── Catálogo público ──────────────────────────────────────────────────────

    /**
     * Lista todas las habitaciones disponibles para el portal público.
     * No requiere autenticación.
     */
    public List<HabitacionPublicaResponse> listarHabitacionesDisponibles() {
        return habitacionRepository.findByEstado(EstadoHabitacion.DISPONIBLE)
                .stream()
                .map(this::toHabitacionPublica)
                .toList();
    }

    /** Lista todas las habitaciones (disponibles o no) para el catálogo completo. */
    public List<HabitacionPublicaResponse> listarTodasLasHabitaciones() {
        return habitacionRepository.findAll()
                .stream()
                .map(this::toHabitacionPublica)
                .toList();
    }

    // ── Crear reserva ─────────────────────────────────────────────────────────

    /**
     * Crea una reserva desde el portal web del cliente (origen ONLINE).
     * @param cliente usuario autenticado o null (invitado sin cuenta)
     */
    @Transactional
    public ReservaResponse crearReserva(CrearReservaRequest request, Usuario cliente) {
        return crearReservaConOrigen(request, cliente, OrigenReserva.ONLINE);
    }

    /**
     * Crea una reserva desde Recepción (walk-in / telefónica → origen MANUAL).
     * El huésped no necesita cuenta registrada; la reserva se asocia solo por email.
     * Se reutiliza el mismo flujo de QR + correo que una reserva online.
     */
    @Transactional
    public ReservaResponse crearReservaManual(CrearReservaRequest request) {
        // En reservas manuales, cliente_id siempre es null (es el staff quien crea,
        // no el huésped quien tiene cuenta)
        return crearReservaConOrigen(request, null, OrigenReserva.MANUAL);
    }

    /**
     * Método interno compartido por los flujos online y manual.
     */
    @Transactional
    public ReservaResponse crearReservaConOrigen(
            CrearReservaRequest request,
            Usuario cliente,
            OrigenReserva origen
    ) {
        Habitacion habitacion = habitacionRepository.findById(request.habitacionId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "No encontramos esa habitación. Intenta con otra opción."));

        LocalTime horaSalida = request.horaIngreso()
                .plusHours(habitacion.getDuracionBloqueHoras());

        boolean solapado = reservaRepository.existeSolapamiento(
                habitacion.getId(),
                request.fecha(),
                request.horaIngreso(),
                horaSalida);

        if (solapado) {
            throw new IllegalArgumentException(
                    "Ese horario ya está ocupado. Por favor elige otro bloque.");
        }

        String qrToken = UUID.randomUUID().toString();

        Reserva nuevaReserva = Reserva.builder()
                .habitacion(habitacion)
                .cliente(cliente)
                .nombreHuesped(request.nombreCompleto())
                .telefono(request.telefono())
                .email(request.email())
                .fecha(request.fecha())
                .horaIngreso(request.horaIngreso())
                .horaSalida(horaSalida)
                .notas(request.notas())
                .estado(EstadoReserva.CONFIRMADA)
                .origen(origen)
                .qrToken(qrToken)
                .qrUsado(false)
                .build();

        Reserva guardada = reservaRepository.save(nuevaReserva);
        confirmacionService.enviarConfirmacion(guardada);
        return ReservaResponse.from(guardada);
    }


    // ── Historial del cliente ─────────────────────────────────────────────────

    /**
     * Devuelve las reservas del cliente autenticado (ficha propia).
     * SOLO accesible para el propio cliente — nunca para Recepcionistas.
     */
    public List<ReservaResponse> misReservas(Usuario cliente) {
        return reservaRepository.findByClienteOrderByCreadoEnDesc(cliente)
                .stream()
                .map(ReservaResponse::from)
                .toList();
    }

    // ── Reprogramar ───────────────────────────────────────────────────────────

    /**
     * Reprograma una reserva existente del cliente autenticado.
     * Solo permitido si faltan más de `horasCancelacion` horas al ingreso.
     */
    @Transactional
    public ReservaResponse reprogramarReserva(
            Integer reservaId,
            ReprogramarReservaRequest request,
            Usuario cliente
    ) {
        Reserva reserva = buscarReservaPropia(reservaId, cliente);
        validarVentanaDeTiempo(reserva, "reprogramar");

        // Recalcular hora de salida con el bloque de la habitación
        LocalTime nuevaHoraSalida = request.horaIngreso()
                .plusHours(reserva.getHabitacion().getDuracionBloqueHoras());

        // Verificar disponibilidad del nuevo horario (excluyendo la reserva actual)
        boolean solapado = reservaRepository.existeSolapamiento(
                reserva.getHabitacion().getId(),
                request.fecha(),
                request.horaIngreso(),
                nuevaHoraSalida);

        if (solapado) {
            throw new IllegalArgumentException(
                    "Ese nuevo horario ya está ocupado. Por favor elige otro bloque.");
        }

        reserva.setFecha(request.fecha());
        reserva.setHoraIngreso(request.horaIngreso());
        reserva.setHoraSalida(nuevaHoraSalida);
        // Generar nuevo token para que el QR anterior quede inválido
        reserva.setQrToken(UUID.randomUUID().toString());
        reserva.setQrUsado(false);

        Reserva actualizada = reservaRepository.save(reserva);

        // Reenviar confirmación con el nuevo QR
        confirmacionService.enviarConfirmacion(actualizada);

        return ReservaResponse.from(actualizada);
    }

    // ── Cancelar ──────────────────────────────────────────────────────────────

    /**
     * Cancela una reserva del cliente autenticado.
     * Solo permitido si faltan más de `horasCancelacion` horas al ingreso.
     */
    @Transactional
    public void cancelarReserva(Integer reservaId, Usuario cliente) {
        Reserva reserva = buscarReservaPropia(reservaId, cliente);
        validarVentanaDeTiempo(reserva, "cancelar");

        reserva.setEstado(EstadoReserva.CANCELADA);
        reservaRepository.save(reserva);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Busca la reserva y verifica que pertenezca al cliente autenticado.
     * Si no existe o no es suya → EntityNotFoundException (sin revelar si existe de otro usuario).
     */
    private Reserva buscarReservaPropia(Integer reservaId, Usuario cliente) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No encontramos esa reserva."));

        // Verificar que la reserva pertenece al cliente autenticado
        boolean esPropia = (reserva.getCliente() != null &&
                reserva.getCliente().getId().equals(cliente.getId()))
                || reserva.getEmail().equalsIgnoreCase(cliente.getEmail());

        if (!esPropia) {
            // Respuesta igual que "no encontrada" para no filtrar información
            throw new EntityNotFoundException("No encontramos esa reserva.");
        }

        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            throw new IllegalStateException("Esta reserva ya fue cancelada.");
        }

        return reserva;
    }

    /**
     * Valida que aún esté dentro de la ventana permitida para modificar la reserva.
     * La ventana se configura en wimbledon.reservas.horas-cancelacion (default: 2 h).
     */
    private void validarVentanaDeTiempo(Reserva reserva, String accion) {
        LocalDateTime momentoIngreso = LocalDateTime.of(reserva.getFecha(), reserva.getHoraIngreso());
        LocalDateTime limiteModificacion = momentoIngreso.minusHours(horasCancelacion);

        if (LocalDateTime.now().isAfter(limiteModificacion)) {
            throw new IllegalArgumentException(
                    "Solo puedes " + accion + " tu reserva hasta " + horasCancelacion +
                    " hora(s) antes del ingreso.");
        }
    }

    private HabitacionPublicaResponse toHabitacionPublica(Habitacion h) {
        return new HabitacionPublicaResponse(
                h.getId(),
                h.getNombre(),
                h.getTipo(),
                h.getDescripcion(),
                h.getTarifaBase(),
                h.getDuracionBloqueHoras(),
                h.getEstado(),
                h.getImagenUrl()
        );
    }
}
