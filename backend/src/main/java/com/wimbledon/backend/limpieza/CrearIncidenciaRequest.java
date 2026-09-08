package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.enums.PrioridadIncidencia;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request para reportar un problema de mantenimiento.
 *
 * El personal de Limpieza reporta el problema físico de la habitación.
 * NO se asocia a ningún huésped — solo a la habitación y al empleado que reporta.
 *
 * Ejemplo de uso:
 *   "El aire acondicionado no enfría" → prioridad ALTA
 *   "Luz del baño titila"             → prioridad BAJA
 */
public record CrearIncidenciaRequest(

        @NotNull(message = "Indica la habitación con el problema")
        Integer habitacionId,

        @NotBlank(message = "Describe el problema encontrado")
        @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
        String descripcion,

        /** Si no se especifica, el sistema asigna MEDIA por defecto. */
        PrioridadIncidencia prioridad
) {}
