# Mapa de Endpoints y Superficie de Ataque — Hotel Wimbledon

Documento de referencia para el agente **RedTeam**. Correlaciona controladores, métodos HTTP, roles esperados y vectores de riesgo en el backend Spring Boot 3.

---

## 1. Endpoints Públicos (`SecurityConfig.java`)

| Endpoint | Método | Controlador | Propósito | Vector de Ataque Principal |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | `AuthController` | Autenticación con email/password y retorno de JWT. | Ataques de fuerza bruta, enumeración de usuarios, inyección en credenciales. |
| `/api/auth/registro-cliente` | `POST` | `AuthController` | Auto-registro de nuevos clientes/huéspedes. | Creación masiva de cuentas falsas, evasión de validación en email/teléfono. |
| `/api/publico/**` | `GET` | `PublicoController` | Catálogo de suites disponibles, tarifas base e imágenes. | Extracción no autorizada de metadatos internos, DoS por consultas no cacheadas. |
| `/api/reservas` | `POST` | `ClienteController` | Creación de reserva directa (huéspedes e invitados sin cuenta previa). | Overbooking intencional, manipulación de fechas pasadas, inyección de precios arbitrarios en payload. |

---

## 2. Endpoints Autenticados y Protegidos por Rol (`@PreAuthorize`)

### Recepción (`RECEPCIONISTA`, `ADMINISTRADOR`, `SUPER_ADMIN`)
- `GET /api/recepcion/agenda`: Listado de reservas con check-in programado para la fecha.
  - *Vector:* Fuga de datos personales (PII) de otros huéspedes; manipulación del parámetro `fecha`.
- `POST /api/recepcion/checkin`: Validación y confirmación de ingreso del huésped a la habitación.
  - *Vector:* Check-in forzado sin pago verificado; asignación de suite ya ocupada.
- `PATCH /api/recepcion/habitaciones/{id}/estado`: Cambio manual de estado en el Rack.
  - *Vector:* Modificación de IDs ajenos (IDOR), estados inconsistentes en la máquina de estados.

### Limpieza y Mantenimiento (`LIMPIEZA`, `ADMINISTRADOR`, `SUPER_ADMIN`)
- `GET /api/limpieza/habitaciones`: Listado de suites pendientes de aseo o desinfección.
  - *Vector:* Acceso a información de reservas o nombres de clientes vinculados a la suite.
- `PATCH /api/limpieza/habitaciones/{id}/estado`: Transición de estado (`LIMPIEZA` → `LIBRE` o `EN_PROCESO`).
  - *Vector:* Salto arbitrario de estados de higiene sin pasar por recepción.
- `POST /api/limpieza/incidencias`: Registro de averías, daños o bloqueos físicos.
  - *Vector:* XSS almacenado en el campo descripción de la incidencia al mostrarse en paneles gerenciales.

### Gerencia y Configuración (`ADMINISTRADOR`, `SUPER_ADMIN`)
- `GET /api/admin/kpis`: Métricas de ocupación, facturación y revenue.
  - *Vector:* Acceso por usuarios de menor privilegio si se omite `@PreAuthorize`.
- `GET /api/admin/usuarios`: Listado de personal del hotel.
  - *Vector:* Exposición de hash de contraseñas (BCrypt), teléfonos o roles en el DTO de respuesta.
- `POST /api/admin/staff`: Alta de nuevos empleados con roles asignados.
  - *Vector:* Escalamiento de privilegios creando usuarios `SUPER_ADMIN` desde una cuenta `ADMINISTRADOR`.
- `PUT /api/admin/infraestructura`: Configuración técnica de red, base de datos y parámetros del hotel (`SUPER_ADMIN` exclusivo).
  - *Vector:* Bypass de autorización hacia parámetros del sistema.

### Generación y Validación de QR
- `GET /api/reservas/{codigo}/qr`: Entrega de imagen PNG con el código QR de confirmación.
  - *Vector:* IDOR al sustituir el código por el de otra reserva activa para obtener accesos no autorizados.
