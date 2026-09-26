import { initSmoothScroll, initHeroPinAnimation, initServicesHoverAnimation, initHorizontalSuitesScroll, refreshHorizontalSuitesScroll, initMagneticButton } from './smoothScroll.js';
import { generateQRCodeSVG } from './qrGenerator.js';
import { api } from './services/api.js';

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
    { nombre: "Fetuccini al Alfredo", precio: "S/ 24.00", desc: "Pasta artesanal en cremosa salsa Alfredo con jamón inglés y parmesano.", img: "/images/gastro/fetuccini-alfredo.jpg" },
    { nombre: "Lomo Saltado Tradicional", precio: "S/ 28.00", desc: "Trozos de lomo fino salteados al wok con cebolla, tomate criollo y papas doradas.", img: "/images/gastro/lomo-saltado.jpg" },
    { nombre: "Bisteck a lo Pobre", precio: "S/ 28.00", desc: "Filete jugoso con plátano frito, huevos montados, arroz y papas crocantes.", img: "/images/gastro/bisteck-a-lo-pobre.jpg" },
    { nombre: "Milanesa Napolitana con Pesto", precio: "S/ 28.00", desc: "Milanesa gratinada con pomodoro y mozzarella, servida con pasta al pesto.", img: "/images/gastro/milanesa-napolitana.jpg" },
    { nombre: "Suprema de Pollo Dorada", precio: "S/ 24.00", desc: "Pechuga en panko fino, servida con papas fritas y ensalada fresca.", img: "/images/gastro/suprema-pollo.jpg" }
  ],
  fast: [
    { nombre: "Signature Wimbledon Cheeseburger", precio: "S/ 24.00", desc: "Doble carne smash, cheddar fundido, tocino y salsa secreta en brioche.", img: "/images/gastro/hamburguesa-smash.jpg" },
    { nombre: "Piqueo Premium Wimbledon", precio: "S/ 48.00", desc: "Tequeños con queso, alitas barbecue, chicharrón de pollo y guacamole.", img: "/images/gastro/piqueo-premium.jpg" },
    { nombre: "Club Sandwich Tradicional", precio: "S/ 22.00", desc: "Tres niveles con pollo deshilachado, tocino, jamón, huevo y vegetales frescos.", img: "/images/gastro/club-sandwich.jpg" },
    { nombre: "Tequeños con Queso (12 unid.)", precio: "S/ 18.00", desc: "Wantanes crocantes rellenos de queso fundente con salsa guacamole fresca.", img: "/images/gastro/tequenos-queso.jpg" }
  ],
  bar: [
    { nombre: "Pisco Sour Catedral", precio: "S/ 22.00", desc: "Pisco Quebranta premium, limón criollo, jarabe y amargo de angostura.", img: "/images/gastro/pisco-sour.jpg" },
    { nombre: "Chilcano de Pisco Frutal", precio: "S/ 20.00", desc: "Pisco seleccionado, ginger ale helada, gotas de lima y frutos del bosque.", img: "/images/gastro/chilcano-frutal.jpg" },
    { nombre: "Champagne Riccadonna Asti", precio: "S/ 75.00", desc: "Espumante italiano dulce y afrutado, servido en hielera con copas flauta.", img: "/images/gastro/champagne-riccadonna.jpg" },
    { nombre: "Whisky Chivas Regal 12 Años", precio: "S/ 180.00", desc: "Blended Scotch Whisky escocés servido en vaso roca con hielo premium.", img: "/images/gastro/whisky-chivas.jpg" }
  ],
  minibar: [
    { nombre: "Pack Íntimo Sensitivo Durex", precio: "S/ 25.00", desc: "Preservativos ultrafinos + gel lubricante íntimo a base de agua.", img: "/images/gastro/pack-durex.jpg" },
    { nombre: "Energy Red Bull Helada", precio: "S/ 14.00", desc: "Bebida energizante servida fría para revitalizar tu estadía.", img: "/images/gastro/redbull.jpg" },
    { nombre: "Cerveza Corona Extra (Pack x2)", precio: "S/ 20.00", desc: "Cervezas importadas servidas con limón en hielera privada.", img: "/images/gastro/cerveza-corona.jpg" },
    { nombre: "Chocolates Finos Ferrero Rocher", precio: "S/ 24.00", desc: "Caja de bombones con avellana entera bañada en chocolate.", img: "/images/gastro/chocolates-ferrero.jpg" }
  ]
};

