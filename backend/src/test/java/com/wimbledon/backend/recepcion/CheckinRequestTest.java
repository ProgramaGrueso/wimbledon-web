package com.wimbledon.backend.recepcion;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T8 — Cota de longitud del token en la frontera del DTO.
 *
 * El record se llama {@code CheckinRequest} con "i" minuscula; ese nombre no
 * cambia y esta prueba lo fija, porque un renombrado accidental a
 * {@code CheckInRequest} seria una ruptura de la superficie publica.
 */
@DisplayName("CheckinRequest — cota de longitud y nombre del contrato")
class CheckinRequestTest {

    private static final String TOKEN_EMITIDO =
            "3f1c9a20-5b7e-4d31-9c88-0a1b2c3d4e5f";

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDownValidator() {
        if (validatorFactory != null) {
            validatorFactory.close();
        }
    }

    @Test
    @DisplayName("Un token de 65 caracteres se rechaza en la frontera del DTO")
    void testRechazaTokenDemasiadoLargo() {
        CheckinRequest request = new CheckinRequest("a".repeat(65));

        Set<ConstraintViolation<CheckinRequest>> violaciones = validator.validate(request);

        assertFalse(violaciones.isEmpty(),
                "Un token mas largo que la cota debe rechazarse ANTES de llegar a la logica de check-in");
    }

    @Test
    @DisplayName("Un token de 64 caracteres se acepta: es exactamente el limite")
    void testAceptaElLimiteExacto() {
        CheckinRequest request = new CheckinRequest("a".repeat(64));

        assertTrue(validator.validate(request).isEmpty(),
                "64 es el limite declarado y debe aceptarse, no rechazarse por exceso de uno");
    }

    @Test
    @DisplayName("El token emitido por el backend, de 36 caracteres, se acepta sin condiciones")
    void testAceptaElTokenRealmenteEmitido() {
        CheckinRequest request = new CheckinRequest(TOKEN_EMITIDO);

        assertEquals(36, TOKEN_EMITIDO.length());
        assertTrue(validator.validate(request).isEmpty(),
                "La cota no puede rechazar ninguna credencial legitima");
    }

    @Test
    @DisplayName("Un token en blanco se rechaza")
    void testRechazaTokenEnBlanco() {
        assertFalse(validator.validate(new CheckinRequest("")).isEmpty(),
                "@NotBlank sigue vigente");
        assertFalse(validator.validate(new CheckinRequest("   ")).isEmpty(),
                "Un blanco con espacios tambien es un token ausente");
        assertFalse(validator.validate(new CheckinRequest(null)).isEmpty(),
                "Un token nulo es un token ausente");
    }

    @Test
    @DisplayName("La cota del DTO coincide con la longitud declarada de la columna")
    void testLaCotaCoincideConLaColumna() throws NoSuchFieldException {
        jakarta.persistence.Column columna = com.wimbledon.backend.domain.Reserva.class
                .getDeclaredField("qrToken")
                .getAnnotation(jakarta.persistence.Column.class);

        // El limite de 64 viene de la columna; si la columna se ensancha, la
        // prueba falla y obliga a revisar la cota en lugar de dejarla obsoleta.
        assertEquals(64, columna.length(),
                "La cota de CheckinRequest.token se deriva de la longitud de reservas.qr_token");
    }

    @Test
    @DisplayName("El record se llama CheckinRequest con i minuscula y no declara patron de formato")
    void testNombreYAusenciaDePatron() {
        assertEquals("CheckinRequest", CheckinRequest.class.getSimpleName(),
                "El nombre del DTO no cambia; CheckInRequest seria otra superficie");

        assertTrue(java.util.Arrays.stream(CheckinRequest.class.getDeclaredAnnotations())
                        .noneMatch(a -> a.annotationType() == jakarta.validation.constraints.Pattern.class),
                "No se declara @Pattern: rechazaria un token no UUID con un mensaje propio, "
                        + "una via de distincion que la cota de longitud ya cierra");

        assertTrue(CheckinRequest.class.getRecordComponents().length == 1,
                "El record conserva un unico componente, token");
    }
}
