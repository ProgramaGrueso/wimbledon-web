package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T1 — Bordes de la ventana de vigencia (R-1) y de la anticipacion (R-2).
 * Prueba unitaria pura: reloj fijo, sin base de datos ni contexto de Spring.
 */
@DisplayName("VentanaCheckin — bordes de vigencia y anticipacion")
class VentanaCheckinTest {

    private static final ZoneId ZONA_HOTEL = ZoneId.of("America/Lima");
    private static final LocalDate FECHA = LocalDate.of(2026, 10, 5);

    private static Reserva reserva(LocalTime horaIngreso, LocalTime horaSalida) {
        return Reserva.builder()
                .id(1)
                .habitacion(Habitacion.builder().id(860).nombre("Suite").estado(EstadoHabitacion.DISPONIBLE).build())
                .nombreHuesped("Carlos Prueba")
                .email("carlos@example.test")
                .fecha(FECHA)
                .horaIngreso(horaIngreso)
                .horaSalida(horaSalida)
                .estado(EstadoReserva.CONFIRMADA)
                .qrUsado(false)
                .build();
    }

    private static boolean vigenteEn(int anticipacionHoras, Reserva reserva, LocalDateTime instante) {
        CalculadoraVentanaCheckin calculadora = new CalculadoraVentanaCheckin(
                new ConfiguracionCheckin(anticipacionHoras),
                Clock.fixed(instante.atZone(ZONA_HOTEL).toInstant(), ZONA_HOTEL));
        return calculadora.dentroDeVentana(reserva);
    }

    // ── Ventana nocturna 20:00 -> 02:00, anticipacion 4h: acceso 16:00, cierre 2026-10-06 02:00

    @Test
    @DisplayName("Bloque nocturno: dentro de ventana a las 19:30 del dia de la reserva")
    void testCheckinDentroDeVentana() {
        assertTrue(vigenteEn(4, reserva(LocalTime.of(20, 0), LocalTime.of(2, 0)),
                LocalDateTime.of(2026, 10, 5, 19, 30)));
    }

    @Test
    @DisplayName("Limite inferior INCLUSIVO: exactamente a la horaIngreso menos la anticipacion se admite")
    void testLimiteInferiorExactoEsValido() {
        assertTrue(vigenteEn(4, reserva(LocalTime.of(20, 0), LocalTime.of(2, 0)),
                LocalDateTime.of(2026, 10, 5, 16, 0, 0)));
    }

    @Test
    @DisplayName("Un minuto antes del limite inferior todavia no se admite")
    void testAntesDeLaAperturaSeRechaza() {
        assertFalse(vigenteEn(4, reserva(LocalTime.of(20, 0), LocalTime.of(2, 0)),
                LocalDateTime.of(2026, 10, 5, 15, 59)));
    }

    @Test
    @DisplayName("Cruce de medianoche: 01:30 del dia siguiente sigue dentro de la ventana")
    void testCruceDeMedianoche() {
        CalculadoraVentanaCheckin calculadora = new CalculadoraVentanaCheckin(
                new ConfiguracionCheckin(4), Clock.system(ZONA_HOTEL));
        VentanaCheckin ventana = calculadora.calcular(reserva(LocalTime.of(20, 0), LocalTime.of(2, 0)));

        assertEquals(LocalDateTime.of(2026, 10, 5, 16, 0), ventana.acceso(), "El acceso descuenta la anticipacion");
        assertEquals(LocalDateTime.of(2026, 10, 6, 2, 0), ventana.cierre(),
                "Con horaSalida <= horaIngreso el cierre se resuelve en el dia siguiente");
        assertTrue(ventana.contiene(LocalDateTime.of(2026, 10, 6, 1, 30)),
                "La madrugada posterior al dia de la reserva sigue vigente");
    }

    // ── Ventana diurna 14:00 -> 20:00, anticipacion 4h: acceso 10:00, cierre 20:00 del mismo dia

    @Test
    @DisplayName("Limite superior EXCLUSIVO: exactamente a la hora de salida la ventana ya esta cerrada")
    void testLimiteSuperiorExactoEstaCerrado() {
        assertFalse(vigenteEn(4, reserva(LocalTime.of(14, 0), LocalTime.of(20, 0)),
                LocalDateTime.of(2026, 10, 5, 20, 0, 0)));
    }