let checkoutState = {
  roomId: null,
  duration: '6 Horas', 
  arrivalTime: 'En 30 min', 
  customTime: '',
  paymentMethod: 'efectivo', 
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
    setupHeroSlider();
    setupCompactSuitesCarousel();
    setupLargeServicesCarousel();
    setupTestimonialsInteractions();
    setupDecoracionesListeners();
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
    <!-- HERO SLIDER SECTION CON FOTOS INTERCAMBIABLES (COMO LA WEB OFICIAL) -->
    <section id="hero" class="hero-slider-section">
      <div id="heroSliderWrapper" class="hero-slider-wrapper">
        <!-- Slide 1: Dark Fantasies -->
        <div class="hero-slide active" data-index="0">
          <img src="/images/hero/hero-dark-fantasies.jpg" alt="Dark Fantasies Suite - Hotel Wimbledon" class="hero-slide-bg" />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <span class="hero-editorial-tag">HOTEL WIMBLEDON • SAN MIGUEL</span>
            <h1 class="hero-editorial-title">
              Privacidad, Confort <span class="hero-title-sub">& Discreción frente al Mar</span>
            </h1>
            <p class="hero-editorial-desc">
              Planifica tu estadía con nosotros, contamos con habitaciones de lujo, habitaciones temáticas, estacionamiento directo a algunas habitaciones, nuestra carta de comidas y bebidas que complementan tu visita.
            </p>
            <div class="hero-meta-bar">
              <div class="hero-meta-item">Av. Costanera 2098 • San Miguel, Lima</div>
              <div class="hero-meta-item">Atención Discreta 24/7</div>
              <div class="hero-meta-item">Tel: 578-6000</div>
            </div>
            <div class="hero-actions-row">
              <a href="#habitaciones" class="btn-hero-primary">EXPLORAR SUITES</a>
              <button class="btn-hero-secondary js-hero-reserve-btn">RESERVA INMEDIATA</button>
            </div>
          </div>
        </div>

        <!-- Slide 2: Hawaian Dreams -->
        <div class="hero-slide" data-index="1">
          <img src="/images/hero/hero-hawaian.jpg" alt="Hawaian Dreams - Hotel Wimbledon" class="hero-slide-bg" />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <span class="hero-editorial-tag">NUEVAS EXPERIENCIAS</span>
            <h1 class="hero-editorial-title">
              Suites Temáticas <span class="hero-title-sub">& Confort de Alta Gama</span>
            </h1>
            <p class="hero-editorial-desc">
              Disfruta de una atmósfera exótica y relajante equipada con jacuzzi privado, aire acondicionado y servicio a la habitación las 24 horas.
            </p>
            <div class="hero-meta-bar">
              <div class="hero-meta-item">Diseño Sensorial de Autor</div>
              <div class="hero-meta-item">Jacuzzi con Hidromasaje</div>
              <div class="hero-meta-item">WhatsApp: +51 990 370 681</div>
            </div>
            <div class="hero-actions-row">
              <a href="#habitaciones" class="btn-hero-primary">VER HABITACIONES</a>
              <button class="btn-hero-secondary js-hero-reserve-btn">RESERVAR AHORA</button>
            </div>
          </div>
        </div>

        <!-- Slide 3: Suite Presidencial con Cámara Seca -->
        <div class="hero-slide" data-index="2">
          <img src="/images/hero/hero-presidencial.jpg" alt="Suite Presidencial - Hotel Wimbledon" class="hero-slide-bg" />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <span class="hero-editorial-tag">BIENESTAR TÉRMICO EXCLUSIVO</span>
            <h1 class="hero-editorial-title">
              Cámara Seca <span class="hero-title-sub">& Jacuzzi en Suite</span>
            </h1>
            <p class="hero-editorial-desc">
              Descanso de realeza con sauna finlandés en madera de cedro, cama redonda de confort 100%, pole dance y ducha española de alta presión.
            </p>
            <div class="hero-meta-bar">
              <div class="hero-meta-item">Sauna Seco Privado</div>
              <div class="hero-meta-item">Cama Redonda Confort</div>
              <div class="hero-meta-item">Tarifa Especial 6 y 12 Horas</div>
            </div>
            <div class="hero-actions-row">
              <a href="#habitaciones" class="btn-hero-primary">DESCUBRIR SUITES</a>
              <button class="btn-hero-secondary js-hero-reserve-btn">RESERVA INMEDIATA</button>
            </div>
          </div>
        </div>

        <!-- Slide 4: Riverside Dreams Presidencial -->
        <div class="hero-slide" data-index="3">
          <img src="/images/hero/hero-riverside.jpg" alt="Riverside Dreams Presidencial - Hotel Wimbledon" class="hero-slide-bg" />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <span class="hero-editorial-tag">PRIVACIDAD SIN LÍMITES</span>
            <h1 class="hero-editorial-title">
              Parking Directo <span class="hero-title-sub">A Tu Habitación</span>
            </h1>
            <p class="hero-editorial-desc">
              Ingresa en tu vehículo directamente a tu suite con portón automatizado privado. Sin contacto con terceros ni paso por recepción física.
            </p>
            <div class="hero-meta-bar">
              <div class="hero-meta-item">Portón Cerrado Individual</div>
              <div class="hero-meta-item">100% Confidencialidad</div>
              <div class="hero-meta-item">Seguridad Perimetral 24/7</div>
            </div>
            <div class="hero-actions-row">
              <a href="#parking" class="btn-hero-primary">CONOCE EL PARKING</a>
              <button class="btn-hero-secondary js-hero-reserve-btn">RESERVAR CON COCHERA</button>
            </div>
          </div>
        </div>

        <!-- Slide 5: Simple Vista al Mar -->
        <div class="hero-slide" data-index="4">
          <img src="/images/hero/hero-vista-mar.jpg" alt="Vista al Mar - Hotel Wimbledon" class="hero-slide-bg" />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <span class="hero-editorial-tag">HORIZONTE COSTERO</span>
            <h1 class="hero-editorial-title">
              Vista al Océano <span class="hero-title-sub">En La Costa Verde</span>
            </h1>
            <p class="hero-editorial-desc">
              Avenida Costanera 2098 en San Miguel. Atardeceres frente al mar con cristales insonorizados y máxima tranquilidad.
            </p>
            <div class="hero-meta-bar">
              <div class="hero-meta-item">Frente a la Bahía de Lima</div>
              <div class="hero-meta-item">Insonorización Acústica</div>
              <div class="hero-meta-item">Av. Costanera 2098</div>
            </div>
            <div class="hero-actions-row">
              <a href="#habitaciones" class="btn-hero-primary">EXPLORAR SUITES</a>
              <button class="btn-hero-secondary js-hero-reserve-btn">RESERVA INMEDIATA</button>
            </div>
          </div>
        </div>

        <!-- Flechas de Navegación del Slider -->
        <button id="btnHeroPrev" class="hero-slider-arrow prev" aria-label="Diapositiva anterior">❮</button>
        <button id="btnHeroNext" class="hero-slider-arrow next" aria-label="Diapositiva siguiente">❯</button>

        <!-- Indicadores / Dots del Slider -->
        <div class="hero-slider-dots" id="heroSliderDots">
          <button class="hero-slider-dot active" data-slide="0" aria-label="Ir a diapositiva 1"></button>
          <button class="hero-slider-dot" data-slide="1" aria-label="Ir a diapositiva 2"></button>
          <button class="hero-slider-dot" data-slide="2" aria-label="Ir a diapositiva 3"></button>
          <button class="hero-slider-dot" data-slide="3" aria-label="Ir a diapositiva 4"></button>
          <button class="hero-slider-dot" data-slide="4" aria-label="Ir a diapositiva 5"></button>
        </div>
      </div>
    </section>
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
              <button type="button" id="btnPromoReserve" class="btn-hero-primary" style="cursor: pointer; border: none;">RESERVAR PROMOCIÓN</button>
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
    <!-- SECCIÓN NUESTRAS HABITACIONES (CARRUSEL COMPACTO QUE NO SECUESTRA LA PÁGINA) -->
    <section id="habitaciones" class="section-editorial" style="background: #060911; padding-top: 5rem; padding-bottom: 4rem; border-top: 1px solid rgba(255,255,255,0.08); position: relative;">
      <div class="editorial-container" style="padding-bottom: 0.5rem;">
        <div class="suites-horizontal-header" style="text-align: center; margin-bottom: 1.5rem;">
          <span class="editorial-tag text-gold">COLECCIÓN EXCLUSIVA DE SUITES</span>
          <h2 class="editorial-headline" style="color: var(--color-white); margin-top: 0.5rem;">Nuestras habitaciones</h2>
          <p style="color: #94a3b8; max-width: 760px; margin: 0.75rem auto 0; font-size: 1rem; line-height: 1.6;">
            Planifica tu estadía con nosotros, contamos con habitaciones de lujo, habitaciones temáticas, estacionamiento directo a algunas habitaciones, nuestra carta de comidas y bebidas que complementan tu visita.
          </p>
        </div>

        <!-- CONTROLES: SELECTOR DE MODO Y FILTROS RÁPIDOS -->
        <div class="catalog-controls-bar">
          <div class="view-mode-toggle">
            <button id="btnViewCinematic" class="view-toggle-btn active">✦ Carrusel Compacto</button>
            <button id="btnViewGrid" class="view-toggle-btn">⊞ Mosaico Grid</button>
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

      <!-- CARRUSEL COMPACTO DE HABITACIONES (SIN PIN NI SCROLLJACKING FORZADO) -->
      <div id="suitesCarouselWrapper" class="editorial-container suites-carousel-wrapper">
        <div class="suites-carousel-controls">
          <span style="font-size: 0.85rem; color: #94a3b8; letter-spacing: 0.05em;">Desliza horizontalmente o usa las flechas:</span>
          <div style="display: flex; gap: 0.6rem;">
            <button id="btnCarouselPrev" class="carousel-nav-btn" aria-label="Habitaciones anteriores">❮</button>
            <button id="btnCarouselNext" class="carousel-nav-btn" aria-label="Habitaciones siguientes">❯</button>
          </div>
        </div>
        <div id="suitesCarouselTrackContainer" class="suites-carousel-track-container">
          <!-- Inyectado dinámicamente: suite-card-compact -->
        </div>
      </div>

      <!-- VISTA GRID ALTERNATIVA -->
      <div id="suitesGridSection" class="editorial-container view-mode-hidden" style="display: none; padding-bottom: 3rem; margin-top: 2rem;">
        <div id="suitesGridView" class="suites-grid-layout">
          <!-- Inyectado dinámicamente -->
        </div>
      </div>
    </section>

    <!-- SECCIÓN PARKING DIRECTO A LA HABITACIÓN (DE LA WEB OFICIAL) -->
    <section id="parking" class="section-editorial section-parking">
      <div class="editorial-container">
        <div class="parking-layout">
          <div>
            <span class="editorial-tag text-gold">DISCRECIÓN Y PRIVACIDAD ABSOLUTA</span>
            <h2 class="editorial-headline" style="color: #ffffff; margin-top: 0.5rem;">Parking Directo a la Habitación</h2>
            <p style="color: #cbd5e1; font-size: 1.05rem; line-height: 1.7; margin-top: 1.25rem;">
              Pensando en tu privacidad y hermetismo, contamos con <strong>Parking Directo a la habitación</strong>. Ingresas con tu vehículo a una cochera privada individual con portón automatizado cerrado, conectada directamente al interior de tu suite.
            </p>
            <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem; color: #fbbf24;">
                <span style="font-size: 1.2rem;">✓</span>
                <span style="color: #e2e8f0; font-size: 0.95rem;">Cero contacto con recepción física ni zonas comunes.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem; color: #fbbf24;">
                <span style="font-size: 1.2rem;">✓</span>
                <span style="color: #e2e8f0; font-size: 0.95rem;">Portón cerrado individual exclusivo para tu habitación.</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem; color: #fbbf24;">
                <span style="font-size: 1.2rem;">✓</span>
                <span style="color: #e2e8f0; font-size: 0.95rem;">Atención y custodia perimetral discreta las 24 horas.</span>
              </div>
            </div>
            <div style="margin-top: 2.5rem; display: flex; gap: 1rem;">
              <a href="#habitaciones" class="btn-hero-primary" style="text-decoration: none;">VER SUITES CON COCHERA</a>
              <a href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20consultar%20disponibilidad%20de%20habitaciones%20con%20parking%20directo." target="_blank" rel="noopener noreferrer" class="btn-hero-secondary" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
                <span>💬 WhatsApp Directo</span>
              </a>
            </div>
          </div>
          <div>
            <img src="/images/servicios/parking-directo.png" alt="Parking directo a la habitación Hotel Wimbledon" class="parking-banner-img" loading="lazy" />
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIÓN DECORACIONES ESPECIALES (DE LA WEB OFICIAL) -->
    <section id="decoraciones" class="section-editorial section-decoraciones">
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; max-width: 820px; margin: 0 auto;">
          <span class="editorial-tag text-gold">OCASIONES INOLVIDABLES & ANIVERSARIOS</span>
          <h2 class="editorial-headline" style="color: #ffffff; margin-top: 0.5rem;">Decoraciones Románticas Especiales</h2>
          <p style="color: #94a3b8; margin-top: 0.75rem; font-size: 1.05rem; line-height: 1.6;">
            Enamórate de nuestras decoraciones que tenemos para ti; encontrarás diseños sencillos pero hermosos, y también ambientaciones modernas y elegantes para celebrar aniversarios, cumpleaños o noches especiales.
          </p>
        </div>

        <div class="decoraciones-grid">
          <!-- Decoración 1 -->
          <div class="deco-card">
            <div class="deco-img-wrap">
              <img src="/images/decoraciones/decoracion-1.jpg" alt="Decoración 1 Aniversario Hotel Wimbledon" class="deco-img" loading="lazy" />
              <span class="deco-badge">Pack Pasión & Globos</span>
            </div>
            <div class="deco-info">
              <h3 class="deco-title">Decoración 1 — Velada Romántica</h3>
              <p class="deco-desc">
                Arreglo temático con globos metalizados en tonos rojos y dorados, letrero luminoso LED, pétalos de rosa sobre la cama y copas de champaña para brindar.
              </p>
              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fbbf24; font-weight: 700; font-size: 1.1rem;">S/ 60.00</span>
                <button class="btn-compact-reserve js-add-deco" data-deco="1" style="padding: 0.55rem 1rem;">Solicitar con Reserva</button>
              </div>
            </div>
          </div>

          <!-- Decoración 2 -->
          <div class="deco-card">
            <div class="deco-img-wrap">
              <img src="/images/decoraciones/decoracion-2.jpg" alt="Decoración 2 Jacuzzi Hotel Wimbledon" class="deco-img" loading="lazy" />
              <span class="deco-badge">Pack Jacuzzi & Velas</span>
            </div>
            <div class="deco-info">
              <h3 class="deco-title">Decoración 2 — Noche Íntima Jacuzzi</h3>
              <p class="deco-desc">
                Ambientación sensorial con velas aromáticas LED alrededor de la tina de hidromasaje, sales minerales relajantes, pétalos y espumante helado en hielera.
              </p>
              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fbbf24; font-weight: 700; font-size: 1.1rem;">S/ 75.00</span>
                <button class="btn-compact-reserve js-add-deco" data-deco="2" style="padding: 0.55rem 1rem;">Solicitar con Reserva</button>
              </div>
            </div>
          </div>

          <!-- Decoración 3 -->
          <div class="deco-card">
            <div class="deco-img-wrap">
              <img src="/images/decoraciones/decoracion-3.jpg" alt="Decoración 3 Presidencial Hotel Wimbledon" class="deco-img" loading="lazy" />
              <span class="deco-badge">Pack Luxury Aniversario</span>
            </div>
            <div class="deco-info">
              <h3 class="deco-title">Decoración 3 — Experiencia Completa</h3>
              <p class="deco-desc">
                Decoración premium integral en suite con bouquet de flores naturales, caja de bombones finos Ferrero Rocher, iluminación tenue y botella de espumante Riccadonna.
              </p>
              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fbbf24; font-weight: 700; font-size: 1.1rem;">S/ 95.00</span>
                <button class="btn-compact-reserve js-add-deco" data-deco="3" style="padding: 0.55rem 1rem;">Solicitar con Reserva</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIÓN CARRUSEL GRANDE DE SERVICIOS & INSTALACIONES EXCLUSIVAS (DESAPARICIÓN CINEMÁTICA) -->
    <section id="experiencia" class="services-carousel-section" aria-labelledby="experienciaTitle">
      <div class="editorial-container">
        <div class="editorial-header-block reveal">
          <span class="editorial-tag">INSTALACIONES & EXPERIENCIA</span>
          <h2 id="experienciaTitle" class="editorial-headline" style="color: var(--color-white);">Servicios & Amenidades Exclusivas</h2>
          <p style="color: #cbd5e1; margin-top: 0.75rem; font-size: 1.05rem; line-height: 1.6; max-width: 720px;">
            Instalaciones privadas de alto confort: jacuzzis climatizados, sauna finlandés, cochera directa y servicio gourmet las 24 horas.
          </p>
        </div>

        <!-- CHIPS SELECTORES DE AMENIDAD SUPERIOR -->
        <div class="services-nav-chips reveal" id="servicesNavChips" role="tablist" aria-label="Navegación de servicios">
          <button type="button" class="service-nav-chip active" data-index="0" role="tab" aria-selected="true">
            01 Jacuzzi Privado
          </button>
          <button type="button" class="service-nav-chip" data-index="1" role="tab" aria-selected="false">
            02 Cochera Directa
          </button>
          <button type="button" class="service-nav-chip" data-index="2" role="tab" aria-selected="false">
            03 Bar & Mixología
          </button>
          <button type="button" class="service-nav-chip" data-index="3" role="tab" aria-selected="false">
            04 Cámara Seca & Sauna
          </button>
          <button type="button" class="service-nav-chip" data-index="4" role="tab" aria-selected="false">
            05 Room Service 24/7
          </button>
          <button type="button" class="service-nav-chip" data-index="5" role="tab" aria-selected="false">
            06 Vista al Mar
          </button>
        </div>

        <!-- ESCENARIO PRINCIPAL DEL CARRUSEL GRANDE (CON EFECTO DISOLVER / DESAPARICIÓN) -->
        <div class="services-showcase-stage" id="servicesShowcaseStage" aria-live="polite">
          <!-- Slide 01: Jacuzzi -->
          <article class="services-showcase-slide active" data-index="0" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/suites/jacuzzi-deluxe.jpg" alt="Tina de hidromasaje y jacuzzi privado en suite Hotel Wimbledon" class="service-slide-img" loading="eager" />
              <span class="service-slide-badge">Bienestar & Confort</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">01</span>
              <span class="service-slide-tag">HIDROMASAJE EN SUITE</span>
              <h3 class="service-slide-title">Jacuzzi Privado & Hidromasaje</h3>
              <div class="service-slide-subtitle">Sistema de termoterapia e inmersión a 38°C</div>
              <p class="service-slide-desc">
                Tina de hidromasaje climatizada de alta presión con boquillas regulables, sistema de recirculación continua a 38°C, sales minerales aromáticas y cromoterapia LED integrada. Máximo relax y confort ergonómico para dos personas.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>Agua Climatizada 38°C</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Cromoterapia LED</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Sales Minerales Incluidas</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Desinfección UV Sanitaria</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#habitaciones" class="service-cta-btn">Ver suites con jacuzzi →</a>
              </div>
            </div>
          </article>

          <!-- Slide 02: Estacionamiento -->
          <article class="services-showcase-slide" data-index="1" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/servicios/parking-directo.png" alt="Cochera individual privada con acceso directo a suite Hotel Wimbledon" class="service-slide-img" loading="lazy" />
              <span class="service-slide-badge">Discreción Absoluta</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">02</span>
              <span class="service-slide-tag">ACCESO DIRECTO 24/7</span>
              <h3 class="service-slide-title">Cochera Privada & Acceso Directo</h3>
              <div class="service-slide-subtitle">Ingreso vehicular reservado con portón automatizado</div>
              <p class="service-slide-desc">
                Espacio individual de aparcamiento cerrado con portón automático de apertura inmediata. Permite ingresar y retirarse directamente a la suite sin transitar por zonas comunes ni interactuar físicamente en recepción.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>Portón Automatizado</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Entrada Directa Interna</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Vigilancia Perimetral 24/7</span></div>
                <div class="service-slide-pill"><span>✓</span><span>100% Cero Contacto</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#habitaciones" class="service-cta-btn">Ver suites con cochera →</a>
              </div>
            </div>
          </article>

          <!-- Slide 03: Bar & Mixología -->
          <article class="services-showcase-slide" data-index="2" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/gastro/pisco-sour.jpg" alt="Coctelería de autor y Pisco Sour Catedral Hotel Wimbledon" class="service-slide-img" loading="lazy" />
              <span class="service-slide-badge">Coctelería Gourmet</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">03</span>
              <span class="service-slide-tag">LICORES & CÓCTELES</span>
              <h3 class="service-slide-title">Bar & Mixología de Autor</h3>
              <div class="service-slide-subtitle">Carta exclusiva de cócteles clásicos y licores reserva</div>
              <p class="service-slide-desc">
                Más de 70 referencias en whiskies importados, vodkas, tequilas, champagnes franceses y vinos de reserva. Elaboración en minutos con hielo cristalino y cristalería premium, servido directamente a la puerta de su suite.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>70+ Etiquetas Importadas</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Coctelería de Autor</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Champagnes y Espumantes</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Servicio Continuo 24 Horas</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#gastronomia" class="service-cta-btn">Explorar carta del bar →</a>
              </div>
            </div>
          </article>

          <!-- Slide 04: Cámara Seca & Sauna -->
          <article class="services-showcase-slide" data-index="3" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/suites/suite-presidencial-camara-seca.jpg" alt="Cámara seca revestida en madera en suite Hotel Wimbledon" class="service-slide-img" loading="lazy" />
              <span class="service-slide-badge">Relajación & Desintoxicación</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">04</span>
              <span class="service-slide-tag">SAUNA FINLANDÉS</span>
              <h3 class="service-slide-title">Cámara Seca & Sauna Privado</h3>
              <div class="service-slide-subtitle">Revestimiento en cedro aromático selecto y piedras volcánicas</div>
              <p class="service-slide-desc">
                Espacio térmico individual revestido en cedro aromático selecto, dotado de panel digital para regular la temperatura, piedras volcánicas, esencias puras de eucalipto y ducha española contigua de alto caudal.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>Cedro Aromático Natural</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Termostato Digital Regulable</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Ducha Española Contigua</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Aromaterapia Eucalipto Puro</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#habitaciones" class="service-cta-btn">Ver suites con sauna →</a>
              </div>
            </div>
          </article>

          <!-- Slide 05: Room Service -->
          <article class="services-showcase-slide" data-index="4" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/gastro/hamburguesa-smash.png" alt="Hamburguesa Smash y platos gourmet Hotel Wimbledon" class="service-slide-img" loading="lazy" />
              <span class="service-slide-badge">Gastronomía 24 Horas</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">05</span>
              <span class="service-slide-tag">CARTA DIRECTA A LA SUITE</span>
              <h3 class="service-slide-title">Room Service Gourmet 24/7</h3>
              <div class="service-slide-subtitle">Cocina de autor elaborada al instante con entrega reservada</div>
              <p class="service-slide-desc">
                Carta completa de platos elaborados al instante: smash burgers de carne angus, broaster crujiente, sándwiches artesanales, piqueos calientes y coctelería. Entrega discreta y hermética a través de compartimento privado.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>Platos Preparados al Momento</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Ventanilla Hermética Privada</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Atención Continua 24/7</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Empaque Térmico de Alta Higiene</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#gastronomia" class="service-cta-btn">Ver carta de comidas →</a>
              </div>
            </div>
          </article>

          <!-- Slide 06: Vista al Mar -->
          <article class="services-showcase-slide" data-index="5" role="tabpanel">
            <div class="service-slide-media-wrap">
              <img src="/images/suites/simple-vista-al-mar.jpg" alt="Vista al mar frente al océano pacífico Hotel Wimbledon" class="service-slide-img" loading="lazy" />
              <span class="service-slide-badge">Horizonte & Costa Verde</span>
            </div>
            <div class="service-slide-content-wrap">
              <span class="service-slide-watermark" aria-hidden="true">06</span>
              <span class="service-slide-tag">FRENTE AL OCÉANO</span>
              <h3 class="service-slide-title">Suites con Vista Panorámica</h3>
              <div class="service-slide-subtitle">Ventanales directos al mar con aislamiento acústico integral</div>
              <p class="service-slide-desc">
                Cristales panorámicos de alta tecnología con vista directa al mar de San Miguel en la Costa Verde. Aislamiento termoacústico con doble acristalamiento y polarizado exterior de privacidad absoluta.
              </p>
              <div class="service-slide-pills">
                <div class="service-slide-pill"><span>✓</span><span>Vista Frontal al Océano</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Doble Vidrio Acústico</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Polarizado de Privacidad Total</span></div>
                <div class="service-slide-pill"><span>✓</span><span>Atardeceres Panorámicos</span></div>
              </div>
              <div class="service-slide-actions">
                <a href="#habitaciones" class="service-cta-btn">Ver suites frente al mar →</a>
              </div>
            </div>
          </article>
        </div>

        <!-- BARRA INFERIOR DE CONTROLES: CONTADOR, TRACK DE PROGRESO Y FLECHAS -->
        <div class="services-showcase-bar reveal">
          <div class="services-counter-wrap">
            <span class="services-counter-text" id="servicesSlideCounter">01 / 06</span>
            <div class="services-progress-track" aria-hidden="true">
              <div class="services-progress-bar" id="servicesProgressBar" style="width: 16.66%;"></div>
            </div>
          </div>
          <div class="services-arrows-wrap">
            <button type="button" class="service-arrow-btn" id="btnServicesPrev" aria-label="Amenidad anterior">
              ←
            </button>
            <button type="button" class="service-arrow-btn" id="btnServicesNext" aria-label="Siguiente amenidad">
              →
            </button>
          </div>
        </div>
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

    <!-- TESTIMONIOS & EXPERIENCIAS REALES DE PAREJAS (SUGERENTES & DISCRETAS) -->
    <section id="testimonios" class="section-testimonials" aria-labelledby="testimoniosHeading">
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; max-width: 820px; margin-left: auto; margin-right: auto;">
          <span class="editorial-tag">CONFIDENCIAL & EXCLUSIVO • EXPERIENCIAS DE HUÉSPEDES</span>
          <h2 id="testimoniosHeading" class="editorial-headline" style="color: var(--color-white);">Historias de Pasión & Confort Absoluto</h2>
          <p style="color: #cbd5e1; margin-top: 1rem; font-size: 1.05rem; line-height: 1.6;">
            Voces y vivencias de parejas que convirtieron una noche cualquiera en una experiencia ardiente e inolvidable. Cero miradas, máxima complicidad y discreción garantizada las 24 horas.
          </p>
        </div>

        <!-- BARRA DE MÉTRICAS & SOCIAL PROOF -->
        <div class="testimonials-stat-bar reveal">
          <div class="stat-pill">
            <span style="color: #fbbf24; font-size: 1.1rem;">★</span>
            <span><strong>4.9 / 5.0</strong> en Satisfacción de Parejas</span>
          </div>
          <div class="stat-pill">
            <span style="color: #fbbf24; font-size: 1.1rem;">🔒</span>
            <span><strong>100% Discreción</strong> y Cero Contacto</span>
          </div>
          <div class="stat-pill">
            <span style="color: #fbbf24; font-size: 1.1rem;">✨</span>
            <span><strong>+14,200</strong> Noches de Pasión Verificadas</span>
          </div>
        </div>

        <!-- SELECTORES / FILTROS DE CATEGORÍA -->
        <div class="testimonials-filter-chips reveal" id="testimonialsFilterChips" role="tablist" aria-label="Filtrar testimonios">
          <button type="button" class="testimonial-filter-btn active" data-filter="all" role="tab" aria-selected="true">
            🔥 Todas las Experiencias (6)
          </button>
          <button type="button" class="testimonial-filter-btn" data-filter="jacuzzi" role="tab" aria-selected="false">
            🛁 Jacuzzis & Hidromasaje
          </button>
          <button type="button" class="testimonial-filter-btn" data-filter="pole" role="tab" aria-selected="false">
            👠 Dark Fantasies & Pole Dance
          </button>
          <button type="button" class="testimonial-filter-btn" data-filter="romance" role="tab" aria-selected="false">
            🍓 Packs Romance & Aniversario
          </button>
          <button type="button" class="testimonial-filter-btn" data-filter="sauna" role="tab" aria-selected="false">
            🧖 Sauna Finlandés & Mar
          </button>
        </div>

        <!-- GRILLA DE TESTIMONIOS -->
        <div class="testimonials-grid" id="testimonialsGrid">
          <!-- Card 1: Jacuzzi Deluxe -->
          <article class="testimonial-card reveal" data-category="jacuzzi">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">🔥 Noche de Aniversario Ardiente</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “Llegamos por la <em>cochera privada con portón automático</em> y la adrenalina se disparó desde el primer segundo. El <em>jacuzzi con agua bien caliente y luces rojas tenues</em> fue de otro planeta... pusimos champán en el hidromasaje y <em>no salimos del agua en horas</em>. La privacidad es total, nadie te ve ni te interrumpe. Una de las noches más intensas y calientes de nuestras vidas.”
              </p>
              <div class="testimonial-highlight">
                <span>🍷</span> Incluyó Botella de Espumante & Hidromasaje 38°C
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">CR</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Camila & Renzo V. <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Presidencial con Jacuzzi & Sauna</span>
                <span class="testimonial-time">Hospedaje verificado • Hace 2 días</span>
              </div>
            </div>
          </article>

          <!-- Card 2: Pole Dance Dark Fantasies -->
          <article class="testimonial-card reveal" data-category="pole">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">👠 Fantasía Cumplida al Máximo</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “La suite Dark Fantasies con el <em>tubo de pole dance y los espejos gigantes en el techo y paredes</em> despertó cosas que teníamos pendientes cumplir hace tiempo. La atmósfera con las luces LED púrpuras y el <em>sillón tántrico erótico</em> nos encendió desde que cruzamos la puerta. <em>Desatamos todo sin preocuparnos por el ruido</em> porque la insonorización es perfecta. Salimos renovados y con ganas de repetir ya.”
              </p>
              <div class="testimonial-highlight">
                <span>🪞</span> Espejos en Techo, Tubo Pole Dance & Luces Neón
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">VS</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Valeria S. & Pareja <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Temática Dark Fantasies</span>
                <span class="testimonial-time">Hospedaje verificado • Fin de semana</span>
              </div>
            </div>
          </article>

          <!-- Card 3: Pack Romance & Fresas con Chocolate -->
          <article class="testimonial-card reveal" data-category="romance">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">💋 Piel a Flor de Piel</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “Pedí el pack de decoración con <em>pétalos de rosa, velas y fresas bañadas en chocolate</em>. Cuando ella abrió la puerta de la suite con las luces tenues y la tina humeando con sales aromáticas, la reacción fue instantánea: <em>no alcanzamos ni a soltar las maletas</em>. El servicio al cuarto por la <em>ventanilla ciega hermética</em> es 10/10: pedimos cócteles de madrugada sin tener que vestirnos ni cruzar miradas con nadie.”
              </p>
              <div class="testimonial-highlight">
                <span>🍓</span> Fresas con Chocolate & Ventanilla Cero Contacto
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">DA</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Diego & Andrea M. <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Jacuzzi Deluxe con Cochera</span>
                <span class="testimonial-time">Hospedaje verificado • Hace 5 días</span>
              </div>
            </div>
          </article>

          <!-- Card 4: Sauna Finlandés & Vista Mar -->
          <article class="testimonial-card reveal" data-category="sauna">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">🌊 Sauna, Coctelería & Placer Puro</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “Entrar a la <em>cámara de sauna finlandesa en cedro aromático a sudar juntos</em>, salir directo a la ducha española helada y de ahí a la cama king size <em>frente a los ventanales con el sonido del mar</em>... una combinación afrodisíaca incomparable. El Pisco Sour Catedral que nos subieron a la suite estuvo supremo. Te olvidas por completo del mundo exterior.”
              </p>
              <div class="testimonial-highlight">
                <span>🧖</span> Sauna Finlandés en Cedro & Ducha Española
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">FB</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Fernando B. & Pareja <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Cámara Seca & Vista al Mar</span>
                <span class="testimonial-time">Hospedaje verificado • Esta semana</span>
              </div>
            </div>
          </article>

          <!-- Card 5: Suite Presidencial Wimbledon -->
          <article class="testimonial-card reveal" data-category="jacuzzi">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">✨ Fuego & Confort Total</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “Buscábamos un escape íntimo donde <em>la privacidad fuera sagrada y el confort de primer nivel</em>. En Wimbledon todo está pensado para el disfrute en pareja sin tabúes. La <em>tina de hidromasaje doble es gigantesca</em>, la música por Bluetooth envolvente y la cama comodísima para <em>entregarse toda la noche sin prisas</em>. La mejor inversión para reavivar la llama.”
              </p>
              <div class="testimonial-highlight">
                <span>🎵</span> Sonido Bluetooth Envolvente & Tina Doble Extra-Grande
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">LK</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Luciana K. & M. <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Presidencial Wimbledon</span>
                <span class="testimonial-time">Hospedaje verificado • Hace 1 semana</span>
              </div>
            </div>
          </article>

          <!-- Card 6: Escapada Discreta -->
          <article class="testimonial-card reveal" data-category="romance">
            <div>
              <div class="testimonial-top">
                <span class="testimonial-badge">⚡ Escapada Secreta 100% Discreta</span>
                <span class="testimonial-stars" aria-label="5 de 5 estrellas">★★★★★</span>
              </div>
              <p class="testimonial-quote">
                “Aprovechamos una <em>escapada por la tarde para romper la rutina</em> y desconectar del estrés. Subes del auto directo a la suite sin pasar por recepción, aire acondicionado a punto, sábanas impecables y un <em>baño con hidromasaje que te deja con ganas de quedarte a vivir</em>. La velocidad con la que nos sirvieron los piqueos calientes fue de diez. Se convirtió en nuestro secreto favorito.”
              </p>
              <div class="testimonial-highlight">
                <span>🚗</span> Acceso Vehicular Directo & Discreción Absoluta
              </div>
            </div>
            <div class="testimonial-author">
              <div class="testimonial-avatar">JR</div>
              <div class="testimonial-meta">
                <span class="testimonial-name">Javier R. & C. <span class="verified-icon" title="Huésped Verificado">✓</span></span>
                <span class="testimonial-suite-tag">Suite Ejecutiva con Cochera Directa</span>
                <span class="testimonial-time">Hospedaje verificado • Hace 4 días</span>
              </div>
            </div>
          </article>
        </div>

        <!-- BANNER DE LLAMADO A LA ACCIÓN SEDUCTOR -->
        <div class="testimonials-cta-box reveal">
          <h3 class="testimonials-cta-title">Atrévete a Romper la Rutina Esta Noche</h3>
          <p class="testimonials-cta-desc">
            Elige tu suite privada con jacuzzi climatizado, cámara seca, pole dance o vista al mar. Acceso confidencial 24 horas y total privacidad garantizada.
          </p>
          <div class="testimonials-cta-actions">
            <button type="button" class="btn-hero-primary js-testimonial-reserve-btn" style="border: none; cursor: pointer; text-decoration: none;">
              ✨ RESERVAR MI SUITE PRIVADA AHORA
            </button>
            <a href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20consultar%20disponibilidad%20de%20suites%20con%20jacuzzi%20para%20hoy" target="_blank" rel="noopener noreferrer" class="btn-hero-secondary" style="text-decoration: none;">
              💬 WhatsApp Confidencial 24/7
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- UBICACIÓN & ACCESO PRIVADO (MAPA & REFERENCIAS DIRECTAS) -->
    <section id="ubicacion" class="section-editorial bg-black" aria-labelledby="ubicacionHeading">
      <span id="reserva" style="display:block; position:relative; top:-80px; visibility:hidden;" aria-hidden="true"></span>
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; max-width: 800px; margin-left: auto; margin-right: auto;">
          <span class="editorial-tag">LOCALIZACIÓN PRIVADA & ACCESO DIRECTO</span>
          <h2 id="ubicacionHeading" class="editorial-headline" style="color: var(--color-white);">Nuestra Ubicación & Cómo Llegar</h2>
          <p style="color: #cbd5e1; margin-top: 1rem; font-size: 1.05rem; line-height: 1.6;">
            Ubicados estratégicamente frente al mar en la Costa Verde de San Miguel. Discreción total con ingreso vehicular individual y estacionamiento privado directo a la habitación las 24 horas.
          </p>
        </div>
        <div class="ubicacion-grid-wrap reveal">
          <!-- Columna Izquierda: Información de Contacto y Accesos (40%) -->
          <div class="ubicacion-info-card">
            <div class="ubicacion-info-item">
              <span class="ubicacion-icon" aria-hidden="true">📍</span>
              <div>
                <h4 class="ubicacion-item-title">Dirección Exacta</h4>
                <p class="ubicacion-item-desc">Av. Costanera 2098, San Miguel (Cdra. 20 Av. La Paz) — Lima, Perú</p>
              </div>
            </div>
            <div class="ubicacion-info-item">
              <span class="ubicacion-icon" aria-hidden="true">🚗</span>
              <div>
                <h4 class="ubicacion-item-title">Estacionamiento Privado</h4>
                <p class="ubicacion-item-desc">Cochera techada individual con portón automatizado directo a la suite, sin pasar por recepción física.</p>
              </div>
            </div>
            <div class="ubicacion-info-item">
              <span class="ubicacion-icon" aria-hidden="true">🕒</span>
              <div>
                <h4 class="ubicacion-item-title">Horario de Atención</h4>
                <p class="ubicacion-item-desc">Atención continua e ininterrumpida las 24 horas del día, los 365 días del año.</p>
              </div>
            </div>
            <div class="ubicacion-info-item">
              <span class="ubicacion-icon" aria-hidden="true">📞</span>
              <div>
                <h4 class="ubicacion-item-title">Central Telefónica</h4>
                <p class="ubicacion-item-desc">(01) 578-6000 • +51 990 370 681</p>
              </div>
            </div>

            <!-- Botones de Acción de Ubicación -->
            <div class="ubicacion-actions">
              <a 
                href="https://maps.google.com/?q=Av.+Costanera+2098,+San+Miguel,+Lima" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="btn-ubicacion-maps"
              >
                🗺️ Abrir en Google Maps / Waze
              </a>
              <a 
                href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20consultar%20disponibilidad%20y%20cómo%20llegar." 
                target="_blank" 
                rel="noopener noreferrer" 
                class="btn-ubicacion-wsp"
              >
                💬 Consultar por WhatsApp
              </a>
            </div>
          </div>

          <!-- Columna Derecha: Mapa Google Maps (60%) -->
          <div class="ubicacion-map-frame">
            <iframe 
              title="Mapa de ubicación Hotel Wimbledon"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.37340638531!2d-77.0945!3d-12.0864!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c963625f2ed9%3A0x88981f4a9bb540c4!2sAv.%20Costanera%202098%2C%20San%20Miguel%2015087!5e0!3m2!1ses!2spe!4v1700000000000!5m2!1ses!2spe" 
              width="100%" 
              height="480" 
              style="border:0;" 
              allowfullscreen="" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade"
              class="google-map-iframe"
            ></iframe>
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
          <a href="#testimonios">EXPERIENCIAS</a>
          <a href="#ubicacion">UBICACIÓN</a>
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

    <!-- BOTÓN FLOTANTE WHATSAPP (ATENCIÓN & CLIENTES HABITUALES) -->
    <div class="floating-whatsapp-container" id="floatingWhatsappWrap">
      <a 
        href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20consultar%20y%20reservar%20una%20suite." 
        target="_blank" 
        rel="noopener noreferrer" 
        class="floating-whatsapp-btn"
        id="btnFloatingWhatsapp"
        aria-label="Escribir por WhatsApp a recepción (Atención 24/7)"
      >
        <div class="whatsapp-tooltip-pill">
          <span class="whatsapp-pill-badge">
            <span class="whatsapp-status-dot"></span>
            EN LÍNEA 24/7
          </span>
          <span class="whatsapp-pill-text">Escríbenos al WhatsApp</span>
        </div>
        <div class="whatsapp-icon-circle">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="#ffffff" aria-hidden="true">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.771.815 2.796.815 3.182 0 5.767-2.587 5.768-5.766.001-3.181-2.585-5.767-5.768-5.767zm0 10.455c-.943 0-1.745-.27-2.502-.721l-.179-.107-1.862.488.497-1.816-.118-.188a4.67 4.67 0 0 1-.724-2.545c.001-2.587 2.106-4.692 4.693-4.692 2.586 0 4.691 2.105 4.691 4.692 0 2.586-2.105 4.689-4.496 4.689zm7.969-4.689c-.002-4.398-3.579-7.974-7.978-7.974-4.397 0-7.975 3.576-7.976 7.974 0 1.405.367 2.775 1.063 3.98l-1.129 4.125 4.221-1.107c1.168.636 2.487.972 3.821.972 4.398 0 7.977-3.576 7.978-7.97zm2 0c0 5.514-4.486 10-10 10-1.724 0-3.344-.442-4.764-1.218l-5.236 1.372 1.396-5.105c-.86-1.468-1.396-3.176-1.396-5.049 0-5.514 4.486-10 10-10s10 4.486 10 10z"/>
          </svg>
        </div>
      </a>
    </div>
  `;
  renderSuitesList('all');
  renderGastronomiaList();
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
  const trackContainer = document.getElementById('suitesCarouselTrackContainer') || document.getElementById('suitesHorizontalTrack');
  const gridContainer = document.getElementById('suitesGridView');

  const filtered = roomsData.filter(room => roomMatchesFilter(room, filterCategory));

  // 1. Render Carrusel Compacto de Suites (Foto real 800x600, tarjeta elegante, no secuestra la pantalla)
  if (trackContainer) {
    if (filtered.length === 0) {
      trackContainer.innerHTML = `<div style="padding: 3rem; text-align: center; color: #94a3b8; width: 100%;">No hay suites disponibles con este filtro.</div>`;
    } else {
      trackContainer.innerHTML = filtered.map((room, index) => {
        const amenities = parseAmenitiesText(room.descripcion);
        const categoryName = room.categoria_nombre || 'Suite de Lujo';
        const priceDisplay = room.precio ? `${room.precio}` : 'S/ 150';
        return `
          <div class="suite-card-compact" data-id="${room.id}">
            <div class="suite-compact-media js-open-drawer" data-id="${room.id}" title="Ver Ficha Técnica y Galería">
              <img src="${room.imagen_url || '/images/suites/suite-presidencial.jpg'}" onerror="this.onerror=null; this.src='/images/suites/suite-presidencial.jpg';" alt="${room.nombre}" class="suite-compact-img" loading="lazy" />
              <span class="suite-compact-price-pill">${priceDisplay} / 6h</span>
              <span class="suite-compact-cat-pill">${categoryName}</span>
            </div>
            <div class="suite-compact-body">
              <h3 class="suite-compact-title">${room.nombre}</h3>
              <div class="suite-compact-pills">
                ${amenities.slice(0, 2).map(a => `<span class="suite-compact-pill">${a}</span>`).join('')}
              </div>
              <div class="suite-compact-actions">
                <button class="btn-compact-reserve js-direct-checkout" data-id="${room.id}">
                  Reservar
                </button>
                <button class="btn-compact-details js-open-drawer" data-id="${room.id}">
                  Detalles
                </button>
              </div>
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
              <img src="${room.imagen_url || '/images/suites/suite-presidencial.jpg'}" onerror="this.onerror=null; this.src='/images/suites/suite-presidencial.jpg';" alt="${room.nombre}" class="suite-grid-img" loading="lazy" />
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
  setupDecoracionesListeners();

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
        <img src="${item.img}" onerror="this.onerror=null; this.src='/images/suites/suite-presidencial.jpg';" alt="${item.nombre}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'" loading="lazy" />
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
      const name = e.currentTarget.getAttribute('data-name');
      const price = e.currentTarget.getAttribute('data-price');
      preorderGastroItem({ name, price });
    };
  });
}

