package com.wimbledon.backend.reserva;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.wimbledon.backend.domain.Reserva;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/**
 * Servicio de confirmación de reserva: genera el QR y envía el correo HTML.
 *
 * Principio de privacidad (del documento 03-QR-Confirmacion-Codigo.md):
 *  El QR codifica SOLO la URL con el token opaco — nunca nombre, teléfono
 *  ni email del huésped en claro. Así, si el código se ve por encima del
 *  hombro o se comparte accidentalmente, no expone datos personales.
 *
 * El correo de fallo NO lanza excepción hacia arriba: la reserva ya fue
 * guardada en BD, un fallo SMTP no debe revertirla. Se loguea el error
 * y el huésped puede solicitar el QR desde su panel de cliente.
 */
@Service
public class ReservaConfirmacionService {

    private static final Logger log = LoggerFactory.getLogger(ReservaConfirmacionService.class);

    private static final DateTimeFormatter HORA_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter FECHA_FMT = DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy",
            new java.util.Locale("es", "PE"));

    /** Tamaño del QR en píxeles (cuadrado). */
    private static final int QR_SIZE = 300;

    /** Color de módulos del QR: dorado oscuro (#B8962E) sobre fondo negro. */
    private static final int QR_COLOR_ON  = 0xFF_B8_96_2E;   // dorado
    private static final int QR_COLOR_OFF = 0xFF_0A_0A_0B;   // negro de la marca

    private final JavaMailSender mailSender;

    @Value("${wimbledon.checkin.base-url}")
    private String checkinBaseUrl;

    @Value("${wimbledon.mail.from:reservas@wimbledon-hotel.test}")
    private String mailFrom;

    public ReservaConfirmacionService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Punto de entrada principal: genera el QR y envía el correo.
     * Fallas de correo se loguean sin propagar excepción.
     */
    public void enviarConfirmacion(Reserva reserva) {
        try {
            byte[] qrPng = generarQrPng(reserva.getQrToken());
            enviarCorreo(reserva, qrPng);
            log.info("Confirmación enviada a {} | reserva id={}", reserva.getEmail(), reserva.getId());
        } catch (WriterException | IOException e) {
            log.error("Error generando QR para reserva id={}: {}", reserva.getId(), e.getMessage());
        } catch (MessagingException e) {
            log.error("Error enviando correo a {} (reserva id={}): {}",
                      reserva.getEmail(), reserva.getId(), e.getMessage());
        } catch (Exception e) {
            log.error("Error inesperado en confirmación de reserva id={}: {}",
                      reserva.getId(), e.getMessage(), e);
        }
    }

    /**
     * Genera el PNG del QR que codifica SOLO la URL de check-in con el token.
     * Nunca incluye nombre, teléfono ni email del huésped.
     */
    public byte[] generarQrPng(String token) throws WriterException, IOException {
        String contenidoQr = checkinBaseUrl + "/" + token;

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(contenidoQr, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE);

        // QR en colores de la marca: módulos dorados sobre fondo negro
        MatrixToImageConfig config = new MatrixToImageConfig(QR_COLOR_ON, QR_COLOR_OFF);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out, config);
        return out.toByteArray();
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    private void enviarCorreo(Reserva reserva, byte[] qrPng) throws MessagingException {
        MimeMessage mensaje = mailSender.createMimeMessage();
        // multipart=true para poder incrustar imagen inline
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

        helper.setFrom(mailFrom);
        helper.setTo(reserva.getEmail());
        helper.setSubject("Hotel Wimbledon — Confirmación de tu reserva");

        String html = construirHtml(
                reserva.getNombreHuesped(),
                reserva.getHabitacion().getNombre(),
                FECHA_FMT.format(reserva.getFecha()),
                HORA_FMT.format(reserva.getHoraIngreso()),
                HORA_FMT.format(reserva.getHoraSalida()),
                reserva.getQrToken()
        );

        helper.setText(html, true);

        // QR embebido como imagen inline (Content-ID = "qrReserva")
        // NO como adjunto: así aparece visible en el cuerpo del correo
        helper.addInline("qrReserva",
                new ByteArrayResource(qrPng),
                "image/png");

        mailSender.send(mensaje);
    }

    /**
     * Plantilla HTML del correo de confirmación.
     * Estilo gótico-editorial de la marca: fondo negro, tipografía serif,
     * acentos dorado (#B8962E) y burdeos (#5C1A2B).
     * Usa estilos inline para máxima compatibilidad entre clientes de correo.
     */
    private String construirHtml(
            String nombre,
            String habitacion,
            String fecha,
            String horaIngreso,
            String horaSalida,
            String token
    ) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Confirmación — Hotel Wimbledon</title>
            </head>
            <body style="margin:0;padding:0;background-color:#0A0A0B;font-family:Georgia,'Times New Roman',serif;">

              <!-- Wrapper -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 0;">
                <tr>
                  <td align="center">

                    <!-- Tarjeta principal -->
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#111113;border:1px solid #2A2A2E;
                                  border-top:3px solid #B8962E;max-width:600px;">

                      <!-- Encabezado -->
                      <tr>
                        <td style="padding:36px 40px 24px;">
                          <p style="margin:0 0 4px;color:#B8962E;font-size:11px;
                                    letter-spacing:4px;text-transform:uppercase;
                                    font-family:'Courier New',monospace;">
                            Confirmación de reserva
                          </p>
                          <h1 style="margin:0;color:#F0EDE8;font-size:28px;
                                     font-weight:400;letter-spacing:1px;">
                            Hotel Wimbledon
                          </h1>
                          <p style="margin:8px 0 0;color:#5C1A2B;font-size:12px;
                                    letter-spacing:3px;text-transform:uppercase;
                                    font-family:'Courier New',monospace;">
                            ✦ Tu discreción es nuestra felicidad ✦
                          </p>
                        </td>
                      </tr>

                      <!-- Separador dorado -->
                      <tr>
                        <td style="padding:0 40px;">
                          <div style="height:1px;background:linear-gradient(90deg,
                               transparent,#B8962E 30%%,#B8962E 70%%,transparent);"></div>
                        </td>
                      </tr>

                      <!-- Saludo -->
                      <tr>
                        <td style="padding:28px 40px 0;">
                          <p style="margin:0;color:#C8C3BA;font-size:15px;line-height:1.7;">
                            Estimado/a <strong style="color:#F0EDE8;">%s</strong>,
                          </p>
                          <p style="margin:10px 0 0;color:#C8C3BA;font-size:15px;line-height:1.7;">
                            Tu reserva ha sido confirmada. A continuación encontrarás los
                            detalles de tu estadía y el código QR para tu
                            <strong style="color:#B8962E;">check-in express</strong>
                            en recepción — sin necesidad de dar tus datos en el mostrador.
                          </p>
                        </td>
                      </tr>

                      <!-- Detalles de la reserva -->
                      <tr>
                        <td style="padding:24px 40px;">
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="border:1px solid #2A2A2E;background:#0D0D0F;">
                            <tr>
                              <td style="padding:20px 24px;border-bottom:1px solid #1E1E22;">
                                <p style="margin:0;color:#888;font-size:10px;
                                          letter-spacing:3px;text-transform:uppercase;
                                          font-family:'Courier New',monospace;">Habitación</p>
                                <p style="margin:6px 0 0;color:#F0EDE8;font-size:17px;">
                                  %s
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 24px;border-bottom:1px solid #1E1E22;">
                                <p style="margin:0;color:#888;font-size:10px;
                                          letter-spacing:3px;text-transform:uppercase;
                                          font-family:'Courier New',monospace;">Fecha</p>
                                <p style="margin:6px 0 0;color:#F0EDE8;font-size:17px;">
                                  %s
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 24px;">
                                <p style="margin:0;color:#888;font-size:10px;
                                          letter-spacing:3px;text-transform:uppercase;
                                          font-family:'Courier New',monospace;">Horario</p>
                                <p style="margin:6px 0 0;color:#F0EDE8;font-size:17px;">
                                  <span style="color:#B8962E;">%s</span>
                                  &nbsp;–&nbsp;
                                  <span style="color:#B8962E;">%s</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- QR -->
                      <tr>
                        <td align="center" style="padding:0 40px 28px;">
                          <p style="margin:0 0 16px;color:#C8C3BA;font-size:14px;
                                    line-height:1.6;">
                            Muestra este código en recepción para tu ingreso express:
                          </p>

                          <!-- Marco dorado alrededor del QR -->
                          <table cellpadding="0" cellspacing="0"
                                 style="border:2px solid #B8962E;background:#0A0A0B;
                                        display:inline-table;">
                            <tr>
                              <td style="padding:16px;">
                                <img src="cid:qrReserva"
                                     alt="Código QR para check-in"
                                     width="220" height="220"
                                     style="display:block;border:0;" />
                              </td>
                            </tr>
                          </table>

                          <p style="margin:16px 0 0;color:#555;font-size:11px;
                                    letter-spacing:1px;font-family:'Courier New',monospace;">
                            %s
                          </p>
                        </td>
                      </tr>

                      <!-- Separador -->
                      <tr>
                        <td style="padding:0 40px;">
                          <div style="height:1px;background:#1E1E22;"></div>
                        </td>
                      </tr>

                      <!-- Aviso de privacidad -->
                      <tr>
                        <td style="padding:24px 40px;">
                          <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
                            Este código es <strong style="color:#888;">personal e intransferible</strong>.
                            Por tu privacidad, el QR no contiene tus datos personales —
                            solo un identificador único válido dentro de nuestro sistema.
                            No lo compartas con terceros.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding:20px 40px 32px;border-top:1px solid #1E1E22;">
                          <p style="margin:0;color:#444;font-size:11px;
                                    letter-spacing:2px;text-transform:uppercase;
                                    text-align:center;font-family:'Courier New',monospace;">
                            Hotel Wimbledon &nbsp;✦&nbsp; Reservas exclusivas
                          </p>
                        </td>
                      </tr>

                    </table>
                    <!-- / Tarjeta principal -->

                  </td>
                </tr>
              </table>

            </body>
            </html>
            """.formatted(nombre, habitacion, fecha, horaIngreso, horaSalida, token);
    }
}

