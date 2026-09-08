package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Incidencia;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoIncidencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidenciaRepository extends JpaRepository<Incidencia, Integer> {
    List<Incidencia> findByHabitacion(Habitacion habitacion);
    List<Incidencia> findByReportadoPor(Usuario reportadoPor);
    List<Incidencia> findByEstado(EstadoIncidencia estado);
    List<Incidencia> findAllByOrderByCreadoEnDesc();
}
