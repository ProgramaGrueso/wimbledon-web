// Hotel Wimbledon — Editorial de Lujo JavaScript Logic

let landingData = null;
let roomsData = [];
let figmaData = null;
let specsData = {};

// Amenity Text Parser (Clean Editorial Format)
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

// Room Categorization Filter
function getRoomCategory(room) {
  const title = (room.nombre || '').toLowerCase();
  const desc = (room.descripcion || '').toLowerCase();

  if (title.includes('presidencial')) return 'presidencial';
  if (desc.includes('jacuzzi') || title.includes('jacuzzi')) return 'jacuzzi';
  if (desc.includes('vista al mar') || title.includes('vista al mar')) return 'vista-mar';
  return 'tematica';
}

// Data Fetcher
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
    setupIntersectionObserver();
    setupHeaderScroll();
    setupMobileNav();
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

// Render Main Editorial Layout
function renderEditorialApp() {
  const hero = landingData.hero || {};
  const contacto = landingData.contacto_real || {};

  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <!-- HERO SECTION (100VH FULL BLEED) -->
    <section id="hero" class="hero-editorial">
      <div class="hero-visual-full">
        <img src="https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg" alt="Hotel Wimbledon Presidencial" class="hero-img-full" />
      </div>
      <div class="hero-overlay-minimal"></div>
      
      <div class="hero-content-editorial">
        <h1 class="hero-editorial-h1 reveal">
          Privacidad, Confort <span>& Discreción frente al Mar</span>
        </h1>
        
        <p class="hero-editorial-sub reveal">
          ${hero.subtitulo || "Planifica tu estadía con nosotros. Contamos con habitaciones de lujo, suites temáticas con Jacuzzi, Cámara Seca, Estacionamiento Directo y Gastronomía las 24 horas."}
        </p>
        
        <div class="hero-meta-bar reveal">
          <div class="hero-meta-item">Av. Costanera 2098 • San Miguel, Lima</div>
          <div class="hero-meta-item">Servicio Privado 24/7</div>
          <div class="hero-meta-item">Tel: 578-6000</div>
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

    <!-- COLECCIÓN DE SUITES / HABITACIONES -->
    <section id="habitaciones" class="section-editorial bg-catalog-offwhite">
      <div class="editorial-container">
        <div class="editorial-header-block reveal">
          <span class="editorial-tag">CATÁLOGO DE HABITACIONES</span>
          <h2 class="editorial-headline">La Colección de Suites</h2>
        </div>

        <!-- Minimal Text Filter Tabs -->
        <div class="editorial-filter-bar reveal">
          <button class="editorial-filter-btn active" data-filter="all">Todas (${roomsData.length})</button>
          <button class="editorial-filter-btn" data-filter="presidencial">Presidenciales</button>
          <button class="editorial-filter-btn" data-filter="jacuzzi">Con Jacuzzi</button>
          <button class="editorial-filter-btn" data-filter="vista-mar">Vista al Mar</button>
          <button class="editorial-filter-btn" data-filter="tematica">Temáticas</button>
        </div>

        <!-- Suites Editorial List -->
        <div id="suitesList">
          <!-- Dynamically Injected -->
        </div>
      </div>
    </section>

    <!-- EXPERIENCIA & SERVICIOS (CONTRAST BLACK SECTION) -->
    <section id="experiencia" class="section-editorial bg-black">
      <div class="editorial-container">
        <div class="editorial-header-block reveal">
          <span class="editorial-tag">INSTALACIONES & DISCRECIÓN</span>
          <h2 class="editorial-headline" style="color: var(--color-white);">Servicios Exclusivos</h2>
        </div>

        <div class="experiencia-editorial-grid">
          <div class="experiencia-card-editorial reveal">
            <div class="experiencia-num">01</div>
            <h3 class="experiencia-title">Parking Directo</h3>
            <p class="experiencia-desc">
              Ingreso totalmente privado y discreto con estacionamiento directo a la habitación. Garantizamos la confidencialidad de tu visita desde la llegada hasta la partida.
            </p>
          </div>

          <div class="experiencia-card-editorial reveal">
            <div class="experiencia-num">02</div>
            <div class="experiencia-title">Minibar Gourmet</div>
            <p class="experiencia-desc">
              Disfruta de bebidas siempre frescas, licores seleccionados, espumantes y piqueos de alta calidad disponibles dentro de tu suite las 24 horas del día.
            </p>
          </div>

          <div class="experiencia-card-editorial reveal">
            <div class="experiencia-num">03</div>
            <h3 class="experiencia-title">Decoraciones Románticas</h3>
            <p class="experiencia-desc">
              Preparamos ambientaciones personalizadas para aniversarios y noches especiales con pétalos, arreglos finos y detalles modernos a solicitud del cliente.
            </p>
          </div>

          <div class="experiencia-card-editorial reveal">
            <div class="experiencia-num">04</div>
            <h3 class="experiencia-title">Room Service 24 Horas</h3>
            <p class="experiencia-desc">
              Nuestra cocina preparará al instante pastas, hamburguesas, piqueos calientes y desayunos criollos entregados con el debido protocolo a tu puerta.
            </p>
          </div>
        </div>
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
            Selecciona la fecha y habitación de tu interés. Tu solicitud se enviará a nuestra central de atención confidencial por WhatsApp.
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
                    ${roomsData.map(r => `<option value="${r.nombre}">${r.nombre}</option>`).join('')}
                  </select>
                </div>

                <div class="editorial-field">
                  <label class="editorial-label">Tiempo de Estadía</label>
                  <select id="edDuration" class="editorial-select">
                    <option value="6 Horas">Estadía por 6 Horas</option>
                    <option value="12 Horas">Estadía por 12 Horas</option>
                    <option value="Noche Completa">Noche Completa</option>
                  </select>
                </div>

                <div class="editorial-field full">
                  <label class="editorial-label">Fecha y Hora Estimada</label>
                  <input type="datetime-local" id="edDate" class="editorial-input" required />
                </div>

                <div class="editorial-field full" style="margin-top: 2rem; text-align: center;">
                  <button type="submit" class="btn-editorial-light" style="width: 100%;">
                    CONFIRMAR VÍA WHATSAPP
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

// Evocative Luxury Editorial Copy & Catalog Indexing
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
  14:  { num: "XVI", resumen: "La cúspide de la hospitalidad discreta. Amplitud, jacuzzi con hidromasaje y vista privilegiada sobre la bahía de Lima." }
};

