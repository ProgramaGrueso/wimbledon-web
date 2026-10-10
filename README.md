# Hotel Wimbledon — Plataforma Web

Sistema integral de reservas, check-in digital y gestión operativa para el Hotel Wimbledon.

---

## Estructura del Repositorio

Monorepo con frontend y backend desacoplados:

```text
wimbledon-web/
├── frontend/               # Cliente web (Vite 8, JavaScript vanilla, GSAP, Lenis, Three.js)
│   ├── index.html          # Landing, catálogo, galería y reserva
│   ├── admin.html          # Panel de administración / recepción / limpieza
│   ├── src/                # main.js, reserva.js, admin.js, fx.js (efectos 3D), galeria.js,
│   │                       # cursorGato.js, smoothScroll.js, style.css, services/api.js
│   ├── public/             # Datos JSON, imágenes, videos WebM y reglamento en PDF
│   ├── vite.config.js      # Multi-página (index + admin) y proxy de /api → localhost:8081
│   └── vercel.json
│
├── backend/                # API REST (Java 21, Spring Boot 3.5, Spring Security, JWT, JPA)
│   ├── pom.xml
│   └── src/main/java/com/wimbledon/backend/
│       ├── admin/          # KPIs, reportes de ocupación (CSV), habitaciones, personal, turnos, configuración
│       ├── auth/           # Login, registro de clientes y alta de personal
│       ├── cliente/        # Catálogo público, reservas, tarifas, pago, notificaciones, expiración
│       ├── recepcion/      # Agenda, check-in, caja de turno, reserva manual, consulta RENIEC
│       ├── limpieza/       # Estado de habitaciones, incidencias, turno propio
│       ├── reserva/        # Confirmación y validación de QR de check-in
│       ├── security/       # JWT, rate limiting de reservas, IP del cliente
│       ├── config/         # Seguridad, CORS, datos iniciales
│       ├── domain/         # Entidades JPA y enums
│       └── repository/     # Repositorios Spring Data
│
├── docs/diagramas/         # Diagrama entidad-relación y diagrama de clases UML (Mermaid)
├── scripts/demo.sh         # Levanta MySQL, backend, frontend y un túnel público para demos
├── package.json            # Scripts raíz (dev/build) usados por el despliegue en Vercel
└── vercel.json             # Build y rewrites del despliegue del frontend
```

### Roles

`SUPER_ADMIN` > `ADMINISTRADOR` > `RECEPCIONISTA` > `LIMPIEZA` > `CLIENTE`. El personal (recepción,
limpieza, administración) se registra y queda pendiente hasta que un administrador aprueba la cuenta.

| Área | Ruta base | Roles |
| --- | --- | --- |
| Público (catálogo, horarios, datos de pago) | `/api/publico/**` | Sin sesión |
| Autenticación | `/api/auth/**` | Sin sesión (`/me` con token) |
| Reservas del huésped | `/api/reservas`, `/api/cliente/**` | Crear: público; gestionar: `CLIENTE` |
| Recepción y caja | `/api/recepcion/**` | Recepción, Admin, Super Admin |
| Validación de QR | `/api/checkin/validar/{token}` | Recepción, Admin, Super Admin |
| Limpieza | `/api/limpieza/**` | `LIMPIEZA` |
| Administración | `/api/admin/**` | Admin, Super Admin (`/configuracion`: solo Super Admin) |

---

## Instrucciones de Ejecución

### 1. Frontend

Requisitos: Node.js 18+ y npm.

```bash
cd frontend
npm install       # Solo si no se cuenta con node_modules
npm run dev       # Servidor de desarrollo
npm run build     # Bundle de producción en frontend/dist
npm run preview   # Previsualiza la compilación de producción
```

Desde la raíz también funcionan `npm run dev` y `npm run build` (este último copia el resultado a `dist/`,
que es lo que publica Vercel).

- Landing Page: `http://localhost:5173/`
- Panel Administrativo: `http://localhost:5173/admin.html`

### 2. Backend

Requisitos: **Java 21** y Maven 3.8+. Lombok no compila con JDK más nuevos; si tu Java por
defecto es otro, indica el 21 al invocar Maven: `JAVA_HOME=/usr/lib/jvm/java-21-openjdk mvn ...`.

