package com.wimbledon.backend.reserva;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.exception.ErrorResponse;
import com.wimbledon.backend.repository.ReservaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalTime;

/**
 * Endpoint para resolver el token QR a los datos de la reserva.
 * Usado por el frontend cuando el huésped llega a la URL de check-in
 * ( wimbledon-web.vercel.app/checkin/{token} ) para mostrar la pantalla de bienvenida.
 *
 * SOLO Recepción y Admin pueden resolver tokens — esto impide que cualquiera
 * con el link acceda a los datos de la reserva.
 *
 * Nota: el check-in como acción (cambiar estado a CHECKIN) está en RecepcionController.
 */
@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class QrController {

    private final ReservaRepository reservaRepository;

    /**
     * Resuelve un token QR y devuelve los datos mínimos para mostrar en recepción.
     *
     * GET /api/checkin/validar/{token}
     *
     * PRIVACIDAD: devuelve SOLO nombre del huésped, habitación, horario y estado.
     * NUNCA email, teléfono ni historial de reservas anteriores.
     *
     * @param token UUID del QR escaneado
     */
    @GetMapping("/validar/{token}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')")
    public ResponseEntity<?> resolverToken(@PathVariable String token) {
        Reserva reserva = reservaRepository.findByQrToken(token)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Código QR no reconocido. Verifica el código e inténtalo nuevamente."));

        if (reserva.getQrUsado()) {
            return ResponseEntity.status(409)
                    .body(new ErrorResponse(
                            "Este código ya fue utilizado para un check-in previo.",
                            ErrorResponse.QR_YA_UTILIZADO));
        }

        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            return ResponseEntity.status(409)
                    .body(new ErrorResponse(
                            "Esta reserva fue cancelada.",
                            ErrorResponse.RESERVA_CANCELADA));
        }

        // Solo datos operativos — sin historial ni datos sensibles completos
        return ResponseEntity.ok(new TokenResueltoResponse(
                reserva.getId(),
                reserva.getNombreHuesped(),
                reserva.getHabitacion().getNombre(),
                reserva.getFecha().toString(),
                reserva.getHoraIngreso(),
                reserva.getHoraSalida(),
                reserva.getEstado()
        ));
    }

    /** DTO de respuesta mínima para mostrar en la pantalla de bienvenida. */
    public record TokenResueltoResponse(
            Integer reservaId,
            String nombreHuesped,
            String habitacion,
            String fecha,
            LocalTime horaIngreso,
            LocalTime horaSalida,
            EstadoReserva estado
    ) {}
}
