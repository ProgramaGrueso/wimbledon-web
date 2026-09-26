package com.wimbledon.backend.exception;

public class CuentaPendienteAprobacionException extends RuntimeException {
    public CuentaPendienteAprobacionException(String message) {
        super(message);
    }

    public CuentaPendienteAprobacionException() {
        super("Tu cuenta fue creada pero aún no ha sido aprobada por un administrador.");
    }
}
