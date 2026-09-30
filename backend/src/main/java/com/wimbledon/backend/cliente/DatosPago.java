package com.wimbledon.backend.cliente;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Datos de depósito del hotel. Única fuente: application.properties (wimbledon.pago.*).
 *
 * Los consume el portal (GET /api/publico/pago) y la notificación al huésped,
 * de modo que cambiar un número de cuenta no exige tocar el frontend.
 */
@Component
public class DatosPago {

    @Value("${wimbledon.pago.titular:Hotel Wimbledon}")
    private String titular;

    @Value("${wimbledon.pago.yape-plin:990370681}")
    private String yapePlin;

    @Value("${wimbledon.pago.whatsapp:51990370681}")
    private String whatsapp;

    /** Formato por cuenta: "Banco|Número|CCI", separadas por ';'. */
    @Value("${wimbledon.pago.cuentas:}")
    private String cuentas;

    public record Cuenta(String banco, String numero, String cci) {}

    public record Respuesta(
            String titular,
            String yapePlin,
            String whatsapp,
            List<Cuenta> cuentas,
            @JsonProperty("minutosRetencion") int minutosRetencion
    ) {}

    public String titular() { return titular; }
    public String yapePlin() { return yapePlin; }
    public String whatsapp() { return whatsapp; }

    public List<Cuenta> cuentas() {
        if (cuentas == null || cuentas.isBlank()) return List.of();
        return Arrays.stream(cuentas.split(";"))
                .map(String::trim)
                .filter(c -> !c.isEmpty())
                .map(c -> {
                    String[] p = c.split("\\|", -1);
                    return new Cuenta(p[0].trim(), p.length > 1 ? p[1].trim() : "", p.length > 2 ? p[2].trim() : "");
                })
                .toList();
    }
}
