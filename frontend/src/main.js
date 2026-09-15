import { initSmoothScroll, initHeroPinAnimation, initServicesHoverAnimation, initHorizontalSuitesScroll, refreshHorizontalSuitesScroll, initMagneticButton } from './smoothScroll.js';
import { generateQRCodeSVG } from './qrGenerator.js';

let landingData = null;
let roomsData = [];
let figmaData = null;
let specsData = {};
let cleanupSmoothScroll = null;
let heroMatchMedia = null;
let horizontalSuitesMatchMedia = null;

let catalogViewMode = 'cinematic'; // 'cinematic' or 'grid'
let currentAmenityFilter = 'all';
let currentGastroTab = 'gourmet';

const AVAILABLE_EXTRAS = [
  { id: 'deco', name: 'Pack Romántico Exclusivo', price: 60, desc: 'Pétalos de rosa, velas LED, bombones & bouquet' },
  { id: 'champagne', name: 'Cava Helada / Champagne', price: 75, desc: 'Botella servida en hielera de acero con 2 copas' },
  { id: 'piqueo', name: 'Piqueo Gourmet Wimbledon', price: 42, desc: 'Tequeños crocantes, alitas barbecue & salsas' },
  { id: 'spa-kit', name: 'Kit Spa & Aromaterapia', price: 35, desc: 'Sales de jacuzzi, esencias relajantes & batas de lujo' }
];

