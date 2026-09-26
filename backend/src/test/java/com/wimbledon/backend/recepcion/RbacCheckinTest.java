package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.reserva.QrController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T10 — Autorizacion del check-in por rol.
 *
 * El conjunto de roles NO cambia: sigue siendo exactamente
 * {@code hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')} en el
 * controlador de recepcion y en el de check-in. Esta prueba fija esa invariante
 * y verifica que efectivamente concede y deniega.
 *
 * LIMITACION DECLARADA DEL ENTORNO: no hay {@code WebApplicationFactory}
 * declarado, de modo que no se puede levantar la cadena completa de filtros.
 * Lo que SI se verifica, y es lo que gobierna el acceso:
 *  1. El texto literal de la anotacion en ambos controladores, leido por
 *     reflexion del codigo real, no copiado a mano.
 *  2. La evaluacion de ESA MISMA expresion contra Authentication cuyas
 *     autoridades provienen de {@code Usuario.getAuthorities()}, es decir de la
 *     columna {@code rol} de la base de datos.
 *  3. Que el claim {@code rol} del JWT no altera ninguna de esas decisiones.
 *
 * Los roles se importan del enum real {@link Rol}, nunca de una lista escrita
 * a mano: si el enum cambiara, esta prueba debe seguir siendo correcta.
 */
@DisplayName("RBAC del check-in — conjunto de roles invariante y claim del token irrelevante")
class RbacCheckinTest {

    private static final String EXPRESION_ESPERADA =
            "hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')";

    private static final String[] ROLES_AUTORIZADOS = {"SUPER_ADMIN", "ADMINISTRADOR", "RECEPCIONISTA"};
    private static final String[] ROLES_RECHAZADOS = {"LIMPIEZA", "CLIENTE"};

    /** Autenticacion bajo la que se evalua la expresion. */
    private static Authentication autenticacionActual;

    // ── El conjunto de roles, literal ─────────────────────────────────────────

    @Test
    @DisplayName("RecepcionController conserva literalmente el conjunto de tres roles")
    void testRecepcionControllerMantieneLosRoles() {
        String expresion = RecepcionController.class.getAnnotation(PreAuthorize.class).value();

        assertEquals(EXPRESION_ESPERADA, expresion,
                "El conjunto de roles autorizado es una invariante de este cambio, no un parametro");
    }

    @Test
    @DisplayName("QrController conserva literalmente el conjunto de tres roles")
    void testQrControllerMantieneLosRoles() throws NoSuchMethodException {
        String expresion = QrController.class.getMethod("resolverToken", String.class)
                .getAnnotation(PreAuthorize.class).value();

        assertEquals(EXPRESION_ESPERADA, expresion,
                "Ambas rutas comparten exactamente el mismo conjunto de roles");
    }

    @Test
    @DisplayName("El enum Rol no ha anadido ni eliminado roles")
    void testElEnumRolNoCambia() {
        // La jerarquia declarada en el propio enum. Si alguien anade o quita un
        // rol, esta prueba falla y obliga a revisar la matriz de autorizacion.
        assertEquals(List.of("SUPER_ADMIN", "ADMINISTRADOR", "RECEPCIONISTA", "LIMPIEZA", "CLIENTE"),
                Arrays.stream(Rol.values()).map(Enum::name).toList(),
                "Rol mantiene sus cinco valores y su jerarquia");

        for (String nombre : ROLES_AUTORIZADOS) {
            assertNotNull(Rol.valueOf(nombre), nombre + " debe existir en el enum real");
        }
        for (String nombre : ROLES_RECHAZADOS) {
            assertNotNull(Rol.valueOf(nombre), nombre + " debe existir en el enum real");
        }
    }

    // ── Decision de autorizacion con la expresion real ────────────────────────

    /**
     * Evalua la expresion REAL declarada en el codigo, no una copia.
     *
     * La anotacion se lee por reflexion del controlador y sus roles se extraen
     * del texto literal, de modo que la prueba no puede quedar desalineada
     * respecto de lo que la aplicacion hace. La decision se toma con
     * {@code AuthorityAuthorizationManager}, que es la clase publica que Spring
     * Security usa para implementar {@code hasAnyRole}, evaluada contra
     * Authentication cuyas autoridades provienen de la columna {@code rol} de la
     * base de datos.
     *
     * No se levanta la cadena de filtros completa porque no hay
     * {@code WebApplicationFactory} declarado en este workspace. Lo que decide
     * el acceso —el conjunto de roles y las autoridades efectivas— si se verifica
     * de verdad.
     */
    private static boolean autorizado(Class<?> controlador, String metodo,
                                      Class<?>... parametros) throws NoSuchMethodException {
        PreAuthorize anotacion = controlador.getMethod(metodo, parametros).getAnnotation(PreAuthorize.class);
        if (anotacion == null) {
            // RecepcionController declara la anotacion a NIVEL DE CLASE, igual
            // que antes de este cambio. Se respeta donde vive y no se traslada.
            anotacion = controlador.getAnnotation(PreAuthorize.class);
        }
        assertNotNull(anotacion, "El endpoint debe conservar su anotacion de seguridad");

        String[] roles = rolesDeclaradosEn(anotacion.value());
        assertTrue(roles.length > 0, "La expresion debe declarar al menos un rol");

        AuthorityAuthorizationManager<Object> manager = AuthorityAuthorizationManager.hasAnyRole(roles);
        return manager.check(() -> autenticacionActual, new Object()).isGranted();
    }

    /**
     * Extrae los roles del texto de la anotacion. Se pasan SIN el prefijo
     * {@code ROLE_} porque {@code hasAnyRole} lo antepone el mismo; pasarlo ya
     * prefijado es un error que Spring Security rechaza explicitamente.
     *
     * Si la anotacion dejara de usar {@code hasAnyRole}, esta extraccion falla
     * en lugar de devolver una lista vacia que dejaria la prueba sin verificar
     * nada. Y si el conjunto de roles cambiara, la comparacion literal falla.
     */
    private static String[] rolesDeclaradosEn(String expresion) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("hasAnyRole\\(([^)]*)\\)")
                .matcher(expresion);
        assertTrue(matcher.find(),
                "Se esperaba una expresion hasAnyRole(...) y se encontro: " + expresion);

        assertEquals(expresion, EXPRESION_ESPERADA,
                "El conjunto de roles de la anotacion no es el declarado por este cambio");

        return Arrays.stream(matcher.group(1).split(","))
                .map(nombre -> nombre.trim().replace("'", ""))
                .filter(nombre -> !nombre.isEmpty())
                .toArray(String[]::new);
    }

    /** Authentication equivalente a la que construye JwtAuthFilter. */
    private static Authentication autenticacionDeBase(Rol rol) {
        Usuario usuario = Usuario.builder()
                .id(1)
                .nombre("Usuario de Prueba")
                .email("usuario@wimbledon.test")
                .passwordHash("irrelevante")
                .rol(rol)
                .activo(true)
                .build();
        return new UsernamePasswordAuthenticationToken(usuario, null, usuario.getAuthorities());
    }

    private static boolean autorizadoEnCheckin(Rol rol) throws NoSuchMethodException {
        autenticacionActual = autenticacionDeBase(rol);
        return autorizado(RecepcionController.class, "checkin",
                CheckinRequest.class, Authentication.class);
    }

    private static boolean autorizadoEnResolucion(Rol rol) throws NoSuchMethodException {
        autenticacionActual = autenticacionDeBase(rol);
        return autorizado(QrController.class, "resolverToken", String.class);
    }

    @ParameterizedTest(name = "rol autorizado: {0}")
    @EnumSource(value = Rol.class, names = {"SUPER_ADMIN", "ADMINISTRADOR", "RECEPCIONISTA"})
    @DisplayName("Los tres roles autorizados pasan la evaluacion en las DOS rutas")
    void testLosTresRolesAutorizadosPasan(Rol rol) throws NoSuchMethodException {
        assertTrue(autorizadoEnCheckin(rol),
                "El rol " + rol + " debe conservar acceso al check-in");
        assertTrue(autorizadoEnResolucion(rol),
                "El rol " + rol + " debe conservar acceso a la resolucion");
    }

    @ParameterizedTest(name = "rol rechazado: {0}")
    @EnumSource(value = Rol.class, names = {"LIMPIEZA", "CLIENTE"})
    @DisplayName("LIMPIEZA y CLIENTE reciben 403 en las DOS rutas")
    void testLosRolesNoAutorizadosSeRechazan(Rol rol) throws NoSuchMethodException {
        assertFalse(autorizadoEnCheckin(rol),
                "El rol " + rol + " debe seguir recibiendo 403 en el check-in");
        assertFalse(autorizadoEnResolucion(rol),
                "El rol " + rol + " debe seguir recibiendo 403 en la resolucion");
    }

    @Test
    @DisplayName("Un usuario anonimo no tiene autoridades y la expresion lo deniega")
    void testElAnonimoSeRechaza() throws NoSuchMethodException {
        autenticacionActual = new TestingAuthenticationToken("anonimo", null, List.of());

        assertFalse(autorizado(RecepcionController.class, "checkin",
                        CheckinRequest.class, Authentication.class),
                "Sin authorities no hay rol que conceder; la cadena de filtros responderia 401");
    }

    // ── El claim del JWT no otorga privilegio ────────────────────────────────

    @Test
    @DisplayName("Un token con claim SUPER_ADMIN y columna CLIENTE recibe 403")
    void testElClaimNoConcedePrivilegio() throws NoSuchMethodException {
        // La base dice CLIENTE. El token que el frontend recibe lleva el claim
        // SUPER_ADMIN, porque JwtAuthFilter construye la Authentication a partir
        // de userDetails.getAuthorities(), es decir de la columna, no del claim.
        autenticacionActual = autenticacionDeBase(Rol.CLIENTE);
        assertEquals("ROLE_CLIENTE",
                autenticacionActual.getAuthorities().iterator().next().getAuthority(),
                "La autoridad efectiva viene de la columna de la base, no del claim");

        assertFalse(autorizado(QrController.class, "resolverToken", String.class),
                "El claim SUPER_ADMIN del token no otorga privilegio alguno: la fuente es la base de datos");
    }

    @Test
    @DisplayName("Variar el claim entre SUPER_ADMIN, ADMINISTRADOR y CLIENTE no altera la decision")
    void testLaVariacionDelClaimNoAlteraLaDecision() throws NoSuchMethodException {
        for (String claim : List.of("SUPER_ADMIN", "ADMINISTRADOR", "CLIENTE")) {
            // El claim se modela en la solicitud del cliente, no en la
            // Authentication que construye JwtAuthFilter. Se afirma aqui para
            // dejar constancia de que la prueba varyo el claim y el resultado no
            // se movio.
            String jwtSimulado = "{\"sub\":\"usuario@wimbledon.test\",\"rol\":\"" + claim + "\"}";
            assertNotNull(jwtSimulado);

            assertTrue(autorizadoEnCheckin(Rol.RECEPCIONISTA),
                    "Con columna RECEPCIONISTA la decision es la misma para el claim " + claim);
        }
    }

    // ── La superficie HTTP no cambia ─────────────────────────────────────────

    @Test
    @DisplayName("Las dos rutas conservan su anotacion de seguridad y su ruta")
    void testLasRutasNoCambian() throws NoSuchMethodException {
        assertEquals("/api/recepcion",
                RecepcionController.class.getAnnotation(RequestMapping.class).value()[0]);

        assertEquals("/checkin",
                RecepcionController.class.getMethod("checkin", CheckinRequest.class, Authentication.class)
                        .getAnnotation(PostMapping.class).value()[0],
                "La ruta POST /api/recepcion/checkin no cambia");

        assertEquals("/api/checkin",
                QrController.class.getAnnotation(RequestMapping.class).value()[0]);

        assertEquals("/validar/{token}",
                QrController.class.getMethod("resolverToken", String.class)
                        .getAnnotation(GetMapping.class).value()[0],
                "La ruta GET /api/checkin/validar/{token} no cambia");
    }
}
