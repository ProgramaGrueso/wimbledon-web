package com.wimbledon.backend.recepcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio proxy de consulta a RENIEC con caché en memoria.
 * Protege el token de acceso externo en el backend y evita problemas de CORS en los clientes.
 */
@Service
@Slf4j
public class ReniecService {

    @Value("${reniec.api.token:token_demo_wimbledon}")
    private String token;

    private final Map<String, ReniecPersonaDTO> cache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private static final Map<String, ReniecPersonaDTO> PADRON_DEMO = Map.of(
            "10203040", new ReniecPersonaDTO("10203040", "CARLOS ENRIQUE", "MENDOZA", "QUISPE", "CARLOS ENRIQUE MENDOZA QUISPE"),
            "72819203", new ReniecPersonaDTO("72819203", "ROBERTO CARLOS", "FERRER", "SALAZAR", "ROBERTO CARLOS FERRER SALAZAR"),
            "45892134", new ReniecPersonaDTO("45892134", "ANA PATRICIA", "RODRÍGUEZ", "VARGAS", "ANA PATRICIA RODRÍGUEZ VARGAS"),
            "80123456", new ReniecPersonaDTO("80123456", "JUAN ALBERTO", "GUERRERO", "FLORES", "JUAN ALBERTO GUERRERO FLORES"),
            "99037068", new ReniecPersonaDTO("99037068", "MIGUEL ÁNGEL", "CHÁVEZ", "TORRES", "MIGUEL ÁNGEL CHÁVEZ TORRES"),
            "71234567", new ReniecPersonaDTO("71234567", "DIEGO ARMANDO", "VÁSQUEZ", "TANTALEÁN", "DIEGO ARMANDO VÁSQUEZ TANTALEÁN")
    );

    public ReniecPersonaDTO consultarConCache(String dni) {
        if (cache.containsKey(dni)) {
            return cache.get(dni);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://apis.net.pe/v2/reniec/dni?numero=" + dni))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String nombres = root.path("nombres").asText("");
                String apePat = root.path("apellidoPaterno").asText("");
                String apeMat = root.path("apellidoMaterno").asText("");
                String completo = (nombres + " " + apePat + " " + apeMat).trim();
                if (!nombres.isBlank()) {
                    ReniecPersonaDTO dto = new ReniecPersonaDTO(dni, nombres, apePat, apeMat, completo);
                    cache.put(dni, dto);
                    return dto;
                }
            }
        } catch (Exception e) {
            log.warn("Fallo consulta a proveedor externo RENIEC para DNI {}: {}", dni, e.getMessage());
        }

        if (PADRON_DEMO.containsKey(dni)) {
            ReniecPersonaDTO dto = PADRON_DEMO.get(dni);
            cache.put(dni, dto);
            return dto;
        }

        return new ReniecPersonaDTO(dni, "Huésped DNI " + dni, "", "", "Huésped DNI " + dni);
    }
}
