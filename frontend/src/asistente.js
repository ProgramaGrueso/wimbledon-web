import api from './services/api.js';
import { scrollToSection } from './smoothScroll.js';
import { crearMicrofono, crearVoz, crearVozNavegador, vozDisponible, vozNavegadorDisponible } from './voz.js';

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
let marcoCara = null;   // iframe del avatar animado
let voz = null;         // voz del asistente (solo si el backend la tiene activa)
let altavozActivo = true;   // por defecto contesta con voz
let botonAltavoz = null;

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

const SECCIONES = [
  ['habitaciones', /habitaci|cuarto|suite/, 'las habitaciones'],
  ['promocion', /promo|oferta|navidad/, 'la promoción de Navidad'],
  ['gummy', /oso|gummy/, 'los ositos de Navidad'],
  ['parking', /parking|cochera|estacionamiento/, 'el parking'],
  ['decoraciones', /decoraci/, 'las decoraciones especiales'],
  ['experiencia', /servicio|amenidad|experiencia/, 'los servicios y amenidades'],
  ['gastronomia', /carta|gastronom|comida|restaurante/, 'la carta gastronómica'],
  ['testimonios', /testimonio|opinion|comentario/, 'los testimonios'],
  ['ubicacion', /ubicaci|contacto|direccion|mapa|donde queda/, 'la ubicación y contacto'],
  ['concepto', /concepto|el hotel|nosotros/, 'el concepto del hotel'],
];

const WHATSAPP = '51990370681';
let acciones = { habitaciones: () => [], abrirHabitacion() {}, reservar() {} };

