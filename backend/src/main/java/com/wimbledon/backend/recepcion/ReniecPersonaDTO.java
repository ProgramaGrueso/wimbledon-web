package com.wimbledon.backend.recepcion;

public record ReniecPersonaDTO(
        String dni,
        String nombres,
        String apellidoPaterno,
        String apellidoMaterno,
        String nombreCompleto
) {}
