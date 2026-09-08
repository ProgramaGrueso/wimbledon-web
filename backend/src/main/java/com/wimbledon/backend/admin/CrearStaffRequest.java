package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.enums.Rol;
import jakarta.validation.constraints.*;

/**
 * Request para crear un usuario de staff desde el panel de administración.
 *
 * Roles permitidos: RECEPCIONISTA, LIMPIEZA.
 * El Admin NO puede crear otros Administradores ni Super Admins.
 * Solo SUPER_ADMIN puede elevar un rol a ADMINISTRADOR.
 */
public record CrearStaffRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100)
        String nombre,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "Email inválido")
        String email,

        @NotBlank(message = "La contraseña inicial es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String password,

        @NotNull(message = "El rol es obligatorio")
        Rol rol
) {}
