package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.exception.HabitacionRequiereAseoException;
import com.wimbledon.backend.exception.ReservaCanceladaException;
import com.wimbledon.backend.exception.ReservaFinalizadaException;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * T3 — Frontera de ocho pasos del consumo atomico.
 * Cubre R-3, R-4, R-5, M-1 y M-4 con Mockito, sin base de datos.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OperacionConsumoCheckin — clasificacion y atomicidad del consumo")
class OperacionConsumoCheckinTest {

    private static final String TOKEN = "3f1c9a20-5b7e-4d31-9c88-0a1b2c3d4e5f";
    private static final LocalDate FECHA = LocalDate.of(2026, 10, 5);
    private static final ZoneId ZONA_HOTEL = ZoneId.of("America/Lima");

    @Mock
    private ReservaRepository reservaRepository;

    @Mock
    private HabitacionRepository habitacionRepository;

    private OperacionConsumoCheckin operacionConsumo;
    private Habitacion habitacion;

    /** Construye la operacion con un reloj fijado en un instante dado. */
    private void usarRelojEn(LocalDateTime instante) {
        Clock reloj = Clock.fixed(instante.atZone(ZONA_HOTEL).toInstant(), ZONA_HOTEL);
        operacionConsumo = new OperacionConsumoCheckin(
                reservaRepository, habitacionRepository,
                new CalculadoraVentanaCheckin(new ConfiguracionCheckin(4), reloj));
    }

    @BeforeEach
    void setUp() {
        // Reloj fijado dentro de la ventana del bloque nocturno 20:00 -> 02:00.
        usarRelojEn(LocalDateTime.of(2026, 10, 5, 19, 30));

        habitacion = Habitacion.builder()
                .id(860)
                .nombre("Suite Presidencial")
                .estado(EstadoHabitacion.DISPONIBLE)
                .build();
    }

    private Reserva reserva(EstadoReserva estado, boolean qrUsado) {
        return Reserva.builder()
                .id(42)
                .habitacion(habitacion)
                .nombreHuesped("Carlos Huésped")
                .email("carlos@example.test")
                .telefono("990370681")
                .fecha(FECHA)
                .horaIngreso(LocalTime.of(20, 0))
                .horaSalida(LocalTime.of(2, 0))
                .estado(estado)
                .qrToken(TOKEN)
                .qrUsado(qrUsado)
                .build();
    }

    private void mockReserva(Reserva reserva) {
        when(reservaRepository.findByQrTokenConLock(TOKEN)).thenReturn(Optional.of(reserva));
    }

    // ── Rechazo por credencial inexistente ────────────────────────────────────

