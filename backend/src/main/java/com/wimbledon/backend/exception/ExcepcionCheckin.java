package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;

/**
 * Raiz de la jerarquia de rechazos de check-in.
 *
 * Un tipo por condicion de negocio, porque el codigo de la respuesta se
 * determina por el TIPO de la excepcion y nunca por la redaccion de su
 * mensaje. Antes de este cambio, GlobalExceptionHandler derivaba el codigo
 * inspeccionando \`getMessage().contains("código")\`, lo que ataba el contrato
 * de la API a la redaccion del texto libre.
 *
 * \`motivo\` y \`reservaId\` son datos INTERNOS: los consume la auditoria de
 * intentos y NUNCA se serializan en la respuesta HTTP.
 */
public abstract class ExcepcionCheckin extends RuntimeException {

    private final MotivoRechazo motivo;
    private final Integer reservaId;

    protected ExcepcionCheckin(String message, MotivoRechazo motivo, Integer reservaId) {
        super(message);
        this.motivo = motivo;
        this.reservaId = reservaId;
    }

    /** Motivo interno, mas fino que el codigo que ve el cliente. */
    public MotivoRechazo motivo() {
        return motivo;
    }

    /** Identificador de la reserva cuando la credencial resolvio a una. */
    public Integer reservaId() {
        return reservaId;
    }
}
