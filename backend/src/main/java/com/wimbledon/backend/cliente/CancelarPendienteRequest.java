package com.wimbledon.backend.cliente;

import jakarta.validation.constraints.NotBlank;

public record CancelarPendienteRequest(
        @NotBlank(message = "El token de la reserva (qrToken) es obligatorio.")
        String qrToken
) {}
