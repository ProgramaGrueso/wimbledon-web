package com.wimbledon.backend.cliente;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request para reprogramar una reserva existente.
 *
 * Endpoint: PATCH /api/cliente/reservas/{id}/reprogramar
 *
 * Regla de negocio: solo se puede reprogramar si faltan más de X horas
 * para la hora de ingreso (configurado en wimbledon.reservas.horas-cancelacion).
 */
public record ReprogramarReservaRequest(

        @NotNull(message = "Indica la nueva fecha")
        @FutureOrPresent(message = "La fecha no puede ser en el pasado")
        LocalDate fecha,

        @NotNull(message = "Indica la nueva hora de ingreso")
        LocalTime horaIngreso
) {}
