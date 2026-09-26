package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.exception.ReservaCanceladaException;
import com.wimbledon.backend.exception.ReservaFinalizadaException;

/**
 * Clasificacion de invalidez de la credencial, en UNA sola implementacion.
 *
 * Existe para que la ruta de consumo y la ruta de resolucion no puedan
 * divergir por descuido. Cuando la comprobacion vivia duplicada, la ruta de
 * resolucion omitia \`FINALIZADA\` y la misma condicion logica devolvia 409 en
 * el check-in y 200 OK en la validacion. Al compartir el codigo, esa divergencia
 * deja de ser representable.
 *
 * Solo agrupa las comprobaciones de ESTADO y de VALIDEZ, que son las mismas en
 * ambas rutas. Las de consumo —el aseo previo y las escrituras— siguen siendo
 * exclusivas de {@link OperacionConsumoCheckin}, porque la resolucion no
 * escribe nada.
 */
final class Clasificador {

    private Clasificador() {
    }

    /**
     * Estado de negocio primero: es la informacion con la que recepcion explica
     * al huesped que ocurrio, y una reserva cancelada que ademas figura
     * consumida debe reportarse como cancelada.
     */
    static void exigirEstadoNoTerminal(Reserva reserva) {
        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            throw new ReservaCanceladaException(reserva.getId());
        }
        if (reserva.getEstado() == EstadoReserva.FINALIZADA) {
            throw new ReservaFinalizadaException(reserva.getId());
        }
    }

    /**
     * Validez colapsada: credencial ya usada y fuera de ventana comparten tipo
     * de excepcion, codigo y mensaje, de modo que no son distinguibles.
     */
    static void exigirCredencialVigente(Reserva reserva, CalculadoraVentanaCheckin calculadoraVentana) {
        if (Boolean.TRUE.equals(reserva.getQrUsado())) {
            throw new CredencialNoUtilizableException(MotivoRechazo.YA_USADA, reserva.getId());
        }
        if (!calculadoraVentana.dentroDeVentana(reserva)) {
            throw new CredencialNoUtilizableException(MotivoRechazo.FUERA_DE_VENTANA, reserva.getId());
        }
    }
}
