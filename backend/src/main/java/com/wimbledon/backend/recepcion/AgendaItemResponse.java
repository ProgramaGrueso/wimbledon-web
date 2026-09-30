package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * DTO compacto de agenda diaria para la pantalla de recepción.
 *
 * Diseñado para caber en una sola "card" sin scroll, tal como lo necesita
 * la recepcionista que trabaja rápido bajo presión.
 *
 * PRIVACIDAD: NO incluye email, teléfono ni historial de reservas del cliente.
 * Solo los datos operativos del turno actual.
 */
public record AgendaItemResponse(
        Integer reservaId,
        String nombreHuesped,
        String habitacion,
        String tipoHabitacion,
        LocalTime horaIngreso,
        LocalTime horaSalida,
        EstadoReserva estado,
        OrigenReserva origen,
        /** true si el QR ya fue escaneado (check-in realizado) */
        Boolean qrUsado,
        /** Código que el huésped envía con su voucher de pago (WMB-XXXXXXXX). */
        String codigo,
        /** Monto que el huésped debe haber depositado. */
        BigDecimal montoTotal,
        /** Límite para validar el voucher; null si ya no está pendiente. */
        LocalDateTime expiraEn,
        LocalDate fecha
) {}
