package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.CobroCaja;
import com.wimbledon.backend.repository.CobroCajaRepository;
import com.wimbledon.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CajaServiceTest {

    private final CobroCajaRepository cobros = mock(CobroCajaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final CajaService service = new CajaService(cobros, usuarios);

    private static CobroCaja cobro(String monto, int hora) {
        return CobroCaja.builder().monto(new BigDecimal(monto)).cerrado(false)
                .creadoEn(LocalDateTime.of(2026, 10, 8, hora, 0)).build();
    }

    @Test
    void turnoSumaLosCobrosAbiertosYTomaElInicioDelMasAntiguo() {
        when(usuarios.findByEmail("r@x.test")).thenReturn(Optional.empty());
        when(cobros.findByRecepcionistaEmailAndCerradoFalseOrderByCreadoEnDesc("r@x.test"))
                .thenReturn(List.of(cobro("55.00", 10), cobro("125.00", 8)));

        var turno = service.turnoActual("r@x.test");

        assertEquals(new BigDecimal("180.00"), turno.total());
        assertEquals(LocalDateTime.of(2026, 10, 8, 8, 0), turno.turnoIniciado());
        assertEquals(2, turno.cobros().size());
    }

    @Test
    void cerrarTurnoMarcaLosCobrosComoCerrados() {
        List<CobroCaja> abiertos = List.of(cobro("55.00", 10));
        when(usuarios.findByEmail("r@x.test")).thenReturn(Optional.empty());
        when(cobros.findByRecepcionistaEmailAndCerradoFalseOrderByCreadoEnDesc("r@x.test")).thenReturn(abiertos);

        service.cerrarTurno("r@x.test");

        assertTrue(abiertos.get(0).getCerrado());
        assertNotNull(abiertos.get(0).getCierreEn());
        verify(cobros).saveAll(abiertos);
    }
}
