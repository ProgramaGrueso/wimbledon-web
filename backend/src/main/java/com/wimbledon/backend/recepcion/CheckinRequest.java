package com.wimbledon.backend.recepcion;

import jakarta.validation.constraints.NotBlank;

/** Request para validar un QR escaneado en recepción. */
public record CheckinRequest(
        @NotBlank(message = "El token del QR es requerido")
        String token
) {}
