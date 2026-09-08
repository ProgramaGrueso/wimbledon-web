package com.wimbledon.backend.recepcion;

import java.time.LocalTime;

/**
 * Respuesta de check-in exitoso.
 * Solo incluye lo necesario para mostrar en la pantalla de bienvenida de recepción.
 *
 * Ejemplo JSON:
 * {
 *   "nombreHuesped": "Carlos Prueba",
 *   "habitacion": "Suite Presidencial",
 *   "horaIngreso": "20:00",
 *   "horaSalida": "02:00",
 *   "mensaje": "Bienvenido/a. Check-in completado exitosamente."
 * }
 */
public record CheckinResponse(
        String nombreHuesped,
        String habitacion,
        LocalTime horaIngreso,
        LocalTime horaSalida,
        String mensaje
) {}
