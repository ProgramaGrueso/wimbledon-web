package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.enums.EstadoHabitacion;

import java.math.BigDecimal;

/**
 * Respuesta del catálogo público de habitaciones.
 * No incluye datos internos de reservas ni huéspedes.
 *
 * Endpoint: GET /api/publico/habitaciones
 */
public record HabitacionPublicaResponse(
        Integer id,
        String nombre,
        String tipo,
        String descripcion,
        BigDecimal tarifaBase,
        /** Duración del bloque de estadía en horas (normalmente 6). */
        Integer duracionBloqueHoras,
        EstadoHabitacion estado,
        String imagenUrl,
        Boolean disponible
) {
    public HabitacionPublicaResponse(
            Integer id,
            String nombre,
            String tipo,
            String descripcion,
            BigDecimal tarifaBase,
            Integer duracionBloqueHoras,
            EstadoHabitacion estado,
            String imagenUrl
    ) {
        this(id, nombre, tipo, descripcion, tarifaBase, duracionBloqueHoras, estado, imagenUrl, estado == EstadoHabitacion.DISPONIBLE);
    }
}
