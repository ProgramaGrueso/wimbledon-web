# Prompts por Módulo — Hotel Wimbledon

Contexto común a pegar antes de cada prompt (ajusta si tu backend ya tiene nombres distintos):

```
Contexto del proyecto: Hotel Wimbledon, sistema de reservas y check-in digital.
Stack: Backend Spring Boot + Spring Security (JWT) + MySQL. Frontend React/Vite
(ya construido, falta solo login/roles). Roles: SUPER_ADMIN, ADMINISTRADOR,
RECEPCIONISTA, LIMPIEZA, CLIENTE. El negocio es de estadías cortas por bloques
de horas, con foco fuerte en discreción y privacidad del huésped.
```

---

## 1. Auth & Roles (rama `feature/01-auth-users`)

```
Implementa autenticación JWT en Spring Boot para Hotel Wimbledon con 5 roles:
SUPER_ADMIN, ADMINISTRADOR, RECEPCIONISTA, LIMPIEZA, CLIENTE.

Necesito:
1. Entidad Usuario (id, nombre, email, passwordHash, rol, activo, creadoEn)
   y enum Rol.
2. Filtro JWT + SecurityConfig con @EnableMethodSecurity, endpoints protegidos
   por rol según esta matriz: [pega la tabla de 01-RBAC-Hotel-Wimbledon.md].
3. Endpoints: POST /api/auth/login (retorna access token + rol), POST
   /api/auth/registro-cliente (solo rol CLIENTE, público), y un endpoint
   /api/auth/me que devuelva el usuario autenticado y su rol para que el
   frontend React decida qué vistas mostrar.
4. Hash de contraseñas con BCrypt.
5. Manejo de errores 401/403 con un cuerpo JSON consistente {mensaje, codigo}
   para que el frontend lo capture con un interceptor de Axios.

No implementes recuperación de contraseña todavía, solo login/registro básico.
```

---

## 2. Recepción / Check-in (rama `feature/recepcion-checkin`)

```
Implementa el módulo de Recepción para Hotel Wimbledon. La recepcionista
necesita:

1. GET /api/recepcion/agenda-hoy — lista las reservas del día con estado
   (PENDIENTE, CONFIRMADA, CHECKIN, FINALIZADA) mostrando SOLO: nombre del
   huésped, habitación, hora de ingreso/salida, estado. NUNCA el historial
   de reservas anteriores del cliente (eso rompe la promesa de discreción).
2. POST /api/recepcion/checkin — recibe el token/UUID leído del QR de la
   reserva, valida que exista, no esté vencida ni ya usada, y cambia su
   estado a CHECKIN. Devuelve los datos mínimos para mostrar en pantalla.
3. POST /api/recepcion/reserva-manual — permite crear una reserva walk-in
   o telefónica (mismo flujo que el cliente online pero sin pasar por el
   portal), y dispara la generación del QR + correo igual que una reserva
   online (reutiliza el servicio de confirmación).
4. PATCH /api/recepcion/habitaciones/{id}/estado — solo para marcar
   OCUPADA tras el check-in o DISPONIBLE tras un check-out manual.

Protege todo con @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')").
Diseña el DTO de respuesta pensando en que la recepcionista trabaja rápido
bajo presión: la información debe caber en una sola card sin scroll.
```

---

## 3. Limpieza / Housekeeping (rama `feature/limpieza`)

```
Implementa el módulo de Limpieza (housekeeping) para Hotel Wimbledon.
Es el rol con menos permisos del sistema — solo necesita:

1. GET /api/limpieza/habitaciones — lista de habitaciones con su estado
   actual (LIMPIEZA_PENDIENTE, EN_PROCESO, LISTA, OCUPADA, MANTENIMIENTO).
   No debe incluir NINGÚN dato de huéspedes ni de reservas, solo el número/
   nombre de habitación y el estado.
2. PATCH /api/limpieza/habitaciones/{id}/estado — el personal de limpieza
   solo puede mover el estado entre LIMPIEZA_PENDIENTE -> EN_PROCESO -> LISTA.
   No puede marcar una habitación como OCUPADA (eso lo hace Recepción).
3. POST /api/limpieza/incidencias — crear un reporte de mantenimiento
   (habitacionId, descripcion, prioridad). No necesita ver quién se hospedó,
   solo reportar el problema físico (ej. "aire acondicionado no enfría").
4. GET /api/limpieza/mi-turno — devuelve el turno asignado al usuario logueado
   ese día (hora inicio/fin, habitaciones asignadas si aplica).

Protege todo con @PreAuthorize("hasRole('LIMPIEZA')"). Este rol es el ejemplo
más estricto de "necesito saber lo mínimo para hacer mi trabajo": cero acceso
a información de clientes.
```

