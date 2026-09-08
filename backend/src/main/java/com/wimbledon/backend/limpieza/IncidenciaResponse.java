package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.Incidencia;
import com.wimbledon.backend.domain.enums.EstadoIncidencia;
import com.wimbledon.backend.domain.enums.PrioridadIncidencia;

import java.time.LocalDateTime;

/**
 * Respuesta de incidencia de mantenimiento.
 * No incluye nombre ni datos del empleado que reportó (privacidad interna).
 */
public record IncidenciaResponse(
        Integer id,
        Integer habitacionId,
        String habitacionNombre,
        String descripcion,
        PrioridadIncidencia prioridad,
        EstadoIncidencia estado,
        LocalDateTime creadoEn
) {
    public static IncidenciaResponse from(Incidencia i) {
        return new IncidenciaResponse(
                i.getId(),
                i.getHabitacion().getId(),
                i.getHabitacion().getNombre(),
                i.getDescripcion(),
                i.getPrioridad(),
                i.getEstado(),
                i.getCreadoEn()
        );
    }
}
