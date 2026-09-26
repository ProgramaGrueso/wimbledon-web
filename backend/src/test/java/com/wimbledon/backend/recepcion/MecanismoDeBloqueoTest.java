package com.wimbledon.backend.recepcion;

import com.wimbledon.backend.repository.ReservaRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * T5 — El mecanismo de bloqueo esta declarado.
 *
 * Es una prueba por reflexion, determinista y sin base de datos. Falla en ROJO
 * si la garantia de R-3 se retira del codigo, que es el unico modo de cubrir la
 * exclusividad sin una base de pruebas: la exclusion del test concurrente no
 * significa que la garantia sea opcional.
 */
@DisplayName("Mecanismo de bloqueo del consumo de credencial")
class MecanismoDeBloqueoTest {

    private static Method metodo(String nombre, Class<?>... parametros) throws NoSuchMethodException {
        return ReservaRepository.class.getMethod(nombre, parametros);
    }

    @Test
    @DisplayName("findByQrTokenConLock declara @Lock(PESSIMISTIC_WRITE)")
    void testElConsumoDeclaraBloqueoPesimista() throws NoSuchMethodException {
        Method consumo = metodo("findByQrTokenConLock", String.class);

        Lock lock = consumo.getAnnotation(Lock.class);

        assertNotNull(lock,
                "El metodo de consumo DEBE declarar @Lock. Sin el, dos peticiones concurrentes con la "
                        + "misma credencial pueden ambas devolver 200 y registrar dos ingresos del mismo huesped.");
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lock.value(),
                "El bloqueo debe ser de escritura (SELECT ... FOR UPDATE), no de solo lectura");
    }

    @Test
    @DisplayName("findByQrTokenConLock resuelve el token con una consulta JPQL parametrizada")
    void testElConsumoUsaConsultaParametrizada() throws NoSuchMethodException {
        Method consumo = metodo("findByQrTokenConLock", String.class);

        Query query = consumo.getAnnotation(Query.class);
        assertNotNull(query, "La resolucion con bloqueo debe ser una consulta JPQL explicita");
        assertTrue(query.value().contains("qrToken"), "La consulta filtra por el token de la credencial");
        assertTrue(query.value().toUpperCase().contains("JOIN FETCH"),
                "La habitacion debe venir en la lectura bloqueante para poder escribir OCUPADA "
                        + "en la misma transaccion");
        assertTrue(consumo.getGenericReturnType().getTypeName().contains("Optional"),
                "Devuelve Optional porque un token inexistente es una condicion de rechazo, no un error");
    }

    @Test
    @DisplayName("findByQrToken se conserva SIN bloqueo para las rutas de solo lectura")
    void testLaRutaDeSoloLecturaNoBloquea() throws NoSuchMethodException {
        Method lectura = metodo("findByQrToken", String.class);

        assertNull(lectura.getAnnotation(Lock.class),
                "findByQrToken se usa en rutas de solo lectura. Un bloqueo ahi serializaria consultas "
                        + "que no necesitan serializarse.");
    }

    @Test
    @DisplayName("El indice unico de reservas.qr_token es precondicion del bloqueo")
    void testElIndiceUnicoEsPrecondicion() throws NoSuchFieldException {
        // Verificacion estatica sobre la declaracion de la columna: sin indice
        // unico, la lectura bloqueante degenera a barrido con bloqueos de
        // siguiente clave sobre la tabla.
        jakarta.persistence.Column columna = com.wimbledon.backend.domain.Reserva.class
                .getDeclaredField("qrToken")
                .getAnnotation(jakarta.persistence.Column.class);

        assertNotNull(columna, "qrToken debe seguir declarado con @Column");
        assertTrue(columna.unique(),
                "qrToken debe conservar unique = true. Sin indice unico, findByQrTokenConLock degenera "
                        + "a barrido y ensancha el bloqueo, con riesgo de interbloqueo contra crearReserva.");
        assertEquals(64, columna.length(),
                "La longitud de la columna es la que fija la cota del DTO de check-in");
    }

    @Test
    @DisplayName("La clase del repositorio sigue siendo un JpaRepository")
    void testElRepositorioEsJpaRepository() {
        assertTrue(org.springframework.data.jpa.repository.JpaRepository.class
                        .isAssignableFrom(ReservaRepository.class),
                "La interfaz conserva su naturaleza de repositorio JPA");
        assertFalse(ReservaRepository.class.isInterface() && Optional.class.isAssignableFrom(ReservaRepository.class),
                "Comprobacion de sanidad del tipo de retorno declarado");
    }
}
