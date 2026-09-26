package com.wimbledon.backend.recepcion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Request para validar un QR escaneado en recepción.
 *
 * Acepta tanto el UUID puro (36 caracteres) como la URL completa de check-in
 * (ej: https://wimbledon-web.vercel.app/checkin/<uuid>) de hasta 128 caracteres.
 */
public record CheckinRequest(
        @NotBlank(message = "El token del QR es requerido")
        @Size(max = 128, message = "El token del QR no puede superar 128 caracteres")
        String token
) {
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    /** Extrae el UUID puro sin importar si llega como URL completa o como token crudo. */
    public String tokenNormalizado() {
        if (token == null) {
            return null;
        }
        Matcher m = UUID_PATTERN.matcher(token);
        return m.find() ? m.group() : token.trim();
    }
}
