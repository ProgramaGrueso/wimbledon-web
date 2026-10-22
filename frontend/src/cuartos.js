/**
 * Galería de cuartos: tarjetas llave en un carrusel con el cuarto central como foco.
 * Flechas del teclado, clic, botones o deslizamiento para moverse; Enter o clic en el central abre la habitación.
 */
const pad = (n) => String(n).padStart(2, '0');

export function initCuartos({ seccion, rooms, specs, filtros, coincide, abrir, reservar }) {
  let lista = rooms;
  let actual = 0;
  let inicioToque = null;

  seccion.innerHTML = `
    <div class="cuartos-crt" aria-hidden="true"></div>
    <div class="cuartos-hud cuartos-hud-top">
      <span>HOTEL WIMBLEDON</span>
      <span class="cuartos-reloj">00:00:00</span>
      <span class="cuartos-total"></span>
    </div>
    <div class="cuartos-titulo">
      <span class="editorial-tag text-gold">COLECCIÓN EXCLUSIVA DE SUITES</span>
      <h2 class="editorial-headline">Nuestras habitaciones</h2>
    </div>
    <div class="cuartos-filtros">
      ${filtros.map((f) => `<button type="button" class="cuartos-filtro" data-filtro="${f.key}">${f.label} (${rooms.filter((r) => coincide(r, f.key)).length})</button>`).join('')}
    </div>
    <div class="cuartos-escenario" role="listbox" aria-label="Habitaciones del hotel"></div>
    <button type="button" class="cuartos-flecha prev" aria-label="Habitación anterior">❮</button>
    <button type="button" class="cuartos-flecha next" aria-label="Habitación siguiente">❯</button>
    <div class="cuartos-info" aria-live="polite">
      <span class="cuartos-info-num"></span>
      <strong class="cuartos-info-nombre"></strong>
      <p class="cuartos-info-equipo"></p>
      <div class="cuartos-acciones">
        <button type="button" class="cuartos-abrir">VER HABITACIÓN</button>
        <button type="button" class="cuartos-reservar">RESERVAR</button>
      </div>
    </div>
    <div class="cuartos-hud cuartos-hud-pie">
      <button type="button" class="cuartos-bn" aria-pressed="false">B&amp;N [OFF]</button>
      <span class="cuartos-ayuda">← → para moverte · Enter para abrir</span>
    </div>`;

  const escenario = seccion.querySelector('.cuartos-escenario');
  const botonesFiltro = [...seccion.querySelectorAll('.cuartos-filtro')];
  const num = seccion.querySelector('.cuartos-info-num');
  const nombre = seccion.querySelector('.cuartos-info-nombre');
  const equipo = seccion.querySelector('.cuartos-info-equipo');
  const reloj = seccion.querySelector('.cuartos-reloj');
  const bn = seccion.querySelector('.cuartos-bn');
  let cards = [];

  function pintar() {
    cards.forEach((card, i) => {
      let d = i - actual;
      if (d > lista.length / 2) d -= lista.length;
      if (d < -lista.length / 2) d += lista.length;
      const a = Math.abs(d);
      card.style.setProperty('--d', d);
      card.style.setProperty('--a', Math.min(a, 3));
      card.style.zIndex = 10 - a;
      card.classList.toggle('activa', d === 0);
      card.classList.toggle('oculta', a > 2);
      card.tabIndex = d === 0 ? 0 : -1;
      card.setAttribute('aria-selected', d === 0);
    });
    const r = lista[actual];
    num.textContent = `HAB. ${pad(actual + 1)} / ${pad(lista.length)} · ${r.precio}`;
    nombre.textContent = r.nombre;
    equipo.textContent = (specs[r.id]?.equipamiento || []).slice(0, 4).join(' • ');
  }

  function armar() {
    escenario.innerHTML = lista.map((r, i) => `
      <article class="cuarto-card" role="option" aria-label="${r.nombre}">
        <div class="cuarto-card-banda"><span>WIMBLEDON KEY</span><span>HAB. ${pad(i + 1)}</span></div>
        <img src="${r.imagen_url}" alt="${r.nombre}" loading="lazy" decoding="async" draggable="false" />
        <div class="cuarto-card-pie">
          <h3>${r.nombre}</h3>
          <span class="cuarto-card-precio">${r.precio}</span>
        </div>
      </article>`).join('');
    cards = [...escenario.children];
    cards.forEach((card, i) => {
      card.onclick = () => (i === actual ? abrir(lista[i].id) : ((actual = i), pintar()));
    });
    seccion.querySelector('.cuartos-total').textContent = `SUITES ${pad(lista.length)}`;
    pintar();
  }

  function filtrar(key) {
    lista = rooms.filter((r) => coincide(r, key));
    actual = 0;
    botonesFiltro.forEach((b) => b.classList.toggle('active', b.dataset.filtro === key));
    armar();
  }

  function ir(paso) {
    actual = (actual + paso + lista.length) % lista.length;
    pintar();
  }

  botonesFiltro.forEach((b) => { b.onclick = () => filtrar(b.dataset.filtro); });
  seccion.querySelector('.prev').onclick = () => ir(-1);
  seccion.querySelector('.next').onclick = () => ir(1);
  seccion.querySelector('.cuartos-abrir').onclick = () => abrir(lista[actual].id);
  seccion.querySelector('.cuartos-reservar').onclick = () => reservar(lista[actual].id);
  bn.onclick = () => {
    const activo = seccion.classList.toggle('bn');
    bn.textContent = `B&N [${activo ? 'ON' : 'OFF'}]`;
    bn.setAttribute('aria-pressed', activo);
  };

  escenario.addEventListener('touchstart', (e) => { inicioToque = e.touches[0].clientX; }, { passive: true });
  escenario.addEventListener('touchend', (e) => {
    if (inicioToque === null) return;
    const delta = e.changedTouches[0].clientX - inicioToque;
    if (Math.abs(delta) > 40) ir(delta < 0 ? 1 : -1);
    inicioToque = null;
  });

  // El teclado y el reloj solo trabajan mientras la sección está a la vista
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.intersectionRatio > 0.4; }, { threshold: [0, 0.4, 1] }).observe(seccion);
  document.addEventListener('keydown', (e) => {
    if (!visible || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('#roomDrawer.open, .lux-lightbox.open')) return;
    if (e.key === 'ArrowRight') ir(1);
    else if (e.key === 'ArrowLeft') ir(-1);
    else if (e.key === 'Enter' && !e.target.closest('button, a')) abrir(lista[actual].id);
  });

  const t0 = Date.now();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      if (!visible || document.hidden) return;
      const s = Math.floor((Date.now() - t0) / 1000);
      reloj.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    }, 1000);
  }

  filtrar(filtros[0].key);
  return { filtrar };
}
