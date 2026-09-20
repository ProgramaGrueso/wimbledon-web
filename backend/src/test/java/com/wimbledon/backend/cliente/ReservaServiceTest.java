package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import com.wimbledon.backend.reserva.ReservaConfirmacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservaServiceTest {

    @Mock
    private HabitacionRepository habitacionRepository;

    @Mock
    private ReservaRepository reservaRepository;

    @Mock
    private ReservaConfirmacionService confirmacionService;

    @InjectMocks
    private ReservaService reservaService;

    private Habitacion habitacionSuite;
    private CrearReservaRequest requestValido;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reservaService, "horasCancelacion", 2);
        ReflectionTestUtils.setField(reservaService, "ventanaConfirmacionMinutos", 30);
        ReflectionTestUtils.setField(reservaService, "margenMinimoMinutos", 5);
        ReflectionTestUtils.setField(reservaService, "maxPendientesPorUsuario", 2);

        habitacionSuite = Habitacion.builder()
                .id(860)
                .nombre("Suite Presidencial")
                .tipo("Presidencial")
                .tarifaBase(new BigDecimal("156.00"))
                .duracionBloqueHoras(6)
                .capacidadUnidades(4)
                .estado(EstadoHabitacion.DISPONIBLE)
                .build();

        requestValido = new CrearReservaRequest(
                860,
                LocalDate.now().plusDays(1),
                LocalTime.of(20, 0),
                "Carlos Huésped",
                "990370681",
                "carlos@example.test",
                "Habitación decorada"
        );
    }

    @Test
    @DisplayName("Crear reserva online nace en estado PENDIENTE con expiraEn dinámico y valida capacidad")
    void testCrearReservaOnline_NacePendiente() {
        when(reservaRepository.countByEmailAndEstado(requestValido.email(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(reservaRepository.countByTelefonoAndEstado(requestValido.telefono(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        // Hay 1 reserva solapada pero la capacidad es 4 -> debe permitir
        when(reservaRepository.contarReservasSolapadas(eq(860), any(), any(), any(), isNull())).thenReturn(1L);

        when(reservaRepository.save(any(Reserva.class))).thenAnswer(invocation -> {
            Reserva r = invocation.getArgument(0);
            r.setId(101);
            return r;
        });

        ReservaResponse response = reservaService.crearReserva(requestValido, null);

        assertNotNull(response);
        assertEquals(EstadoReserva.PENDIENTE, response.estado());
        assertNotNull(response.expiraEn());
        assertTrue(response.expiraEn().isAfter(LocalDateTime.now()));

        // No se debe despachar confirmación por correo/QR hasta que Recepción confirme
        verify(confirmacionService, never()).enviarConfirmacion(any());
    }

    @Test
    @DisplayName("Bloqueo de solapamiento: rechaza si el conteo de solapadas alcanza la capacidad del tipo")
    void testSolapamiento_RechazaCuandoAlcanzaCapacidad() {
        when(reservaRepository.countByEmailAndEstado(requestValido.email(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(reservaRepository.countByTelefonoAndEstado(requestValido.telefono(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        // 4 solapadas de 4 capacidad -> lleno
        when(reservaRepository.contarReservasSolapadas(eq(860), any(), any(), any(), isNull())).thenReturn(4L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                reservaService.crearReserva(requestValido, null));

        assertTrue(ex.getMessage().contains("ya no cuenta con disponibilidad"));
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rechaza reserva online si faltan menos de 5 minutos para la hora de ingreso")
    void testRechazoMenosCincoMinutos() {
        when(reservaRepository.countByEmailAndEstado(requestValido.email(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(reservaRepository.countByTelefonoAndEstado(requestValido.telefono(), EstadoReserva.PENDIENTE)).thenReturn(0L);

        CrearReservaRequest requestUrgente = new CrearReservaRequest(
                860,
                LocalDate.now(),
                LocalTime.now().plusMinutes(3), // a solo 3 min de ingreso
                "Carlos Huésped",
                "990370681",
                "carlos@example.test",
                null
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                reservaService.crearReserva(requestUrgente, null));

        assertTrue(ex.getMessage().contains("demasiado próximo"));
    }

    @Test
    @DisplayName("Reprogramar reserva excluye el ID propio del conteo para evitar auto-bloqueo")
    void testReprogramarReserva_ExcluyeIdPropio() {
        com.wimbledon.backend.domain.Usuario cliente = com.wimbledon.backend.domain.Usuario.builder()
                .id(10)
                .email("carlos@example.test")
                .build();

        Reserva reservaExistente = Reserva.builder()
                .id(55)
                .habitacion(habitacionSuite)
                .cliente(cliente)
                .email("carlos@example.test")
                .fecha(LocalDate.now().plusDays(2))
                .horaIngreso(LocalTime.of(18, 0))
                .horaSalida(LocalTime.of(0, 0))
                .estado(EstadoReserva.CONFIRMADA)
                .build();

        when(reservaRepository.findById(55)).thenReturn(Optional.of(reservaExistente));
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));

        // Pasa reservaId 55 a excluir y hay 3 solapadas (menor que 4) -> debe permitir
        when(reservaRepository.contarReservasSolapadas(eq(860), any(), any(), any(), eq(55))).thenReturn(3L);
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(i -> i.getArgument(0));

        ReprogramarReservaRequest reqReprog = new ReprogramarReservaRequest(
                LocalDate.now().plusDays(3),
                LocalTime.of(20, 0)
        );

        ReservaResponse respuesta = reservaService.reprogramarReserva(55, reqReprog, cliente);

        assertNotNull(respuesta);
        verify(reservaRepository).contarReservasSolapadas(eq(860), any(), any(), any(), eq(55));
    }

    @Test
    @DisplayName("Cancelar reserva pendiente como invitado: valida qrToken y cambia estado a CANCELADA")
    void testCancelarReservaPendienteInvitado() {
        Reserva reservaPendiente = Reserva.builder()
                .id(77)
                .estado(EstadoReserva.PENDIENTE)
                .qrToken("uuid-secreto-777")
                .build();

        when(reservaRepository.findById(77)).thenReturn(Optional.of(reservaPendiente));

        // Token incorrecto lanza excepción
        assertThrows(IllegalArgumentException.class, () ->
                reservaService.cancelarReservaPendienteInvitado(77, "token-falso"));

        // Token correcto cancela
        reservaService.cancelarReservaPendienteInvitado(77, "uuid-secreto-777");
        assertEquals(EstadoReserva.CANCELADA, reservaPendiente.getEstado());
        verify(reservaRepository, times(1)).save(reservaPendiente);
    }

    @Test
    @DisplayName("Catálogo con disponibilidad real: evalúa solapamiento de horario contra capacidad")
    void testCatalogoConDisponibilidad() {
        Habitacion h1 = Habitacion.builder().id(1).nombre("H1").estado(EstadoHabitacion.DISPONIBLE).duracionBloqueHoras(6).capacidadUnidades(10).build();
        Habitacion h2 = Habitacion.builder().id(2).nombre("H2").estado(EstadoHabitacion.MANTENIMIENTO).duracionBloqueHoras(6).capacidadUnidades(10).build();
        Habitacion h3 = Habitacion.builder().id(3).nombre("H3").estado(EstadoHabitacion.DISPONIBLE).duracionBloqueHoras(6).capacidadUnidades(4).build();

        when(habitacionRepository.findAll()).thenReturn(List.of(h1, h2, h3));
        // h1 con 2 solapadas de 10 capacidad -> disponible
        when(reservaRepository.contarReservasSolapadas(eq(1), any(), any(), any(), isNull())).thenReturn(2L);
        // h3 con 4 solapadas de 4 capacidad -> lleno (no disponible)
        when(reservaRepository.contarReservasSolapadas(eq(3), any(), any(), any(), isNull())).thenReturn(4L);

        List<HabitacionPublicaResponse> resultado = reservaService.listarHabitacionesConDisponibilidad(
                LocalDate.now().plusDays(1), LocalTime.of(20, 0), 6
        );

        assertEquals(3, resultado.size());
        assertTrue(resultado.get(0).disponible(), "H1 debe estar disponible");
        assertFalse(resultado.get(1).disponible(), "H2 debe estar no disponible por MANTENIMIENTO");
        assertFalse(resultado.get(2).disponible(), "H3 debe estar no disponible por cupo lleno");
    }
}
