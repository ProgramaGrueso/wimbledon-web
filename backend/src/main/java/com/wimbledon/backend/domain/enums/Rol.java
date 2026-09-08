package com.wimbledon.backend.domain.enums;

/**
 * Los 5 roles del sistema Hotel Wimbledon.
 * Guardados como STRING en la columna rol de la tabla usuarios.
 *
 * Jerarquía de permisos (mayor → menor):
 *   SUPER_ADMIN > ADMINISTRADOR > RECEPCIONISTA > LIMPIEZA > CLIENTE
 *
 * Ver matriz completa en arquitectura/01-RBAC-Hotel-Wimbledon.md
 */
public enum Rol {
    /** DevOps / TI — acceso total incluyendo configuración de infraestructura */
    SUPER_ADMIN,
    /** Gerencia — dashboard financiero, CRUD habitaciones, gestión de personal */
    ADMINISTRADOR,
    /** Front-desk / Caja — check-in, agenda del día, reservas manuales */
    RECEPCIONISTA,
    /** Housekeeping — solo estado de habitaciones e incidencias físicas */
    LIMPIEZA,
    /** Huésped — auto-reserva 24/7, ficha propia, descarga de QR */
    CLIENTE
}
