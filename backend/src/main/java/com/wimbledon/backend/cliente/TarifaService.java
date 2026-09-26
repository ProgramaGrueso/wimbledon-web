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
        if (habitacion == null || habitacion.getTarifaBase() == null) {
            return BigDecimal.ZERO;
        }
        if (modalidad == null || modalidad == ModalidadEstadia.SEIS_HORAS) {
            return habitacion.getTarifaBase();
        }
        return switch (modalidad) {
            case TRES_HORAS -> habitacion.getTarifaBase().multiply(new BigDecimal("0.65")).setScale(2, RoundingMode.HALF_UP);
            case SEIS_HORAS -> habitacion.getTarifaBase();
            case DOCE_HORAS -> habitacion.getTarifaBase().multiply(new BigDecimal("1.60")).setScale(2, RoundingMode.HALF_UP);
        };
    }
}
