package com.wimbledon.backend.domain;

import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.domain.enums.OrigenReserva;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Entidad central del sistema: representa una reserva de habitación.
 *
 * Puntos de privacidad clave (del documento RBAC):
 *  - nombre_huesped, telefono, email son datos del huésped y SOLO deben
 *    exponerse al propio cliente y al Administrador (auditoría).
 *  - Recepcionista ve solo: nombreHuesped, habitacion.nombre, horaIngreso/Salida, estado.
 *  - El QR codifica SOLO qrToken (no datos personales en claro).
 *
 * Tabla: reservas
 */
@Entity
@Table(name = "reservas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Habitación reservada. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "habitacion_id", nullable = false)
    private Habitacion habitacion;

    /**
     * Usuario registrado asociado a la reserva.
     * Puede ser NULL si la reserva fue hecha sin cuenta (asociada solo por email).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Usuario cliente;

    /** Nombre del huésped tal como se mostrará en recepción. */
    @Column(name = "nombre_huesped", nullable = false, length = 150)
    private String nombreHuesped;

    @Column(length = 30)
    private String telefono;

    /** Email al que se enviará la confirmación y el QR. */
    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_ingreso", nullable = false)
    private LocalTime horaIngreso;

    @Column(name = "hora_salida", nullable = false)
    private LocalTime horaSalida;

    @Column(length = 255)
    private String notas;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private OrigenReserva origen = OrigenReserva.ONLINE;

    /**
     * Token UUID que se codifica en el QR.
     * NUNCA contiene datos personales — solo un identificador opaco.
     * Recepción lo resuelve en el backend para obtener los datos de la reserva.
     */
    @Column(name = "qr_token", nullable = false, unique = true, length = 64)
    private String qrToken;

    /**
     * Marca si el QR ya fue utilizado para hacer check-in.
     * Previene reutilización del mismo código.
     */
    @Column(name = "qr_usado", nullable = false)
    @Builder.Default
    private Boolean qrUsado = false;

    /**
     * Fecha y hora límite en que la reserva en estado PENDIENTE expira y se cancela automáticamente.
     */
    @Column(name = "expira_en")
    private LocalDateTime expiraEn;

    @Column(name = "monto_total", precision = 8, scale = 2)
    private java.math.BigDecimal montoTotal;

    @Column(precision = 8, scale = 2)
    @Builder.Default
    private java.math.BigDecimal adelanto = java.math.BigDecimal.ZERO;

    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn = LocalDateTime.now();
    }
}
