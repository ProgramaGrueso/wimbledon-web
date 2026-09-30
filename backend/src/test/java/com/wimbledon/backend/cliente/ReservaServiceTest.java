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
import com.wimbledon.backend.repository.ReservaRepository;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
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

    @Mock
    private TarifaService tarifaService;

    @Mock
    private NotificacionReservaService notificacionService;

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
        ReflectionTestUtils.setField(reservaService, "maxPendientesPorIp", 1);
        ReflectionTestUtils.setField(reservaService, "diasAnticipacionMax", 60);
        org.mockito.Mockito.lenient().when(tarifaService.calcularTarifa(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new BigDecimal("156.00"));

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
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
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

    // ── T11: comparación en tiempo constante del secreto de cancelación ───────

    @Test
    @DisplayName("La cancelación compara el qrToken en tiempo constante, no con String.equals")
    void testLaComparacionNoEsStringEquals() throws NoSuchMethodException, java.io.IOException {
        Method coincide = ReservaService.class.getDeclaredMethod("coincideElToken", String.class, String.class);

        // Verificación sobre el código fuente: la comparación real no debe usar
        // equals de cadena sobre el secreto.
        Path fuente = Path.of("src/main/java/com/wimbledon/backend/cliente/ReservaService.java");
        String codigo = Files.readString(fuente);
        int inicio = codigo.indexOf("private static boolean coincideElToken");
        assertTrue(inicio > 0, "El helper de comparación en tiempo constante debe existir");
        String cuerpo = codigo.substring(inicio, codigo.indexOf("\n    }", inicio));

        assertFalse(cuerpo.contains(".equals("),
                "La comparación del secreto no puede usar String.equals: devuelve al primer carácter distinto");
        assertTrue(cuerpo.contains("MessageDigest.isEqual"),
                "La comparación debe resolverse con MessageDigest.isEqual sobre bytes UTF-8");
        assertTrue(Modifier.isPrivate(coincide.getModifiers()),
                "El helper es privado: no forma parte de la superficie del servicio");
    }

    @Test
    @DisplayName("El qrToken correcto cancela y el incorrecto rechaza, con el mismo código y semántica")
    void testCancelarConservaLaSemantica() {
        Reserva reservaPendiente = Reserva.builder()
                .id(88)
                .estado(EstadoReserva.PENDIENTE)
                .qrToken("uuid-secreto-888")
                .build();
        when(reservaRepository.findById(88)).thenReturn(Optional.of(reservaPendiente));

        // Incorrecto: rechaza con IllegalArgumentException y NO escribe.
        IllegalArgumentException rechazo = assertThrows(IllegalArgumentException.class, () ->
                reservaService.cancelarReservaPendienteInvitado(88, "token-que-no-es"));
        assertTrue(rechazo.getMessage().contains("no es válido para esta reserva"),
                "El mensaje de rechazo se conserva exactamente");
        assertEquals(EstadoReserva.PENDIENTE, reservaPendiente.getEstado());
        verify(reservaRepository, never()).save(any());

        // Correcto: cancela.
        reservaService.cancelarReservaPendienteInvitado(88, "uuid-secreto-888");
        assertEquals(EstadoReserva.CANCELADA, reservaPendiente.getEstado());
        verify(reservaRepository, times(1)).save(reservaPendiente);
    }

    @Test
    @DisplayName("Un qrToken nulo se rechaza sin lanzar NullPointerException")
    void testQrTokenNuloSeRechaza() {
        Reserva reservaPendiente = Reserva.builder()
                .id(89)
                .estado(EstadoReserva.PENDIENTE)
                .qrToken("uuid-secreto-889")
                .build();
        when(reservaRepository.findById(89)).thenReturn(Optional.of(reservaPendiente));

        assertThrows(IllegalArgumentException.class, () ->
                reservaService.cancelarReservaPendienteInvitado(89, null));
        verify(reservaRepository, never()).save(any());
    }

    // ── S-2: la hora de salida la calcula el servidor ────────────────────────

    @Test
    @DisplayName("horaSalida con duracionBloqueHoras=6: desde 20:00 da 02:00 y desde 22:00 da 04:00")
    void testHoraSalidaLaCalculaElServidor() {
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));

        CrearReservaRequest desde20 = new CrearReservaRequest(
                860, LocalDate.now().plusDays(1), LocalTime.of(20, 0),
                "Carlos Huésped", "990370681", "carlos@example.test", null);
        assertEquals(LocalTime.of(2, 0), crearYCapturarReserva(desde20).getHoraSalida(),
                "20:00 más 6 horas cruza la medianoche y la hora de salida es 02:00");

        CrearReservaRequest desde22 = new CrearReservaRequest(
                860, LocalDate.now().plusDays(1), LocalTime.of(22, 0),
                "Carlos Huésped", "990370681", "carlos@example.test", null);
        assertEquals(LocalTime.of(4, 0), crearYCapturarReserva(desde22).getHoraSalida(),
                "22:00 más 6 horas da 04:00");
    }

    /** Ejecuta la creación y devuelve la entidad persistida, para inspeccionar su hora de salida. */
    private Reserva crearYCapturarReserva(CrearReservaRequest request) {
        when(reservaRepository.countByEmailAndEstado(request.email(), EstadoReserva.PENDIENTE)).thenReturn(0L);
        when(reservaRepository.countByTelefonoAndEstado(request.telefono(), EstadoReserva.PENDIENTE)).thenReturn(0L);

        Reserva[] capturada = new Reserva[1];
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(invocation -> {
            capturada[0] = invocation.getArgument(0);
            return capturada[0];
        });

        reservaService.crearReserva(request, null);
        return capturada[0];
    }

    @Test
    @DisplayName("CrearReservaRequest no admite campo de duración arbitraria ni de horaSalida")
    void testElClienteNoFijaLaHoraDeSalida() {
        assertEquals(9, CrearReservaRequest.class.getRecordComponents().length,
                "El contrato de creación contiene 9 componentes incluyendo modalidad y extras");

        List<String> nombres = Arrays.stream(CrearReservaRequest.class.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();

        assertTrue(nombres.contains("modalidad"),
                "El contrato incluye la modalidad tipada");
        assertFalse(nombres.contains("duracionHoras"),
                "El cliente no puede enviar duración arbitraria: horaSalida se deriva de la modalidad");
        assertFalse(nombres.contains("horaSalida"),
                "El cliente no puede enviar hora de salida: la calcula el servidor");
        assertTrue(nombres.contains("habitacionId"),
                "El identificador de habitación sigue siendo el del catálogo de habitaciones");
    }

    /**
     * DEFECTO PREEXISTENTE, NO CORREGIDO EN ESTE CAMBIO.
     *
     * ReservaRepository.contarReservasSolapadas evalúa
     * {@code r.horaIngreso < :horaSalida AND r.horaSalida > :horaIngreso}, una condición que
     * nunca es verdadera cuando {@code horaSalida <= horaIngreso} porque ambas son LocalTime del
     * mismo día. Todo bloque nocturno, la forma 20:00-02:00 que el propio proyecto documenta como
     * normal, es invisible para el control de capacidad, de modo que hoy es posible la doble
     * reserva en bloques que cruzan la medianoche.
     *
     * Esta prueba lo DOCUMENTA. No lo arregla: es un defecto distinto del que motiva este cambio
     * y su corrección altera la lógica de disponibilidad. Queda registrado con file:line para un
     * hito propio.
     */
    @Test
    @DisplayName("El solapamiento detecta bloques que cruzan la medianoche")
    void testSolapamientoCruzandoMedianoche() {
        ReservaRepository repo = mock(ReservaRepository.class, CALLS_REAL_METHODS);
        LocalDate hoy = LocalDate.now().plusDays(1);
        // Reserva existente: hoy 22:00 -> mañana 04:00
        Reserva nocturna = Reserva.builder().id(1).fecha(hoy)
                .horaIngreso(LocalTime.of(22, 0)).horaSalida(LocalTime.of(4, 0)).build();
        doReturn(List.of(nocturna)).when(repo).findActivasEntreFechas(eq(860), any(), any(), any());

        // Mismo día 20:00 -> 02:00: se cruza con la nocturna
        assertEquals(1, repo.contarReservasSolapadas(860, hoy, LocalTime.of(20, 0), LocalTime.of(2, 0), null));
        // Día siguiente 02:00 -> 08:00: la nocturna sigue ocupando hasta las 04:00
        assertEquals(1, repo.contarReservasSolapadas(860, hoy.plusDays(1), LocalTime.of(2, 0), LocalTime.of(8, 0), null));
        // Día siguiente 04:00 -> 10:00: empieza justo cuando la nocturna libera
        assertEquals(0, repo.contarReservasSolapadas(860, hoy.plusDays(1), LocalTime.of(4, 0), LocalTime.of(10, 0), null));
        // Mismo día 14:00 -> 20:00: termina antes de que empiece la nocturna
        assertEquals(0, repo.contarReservasSolapadas(860, hoy, LocalTime.of(14, 0), LocalTime.of(20, 0), null));
    }

    // ── Hold de 15 min, antifraude y monto calculado en servidor ─────────────

    private void stubCreacionFeliz() {
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        when(reservaRepository.contarReservasSolapadas(eq(860), any(), any(), any(), isNull())).thenReturn(0L);
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(invocation -> {
            Reserva r = invocation.getArgument(0);
            r.setId(202);
            return r;
        });
    }

    private CrearReservaRequest requestConExtras(List<com.wimbledon.backend.domain.enums.ExtraReserva> extras) {
        return new CrearReservaRequest(860, LocalDate.now().plusDays(1), LocalTime.of(20, 0),
                "Alias", "990370681", null, null,
                com.wimbledon.backend.domain.enums.ModalidadEstadia.SEIS_HORAS, extras);
    }

    @Test
    @DisplayName("La reserva online queda retenida el tiempo configurado y se notifica al huésped")
    void testHoldConfiguradoYNotificacion() {
        ReflectionTestUtils.setField(reservaService, "ventanaConfirmacionMinutos", 15);
        stubCreacionFeliz();

        ReservaResponse r = reservaService.crearReserva(requestConExtras(List.of()), null, "10.0.0.5", null);

        assertEquals(EstadoReserva.PENDIENTE, r.estado());
        assertTrue(r.segundosRestantes() <= 15 * 60 && r.segundosRestantes() > 14 * 60);
        assertTrue(r.codigo().matches("WMB-[0-9A-F]{8}"));
        verify(notificacionService).notificarReservaTemporal(any(Reserva.class), eq(15));
    }

    @Test
    @DisplayName("Una IP con una reserva pendiente no puede abrir otra")
    void testUnaReservaPendientePorIp() {
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        when(reservaRepository.countByIpOrigenAndEstado("10.0.0.6", EstadoReserva.PENDIENTE)).thenReturn(1L);

        assertThrows(IllegalStateException.class, () ->
                reservaService.crearReserva(requestConExtras(List.of()), null, "10.0.0.6", null));
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un reenvío con la misma clave de idempotencia devuelve la reserva existente sin crear otra")
    void testIdempotencia() {
        Reserva existente = Reserva.builder().id(55).habitacion(habitacionSuite)
                .fecha(LocalDate.now().plusDays(1)).horaIngreso(LocalTime.of(20, 0)).horaSalida(LocalTime.of(2, 0))
                .estado(EstadoReserva.PENDIENTE).origen(OrigenReserva.ONLINE)
                .qrToken("e6bc9342-1159-4277-bbc8-005b4918d953").build();
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        when(reservaRepository.findByIdempotencyKey("clave-1")).thenReturn(Optional.of(existente));

        ReservaResponse r = reservaService.crearReserva(requestConExtras(List.of()), null, "10.0.0.7", "clave-1");

        assertEquals(55, r.id());
        assertEquals("WMB-E6BC9342", r.codigo());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("El monto suma la tarifa y los adicionales con precios del servidor")
    void testMontoConAdicionales() {
        stubCreacionFeliz();

        ReservaResponse r = reservaService.crearReserva(requestConExtras(List.of(
                com.wimbledon.backend.domain.enums.ExtraReserva.DECO_2,
                com.wimbledon.backend.domain.enums.ExtraReserva.PIQUEO)), null, "10.0.0.8", null);

        // 156 (tarifa mock) + 75 + 42
        assertEquals(0, new BigDecimal("273.00").compareTo(r.montoTotal()));
        assertEquals(List.of("Pack Jacuzzi & Velas", "Piqueo Gourmet Wimbledon"), r.extras());
    }

    @Test
    @DisplayName("No se aceptan dos packs de decoración en la misma reserva")
    void testUnSoloPackDeDecoracion() {
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        when(reservaRepository.contarReservasSolapadas(eq(860), any(), any(), any(), isNull())).thenReturn(0L);

        assertThrows(IllegalArgumentException.class, () -> reservaService.crearReserva(requestConExtras(List.of(
                com.wimbledon.backend.domain.enums.ExtraReserva.DECO_1,
                com.wimbledon.backend.domain.enums.ExtraReserva.DECO_3)), null, "10.0.0.9", null));
    }

    @Test
    @DisplayName("No se puede reservar más allá de 60 días")
    void testLimiteDeAnticipacion() {
        when(habitacionRepository.findByIdWithLock(860)).thenReturn(Optional.of(habitacionSuite));
        CrearReservaRequest lejana = new CrearReservaRequest(860, LocalDate.now().plusDays(61), LocalTime.of(20, 0),
                "Alias", "990370681", null, null);

        assertThrows(IllegalArgumentException.class, () -> reservaService.crearReserva(lejana, null, "10.0.0.10", null));
    }
}
