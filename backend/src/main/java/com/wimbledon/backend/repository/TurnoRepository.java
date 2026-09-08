package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Turno;
import com.wimbledon.backend.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TurnoRepository extends JpaRepository<Turno, Integer> {
    /** Turno del día actual de un empleado específico (para /api/limpieza/mi-turno). */
    Optional<Turno> findByUsuarioAndFecha(Usuario usuario, LocalDate fecha);

    /** Todos los turnos de un empleado. */
    List<Turno> findByUsuarioOrderByFechaDesc(Usuario usuario);

    /** Todos los turnos de una fecha (vista administrativa). */
    List<Turno> findByFechaOrderByHoraInicioAsc(LocalDate fecha);

    /** Todos los turnos ordenados cronológicamente descendente. */
    List<Turno> findAllByOrderByFechaDescHoraInicioAsc();
}

