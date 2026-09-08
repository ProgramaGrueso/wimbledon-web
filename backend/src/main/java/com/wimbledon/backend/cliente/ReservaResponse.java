package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
        LocalDateTime creadoEn
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
                r.getCreadoEn()
        );
    }
}
