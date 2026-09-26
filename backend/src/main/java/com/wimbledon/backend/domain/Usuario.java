package com.wimbledon.backend.domain;

import com.wimbledon.backend.domain.enums.EstadoCuenta;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.domain.enums.RolSolicitable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Entidad que representa tanto al personal del hotel como a los clientes.
 * Implementa UserDetails para integración directa con Spring Security.
 *
 * Tabla: usuarios
 */
@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /**
     * Rol del usuario. Se almacena como STRING en la BD.
     * La tabla 'roles' del SQL queda reemplazada por este enum
     * para simplificar el mapping JPA (sin FK adicional).
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol_solicitado", length = 30)
    private RolSolicitable rolSolicitado;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 30)
    @Builder.Default
    private EstadoCuenta estado = EstadoCuenta.ACTIVO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(name = "creado_en", updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn = LocalDateTime.now();
    }

    // ── UserDetails ──────────────────────────────────────────────────────────

    /** Spring Security usa el email como username (identificador único). */
    @Override
    public String getUsername() {
        return this.email;
    }

    /** La contraseña almacenada es el hash BCrypt. */
    @Override
    public String getPassword() {
        return this.passwordHash;
    }

    /**
     * El prefijo ROLE_ es requerido por Spring Security cuando se usa
     * hasRole() en lugar de hasAuthority().
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + this.rol.name()));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() {
        return this.estado == EstadoCuenta.ACTIVO && Boolean.TRUE.equals(this.activo);
    }
}
