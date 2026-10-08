package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.CobroCaja;
import com.wimbledon.backend.repository.CobroCajaRepository;
import com.wimbledon.backend.repository.UsuarioRepository;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Caja del turno de Recepción (pago 100 % en efectivo).
 * Persiste los cobros en MySQL para que sobrevivan a recargas y cambios de equipo.
 */
@Service
@RequiredArgsConstructor
public class CajaService {

    public record CobroRequest(
            @Size(max = 20) String habitacionNumero,
            @Size(max = 100) String habitacionNombre,
            @Size(max = 20) String dni,
            @Size(max = 150) String huespedNombre,
            @Size(max = 30) String duracion,
            @NotNull @DecimalMin("0.00") BigDecimal monto
    ) {}

    public record CobroResponse(Long id, LocalDateTime fechaHora, String habitacionNumero,
                                String habitacionNombre, String dni, String huespedNombre,
                                String duracion, BigDecimal monto, String metodo) {}

    public record TurnoCajaResponse(LocalDateTime turnoIniciado, String recepcionista,
                                    BigDecimal total, List<CobroResponse> cobros) {}

    private final CobroCajaRepository cobroRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public TurnoCajaResponse turnoActual(String email) {
        List<CobroCaja> cobros = cobroRepository.findByRecepcionistaEmailAndCerradoFalseOrderByCreadoEnDesc(email);
        BigDecimal total = cobros.stream().map(CobroCaja::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime inicio = cobros.isEmpty() ? LocalDateTime.now() : cobros.get(cobros.size() - 1).getCreadoEn();
        return new TurnoCajaResponse(inicio, nombreDe(email), total, cobros.stream().map(this::aRespuesta).toList());
    }

    @Transactional
    public CobroResponse registrarCobro(String email, CobroRequest req) {
        CobroCaja cobro = cobroRepository.save(CobroCaja.builder()
                .recepcionistaEmail(email)
                .recepcionistaNombre(nombreDe(email))
                .habitacionNumero(req.habitacionNumero())
                .habitacionNombre(req.habitacionNombre())
                .dni(req.dni())
                .huespedNombre(req.huespedNombre())
                .duracion(req.duracion())
                .monto(req.monto())
                .build());
        return aRespuesta(cobro);
    }

    /** Cierra el turno: marca los cobros abiertos y devuelve el arqueo final. */
    @Transactional
    public TurnoCajaResponse cerrarTurno(String email) {
        TurnoCajaResponse arqueo = turnoActual(email);
        LocalDateTime ahora = LocalDateTime.now();
        List<CobroCaja> abiertos = cobroRepository.findByRecepcionistaEmailAndCerradoFalseOrderByCreadoEnDesc(email);
        abiertos.forEach(c -> { c.setCerrado(true); c.setCierreEn(ahora); });
        cobroRepository.saveAll(abiertos);
        return arqueo;
    }

    private String nombreDe(String email) {
        return usuarioRepository.findByEmail(email).map(u -> u.getNombre()).orElse(email);
    }

    private CobroResponse aRespuesta(CobroCaja c) {
        return new CobroResponse(c.getId(), c.getCreadoEn(), c.getHabitacionNumero(), c.getHabitacionNombre(),
                c.getDni(), c.getHuespedNombre(), c.getDuracion(), c.getMonto(), "EFECTIVO");
    }
}
