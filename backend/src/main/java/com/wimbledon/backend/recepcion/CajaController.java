package com.wimbledon.backend.recepcion;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Caja del turno de Recepción.
 *
 * GET  /api/recepcion/caja         → turno abierto del usuario autenticado
 * POST /api/recepcion/caja/cobros  → registrar un cobro en efectivo
 * POST /api/recepcion/caja/cierre  → cerrar el turno y devolver el arqueo
 */
@RestController
@RequestMapping("/api/recepcion/caja")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')")
public class CajaController {

    private final CajaService cajaService;

    @GetMapping
    public CajaService.TurnoCajaResponse turno(Authentication auth) {
        return cajaService.turnoActual(auth.getName());
    }

    @PostMapping("/cobros")
    public ResponseEntity<CajaService.CobroResponse> registrar(
            Authentication auth, @Valid @RequestBody CajaService.CobroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cajaService.registrarCobro(auth.getName(), request));
    }

    @PostMapping("/cierre")
    public CajaService.TurnoCajaResponse cerrar(Authentication auth) {
        return cajaService.cerrarTurno(auth.getName());
    }
}
