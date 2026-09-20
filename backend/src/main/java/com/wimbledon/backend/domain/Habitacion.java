package com.wimbledon.backend.domain;

import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entidad que representa una habitación del hotel.
 *
 * El estado controla el flujo:
 *  Limpieza → LIMPIEZA_PENDIENTE / EN_PROCESO / LISTA
 *  Recepción → DISPONIBLE / OCUPADA
 *  Admin     → MANTENIMIENTO
 *
 * Tabla: habitaciones
 */
@Entity
@Table(name = "habitaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Habitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 60)
    private String tipo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "tarifa_base", nullable = false, precision = 8, scale = 2)
    private BigDecimal tarifaBase;

    /**
     * Duración del bloque de estadía en horas.
     * Valor por defecto: 6 horas (según el esquema SQL del hotel).
     */
    @Column(name = "duracion_bloque_horas", nullable = false)
    @Builder.Default
    private Integer duracionBloqueHoras = 6;

    /**
     * Cantidad de unidades físicas operativas de este tipo de suite en el hotel.
     * Permite gestionar disponibilidad por inventario sobre las 132 puertas físicas.
     */
    @Column(name = "capacidad_unidades", nullable = false)
    @Builder.Default
    private Integer capacidadUnidades = 1;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private EstadoHabitacion estado = EstadoHabitacion.DISPONIBLE;

    @Column(name = "imagen_url", length = 255)
    private String imagenUrl;

    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn = LocalDateTime.now();
    }
}
