/**
 * Voz del asistente: frases de relleno (para tapar la espera), respuesta hablada por frases y micrófono.
 * Todo es opcional: si el backend no tiene la voz activa o el navegador no soporta el micrófono,
 * simplemente no se muestran los botones y el chat sigue en texto.
 */

const RELLENOS = ['/voz/r1.wav', '/voz/r2.wav', '/voz/r3.wav', '/voz/r4.wav'];
const MAX_FRASES = 1;       // solo se habla el comienzo de la respuesta (la voz es lenta de generar, ~3x más lenta que tiempo real)
const MAX_CARACTERES = 200; // por frase hablada

// Baraja: suenan todas antes de repetir y nunca la misma dos veces seguidas.
let baraja = [];
let ultimoRelleno = null;
function siguienteRelleno() {
  if (!baraja.length) {
    baraja = [...RELLENOS].sort(() => Math.random() - 0.5);
    if (baraja[baraja.length - 1] === ultimoRelleno) baraja.unshift(baraja.pop());
  }
  ultimoRelleno = baraja.pop();
  return ultimoRelleno;
}

export async function vozDisponible() {
  try {
    const r = await fetch('/api/ia/voz/estado');
    return r.ok && (await r.json()).activa === true;
  } catch { return false; }
}

/** Quita markdown y emojis y parte el texto en frases cortas para hablarlas una a una. */
function trocear(texto) {
  const limpio = texto
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const frases = [];
  for (const parte of limpio.split(/(?<=[.!?…:])\s+/)) {
    const p = parte.trim();
    if (!p) continue;
    const ultima = frases[frases.length - 1];
    if (ultima && ultima.length < 40 && (ultima + ' ' + p).length <= MAX_CARACTERES) frases[frases.length - 1] = ultima + ' ' + p;
    else frases.push(p.slice(0, MAX_CARACTERES));
    if (frases.length > MAX_FRASES) break;
  }
  return frases.slice(0, MAX_FRASES);
}

export function crearVoz({ alHablar }) {
  let turnoActual = 0;
  let sonando = null;

  const reproducir = (src) => new Promise((resolver) => {
    const audio = new Audio(src);
    sonando = audio;
    audio.onended = audio.onerror = () => resolver();
    audio.play().catch(resolver);
  });

  async function pedir(texto) {
    const r = await fetch('/api/ia/voz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
    if (!r.ok) throw new Error(String(r.status));
    return URL.createObjectURL(await r.blob());
  }

  function cortar() {
    turnoActual++;
    if (sonando) { sonando.pause(); sonando = null; }
    alHablar(false);
  }

  return {
    cortar,
    /** Al enviar el mensaje: suena una frase de relleno mientras el asistente piensa. */
    empezar() {
      cortar();
      const id = turnoActual;
      alHablar(true);
      const relleno = reproducir(siguienteRelleno());
      return { id, relleno };
    },
    /** Cuando llega la respuesta: se genera y se reproduce frase por frase, esperando a que acabe el relleno. */
    async decir(texto, turno) {
      if (!turno || turno.id !== turnoActual) return;
      let cadena = Promise.resolve();
      const cola = trocear(texto).map((frase) => {
        cadena = cadena.then(() => (turno.id === turnoActual ? pedir(frase).catch(() => null) : null));
        return cadena;
      });
      await turno.relleno;
      for (const pendiente of cola) {
        const url = await pendiente;
        if (turno.id !== turnoActual) return;
        if (url) await reproducir(url);
      }
      if (turno.id === turnoActual) { sonando = null; alHablar(false); }
    },
    /** Si no hay respuesta (error), solo se corta el relleno. */
    fallo(turno) { if (turno && turno.id === turnoActual) cortar(); },
  };
}

/** Micrófono con el reconocimiento de voz del navegador (Chrome/Edge/Safari). Devuelve null si no existe. */
export function crearMicrofono({ alTexto, alEstado }) {
  const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reconocedor) return null;
  const rec = new Reconocedor();
  rec.lang = 'es-PE';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let activo = false;
  rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript?.trim(); if (t) alTexto(t); };
  rec.onend = () => { activo = false; alEstado(false); };
  rec.onerror = () => { activo = false; alEstado(false); };
  return {
    alternar() {
      if (activo) { rec.stop(); return; }
      try { rec.start(); activo = true; alEstado(true); } catch { /* ya estaba escuchando */ }
    },
  };
}
