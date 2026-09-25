#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: context {
    if here().page() > 1 {
      text(8.5pt, fill: rgb("#64748B"), font: "Liberation Sans")[
        *Hotel Wimbledon* — Plan Maestro de Orquestación Multi-Agente
        #h(1fr)
        Gentle-AI · OpenCode · Hermes · Engram
      ]
    }
  },
  footer: context {
    if here().page() > 1 {
      text(8.5pt, fill: rgb("#94A3B8"), font: "Liberation Sans")[
        Confidencial — Uso Interno de Ingeniería
        #h(1fr)
        Página #here().page()
      ]
    }
  }
)

#set text(
  font: "Liberation Sans",
  size: 9.5pt,
  fill: rgb("#1E293B"),
  lang: "es"
)

#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

#show heading.where(level: 1): it => {
  v(1.2em)
  text(fill: rgb("#0F172A"), weight: "bold", size: 14pt)[#it]
  v(0.3em)
  line(length: 100%, stroke: 1.5pt + rgb("#2563EB"))
  v(0.5em)
}

#show heading.where(level: 2): it => {
  v(0.9em)
  text(fill: rgb("#1E3A8A"), weight: "bold", size: 11.5pt)[#it]
  v(0.25em)
}

#show heading.where(level: 3): it => {
  v(0.7em)
  text(fill: rgb("#334155"), weight: "bold", size: 10pt)[#it]
  v(0.2em)
}

// ─── PORTADA ───────────────────────────────────────────────────────────

#align(center)[
  #v(1.5cm)
  #rect(fill: rgb("#EFF6FF"), stroke: 1pt + rgb("#BFDBFE"), radius: 6pt, inset: (x: 14pt, y: 8pt))[
    #text(10pt, weight: "bold", fill: rgb("#1D4ED8"))[ECOSISTEMA DE DESARROLLO DIRIGIDO POR ESPECIFICACIÓN (SDD)]
  ]
  
  #v(1cm)
  #text(22pt, weight: "bold", fill: rgb("#0F172A"))[
    Plan Maestro de Orquestación Multi-Agente
  ]
  
  #v(0.4cm)
  #text(13pt, weight: "medium", fill: rgb("#475569"))[
    Proyecto: Hotel Wimbledon (Sistema Integral de Gestión & Check-in QR)
  ]
  
  #v(1.2cm)
  #grid(
    columns: (1fr, 1fr),
    gutter: 18pt,
    align: (left, left),
    rect(fill: rgb("#F8FAFC"), stroke: 1pt + rgb("#E2E8F0"), radius: 8pt, inset: 12pt, width: 100%)[
      #text(weight: "bold", fill: rgb("#0F172A"))[Arquitectura del Proyecto:]\
      #v(4pt)
      - *Backend*: Java 21 / Spring Boot 3.5 (Maven)\
      - *Frontend*: React / Vite / Vanilla Admin\
      - *Persistencia*: MySQL 8.x + JPA / Hibernate\
      - *Módulos*: Rack Habitaciones, QR, RBAC (5 roles)
    ],
    rect(fill: rgb("#F8FAFC"), stroke: 1pt + rgb("#E2E8F0"), radius: 8pt, inset: 12pt, width: 100%)[
      #text(weight: "bold", fill: rgb("#0F172A"))[Infraestructura de Agentes:]\
      #v(4pt)
      - *Orquestador*: Gentle-AI 3.7.0 (Framework SDD)\
      - *Constructor*: OpenCode 2.0.16 (Space Bunny Free)\
      - *Auditor/Adversario*: Hermes Agent 0.21.5\
      - *Memoria Persistente*: Engram 2.2.0 (MCP Server)
    ]
  )
  
  #v(2cm)
  #text(9pt, fill: rgb("#64748B"))[
    *Fecha de Emisión*: 25 de Septiembre de 2026 \
    *Estado*: Validado y Operativo en Entorno Local (Arch / CachyOS Linux) \
    *Presupuesto de Inferencia*: \$0.00 USD (Modelos Gratuitos Remotos + LM Studio Local)
  ]
]

#pagebreak()

// ─── CONTENIDO ─────────────────────────────────────────────────────────

= Resumen Ejecutivo y Objetivos

El presente documento establece el marco operativo y técnico para coordinar de forma sinérgica el conjunto de agentes de inteligencia artificial aplicados al repositorio *Hotel Wimbledon* (`wimbledon-web`).

