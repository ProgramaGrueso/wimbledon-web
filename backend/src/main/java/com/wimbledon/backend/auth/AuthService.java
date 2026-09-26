package com.wimbledon.backend.auth;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoCuenta;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.exception.CredencialesInvalidasException;
import com.wimbledon.backend.exception.CuentaDesactivadaException;
import com.wimbledon.backend.exception.CuentaPendienteAprobacionException;
import com.wimbledon.backend.exception.EmailYaRegistradoException;
import com.wimbledon.backend.repository.UsuarioRepository;
import com.wimbledon.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Lógica de negocio de autenticación.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // ── Login ─────────────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(CredencialesInvalidasException::new);

        if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new CredencialesInvalidasException();
        }

        if (usuario.getEstado() == EstadoCuenta.PENDIENTE_APROBACION) {
            throw new CuentaPendienteAprobacionException(
                    "Tu cuenta fue creada pero aún no ha sido aprobada por un administrador.");
        }

        if (usuario.getEstado() == EstadoCuenta.DESACTIVADO || !Boolean.TRUE.equals(usuario.getActivo())) {
            throw new CuentaDesactivadaException();
        }

        String token = jwtService.generarToken(usuario);
        return AuthResponse.of(token, usuario.getRol().name(), usuario.getNombre(), usuario.getEmail());
    }

    // ── Registro de personal (Staff con aprobación) ─────────────────────────────

    public void registrarPersonal(RegistroPersonalRequest req) {
        if (usuarioRepository.existsByEmail(req.email())) {
            throw new EmailYaRegistradoException();
        }

        Usuario nuevo = new Usuario();
        nuevo.setEmail(req.email());
        nuevo.setNombre(req.email().split("@")[0]);
        nuevo.setPasswordHash(passwordEncoder.encode(req.password()));
        nuevo.setRolSolicitado(req.rol());
        nuevo.setRol(req.rol().toRol());
        nuevo.setEstado(EstadoCuenta.PENDIENTE_APROBACION);
        nuevo.setActivo(false);

        usuarioRepository.save(nuevo);
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
                .estado(EstadoCuenta.ACTIVO)
                .activo(true)
                .build();

        usuarioRepository.save(nuevo);

        String token = jwtService.generarToken(nuevo);
        return AuthResponse.of(token, nuevo.getRol().name(), nuevo.getNombre(), nuevo.getEmail());
    }
}
