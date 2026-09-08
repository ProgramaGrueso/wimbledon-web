package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.Rol;

import java.time.LocalDateTime;

/** Vista de usuario para el panel de administración. No expone el hash de contraseña. */
public record UsuarioAdminResponse(
        Integer id,
        String nombre,
        String email,
        Rol rol,
        Boolean activo,
        LocalDateTime creadoEn
) {
    public static UsuarioAdminResponse from(Usuario u) {
        return new UsuarioAdminResponse(
                u.getId(), u.getNombre(), u.getEmail(),
                u.getRol(), u.getActivo(), u.getCreadoEn()
        );
    }
}
