package com.wimbledon.backend.recepcion;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Parametros de la ventana de validez del pase de check-in.
 *
 * Se enlaza por validacion en vez de con {@code @Value} porque el valor
 * debe rechazarse al inicio de la aplicacion y no degradarse en silencio.
 * Un valor negativo o fuera de rango aborta el arranque en lugar de
 * deshabilitar la anticipacion sin avisar.
 *
 * Propiedad: wimbledon.checkin.anticipacion-horas
 */
@Validated
@ConfigurationProperties(prefix = "wimbledon.checkin")
public record ConfiguracionCheckin(

        /**
         * Horas enteras de anticipacion ANTES del ingreso en las que el pase
         * ya puede consumerse. Desplaza SOLO el limite inferior de la ventana:
         * no alarga la ventana despues de la hora de salida, porque el pase
         * caduca cuando se libera la habitacion.
         *
         * Se declara como {@code Integer} y no como {@code int} a proposito:
         * con primitivo una propiedad ausente enlazaria a 0 en silencio.
         */
        @NotNull(message = "Debe declararse wimbledon.checkin.anticipacion-horas")
        @Min(value = 0, message = "La anticipacion no puede ser negativa")
        @Max(value = 24, message = "La anticipacion no puede superar 24 horas")
        Integer anticipacionHoras
) {}
