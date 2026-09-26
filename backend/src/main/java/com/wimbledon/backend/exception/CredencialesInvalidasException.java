package com.wimbledon.backend.exception;

public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException() {
        super("Email o contraseña incorrectos.");
    }

    public CredencialesInvalidasException(String message) {
        super(message);
    }
}
