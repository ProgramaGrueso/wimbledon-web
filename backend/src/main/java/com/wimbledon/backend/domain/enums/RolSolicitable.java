package com.wimbledon.backend.domain.enums;

/**
 * Roles que un nuevo empleado puede solicitar al registrarse.
 * NUNCA permite solicitar ADMINISTRADOR ni SUPER_ADMIN.
 */
public enum RolSolicitable {
    RECEPCIONISTA,
    GERENTE,
    LIMPIEZA;

    public Rol toRol() {
        return switch (this) {
            case RECEPCIONISTA -> Rol.RECEPCIONISTA;
            case GERENTE -> Rol.ADMINISTRADOR;
            case LIMPIEZA -> Rol.LIMPIEZA;
        };
    }
}
