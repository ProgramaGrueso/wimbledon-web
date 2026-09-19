# Informe de Auditoría Heurística UI/UX — Hotel Wimbledon
**Agente Evaluador:** UI-Critic (Senior UX/UI Product Designer)  
**Fecha:** Septiembre 2026  
**Alcance de la Auditoría:** Flujo público de reservas (B2C), catálogo de suites, autogestión del huésped, componentes compartidos en `style.css` y arquitectura de los workspaces de Recepción, Limpieza y Gerencia.

---

## Resumen Ejecutivo

La presente auditoría identificó **14 hallazgos** distribuidos en **3 Críticos, 5 Altos, 4 Medios y 2 Bajos**. Si bien el portal público presenta una dirección artística editorial refinada y animaciones inmersivas en su página principal, el flujo transaccional y los componentes de servicio exhiben fallas graves: generación de códigos QR vectoriales con algoritmos pseudo-aleatorios no escaneables por cámaras reales, ausencia absoluta de reglas de impresión para el pase digital, una ruptura estética radical en la ficha técnica (fondo blanco brillante en una interfaz oscura de lujo) y una experiencia de checkout inestable que destruye el DOM en cada selección de chip.

---

## 1. Estado de los Workspaces Operativos Fuera de `admin.js`

> **Nota de Alcance Arquitectónico:**  
> Se verificó exhaustivamente el repositorio (`frontend/`, `frontend/src/`, `frontend/public/`) para determinar si existían módulos `.html` o `.js` dedicados para Recepción, Limpieza y Gerencia de forma independiente.  
> **Constatación:** Ninguno de los tres workspaces operativos cuenta con código HTML/JS autónomo fuera de `frontend/admin.html` y `frontend/src/admin.js`. Toda la lógica de vistas (`renderRecepcionWorkspace`, `renderLimpiezaWorkspace`, `renderGerenteWorkspace`) y sus controladores de eventos están encapsulados en dicho archivo monolítico.  
> No obstante, sus clases de soporte y selectores cromáticos residen en `frontend/src/style.css`, y su integración con los datos generados por el portal público introduce hallazgos operativos de alto impacto que se evalúan a continuación.

---

## 2. Hallazgos en el Flujo Público de Reserva del Huésped (B2C)
*(Archivos auditados: `frontend/index.html`, `frontend/src/main.js`, `frontend/src/qrGenerator.js`, `frontend/src/smoothScroll.js`)*

### [Severidad: Crítico] Catálogo y Checkout — Botón "RESERVAR" Global fuerza Suite Ciega sin Selector Interno
- **Archivo / Función:** `frontend/src/main.js` / funciones `setupCheckoutModalListeners` (L793-801) y `renderCheckoutModalContent` (L847-965).
- **Problema:** Al hacer clic en los botones principales "RESERVAR" de la cabecera fija (`#btnHeaderReserve`) o del Hero (`#btnHeroReserve`), el sistema abre directamente el modal de checkout asignando de forma forzada la primera habitación del arreglo (`roomsData[0].id`). Dentro del modal de checkout no existe ningún menú desplegable ni selector para que el usuario pueda cambiar de suite.
- **Por qué importa:** Viola la heurística fundamental de control y libertad del usuario. Un cliente que ingresa a la web y pulsa el CTA primario de reserva es obligado a cerrar el modal, desplazarse manualmente por el catálogo hasta encontrar otra suite y pulsar el botón específico de esa tarjeta para poder cotizarla.
- **Sugerencia concreta:** Incorporar una cabecera interactiva dentro del paso 1 del modal de checkout con una minitarjeta o selector desplegable de suite que permita cambiar de habitación sin abandonar el flujo de compra.

---

### [Severidad: Crítico] Emisión de Voucher Digital — Algoritmo Pseudo-aleatorio de QR No Escaneable
- **Archivo / Función:** `frontend/src/qrGenerator.js` / función `generateQRCodeSVG` (L50-81).
- **Problema:** El generador de QR dibuja los tres patrones de posición en las esquinas (*finders* de 7x7), pero rellena la matriz interna de datos mediante un generador pseudo-aleatorio derivado del texto (`(pseudoRand() > 0.48 ? 1 : 0) ^ bit`), en lugar de implementar codificación real Reed-Solomon según el estándar ISO/IEC 18004.
- **Por qué importa:** Ruptura total del *Momento 3* y *Momento 4* del BPMN To-Be. Cuando el huésped llega al hotel y presenta este código en su pantalla móvil frente a la cámara del recepcionista o un escáner óptico 2D, el hardware es incapaz de decodificar el payload alfanumérico, obligando a digitar manualmente el código y generando fricción en el mostrador.
- **Sugerencia concreta:** Sustituir la generación artesanal pseudo-aleatoria por una función de empaquetado QR estandarizada que entregue una matriz binaria válida con corrección de errores nivel M o Q, asegurando legibilidad inmediata en lectores ópticos y smartphones.