const limpiar = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Habitación citada en el texto: gana el nombre más largo que aparezca completo; si no, la de más palabras en común. */
function habitacionCitada(t) {
  let mejor = null;
  for (const h of acciones.habitaciones()) {
    const nombre = limpiar(h.nombre || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    if (!nombre) continue;
    const palabras = nombre.split(' ').filter((p) => p.length > 4 && p !== 'suite' && p !== 'habitacion');
    const puntos = t.includes(nombre) ? 100 + nombre.length : palabras.filter((p) => t.includes(p)).length * 10 - nombre.length / 100;
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { h, puntos };
  }
  return mejor?.h || null;
}

/** "8 pm", "20:00", "a las 9 de la noche" → "HH:00" (las horas libres van de 08:00 a 23:00). */
function horaCitada(t) {
  const m = t.match(/(?:a las|las)?\s*(\d{1,2})(?::(\d{2}))?\s*(pm|am|de la (?:noche|tarde|manana)|horas)?/);
  if (!m || !/\d/.test(t)) return null;
  let h = Number(m[1]);
  const tarde = /pm|noche|tarde/.test(m[3] || '') || (/noche|tarde|pm/.test(t) && !/am|manana/.test(t));
  if (h < 8 && h >= 1) h += 12;
  else if (tarde && h < 12) h += 12;
  return h >= 8 && h <= 23 ? String(h).padStart(2, '0') + ':00' : null;
}

/** Órdenes habladas o escritas que la página resuelve sola. Devuelve {texto, ejecutar, enlace?} o null (→ responde el asistente). */
function interpretar(texto) {
  const t = limpiar(texto);
  if (t.length > 80) return null;

  if (/whatsapp|hablar con (una )?persona|asesor|recepcionista|humano/.test(t)) {
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quisiera información del Hotel Wimbledon.')}`;
    return { texto: 'Claro, aquí puedes escribirle a una persona del hotel por WhatsApp.', enlace: { url, etiqueta: 'Abrir WhatsApp' }, ejecutar() {} };
  }

  if (/\b(abre|abrir|abreme|muestra|muestrame|cierra|cerrar|oculta)\b.*\bmenu\b|\bmenu\b.*\b(abre|abrir|cierra|cerrar)\b/.test(t)) {
    const cerrar = /cierra|cerrar|oculta/.test(t);
    return {
      texto: cerrar ? 'Listo, cerré el menú.' : 'Listo, abrí el menú.',
      ejecutar() { document.getElementById(cerrar ? 'luxuryDrawerClose' : 'btnSandwichToggle')?.click(); },
    };
  }

  const habitacion = habitacionCitada(t);
  if (habitacion && /\b(reserva|reservar|reservame|alquilar|alquilo|quiero la|quiero el|me quedo)\b/.test(t)) {
    const hora = horaCitada(t);
    const dias = /pasado manana/.test(t) ? 2 : /manana/.test(t) && !/de la manana/.test(t) ? 1 : 0;
    const duracion = /pernocte|toda la noche|12 horas|doce horas/.test(t) ? 'DOCE_HORAS' : /\b3 horas|tres horas/.test(t) ? 'TRES_HORAS' : /\b6 horas|seis horas/.test(t) ? 'SEIS_HORAS' : undefined;
    const cuando = dias === 1 ? ' para mañana' : dias === 2 ? ' para pasado mañana' : '';
    return {
      texto: `Perfecto, abrí la reserva de ${habitacion.nombre}${cuando}${hora ? ` a las ${hora}` : ''}. Revisa los datos y completa tu nombre y teléfono.`,
      ejecutar() { acciones.reservar(habitacion.id, { hora, dias, duracion }); },
    };
  }

  if (!/\b(ve|ven|vamos|ir|ver|llevame|llevanos|muestrame|ensename|bajame|abre|abreme|quiero ver)\b/.test(t)) return null;
  if (/horario|precio|fecha|reserv|disponib|cuanto|cuesta|hay\b/.test(t)) return null; // eso lo responde el asistente

  if (habitacion) {
    return { texto: `Claro, te muestro ${habitacion.nombre}.`, ejecutar() { acciones.abrirHabitacion(habitacion.id); } };
  }
  const seccion = SECCIONES.find(([, patron]) => patron.test(t));
  return seccion ? { texto: `Claro, te llevo a ${seccion[2]}.`, ejecutar() { scrollToSection(seccion[0]); } } : null;
}

async function enviar() {
  const texto = caja.value.trim();
  if (!texto || enviando) return;

  const orden = interpretar(texto);
  if (orden) {
    caja.value = '';
    burbuja('user', texto);
    const msg = burbuja('assistant', orden.texto);
    if (orden.enlace) {
      const a = document.createElement('a');
      a.href = orden.enlace.url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ` ${orden.enlace.etiqueta}`;
      msg.appendChild(a);
    }
    orden.ejecutar();
    if (voz && altavozActivo) voz.decir(orden.texto, voz.empezar());
    return;
  }

  enviando = true;
  caja.value = '';
  burbuja('user', texto);
  historial.push({ rol: 'user', contenido: texto });
  historial = historial.slice(-MAX_HISTORIAL);

  const escribiendo = burbuja('assistant', 'Escribiendo…');
  escribiendo.classList.add('asistente__msg--pendiente');
  const turnoVoz = voz && altavozActivo ? voz.empezar() : null;

  try {
    const { respuesta } = await api.chatIa(historial);
    escribiendo.textContent = respuesta;
    historial.push({ rol: 'assistant', contenido: respuesta });
    if (turnoVoz) voz.decir(respuesta, turnoVoz);
  } catch (err) {
    escribiendo.textContent = err.message || 'No pude responder ahora. Intenta de nuevo.';
    escribiendo.classList.add('asistente__msg--error');
    historial.pop(); // el mensaje sin respuesta no se reenvía
    if (turnoVoz) voz.fallo(turnoVoz);
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
  marcoCara = marco;
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

function avatarHablando(hablando) {
  marcoCara?.contentWindow?.postMessage({ t: 'voz', hablando }, location.origin);
}

/** Botones de micrófono y altavoz. Voz del navegador (es-CO, instantánea); si no hay, la del backend si está activa. */
async function prepararVoz(cabecera, formulario) {
  if (vozNavegadorDisponible()) voz = crearVozNavegador({ alHablar: avatarHablando });
  else if (await vozDisponible()) voz = crearVoz({ alHablar: avatarHablando });
  else return;

  botonAltavoz = document.createElement('button');
  botonAltavoz.type = 'button';
  botonAltavoz.className = 'asistente__altavoz';
  const pintarAltavoz = () => {
    botonAltavoz.textContent = altavozActivo ? '🔊' : '🔇';
    botonAltavoz.setAttribute('aria-pressed', String(altavozActivo));
    botonAltavoz.setAttribute('aria-label', altavozActivo ? 'Silenciar la voz del asistente' : 'Activar la voz del asistente');
  };
  pintarAltavoz();
  botonAltavoz.addEventListener('click', () => {
    altavozActivo = !altavozActivo;
    if (!altavozActivo) voz.cortar();
    pintarAltavoz();
  });
  cabecera.insertBefore(botonAltavoz, cabecera.lastChild);

  const microfono = crearMicrofono({
    alTexto: (texto) => {
      altavozActivo = true; pintarAltavoz();   // si hablas, te contesta con voz
      caja.value = texto;
      enviar();
    },
    alEstado: (escuchando) => botonMic?.classList.toggle('asistente__mic--escuchando', escuchando),
  });
  let botonMic = null;
  if (microfono) {
    botonMic = document.createElement('button');
    botonMic.type = 'button';
    botonMic.className = 'asistente__mic';
    botonMic.textContent = '🎤';
    botonMic.setAttribute('aria-label', 'Hablar con el asistente');
    botonMic.addEventListener('click', () => { voz.cortar(); microfono.alternar(); });
    formulario.insertBefore(botonMic, caja);
  }
}

export function initAsistente(accionesPagina = {}) {
  acciones = { ...acciones, ...accionesPagina };
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

  prepararVoz(cabecera, formulario);
  burbuja('assistant', SALUDO);
  historial.forEach(m => burbuja(m.rol, m.contenido));

  boton.addEventListener('click', () => alternar());
  cerrar.addEventListener('click', () => alternar(false));
  formulario.addEventListener('submit', e => { e.preventDefault(); enviar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) alternar(false); });
}
