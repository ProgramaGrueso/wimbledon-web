package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Tarea programada para expirar automáticamente reservas en estado PENDIENTE
 * que no hayan sido confirmadas dentro de su ventana de tiempo asignada.
 *
 * Al pasar a CANCELADA, el método ReservaRepository.existeSolapamiento()
 * automáticamente excluye la reserva, liberando el bloque horario inmediatamente.
 */
@Component
@RequiredArgsConstructor
public class ReservaExpiracionScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReservaExpiracionScheduler.class);

    private final ReservaRepository reservaRepository;

    /**
     * Se ejecuta periódicamente según wimbledon.reservas.intervalo-expiracion-ms (default: cada 60s).
     */
    @Scheduled(fixedDelayString = "${wimbledon.reservas.intervalo-expiracion-ms:60000}")
    @Transactional
    public void expirarReservasPendientes() {
        LocalDateTime ahora = LocalDateTime.now();
        List<Reserva> expiradas = reservaRepository.findExpiradas(EstadoReserva.PENDIENTE, ahora);

        if (!expiradas.isEmpty()) {
            log.info("⏰ Scheduler de reservas: se encontraron {} reserva(s) PENDIENTE vencidas para cancelar.", expiradas.size());
            for (Reserva r : expiradas) {
                r.setEstado(EstadoReserva.CANCELADA);
                log.info("  ↳ Reserva #{} ({}) de {} expiró (límite era {}) -> CANCELADA y bloque liberado.",
                        r.getId(),
                        r.getHabitacion().getNombre(),
                        r.getEmail(),
                        r.getExpiraEn());
            }
            reservaRepository.saveAll(expiradas);
        }
    }
}
