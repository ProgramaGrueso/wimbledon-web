package com.wimbledon.backend.config;

import com.wimbledon.backend.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuración central de Spring Security.
 *
 * Política: stateless (JWT, sin sesiones HTTP).
 * @EnableMethodSecurity activa @PreAuthorize en controllers y servicios.
 *
 * Endpoints públicos (sin token):
 *  - POST /api/auth/login
 *  - POST /api/auth/registro-cliente
 *  - GET  /api/publico/**   (catálogo de habitaciones para el portal)
 *
 * Todo lo demás requiere JWT válido y el rol correcto via @PreAuthorize.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // activa @PreAuthorize, @PostAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final com.wimbledon.backend.security.ReservaRateLimitingFilter rateLimitingFilter;
    private final AuthenticationProvider authenticationProvider;

    @Value("${wimbledon.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── CSRF desactivado: API REST stateless no necesita cookie CSRF ──
            .csrf(AbstractHttpConfigurer::disable)

            // ── CORS configurado para Vercel + localhost del frontend ──────────
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ── Reglas de autorización por ruta ────────────────────────────────
            .authorizeHttpRequests(auth -> auth
                // Endpoints de autenticación — completamente públicos
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/registro-cliente").permitAll()

                // Catálogo público de habitaciones (sin login)
                .requestMatchers(HttpMethod.GET, "/api/publico/**").permitAll()

                // Crear reserva online — público (huésped invitado o con cuenta)
                .requestMatchers(HttpMethod.POST, "/api/reservas").permitAll()

                // Cancelar reserva PENDIENTE por el propio invitado — público (protegido por qrToken en body)
                .requestMatchers(HttpMethod.POST, "/api/reservas/{id}/cancelar-pendiente").permitAll()

                // Ruta interna de errores de Spring
                .requestMatchers("/error").permitAll()

                // Todo lo demás requiere autenticación (el rol específico lo verifica @PreAuthorize)
                .anyRequest().authenticated()
            )

            // ── Manejo estandarizado de excepciones de seguridad (401 y 403 en JSON) ──
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"mensaje\":\"Se requiere autenticación para acceder a este recurso.\",\"codigo\":\"NO_AUTENTICADO\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"mensaje\":\"No tienes permisos para realizar esta acción.\",\"codigo\":\"ACCESO_DENEGADO\"}");
                })
            )

            // ── Stateless: sin sesiones, sin cookies de sesión ─────────────────
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Proveedor de autenticación (DaoAuthenticationProvider + BCrypt) ─
            .authenticationProvider(authenticationProvider)

            // ── Filtro de rate limiting por IP antes del filtro de auth ─────────
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)

            // ── Filtro JWT antes del filtro de username/password estándar ───────
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes permitidos desde application.properties (localhost dev + Vercel prod)
        List<String> origins = Arrays.asList(allowedOriginsRaw.split(","));
        config.setAllowedOrigins(origins);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);    // preflight cacheado 1 hora

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
