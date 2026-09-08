package com.wimbledon.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Turno de trabajo asignado a un miembro del personal.
 *
 * Permisos (RBAC):
 *  - Admin/SuperAdmin: CRUD completo
 *  - Limpieza: GET solo de su propio turno del día (/api/limpieza/mi-turno)
 *  - Recepcionista: sin acceso a turnos
 *
 * Tabla: turnos
 */
@Entity
@Table(name = "turnos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;
}
