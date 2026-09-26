package com.wimbledon.backend.exception;

import com.wimbledon.backend.domain.enums.MotivoRechazo;

/**
 * La habitacion requiere aseo o desinfeccion antes de ser ocupada.
 *
 * Condicion OPERATIVA, no de validez: solo es alcanzable despues de superar
 * la ventana y el estado de la reserva, con la credencial ya probada, de modo
 * que no introduce un oraculo de existencia de reservas. Nunca se escribe
 * OCUPADA sobre una habitacion en LIMPIEZA_PENDIENTE o EN_PROCESO.
 */
public class HabitacionRequiereAseoException extends ExcepcionCheckin {

    public HabitacionRequiereAseoException(Integer reservaId) {
        super("La habitacion asignada requiere aseo antes de ser ocupada. "
                        + "Solicita a limpieza y reintenta el ingreso.",
                MotivoRechazo.HABITACION_REQUIERE_ASEO, reservaId);
    }
}
