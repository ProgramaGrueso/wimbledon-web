package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;

import java.math.BigDecimal;

/**
 * Proyección de habitaciones para el Rack Operativo de Recepción.
 *
 * Expone solo los campos que Recepción necesita operativamente
 * (id, nombre, tipo, estado y tarifaBase) sin exponer datos de auditoría interna
 * ni configuraciones de administración.
 */
public record HabitacionRackDTO(
        Integer id,
        String nombre,
        String tipo,
        EstadoHabitacion estado,
        BigDecimal tarifaBase
) {
    public static HabitacionRackDTO from(Habitacion h) {
        return new HabitacionRackDTO(
                h.getId(),
                h.getNombre(),
                h.getTipo(),
                h.getEstado(),
                h.getTarifaBase()
        );
    }
}
