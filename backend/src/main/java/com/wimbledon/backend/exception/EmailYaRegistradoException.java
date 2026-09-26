package com.wimbledon.backend.exception;

public class EmailYaRegistradoException extends RuntimeException {
    public EmailYaRegistradoException() {
        super("Ya existe una cuenta registrada con este correo electrónico.");
    }

    public EmailYaRegistradoException(String message) {
        super(message);
    }
}
