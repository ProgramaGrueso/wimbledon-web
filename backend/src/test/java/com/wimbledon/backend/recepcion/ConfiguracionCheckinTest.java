package com.wimbledon.backend.recepcion;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T2 — El valor por defecto esta declarado (R-2) y la validacion rechaza
 * valores fuera de rango en lugar de degradarse en silencio.
 */
@DisplayName("ConfiguracionCheckin — valor por defecto declarado y validacion")
class ConfiguracionCheckinTest {

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
    @DisplayName("El valor por defecto declarado en application.properties resuelve a 4 horas")
    void testValorPorDefectoDeclarado() throws IOException {
        Properties properties = new Properties();
        try (InputStream stream = getClass().getResourceAsStream("/application.properties")) {
            assertNotNull(stream, "No se encontro application.properties en el classpath de pruebas");
            properties.load(stream);
        }

        String declarada = properties.getProperty("wimbledon.checkin.anticipacion-horas");
        assertNotNull(declarada, "La propiedad wimbledon.checkin.anticipacion-horas debe estar declarada");
        assertEquals(4, Integer.parseInt(declarada),
                "El valor por defecto de la anticipacion es 4 horas");

        // La misma propiedad enlaza sin violated constraints, es decir, el
        // valor declarado en el archivo es aceptable por el binding validado.
        Set<ConstraintViolation<ConfiguracionCheckin>> violaciones =
                validator.validate(new ConfiguracionCheckin(Integer.parseInt(declarada)));
        assertTrue(violaciones.isEmpty(), "El valor declarado no debe producir violaciones de validacion");
    }

    @Test
    @DisplayName("La validacion rechaza una anticipacion ausente (nula)")
    void testRechazaNulo() {
        Set<ConstraintViolation<ConfiguracionCheckin>> violaciones =
                validator.validate(new ConfiguracionCheckin(null));

        assertFalse(violaciones.isEmpty(),
                "Una propiedad ausente debe abortar el arranque en vez de enlazar a 0 en silencio");
    }

    @Test
    @DisplayName("La validacion rechaza una anticipacion negativa")
    void testRechazaNegativo() {
        Set<ConstraintViolation<ConfiguracionCheckin>> violaciones =
                validator.validate(new ConfiguracionCheckin(-1));

        assertFalse(violaciones.isEmpty(), "Una anticipacion negativa no puede degradarse en silencio");
    }

    @Test
    @DisplayName("La validacion rechaza una anticipacion mayor que 24 horas")
    void testRechazaMayorQueVeinticuatro() {
        Set<ConstraintViolation<ConfiguracionCheckin>> violaciones =
                validator.validate(new ConfiguracionCheckin(25));

        assertFalse(violaciones.isEmpty(),
                "Una anticipacion mayor que un dia contradice la decision de no extender la ventana");
    }

    @Test
    @DisplayName("La validacion acepta los extremos validos del rango")
    void testAceptaExtremosValidos() {
        assertTrue(validator.validate(new ConfiguracionCheckin(0)).isEmpty(),
                "Cero horas de anticipacion es un valor valido");
        assertTrue(validator.validate(new ConfiguracionCheckin(24)).isEmpty(),
                "Veinticuatro horas es el maximo declarado");
    }
}
