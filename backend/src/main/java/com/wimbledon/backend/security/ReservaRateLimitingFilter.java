package com.wimbledon.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Filtro de rate limiting en memoria para las rutas públicas del portal:
 *  - POST /api/reservas: 5 solicitudes de creación por minuto por IP.
 *  - GET  /api/publico/**: 60 consultas de disponibilidad por minuto por IP.
 */
@Component
public class ReservaRateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 5;
    private static final int MAX_CONSULTAS_PER_MINUTE = 60;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, ConcurrentLinkedQueue<Long>> requestCountsByIp = new ConcurrentHashMap<>();
    private final Map<String, ConcurrentLinkedQueue<Long>> consultasByIp = new ConcurrentHashMap<>();
    private final IpCliente ipCliente;

    public ReservaRateLimitingFilter(IpCliente ipCliente) {
        this.ipCliente = ipCliente;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        boolean creaReserva = "POST".equalsIgnoreCase(request.getMethod())
                && "/api/reservas".equalsIgnoreCase(request.getRequestURI());
        boolean consultaPublica = "GET".equalsIgnoreCase(request.getMethod())
                && request.getRequestURI().startsWith("/api/publico/");

        if (creaReserva || consultaPublica) {
            Map<String, ConcurrentLinkedQueue<Long>> contadores = creaReserva ? requestCountsByIp : consultasByIp;
            int limite = creaReserva ? MAX_REQUESTS_PER_MINUTE : MAX_CONSULTAS_PER_MINUTE;
            String clientIp = ipCliente.de(request);
            long now = System.currentTimeMillis();

            ConcurrentLinkedQueue<Long> timestamps = contadores.computeIfAbsent(
                    clientIp, k -> new ConcurrentLinkedQueue<>()
            );

            // Evictar timestamps fuera de la ventana de 1 minuto
            while (!timestamps.isEmpty() && now - timestamps.peek() > WINDOW_MS) {
                timestamps.poll();
            }

            if (timestamps.size() >= limite) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("""
                    {
                      "mensaje": "Demasiadas solicitudes en poco tiempo. Espera unos momentos e inténtalo de nuevo.",
                      "codigo": "DEMASIADAS_SOLICITUDES"
                    }
                    """);
                return;
            }

            timestamps.add(now);

            // Mantenimiento periódico suave del mapa si crece demasiado
            if (contadores.size() > 5000) {
                cleanupOldEntries(contadores, now);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void cleanupOldEntries(Map<String, ConcurrentLinkedQueue<Long>> contadores, long now) {
        Iterator<Map.Entry<String, ConcurrentLinkedQueue<Long>>> it = contadores.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, ConcurrentLinkedQueue<Long>> entry = it.next();
            ConcurrentLinkedQueue<Long> queue = entry.getValue();
            while (!queue.isEmpty() && now - queue.peek() > WINDOW_MS) {
                queue.poll();
            }
            if (queue.isEmpty()) {
                it.remove();
            }
        }
    }
}
