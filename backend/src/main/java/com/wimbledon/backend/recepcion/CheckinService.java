package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.domain.enums.ResultadoIntento;
import com.wimbledon.backend.exception.CredencialNoUtilizableException;
import com.wimbledon.backend.exception.ExcepcionCheckin;
import com.wimbledon.backend.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Fachada compartida por las DOS rutas de la credencial:
 * \`POST /api/recepcion/checkin\` (consume) y \`GET /api/checkin/validar/{token}\` (resuelve).
 *
 * \`CheckinService\` NO lleva \`@Transactional\` propio, y esa es la decision
 * central: la unidad transaccional es {@link OperacionConsumoCheckin}, que
 * mantiene el bloqueo de fila de la reserva. Si esta clase abriera su propia
 * transaccion, la de negocio quedaria anidada y la frontera de bloqueo seria
 * invisible.
 *
 * La paridad del contrato de error NO es una promesa de revision: es
 * estructural. Ninguna de las dos rutas construye su propia respuesta. Las dos
 * lanzan las mismas excepciones tipadas y las traduce un unico
 * \`GlobalExceptionHandler\`, de modo que la misma condicion logica produce el
 * mismo estado HTTP y el mismo codigo en las dos. Antes, \`QrController\`
 * construia su propio \`ResponseEntity\` y omitia la comprobacion
 * \`FINALIZADA\`, de modo que la misma condicion devolvia 409 en el check-in y
 * 200 OK en la validacion.
 *
 * La unica asimetria entre las dos rutas es intencional: \`resolver\` no escribe,
 * de modo que la resolucion no puede consumir la credencial.
 */
@Service
@RequiredArgsConstructor
public class CheckinService {

    private final OperacionConsumoCheckin operacionConsumo;
    private final CheckinAuditoriaService checkinAuditoriaService;
    private final CalculadoraVentanaCheckin calculadoraVentana;
    private final ReservaRepository reservaRepository;

    /**
     * Ruta de CONSUMO. Valida y registra el ingreso, consumiendo la credencial
     * de forma atomica.
     *
     * NO lleva \`@Transactional\` a proposito: la transaccion es la de
     * {@link OperacionConsumoCheckin}. La traza del intento se escribe en el
     * \`finally\`, con su propia transaccion \`REQUIRES_NEW\`, porque los rechazos
     * ocurren sobre operaciones que no dejan escritura de negocio y con
     * \`REQUIRED\` el registro se perderia junto con ellas.
     *
     * @throws ExcepcionCheckin si la credencial no es utilizable; la respuesta la
     *                          arma el advice, no esta clase
     */
    public CheckinResponse consumir(String token, OperadorOperacion operador) {
        try {
            OperacionConsumoCheckin.ResultadoCheckin resultado = operacionConsumo.consumir(token);
            Reserva reserva = resultado.reserva();

            checkinAuditoriaService.registrar(ResultadoIntento.EXITOSO, null, reserva.getId(), operador);

            return new CheckinResponse(
                    reserva.getNombreHuesped(),
                    resultado.habitacion().getNombre(),
                    reserva.getHoraIngreso(),
                    reserva.getHoraSalida(),
                    reserva.getId(),
                    calculadoraVentana.ahora(),
                    "Bienvenido/a. Check-in completado exitosamente."
            );
        } catch (ExcepcionCheckin ex) {
            checkinAuditoriaService.registrar(ResultadoIntento.FALLIDO, ex.motivo(), ex.reservaId(), operador);
            throw ex;
        } catch (RuntimeException ex) {
            checkinAuditoriaService.registrar(ResultadoIntento.FALLIDO, MotivoRechazo.ERROR, null, operador);
            throw ex;
        }
    }

    /**
     * Ruta de RESOLUCION. Clasifica la credencial SIN consumirla.
     *
     * Usa \`findByQrToken\`, la variante SIN bloqueo, porque resolver no escribe
     * y bloquear una lectura que no escribe solo serializaría consultas. Delega
     * la clasificacion en el mismo codigo que la ruta de consumo, con lo que la
     * paridad deja de depender de que ambas rutas se mantengan sincronizadas a
     * mano.
     *
     * Devuelve la reserva ya clasificada como vigente. La proyeccion a la
     * respuesta la hace el controlador, que es donde vive el DTO publico; esta
     * capa no depende de el.
     *
     * @throws ExcepcionCheckin con la misma excepcion y el mismo codigo que la
     *                          ruta de consumo para la misma condicion
     */
    @Transactional(readOnly = true)
    public Reserva resolver(String token) {
        Reserva reserva = reservaRepository.findByQrToken(token)
                .orElseThrow(() -> new CredencialNoUtilizableException(
                        MotivoRechazo.DESCONOCIDA, null));

        Clasificador.exigirEstadoNoTerminal(reserva);
        Clasificador.exigirCredencialVigente(reserva, calculadoraVentana);

        return reserva;
    }
}
