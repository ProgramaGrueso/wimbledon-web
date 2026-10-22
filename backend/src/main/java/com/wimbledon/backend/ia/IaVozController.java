package com.wimbledon.backend.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wimbledon.backend.security.IpCliente;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Voz de la asistente (público, sin login): puente hacia un servidor Voicebox local.
 *
 * POST /api/ia/voz   { "texto": "..." } → audio/wav
 * GET  /api/ia/voz/estado → { "activa": true|false }
 *
 * Apagado por defecto (wimbledon.voz.activa=false). Solo se genera una voz a la vez y cada IP tiene
 * un ritmo y un tope diario, porque el servidor de voz comparte la GPU de la máquina de la demo.
 */
@RestController
@RequestMapping("/api/ia/voz")
@RequiredArgsConstructor
public class IaVozController {

    private static final Logger log = LoggerFactory.getLogger(IaVozController.class);
    private static final long MIN_MS_ENTRE_PEDIDOS = 1500;

    private final ObjectMapper mapper;
    private final IpCliente ipCliente;

    @Value("${wimbledon.voz.activa:false}")
    private boolean activa;
    @Value("${wimbledon.voz.url:http://127.0.0.1:17493}")
    private String url;
    @Value("${wimbledon.voz.perfil:Hotel Wimbledon anfitriona (Serena)}")
    private String perfil;
    @Value("${wimbledon.voz.motor:qwen_custom_voice}")
    private String motor;
    @Value("${wimbledon.voz.instruccion:Voz cálida, suave y cercana de anfitriona de hotel, sonriendo al hablar.}")
    private String instruccion;
    @Value("${wimbledon.voz.max-caracteres:220}")
    private int maxCaracteres;
    @Value("${wimbledon.voz.max-por-ip-dia:150}")
    private int maxPorIpDia;
    @Value("${wimbledon.voz.timeout-segundos:90}")
    private int timeoutSegundos;

    public record VozRequest(String texto) {}

    private final HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).build();
    private final Semaphore turno = new Semaphore(1, true);
    private final Map<String, long[]> porIp = new ConcurrentHashMap<>(); // ip → {ultimoMs, contadorDia, dia}
    private volatile String perfilId;
    private volatile long estadoMs;
    private volatile boolean estadoCache;

    @GetMapping("/estado")
    public Map<String, Boolean> estado() {
        if (!activa) return Map.of("activa", false);
        long ahora = System.currentTimeMillis();
        if (ahora - estadoMs > 10_000) {
            try {
                estadoCache = http.send(req("/profiles").GET().build(), HttpResponse.BodyHandlers.discarding()).statusCode() == 200;
            } catch (Exception e) {
                estadoCache = false;
            }
            estadoMs = ahora;
        }
        return Map.of("activa", estadoCache);
    }

    @PostMapping(produces = "audio/wav")
    public ResponseEntity<?> hablar(@RequestBody VozRequest request, HttpServletRequest servlet) {
        if (!activa) return error(HttpStatus.SERVICE_UNAVAILABLE, "La voz no está disponible.");
        String texto = request == null || request.texto() == null ? "" : request.texto().strip();
        if (texto.isEmpty() || texto.length() > maxCaracteres) {
            return error(HttpStatus.BAD_REQUEST, "El texto debe tener entre 1 y " + maxCaracteres + " caracteres.");
        }
        if (!permitir(ipCliente.de(servlet))) return error(HttpStatus.TOO_MANY_REQUESTS, "Demasiadas peticiones de voz.");

        try {
            if (!turno.tryAcquire(timeoutSegundos, TimeUnit.SECONDS)) return error(HttpStatus.SERVICE_UNAVAILABLE, "La voz está ocupada.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return error(HttpStatus.SERVICE_UNAVAILABLE, "La voz está ocupada.");
        }
        try {
            byte[] wav = generar(texto);
            return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/wav")).body(wav);
        } catch (Exception e) {
            log.warn("IA-VOZ no pude generar el audio: {}", e.toString());
            return error(HttpStatus.SERVICE_UNAVAILABLE, "La voz no está disponible.");
        } finally {
            turno.release();
        }
    }

    private byte[] generar(String texto) throws Exception {
        String id = perfilId();
        Map<String, Object> cuerpo = new java.util.HashMap<>(Map.of(
                "profile_id", id, "text", texto, "language", "es", "engine", motor,
                "model_size", "1.7B", "normalize", true));
        if ("qwen_custom_voice".equals(motor)) cuerpo.put("instruct", instruccion);
        JsonNode g = json(http.send(req("/generate").timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(cuerpo))).build(),
                HttpResponse.BodyHandlers.ofString()).body());
        String gid = g.path("id").asText();
        long limite = System.currentTimeMillis() + timeoutSegundos * 1000L;
        while (System.currentTimeMillis() < limite) {
            JsonNode st = json(http.send(req("/history/" + gid).GET().build(), HttpResponse.BodyHandlers.ofString()).body());
            String estadoGen = st.path("status").asText();
            if ("completed".equals(estadoGen)) {
                return http.send(req("/audio/" + gid).timeout(Duration.ofSeconds(30)).GET().build(),
                        HttpResponse.BodyHandlers.ofByteArray()).body();
            }
            if ("failed".equals(estadoGen)) throw new IllegalStateException("Voicebox: " + st.path("error").asText());
            Thread.sleep(250);
        }
        throw new IllegalStateException("Voicebox tardó demasiado");
    }

    private String perfilId() throws Exception {
        String id = perfilId;
        if (id != null) return id;
        JsonNode lista = json(http.send(req("/profiles").GET().build(), HttpResponse.BodyHandlers.ofString()).body());
        for (JsonNode p : lista) {
            if (perfil.equals(p.path("name").asText())) return perfilId = p.path("id").asText();
        }
        throw new IllegalStateException("No existe el perfil de voz '" + perfil + "'");
    }

    private JsonNode json(String cuerpo) throws Exception { return mapper.readTree(cuerpo); }

    private HttpRequest.Builder req(String ruta) { return HttpRequest.newBuilder(URI.create(url + ruta)).timeout(Duration.ofSeconds(5)); }

    /** Ritmo mínimo entre pedidos y tope diario por IP. */
    private boolean permitir(String ip) {
        long ahora = System.currentTimeMillis(), dia = ahora / 86_400_000L;
        long[] e = porIp.computeIfAbsent(ip, k -> new long[]{0, 0, dia});
        synchronized (e) {
            if (e[2] != dia) { e[1] = 0; e[2] = dia; }
            if (ahora - e[0] < MIN_MS_ENTRE_PEDIDOS || e[1] >= maxPorIpDia) return false;
            e[0] = ahora; e[1]++;
            return true;
        }
    }

    private ResponseEntity<?> error(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado).contentType(MediaType.APPLICATION_JSON).body(Map.of("mensaje", mensaje));
    }
}
