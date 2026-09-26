package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.RecordComponent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T7 — El codigo de negocio se determina por el TIPO de la excepcion.
 *
 * M-3 exige que ninguna respuesta se derive de la redaccion de un texto
 * libre. M-5 retira la clasificacion por coincidencia de texto.
 */
@DisplayName("GlobalExceptionHandler — clasificacion por tipo, no por texto")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Un IllegalStateException cuyo mensaje contiene la palabra código no produce ningun codigo de QR")
    void testMensajeConPalabraCodigoNoClasificaComoQr() {
        ResponseEntity<ErrorResponse> respuesta =
                handler.handleIllegalState(new IllegalStateException("El codigo de la habitacion no coincide."));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotEquals("QR_YA_UTILIZADO", respuesta.getBody().codigo(),
                "Un mensaje que contiene la palabra código ya no clasifica como problema de QR");
        assertNotEquals("QR_NO_UTILIZABLE", respuesta.getBody().codigo(),
                "Tampoco puede reaparecer como credencial no utilizable");
        assertEquals(ErrorResponse.CONFLITO_ESTADO, respuesta.getBody().codigo(),
                "El generico devuelve siempre CONFLITO_ESTADO");
    }

    @Test
    @DisplayName("El manejador generico de IllegalStateException sigue respondiendo 409")
    void testGenericoConservaElEstado409() {
        ResponseEntity<ErrorResponse> respuesta =
                handler.handleIllegalState(new IllegalStateException("La habitacion esta en mantenimiento."));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode(),
                "RecepcionService y ReservaService dependen de recibir 409 en este caso");
        assertEquals("La habitacion esta en mantenimiento.", respuesta.getBody().mensaje(),
                "El mensaje al operador se conserva; lo que se retira es su uso como clasificador");
    }

    @Test
    @DisplayName("Credencial no utilizable responde 409 con QR_NO_UTILIZABLE")
    void testCredencialNoUtilizable() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleCredencialNoUtilizable(
                new CredencialNoUtilizableException(MotivoRechazo.DESCONOCIDA, null));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertEquals(ErrorResponse.QR_NO_UTILIZABLE, respuesta.getBody().codigo());
    }

    @Test
    @DisplayName("Reserva cancelada responde 409 con RESERVA_CANCELADA")
    void testReservaCancelada() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleReservaCancelada(new ReservaCanceladaException(7));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertEquals(ErrorResponse.RESERVA_CANCELADA, respuesta.getBody().codigo());
    }

    @Test
    @DisplayName("Reserva finalizada responde 409 con RESERVA_FINALIZADA y no 200")
    void testReservaFinalizada() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleReservaFinalizada(new ReservaFinalizadaException(7));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode(),
                "Cierra la divergencia: la misma condicion devolvía 409 en check-in y 200 en validacion");
        assertEquals(ErrorResponse.RESERVA_FINALIZADA, respuesta.getBody().codigo());
    }

    @Test
    @DisplayName("Habitacion que requiere aseo responde 409 con HABITACION_REQUIERE_ASEO")
    void testHabitacionRequiereAseo() {
        ResponseEntity<ErrorResponse> respuesta =
                handler.handleHabitacionRequiereAseo(new HabitacionRequiereAseoException(7));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertEquals(ErrorResponse.HABITACION_REQUIERE_ASEO, respuesta.getBody().codigo());
    }

    @Test
    @DisplayName("El cuerpo es ErrorResponse con exactamente los campos mensaje y codigo")
    void testFormaDelCuerpo() {
        ErrorResponse cuerpo = handler.handleReservaFinalizada(new ReservaFinalizadaException(7)).getBody();

        assertNotNull(cuerpo);
        RecordComponent[] componentes = cuerpo.getClass().getRecordComponents();
        assertEquals(2, componentes.length, "La forma {mensaje, codigo} no cambia: no se anade ni se quita campo");
        assertEquals("mensaje", componentes[0].getName());
        assertEquals("codigo", componentes[1].getName());
    }

    @Test
    @DisplayName("El rechazo de credencial no expone identificadores internos ni datos personales")
    void testElRechazoNoFiltra() {
        CredencialNoUtilizableException ex =
                new CredencialNoUtilizableException(MotivoRechazo.FUERA_DE_VENTANA, 42);
        ResponseEntity<ErrorResponse> respuesta = handler.handleCredencialNoUtilizable(ex);

        String cuerpo = respuesta.getBody().mensaje() + "|" + respuesta.getBody().codigo();
        assertFalse(cuerpo.contains("42"), "El reservaId es interno y no se serializa");
        assertFalse(cuerpo.toLowerCase().contains("ventana"), "No se revela que la causa fue la ventana");
        assertFalse(cuerpo.toLowerCase().contains("valido hasta"), "No se revela el cierre de la ventana");
        assertFalse(cuerpo.toLowerCase().contains("caduco"), "El rechazo no afirma que la credencial caduco");
        assertFalse(cuerpo.toLowerCase().contains("expir"), "El rechazo no afirma que la credencial expiro");
    }

    @Test
    @DisplayName("El 500 no expone el tipo de la excepcion ni su mensaje")
    void testEl500NoExponeElTipo() {
        ResponseEntity<ErrorResponse> respuesta =
                handler.handleGeneral(new IllegalStateException("detalle interno de MySQL"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, respuesta.getStatusCode());
        assertEquals(ErrorResponse.ERROR_INTERNO, respuesta.getBody().codigo());
        assertFalse(respuesta.getBody().mensaje().contains("IllegalStateException"),
                "El tipo de la excepcion no viaja al cliente");
        assertFalse(respuesta.getBody().mensaje().contains("MySQL"),
                "El mensaje interno no viaja al cliente");
    }

    @Test
    @DisplayName("Una reserva ausente sigue reportandose como recurso no encontrado, no como credencial no utilizable")
    void testRecursoAusenteNoEsCredencial() {
        ResponseEntity<ErrorResponse> respuesta =
                handler.handleNotFound(new EntityNotFoundException("No encontramos esa reserva."));

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertEquals(ErrorResponse.RECURSO_NO_ENCONTRADO, respuesta.getBody().codigo());
        assertTrue(respuesta.getBody().codigo().length() > 0);
    }
}
