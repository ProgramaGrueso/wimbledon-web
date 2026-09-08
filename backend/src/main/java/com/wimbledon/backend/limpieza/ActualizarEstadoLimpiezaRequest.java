package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import jakarta.validation.constraints.NotNull;

/**
 * Request de actualización de estado de habitación por Limpieza.
 *
 * Transiciones permitidas (solo dentro del ciclo de limpieza):
 *   LIMPIEZA_PENDIENTE → EN_PROCESO → LISTA
 *
 * No puede asignar OCUPADA (Recepción), DISPONIBLE (Recepción) ni MANTENIMIENTO (Admin).
 * La validación de la transición se realiza en LimpiezaService.
 */
public record ActualizarEstadoLimpiezaRequest(
        @NotNull(message = "Indica el nuevo estado")
        EstadoHabitacion estado
) {}
