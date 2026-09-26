package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoCuenta;

import java.time.LocalDateTime;

public record UsuarioPendienteDTO(
        Integer id,
        String email,
        String nombre,
        String rolSolicitado,
        EstadoCuenta estado,
        LocalDateTime creadoEn
) {
    public static UsuarioPendienteDTO from(Usuario u) {
        return new UsuarioPendienteDTO(
                u.getId(),
                u.getEmail(),
                u.getNombre(),
                u.getRolSolicitado() != null ? u.getRolSolicitado().name() : (u.getRol() != null ? u.getRol().name() : null),
                u.getEstado(),
                u.getCreadoEn()
        );
    }
}
