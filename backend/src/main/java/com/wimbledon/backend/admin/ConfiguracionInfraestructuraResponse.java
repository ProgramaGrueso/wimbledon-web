package com.wimbledon.backend.admin;

/**
 * Vista de configuración de infraestructura sensible (solo para SUPER_ADMIN).
 * Las claves privadas se devuelven enmascaradas para evitar exposición accidental.
 */
public record ConfiguracionInfraestructuraResponse(
        String pasarelaPagoProveedor,
        String pasarelaPagoApiKeyEnmascarada,
        String pasarelaPagoWebhookSecretEnmascarado,
        String whatsappProveedor,
        String whatsappApiKeyEnmascarada,
        String whatsappNumeroTelefono,
        String smtpHost,
        int smtpPort,
        String smtpUsername,
        String correoRemitente,
        String urlPortalFrontend,
        String ambiente
) {}
