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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Unidad transaccional UNICA del consumo de la credencial de check-in.
 *
 * Toda la operacion ocurre dentro de una sola transaccion que mantiene el
 * bloqueo de fila de la reserva desde el paso 1 hasta el commit. Cualquier
 * excepcion en los pasos 2 a 6 la aborta sin haber escrito nada de negocio,
 * y en particular sin haber escrito el estado de la habitacion.
 *
 * Orden de las comprobaciones, y por que este orden:
 *  1. Resolucion con bloqueo. Vacio → credencial no utilizable.
 *  2. Estado CANCELADA y 3. estado FINALIZADA van PRIMERO porque son la
 *     informacion con la que recepcion explica al huesped que ocurrio, y
 *     porque una reserva cancelada que ademas figura consumida debe
 *     reportarse como cancelada.
 *  4. Credencial ya usada y 5. fuera de ventana van juntos porque comparten
 *     codigo y mensaje por la regla de no divulgacion.
 *  6. Aseo previo ANTES del consumo: si la habitacion necesita limpieza la
 *     credencial no se consume y el huesped conserva su pase. El coste es
 *     una falla de mostrador; el beneficio es que la invariante de no
 *     escribir OCUPADA sobre una habitacion sucia nunca llega a necesitar
 *     deshacer.
 */
@Service
@RequiredArgsConstructor
public class OperacionConsumoCheckin {

    /** Estados en los que la habitacion exige aseo previo antes de ocuparse. */
    private static final java.util.Set<EstadoHabitacion> ESTADOS_QUE_EXIGEN_ASEO =
            java.util.Set.of(EstadoHabitacion.LIMPIEZA_PENDIENTE, EstadoHabitacion.EN_PROCESO);

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final CalculadoraVentanaCheckin calculadoraVentana;

    /**
     * Consume la credencial de forma atomica y unica.
     *
     * @return la reserva consumida y su habitacion, ya en estado OCUPADA
     * @throws ExcepcionCheckin si la credencial no es utilizable por cualquiera
     *                         de las condiciones de R-4 o de estado de R-5
     */
    @Transactional
    public ResultadoCheckin consumir(String token) {
        // 1. Resolucion con bloqueo de fila (SELECT ... FOR UPDATE).
        Reserva reserva = reservaRepository.findByQrTokenConLock(token)
                .orElseThrow(() -> new CredencialNoUtilizableException(
                        MotivoRechazo.DESCONOCIDA, null));

        // 2 y 3. Estado de negocio primero: es lo que recepcion puede explicar.
        //        Compartido con la ruta de resolucion para que no diverjan.
        Clasificador.exigirEstadoNoTerminal(reserva);

        // 4 y 5. Validez colapsada: misma excepcion, mismo codigo, mismo mensaje.
        Clasificador.exigirCredencialVigente(reserva, calculadoraVentana);

        // 6. Aseo previo, todavia sin haber consumido la credencial.
        Habitacion habitacion = reserva.getHabitacion();
        if (ESTADOS_QUE_EXIGEN_ASEO.contains(habitacion.getEstado())) {
            throw new HabitacionRequiereAseoException(reserva.getId());
        }

        // 7. Consumo: la condicion evaluada y la condicion escrita son el
        // mismo hecho, dentro de la transaccion que aun tiene el bloqueo.
        reserva.setEstado(EstadoReserva.CHECKIN);
        reserva.setQrUsado(true);
        reservaRepository.save(reserva);

        // 8. Ocupacion de la habitacion, una sola vez por credencial consumida.
        habitacion.setEstado(EstadoHabitacion.OCUPADA);
        habitacionRepository.save(habitacion);

        return new ResultadoCheckin(reserva, habitacion);
    }

    /**
     * Resultado del consumo: la reserva ya en CHECKIN con la credencial
     * consumida, y su habitacion ya en OCUPADA.
     */
    public record ResultadoCheckin(Reserva reserva, Habitacion habitacion) {}
}
