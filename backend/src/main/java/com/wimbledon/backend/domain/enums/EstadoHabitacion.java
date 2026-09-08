package com.wimbledon.backend.domain.enums;

/**
 * Estados del ciclo de vida de una habitación.
 *
 * Transiciones permitidas:
 *  Limpieza:   LIMPIEZA_PENDIENTE → EN_PROCESO → LISTA
 *  Recepción:  LISTA → OCUPADA (check-in) | OCUPADA → LIMPIEZA_PENDIENTE (check-out)
 *  Admin:      cualquier estado ↔ MANTENIMIENTO
 */
public enum EstadoHabitacion {
    /** Habitación disponible para reservar */
    DISPONIBLE,
    /** Actualmente con huésped */
    OCUPADA,
    /** Huésped salió, pendiente que Limpieza atienda */
    LIMPIEZA_PENDIENTE,
    /** Personal de limpieza trabajando en este momento */
    EN_PROCESO,
    /** Lista para recibir nuevo huésped */
    LISTA,
    /** Fuera de servicio por reparación */
    MANTENIMIENTO
}