---

### [Severidad: Crítico] Impresión de Pase Digital — Inexistencia de Reglas `@media print` para la Keycard
- **Archivo / Función:** `frontend/src/main.js` / función `renderKeycardHTML` (L1156-1158) y `frontend/src/style.css`.
- **Problema:** El botón "📄 Guardar Pase" ejecuta directamente `window.print()`, pero la hoja de estilos carece por completo de directivas `@media print`.
- **Por qué importa:** Al pulsar el botón, el navegador abre el cuadro de impresión renderizando toda la página web (navbar fixed, videos de fondo oscuros, pie de página, contenedores colapsados y fondos negros translúcidos con desenfoque), gastando decenas de hojas en blanco y negro y recortando la tarjeta digital en una esquina ilegible.
- **Sugerencia concreta:** Diseñar un bloque `@media print` específico que oculte todos los elementos del DOM (`#navbar`, `#app`, `.checkout-modal-overlay::before`, etc.) y dimensione exclusivamente la tarjeta `.wimbledon-keycard` como un voucher centrado, con fondo blanco limpio, tipografías oscuras de alto contraste y el código QR nítido a 300 DPI.

---

### [Severidad: Alto] Ficha Técnica de Suites — Ruptura Estética Violenta con Fondo Blanco y Tipografía Roja
- **Archivo / Función:** `frontend/src/style.css` / clases `.drawer-panel` (L1007-1018), `.drawer-spec-title` (L1023-1030) y `.drawer-spec-price` (L1031-1037).
- **Problema:** El panel lateral que despliega los detalles de cada suite (`#roomDrawer`) tiene configurado `background: var(--color-white)`, tipografía en rojo carmín (`color: #d00a1e`) y precios en gris petróleo (`#1e2928`), irrumpiendo violentamente contra el resto de la plataforma, que utiliza un diseño oscuro editorial (`#060911`) con acentos dorados (`#fbbf24`).
- **Por qué importa:** Provoca un "golpe de luz" molesto para el usuario que navega en ambientes oscuros y destruye la percepción de elegancia boutique, dando la impresión visual de que el drawer pertenece a un sitio web antiguo no integrado.
- **Sugerencia concreta:** Homogeneizar el drawer al sistema de diseño oscuro de la marca: fondo en pizarra abisal (`#0b0f19`), bordes sutiles en ámbar/oro (`rgba(217, 119, 6, 0.3)`), títulos en *Fraunces* blanco marfil y precios en dorado editorial (`#fbbf24`).

---

### [Severidad: Alto] Checkout Modal — Destrucción de DOM y Pérdida de Foco en Selección de Chips
- **Archivo / Función:** `frontend/src/main.js` / función `renderCheckoutModalContent` (L1039-1078).
- **Problema:** Cada vez que el cliente selecciona una opción de duración, horario, extra o medio de pago, el listener invoca inmediatamente `renderCheckoutModalContent()`, lo cual reescribe completamente el `innerHTML` de `#checkoutModalBody`.
- **Por qué importa:** La destrucción y re-creación del árbol DOM en cada clic provoca parpadeo visual, resetea la posición del scroll dentro del modal si el usuario estaba en la parte inferior e interrumpe la navegación por teclado (`tabindex`), obligando al usuario a volver a ubicar visualmente dónde estaba.
- **Sugerencia concreta:** Desacoplar el estado de la renderización destructiva: actualizar únicamente las clases `.active` de los botones pulsados y mutar puntualmente el texto del nodo del precio total (`#summaryTotalVal`), conservando intacta la estructura del formulario.

---

### [Severidad: Alto] Checkout Modal — Stepper Visual Falso con 4 Estados Activos Simultáneos
- **Archivo / Función:** `frontend/src/main.js` / función `renderCheckoutModalContent` (L865-886) y `frontend/src/style.css` / `.checkout-stepper`.
- **Problema:** El formulario presenta una barra superior con 4 pasos (`1. Duración`, `2. Horario`, `3. Extras`, `4. Pago`), pero en el código HTML todos los pasos tienen asignada de forma estática la clase `.step-indicator.active` simultáneamente, mostrando todo el formulario en una sola vista continua.
- **Por qué importa:** Genera confusión cognitiva. Un patrón de stepper promete una navegación secuencial paso a paso (Wizard). Al ver los 4 números iluminados a la vez, el usuario no comprende si completó un paso o si se trata de un indicador de avance real.
- **Sugerencia concreta:** Transformar el formulario en un verdadero flujo de 3 o 4 pantallas cortas con transiciones laterales y botones "Continuar" / "Atrás", o bien remover el stepper y sustituirlo por encabezados de sección numerados tradicionales.

