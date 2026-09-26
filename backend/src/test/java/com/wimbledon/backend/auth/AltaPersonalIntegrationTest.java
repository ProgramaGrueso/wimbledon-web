package com.wimbledon.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wimbledon.backend.admin.UsuarioAdminController;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoCuenta;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.domain.enums.RolSolicitable;
import com.wimbledon.backend.exception.GlobalExceptionHandler;
import com.wimbledon.backend.repository.UsuarioRepository;
import com.wimbledon.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Alta de Personal con Aprobación — Ciclo de vida y validación de roles")
class AltaPersonalIntegrationTest {

    private MockMvc authMockMvc;
    private MockMvc adminMockMvc;
    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private ObjectMapper objectMapper;

    private Map<String, Usuario> baseDeDatosSimulada;
    private int idGen = 100;

    @BeforeEach
    void setUp() {
        usuarioRepository = Mockito.mock(UsuarioRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        jwtService = Mockito.mock(JwtService.class);
        objectMapper = new ObjectMapper();

        baseDeDatosSimulada = new HashMap<>();

        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "HASH_" + inv.getArgument(0));
        when(passwordEncoder.matches(anyString(), anyString())).thenAnswer(inv -> {
            String raw = inv.getArgument(0);
            String hash = inv.getArgument(1);
            return hash.equals("HASH_" + raw);
        });

        when(usuarioRepository.existsByEmail(anyString())).thenAnswer(inv ->
                baseDeDatosSimulada.containsKey(inv.getArgument(0)));

        when(usuarioRepository.findByEmail(anyString())).thenAnswer(inv ->
                Optional.ofNullable(baseDeDatosSimulada.get(inv.getArgument(0))));

        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(++idGen);
            }
            baseDeDatosSimulada.put(u.getEmail(), u);
            return u;
        });

        when(usuarioRepository.findById(any())).thenAnswer(inv -> {
            Integer id = inv.getArgument(0);
            return baseDeDatosSimulada.values().stream()
                    .filter(u -> id.equals(u.getId()))
                    .findFirst();
        });

        when(jwtService.generarToken(any(Usuario.class))).thenReturn("jwt-token-valido-test");

        AuthService authService = new AuthService(usuarioRepository, passwordEncoder, jwtService);
        AuthController authController = new AuthController(authService);
        UsuarioAdminController usuarioAdminController = new UsuarioAdminController(usuarioRepository);

        authMockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        adminMockMvc = MockMvcBuilders.standaloneSetup(usuarioAdminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("(1) Registro de staff seguido de login inmediato devuelve 403 pendiente de aprobación")
    void testRegistroSeguidoDeLoginDevuelve403() throws Exception {
        String email = "nueva.recepcion@wimbledon.pe";
        String password = "PasswordSeguro123!";

        // 1. Registro
        String registroJson = """
            {
                "email": "%s",
                "password": "%s",
                "rol": "RECEPCIONISTA"
            }
            """.formatted(email, password);

        authMockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registroJson))
                .andExpect(status().isCreated());

        // 2. Login inmediato -> 403 Forbidden ("pendiente de aprobación")
        String loginJson = """
            {
                "email": "%s",
                "password": "%s"
            }
            """.formatted(email, password);

        authMockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Tu cuenta fue creada pero aún no ha sido aprobada por un administrador."))
                .andExpect(jsonPath("$.codigo").value("CUENTA_PENDIENTE_APROBACION"));
    }

    @Test
    @DisplayName("(2) Tras PATCH /aprobar por un administrador, el mismo login devuelve 200 con JWT y rol RECEPCIONISTA")
    void testAprobacionPermiteLoginExitoso() throws Exception {
        String email = "nueva.recepcion@wimbledon.pe";
        String password = "PasswordSeguro123!";

        // 1. Registrar usuario
        Usuario pendiente = Usuario.builder()
                .id(101)
                .nombre("nueva.recepcion")
                .email(email)
                .passwordHash("HASH_" + password)
                .rol(Rol.RECEPCIONISTA)
                .rolSolicitado(RolSolicitable.RECEPCIONISTA)
                .estado(EstadoCuenta.PENDIENTE_APROBACION)
                .activo(false)
                .build();
        baseDeDatosSimulada.put(email, pendiente);

        // 2. Administrador aprueba
        adminMockMvc.perform(patch("/api/admin/usuarios/101/aprobar"))
                .andExpect(status().isNoContent());

        // 3. Login posterior -> 200 OK con JWT y rol RECEPCIONISTA
        String loginJson = """
            {
                "email": "%s",
                "password": "%s"
            }
            """.formatted(email, password);

        authMockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-valido-test"))
                .andExpect(jsonPath("$.rol").value("RECEPCIONISTA"));
    }

    @Test
    @DisplayName("(3) Intento de registro con rol SUPER_ADMIN es rechazado por el DTO (400 Bad Request)")
    void testRechazoRolInvalidoEnRegistro() throws Exception {
        String payload = """
            {
                "email": "hacker@wimbledon.pe",
                "password": "PasswordInseguro123",
                "rol": "SUPER_ADMIN"
            }
            """;

        authMockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }
}