function showToastNotification(message, duration = 3500) {
  let toast = document.getElementById('wimbledonGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wimbledonGlobalToast';
    toast.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; z-index: 99999; background: #0f172a; color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); padding: 0.85rem 1.25rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.8); transition: all 0.3s ease; opacity: 0; transform: translateY(10px); pointer-events: none; max-width: 380px;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, duration);
}

function preorderGastroItem(item) {
  const cleanName = (item.name || '').replace(/[\r\n]+/g, ' ').trim();
  const lastBookingStr = localStorage.getItem('wimbledon_last_booking');
  if (lastBookingStr) {
    try {
      const booking = JSON.parse(lastBookingStr);
      booking.gastroOrders = booking.gastroOrders || [];
      const existing = booking.gastroOrders.find(o => o.name === cleanName);
      if (existing) {
        existing.qty += 1;
      } else {
        booking.gastroOrders.push({ name: cleanName, price: item.price, qty: 1 });
      }
      localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
      const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
      const idx = list.findIndex(b => b.id === booking.id);
      if (idx !== -1) {
        list[idx] = booking;
        localStorage.setItem('wimbledon_bookings', JSON.stringify(list));
      }
      showToastNotification(`🛎️ Añadido a tu habitación (${booking.id}): ${cleanName} (x${existing ? existing.qty : 1})`);
      return;
    } catch (e) {}
  }
  const msg = encodeURIComponent(`Pedido: ${cleanName} (${item.price}) — Habitación pendiente de check-in`);
  window.open(`https://wa.me/51990370681?text=${msg}`, '_blank');
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
      <img src="${room.imagen_url || '/images/suites/suite-presidencial.jpg'}" onerror="this.onerror=null; this.src='/images/suites/suite-presidencial.jpg';" alt="${spec.nombre}" class="drawer-spec-img" />
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
  const promoReserveBtn = document.getElementById('btnPromoReserve');
  const openDefaultCheckout = () => {
    const defaultRoomId = roomsData.length > 0 ? roomsData[0].id : 860;
    openCheckoutModal(defaultRoomId);
  };
  if (headerBtn) headerBtn.onclick = openDefaultCheckout;
  if (heroReserveBtn) heroReserveBtn.onclick = openDefaultCheckout;
  if (promoReserveBtn) promoReserveBtn.onclick = openDefaultCheckout;
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

let checkoutDelegationBound = false;

function bindCheckoutModalDelegationOnce() {
  if (checkoutDelegationBound) return;
  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return;

  // Delegación de clic para chips, métodos de pago y extras
  modalBody.addEventListener('click', (e) => {
    // 1. Selector de chip (duración u horario)
    const chip = e.target.closest('.chip-option');
    if (chip) {
      const group = chip.getAttribute('data-group');
      const val = chip.getAttribute('data-value');
      if (group && val) selectChip(group, val);
      return;
    }

    // 2. Tarjeta de medio de pago
    const payCard = e.target.closest('.payment-card');
    if (payCard) {
      const group = payCard.getAttribute('data-group');
      const val = payCard.getAttribute('data-value');
      if (group && val) selectChip(group, val);
      return;
    }

    // 3. Tarjeta de extra
    const extraCard = e.target.closest('.extra-option-card');
    if (extraCard) {
      const extraId = extraCard.getAttribute('data-extra');
      if (extraId) toggleExtra(extraId);
      return;
    }
  });

  // Delegación de cambio en selector de suite y horario
  modalBody.addEventListener('change', (e) => {
    if (e.target.id === 'roomSwitcher') {
      checkoutState.roomId = String(e.target.value);
      updateRoomSummaryOnly(); // No destruye los inputs del formulario
    } else if (e.target.id === 'checkoutArrivalTime') {
      checkoutState.arrivalTime = e.target.value;
    }
  });

  // Accesibilidad de teclado (Enter / Space activa chips)
  modalBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const interactive = e.target.closest('.chip-option, .payment-card, .extra-option-card');
    if (interactive) {
      e.preventDefault();
      interactive.click();
    }
  });

  checkoutDelegationBound = true;
}

