package com.wimbledon.backend.auth;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.repository.UsuarioRepository;
import com.wimbledon.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Lógica de negocio de autenticación.
 * Los errores de credenciales incorrectas los lanza el AuthenticationManager
 * como BadCredentialsException → GlobalExceptionHandler devuelve 401.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    // ── Login ─────────────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        // authenticate() lanza BadCredentialsException si las credenciales son incorrectas
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        // Si llegamos aquí, el usuario existe y la contraseña es correcta
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(); // nunca llega acá si authenticate() tuvo éxito

        String token = jwtService.generarToken(usuario);
        return AuthResponse.of(token, usuario.getRol().name(), usuario.getNombre(), usuario.getEmail());
    }

    // ── Registro de cliente ───────────────────────────────────────────────────

    public AuthResponse registrarCliente(RegistroClienteRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException(
                    "Ya existe una cuenta con ese email. ¿Olvidaste tu contraseña?");
        }

        Usuario nuevo = Usuario.builder()
                .nombre(request.nombre())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .rol(Rol.CLIENTE)
                .activo(true)
                .build();

        usuarioRepository.save(nuevo);

        String token = jwtService.generarToken(nuevo);
        return AuthResponse.of(token, nuevo.getRol().name(), nuevo.getNombre(), nuevo.getEmail());
    }
}
