package com.wimbledon.backend.cliente;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request para crear una reserva (online o invitado sin cuenta).
 *
 * Endpoint: POST /api/reservas
 *
 * La hora de salida se calcula automáticamente:
 *   horaSalida = horaIngreso + habitacion.duracionBloqueHoras
 *
 * El campo email es obligatorio: es al que se envía el correo con el QR.
 * Si el usuario está logueado, se usa el email de su cuenta pero se
 * permite sobreescribirlo para reservas de cortesía.
 */
public record CrearReservaRequest(

        @NotNull(message = "Selecciona una habitación")
        Integer habitacionId,

        @NotNull(message = "Indica la fecha de tu estadía")
        @FutureOrPresent(message = "La fecha no puede ser en el pasado")
        LocalDate fecha,

        @NotNull(message = "Indica la hora de ingreso")
        LocalTime horaIngreso,

        @NotBlank(message = "Tu nombre completo es requerido")
        @Size(max = 150, message = "El nombre no puede superar 150 caracteres")
        String nombreCompleto,

        @Size(max = 30, message = "El teléfono no puede superar 30 caracteres")
        String telefono,

        @NotBlank(message = "El email es obligatorio para enviarte tu confirmación")
        @Email(message = "Ingresa un email válido")
        String email,

        @Size(max = 255, message = "Las notas no pueden superar 255 caracteres")
        String notas
) {}