function selectChip(group, value) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(chip => {
    const isSelected = chip.getAttribute('data-value') === value;
    chip.classList.toggle('active', isSelected);
    chip.setAttribute('aria-checked', String(isSelected));
  });
  checkoutState[group] = value;

  updateSummaryTotal();
}

function toggleExtra(extraId) {
  if (checkoutState.selectedExtras.includes(extraId)) {
    checkoutState.selectedExtras = checkoutState.selectedExtras.filter(id => id !== extraId);
  } else {
    checkoutState.selectedExtras.push(extraId);
  }
  const card = document.querySelector(`[data-extra="${extraId}"]`);
  if (card) {
    const isSelected = checkoutState.selectedExtras.includes(extraId);
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
    const statusText = card.querySelector('.extra-status-text');
    if (statusText) {
      statusText.textContent = isSelected ? '✓ Incluido' : '+ Agregar';
      statusText.style.color = isSelected ? '#fbbf24' : '#64748b';
    }
  }
  updateSummaryTotal();
}

function updateRoomSummaryOnly() {
  const room = roomsData.find(r => String(r.id) === String(checkoutState.roomId));
  if (!room) return; // Guard clause defensivo (Solución #1 - v4)

  const titleEl = document.getElementById('checkoutRoomTitle');
  if (titleEl) titleEl.textContent = `Reservar ${room.nombre}`;

  const metaEl = document.getElementById('checkoutRoomMeta');
  if (metaEl) {
    metaEl.textContent = `${room.categoria_nombre || 'Suite de Lujo'} • Tarifa Base: ${room.precio || 'S/ 150'} • Cochera Privada Directa`;
  }

  // Actualizar subtítulos dinámicos de duración según la tarifa base de la nueva suite
  const basePrice = parseBasePrice(room.precio);
  const dur3Sub = document.querySelector('[data-group="duration"][data-value="3 Horas"] .chip-sub');
  if (dur3Sub) dur3Sub.textContent = `S/ ${calculateDynamicPrice(basePrice, '3 Horas')} (-30%)`;
  const dur6Sub = document.querySelector('[data-group="duration"][data-value="6 Horas"] .chip-sub');
  if (dur6Sub) dur6Sub.textContent = `S/ ${calculateDynamicPrice(basePrice, '6 Horas')} (Estándar)`;
  const durNocheSub = document.querySelector('[data-group="duration"][data-value="Toda la Noche"] .chip-sub');
  if (durNocheSub) durNocheSub.textContent = `S/ ${calculateDynamicPrice(basePrice, 'Toda la Noche')} (hasta 12 PM)`;

  updateSummaryTotal();
}