    @Test
    @DisplayName("Sin margen posterior: 23:59 con salida a las 20:00 sigue fuera de ventana")
    void testSinMargenPosterior() {
        assertFalse(vigenteEn(4, reserva(LocalTime.of(14, 0), LocalTime.of(20, 0)),
                LocalDateTime.of(2026, 10, 5, 23, 59)));
    }

    @Test
    @DisplayName("Ventana diurna: dentro de ventana a las 14:00 exactas")
    void testVentanaDiurnaDentro() {
        assertTrue(vigenteEn(4, reserva(LocalTime.of(14, 0), LocalTime.of(20, 0)),
                LocalDateTime.of(2026, 10, 5, 14, 0)));
    }

    // ── Anticipacion: acorta la llegada temprana, nunca extiende el cierre

    @Test
    @DisplayName("La anticipacion acorta el margen de llegada temprana")
    void testAnticipacionAcortaLaLlegadaTemprana() {
        // horaIngreso 20:00 con anticipacion 2h abre a las 18:00
        assertTrue(vigenteEn(2, reserva(LocalTime.of(20, 0), LocalTime.of(23, 0)),
                LocalDateTime.of(2026, 10, 5, 18, 30)));
        assertFalse(vigenteEn(2, reserva(LocalTime.of(20, 0), LocalTime.of(23, 0)),
                LocalDateTime.of(2026, 10, 5, 17, 59)));
    }

    @Test
    @DisplayName("La anticipacion no extiende el cierre de la ventana")
    void testAnticipacionNoExtiendeElCierre() {
        // horaIngreso 20:00, horaSalida 23:00, anticipacion 6h: el cierre sigue a las 23:00
        assertFalse(vigenteEn(6, reserva(LocalTime.of(20, 0), LocalTime.of(23, 0)),
                LocalDateTime.of(2026, 10, 5, 23, 30)));
    }

    // ── Reserva de un dia anterior: su ventana ya se cerro

    @Test
    @DisplayName("Reserva del dia anterior con la misma hora de ingreso: su ventana ya se cerro")
    void testReservaDelDiaAnteriorFueraDeVentana() {
        Reserva ayer = reserva(LocalTime.of(20, 0), LocalTime.of(23, 0));
        ayer.setFecha(LocalDate.of(2026, 10, 4));

        assertFalse(vigenteEn(12, ayer, LocalDateTime.of(2026, 10, 5, 7, 0)));
    }

    // ── Acceso que cae en el dia anterior a la fecha de la reserva

    @Test
    @DisplayName("Ingreso 01:00 con salida 02:00 y anticipacion 4h: el acceso cae en el dia anterior")
    void testAccesoEnElDiaAnterior() {
        CalculadoraVentanaCheckin calculadora = new CalculadoraVentanaCheckin(
                new ConfiguracionCheckin(4), Clock.system(ZONA_HOTEL));
        VentanaCheckin ventana = calculadora.calcular(reserva(LocalTime.of(1, 0), LocalTime.of(2, 0)));

        assertEquals(LocalDateTime.of(2026, 10, 4, 21, 0), ventana.acceso(),
                "El acceso se resuelve restando la anticipacion cruzando la medianoche");
        assertEquals(LocalDateTime.of(2026, 10, 5, 2, 0), ventana.cierre(),
                "horaSalida > horaIngreso no desplaza el cierre al dia siguiente");
        assertTrue(ventana.contiene(LocalDateTime.of(2026, 10, 4, 23, 0)),
                "La madrugada anterior a la fecha sigue siendo ventana valida");
    }

    // ── Estancia de 24 horas: horaSalida == horaIngreso

    @Test
    @DisplayName("horaSalida igual a horaIngreso es una estancia de 24 horas, no de duracion cero")
    void testEstanciaDeVeinticuatroHoras() {
        CalculadoraVentanaCheckin calculadora = new CalculadoraVentanaCheckin(
                new ConfiguracionCheckin(4), Clock.system(ZONA_HOTEL));
        VentanaCheckin ventana = calculadora.calcular(reserva(LocalTime.of(14, 0), LocalTime.of(14, 0)));

        assertEquals(LocalDateTime.of(2026, 10, 5, 10, 0), ventana.acceso());
        assertEquals(LocalDateTime.of(2026, 10, 6, 14, 0), ventana.cierre());
        assertTrue(ventana.contiene(LocalDateTime.of(2026, 10, 6, 13, 59)));
        assertFalse(ventana.contiene(LocalDateTime.of(2026, 10, 6, 14, 0)));
    }
}