    @Test
    @DisplayName("Un token inexistente produce credencial no utilizable, NO recurso no encontrado")
    void testTokenInexistente() {
        when(reservaRepository.findByQrTokenConLock(TOKEN)).thenReturn(Optional.empty());

        CredencialNoUtilizableException ex = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.DESCONOCIDA, ex.motivo());
        assertFalse(EntityNotFoundException.class.isInstance(ex),
                "Reportar 404 seria un oraculo de existencia de reservas");
        verifyNoInteractions(habitacionRepository);
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Una credencial ya consumida produce el motivo YA_USADA y no escribe nada")
    void testCredencialYaUsada() {
        mockReserva(reserva(EstadoReserva.CONFIRMADA, true));

        CredencialNoUtilizableException ex = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.YA_USADA, ex.motivo());
        verifyNoInteractions(habitacionRepository);
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Una credencial fuera de la ventana produce FUORA_DE_VENTANA y no escribe nada")
    void testCredencialFueraDeVentana() {
        // Reserva de ayer: su ventana ya se cerro.
        Reserva ayer = reserva(EstadoReserva.CONFIRMADA, false);
        ayer.setFecha(LocalDate.of(2026, 10, 4));
        ayer.setHoraSalida(LocalTime.of(23, 0));
        mockReserva(ayer);

        CredencialNoUtilizableException ex = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.FUERA_DE_VENTANA, ex.motivo());
        verifyNoInteractions(habitacionRepository);
        verify(reservaRepository, never()).save(any());
    }

    // ── Rechazos por estado de negocio ────────────────────────────────────────

    @Test
    @DisplayName("Una reserva cancelada produce ReservaCanceladaException con su propio tipo")
    void testReservaCancelada() {
        mockReserva(reserva(EstadoReserva.CANCELADA, false));

        ReservaCanceladaException ex = assertThrows(
                ReservaCanceladaException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.CANCELADA, ex.motivo());
        assertEquals(42, ex.reservaId());
        verifyNoInteractions(habitacionRepository);
    }

    @Test
    @DisplayName("Una reserva finalizada produce ReservaFinalizadaException con su propio tipo")
    void testReservaFinalizada() {
        mockReserva(reserva(EstadoReserva.FINALIZADA, false));

        ReservaFinalizadaException ex = assertThrows(
                ReservaFinalizadaException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.FINALIZADA, ex.motivo());
        verifyNoInteractions(habitacionRepository);
    }

    @Test
    @DisplayName("El estado de negocio se evalua antes que el uso: una reserva cancelada y consumida se reporta como cancelada")
    void testEstadoDeNegocioPrecedeAlUso() {
        mockReserva(reserva(EstadoReserva.CANCELADA, true));

        assertThrows(ReservaCanceladaException.class, () -> operacionConsumo.consumir(TOKEN),
                "Recepcion debe poder explicar al huesped que la reserva esta cancelada, no que el pase ya se uso");
    }

    // ── Paridad de las tres condiciones de credencial ─────────────────────────

    @Test
    @DisplayName("Las tres condiciones de credencial producen el mismo tipo y el mismo mensaje")
    void testTresCondicionesIndistinguibles() {
        // Inexistente
        when(reservaRepository.findByQrTokenConLock(TOKEN)).thenReturn(Optional.empty());
        Exception inexistente = assertThrows(CredencialNoUtilizableException.class,
                () -> operacionConsumo.consumir(TOKEN));

        // Ya usada
        mockReserva(reserva(EstadoReserva.CONFIRMADA, true));
        Exception yaUsada = assertThrows(CredencialNoUtilizableException.class,
                () -> operacionConsumo.consumir(TOKEN));

        // Fuera de ventana
        Reserva ayer = reserva(EstadoReserva.CONFIRMADA, false);
        ayer.setFecha(LocalDate.of(2026, 10, 4));
        ayer.setHoraSalida(LocalTime.of(23, 0));
        mockReserva(ayer);
        Exception fueraDeVentana = assertThrows(CredencialNoUtilizableException.class,
                () -> operacionConsumo.consumir(TOKEN));

        assertEquals(inexistente.getClass(), yaUsada.getClass(), "Mismo tipo de excepcion");
        assertEquals(inexistente.getClass(), fueraDeVentana.getClass(), "Mismo tipo de excepcion");
        assertEquals(inexistente.getMessage(), yaUsada.getMessage(),
                "Mismo literal de mensaje: no pueden divergir por construccion");
        assertEquals(inexistente.getMessage(), fueraDeVentana.getMessage(),
                "Mismo literal de mensaje: no pueden divergir por construccion");
    }

    @Test
    @DisplayName("El mensaje de rechazo no revela el motivo real ni datos de la reserva")
    void testElMensajeNoFiltra() {
        Reserva conDatos = reserva(EstadoReserva.CONFIRMADA, false);
        conDatos.setEmail("carlos@example.test");
        conDatos.setTelefono("990370681");
        conDatos.setNotas("Cama redonda, decoracion especial");
        mockReserva(conDatos);
        usarRelojEn(LocalDateTime.of(2026, 10, 5, 3, 0));

        CredencialNoUtilizableException ex = assertThrows(
                CredencialNoUtilizableException.class, () -> operacionConsumo.consumir(TOKEN));

        String mensaje = ex.getMessage();
        assertFalse(mensaje.contains("carlos@example.test"), "No expone el email");
        assertFalse(mensaje.contains("990370681"), "No expone el telefono");
        assertFalse(mensaje.contains("Cama redonda"), "No expone las notas");
        assertFalse(mensaje.contains("42"), "No expone el identificador de la reserva");
        assertFalse(mensaje.toLowerCase().contains("ventana"), "No revela que la causa fue la ventana");
    }

    // ── Rechazo por aseo previo ───────────────────────────────────────────────

    @Test
    @DisplayName("Una habitacion en LIMPIEZA_PENDIENTE rechaza el ingreso y deja la credencial intacta")
    void testHabitacionEnLimpiezaPendiente() {
        habitacion.setEstado(EstadoHabitacion.LIMPIEZA_PENDIENTE);
        Reserva reserva = reserva(EstadoReserva.CONFIRMADA, false);
        mockReserva(reserva);

        HabitacionRequiereAseoException ex = assertThrows(
                HabitacionRequiereAseoException.class, () -> operacionConsumo.consumir(TOKEN));

        assertEquals(MotivoRechazo.HABITACION_REQUIERE_ASEO, ex.motivo());
        assertFalse(reserva.getQrUsado(), "El pase NO se consume: el huesped conserva su credencial");
        assertEquals(EstadoReserva.CONFIRMADA, reserva.getEstado(), "No se escribe estado de negocio");
        verifyNoInteractions(habitacionRepository);
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Una habitacion en EN_PROCESO rechaza el ingreso y deja la credencial intacta")
    void testHabitacionEnProceso() {
        habitacion.setEstado(EstadoHabitacion.EN_PROCESO);
        Reserva reserva = reserva(EstadoReserva.CONFIRMADA, false);
        mockReserva(reserva);

        assertThrows(HabitacionRequiereAseoException.class, () -> operacionConsumo.consumir(TOKEN));

        assertFalse(reserva.getQrUsado(), "El pase NO se consume");
        verifyNoInteractions(habitacionRepository);
    }

    // ── Camino de exito ───────────────────────────────────────────────────────

    @Test
    @DisplayName("El check-in exitoso marca CHECKIN, consume el pase y ocupa la habitacion una sola vez")
    void testCheckinExitoso() {
        Reserva reserva = reserva(EstadoReserva.CONFIRMADA, false);
        mockReserva(reserva);

        OperacionConsumoCheckin.ResultadoCheckin resultado = operacionConsumo.consumir(TOKEN);

        assertEquals(EstadoReserva.CHECKIN, reserva.getEstado());
        assertTrue(reserva.getQrUsado());
        assertEquals(EstadoHabitacion.OCUPADA, habitacion.getEstado());
        assertSame(reserva, resultado.reserva());
        assertSame(habitacion, resultado.habitacion());

        verify(reservaRepository, times(1)).save(reserva);
        verify(habitacionRepository, times(1)).save(habitacion);
    }

    @Test
    @DisplayName("El consumo se resuelve SIEMPRE por la variante con bloqueo, nunca por la de solo lectura")
    void testSeUsaLaVarianteConBloqueo() {
        Reserva reserva = reserva(EstadoReserva.CONFIRMADA, false);
        mockReserva(reserva);

        operacionConsumo.consumir(TOKEN);

        verify(reservaRepository, times(1)).findByQrTokenConLock(TOKEN);
        verify(reservaRepository, never()).findByQrToken(any());
    }

    @Test
    @DisplayName("Los rechazos por estado no comparten codigo con los de credencial")
    void testEstadosYCredencialesNoSeConfunden() {
        mockReserva(reserva(EstadoReserva.CANCELADA, false));
        Exception porEstado = assertThrows(ReservaCanceladaException.class,
                () -> operacionConsumo.consumir(TOKEN));

        when(reservaRepository.findByQrTokenConLock(TOKEN)).thenReturn(Optional.empty());
        Exception porCredencial = assertThrows(CredencialNoUtilizableException.class,
                () -> operacionConsumo.consumir(TOKEN));

        assertNotEquals(porEstado.getClass(), porCredencial.getClass());
        assertNotEquals(porEstado.getMessage(), porCredencial.getMessage(),
                "Son condiciones distintas con respuestas distintas, a proposito");
    }
}