El objetivo primordial es reemplazar la programación reactiva o monolítica por un ciclo de vida estructurado bajo la metodología *SDD (Spec-Driven Development)*, implementada a través del framework *Gentle-AI*. En este esquema:

1. *Especialización Estricta*: Ningún agente asume roles cruzados sin supervisión. El constructor implementa código, el auditor desafía la seguridad y la usabilidad, y el orquestador valida cada fase antes de avanzar.
2. *Cero Costo en Inferencia (Zero API Cost)*: Se integran modelos en la nube de nivel de producción sin consumo financiero (`Space Bunny Free` y `Nous Laguna 2.1 Free`), respaldados por el servidor local *LM Studio* para contingencias fuera de línea.
3. *Memoria Trans-Sesión (Cross-Session Resilience)*: Se garantiza que decisiones clave de arquitectura, esquemas de base de datos y hallazgos adversariales persistan frente a la compactación de contexto mediante el protocolo MCP de *Engram*.

= Topología de la Arquitectura de Agentes

El flujo de trabajo divide las responsabilidades en cuatro capas jerárquicas:

#align(center)[
#rect(fill: rgb("#F1F5F9"), stroke: 1pt + rgb("#CBD5E1"), radius: 8pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", size: 10.5pt, fill: rgb("#0F172A"))[TOPOLOGÍA DEL STACK HOTEL WIMBLEDON]
  #v(6pt)
  #grid(
    columns: (1fr),
    gutter: 7pt,
    rect(fill: rgb("#DBEAFE"), stroke: 1pt + rgb("#93C5FD"), radius: 4pt, inset: 7pt)[
      *1. Capa de Gobernanza & Ciclo de Vida: Gentle-AI (SDD Orchestrator)*\
      Control de fases: `sdd-init` $arrow$ `sdd-explore` $arrow$ `sdd-spec` $arrow$ `sdd-tasks` $arrow$ `sdd-apply` $arrow$ `sdd-verify`
    ],
    rect(fill: rgb("#DCFCE7"), stroke: 1pt + rgb("#86EFAC"), radius: 4pt, inset: 7pt)[
      *2. Capa de Construcción: OpenCode 2.x (Builder)*\
      Agente: `gentle-orchestrator` / `build` | Modelo: `opencode/space-bunny-free`\
      Generación de controladores Spring Boot, migraciones JPA, validaciones y lógica frontend.
    ],
    rect(fill: rgb("#FEE2E2"), stroke: 1pt + rgb("#FCA5A5"), radius: 4pt, inset: 7pt)[
      *3. Capa de Auditoría y Adversarios: Hermes Agent + Especialistas Wimbledon*\
      Agente: `Hermes Agent` | Modelo: `poolside/laguna-s-2.1:free` (Nous Portal)\
      Sub-agentes del proyecto: `RedTeam` (AppSec/RBAC) y `UI-Critic` (UX/UI Rack & Check-in).
    ],
    rect(fill: rgb("#FEF3C7"), stroke: 1pt + rgb("#FDE68A"), radius: 4pt, inset: 7pt)[
      *4. Capa de Memoria Persistente: Engram MCP Server*\
      Sincronización bidireccional entre OpenCode y Hermes mediante `engram mcp --tools=agent`.\
      Retiene contexto de endpoints (`/api/auth`, `/api/habitaciones`), sesiones y mitigaciones.
    ]
  )
]
]

#v(0.3cm)

= Matriz de Roles y Reglas de Compromiso

El equipo opera bajo el principio de desconfianza mutua y límites claros, tal como se especifica en `.agents/AGENTS.md` del proyecto Wimbledon:

