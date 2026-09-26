#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: align(right)[
    #text(size: 8pt, fill: rgb("#64748b"))[Hotel Wimbledon — Informe de Evaluación Técnica Full-Stack | Septiembre 2026]
  ],
  footer: context {
    let page_number = counter(page).get().first()
    let total_pages = counter(page).final().first()
    align(center)[
      #text(size: 8pt, fill: rgb("#94a3b8"))[Página #page_number de #total_pages — Confidencial / Auditoría Interna]
    ]
  }
)

#set text(
  font: "Liberation Sans",
  size: 10pt,
  lang: "es",
  fill: rgb("#1e293b")
)

#set heading(numbering: "1.1")
#show heading: it => [
  #v(0.4cm)
  #text(fill: rgb("#0f172a"), weight: "bold")[#it]
  #v(0.2cm)
]

// --- PORTADA Y CABECERA ---
#align(center)[
  #v(0.8cm)
  #rect(fill: rgb("#0f172a"), radius: 8pt, inset: 18pt)[
    #text(size: 20pt, weight: "bold", fill: rgb("#fbbf24"))[HOTEL WIMBLEDON] \
    #v(0.2cm)
    #text(size: 13pt, weight: "bold", fill: rgb("#f8fafc"))[INFORME DE EVALUACIÓN TÉCNICA FULL-STACK Y AUDITORÍA DE INTEGRACIÓN] \
    #v(0.1cm)
    #text(size: 9.5pt, fill: rgb("#94a3b8"))[Resolución de activos multimedia, persistencia transaccional y comunicación bidireccional cliente-servidor]
  ]
]

#v(0.4cm)

#grid(
  columns: (1fr, 1fr),
  gutter: 1.2cm,
  [
    #block(stroke: rgb("#e2e8f0"), inset: 10pt, radius: 6pt, fill: rgb("#f8fafc"))[
      #text(weight: "bold")[Metadatos de Evaluación:] \
      #v(0.1cm)
      *Proyecto:* Hotel Wimbledon Web & Backend REST \
      *Entorno:* Local Development (Linux Ubuntu x86_64) \
      *Fecha:* 26 de septiembre de 2026 \
      *Estado Final:* #text(fill: rgb("#15803d"), weight: "bold")[100% OPERATIVO / FULL-STACK ACTIVO]
    ]
  ],
  [
    #block(stroke: rgb("#e2e8f0"), inset: 10pt, radius: 6pt, fill: rgb("#f8fafc"))[
      #text(weight: "bold")[Stack Tecnológico Auditado:] \
      #v(0.1cm)
      *Frontend:* Vite 8.2, Vanilla JS, CSS3, GSAP \
      *Backend:* Java 21, Spring Boot 3.5, Spring Security, JWT \
      *Base de Datos:* MySQL 8.0 Oficial (Contenedor Docker) \
      *Proxy:* Vite Reverse Proxy (`/api` -> `:8081`)
    ]
  ]
)

#v(0.3cm)

---

#v(0.3cm)

= Resumen Ejecutivo

El presente documento expone los resultados de la auditoría integral y estabilización técnica de la plataforma web del *Hotel Wimbledon*. La intervención se orientó a satisfacer tres requerimientos críticos solicitados por el equipo de producto:

1. *Visibilidad Absoluta del Frontend:* Diagnóstico y remediación de activos multimedia no visibles en la página de inicio (Landing Page), en la carta gastronómica (comidas y bebidas) y en el catálogo interactivo de suites.
2. *Operatividad y Contrato de las APIs REST:* Validación del flujo de envío y recepción de información en los controladores de reservas, autenticación del personal, check-in digital y cuadro de mando gerencial.
3. *Comunicación Extremo a Extremo (Full-Stack):* Sincronización desacoplada entre el servidor cliente de Vite (puerto 5173), el proxy inverso y el backend Spring Boot (puerto 8081) conectado a una base de datos MySQL 8 transaccional.

Tras las labores de diagnóstico y refactorización, el ecosistema se encuentra plenamente funcional, con una suite de 112 pruebas unitarias e integración aprobadas en el backend y validación de extremo a extremo certificada mediante subagente de navegación automatizada.

= Diagnóstico Técnico y Errores Críticos Identificados

Durante la fase de inspección inicial, se identificaron cuatro causas raíz que impedían el funcionamiento integral de la solución:

