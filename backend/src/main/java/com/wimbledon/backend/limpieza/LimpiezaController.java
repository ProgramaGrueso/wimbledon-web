package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.Usuario;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del módulo de Limpieza (Housekeeping).
 * Todos protegidos exclusivamente para el rol LIMPIEZA.
 *
 * Principio: "necesito saber lo mínimo para hacer mi trabajo".
 * Cero acceso a información de clientes o reservas.
 *
 * GET  /api/limpieza/habitaciones              → lista con estado (sin datos de huéspedes)
 * PATCH /api/limpieza/habitaciones/{id}/estado → avanzar en el ciclo de limpieza
 * POST /api/limpieza/incidencias               → reportar problema de mantenimiento
 * GET  /api/limpieza/mi-turno                  → turno del día del empleado logueado
 */
@RestController
@RequestMapping("/api/limpieza")
@RequiredArgsConstructor
@PreAuthorize("hasRole('LIMPIEZA')")
public class LimpiezaController {

    private final LimpiezaService limpiezaService;

    // ── Habitaciones ──────────────────────────────────────────────────────────

    /**
     * Lista todas las habitaciones con su estado de limpieza actual.
     *
     * El personal de Limpieza ve el estado global para saber qué habitaciones
     * atender. La vista NO incluye ningún dato de huéspedes ni reservas.
     *
     * Estados que el personal debe atender:
     *   LIMPIEZA_PENDIENTE → requiere limpieza urgente (acaba de salir un huésped)
     *   EN_PROCESO         → limpieza en curso (otra persona del equipo)
     *   LISTA              → limpia y disponible para nueva reserva
     */
    @GetMapping("/habitaciones")
    public ResponseEntity<List<HabitacionLimpiezaResponse>> listarHabitaciones() {
        return ResponseEntity.ok(limpiezaService.listarHabitaciones());
    }

    /**
     * Actualiza el estado de una habitación dentro del ciclo de limpieza.
     *
     * Flujo válido (solo hacia adelante):
     *   LIMPIEZA_PENDIENTE → EN_PROCESO  (comenzar la limpieza)
     *   EN_PROCESO         → LISTA       (limpieza completada)
     *
     * No se puede:
     *   - Saltar pasos (LIMPIEZA_PENDIENTE → LISTA directamente)
     *   - Retroceder (LISTA → EN_PROCESO)
     *   - Marcar OCUPADA, DISPONIBLE ni MANTENIMIENTO
     *
     * Retorna 200 con el nuevo estado de la habitación.
     */
    @PatchMapping("/habitaciones/{id}/estado")
    public ResponseEntity<HabitacionLimpiezaResponse> actualizarEstado(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarEstadoLimpiezaRequest request
    ) {
        return ResponseEntity.ok(limpiezaService.actualizarEstado(id, request.estado()));
    }

    // ── Incidencias ───────────────────────────────────────────────────────────

    /**
     * Reporta un problema de mantenimiento en una habitación.
     *
     * Ejemplos de uso:
     *   { "habitacionId": 1, "descripcion": "Aire acondicionado no enfría", "prioridad": "ALTA" }
     *   { "habitacionId": 2, "descripcion": "Grifo del baño gotea" }   ← prioridad MEDIA por defecto
     *
     * La incidencia queda en estado ABIERTA hasta que Admin la resuelva.
     * Retorna 201 Created con los datos del reporte creado.
     */
    @PostMapping("/incidencias")
    public ResponseEntity<IncidenciaResponse> reportarIncidencia(
            @Valid @RequestBody CrearIncidenciaRequest request,
            @AuthenticationPrincipal Usuario empleado
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(limpiezaService.reportarIncidencia(request, empleado));
    }

    // ── Turno propio ──────────────────────────────────────────────────────────

    /**
     * Devuelve el turno asignado al empleado autenticado para el día de hoy.
     *
     * 200 → turno encontrado con hora inicio/fin
     * 204 → no hay turno asignado hoy (sin cuerpo)
     *
     * Un empleado nunca puede ver el turno de otro compañero.
     */
    @GetMapping("/mi-turno")
    public ResponseEntity<TurnoResponse> miTurno(
            @AuthenticationPrincipal Usuario empleado
    ) {
        return limpiezaService.miTurnoHoy(empleado)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