#table(
  columns: (2.2cm, 2.5cm, 3.8cm, 4.2cm, 3.3cm),
  fill: (x, y) => if y == 0 { rgb("#1E293B") } else if calc.even(y) { rgb("#F8FAFC") } else { none },
  stroke: (x, y) => if y == 0 { none } else { 0.5pt + rgb("#E2E8F0") },
  inset: 5pt,
  align: (col, row) => if row == 0 { center + horizon } else { left + horizon },
  
  text(weight: "bold", fill: white, size: 8pt)[Agente],
  text(weight: "bold", fill: white, size: 8pt)[Entorno],
  text(weight: "bold", fill: white, size: 8pt)[Enfoque Principal],
  text(weight: "bold", fill: white, size: 8pt)[Archivos / Objetivos Clave],
  text(weight: "bold", fill: white, size: 8pt)[Restricción Crítica],

  [*Gentle\ Orchestrator*],
  [OpenCode CLI / TUI],
  [Descomposición SDD y verificación de hitos],
  [`.specs/`, tareas SDD, contratos de revisión],
  [No codifica directamente sin fase previa aprobada.],

  [*OpenCode\ (Builder)*],
  [OpenCode 2.0.16],
  [Implementación de código productivo],
  [`backend/src/...`\ `frontend/src/...`],
  [No realiza auto-aprobación de seguridad ni merge.],

  [*RedTeam*],
  [Hermes Agent / Sandbox],
  [Pentesting, bypass de RBAC, inyección JWT],
  [`SecurityConfig.java`\ `JwtAuthFilter.java`\ `@PreAuthorize`\ Matriz de 5 Roles],
  [No modifica código fuente; solo emite reportes con severidad.],

  [*UI-Critic*],
  [Hermes Agent / Visual Subagent],
  [Consistencia de Rack, a11y, fricción de reserva],
  [`index.html` (Público)\ `admin.html` (Panel)\ `style.css` (Variables)\ BPMN To-Be],
  [No evalúa backend ni infraestructura; foco 100% experiencia.],

  [*Hermes\ Runner*],
  [Hermes CLI (`-w`)],
  [Ejecución de pruebas, validación CLI y logs],
  [`mvn test`, `curl` endpoints, verificación de estado MySQL],
  [Opera en git worktrees aislados para evitar conflictos.]
)

#v(0.3cm)

#rect(fill: rgb("#FEF2F2"), stroke: 1.5pt + rgb("#EF4444"), radius: 6pt, inset: 9pt)[
  #text(weight: "bold", fill: rgb("#991B1B"))[Regla de Oro de Interacción:]\
  Ningún cambio que afecte endpoints de recepción, cobro o autenticación (`/api/auth`, `/api/reservas`, `/api/admin`) podrá considerarse completo hasta que el reporte del agente `RedTeam` certifique ausencia de brechas de nivel *Crítico* o *Alto*, y el agente `UI-Critic` apruebe la coherencia contra el diagrama BPMN To-Be.
]

#pagebreak()

= Fases de Aplicación en el Proyecto Hotel Wimbledon

A continuación se detalla la secuencia operativa para abordar cualquier requerimiento o refactorización en el sistema de Wimbledon:

== Fase 1: Inicialización y Especificación (SDD Init & Spec)
- *Comando*: `/sdd-init <nombre-cambio>` en OpenCode o `gentle-ai sdd-status`.
- *Acción*: El orquestador crea el directorio de trabajo bajo especificación controlada.
- *Rol del Humano*: Definir los requisitos funcionales del cambio (por ejemplo: _"Implementación de firma digital en check-in con QR"_).
- *Salida*: `proposal.md` y `spec.md` con alcance delimitado y criterios de aceptación verificables.

== Fase 2: Diseño de Tareas y Arquitectura (SDD Design & Tasks)
- *Acción*: `gentle-orchestrator` descompone la especificación en unidades de trabajo atómicas (`tasks.md`).
- *Persistencia*: Se invoca `mem_save` en Engram con los identificadores de endpoints y modelos de datos afectados (ejemplo: `HabitacionDTO`, `CheckInRequest`).
- *Revisión*: Se valida que no existan contradicciones con las reglas de negocio de los 5 roles existentes (`SUPER_ADMIN`, `ADMINISTRADOR`, `RECEPCIONISTA`, `LIMPIEZA`, `CLIENTE`).

== Fase 3: Construcción Aislada (OpenCode Apply)
- *Herramienta*: OpenCode sobre el modelo `space-bunny-free`.
- *Tareas*:
  - Generación de código backend en Spring Boot (`*Service.java`, `*Controller.java`).
  - Creación de migraciones SQL para MySQL 8 si se añaden campos.
  - Implementación de la vista interactiva en Vite / React o Vanilla JS (`admin.js`).
- *Principio*: Compilación e integración continua local (`mvn clean compile`).

