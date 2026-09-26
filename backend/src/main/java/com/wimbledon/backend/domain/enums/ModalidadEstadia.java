package com.wimbledon.backend.domain.enums;

/**
 * Modalidades de estadía permitidas por el Hotel Wimbledon.
 * Validadas estrictamente por contrato en el backend para evitar duraciones arbitrarias.
 */
public enum ModalidadEstadia {
    TRES_HORAS(3),
    SEIS_HORAS(6),
    DOCE_HORAS(12);

    public final int horas;

    ModalidadEstadia(int horas) {
        this.horas = horas;
    }

    public int getHoras() {
        return horas;
    }
}
