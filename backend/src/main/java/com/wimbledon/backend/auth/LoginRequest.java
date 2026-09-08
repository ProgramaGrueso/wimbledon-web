package com.wimbledon.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request de login: email + contraseña en texto plano.
 * El servidor valida contra el hash BCrypt almacenado.
 */
public record LoginRequest(
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "Ingresa un email válido")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {}
