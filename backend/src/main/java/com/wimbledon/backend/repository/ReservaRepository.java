package com.wimbledon.backend.repository;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    /** Módulo 6 — resolución del token QR en check-in. Solo lectura, SIN bloqueo. */
    Optional<Reserva> findByQrToken(String qrToken);

    /**
     * Resolución del token QR con bloqueo pesimista (SELECT ... FOR UPDATE),
     * para el consumo de un solo uso de la credencial.
     *
     * El bloqueo serializa a los escritores de la fila hasta el commit. Bajo
     * InnoDB una lectura de bloqueo relee siempre la última versión
     * confirmada, no la instantánea de REPEATABLE READ, de modo que la
     * perdedora de la carrera observa `qr_usado = true` recién confirmado en
     * lugar de su propia lectura. La escritura posterior ocurre en la misma
     * transacción que aún tiene el bloqueo, sobre entidad gestionada: la
     * condición evaluada y la condición escrita son el mismo hecho.
     *
     * `JOIN FETCH r.habitacion` deja la habitación en el contexto de
     * persistencia para poder escribir `OCUPADA` en la misma transacción, y
     * eso solo se consigue con lectura bloqueante.
     *
     * REQUISITO DE ESQUEMA: `reservas.qr_token` debe conservar su índice
     * único. Sin él esta lectura degenera a barrido con bloqueos de
     * siguiente clave sobre la tabla.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reserva r JOIN FETCH r.habitacion WHERE r.qrToken = :qrToken")
    Optional<Reserva> findByQrTokenConLock(@Param("qrToken") String qrToken);

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

    /**
     * Cuenta el número de reservas activas (no CANCELADA ni FINALIZADA) que se solapan
     * con el bloque horario solicitado para una habitación (tipo de suite),
     * incluidos los bloques que cruzan la medianoche.
     * Si reservaIdExcluir no es null, se omite dicha reserva del conteo
     * (crucial para reprogramaciones, evitando que la reserva se auto-bloquee con su horario anterior).
     */
    default long contarReservasSolapadas(Integer habitacionId,
                                         LocalDate fecha,
                                         java.time.LocalTime horaIngreso,
                                         java.time.LocalTime horaSalida,
                                         Integer reservaIdExcluir) {
        // Se compara en fecha+hora absolutas: un bloque 22:00 -> 04:00 termina al día
        // siguiente. Los bloques duran como máximo 12 h, así que basta mirar la
        // víspera, el día y el día siguiente.
        java.time.LocalDateTime inicio = fecha.atTime(horaIngreso);
        java.time.LocalDateTime fin = finDeBloque(fecha, horaIngreso, horaSalida);
        return findActivasEntreFechas(habitacionId, fecha.minusDays(1), fecha.plusDays(1), reservaIdExcluir)
                .stream()
                .filter(r -> r.getFecha().atTime(r.getHoraIngreso()).isBefore(fin)
                        && finDeBloque(r.getFecha(), r.getHoraIngreso(), r.getHoraSalida()).isAfter(inicio))
                .count();
    }

    /** Fin absoluto de un bloque: si la salida no es posterior al ingreso, cae al día siguiente. */
    static java.time.LocalDateTime finDeBloque(LocalDate fecha, java.time.LocalTime ingreso, java.time.LocalTime salida) {
        return (salida.isAfter(ingreso) ? fecha : fecha.plusDays(1)).atTime(salida);
    }

    /** Reservas que ocupan inventario (no canceladas ni finalizadas) de una suite en un rango de fechas. */
    @Query("SELECT r FROM Reserva r " +
           "WHERE r.habitacion.id = :habitacionId " +
           "AND r.fecha BETWEEN :desde AND :hasta " +
           "AND r.estado NOT IN (com.wimbledon.backend.domain.enums.EstadoReserva.CANCELADA, " +
           "                     com.wimbledon.backend.domain.enums.EstadoReserva.FINALIZADA) " +
           "AND (:reservaIdExcluir IS NULL OR r.id <> :reservaIdExcluir)")
    List<Reserva> findActivasEntreFechas(@Param("habitacionId") Integer habitacionId,
                                         @Param("desde") LocalDate desde,
                                         @Param("hasta") LocalDate hasta,
                                         @Param("reservaIdExcluir") Integer reservaIdExcluir);

    /** Busca reservas en estado PENDIENTE cuyo límite de confirmación expiraEn haya caducado. */
    @Query("SELECT r FROM Reserva r WHERE r.estado = :estado AND r.expiraEn IS NOT NULL AND r.expiraEn <= :ahora")
    List<Reserva> findExpiradas(@Param("estado") EstadoReserva estado,
                                @Param("ahora") java.time.LocalDateTime ahora);

    /** Control anti-abuso: conteo de reservas por email en un estado determinado. */
    long countByEmailAndEstado(String email, EstadoReserva estado);

    /** Control anti-abuso: conteo de reservas por teléfono en un estado determinado. */
    long countByTelefonoAndEstado(String telefono, EstadoReserva estado);

    /** Reservas en un estado, las de vencimiento más próximo primero (vouchers por validar). */
    List<Reserva> findByEstadoOrderByExpiraEnAsc(EstadoReserva estado);

    /** Control anti-abuso: reservas por IP de origen en un estado determinado. */
    long countByIpOrigenAndEstado(String ipOrigen, EstadoReserva estado);

    /** Idempotencia del portal: la reserva ya creada con esta clave, si existe. */
    java.util.Optional<Reserva> findByIdempotencyKey(String idempotencyKey);

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

