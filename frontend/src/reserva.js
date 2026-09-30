/**
 * Flujo de reserva del portal en 3 pasos:
 *   1. Selección — suite, duración, fecha (hoy a +60 días) y turno con disponibilidad real.
 *   2. Personalización — pack de decoración y adicionales, con el total al instante.
 *   3. Liquidación — la suite queda retenida 15 min en el servidor; se muestran los
 *      datos de depósito y el voucher se envía por WhatsApp.
 *
 * Privacidad: sin cuentas, sin correo y sin guardar la reserva en el navegador.
 * Solo el pack de decoración elegido vive en sessionStorage mientras se navega.
 */
import { api } from './services/api.js';

export const EXTRAS = [
  { id: 'DECO_1', name: 'Pack Pasión & Globos', price: 60, deco: true, desc: 'Globos metalizados, letrero LED, pétalos y copas para brindar' },
  { id: 'DECO_2', name: 'Pack Jacuzzi & Velas', price: 75, deco: true, desc: 'Velas LED en la tina, sales minerales, pétalos y espumante' },
  { id: 'DECO_3', name: 'Pack Luxury Aniversario', price: 95, deco: true, desc: 'Bouquet natural, bombones Ferrero, luz tenue y Riccadonna' },
  { id: 'CHAMPAGNE', name: 'Cava Helada / Champagne', price: 75, desc: 'Botella en hielera de acero con 2 copas' },
  { id: 'PIQUEO', name: 'Piqueo Gourmet Wimbledon', price: 42, desc: 'Tequeños, alitas barbecue y salsas' },
  { id: 'SPA_KIT', name: 'Kit Spa & Aromaterapia', price: 35, desc: 'Sales de jacuzzi, esencias y batas' }
];

// Mismos factores que TarifaService en el backend: el monto que se muestra es el que se cobra.
const DURACIONES = [
  { key: 'TRES_HORAS', label: '3 horas', horas: 3, factor: 0.65 },
  { key: 'SEIS_HORAS', label: '6 horas', horas: 6, factor: 1 },
  { key: 'DOCE_HORAS', label: 'Pernocte', horas: 12, factor: 1.6 }
];

const DIAS_MAX = 60;
const DECO_KEY = 'wimbledon_deco';
const PAGO_DEFAULT = { titular: 'Hotel Wimbledon', yapePlin: '990370681', whatsapp: '51990370681', cuentas: [], minutosRetencion: 15 };

let deps = { getRooms: () => [], toast: () => {}, openTerms: () => {} };
let st = null;              // estado del formulario abierto
let reservaActiva = null;   // hold en curso (solo en memoria)
let countdownTimer = null;
let datosPago = null;

