package com.wimbledon.backend.auth;

import com.wimbledon.backend.domain.enums.RolSolicitable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistroPersonalRequest(
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "Ingresa un email válido")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String password,

        @NotNull(message = "Debe seleccionar un rol")
        RolSolicitable rol
) {}
