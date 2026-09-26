package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;

/**
 * Unica condicion de invalidez de la credencial: credencial inexistente,
 * fuera de la ventana de vigencia o ya consumida.
 *
 * Las tres devuelven el mismo estado HTTP, el mismo codigo y este MISMO
 * literal de mensaje, de modo que ninguna es distinguible de las otras por
 * forma. No debe reveal ningun identificador, fecha ni marca que permita
 * reconstruir la ventana de la reserva por diferencia.
 */
public class CredencialNoUtilizableException extends ExcepcionCheckin {

    /**
     * Literal unico compartido por las tres causas. Cualquier cambio aqui
     * cambia la respuesta de las tres a la vez, que es exactamente la
     * garantia que se busca: no pueden divergir.
     */
    public static final String MENSAJE =
            "El pase presentado no se puede utilizar. Verifica el codigo e intentalo de nuevo en recepcion.";

    public CredencialNoUtilizableException(MotivoRechazo motivo, Integer reservaId) {
        super(MENSAJE, motivo, reservaId);
    }
}