== Fase 4: Auditoría Cruzada Dual (Hermes + RedTeam + UI-Critic)
- *Herramienta*: Hermes Agent ejecutando de forma independiente sobre `poolside/laguna-s-2.1:free`.
- *Ejecución de RedTeam*:
  1. Envía peticiones HTTP anómalas contra los endpoints recién expuestos.
  2. Intenta acceder con tokens de rol `CLIENTE` o `LIMPIEZA` a endpoints reservados para `RECEPCIONISTA` o `ADMINISTRADOR`.
  3. Verifica que las excepciones retornen respuestas HTTP 401/403/400 estandarizadas y sin volcado de stack trace.
- *Ejecución de UI-Critic*:
  1. Comprueba la paleta de colores y tokens (`--color-gold`, `--color-navy`, tipografía Fraunces).
  2. Valida la usabilidad del Rack de Habitaciones ante cambios de estado (`LIBRE`, `OCUPADA`, `LIMPIEZA`).
  3. Comprueba el flujo de lectura de QR en dispositivos móviles y de escritorio.

== Fase 5: Verificación, Cierre y Registro en Memoria
- *Comando*: `/sdd-verify` y `/sdd-archive`.
- *Acción*: El orquestador ejecuta los tests unitarios y de integración (`mvn test`).
- *Cierre en Engram*: Se almacena el resumen final de la sesión mediante `mem_session_summary`, vinculando el cambio a la historia del proyecto Wimbledon.

#v(0.3cm)

= Protocolo de Manejo de Inferencia y Fallbacks

#table(
  columns: (3.2cm, 4cm, 3.8cm, 5cm),
  fill: (x, y) => if y == 0 { rgb("#1E293B") } else { none },
  stroke: 0.5pt + rgb("#CBD5E1"),
  inset: 6pt,
  
  text(weight: "bold", fill: white)[Escenario],
  text(weight: "bold", fill: white)[Proveedor Primario],
  text(weight: "bold", fill: white)[Fallback Inmediato],
  text(weight: "bold", fill: white)[Condición de Activación],

  [*OpenCode*\ (Desarrollo diario)],
  [`opencode/space-bunny-free`\ (OpenRouter / OpenCode Pool)],
  [LM Studio Local\ (`prism-ml/bonsai-27b` o `qwen3.5-9b`)],
  [Agotamiento de cuota, latencia > 15s o pérdida de conexión externa.],

  [*Hermes Agent*\ (Auditoría / Tareas)],
  [`nous/poolside/laguna-s-2.1:free`\ (Nous Portal Inference)],
  [LM Studio Local\ (`google/gemma-4-12b-qat`)],
  [Errores HTTP 429/503 en Nous Portal.],

  [*Inferencia Local*\ (LM Studio)],
  [Aceleración CUDA\ (RTX 4070 Ti Super)],
  [Offload CPU\ (0 capas GPU)],
  [Cuando procesos externos (ej. Python PID 190164) ocupen la VRAM.]
)

#v(0.4cm)

= Hoja de Ruta de Casos de Uso en Wimbledon

+ *Hito 1 — Fortalecimiento del Check-in QR*:
  - *Objetivo*: Permitir validación criptográfica del código QR emitido en la reserva para check-in express sin intervención manual de recepción.
  - *Asignación*: OpenCode (Backend ZXing + Endpoint `/api/recepcion/checkin-qr`), RedTeam (Auditoría de replay attacks con QR ya canjeados).

+ *Hito 2 — Rack Interactivo de Habitaciones en Tiempo Real*:
  - *Objetivo*: Refrescar el estado de ocupación y limpieza en `admin.html` mediante eventos SSE o polling optimizado.
  - *Asignación*: OpenCode (Frontend DOM updates), UI-Critic (Validación ergonómica y prevención de parpadeos en pantalla).

+ *Hito 3 — Blindaje de Auditoría de Transacciones de Caja*:
  - *Objetivo*: Registro inmutable de pagos en recepción (`EFECTIVO`, `TARJETA`, `YAPE/PLIN`).
  - *Asignación*: OpenCode (Entidad `Pago` + Servicio), RedTeam (Pruebas de concurrencia y doble cobro).

#v(0.8cm)
#align(center)[
  #text(8.5pt, fill: rgb("#94A3B8"))[
    Fin del Documento — Plan Maestro de Orquestación Wimbledon · Gentle-AI & OpenCode Ecosystem
  ]
]
