package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.Rol;
import com.wimbledon.backend.domain.enums.EstadoCuenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Usuario> findByRolInOrderByNombreAsc(List<Rol> roles);
    List<Usuario> findByEstado(EstadoCuenta estado);
}


