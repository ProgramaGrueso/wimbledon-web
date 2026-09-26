package com.wimbledon.backend.admin;

import java.math.BigDecimal;
import java.util.List;

/**
 * KPIs del dashboard de Administración.
 * Cubre las métricas del Lean Canvas del hotel:
 *  - Ocupación por franja horaria (día/noche/madrugada)
 *  - Ticket promedio por reserva
 *  - Tasa de retención de clientes
 *  - Porcentaje de reservas online vs. manuales
 *  - Ocupación por día / desglose operativo
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
        OrigenStats reservasPorOrigen,
        /** Desglose de ocupación por habitación / día */
        List<OcupacionReporteItem> ocupacionPorDia
) {
    public KpisResponse(
            int mes,
            int anio,
            long totalReservas,
            OcupacionFranjas ocupacionPorFranja,
            BigDecimal ticketPromedio,
            double tasaRetencionPct,
            OrigenStats reservasPorOrigen
    ) {
        this(mes, anio, totalReservas, ocupacionPorFranja, ticketPromedio, tasaRetencionPct, reservasPorOrigen, List.of());
    }

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
