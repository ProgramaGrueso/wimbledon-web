package com.wimbledon.backend.domain.enums;

/**
 * Resultado de un intento de check-in, exitoso o rechazado.
 *
 * La granularidad del motivo vive en {@link MotivoRechazo}; este enum solo
 * distingue el desenlace de la operacion.
 */
public enum ResultadoIntento {
    /** El ingreso se registro. */
    EXITOSO,
    /** El intento se rechazo por alguna condicion de negocio. */
    FALLIDO
}
