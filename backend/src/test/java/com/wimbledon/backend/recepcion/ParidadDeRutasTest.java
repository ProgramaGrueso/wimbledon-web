package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.exception.ErrorResponse;
import com.wimbledon.backend.exception.ExcepcionCheckin;
import com.wimbledon.backend.exception.GlobalExceptionHandler;
import com.wimbledon.backend.exception.HabitacionRequiereAseoException;
import com.wimbledon.backend.exception.ReservaCanceladaException;
import com.wimbledon.backend.exception.ReservaFinalizadaException;
import com.wimbledon.backend.repository.ReservaRepository;
import com.wimbledon.backend.reserva.QrController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * T9 — Paridad entre la ruta de consumo y la ruta de resolucion.
 *
 * Cubre R-4, R-5 y R-6. La paridad no se afirma, se mide: para cada condicion
 * logica se invocan las dos rutas y se comparan estado HTTP y codigo.
 *
 * LIMITACION DECLARADA DEL ENTORNO: no hay \`WebApplicationFactory\` declarado,
 * asi que se usa MockMvc standalone. En standalone NO se aplica seguridad de
 * metodo, de modo que esta prueba mide el CONTRATO DE RESPUESTA, no la
 * autorizacion; la autorizacion se mide aparte en \`RbacCheckinTest\`, contra
 * las autoridades reales derivadas del enum \`Rol\`.
 */
@DisplayName("Paridad de rutas — misma condicion logica, mismo estado y mismo codigo")
class ParidadDeRutasTest {

    private static final String TOKEN = "e5f6a7b8-9999-4aaa-8bbb-ccccddddeeee";

    private static final ObjectMapper mapper = new ObjectMapper();

    private MockMvc mockMvcConsumo;
    private MockMvc mockMvcResolucion;
    private RecepcionService recepcionService;
    private CheckinService checkinService;

    /** Excepcion que la capa de servicio lanza para una condicion dada. */
    private record Condicion(String nombre, ExcepcionCheckin excepcion, int estadoEsperado) {}

    @BeforeEach
    void setUp() {
        recepcionService = Mockito.mock(RecepcionService.class);
        // Se simula la CAPA DE SERVICIO, no el repositorio: lo que se mide aqui es
        // el contrato HTTP, es decir, que el advice traduce cada excepcion tipada
        // al mismo estado y al mismo codigo en las dos rutas.
        checkinService = Mockito.mock(CheckinService.class);

        GlobalExceptionHandler advice = new GlobalExceptionHandler();

        mockMvcConsumo = MockMvcBuilders.standaloneSetup(
                        new RecepcionController(recepcionService, checkinService))
                .setControllerAdvice(advice)
                .build();

        mockMvcResolucion = MockMvcBuilders.standaloneSetup(new QrController(checkinService))
                .setControllerAdvice(advice)
                .build();
    }

    /**
     * Autenticacion que el controlador recibe como parametro.
     *
     * En standalone MockMvc no hay cadena de filtros de Spring Security, asi
     * que el parametro \`Authentication\` llegaria nulo y el controlador cairia
     * en el manejador generico con 500, enmascarando el contrato que se quiere
     * medir. Se reproduce lo que JwtAuthFilter deja en el contexto: authorities
     * derivadas de la columna \`rol\` de la base, nunca del claim del token.
     */
    private static Authentication autenticacionDeRecepcion() {
        Usuario operador = Usuario.builder()
                .id(7)
                .nombre("Recepcionista de Prueba")
                .email("recepcion@wimbledon.test")
                .passwordHash("irrelevante")
                .rol(Rol.RECEPCIONISTA)
                .activo(true)
                .build();
        return new UsernamePasswordAuthenticationToken(operador, null, operador.getAuthorities());
    }

    private static Stream<Arguments> condiciones() {
        return Stream.of(
                Arguments.of(new Condicion("credencial inexistente",
                        new CredencialNoUtilizableException(MotivoRechazo.DESCONOCIDA, null), 409)),
                Arguments.of(new Condicion("credencial fuera de ventana",
                        new CredencialNoUtilizableException(MotivoRechazo.FUERA_DE_VENTANA, 42), 409)),
                Arguments.of(new Condicion("credencial ya consumida",
                        new CredencialNoUtilizableException(MotivoRechazo.YA_USADA, 42), 409)),
                Arguments.of(new Condicion("reserva cancelada",
                        new ReservaCanceladaException(42), 409)),
                Arguments.of(new Condicion("reserva finalizada",
                        new ReservaFinalizadaException(42), 409)),
                Arguments.of(new Condicion("habitacion que requiere aseo",
                        new HabitacionRequiereAseoException(42), 409))
        );
    }

    /** Invoca POST /api/recepcion/checkin y devuelve estado y cuerpo. */
    private Respuesta invocarConsumo() throws Exception {
        MvcResult resultado = mockMvcConsumo.perform(post("/api/recepcion/checkin")
                        .principal(autenticacionDeRecepcion())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + TOKEN + "\"}"))
                .andReturn();
        return new Respuesta(resultado.getResponse().getStatus(), cuerpoDe(resultado));
    }

    /** Invoca GET /api/checkin/validar/{token} y devuelve estado y cuerpo. */
    private Respuesta invocarResolucion() throws Exception {
        MvcResult resultado = mockMvcResolucion.perform(get("/api/checkin/validar/" + TOKEN)
                        .principal(autenticacionDeRecepcion()))
                .andReturn();
        return new Respuesta(resultado.getResponse().getStatus(), cuerpoDe(resultado));
    }

    private String cuerpoDe(MvcResult resultado) throws Exception {
        String contenido = resultado.getResponse().getContentAsString();
        return contenido == null || contenido.isBlank() ? "" : contenido;
    }

    private record Respuesta(int estado, String cuerpo) {
        String codigo() throws Exception {
            return mapper.readValue(cuerpo, ErrorResponse.class).codigo();
        }

        String mensaje() throws Exception {
            return mapper.readValue(cuerpo, ErrorResponse.class).mensaje();
        }
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("condiciones")
    @DisplayName("La misma condicion logica produce el MISMO estado y el MISMO codigo en las dos rutas")
    void testParidadDeEstadoYCodigo(Condicion condicion) throws Exception {
        Mockito.doThrow(condicion.excepcion()).when(checkinService).consumir(Mockito.anyString(), Mockito.any());
        Mockito.when(checkinService.resolver(Mockito.anyString())).thenThrow(condicion.excepcion());

        Respuesta consumo = invocarConsumo();
        Respuesta resolucion = invocarResolucion();

        assertEquals(condicion.estadoEsperado(), consumo.estado(),
                "Estado inesperado en la ruta de consumo para: " + condicion.nombre());
        assertEquals(condicion.estadoEsperado(), resolucion.estado(),
                "Estado inesperado en la ruta de resolucion para: " + condicion.nombre());
        assertEquals(consumo.estado(), resolucion.estado(),
                "PARIDAD ROTA — difieren los estados para: " + condicion.nombre());
        assertEquals(consumo.codigo(), resolucion.codigo(),
                "PARIDAD ROTA — difieren los codigos para: " + condicion.nombre());
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("condiciones")
    @DisplayName("Las tres condiciones de credencial responden con el MISMO cuerpo, caracter a caracter")
    void testCuerposIdenticosParaCredencial(Condicion condicion) throws Exception {
        Mockito.doThrow(condicion.excepcion()).when(checkinService).consumir(Mockito.anyString(), Mockito.any());
        Mockito.when(checkinService.resolver(Mockito.anyString())).thenThrow(condicion.excepcion());

        Respuesta consumo = invocarConsumo();
        Respuesta resolucion = invocarResolucion();

        // El cuerpo es ErrorResponse con exactamente {mensaje, codigo}: sin
        // identificadores internos, email, telefono, fechas ni traza de pila.
        assertEquals(consumo.cuerpo(), resolucion.cuerpo(),
                "PARIDAD ROTA — difieren los cuerpos para: " + condicion.nombre());
        assertEquals("{\"mensaje\":" + "\"" + consumo.mensaje() + "\",\"codigo\":\"" + consumo.codigo() + "\"}",
                consumo.cuerpo(),
                "El cuerpo debe tener exactamente los campos mensaje y codigo, en ese orden");
    }

    @Test
    @DisplayName("Una reserva finalizada devuelve 409 en AMBAS rutas, no 200 en la resolucion")
    void testFinalizadaEnAmbasRutas() throws Exception {
        ReservaFinalizadaException excepcion = new ReservaFinalizadaException(42);
        Mockito.doThrow(excepcion).when(checkinService).consumir(Mockito.anyString(), Mockito.any());
        Mockito.when(checkinService.resolver(Mockito.anyString())).thenThrow(excepcion);

        assertEquals(409, invocarConsumo().estado(),
                "El check-in ya rechazaba FINALIZADA");
        assertEquals(409, invocarResolucion().estado(),
                "Cierra la divergencia: la resolucion la omitia y devolvia 200 OK");
    }

    @Test
    @DisplayName("Un token inexistente NO se reporta como recurso no encontrado en ninguna de las dos rutas")
    void testTokenInexistenteNoEs404() throws Exception {
        CredencialNoUtilizableException excepcion =
                new CredencialNoUtilizableException(MotivoRechazo.DESCONOCIDA, null);
        Mockito.doThrow(excepcion).when(checkinService).consumir(Mockito.anyString(), Mockito.any());
        Mockito.when(checkinService.resolver(Mockito.anyString())).thenThrow(excepcion);

        assertEquals(409, invocarConsumo().estado(),
                "404 seria un oraculo de existencia de reservas");
        assertEquals(409, invocarResolucion().estado(),
                "404 seria un oraculo de existencia de reservas");
        assertEquals(ErrorResponse.QR_NO_UTILIZABLE, invocarConsumo().codigo());
    }

    @Test
    @DisplayName("El rechazo de credencial no contiene datos personales ni fechas de la reserva")
    void testElRechazoNoFiltraDatos() throws Exception {
        Reserva reserva = Reserva.builder()
                .id(42)
                .habitacion(Habitacion.builder().id(860).nombre("Suite").build())
                .nombreHuesped("Carlos Huésped")
                .email("carlos@example.test")
                .telefono("990370681")
                .notas("Cama redonda")
                .fecha(LocalDate.of(2026, 10, 5))
                .horaIngreso(LocalTime.of(20, 0))
                .horaSalida(LocalTime.of(2, 0))
                .estado(EstadoReserva.CANCELADA)
                .qrToken(TOKEN)
                .qrUsado(false)
                .build();

        Mockito.doThrow(new CredencialNoUtilizableException(MotivoRechazo.FUERA_DE_VENTANA, 42))
                .when(checkinService).consumir(Mockito.anyString(), Mockito.any());
        Mockito.when(checkinService.resolver(Mockito.anyString())).thenReturn(reserva);

        String cuerpo = invocarResolucion().cuerpo();
        assertEquals("Carlos Huésped", reserva.getNombreHuesped(), "El dato existe en la entidad");
        assertFalse(cuerpo.contains("carlos@example.test"), "No expone el email");
        assertFalse(cuerpo.contains("990370681"), "No expone el telefono");
        assertFalse(cuerpo.contains("Cama redonda"), "No expone las notas");
        assertFalse(cuerpo.contains(TOKEN), "No expone la credencial");
        assertFalse(cuerpo.contains("Exception"), "No expone el tipo de excepcion");
    }

    @Test
    @DisplayName("La ruta de resolucion no construye su propia respuesta de error")
    void testLaResolucionNoConstruyeSuRespuesta() {
        // QrController no debe depender ya de ErrorResponse ni de ReservaRepository:
        // la traduccion de la excepcion es trabajo del advice, y solo el advice.
        assertEquals(0, java.util.Arrays.stream(QrController.class.getDeclaredFields())
                        .filter(campo -> campo.getType() == ErrorResponse.class)
                        .count(),
                "QrController no debe construir ErrorResponse por su cuenta");

        assertEquals(0, java.util.Arrays.stream(QrController.class.getDeclaredFields())
                        .filter(campo -> campo.getType() == ReservaRepository.class)
                        .count(),
                "QrController no debe resolver el token por su cuenta: la clasificacion es compartida");

        assertEquals(0, java.util.Arrays.stream(QrController.class.getDeclaredFields())
                        .filter(campo -> campo.getType() == CheckinService.class)
                        .count() - 1,
                "QrController debe depender exactamente de CheckinService");
    }
}