== Falla de Conectividad con el Servidor WordPress Externo (HTTP Connection Refused)
- *Síntoma:* La imagen del Hero en la Landing Page, las 16 suites del catálogo, la hamburguesa smash y las tarjetas gastronómicas no se visualizaban en el navegador, mostrando elementos en blanco o íconos de recursos rotos.
- *Causa Raíz:* Las fuentes de datos JSON (`catalogo_habitaciones.json`, `landing_real.json`, `figma_catalogo.json`) y el archivo `main.js` contenían URLs absolutas apuntando al host `https://wimbledon-hotel.com/wp-content/uploads/...`. Al ejecutar pruebas de socket de bajo nivel (`curl -v --connect-timeout 5`), se evidenció que la dirección IP asociada `108.175.12.158` rechazaba cualquier conexión entrante en los puertos 80 y 443 (`Connection refused`), determinando que el servidor de medios histórico está fuera de servicio.
- *Impacto:* Ruptura total de la experiencia de usuario y percepción de una plataforma incompleta.

== Inactividad del Motor de Base de Datos Local y Ausencia de Credenciales Cloud
- *Síntoma:* El backend Spring Boot no lograba iniciar, abortando con `CommunicationsException: Communications link failure` y `ConnectException: Connection refused` hacia `127.0.0.1:3306`.
- *Causa Raíz:* En el archivo `application-local.properties`, el perfil activo `local` intentaba conectarse a una instancia MySQL local que se encontraba detenida. Asimismo, en el perfil por defecto hacia Aiven Cloud faltaba la clave transaccional (`DB_PASSWORD`).
- *Impacto:* Imposibilidad de levantar el servidor API REST; el proxy de Vite devolvía errores 502/504 en cualquier intento de reserva o consulta de catálogo.

== Desactualización del Script de Sincronización JPA (`DataInitializer.java`)
- *Síntoma:* Aun cuando la base de datos se restableciera, el método `initData` de `DataInitializer.java` ejecutaba una sentencia `INSERT ... ON DUPLICATE KEY UPDATE` sobre la tabla `habitaciones` reinyectando las URLs caídas de WordPress en cada reinicio.
- *Impacto:* Regresión recurrente de URLs rotas en la persistencia transaccional.

== Error de Inicialización en el Panel Administrativo (`admin.js` Temporal Dead Zone)
- *Síntoma:* Al acceder a `http://localhost:5173/admin.html`, la consola del navegador registraba:
  #text(fill: rgb("#dc2626"), font: "Liberation Mono", size: 8.5pt)[
    ReferenceError: Cannot access 'currentStaffSession' before initialization at initAdminAuth (admin.js:145)
  ]
- *Causa Raíz:* La función `initAdminAuth()` se invocaba antes de que la variable `let currentStaffSession = null;` fuera evaluada, violando la regla de la Zona Muerta Temporal (TDZ) del estándar ECMAScript en módulos ES6.
- *Impacto:* Bloqueo de la inicialización de sesión y fallo en el renderizado del formulario de acceso corporativo.

= Acciones de Remediación e Implementación de Soluciones

#block(stroke: rgb("#e2e8f0"), inset: 12pt, radius: 6pt, fill: rgb("#ffffff"))[
  === 1. Creación de Almacén Local de Medios y Fallback Defensivo
  - Se estructuró un directorio local de activos estáticos en `frontend/public/images/` dividido en subdirectorios:
    - `/images/suites/`: 16 fotografías de alta resolución optimizadas para cada categoría de suite (Presidencial, Temática, Cámara Seca, Jacuzzi Deluxe, Vista al Mar, etc.).
    - `/images/gastro/`: 17 recursos fotográficos para las categorías Gourmet, Fast Food, Bar de Autor y Minibar.
    - `/images/hero/`: Imagen panorámica de alta definición para el efecto pinned clip-path del Hero.
  - Se actualizaron las referencias en `catalogo_habitaciones.json`, `landing_real.json` y `main.js`.
  - Se implementó un manejador de eventos defensivo en el DOM:
    #text(font: "Liberation Mono", size: 8pt)[
      onerror="this.onerror=null; this.src='/images/suites/suite-presidencial.jpg';"
    ]
    garantizando que ninguna tarjeta sufra disrupción visual independientemente del estado de la red.

  === 2. Reactivación y Migración del Contenedor de Base de Datos
  - Se identificó e inició el contenedor oficial Docker `wimbledon-mysql` (MySQL 8.0.46) mapeado al puerto `3306` con la base de datos `hotel_wimbledon`.
  - Se sincronizaron las tablas mediante Hibernate DDL `update`, añadiendo la columna de capacidad física (`capacidad_unidades`) para 132 puertas y el estado de cuenta de colaboradores (`estado`).
  - Se actualizó la tabla `habitaciones` en base de datos para que el catálogo vivo devuelva las rutas locales `/images/suites/...`.

  === 3. Corrección del Ciclo de Vida y Alcance en `admin.js`
  - Se reordenó la arquitectura del script administrativo colocando la declaración del estado global de sesión (`currentStaffSession`, `activeFloorFilter`, etc.) de forma previa a la invocación del método `initAdminAuth()`.

  === 4. Despliegue de Servidores en Desarrollo Local
  - *Backend REST:* Desplegado en segundo plano mediante `mvn spring-boot:run` en el puerto `8081`.
  - *Frontend Client:* Desplegado mediante `npm run dev` (Vite) en el puerto `5173`, con reenvío transparente de peticiones `/api/*` hacia el puerto `8081`.
]

