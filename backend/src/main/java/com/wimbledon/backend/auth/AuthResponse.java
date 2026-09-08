package com.wimbledon.backend.auth;

/**
 * Respuesta de login exitoso.
 *
 * El frontend React usa 'rol' para decidir qué vistas mostrar
 * (sin necesidad de llamar a /me en cada montaje de componente).
 *
 * Ejemplo JSON:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiJ9...",
 *   "tipo":  "Bearer",
 *   "rol":   "RECEPCIONISTA",
 *   "nombre": "Fabiana La Madrid",
 *   "email":  "recepcion@wimbledon.test"
 * }
 */
public record AuthResponse(
        String token,
        String tipo,
        String rol,
        String nombre,
        String email
) {
    /** Constructor de conveniencia con tipo Bearer por defecto. */
    public static AuthResponse of(String token, String rol, String nombre, String email) {
        return new AuthResponse(token, "Bearer", rol, nombre, email);
    }
}
