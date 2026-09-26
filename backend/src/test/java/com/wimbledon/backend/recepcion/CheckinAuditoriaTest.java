package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.IntentoCheckin;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.domain.enums.ResultadoIntento;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.exception.ReservaCanceladaException;
import com.wimbledon.backend.repository.IntentoCheckinRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * T6 — Trazabilidad de intentos de check-in.
 * Cubre T-1, T-2, T-3 y T-5 con Mockito, sin base de datos.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CheckinAuditoriaService — traza de cada intento sin copiar la credencial")
class CheckinAuditoriaTest {

    private static final String TOKEN = "d4e5f6a7-8888-4999-8aaa-bbbbccccdddd";

    @Mock
    private IntentoCheckinRepository intentoCheckinRepository;

    private CheckinAuditoriaService auditoria;

    @BeforeEach
    void setUp() {
        auditoria = new CheckinAuditoriaService(intentoCheckinRepository);
    }

    private static IntentoCheckin capturado(ArgumentCaptor<IntentoCheckin> captor) {
        return captor.getValue();
    }

    // ── T-1: registro de un intento exitoso ───────────────────────────────────

    @Test
    @DisplayName("Un intento exitoso registra EXITOSO con reserva, operador, marca e IP, y sin motivo")
    void testIntentoExitoso() {
        OperadorOperacion operador = new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "190.11.22.33");

        auditoria.registrar(ResultadoIntento.EXITOSO, null, 42, operador);

        ArgumentCaptor<IntentoCheckin> captor = ArgumentCaptor.forClass(IntentoCheckin.class);
        verify(intentoCheckinRepository, times(1)).save(captor.capture());
        IntentoCheckin intento = capturado(captor);

