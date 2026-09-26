package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.IntentoCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Acceso a la traza de intentos de check-in.
 *
 * SIN ENDPOINT DE LECTURA en ninguna capa HTTP, por decision de alcance: anadir
 * uno crearia una superficie de exposicion de datos del personal y de los
 * huespedes. Los registros son accesibles solo por acceso directo a la base de
 * datos, en el marco del modelo de datos del proyecto.
 *
 * La ausencia de metodos de lectura es deliberada, no un olvido. Las consultas
 * que existen son las minimas para verificar el registro desde pruebas.
 */
public interface IntentoCheckinRepository extends JpaRepository<IntentoCheckin, Integer> {

    /** Traza cronologica de una reserva, la unica consulta que la trazabilidad necesita. */
    List<IntentoCheckin> findByReservaIdOrderByMarcadoEnAsc(Integer reservaId);

    /** Revision cronologica global del registro. */
    List<IntentoCheckin> findByMarcadoEnGreaterThanEqualOrderByMarcadoEnAsc(LocalDateTime desde);
}
