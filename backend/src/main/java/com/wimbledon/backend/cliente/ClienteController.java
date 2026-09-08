package com.wimbledon.backend.cliente;

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
 * Endpoints del módulo de cliente.
 *
 * POST /api/reservas                          → crear reserva (público o autenticado)
 * GET  /api/cliente/mis-reservas             → historial del cliente (CLIENTE)
 * PATCH /api/cliente/reservas/{id}/reprogramar → reprogramar con ventana de tiempo (CLIENTE)
 * DELETE /api/cliente/reservas/{id}           → cancelar con ventana de tiempo (CLIENTE)
 */
@RestController
@RequiredArgsConstructor
public class ClienteController {

    private final ReservaService reservaService;

    // ── Crear reserva (público O autenticado) ─────────────────────────────────

    /**
     * Crea una reserva desde el portal web.
     *
     * No requiere autenticación: cualquier persona puede reservar.
     * Si hay un usuario autenticado (JWT válido), la reserva se asocia a su cuenta.
     * Si no hay JWT, la reserva se asocia solo por email (cliente anónimo).
     *
     * Al crear → dispara QR + correo de confirmación (Paso 4).
     *
     * @param request datos del formulario de reserva
     * @param cliente usuario autenticado o null (invitado)
     * @return 201 Created con los datos de la reserva y el qrToken
     */
    @PostMapping("/api/reservas")
    public ResponseEntity<ReservaResponse> crearReserva(
            @Valid @RequestBody CrearReservaRequest request,
            @AuthenticationPrincipal Usuario cliente   // null si no hay JWT
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservaService.crearReserva(request, cliente));
    }

    // ── Endpoints exclusivos del cliente autenticado ──────────────────────────

    /**
     * Historial de reservas del cliente autenticado.
     *
     * RBAC: solo el propio cliente puede ver su historial.
     * Recepcionistas NUNCA acceden a este endpoint — eso garantiza
     * la promesa de "discreción" del hotel.
     */
    @GetMapping("/api/cliente/mis-reservas")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<List<ReservaResponse>> misReservas(
            @AuthenticationPrincipal Usuario cliente
    ) {
        return ResponseEntity.ok(reservaService.misReservas(cliente));
    }

    /**
     * Reprograma una reserva propia.
     * Solo permitido hasta X horas antes del ingreso
     * (configurado en wimbledon.reservas.horas-cancelacion).
     */
    @PatchMapping("/api/cliente/reservas/{id}/reprogramar")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<ReservaResponse> reprogramar(
            @PathVariable Integer id,
            @Valid @RequestBody ReprogramarReservaRequest request,
            @AuthenticationPrincipal Usuario cliente
    ) {
        return ResponseEntity.ok(reservaService.reprogramarReserva(id, request, cliente));
    }

    /**
     * Cancela una reserva propia.
     * Solo permitido hasta X horas antes del ingreso.
     * Retorna 204 No Content (sin cuerpo).
     */
    @DeleteMapping("/api/cliente/reservas/{id}")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<Void> cancelar(
            @PathVariable Integer id,
            @AuthenticationPrincipal Usuario cliente
    ) {
        reservaService.cancelarReserva(id, cliente);
        return ResponseEntity.noContent().build();
    }
}
