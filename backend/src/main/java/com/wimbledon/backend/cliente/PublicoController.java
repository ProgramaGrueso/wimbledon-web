package com.wimbledon.backend.cliente;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints completamente públicos — sin autenticación requerida.
 *
 * GET /api/publico/habitaciones
 *   Catálogo de habitaciones con disponibilidad en tiempo real.
 *   Usado por el portal de reservas del frontend (sin login).
 */
@RestController
@RequestMapping("/api/publico")
@RequiredArgsConstructor
public class PublicoController {

    private final ReservaService reservaService;

    /**
     * Catálogo público de habitaciones.
     *
     * Devuelve TODAS las habitaciones con su estado actual para que
     * el frontend muestre disponibilidad en tiempo real.
     * El estado DISPONIBLE indica que la habitación puede reservarse.
     *
     * @return lista de habitaciones con su info pública (sin datos de huéspedes)
     */
    @GetMapping("/habitaciones")
    public ResponseEntity<List<HabitacionPublicaResponse>> catalogo() {
        return ResponseEntity.ok(reservaService.listarTodasLasHabitaciones());
    }
}
