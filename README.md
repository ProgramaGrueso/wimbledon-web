# Hotel Wimbledon — Plataforma Web

Sistema integral de reservas, check-in digital y gestión operativa para el Hotel Wimbledon.

---

## Estructura del Repositorio

El proyecto está organizado como un monorepo con frontend y backend desacoplados:

```text
wimbledon-web/
├── frontend/               # Aplicación cliente web (Vite, HTML5, CSS3, JavaScript Vanilla, GSAP, Lenis)
│   ├── index.html          # Landing page principal y catálogo interactivo
│   ├── admin.html          # Panel de administración y dashboard
│   ├── src/                # Lógica del cliente, animaciones y componentes
│   ├── public/             # Datos JSON, imágenes y medios (videos HD/WebM)
│   ├── package.json        # Dependencias y scripts de Vite
│   └── vite.config.js      # Configuración de compilación multi-página (MPA)
│
├── backend/                # API REST (Java 21, Spring Boot 3, Spring Security, JWT, JPA)
│   ├── pom.xml             # Dependencias Maven
│   └── src/                # Controladores, servicios, entidades de dominio y seguridad
│
└── docs/diagramas/         # Diagrama entidad-relación y diagrama de clases UML
```

---

## Instrucciones de Ejecución

### 1. Frontend

Requisitos: Node.js 18+ y npm.

```bash
cd frontend
npm install       # Solo si no se cuenta con node_modules
npm run dev       # Inicia el servidor de desarrollo local
npm run build     # Genera el bundle de producción en frontend/dist
npm run preview   # Previsualiza la compilación de producción
```

- Landing Page: `http://localhost:5173/`
- Panel Administrativo: `http://localhost:5173/admin.html`

### 2. Backend

Requisitos: **Java 21** y Maven 3.8+. Lombok 1.18.38 no compila con JDK más nuevos; si tu Java por
defecto es otro, indica el 21 al invocar Maven: `JAVA_HOME=/usr/lib/jvm/java-21-openjdk mvn ...`.

```bash
cd backend
mvn clean compile   # Compila el código fuente
mvn test            # Ejecuta la suite de pruebas
mvn spring-boot:run # Levanta el servidor backend en http://localhost:8081
```

Antes de arrancar, copia `src/main/resources/application-local.properties.example` a
`application-local.properties` y completa credenciales de BD, JWT y SMTP (el archivo está en `.gitignore`).
En desarrollo, Vite redirige `/api` al backend en `localhost:8081`.

Parámetros de negocio en `application.properties`:

| Propiedad | Uso |
| --- | --- |
| `wimbledon.reservas.ventana-confirmacion-minutos` | Minutos que la suite queda retenida esperando el voucher (15) |
| `wimbledon.reservas.max-pendientes-por-ip` | Reservas pendientes simultáneas por IP (1) |
| `wimbledon.reservas.dias-anticipacion-max` | Días hacia adelante que se puede reservar (60) |
| `wimbledon.pago.*` | Yape/Plin, WhatsApp y cuentas bancarias que ve el huésped |
| `wimbledon.notificaciones.proveedor` | `log` registra el mensaje al huésped sin enviarlo; el envío real se implementa en `NotificacionReservaService` |
| `wimbledon.proxy.confiar-x-forwarded-for` | `true` solo detrás de un proxy propio |

### Flujo de reserva

1. El huésped elige suite, duración, fecha (hasta 60 días) y un turno libre; suma packs opcionales.
2. Al confirmar, la reserva nace `PENDIENTE` y la suite queda retenida 15 minutos. Se le muestran
   el código `WMB-XXXXXXXX`, el monto exacto y los datos de pago.
3. El huésped envía el voucher por WhatsApp; recepción lo valida en **Vouchers por validar** del panel.
   Si vence el plazo, el scheduler cancela la reserva y libera el turno.
4. Al llegar, el huésped presenta su DNI en recepción (obligatorio por ley).

### 3. Base de Datos — MySQL (Única Fuente de Verdad)

La arquitectura de persistencia utiliza exclusivamente **MySQL** (desplegado en Aiven / local) como la única fuente transaccional de verdad para reservas, inventario de suites y cuentas de usuarios. No existen bases de datos paralelas ni persistencias desacopladas.

El esquema lo genera Hibernate a partir de las entidades JPA de `backend/src/main/java/com/wimbledon/backend/domain`
(`spring.jpa.hibernate.ddl-auto=update`); no hay un script SQL que mantener a mano.
Hibernate agrega columnas nuevas pero no relaja restricciones: en una base existente, el email de la
reserva (ahora opcional) requiere una vez `ALTER TABLE reservas MODIFY email VARCHAR(150) NULL;`.
Los diagramas del modelo están en `docs/diagramas/`.