---

## 4. Administración / Dashboard y Reportes (rama `feature/administracion`)

```
Implementa el dashboard administrativo de Hotel Wimbledon para los roles
ADMINISTRADOR y SUPER_ADMIN:

1. GET /api/admin/kpis — ocupación por franja horaria (día/noche/madrugada),
   ticket promedio por reserva, tasa de reservas repetidas (retención),
   % de reservas online vs. manuales — según las métricas que ya definiste
   en el Lean Canvas.
2. GET /api/admin/reportes/ocupacion?desde=&hasta= — reporte exportable
   (JSON, y opcionalmente CSV) de ocupación por habitación en un rango
   de fechas.
3. CRUD completo de catálogo de habitaciones: POST/PUT/DELETE
   /api/admin/habitaciones (nombre, tipo, tarifa, comodidades, fotos,
   duración del bloque en horas).
4. Gestión de personal: POST /api/admin/usuarios (crear staff con rol
   RECEPCIONISTA o LIMPIEZA), GET /api/admin/turnos, POST /api/admin/turnos.

SUPER_ADMIN ve todo lo anterior más configuración de infraestructura
(claves de API de pagos/correo/WhatsApp) que ADMINISTRADOR NO puede tocar.
Usa @PreAuthorize diferenciando ambos roles explícitamente, no los trates
como sinónimos.
```

---

## 5. Cliente / Reservas online (rama `feature/cliente-reservas`)

```
Implementa el flujo de reserva self-service para el rol CLIENTE en Hotel
Wimbledon (portal 24/7, sin contacto):

1. GET /api/publico/habitaciones — catálogo público (sin login) con
   disponibilidad en tiempo real por franja horaria.
2. POST /api/reservas — crea la reserva (habitacionId, fecha, horaIngreso,
   nombreCompleto, telefono, email, notas). Si el usuario no está logueado,
   crea la reserva igual pero la asocia por email; si está logueado, la
   asocia a su cuenta. Al confirmar, dispara el servicio de generación de
   QR + envío de correo (ver módulo 6).
3. GET /api/cliente/mis-reservas — historial de reservas del cliente
   autenticado (ficha propia, ver matriz RBAC).
4. PATCH /api/cliente/reservas/{id}/reprogramar y
   DELETE /api/cliente/reservas/{id} — con regla de negocio: solo permitido
   hasta X horas antes de la hora de ingreso (parametrizable).

Cuida el copy y los mensajes de error: el tono del hotel es "tu discreción
es nuestra felicidad", así que evita cualquier mensaje que suene burocrático
o que exponga datos innecesarios en las respuestas de error.
```

---

## 6. QR + Confirmación por correo (rama `feature/qr-confirmacion`)

```
Implementa el servicio de confirmación de reserva para Hotel Wimbledon:
al crear una reserva (online o manual), el sistema debe:

1. Generar un token único no adivinable (UUID v4 + hash de verificación,
   NO datos personales en claro) que identifique la reserva.
2. Generar un código QR (librería ZXing) que codifique SOLO ese token
   (ej. una URL corta tipo https://wimbledon-web.vercel.app/checkin/{token}
   o el token plano), nunca el nombre, teléfono o email del huésped
   directamente en el QR — así, si alguien ve el código por encima del
   hombro o el huésped lo comparte sin querer, no expone sus datos.
3. Enviar un correo HTML de confirmación (Spring Mail) con: nombre de la
   habitación, fecha/hora, el QR embebido como imagen inline (Content-ID,
   no como adjunto separado), e instrucciones de check-in express.
4. Endpoint interno usado por Recepción para resolver el token del QR
   a los datos de la reserva (ver módulo 2).

Dame el código de: (a) ReservaConfirmacionService con el método que genera
el token, el QR en PNG y arma el correo; (b) la plantilla HTML del correo
(simple, en el mismo estilo gótico-editorial de la marca: fondo oscuro,
acentos dorados/burdeos); (c) la configuración de application.properties
para SMTP de prueba (ej. Mailtrap o Gmail con contraseña de aplicación).
```
