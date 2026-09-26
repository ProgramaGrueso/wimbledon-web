package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;

/**
 * La reserva esta en estado FINALIZADA.
 *
 * Misma naturaleza que {@link ReservaCanceladaException}: rechazo de estado
 * de negocio con codigo propio. Antes de este cambio la ruta de resolucion
 * omitia esta comprobacion, de modo que la misma condicion logica devolvia
 * 409 en el check-in y 200 OK en la validacion.
 */
public class ReservaFinalizadaException extends ExcepcionCheckin {

    public ReservaFinalizadaException(Integer reservaId) {
        super("Esta reserva ya fue finalizada.", MotivoRechazo.FINALIZADA, reservaId);
    }
}
