package com.wimbledon.backend.auth;

import com.wimbledon.backend.domain.Usuario;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints de autenticación — TODOS públicos salvo /me.
 *
 * POST /api/auth/login           → login con email + password, retorna JWT + rol
 * POST /api/auth/registro-cliente → registro de nuevo cliente (rol CLIENTE)
 * GET  /api/auth/me              → datos del usuario autenticado (requiere JWT)
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Login principal.
     * Retorna el token JWT más nombre, email y rol para que el frontend
     * React configure el contexto de autenticación y decida qué rutas mostrar.
     *
     * Ejemplo de request:
     * POST /api/auth/login
     * { "email": "recepcion@wimbledon.test", "password": "Wimbledon2024!" }
     *
     * Ejemplo de response 200:
     * { "token": "eyJ...", "tipo": "Bearer", "rol": "RECEPCIONISTA",
     *   "nombre": "Fabiana La Madrid", "email": "recepcion@wimbledon.test" }
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Registro de nuevo cliente desde el portal web.
     * Solo crea cuentas con rol CLIENTE.
     * El registro de staff (recepcionistas, limpieza) lo hace el Admin
     * desde /api/admin/usuarios.
     *
     * Retorna 201 Created con el token JWT para iniciar sesión inmediatamente.
     */
    @PostMapping("/registro-cliente")
    public ResponseEntity<AuthResponse> registrarCliente(
            @Valid @RequestBody RegistroClienteRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registrarCliente(request));
    }

    /**
     * Registro público de personal del hotel (Staff).
     * La cuenta queda en estado PENDIENTE_APROBACION hasta que un administrador la apruebe.
     */
    @PostMapping("/registro")
    public ResponseEntity<Void> registrarPersonal(
            @Valid @RequestBody RegistroPersonalRequest request
    ) {
        authService.registrarPersonal(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Devuelve el usuario autenticado y su rol.
     * El frontend usa este endpoint para:
     *  - Verificar que el token guardado en localStorage sigue siendo válido
     *  - Refrescar el contexto de autenticación al recargar la página
     *
     * @AuthenticationPrincipal inyecta el Usuario (que implementa UserDetails)
     * directamente del SecurityContext, sin query a la BD.
     */
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal Usuario usuario) {
        return ResponseEntity.ok(new MeResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol().name()
        ));
    }

    /** DTO de respuesta para /me */
    public record MeResponse(Integer id, String nombre, String email, String rol) {}
}
