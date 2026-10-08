package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.CobroCaja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CobroCajaRepository extends JpaRepository<CobroCaja, Long> {

    /** Cobros del turno abierto de un recepcionista, el más reciente primero. */
    List<CobroCaja> findByRecepcionistaEmailAndCerradoFalseOrderByCreadoEnDesc(String email);
}
