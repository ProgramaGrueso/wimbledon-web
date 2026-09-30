/**
 * Cursor de Halloween: Maxwell the Cat (meme) girando y balanceándose, siguiendo al mouse.
 * El sprite es un WebP animado recortado del video en pantalla verde del meme
 * (proyecto educativo, sin uso comercial).
 *
 * Los navegadores no animan el cursor nativo (un GIF en `cursor:` queda quieto), así que
 * se oculta el nativo y se dibuja el gato en un elemento fijo. Solo con mouse real:
 * en pantallas táctiles no existe cursor y no se activa. Con "reducir movimiento"
 * se usa un cuadro fijo. Sobre campos de texto vuelve el cursor de texto nativo.
 */
const TEXTO = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]';
const CLICABLE = 'a, button, [role="button"], label, summary, .js-open-drawer, .rsv-slot, .rsv-chip, .rsv-extra';

export function initCursorGato() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const el = document.createElement('div');
  el.className = 'cat-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="cat-cursor__sway"><div class="cat-cursor__spin"></div></div>';
  document.body.appendChild(el);
  document.documentElement.classList.add('has-cat-cursor');

  let x = -100, y = -100, pendiente = false;
  const pintar = () => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    pendiente = false;
  };

  document.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    el.classList.add('visible');
    const destino = e.target instanceof Element ? e.target : null;
    el.classList.toggle('sobre-texto', !!destino?.closest(TEXTO));
    el.classList.toggle('sobre-enlace', !!destino?.closest(CLICABLE));
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(pintar);
    }
  }, { passive: true });

  document.addEventListener('mousedown', () => el.classList.add('click'));
  document.addEventListener('mouseup', () => el.classList.remove('click'));
  document.documentElement.addEventListener('mouseleave', () => el.classList.remove('visible'));
}
