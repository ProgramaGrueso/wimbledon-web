package com.wimbledon.backend.admin;

import java.math.BigDecimal;

/**
 * KPIs del dashboard de Administración.
 * Cubre las métricas del Lean Canvas del hotel:
 *  - Ocupación por franja horaria (día/noche/madrugada)
 *  - Ticket promedio por reserva
 *  - Tasa de retención de clientes
 *  - Porcentaje de reservas online vs. manuales
 *
 * Período de referencia: mes actual (o el mes/año indicados en el request).
 */
public record KpisResponse(
        /** Mes analizado (1-12) */
        int mes,
        /** Año analizado */
        int anio,
        /** Total de reservas no canceladas en el período */
        long totalReservas,
        /** Ocupación distribuida por franja horaria */
        OcupacionFranjas ocupacionPorFranja,
        /** Tarifa base promedio de las reservas del período */
        BigDecimal ticketPromedio,
        /** Clientes que han reservado más de una vez / total clientes únicos */
        double tasaRetencionPct,
        /** Distribución por origen de reserva */
        OrigenStats reservasPorOrigen
) {
    /**
     * Franjas horarias de ocupación.
     * Madrugada: 00:00 – 05:59
     * Día:       06:00 – 17:59
     * Noche:     18:00 – 23:59
     */
    public record OcupacionFranjas(
            long madrugada,
            long dia,
            long noche
    ) {}

    /** Distribución de reservas por canal de origen. */
    public record OrigenStats(
            long online,
            long manual,
            /** Porcentaje de reservas online (0-100) */
            double porcentajeOnline
    ) {}
}
