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
    public static final String RESERVA_CANCELADA        = "RESERVA_CANCELADA";

    // Códigos de check-in. QR_YA_UTILIZADO y ESTADO_CONFLICTO se RETIRARON:
    // el primero se derivaba del texto del mensaje y el segundo reutilizaba
    // un nombre generico ya ocupado. La clasificación es ahora por tipo de
    // excepción, no por coincidencia de redacción.
    /** Credencial no utilizable por cualquier causa, sin revelar el motivo. */
    public static final String QR_NO_UTILIZABLE         = "QR_NO_UTILIZABLE";
    /** La reserva esta en estado FINALIZADA. */
    public static final String RESERVA_FINALIZADA       = "RESERVA_FINALIZADA";
    /** La habitacion requiere aseo antes de ser ocupada. */
    public static final String HABITACION_REQUIERE_ASEO = "HABITACION_REQUIERE_ASEO";
    /** Conflicto de estado generico, sin inspeccionar el texto del mensaje. */
    public static final String CONFLITO_ESTADO          = "CONFLITO_ESTADO";

    public static final String HORARIO_NO_DISPONIBLE    = "HORARIO_NO_DISPONIBLE";
    public static final String CANCELACION_FUERA_PLAZO  = "CANCELACION_FUERA_PLAZO";
    public static final String VALIDACION_FALLIDA       = "VALIDACION_FALLIDA";
    public static final String ERROR_INTERNO            = "ERROR_INTERNO";
}