// ── Utilidades ────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyISO = () => isoLocal(new Date());
const maxISO = () => { const d = new Date(); d.setDate(d.getDate() + DIAS_MAX); return isoLocal(d); };
const soles = (n) => `S/ ${Number(n).toFixed(2)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nuevaClave = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function precioBase(room) {
  const n = parseInt(String(room?.precio || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 150;
}
function tarifa(room, durKey) {
  const d = DURACIONES.find(x => x.key === durKey) || DURACIONES[1];
  return Math.round(precioBase(room) * d.factor * 100) / 100;
}
function totalDe(room, durKey, extras) {
  return extras.reduce((acc, id) => acc + (EXTRAS.find(e => e.id === id)?.price || 0), tarifa(room, durKey));
}
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Pack de decoración (persistente durante la navegación) ────────────────
export function getDecoSeleccionado() {
  try { return sessionStorage.getItem(DECO_KEY); } catch { return null; }
}
export function setDecoSeleccionado(id) {
  try { id ? sessionStorage.setItem(DECO_KEY, id) : sessionStorage.removeItem(DECO_KEY); } catch { /* sin storage */ }
  document.dispatchEvent(new CustomEvent('wimbledon:deco-change', { detail: id }));
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function initReserva(dependencias) {
  deps = { ...deps, ...dependencias };
  const modal = document.getElementById('checkoutModal');
  const close = document.getElementById('checkoutCloseBtn');
  if (close) close.onclick = cerrarModal;
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal?.classList.contains('open')) cerrarModal(); });
}

function cerrarModal() {
  const modal = document.getElementById('checkoutModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
}

function abrirModal() {
  const modal = document.getElementById('checkoutModal');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
}

/**
 * Abre la reserva.
 * @param {string|number|null} roomId suite de origen; null = reserva global con selector de suite.
 * Con suite de origen, la suite queda fijada (no se puede cambiar dentro del modal).
 */
export function openCheckoutModal(roomId = null) {
  // Si hay una retención en curso, se retoma en vez de abrir otra.
  if (reservaActiva) {
    abrirModal();
    renderLiquidacion();
    return;
  }
  const rooms = deps.getRooms();
  const room = rooms.find(r => String(r.id) === String(roomId)) || null;
  const deco = getDecoSeleccionado();
  st = {
    roomId: room ? String(room.id) : String(rooms[0]?.id ?? ''),
    locked: !!room,
    duracion: 'SEIS_HORAS',
    fecha: hoyISO(),
    hora: null,
    horarios: [],
    cargando: false,
    errorHorarios: null,
    disponibilidad: {},       // roomId -> boolean, solo en modo global
    extras: deco ? [deco] : [],
    nombre: '',
    telefono: '',
    terminos: false,
    enviando: false,
    error: null,
    idemKey: nuevaClave()
  };
  abrirModal();
  renderFormulario();
  cargarHorarios();
}

function roomActual() {
  return deps.getRooms().find(r => String(r.id) === String(st.roomId));
}

async function cargarHorarios() {
  const duracion = DURACIONES.find(d => d.key === st.duracion);
  st.cargando = true;
  st.errorHorarios = null;
  renderHorarios();
  try {
    const horarios = await api.obtenerHorarios(st.roomId, st.fecha, duracion.horas);
    st.horarios = Array.isArray(horarios) ? horarios.map(h => ({ hora: String(h.hora).slice(0, 5), disponible: !!h.disponible })) : [];
    if (!st.horarios.some(h => h.hora === st.hora && h.disponible)) st.hora = null;
  } catch (err) {
    st.horarios = [];
    st.hora = null;
    st.errorHorarios = err?.status === 429
      ? 'Demasiadas consultas seguidas. Espera un momento.'
      : 'No pudimos consultar la disponibilidad. Revisa tu conexión.';
  }
  st.cargando = false;
  renderHorarios();
  actualizarResumen();
  if (!st.locked) cargarDisponibilidadSuites();
}

/** Modo global: marca en el selector qué suites están libres para el turno elegido. */
async function cargarDisponibilidadSuites() {
  if (!st.hora) { st.disponibilidad = {}; renderSelectorSuite(); return; }
  const duracion = DURACIONES.find(d => d.key === st.duracion);
  try {
    const catalogo = await api.obtenerHabitaciones(st.fecha, `${st.hora}:00`, duracion.horas);
    st.disponibilidad = Object.fromEntries((catalogo || []).map(h => [String(h.id), h.disponible !== false]));
  } catch {
    st.disponibilidad = {};
  }
  renderSelectorSuite();
}

function renderSelectorSuite() {
  const cont = document.getElementById('rsvSuite');
  if (!cont || !st) return;
  const room = roomActual();
  if (st.locked) {
    cont.innerHTML = `
      <div class="rsv-suite-locked">
        <img src="${esc(room?.imagen_url || '/images/suites/suite-presidencial.jpg')}" alt="" />
        <div>
          <span class="rsv-label">Suite seleccionada</span>
          <strong>${esc(room?.nombre)}</strong>
          <span class="rsv-muted">Tarifa base ${soles(precioBase(room))} · 6 horas</span>
        </div>
        <span class="rsv-lock" aria-label="Suite fijada">🔒</span>
      </div>`;
    return;
  }
  const rooms = deps.getRooms();
  const conDatos = Object.keys(st.disponibilidad).length > 0;
  cont.innerHTML = `
    <label class="rsv-label" for="rsvRoomSelect">Suite</label>
    <select id="rsvRoomSelect" class="rsv-select">
      ${rooms.map(r => {
        const libre = !conDatos || st.disponibilidad[String(r.id)] !== false;
        return `<option value="${esc(r.id)}" ${String(r.id) === st.roomId ? 'selected' : ''} ${libre ? '' : 'disabled'}>
          ${esc(r.nombre)} — ${soles(precioBase(r))}${libre ? '' : ' · ocupada en ese turno'}</option>`;
      }).join('')}
    </select>`;
  cont.querySelector('select').onchange = (e) => {
    st.roomId = e.target.value;
    renderDuraciones();
    cargarHorarios();
  };
}

function renderDuraciones() {
  const cont = document.getElementById('rsvDuraciones');
  if (!cont) return;
  const room = roomActual();
  cont.innerHTML = DURACIONES.map(d => `
    <button type="button" class="rsv-chip ${st.duracion === d.key ? 'active' : ''}" data-dur="${d.key}" role="radio" aria-checked="${st.duracion === d.key}">
      <span class="rsv-chip-title">${d.label}</span>
      <span class="rsv-chip-sub">${soles(tarifa(room, d.key))}</span>
    </button>`).join('');
  cont.querySelectorAll('[data-dur]').forEach(b => b.onclick = () => {
    st.duracion = b.dataset.dur;
    renderDuraciones();
    cargarHorarios();
  });
}

function renderHorarios() {
  const cont = document.getElementById('rsvHorarios');
  if (!cont) return;
  if (st.cargando) {
    cont.innerHTML = '<p class="rsv-muted rsv-loading"><span class="rsv-spinner"></span> Consultando disponibilidad…</p>';
    return;
  }
  if (st.errorHorarios) {
    cont.innerHTML = `<p class="rsv-alert">${esc(st.errorHorarios)}</p>`;
    return;
  }
  const libres = st.horarios.filter(h => h.disponible);
  if (libres.length === 0) {
    cont.innerHTML = '<p class="rsv-muted">No quedan turnos libres para esta suite en esa fecha. Prueba otro día u otra duración.</p>';
    return;
  }
  cont.innerHTML = `<div class="rsv-slots">${st.horarios.map(h => `
    <button type="button" class="rsv-slot ${st.hora === h.hora ? 'active' : ''}" data-hora="${h.hora}" ${h.disponible ? '' : 'disabled aria-disabled="true" title="Ocupado"'}>
      ${h.hora}
    </button>`).join('')}</div>`;
  cont.querySelectorAll('[data-hora]:not([disabled])').forEach(b => b.onclick = () => {
    st.hora = b.dataset.hora;
    renderHorarios();
    actualizarResumen();
    if (!st.locked) cargarDisponibilidadSuites();
  });
}

function renderExtras() {
  const cont = document.getElementById('rsvExtras');
  if (!cont) return;
  const card = (e) => {
    const sel = st.extras.includes(e.id);
    return `
      <button type="button" class="rsv-extra ${sel ? 'selected' : ''}" data-extra="${e.id}" aria-pressed="${sel}">
        <span class="rsv-extra-row"><span class="rsv-extra-name">${esc(e.name)}</span><span class="rsv-extra-price">+${soles(e.price)}</span></span>
        <span class="rsv-extra-desc">${esc(e.desc)}</span>
        <span class="rsv-extra-state">${sel ? '✓ Incluido' : '+ Agregar'}</span>
      </button>`;
  };
  cont.innerHTML = `
    <span class="rsv-sublabel">Decoración (una por suite)</span>
    <div class="rsv-extras-grid">${EXTRAS.filter(e => e.deco).map(card).join('')}</div>
    <span class="rsv-sublabel">Adicionales</span>
    <div class="rsv-extras-grid">${EXTRAS.filter(e => !e.deco).map(card).join('')}</div>`;
  cont.querySelectorAll('[data-extra]').forEach(b => b.onclick = () => {
    const extra = EXTRAS.find(e => e.id === b.dataset.extra);
    if (st.extras.includes(extra.id)) {
      st.extras = st.extras.filter(id => id !== extra.id);
      if (extra.deco) setDecoSeleccionado(null);
    } else {
      if (extra.deco) st.extras = st.extras.filter(id => !EXTRAS.find(e => e.id === id)?.deco);
      st.extras.push(extra.id);
      if (extra.deco) setDecoSeleccionado(extra.id);
    }
    renderExtras();
    actualizarResumen();
  });
}

function actualizarResumen() {
  const room = roomActual();
  if (!room || !st) return;
  const total = totalDe(room, st.duracion, st.extras);
  const dur = DURACIONES.find(d => d.key === st.duracion);
  const detalle = document.getElementById('rsvResumenDetalle');
  if (detalle) {
    const extras = st.extras.map(id => EXTRAS.find(e => e.id === id)?.name).filter(Boolean);
    detalle.textContent = `${room.nombre} · ${dur.label} · ${st.hora ? `${fechaLarga(st.fecha)}, ${st.hora}` : 'elige un turno'}${extras.length ? ` · ${extras.join(', ')}` : ''}`;
  }
  const totalEl = document.getElementById('rsvTotal');
  if (totalEl) totalEl.textContent = soles(total);
  const btn = document.getElementById('rsvSubmit');
  if (btn && !st.enviando) {
    btn.textContent = `CONFIRMAR RESERVA — ${soles(total)}`;
    const listo = st.hora && st.terminos;
    btn.disabled = !listo;
    btn.title = !st.hora ? 'Elige un turno de llegada' : (!st.terminos ? 'Acepta el reglamento para continuar' : '');
  }
}

function renderFormulario() {
  const body = document.getElementById('checkoutModalBody');
  if (!body) return;
  body.innerHTML = `
    <header class="rsv-header">
      <span class="rsv-kicker">Reserva privada · Hotel Wimbledon</span>
      <h2 class="rsv-title">Reserva tu suite</h2>
      <ol class="rsv-steps" aria-label="Pasos de la reserva">
        <li class="active">Selección</li><li>Personalización</li><li>Abono</li>
      </ol>
    </header>

    <form id="rsvForm" novalidate>
      <section class="rsv-section" aria-labelledby="rsvPaso1">
        <h3 id="rsvPaso1" class="rsv-section-title"><span>01</span> Suite, fecha y horario</h3>
        <div id="rsvSuite" class="rsv-field"></div>
        <div class="rsv-field">
          <span class="rsv-label">Duración</span>
          <div id="rsvDuraciones" class="rsv-chips" role="radiogroup" aria-label="Duración"></div>
        </div>
        <div class="rsv-field">
          <label class="rsv-label" for="rsvFecha">Fecha de llegada</label>
          <input type="date" id="rsvFecha" class="rsv-input" value="${st.fecha}" min="${hoyISO()}" max="${maxISO()}" required />
          <span class="rsv-hint">Puedes reservar desde hoy hasta ${DIAS_MAX} días después.</span>
        </div>
        <div class="rsv-field">
          <span class="rsv-label">Hora de llegada</span>
          <div id="rsvHorarios"></div>
        </div>
      </section>

      <section class="rsv-section" aria-labelledby="rsvPaso2">
        <h3 id="rsvPaso2" class="rsv-section-title"><span>02</span> Personaliza tu estadía <em>(opcional)</em></h3>
        <div id="rsvExtras"></div>
      </section>

      <section class="rsv-section" aria-labelledby="rsvPaso3">
        <h3 id="rsvPaso3" class="rsv-section-title"><span>03</span> Tus datos</h3>
        <div class="rsv-grid-2">
          <div class="rsv-field">
            <label class="rsv-label" for="rsvNombre">Nombre o alias</label>
            <input type="text" id="rsvNombre" class="rsv-input" maxlength="150" autocomplete="off" required />
          </div>
          <div class="rsv-field">
            <label class="rsv-label" for="rsvTelefono">Celular</label>
            <input type="tel" id="rsvTelefono" class="rsv-input" inputmode="numeric" maxlength="9" pattern="9[0-9]{8}" placeholder="9XXXXXXXX" required />
            <span class="rsv-hint">Te enviaremos el código de reserva y los datos de pago.</span>
          </div>
        </div>
        <label class="rsv-terms">
          <input type="checkbox" id="checkoutTermsAgree" />
          <span>He leído y acepto el <button type="button" id="rsvVerReglamento" class="rsv-link">reglamento del hotel</button>.
          Al llegar presentaré mi DNI en recepción, como exige la ley.</span>
        </label>
      </section>

      <div class="rsv-summary">
        <div>
          <span class="rsv-label">Total a depositar</span>
          <p id="rsvResumenDetalle" class="rsv-muted"></p>
        </div>
        <strong id="rsvTotal" class="rsv-total"></strong>
      </div>
      <p class="rsv-hold-note">Al confirmar, tu suite queda retenida <strong>15 minutos</strong> mientras realizas el abono por Yape, Plin o transferencia.</p>
      <p id="rsvError" class="rsv-alert" role="alert" hidden></p>
      <button type="submit" id="rsvSubmit" class="rsv-btn-primary" disabled>CONFIRMAR RESERVA</button>
    </form>`;

  renderSelectorSuite();
  renderDuraciones();
  renderExtras();
  renderHorarios();
  actualizarResumen();

  const fecha = document.getElementById('rsvFecha');
  fecha.onchange = () => {
    const v = fecha.value;
    if (!v || v < hoyISO() || v > maxISO()) { fecha.value = st.fecha; return; }
    st.fecha = v;
    st.hora = null;
    cargarHorarios();
  };
  const nombre = document.getElementById('rsvNombre');
  const tel = document.getElementById('rsvTelefono');
  nombre.value = st.nombre;
  tel.value = st.telefono;
  nombre.oninput = () => { st.nombre = nombre.value; };
  tel.oninput = () => { tel.value = tel.value.replace(/\D/g, ''); st.telefono = tel.value; };
  const chk = document.getElementById('checkoutTermsAgree');
  chk.checked = st.terminos;
  chk.onchange = () => { st.terminos = chk.checked; actualizarResumen(); };
  document.getElementById('rsvVerReglamento').onclick = () => deps.openTerms();
  document.getElementById('rsvForm').onsubmit = enviar;
}

function mostrarError(msg) {
  const el = document.getElementById('rsvError');
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
}

async function enviar(e) {
  e.preventDefault();
  if (st.enviando) return;
  mostrarError('');
  const nombre = st.nombre.trim();
  if (!st.hora) return mostrarError('Elige un turno de llegada.');
  if (!nombre) return mostrarError('Indica un nombre o alias.');
  if (!/^9\d{8}$/.test(st.telefono)) return mostrarError('Ingresa un celular válido de 9 dígitos que empiece con 9.');
  if (!st.terminos) return mostrarError('Acepta el reglamento para continuar.');

  // Bloqueo inmediato contra doble clic; la clave de idempotencia cubre los reintentos de red.
  st.enviando = true;
  const btn = document.getElementById('rsvSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="rsv-spinner"></span> Reservando…';

  try {
    const reserva = await api.crearReserva({
      habitacionId: Number(st.roomId),
      fecha: st.fecha,
      horaIngreso: `${st.hora}:00`,
      nombreCompleto: nombre,
      telefono: st.telefono,
      modalidad: st.duracion,
      extras: st.extras
    }, st.idemKey);
    reservaActiva = { ...reserva, duracionLabel: DURACIONES.find(d => d.key === st.duracion).label };
    setDecoSeleccionado(null);
    renderLiquidacion();
  } catch (err) {
    st.enviando = false;
    actualizarResumen();
    const msg = err?.data?.mensaje || err?.message || 'No pudimos registrar tu reserva. Inténtalo de nuevo.';
    mostrarError(err?.status === 429 ? 'Demasiados intentos seguidos. Espera un minuto e inténtalo otra vez.' : msg);
    // El turno pudo ocuparse mientras se llenaba el formulario.
    if (err?.status === 400 || err?.status === 409) cargarHorarios();
  }
}

// ── Paso 3: liquidación con retención de 15 minutos ───────────────────────
async function obtenerDatosPago() {
  if (datosPago) return datosPago;
  try { datosPago = { ...PAGO_DEFAULT, ...(await api.obtenerDatosPago()) }; } catch { datosPago = PAGO_DEFAULT; }
  return datosPago;
}

function copiable(valor, etiqueta) {
  const pendiente = !valor || /pendiente/i.test(valor);
  return `<span class="rsv-copy-row">
      <code>${pendiente ? 'Por confirmar' : esc(valor)}</code>
      ${pendiente ? '' : `<button type="button" class="rsv-copy" data-copy="${esc(valor)}" aria-label="Copiar ${esc(etiqueta)}">Copiar</button>`}
    </span>`;
}

async function renderLiquidacion() {
  const body = document.getElementById('checkoutModalBody');
  if (!body || !reservaActiva) return;
  const r = reservaActiva;
  const pago = await obtenerDatosPago();
  const monto = Number(r.montoTotal).toFixed(2);
  const fecha = fechaLarga(r.fecha);
  const hora = String(r.horaIngreso).slice(0, 5);
  const wa = `https://wa.me/${pago.whatsapp}?text=${encodeURIComponent(
    `Hola Hotel Wimbledon, adjunto el comprobante de mi reserva ${r.codigo}: ${r.habitacion.nombre}, ${fecha} a las ${hora}. Monto: S/ ${monto}.`)}`;

  body.innerHTML = `
    <header class="rsv-header">
      <span class="rsv-kicker">Reserva temporal · ${pago.minutosRetencion} minutos de retención</span>
      <h2 class="rsv-title">Tu suite está apartada</h2>
      <ol class="rsv-steps"><li class="done">Selección</li><li class="done">Personalización</li><li class="active">Abono</li></ol>
    </header>

    <div class="rsv-countdown" role="timer" aria-live="off">
      <span id="rsvCountdown" class="rsv-countdown-time">--:--</span>
      <span class="rsv-muted">Tu suite estará reservada durante los próximos ${pago.minutosRetencion} minutos mientras completas tu transferencia.</span>
    </div>

    <div class="rsv-hold-box">
      <p>Para confirmar tu reserva de forma inmediata y confidencial, realiza el abono por <strong>Yape, Plin o transferencia bancaria</strong> y comparte tu comprobante por WhatsApp.</p>
      <dl class="rsv-pay-list">
        <div><dt>Monto exacto</dt><dd>${copiable(monto, 'monto')}</dd></div>
        <div><dt>Código de reserva</dt><dd>${copiable(r.codigo, 'código')}</dd></div>
        <div><dt>Yape / Plin</dt><dd>${copiable(pago.yapePlin, 'número Yape/Plin')} <span class="rsv-muted">${esc(pago.titular)}</span></dd></div>
        ${pago.cuentas.map(c => `
          <div><dt>${esc(c.banco)}</dt><dd>${copiable(c.numero, `cuenta ${c.banco}`)}${c.cci && !/pendiente/i.test(c.cci) ? `<span class="rsv-muted">CCI</span>${copiable(c.cci, `CCI ${c.banco}`)}` : ''}</dd></div>`).join('')}
      </dl>
    </div>

    <div class="rsv-summary">
      <div>
        <span class="rsv-label">${esc(r.habitacion.nombre)}</span>
        <p class="rsv-muted">${fecha}, ${hora} · ${esc(r.duracionLabel)}${r.extras?.length ? ` · ${r.extras.map(esc).join(', ')}` : ''}</p>
      </div>
      <strong class="rsv-total">S/ ${monto}</strong>
    </div>

    <a href="${wa}" target="_blank" rel="noopener" class="rsv-btn-primary rsv-btn-wa">ENVIAR COMPROBANTE POR WHATSAPP</a>
    <p class="rsv-muted rsv-center">Al llegar, presenta tu DNI en recepción e indica tu código.</p>
    <button type="button" id="rsvCancelar" class="rsv-link rsv-center-block">Cancelar esta reserva</button>`;

  body.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = 'Copiado';
      setTimeout(() => { b.textContent = 'Copiar'; }, 1600);
    } catch { deps.toast('No se pudo copiar; selecciónalo manualmente.'); }
  });
  document.getElementById('rsvCancelar').onclick = cancelarReserva;
  iniciarCuentaRegresiva();
}

function iniciarCuentaRegresiva() {
  clearInterval(countdownTimer);
  if (!reservaActiva) return;
  if (!reservaActiva.venceEn) {
    reservaActiva.venceEn = Date.now() + (Number(reservaActiva.segundosRestantes) || 0) * 1000;
  }
  const tick = () => {
    const restante = Math.max(0, Math.round((reservaActiva.venceEn - Date.now()) / 1000));
    const el = document.getElementById('rsvCountdown');
    if (el) {
      el.textContent = `${pad(Math.floor(restante / 60))}:${pad(restante % 60)}`;
      el.classList.toggle('urgent', restante <= 120);
    }
    if (restante <= 0) {
      clearInterval(countdownTimer);
      expirar();
    }
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function expirar() {
  const r = reservaActiva;
  reservaActiva = null;
  const body = document.getElementById('checkoutModalBody');
  if (!body) return;
  abrirModal();
  body.innerHTML = `
    <div class="rsv-expired">
      <span class="rsv-kicker">Tiempo agotado</span>
      <h2 class="rsv-title">La retención de tu suite expiró</h2>
      <p class="rsv-muted">No recibimos el comprobante de la reserva ${esc(r?.codigo)} dentro de los 15 minutos, así que la suite volvió a estar disponible.
      Si ya hiciste el abono, escríbenos por WhatsApp con tu comprobante y lo revisamos.</p>
      <button type="button" id="rsvReintentar" class="rsv-btn-primary">ELEGIR UN NUEVO HORARIO</button>
    </div>`;
  document.getElementById('rsvReintentar').onclick = () => openCheckoutModal(r?.habitacion?.id ?? null);
}

async function cancelarReserva() {
  if (!reservaActiva) return;
  const btn = document.getElementById('rsvCancelar');
  btn.disabled = true;
  try {
    await api.cancelarReservaPendiente(reservaActiva.id, reservaActiva.qrToken);
    clearInterval(countdownTimer);
    deps.toast(`Reserva ${reservaActiva.codigo} cancelada. La suite quedó libre.`);
    reservaActiva = null;
    cerrarModal();
  } catch (err) {
    btn.disabled = false;
    deps.toast(err?.message || 'No se pudo cancelar. Escríbenos por WhatsApp.');
  }
}
