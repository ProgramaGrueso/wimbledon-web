const SPOTS = [
  { id: 'spot-halloween', tag: 'SPOT HALLOWEEN', titulo: 'Halloween', sub: '31 de octubre • disfraz de cortesía' },
  { id: 'spot-cumple', tag: 'SPOT CUMPLEAÑOS', titulo: 'Cumpleaños 50%', sub: '50% de descuento • todo noviembre 2026 • DNI' },
  { id: 'spot-disfraces', tag: 'SPOT DISFRACES', titulo: 'Alquila tu disfraz', sub: 'Alquila o compra en el hotel' },
];

/**
 * Selector de spots promocionales: miniaturas con vista previa al pasar el cursor
 * que cambian el video principal de la tarjeta de promoción.
 */
export function initSpots() {
  const video = document.getElementById('promoVideo');
  const tira = document.getElementById('promoSpots');
  if (!video || !tira) return;
  const tag = document.getElementById('promoSpotTag');
  const titulo = document.getElementById('promoSpotTitle');
  const sub = document.getElementById('promoSpotSub');

  tira.innerHTML = SPOTS.map((s, i) => `
    <button type="button" class="promo-spot${i === 0 ? ' activo' : ''}" data-i="${i}" aria-label="Ver ${s.titulo}">
      <img src="/video/${s.id}-poster.jpg" alt="" loading="lazy" />
      <video muted loop playsinline preload="none" src="/video/${s.id}.mp4"></video>
      <span>${s.titulo}</span>
    </button>`).join('');

  const botones = [...tira.children];
  botones.forEach((btn) => {
    const preview = btn.querySelector('video');
    btn.addEventListener('pointerenter', () => preview.play().catch(() => {}));
    btn.addEventListener('pointerleave', () => { preview.pause(); preview.currentTime = 0; });
    btn.addEventListener('click', () => {
      const s = SPOTS[btn.dataset.i];
      botones.forEach((b) => b.classList.toggle('activo', b === btn));
      tag.textContent = s.tag;
      titulo.textContent = s.titulo;
      sub.textContent = s.sub;
      video.poster = `/video/${s.id}-poster.jpg`;
      video.querySelector('source[type="video/webm"]').src = `/video/${s.id}.webm`;
      video.querySelector('source[type="video/mp4"]').src = `/video/${s.id}.mp4`;
      video.load();
      video.play().catch(() => {});
    });
  });
}
