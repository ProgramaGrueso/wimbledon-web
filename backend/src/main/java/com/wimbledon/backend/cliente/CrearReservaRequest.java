package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.enums.ExtraReserva;
import com.wimbledon.backend.domain.enums.ModalidadEstadia;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Request para crear una reserva (online o invitado sin cuenta).
 *
 * Endpoint: POST /api/reservas
 *
 * La hora de salida se calcula automáticamente según la modalidad elegida:
 *   horaSalida = horaIngreso + modalidad.horas
 *
 * El email es opcional: el portal público no lo pide para no dejar rastro del
 * huésped. El contacto es el teléfono, al que se envía la notificación.
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

        @Email(message = "Ingresa un email válido")
        String email,

        @Size(max = 255, message = "Las notas no pueden superar 255 caracteres")
        String notas,

        ModalidadEstadia modalidad,

        @Size(max = 6, message = "Demasiados adicionales en una sola reserva")
        List<ExtraReserva> extras
) {
    public CrearReservaRequest(
            Integer habitacionId,
            LocalDate fecha,
            LocalTime horaIngreso,
            String nombreCompleto,
            String telefono,
            String email,
            String notas,
            ModalidadEstadia modalidad
    ) {
        this(habitacionId, fecha, horaIngreso, nombreCompleto, telefono, email, notas, modalidad, List.of());
    }

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
