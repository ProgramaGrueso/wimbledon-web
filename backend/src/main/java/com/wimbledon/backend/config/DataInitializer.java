package com.wimbledon.backend.config;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;

/**
 * Inicializador de datos de prueba.
 * Se ejecuta al arrancar la aplicación SOLO si la BD está vacía.
 *
 * Usuarios de prueba creados (contraseña igual para todos: "Wimbledon2024!"):
 * ┌──────────────────────────────────┬─────────────────────────────┬──────────────┐
 * │ Email                            │ Nombre                      │ Rol          │
 * ├──────────────────────────────────┼─────────────────────────────┼──────────────┤
 * │ superadmin@wimbledon.test        │ Juan Francisco Ganoza        │ SUPER_ADMIN  │
 * │ admin@wimbledon.test             │ Sebastian Sotelo             │ ADMINISTRADOR│
 * │ recepcion@wimbledon.test         │ Fabiana La Madrid            │ RECEPCIONISTA│
 * │ limpieza@wimbledon.test          │ Vania Cerron                 │ LIMPIEZA     │
 * │ cliente@wimbledon.test           │ Carlos Prueba                │ CLIENTE      │
 * └──────────────────────────────────┴─────────────────────────────┴──────────────┘
 *
 * Contraseña de prueba: Wimbledon2024!
 */
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    /** Contraseña genérica de prueba para todos los usuarios. */
    private static final String PASSWORD_PRUEBA = "Wimbledon2024!";

    @Bean
    public CommandLineRunner initData(
            UsuarioRepository usuarioRepo,
            HabitacionRepository habitacionRepo,
            PasswordEncoder encoder
    ) {
        return args -> {
            if (usuarioRepo.count() == 0) {
                log.info("════════════════════════════════════════════════");
                log.info("  DataInitializer — Cargando datos de prueba...");
                log.info("  Contraseña de todos los usuarios: {}", PASSWORD_PRUEBA);
                log.info("════════════════════════════════════════════════");

                String hash = encoder.encode(PASSWORD_PRUEBA);

                usuarioRepo.save(Usuario.builder()
                        .nombre("Juan Francisco Ganoza")
                        .email("superadmin@wimbledon.test")
                        .passwordHash(hash)
                        .rol(Rol.SUPER_ADMIN)
                        .build());

                usuarioRepo.save(Usuario.builder()
                        .nombre("Sebastian Sotelo")
                        .email("admin@wimbledon.test")
                        .passwordHash(hash)
                        .rol(Rol.ADMINISTRADOR)
                        .build());

                usuarioRepo.save(Usuario.builder()
                        .nombre("Fabiana La Madrid")
                        .email("recepcion@wimbledon.test")
                        .passwordHash(hash)
                        .rol(Rol.RECEPCIONISTA)
                        .build());

                usuarioRepo.save(Usuario.builder()
                        .nombre("Vania Cerron")
                        .email("limpieza@wimbledon.test")
                        .passwordHash(hash)
                        .rol(Rol.LIMPIEZA)
                        .build());

                usuarioRepo.save(Usuario.builder()
                        .nombre("Carlos Prueba")
                        .email("cliente@wimbledon.test")
                        .passwordHash(hash)
                        .rol(Rol.CLIENTE)
                        .build());

                log.info("  ✓ 5 usuarios de prueba creados");
            } else {
                log.info("DataInitializer — Usuarios ya existentes, omitiendo seed.");
            }

            if (habitacionRepo.count() == 0) {
                habitacionRepo.save(Habitacion.builder()
                        .nombre("Suite Presidencial")
                        .tipo("Presidencial")
                        .descripcion("Jacuzzi hidromasaje, ducha española, pole dance, sillón tántrico, cámara seca.")
                        .tarifaBase(new BigDecimal("250.00"))
                        .duracionBloqueHoras(6)
                        .estado(EstadoHabitacion.DISPONIBLE)
                        .imagenUrl("/img/suite-presidencial.jpg")
                        .build());

                habitacionRepo.save(Habitacion.builder()
                        .nombre("Tropical Dreams")
                        .tipo("Temática")
                        .descripcion("Habitación de lujo diseñada para clientes exclusivos. Jacuzzi, ducha española, pole dance, frigobar.")
                        .tarifaBase(new BigDecimal("180.00"))
                        .duracionBloqueHoras(6)
                        .estado(EstadoHabitacion.DISPONIBLE)
                        .imagenUrl("/img/tropical-dreams.jpg")
                        .build());

                habitacionRepo.save(Habitacion.builder()
                        .nombre("Riverside Dreams Presidencial")
                        .tipo("Presidencial")
                        .descripcion("Jacuzzi, pole dance, sillón tántrico, cama king, frigobar.")
                        .tarifaBase(new BigDecimal("220.00"))
                        .duracionBloqueHoras(6)
                        .estado(EstadoHabitacion.DISPONIBLE)
                        .imagenUrl("/img/riverside-dreams.jpg")
                        .build());

                log.info("  ✓ 3 habitaciones de prueba creadas");
            }
        };
    }
}