const GASTRO_CATEGORIES = {
  gourmet: [
    { nombre: "Fetuccini al Alfredo", precio: "S/ 24.00", desc: "Pasta artesanal en cremosa salsa Alfredo con jamón inglés y parmesano.", img: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Lomo Saltado Tradicional", precio: "S/ 28.00", desc: "Trozos de lomo fino salteados al wok con cebolla, tomate criollo y papas doradas.", img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Bisteck a lo Pobre", precio: "S/ 28.00", desc: "Filete jugoso con plátano frito, huevos montados, arroz y papas crocantes.", img: "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Milanesa Napolitana con Pesto", precio: "S/ 28.00", desc: "Milanesa gratinada con pomodoro y mozzarella, servida con pasta al pesto.", img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Suprema de Pollo Dorada", precio: "S/ 24.00", desc: "Pechuga en panko fino, servida con papas fritas y ensalada fresca.", img: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600&auto=format&fit=crop" }
  ],
  fast: [
    { nombre: "Signature Wimbledon Cheeseburger", precio: "S/ 24.00", desc: "Doble carne smash, cheddar fundido, tocino y salsa secreta en brioche.", img: "https://wimbledon-hotel.com/wp-content/uploads/2025/10/hamburguesa-smash.png" },
    { nombre: "Piqueo Premium Wimbledon", precio: "S/ 48.00", desc: "Tequeños con queso, alitas barbecue, chicharrón de pollo y guacamole.", img: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Club Sandwich Tradicional", precio: "S/ 22.00", desc: "Tres niveles con pollo deshilachado, tocino, jamón, huevo y vegetales frescos.", img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Tequeños con Queso (12 unid.)", precio: "S/ 18.00", desc: "Wantanes crocantes rellenos de queso fundente con salsa guacamole fresca.", img: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=600&auto=format&fit=crop" }
  ],
  bar: [
    { nombre: "Pisco Sour Catedral", precio: "S/ 22.00", desc: "Pisco Quebranta premium, limón criollo, jarabe y amargo de angostura.", img: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Chilcano de Pisco Frutal", precio: "S/ 20.00", desc: "Pisco seleccionado, ginger ale helada, gotas de lima y frutos del bosque.", img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Champagne Riccadonna Asti", precio: "S/ 75.00", desc: "Espumante italiano dulce y afrutado, servido en hielera con copas flauta.", img: "https://images.unsplash.com/photo-1569919659476-f0852f6834b7?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Whisky Chivas Regal 12 Años", precio: "S/ 180.00", desc: "Blended Scotch Whisky escocés servido en vaso roca con hielo premium.", img: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?q=80&w=600&auto=format&fit=crop" }
  ],
  minibar: [
    { nombre: "Pack Íntimo Sensitivo Durex", precio: "S/ 25.00", desc: "Preservativos ultrafinos + gel lubricante íntimo a base de agua.", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Energy Red Bull Helada", precio: "S/ 14.00", desc: "Bebida energizante servida fría para revitalizar tu estadía.", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Cerveza Corona Extra (Pack x2)", precio: "S/ 20.00", desc: "Cervezas importadas servidas con limón en hielera privada.", img: "https://images.unsplash.com/photo-1608270546103-9799276d4350?q=80&w=600&auto=format&fit=crop" },
    { nombre: "Chocolates Finos Ferrero Rocher", precio: "S/ 24.00", desc: "Caja de bombones con avellana entera bañada en chocolate.", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?q=80&w=600&auto=format&fit=crop" }
  ]
};

let checkoutState = {
  roomId: null,
  duration: '6 Horas', 
  arrivalTime: 'En 30 min', 
  customTime: '',
  paymentMethod: 'yape', 
  customerName: '',
  customerPhone: '',
  selectedExtras: []
};
function parseAmenitiesText(desc) {
  const text = (desc || '').toLowerCase();
  const amenities = [];
  if (text.includes('cama redonda')) amenities.push('Cama Redonda');
  else if (text.includes('king')) amenities.push('Cama King Size');
  else if (text.includes('queen')) amenities.push('Cama Queen Size');
  else amenities.push('Cama Confort 100%');
  if (text.includes('jacuzzi')) amenities.push('Jacuzzi Privado');
  if (text.includes('cámara seca') || text.includes('camara seca')) amenities.push('Cámara Seca / Sauna');
  if (text.includes('pole dance')) amenities.push('Pole Dance');
  if (text.includes('tántrico') || text.includes('tantrico')) amenities.push('Sillón Tántrico');
  if (text.includes('ducha española')) amenities.push('Ducha Española');
  if (text.includes('vista al mar')) amenities.push('Vista al Océano');
  if (text.includes('frigobar') || text.includes('frigo bar')) amenities.push('Frigobar Gourmet');
  return amenities;
}
function getRoomCategory(room) {
  const title = (room.nombre || '').toLowerCase();
  const desc = (room.descripcion || '').toLowerCase();
  if (title.includes('presidencial') || desc.includes('presidencial')) return 'presidencial';
  if (desc.includes('cámara seca') || desc.includes('camara seca') || title.includes('cámara seca')) return 'camara-seca';
  if (desc.includes('jacuzzi') || title.includes('jacuzzi')) return 'jacuzzi';
  if (desc.includes('vista al mar') || title.includes('vista al mar')) return 'vista-mar';
  return 'tematica';
}

function roomMatchesFilter(room, filterKey) {
  if (!filterKey || filterKey === 'all') return true;
  const title = (room.nombre || '').toLowerCase();
  const desc = (room.descripcion || '').toLowerCase();
  const cat = (room.categoria_nombre || '').toLowerCase();

  if (filterKey === 'presidencial') {
    return title.includes('presidencial') || desc.includes('presidencial') || cat.includes('presidencial');
  }
  if (filterKey === 'camara-seca') {
    return desc.includes('cámara seca') || desc.includes('camara seca') || title.includes('cámara seca') || desc.includes('sauna');
  }
  if (filterKey === 'jacuzzi') {
    return desc.includes('jacuzzi') || title.includes('jacuzzi');
  }
  if (filterKey === 'vista-mar') {
    return desc.includes('vista al mar') || title.includes('vista al mar') || desc.includes('mar');
  }
  return true;
}

function calculateTotalWithExtras(basePrice, duration, selectedExtras = []) {
  let subtotal = calculateDynamicPrice(basePrice, duration);
  selectedExtras.forEach(extraId => {
    const extra = AVAILABLE_EXTRAS.find(e => e.id === extraId);
    if (extra) subtotal += extra.price;
  });
  return subtotal;
}
function parseBasePrice(priceStr) {
  if (!priceStr) return 150;
  const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) || num <= 0 ? 150 : num;
}
function calculateDynamicPrice(basePrice, duration) {
  if (duration === '3 Horas') {
    return Math.round(basePrice * 0.70);
  } else if (duration === 'Toda la Noche') {
    return Math.round(basePrice * 1.60);
  }
  return basePrice; 
}
async function initApp() {
  try {
    const [resLanding, resRooms, resFigma, resSpecs] = await Promise.all([
      fetch('/data/landing_real.json').then(r => r.json()),
      fetch('/data/catalogo_habitaciones.json').then(r => r.json()),
      fetch('/data/figma_catalogo.json').then(r => r.json()),
      fetch('/data/specs_habitaciones.json').then(r => r.json())
    ]);
    landingData = resLanding.landing_page || resLanding;
    roomsData = resRooms;
    figmaData = resFigma;
    specsData = resSpecs;
    renderEditorialApp();
    cleanupSmoothScroll = initSmoothScroll();
    heroMatchMedia = initHeroPinAnimation();
    initServicesHoverAnimation();
    horizontalSuitesMatchMedia = initHorizontalSuitesScroll();
    initMagneticButton('#btnHeaderReserve');
    initMagneticButton('#btnHeroReserve');
    setupIntersectionObserver();
    setupHeaderScroll();
    setupMobileNav();
    setupDrawerModalStaticListeners();
    setupCheckoutModalListeners();
    setupMyBookingListeners();
    setupCatalogControls();
    setupGastroTabs();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    document.getElementById('app').innerHTML = `
      <div style="padding: 160px 3rem; text-align: center;">
        <h2 style="font-family: var(--font-serif); font-size: 3rem;">WIMBLEDON</h2>
        <p style="margin-top: 1rem; color: #888;">Cargando archivos de catálogo...</p>
      </div>
    `;
  }
}
function renderEditorialApp() {
  const hero = landingData.hero || {};
  const contacto = landingData.contacto_real || {};
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <!-- HERO PIN CONTAINER (150VH WITH GSAP PIN + CLIP-PATH EXPAND) -->
    <div id="heroPinWrapper" class="hero-pin-wrapper">
      <section id="hero" class="hero-editorial-pinned">
        <div id="heroCardMedia" class="hero-card-media">
          <img 
            src="https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg" 
            alt="Hotel Wimbledon Presidencial Suite" 
            class="hero-img-media" 
          />
          <div class="hero-media-overlay"></div>
        </div>
        <div id="heroEditorialContent" class="hero-editorial-content">
          <span class="hero-editorial-tag">HOTEL WIMBLEDON</span>
          <h1 class="hero-editorial-title">
            Privacidad, Confort <span class="hero-title-sub">& Discreción frente al Mar</span>
          </h1>
          <p class="hero-editorial-desc">
            Planifica tu estadía con nosotros, contamos con habitaciones de lujo, habitaciones temáticas, estacionamiento directo a algunas habitaciones, nuestra carta de comidas y bebidas que complementan tu visita.
          </p>
          <div class="hero-meta-bar">
            <div class="hero-meta-item">Av. Costanera 2098 • San Miguel, Lima</div>
            <div class="hero-meta-item">Servicio Privado 24/7</div>
            <div class="hero-meta-item">Tel: 578-6000</div>
          </div>
          <div class="hero-actions-row">
            <a href="#habitaciones" class="btn-hero-primary">EXPLORAR SUITES</a>
            <button id="btnHeroReserve" class="btn-hero-secondary">RESERVA INMEDIATA</button>
          </div>
        </div>
      </section>
    </div>
    <!-- EDITORIAL CONCEPT SECTION WITH VIDEO BACKGROUND -->
    <section id="concepto" class="section-editorial section-video-bg">
      <div class="video-bg-container">
        <video autoplay loop muted playsinline class="video-bg-media">
          <source src="/video/MiniMax_H3_00017_.webm" type="video/webm" />
        </video>
        <div class="video-bg-overlay"></div>
      </div>
      <div class="editorial-container relative-z">
        <div class="concepto-video-content reveal">
          <span class="editorial-tag text-gold">EL CONCEPTO WIMBLEDON</span>
          <h2 class="concepto-editorial-text text-white">
            "Hotel Wimbledon fusiona lo tradicional y lo imaginativo a través de sus más de 130 habitaciones preparadas para el máximo placer e intimidad."
          </h2>
          <p class="concepto-body-text text-light">
            Ubicados estratégicamente en la Avenida Costanera en San Miguel, brindamos una experiencia multisensorial con absoluto hermetismo. Nuestras suites ejecutivas y presidenciales cuentan con acabados finos, equipamiento especial como Cámara Seca, Ducha Española, Pole Dance y Jacuzzi con Hidromasaje.
          </p>
          <div style="margin-top: 3.5rem;">
            <a href="#habitaciones" class="btn-editorial-light">EXPLORAR LA COLECCIÓN</a>
          </div>
        </div>
      </div>
    </section>
    <!-- SECCIÓN PROMOCIÓN EDITORIAL CON VIDEO EN TAMAÑO ORIGINAL (608x352) -->
    <section id="promocion" class="section-editorial section-promo bg-black">
      <div class="editorial-container">
        <div class="promo-grid">
          <!-- Columna Información de Promoción -->
          <div class="promo-info-col reveal">
            <span class="editorial-tag text-gold">PROMOCIÓN ESPECIAL</span>
            <h2 class="editorial-headline text-white promo-title">
              Momentos Inolvidables, <br/><span class="promo-title-sub">Tarifas Exclusivas</span>
            </h2>
            <p class="promo-editorial-desc text-light">
              Aprovecha nuestras promociones y tarifas preferenciales de temporada en Hotel Wimbledon. Diseñadas para brindarte privacidad absoluta, confort superior y el mejor equipamiento en San Miguel, frente al mar.
            </p>
            <div class="promo-perks-list">
              <div class="promo-perk-item">
                <span class="promo-perk-bullet">✦</span>
                <div>
                  <h4 class="promo-perk-title">Estadías por Horas o Noche Completa</h4>
                  <p class="promo-perk-desc">Flexibilidad total de 3 horas, 6 horas o pernocte con servicio privado 24/7.</p>
                </div>
              </div>
              <div class="promo-perk-item">
                <span class="promo-perk-bullet">✦</span>
                <div>
                  <h4 class="promo-perk-title">Suites Temáticas & Jacuzzi con Hidromasaje</h4>
                  <p class="promo-perk-desc">Cámara seca, pole dance, cama giratoria y acabados de lujo para cada ocasión.</p>
                </div>
              </div>
              <div class="promo-perk-item">
                <span class="promo-perk-bullet">✦</span>
                <div>
                  <h4 class="promo-perk-title">Discreción y Cochera Privada</h4>
                  <p class="promo-perk-desc">Ingreso directo a habitaciones seleccionadas con máxima reserva y discreción.</p>
                </div>
              </div>
            </div>
            <div class="promo-actions-row">
              <a href="#reserva" class="btn-hero-primary">RESERVAR PROMOCIÓN</a>
              <a href="#habitaciones" class="btn-hero-secondary">EXPLORAR SUITES</a>
            </div>
          </div>

          <!-- Columna Video a Tamaño Original (608 x 352) -->
          <div class="promo-video-col reveal">
            <div class="promo-video-card">
              <div class="promo-video-header">
                <div class="promo-tag-pill">
                  <span class="promo-pulse-dot"></span>
                  <span>SPOT PROMOCIONAL</span>
                </div>
                <span class="promo-badge-tag">HOTEL WIMBLEDON</span>
              </div>
              <div class="promo-video-viewport">
                <video 
                  id="promoVideo" 
                  class="promo-video-media" 
                  width="608" 
                  height="352" 
                  controls 
                  autoplay 
                  muted 
                  loop 
                  playsinline 
                  preload="metadata"
                >
                  <source src="/video/promo.mp4" type="video/mp4" />
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
              <div class="promo-video-footer">
                <div class="promo-video-meta">
                  <span class="promo-video-title">Hotel & Suites Wimbledon</span>
                  <span class="promo-video-sub">Av. Costanera 2098 • San Miguel, Lima</span>
                </div>
                <button id="promoAudioToggle" class="promo-audio-btn" type="button" aria-label="Activar o silenciar sonido">
                  <span id="promoAudioIcon">🔇</span>
                  <span id="promoAudioText">Activar Audio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- SECCIÓN COLECCIÓN DE SUITES (INTERACTIVA CON SELECTOR DE MODO Y FILTROS) -->
    <section id="habitaciones" class="section-editorial" style="background: #060911; padding-top: 5rem; padding-bottom: 3rem; border-top: 1px solid rgba(255,255,255,0.08); position: relative;">
      <div class="editorial-container" style="padding-bottom: 1rem;">
        <div class="suites-horizontal-header" style="text-align: center; margin-bottom: 2rem;">
          <span class="editorial-tag text-gold">COLECCIÓN EXCLUSIVA DE AUTOR</span>
          <h2 class="editorial-headline" style="color: var(--color-white); margin-top: 0.5rem;">Nuestras 16 Suites Temáticas</h2>
          <p style="color: #94a3b8; max-width: 720px; margin: 0.75rem auto 0; font-size: 0.95rem; line-height: 1.6;">
            Espacios concebidos para la intimidad más exigente y discreta frente al mar en San Miguel. Disfruta de jacuzzi con hidromasaje, sauna privado y cochera directa a tu habitación.
          </p>
        </div>

        <!-- CONTROLES MODERNOS: SELECTOR DE MODO (CINEMÁTICO VS GRID) Y FILTROS DE AMENIDADES -->
        <div class="catalog-controls-bar">
          <div class="view-mode-toggle">
            <button id="btnViewCinematic" class="view-toggle-btn active">✦ Vista Cinemática</button>
            <button id="btnViewGrid" class="view-toggle-btn">⊞ Explorador Grid</button>
          </div>
          <div class="amenity-filters-row" id="amenityFiltersRow">
            <button class="amenity-chip-btn active" data-filter="all">Todas (16)</button>
            <button class="amenity-chip-btn" data-filter="presidencial">Presidenciales (4)</button>
            <button class="amenity-chip-btn" data-filter="jacuzzi">Jacuzzi Privado (13)</button>
            <button class="amenity-chip-btn" data-filter="camara-seca">Cámara Seca (3)</button>
            <button class="amenity-chip-btn" data-filter="vista-mar">Vista al Mar (6)</button>
          </div>
        </div>
      </div>

      <!-- SECCIÓN HORIZONTAL SCROLL: NUESTRAS SUITES (GSAP PIN + PARALLAX INTERNO + SKEW) -->
      <div id="suitesHorizontalPinWrapper" class="suites-horizontal-wrapper">
        <section id="suitesHorizontalPinned" class="suites-horizontal-pinned">
          <div id="suitesHorizontalTrack" class="suites-horizontal-track">
            <!-- Inyectado dinámicamente -->
          </div>
        </section>
      </div>

      <!-- SECCIÓN GRID VIEW ALTERNATIVO CON AMBIENT GLOW Y DETALLES -->
      <div id="suitesGridSection" class="editorial-container view-mode-hidden" style="display: none; padding-bottom: 5rem; margin-top: 2rem;">
        <div id="suitesGridView" class="suites-grid-layout">
          <!-- Inyectado dinámicamente -->
        </div>
      </div>
    </section>
    <!-- EXPERIENCIA & SERVICIOS INTERACTIVOS (FLOATING IMAGE HOVER CURSOR) -->
    <section id="experiencia" class="section-editorial bg-black text-white">
      <!-- Elemento Flotante Fijo para Vista Previa Dinámica -->
      <div id="servicesHoverPreview" class="services-hover-preview" aria-hidden="true">
        <img id="servicesHoverImg" src="" alt="Vista previa de servicio" />
      </div>
      <div class="editorial-container">
        <div class="editorial-header-block reveal">
          <span class="editorial-tag">INSTALACIONES & EXPERIENCIA</span>
          <h2 class="editorial-headline" style="color: var(--color-white);">Servicios & Amenidades Exclusivas</h2>
        </div>
        <ul class="services-interactive-list">
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">01</span>
              <h3 class="service-title">Jacuzzi Privado & Spa</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Hidromasaje en Suite</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">02</span>
              <h3 class="service-title">Estacionamiento Privado Directo</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Discreción & Acceso 24/7</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">03</span>
              <h3 class="service-title">Bar & Mixología de Autor</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Licores & Cócteles Gourmet</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">04</span>
              <h3 class="service-title">Cámara Seca & Sauna Privado</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Bienestar & Desconexión</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">05</span>
              <h3 class="service-title">Room Service Gourmet 24/7</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Carta Directa a la Habitación</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
          <li class="service-item reveal" data-img="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop">
            <div class="service-left">
              <span class="service-num">06</span>
              <h3 class="service-title">Suites con Vista Panorámica</h3>
            </div>
            <div class="service-right">
              <span class="service-tagline">Frente al Océano Pacífico</span>
              <span class="service-arrow">→</span>
            </div>
          </li>
        </ul>
      </div>
    </section>
    <!-- GASTRONOMÍA EDITORIAL DE LUJO (4 CATEGORÍAS EN VIVO) -->
    <section id="gastronomia" class="section-editorial" style="background: #060911; border-top: 1px solid rgba(255,255,255,0.08); padding: 6rem 0;">
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; margin-bottom: 2.5rem;">
          <span class="editorial-tag text-gold">ROOM SERVICE 24 HORAS CON MÁXIMA DISCRECIÓN</span>
          <h2 class="editorial-headline" style="color: #ffffff; margin-top: 0.5rem;">Gastronomía, Coctelería & Minibar</h2>
          <p style="color: #94a3b8; max-width: 650px; margin: 0.75rem auto 0; font-size: 0.95rem; line-height: 1.6;">
            Disfruta de platos a la carta preparados al instante por nuestros chefs, selecta coctelería y servicio de bar directo a tu suite sin interrumpir tu intimidad.
          </p>
        </div>

        <!-- PESTAÑAS DE GASTRONOMÍA -->
        <div class="gastro-nav-tabs" id="gastroNavTabs">
          <button class="gastro-tab-btn active" data-gastro="gourmet">🍽️ Platos de Fondo (5)</button>
          <button class="gastro-tab-btn" data-gastro="fast">🍔 Piqueos & Burgers (4)</button>
          <button class="gastro-tab-btn" data-gastro="bar">🍸 Coctelería & Bar (4)</button>
          <button class="gastro-tab-btn" data-gastro="minibar">🍫 Minibar & Íntimo (4)</button>
        </div>

        <div class="gastro-grid" id="gastronomiaList">
          <!-- Dynamically Injected -->
        </div>
      </div>
    </section>
    <!-- RESERVA & UBICACIÓN EDITORIAL -->
    <section id="reserva" class="section-editorial bg-black">
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; max-width: 800px; margin-left: auto; margin-right: auto;">
          <span class="editorial-tag">DISPONIBILIDAD INMEDIATA</span>
          <h2 class="editorial-headline" style="color: var(--color-white);">Reservar una Suite & Ubicación</h2>
          <p style="color: #999999; margin-top: 1rem;">
            Selecciona la suite de tu preferencia para iniciar el proceso de checkout digital 100% privado y confirmar tu reserva de forma inmediata.
          </p>
        </div>
        <div class="reserva-grid-wrap reveal">
          <!-- Columna Izquierda: Formulario de Reserva (55%) -->
          <div class="reserva-form-col">
            <form id="editorialForm">
              <div class="editorial-form-grid">
                <div class="editorial-field">
                  <label class="editorial-label">Nombre Completo</label>
                  <input type="text" id="edName" class="editorial-input" placeholder="Tu nombre" required />
                </div>
                <div class="editorial-field">
                  <label class="editorial-label">Teléfono de Contacto</label>
                  <input type="tel" id="edPhone" class="editorial-input" placeholder="Ej. 990370681" required />
                </div>
                <div class="editorial-field">
                  <label class="editorial-label">Suite Seleccionada</label>
                  <select id="edRoom" class="editorial-select" required>
                    ${roomsData.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}
                  </select>
                </div>
                <div class="editorial-field">
                  <label class="editorial-label">Tiempo de Estadía</label>
                  <select id="edDuration" class="editorial-select">
                    <option value="3 Horas">Estadía por 3 Horas</option>
                    <option value="6 Horas" selected>Estadía por 6 Horas</option>
                    <option value="Toda la Noche">Toda la Noche</option>
                  </select>
                </div>
                <div class="editorial-field full">
                  <label class="editorial-label">Hora Estimada de Llegada</label>
                  <select id="edArrivalTime" class="editorial-select">
                    <option value="En 30 min">En 30 minutos</option>
                    <option value="20:00">20:00 hrs</option>
                    <option value="21:00">21:00 hrs</option>
                    <option value="22:00">22:00 hrs</option>
                    <option value="00:00">00:00 hrs</option>
                  </select>
                </div>
                <div class="editorial-field full" style="margin-top: 2rem; text-align: center;">
                  <button type="submit" class="btn-editorial-light" style="width: 100%; cursor: pointer;">
                    INICIAR RESERVA DIGITAL
                  </button>
                </div>
              </div>
            </form>
          </div>
          <!-- Columna Derecha: Mapa Oscuro Sticky (45%) -->
          <div class="reserva-map-col">
            <div class="reserva-map-sticky">
              <div class="reserva-map-header">
                <span class="editorial-tag text-gold">NUESTRA UBICACIÓN</span>
                <h3 class="reserva-map-title">Av. Costanera 2098</h3>
                <p class="reserva-map-sub">San Miguel, Lima • Estacionamiento Privado Directo las 24 Horas</p>
              </div>
              <div class="map-container">
                <iframe 
                  title="Ubicación Hotel Wimbledon"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.37340638531!2d-77.0945!3d-12.0864!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c963625f2ed9%3A0x88981f4a9bb540c4!2sAv.%20Costanera%202098%2C%20San%20Miguel%2015087!5e0!3m2!1ses!2spe!4v1700000000000!5m2!1ses!2spe" 
                  width="100%" 
                  height="450" 
                  style="border:0;" 
                  allowfullscreen="" 
                  loading="lazy" 
                  referrerpolicy="no-referrer-when-downgrade"
                  class="google-map-iframe"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- EDITORIAL FOOTER & LEGAL -->
    <footer class="editorial-footer">
      <div class="editorial-container">
        <div class="footer-brand-center">
          <img src="/images/logo.png" alt="Hotel Wimbledon" class="official-brand-logo-footer" />
        </div>
        <!-- Social Media Links -->
        <div class="footer-social-bar">
          <a href="https://www.facebook.com/Hotel.Wimbledon" target="_blank" rel="noopener noreferrer" class="social-link-editorial">FACEBOOK</a>
          <span class="social-dot">•</span>
          <a href="https://www.instagram.com/hotelwimbledon/" target="_blank" rel="noopener noreferrer" class="social-link-editorial">INSTAGRAM</a>
          <span class="social-dot">•</span>
          <a href="https://www.tiktok.com/@hotelwimbledon" target="_blank" rel="noopener noreferrer" class="social-link-editorial">TIKTOK</a>
        </div>
        <!-- Navigation Links -->
        <nav class="footer-nav-editorial">
          <a href="#hero">INICIO</a>
          <a href="#promocion">PROMOCIÓN</a>
          <a href="#habitaciones">HABITACIONES</a>
          <a href="#experiencia">SERVICIOS</a>
          <a href="#reserva">CONTACTANOS</a>
          <a href="https://wimbledon-hotel.com/politicas-y-restricciones/" target="_blank">POLÍTICAS Y RESTRICCIONES</a>
          <a href="https://wimbledon-hotel.com/codigo-etico/" target="_blank">CÓDIGO ÉTICO</a>
        </nav>
        <!-- Libro de Reclamaciones -->
        <div class="libro-reclamaciones-wrap">
          <a href="https://wimbledon-hotel.com/libro-de-reclamaciones/" target="_blank" rel="noopener noreferrer" class="libro-reclamaciones-btn">
            <div class="libro-icon">📖</div>
            <div class="libro-text">
              <span class="libro-title">LIBRO DE RECLAMACIONES</span>
              <span class="libro-sub">Conforme al Código de Protección al Consumidor</span>
            </div>
          </a>
        </div>
        <!-- Contact & Address Metadata Bar -->
        <div class="footer-meta-bottom">
          <p>Av. Costanera 2098, San Miguel (Cdra. 20 Av. La Paz) Lima, Perú | 578-6000 | +51 990 370 681 | reservas@wimbledon-hotel.com</p>
          <p style="margin-top: 0.75rem; color: #555;">&copy; ${new Date().getFullYear()} Hotel Wimbledon. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  `;
  renderSuitesList('all');
  renderGastronomiaList();
  setupFormHandler();
  setupPromoVideo();
}
const EDITORIAL_ROOM_COPY = {
  860: { num: "I", resumen: "Un santuario concebido para el descanso más exclusivo. Equipada con jacuzzi de hidromasaje, cámara seca y detalles de arquitectura sutil diseñados para una privacidad absoluta frente al mar." },
  528: { num: "II", resumen: "Una atmósfera de serenidad y confort elevado. Diseñada para aislar el ruido exterior y permitir que el tiempo transcurra a su propio ritmo en una velada íntima." },
  526: { num: "III", resumen: "Inspirada en el fluir del agua y la arquitectura sensorial. Un refugio espacioso con vista panorámica, sillón tántrico y iluminación tenue para el encuentro íntimo." },
  523: { num: "IV", resumen: "La máxima expresión del bienestar privado. Un espacio de relajación térmica integral que combina sauna seco, jacuzzi y acabados de lujo." },
  227: { num: "V", resumen: "Sombras elegantes y diseño envolvente. Una suite temática creada para explorar la intimidad en un ambiente de sofisticación sobria y misterio." },
  43:  { num: "VI", resumen: "Confort sobrio y funcionalidad discreta. Un refugio pensado para la conversación pausada y el descanso reparador en un entorno de calma total." },
  35:  { num: "VII", resumen: "Líneas puras y texturas reconfortantes. Equipamiento completo para una desconexión serena en el corazón de San Miguel." },
  33:  { num: "VIII", resumen: "Calidez botánica y ambientes amplios. Un refugio temático concebido para transportarse a un estado de relajación costera." },
  31:  { num: "IX", resumen: "La combinación perfecta entre sencillez y bienestar. Jacuzzi privado con sistema de hidromasaje en una atmósfera de absoluta privacidad." },
  29:  { num: "X", resumen: "Luz natural y la perspectiva ininterrumpida del océano Pacífico. Un entorno sereno para la contemplación del horizonte costero." },
  27:  { num: "XI", resumen: "Una velada concebida alrededor del agua y la calma. Jacuzzi privado, climatización regulada y texturas suaves para una estancia reconfortante." },
  24:  { num: "XII", resumen: "Armonía entre calor, vapor y privacidad. Un circuito de relajación privado en la intimidad de su suite." },
  22:  { num: "XIII", resumen: "Líneas fluidas y sobriedad táctil. Diseñada para brindar confort pleno y una atmósfera cálida durante su estadía." },
  20:  { num: "XIV", resumen: "Detalles delicados y ambientación acogedora. Un refugio pensado para la pausa y el encuentro íntimo sin interrupciones." },
  16:  { num: "XV", resumen: "Elegancia atemporal con el rumor del mar de fondo. Equipamiento de primera clase y vistas seleccionadas hacia la costa." },
  14:  { num: "XVI", resumen: "La cúspide de la hospitalidad discreta. Amplitud, jacuzzi con hidromasaje y vista privileged sobre la bahía de Lima." }
};
function renderSuitesList(filterCategory = 'all') {
  currentAmenityFilter = filterCategory;
  const trackContainer = document.getElementById('suitesHorizontalTrack');
  const gridContainer = document.getElementById('suitesGridView');

  const filtered = roomsData.filter(room => roomMatchesFilter(room, filterCategory));

  // 1. Render Track Cinemático Horizontal
  if (trackContainer) {
    if (filtered.length === 0) {
      trackContainer.innerHTML = `<div style="padding: 3rem; text-align: center; color: #94a3b8; width: 100%;">No hay suites disponibles con este filtro.</div>`;
    } else {
      trackContainer.innerHTML = filtered.map((room, index) => {
        const amenities = parseAmenitiesText(room.descripcion);
        const categoryName = room.categoria_nombre || 'Suite de Lujo';
        const priceDisplay = room.precio ? `${room.precio}` : 'S/ 150';
        return `
          <div class="suite-card-horizontal" data-id="${room.id}">
            <div class="suite-card-img-wrapper js-open-drawer" data-id="${room.id}" style="cursor: pointer;" title="Ver Ficha Técnica">
              <img src="${room.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg'}" alt="${room.nombre}" class="suite-card-img" loading="lazy" />
              <span class="suite-card-price-badge">${priceDisplay}</span>
            </div>
            <div class="suite-card-info">
              <div class="suite-card-meta-row">
                <span class="suite-card-num">${String(index + 1).padStart(2, '0')}</span>
                <span class="suite-card-category">— ${categoryName}</span>
              </div>
              <h3 class="suite-card-title">${room.nombre}</h3>
              <div class="suite-card-badges">
                ${amenities.slice(0, 3).map(a => `<span class="suite-badge">— ${a}</span>`).join('')}
              </div>
              <button class="btn-suite-card-reserve js-open-drawer" data-id="${room.id}">
                VER DETALLES & RESERVAR →
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Render Grid View Responsivo Alternativo
  if (gridContainer) {
    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div style="padding: 3rem; text-align: center; color: #94a3b8; grid-column: 1 / -1;">No hay suites disponibles con este filtro.</div>`;
    } else {
      gridContainer.innerHTML = filtered.map((room) => {
        const amenities = parseAmenitiesText(room.descripcion);
        const categoryName = room.categoria_nombre || 'Suite de Lujo';
        const priceDisplay = room.precio ? `${room.precio}` : 'S/ 150';
        const copyText = EDITORIAL_ROOM_COPY[room.id]?.resumen || room.resumen || room.descripcion || 'Confort de lujo y privacidad total.';
        return `
          <div class="suite-grid-card" data-id="${room.id}">
            <div class="suite-grid-img-wrap js-open-drawer" data-id="${room.id}" style="cursor: pointer;" title="Ver Ficha Técnica">
              <img src="${room.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg'}" alt="${room.nombre}" class="suite-grid-img" loading="lazy" />
              <span class="suite-grid-badge">${categoryName}</span>
              <span class="suite-grid-avail">
                <span class="avail-dot"></span>
                <span>Disponible Inmediato</span>
              </span>
            </div>
            <div class="suite-grid-body">
              <div class="suite-grid-header">
                <h3 class="suite-grid-title">${room.nombre}</h3>
                <span class="suite-grid-price">${priceDisplay}</span>
              </div>
              <p class="suite-grid-desc">${copyText}</p>
              <div class="suite-grid-amenities">
                ${amenities.slice(0, 3).map(a => `<span class="suite-amenity-tag">✦ ${a}</span>`).join('')}
              </div>
              <div class="suite-grid-actions">
                <button class="btn-grid-details js-open-drawer" data-id="${room.id}">Ficha Técnica</button>
                <button class="btn-grid-book js-direct-checkout" data-id="${room.id}">RESERVAR AHORA</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  setupDrawerListeners();
  setupDirectCheckoutListeners();

  // Asegurar que solo la vista activa esté visible sin duplicados
  applyCatalogViewMode(catalogViewMode);
}

function renderGastronomiaList(categoryKey = 'gourmet') {
  currentGastroTab = categoryKey;
  const container = document.getElementById('gastronomiaList');
  if (!container) return;
  const items = GASTRO_CATEGORIES[categoryKey] || GASTRO_CATEGORIES.gourmet;

  container.innerHTML = items.map(item => `
    <div class="gastro-item-card">
      <div style="height: 170px; overflow: hidden; border-radius: 12px; margin-bottom: 1rem; position: relative;">
        <img src="${item.img}" alt="${item.nombre}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'" loading="lazy" />
      </div>
      <div class="gastro-item-header">
        <h4 class="gastro-item-title">${item.nombre}</h4>
        <span class="gastro-item-price">${item.precio}</span>
      </div>
      <p class="gastro-item-desc">${item.desc}</p>
      <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.7rem; color: #10b981;">● Disponible 24 Horas</span>
        <button class="btn-editorial-outline js-order-gastro" data-name="${item.nombre}" data-price="${item.precio}" style="padding: 0.35rem 0.8rem; font-size: 0.75rem; cursor: pointer; border-color: rgba(251,191,36,0.4); color: #fbbf24; border-radius: 9999px;">
          + Pre-ordenar
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.js-order-gastro').forEach(btn => {
    btn.onclick = (e) => {
      const name = e.target.getAttribute('data-name');
      const price = e.target.getAttribute('data-price');
      alert(`🛎️ "${name}" (${price}) añadido a tu solicitud de Room Service. Se incluirá en tu habitación.`);
    };
  });
}
function openDrawer(roomId) {
  const room = roomsData.find(r => r.id === parseInt(roomId));
  if (!room) return;
  const spec = specsData[roomId] || {
    nombre: room.nombre,
    precio_exacto: room.precio || 'S/ 150.00',
    intro: 'Habitación de lujo hecha para clientes exclusivos que deseen pasar un momento inolvidable junto a su pareja.',
    equipamiento: ['Vista al mar', 'Jacuzzi', 'Ducha española', 'Frigobar'],
    duracion: '(Tarifa válida por 6 HORAS)',
    impuestos: 'En nuestras tarifas está incluido el IGV de 18%+ 5% recargo al consumo.'
  };
  const titleFormatted = spec.nombre.startsWith('Habitación') ? spec.nombre : `Habitación ${spec.nombre}`;
  const drawerBody = document.getElementById('drawerBody');
  drawerBody.innerHTML = `
    <div class="drawer-spec-layout">
      <h2 class="drawer-spec-title">${titleFormatted}</h2>
      <div class="drawer-spec-price">| ${spec.precio_exacto}</div>
      <p class="drawer-spec-intro">${spec.intro}</p>
      <img src="${room.imagen_url}" alt="${spec.nombre}" class="drawer-spec-img" />
      <h4 class="drawer-spec-heading">Habitación equipada con:</h4>
      <ul class="drawer-spec-bullets">
        ${spec.equipamiento.map(item => `<li>${item}</li>`).join('')}
      </ul>
      <p class="drawer-spec-duration">${spec.duracion}</p>
      <p class="drawer-spec-tax">
        ${spec.impuestos}
      </p>
      <button id="btnDrawerReserve" class="btn-editorial js-drawer-reserve-now" data-id="${room.id}" style="width: 100%; text-align: center; margin-top: 2rem; cursor: pointer;">
        RESERVAR AHORA
      </button>
    </div>
  `;
  const drawer = document.getElementById('roomDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  const drawerBtn = document.getElementById('btnDrawerReserve');
  if (drawerBtn) {
    drawerBtn.onclick = () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      openCheckoutModal(room.id);
    };
  }
}
function setupDrawerListeners() {
  document.querySelectorAll('.js-open-drawer').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) openDrawer(id);
    };
  });
  document.querySelectorAll('.js-reserve-now').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) openCheckoutModal(id);
    };
  });
}

function setupDrawerModalStaticListeners() {
  const drawerClose = document.getElementById('drawerClose');
  const drawer = document.getElementById('roomDrawer');
  if (drawerClose && drawer) {
    drawerClose.onclick = () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    };
    drawer.onclick = (e) => {
      if (e.target === drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
      }
    };
  }
}
function setupCheckoutModalListeners() {
  const headerBtn = document.getElementById('btnHeaderReserve');
  const heroReserveBtn = document.getElementById('btnHeroReserve');
  const openDefaultCheckout = () => {
    const defaultRoomId = roomsData.length > 0 ? roomsData[0].id : 860;
    openCheckoutModal(defaultRoomId);
  };
  if (headerBtn) headerBtn.onclick = openDefaultCheckout;
  if (heroReserveBtn) heroReserveBtn.onclick = openDefaultCheckout;
  const closeBtn = document.getElementById('checkoutCloseBtn');
  const modal = document.getElementById('checkoutModal');
  if (closeBtn && modal) {
    closeBtn.onclick = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    };
  }
}
function setupDirectCheckoutListeners() {
  document.querySelectorAll('.js-direct-checkout').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (id) openCheckoutModal(id);
    };
  });
}

function openCheckoutModal(roomId, initialOptions = {}) {
  const room = roomsData.find(r => r.id === parseInt(roomId)) || roomsData[0];
  if (!room) return;
  checkoutState = {
    roomId: room.id,
    duration: initialOptions.duration || '6 Horas',
    arrivalTime: initialOptions.arrivalTime || 'En 30 min',
    customTime: '',
    paymentMethod: 'yape',
    customerName: initialOptions.customerName || '',
    customerPhone: initialOptions.customerPhone || '',
    selectedExtras: []
  };
  renderCheckoutModalContent();
  const modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function renderCheckoutModalContent() {
  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return;
  const room = roomsData.find(r => r.id === checkoutState.roomId) || roomsData[0];
  const basePrice = parseBasePrice(room.precio);
  const totalPrice = calculateTotalWithExtras(basePrice, checkoutState.duration, checkoutState.selectedExtras);

  modalBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">FLUJO DE CHECKOUT DIGITAL & DISCRETO</span>
      <h2 style="font-family: var(--font-serif); font-size: 1.85rem; color: #fff; margin-top: 0.25rem;">
        Reservar ${room.nombre}
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.2rem;">
        ${room.categoria_nombre || 'Suite de Lujo'} • Tarifa Base: ${room.precio || 'S/ 150'} • Estacionamiento Privado Incluido
      </p>
    </div>

    <!-- 4-STEP PROGRESS STEPPER -->
    <div class="checkout-stepper">
      <div class="step-indicator active">
        <div class="step-num">1</div>
        <span class="step-label">Duración</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-indicator active">
        <div class="step-num">2</div>
        <span class="step-label">Horario</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-indicator active">
        <div class="step-num">3</div>
        <span class="step-label">Extras</span>
      </div>
      <div class="step-divider"></div>
      <div class="step-indicator active">
        <div class="step-num">4</div>
        <span class="step-label">Pago</span>
      </div>
    </div>

    <form id="checkoutDynamicForm">
      <!-- PASO A: DURACIÓN DE ESTADÍA -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 1 — SELECCIONA LA DURACIÓN
        </label>
        <div class="chip-group">
          <div class="chip-option ${checkoutState.duration === '3 Horas' ? 'active' : ''}" data-duration="3 Horas">
            <span class="chip-title">3 Horas</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, '3 Horas')} (-30%)</span>
          </div>
          <div class="chip-option ${checkoutState.duration === '6 Horas' ? 'active' : ''}" data-duration="6 Horas">
            <span class="chip-title">6 Horas</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, '6 Horas')} (Estándar)</span>
          </div>
          <div class="chip-option ${checkoutState.duration === 'Toda la Noche' ? 'active' : ''}" data-duration="Toda la Noche">
            <span class="chip-title">Toda la Noche</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, 'Toda la Noche')} (hasta 12 PM)</span>
          </div>
        </div>
      </div>

      <!-- PASO B: HORARIO ESTIMADO DE LLEGADA -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 2 — HORA DE LLEGADA ESTIMADA
        </label>
        <div class="chip-group">
          <div class="chip-option ${checkoutState.arrivalTime === 'En 30 min' ? 'active' : ''}" data-time="En 30 min">
            <span class="chip-title">En 30 min</span>
            <span class="chip-sub">Inmediato</span>
          </div>
          <div class="chip-option ${checkoutState.arrivalTime === '20:00' ? 'active' : ''}" data-time="20:00">
            <span class="chip-title">20:00 hrs</span>
            <span class="chip-sub">Turno Noche</span>
          </div>
          <div class="chip-option ${checkoutState.arrivalTime === '22:00' ? 'active' : ''}" data-time="22:00">
            <span class="chip-title">22:00 hrs</span>
            <span class="chip-sub">Noche Plena</span>
          </div>
          <div class="chip-option ${checkoutState.arrivalTime === '00:00' ? 'active' : ''}" data-time="00:00">
            <span class="chip-title">00:00 hrs</span>
            <span class="chip-sub">Madrugada</span>
          </div>
        </div>
      </div>

      <!-- PASO C: EXTRAS Y EXPERIENCIAS EXCLUSIVAS -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 3 — PERSONALIZA TU ESTADÍA (OPCIONAL)
        </label>
        <span style="font-size: 0.72rem; color: #94a3b8; display: block; margin-bottom: 0.6rem;">Encuentra tu habitación decorada y preparada con total discreción al ingresar.</span>
        
        <div class="checkout-extras-grid">
          ${AVAILABLE_EXTRAS.map(extra => {
            const isSelected = checkoutState.selectedExtras.includes(extra.id);
            return `
              <div class="extra-option-card ${isSelected ? 'selected' : ''}" data-extra="${extra.id}">
                <div>
                  <div class="extra-title-row">
                    <span class="extra-name">${extra.name}</span>
                    <span class="extra-price">+S/ ${extra.price}</span>
                  </div>
                  <p class="extra-desc">${extra.desc}</p>
                </div>
                <div style="margin-top: 0.5rem; text-align: right; font-size: 0.75rem; color: ${isSelected ? '#fbbf24' : '#64748b'}; font-weight: bold;">
                  ${isSelected ? '✓ Incluido' : '+ Agregar'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- PASO D: MEDIO DE PAGO & DATOS DEL HUÉSPED -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 4 — MEDIO DE PAGO
        </label>
        <div class="payment-group">
          <div class="payment-card ${checkoutState.paymentMethod === 'yape' ? 'active' : ''}" data-method="yape">
            <span class="payment-icon">📱</span>
            <div>
              <div class="payment-title">Yape / Plin</div>
              <div class="payment-desc">Transferencia instantánea</div>
            </div>
          </div>
          <div class="payment-card ${checkoutState.paymentMethod === 'card' ? 'active' : ''}" data-method="card">
            <span class="payment-icon">💳</span>
            <div>
              <div class="payment-title">Tarjeta Crédito / Débito</div>
              <div class="payment-desc">Visa, Mastercard, Amex</div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETALLES CONDICIONALES DE PAGO -->
      ${checkoutState.paymentMethod === 'yape' ? `
        <div style="background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.3); border-radius: 14px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.82rem; color: #fef08a;">
          📱 <strong>Pago Digital Rápido:</strong> Yapear al número <code>990 370 681</code> (Hotel Wimbledon S.A.C.). Tu Pase Digital y PIN de habitación se emitirán al confirmar.
        </div>
      ` : `
        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem;">
          <div>
            <label style="display: block; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.25rem; font-weight: 600;">NÚMERO DE TARJETA</label>
            <input type="text" placeholder="4557 •••• •••• 8821" style="width: 100%; padding: 0.75rem; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 0.9rem; font-family: monospace;" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.25rem; font-weight: 600;">VENCIMIENTO</label>
              <input type="text" placeholder="MM/AA" style="width: 100%; padding: 0.75rem; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 0.9rem;" required />
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.25rem; font-weight: 600;">CVC / CVV</label>
              <input type="password" placeholder="•••" maxlength="4" style="width: 100%; padding: 0.75rem; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 0.9rem;" required />
            </div>
          </div>
        </div>
      `}

      <!-- DATOS DE REGISTRO CLIENTE (MÁXIMA PRIVACIDAD) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">NOMBRE / ALIAS DISCRETO</label>
          <input type="text" id="checkoutName" value="${checkoutState.customerName}" placeholder="Nombre o iniciales" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">TELÉFONO CELULAR (PARA EL PASE)</label>
          <input type="tel" id="checkoutPhone" value="${checkoutState.customerPhone}" placeholder="990370681" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
      </div>

      <!-- RESUMEN DEL PRECIO FINAL -->
      <div class="price-summary-box">
        <div>
          <span class="summary-total-label">Monto Total a Pagar</span>
          <div style="font-size: 0.75rem; color: #64748b;">
            ${checkoutState.duration} ${checkoutState.selectedExtras.length > 0 ? `+ ${checkoutState.selectedExtras.length} Extras` : ''} • Impuestos incluidos
          </div>
        </div>
        <span class="summary-total-val">S/ ${totalPrice}.00</span>
      </div>

      <button type="submit" class="btn-editorial-light" style="width: 100%; text-align: center; justify-content: center; padding: 1.1rem; font-weight: bold; font-size: 1rem; cursor: pointer; background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; border: none; border-radius: 12px; box-shadow: 0 10px 25px rgba(217, 119, 6, 0.35);">
        CONFIRMAR Y EMITIR PASE DIGITAL (S/ ${totalPrice}.00)
      </button>
    </form>
  `;

  // Listeners de Duración
  modalBody.querySelectorAll('[data-duration]').forEach(opt => {
    opt.onclick = () => {
      checkoutState.duration = opt.getAttribute('data-duration');
      syncFormFields();
      renderCheckoutModalContent();
    };
  });

  // Listeners de Horario
  modalBody.querySelectorAll('[data-time]').forEach(opt => {
    opt.onclick = () => {
      checkoutState.arrivalTime = opt.getAttribute('data-time');
      syncFormFields();
      renderCheckoutModalContent();
    };
  });

  // Listeners de Extras
  modalBody.querySelectorAll('[data-extra]').forEach(card => {
    card.onclick = () => {
      const extraId = card.getAttribute('data-extra');
      if (checkoutState.selectedExtras.includes(extraId)) {
        checkoutState.selectedExtras = checkoutState.selectedExtras.filter(id => id !== extraId);
      } else {
        checkoutState.selectedExtras.push(extraId);
      }
      syncFormFields();
      renderCheckoutModalContent();
    };
  });

  // Listeners de Método de Pago
  modalBody.querySelectorAll('[data-method]').forEach(opt => {
    opt.onclick = () => {
      checkoutState.paymentMethod = opt.getAttribute('data-method');
      syncFormFields();
      renderCheckoutModalContent();
    };
  });

  function syncFormFields() {
    checkoutState.customerName = document.getElementById('checkoutName')?.value || checkoutState.customerName;
    checkoutState.customerPhone = document.getElementById('checkoutPhone')?.value || checkoutState.customerPhone;
  }

  const form = document.getElementById('checkoutDynamicForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      syncFormFields();
      confirmAndSaveBooking(room, totalPrice);
    };
  }
}

function renderKeycardHTML(booking) {
  const qrSvg = generateQRCodeSVG(`${booking.id}|${booking.pin}`, {
    size: 160,
    accentColor: '#fbbf24',
    darkColor: '#0b0f19'
  });

  const extrasText = (booking.extras || []).map(id => {
    const ex = AVAILABLE_EXTRAS.find(e => e.id === id);
    return ex ? ex.name : id;
  }).join(', ');

  return `
    <div class="keycard-container">
      <div class="wimbledon-keycard" id="keycardElement">
        <div class="keycard-header">
          <div class="keycard-brand">
            <div class="keycard-chip"></div>
            <div>
              <span class="keycard-brand-text">WIMBLEDON</span>
              <span style="display:block; font-size: 0.65rem; letter-spacing: 1.5px; color: #cbd5e1;">BLACK KEYCARD • ACCESO DIGITAL</span>
            </div>
          </div>
          <div class="keycard-status-badge">
            <span class="avail-dot"></span>
            <span>${booking.estado}</span>
          </div>
        </div>

        <div class="keycard-body-grid">
          <div>
            <span style="font-size: 0.7rem; color: #fbbf24; letter-spacing: 1px; text-transform: uppercase; font-weight: bold;">
              PASE DE ACCESO DISCRETO
            </span>
            <h3 class="keycard-suite-title">${booking.habitacionNombre}</h3>
            <p class="keycard-meta-line">
              ⏱️ ${booking.duracion} • Llegada: ${booking.horarioLlegada}
              ${extrasText ? `<br/><span style="color: #fbbf24; font-size: 0.75rem;">✦ Extras: ${extrasText}</span>` : ''}
            </p>

            <div class="keycard-pin-box">
              <span class="keycard-pin-label">PIN DE ACCESO DIGITAL (HABITACIÓN / COCHERA)</span>
              <span class="keycard-pin-code">${booking.pin}</span>
            </div>
            <span style="font-size: 0.72rem; color: #94a3b8; display: block; line-height: 1.4;">
              Ingresa directamente sin recepción mostrando este código o ingresando el PIN en el sensor de puerta.
            </span>
          </div>

          <div class="keycard-qr-wrap">
            ${qrSvg}
            <span class="keycard-qr-caption">${booking.id}</span>
          </div>
        </div>

        <div class="keycard-countdown-bar">
          <span class="countdown-label">Vigencia Temporal de la Estadía:</span>
          <span class="countdown-time" id="keycardLiveTimer">${booking.duracion}</span>
        </div>

        <div class="keycard-actions-row">
          <button class="btn-keycard-action btn-keycard-save" onclick="window.print()">
            📄 Guardar Pase
          </button>
          <a href="https://wa.me/51990370681?text=${encodeURIComponent('Hola Hotel Wimbledon, tengo mi Pase Digital ' + booking.id + ' para ' + booking.habitacionNombre + ' (PIN: ' + booking.pin + ').')}" target="_blank" class="btn-keycard-action btn-keycard-whatsapp">
            💬 Enviar a WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;
}

function setupKeycardTilt() {
  const card = document.getElementById('keycardElement');
  if (!card) return;
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    card.style.transform = `rotateY(${(x / 15).toFixed(1)}deg) rotateX(${(-y / 15).toFixed(1)}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

function confirmAndSaveBooking(room, totalAmount) {
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `#WMB-${randomId}`;
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const booking = {
    id: bookingCode,
    pin: pin,
    habitacionId: room.id,
    habitacionNombre: room.nombre,
    duracion: checkoutState.duration,
    horarioLlegada: checkoutState.arrivalTime,
    extras: [...checkoutState.selectedExtras],
    monto: totalAmount,
    medioPago: checkoutState.paymentMethod === 'yape' ? 'Yape / Plin' : 'Tarjeta de Crédito / Débito',
    clienteNombre: checkoutState.customerName || 'Huésped Wimbledon',
    clienteTelefono: checkoutState.customerPhone || '990370681',
    estado: 'CONFIRMADA',
    fechaReserva: new Date().toISOString()
  };

  // Guardar en LocalStorage
  try {
    const existing = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
    existing.unshift(booking);
    localStorage.setItem('wimbledon_bookings', JSON.stringify(existing));
    localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
  } catch (err) {
    console.error('Error al guardar reserva:', err);
  }

  // Intentar sincronización con Backend si está activo
  try {
    fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitacionId: room.id,
        nombreCompleto: booking.clienteNombre,
        telefono: booking.clienteTelefono,
        duracion: booking.duracion,
        horarioLlegada: booking.horarioLlegada,
        monto: booking.monto
      })
    }).catch(() => {});
  } catch (e) {}

  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="color: #10b981; font-size: 0.8rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
        ✓ RESERVA CONFIRMADA & CHECK-IN EMITIDO
      </span>
      <h2 style="font-family: var(--font-serif); font-size: 2rem; color: #fff; margin-top: 0.25rem;">
        ¡Tu Pase Digital está Listo!
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">
        Guarda tu tarjeta de acceso o presenta el código QR al llegar a tu suite.
      </p>
    </div>

    ${renderKeycardHTML(booking)}

    <div style="margin-top: 1.5rem; text-align: center;">
      <button id="btnFinishCheckout" class="btn-editorial-light" style="width: 100%; padding: 1rem; font-weight: bold; background: #fff; color: #000; border: none; border-radius: 12px; cursor: pointer;">
        FINALIZAR Y CERRAR
      </button>
    </div>
  `;

  setupKeycardTilt();

  const btnFinish = document.getElementById('btnFinishCheckout');
  if (btnFinish) {
    btnFinish.onclick = () => {
      const modal = document.getElementById('checkoutModal');
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    };
  }
}

function setupMyBookingListeners() {
  const btnNav = document.getElementById('btnNavMyBooking');
  const btnHeader = document.getElementById('btnHeaderMyBooking');
  const modal = document.getElementById('myBookingModal');
  const closeBtn = document.getElementById('myBookingCloseBtn');

  const openModal = () => {
    renderMyBookingModal();
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  if (btnNav) btnNav.onclick = openModal;
  if (btnHeader) btnHeader.onclick = openModal;

  if (closeBtn && modal) {
    closeBtn.onclick = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    };
  }
}

function renderMyBookingModal(targetBooking = null) {
  const container = document.getElementById('myBookingModalBody');
  if (!container) return;

  let booking = targetBooking;
  if (!booking) {
    try {
      booking = JSON.parse(localStorage.getItem('wimbledon_last_booking') || 'null');
    } catch (e) {}
  }

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">PORTAL DE AUTOGESTIÓN DEL HUÉSPED</span>
      <h2 style="font-family: var(--font-serif); font-size: 1.85rem; color: #fff; margin-top: 0.25rem;">
        🔑 Mi Llave Digital & Estadía
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">
        Consulta tu código de acceso, extiende tu tiempo o gestiona tu reserva con discreción absoluta.
      </p>
    </div>

    <!-- BUSCADOR DE RESERVA -->
    <div class="booking-lookup-box">
      <input type="text" id="lookupCodeInput" class="booking-lookup-input" placeholder="Ingresa código (ej: #WMB-1024) o celular" value="${booking ? booking.id : ''}" />
      <button id="btnSearchBooking" class="btn-booking-lookup">BUSCAR</button>
    </div>

    <div id="lookupResultContainer">
      ${booking ? renderBookingManageSection(booking) : `
        <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
          <p style="font-size: 0.9rem;">No tienes reservas activas en este dispositivo.</p>
          <p style="font-size: 0.75rem; margin-top: 0.25rem;">Ingresa el código que recibiste al reservar para visualizar tu Pase Digital.</p>
        </div>
      `}
    </div>
  `;

  const btnSearch = document.getElementById('btnSearchBooking');
  if (btnSearch) {
    btnSearch.onclick = () => {
      const q = (document.getElementById('lookupCodeInput').value || '').trim().toUpperCase();
      try {
        const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
        const found = list.find(b => b.id.toUpperCase() === q || b.id.replace('#', '').toUpperCase() === q || b.clienteTelefono === q);
        if (found) {
          renderMyBookingModal(found);
        } else {
          alert('❌ No se encontró ninguna reserva con ese código o teléfono.');
        }
      } catch (e) {
        alert('Error al buscar la reserva.');
      }
    };
  }

  if (booking) {
    setupBookingManageActions(booking);
  }
}

function renderBookingManageSection(booking) {
  return `
    ${renderKeycardHTML(booking)}

    <!-- HU.04: EXTENDER ESTADÍA -->
    <div class="extension-box">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="color: #38bdf8; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            ⏱️ ¿Deseas más tiempo en tu suite?
          </span>
          <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
            Extiende tu estadía en 1 clic sin tener que llamar a recepción.
          </p>
        </div>
      </div>
      <div class="extension-options-row">
        <button class="btn-extend-chip js-extend-stay" data-hours="2" data-price="45">
          +2 Horas (S/ 45.00)
        </button>
        <button class="btn-extend-chip js-extend-stay" data-hours="3" data-price="65">
          +3 Horas (S/ 65.00)
        </button>
      </div>
    </div>

    <!-- HU.07: CANCELACIÓN O REPROGRAMACIÓN -->
    <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; padding: 1rem 1.25rem;">
      <div>
        <span style="font-size: 0.8rem; color: #fda4af; font-weight: bold;">Política de Modificación & Cancelación</span>
        <span style="display: block; font-size: 0.72rem; color: #94a3b8;">Permitida sin penalidad hasta 2 horas antes de la llegada.</span>
      </div>
      <button id="btnCancelBooking" class="btn-editorial-outline" style="border-color: #f43f5e; color: #f43f5e; font-size: 0.75rem; padding: 0.4rem 0.85rem; cursor: pointer; border-radius: 8px;">
        Cancelar Reserva
      </button>
    </div>
  `;
}

function setupBookingManageActions(booking) {
  setupKeycardTilt();

  // Extension de estadia (HU.04)
  document.querySelectorAll('.js-extend-stay').forEach(btn => {
    btn.onclick = (e) => {
      const hours = parseInt(e.target.getAttribute('data-hours'), 10);
      const price = parseInt(e.target.getAttribute('data-price'), 10);
      booking.duracion = `${booking.duracion} (+${hours}h)`;
      booking.monto = (booking.monto || 150) + price;

      // Actualizar localStorage
      try {
        const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
        const idx = list.findIndex(b => b.id === booking.id);
        if (idx !== -1) list[idx] = booking;
        localStorage.setItem('wimbledon_bookings', JSON.stringify(list));
        localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
      } catch (err) {}

      alert(`✅ ¡Estadía extendida +${hours} Horas exitosamente! Monto adicional: S/ ${price}.00`);
      renderMyBookingModal(booking);
    };
  });

  // Cancelacion de reserva (HU.07)
  const btnCancel = document.getElementById('btnCancelBooking');
  if (btnCancel) {
    btnCancel.onclick = () => {
      if (confirm(`¿Estás seguro de cancelar la reserva ${booking.id}? Se aplicará la política de discreción y reembolso.`)) {
        booking.estado = 'CANCELADA';
        try {
          const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
          const idx = list.findIndex(b => b.id === booking.id);
          if (idx !== -1) list[idx] = booking;
          localStorage.setItem('wimbledon_bookings', JSON.stringify(list));
          localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
        } catch (err) {}
        alert('❌ Reserva cancelada conforme a las políticas del Hotel Wimbledon.');
        renderMyBookingModal(booking);
      }
    };
  }
}

function applyCatalogViewMode(mode) {
  catalogViewMode = mode;
  const btnCinematic = document.getElementById('btnViewCinematic');
  const btnGrid = document.getElementById('btnViewGrid');
  const trackWrapper = document.getElementById('suitesHorizontalPinWrapper');
  const gridSection = document.getElementById('suitesGridSection');

  if (btnCinematic && btnGrid && trackWrapper && gridSection) {
    if (mode === 'cinematic') {
      btnCinematic.classList.add('active');
      btnGrid.classList.remove('active');
      trackWrapper.classList.remove('view-mode-hidden');
      trackWrapper.style.display = 'block';
      gridSection.classList.add('view-mode-hidden');
      gridSection.style.display = 'none';
      requestAnimationFrame(() => {
        refreshHorizontalSuitesScroll();
      });
    } else {
      btnGrid.classList.add('active');
      btnCinematic.classList.remove('active');
      trackWrapper.classList.add('view-mode-hidden');
      trackWrapper.style.display = 'none';
      gridSection.classList.remove('view-mode-hidden');
      gridSection.style.display = 'block';
      requestAnimationFrame(() => {
        refreshHorizontalSuitesScroll();
      });
    }
  }
}

function setupCatalogControls() {
  const btnCinematic = document.getElementById('btnViewCinematic');
  const btnGrid = document.getElementById('btnViewGrid');

  if (btnCinematic && btnGrid) {
    btnCinematic.onclick = () => {
      applyCatalogViewMode('cinematic');
    };

    btnGrid.onclick = () => {
      applyCatalogViewMode('grid');
    };
  }

  // Filtros de Amenidades
  const chips = document.querySelectorAll('.amenity-chip-btn');
  chips.forEach(chip => {
    chip.onclick = (e) => {
      chips.forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const filter = e.currentTarget.getAttribute('data-filter');
      renderSuitesList(filter);
    };
  });
}

function setupGastroTabs() {
  const tabs = document.querySelectorAll('.gastro-tab-btn');
  tabs.forEach(tab => {
    tab.onclick = (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.getAttribute('data-gastro');
      renderGastronomiaList(cat);
    };
  });
}

function setupHeaderScroll() {
  window.addEventListener('scroll', () => {
    const header = document.getElementById('navbar');
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}
function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
function setupMobileNav() {
  const sandwichBtn = document.getElementById('btnSandwichToggle');
  const drawer = document.getElementById('luxuryNavDrawer');
  const drawerCloseBtn = document.getElementById('luxuryDrawerClose');
  const drawerLinks = document.querySelectorAll('#luxuryDrawerNav a');
  const drawerMyBooking = document.getElementById('btnDrawerMyBooking');

  if (sandwichBtn && drawer) {
    const openDrawer = () => {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    sandwichBtn.addEventListener('click', openDrawer);

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeDrawer);
    }

    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeDrawer();
    });

    drawerLinks.forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    if (drawerMyBooking) {
      drawerMyBooking.addEventListener('click', () => {
        closeDrawer();
        const myBookingModal = document.getElementById('myBookingModal');
        if (myBookingModal) {
          renderMyBookingModal();
          myBookingModal.classList.add('open');
          myBookingModal.setAttribute('aria-hidden', 'false');
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
  }
}
function setupFormHandler() {
  const form = document.getElementById('editorialForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('edName').value;
      const phone = document.getElementById('edPhone').value;
      const roomId = document.getElementById('edRoom').value;
      const duration = document.getElementById('edDuration').value;
      const arrivalTime = document.getElementById('edArrivalTime').value;
      openCheckoutModal(roomId, {
        customerName: name,
        customerPhone: phone,
        duration: duration,
        arrivalTime: arrivalTime
      });
    });
  }
}
function setupPromoVideo() {
  const video = document.getElementById('promoVideo');
  const audioBtn = document.getElementById('promoAudioToggle');
  const audioIcon = document.getElementById('promoAudioIcon');
  const audioText = document.getElementById('promoAudioText');
  if (!video || !audioBtn) return;

  function updateAudioState() {
    const isMuted = video.muted || video.volume === 0;
    if (audioIcon) audioIcon.textContent = isMuted ? '🔇' : '🔊';
    if (audioText) audioText.textContent = isMuted ? 'Activar Audio' : 'Silenciar Audio';
    audioBtn.classList.toggle('active', !isMuted);
  }

  audioBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted && video.paused) {
      video.play().catch(() => {});
    }
    updateAudioState();
  });

  video.addEventListener('volumechange', updateAudioState);
  updateAudioState();
}
initApp();
