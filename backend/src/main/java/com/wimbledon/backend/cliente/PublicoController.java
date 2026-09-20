package com.wimbledon.backend.cliente;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Endpoints completamente públicos — sin autenticación requerida.
 *
 * GET /api/publico/habitaciones
 *   Catálogo de habitaciones con disponibilidad en tiempo real para una fecha y horario específicos.
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
     * Si se envían `fecha` y `horaIngreso`, calcula la disponibilidad real verificando solapamientos
     * de horarios en la base de datos (y excluyendo habitaciones en mantenimiento).
     * Si no se envían, reporta disponibilidad según el estado físico actual.
     *
     * @return lista de habitaciones con flag `disponible`
     */
    @GetMapping("/habitaciones")
    public ResponseEntity<List<HabitacionPublicaResponse>> catalogo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaIngreso,
            @RequestParam(required = false) Integer duracionHoras
    ) {
        return ResponseEntity.ok(reservaService.listarHabitacionesConDisponibilidad(fecha, horaIngreso, duracionHoras));
    }
}
