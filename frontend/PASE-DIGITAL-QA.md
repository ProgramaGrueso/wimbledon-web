# Verificación manual del pase digital (P-6)

Procedimiento de verificación de extremo a extremo del pase que emite el portal
público y acepta el panel de recepción.

`frontend/` no tiene runner de pruebas: no hay script `test` ni framework
instalado, de modo que **ningún** criterio de esta capacidad se apoya en un
comando de prueba. Este documento es el instrumento de verificación y **no se
inventa ningún comando que no exista**.

Ejecútalo contra el entorno de desarrollo local, nunca contra producción, y sin
operaciones destructivas. El entorno debe quedar restaurable.

---

## Requisitos previos

- JDK y Maven disponibles, y `backend/` con dependencias resueltas.
- MySQL accesible con el esquema que usa `application-local.properties`.
- Node y npm disponibles en `frontend/`.
- Una sesión de recepción con un usuario cuyo rol provenga del enum real
  `Rol`: `SUPER_ADMIN`, `ADMINISTRADOR` o `RECEPCIONISTA`.

---

## Paso 1 — Backend local en marcha

```bash
cd backend
mvn -o spring-boot:run
```

El backend escucha en `8081` por defecto (`server.port` en
`application.properties`). Espera a ver el arranque completo antes de seguir.

Confirma que `intentos_checkin` se creó sola. `ddl-auto=update` la crea de forma
implícita en el primer arranque, sin DDL en el repositorio:

```bash
mysql -u root -p hotel_wimbledon -e "DESCRIBE intentos_checkin;"
```

Debe existir, y `qr_token` **no** debe aparecer entre sus columnas.

## Paso 2 — Portal en modo desarrollo

```bash
cd frontend
npm run dev
```

El servidor de desarrollo proxya `/api` a `localhost:8081`.

## Paso 3 — Sesión de recepción autenticada

En `admin.html` (el panel interno), inicia sesión con un usuario cuyo rol venga
del enum `Rol`. Los roles `LIMPIEZA` y `CLIENTE` reciben `403` a propósito: no
sirven para este procedimiento.

## Paso 4 — Checkout completo desde el catálogo público

En la pestaña pública del portal:

1. Elige una fecha y una hora de ingreso.
2. Elige una modalidad de duración (3, 6 o 12 horas).
3. Selecciona una suite del catálogo.
4. Completa nombre, teléfono y correo, acepta los términos y confirma.

Observa qué hace el portal antes de emitir el pase: consulta
`GET /api/publico/habitaciones`, resuelve el identificador de habitación contra
ese catálogo y llama a `POST /api/reservas`. Si la suite elegida no resuelve,
el checkout se cancela con un mensaje y te pide volver a elegir, y **no** se
emite pase.

## Paso 5 — Anota el valor codificado del pase

El pase que se renderiza es el resultado de `201` en `POST /api/reservas`. El QR
codifica **solo** el `qrToken` que devolvió el backend: 36 caracteres, con
formato UUID, sin prefijo de versión, sin firma y sin carga legible.

**Anota el valor exacto** del `qrToken`. Lo necesitas en el paso 6. Puedes
obtenerlo desde la respuesta de la red en las herramientas del navegador, en la
pestaña donde la reserva se creó.

## Paso 6 — Introduce el valor del pase en el panel de recepción

En el panel, en el formulario de escaneo, introduce **el valor completo** tal
como lo entrega el pase. El panel ya no recorta por separador: envía el valor
íntegro al backend.

## Paso 7 — Registra la evidencia

Anota, en la respuesta que devuelve `POST /api/recepcion/checkin`:

- **estado HTTP**,
- **`codigo`** del cuerpo,
- **cuerpo completo** de la respuesta.

Además, consulta la traza del intento:

```bash
mysql -u root -p hotel_wimbledon -e "SELECT * FROM intentos_checkin ORDER BY id DESC LIMIT 5;"
```

Ahí debe aparecer el intento con `resultado`, `operador_email`, `operador_rol`,
`ip_origen`, `marcado_en` y `reserva_id`, y **sin** columna de credencial.

---

## Resultado esperado

Este es el criterio que cierra la brecha de extremo a extremo que motivó el
cambio: **un pase emitido por el portal público es aceptado por
`POST /api/recepcion/checkin`**, con estado `200 OK` y un `CheckinResponse` que
incluye `reservaId` y `checkinEn`.

## Casos que conviene comprobar en la misma ejecución

| Caso | Resultado esperado |
|---|---|
| Repetir el mismo pase una segunda vez | `409` con `codigo=QR_NO_UTILIZABLE` |
| Un token inexistente | `409` con `codigo=QR_NO_UTILIZABLE` — **nunca** `404` |
| Una reserva `CANCELADA` | `409` con `codigo=RESERVA_CANCELADA` |
| Una reserva `FINALIZADA` | `409` con `codigo=RESERVA_FINALIZADA`, también en `GET /api/checkin/validar/{token}` |
| Un pase emitido **antes** del despliegue | No resoluble, consecuencia directa de no haber grandfathering |

---

## Lo que esta verificación NO cubre, con claridad

- **No hay ninguna red de seguridad automática para el portal.** El siguiente
  cambio puede romper el checkout sin que ninguna señal lo detecte. Este
  procedimiento es una mitigación, no una solución. La solución es `vitest`
  más una prueba de contrato contra `/api`, y queda fuera de este cambio.
- **No se comprueba la exclusividad bajo concurrencia real.** Eso es un
  complemento manual aparte: dos peticiones simultáneas con el mismo `qrToken`
  contra el backend local con MySQL, de las que exactamente una debe recibir
  `200`.
- **No se cubre la cadena de filtros de seguridad completa.** Las pruebas
  automatizadas verifican el conjunto de roles y la autoridad efectiva, no la
  integración del filtro.
- **No se cubre el timing.** La perdedora de una carrera bloquea en el `SELECT`
  y un token inexistente falla el índice de inmediato. Esa diferencia de latencia
  es deliberada y está sin cerrar: cerrarla exigiría serializar todos los
  check-ins, lo que convierte el endpoint en vector de denegación de servicio.
- **No cubre la cancelación de una reserva `CONFIRMADA` por el huésped.** El
  backend solo expone la vía para reservas `PENDIENTE`; para una `CONFIRMADA`
  hay que contactar a recepción. Deuda declarada, no resuelta.
