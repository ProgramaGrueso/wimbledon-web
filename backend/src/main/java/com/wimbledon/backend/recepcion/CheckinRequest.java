package com.wimbledon.backend.recepcion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request para validar un QR escaneado en recepción.
 *
 * \`token\` es el \`qrToken\` emitido por el backend, un UUID de 36 caracteres.
 * La cota de 64 no es arbitraria: es la longitud declarada de la columna
 * \`reservas.qr_token\`. Rechaza por longitud exactamente lo que el
 * almacenamiento no podría contener, sin rechazar ninguna credencial legítima
 * y sin atar el DTO a una longitud que la columna pueda ampliar después.
 *
 * No se declara \`@Pattern\` de UUID: rechazaría en \`400\` un token no UUID con
 * un mensaje específico, que es una vía de distinción que la unificación de
 * rechazos no necesita y que la longitud sola ya cierra.
 */
public record CheckinRequest(
        @NotBlank(message = "El token del QR es requerido")
        @Size(max = 64, message = "El token del QR no puede superar 64 caracteres")
        String token
) {}
