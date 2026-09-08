package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {
    /** Catálogo público: habitaciones disponibles para reservar. */
    List<Habitacion> findByEstado(EstadoHabitacion estado);
}
