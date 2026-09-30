package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;

import java.time.LocalDate;
import com.wimbledon.backend.domain.enums.ExtraReserva;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.time.LocalTime;

/**
 * DTO de respuesta de reserva para el cliente autenticado (ficha propia).
 *
 * Incluye qrToken porque el cliente puede necesitarlo para:
 *  - Ver la página de check-in en el frontend (/checkin/{token})
 *  - Descarga del QR si no llegó el correo
 *
 * NUNCA usar este DTO en endpoints de Recepción o Limpieza.
 * Para Recepción usar AgendaItemResponse (sin datos personales completos).
 */
public record ReservaResponse(
        Integer id,
        HabitacionInfo habitacion,
        LocalDate fecha,
        LocalTime horaIngreso,
        LocalTime horaSalida,
        EstadoReserva estado,
        OrigenReserva origen,
        /** Token opaco del QR — sin datos personales en claro */
        String qrToken,
        LocalDateTime creadoEn,
        LocalDateTime expiraEn,
        /** Código corto para el voucher de WhatsApp y la búsqueda en recepción. */
        String codigo,
        /** Monto a depositar, calculado por el servidor (tarifa + adicionales). */
        BigDecimal montoTotal,
        List<String> extras,
        /** Segundos que le quedan al hold; evita depender del reloj del dispositivo. */
        Long segundosRestantes
) {
    /** Información mínima de la habitación incluida en la respuesta de reserva. */
    public record HabitacionInfo(Integer id, String nombre, String tipo) {}

    /** Factory method que convierte una entidad Reserva a este DTO. */
    public static ReservaResponse from(Reserva r) {
        return new ReservaResponse(
                r.getId(),
                new HabitacionInfo(
                        r.getHabitacion().getId(),
                        r.getHabitacion().getNombre(),
                        r.getHabitacion().getTipo()
                ),
                r.getFecha(),
                r.getHoraIngreso(),
                r.getHoraSalida(),
                r.getEstado(),
                r.getOrigen(),
                r.getQrToken(),
                r.getCreadoEn(),
                r.getExpiraEn(),
                r.getCodigoReserva(),
                r.getMontoTotal(),
                nombresDeExtras(r.getExtras()),
                r.getExpiraEn() == null ? null
                        : Math.max(0, Duration.between(LocalDateTime.now(), r.getExpiraEn()).getSeconds())
        );
    }

    private static List<String> nombresDeExtras(String extras) {
        if (extras == null || extras.isBlank()) return List.of();
        return Arrays.stream(extras.split(","))
                .map(String::trim)
                .map(e -> {
                    try { return ExtraReserva.valueOf(e).nombre; } catch (IllegalArgumentException ex) { return e; }
                })
                .toList();
    }
}
