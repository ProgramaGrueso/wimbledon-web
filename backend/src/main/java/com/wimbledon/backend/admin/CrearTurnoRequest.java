package com.wimbledon.backend.admin;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalTime;

/** Request para asignar un turno a un empleado. */
public record CrearTurnoRequest(
        @NotNull(message = "Indica el usuario al que asignas el turno")
        Integer usuarioId,

        @NotNull(message = "Indica la fecha del turno")
        LocalDate fecha,

        @NotNull(message = "Indica la hora de inicio del turno")
        LocalTime horaInicio,

        @NotNull(message = "Indica la hora de fin del turno")
        LocalTime horaFin
) {}