// Render Editorial Suites List
function renderSuitesList(filterCategory = 'all') {
  const container = document.getElementById('suitesList');
  if (!container) return;

  const filtered = roomsData.filter(room => {
    if (filterCategory === 'all') return true;
    return getRoomCategory(room) === filterCategory;
  });

  container.innerHTML = filtered.map((room, index) => {
    const isReverse = index % 2 !== 0 ? 'reverse' : '';
    const amenities = parseAmenitiesText(room.descripcion);
    const categoryName = room.categoria_nombre || 'Suite de Lujo';
    
    const customInfo = EDITORIAL_ROOM_COPY[room.id] || {
      num: String(index + 1).padStart(2, '0'),
      resumen: room.resumen || room.descripcion.substring(0, 150) + '...'
    };

    const priceDisplay = room.precio ? `${room.precio}` : 'CONSULTAR';

    return `
      <div class="suite-editorial-item ${isReverse} reveal" data-id="${room.id}">
        <div class="suite-img-col">
          <img src="${room.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg'}" alt="${room.nombre}" loading="lazy" />
          <span class="suite-img-price">${priceDisplay}</span>
        </div>

        <div class="suite-info-col">
          <div class="suite-header-meta">
            <span class="suite-roman-num">${customInfo.num}</span>
            <span class="suite-cat-meta">— ${categoryName}</span>
          </div>
          
          <div class="suite-title-row">
            <h3 class="suite-editorial-title">${room.nombre}</h3>
            <span class="suite-editorial-price">${priceDisplay}</span>
          </div>
          
          <p class="suite-editorial-desc">${customInfo.resumen}</p>

          <div class="suite-editorial-meta">
            ${amenities.map(a => `<span class="meta-pill-editorial">— ${a}</span>`).join('')}
          </div>

          <div class="suite-actions">
            <button class="btn-editorial js-open-drawer" data-id="${room.id}">VER ESPECIFICACIONES</button>
            <a href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20reservar%20la%20habitacion%20${encodeURIComponent(room.nombre)}" target="_blank" class="btn-editorial-text" style="color: var(--color-black);">
              Reservar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setupDrawerListeners();
  setupIntersectionObserver();
}

// Render Gastronomy Menu List
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

// Open Editorial Drawer
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

      <a href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20reservar%20la%20${encodeURIComponent(titleFormatted)}" target="_blank" class="btn-editorial" style="width: 100%; text-align: center; margin-top: 2rem;">
        RESERVAR AHORA VÍA WHATSAPP
      </a>
    </div>
  `;

  const drawer = document.getElementById('roomDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

// Setup Event Listeners
function setupDrawerListeners() {
  const openBtns = document.querySelectorAll('.js-open-drawer');
  openBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openDrawer(btn.getAttribute('data-id'));
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

  // Filter Buttons
  const filterBtns = document.querySelectorAll('.editorial-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderSuitesList(e.target.getAttribute('data-filter'));
    });
  });
}

// Header Scroll Trigger
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

// Intersection Observer (Fade-In + translateY(20px))
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

// Mobile Drawer Navigation Handler
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

  // Close when clicking any nav item
  const navItems = navLinks.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', closeMobileNav);
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
      closeMobileNav();
    }
  });
}

// Form Handler
function setupFormHandler() {
  const form = document.getElementById('editorialForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('edName').value;
      const phone = document.getElementById('edPhone').value;
      const room = document.getElementById('edRoom').value;
      const duration = document.getElementById('edDuration').value;
      const date = document.getElementById('edDate').value;

      const message = `Hola Hotel Wimbledon, deseo solicitar una reserva:
- Cliente: ${name} (${phone})
- Suite: ${room}
- Tiempo: ${duration}
- Fecha: ${date}`;

      window.open(`https://wa.me/51990370681?text=${encodeURIComponent(message)}`, '_blank');
    });
  }
}

// Initialize
initApp();
