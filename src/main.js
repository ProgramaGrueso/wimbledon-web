// Hotel Wimbledon — Editorial de Lujo JavaScript Logic

let landingData = null;
let roomsData = [];
let figmaData = null;

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
    const [resLanding, resRooms, resFigma] = await Promise.all([
      fetch('/data/landing_real.json').then(r => r.json()),
      fetch('/data/catalogo_habitaciones.json').then(r => r.json()),
      fetch('/data/figma_catalogo.json').then(r => r.json())
    ]);

    landingData = resLanding.landing_page || resLanding;
    roomsData = resRooms;
    figmaData = resFigma;

    renderEditorialApp();
    setupIntersectionObserver();
    setupHeaderScroll();
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

    <!-- EDITORIAL CONCEPT SECTION -->
    <section id="concepto" class="section-editorial bg-offwhite">
      <div class="editorial-container">
        <div class="concepto-editorial-layout">
          <div class="reveal">
            <span class="editorial-tag">EL CONCEPTO WIMBLEDON</span>
            <h2 class="concepto-editorial-text">
              "Hotel Wimbledon fusiona lo tradicional y lo imaginativo a través de sus más de 130 habitaciones preparadas para el máximo placer e intimidad."
            </h2>
            <p class="concepto-body-text">
              Ubicados estratègicamente en la Avenida Costanera en San Miguel, brindamos una experiencia multisensorial con absoluto hermetismo. Nuestras suites ejecutivas y presidenciales cuentan con acabados finos, equipamiento especial como Cámara Seca, Ducha Española, Pole Dance y Jacuzzi con Hidromasaje.
            </p>
            <div style="margin-top: 3rem;">
              <a href="#habitaciones" class="btn-editorial">EXPLORAR LA COLECCIÓN</a>
            </div>
          </div>
          
          <div class="reveal">
            <img src="https://wimbledon-hotel.com/wp-content/uploads/2022/08/Riverside-Dreams-Presidencial.jpg" alt="Riverside Dreams Presidencial" class="concepto-full-img" />
          </div>
        </div>
      </div>
    </section>

    <!-- COLECCIÓN DE SUITES / HABITACIONES -->
    <section id="habitaciones" class="section-editorial bg-white">
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

    <!-- RESERVA EDITORIAL -->
    <section id="reserva" class="section-editorial bg-black">
      <div class="editorial-container">
        <div class="editorial-header-block reveal" style="text-align: center; max-width: 800px; margin-left: auto; margin-right: auto;">
          <span class="editorial-tag">DISPONIBILIDAD INMEDIATA</span>
          <h2 class="editorial-headline" style="color: var(--color-white);">Reservar una Suite</h2>
          <p style="color: #999999; margin-top: 1rem;">
            Selecciona la fecha y habitación de tu interés. Tu solicitud se enviará a nuestra central de atención confidencial por WhatsApp.
          </p>
        </div>

        <div class="editorial-form-wrap reveal">
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
                <button type="submit" class="btn-editorial-light" style="width: 100%; max-width: 450px; margin: 0 auto;">
                  CONFIRMAR VIA WHATSAPP
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>

    <!-- EDITORIAL FOOTER -->
    <footer class="editorial-footer">
      <div class="editorial-container">
        <div class="footer-editorial-grid">
          <div>
            <h3 class="footer-title-serif">WIMBLEDON</h3>
            <p style="color: #999; font-size: 0.95rem; max-width: 420px; line-height: 1.8;">
              Hotel de estadía por horas y suites de lujo en San Miguel, Lima. Privacidad garantizada, atención 24 horas y gastronomía frente al mar.
            </p>
          </div>

          <div>
            <span class="footer-meta-label">Ubicación</span>
            <p class="footer-meta-val">${contacto.direccion || 'Av. Costanera 2098, San Miguel, Lima, Perú'}</p>
          </div>

          <div>
            <span class="footer-meta-label">Central Telefónica</span>
            <p class="footer-meta-val">578-6000<br>+51 990 370 681<br>+51 941 965 168</p>
          </div>
        </div>

        <div style="padding-top: 3rem; border-top: 1px solid var(--color-border-dark); text-align: center; color: #666; font-size: 0.8rem;">
          <p>&copy; ${new Date().getFullYear()} Hotel Wimbledon. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  `;

  renderSuitesList('all');
  renderGastronomiaList();
  setupFormHandler();
}

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

    return `
      <div class="suite-editorial-item ${isReverse} reveal" data-id="${room.id}">
        <div class="suite-img-col">
          <img src="${room.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg'}" alt="${room.nombre}" loading="lazy" />
        </div>

        <div class="suite-info-col">
          <span class="suite-cat-meta">${categoryName}</span>
          <h3 class="suite-editorial-title">${room.nombre}</h3>
          <p class="suite-editorial-desc">${room.resumen || room.descripcion.substring(0, 160) + '...'}</p>

          <div class="suite-editorial-meta">
            ${amenities.map(a => `<span class="meta-pill-editorial">— ${a}</span>`).join('')}
          </div>

          <div style="display: flex; gap: 2rem; align-items: center;">
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

  const items = figmaData.carta.slice(0, 6);
  container.innerHTML = items.map(item => `
    <div class="gastronomia-item-editorial reveal">
      <img src="${item.imagen_url || 'https://wimbledon-hotel.com/wp-content/uploads/2025/10/hamburguesa-smash.png'}" alt="${item.nombre}" class="gastronomia-img-editorial" loading="lazy" />
      <div>
        <h4 class="gastronomia-title-editorial">${item.nombre}</h4>
        <p class="gastronomia-desc-editorial">${item.descripcion || 'Servicio directo a la habitación las 24 horas.'}</p>
      </div>
    </div>
  `).join('');
}

// Open Editorial Drawer
function openDrawer(roomId) {
  const room = roomsData.find(r => r.id === parseInt(roomId));
  if (!room) return;

  const amenities = parseAmenitiesText(room.descripcion);

  const drawerBody = document.getElementById('drawerBody');
  drawerBody.innerHTML = `
    <span class="suite-cat-meta">${room.categoria_nombre}</span>
    <h2 style="font-family: var(--font-serif); font-size: 3rem; font-weight: 300; margin-bottom: 1.5rem;">${room.nombre}</h2>
    
    <img src="${room.imagen_url}" alt="${room.nombre}" style="width: 100%; height: 320px; object-fit: cover; margin-bottom: 2rem;" />
    
    <p style="font-size: 1.05rem; line-height: 1.8; color: #444; margin-bottom: 2rem;">
      ${room.descripcion}
    </p>

    <h4 style="font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 1rem;">Equipamiento Incluido:</h4>
    <ul style="list-style: none; margin-bottom: 2.5rem;">
      ${amenities.map(a => `<li style="padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.95rem;">— ${a}</li>`).join('')}
    </ul>

    <a href="https://wa.me/51990370681?text=Hola%20Hotel%20Wimbledon,%20deseo%20reservar%20la%20habitacion%20${encodeURIComponent(room.nombre)}" target="_blank" class="btn-editorial" style="width: 100%; text-align: center;">
      SOLICITAR DISPONIBILIDAD VIA WHATSAPP
    </a>
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
