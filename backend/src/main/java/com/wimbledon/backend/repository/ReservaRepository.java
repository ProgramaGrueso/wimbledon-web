package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    /** Módulo 6 — resolución del token QR en check-in. */
    Optional<Reserva> findByQrToken(String qrToken);

    /**
     * Módulo 2 — Agenda del día para Recepción.
     * Devuelve todas las reservas de una fecha determinada ordenadas por hora de ingreso.
     * IMPORTANTE: el controlador de Recepción proyecta SOLO los campos operativos
     * (nombreHuesped, habitacion.nombre, horaIngreso, horaSalida, estado).
     */
    @Query("SELECT r FROM Reserva r JOIN FETCH r.habitacion " +
           "WHERE r.fecha = :fecha AND r.estado <> com.wimbledon.backend.domain.enums.EstadoReserva.CANCELADA " +
           "ORDER BY r.horaIngreso ASC")
    List<Reserva> findAgendaDelDia(@Param("fecha") LocalDate fecha);

    /**
     * Módulo 5 — Historial del cliente autenticado (ficha propia).
     * NUNCA exponer a Recepcionistas — solo al propio cliente y al Admin.
     */
    List<Reserva> findByClienteOrderByCreadoEnDesc(Usuario cliente);

    /**
     * Módulo 5 — Reservas por email para clientes sin cuenta registrada.
     */
    List<Reserva> findByEmailOrderByCreadoEnDesc(String email);

    /**
     * Módulo 4 — Reporte de ocupación por rango de fechas.
     */
    @Query("SELECT r FROM Reserva r JOIN FETCH r.habitacion " +
           "WHERE r.fecha BETWEEN :desde AND :hasta " +
           "ORDER BY r.fecha ASC, r.horaIngreso ASC")
    List<Reserva> findByFechaBetween(@Param("desde") LocalDate desde,
                                     @Param("hasta") LocalDate hasta);

    /** Comprueba solapamiento de horario para una habitación y fecha. */
    @Query("SELECT COUNT(r) > 0 FROM Reserva r " +
           "WHERE r.habitacion.id = :habitacionId " +
           "AND r.fecha = :fecha " +
           "AND r.estado NOT IN (com.wimbledon.backend.domain.enums.EstadoReserva.CANCELADA, " +
           "                     com.wimbledon.backend.domain.enums.EstadoReserva.FINALIZADA) " +
           "AND r.horaIngreso < :horaSalida " +
           "AND r.horaSalida > :horaIngreso")
    boolean existeSolapamiento(@Param("habitacionId") Integer habitacionId,
                               @Param("fecha") LocalDate fecha,
                               @Param("horaIngreso") java.time.LocalTime horaIngreso,
                               @Param("horaSalida") java.time.LocalTime horaSalida);

    /** KPIs — total de reservas por origen en un período */
    long countByOrigenAndFechaBetween(
            com.wimbledon.backend.domain.enums.OrigenReserva origen,
            LocalDate desde,
            LocalDate hasta);

    /** KPIs — reservas por estado en un período */
    long countByEstadoAndFechaBetween(EstadoReserva estado, LocalDate desde, LocalDate hasta);

    /**
     * KPIs — Reservas en una franja horaria (para ocupación por turno).
     * Franjas sugeridas: Madrugada 00-06, Día 06-18, Noche 18-24.
     */
    @Query("SELECT COUNT(r) FROM Reserva r " +
           "WHERE r.fecha BETWEEN :desde AND :hasta " +
           "AND r.horaIngreso >= :inicio AND r.horaIngreso < :fin " +
           "AND r.estado <> com.wimbledon.backend.domain.enums.EstadoReserva.CANCELADA")
    long countPorFranja(@Param("desde") LocalDate desde,
                        @Param("hasta") LocalDate hasta,
                        @Param("inicio") java.time.LocalTime inicio,
                        @Param("fin") java.time.LocalTime fin);

    /** KPIs — emails únicos con al menos una reserva no cancelada (para tasa de retención). */
    @Query(value = "SELECT COUNT(DISTINCT email) FROM reservas WHERE estado != 'CANCELADA'",
           nativeQuery = true)
    long countClientesConReserva();

    /**
     * KPIs — emails con MÁS DE UNA reserva no cancelada (clientes repetidos).
     * Usado para calcular tasa de retención.
     */
    @Query(value = "SELECT COUNT(*) FROM (" +
                   "  SELECT email FROM reservas WHERE estado != 'CANCELADA' " +
                   "  GROUP BY email HAVING COUNT(*) > 1" +
                   ") AS repetidos",
           nativeQuery = true)
    long countClientesRepetidos();
}

