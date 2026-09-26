package com.wimbledon.backend.domain.enums;

/**
 * Estado de una cuenta de personal en el sistema.
 *
 * Flujo:
 * PENDIENTE_APROBACION -> Creado por auto-registro, requiere aprobación de un Administrador.
 * ACTIVO               -> Aprobado y habilitado para iniciar sesión.
 * DESACTIVADO          -> Inhabilitado para acceder al sistema.
 */
public enum EstadoCuenta {
    PENDIENTE_APROBACION,
    ACTIVO,
    DESACTIVADO
}
