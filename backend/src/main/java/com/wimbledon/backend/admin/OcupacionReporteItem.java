package com.wimbledon.backend.admin;

import java.math.BigDecimal;

/**
 * Línea del reporte de ocupación por habitación en un rango de fechas.
 * Se usa tanto para la respuesta JSON como para generar el CSV exportable.
 */
public record OcupacionReporteItem(
        Integer habitacionId,
        String habitacion,
        String tipo,
        long totalReservas,
        long reservasOnline,
        long reservasManuales,
        long checkins,
        BigDecimal tarifaBase,
        /** tarifaBase × totalReservas (estimado sin pagos reales) */
        BigDecimal ingresoEstimado
) {}
