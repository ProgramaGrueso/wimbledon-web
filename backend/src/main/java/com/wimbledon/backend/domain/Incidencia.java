package com.wimbledon.backend.domain;

import com.wimbledon.backend.domain.enums.EstadoIncidencia;
import com.wimbledon.backend.domain.enums.PrioridadIncidencia;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Reporte de incidencia de mantenimiento creado por el personal de Limpieza.
 *
 * Privacidad: NO se asocia a ningún huésped, solo a la habitación física y
 * al empleado que reporta. El personal de Limpieza nunca sabe quién se hospedó.
 *
 * Tabla: incidencias
 */
@Entity
@Table(name = "incidencias")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "habitacion_id", nullable = false)
    private Habitacion habitacion;

    /** Empleado de Limpieza que reporta la incidencia. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reportado_por", nullable = false)
    private Usuario reportadoPor;

    @Column(nullable = false, length = 255)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private PrioridadIncidencia prioridad = PrioridadIncidencia.MEDIA;

    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    @Builder.Default
    private EstadoIncidencia estado = EstadoIncidencia.ABIERTA;

    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn = LocalDateTime.now();
    }
}
