package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * T4 — Consumo de un solo uso, verificado de forma SECUENCIAL y determinista.
 *
 * Sustituye a la prueba de concurrencia real con ExecutorService y
 * CountDownLatch, que NO es automatizable en este proyecto: MySQL esta en
 * runtime scope y no hay base de pruebas, de modo que un test sobre mocks
 * probaria que el metodo se invoca dos veces, no la exclusividad. La
 * exclusividad misma la cubre T5, que falla en rojo si el mecanismo de
 * bloqueo se retira. La carrera real queda como complemento manual en la
 * frontera de U3: dos peticiones simultaneas con el mismo qrToken contra el
 * backend local con MySQL.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Consumo unico secuencial — la segunda llamada con el mismo token se rechaza")
class ConsumoUnicoSecuencialTest {

    private static final String TOKEN = "a1b2c3d4-1111-4222-8333-444455556666";
    private static final ZoneId ZONA_HOTEL = ZoneId.of("America/Lima");

    @Mock
    private ReservaRepository reservaRepository;

    @Mock
    private HabitacionRepository habitacionRepository;

    private OperacionConsumoCheckin operacionConsumo;
    private Habitacion habitacion;
    private Reserva reserva;

    @BeforeEach
    void setUp() {
        Clock reloj = Clock.fixed(
                LocalDateTime.of(2026, 10, 5, 19, 30).atZone(ZONA_HOTEL).toInstant(), ZONA_HOTEL);
        operacionConsumo = new OperacionConsumoCheckin(
                reservaRepository, habitacionRepository,
                new CalculadoraVentanaCheckin(new ConfiguracionCheckin(4), reloj));

        habitacion = Habitacion.builder().id(860).nombre("Suite").estado(EstadoHabitacion.DISPONIBLE).build();
        reserva = Reserva.builder()
                .id(7)
                .habitacion(habitacion)
                .nombreHuesped("Ana Huésped")
                .email("ana@example.test")
                .fecha(LocalDate.of(2026, 10, 5))
                .horaIngreso(LocalTime.of(20, 0))
                .horaSalida(LocalTime.of(2, 0))
                .estado(EstadoReserva.CONFIRMADA)
                .qrToken(TOKEN)
                .qrUsado(false)
                .build();

        when(reservaRepository.findByQrTokenConLock(TOKEN)).thenReturn(Optional.of(reserva));
    }

    @Test
    @DisplayName("La primera llamada consume la credencial y la segunda se rechaza por YA_USADA")
    void testDosLlamadasConsecutivas() {
        // Primera llamada: exito.
        OperacionConsumoCheckin.ResultadoCheckin resultado = operacionConsumo.consumir(TOKEN);

        assertEquals(EstadoReserva.CHECKIN, reserva.getEstado());
        assertTrue(reserva.getQrUsado());
        assertEquals(EstadoHabitacion.OCUPADA, habitacion.getEstado());
        assertEquals(reserva, resultado.reserva());

        // Segunda llamada sobre el mismo token: rechazo, sin segunda escritura.
        CredencialNoUtilizableException ex = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.YA_USADA, ex.motivo(),
                "La perdedora observa qrUsado=true recien confirmado y se clasifica como credencial no utilizable");

        // La habitacion se ocupa UNA sola vez sobre las dos llamadas.
        verify(habitacionRepository, times(1)).save(any(Habitacion.class));
        verify(habitacionRepository, times(1)).save(habitacion);
    }

    @Test
    @DisplayName("El rechazo de la segunda llamada es indistinguible de un token nunca emitido")
    void testElRechazoEsIndistinguible() {
        operacionConsumo.consumir(TOKEN);

        CredencialNoUtilizableException porUso = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        when(reservaRepository.findByQrTokenConLock("token-inexistente")).thenReturn(Optional.empty());
        CredencialNoUtilizableException porDesconocida = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir("token-inexistente"));

        assertEquals(porUso.getClass(), porDesconocida.getClass());
        assertEquals(porUso.getMessage(), porDesconocida.getMessage(),
                "La perdedora de la carrera no puede distinguirse de una credencial que nunca existio");
    }
}
