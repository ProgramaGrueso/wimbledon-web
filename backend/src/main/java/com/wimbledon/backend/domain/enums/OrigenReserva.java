package com.wimbledon.backend.domain.enums;

/** Origen de la reserva: creada por el portal web o manualmente por Recepción. */
public enum OrigenReserva {
    /** Auto-reserva desde el portal del cliente (24/7) */
    ONLINE,
    /** Creada por Recepcionista (walk-in o telefónica) */
    MANUAL
}