function updateSummaryTotal() {
  const room = roomsData.find(r => String(r.id) === String(checkoutState.roomId)) || roomsData[0];
  if (!room) return;
  const basePrice = parseBasePrice(room.precio);
  const totalPrice = calculateTotalWithExtras(basePrice, checkoutState.duration, checkoutState.selectedExtras);

  const totalEl = document.getElementById('summaryTotalVal');
  if (totalEl) totalEl.textContent = `S/ ${totalPrice}.00`;

  const btnSubmit = document.getElementById('btnSubmitBooking');
  if (btnSubmit) btnSubmit.textContent = `CONFIRMAR RESERVA Y EMITIR PASE (S/ ${totalPrice}.00 en Recepción)`;

  const summaryDesc = document.getElementById('summaryDetailsDesc');
  if (summaryDesc) {
    summaryDesc.textContent = `${checkoutState.duration} ${checkoutState.selectedExtras.length > 0 ? `+ ${checkoutState.selectedExtras.length} Extras` : ''} • Sin cobros en línea`;
  }
}

function openCheckoutModal(roomId, initialOptions = {}) {
  const defaultId = roomsData.length > 0 ? roomsData[0].id : 860;
  const selectedId = roomId ? String(roomId) : String(defaultId);
  const room = roomsData.find(r => String(r.id) === selectedId) || roomsData[0];
  if (!room) return;

  checkoutState = {
    roomId: String(room.id),
    duration: initialOptions.duration || '6 Horas',
    arrivalTime: initialOptions.arrivalTime || 'En 30 min',
    customTime: '',
    paymentMethod: 'efectivo',
    customerName: initialOptions.customerName || '',
    customerPhone: initialOptions.customerPhone || '',
    selectedExtras: []
  };

  renderCheckoutModalContent();
  bindCheckoutModalDelegationOnce();

  const modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function renderCheckoutModalContent() {
  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return;
  const room = roomsData.find(r => String(r.id) === String(checkoutState.roomId)) || roomsData[0];
  const basePrice = parseBasePrice(room.precio);
  const totalPrice = calculateTotalWithExtras(basePrice, checkoutState.duration, checkoutState.selectedExtras);

  modalBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.25rem;">
      <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">RESERVA DISCRETA • HOTEL DE PASO</span>
      <h2 id="checkoutRoomTitle" style="font-family: var(--font-serif); font-size: 1.85rem; color: #fff; margin-top: 0.25rem;">
        Reservar ${room.nombre}
      </h2>
      <p id="checkoutRoomMeta" style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.2rem;">
        ${room.categoria_nombre || 'Suite de Lujo'} • Tarifa Base: ${room.precio || 'S/ 150'} • Cochera Privada Directa
      </p>
    </div>

    <!-- COMBO BOX: HABITACIONES DISPONIBLES -->
    <div style="margin-bottom: 1.25rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 0.85rem 1rem;">
      <label for="roomSwitcher" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #fbbf24; font-weight: bold; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
        <span>HABITACIÓN / SUITE (COMBO BOX)</span>
        <span style="color: #34d399; font-size: 0.7rem; font-weight: 600;">● SELECCIONA TU SUITE</span>
      </label>
      <select id="roomSwitcher" class="room-switcher" style="width: 100%; padding: 0.75rem 0.9rem; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-family: var(--font-sans); font-size: 0.95rem; cursor: pointer; outline: none;">
        ${roomsData.map(r => `
          <option value="${String(r.id)}" ${String(r.id) === String(checkoutState.roomId) ? 'selected' : ''}>
            🟢 ${r.nombre} — ${r.precio || 'S/ 150'} (${r.categoria_nombre || 'Suite'}) • DISPONIBLE
          </option>
        `).join('')}
      </select>
    </div>

    <!-- COMBO BOX: HORARIO ESTIMADO DE LLEGADA (DISPONIBLE) -->
    <div style="margin-bottom: 1.25rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 0.85rem 1rem;">
      <label for="checkoutArrivalTime" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #38bdf8; font-weight: bold; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
        <span>HORA DE LLEGADA (COMBO BOX DISPONIBILIDAD)</span>
        <span style="color: #38bdf8; font-size: 0.7rem; font-weight: 600;">⏱️ HORARIO DISPONIBLE</span>
      </label>
      <select id="checkoutArrivalTime" class="room-switcher" style="width: 100%; padding: 0.75rem 0.9rem; background: #0b0f19; border: 1px solid #334155; border-radius: 8px; color: #fff; font-family: var(--font-sans); font-size: 0.95rem; cursor: pointer; outline: none;">
        <option value="En 30 min" ${checkoutState.arrivalTime === 'En 30 min' ? 'selected' : ''}>🟢 Inmediato (Llegada en 30 min) — Suite Disponible Inmediata</option>
        <option value="20:00" ${checkoutState.arrivalTime === '20:00' ? 'selected' : ''}>🟢 20:00 hrs (Turno Noche) — Suite Disponible</option>
        <option value="21:00" ${checkoutState.arrivalTime === '21:00' ? 'selected' : ''}>🟢 21:00 hrs (Turno Noche) — Suite Disponible</option>
        <option value="22:00" ${checkoutState.arrivalTime === '22:00' ? 'selected' : ''}>🟢 22:00 hrs (Noche Plena) — Suite Disponible</option>
        <option value="23:00" ${checkoutState.arrivalTime === '23:00' ? 'selected' : ''}>🟢 23:00 hrs (Noche Plena) — Suite Disponible</option>
        <option value="00:00" ${checkoutState.arrivalTime === '00:00' ? 'selected' : ''}>🟢 00:00 hrs (Madrugada) — Suite Disponible</option>
        <option value="01:00" ${checkoutState.arrivalTime === '01:00' ? 'selected' : ''}>🟢 01:00 hrs (Madrugada) — Suite Disponible</option>
        <option value="02:00" ${checkoutState.arrivalTime === '02:00' ? 'selected' : ''}>🟢 02:00 hrs (Madrugada) — Suite Disponible</option>
        <option value="04:00" ${checkoutState.arrivalTime === '04:00' ? 'selected' : ''}>🟢 04:00 hrs (Madrugada) — Suite Disponible</option>
        <option value="08:00" ${checkoutState.arrivalTime === '08:00' ? 'selected' : ''}>🟢 08:00 hrs (Turno Mañana) — Suite Disponible</option>
        <option value="12:00" ${checkoutState.arrivalTime === '12:00' ? 'selected' : ''}>🟢 12:00 hrs (Turno Mediodía) — Suite Disponible</option>
        <option value="16:00" ${checkoutState.arrivalTime === '16:00' ? 'selected' : ''}>🟢 16:00 hrs (Turno Tarde) — Suite Disponible</option>
      </select>
    </div>

    <!-- ÍNDICE DE SECCIONES -->
    <div class="checkout-sections-index">
      <span>1. Duración</span>
      <span class="step-sep">•</span>
      <span>2. Extras</span>
      <span class="step-sep">•</span>
      <span>3. Pago en Recepción</span>
      <span class="step-sep">•</span>
      <span>4. Emitir Pase</span>
    </div>

    <form id="checkoutDynamicForm">
      <!-- PASO 1: DURACIÓN DE ESTADÍA -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 1 — SELECCIONA LA DURACIÓN
        </label>
        <div class="chip-group" role="radiogroup" aria-label="Duración de la estancia" data-group="duration">
          <button type="button" class="chip-option ${checkoutState.duration === '3 Horas' ? 'active' : ''}" role="radio" data-group="duration" data-value="3 Horas" aria-checked="${checkoutState.duration === '3 Horas'}">
            <span class="chip-title">3 Horas</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, '3 Horas')} (-30%)</span>
          </button>
          <button type="button" class="chip-option ${checkoutState.duration === '6 Horas' ? 'active' : ''}" role="radio" data-group="duration" data-value="6 Horas" aria-checked="${checkoutState.duration === '6 Horas'}">
            <span class="chip-title">6 Horas</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, '6 Horas')} (Estándar)</span>
          </button>
          <button type="button" class="chip-option ${checkoutState.duration === 'Toda la Noche' ? 'active' : ''}" role="radio" data-group="duration" data-value="Toda la Noche" aria-checked="${checkoutState.duration === 'Toda la Noche'}">
            <span class="chip-title">Toda la Noche</span>
            <span class="chip-sub">S/ ${calculateDynamicPrice(basePrice, 'Toda la Noche')} (hasta 12 PM)</span>
          </button>
        </div>
      </div>

      <!-- PASO 2: EXTRAS Y EXPERIENCIAS (OPCIONAL) -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 2 — PERSONALIZA TU ESTADÍA (OPCIONAL)
        </label>
        <span style="font-size: 0.72rem; color: #94a3b8; display: block; margin-bottom: 0.6rem;">Encuentra tu suite decorada y preparada con total discreción al ingresar.</span>
        
        <div class="checkout-extras-grid">
          ${AVAILABLE_EXTRAS.map(extra => {
            const isSelected = checkoutState.selectedExtras.includes(extra.id);
            return `
              <button type="button" class="extra-option-card ${isSelected ? 'selected' : ''}" role="button" data-extra="${extra.id}" aria-pressed="${isSelected}" style="text-align: left; background: #0f172a; border: 1px solid ${isSelected ? '#fbbf24' : '#334155'}; cursor: pointer; width: 100%;">
                <div>
                  <div class="extra-title-row">
                    <span class="extra-name">${extra.name}</span>
                    <span class="extra-price">+S/ ${extra.price}</span>
                  </div>
                  <p class="extra-desc">${extra.desc}</p>
                </div>
                <div class="extra-status-text" style="margin-top: 0.5rem; text-align: right; font-size: 0.75rem; color: ${isSelected ? '#fbbf24' : '#64748b'}; font-weight: bold;">
                  ${isSelected ? '✓ Incluido' : '+ Agregar'}
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- PASO 3: POLÍTICA DE PAGO EN EFECTIVO (CERO HUELLA BANCARIA) -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO 3 — MODALIDAD DE PAGO (HOTEL DE PASO)
        </label>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 14px; padding: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.4rem;">💵</span>
              <div>
                <div style="color: #34d399; font-weight: bold; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">
                  Sin Pago Online • Abono en Efectivo en Recepción
                </div>
                <div style="font-size: 0.72rem; color: #94a3b8;">La reserva solo asegura la habitación y horario</div>
              </div>
            </div>
            <span style="font-size: 0.72rem; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; padding: 0.3rem 0.65rem; border-radius: 6px; font-weight: bold; letter-spacing: 0.5px;">
              🛡️ CERO HUELLA DIGITAL
            </span>
          </div>
          <p style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; margin: 0; margin-top: 0.4rem;">
            Al ser un hotel de paso de máxima privacidad, <strong>no se cobra por reservar ni se solicitan tarjetas de crédito/débito</strong> para evitar cualquier registro o vulnerabilidad bancaria. El monto de la estadía se cancela presencialmente en <strong>EFECTIVO</strong> al momento del ingreso.
          </p>
        </div>
      </div>

      <!-- DATOS DE REGISTRO CLIENTE (ALIAS DISCRETO) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label for="checkoutName" style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">NOMBRE / ALIAS DISCRETO</label>
          <input type="text" id="checkoutName" name="customerName" value="${checkoutState.customerName}" placeholder="Nombre o alias" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
        <div>
          <label for="checkoutPhone" style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">TELÉFONO CELULAR (PARA EL PASE)</label>
          <input type="tel" id="checkoutPhone" name="customerPhone" value="${checkoutState.customerPhone}" placeholder="990370681" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
      </div>

      <!-- RESUMEN DEL PRECIO (MONTO A ABONAR EN RECEPCIÓN) -->
      <div class="price-summary-box">
        <div>
          <span class="summary-total-label">Monto a Cancelar en Recepción (Efectivo)</span>
          <div id="summaryDetailsDesc" style="font-size: 0.75rem; color: #94a3b8;">
            ${checkoutState.duration} ${checkoutState.selectedExtras.length > 0 ? `+ ${checkoutState.selectedExtras.length} Extras` : ''} • Sin cobros en línea
          </div>
        </div>
        <span class="summary-total-val" id="summaryTotalVal">S/ ${totalPrice}.00</span>
      </div>

      <!-- CASILLA OBLIGATORIA: TÉRMINOS, CONDICIONES Y REGLAMENTO DEL HOTEL -->
      <div class="checkout-terms-block">
        <label for="checkoutTermsAgree" class="checkout-terms-label">
          <input 
            type="checkbox" 
            id="checkoutTermsAgree" 
            name="termsAgree" 
            class="checkout-terms-checkbox" 
            required 
          />
          <span class="checkout-terms-copy">
            He leído y acepto el 
            <button 
              type="button" 
              id="btnOpenTermsModal" 
              class="checkout-terms-link"
              title="Haga clic para leer el Acta de entrega de llave y Reglamento Interno en pantalla"
              style="background: none; border: none; padding: 0; margin: 0; color: #fbbf24; text-decoration: underline; font-weight: bold; cursor: pointer; font-size: inherit; font-family: inherit;"
            >
              Acta de entrega de llave, Términos y Reglamento del Hotel
            </button>
            <a 
              href="/reglamento_hotel_wimbledon.pdf" 
              download="reglamento_hotel_wimbledon.pdf" 
              id="linkDownloadReglamento" 
              class="terms-badge-dl"
              title="Descargar el documento oficial en PDF"
            >
              📄 Descargar PDF
            </a>
          </span>
        </label>
        <div id="termsErrorAlert" class="checkout-terms-alert" role="alert" style="display: none;">
          ⚠️ Debe marcar la casilla para aceptar los términos y leer el reglamento del hotel antes de emitir su pase.
        </div>
      </div>

      <button type="submit" id="btnSubmitBooking" class="btn-editorial-light" style="width: 100%; text-align: center; justify-content: center; padding: 1.1rem; font-weight: bold; font-size: 1rem; cursor: not-allowed; background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; border: none; border-radius: 12px; box-shadow: 0 10px 25px rgba(217, 119, 6, 0.35); opacity: 0.5;" disabled>
        CONFIRMAR RESERVA Y EMITIR PASE (S/ ${totalPrice}.00 en Recepción)
      </button>
    </form>
  `;

  function syncFormFields() {
    checkoutState.customerName = document.getElementById('checkoutName')?.value || checkoutState.customerName;
    checkoutState.customerPhone = document.getElementById('checkoutPhone')?.value || checkoutState.customerPhone;
  }

  const form = document.getElementById('checkoutDynamicForm');
  const termsCheckbox = document.getElementById('checkoutTermsAgree');
  const termsAlert = document.getElementById('termsErrorAlert');
  const submitBtn = document.getElementById('btnSubmitBooking');
  const btnTermsModal = document.getElementById('btnOpenTermsModal');

  if (btnTermsModal) {
    btnTermsModal.onclick = (e) => {
      e.preventDefault();
      openFullTermsModal();
    };
  }

  if (termsCheckbox && submitBtn) {
    termsCheckbox.addEventListener('change', () => {
      if (termsCheckbox.checked) {
        if (termsAlert) termsAlert.style.display = 'none';
        submitBtn.removeAttribute('disabled');
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      } else {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      }
    });
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (termsCheckbox && !termsCheckbox.checked) {
        if (termsAlert) termsAlert.style.display = 'block';
        termsCheckbox.focus();
        return;
      }
      syncFormFields();
      const currentRoom = roomsData.find(r => String(r.id) === String(checkoutState.roomId)) || roomsData[0];
      const basePriceCurrent = parseBasePrice(currentRoom.precio);
      const totalAmount = calculateTotalWithExtras(basePriceCurrent, checkoutState.duration, checkoutState.selectedExtras);

      // Limpiar errores previos si existen
      const errorBox = document.getElementById('checkoutInlineError');
      if (errorBox) errorBox.style.display = 'none';

      // Estado de carga en el botón
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'wait';
        submitBtn.innerHTML = '<span>⏳ Verificando disponibilidad y registrando...</span>';
      }

      try {
        const res = await confirmAndSaveBooking(currentRoom, totalAmount);
        if (!res.ok && submitBtn) {
          submitBtn.removeAttribute('disabled');
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          submitBtn.innerHTML = originalBtnHtml;
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.removeAttribute('disabled');
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    };
  }
}

// ==========================================================================
// MODAL OFICIAL: ACTA DE ENTREGA DE LLAVE Y REGLAMENTO INTERNO
// ==========================================================================
function openFullTermsModal() {
  let modal = document.getElementById('fullTermsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fullTermsModal';
    modal.className = 'admin-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="admin-modal-panel" style="max-width: 780px; max-height: 88vh; overflow-y: auto;">
      <button class="admin-modal-close" id="btnCloseFullTerms" title="Cerrar">&times;</button>
      
      <div style="text-align: center; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
        <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
          DOCUMENTO OFICIAL • HOTEL WIMBLEDON S.A.C.
        </span>
        <h2 style="font-family: var(--font-serif); font-size: 1.55rem; color: #fff; margin-top: 0.35rem;">
          Acta de Entrega de Llave y Reglamento Interno
        </h2>
        <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.25rem;">
          RUC: 20508934121 • Av. Costanera 2008, San Miguel, Lima • Tel: (01) 560-0388
        </p>
      </div>

      <div style="font-size: 0.82rem; line-height: 1.6; color: #cbd5e1; display: flex; flex-direction: column; gap: 1rem;">
        <!-- ACTA DE ENTREGA DE LLAVE -->
        <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 12px; padding: 1.15rem;">
          <h3 style="color: #fbbf24; font-size: 1rem; margin-top: 0; margin-bottom: 0.5rem; font-family: var(--font-serif); text-transform: uppercase; letter-spacing: 0.5px;">
            Acta de entrega de llave
          </h3>
          <p style="margin: 0 0 0.6rem 0;">
            El usuario cliente acepta por este documento que, se le hace entrega de la llave de la habitación N° ________________________ Debiendo tener la diligencia necesaria en su cuidado y devolverla al final de su estadía.
          </p>
          <p style="margin: 0 0 0.6rem 0;">
            El usuario por el presente recibe también el reglamento del hotel Wimbledon.
          </p>
          <p style="margin: 0; font-style: italic; color: #e2e8f0;">
            Todas las personas que se hospeden en el hotel, durante su estadía, estarán sujetas a este reglamento, el que se considera un contrato que se debe cumplir. Caso contrario, la administración se reserva el derecho de admisión y permanencia.
          </p>
        </div>

        <!-- REGLAMENTO INTERNO DE HOSPEDAJE -->
        <div>
          <h4 style="color: #fff; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; border-left: 3px solid #fbbf24; padding-left: 0.5rem;">
            Reglamento Interno de Hospedaje
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            <p><strong>Art. 1°.-</strong> Toda persona que se hospede en este establecimiento declara que los datos consignados al momento de registrarse son verdaderos. Su registro tiene calidad de declaración jurada. En caso de resultar falsa la información que proporcionó, declara haber incurrido en el delito contra la fe pública previsto en el Título XIX del Código Penal.</p>
            <p><strong>Art. 2°.-</strong> El servicio de hospedaje deberá pagarse por adelantado. La administración expedirá comprobantes de pago o factura detallada de los servicios prestados y el importe cubierto por los mismos cuando el huésped lo solicite. El hotel no asume responsabilidad por servicios externos contratados como taxis, tintorería o médicos.</p>
            <p><strong>Art. 3°.-</strong> Cuando un huésped haga uso del estacionamiento del hotel, debe colocar su automóvil en un lugar adecuado, el establecimiento no se hace responsable de daños parciales o robo total del vehículo ni de objetos dejados en su interior. El huésped debe registrar su vehículo.</p>
            <p><strong>Art. 4°.-</strong> Ningún usuario tiene derecho a dar alojamiento a ninguna persona sin haberlo comunicado. Si algún usuario ingresa a una persona a escondidas y no comunica su estancia se considera dicho acto como uno temerario y doloso; el hotel cancelará todo tipo de servicio al usuario sin derecho a reembolso y debiendo retirarse de forma inmediata de lo contrario se reserva el derecho de llamar a la autoridad competente.</p>
            <p><strong>Art. 5°.-</strong> El establecimiento exhibe claramente en el área de recepción y en todas las habitaciones, este Reglamento, exigiendo a nuestros huéspedes a su debido cumplimiento; el usuario a su ingreso ha aceptado conocer y estar de acuerdo con todo el contenido de este reglamento, así como sus efectos; el usuario de forma libre y expresa suscribe la tarjeta de registro la misma que expresa la aceptación de este reglamento.</p>
            <p><strong>Art. 6°.-</strong> El hotel no se hace responsable por las pérdidas que el huésped pudiera sufrir en dinero y valores. Los objetos o valores olvidados por algún huésped en la habitación, quedarán en custodia de la administración del hotel por un término de 30 días, concluido este periodo y al no haber reclamación alguna, serán desechados. El usuario registrado expresa y acepta que es de su entera responsabilidad, única y exclusiva, el cuidado de los bienes muebles encontrados en la habitación y las instalaciones del hotel; además, es el único responsable del cuidado de la integridad física de sus invitados; el usuario libera y exime, desde ya, de cualquier responsabilidad administrativa, civil o penal, por todo tipo de daño o lesión que el usuario pueda ocasionar a terceros.</p>
            <p><strong>Art. 7°.-</strong> No se permite a los clientes tener ningún tipo de animales en la habitación, salvo aquellos que auxilien a discapacitados.</p>
            <p><strong>Art. 8°.-</strong> El usuario es el único y exclusivo responsable de la integridad física de los que lo visitan y/o su (s) acompañante (s) y declara que todos son ciudadanos mayores de edad.</p>
            <p><strong>Art. 9°.-</strong> El uso que deberá hacerse de los muebles, ropa y otros objetos de servicio, será racional y moderado, cuidando de ellos debidamente. En el supuesto de que el huésped dañe dichos objetos, intencional o accidentalmente, deberá reportarlo a la administración. En caso de sustraerlos del hotel se realizará el cargo correspondiente al bien en comento y cuyo precio será el establecido por el mercado al momento del incidente.</p>
            <p><strong>Art. 10°.-</strong> Queda estrictamente prohibido el consumo de alimentos y bebidas fuera de la habitación o en instalaciones que no están condicionadas para esta actividad.</p>
            <p><strong>Art. 11°.-</strong> En cumplimiento con las disposiciones oficiales en materia de protección civil, el hotel ha tomado medidas de seguridad instalando un mero suficiente de extintores y detectores de humo para ser utilizados en un eventual siniestro, en tales circunstancias los huéspedes deberán dar aviso a la administración.</p>
            <p><strong>Art. 12°.-</strong> En la prestación de los servicios por parte de este hotel no habrá discriminación alguna por razones de sexo, credo político, religión, nacionalidad ó condición social. El establecimiento podrá negar sus servicios cuando el huésped se presente al mismo en estado de ebriedad o bajo el influjo de drogas o estupefacientes o cuando se pretenda dar uso distinto al del servicio de hospedaje. Este establecimiento cuenta con protocolos para prevenir la trata de personas, específicamente de niñas, niños y adolescentes en el sector turístico. Si detecta alguna señal de trata, notifique inmediatamente a la administración.</p>
            <p><strong>Art. 13°.-</strong> Quedan a salvo los derechos del establecimiento como de los huéspedes para denunciar ante las autoridades competentes los hechos que constituyan algún ilícito o que dieran lugar a responsabilidad por alguna de las partes en sus personas y bienes, siempre y cuando ocurran dentro de las instalaciones del hotel.</p>
            <p><strong>Art. 14°.-</strong> El incumplimiento de este Reglamento Interno de Hospedaje por parte del huésped será causal de rescisión del contrato de hospedaje, sin ningún tipo de responsabilidad penal, civil administrativa para la empresa.</p>
            <p><strong>Art. 15°.-</strong> El huésped registrado es el único y exclusivo responsable de todos los actos que puedan constituir una infracción y/o delito, eximiendo por el presente de cualquier tipo de responsabilidad al hotel Wimbledon.</p>
          </div>
        </div>

        <!-- POLÍTICAS Y RESTRICCIONES -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid #334155; border-radius: 10px; padding: 1rem;">
          <h4 style="color: #fbbf24; font-size: 0.9rem; text-transform: uppercase; margin-top: 0; margin-bottom: 0.5rem;">
            Políticas y Restricciones
          </h4>
          <ul style="margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
            <li>No realizar ningún tipo de escándalos.</li>
            <li>No se aceptan cambios, ni devoluciones. La tarifa es únicamente para 2 personas (mayores de 18 años), las cuales deben mostrar sus documentos de identidad y firmar debidamente todos los formatos de ingreso. Si hubiera una tercera persona, se debe realizar el pago de un monto adicional.</li>
            <li>Cualquier daño dentro de la habitación (alfombra mojada, manchas en la sabana, vasos y/o copas rotas, toallas manchadas etc.) el cliente se hará responsable y asumirá una penalidad de pago al finalizar su estadía.</li>
            <li>La habitación cuenta con un frigobar con diferentes productos (gaseosas, cervezas, chocolates, etc.) el cliente debe asumir el pago por cualquier tipo de consumo al momento de retirarse.</li>
            <li>Se permite el ingreso de bebidas alcohólicas con previo pago desde S/ 25.00.</li>
            <li><strong>Acta de entrega de llave:</strong> El huésped se hace responsable de la pérdida o cualquier daño que pueda ser ocasionado en la llave de la habitación asignada. Siendo este sancionado con un monto de S/ 60.00.</li>
            <li>En nuestras tarifas está incluido el 18% del IGV + 5% de recargo al consumo que se encuentra reflejado en su boleta o factura.</li>
            <li>Nuestros turnos son de 6 y 7 horas según la habitación que el huésped reserve.</li>
          </ul>
        </div>

        <!-- POLÍTICAS DE RESERVAS -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid #334155; border-radius: 10px; padding: 1rem;">
          <h4 style="color: #38bdf8; font-size: 0.9rem; text-transform: uppercase; margin-top: 0; margin-bottom: 0.5rem;">
            Políticas de reservas
          </h4>
          <ul style="margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;">
            <li>Enviar imagen del voucher o constancia de la transferencia, donde se muestre el monto y número de operación, el depósito tiene que ser el total que se le indica, no se devuelve dinero, no se da vuelto en caso deposite demás.</li>
            <li>Las reservas inician su tiempo, a la hora indicada por el cliente en el procedimiento de reserva.</li>
            <li>No se aceptan cambios, devoluciones, y reembolsos ni lugar a reclamo.</li>
            <li>En caso de pagos por transferencia, debe de realizarse de manera inmediata, de lo contrario no se le podrá confirmar la reserva, hasta que no se vea reflejado en nuestras cuentas.</li>
          </ul>
        </div>
      </div>

      <!-- BOTONES DE ACCIÓN -->
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; flex-wrap: wrap;">
        <a 
          href="/reglamento_hotel_wimbledon.pdf" 
          download="reglamento_hotel_wimbledon.pdf" 
          class="btn-editorial-outline" 
          style="padding: 0.75rem 1.25rem; font-size: 0.85rem; text-decoration: none; border-color: #fbbf24; color: #fbbf24; border-radius: 8px; display: inline-flex; align-items: center; gap: 0.4rem;"
        >
          📄 Descargar PDF Oficial
        </a>
        <button 
          id="btnAcceptTermsFromModal" 
          class="btn-editorial-light" 
          style="padding: 0.75rem 1.35rem; font-size: 0.85rem; font-weight: bold; background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; border: none; border-radius: 8px; cursor: pointer;"
        >
          ✓ He leído y Acepto los Términos
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');

  const btnClose = modal.querySelector('#btnCloseFullTerms');
  if (btnClose) btnClose.onclick = () => modal.classList.remove('open');

  const btnAccept = modal.querySelector('#btnAcceptTermsFromModal');
  if (btnAccept) {
    btnAccept.onclick = () => {
      const chk = document.getElementById('checkoutTermsAgree');
      if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change'));
      }
      modal.classList.remove('open');
    };
  }
}

function renderKeycardHTML(booking) {
  // El pase codifica SOLO el qrToken emitido por el backend. Sin prefijo de
  // version, sin firma y sin carga legible: el valor que recepcion envia a
  // POST /api/recepcion/checkin tiene que ser exactamente este.
  const qrSvg = generateQRCodeSVG(booking.qrToken, {
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
              ⏱️ ${booking.duracion} • Llegada: ${booking.horaIngreso ? booking.horaIngreso.slice(0, 5) : booking.horarioLlegada}
              ${extrasText ? `<br/><span style="color: #fbbf24; font-size: 0.75rem;">✦ Extras: ${extrasText}</span>` : ''}
            </p>

            <div class="keycard-pin-box">
              <span class="keycard-pin-label">REFERENCIA DE RESERVA</span>
              <span class="keycard-pin-code">${booking.id}</span>
            </div>
            <div class="keycard-pin-box">
              <span class="keycard-pin-label">SALIDA CONFIRMADA POR EL HOTEL</span>
              <span class="keycard-pin-code">${booking.horaSalida || '--:--'}</span>
            </div>
            ${booking.notaDiferencia ? `<div style="margin: 0.6rem 0; padding: 0.5rem 0.75rem; background: rgba(251, 191, 36, 0.10); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 8px; font-size: 0.75rem; color: #fde68a; line-height: 1.4;">&#9201; ${booking.notaDiferencia}</div>` : ''}
            <div style="margin: 0.6rem 0; padding: 0.5rem 0.75rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; font-size: 0.75rem; color: #a7f3d0; line-height: 1.4;">
              💵 <strong>Abono en Efectivo:</strong> S/ ${booking.monto}.00 a cancelar en recepción al ingresar.<br/>
              🛡️ <strong>Sin huella bancaria:</strong> Máxima privacidad y discreción garantizada.
            </div>
            <span style="font-size: 0.72rem; color: #94a3b8; display: block; line-height: 1.4;">
              Presenta este Pase Digital en recepcion al llegar al hotel para completar tu ingreso.
            </span>
          </div>

          <div class="keycard-qr-wrap">
            ${qrSvg}
            <span class="keycard-qr-caption">${booking.id}</span>
          </div>
        </div>

        <div class="keycard-countdown-bar">
          <span class="countdown-label">Modalidad solicitada:</span>
          <span class="countdown-time" id="keycardLiveTimer">${booking.duracion}</span>
        </div>

        <div class="keycard-actions-row">
          <button class="btn-keycard-action btn-keycard-save" onclick="window.print()">
            📄 Guardar Pase
          </button>
          <a href="https://wa.me/51990370681?text=${encodeURIComponent('Hola Hotel Wimbledon, tengo mi Pase Digital ' + booking.id + ' para ' + booking.habitacionNombre + '. Pago S/ ' + booking.monto + ' en efectivo en recepción.')}" target="_blank" class="btn-keycard-action btn-keycard-whatsapp">
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

/**
 * Convierte la hora de ingreso elegida a HH:mm:ss, el formato que espera el backend.
 */
function formatearHoraIngreso(seleccionada) {
  let hora = seleccionada || '20:00';
  if (hora.includes('30 min') || hora.includes('Inmediato')) {
    const d = new Date(Date.now() + 30 * 60000);
    hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  } else if (hora.length === 5) {
    hora = hora + ':00';
  }
  return hora;
}

/**
 * Horas de la modalidad elegida. Es una PISTA DE DISPONIBILIDAD que se envía a
 * GET /api/publico/habitaciones, no un dato de la reserva: la hora de salida la
 * calcula el servidor con la duracionBloqueHoras de la habitacion.
 */
function duracionElegidaEnHoras(modalidad) {
  if (modalidad === '3 Horas') return 3;
  if (modalidad === 'Toda la Noche') return 12;
  return 6;
}

/**
 * Resuelve el habitacionId contra el catálogo del backend.
 *
 * El identificador autoritativo es habitaciones.id en MySQL, que es lo que
 * espera CrearReservaRequest.habitacionId y lo que devuelve
 * ReservaResponse.habitacion.id. La tarjeta del portal ya trae un id de ese
 * espacio, pero se CONFIRMA contra el catálogo vivo en vez de suponerlo,
 * porque el backend sincroniza ese conjunto en cada arranque.
 *
 * Primero por id; si no coincide, por tipo de suite, tomando la primera unidad
 * disponible de ese tipo, porque el huésped eligió un tipo y no una puerta. Si no
 * hay coincidencia, la reserva no se puede crear y el checkout se cancela con
 * mensaje para que el huésped vuelva a elegir.
 */
async function resolverHabitacionEnCatalogo(room, fecha, horaIngreso, duracionHoras) {
  const catalogo = await api.obtenerHabitaciones(fecha, horaIngreso, duracionHoras);
  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    return null;
  }

  const disponible = catalogo.filter(h => h.disponible !== false);

  const porId = catalogo.find(h => String(h.id) === String(room.id));
  if (porId) {
    return porId;
  }

  const tipoBuscado = String(room.categoria_nombre || room.nombre || '').trim().toLowerCase();
  if (tipoBuscado) {
    const porTipo = disponible.find(h => {
      const tipo = String(h.tipo || '').trim().toLowerCase();
      const nombre = String(h.nombre || '').trim().toLowerCase();
      return tipo === tipoBuscado || nombre.includes(tipoBuscado) || tipoBuscado.includes(nombre);
    });
    if (porTipo) {
      return porTipo;
    }
  }

  return null;
}

/**
 * Registra la reserva en el backend y, solo si el backend la crea, emite el pase.
 *
 * ANTES este checkout acuñaba un código y un PIN con Math.random(), componía un
 * token que el backend nunca emitió y lo guardaba en localStorage y en Supabase.
 * Recepción no podía resolver ese pase: siempre terminaba en 404.
 *
 * AHORA el pase procede del qrToken que devuelve POST /api/reservas. Si la
 * llamada no responde, el huésped NO recibe pase: se le comunica que la reserva
 * no pudo registrarse y se le ofrece reintentar, porque un pase fabricado en el
 * navegador sería irresoluble otra vez.
 */
async function confirmAndSaveBooking(room, totalAmount) {
  const errorBox = document.getElementById('checkoutInlineError');
  if (errorBox) errorBox.style.display = 'none';

  const horaIngreso = formatearHoraIngreso(checkoutState.arrivalTime);
  const duracionHoras = duracionElegidaEnHoras(checkoutState.duration);
  const fecha = new Date().toISOString().split('T')[0];
  const dniVal = checkoutState.customerDni || Math.floor(10000000 + Math.random() * 80000000).toString();

  const fallo = (mensaje) => {
    if (errorBox) {
      errorBox.textContent = mensaje;
      errorBox.style.display = 'block';
    }
    showToastNotification(mensaje);
    return { ok: false, booking: null };
  };

  // 1. El identificador de habitación es el del catálogo del backend.
  let habitacion;
  try {
    habitacion = await resolverHabitacionEnCatalogo(room, fecha, horaIngreso, duracionHoras);
  } catch (err) {
    return fallo('No pudimos verificar la disponibilidad con el hotel. Revisa tu conexion e intentalo de nuevo.');
  }

  if (!habitacion) {
    return fallo('La suite que elegiste ya no esta disponible en ese horario. Vuelve a seleccionar una suite e intentalo de nuevo.');
  }

  // 2. La reserva la crea el backend. Sin excepcion: es la unica autoridad del
  //    identificador de habitacion, de la hora de salida y del qrToken.
  const email = checkoutState.customerEmail || 'huesped@wimbledon.pe';
  const nombreCompleto = checkoutState.customerName || 'Huésped Wimbledon';
  const telefono = checkoutState.customerPhone || '990370681';

  let reserva;
  const modalidadMap = {
    '3 Horas': 'TRES_HORAS',
    '6 Horas': 'SEIS_HORAS',
    'Toda la Noche': 'DOCE_HORAS'
  };
  const modalidad = modalidadMap[checkoutState.duration] || 'SEIS_HORAS';

  try {
    reserva = await api.crearReserva({
      habitacionId: habitacion.id,
      fecha,
      horaIngreso,
      nombreCompleto,
      telefono,
      email,
      notas: '',
      modalidad
    });
  } catch (err) {
    const mensaje = err && err.status === 409
      ? 'Ese horario acaba de ocuparse. Vuelve a seleccionar el horario e intentalo de nuevo.'
      : 'No pudimos registrar tu reserva. Intentalo de nuevo en unos momentos.';
    return fallo(mensaje);
  }

  if (!reserva || !reserva.qrToken) {
    return fallo('No pudimos registrar tu reserva. Intentalo de nuevo en unos minutos.');
  }

  // 3. La hora de salida es respetada y persistida por el servidor según la modalidad
  const horaSalidaServidor = String(reserva.horaSalida || '').slice(0, 5);
  const modalidadElegida = checkoutState.duration;
  const notaDiferencia = '';

  const booking = {
    id: reserva.id != null ? String(reserva.id) : String(reserva.qrToken),
    qrToken: reserva.qrToken,
    habitacionId: reserva.habitacion ? reserva.habitacion.id : habitacion.id,
    habitacionNombre: reserva.habitacion ? reserva.habitacion.nombre : habitacion.nombre,
    duracion: modalidadElegida,
    horarioLlegada: checkoutState.arrivalTime,
    horaIngreso,
    horaSalida: horaSalidaServidor,
    notaDiferencia,
    extras: [...checkoutState.selectedExtras],
    monto: totalAmount,
    medioPago: 'Efectivo (En Recepción)',
    clienteNombre: nombreCompleto,
    clienteTelefono: telefono,
    clienteEmail: email,
    numeroDocumento: dniVal,
    estado: reserva.estado || 'CONFIRMADA',
    fechaReserva: new Date().toISOString()
  };

  // localStorage queda como CACHÉ DE INTERFAZ, no como copia autoritativa. La
  // fuente de verdad es la fila que el backend acaba de crear.
  try {
    const existing = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
    existing.unshift(booking);
    localStorage.setItem('wimbledon_bookings', JSON.stringify(existing));
    localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
    window.dispatchEvent(new CustomEvent('wimbledon:booking-created', { detail: booking }));
  } catch (storageErr) {
    console.warn('Advertencia de almacenamiento local:', storageErr);
  }

  // 4. El pase se renderiza unicamente con reserva creada.
  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return { ok: true, booking };

  modalBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.75rem;">
        ✓ RESERVA CONFIRMADA & PASE EMITIDO
      </span>
      <h2 style="font-family: var(--font-serif); font-size: 2rem; color: #fff; margin-top: 0.25rem;">
        ¡Tu Pase Digital está Listo!
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin: 0.25rem auto 1rem; max-width: 480px; line-height: 1.5;">
        Guarda tu pase o presenta tu código QR al llegar a recepción para ingresar de inmediato.
      </p>
    </div>

    ${renderKeycardHTML(booking)}

    <div style="margin-top: 1.5rem; text-align: center;">
      <button id="btnFinishCheckout" class="btn-editorial-light" style="width: 100%; padding: 1rem; font-weight: bold; background: #fff; color: #000; border: none; border-radius: 12px; cursor: pointer; font-size: 0.95rem;">
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

  return { ok: true, booking };
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
      const resultBox = document.getElementById('lookupResultContainer');
      try {
        const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
        const found = list.find(b => b.id.toUpperCase() === q || b.id.replace('#', '').toUpperCase() === q || b.clienteTelefono === q);
        if (found) {
          renderMyBookingModal(found);
        } else {
          if (resultBox) {
            resultBox.innerHTML = `
              <div style="text-align: center; padding: 2.5rem 1rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #fca5a5;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
                <p style="font-size: 0.95rem; font-weight: 600;">No se encontró ninguna reserva para "${q}".</p>
                <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.25rem;">Verifica el formato del código (ej: #WMB-1024) o el número de teléfono celular utilizado al reservar.</p>
              </div>
            `;
          }
        }
      } catch (e) {
        if (resultBox) {
          resultBox.innerHTML = `<div style="color: #fca5a5; text-align: center; padding: 1.5rem;">Error al buscar la reserva.</div>`;
        }
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
    <div class="extension-box" style="margin-top: 1.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div>
          <span style="color: #38bdf8; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            ⏱️ ¿Deseas más tiempo en tu suite?
          </span>
          <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
            Extiende tu estadía de forma discreta sin llamar a recepción.
          </p>
        </div>
      </div>
      <div class="extension-options-row" style="display: flex; gap: 0.75rem;">
        <button class="btn-extend-chip js-extend-stay" data-hours="2" data-price="45" style="flex: 1; padding: 0.75rem; background: #0b0f19; border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 10px; font-weight: 600; cursor: pointer;">
          +2 Horas (S/ 45.00)
        </button>
        <button class="btn-extend-chip js-extend-stay" data-hours="3" data-price="65" style="flex: 1; padding: 0.75rem; background: #0b0f19; border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 10px; font-weight: 600; cursor: pointer;">
          +3 Horas (S/ 65.00)
        </button>
      </div>

      <!-- CONTENEDOR DINÁMICO INLINE PARA EXTENSIÓN (SOLUCIÓN #8) -->
      <div id="inlineExtendActionPanel" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px;"></div>
    </div>

    <!-- HU.07: CANCELACIÓN O REPROGRAMACIÓN -->
    <div style="margin-top: 1.5rem; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; padding: 1rem 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <span style="font-size: 0.8rem; color: #fda4af; font-weight: bold;">Política de Modificación & Cancelación</span>
          <span style="display: block; font-size: 0.72rem; color: #94a3b8;">Cancelación discreta conforme a políticas del Hotel Wimbledon.</span>
        </div>
        <button id="btnCancelBooking" class="btn-editorial-outline" style="border-color: #f43f5e; color: #f43f5e; font-size: 0.75rem; padding: 0.45rem 0.95rem; cursor: pointer; border-radius: 8px;">
          Cancelar Reserva
        </button>
      </div>

      <!-- CONTENEDOR DINÁMICO INLINE PARA CANCELACIÓN (SOLUCIÓN #8) -->
      <div id="inlineCancelActionPanel" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.4); border-radius: 10px;"></div>
    </div>
  `;
}

function setupBookingManageActions(booking) {
  setupKeycardTilt();

  // Extensión de estadía interactiva inline (Solución #8)
  document.querySelectorAll('.js-extend-stay').forEach(btn => {
    btn.onclick = (e) => {
      const hours = parseInt(e.currentTarget.getAttribute('data-hours'), 10);
      const price = parseInt(e.currentTarget.getAttribute('data-price'), 10);
      const panel = document.getElementById('inlineExtendActionPanel');
      if (!panel) return;

      panel.style.display = 'block';
      panel.innerHTML = `
        <div style="font-size: 0.85rem; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">
          Extender estadía: +${hours} Horas — Recargo: <span style="color: #fbbf24;">S/ ${price}.00</span>
        </div>
        <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem;">
          Selecciona medio de pago para la extensión:
        </p>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.85rem;">
          <button type="button" class="btn-extend-method active" data-method="yape" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background: #0b0f19; border: 1px solid #fbbf24; color: #fbbf24; border-radius: 6px; cursor: pointer;">
            📱 Yape / Plin
          </button>
          <button type="button" class="btn-extend-method" data-method="card" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background: #0b0f19; border: 1px solid #334155; color: #94a3b8; border-radius: 6px; cursor: pointer;">
            💳 Tarjeta
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btnConfirmExtendAction" class="btn-editorial-light" style="padding: 0.5rem 1rem; font-size: 0.78rem; font-weight: bold; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            Confirmar Extensión (S/ ${price}.00)
          </button>
          <button id="btnDismissExtendAction" class="btn-editorial-outline" style="padding: 0.5rem 1rem; font-size: 0.78rem; border-color: #64748b; color: #94a3b8; border-radius: 6px; cursor: pointer;">
            Cerrar
          </button>
        </div>
      `;

      let extendMethod = 'yape';
      panel.querySelectorAll('.btn-extend-method').forEach(mBtn => {
        mBtn.onclick = () => {
          panel.querySelectorAll('.btn-extend-method').forEach(b => {
            b.style.borderColor = '#334155';
            b.style.color = '#94a3b8';
          });
          mBtn.style.borderColor = '#fbbf24';
          mBtn.style.color = '#fbbf24';
          extendMethod = mBtn.getAttribute('data-method');
        };
      });

      document.getElementById('btnDismissExtendAction').onclick = () => {
        panel.style.display = 'none';
      };

      document.getElementById('btnConfirmExtendAction').onclick = () => {
        booking.duracion = `${booking.duracion} (+${hours}h)`;
        booking.monto = (Number(booking.monto) || 150) + price;
        try {
          const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
          const idx = list.findIndex(b => b.id === booking.id);
          if (idx !== -1) list[idx] = booking;
          localStorage.setItem('wimbledon_bookings', JSON.stringify(list));
          localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
          window.dispatchEvent(new CustomEvent('wimbledon:booking-created', { detail: booking }));
        } catch (err) {}
        showToastNotification(`✅ ¡Estadía extendida +${hours}h exitosamente! Monto adicional: S/ ${price}.00 (${extendMethod.toUpperCase()})`);
        renderMyBookingModal(booking);
      };
    };
  });

  // Cancelación de reserva interactiva inline (Solución #8)
  const btnCancel = document.getElementById('btnCancelBooking');
  if (btnCancel) {
    btnCancel.onclick = () => {
      const panel = document.getElementById('inlineCancelActionPanel');
      if (!panel) return;

      panel.style.display = 'block';
      panel.innerHTML = `
        <div style="font-size: 0.85rem; color: #fda4af; font-weight: 600; margin-bottom: 0.4rem;">
          ¿Confirmas la anulación de tu reserva ${booking.id}?
        </div>
        <p style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.85rem;">
          Se invalidará el PIN de acceso a la suite y cochera privada conforme a las políticas del Hotel Wimbledon.
        </p>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btnExecuteCancel" class="btn-editorial-light" style="padding: 0.5rem 1rem; font-size: 0.78rem; font-weight: bold; background: #e11d48; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            Sí, Cancelar Reserva
          </button>
          <button id="btnDismissCancel" class="btn-editorial-outline" style="padding: 0.5rem 1rem; font-size: 0.78rem; border-color: #64748b; color: #94a3b8; border-radius: 6px; cursor: pointer;">
            Mantener Reserva
          </button>
        </div>
      `;

      document.getElementById('btnDismissCancel').onclick = () => {
        panel.style.display = 'none';
      };

      document.getElementById('btnExecuteCancel').onclick = async () => {
        // La cancelacion la registra el backend, no el navegador. Se demuestra
        // posesion de la credencial con el qrToken, igual que en la creacion.
        //
        // DEUDA DECLARADA, NO RESUELTA: ese endpoint solo cubre reservas en
        // estado PENDIENTE. La cancelacion por el huesped de una reserva ya
        // CONFIRMADA no tiene cliente en el backend y no puede
        // completarse desde el portal. Queda registrada para un hito propio.
        const btnEjecutar = document.getElementById('btnExecuteCancel');
        if (btnEjecutar) {
          btnEjecutar.setAttribute('disabled', 'true');
          btnEjecutar.style.opacity = '0.7';
          btnEjecutar.style.cursor = 'wait';
        }

        try {
          await api.cancelarReservaPendiente(booking.id, booking.qrToken);
        } catch (err) {
          const mensaje = err && err.status === 400
            ? 'El token de la reserva no es valido. Contacta a recepcion para cancelarla.'
            : 'Solo se pueden cancelar desde el portal las reservas pendientes de confirmacion. Para una reserva confirmada, contacta a recepcion.';
          showToastNotification(mensaje);
          if (btnEjecutar) {
            btnEjecutar.removeAttribute('disabled');
            btnEjecutar.style.opacity = '1';
            btnEjecutar.style.cursor = 'pointer';
          }
          return;
        }

        booking.estado = 'CANCELADA';
        try {
          const list = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
          const idx = list.findIndex(b => b.id === booking.id);
          if (idx !== -1) list[idx] = booking;
          localStorage.setItem('wimbledon_bookings', JSON.stringify(list));
          localStorage.setItem('wimbledon_last_booking', JSON.stringify(booking));
          window.dispatchEvent(new CustomEvent('wimbledon:booking-created', { detail: booking }));
        } catch (err) {}

        showToastNotification(`Reserva ${booking.id} cancelada.`);
        renderMyBookingModal(booking);
      };
    };
  }
}

function applyCatalogViewMode(mode) {
  catalogViewMode = mode;
  const btnCinematic = document.getElementById('btnViewCinematic');
  const btnGrid = document.getElementById('btnViewGrid');
  const trackWrapper = document.getElementById('suitesCarouselWrapper') || document.getElementById('suitesHorizontalPinWrapper');
  const gridSection = document.getElementById('suitesGridSection');

  if (btnCinematic && btnGrid && trackWrapper && gridSection) {
    if (mode === 'cinematic') {
      btnCinematic.classList.add('active');
      btnGrid.classList.remove('active');
      trackWrapper.classList.remove('view-mode-hidden');
      trackWrapper.style.display = 'block';
      gridSection.classList.add('view-mode-hidden');
      gridSection.style.display = 'none';
    } else {
      btnGrid.classList.add('active');
      btnCinematic.classList.remove('active');
      trackWrapper.classList.add('view-mode-hidden');
      trackWrapper.style.display = 'none';
      gridSection.classList.remove('view-mode-hidden');
      gridSection.style.display = 'block';
    }
  }
}

function setupHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-slider-dot');
  const btnPrev = document.getElementById('btnHeroPrev');
  const btnNext = document.getElementById('btnHeroNext');
  const wrapper = document.getElementById('heroSliderWrapper');
  if (!slides.length) return;

  let currentSlide = 0;
  let sliderTimer = null;

  function goToSlide(index) {
    slides.forEach((s, idx) => {
      s.classList.toggle('active', idx === index);
    });
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  function prevSlide() {
    const prev = (currentSlide - 1 + slides.length) % slides.length;
    goToSlide(prev);
  }

  function startAutoplay() {
    stopAutoplay();
    sliderTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    if (sliderTimer) clearInterval(sliderTimer);
  }

  if (btnNext) {
    btnNext.onclick = (e) => {
      e.preventDefault();
      nextSlide();
      startAutoplay();
    };
  }

  if (btnPrev) {
    btnPrev.onclick = (e) => {
      e.preventDefault();
      prevSlide();
      startAutoplay();
    };
  }

  dots.forEach(dot => {
    dot.onclick = (e) => {
      e.preventDefault();
      const idx = parseInt(e.currentTarget.getAttribute('data-slide'), 10);
      if (!isNaN(idx)) {
        goToSlide(idx);
        startAutoplay();
      }
    };
  });

  if (wrapper) {
    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);
  }

  document.querySelectorAll('.js-hero-reserve-btn').forEach(btn => {
    btn.onclick = () => {
      const defaultRoomId = roomsData.length > 0 ? roomsData[0].id : 860;
      openCheckoutModal(defaultRoomId);
    };
  });

  startAutoplay();
}

function setupCompactSuitesCarousel() {
  const container = document.getElementById('suitesCarouselTrackContainer');
  const btnPrev = document.getElementById('btnCarouselPrev');
  const btnNext = document.getElementById('btnCarouselNext');
  if (container && btnPrev && btnNext) {
    btnPrev.onclick = () => {
      container.scrollBy({ left: -330, behavior: 'smooth' });
    };
    btnNext.onclick = () => {
      container.scrollBy({ left: 330, behavior: 'smooth' });
    };
  }
}

function setupLargeServicesCarousel() {
  const stage = document.getElementById('servicesShowcaseStage');
  const slides = document.querySelectorAll('.services-showcase-slide');
  const chips = document.querySelectorAll('.service-nav-chip');
  const btnPrev = document.getElementById('btnServicesPrev');
  const btnNext = document.getElementById('btnServicesNext');
  const counter = document.getElementById('servicesSlideCounter');
  const progressBar = document.getElementById('servicesProgressBar');

  if (!stage || !slides.length) return;

  let currentIndex = 0;
  let isTransitioning = false;
  let autoplayTimer = null;
  const total = slides.length;

  function updateControls(index) {
    if (counter) {
      counter.textContent = `0${index + 1} / 0${total}`;
    }
    if (progressBar) {
      const pct = ((index + 1) / total) * 100;
      progressBar.style.width = `${pct}%`;
    }
    chips.forEach((chip, i) => {
      const isActive = i === index;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function goToSlide(targetIndex, direction = 'next') {
    if (isTransitioning || targetIndex === currentIndex) return;
    isTransitioning = true;

    const currentSlide = slides[currentIndex];
    const nextSlide = slides[targetIndex];
    if (!currentSlide || !nextSlide) {
      isTransitioning = false;
      return;
    }

    const leavingClass = direction === 'next' ? 'slide-leaving-next' : 'slide-leaving-prev';

    // 1. Aplicar clase de desaparición cinemática al slide actual y quitar active
    currentSlide.classList.remove('active');
    currentSlide.classList.add(leavingClass);

    // 2. Activar el nuevo slide
    nextSlide.classList.remove('slide-leaving-next', 'slide-leaving-prev');
    nextSlide.classList.add('active');

    // 3. Actualizar controles
    currentIndex = targetIndex;
    updateControls(currentIndex);

    // 4. Restaurar slide anterior a su estado inactivo tras completarse el efecto de desvanecimiento
    setTimeout(() => {
      currentSlide.classList.remove('slide-leaving-next', 'slide-leaving-prev');
      isTransitioning = false;
    }, 720);
  }

  function nextSlide() {
    const nextIdx = (currentIndex + 1) % total;
    goToSlide(nextIdx, 'next');
  }

  function prevSlide() {
    const prevIdx = (currentIndex - 1 + total) % total;
    goToSlide(prevIdx, 'prev');
  }

  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      nextSlide();
      resetAutoplay();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => {
      e.preventDefault();
      prevSlide();
      resetAutoplay();
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(chip.getAttribute('data-index'), 10);
      if (!isNaN(idx) && idx !== currentIndex) {
        const dir = idx > currentIndex ? 'next' : 'prev';
        goToSlide(idx, dir);
        resetAutoplay();
      }
    });
  });

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(nextSlide, 6500);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', startAutoplay);

  let touchStartX = 0;
  let touchEndX = 0;
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoplay();
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    startAutoplay();
  }, { passive: true });

  updateControls(currentIndex);
  startAutoplay();
}

function setupTestimonialsInteractions() {
  const chips = document.querySelectorAll('.testimonial-filter-btn');
  const cards = document.querySelectorAll('.testimonial-card');

  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      chips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      const filter = chip.getAttribute('data-filter');

      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px)';
          setTimeout(() => {
            card.style.transition = 'all 0.35s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 30);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  document.querySelectorAll('.js-testimonial-reserve-btn').forEach(btn => {
    btn.onclick = () => {
      const defaultRoomId = roomsData.length > 0 ? roomsData[0].id : 860;
      openCheckoutModal(defaultRoomId);
    };
  });
}

function setupDecoracionesListeners() {
  document.querySelectorAll('.js-add-deco').forEach(btn => {
    btn.onclick = (e) => {
      const decoId = e.currentTarget.getAttribute('data-deco');
      const defaultRoomId = roomsData.length > 0 ? roomsData[0].id : 860;
      checkoutState.selectedExtras = ['deco'];
      openCheckoutModal(defaultRoomId);
      showToastNotification(`✨ Pack Decoración ${decoId} añadido a tu reserva`);
    };
  });
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
