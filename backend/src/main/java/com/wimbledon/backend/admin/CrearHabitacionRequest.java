package com.wimbledon.backend.admin;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Request para crear una nueva habitación en el catálogo. */
public record CrearHabitacionRequest(
        @NotBlank(message = "El nombre de la habitación es obligatorio")
        @Size(max = 100)
        String nombre,

        @Size(max = 60)
        String tipo,

        String descripcion,

        @NotNull(message = "La tarifa base es obligatoria")
        @DecimalMin(value = "0.01", message = "La tarifa debe ser mayor a 0")
        BigDecimal tarifaBase,

        @NotNull(message = "La duración del bloque es obligatoria")
        @Min(value = 1, message = "Mínimo 1 hora de bloque")
        @Max(value = 24, message = "Máximo 24 horas de bloque")
        Integer duracionBloqueHoras,

        @Size(max = 255)
        String imagenUrl
) {}
