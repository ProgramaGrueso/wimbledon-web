package com.wimbledon.backend.reserva;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.EstadoReserva;
import com.wimbledon.backend.recepcion.CheckinService;
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

    private final CheckinService checkinService;

    /**
     * Resuelve un token QR y devuelve los datos mínimos para mostrar en recepción.
     *
     * GET /api/checkin/validar/{token}
     *
     * Delega en la MISMA clasificacion que la ruta de consumo, y no construye
     * su propia respuesta de error: antes lo hacía, lo que producía dos
     * divergencias. La primera era la comprobacion FINALIZADA, ausente aqui y
     * presente en el check-in, de modo que la misma condicion logica devolvia
     * 409 en un sitio y 200 OK en el otro. La segunda era que este controlador
     * reportaba un token inexistente como 404, lo que constituted un oraculo de
     * existencia de reservas.
     *
     * Esta ruta NO consume la credencial: resolverla dos veces deja la reserva
     * intacta.
     *
     * PRIVACIDAD: devuelve SOLO nombre del huésped, habitación, horario y estado.
     * NUNCA email, teléfono ni historial de reservas anteriores.
     *
     * @param token UUID del QR escaneado
     */
    @GetMapping("/validar/{token}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRADOR','RECEPCIONISTA')")
    public ResponseEntity<TokenResueltoResponse> resolverToken(@PathVariable String token) {
        Reserva reserva = checkinService.resolver(token);

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
