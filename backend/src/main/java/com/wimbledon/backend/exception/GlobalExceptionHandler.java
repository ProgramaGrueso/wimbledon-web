package com.wimbledon.backend.exception;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Manejador global de excepciones.
 * Convierte todas las excepciones en respuestas JSON con el formato
 * {mensaje, codigo} que el interceptor de Axios del frontend espera.
 *
 * Tono del mensaje: "tu discreción es nuestra felicidad" — sin tecnicismos
 * ni datos internos expuestos al cliente.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Autenticación ─────────────────────────────────────────────────────────

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(
                        "Email o contraseña incorrectos.",
                        ErrorResponse.CREDENCIALES_INVALIDAS));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErrorResponse> handleDisabledAccount(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(
                        "Tu cuenta está desactivada. Contacta a recepción.",
                        ErrorResponse.CREDENCIALES_INVALIDAS));
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<ErrorResponse> handleExpiredJwt(ExpiredJwtException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(
                        "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
                        ErrorResponse.TOKEN_EXPIRADO));
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJwt(JwtException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(
                        "Token de acceso inválido.",
                        ErrorResponse.TOKEN_INVALIDO));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(
                        "No tienes permisos para realizar esta acción.",
                        ErrorResponse.ACCESO_DENEGADO));
    }

    // ── Check-in: un manejador por tipo, nunca por texto del mensaje ─────────

    /**
     * Credencial no utilizable por cualquiera de sus tres causas: inexistente,
     * fuera de la ventana de vigencia o ya consumida.
     *
     * El mensaje viene del literal unico de la propia excepcion, de modo que
     * las tres condiciones responden con el mismo cuerpo y son indistinguibles
     * para quien solo tiene la respuesta.
     */
    @ExceptionHandler(CredencialNoUtilizableException.class)
    public ResponseEntity<ErrorResponse> handleCredencialNoUtilizable(CredencialNoUtilizableException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.QR_NO_UTILIZABLE));
    }

    @ExceptionHandler(ReservaCanceladaException.class)
    public ResponseEntity<ErrorResponse> handleReservaCancelada(ReservaCanceladaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.RESERVA_CANCELADA));
    }

    @ExceptionHandler(ReservaFinalizadaException.class)
    public ResponseEntity<ErrorResponse> handleReservaFinalizada(ReservaFinalizadaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.RESERVA_FINALIZADA));
    }

    @ExceptionHandler(HabitacionRequiereAseoException.class)
    public ResponseEntity<ErrorResponse> handleHabitacionRequiereAseo(HabitacionRequiereAseoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.HABITACION_REQUIERE_ASEO));
    }

    // ── Negocio ───────────────────────────────────────────────────────────────

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.RECURSO_NO_ENCONTRADO));
    }

    /**
     * Conflicto de estado generico.
     *
     * Antes decidia entre QR_YA_UTILIZADO y ESTADO_CONFLICTO inspeccionando si
     * el mensaje contenia la palabra "código", con lo que cualquier
     * IllegalStateException ajeno al check-in se reportaba como problema de QR.
     * Ahora devuelve siempre 409 con CONFLITO_ESTADO, sin mirar el texto.
     *
     * El manejador NO se elimina: lo siguen necesitando ReservaService
     * (habitacion en mantenimiento, cancelacion fuera de estado) y
     * RecepcionService (habitacion en mantenimiento, aseo previo).
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.CONFLITO_ESTADO));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getMessage(), ErrorResponse.VALIDACION_FALLIDA));
    }

    // ── Validación de DTOs (@Valid) ────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String mensaje = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(". "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(mensaje, ErrorResponse.VALIDACION_FALLIDA));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("El recurso solicitado no fue encontrado.", ErrorResponse.RECURSO_NO_ENCONTRADO));
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        // No exponemos el stacktrace al cliente
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(
                        "Algo salió mal de nuestro lado. Inténtalo en unos momentos.",
                        ErrorResponse.ERROR_INTERNO));
    }
}
