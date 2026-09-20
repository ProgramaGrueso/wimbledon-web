package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {
    /** Catálogo público: habitaciones disponibles para reservar. */
    List<Habitacion> findByEstado(EstadoHabitacion estado);

    /** Bloqueo pesimista (SELECT ... FOR UPDATE) para validación y reserva atómica sin solapamiento concurrente. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Habitacion h WHERE h.id = :id")
    Optional<Habitacion> findByIdWithLock(@Param("id") Integer id);
}
