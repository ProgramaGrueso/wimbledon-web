package com.wimbledon.backend.admin;

import jakarta.validation.constraints.Size;

/**
 * Request para actualizar variables de infraestructura críticas (solo SUPER_ADMIN).
 * Campos opcionales: si vienen nulos o vacíos se conserva el valor anterior.
 */
public record ActualizarConfiguracionRequest(
        @Size(max = 255)
        String pasarelaPagoApiKey,

        @Size(max = 255)
        String pasarelaPagoWebhookSecret,

        @Size(max = 255)
        String whatsappApiKey,

        @Size(max = 30)
        String whatsappNumeroTelefono,

        @Size(max = 100)
        String smtpHost,

        Integer smtpPort,

        @Size(max = 100)
        String smtpUsername,

        @Size(max = 100)
        String smtpPassword,

        @Size(max = 150)
        String correoRemitente,

        @Size(max = 255)
        String urlPortalFrontend
) {}
