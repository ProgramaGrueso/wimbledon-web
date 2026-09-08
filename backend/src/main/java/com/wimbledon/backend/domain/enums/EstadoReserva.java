package com.wimbledon.backend.domain.enums;

/**
 * Estados del ciclo de vida de una reserva.
 *
 * Flujo típico:
 *   PENDIENTE → CONFIRMADA → CHECKIN → FINALIZADA
 *   (cualquier estado) → CANCELADA
 */
public enum EstadoReserva {
    /** Creada, pendiente de pago o confirmación */
    PENDIENTE,
    /** Confirmada y QR enviado al huésped */
    CONFIRMADA,
    /** Huésped realizó check-in (QR validado en recepción) */
    CHECKIN,
    /** Estadía terminada */
    FINALIZADA,
    /** Reserva cancelada */
    CANCELADA
}
