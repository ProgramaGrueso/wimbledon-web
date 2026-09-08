package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Respuesta completa de habitación para el panel de administración.
 * Incluye todos los campos (a diferencia de HabitacionPublicaResponse del portal).
 */
public record HabitacionAdminResponse(
        Integer id,
        String nombre,
        String tipo,
        String descripcion,
        BigDecimal tarifaBase,
        Integer duracionBloqueHoras,
        EstadoHabitacion estado,
        String imagenUrl,
        LocalDateTime creadoEn
) {
    public static HabitacionAdminResponse from(Habitacion h) {
        return new HabitacionAdminResponse(
                h.getId(), h.getNombre(), h.getTipo(), h.getDescripcion(),
                h.getTarifaBase(), h.getDuracionBloqueHoras(),
                h.getEstado(), h.getImagenUrl(), h.getCreadoEn()
        );
    }
}
