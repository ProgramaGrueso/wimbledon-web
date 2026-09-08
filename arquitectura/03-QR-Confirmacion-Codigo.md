# QR + Correo de Confirmación — Código de referencia

Idea clave de privacidad: **el QR no codifica datos personales del huésped,
solo un token único (`qr_token`)**. Recepción escanea el token y el backend
resuelve los datos de la reserva del lado del servidor. Así, si el correo o
el QR se comparten o se ven por encima del hombro, no se expone nombre,
teléfono ni email — solo un identificador inútil sin acceso al sistema.

## 1. Dependencias (`pom.xml`)

```xml
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.3</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.3</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

## 2. `application.properties` (SMTP de prueba — Gmail con contraseña de app, o Mailtrap)

```properties
# Opción A: Gmail con contraseña de aplicación (no la contraseña normal)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=tu-correo-de-pruebas@gmail.com
spring.mail.password=tu-contraseña-de-aplicacion
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Opción B (recomendada para pruebas académicas, no envía correos reales):
# https://mailtrap.io -> Sandbox Inbox, copia host/puerto/usuario/clave que te da
# spring.mail.host=sandbox.smtp.mailtrap.io
# spring.mail.port=2525
# spring.mail.username=tu-usuario-mailtrap
# spring.mail.password=tu-clave-mailtrap

wimbledon.checkin.base-url=https://wimbledon-web.vercel.app/checkin
```

## 3. `ReservaConfirmacionService.java`

```java
package com.wimbledon.backend.reserva;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class ReservaConfirmacionService {

    private final JavaMailSender mailSender;

    @Value("${wimbledon.checkin.base-url}")
    private String checkinBaseUrl;

    public ReservaConfirmacionService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** Genera un token no adivinable para identificar la reserva en el QR. */
    public String generarTokenReserva() {
        return UUID.randomUUID().toString();
    }

    /** Genera el QR (PNG en bytes) que codifica SOLO la URL de check-in con el token. */
    public byte[] generarQrPng(String token) throws WriterException, java.io.IOException {
        String contenido = checkinBaseUrl + "/" + token;

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(contenido, BarcodeFormat.QR_CODE, 300, 300);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
        return out.toByteArray();
    }

    /** Envía el correo de confirmación con el QR embebido como imagen inline. */
    public void enviarCorreoConfirmacion(Reserva reserva) throws MessagingException, WriterException, java.io.IOException {
        byte[] qrPng = generarQrPng(reserva.getQrToken());

        MimeMessage mensaje = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

        helper.setTo(reserva.getEmail());
        helper.setSubject("Hotel Wimbledon — Confirmación de tu reserva");
        helper.setFrom("reservas@wimbledon-hotel.test");

        DateTimeFormatter horaFmt = DateTimeFormatter.ofPattern("HH:mm");
        String html = construirHtmlCorreo(
                reserva.getNombreHuesped(),
                reserva.getHabitacion().getNombre(),
                reserva.getFecha().toString(),
                reserva.getHoraIngreso().format(horaFmt),
                reserva.getHoraSalida().format(horaFmt)
        );

        helper.setText(html, true);
        // "qrReserva" es el Content-ID referenciado en el <img> del HTML
        helper.addInline("qrReserva", () -> new java.io.ByteArrayInputStream(qrPng), "image/png");

        mailSender.send(mensaje);
    }

    private String construirHtmlCorreo(String nombre, String habitacion, String fecha, String horaIngreso, String horaSalida) {
        return """
            <div style="background:#0A0A0B;color:#EDEDED;padding:32px;font-family:'Space Mono',monospace;">
              <h1 style="font-family:'Bodoni Moda',serif;color:#F5F5F5;font-size:24px;margin-bottom:4px;">
                Hotel Wimbledon
              </h1>
              <p style="color:#5C1A2B;letter-spacing:2px;font-size:11px;text-transform:uppercase;">
                Confirmación de reserva
              </p>
              <p>Hola %s, tu reserva está confirmada:</p>
              <ul style="line-height:1.6;">
                <li><strong>Habitación:</strong> %s</li>
                <li><strong>Fecha:</strong> %s</li>
                <li><strong>Horario:</strong> %s – %s</li>
              </ul>
              <p>Muestra este código QR en recepción para tu check-in express,
                 sin necesidad de dar tus datos en el mostrador:</p>
              <img src="cid:qrReserva" alt="QR de check-in" style="width:220px;height:220px;margin:16px 0;" />
              <p style="font-size:12px;color:#888;">
                Este código es personal e intransferible. No lo compartas con terceros.
              </p>
            </div>
            """.formatted(nombre, habitacion, fecha, horaIngreso, horaSalida);
    }
}
```

## 4. Endpoint para que Recepción valide el token del QR

```java
@RestController
@RequestMapping("/api/recepcion")
public class RecepcionController {

    private final ReservaRepository reservaRepository;

    public RecepcionController(ReservaRepository reservaRepository) {
        this.reservaRepository = reservaRepository;
    }

    @PostMapping("/checkin")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
    public ResponseEntity<?> checkin(@RequestBody CheckinRequest request) {
        Reserva reserva = reservaRepository.findByQrToken(request.token())
                .orElseThrow(() -> new ReservaNoEncontradaException());

        if (reserva.isQrUsado()) {
            return ResponseEntity.status(409).body(new ErrorResponse("QR ya utilizado", "QR_USADO"));
        }
        if (reserva.getEstado() == EstadoReserva.CANCELADA) {
            return ResponseEntity.status(409).body(new ErrorResponse("Reserva cancelada", "RESERVA_CANCELADA"));
        }

        reserva.setEstado(EstadoReserva.CHECKIN);
        reserva.setQrUsado(true);
        reservaRepository.save(reserva);

        // Solo se devuelve lo necesario para la pantalla de recepción
        return ResponseEntity.ok(new CheckinResponse(
                reserva.getNombreHuesped(),
                reserva.getHabitacion().getNombre(),
                reserva.getHoraIngreso(),
                reserva.getHoraSalida()
        ));
    }
}
```

### Por qué el token va en el QR y no los datos del huésped

Si en algún momento tu equipo decide "para hacerlo más simple, pongamos el
nombre y teléfono directo en el QR" — resístete a esa tentación. Un QR con
datos en claro es legible por cualquier lector genérico (no solo por tu app),
así que cualquiera que lo escanee (o vea la captura de pantalla) obtiene esos
datos. Con un token opaco, el QR solo es útil dentro de tu propio sistema.
