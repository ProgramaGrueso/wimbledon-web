package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Reserva;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Calcula la ventana de vigencia del pase a partir de las columnas que la
 * reserva YA tiene: {@code fecha}, {@code horaIngreso} y {@code horaSalida}.
 * No existe columna de expiracion y este calculo no introduce ninguna.
 *
 * <pre>
 * inicio = fecha + horaIngreso - anticipacion_horas
 * fin    = fecha + horaSalida   (si horaSalida &lt;= horaIngreso, fin es del dia siguiente)
 * valido <=> inicio &lt;= instante_actual AND instante_actual &lt; fin
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class CalculadoraVentanaCheckin {

    private final ConfiguracionCheckin configuracion;
    private final Clock clock;

    /**
     * Deriva la ventana de la reserva.
     *
     * Regla de cruce de medianoche: se compara {@code horaSalida} contra
     * {@code horaIngreso}, NUNCA {@code acceso} contra {@code cierre}, porque
     * {@code acceso} ya viene desplazado por la anticipacion y comparar con ese
     * desplazamiento produce un resultado distinto para estancias cortas.
     * Cuando {@code horaSalida == horaIngreso} la estancia es de 24 horas, no
     * de duracion cero.
     */
    public VentanaCheckin calcular(Reserva reserva) {
        LocalDateTime acceso = LocalDateTime.of(reserva.getFecha(), reserva.getHoraIngreso())
                .minusHours(configuracion.anticipacionHoras());

        LocalDateTime cierre = LocalDateTime.of(reserva.getFecha(), reserva.getHoraSalida());
        if (!reserva.getHoraSalida().isAfter(reserva.getHoraIngreso())) {
            cierre = cierre.plusDays(1);
        }

        return new VentanaCheckin(acceso, cierre);
    }

    /** Instante actual leido del {@link Clock} inyectado, no del reloj del sistema. */
    public LocalDateTime ahora() {
        return LocalDateTime.now(clock);
    }

    /** Indica si el instante dado cae dentro de la ventana de la reserva. */
    public boolean dentroDeVentana(Reserva reserva, LocalDateTime instante) {
        return calcular(reserva).contiene(instante);
    }

    /** Indica si el instante actual cae dentro de la ventana de la reserva. */
    public boolean dentroDeVentana(Reserva reserva) {
        return dentroDeVentana(reserva, ahora());
    }
}