```bash
cd backend
mvn clean compile   # Compila el código fuente
mvn test            # Ejecuta la suite de pruebas
mvn spring-boot:run # Levanta la API en http://127.0.0.1:8081
```

Antes de arrancar, copia `src/main/resources/application-local.properties.example` a
`application-local.properties` (está en `.gitignore`) y completa lo que necesites. Los secretos
se pueden pasar también como variables de entorno:

| Variable | Uso |
| --- | --- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión MySQL |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial del superadmin/admin (solo si la BD está vacía) |
| `SEED_DEMO_DATA`, `DEMO_PASSWORD` | Opcional: genera reservas y cobros de los últimos 90 días y cuentas `@wimbledon.test` |
| `RENIEC_API_TOKEN` | Token del proveedor de consulta de DNI; el backend hace de proxy con caché y, sin token válido, usa un padrón de prueba |
| `SERVER_PORT` | Puerto de la API (8081 por defecto) |

En desarrollo, Vite redirige `/api` al backend en `localhost:8081`. La clave JWT (`wimbledon.jwt.secret`)
y el SMTP (`spring.mail.*`) deben sobrescribirse en `application-local.properties`; no uses en producción
los valores de ejemplo.

Parámetros de negocio en `application.properties`:

| Propiedad | Uso |
| --- | --- |
| `wimbledon.reservas.ventana-confirmacion-minutos` | Minutos que la suite queda retenida esperando el voucher (15) |
| `wimbledon.reservas.intervalo-expiracion-ms` | Frecuencia del scheduler que cancela reservas vencidas (60000) |
| `wimbledon.reservas.max-pendientes` | Reservas pendientes simultáneas por usuario (2) |
| `wimbledon.reservas.max-pendientes-por-ip` | Reservas pendientes simultáneas por IP (1) |
| `wimbledon.reservas.dias-anticipacion-max` | Días hacia adelante que se puede reservar (60) |
| `wimbledon.reservas.horas-cancelacion` | Horas antes del ingreso hasta las que se puede cancelar o reprogramar (2) |
| `wimbledon.checkin.anticipacion-horas` | Horas antes del ingreso desde las que el QR ya es válido (4) |
| `wimbledon.checkin.base-url` | URL base del enlace de check-in incluido en el QR |
| `wimbledon.pago.*` | Yape/Plin, WhatsApp y cuentas bancarias que ve el huésped |
| `wimbledon.notificaciones.proveedor` | `log` registra el mensaje al huésped sin enviarlo; el envío real se implementa en `NotificacionReservaService` |
| `wimbledon.proxy.confiar-x-forwarded-for` | `true` solo detrás de un proxy propio |

### Flujo de reserva

1. El huésped elige suite, duración, fecha (hasta 60 días) y un turno libre; suma packs opcionales.
2. Al confirmar, la reserva nace `PENDIENTE` y la suite queda retenida 15 minutos. Se le muestran
   el código `WMB-XXXXXXXX`, el monto exacto y los datos de pago.
3. El huésped envía el voucher por WhatsApp; recepción lo valida en **Vouchers por validar** del panel.
   Si vence el plazo, el scheduler cancela la reserva y libera el turno.
4. Al validar el voucher la reserva pasa a `CONFIRMADA`; al llegar, el huésped presenta su DNI en
   recepción (obligatorio por ley) y se registra el check-in (`CHECKIN`), que también se puede hacer desde
   la agenda del panel. Al terminar la estadía queda `FINALIZADA`; en cualquier momento puede ser `CANCELADA`.
5. Recepción puede crear reservas manuales y cobrar en la **caja de turno**, con cierre de caja.

### 3. Base de Datos — MySQL (Única Fuente de Verdad)

Toda la persistencia vive en **MySQL** (Aiven o local): reservas, inventario de suites, cuentas, turnos,
incidencias y la caja de turno. No hay estado operativo guardado en el navegador.

El esquema lo genera Hibernate a partir de las entidades JPA de `backend/src/main/java/com/wimbledon/backend/domain`
(`spring.jpa.hibernate.ddl-auto=update`); no hay un script SQL que mantener a mano.
Hibernate agrega columnas nuevas pero no relaja restricciones: en una base existente, el email de la
reserva (ahora opcional) requiere una vez `ALTER TABLE reservas MODIFY email VARCHAR(150) NULL;`.
Los diagramas del modelo están en `docs/diagramas/`.
