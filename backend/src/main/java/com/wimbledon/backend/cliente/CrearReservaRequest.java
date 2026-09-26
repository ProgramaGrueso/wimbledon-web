package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.enums.ModalidadEstadia;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request para crear una reserva (online o invitado sin cuenta).
 *
 * Endpoint: POST /api/reservas
 *
 * La hora de salida se calcula automáticamente según la modalidad elegida:
 *   horaSalida = horaIngreso + modalidad.horas
 *
 * El campo email es obligatorio: es al que se envía el correo con el QR.
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
        String notas,

        ModalidadEstadia modalidad
) {
    public CrearReservaRequest(
            Integer habitacionId,
            LocalDate fecha,
            LocalTime horaIngreso,
            String nombreCompleto,
            String telefono,
            String email,
            String notas
    ) {
        this(habitacionId, fecha, horaIngreso, nombreCompleto, telefono, email, notas, ModalidadEstadia.SEIS_HORAS);
    }
}
