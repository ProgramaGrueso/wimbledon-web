# Informe de Soluciones Técnicas — Hotel Wimbledon (v4, aprobado para merge)
**Historial:** v1 (parches iniciales) → v2 (fugas de listeners y tipado) → v3 (accesibilidad incompleta, grid roto, flujo ciego post-guardado) → v4 (tres ajustes de borde, aprobado para implementación).

> v3 → v4: quedaban tres detalles menores que no bloqueaban el merge pero convenía cerrar antes de codear: desfase de 24px entre el eje Y y la base real de las barras, semántica ARIA incorrecta para un grupo de chips mutuamente excluyentes (`aria-pressed` en vez de `role="radiogroup"`/`aria-checked`), y falta de guard clause en `updateRoomSummaryOnly` si el ID de suite no matchea. Los tres se resuelven abajo. Todo lo anterior (v1-v3) queda vigente sin cambios.

---

## 12. [Medio] Dashboard de Gerencia — ajuste de borde (desfase eje Y / base de barras)

**Detalle señalado:** `.bar-chart-yaxis` tenía `padding-bottom: 24px` para la etiqueta inferior, pero `.bar-chart-bars` no compartía ese padding, así que el "0%" del eje quedaba 24px por encima de la base real de las barras.

**Ajuste — la fila de etiquetas del eje X vive fuera del área de barras, y ambos contenedores comparten exactamente la misma altura útil:**
```css
.gerente-chart {
  display: grid;
  grid-template-columns: 48px 1fr;
  grid-template-rows: 240px auto; /* área de barras | fila de etiquetas eje X */
  position: relative;
}

.bar-chart-yaxis {
  grid-column: 1;
  grid-row: 1; /* misma fila que .bar-chart-bars, sin padding extra */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.bar-chart-bars {
  grid-column: 2;
  grid-row: 1; /* misma altura exacta que .bar-chart-yaxis: 240px, sin padding */
  display: flex;
  align-items: flex-end;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(25% - 1px),
    rgba(255, 255, 255, 0.08) calc(25% - 1px),
    rgba(255, 255, 255, 0.08) 25%
  );
}

.chart-x-labels {
  grid-column: 2;
  grid-row: 2; /* fuera del área de 240px, ya no compite por espacio con el 0% */
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
}
```
**Criterio de aceptación:** con una barra en `height: 0%` (caso límite), su base debe coincidir en pixel con la línea "0%" del eje — sin los 24px de desfase.

---

## 5 y 6. [Alto/Bajo] Chips de duración — ajuste de semántica ARIA (radiogroup, no toggle)

**Detalle señalado:** un grupo donde solo una opción puede estar activa a la vez (duración, horario, medio de pago) es semánticamente un `radiogroup`, no un conjunto de botones de alternancia independientes. `aria-pressed` funciona pero WCAG formal espera `aria-checked` sobre `role="radio"`.

**Ajuste:**
```html
<div class="chip-group" role="radiogroup" aria-label="Duración de la estancia" data-group="duration">
  <button type="button" class="chip-option" role="radio" data-value="2h" aria-checked="false">2 horas</button>
  <button type="button" class="chip-option" role="radio" data-value="3h" aria-checked="false">3 horas</button>
</div>
```
```js
function selectChip(group, value) {
  document.querySelectorAll(`[data-group="${group}"] .chip-option`).forEach(chip => {
    const isSelected = chip.dataset.value === value;
    chip.classList.toggle('active', isSelected);
    chip.setAttribute('aria-checked', String(isSelected)); // antes: aria-pressed
  });
  checkoutState[group] = value;
  updateSummaryTotal();
}
```
El manejo de teclado ya delegado (`keydown` en `#checkoutModalBody`) no cambia — solo cambia el atributo que se sincroniza. Grupos que sí son independientes entre sí (por ejemplo, extras marcables de a varios a la vez) mantienen `aria-pressed`, ya que ahí `aria-checked`/`radiogroup` sería semánticamente incorrecto.

**Criterio de aceptación:** con NVDA/VoiceOver, al entrar al grupo de duración debe anunciarse "grupo de radio, 2 opciones" y, al enfocar cada chip, "2 horas, no seleccionado/seleccionado" (radio), no "botón, presionado/no presionado" (toggle).

---

## 1. [Crítico] `updateRoomSummaryOnly` — ajuste de borde (guard clause)

**Detalle señalado:** si `checkoutState.selectedRoomId` no matchea ningún `room.id` (dataset no cargado aún, ID desfasado), `room` es `undefined` y `room.name` lanza `TypeError`, rompiendo el modal.

**Ajuste:**
```js
function updateRoomSummaryOnly() {
  const room = roomsData.find(r => String(r.id) === checkoutState.selectedRoomId);
  if (!room) return; // dataset no cargado o ID desfasado: no romper el modal, solo no actualizar el resumen

  document.getElementById('roomSummaryName').textContent = room.name;
  document.getElementById('roomSummaryImg').src = room.image;
  document.getElementById('roomSummaryPrice').textContent = `S/ ${room.price}`;
  updateSummaryTotal();
}
```
**Criterio de aceptación:** invocar `updateRoomSummaryOnly()` con `checkoutState.selectedRoomId` seteado a un ID inexistente (`"999"`) no debe lanzar excepción ni romper el resto del modal — simplemente no actualiza el resumen.

---

## Estado final por hallazgo

| # | Estado |
|---|---|
| 1 | Aprobado — con guard clause defensivo |
| 2 | Aprobado |
| 3 | Aprobado |
| 4 | Aprobado |
| 5 / 6 | Aprobado — `aria-checked` + `role="radiogroup"` para chips excluyentes |
| 7 | Aprobado |
| 8 | Aprobado |
| 9 | Aprobado |
| 10 | Aprobado |
| 11 | Aprobado |
| 12 | Aprobado — eje Y y barras comparten la misma fila/altura, sin desfase |
| 13 | Aprobado |
| 14 | Aprobado |

## Veredicto

Documento aprobado para merge e implementación. Los puntos críticos originales (pérdida de datos en formularios, dependencia manual del algoritmo QR, listeners huérfanos, falsos positivos en el guardado de reservas) y los tres ajustes de borde de esta ronda (desfase de eje Y, semántica ARIA de radiogroup, guard clause defensivo) quedan resueltos con soluciones limpias y mantenibles. No quedan pendientes bloqueantes.
