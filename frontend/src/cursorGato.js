/**
 * Cursor de Halloween: Maxwell the Cat (meme) girando y balanceándose, siguiendo al mouse.
 * El sprite es un WebP animado recortado del video en pantalla verde del meme
 * (proyecto educativo, sin uso comercial).
 *
 * Los navegadores no animan el cursor nativo (un GIF en `cursor:` queda quieto), así que
 * se oculta el nativo y se dibuja el gato en un elemento fijo. Solo con mouse real:
 * en pantallas táctiles no existe cursor y no se activa. Con "reducir movimiento"
 * se usa un cuadro fijo y sin estela. Sobre campos de texto vuelve el cursor de texto nativo.
 *
 * Extras: sigue con un resorte corto (el punto de clic sigue siendo el centro), se inclina
 * según la velocidad, deja una estela de brasas y suelta una ráfaga de chispas al hacer clic.
 */
const TEXTO = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]';
const CLICABLE = 'a, button, [role="button"], label, summary, .js-open-drawer, .rsv-slot, .rsv-chip, .rsv-extra, .js-rack-card';

export function initCursorGato() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (document.querySelector('.cat-cursor')) return;

  const calmado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'cat-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="cat-cursor__tilt"><div class="cat-cursor__sway"><div class="cat-cursor__spin"></div></div></div>';
  document.body.appendChild(el);
  const tilt = el.querySelector('.cat-cursor__tilt');
  document.documentElement.classList.add('has-cat-cursor');

  // Lienzo de la estela (brasas que se apagan)
  const lienzo = document.createElement('canvas');
  lienzo.className = 'cat-trail';
  lienzo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(lienzo);
  const ctx = lienzo.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ajustar = () => {
    lienzo.width = innerWidth * dpr;
    lienzo.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  ajustar();
  window.addEventListener('resize', ajustar, { passive: true });

  let objX = -200, objY = -200, x = -200, y = -200, vx = 0, vy = 0, ang = 0, visible = false;
  const chispas = [];
  const colores = ['255,170,60', '255,120,30', '190,120,255', '255,220,140'];

  const soltar = (px, py, n, fuerza, vida) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = Math.random() * fuerza;
      chispas.push({
        x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4,
        vida, max: vida, r: 1 + Math.random() * 2.2, c: colores[(Math.random() * colores.length) | 0],
      });
    }
  };

  let ultimo = performance.now();
  const bucle = (t) => {
    const dt = Math.min(48, t - ultimo) / 16.67;
    ultimo = t;
    // Seguimiento con resorte amortiguado: rápido para no estorbar al hacer clic
    const nx = x + (objX - x) * Math.min(1, 0.42 * dt);
    const ny = y + (objY - y) * Math.min(1, 0.42 * dt);
    vx = nx - x; vy = ny - y;
    x = nx; y = ny;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    // Inclinación según la velocidad horizontal, con retorno suave
    const meta = Math.max(-22, Math.min(22, vx * 1.6));
    ang += (meta - ang) * Math.min(1, 0.18 * dt);
    tilt.style.transform = `rotate(${ang.toFixed(2)}deg)`;

    if (!calmado) {
      const rapido = Math.hypot(vx, vy);
      if (visible && rapido > 1.2 && Math.random() < 0.7) soltar(x, y + 6, 1, 0.7, 34 + Math.random() * 22);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = chispas.length - 1; i >= 0; i--) {
        const p = chispas[i];
        p.vida -= dt;
        if (p.vida <= 0) { chispas.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.012 * dt; p.vx *= 0.985;
        const k = p.vida / p.max;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4 * k + 1);
        g.addColorStop(0, `rgba(${p.c},${(0.9 * k).toFixed(3)})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4 * k + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);

  document.addEventListener('mousemove', (e) => {
    if (!visible) { x = objX = e.clientX; y = objY = e.clientY; }
    objX = e.clientX;
    objY = e.clientY;
    visible = true;
    el.classList.add('visible');
    const destino = e.target instanceof Element ? e.target : null;
    el.classList.toggle('sobre-texto', !!destino?.closest(TEXTO));
    el.classList.toggle('sobre-enlace', !!destino?.closest(CLICABLE));
  }, { passive: true });

  document.addEventListener('mousedown', () => {
    el.classList.add('click');
    if (!calmado) soltar(objX, objY, 22, 4.2, 40);
  });
  document.addEventListener('mouseup', () => el.classList.remove('click'));
  document.documentElement.addEventListener('mouseleave', () => { visible = false; el.classList.remove('visible'); });
}
