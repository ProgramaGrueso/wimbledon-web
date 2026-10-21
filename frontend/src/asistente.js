import api from './services/api.js';

/**
 * Asistente flotante del hotel: una carita que abre un chat con el agente de negocio.
 * Los mensajes se pintan con textContent (nunca innerHTML) para que nada de lo que
 * escriba el usuario o el modelo pueda inyectar HTML.
 */

const MAX_CARACTERES = 500;
const MAX_HISTORIAL = 12;
const CLAVE_SESION = 'wimbledon_asistente';
const SALUDO = 'Hola, soy la asistente del Hotel Wimbledon. Te ayudo con habitaciones, precios y reservas. ¿Qué necesitas?';

let historial = [];
let enviando = false;
let panel, lista, caja, boton;

function cargarHistorial() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || '[]');
    if (Array.isArray(guardado)) historial = guardado.slice(-MAX_HISTORIAL);
  } catch { historial = []; }
}

function guardarHistorial() {
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(historial)); } catch { /* sin almacenamiento */ }
}

function burbuja(rol, texto) {
  const el = document.createElement('div');
  el.className = `asistente__msg asistente__msg--${rol}`;
  el.textContent = texto;
  lista.appendChild(el);
  lista.scrollTop = lista.scrollHeight;
  return el;
}

async function enviar() {
  const texto = caja.value.trim();
  if (!texto || enviando) return;

  enviando = true;
  caja.value = '';
  burbuja('user', texto);
  historial.push({ rol: 'user', contenido: texto });
  historial = historial.slice(-MAX_HISTORIAL);

  const escribiendo = burbuja('assistant', 'Escribiendo…');
  escribiendo.classList.add('asistente__msg--pendiente');

  try {
    const { respuesta } = await api.chatIa(historial);
    escribiendo.textContent = respuesta;
    historial.push({ rol: 'assistant', contenido: respuesta });
  } catch (err) {
    escribiendo.textContent = err.message || 'No pude responder ahora. Intenta de nuevo.';
    escribiendo.classList.add('asistente__msg--error');
    historial.pop(); // el mensaje sin respuesta no se reenvía
  } finally {
    escribiendo.classList.remove('asistente__msg--pendiente');
    historial = historial.slice(-MAX_HISTORIAL);
    guardarHistorial();
    enviando = false;
    lista.scrollTop = lista.scrollHeight;
    caja.focus();
  }
}

function alternar(abrir) {
  const abierto = abrir ?? panel.hidden;
  panel.hidden = !abierto;
  boton.setAttribute('aria-expanded', String(abierto));
  boton.classList.toggle('asistente__boton--abierto', abierto);
  if (abierto) caja.focus();
}

/**
 * La carita se anima en una mini-pagina aparte (/cara/avatar.html) para no mezclar su WebGL con el sitio.
 * La imagen estatica queda debajo: es lo que se ve mientras carga, sin WebGL2 o con movimiento reducido.
 * El iframe no recibe el mouse (pointer-events: none), asi que le pasamos la posicion del cursor.
 */
function animarCara(contenedor) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const marco = document.createElement('iframe');
  marco.className = 'asistente__cara';
  marco.title = '';
  marco.setAttribute('aria-hidden', 'true');
  marco.tabIndex = -1;
  contenedor.appendChild(marco);

  let cuadro = 0, ultimo = null;
  const enviar = () => {
    cuadro = 0;
    const r = marco.getBoundingClientRect();
    marco.contentWindow?.postMessage({ t: 'p', x: ultimo.clientX - r.left, y: ultimo.clientY - r.top }, location.origin);
  };
  addEventListener('pointermove', e => {
    ultimo = e;
    if (!cuadro) cuadro = requestAnimationFrame(enviar);
  }, { passive: true });

  // se carga despues de la pagina para no competir con lo importante
  const cargar = () => { marco.src = '/cara/avatar.html'; };
  if (document.readyState === 'complete') setTimeout(cargar, 600);
  else addEventListener('load', () => setTimeout(cargar, 600), { once: true });
}

export function initAsistente() {
  if (document.getElementById('asistente')) return;
  cargarHistorial();

  const raiz = document.createElement('div');
  raiz.id = 'asistente';
  raiz.className = 'asistente';

  boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'asistente__boton';
  boton.setAttribute('aria-label', 'Abrir asistente del hotel');
  boton.setAttribute('aria-expanded', 'false');
  const foto = document.createElement('img');
  foto.src = '/images/asistente.webp';
  foto.alt = '';
  foto.width = 120;
  foto.height = 120;
  boton.appendChild(foto);
  animarCara(boton);

  panel = document.createElement('section');
  panel.className = 'asistente__panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Chat con el asistente del hotel');

  const cabecera = document.createElement('header');
  cabecera.className = 'asistente__cabecera';
  const titulo = document.createElement('span');
  titulo.textContent = 'Asistente Wimbledon';
  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'asistente__cerrar';
  cerrar.setAttribute('aria-label', 'Cerrar chat');
  cerrar.textContent = '✕';
  cabecera.append(titulo, cerrar);

  lista = document.createElement('div');
  lista.className = 'asistente__lista';
  lista.setAttribute('aria-live', 'polite');

  const formulario = document.createElement('form');
  formulario.className = 'asistente__form';
  caja = document.createElement('input');
  caja.type = 'text';
  caja.maxLength = MAX_CARACTERES;
  caja.placeholder = 'Escribe tu consulta…';
  caja.autocomplete = 'off';
  caja.setAttribute('aria-label', 'Tu mensaje');
  const enviarBtn = document.createElement('button');
  enviarBtn.type = 'submit';
  enviarBtn.textContent = 'Enviar';
  formulario.append(caja, enviarBtn);

  panel.append(cabecera, lista, formulario);
  raiz.append(panel, boton);
  document.body.appendChild(raiz);

  burbuja('assistant', SALUDO);
  historial.forEach(m => burbuja(m.rol, m.contenido));

  boton.addEventListener('click', () => alternar());
  cerrar.addEventListener('click', () => alternar(false));
  formulario.addEventListener('submit', e => { e.preventDefault(); enviar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) alternar(false); });
}
