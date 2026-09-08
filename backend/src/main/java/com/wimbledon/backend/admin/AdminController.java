package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controlador de Administración y Dashboard del Hotel Wimbledon.
 *
 * Control de acceso:
 *  - La mayoría de endpoints requieren rol ADMINISTRADOR o SUPER_ADMIN.
 *  - Los endpoints de infraestructura sensible requieren EXCLUSIVAMENTE SUPER_ADMIN.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // ── 1. Dashboard & KPIs ──────────────────────────────────────────────────

    /**
     * Devuelve las métricas clave del negocio (Lean Canvas):
     *  - Ocupación por franja horaria (madrugada, día, noche)
     *  - Ticket promedio
     *  - Tasa de retención de clientes
     *  - Distribución de reservas (online vs. manual)
     */
    @GetMapping("/kpis")
    public ResponseEntity<KpisResponse> obtenerKpis(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {
        return ResponseEntity.ok(adminService.obtenerKpis(anio, mes));
    }

    // ── 2. Reportes de Ocupación ─────────────────────────────────────────────

    /**
     * Reporte de ocupación e ingresos por habitación en formato JSON.
     */
    @GetMapping("/reportes/ocupacion")
    public ResponseEntity<List<OcupacionReporteItem>> obtenerReporteOcupacion(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(adminService.obtenerReporteOcupacion(desde, hasta));
    }

    /**
     * Exporta el reporte de ocupación como archivo CSV descargable.
     */
    @GetMapping(value = "/reportes/ocupacion/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarReporteCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        byte[] csvBytes = adminService.exportarReporteOcupacionCsv(desde, hasta);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reporte_ocupacion.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }

    // ── 3. CRUD de Catálogo de Habitaciones ──────────────────────────────────

    /**
     * Lista todas las habitaciones con detalle administrativo completo.
     */
    @GetMapping("/habitaciones")
    public ResponseEntity<List<HabitacionAdminResponse>> listarHabitaciones() {
        return ResponseEntity.ok(adminService.listarHabitaciones());
    }

    /**
     * Obtiene el detalle completo de una habitación por su ID.
     */
    @GetMapping("/habitaciones/{id}")
    public ResponseEntity<HabitacionAdminResponse> obtenerHabitacion(@PathVariable Integer id) {
        return ResponseEntity.ok(adminService.obtenerHabitacionPorId(id));
    }

    /**
     * Crea una nueva habitación en el catálogo.
     */
    @PostMapping("/habitaciones")
    public ResponseEntity<HabitacionAdminResponse> crearHabitacion(
            @Valid @RequestBody CrearHabitacionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.crearHabitacion(request));
    }

    /**
     * Modifica las propiedades de una habitación existente.
     */
    @PutMapping("/habitaciones/{id}")
    public ResponseEntity<HabitacionAdminResponse> actualizarHabitacion(
            @PathVariable Integer id,
            @Valid @RequestBody CrearHabitacionRequest request) {
        return ResponseEntity.ok(adminService.actualizarHabitacion(id, request));
    }

    /**
     * Modifica directamente el estado de una habitación (ej. MANTENIMIENTO, DISPONIBLE).
     */
    @PatchMapping("/habitaciones/{id}/estado")
    public ResponseEntity<HabitacionAdminResponse> cambiarEstadoHabitacion(
            @PathVariable Integer id,
            @RequestParam EstadoHabitacion estado) {
        return ResponseEntity.ok(adminService.cambiarEstadoHabitacion(id, estado));
    }

    /**
     * Elimina una habitación (si tiene historial de reservas se transfiere a MANTENIMIENTO).
     */
    @DeleteMapping("/habitaciones/{id}")
    public ResponseEntity<Void> eliminarHabitacion(@PathVariable Integer id) {
        adminService.eliminarHabitacion(id);
        return ResponseEntity.noContent().build();
    }

    // ── 4. Gestión de Personal (Staff) ───────────────────────────────────────

    /**
     * Lista a todo el personal del hotel (Super Admin, Administrador, Recepcionista, Limpieza).
     */
    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioAdminResponse>> listarStaff() {
        return ResponseEntity.ok(adminService.listarStaff());
    }

    /**
     * Crea un nuevo empleado de staff (RECEPCIONISTA o LIMPIEZA).
     * Los administradores no pueden crear cuentas con privilegios de Administrador ni Super Admin.
     */
    @PostMapping("/usuarios")
    public ResponseEntity<UsuarioAdminResponse> crearStaff(
            @Valid @RequestBody CrearStaffRequest request,
            @AuthenticationPrincipal Usuario actor) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.crearStaff(request, actor));
    }

    /**
     * Activa o desactiva la cuenta de un empleado.
     */
    @PatchMapping("/usuarios/{id}/activo")
    public ResponseEntity<UsuarioAdminResponse> cambiarEstadoStaff(
            @PathVariable Integer id,
            @RequestParam boolean activo,
            @AuthenticationPrincipal Usuario actor) {
        return ResponseEntity.ok(adminService.cambiarEstadoActivoStaff(id, activo, actor));
    }

    // ── 5. Gestión de Turnos ─────────────────────────────────────────────────

    /**
     * Lista los turnos de trabajo asignados, filtrables opcionalmente por fecha.
     */
    @GetMapping("/turnos")
    public ResponseEntity<List<TurnoAdminResponse>> listarTurnos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(adminService.listarTurnos(fecha));
    }

    /**
     * Asigna un turno horario a un empleado.
     */
    @PostMapping("/turnos")
    public ResponseEntity<TurnoAdminResponse> crearTurno(
            @Valid @RequestBody CrearTurnoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.crearTurno(request));
    }

    /**
     * Elimina un turno asignado.
     */
    @DeleteMapping("/turnos/{id}")
    public ResponseEntity<Void> eliminarTurno(@PathVariable Integer id) {
        adminService.eliminarTurno(id);
        return ResponseEntity.noContent().build();
    }

    // ── 6. Configuración de Infraestructura (Exclusivo SUPER_ADMIN) ──────────

    /**
     * Permite consultar las configuraciones y claves de API de servicios externos.
     * EXCLUSIVO para SUPER_ADMIN (DevOps / TI).
     */
    @GetMapping("/configuracion")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ConfiguracionInfraestructuraResponse> obtenerConfiguracion() {
        return ResponseEntity.ok(adminService.obtenerConfiguracion());
    }

    /**
     * Permite actualizar parámetros y claves de API de servicios externos.
     * EXCLUSIVO para SUPER_ADMIN (DevOps / TI).
     */
    @PutMapping("/configuracion")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ConfiguracionInfraestructuraResponse> actualizarConfiguracion(
            @Valid @RequestBody ActualizarConfiguracionRequest request) {
        return ResponseEntity.ok(adminService.actualizarConfiguracion(request));
    }
}