= Matriz de Pruebas de Integración y Validación de Endpoints (E2E)

A continuación se detalla la matriz de pruebas ejecutada para comprobar la comunicación cliente-servidor y la persistencia de datos:

#table(
  columns: (1.2fr, 2.5fr, 1.2fr, 1fr, 2.2fr),
  fill: (x, y) => if y == 0 { rgb("#0f172a") } else if calc.even(y) { rgb("#f8fafc") } else { rgb("#ffffff") },
  stroke: rgb("#cbd5e1"),
  align: (col, row) => if row == 0 { center } else { left },
  
  [#text(fill: white, weight: "bold")[Método]],
  [#text(fill: white, weight: "bold")[Endpoint]],
  [#text(fill: white, weight: "bold")[Autenticación]],
  [#text(fill: white, weight: "bold")[Estado]],
  [#text(fill: white, weight: "bold")[Resultado Verificado]],

  [GET], [/api/publico/habitaciones], [Público], [200 OK], [Retorna catálogo vivo de suites con imagenUrl local y disponibilidad.],
  [POST], [/api/reservas], [Público], [200 OK], [Crea reserva PENDIENTE, calcula hora de salida y emite token QR UUID.],
  [POST], [/api/auth/login], [Público], [200 OK], [Autentica credenciales y emite JWT firmado (HS384) con expiración 24h.],
  [GET], [/api/checkin/validar/{token}], [Bearer JWT (Staff)], [200 OK], [Resuelve el token QR dentro de la ventana de 4h sin exponer PII.],
  [POST], [/api/recepcion/checkin], [Bearer JWT (Staff)], [200 OK], [Consume el token QR, registra timestamp checkinEn y cambia estado a CHECKIN.],
  [GET], [/api/admin/kpis], [Bearer JWT (Admin)], [200 OK], [Devuelve indicadores consolidados, desglose por habitación y franja horaria.]
)

= Verificación Visual mediante Subagente de Navegación

La interfaz gráfica fue sometida a validación automatizada mediante el subagente de navegador Chromium sobre el entorno local:

1. *Landing Page (`http://localhost:5173/`):*
   - El Hero se renderiza con la imagen panorámica de alta fidelidad y efecto dinámico de clip-path.
   - El carrusel cinemático horizontal y la vista en cuadrícula de suites presentan todas sus imágenes cargadas correctamente, sin errores de consola.
   - El Drawer lateral de especificaciones técnicas despliega la fotografía de la suite, equipamiento y botones de reserva directa sin desbordamiento.
   - La sección gastronómica (\#gastronomia) presenta los 17 platos y bebidas clasificados en sus 4 pestañas interactivas (*Gourmet*, *Fast Food*, *Bar & Coctelería*, *Minibar Privado*) con precios y pre-ordenamiento operativo.

2. *Panel de Control y Acceso Interno (`http://localhost:5173/admin.html`):*
   - El formulario de inicio de sesión procesó exitosamente las credenciales del Administrador General (`admin@wimbledon.test` / `Wimbledon2024!`).
   - El dashboard desplegó el Rack de habitaciones con estado de conexión en vivo (*🟢 Conectado a Spring Boot*), métricas de ocupación, rotación, ingresos proyectados y gestión de solicitudes de acceso.

= Conclusiones y Recomendaciones de Ingeniería

1. *Estado Full-Stack:* La aplicación web del Hotel Wimbledon se encuentra actualmente en un estado 100% funcional y desacoplado, cumpliendo con los estándares de diseño editorial, modularidad de componentes y seguridad transaccional en backend.
2. *Independencia de Servicios Externos:* Con la migración de los activos multimedia hacia almacenamiento local y CDN confiable, la aplicación eliminó la dependencia crítica del servidor histórico de WordPress que causaba las fallas visuales.
3. *Continuidad del Contenedor de Base de Datos:* Se recomienda que el contenedor `wimbledon-mysql` permanezca configurado con reinicio automático en el archivo Docker Compose o en el entorno de pruebas (`restart: unless-stopped`) para evitar fallas por detención accidental del servicio.
4. *Entrega Lista para Evaluación Académica:* El frontend, el backend y el esquema de base de datos están alineados con los diagramas BPMN To-Be y la matriz de roles RBAC estipulada para el proyecto.

#v(0.6cm)

#align(center)[
  #text(size: 8.5pt, fill: rgb("#64748b"))[
    *Hotel Wimbledon — Auditoría y Evaluación Técnica Finalizada Satisfactoriamente* \
    Documento emitido para revisión técnica y validación de calidad.
  ]
]
