package com.wimbledon.backend.exception;

public class CuentaDesactivadaException extends RuntimeException {
    public CuentaDesactivadaException(String message) {
        super(message);
    }

    public CuentaDesactivadaException() {
        super("Tu cuenta ha sido desactivada por un administrador.");
    }
}
