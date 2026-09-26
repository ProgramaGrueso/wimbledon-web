package com.wimbledon.backend.config;

import com.wimbledon.backend.recepcion.ConfiguracionCheckin;
import com.wimbledon.backend.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Beans de infraestructura de Spring Security.
 * Separado de SecurityConfig para mantener la cadena de filtros limpia.
 */
@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(ConfiguracionCheckin.class)
public class ApplicationConfig {

    private final UserDetailsServiceImpl userDetailsService;

    /** Encoder BCrypt con strength 10 (estándar seguro). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Reloj de la aplicacion fijado a la zona horaria del hotel.
     *
     * ACOPLAMIENTO: application.properties declara
     * {@code serverTimezone=America/Lima} en la URL JDBC. La ventana de
     * vigencia del pase se evalua con {@code LocalDateTime}, que no lleva zona,
     * de modo que un reloj en UTC desalinearia toda la validacion: un ingreso
     * real de las 19:30 en Lima se evaluaria como las 00:30 del dia siguiente
     * y ninguna reserva seria valida.
     *
     * Precondicion: la JVM opera en la zona del hotel, o este Clock se ajusta.
     */
    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("America/Lima"));
    }

    /**
     * Provider que usa nuestro UserDetailsService + BCrypt para autenticar.
     * Registra este provider en el AuthenticationManager automáticamente.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * AuthenticationManager que AuthService usa para hacer el login
     * (llama a authenticate() con el email+password en crudo).
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
