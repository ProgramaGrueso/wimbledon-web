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

    /**
     * Ventana de confirmación en minutos para reservas en estado PENDIENTE.
     * Pasado este tiempo sin confirmarse, el scheduler las cancela automáticamente.
     */
    @Value("${wimbledon.reservas.ventana-confirmacion-minutos:30}")
    private int ventanaConfirmacionMinutos;

    /**
     * Margen mínimo en minutos previo a la hora de ingreso para permitir reserva online y techo de expiración.
     */
    @Value("${wimbledon.reservas.margen-minimo-minutos:5}")
    private int margenMinimoMinutos;

    /**
     * Número máximo de reservas simultáneas en estado PENDIENTE por email/teléfono.
     */
    @Value("${wimbledon.reservas.max-pendientes:2}")
    private int maxPendientesPorUsuario;

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

    /**
     * Catálogo público con evaluación de disponibilidad real según fecha y hora seleccionada.
     * No confunde el estado físico actual (ej. OCUPADA en este momento) con la disponibilidad futura.
     */
    public List<HabitacionPublicaResponse> listarHabitacionesConDisponibilidad(
            LocalDate fecha,
            LocalTime horaIngreso,
            Integer duracionHoras
    ) {
        List<Habitacion> habitaciones = habitacionRepository.findAll();
        return habitaciones.stream().map(h -> {
            boolean disponible;
            if (h.getEstado() == EstadoHabitacion.MANTENIMIENTO) {
                disponible = false;
            } else if (fecha != null && horaIngreso != null) {
                int duracion = (duracionHoras != null && duracionHoras > 0)
                        ? duracionHoras
                        : h.getDuracionBloqueHoras();
                LocalTime horaSalida = horaIngreso.plusHours(duracion);
                long solapadas = reservaRepository.contarReservasSolapadas(h.getId(), fecha, horaIngreso, horaSalida, null);
                int capacidad = h.getCapacidadUnidades() != null ? h.getCapacidadUnidades() : 1;
                disponible = (solapadas < capacidad);
            } else {
                disponible = (h.getEstado() == EstadoHabitacion.DISPONIBLE);
            }
            return new HabitacionPublicaResponse(
                    h.getId(),
                    h.getNombre(),
                    h.getTipo(),
                    h.getDescripcion(),
                    h.getTarifaBase(),
                    h.getDuracionBloqueHoras(),
                    h.getEstado(),
                    h.getImagenUrl(),
                    disponible
            );
        }).toList();
    }

    // ── Crear reserva ─────────────────────────────────────────────────────────

    /**
     * Crea una reserva desde el portal web del cliente (origen ONLINE).
     * Nace en estado PENDIENTE con una ventana de confirmación (ej. 30 min).
     * @param cliente usuario autenticado o null (invitado sin cuenta)
     */
    @Transactional
    public ReservaResponse crearReserva(CrearReservaRequest request, Usuario cliente) {
        return crearReservaConOrigen(request, cliente, OrigenReserva.ONLINE);
    }

    /**
     * Crea una reserva desde Recepción (walk-in / telefónica → origen MANUAL).
     * El huésped no necesita cuenta registrada; la reserva se asocia solo por email.
     * En mostrador se marca CONFIRMADA si el pago se realiza en el acto.
     */
    @Transactional
    public ReservaResponse crearReservaManual(CrearReservaRequest request) {
        return crearReservaConOrigen(request, null, OrigenReserva.MANUAL);
    }

    /**
     * Método interno compartido por los flujos online y manual.
     * Implementa bloqueo pesimista en la habitación para evitar condiciones de carrera,
     * validación de solapamiento por capacidad de inventario, límites anti-abuso de reservas pendientes
     * y ventana de expiración con techo relativo al momento de ingreso.
     */
    @Transactional
    public ReservaResponse crearReservaConOrigen(
            CrearReservaRequest request,
            Usuario cliente,
            OrigenReserva origen
    ) {
        // Control anti-abuso: límite de reservas PENDIENTE activas por email y teléfono
        long pendientesEmail = reservaRepository.countByEmailAndEstado(request.email(), EstadoReserva.PENDIENTE);
        if (pendientesEmail >= maxPendientesPorUsuario) {
            throw new IllegalStateException(
                    "Ya cuentas con " + pendientesEmail + " reserva(s) pendiente(s) de confirmación. " +
                    "Por favor confirma o cancela tu reserva anterior antes de solicitar una nueva.");
        }

        if (request.telefono() != null && !request.telefono().isBlank()) {
            long pendientesTel = reservaRepository.countByTelefonoAndEstado(request.telefono(), EstadoReserva.PENDIENTE);
            if (pendientesTel >= maxPendientesPorUsuario) {
                throw new IllegalStateException(
                        "El teléfono indicado ya registra el número máximo de reservas pendientes activas.");
            }
        }

        LocalDateTime momentoIngreso = LocalDateTime.of(request.fecha(), request.horaIngreso());
        LocalDateTime ahora = LocalDateTime.now();

        if (origen == OrigenReserva.ONLINE) {
            long minutosHastaIngreso = java.time.Duration.between(ahora, momentoIngreso).toMinutes();
            if (minutosHastaIngreso < margenMinimoMinutos) {
                throw new IllegalArgumentException(
                        "El horario seleccionado está demasiado próximo para ser reservado online (menos de " +
                        margenMinimoMinutos + " minutos). Por favor acércate directamente a la Recepción del hotel.");
            }
        }

        // Bloqueo pesimista sobre el tipo de habitación para ejecución atómica de contarReservasSolapadas e insert
        Habitacion habitacion = habitacionRepository.findByIdWithLock(request.habitacionId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "No encontramos esa habitación. Intenta con otra opción."));

        if (habitacion.getEstado() == EstadoHabitacion.MANTENIMIENTO) {
            throw new IllegalStateException("La habitación seleccionada se encuentra en mantenimiento y no puede ser reservada.");
        }

        LocalTime horaSalida = request.horaIngreso()
                .plusHours(habitacion.getDuracionBloqueHoras());

        long solapadas = reservaRepository.contarReservasSolapadas(
                habitacion.getId(),
                request.fecha(),
                request.horaIngreso(),
                horaSalida,
                null);

        int capacidad = habitacion.getCapacidadUnidades() != null ? habitacion.getCapacidadUnidades() : 1;
        if (solapadas >= capacidad) {
            throw new IllegalArgumentException(
                    "La habitación seleccionada ya no cuenta con disponibilidad en el horario elegido (" +
                    solapadas + " de " + capacidad + " unidades ocupadas). Por favor selecciona otro bloque o tipo de suite.");
        }

        String qrToken = UUID.randomUUID().toString();

        // Reservas online nacen PENDIENTE con expiración dinámica (techo al ingreso)
        // Reservas manuales en counter se confirman directamente
        EstadoReserva estadoInicial = (origen == OrigenReserva.ONLINE)
                ? EstadoReserva.PENDIENTE
                : EstadoReserva.CONFIRMADA;

        LocalDateTime expiraEn = null;
        if (estadoInicial == EstadoReserva.PENDIENTE) {
            LocalDateTime expiraVentana = ahora.plusMinutes(ventanaConfirmacionMinutos);
            LocalDateTime expiraMargen = momentoIngreso.minusMinutes(margenMinimoMinutos);
            expiraEn = expiraVentana.isBefore(expiraMargen) ? expiraVentana : expiraMargen;
        }

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
                .estado(estadoInicial)
                .origen(origen)
                .qrToken(qrToken)
                .qrUsado(false)
                .expiraEn(expiraEn)
                .montoTotal(habitacion.getTarifaBase())
                .adelanto(java.math.BigDecimal.ZERO)
                .build();

        Reserva guardada = reservaRepository.save(nuevaReserva);

        // Notificación y emisión de QR únicamente cuando la reserva pasa a CONFIRMADA
        if (guardada.getEstado() == EstadoReserva.CONFIRMADA) {
            confirmacionService.enviarConfirmacion(guardada);
        }

        return ReservaResponse.from(guardada);
    }

    // ── Confirmar reserva ─────────────────────────────────────────────────────

    /**
     * Confirma una reserva que se encuentra en estado PENDIENTE.
     * Valida que no haya caducado su ventana de tiempo.
     * Al confirmar, se despacha el correo con el código QR oficial.
     */
    @Transactional
    public ReservaResponse confirmarReserva(Integer reservaId) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new EntityNotFoundException("No encontramos esa reserva."));

        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            throw new IllegalStateException("La reserva ya se encuentra cancelada y el bloque fue liberado.");
        }

        if (reserva.getEstado() == EstadoReserva.CONFIRMADA ||
            reserva.getEstado() == EstadoReserva.CHECKIN ||
            reserva.getEstado() == EstadoReserva.FINALIZADA) {
            return ReservaResponse.from(reserva);
        }

        if (reserva.getExpiraEn() != null && LocalDateTime.now().isAfter(reserva.getExpiraEn())) {
            reserva.setEstado(EstadoReserva.CANCELADA);
            reservaRepository.save(reserva);
            throw new IllegalStateException("La ventana de confirmación ha expirado. Por favor realiza una nueva reserva.");
        }

        reserva.setEstado(EstadoReserva.CONFIRMADA);
        reserva.setExpiraEn(null);
        Reserva actualizada = reservaRepository.save(reserva);

        confirmacionService.enviarConfirmacion(actualizada);
        return ReservaResponse.from(actualizada);
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
     * Bloquea la habitación (tipo) con PESSIMISTIC_WRITE y verifica que el conteo
     * de reservas solapadas en el nuevo horario (excluyendo la propia reserva actual)
     * no alcance ni supere la capacidadUnidades del tipo.
     */
    @Transactional
    public ReservaResponse reprogramarReserva(
            Integer reservaId,
            ReprogramarReservaRequest request,
            Usuario cliente
    ) {
        Reserva reserva = buscarReservaPropia(reservaId, cliente);
        validarVentanaDeTiempo(reserva, "reprogramar");

        // Bloqueo pesimista sobre el tipo de habitación para evitar condiciones de carrera
        Habitacion habitacion = habitacionRepository.findByIdWithLock(reserva.getHabitacion().getId())
                .orElseThrow(() -> new EntityNotFoundException("No encontramos esa habitación."));

        if (habitacion.getEstado() == EstadoHabitacion.MANTENIMIENTO) {
            throw new IllegalStateException("La habitación seleccionada se encuentra en mantenimiento y no puede recibir reservas.");
        }

        LocalDateTime nuevoMomentoIngreso = LocalDateTime.of(request.fecha(), request.horaIngreso());
        LocalDateTime ahora = LocalDateTime.now();

        long minutosHastaIngreso = java.time.Duration.between(ahora, nuevoMomentoIngreso).toMinutes();
        if (minutosHastaIngreso < margenMinimoMinutos) {
            throw new IllegalArgumentException(
                    "El horario seleccionado está demasiado próximo para ser reservado online (menos de " +
                    margenMinimoMinutos + " minutos). Por favor acércate directamente a la Recepción del hotel.");
        }

        // Recalcular hora de salida con el bloque de la habitación
        LocalTime nuevaHoraSalida = request.horaIngreso()
                .plusHours(habitacion.getDuracionBloqueHoras());

        // Contar reservas solapadas en el nuevo horario, EXCLUYENDO la reserva actual (reservaId)
        long solapadas = reservaRepository.contarReservasSolapadas(
                habitacion.getId(),
                request.fecha(),
                request.horaIngreso(),
                nuevaHoraSalida,
                reserva.getId()
        );

        int capacidad = habitacion.getCapacidadUnidades() != null ? habitacion.getCapacidadUnidades() : 1;
        if (solapadas >= capacidad) {
            throw new IllegalArgumentException(
                    "Ese nuevo horario ya no cuenta con disponibilidad para este tipo de suite (" +
                    solapadas + " de " + capacidad + " unidades ocupadas). Por favor elige otro bloque.");
        }

        // Si la reserva aún está PENDIENTE, se recalcula su ventana de expiración con el nuevo horario
        if (reserva.getEstado() == EstadoReserva.PENDIENTE) {
            LocalDateTime expiraVentana = ahora.plusMinutes(ventanaConfirmacionMinutos);
            LocalDateTime expiraMargen = nuevoMomentoIngreso.minusMinutes(margenMinimoMinutos);
            reserva.setExpiraEn(expiraVentana.isBefore(expiraMargen) ? expiraVentana : expiraMargen);
        }

        reserva.setFecha(request.fecha());
        reserva.setHoraIngreso(request.horaIngreso());
        reserva.setHoraSalida(nuevaHoraSalida);
        // Generar nuevo token para que el QR anterior quede inválido
        reserva.setQrToken(UUID.randomUUID().toString());
        reserva.setQrUsado(false);

        Reserva actualizada = reservaRepository.save(reserva);

        // Reenviar confirmación con el nuevo QR solo si la reserva ya está formalmente confirmada
        if (actualizada.getEstado() == EstadoReserva.CONFIRMADA) {
            confirmacionService.enviarConfirmacion(actualizada);
        }

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

    /**
     * Permite cancelar una reserva online en estado PENDIENTE a un cliente invitado sin cuenta,
     * requiriendo demostrar posesión del qrToken generado al momento de la solicitud.
     */
    @Transactional
    public void cancelarReservaPendienteInvitado(Integer reservaId, String qrToken) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new EntityNotFoundException("No encontramos esa reserva."));

        if (qrToken == null || !qrToken.equals(reserva.getQrToken())) {
            throw new IllegalArgumentException("El token de seguridad proporcionado no es válido para esta reserva.");
        }

        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new IllegalStateException("Solo se pueden cancelar solicitudes en estado PENDIENTE por este canal.");
        }

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
