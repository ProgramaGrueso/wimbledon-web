package com.wimbledon.backend.recepcion;

import java.time.LocalDateTime;

/**
 * Ventana de validez de una credencial de check-in.
 *
 * Reglas:
 *  - limite inferior INCLUSIVO: quien llega exactamente en el acceso puede registrarse.
 *  - limite superior EXCLUSIVO: a la hora de salida exacta la ventana ya esta cerrada.
 *  - sin margen posterior: el pase no sobrevive a la liberacion de la habitacion.
 */
public record VentanaCheckin(LocalDateTime acceso, LocalDateTime cierre) {

    /** Indica si el instante cae dentro de la ventana de vigencia. */
    public boolean contiene(LocalDateTime instante) {
        return !instante.isBefore(acceso) && instante.isBefore(cierre);
    }
}
