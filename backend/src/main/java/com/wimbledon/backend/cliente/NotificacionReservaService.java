package com.wimbledon.backend.cliente;

import com.wimbledon.backend.domain.Reserva;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

/**
 * Notifica al huésped por WhatsApp/SMS al número que dejó en el portal.
 *
 * Proveedor configurable en wimbledon.notificaciones.proveedor. Hoy solo existe
 * "log": arma el mensaje completo y lo registra (con el teléfono enmascarado)
 * sin enviarlo. Conectar Twilio o WhatsApp Business API es implementar
 * {@link #enviar} para ese proveedor; el contenido del mensaje ya está resuelto.
 *
 * Un fallo de envío nunca tumba la reserva: se registra y se sigue.
 */
@Service
@RequiredArgsConstructor
public class NotificacionReservaService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionReservaService.class);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final DatosPago datosPago;

    @Value("${wimbledon.notificaciones.proveedor:log}")
    private String proveedor;

    /** Reserva recién creada: datos de pago y recordatorio del plazo de retención. */
    public void notificarReservaTemporal(Reserva r, int minutosRetencion) {
        StringBuilder msg = new StringBuilder()
                .append("Hotel Wimbledon — Reserva temporal ").append(r.getCodigoReserva()).append('\n')
                .append(r.getHabitacion().getNombre()).append(" • ")
                .append(r.getFecha().format(FECHA)).append(' ').append(r.getHoraIngreso().format(HORA)).append('\n')
                .append("Monto a transferir: S/ ").append(r.getMontoTotal()).append('\n')
                .append("Yape/Plin: ").append(datosPago.yapePlin()).append(" (").append(datosPago.titular()).append(")\n");
        String cuentas = datosPago.cuentas().stream()
                .map(c -> c.banco() + " " + c.numero() + (c.cci().isBlank() ? "" : " / CCI " + c.cci()))
                .collect(Collectors.joining("\n"));
        if (!cuentas.isBlank()) msg.append(cuentas).append('\n');
        msg.append("Tu suite queda retenida ").append(minutosRetencion)
           .append(" minutos. Envía tu comprobante por WhatsApp al +").append(datosPago.whatsapp())
           .append(" indicando el código ").append(r.getCodigoReserva()).append('.');
        enviar(r.getTelefono(), msg.toString(), r);
    }

    /** Recepción validó el voucher: la reserva queda firme. */
    public void notificarPagoConfirmado(Reserva r) {
        String msg = "Hotel Wimbledon — Pago recibido. Reserva " + r.getCodigoReserva() + " confirmada: "
                + r.getHabitacion().getNombre() + ", " + r.getFecha().format(FECHA) + " "
                + r.getHoraIngreso().format(HORA) + ". Presenta tu DNI en recepción al llegar.";
        enviar(r.getTelefono(), msg, r);
    }

    private void enviar(String telefono, String mensaje, Reserva r) {
        if (telefono == null || telefono.isBlank()) {
            log.warn("Reserva {} sin teléfono: no se envía notificación.", r.getCodigoReserva());
            return;
        }
        try {
            switch (proveedor) {
                case "log" -> log.info("[notificación → {}] {}", enmascarar(telefono), mensaje.replace("\n", " | "));
                default -> log.warn("Proveedor de notificaciones '{}' no implementado; reserva {} sin notificar.",
                        proveedor, r.getCodigoReserva());
            }
        } catch (Exception e) {
            log.error("No se pudo notificar la reserva {}: {}", r.getCodigoReserva(), e.getMessage());
        }
    }

    private static String enmascarar(String telefono) {
        String t = telefono.trim();
        return t.length() <= 3 ? "***" : "*".repeat(t.length() - 3) + t.substring(t.length() - 3);
    }
}
