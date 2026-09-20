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
            PasswordEncoder encoder,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate
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

            // Asegurar que las habitaciones existentes o nuevas tengan su capacidad_unidades actualizada
            try {
                String insertSql = """
                    INSERT INTO habitaciones (id, nombre, tipo, descripcion, tarifa_base, duracion_bloque_horas, capacidad_unidades, estado, imagen_url) VALUES
                    (860, 'Suite Presidencial', 'Presidencial', 'Cama redonda, Sillón Tántrico de Cuarzo, Cámara Seca, Ducha española, Jacuzzi con Hidromasaje, Pole Dance, Baño privado y Frigobar.', 156.00, 6, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg'),
                    (528, 'Tropical Dreams', 'Temática', 'Habitación de lujo diseñada para los clientes exclusivos que desean vivir un momento inolvidable. Cama Queen confort 100%, Pole Dance, Jacuzzi, Ducha Española.', 125.00, 6, 8, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Tropical-Dreams.jpg'),
                    (526, 'Riverside Dreams Presidencial', 'Presidencial', 'Vista a un río artificial, Cama King, Jacuzzi, Pole Dance, Sillón Tántrico, Frigobar.', 156.00, 6, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Riverside-Dreams-Presidencial.jpg'),
                    (523, 'Suite Presidencial con Cámara Seca', 'Presidencial', 'Cama redonda, Sillón Tántrico de Cuarzo, Cámara Seca, Ducha española, Jacuzzi con Hidromasaje, Pole Dance.', 200.00, 7, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Suite-Presidencial-Camara-Seca.jpg'),
                    (227, 'Dark Fantasies', 'Temática', 'Cama King, Cruz de sumisión, Ducha española, Jacuzzi, Pole dance, Sillón Tántrico.', 208.00, 7, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/dark-fantasies.jpg'),
                    (43, 'Habitación Especial', 'Especial', 'Cama redonda, Jacuzzi con hidromasaje, Sillón Tántrico, Pole dance, Frigobar.', 150.00, 6, 10, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/habitacion-especial.jpg'),
                    (35, 'Habitación Delux', 'Delux', 'Cama de Dos Plazas, Baño con Agua Fría y Caliente, Frigobar.', 55.00, 6, 20, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/habitacion-delux.jpg'),
                    (33, 'Hawaian Dreams', 'Temática', 'Cama 2 Plazas confort 100%, Aire acondicionado, Baño agua fría/caliente, Frigobar.', 73.00, 6, 10, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/hawaiam-dreams.jpg'),
                    (31, 'Simple con Jacuzzi', 'Simple', 'Cama 2 Plazas, Ducha Española, Jacuzzi, Baño agua fría/caliente, Frigobar.', 89.00, 6, 14, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/simple-con-jacuzzi-1.jpg'),
                    (29, 'Simple Vista al Mar', 'Simple', 'Vista al mar, Cama 2 Plazas, Baño agua fría/caliente, Frigobar.', 73.00, 6, 12, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/simple-vista-al-mar.jpg'),
                    (27, 'Jacuzzi Deluxe', 'Delux', 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.', 104.00, 6, 10, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/Jacuzzi-Deluxe.jpg'),
                    (24, 'Cámara Seca y Jacuzzi', 'Especial', 'Cama redonda confort 100%, Cámara seca, Pole dance, Jacuzzi, Ducha española.', 200.00, 7, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/camara-seca-.jpg'),
                    (22, 'Riverside Dreams', 'Temática', 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.', 125.00, 6, 8, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/riverside-dreams.jpg'),
                    (20, 'Venetian Flowers', 'Temática', 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.', 100.00, 6, 8, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/venetian-flowers.jpg'),
                    (16, 'Pacific Dreams', 'Temática', 'Vista al mar, Cama Queen, Sillón tántrico, Jacuzzi, Pole Dance.', 125.00, 6, 8, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/pacific-dreams.jpg'),
                    (14, 'Pacific Dreams Presidencial', 'Presidencial', 'Vista al mar, Cama King, Sillón tántrico, Ducha española, Jacuzzi, Pole Dance.', 177.00, 6, 4, 'DISPONIBLE', 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/pacific-dreams-presidencial.jpg'),
                    (1, 'Suite Presidencial (Estándar)', 'Presidencial', 'Jacuzzi hidromasaje, ducha española, pole dance, cámara seca.', 156.00, 6, 1, 'DISPONIBLE', '/img/suite-presidencial.jpg'),
                    (2, 'Tropical Dreams (Estándar)', 'Temática', 'Jacuzzi, ducha española, pole dance, frigobar.', 125.00, 6, 1, 'DISPONIBLE', '/img/tropical-dreams.jpg'),
                    (3, 'Riverside Dreams (Estándar)', 'Presidencial', 'Jacuzzi, pole dance, sillón tántrico, cama king.', 156.00, 6, 1, 'DISPONIBLE', '/img/riverside-dreams.jpg')
                    ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), capacidad_unidades=VALUES(capacidad_unidades);
                    """;
                jdbcTemplate.execute(insertSql);
                log.info("  ✓ Catálogo de suites sincronizado con capacidad de 132 habitaciones físicas.");
            } catch (Exception e) {
                log.warn("  ⚠️ Error al sembrar/actualizar habitaciones con capacidad: {}", e.getMessage());
            }
        };
    }
}
