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
 * Filtro de rate limiting en memoria para prevenir abusos de denegación de inventario
 * en el endpoint público POST /api/reservas.
 *
 * Límite predeterminado: 5 solicitudes de creación de reserva por minuto por IP.
 */
@Component
public class ReservaRateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 5;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, ConcurrentLinkedQueue<Long>> requestCountsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/reservas".equalsIgnoreCase(request.getRequestURI())) {
            String clientIp = getClientIp(request);
            long now = System.currentTimeMillis();

            ConcurrentLinkedQueue<Long> timestamps = requestCountsByIp.computeIfAbsent(
                    clientIp, k -> new ConcurrentLinkedQueue<>()
            );

            // Evictar timestamps fuera de la ventana de 1 minuto
            while (!timestamps.isEmpty() && now - timestamps.peek() > WINDOW_MS) {
                timestamps.poll();
            }

            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("""
                    {
                      "error": "Has excedido el límite permitido de solicitudes de reserva por minuto. Por favor espera unos momentos antes de intentar nuevamente."
                    }
                    """);
                return;
            }

            timestamps.add(now);

            // Mantenimiento periódico suave del mapa si crece demasiado
            if (requestCountsByIp.size() > 5000) {
                cleanupOldEntries(now);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void cleanupOldEntries(long now) {
        Iterator<Map.Entry<String, ConcurrentLinkedQueue<Long>>> it = requestCountsByIp.entrySet().iterator();
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

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
