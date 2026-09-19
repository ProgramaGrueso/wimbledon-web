# Referencia de Evaluación UI/UX — Rack y Flujo Hotel Wimbledon

Documento de apoyo para el agente **UI-Critic**. Resume el catálogo de 16 suites, los estados operativos y las etapas del BPMN To-Be.

---

## 1. Estructura del Rack de Habitaciones (16 Suites / 3 Pisos)

### Piso 1: Suites con Cochera Privada Directa
- `101`: Simple con Jacuzzi
- `102`: Simple Vista al Mar
- `103`: Habitación Delux
- `104`: Hawaian Dreams
- `105`: Venetian Flowers
- `106`: Habitación Especial

### Piso 2: Suites Jacuzzi & Confort
- `201`: Jacuzzi Deluxe
- `202`: Tropical Dreams
- `203`: Riverside Dreams
- `204`: Pacific Dreams
- `205`: Simple con Jacuzzi
- `206`: Jacuzzi Deluxe

### Piso 3: Suites Presidenciales & Temáticas de Lujo
- `301`: Suite Presidencial
- `302`: Suite Presidencial Cámara Seca
- `303`: Riverside Dreams Presidencial
- `304`: Dark Fantasies

---

## 2. Máquina de Estados Visuales de Habitaciones

| Estado | Significado Operativo | Código de Color Recomendado | Señalética Requerida |
| :--- | :--- | :--- | :--- |
| `LIBRE` | Habitación limpia, desinfectada y lista para asignación o reserva inmediata. | Verde esmeralda / Teal (`#10b981`) | Indicador de disponibilidad y precio por turno o noche. |
| `OCUPADA` | Huésped en estancia; habitación bloqueada. | Rojo carmesí / Burdeos (`#ef4444`) | Tiempo restante o fecha prevista de checkout. |
| `LIMPIEZA` | Huésped se retiró; requiere aseo y reposición de amenidades. | Amarillo ámbar (`#f59e0b`) | Alerta visible para personal de piso. |
| `EN_PROCESO` | Personal de camarería dentro de la suite ejecutando desinfección. | Azul zafiro / Cian (`#06b6d4`) | Bloqueo temporal para recepción. |

---

## 3. Flujo BPMN To-Be (`figura2_bpmn_propuesto_to_be.mmd`)

Al auditar cualquier pantalla, verifica en cuál de estos 5 momentos se encuentra el usuario:

1. **Momento 1 — Catálogo y Selección:**
   - Huésped filtra por piso o tipo de suite (Cochera directa, Jacuzzi, Presidencial).
   - *Foco de crítica:* Claridad en especificaciones técnicas (capacidad, cochera privada, amenidades).
2. **Momento 2 — Reserva Digital:**
   - Huésped ingresa datos y confirma horario/noche.
   - *Foco de crítica:* Número de pasos en el formulario; prevención de errores de entrada en fechas.
3. **Momento 3 — Confirmación y Emisión de QR:**
   - Sistema genera código único (ej. `#WMB-8120`) y código QR descargable.
   - *Foco de crítica:* Jerarquía del código alfanumérico, contraste del QR y facilidad para guardar en móvil.
4. **Momento 4 — Check-in en Front-Desk:**
   - Recepción escanea QR o busca por documento/código. Asignación inmediata en el Rack.
   - *Foco de crítica:* Velocidad de validación; confirmación visual de coincidencia de identidad.
5. **Momento 5 — Desocupación, Limpieza e Historial:**
   - Checkout notifica automáticamente a camarería; cambio de estado a `LIMPIEZA`.
   - *Foco de crítica:* Notificación visible sin necesidad de recargar la página (*live feedback*).
