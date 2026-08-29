import { initSmoothScroll, initHeroPinAnimation, initServicesHoverAnimation, initHorizontalSuitesScroll, initMagneticButton } from './smoothScroll.js';
let landingData = null;
let roomsData = [];
let figmaData = null;
let specsData = {};
let cleanupSmoothScroll = null;
let heroMatchMedia = null;
let horizontalSuitesMatchMedia = null;
let checkoutState = {
  roomId: null,
  duration: '6 Horas', 
  arrivalTime: 'En 30 min', 
  customTime: '',
  paymentMethod: 'yape', 
  customerName: '',
  customerPhone: ''
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
  if (title.includes('presidencial')) return 'presidencial';
  if (desc.includes('jacuzzi') || title.includes('jacuzzi')) return 'jacuzzi';
  if (desc.includes('vista al mar') || title.includes('vista al mar')) return 'vista-mar';
  return 'tematica';
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
    setupCheckoutModalListeners();
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
    <!-- SECCIÓN HORIZONTAL SCROLL: NUESTRAS SUITES (GSAP PIN + PARALLAX INTERNO + SKEW) -->
    <div id="suitesHorizontalPinWrapper" class="suites-horizontal-wrapper">
      <section id="suitesHorizontalPinned" class="suites-horizontal-pinned">
        <div id="habitaciones" class="suites-horizontal-header">
          <span class="editorial-tag text-gold">COLECCIÓN DE AUTOR</span>
          <h2 class="editorial-headline" style="color: var(--color-white);">Nuestras Suites Exclusivas</h2>
        </div>
        <div id="suitesHorizontalTrack" class="suites-horizontal-track">
          <!-- Inyectado dinámicamente -->
        </div>
      </section>
    </div>
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
    <!-- GASTRONOMÍA EDITORIAL -->
    <section id="gastronomia" class="section-editorial bg-offwhite">
      <div class="editorial-container">
        <div class="editorial-header-block reveal">
          <span class="editorial-tag">CARTA A LA HABITACIÓN</span>
          <h2 class="editorial-headline">Gastronomía & Coctelería</h2>
        </div>
        <div class="gastronomia-list-editorial" id="gastronomiaList">
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
  const container = document.getElementById('suitesHorizontalTrack');
  if (!container) return;
  const filtered = roomsData.filter(room => {
    if (filterCategory === 'all') return true;
    return getRoomCategory(room) === filterCategory;
  });
  container.innerHTML = filtered.map((room, index) => {
    const amenities = parseAmenitiesText(room.descripcion);
    const categoryName = room.categoria_nombre || 'Suite de Lujo';
    const priceDisplay = room.precio ? `${room.precio}` : 'S/ 150';
    return `
      <div class="suite-card-horizontal" data-id="${room.id}">
        <div class="suite-card-img-wrapper">
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
  setupDrawerListeners();
}
function renderGastronomiaList() {
  const container = document.getElementById('gastronomiaList');
  if (!container || !figmaData || !figmaData.carta) return;
  const items = figmaData.carta.slice(0, 8);
  container.innerHTML = items.map(item => `
    <div class="gastronomia-item-editorial reveal">
      <div class="gastronomia-img-col">
        <img src="${item.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2025/10/hamburguesa-smash.png'}" alt="${item.nombre}" class="gastronomia-img-editorial" loading="lazy" />
      </div>
      <div class="gastronomia-info-col">
        <div class="gastronomia-header-row">
          <h4 class="gastronomia-title-editorial">${item.nombre}</h4>
          ${item.precio ? `<span class="gastronomia-price-editorial">${item.precio}</span>` : ''}
        </div>
        <p class="gastronomia-desc-editorial">${item.descripcion || 'Servicio directo a la habitación las 24 horas.'}</p>
      </div>
    </div>
  `).join('');
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
  const openBtns = document.querySelectorAll('.js-open-drawer');
  openBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openDrawer(btn.getAttribute('data-id'));
    });
  });
  const reserveNowBtns = document.querySelectorAll('.js-reserve-now');
  reserveNowBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openCheckoutModal(id);
    });
  });
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
  const filterBtns = document.querySelectorAll('.editorial-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderSuitesList(e.target.getAttribute('data-filter'));
    });
  });
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
    customerPhone: initialOptions.customerPhone || ''
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
  const totalPrice = calculateDynamicPrice(basePrice, checkoutState.duration);
  modalBody.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">FLUJO DE CHECKOUT DIGITAL</span>
      <h2 style="font-family: var(--font-serif); font-size: 1.85rem; color: #fff; margin-top: 0.25rem;">
        Reservar ${room.nombre}
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.2rem;">
        ${room.categoria_nombre || 'Suite de Lujo'} • Tarifa Base: ${room.precio || 'S/ 150'}
      </p>
    </div>
    <!-- 3-STEP PROGRESS STEPPER -->
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
        <span class="step-label">Pago</span>
      </div>
    </div>
    <form id="checkoutDynamicForm">
      <!-- PASO A: DURACIÓN DE ESTADÍA -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO A — SELECCIONA LA DURACIÓN
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
          PASO B — HORA DE LLEGADA ESTIMADA
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
          <div class="chip-option ${checkoutState.arrivalTime === '21:00' ? 'active' : ''}" data-time="21:00">
            <span class="chip-title">21:00 hrs</span>
            <span class="chip-sub">Turno Noche</span>
          </div>
          <div class="chip-option ${checkoutState.arrivalTime === '22:00' ? 'active' : ''}" data-time="22:00">
            <span class="chip-title">22:00 hrs</span>
            <span class="chip-sub">Turno Noche</span>
          </div>
        </div>
      </div>
      <!-- PASO C: MEDIO DE PAGO & DATOS DEL HUÉSPED -->
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          PASO C — MEDIO DE PAGO
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
          📱 <strong>Instrucciones Yape / Plin:</strong> Yapear al número <code>990 370 681</code> (Hotel Wimbledon S.A.C.). Tu reserva quedará lista para check-in inmediato.
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
      <!-- DATOS DE REGISTRO CLIENTE -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">NOMBRE COMPLETO</label>
          <input type="text" id="checkoutName" value="${checkoutState.customerName}" placeholder="Nombre completo" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">TELÉFONO CELULAR</label>
          <input type="tel" id="checkoutPhone" value="${checkoutState.customerPhone}" placeholder="990370681" style="width: 100%; padding: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #fff; font-size: 0.9rem;" required />
        </div>
      </div>
      <!-- PRICE SUMMARY BOX -->
      <div class="price-summary-box">
        <div>
          <span class="summary-total-label">Monto Total a Pagar</span>
          <div style="font-size: 0.75rem; color: #64748b;">${checkoutState.duration} • Impuestos incluidos (IGV 18%)</div>
        </div>
        <span class="summary-total-val">S/ ${totalPrice}.00</span>
      </div>
      <button type="submit" class="btn-editorial-light" style="width: 100%; text-align: center; justify-content: center; padding: 1.1rem; font-weight: bold; font-size: 1rem; cursor: pointer; background: #fff; color: #000;">
        CONFIRMAR Y PAGAR (S/ ${totalPrice}.00)
      </button>
    </form>
  `;
  const durationOptions = modalBody.querySelectorAll('[data-duration]');
  durationOptions.forEach(opt => {
    opt.onclick = () => {
      checkoutState.duration = opt.getAttribute('data-duration');
      checkoutState.customerName = document.getElementById('checkoutName')?.value || '';
      checkoutState.customerPhone = document.getElementById('checkoutPhone')?.value || '';
      renderCheckoutModalContent();
    };
  });
  const timeOptions = modalBody.querySelectorAll('[data-time]');
  timeOptions.forEach(opt => {
    opt.onclick = () => {
      checkoutState.arrivalTime = opt.getAttribute('data-time');
      checkoutState.customerName = document.getElementById('checkoutName')?.value || '';
      checkoutState.customerPhone = document.getElementById('checkoutPhone')?.value || '';
      renderCheckoutModalContent();
    };
  });
  const paymentOptions = modalBody.querySelectorAll('[data-method]');
  paymentOptions.forEach(opt => {
    opt.onclick = () => {
      checkoutState.paymentMethod = opt.getAttribute('data-method');
      checkoutState.customerName = document.getElementById('checkoutName')?.value || '';
      checkoutState.customerPhone = document.getElementById('checkoutPhone')?.value || '';
      renderCheckoutModalContent();
    };
  });
  const form = document.getElementById('checkoutDynamicForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('checkoutName').value;
      const phone = document.getElementById('checkoutPhone').value;
      checkoutState.customerName = name;
      checkoutState.customerPhone = phone;
      confirmAndSaveBooking(room, totalPrice);
    };
  }
}
function confirmAndSaveBooking(room, totalAmount) {
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `#WMB-${randomId}`;
  const booking = {
    id: bookingCode,
    habitacionId: room.id,
    habitacionNombre: room.nombre,
    duracion: checkoutState.duration,
    horarioLlegada: checkoutState.arrivalTime,
    monto: totalAmount,
    medioPago: checkoutState.paymentMethod === 'yape' ? 'Yape / Plin' : 'Tarjeta de Crédito / Débito',
    clienteNombre: checkoutState.customerName,
    clienteTelefono: checkoutState.customerPhone,
    estado: 'CONFIRMADA',
    fechaReserva: new Date().toISOString()
  };
  try {
    const existing = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
    existing.unshift(booking);
    localStorage.setItem('wimbledon_bookings', JSON.stringify(existing));
  } catch (err) {
    console.error('Error al guardar en LocalStorage:', err);
  }
  const modalBody = document.getElementById('checkoutModalBody');
  if (!modalBody) return;
  modalBody.innerHTML = `
    <div class="receipt-container">
      <div class="receipt-badge-icon">✓</div>
      <span style="color: #10b981; font-size: 0.8rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
        RESERVA CONFIRMADA EXITOSAMENTE
      </span>
      <h2 style="font-family: var(--font-serif); font-size: 2rem; color: #fff; margin-top: 0.25rem;">
        ¡Gracias por tu reserva, ${booking.clienteNombre}!
      </h2>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">
        Tu estancia ha sido registrada y garantizada con hermetismo absoluto.
      </p>
      <div class="receipt-code-box">
        <span style="display: block; font-size: 0.7rem; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px;">CÓDIGO DE RESERVA ÚNICO</span>
        <span class="receipt-code-num">${bookingCode}</span>
      </div>
      <table class="receipt-details-table">
        <tbody>
          <tr>
            <td class="receipt-label">Suite / Habitación</td>
            <td class="receipt-val">${booking.habitacionNombre}</td>
          </tr>
          <tr>
            <td class="receipt-label">Tiempo de Estadía</td>
            <td class="receipt-val">${booking.duracion}</td>
          </tr>
          <tr>
            <td class="receipt-label">Llegada Estimada</td>
            <td class="receipt-val">${booking.horarioLlegada}</td>
          </tr>
          <tr>
            <td class="receipt-label">Medio de Pago</td>
            <td class="receipt-val">${booking.medioPago}</td>
          </tr>
          <tr>
            <td class="receipt-label">Estado de Reserva</td>
            <td class="receipt-val" style="color: #10b981;">● ${booking.estado}</td>
          </tr>
          <tr>
            <td class="receipt-label">Monto Total Pagado</td>
            <td class="receipt-val" style="color: #fbbf24; font-size: 1.1rem;">S/ ${booking.monto}.00</td>
          </tr>
        </tbody>
      </table>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.8rem; color: #a7f3d0; margin-bottom: 1.5rem;">
        🔒 Presenta tu código <code>${bookingCode}</code> o tu nombre en el acceso privado al estacionamiento o recepción.
      </div>
      <button id="btnFinishCheckout" class="btn-editorial-light" style="width: 100%; padding: 1rem; font-weight: bold; background: #fff; color: #000; cursor: pointer;">
        FINALIZAR Y VOLVER
      </button>
    </div>
  `;
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
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const navCloseBtn = document.getElementById('navCloseBtn');
  const navBackdrop = document.getElementById('navBackdrop');
  if (!hamburgerBtn || !navLinks) return;
  function openMobileNav() {
    navLinks.classList.add('mobile-open');
    if (navBackdrop) {
      navBackdrop.classList.add('open');
      navBackdrop.setAttribute('aria-hidden', 'false');
    }
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    navLinks.classList.remove('mobile-open');
    if (navBackdrop) {
      navBackdrop.classList.remove('open');
      navBackdrop.setAttribute('aria-hidden', 'true');
    }
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.contains('mobile-open');
    if (isOpen) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });
  if (navCloseBtn) {
    navCloseBtn.addEventListener('click', closeMobileNav);
  }
  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMobileNav);
  }
  const navItems = navLinks.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', closeMobileNav);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
      closeMobileNav();
    }
  });
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
initApp();
