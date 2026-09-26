package com.wimbledon.backend.recepcion;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Respuesta de check-in exitoso.
 * Solo incluye lo necesario para mostrar en la pantalla de bienvenida de recepción.
 *
 * PRIVACIDAD: incorpora identificadores de CORRELACION —reservaId y la marca de
 * tiempo del ingreso— para que el operador pueda rastrearlo, y NUNCA datos
 * personales del huésped: ni email, ni telefono, ni historial.
 *
 * Ejemplo JSON:
 * {
 *   "nombreHuesped": "Carlos Prueba",
 *   "habitacion": "Suite Presidencial",
 *   "horaIngreso": "20:00",
 *   "horaSalida": "02:00",
 *   "reservaId": 42,
 *   "checkinEn": "2026-10-05T19:30:00",
 *   "mensaje": "Bienvenido/a. Check-in completado exitosamente."
 * }
 */
public record CheckinResponse(
        String nombreHuesped,
        String habitacion,
        LocalTime horaIngreso,
        LocalTime horaSalida,
        /** Identificador de la reserva, para correlación por parte del operador. */
        Integer reservaId,
        /** Marca de tiempo del ingreso efectivamente registrado. */
        LocalDateTime checkinEn,
        String mensaje
) {}