---

### [Severidad: Alto] Catálogo Cinemático vs Grid — Fricción de 3 Pasos en la Navegación Horizontal
- **Archivo / Función:** `frontend/src/main.js` / función `renderSuitesList` (L605-635).
- **Problema:** En el modo de visualización cinemática por defecto (scroll horizontal con GSAP), las tarjetas de suites solo ofrecen el botón "VER DETALLES & RESERVAR →", el cual abre obligatoriamente el drawer de ficha técnica; desde allí, el usuario debe hacer un segundo clic en "RESERVAR AHORA" para abrir el modal de checkout. En contraste, el modo Grid sí cuenta con botón directo de reserva.
- **Por qué importa:** Añade un clic y un nivel de modalización redundante en el modo más promocionado del portal, incrementando la tasa de abandono en la fase de selección.
- **Sugerencia concreta:** Añadir en la tarjeta horizontal una doble botonera de acción rápida: botón primario "Reservar" (abre el checkout de inmediato) y botón secundario "Detalles" (abre la ficha técnica).

---

### [Severidad: Medio] Autogestión del Huésped — Extensión y Cancelación Resueltas con Diálogos Nativos
- **Archivo / Función:** `frontend/src/main.js` / función `setupBookingManageActions` (L1400-1443).
- **Problema:** Las acciones de extender estadía (+2h, +3h) y cancelar reserva en el modal "Mi Llave Digital" se ejecutan mediante alertas y confirmaciones nativas del navegador (`alert(...)` y `confirm(...)`), además de no solicitar ningún medio de pago complementario para el sobrecargo.
- **Por qué importa:** Los diálogos nativos detienen la ejecución de la pestaña, lucen obsoletos en una web de lujo y no ofrecen desglose del recargo o métodos de cobro en línea.
- **Sugerencia concreta:** Sustituir los diálogos nativos por un sub-panel integrado dentro del modal con desglose del monto adicional, selector de pago (Yape/Tarjeta) y mensaje de confirmación con micro-animación de éxito.

---

### [Severidad: Medio] Carta Gastronómica — Botones Placebo con Alertas Nativas
- **Archivo / Función:** `frontend/src/main.js` / función `renderGastronomiaList` (L703-716).
- **Problema:** El botón "+ Pre-ordenar" presente en cada ítem de gastronomía y coctelería únicamente dispara un `alert()` de texto y no almacena el pedido en ninguna estructura de datos ni lo añade como extra a la reserva activa.
- **Por qué importa:** Falsa expectativa de usuario (*dark pattern* involuntario): el cliente asume que su orden fue enviada a la cocina de la habitación, pero la información se pierde de inmediato al cerrar la alerta.
- **Sugerencia concreta:** Conectar la selección gastronómica con el estado de extras de la reserva (`checkoutState.selectedExtras`) o, en su defecto, desplegar un modal de pedido directo a recepción por WhatsApp con el listado de productos elegidos.

---

### [Severidad: Bajo] Accesibilidad de Formularios — Falta de Vinculación Semántica `label/for` en Checkout
- **Archivo / Función:** `frontend/src/main.js` / función `renderCheckoutModalContent` (L993-1020).
- **Problema:** Los campos de tarjeta de crédito (Número, Vencimiento, CVV) y datos personales no vinculan sus etiquetas `<label>` con el atributo `for` hacia los identificadores `<input id="...">`.
- **Por qué importa:** Incumplimiento del estándar WCAG 2.1 Criterio 1.3.1 (Info and Relationships). Los lectores de pantalla para usuarios con discapacidad visual o tecnologías asistivas no anuncian el propósito del campo al recibir el foco.
- **Sugerencia concreta:** Asignar identificadores únicos a cada campo y referenciarlos explícitamente mediante el atributo `for` en sus etiquetas correspondientes.

---

## 3. Hallazgos en la Conexión con los Workspaces Administrativos

### [Severidad: Alto] Desconexión Arquitectónica entre Checkout B2C y Recepción
- **Archivo / Afectación:** `frontend/src/main.js` (`confirmAndSaveBooking`) frente a `frontend/src/admin.js` (`renderRecepcionWorkspace`).
- **Problema:** Cuando el cliente reserva una suite en el portal público, la información se persiste en `localStorage` bajo la llave `wimbledon_bookings`. Sin embargo, en el panel administrativo no existe ningún disparador de eventos (`storage` event o WebSocket simulado) que actualice automáticamente el contador de reservas ni marque la habitación en el Rack sin requerir que el recepcionista recargue la página.
- **Por qué importa:** Rompe el *Momento 4* del BPMN To-Be (monitor de Rack en tiempo real). Si un huésped reserva desde su vehículo mientras se aproxima al hotel, recepción no ve la reserva en su agenda hasta refrescar el navegador.
- **Sugerencia concreta:** Implementar un canal de sincronización reactivo en cliente (mediante listener del evento `window.addEventListener('storage', ...)` o un bus de eventos global) que refresque el Rack y la tabla de reservas en vivo ante cualquier nueva transacción.