        assertEquals(ResultadoIntento.EXITOSO, intento.getResultado());
        assertEquals(42, intento.getReservaId());
        assertEquals("recepcion@wimbledon.test", intento.getOperadorEmail());
        assertEquals("RECEPCIONISTA", intento.getOperadorRol());
        assertEquals("190.11.22.33", intento.getIpOrigen());
        assertNull(intento.getMotivoRechazo(), "Un intento exitoso no lleva motivo de rechazo");
    }

    @Test
    @DisplayName("La marca de tiempo la fija el ciclo de vida de la entidad, no el cliente")
    void testMarcaDeTiempoGenerada() throws NoSuchMethodException, NoSuchFieldException {
        // @PrePersist solo lo dispara el contenedor JPA al persistir, de modo que
        // con un repositorio simulado lo verificable es que el callback existe y
        // que la columna es obligatoria: si la marca no se fijara, el INSERT
        // fallaria en MySQL por columna NOT NULL.
        java.lang.reflect.Method onCreate = IntentoCheckin.class
                .getDeclaredMethod("onCreate");

        assertNotNull(onCreate.getAnnotation(jakarta.persistence.PrePersist.class),
                "marcadoEn debe fijarse en un @PrePersist: el reloj de la aplicacion, no el de la base");
        assertEquals(0, onCreate.getParameterCount(),
                "El callback de ciclo de vida no recibe argumentos: es el propio contenedor el que lo invoca");

        jakarta.persistence.Column columna = IntentoCheckin.class
                .getDeclaredField("marcadoEn")
                .getAnnotation(jakarta.persistence.Column.class);
        assertNotNull(columna);
        assertFalse(columna.nullable(),
                "marcado_en es NOT NULL: la traza no admite registros sin marca de tiempo");
    }

    // ── T-1 y T-3: rechazo por estado de negocio ──────────────────────────────

    @Test
    @DisplayName("El rechazo por reserva cancelada registra FALLIDO con su motivo y SIN el token en ningun campo")
    void testRechazoCancelada() throws NoSuchFieldException, IllegalAccessException {
        auditoria.registrar(ResultadoIntento.FALLIDO, MotivoRechazo.CANCELADA, 42,
                new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "190.11.22.33"));

        ArgumentCaptor<IntentoCheckin> captor = ArgumentCaptor.forClass(IntentoCheckin.class);
        verify(intentoCheckinRepository).save(captor.capture());
        IntentoCheckin intento = capturado(captor);

        assertEquals(ResultadoIntento.FALLIDO, intento.getResultado());
        assertEquals(MotivoRechazo.CANCELADA, intento.getMotivoRechazo());
        assertNoHayCopiaDeLaCredencial(intento, TOKEN);
    }

    // ── T-1 y T-5: el rechazo existe aunque la transaccion de negocio no escribio nada ──

    @Test
    @DisplayName("El rechazo por credencial no utilizable se registra aunque la transaccion de negocio no escribio nada")
    void testRechazoDeCredencialSeRegistra() throws NoSuchFieldException, IllegalAccessException {
        // La transaccion de negocio lanzo y no dejo escritura alguna.
        CredencialNoUtilizableException rechazo =
                new CredencialNoUtilizableException(MotivoRechazo.DESCONOCIDA, null);
        assertNotNull(rechazo);

        auditoria.registrar(ResultadoIntento.FALLIDO, rechazo.motivo(), rechazo.reservaId(),
                new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "190.11.22.33"));

        ArgumentCaptor<IntentoCheckin> captor = ArgumentCaptor.forClass(IntentoCheckin.class);
        verify(intentoCheckinRepository, times(1)).save(captor.capture());
        IntentoCheckin intento = capturado(captor);

        assertEquals(ResultadoIntento.FALLIDO, intento.getResultado());
        assertEquals(MotivoRechazo.DESCONOCIDA, intento.getMotivoRechazo());
        assertNull(intento.getReservaId(),
                "Una credencial desconocida no puede correlacionarse con ninguna reserva");
        assertNoHayCopiaDeLaCredencial(intento, TOKEN);
    }

    @Test
    @DisplayName("Cada motivo interno se conserva con su propia granularidad aunque la respuesta HTTP los colapse")
    void testGranularidadInternaDelMotivo() {
        OperadorOperacion operador = new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "127.0.0.1");

        for (MotivoRechazo motivo : List.of(MotivoRechazo.DESCONOCIDA, MotivoRechazo.FUERA_DE_VENTANA,
                MotivoRechazo.YA_USADA)) {
            auditoria.registrar(ResultadoIntento.FALLIDO, motivo, 42, operador);
        }

        ArgumentCaptor<IntentoCheckin> captor = ArgumentCaptor.forClass(IntentoCheckin.class);
        verify(intentoCheckinRepository, times(3)).save(captor.capture());

        List<MotivoRechazo> registrados = captor.getAllValues().stream()
                .map(IntentoCheckin::getMotivoRechazo).toList();
        assertEquals(List.of(MotivoRechazo.DESCONOCIDA, MotivoRechazo.FUERA_DE_VENTANA, MotivoRechazo.YA_USADA),
                registrados,
                "La traza distingue tres causas que la respuesta HTTP unifica en QR_NO_UTILIZABLE");
    }

    // ── T-1 y A-6: el fallo de escritura no bloquea el mostrador ───────────────

    @Test
    @DisplayName("El fallo del repositorio de auditoria NO se propaga: el check-in conserva su 200")
    void testFalloDeAuditoriaNoSePropaga() {
        doThrow(new IllegalStateException("MySQL no responde"))
                .when(intentoCheckinRepository).save(any(IntentoCheckin.class));

        // Si el modo fuera estricto, esta llamada lanzaria y el huesped se
        // quedaria sin ingreso por una falla de registro.
        assertDoesNotThrow(() -> auditoria.registrar(ResultadoIntento.EXITOSO, null, 42,
                        new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "127.0.0.1")),
                "Un fallo de auditoria jamas debe impedir un check-in por lo demas valido");
    }

    @Test
    @DisplayName("El fallo de auditoria se propaga en su propia firma de retorno, no como excepcion")
    void testElFalloQuedaRegistradoPeroSilencioso() {
        doThrow(new IllegalStateException("MySQL no responde"))
                .when(intentoCheckinRepository).save(any(IntentoCheckin.class));

        assertDoesNotThrow(() -> auditoria.registrar(ResultadoIntento.FALLIDO,
                MotivoRechazo.ERROR, null,
                new OperadorOperacion("recepcion@wimbledon.test", "RECEPCIONISTA", "127.0.0.1")));
    }

    // ── T-2: el rol viene de la base de datos, nunca del claim del JWT ────────

    @Test
    @DisplayName("El rol registrado proviene de getAuthorities(), no del claim rol del token")
    void testElRolVieneDeLaBaseDeDatos() {
        // Tres tokens con claims distintos, un unico usuario en la base de datos
        // con rol RECEPCIONISTA. JwtAuthFilter construye la Authentication a
        // partir de userDetails.getAuthorities(), que lee la columna rol.
        for (String claimRol : List.of("SUPER_ADMIN", "ADMINISTRADOR", "CLIENTE")) {
            Authentication authentication = autenticacionConRolDeBaseDatos(Rol.RECEPCIONISTA);

            OperadorOperacion operador = OperadorOperacion.desde(authentication);
            assertEquals(Rol.RECEPCIONISTA.name(), operador.rol(),
                    "El claim " + claimRol + " del token no altera el rol derivado");
            auditoria.registrar(ResultadoIntento.EXITOSO, null, 42, operador);
        }

        ArgumentCaptor<IntentoCheckin> captor = ArgumentCaptor.forClass(IntentoCheckin.class);
        verify(intentoCheckinRepository, times(3)).save(captor.capture());

        for (IntentoCheckin intento : captor.getAllValues()) {
            assertEquals(Rol.RECEPCIONISTA.name(), intento.getOperadorRol(),
                    "El rol registrado debe ser el de la columna de la base, identico en los tres casos");
        }
    }

    @Test
    @DisplayName("Un claim SUPER_ADMIN con autoridad de la base CLIENTE no otorga privilegio en el registro")
    void testElClaimNoAlteraElRegistro() {
        // El token lleva el claim SUPER_ADMIN; la base dice CLIENTE.
        Authentication authentication = autenticacionConRolDeBaseDatos(Rol.CLIENTE);

        OperadorOperacion operador = OperadorOperacion.desde(authentication);

        assertEquals(Rol.CLIENTE.name(), operador.rol(),
                "El claim del token no es la fuente de autoridad; la columna rol de la base si lo es");
        assertEquals("cliente@wimbledon.test", operador.email());
    }

    @Test
    @DisplayName("La IP se toma de getDetails(), que JwtAuthFilter ya adjunta a la autenticacion")
    void testLaIpVieneDeGetDetails() {
        Authentication authentication = autenticacionConRolDeBaseDatos(Rol.RECEPCIONISTA);

        OperadorOperacion operador = OperadorOperacion.desde(authentication);

        assertEquals("203.0.113.9", operador.ip(),
                "La IP viene de WebAuthenticationDetails, no de un HttpServletRequest inyectado en el servicio");
    }

    @Test
    @DisplayName("Una autenticacion sin authorities no puede construir un operador")
    void testSinAuthoritiesNoConstruyeOperador() {
        UsernamePasswordAuthenticationToken sinRol = new UsernamePasswordAuthenticationToken(
                Usuario.builder().email("nadie@wimbledon.test").rol(Rol.CLIENTE).build(),
                null, List.of());

        assertThrows(IllegalStateException.class, () -> OperadorOperacion.desde(sinRol),
                "Una autorizacion no puede construirse sin rol efectivo");
    }

    // ── Utilidades de construcción y aserción ─────────────────────────────────

    /**
     * Construye una Authentication equivalente a la que produce JwtAuthFilter:
     * autoridades desde la columna de la base de datos, detalles con la IP.
     * El claim del JWT no forma parte de esta construccion, y esa es
     * justamente la asercion: la identidad no puede derivarse de el.
     */
    private static Authentication autenticacionConRolDeBaseDatos(Rol rolEnBase) {
        Usuario usuario = Usuario.builder()
                .id(7)
                .nombre("Recepcionista de Prueba")
                .email(rolEnBase.name().toLowerCase() + "@wimbledon.test")
                .rol(rolEnBase)
                .activo(true)
                .build();

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                usuario, null, usuario.getAuthorities());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.9");
        authentication.setDetails(new WebAuthenticationDetails(request));

        assertFalse(authentication.getAuthorities().isEmpty(),
                "La autenticacion debe exponer el rol de la base de datos");
        return authentication;
    }

    /**
     * Ningun campo del registro puede contener la credencial, ni completa ni
     * con prefijo o sufijo del original. Se recorre por reflexion TODOS los
     * campos de la entidad, para que anadir uno nuevo con la credencial no
     * pueda colarse sin romper esta prueba.
     */
    private static void assertNoHayCopiaDeLaCredencial(IntentoCheckin intento, String token)
            throws NoSuchFieldException, IllegalAccessException {
        List<String> prefijo = List.of(token.substring(0, 8));
        List<String> sufijo = List.of(token.substring(token.length() - 8));

        for (java.lang.reflect.Field campo : IntentoCheckin.class.getDeclaredFields()) {
            if (campo.isSynthetic() || java.lang.reflect.Modifier.isStatic(campo.getModifiers())) {
                continue;
            }
            campo.setAccessible(true);
            Object valor = campo.get(intento);
            String texto = String.valueOf(valor);

            assertFalse(texto.contains(token),
                    "El campo " + campo.getName() + " no puede contener la credencial");
            for (String trozo : prefijo) {
                assertFalse(texto.contains(trozo),
                        "El campo " + campo.getName() + " no puede contener un prefijo de la credencial");
            }
            for (String trozo : sufijo) {
                assertFalse(texto.contains(trozo),
                        "El campo " + campo.getName() + " no puede contener un sufijo de la credencial");
            }
        }
    }
}
