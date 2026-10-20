package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.enums.ModalidadEstadia;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Servicio de cálculo dinámico de tarifas hoteleras según la modalidad elegida.
 */
@Service
public class TarifaService {

    public BigDecimal calcularTarifa(Habitacion habitacion, ModalidadEstadia modalidad) {
        return tarifaSobreBase(habitacion == null ? null : habitacion.getTarifaBase(), modalidad);
    }

    /** Misma regla sobre la tarifa base (bloque de 6 horas), para quien no tiene la entidad a mano. */
    public BigDecimal tarifaSobreBase(BigDecimal tarifaBase, ModalidadEstadia modalidad) {
        if (tarifaBase == null) {
            return BigDecimal.ZERO;
        }
        if (modalidad == null || modalidad == ModalidadEstadia.SEIS_HORAS) {
            return tarifaBase;
        }
        return switch (modalidad) {
            case TRES_HORAS -> tarifaBase.multiply(new BigDecimal("0.65")).setScale(2, RoundingMode.HALF_UP);
            case SEIS_HORAS -> tarifaBase;
            case DOCE_HORAS -> tarifaBase.multiply(new BigDecimal("1.60")).setScale(2, RoundingMode.HALF_UP);
        };
    }
}
