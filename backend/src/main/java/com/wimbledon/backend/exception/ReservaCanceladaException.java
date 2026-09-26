package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;

/**
 * La reserva esta en estado CANCELADA.
 *
 * Rechazo de ESTADO DE NEGOCIO, no de validez de credencial, por eso mantiene
 * codigo propio: es la informacion con la que recepcion explica al huesped
 * que ocurrio. Solo es alcanzable por un portador de la credencial y solo se
 * expone a los tres roles autorizados, nunca a un llamante anonimo.
 */
public class ReservaCanceladaException extends ExcepcionCheckin {

    public ReservaCanceladaException(Integer reservaId) {
        super("Esta reserva fue cancelada.", MotivoRechazo.CANCELADA, reservaId);
    }
}
