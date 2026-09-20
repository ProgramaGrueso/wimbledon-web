package com.wimbledon.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class ReservaRateLimitingFilterTest {

    private ReservaRateLimitingFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new ReservaRateLimitingFilter();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Permite hasta 5 peticiones POST a /api/reservas desde la misma IP y bloquea la 6ta con 429")
    void testRateLimitingPostReservas() throws ServletException, IOException {
        String clientIp = "192.168.1.50";

        for (int i = 1; i <= 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reservas");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertEquals(200, response.getStatus(), "Petición " + i + " debe permitirse");
        }

        verify(filterChain, times(5)).doFilter(any(), any());

        // La 6ta petición debe retornar HTTP 429 Too Many Requests
        MockHttpServletRequest requestExcedida = new MockHttpServletRequest("POST", "/api/reservas");
        requestExcedida.setRemoteAddr(clientIp);
        MockHttpServletResponse responseExcedida = new MockHttpServletResponse();

        filter.doFilter(requestExcedida, responseExcedida, filterChain);

        assertEquals(429, responseExcedida.getStatus());
        // El chain no se ejecutó una 6ta vez
        verify(filterChain, times(5)).doFilter(any(), any());
    }

    @Test
    @DisplayName("Peticiones a otras rutas no son afectadas por el rate limit")
    void testOtrasRutasNoAfectadas() throws ServletException, IOException {
        for (int i = 1; i <= 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/publico/habitaciones");
            request.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertEquals(200, response.getStatus());
        }

        verify(filterChain, times(10)).doFilter(any(), any());
    }
}