---

### [Severidad: Medio] Workspace de Gerencia — Dataset Estático y Gráfico de Barras sin Eje Y
- **Archivo / Afectación:** `frontend/src/admin.js` / función `renderGerenteWorkspace` (L557-659, L765-795).
- **Problema:** Las métricas de Gerencia provienen de un objeto literal estático (`gerenteAnalyticsData`) que no computa las reservas reales generadas en el portal público, y el gráfico de barras carece de escala numérica vertical en el eje Y (0%, 25%, 50%, 75%, 100%), dependiendo solo de etiquetas flotantes sobre cada barra.
- **Por qué importa:** Dificulta la comparación visual del rendimiento entre períodos y genera discrepancias evidentes en demostraciones operativas si se crea una reserva y los KPIs permanecen inalterados.
- **Sugerencia concreta:** Incorporar líneas guía horizontales con escala porcentual en el gráfico y vincular al menos una de las métricas clave (ej. total de ingresos del día o índice de check-in digital) al conteo real de registros de `wimbledon_bookings`.

---

## 4. Hallazgos en el Sistema de Diseño Global (`frontend/src/style.css`)

### [Severidad: Medio] Accesibilidad (WCAG 2.1 AA) — Ratios de Contraste Deficientes en Micro-textos
- **Archivo / Afectación:** `frontend/src/style.css` / clases `.gastro-item-desc` (L2981-2985), `.summary-total-label` (L1555-1561) y badges en fondos oscuros.
- **Problema:** Múltiples descripciones y etiquetas complementarias utilizan tipografías de color gris oscuro (`#64748b` y `#777777`) sobre fondos negros o azul noche (`#060911` y `#0b0f19`), con ratios de contraste calculados entre 3.1:1 y 3.8:1.
- **Por qué importa:** No alcanza el umbral mínimo de 4.5:1 exigido por las directrices WCAG 2.1 AA para texto normal, comprometiendo la legibilidad en pantallas móviles bajo luz solar o en entornos con brillo reducido.
- **Sugerencia concreta:** Ajustar los colores de texto secundario al token `#94a3b8` o `#cbd5e1` para asegurar un ratio de contraste superior a 5:1 contra el fondo base.

---

### [Severidad: Bajo] Foco de Teclado y Navegación Accesible — Ausencia de `:focus-visible`
- **Archivo / Afectación:** `frontend/src/style.css` / botones tipo chip (`.chip-option`, `.amenity-chip-btn`, `.payment-card`).
- **Problema:** Los controles interactivos personalizados eliminan el contorno de foco predeterminado (`outline: none`) sin proveer un reemplazo visual mediante `:focus-visible`.
- **Por qué importa:** Un usuario que navegue exclusivamente con teclado (tecla `Tab`) no puede identificar qué botón u opción de pago se encuentra enfocado.
- **Sugerencia concreta:** Definir una regla global `:focus-visible` que proyecte un anillo exterior dorado nítido (`outline: 2px solid #fbbf24; outline-offset: 2px;`) en todos los elementos interactivos interactuados por teclado.

---

## 5. Top 3 Prioritarios para el Avance

De cara a la próxima entrega del proyecto, se recomienda priorizar de forma inmediata los siguientes tres ítems para garantizar la coherencia funcional del prototipo y el cumplimiento de las rúbricas de evaluación:

1. **Resolver el Algoritmo del Generador QR y añadir `@media print` a la Keycard:**  
   *Justificación:* Es el núcleo del flujo To-Be (Momento 3 y 4). Un pase digital que no se puede imprimir limpiamente ni escanear con una cámara estándar invalida la premisa tecnológica del proyecto.
2. **Homogeneizar el Drawer de Detalles (`.drawer-panel`) al Sistema Dark/Gold:**  
   *Justificación:* Es el defecto estético más evidente del portal público. El fondo blanco y las fuentes rojas destruyen instantáneamente la identidad visual editorial de Hotel Wimbledon ante cualquier jurado o usuario.
3. **Erradicar los Diálogos Nativos (`prompt` / `alert`) y Evitar el Re-renderizado Destructivo en el Checkout:**  
   *Justificación:* Eleva drásticamente la solidez del producto, eliminando fricciones operativas tanto en recepción como en la experiencia de reserva del cliente.
