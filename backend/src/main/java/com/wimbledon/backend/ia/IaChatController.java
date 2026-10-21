package com.wimbledon.backend.ia;

import com.wimbledon.backend.security.IpCliente;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chat del asistente de IA (público, sin login).
 *
 * POST /api/ia/chat  { "mensajes": [ { "rol": "user"|"assistant", "contenido": "..." } ] }
 *   → { "respuesta": "..." }
 *
 * El navegador solo habla con este endpoint; la clave de DeepSeek nunca sale del servidor.
 * El historial lo manda el cliente, pero solo se aceptan roles user/assistant (nada de "system").
 */
@RestController
@RequestMapping("/api/ia")
@RequiredArgsConstructor
public class IaChatController {

    private static final Logger log = LoggerFactory.getLogger(IaChatController.class);
    private static final int MAX_MENSAJES = 12;
    private static final Set<String> ROLES = Set.of("user", "assistant");

    private final AgenteIa agente;
    private final IaLimitador limitador;
    private final IpCliente ipCliente;

    @Value("${wimbledon.ia.max-caracteres-mensaje:500}")
    private int maxCaracteresMensaje;

    /** Apagado por defecto: solo para revisar qué escriben los probadores en una demo. */
    @Value("${wimbledon.ia.registrar-conversaciones:false}")
    private boolean registrarConversaciones;

    public record ChatRequest(List<AgenteIa.Mensaje> mensajes) {}

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest request, HttpServletRequest http) {
        if (!agente.disponible()) {
            return respuesta(HttpStatus.SERVICE_UNAVAILABLE, "El asistente no está disponible por ahora. Escríbenos por WhatsApp o llama al (01) 560-0388.");
        }

        List<AgenteIa.Mensaje> mensajes = request == null ? null : request.mensajes();
        if (mensajes == null || mensajes.isEmpty() || mensajes.size() > MAX_MENSAJES
                || !"user".equals(mensajes.get(mensajes.size() - 1).rol())) {
            return respuesta(HttpStatus.BAD_REQUEST, "Mensaje inválido.");
        }
        for (AgenteIa.Mensaje m : mensajes) {
            if (m == null || m.rol() == null || !ROLES.contains(m.rol())
                    || m.contenido() == null || m.contenido().isBlank()
                    || m.contenido().length() > maxCaracteresMensaje) {
                return respuesta(HttpStatus.BAD_REQUEST,
                        "Cada mensaje debe tener entre 1 y " + maxCaracteresMensaje + " caracteres.");
            }
        }

        String ip = ipCliente.de(http);
        switch (limitador.intentar(ip)) {
            case DEMASIADO_RAPIDO -> {
                return respuesta(HttpStatus.TOO_MANY_REQUESTS, "Vas muy rápido. Espera un momento e inténtalo de nuevo.");
            }
            case LIMITE_DIARIO_IP -> {
                return respuesta(HttpStatus.TOO_MANY_REQUESTS, "Llegaste al límite de mensajes de hoy. Escríbenos por WhatsApp.");
            }
            case LIMITE_DIARIO_GLOBAL -> {
                return respuesta(HttpStatus.SERVICE_UNAVAILABLE, "El asistente descansa hasta mañana. Escríbenos por WhatsApp.");
            }
            case OK -> { }
        }

        try {
            String texto = agente.responder(mensajes, ip);
            if (registrarConversaciones) {
                log.info("IA-CHAT usuario=\"{}\" asistente=\"{}\"", mensajes.get(mensajes.size() - 1).contenido(), texto);
            }
            return respuesta(HttpStatus.OK, texto);
        } catch (IaNoDisponibleException e) {
            return respuesta(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }

    private ResponseEntity<Map<String, String>> respuesta(HttpStatus estado, String texto) {
        return ResponseEntity.status(estado).body(Map.of(estado.is2xxSuccessful() ? "respuesta" : "mensaje", texto));
    }
}
