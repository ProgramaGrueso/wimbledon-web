package com.wimbledon.backend.domain;

import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.domain.enums.ResultadoIntento;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro forense de un intento de check-in, exitoso o rechazado.
 *
 * Tabla: intentos_checkin. Append-only: no se actualiza ni se borra.
 *
 * PRIVACIDAD Y SEGURIDAD. No existe columna \`qr_token\`, ni completa ni
 * truncada. La credencial es un secreto portador y una segunda copia
 * convierte un registro forense en un vector de robo de credenciales; la
 * correlacion usa \`reserva_id\`, que no es secreto. Tampoco hay columnas de
 * datos personales del huesped (\`email\`, \`telefono\`, \`notas\`), conforme a la
 * politica de privacidad declarada en {@link Reserva}. \`operador_email\` es
 * identidad de PERSONAL, que el requisito de trazabilidad si exige.
 *
 * MODELO. \`reservaId\` es un \`Integer\` simple y NO un \`@ManyToOne\`: evita
 * cargar \`Reserva\` y \`Habitacion\` para escribir la fila, evita una clave
 * foranea que \`ddl-auto=update\` no podria garantizar y permite que el registro
 * sobreviva al ciclo de vida de la reserva, que es la razon de ser de un
 * registro forense. \`operadorRol\` es un \`String\` y NO un \`@Enumerated(Rol)\`:
 * desacopla la tabla del enum \`Rol\`, de modo que la invariante del conjunto de
 * roles queda protegida estructuralmente y no por convencion.
 *
 * SIN RESTRICCIONES DE UNICIDAD. Un registro de auditoria es un flujo de
 * eventos: dos intentos concurrentes son DOS filas distintas, no una
 * violacion. Una restriccion de unicidad seria un defecto de conteo.
 *
 * Esquema: lo crea \`ddl-auto=update\` de forma implicita en el primer arranque.
 * El diff no muestra una linea de DDL; eso no significa que no haya cambio de
 * esquema.
 */
@Entity
@Table(name = "intentos_checkin", indexes = {
        @Index(name = "idx_intentos_checkin_reserva", columnList = "reserva_id"),
        @Index(name = "idx_intentos_checkin_marcado", columnList = "marcado_en")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntentoCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Identificador de la reserva, sin relacion JPA y sin clave foranea.
     * Nulo cuando la credencial no resolvio a ninguna fila.
     */
    @Column(name = "reserva_id")
    private Integer reservaId;

    /** Identidad del operador autenticado. Es dato de personal, no del huesped. */
    @Column(name = "operador_email", nullable = false, length = 150)
    private String operadorEmail;

    /**
     * Rol efectivo del operador, derivado de la columna \`rol\` de la base de
     * datos a traves de \`Authentication.getAuthorities()\`. Se guarda como
     * \`String\` y no como enum, para que un cambio futuro en \`Rol\` no rompa
     * la lectura de registros historicos.
     */
    @Column(name = "operador_rol", nullable = false, length = 20)
    private String operadorRol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultadoIntento resultado;

    /** Motivo del rechazo, taxonomia interna. Nulo en un intento exitoso. */
    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_rechazo", length = 40)
    private MotivoRechazo motivoRechazo;

    /** Marca de tiempo del registro, con el reloj de la aplicacion. */
    @Column(name = "marcado_en", nullable = false)
    private LocalDateTime marcadoEn;

    /** Direccion IP de origen. 45 = longitud maxima de una direccion IPv6. */
    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @PrePersist
    protected void onCreate() {
        this.marcadoEn = LocalDateTime.now();
    }
}
