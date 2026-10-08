package com.wimbledon.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cobro en efectivo registrado por Recepción durante un turno de caja.
 * Un turno es el conjunto de cobros de un recepcionista con cerrado = false;
 * el cierre de caja los marca como cerrados y el siguiente turno parte en cero.
 *
 * Tabla: cobros_caja
 */
@Entity
@Table(name = "cobros_caja", indexes = {
        @Index(name = "idx_cobros_turno", columnList = "recepcionista_email, cerrado")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CobroCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recepcionista_email", nullable = false, length = 150)
    private String recepcionistaEmail;

    @Column(name = "recepcionista_nombre", length = 100)
    private String recepcionistaNombre;

    @Column(name = "habitacion_numero", length = 20)
    private String habitacionNumero;

    @Column(name = "habitacion_nombre", length = 100)
    private String habitacionNombre;

    @Column(length = 20)
    private String dni;

    @Column(name = "huesped_nombre", length = 150)
    private String huespedNombre;

    @Column(length = 30)
    private String duracion;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false)
    @Builder.Default
    private Boolean cerrado = false;

    @Column(name = "cierre_en")
    private LocalDateTime cierreEn;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        if (creadoEn == null) creadoEn = LocalDateTime.now();
    }
}
