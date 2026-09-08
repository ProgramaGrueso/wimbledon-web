package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import jakarta.validation.constraints.NotNull;

/**
 * Request para actualizar el estado de una habitación desde Recepción.
 *
 * Recepción solo puede asignar:
 *  - OCUPADA  → tras confirmar el ingreso del huésped
 *  - DISPONIBLE → tras un check-out manual (sin QR)
 *  - LIMPIEZA_PENDIENTE → al registrar la salida del huésped
 *
 * No puede asignar EN_PROCESO ni LISTA (esos son exclusivos de Limpieza).
 * No puede asignar MANTENIMIENTO (eso es Admin).
 */
public record ActualizarEstadoHabitacionRequest(
        @NotNull(message = "Indica el nuevo estado de la habitación")
        EstadoHabitacion estado
) {}
