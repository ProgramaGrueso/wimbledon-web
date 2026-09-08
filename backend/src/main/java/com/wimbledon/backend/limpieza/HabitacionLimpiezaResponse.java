package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.enums.EstadoHabitacion;

/**
 * Vista de habitación para el personal de Limpieza.
 *
 * PRIVACIDAD ESTRICTA: cero datos de huéspedes ni reservas.
 * Solo lo físico: número/nombre de habitación y su estado actual.
 * El personal de Limpieza nunca sabe quién se hospedó.
 */
public record HabitacionLimpiezaResponse(
        Integer id,
        String nombre,
        String tipo,
        EstadoHabitacion estado
) {}
