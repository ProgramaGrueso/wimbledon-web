package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Turno;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import com.wimbledon.backend.repository.TurnoRepository;
import com.wimbledon.backend.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Servicio de negocio para el módulo de Administración y Super Admin.
 *
 * Responsabilidades:
 *  - Dashboard de KPIs (Lean Canvas del hotel)
 *  - Reportes de ocupación e ingresos en JSON y exportables en CSV
 *  - CRUD del catálogo de habitaciones
 *  - Gestión de cuentas de personal (staff) con validación estricta de jerarquía
 *  - Gestión de turnos y cuadrantes horarios
 *  - Visualización y actualización de configuración sensible de infraestructura (exclusivo SUPER_ADMIN)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final TurnoRepository turnoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${spring.mail.host:sandbox.smtp.mailtrap.io}")
    private String smtpHost;

    @Value("${spring.mail.port:2525}")
    private int smtpPort;

    @Value("${spring.mail.username:test_user}")
    private String smtpUsername;

    @Value("${wimbledon.mail.from:reservas@hotelwimbledon.com}")
    private String mailFrom;

    @Value("${wimbledon.portal.url:https://wimbledon-web.vercel.app}")
    private String portalUrl;

    // Claves simuladas o configurables de pasarela y mensajería
    private String pasarelaApiKey = "sk_live_wimbledon_9f82d471b03e48a2";
    private String pasarelaWebhookSecret = "whsec_wimbledon_secret_hash_2026";
    private String whatsappApiKey = "EAAO7ZB...wimbledon_cloud_api";
    private String whatsappNumero = "+51987654321";

    // ── 1. Dashboard de KPIs ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public KpisResponse obtenerKpis(Integer anio, Integer mes) {
        LocalDate hoy = LocalDate.now();
        int anioFinal = (anio != null && anio > 2000) ? anio : hoy.getYear();
        int mesFinal = (mes != null && mes >= 1 && mes <= 12) ? mes : hoy.getMonthValue();

        LocalDate desde = LocalDate.of(anioFinal, mesFinal, 1);
        LocalDate hasta = desde.withDayOfMonth(desde.lengthOfMonth());

        // 1. Ocupación por franjas
        long madrugada = reservaRepository.countPorFranja(desde, hasta, LocalTime.of(0, 0), LocalTime.of(6, 0));
        long dia = reservaRepository.countPorFranja(desde, hasta, LocalTime.of(6, 0), LocalTime.of(18, 0));
        long noche = reservaRepository.countPorFranja(desde, hasta, LocalTime.of(18, 0), LocalTime.MAX);
        KpisResponse.OcupacionFranjas ocupacionFranjas = new KpisResponse.OcupacionFranjas(madrugada, dia, noche);

        // 2. Reservas del mes (excluyendo CANCELADA)
        List<Reserva> reservas = reservaRepository.findByFechaBetween(desde, hasta).stream()
                .filter(r -> r.getEstado() != EstadoReserva.CANCELADA)
                .toList();

        long totalReservas = reservas.size();

        // 3. Distribución por origen
        long online = reservas.stream().filter(r -> r.getOrigen() == OrigenReserva.ONLINE).count();
        long manual = totalReservas - online;
        double pctOnline = totalReservas == 0 ? 0.0 :
                Math.round(((double) online / totalReservas * 100.0) * 10.0) / 10.0;
        KpisResponse.OrigenStats origenStats = new KpisResponse.OrigenStats(online, manual, pctOnline);

        // 4. Ticket promedio (tarifaBase de las reservas)
        BigDecimal ticketPromedio = BigDecimal.ZERO;
        if (totalReservas > 0) {
            BigDecimal sumaTarifas = reservas.stream()
                    .map(r -> r.getHabitacion().getTarifaBase())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            ticketPromedio = sumaTarifas.divide(BigDecimal.valueOf(totalReservas), 2, RoundingMode.HALF_UP);
        }

        // 5. Tasa de retención de clientes (Lean Canvas)
        long clientesConReserva = reservaRepository.countClientesConReserva();
        long clientesRepetidos = reservaRepository.countClientesRepetidos();
        double tasaRetencionPct = clientesConReserva == 0 ? 0.0 :
                Math.round(((double) clientesRepetidos / clientesConReserva * 100.0) * 10.0) / 10.0;

        return new KpisResponse(
                mesFinal,
                anioFinal,
                totalReservas,
                ocupacionFranjas,
                ticketPromedio,
                tasaRetencionPct,
                origenStats
        );
    }

    // ── 2. Reporte de Ocupación (JSON y CSV) ──────────────────────────────────

    @Transactional(readOnly = true)
    public List<OcupacionReporteItem> obtenerReporteOcupacion(LocalDate desde, LocalDate hasta) {
        LocalDate hoy = LocalDate.now();
        LocalDate fDesde = (desde != null) ? desde : hoy.withDayOfMonth(1);
        LocalDate fHasta = (hasta != null) ? hasta : fDesde.withDayOfMonth(fDesde.lengthOfMonth());

        if (fDesde.isAfter(fHasta)) {
            throw new IllegalArgumentException("La fecha 'desde' no puede ser posterior a 'hasta'.");
        }

        List<Habitacion> habitaciones = habitacionRepository.findAll();
        List<Reserva> reservas = reservaRepository.findByFechaBetween(fDesde, fHasta).stream()
                .filter(r -> r.getEstado() != EstadoReserva.CANCELADA)
                .toList();

        Map<Integer, List<Reserva>> reservasPorHabitacion = reservas.stream()
                .collect(Collectors.groupingBy(r -> r.getHabitacion().getId()));

        return habitaciones.stream().map(h -> {
            List<Reserva> resHab = reservasPorHabitacion.getOrDefault(h.getId(), List.of());
            long total = resHab.size();
            long online = resHab.stream().filter(r -> r.getOrigen() == OrigenReserva.ONLINE).count();
            long manual = total - online;
            long checkins = resHab.stream()
                    .filter(r -> r.getEstado() == EstadoReserva.CHECKIN || r.getEstado() == EstadoReserva.FINALIZADA)
                    .count();
            BigDecimal ingresoEstimado = h.getTarifaBase().multiply(BigDecimal.valueOf(total));

            return new OcupacionReporteItem(
                    h.getId(),
                    h.getNombre(),
                    h.getTipo(),
                    total,
                    online,
                    manual,
                    checkins,
                    h.getTarifaBase(),
                    ingresoEstimado
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportarReporteOcupacionCsv(LocalDate desde, LocalDate hasta) {
        List<OcupacionReporteItem> items = obtenerReporteOcupacion(desde, hasta);

        StringBuilder csv = new StringBuilder();
        // Encabezado CSV
        csv.append("ID,Habitacion,Tipo,Total Reservas,Reservas Online,Reservas Manuales,Check-ins,Tarifa Base,Ingreso Estimado\n");

        for (OcupacionReporteItem item : items) {
            csv.append(item.habitacionId()).append(",")
               .append("\"").append(item.habitacion().replace("\"", "\"\"")).append("\",")
               .append("\"").append(item.tipo() != null ? item.tipo().replace("\"", "\"\"") : "").append("\",")
               .append(item.totalReservas()).append(",")
               .append(item.reservasOnline()).append(",")
               .append(item.reservasManuales()).append(",")
               .append(item.checkins()).append(",")
               .append(item.tarifaBase()).append(",")
               .append(item.ingresoEstimado()).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ── 3. CRUD Catálogo de Habitaciones ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<HabitacionAdminResponse> listarHabitaciones() {
        return habitacionRepository.findAll().stream()
                .map(HabitacionAdminResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public HabitacionAdminResponse obtenerHabitacionPorId(Integer id) {
        return habitacionRepository.findById(id)
                .map(HabitacionAdminResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada con ID: " + id));
    }

    @Transactional
    public HabitacionAdminResponse crearHabitacion(CrearHabitacionRequest request) {
        Habitacion h = Habitacion.builder()
                .nombre(request.nombre().trim())
                .tipo(request.tipo() != null ? request.tipo().trim() : null)
                .descripcion(request.descripcion())
                .tarifaBase(request.tarifaBase())
                .duracionBloqueHoras(request.duracionBloqueHoras() != null ? request.duracionBloqueHoras() : 6)
                .imagenUrl(request.imagenUrl())
                .estado(EstadoHabitacion.DISPONIBLE)
                .build();

        Habitacion guardada = habitacionRepository.save(h);
        log.info("Habitación creada por admin: {} (ID: {})", guardada.getNombre(), guardada.getId());
        return HabitacionAdminResponse.from(guardada);
    }

    @Transactional
    public HabitacionAdminResponse actualizarHabitacion(Integer id, CrearHabitacionRequest request) {
        Habitacion h = habitacionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada con ID: " + id));

        h.setNombre(request.nombre().trim());
        h.setTipo(request.tipo() != null ? request.tipo().trim() : null);
        h.setDescripcion(request.descripcion());
        h.setTarifaBase(request.tarifaBase());
        h.setDuracionBloqueHoras(request.duracionBloqueHoras() != null ? request.duracionBloqueHoras() : h.getDuracionBloqueHoras());
        h.setImagenUrl(request.imagenUrl());

        Habitacion actualizada = habitacionRepository.save(h);
        log.info("Habitación actualizada por admin: ID {}", id);
        return HabitacionAdminResponse.from(actualizada);
    }

    @Transactional
    public HabitacionAdminResponse cambiarEstadoHabitacion(Integer id, EstadoHabitacion nuevoEstado) {
        Habitacion h = habitacionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada con ID: " + id));

        h.setEstado(nuevoEstado);
        Habitacion guardada = habitacionRepository.save(h);
        log.info("Admin cambió estado de habitación {} a {}", id, nuevoEstado);
        return HabitacionAdminResponse.from(guardada);
    }

    @Transactional
    public void eliminarHabitacion(Integer id) {
        Habitacion h = habitacionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada con ID: " + id));

        // Para preservar la integridad del historial de reservas pasadas,
        // si la habitación tiene reservas asociadas se marca como MANTENIMIENTO;
        // si no tiene reservas, se elimina físicamente.
        try {
            habitacionRepository.delete(h);
            habitacionRepository.flush();
            log.info("Habitación ID {} eliminada físicamente del catálogo", id);
        } catch (Exception ex) {
            h.setEstado(EstadoHabitacion.MANTENIMIENTO);
            habitacionRepository.save(h);
            log.info("Habitación ID {} tiene historial de reservas; se marcó en MANTENIMIENTO", id);
        }
    }

    // ── 4. Gestión de Personal (Staff) ───────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarStaff() {
        return usuarioRepository.findByRolInOrderByNombreAsc(List.of(
                Rol.SUPER_ADMIN, Rol.ADMINISTRADOR, Rol.RECEPCIONISTA, Rol.LIMPIEZA
        )).stream().map(UsuarioAdminResponse::from).toList();
    }

    @Transactional
    public UsuarioAdminResponse crearStaff(CrearStaffRequest request, Usuario actor) {
        if (usuarioRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el email: " + request.email());
        }

        // Jerarquía de roles según matriz RBAC:
        // - ADMINISTRADOR solo puede crear RECEPCIONISTA o LIMPIEZA
        // - SUPER_ADMIN puede además crear ADMINISTRADOR
        Rol rolDestino = request.rol();
        if (rolDestino == Rol.SUPER_ADMIN) {
            throw new AccessDeniedException("No es posible crear cuentas con rol SUPER_ADMIN mediante la API.");
        }

        if (actor.getRol() == Rol.ADMINISTRADOR) {
            if (rolDestino != Rol.RECEPCIONISTA && rolDestino != Rol.LIMPIEZA) {
                throw new AccessDeniedException(
                        "Como ADMINISTRADOR solo tienes autorización para crear cuentas de RECEPCIONISTA o LIMPIEZA."
                );
            }
        }

        Usuario nuevo = Usuario.builder()
                .nombre(request.nombre().trim())
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .rol(rolDestino)
                .activo(true)
                .build();

        Usuario guardado = usuarioRepository.save(nuevo);
        log.info("Nuevo usuario de staff creado: {} con rol {} por {}",
                guardado.getEmail(), guardado.getRol(), actor.getEmail());

        return UsuarioAdminResponse.from(guardado);
    }

    @Transactional
    public UsuarioAdminResponse cambiarEstadoActivoStaff(Integer id, boolean activo, Usuario actor) {
        Usuario target = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con ID: " + id));

        if (target.getId().equals(actor.getId())) {
            throw new IllegalArgumentException("No puedes desactivar tu propia cuenta.");
        }

        if (target.getRol() == Rol.SUPER_ADMIN && actor.getRol() != Rol.SUPER_ADMIN) {
            throw new AccessDeniedException("Solo un SUPER_ADMIN puede modificar el estado de otro SUPER_ADMIN.");
        }

        target.setActivo(activo);
        Usuario guardado = usuarioRepository.save(target);
        log.info("Estado activo de usuario {} cambiado a {} por {}", target.getEmail(), activo, actor.getEmail());
        return UsuarioAdminResponse.from(guardado);
    }

    // ── 5. Gestión de Turnos ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TurnoAdminResponse> listarTurnos(LocalDate fecha) {
        if (fecha != null) {
            return turnoRepository.findByFechaOrderByHoraInicioAsc(fecha).stream()
                    .map(TurnoAdminResponse::from)
                    .toList();
        }
        return turnoRepository.findAllByOrderByFechaDescHoraInicioAsc().stream()
                .map(TurnoAdminResponse::from)
                .toList();
    }

    @Transactional
    public TurnoAdminResponse crearTurno(CrearTurnoRequest request) {
        Usuario empleado = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con ID: " + request.usuarioId()));

        if (empleado.getRol() == Rol.CLIENTE) {
            throw new IllegalArgumentException("No se pueden asignar turnos de trabajo a clientes.");
        }

        if (!request.horaInicio().isBefore(request.horaFin())) {
            throw new IllegalArgumentException("La hora de inicio (" + request.horaInicio() +
                    ") debe ser estrictamente anterior a la hora de fin (" + request.horaFin() + ").");
        }

        Turno turno = Turno.builder()
                .usuario(empleado)
                .fecha(request.fecha())
                .horaInicio(request.horaInicio())
                .horaFin(request.horaFin())
                .build();

        Turno guardado = turnoRepository.save(turno);
        log.info("Turno asignado a {} el {} ({} - {})",
                empleado.getNombre(), guardado.getFecha(), guardado.getHoraInicio(), guardado.getHoraFin());

        return TurnoAdminResponse.from(guardado);
    }

    @Transactional
    public void eliminarTurno(Integer id) {
        if (!turnoRepository.existsById(id)) {
            throw new EntityNotFoundException("Turno no encontrado con ID: " + id);
        }
        turnoRepository.deleteById(id);
        log.info("Turno ID {} eliminado", id);
    }

    // ── 6. Configuración de Infraestructura (Exclusivo SUPER_ADMIN) ──────────

    public ConfiguracionInfraestructuraResponse obtenerConfiguracion() {
        return new ConfiguracionInfraestructuraResponse(
                "Culqi / Stripe",
                enmascararClave(this.pasarelaApiKey),
                enmascararClave(this.pasarelaWebhookSecret),
                "WhatsApp Cloud API (Meta)",
                enmascararClave(this.whatsappApiKey),
                this.whatsappNumero,
                this.smtpHost,
                this.smtpPort,
                this.smtpUsername,
                this.mailFrom,
                this.portalUrl,
                "PRODUCCIÓN"
        );
    }

    public ConfiguracionInfraestructuraResponse actualizarConfiguracion(ActualizarConfiguracionRequest request) {
        if (request.pasarelaPagoApiKey() != null && !request.pasarelaPagoApiKey().isBlank()) {
            this.pasarelaApiKey = request.pasarelaPagoApiKey().trim();
        }
        if (request.pasarelaPagoWebhookSecret() != null && !request.pasarelaPagoWebhookSecret().isBlank()) {
            this.pasarelaWebhookSecret = request.pasarelaPagoWebhookSecret().trim();
        }
        if (request.whatsappApiKey() != null && !request.whatsappApiKey().isBlank()) {
            this.whatsappApiKey = request.whatsappApiKey().trim();
        }
        if (request.whatsappNumeroTelefono() != null && !request.whatsappNumeroTelefono().isBlank()) {
            this.whatsappNumero = request.whatsappNumeroTelefono().trim();
        }
        if (request.smtpHost() != null && !request.smtpHost().isBlank()) {
            this.smtpHost = request.smtpHost().trim();
        }
        if (request.smtpPort() != null && request.smtpPort() > 0) {
            this.smtpPort = request.smtpPort();
        }
        if (request.smtpUsername() != null && !request.smtpUsername().isBlank()) {
            this.smtpUsername = request.smtpUsername().trim();
        }
        if (request.correoRemitente() != null && !request.correoRemitente().isBlank()) {
            this.mailFrom = request.correoRemitente().trim();
        }
        if (request.urlPortalFrontend() != null && !request.urlPortalFrontend().isBlank()) {
            this.portalUrl = request.urlPortalFrontend().trim();
        }

        log.info("SUPER_ADMIN actualizó parámetros de configuración de infraestructura");
        return obtenerConfiguracion();
    }

    private String enmascararClave(String clave) {
        if (clave == null || clave.isBlank()) {
            return "NO_CONFIGURADA";
        }
        if (clave.length() <= 8) {
            return "••••••••";
        }
        return clave.substring(0, 4) + "••••••••" + clave.substring(clave.length() - 4);
    }
}
