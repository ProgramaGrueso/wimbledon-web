package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.cliente.CrearReservaRequest;
import com.wimbledon.backend.cliente.ReservaResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints del módulo de Recepción.
 * Todos protegidos con rol ADMINISTRADOR o RECEPCIONISTA.
 *
 * GET  /api/recepcion/agenda-hoy               → agenda del día
 * GET  /api/recepcion/agenda?fecha=YYYY-MM-DD  → agenda de una fecha específica
 * POST /api/recepcion/checkin                  → check-in con token QR
 * POST /api/recepcion/reserva-manual           → reserva walk-in / telefónica
 * PATCH /api/recepcion/habitaciones/{id}/estado → cambiar estado de habitación
 */
@RestController
@RequestMapping("/api/recepcion")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')")
public class RecepcionController {

    private final RecepcionService recepcionService;
    private final CheckinService checkinService;

    // ── Agenda ────────────────────────────────────────────────────────────────

    /**
     * Lista las reservas de hoy ordenadas por hora de ingreso.
     *
     * La recepcionista ve solo los datos operativos de cada reserva:
     * nombre del huésped, habitación, horario, estado, origen.
     * NUNCA email, teléfono ni historial previo.
     */
    @GetMapping("/agenda-hoy")
    public ResponseEntity<List<AgendaItemResponse>> agendaHoy() {
        return ResponseEntity.ok(recepcionService.agendaDelDia());
    }

    /**
     * Agenda de una fecha específica (para consultar días anteriores o futuros).
     * Param: fecha en formato ISO-8601 (YYYY-MM-DD).
     */
    @GetMapping("/agenda")
    public ResponseEntity<List<AgendaItemResponse>> agendaPorFecha(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha
    ) {
        return ResponseEntity.ok(recepcionService.agendaDeFecha(fecha));
    }

    /**
     * Lista todas las habitaciones con estado operativo para el Rack de Recepción.
     */
    @GetMapping("/habitaciones")
    public ResponseEntity<List<HabitacionRackDTO>> listarRackOperativo() {
        return ResponseEntity.ok(recepcionService.obtenerRackOperativo());
    }

    // ── Check-in ──────────────────────────────────────────────────────────────

    /**
     * Realiza el check-in con el token obtenido del QR escaneado.
     *
     * Flujo:
     *  1. Recepcionista escanea el QR del huésped
     *  2. Frontend envía { "token": "uuid..." } a este endpoint
     *  3. Backend valida, cambia estado a CHECKIN, marca habitación OCUPADA
     *  4. Devuelve pantalla de bienvenida (nombre, habitación, horario)
     *
     * La identidad del operador se deriva de la Authentication en curso: el
     * email de getName(), el rol de getAuthorities() —que es la columna rol de la
     * base de datos, no el claim del JWT— y la IP de getDetails(). Esa
     * identidad alimenta la traza del intento, nunca la autorización, que sigue
     * aplicando la anotación de clase.
     *
     * Errores manejados:
     *  - 400 → token en blanco o con longitud excesiva
     *  - 409 → credencial no utilizable / reserva cancelada / reserva finalizada
     *            / habitación que requiere aseo
     */
    @PostMapping("/checkin")
    public ResponseEntity<CheckinResponse> checkin(
            @Valid @RequestBody CheckinRequest request,
            Authentication authentication
    ) {
        OperadorOperacion operador = OperadorOperacion.desde(authentication);
        return ResponseEntity.ok(checkinService.consumir(request.tokenNormalizado(), operador));
    }

    // ── Reserva manual ────────────────────────────────────────────────────────

    /**
     * Crea una reserva walk-in o telefónica desde Recepción.
     *
     * Idéntico al flujo del portal cliente, pero con origen=MANUAL.
     * Se genera el QR y se envía el correo de confirmación al huésped
     * (si proporcionó email válido).
     *
     * Retorna 201 Created con los datos de la reserva y el qrToken.
     */
    @PostMapping("/reserva-manual")
    public ResponseEntity<ReservaResponse> reservaManual(
            @Valid @RequestBody CrearReservaRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recepcionService.crearReservaManual(request));
    }

    /**
     * Confirma una reserva pendiente tras cobro en efectivo o validación presencial en counter.
     */
    @PostMapping("/reservas/{id}/confirmar")
    public ResponseEntity<ReservaResponse> confirmarReserva(@PathVariable Integer id) {
        return ResponseEntity.ok(recepcionService.confirmarReserva(id));
    }

    // ── Estado de habitación ──────────────────────────────────────────────────

    /**
     * Actualiza el estado de una habitación.
     *
     * Estados permitidos desde Recepción:
     *  - OCUPADA            → huésped ingresó (normalmente automático, este es manual)
     *  - DISPONIBLE         → habitación libre para nueva reserva
     *  - LIMPIEZA_PENDIENTE → requiere limpieza antes de la próxima reserva
     *
     * Retorna 204 No Content en éxito.
     */
    @PatchMapping("/habitaciones/{id}/estado")
    public ResponseEntity<Void> actualizarEstadoHabitacion(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarEstadoHabitacionRequest request
    ) {
        recepcionService.actualizarEstadoHabitacion(id, request.estado());
        return ResponseEntity.noContent().build();
    }
}
