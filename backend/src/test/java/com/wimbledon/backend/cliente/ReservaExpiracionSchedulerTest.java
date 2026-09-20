package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.repository.ReservaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservaExpiracionSchedulerTest {

    @Mock
    private ReservaRepository reservaRepository;

    @InjectMocks
    private ReservaExpiracionScheduler scheduler;

    @Test
    @DisplayName("Scheduler cancela reservas PENDIENTE expiradas y las guarda")
    void testExpirarReservasPendientes() {
        Habitacion hab = Habitacion.builder().id(1).nombre("Suite").build();
        Reserva expirada = Reserva.builder()
                .id(99)
                .habitacion(hab)
                .email("test@huesped.pe")
                .estado(EstadoReserva.PENDIENTE)
                .expiraEn(LocalDateTime.now().minusMinutes(2))
                .build();

        when(reservaRepository.findExpiradas(eq(EstadoReserva.PENDIENTE), any(LocalDateTime.class)))
                .thenReturn(List.of(expirada));

        scheduler.expirarReservasPendientes();

        assertEquals(EstadoReserva.CANCELADA, expirada.getEstado());
        verify(reservaRepository, times(1)).saveAll(List.of(expirada));
    }
}
