package com.wimbledon.backend.domain.enums;

/**
 * Taxonomia interna de motivos por los que se rechaza una credencial de check-in.
 *
 * NUNCA sale por HTTP: la capa de respuesta colapsa tres de estos valores
 * (DESCONOCIDA, FUORA_DE_VENTANA, YA_USADA) en un unico codigo
 * QR_NO_UTILIZABLE con un unico mensaje, mientras este enum conserva la
 * granularidad que necesita la auditoria de intentos.
 */
public enum MotivoRechazo {
    /** El token no corresponde a ninguna fila de reservas. */
    DESCONOCIDA,
    /** El instante actual cae fuera de la ventana de vigencia de la reserva. */
    FUERA_DE_VENTANA,
    /** La credencial ya fue consumida por un check-in previo. */
    YA_USADA,
    /** La reserva esta en estado CANCELADA. */
    CANCELADA,
    /** La reserva esta en estado FINALIZADA. */
    FINALIZADA,
    /** La habitacion requiere aseo o desinfeccion antes de ser ocupada. */
    HABITACION_REQUIERE_ASEO,
    /** Fallo inesperado, sin clasificacion de negocio. */
    ERROR
}
