package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.Turno;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Turno del día del empleado autenticado.
 * Solo se devuelve la información operativa: horario del turno.
 * No se incluyen datos de otros empleados ni de habitaciones específicas asignadas
 * (en esta versión la asignación es a nivel de turno global, no por habitación).
 */
public record TurnoResponse(
        Integer id,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin
) {
    public static TurnoResponse from(Turno t) {
        return new TurnoResponse(
                t.getId(),
                t.getFecha(),
                t.getHoraInicio(),
                t.getHoraFin()
        );
    }
}
