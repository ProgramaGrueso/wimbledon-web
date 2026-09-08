package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Turno;

import java.time.LocalDate;
import java.time.LocalTime;

/** Turno con información del empleado asignado (para la vista de Admin). */
public record TurnoAdminResponse(
        Integer id,
        Integer usuarioId,
        String nombreEmpleado,
        String rolEmpleado,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin
) {
    public static TurnoAdminResponse from(Turno t) {
        return new TurnoAdminResponse(
                t.getId(),
                t.getUsuario().getId(),
                t.getUsuario().getNombre(),
                t.getUsuario().getRol().name(),
                t.getFecha(),
                t.getHoraInicio(),
                t.getHoraFin()
        );
    }
}
