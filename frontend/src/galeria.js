/**
 * Visor de fotos a pantalla completa: flechas, teclado (← → Esc) y deslizamiento táctil.
 */
let visor = null;
let fotos = [];
let indice = 0;
let inicioToque = null;

function crearVisor() {
  visor = document.createElement('div');
  visor.className = 'lux-lightbox';
  visor.setAttribute('role', 'dialog');
  visor.setAttribute('aria-modal', 'true');
  visor.setAttribute('aria-label', 'Galería de la suite');
  visor.setAttribute('data-lenis-prevent', '');
  visor.innerHTML = `
    <button type="button" class="lux-lightbox-close" aria-label="Cerrar galería">✕</button>
    <button type="button" class="lux-lightbox-nav prev" aria-label="Foto anterior">❮</button>
    <figure class="lux-lightbox-figure"><img alt="" /><figcaption></figcaption></figure>
    <button type="button" class="lux-lightbox-nav next" aria-label="Foto siguiente">❯</button>`;
  document.body.appendChild(visor);

  visor.querySelector('.lux-lightbox-close').onclick = cerrarGaleria;
  visor.querySelector('.prev').onclick = () => mover(-1);
  visor.querySelector('.next').onclick = () => mover(1);
  visor.addEventListener('click', (e) => { if (e.target === visor) cerrarGaleria(); });
  visor.addEventListener('touchstart', (e) => { inicioToque = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener('touchend', (e) => {
    if (inicioToque === null) return;
    const delta = e.changedTouches[0].clientX - inicioToque;
    if (Math.abs(delta) > 40) mover(delta < 0 ? 1 : -1);
    inicioToque = null;
  });
  document.addEventListener('keydown', (e) => {
    if (!visor.classList.contains('open')) return;
    if (e.key === 'Escape') cerrarGaleria();
    if (e.key === 'ArrowRight') mover(1);
    if (e.key === 'ArrowLeft') mover(-1);
  });
}

function pintar() {
  const img = visor.querySelector('img');
  img.classList.remove('visible');
  img.onload = () => img.classList.add('visible');
  img.src = fotos[indice].src;
  img.alt = fotos[indice].alt;
  visor.querySelector('figcaption').textContent = `${indice + 1} / ${fotos.length}`;
  const multiples = fotos.length > 1;
  visor.querySelectorAll('.lux-lightbox-nav').forEach(b => { b.hidden = !multiples; });
}

function mover(paso) {
  indice = (indice + paso + fotos.length) % fotos.length;
  pintar();
}

export function abrirGaleria(listaFotos, desde = 0) {
  if (!listaFotos?.length) return;
  if (!visor) crearVisor();
  fotos = listaFotos;
  indice = desde;
  pintar();
  visor.classList.add('open');
  visor.querySelector('.lux-lightbox-close').focus();
}

export function cerrarGaleria() {
  visor?.classList.remove('open');
}
