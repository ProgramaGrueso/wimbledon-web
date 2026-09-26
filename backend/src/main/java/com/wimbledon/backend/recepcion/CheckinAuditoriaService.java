package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.domain.IntentoCheckin;
import com.wimbledon.backend.domain.enums.MotivoRechazo;
import com.wimbledon.backend.domain.enums.ResultadoIntento;
import com.wimbledon.backend.repository.IntentoCheckinRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registro de la traza de intentos de check-in.
 *
 * AISLAMIENTO TRANSACCIONAL. \`REQUIRES_NEW\` y no \`REQUIRED\`, y la razon es
 * concreta: los rechazos ocurren, por definicion, sobre operaciones que NO
 * dejan escritura de negocio. Con \`REQUIRED\` la excepcion de la transaccion
 * de negocio revertiria el registro junto con ella y los rechazos no
 * quedarian registrados, que es exactamente la perdida que el requisito de
 * trazabilidad prohibe. Con \`REQUIRES_NEW\` el registro abre su propia
 * transaccion y sobrevive tanto a los rechazos como a los exitos.
 *
 * MODO PERMISIVO. Este metodo NUNCA propaga su propia excepcion: captura el
 * fallo de escritura, lo deja en el log de la aplicacion y retorna. En un
 * mostrador con el huesped presente, denegar el ingreso por una falla de
 * registro es el resultado operativo incorrecto. La contrapartida es que la
 * traza puede tener huecos; el intercambio es explicito y el hueco queda en
 * el log.
 *
 * Sin esta garantia, una falla de auditoria convertiria un rechazo tipado en
 * 500 y se perderia el codigo de la respuesta.
 */
@Service
@RequiredArgsConstructor
public class CheckinAuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(CheckinAuditoriaService.class);

    private final IntentoCheckinRepository intentoCheckinRepository;

    /**
     * Registra un intento y nunca lanza.
     *
     * @param resultado desenlace de la operacion
     * @param motivo     motivo del rechazo; debe ser null en un intento exitoso
     * @param reservaId  reserva afectada, o null si la credencial no resolvio
     * @param operador   identidad del operador, derivada de la Authentication
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(ResultadoIntento resultado, MotivoRechazo motivo, Integer reservaId,
                          OperadorOperacion operador) {
        try {
            IntentoCheckin intento = IntentoCheckin.builder()
                    .resultado(resultado)
                    .motivoRechazo(motivo)
                    .reservaId(reservaId)
                    .operadorEmail(operador.email())
                    .operadorRol(operador.rol())
                    .ipOrigen(operador.ip())
                    .build();

            intentoCheckinRepository.save(intento);
        } catch (RuntimeException ex) {
            // Modo permisivo: el fallo de registro no revierte el check-in.
            log.error("No se pudo registrar el intento de checkin. reservaId={} resultado={} motivo={} operador={}",
                    reservaId, resultado, motivo, operador.email(), ex);
        }
    }
}
