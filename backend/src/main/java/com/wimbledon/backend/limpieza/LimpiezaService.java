package com.wimbledon.backend.limpieza;

import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Incidencia;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoHabitacion;
import com.wimbledon.backend.domain.enums.EstadoIncidencia;
import com.wimbledon.backend.domain.enums.PrioridadIncidencia;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.IncidenciaRepository;
import com.wimbledon.backend.repository.TurnoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Lógica de negocio del módulo de Limpieza.
 *
 * Este es el rol con MENOS permisos del sistema:
 *  - Ve habitaciones, pero NUNCA datos de huéspedes
 *  - Solo puede mover el estado entre LIMPIEZA_PENDIENTE → EN_PROCESO → LISTA
 *  - Solo puede crear incidencias (no leerlas de otros, no editarlas)
 *  - Solo puede ver su propio turno del día
 */
@Service
@RequiredArgsConstructor
public class LimpiezaService {

    private final HabitacionRepository habitacionRepository;
    private final IncidenciaRepository incidenciaRepository;
    private final TurnoRepository turnoRepository;

    /**
     * Estados que el personal de Limpieza puede asignar.
     * Forman el ciclo completo de limpieza de una habitación.
     */
    private static final Set<EstadoHabitacion> ESTADOS_LIMPIEZA = Set.of(
            EstadoHabitacion.LIMPIEZA_PENDIENTE,
            EstadoHabitacion.EN_PROCESO,
            EstadoHabitacion.LISTA
    );

    /**
     * Transiciones de estado válidas para Limpieza.
     * Previene que el personal salte pasos (ej. PENDIENTE → LISTA directamente)
     * o retroceda sin autorización.
     *
     * Mapa: estado_actual → estado_siguiente permitido
     */
    private static final java.util.Map<EstadoHabitacion, EstadoHabitacion> TRANSICIONES_VALIDAS =
            java.util.Map.of(
                    EstadoHabitacion.LIMPIEZA_PENDIENTE, EstadoHabitacion.EN_PROCESO,
                    EstadoHabitacion.EN_PROCESO,         EstadoHabitacion.LISTA
            );

    // ── Habitaciones ──────────────────────────────────────────────────────────

    /**
     * Lista todas las habitaciones con su estado actual.
     * Sin ningún dato de huéspedes — solo nombre y estado físico.
     */
    public List<HabitacionLimpiezaResponse> listarHabitaciones() {
        return habitacionRepository.findAll()
                .stream()
                .map(h -> new HabitacionLimpiezaResponse(
                        h.getId(), h.getNombre(), h.getTipo(), h.getEstado()))
                .toList();
    }

    /**
     * Actualiza el estado de una habitación dentro del ciclo de limpieza.
     *
     * Validaciones:
     *  1. El estado destino debe ser un estado de limpieza (no OCUPADA, DISPONIBLE, etc.)
     *  2. La transición debe ser válida (no puede saltar ni retroceder)
     *
     * Transiciones permitidas:
     *   LIMPIEZA_PENDIENTE → EN_PROCESO
     *   EN_PROCESO         → LISTA
     */
    @Transactional
    public HabitacionLimpiezaResponse actualizarEstado(
            Integer habitacionId,
            EstadoHabitacion nuevoEstado
    ) {
        // Validar que el estado destino es de limpieza
        if (!ESTADOS_LIMPIEZA.contains(nuevoEstado)) {
            throw new IllegalArgumentException(
                    "Solo puedes asignar estados de limpieza: " +
                    "LIMPIEZA_PENDIENTE, EN_PROCESO o LISTA.");
        }

        Habitacion habitacion = habitacionRepository.findById(habitacionId)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada."));

        EstadoHabitacion estadoActual = habitacion.getEstado();

        // Si el estado actual NO es un estado de limpieza, la habitación no está en tu flujo
        if (!ESTADOS_LIMPIEZA.contains(estadoActual)) {
            throw new IllegalArgumentException(
                    "La habitación '" + habitacion.getNombre() +
                    "' no está en estado de limpieza (estado actual: " + estadoActual.name() + ").");
        }

        // Verificar que la transición es válida (flujo secuencial)
        EstadoHabitacion siguientePermitido = TRANSICIONES_VALIDAS.get(estadoActual);
        if (siguientePermitido == null || !siguientePermitido.equals(nuevoEstado)) {
            throw new IllegalArgumentException(
                    "Transición no permitida: " + estadoActual.name() +
                    " → " + nuevoEstado.name() +
                    ". Siguiente paso esperado: " +
                    (siguientePermitido != null ? siguientePermitido.name() : "ninguno (ya está LISTA)") + ".");
        }

        habitacion.setEstado(nuevoEstado);
        Habitacion guardada = habitacionRepository.save(habitacion);

        return new HabitacionLimpiezaResponse(
                guardada.getId(), guardada.getNombre(), guardada.getTipo(), guardada.getEstado());
    }

    // ── Incidencias ───────────────────────────────────────────────────────────

    /**
     * Crea un reporte de incidencia de mantenimiento.
     *
     * Privacidad: la incidencia se asocia a la habitación física y al
     * empleado que reporta, NUNCA a ningún huésped.
     *
     * @param request  datos del problema
     * @param reportador empleado de Limpieza autenticado
     */
    @Transactional
    public IncidenciaResponse reportarIncidencia(
            CrearIncidenciaRequest request,
            Usuario reportador
    ) {
        Habitacion habitacion = habitacionRepository.findById(request.habitacionId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "No encontramos esa habitación."));

        PrioridadIncidencia prioridad = request.prioridad() != null
                ? request.prioridad()
                : PrioridadIncidencia.MEDIA;

        Incidencia incidencia = Incidencia.builder()
                .habitacion(habitacion)
                .reportadoPor(reportador)
                .descripcion(request.descripcion())
                .prioridad(prioridad)
                .estado(EstadoIncidencia.ABIERTA)
                .build();

        return IncidenciaResponse.from(incidenciaRepository.save(incidencia));
    }

    // ── Turno propio ──────────────────────────────────────────────────────────

    /**
     * Devuelve el turno del día actual del empleado autenticado.
     * Si no tiene turno asignado hoy, retorna Optional.empty().
     */
    public Optional<TurnoResponse> miTurnoHoy(Usuario empleado) {
        return turnoRepository.findByUsuarioAndFecha(empleado, LocalDate.now())
                .map(TurnoResponse::from);
    }
}
