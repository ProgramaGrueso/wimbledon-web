package com.wimbledon.backend.exception;

/**
 * Cuerpo uniforme de error que devuelve la API en respuestas 4xx/5xx.
 * El frontend React lo captura con un interceptor de Axios.
 *
 * Ejemplo JSON:
 * { "mensaje": "Credenciales incorrectas", "codigo": "CREDENCIALES_INVALIDAS" }
 */
public record ErrorResponse(String mensaje, String codigo) {

    // Códigos de error estándar del sistema
    public static final String CREDENCIALES_INVALIDAS  = "CREDENCIALES_INVALIDAS";
    public static final String TOKEN_INVALIDO           = "TOKEN_INVALIDO";
    public static final String TOKEN_EXPIRADO           = "TOKEN_EXPIRADO";
    public static final String ACCESO_DENEGADO          = "ACCESO_DENEGADO";
    public static final String RECURSO_NO_ENCONTRADO    = "RECURSO_NO_ENCONTRADO";
    public static final String EMAIL_YA_REGISTRADO      = "EMAIL_YA_REGISTRADO";
    public static final String RESERVA_NO_ENCONTRADA    = "RESERVA_NO_ENCONTRADA";
    public static final String QR_YA_UTILIZADO          = "QR_YA_UTILIZADO";
    public static final String RESERVA_CANCELADA        = "RESERVA_CANCELADA";
    public static final String HORARIO_NO_DISPONIBLE    = "HORARIO_NO_DISPONIBLE";
    public static final String CANCELACION_FUERA_PLAZO  = "CANCELACION_FUERA_PLAZO";
    public static final String VALIDACION_FALLIDA       = "VALIDACION_FALLIDA";
    public static final String ERROR_INTERNO            = "ERROR_INTERNO";
}
