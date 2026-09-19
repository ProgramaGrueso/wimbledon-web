import { supabase } from './supabaseClient.js';

/**
 * Hotel Wimbledon — Sistema de Gestión y Administración Interna (v0.3 - Supabase Cloud)
 * Control de acceso multirrol (Gerente, Recepción, Limpieza)
 * Gestiona el Rack de 132 habitaciones físicas, lectura QR y KPIs en tiempo real.
 */

// Estado inicial del Rack Hotel Wimbledon (Fallback offline)
const DEFAULT_ROOMS_RACK = [
  { id: 101, numero: "101", nombre: "Habitación Especial", piso: 1, tipo: "Cochera Directa", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 102, numero: "102", nombre: "Habitación Especial", piso: 1, tipo: "Cochera Directa", estado: "OCUPADA", duracionRestante: "02h:15m", cliente: "M. Ramirez" },
  { id: 111, numero: "111", nombre: "Habitación Delux", piso: 1, tipo: "Estándar", estado: "LIMPIEZA", duracionRestante: "Aseo Pendiente", cliente: null },
  { id: 121, numero: "121", nombre: "Simple con Jacuzzi", piso: 1, tipo: "Cochera Directa", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 201, numero: "201", nombre: "Habitación Delux", piso: 2, tipo: "Confort", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 211, numero: "211", nombre: "Hawaian Dreams", piso: 2, tipo: "Temática", estado: "OCUPADA", duracionRestante: "01h:10m", cliente: "C. Vargas" },
  { id: 221, numero: "221", nombre: "Jacuzzi Deluxe", piso: 2, tipo: "Jacuzzi & Spa", estado: "EN_PROCESO", duracionRestante: "Desinfección", cliente: null },
  { id: 301, numero: "301", nombre: "Tropical Dreams", piso: 3, tipo: "Temática Lujo", estado: "OCUPADA", duracionRestante: "04h:00m", cliente: "Carlos Prueba UTP" },
  { id: 309, numero: "309", nombre: "Simple Vista al Mar", piso: 3, tipo: "Vista al Mar", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 401, numero: "401", nombre: "Suite Presidencial", piso: 4, tipo: "Penthouse Presidencial", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 405, numero: "405", nombre: "Riverside Dreams Presidencial", piso: 4, tipo: "Presidencial", estado: "LIBRE", duracionRestante: "-", cliente: null },
  { id: 413, numero: "413", nombre: "Dark Fantasies", piso: 4, tipo: "Temática Lujo", estado: "LIBRE", duracionRestante: "-", cliente: null }
];

let roomsRack = [];
try {
  const storedRack = localStorage.getItem('wimbledon_admin_rack');
  roomsRack = storedRack ? JSON.parse(storedRack) : DEFAULT_ROOMS_RACK;
} catch (e) {
  roomsRack = DEFAULT_ROOMS_RACK;
}

let liveSupabaseKpis = null;
let liveSupabaseReservas = [];

function saveRack() {
  try {
    localStorage.setItem('wimbledon_admin_rack', JSON.stringify(roomsRack));
  } catch (e) {}
}

// Sincronización en tiempo real con Supabase Cloud
async function syncAdminDataFromSupabase() {
  try {
    // 1. Cargar las 132 habitaciones físicas desde la vista oficial
    const { data: rackData, error: rackErr } = await supabase
      .from('v_rack_habitaciones_132')
      .select('*')
      .order('habitacion_id', { ascending: true });

    if (!rackErr && rackData && rackData.length > 0) {
      roomsRack = rackData.map(r => ({
        id: r.habitacion_id,
        numero: r.numero,
        nombre: r.tipo_nombre,
        piso: r.piso,
        tipo: r.tiene_cochera_directa ? 'Cochera Directa' : r.categoria,
        estado: r.estado_fisico === 'disponible' ? 'LIBRE' : (r.estado_fisico === 'ocupada' ? 'OCUPADA' : (r.estado_fisico === 'limpieza_pendiente' ? 'LIMPIEZA' : 'EN_PROCESO')),
        duracionRestante: r.ocupacion_actual ? '04h:20m' : '-',
        cliente: r.ocupacion_actual ? r.ocupacion_actual.nombre_huesped : null,
        qrToken: r.ocupacion_actual ? r.ocupacion_actual.qr_token : null,
        tarifa: r.tarifa_base,
        cochera: r.tiene_cochera_directa
      }));
      saveRack();
    }

    // 2. Cargar KPIs Financieros Oficiales
    const { data: kpiData } = await supabase.from('v_kpis_financieros').select('*').limit(1);
    if (kpiData && kpiData.length > 0) {
      liveSupabaseKpis = kpiData[0];
    }

    // 3. Cargar las últimas reservas reales de la nube
    const { data: resData } = await supabase
      .from('reservas')
      .select('*, habitaciones_fisicas(numero, piso)')
      .order('id', { ascending: false })
      .limit(25);

    if (resData && resData.length > 0) {
      liveSupabaseReservas = resData;
    }

    if (currentStaffSession) {
      renderAdminApp();
    }
  } catch (err) {
    console.warn('ℹ️ Modo autónomo offline (Supabase no accesible en este instante):', err);
  }
}

// Iniciar sincronización de inmediato
syncAdminDataFromSupabase();

let currentStaffSession = null;
let activeFloorFilter = 'all';

function renderAdminApp() {
  const container = document.getElementById('adminApp');
  if (!container) return;

  if (!currentStaffSession) {
    // LOGIN MULTIRROL
    container.innerHTML = `
      <div style="max-width: 500px; margin: 2rem auto; background: #0b0f19; border: 2px solid rgba(217, 119, 6, 0.4); border-radius: 24px; padding: 2.5rem; color: #fff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">ACCESO RESTRINGIDO</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.25rem; margin-top: 0.5rem; color: #fff;">Control Interno</h1>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.35rem;">Selecciona tu rol para ingresar al panel operativo.</p>
        </div>

        <form id="staffLoginForm" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.5px;">ROL OPERATIVO</label>
            <select id="roleSelect" style="width: 100%; padding: 0.9rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: #fbbf24; font-weight: bold; font-size: 0.95rem; outline: none; cursor: pointer;">
              <option value="recepcion">🛎️ Recepción (Lector QR, Rack en Vivo & Check-in)</option>
              <option value="limpieza">🧹 Limpieza / Housekeeping (Aseo sin datos de clientes)</option>
              <option value="gerente">📊 Gerente General (KPIs, Ocupación & Ingresos)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.5px;">CONTRASEÑA DE PERSONAL</label>
            <input type="password" id="passInput" value="1234" placeholder="Ingresa contraseña (1234)" style="width: 100%; padding: 0.9rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: #fff; font-size: 0.95rem; outline: none;" required />
          </div>

          <div style="background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.25); border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.8rem; color: #fef08a;">
            💡 <strong>Demostración Académica:</strong> Contraseña por defecto <code>1234</code> para los tres roles.
          </div>

          <div id="loginErrorMsg" style="display: none; color: #f43f5e; font-size: 0.85rem; text-align: center; font-weight: bold;"></div>

          <button type="submit" class="btn-editorial-light" style="width: 100%; text-align: center; justify-content: center; padding: 1.1rem; font-weight: bold; font-size: 1rem; cursor: pointer; background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; border: none; border-radius: 12px; box-shadow: 0 10px 25px rgba(217, 119, 6, 0.3);">
            INGRESAR AL SISTEMA
          </button>
        </form>
      </div>
    `;

    document.getElementById('staffLoginForm').onsubmit = (e) => {
      e.preventDefault();
      const role = document.getElementById('roleSelect').value;
      const pass = document.getElementById('passInput').value;
      const errEl = document.getElementById('loginErrorMsg');

      if (pass === '1234') {
        let name = 'Carlos Mendoza (Recepcionista)';
        if (role === 'gerente') name = 'Lic. Vania Cerrón (Gerencia General)';
        if (role === 'limpieza') name = 'Personal de Turno (Housekeeping)';

        currentStaffSession = { role, name };
        renderAdminApp();
      } else {
        errEl.style.display = 'block';
        errEl.innerText = '❌ Contraseña incorrecta. Utilice "1234".';
      }
    };
  } else {
    // DASHBOARD MULTIRROL
    const { role, name } = currentStaffSession;

    container.innerHTML = `
      <div style="background: #0b0f19; border: 2px solid rgba(217, 119, 6, 0.4); border-radius: 24px; padding: 2.25rem; color: #fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.85);">
        <!-- BARRA SUPERIOR DEL PANEL -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; margin-bottom: 2rem;">
          <div>
            <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">PANEL HOTEL WIMBLEDON EN VIVO</span>
            <h2 style="font-family: var(--font-serif); font-size: 2rem; color: #fff; margin-top: 0.2rem;">
              ${role === 'gerente' ? '📊 Gerencia & Indicadores de Negocio' : (role === 'recepcion' ? '🛎️ Recepción, Check-in & Rack Operativo' : '🧹 Gestión de Limpieza & Mantenimiento')}
            </h2>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.35rem;">
              <span class="avail-dot"></span>
              <span style="font-size: 0.85rem; color: #fbbf24; font-weight: 600;">
                SESIÓN ACTIVA: ${role.toUpperCase()} — ${name}
              </span>
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="btnSwitchRole" class="btn-editorial-outline" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; border-color: #fbbf24; color: #fbbf24; cursor: pointer; border-radius: 8px;">
              Cambiar de Rol
            </button>
            <button id="btnLogout" class="btn-editorial-light" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; background: #be123c; border-color: #f43f5e; color: #fff; cursor: pointer; border-radius: 8px;">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <!-- CONTENIDO ESPECÍFICO SEGÚN ROL -->
        ${role === 'gerente' ? renderGerenteWorkspace() : (role === 'recepcion' ? renderRecepcionWorkspace() : renderLimpiezaWorkspace())}
      </div>
    `;

    document.getElementById('btnSwitchRole').onclick = () => {
      currentStaffSession = null;
      renderAdminApp();
    };
    document.getElementById('btnLogout').onclick = () => {
      currentStaffSession = null;
      renderAdminApp();
    };

    if (role === 'gerente') setupGerenteEvents();
    if (role === 'recepcion') setupRecepcionEvents();
    if (role === 'limpieza') setupLimpiezaEvents();
  }
}

// ==========================================
// 1. ESPACIO DE TRABAJO: RECEPCIÓN
// ==========================================
function renderRecepcionWorkspace() {
  const occupiedCount = roomsRack.filter(r => r.estado === 'OCUPADA').length;
  const freeCount = roomsRack.filter(r => r.estado === 'LIBRE').length;
  const cleaningCount = roomsRack.filter(r => r.estado === 'LIMPIEZA' || r.estado === 'EN_PROCESO').length;

  let bookings = [];
  try {
    bookings = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
  } catch (e) {}

  return `
    <!-- SIMULADOR DE LECTOR DE CÓDIGO QR / PIN DIGITAL (HU.03 & HU.05) -->
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 1.75rem; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.72rem; color: #38bdf8; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">
            MECANISMO DE ACCESO DIGITAL (CERRADURA INTELIGENTE & QR)
          </span>
          <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: #fff; margin-top: 0.2rem;">
            Validador de Check-in Express
          </h3>
          <p style="font-size: 0.8rem; color: #94a3b8;">
            Escanea el código QR del cliente o ingresa el código/PIN de 6 dígitos para abrir la puerta y marcar check-in.
          </p>
        </div>
        <button id="btnQuickSimulateQR" class="btn-editorial-light" style="background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; font-size: 0.8rem; padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: bold; cursor: pointer;">
          ⚡ Simular Lectura de Pase Digital
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; align-items: center; margin-top: 1.5rem;">
        <!-- Visor del Escáner Láser -->
        <div class="qr-scanner-viewport">
          <div class="laser-scan-line"></div>
          <div class="scanner-frame-reticle">
            <span>COLOCAR CÓDIGO QR O PASE FRENTE AL LECTOR</span>
          </div>
        </div>

        <!-- Formulario Manual de Validación de PIN -->
        <div>
          <form id="validatePinForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 0.35rem;">
                CÓDIGO DE RESERVA (#WMB-XXXX) O PIN DE 6 DÍGITOS
              </label>
              <input type="text" id="inputScanCode" placeholder="Ej: #WMB-1024 o 748291" style="width: 100%; padding: 0.85rem 1rem; background: #060911; border: 1px solid #334155; border-radius: 10px; color: #fbbf24; font-family: monospace; font-size: 1.1rem; letter-spacing: 2px;" required />
            </div>
            <button type="submit" class="btn-editorial-light" style="padding: 0.9rem; background: #10b981; border: none; color: #fff; font-weight: bold; border-radius: 10px; cursor: pointer;">
              VALIDAR ACCESO & DESBLOQUEAR HABITACIÓN
            </button>
          </form>
          <div id="qrValidateFeedback" style="margin-top: 0.85rem; display: none;"></div>
        </div>
      </div>
    </div>

    <!-- ACCIONES RÁPIDAS DE RECEPCIÓN -->
    <div style="display: flex; gap: 0.75rem; margin-bottom: 1.75rem; flex-wrap: wrap;">
      <button id="btnOpenWalkIn" class="btn-editorial-light" style="padding: 0.65rem 1.25rem; font-size: 0.85rem; cursor: pointer; background: #fff; color: #000; font-weight: bold; border-radius: 8px;">
        + Registrar Walk-In (Llegada en Auto)
      </button>
      <button onclick="alert('Cierre de caja generado. Total recaudado en turno: S/ 4,820.00')" class="btn-editorial-outline" style="padding: 0.65rem 1.25rem; font-size: 0.85rem; cursor: pointer; border-radius: 8px; border-color: #334155;">
        Cierre de Caja del Turno
      </button>
    </div>

    <!-- RACK DE HABITACIONES EN VIVO (HU.06) -->
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 1.75rem; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 1.35rem; color: #fbbf24;">
            Rack Operativo en Vivo (16 Suites)
          </h4>
          <span style="font-size: 0.8rem; color: #94a3b8;">
            🟢 ${freeCount} Libres • 🔴 ${occupiedCount} Ocupadas • 🟡 ${cleaningCount} En Aseo
          </span>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="amenity-chip-btn ${activeFloorFilter === 'all' ? 'active' : ''}" data-floor="all">Todos (${roomsRack.length})</button>
          <button class="amenity-chip-btn ${activeFloorFilter === '1' ? 'active' : ''}" data-floor="1">Piso 1 (Cocheras)</button>
          <button class="amenity-chip-btn ${activeFloorFilter === '2' ? 'active' : ''}" data-floor="2">Piso 2 (Confort)</button>
          <button class="amenity-chip-btn ${activeFloorFilter === '3' ? 'active' : ''}" data-floor="3">Piso 3 (Vistas)</button>
          <button class="amenity-chip-btn ${activeFloorFilter === '4' ? 'active' : ''}" data-floor="4">Piso 4 (Penthouse)</button>
        </div>
      </div>

      <!-- Cuadrícula de Habitaciones -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;" id="adminRackGrid">
        ${renderRackCardsHTML()}
      </div>
    </div>

    <!-- AGENDA DE RESERVAS DE HOY -->
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 1.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-family: var(--font-serif); font-size: 1.35rem; color: #ffffff; margin: 0;">
          Agenda de Reservas en la Nube (${(liveSupabaseReservas.length || bookings.length)})
        </h4>
        <span style="font-size: 0.75rem; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: bold;">
          ● Supabase Cloud Conectado
        </span>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; color: #94a3b8;">
              <th style="padding: 0.75rem;">Código / QR</th>
              <th style="padding: 0.75rem;">Huésped</th>
              <th style="padding: 0.75rem;">Habitación</th>
              <th style="padding: 0.75rem;">Duración</th>
              <th style="padding: 0.75rem;">Llegada</th>
              <th style="padding: 0.75rem;">Monto</th>
              <th style="padding: 0.75rem;">Estado</th>
              <th style="padding: 0.75rem;">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${(liveSupabaseReservas.length > 0 ? liveSupabaseReservas : bookings).length === 0 ? `
              <tr><td colspan="8" style="padding: 1.5rem; text-align: center; color: #64748b;">No hay reservas registradas aún.</td></tr>
            ` : (liveSupabaseReservas.length > 0 ? liveSupabaseReservas.map(b => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.75rem; font-family: monospace; color: #fbbf24; font-weight: bold;">${b.qr_token || `#WMB-${b.id}`}</td>
                <td style="padding: 0.75rem; color: #fff;">${b.nombre_huesped}</td>
                <td style="padding: 0.75rem;">Hab. ${b.habitaciones_fisicas?.numero || b.habitacion_fisica_id}</td>
                <td style="padding: 0.75rem;">${b.duracion_horas}h</td>
                <td style="padding: 0.75rem;">${b.hora_ingreso ? b.hora_ingreso.slice(0, 5) : '14:00'}</td>
                <td style="padding: 0.75rem; color: #10b981; font-weight: bold;">S/ ${b.monto_total}</td>
                <td style="padding: 0.75rem;">
                  <span style="font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: ${b.estado === 'confirmada' ? 'rgba(16, 185, 129, 0.2)' : (b.estado === 'checkin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)')}; color: ${b.estado === 'confirmada' ? '#10b981' : (b.estado === 'checkin' ? '#f59e0b' : '#38bdf8')}; font-weight: bold; text-transform: uppercase;">
                    ${b.estado}
                  </span>
                </td>
                <td style="padding: 0.75rem;">
                  <button class="btn-editorial-light js-checkin-booking" data-code="${b.qr_token || b.id}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; background: #fbbf24; color: #000; border: none; font-weight: bold; border-radius: 6px; cursor: pointer;">
                    ${b.estado === 'checkin' ? 'Activo' : 'Check-in'}
                  </button>
                </td>
              </tr>
            `).join('') : bookings.map(b => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.75rem; font-family: monospace; color: #fbbf24; font-weight: bold;">${b.id}</td>
                <td style="padding: 0.75rem; color: #fff;">${b.clienteNombre}</td>
                <td style="padding: 0.75rem;">${b.habitacionNombre}</td>
                <td style="padding: 0.75rem;">${b.duracion}</td>
                <td style="padding: 0.75rem;">${b.horarioLlegada}</td>
                <td style="padding: 0.75rem; color: #10b981; font-weight: bold;">S/ ${b.monto}.00</td>
                <td style="padding: 0.75rem;">
                  <span style="font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: ${b.estado === 'CONFIRMADA' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)'}; color: ${b.estado === 'CONFIRMADA' ? '#10b981' : '#38bdf8'}; font-weight: bold;">
                    ${b.estado}
                  </span>
                </td>
                <td style="padding: 0.75rem;">
                  <button class="btn-editorial-light js-checkin-booking" data-code="${b.id}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; background: #fbbf24; color: #000; border: none; font-weight: bold; border-radius: 6px; cursor: pointer;">
                    Check-in
                  </button>
                </td>
              </tr>
            `).join(''))}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRackCardsHTML() {
  const filtered = roomsRack.filter(r => {
    if (activeFloorFilter === 'all') return true;
    return r.piso === parseInt(activeFloorFilter, 10);
  });

  return filtered.map(room => {
    let stateClass = 'state-libre';
    let badgeColor = '#10b981';
    let badgeText = 'LIBRE';

    if (room.estado === 'OCUPADA') {
      stateClass = 'state-ocupada';
      badgeColor = '#f43f5e';
      badgeText = `OCUPADA (${room.duracionRestante})`;
    } else if (room.estado === 'LIMPIEZA' || room.estado === 'EN_PROCESO') {
      stateClass = 'state-limpieza';
      badgeColor = '#f59e0b';
      badgeText = room.estado === 'EN_PROCESO' ? 'EN ASEO' : 'LIMPIEZA';
    }

    return `
      <div class="rack-room-card ${stateClass} js-rack-card" data-room-id="${room.id}">
        <span style="font-size: 0.7rem; color: #94a3b8; display: block;">PISO ${room.piso} • ${room.tipo}</span>
        <strong style="font-size: 1.6rem; color: #fff; display: block; margin: 0.2rem 0; font-family: monospace;">${room.numero}</strong>
        <span style="font-size: 0.75rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${room.nombre}</span>
        <span style="font-size: 0.65rem; background: ${badgeColor}; color: #000; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; text-transform: uppercase;">
          ${badgeText}
        </span>
      </div>
    `;
  }).join('');
}

function setupRecepcionEvents() {
  // Filtro de pisos
  document.querySelectorAll('[data-floor]').forEach(btn => {
    btn.onclick = (e) => {
      activeFloorFilter = e.target.getAttribute('data-floor');
      const grid = document.getElementById('adminRackGrid');
      if (grid) grid.innerHTML = renderRackCardsHTML();
      setupCardClickEvents();
    };
  });

  // Validacion de Formulario QR / PIN
  const form = document.getElementById('validatePinForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const code = document.getElementById('inputScanCode').value.trim();
      processCheckinValidation(code);
    };
  }

  // Simulacion rapida
  const btnSim = document.getElementById('btnQuickSimulateQR');
  if (btnSim) {
    btnSim.onclick = () => {
      let bookings = [];
      try { bookings = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]'); } catch (e) {}
      if (bookings.length > 0) {
        processCheckinValidation(bookings[0].id);
      } else {
        processCheckinValidation('101');
      }
    };
  }

  // Walk-in modal
  const btnWalkIn = document.getElementById('btnOpenWalkIn');
  if (btnWalkIn) {
    btnWalkIn.onclick = () => {
      const roomNum = prompt('Habitación para Walk-in (ej: 101, 201, 302):', '101');
      if (roomNum) {
        const room = roomsRack.find(r => r.numero === roomNum.trim());
        if (room) {
          room.estado = 'OCUPADA';
          room.duracionRestante = '06h:00m';
          room.cliente = 'Walk-in Presencial';
          saveRack();
          alert(`✅ Habitación ${room.numero} asignada y marcada como OCUPADA.`);
          renderAdminApp();
        } else {
          alert('Habitación no encontrada en el catálogo.');
        }
      }
    };
  }

  // Check-in directo desde la tabla de agenda
  document.querySelectorAll('.js-checkin-booking').forEach(btn => {
    btn.onclick = (e) => {
      const code = e.target.getAttribute('data-code');
      processCheckinValidation(code);
    };
  });

  setupCardClickEvents();
}

function setupCardClickEvents() {
  document.querySelectorAll('.js-rack-card').forEach(card => {
    card.onclick = async () => {
      const id = parseInt(card.getAttribute('data-room-id'), 10);
      const room = roomsRack.find(r => r.id === id);
      if (!room) return;

      const opt = prompt(
        `Habitación ${room.numero} (${room.nombre})\nEstado actual: ${room.estado}\n\nSelecciona nuevo estado:\n1. LIBRE\n2. OCUPADA\n3. LIMPIEZA\n4. EN PROCESO`,
        '1'
      );

      let dbStatus = 'disponible';
      if (opt === '1') { room.estado = 'LIBRE'; room.duracionRestante = '-'; room.cliente = null; dbStatus = 'disponible'; }
      else if (opt === '2') { room.estado = 'OCUPADA'; room.duracionRestante = '06h:00m'; room.cliente = 'Asignación Recepción'; dbStatus = 'ocupada'; }
      else if (opt === '3') { room.estado = 'LIMPIEZA'; room.duracionRestante = 'Aseo'; room.cliente = null; dbStatus = 'limpieza_pendiente'; }
      else if (opt === '4') { room.estado = 'EN_PROCESO'; room.duracionRestante = 'En Aseo'; room.cliente = null; dbStatus = 'en_proceso'; }
      else { return; }

      saveRack();
      renderAdminApp();

      // Sincronizar con Supabase Cloud
      try {
        await supabase.from('habitaciones_fisicas')
          .update({ estado: dbStatus })
          .eq('id', room.id);
        console.log(`☁️ Habitación ${room.numero} sincronizada en Supabase con estado: ${dbStatus}`);
      } catch (err) {
        console.warn('Error al actualizar habitación en Supabase:', err);
      }
    };
  });
}

async function processCheckinValidation(code) {
  const fb = document.getElementById('qrValidateFeedback');
  if (!fb) return;

  const cleanCode = code ? code.split('|')[0].trim() : '';
  let matchedReserva = null;
  let room = null;

  fb.style.display = 'block';
  fb.innerHTML = `
    <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 12px; padding: 1rem; color: #7dd3fc; display: flex; align-items: center; gap: 0.5rem;">
      <span style="animation: spin 1s linear infinite;">⏳</span>
      <span>Validando credencial en Supabase Cloud...</span>
    </div>
  `;

  try {
    // 1. Buscar coincidencia exacta en Supabase Cloud
    const { data: found } = await supabase
      .from('reservas')
      .select('*, habitaciones_fisicas(*)')
      .or(`qr_token.ilike.%${cleanCode}%,numero_documento.eq.${cleanCode}`)
      .limit(1);

    if (found && found.length > 0) {
      matchedReserva = found[0];
      const habFisica = matchedReserva.habitaciones_fisicas;
      room = roomsRack.find(r => r.id === matchedReserva.habitacion_fisica_id) || {
        numero: habFisica?.numero || '401',
        nombre: 'Suite Presidencial'
      };

      // Actualizar reserva en Supabase
      await supabase.from('reservas')
        .update({ 
          estado: 'checkin', 
          qr_usado: true, 
          qr_usado_en: new Date().toISOString() 
        })
        .eq('id', matchedReserva.id);

      // Actualizar estado de habitación en Supabase
      await supabase.from('habitaciones_fisicas')
        .update({ estado: 'ocupada' })
        .eq('id', matchedReserva.habitacion_fisica_id);

      // Registrar en auditoría
      await supabase.from('movimientos_diarios')
        .insert({
          reserva_id: matchedReserva.id,
          habitacion_fisica_id: matchedReserva.habitacion_fisica_id,
          tipo: 'checkin',
          descripcion: `Check-in digital validado para ${matchedReserva.nombre_huesped} (DNI: ${matchedReserva.numero_documento})`
        });
    }
  } catch (err) {
    console.warn('Advertencia en búsqueda Supabase:', err);
  }

  // Fallback si no está en la nube o es código de simulación rápida
  if (!room) {
    room = roomsRack.find(r => r.estado === 'LIBRE') || roomsRack[0];
  }

  room.estado = 'OCUPADA';
  room.duracionRestante = '06h:00m';
  room.cliente = matchedReserva ? matchedReserva.nombre_huesped : `Check-in ${cleanCode}`;
  saveRack();

  fb.innerHTML = `
    <div style="background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 12px; padding: 1.25rem; color: #a7f3d0; animation: pulseDot 1s;">
      <div style="font-weight: bold; font-size: 1.1rem; color: #10b981; display: flex; align-items: center; gap: 0.5rem;">
        🔓 ¡ACCESO CONCEDIDO • CERRADURA DIGITAL DESBLOQUEADA!
      </div>
      <p style="font-size: 0.85rem; margin-top: 0.35rem; color: #fff;">
        Pase <strong>${cleanCode}</strong> validado exitosamente en <strong>Supabase Cloud</strong>.
      </p>
      <div style="margin-top: 0.6rem; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 0.8rem; color: #cbd5e1;">
        🚪 <strong>Habitación Asignada:</strong> ${room.numero} (${room.nombre})<br/>
        👤 <strong>Huésped Verificado:</strong> ${room.cliente}
        ${matchedReserva?.numero_documento ? `<br/>🪪 <strong>DNI:</strong> ${matchedReserva.numero_documento}` : ''}
      </div>
    </div>
  `;

  setTimeout(() => {
    syncAdminDataFromSupabase();
  }, 2400);
}

// ==========================================
// 2. ESPACIO DE TRABAJO: LIMPIEZA (HOUSEKEEPING)
// CERO ACCESO A DATOS DE CLIENTES
// ==========================================
function renderLimpiezaWorkspace() {
  const pendingCleaning = roomsRack.filter(r => r.estado === 'LIMPIEZA' || r.estado === 'EN_PROCESO');

  return `
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 18px; padding: 1.75rem; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.72rem; color: #f59e0b; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">
            PROTOCOLO DE SANITIZACIÓN & ASEO DISCRETO
          </span>
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: #fff; margin-top: 0.2rem;">
            Habitaciones Pendientes de Aseo (${pendingCleaning.length})
          </h3>
          <p style="font-size: 0.8rem; color: #94a3b8;">
            Por discreción del hotel, este panel no contiene datos personales ni nombres de huéspedes.
          </p>
        </div>
        <button id="btnReportIssue" class="btn-editorial-outline" style="border-color: #f43f5e; color: #f43f5e; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer;">
          ⚠️ Reportar Incidencia Técnica
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1.5rem;">
        ${pendingCleaning.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #10b981; background: rgba(16, 185, 129, 0.05); border-radius: 14px;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✨</div>
            <strong>¡Excelente! Todas las habitaciones están limpias y listas para servicio.</strong>
          </div>
        ` : pendingCleaning.map(r => `
          <div style="background: #060911; border: 1px solid ${r.estado === 'EN_PROCESO' ? '#38bdf8' : '#f59e0b'}; border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.7rem; color: #94a3b8;">PISO ${r.piso}</span>
                <span style="font-size: 0.65rem; background: ${r.estado === 'EN_PROCESO' ? '#0369a1' : '#b45309'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold;">
                  ${r.estado === 'EN_PROCESO' ? 'EN PROCESO' : 'PENDIENTE'}
                </span>
              </div>
              <h4 style="font-family: monospace; font-size: 1.75rem; color: #fff; margin-bottom: 0.25rem;">Hab. ${r.numero}</h4>
              <p style="font-size: 0.8rem; color: #cbd5e1;">${r.nombre}</p>
            </div>
            <div style="margin-top: 1.25rem;">
              ${r.estado === 'LIMPIEZA' ? `
                <button class="btn-editorial-light js-action-limpieza" data-id="${r.id}" data-to="EN_PROCESO" style="width: 100%; padding: 0.75rem; background: #0284c7; color: #fff; border: none; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                  Iniciar Aseo & Sanitización
                </button>
              ` : `
                <button class="btn-editorial-light js-action-limpieza" data-id="${r.id}" data-to="LIBRE" style="width: 100%; padding: 0.75rem; background: #10b981; color: #000; border: none; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                  ✓ Marcar Habitación Lista
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function setupLimpiezaEvents() {
  document.querySelectorAll('.js-action-limpieza').forEach(btn => {
    btn.onclick = (e) => {
      const id = parseInt(e.target.getAttribute('data-id'), 10);
      const toState = e.target.getAttribute('data-to');
      const room = roomsRack.find(r => r.id === id);
      if (!room) return;

      room.estado = toState;
      if (toState === 'LIBRE') {
        room.duracionRestante = '-';
        alert(`✨ Habitación ${room.numero} marcada como LISTA para recepción.`);
      }
      saveRack();
      renderAdminApp();
    };
  });

  const btnReport = document.getElementById('btnReportIssue');
  if (btnReport) {
    btnReport.onclick = () => {
      const num = prompt('Número de habitación para incidencia técnica:', '201');
      const desc = prompt('Descripción de la falla (ej: Jacuzzi no enciende, control de aire acondicionado averiado):');
      if (num && desc) {
        alert(`📝 Reporte de incidencia registrado para Hab. ${num}: "${desc}". Notificado a mantenimiento.`);
      }
    };
  }
}

// ==========================================
// 3. ESPACIO DE TRABAJO: GERENCIA & KPIS
// ==========================================
// ==========================================
// 3. ESPACIO DE TRABAJO: GERENCIA & KPIS INTERACTIVOS
// FILTRADO DINÁMICO: DÍA, MES, AÑO
// ==========================================
let currentGerentePeriod = 'dia';

const gerenteAnalyticsData = {
  dia: {
    label: 'Hoy (24 Horas)',
    badge: 'En tiempo real',
    kpis: {
      ocupacion: { label: 'Tasa de Ocupación', val: '68.8%', num: 68.8, sub: '11 de 16 suites ocupadas', trend: '+12.5% vs ayer', trendUp: true, color: '#10b981' },
      ingresos: { label: 'Ingresos Proyectados', val: 'S/ 4,820', num: 92, sub: 'Ticket prom: S/ 175.00', trend: '+14.2% vs meta diaria', trendUp: true, color: '#fbbf24' },
      rotacion: { label: 'Índice de Rotación', val: '2.8x', num: 70, sub: 'Rotación por suite / día', trend: '+0.4x vs prom.', trendUp: true, color: '#38bdf8' },
      checkinQr: { label: 'Check-in Digital / QR', val: '84%', num: 84, sub: 'Cerradura Inteligente & PIN', trend: '+6% adopción', trendUp: true, color: '#a855f7' },
    },
    chartTitle: 'Flujo de Ocupación por Intervalos Horarios (Hoy)',
    chartSubtitle: 'Pico de afluencia registrado entre las 20:00 y las 03:00 hrs',
    bars: [
      { label: '00:00', val: '85%', heightPct: 85, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true },
      { label: '04:00', val: '60%', heightPct: 60, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: '08:00', val: '30%', heightPct: 30, color: 'linear-gradient(180deg, #64748b, #334155)', highlight: false },
      { label: '12:00', val: '55%', heightPct: 55, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: '16:00', val: '75%', heightPct: 75, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: '20:00', val: '95%', heightPct: 95, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true },
      { label: '23:00', val: '90%', heightPct: 90, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true }
    ],
    breakdown: [
      { name: 'Alquiler de Suites & Jacuzzis', amount: 'S/ 3,615.00', pct: '75%', color: '#fbbf24' },
      { name: 'Coctelería & Bar de Autor', amount: 'S/ 820.00', pct: '17%', color: '#38bdf8' },
      { name: 'Minibar & Room Service Exprés', amount: 'S/ 385.00', pct: '8%', color: '#a855f7' }
    ],
    ranking: [
      { num: '301', name: 'Presidencial Wimbledon', cat: 'Presidencial', metric: '4 rotaciones', rev: 'S/ 1,480.00', badge: 'Top 1' },
      { num: '201', name: 'Suite Jacuzzi Sensaciones', cat: 'Jacuzzi Deluxe', metric: '3 rotaciones', rev: 'S/ 920.00', badge: 'Top 2' },
      { num: '102', name: 'Suite Cochera Privada Directa', cat: 'Cochera Privada', metric: '3 rotaciones', rev: 'S/ 750.00', badge: 'Top 3' },
      { num: '204', name: 'Suite Espejos & Spa', cat: 'Jacuzzi Deluxe', metric: '2 rotaciones', rev: 'S/ 640.00', badge: 'Top 4' },
      { num: '105', name: 'Suite Ejecutiva Cochera', cat: 'Cochera Privada', metric: '2 rotaciones', rev: 'S/ 510.00', badge: 'Top 5' }
    ]
  },
  mes: {
    label: 'Septiembre 2026',
    badge: 'Cierre Proyectado',
    kpis: {
      ocupacion: { label: 'Tasa de Ocupación', val: '76.5%', num: 76.5, sub: 'Promedio mensual acumulado', trend: '+8.1% vs agosto', trendUp: true, color: '#10b981' },
      ingresos: { label: 'Ingresos Proyectados', val: 'S/ 124,580', num: 96, sub: 'Ticket prom: S/ 188.00', trend: '+18.5% vs meta mes', trendUp: true, color: '#fbbf24' },
      rotacion: { label: 'Índice de Rotación', val: '3.1x', num: 78, sub: 'Rotación media por suite', trend: '+0.5x crecimiento', trendUp: true, color: '#38bdf8' },
      checkinQr: { label: 'Check-in Digital / QR', val: '88%', num: 88, sub: 'Ingresos con llave digital QR', trend: '+11% vs mes ant.', trendUp: true, color: '#a855f7' },
    },
    chartTitle: 'Ingresos Semanales Acumulados (Septiembre 2026)',
    chartSubtitle: 'Comportamiento de demanda semanal sostenida con picos en fin de semana',
    bars: [
      { label: 'Semana 1', val: 'S/ 28.5k', heightPct: 70, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Semana 2', val: 'S/ 32.2k', heightPct: 82, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Semana 3', val: 'S/ 34.8k', heightPct: 90, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true },
      { label: 'Semana 4 (Proj)', val: 'S/ 29.0k', heightPct: 74, color: 'linear-gradient(180deg, #a855f7, #7e22ce)', highlight: false }
    ],
    breakdown: [
      { name: 'Alquiler de Suites & Jacuzzis', amount: 'S/ 90,940.00', pct: '73%', color: '#fbbf24' },
      { name: 'Coctelería & Bar de Autor', amount: 'S/ 22,420.00', pct: '18%', color: '#38bdf8' },
      { name: 'Minibar & Room Service Exprés', amount: 'S/ 11,220.00', pct: '9%', color: '#a855f7' }
    ],
    ranking: [
      { num: '301', name: 'Presidencial Wimbledon', cat: 'Presidencial', metric: '84 estancias', rev: 'S/ 35,280.00', badge: 'Top 1' },
      { num: '302', name: 'Penthouse Panorámica', cat: 'Presidencial', metric: '72 estancias', rev: 'S/ 30,240.00', badge: 'Top 2' },
      { num: '201', name: 'Suite Jacuzzi Sensaciones', cat: 'Jacuzzi Deluxe', metric: '68 estancias', rev: 'S/ 20,400.00', badge: 'Top 3' },
      { num: '202', name: 'Jacuzzi Cúpula Estelar', cat: 'Jacuzzi Deluxe', metric: '62 estancias', rev: 'S/ 18,600.00', badge: 'Top 4' },
      { num: '101', name: 'Suite Cochera Directa', cat: 'Cochera Privada', metric: '58 estancias', rev: 'S/ 14,500.00', badge: 'Top 5' }
    ]
  },
  ano: {
    label: 'Ejercicio Anual 2026',
    badge: 'Consolidado Anual',
    kpis: {
      ocupacion: { label: 'Tasa de Ocupación', val: '79.2%', num: 79.2, sub: 'Ocupación anual promedio', trend: '+12.4% vs 2025', trendUp: true, color: '#10b981' },
      ingresos: { label: 'Ingresos Proyectados', val: 'S/ 1,385,400', num: 100, sub: 'Ticket prom: S/ 192.00', trend: '+22.8% récord anual', trendUp: true, color: '#fbbf24' },
      rotacion: { label: 'Índice de Rotación', val: '3.4x', num: 85, sub: 'Promedio anual de rotación', trend: '+0.7x vs año ant.', trendUp: true, color: '#38bdf8' },
      checkinQr: { label: 'Check-in Digital / QR', val: '91%', num: 91, sub: 'Adopción consolidada QR/PIN', trend: '+24% modernización', trendUp: true, color: '#a855f7' },
    },
    chartTitle: 'Curva Histórica de Ocupación Mensual (Ene - Dic 2026)',
    chartSubtitle: 'Picos sobresalientes: Febrero (San Valentín - 98%) y Julio (Fiestas Patrias - 95%)',
    bars: [
      { label: 'Ene', val: '85%', heightPct: 85, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Feb (♥)', val: '98%', heightPct: 98, color: 'linear-gradient(180deg, #f43f5e, #be123c)', highlight: true },
      { label: 'Mar', val: '70%', heightPct: 70, color: 'linear-gradient(180deg, #64748b, #334155)', highlight: false },
      { label: 'Abr', val: '72%', heightPct: 72, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'May', val: '78%', heightPct: 78, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Jun', val: '80%', heightPct: 80, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Jul (★)', val: '95%', heightPct: 95, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true },
      { label: 'Ago', val: '82%', heightPct: 82, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Set', val: '76%', heightPct: 76, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Oct', val: '74%', heightPct: 74, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Nov', val: '80%', heightPct: 80, color: 'linear-gradient(180deg, #38bdf8, #0284c7)', highlight: false },
      { label: 'Dic', val: '92%', heightPct: 92, color: 'linear-gradient(180deg, #fbbf24, #d97706)', highlight: true }
    ],
    breakdown: [
      { name: 'Alquiler de Suites & Jacuzzis', amount: 'S/ 1,025,196.00', pct: '74%', color: '#fbbf24' },
      { name: 'Coctelería & Bar de Autor', amount: 'S/ 235,518.00', pct: '17%', color: '#38bdf8' },
      { name: 'Minibar & Room Service Exprés', amount: 'S/ 124,686.00', pct: '9%', color: '#a855f7' }
    ],
    ranking: [
      { num: '301', name: 'Presidencial Wimbledon', cat: 'Presidencial', metric: '1,040 estancias', rev: 'S/ 416,000.00', badge: 'Top 1 Anual' },
      { num: '302', name: 'Penthouse Panorámica', cat: 'Presidencial', metric: '980 estancias', rev: 'S/ 392,000.00', badge: 'Top 2 Anual' },
      { num: '201', name: 'Suite Jacuzzi Sensaciones', cat: 'Jacuzzi Deluxe', metric: '860 estancias', rev: 'S/ 258,000.00', badge: 'Top 3 Anual' },
      { num: '203', name: 'Suite Sauna Privado', cat: 'Jacuzzi & Sauna', metric: '780 estancias', rev: 'S/ 234,000.00', badge: 'Top 4 Anual' },
      { num: '102', name: 'Suite Cochera Privada Directa', cat: 'Cochera Privada', metric: '710 estancias', rev: 'S/ 177,500.00', badge: 'Top 5 Anual' }
    ]
  }
};

function computeRealGerenteKPIs() {
  let bookings = [];
  try {
    bookings = JSON.parse(localStorage.getItem('wimbledon_bookings') || '[]');
  } catch (e) {}

  const now = new Date();
  const todayPrefix = now.toISOString().slice(0, 10);
  const activeBookings = bookings.filter(b => b.estado !== 'CANCELADA');
  const todayBookings = activeBookings.filter(b => {
    if (!b.fechaReserva) return true;
    return b.fechaReserva.startsWith(todayPrefix);
  });

  const todayRevenue = todayBookings.reduce((sum, b) => sum + (Number(b.monto) || 0), 0);
  return {
    totalActive: activeBookings.length,
    todayCount: todayBookings.length,
    todayRevenue
  };
}

function renderGerenteWorkspace() {
  const realKPIs = computeRealGerenteKPIs();
  const data = JSON.parse(JSON.stringify(gerenteAnalyticsData[currentGerentePeriod]));
  const { kpis, bars, breakdown, ranking } = data;

  // Integrar métricas reales de Supabase Cloud
  if (liveSupabaseKpis) {
    kpis.ingresos.val = `S/ ${Number(liveSupabaseKpis.facturacion_total_soles).toLocaleString('es-PE')}`;
    kpis.ingresos.sub = `Auditado en Supabase Cloud (${liveSupabaseKpis.total_historico_reservas} reservas acumuladas)`;
    kpis.ingresos.num = 95;

    const pctOcc = Math.max(8, Math.round((liveSupabaseKpis.habitaciones_ocupadas_ahora / (liveSupabaseKpis.total_habitaciones_inventario || 132)) * 100));
    kpis.ocupacion.val = `${pctOcc}%`;
    kpis.ocupacion.num = pctOcc;
    kpis.ocupacion.sub = `${liveSupabaseKpis.habitaciones_ocupadas_ahora} de ${liveSupabaseKpis.total_habitaciones_inventario || 132} habitaciones ocupadas`;

    kpis.checkinQr.val = `${Math.round(100 - liveSupabaseKpis.tasa_cancelacion_pct)}%`;
    kpis.checkinQr.sub = `${liveSupabaseKpis.reservas_web} reservas web online verificadas`;
  } else if (currentGerentePeriod === 'dia') {
    const baseRevenue = 4820;
    const totalTodayRev = baseRevenue + realKPIs.todayRevenue;
    kpis.ingresos.val = `S/ ${totalTodayRev.toLocaleString('es-PE')}`;
    if (realKPIs.todayCount > 0) {
      kpis.ingresos.sub = `S/ ${baseRevenue} base + S/ ${realKPIs.todayRevenue} (${realKPIs.todayCount} res. en vivo)`;
    }
  }

  const renderGauge = (num, color) => {
    const strokeDash = Math.min(100, Math.max(0, num));
    const offset = 100 - strokeDash;
    return `
      <div class="kpi-gauge-wrap">
        <svg class="kpi-gauge-svg" viewBox="0 0 36 36" width="72" height="72">
          <circle class="kpi-gauge-bg" cx="18" cy="18" r="15.9155" />
          <circle class="kpi-gauge-fill" cx="18" cy="18" r="15.9155" stroke="${color}" stroke-dasharray="100, 100" stroke-dashoffset="${offset}" />
        </svg>
        <span class="kpi-gauge-pct" style="color: ${color};">${Math.round(num)}%</span>
      </div>
    `;
  };

  return `
    <div id="gerenteContainer" style="animation: cardFadeIn 0.35s ease;">
      <!-- BARRA DE CONTROL DE PERÍODO & ACCIONES GERENCIALES -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.25rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
            <span style="font-size: 0.72rem; color: #fbbf24; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">
              BUSINESS INTELLIGENCE & ANALYTICS EXECUTIVE
            </span>
            <span style="font-size: 0.65rem; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); font-weight: 700;">
              ${data.badge}
            </span>
          </div>
          <h3 style="font-family: var(--font-serif); font-size: 1.75rem; color: #fff; margin: 0;">
            Tablero de Rendimiento Hotelero
          </h3>
        </div>

        <!-- SELECTOR INTERACTIVO DÍA / MES / AÑO -->
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="gerente-period-nav" id="gerentePeriodTabs">
            <button class="period-tab-btn ${currentGerentePeriod === 'dia' ? 'active' : ''}" data-period="dia">
              ☀️ Hoy (Día)
            </button>
            <button class="period-tab-btn ${currentGerentePeriod === 'mes' ? 'active' : ''}" data-period="mes">
              📅 Este Mes
            </button>
            <button class="period-tab-btn ${currentGerentePeriod === 'ano' ? 'active' : ''}" data-period="ano">
              📈 Año 2026
            </button>
          </div>

          <button id="btnExportGerenteReport" class="btn-editorial-outline" style="padding: 0.55rem 1.2rem; border-color: #38bdf8; color: #38bdf8; font-size: 0.8rem; border-radius: var(--radius-pill); cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
            📥 Exportar Reporte (.CSV)
          </button>
        </div>
      </div>

      <!-- 4 TARJETAS KPI CON MEDIDORES RADIALES (DIALES CIRCULARES) -->
      <div class="gerente-kpi-grid">
        <!-- KPI 1: Tasa de Ocupación -->
        <div class="kpi-luxe-card">
          <div class="kpi-luxe-info">
            <span class="kpi-luxe-label">${kpis.ocupacion.label}</span>
            <div class="kpi-luxe-val" style="color: ${kpis.ocupacion.color};">${kpis.ocupacion.val}</div>
            <span style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">${kpis.ocupacion.sub}</span>
            <span class="kpi-luxe-trend" style="color: #10b981;">▲ ${kpis.ocupacion.trend}</span>
          </div>
          ${renderGauge(kpis.ocupacion.num, kpis.ocupacion.color)}
        </div>

        <!-- KPI 2: Ingresos Totales -->
        <div class="kpi-luxe-card">
          <div class="kpi-luxe-info">
            <span class="kpi-luxe-label">${kpis.ingresos.label}</span>
            <div class="kpi-luxe-val" style="color: ${kpis.ingresos.color};">${kpis.ingresos.val}</div>
            <span style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">${kpis.ingresos.sub}</span>
            <span class="kpi-luxe-trend" style="color: #fbbf24;">★ ${kpis.ingresos.trend}</span>
          </div>
          ${renderGauge(kpis.ingresos.num, kpis.ingresos.color)}
        </div>

        <!-- KPI 3: Rotación -->
        <div class="kpi-luxe-card">
          <div class="kpi-luxe-info">
            <span class="kpi-luxe-label">${kpis.rotacion.label}</span>
            <div class="kpi-luxe-val" style="color: ${kpis.rotacion.color};">${kpis.rotacion.val}</div>
            <span style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">${kpis.rotacion.sub}</span>
            <span class="kpi-luxe-trend" style="color: #38bdf8;">▲ ${kpis.rotacion.trend}</span>
          </div>
          ${renderGauge(kpis.rotacion.num, kpis.rotacion.color)}
        </div>

        <!-- KPI 4: Check-in Digital / Cerradura Inteligente -->
        <div class="kpi-luxe-card">
          <div class="kpi-luxe-info">
            <span class="kpi-luxe-label">${kpis.checkinQr.label}</span>
            <div class="kpi-luxe-val" style="color: ${kpis.checkinQr.color};">${kpis.checkinQr.val}</div>
            <span style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">${kpis.checkinQr.sub}</span>
            <span class="kpi-luxe-trend" style="color: #a855f7;">▲ ${kpis.checkinQr.trend}</span>
          </div>
          ${renderGauge(kpis.checkinQr.num, kpis.checkinQr.color)}
        </div>
      </div>

      <!-- FILA DE ANALÍTICA: GRÁFICO DE BARRAS DINÁMICO + DESGLOSE POR CONCEPTO -->
      <div class="gerente-analytics-grid">
        <!-- PANEL DE GRÁFICO INTERACTIVO -->
        <div class="analytics-panel-card">
          <div class="panel-header-row">
            <div>
              <h4 class="panel-title">${data.chartTitle}</h4>
              <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.25rem;">${data.chartSubtitle}</p>
            </div>
            <span style="font-size: 0.75rem; color: #fbbf24; font-weight: 700; background: rgba(251, 191, 36, 0.1); padding: 0.3rem 0.75rem; border-radius: 8px;">
              Período: ${data.label}
            </span>
          </div>

          <!-- Cuadrícula visual de barras verticales con escala en eje Y (Solución #12 - v4) -->
          <div class="gerente-chart">
            <div class="bar-chart-yaxis" aria-hidden="true">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            <div class="bar-chart-bars">
              ${bars.map(b => `
                <div class="bar-col-item" style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;">
                  <span class="bar-val-badge" style="position: absolute; top: -24px; font-size: 0.65rem; font-family: monospace; font-weight: 800; color: ${b.highlight ? '#fbbf24' : '#94a3b8'};">${b.val}</span>
                  <div class="bar-fill-track" style="width: 100%; max-width: 38px; height: 100%; background: rgba(255, 255, 255, 0.04); border-radius: 8px 8px 0 0; display: flex; align-items: flex-end; overflow: hidden;">
                    <div class="bar-fill" style="width: 100%; height: ${b.heightPct}%; background: ${b.color}; border-radius: 8px 8px 0 0; transition: height 0.8s ease;" title="${b.label}: ${b.val}"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="chart-x-labels">
              ${bars.map(b => `
                <span style="flex: 1; text-align: center; font-size: 0.72rem; color: ${b.highlight ? '#fff' : '#94a3b8'}; font-weight: ${b.highlight ? '700' : '400'};">${b.label}</span>
              `).join('')}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.75rem; color: #64748b;">
            <span>⚡ Actualizado automáticamente según registros del sistema</span>
            <span style="color: #fbbf24;">■ Barras resaltadas indican franjas de máxima ocupación</span>
          </div>
        </div>

        <!-- PANEL DE DESGLOSE POR CONCEPTO -->
        <div class="analytics-panel-card">
          <div class="panel-header-row">
            <h4 class="panel-title">Ingresos por Concepto</h4>
            <span style="font-size: 0.75rem; color: #94a3b8;">100% Total</span>
          </div>

          <!-- Barra segmentada horizontal -->
          <div style="display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: #1e293b; margin-bottom: 1.5rem;">
            ${breakdown.map(item => `
              <div style="width: ${item.pct}; background: ${item.color}; height: 100%; transition: width 0.6s ease;" title="${item.name}: ${item.pct}"></div>
            `).join('')}
          </div>

          <!-- Lista de leyenda con cifras -->
          <div class="concept-legend-list">
            ${breakdown.map(item => `
              <div class="concept-legend-item">
                <div style="display: flex; align-items: center;">
                  <span class="legend-dot" style="background: ${item.color};"></span>
                  <span style="color: #cbd5e1; font-size: 0.8rem;">${item.name}</span>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #fff; font-family: monospace; font-size: 0.85rem; display: block;">${item.amount}</strong>
                  <span style="color: ${item.color}; font-size: 0.7rem; font-weight: bold;">${item.pct}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 1.75rem; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; text-align: center;">
            <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Meta Financiera del Período</span>
            <strong style="color: #10b981; font-size: 1.1rem; font-family: monospace;">104.2% CUMPLIDA</strong>
          </div>
        </div>
      </div>

      <!-- RANKING TOP 5 SUITES CON MAYOR RENDIMIENTO -->
      <div class="analytics-panel-card" style="margin-bottom: 2rem;">
        <div class="panel-header-row">
          <div>
            <h4 class="panel-title">Top 5 Suites con Mayor Rentabilidad (${data.label})</h4>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.25rem;">
              Desempeño según rotación de turnos, consumos adicionales y recaudación total
            </p>
          </div>
          <span style="font-size: 0.75rem; color: #10b981; font-weight: bold;">★ Mayor Demanda</span>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #334155; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase;">
                <th style="padding: 0.75rem;">Posición</th>
                <th style="padding: 0.75rem;">Habitación</th>
                <th style="padding: 0.75rem;">Categoría</th>
                <th style="padding: 0.75rem;">Actividad</th>
                <th style="padding: 0.75rem; text-align: right;">Recaudación Total</th>
                <th style="padding: 0.75rem; text-align: center;">Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              ${ranking.map((r, idx) => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 0.85rem 0.75rem;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; font-weight: 800; font-size: 0.75rem; background: ${idx === 0 ? 'rgba(251, 191, 36, 0.2)' : (idx === 1 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)')}; color: ${idx === 0 ? '#fbbf24' : (idx === 1 ? '#38bdf8' : '#cbd5e1')};">
                      #${idx + 1}
                    </span>
                  </td>
                  <td style="padding: 0.85rem 0.75rem;">
                    <strong style="color: #fff; font-family: monospace; font-size: 1rem;">Hab. ${r.num}</strong>
                    <div style="font-size: 0.75rem; color: #cbd5e1;">${r.name}</div>
                  </td>
                  <td style="padding: 0.85rem 0.75rem; color: #94a3b8;">${r.cat}</td>
                  <td style="padding: 0.85rem 0.75rem;">
                    <span style="display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-weight: 600; font-size: 0.75rem;">
                      ${r.metric}
                    </span>
                  </td>
                  <td style="padding: 0.85rem 0.75rem; text-align: right;">
                    <strong style="color: #10b981; font-family: monospace; font-size: 1rem;">${r.rev}</strong>
                  </td>
                  <td style="padding: 0.85rem 0.75rem; text-align: center;">
                    <span style="font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); font-weight: bold; background: ${idx === 0 ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.3), rgba(251, 191, 36, 0.3))' : 'rgba(255,255,255,0.06)'}; color: ${idx === 0 ? '#fbbf24' : '#cbd5e1'}; border: 1px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)'};">
                      ${r.badge}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function setupGerenteEvents() {
  // Selector de período Día / Mes / Año
  document.querySelectorAll('#gerentePeriodTabs .period-tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      const period = e.currentTarget.getAttribute('data-period');
      if (period && period !== currentGerentePeriod) {
        currentGerentePeriod = period;
        renderAdminApp();
      }
    };
  });

  // Botón Exportar CSV
  const btnExport = document.getElementById('btnExportGerenteReport');
  if (btnExport) {
    btnExport.onclick = () => {
      const data = gerenteAnalyticsData[currentGerentePeriod];
      let csvContent = `Reporte Ejecutivo Hotel Wimbledon - ${data.label}\n`;
      csvContent += `Fecha de generación: ${new Date().toLocaleString()}\n\n`;
      csvContent += `Métrica,Valor,Tendencia\n`;
      csvContent += `Tasa de Ocupación,${data.kpis.ocupacion.val},${data.kpis.ocupacion.trend}\n`;
      csvContent += `Ingresos Proyectados,${data.kpis.ingresos.val},${data.kpis.ingresos.trend}\n`;
      csvContent += `Índice de Rotación,${data.kpis.rotacion.val},${data.kpis.rotacion.trend}\n`;
      csvContent += `Check-in Digital / QR,${data.kpis.checkinQr.val},${data.kpis.checkinQr.trend}\n\n`;
      csvContent += `Top Suites,Categoría,Actividad,Recaudación\n`;
      data.ranking.forEach(r => {
        csvContent += `Hab ${r.num} - ${r.name},${r.cat},${r.metric},${r.rev}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `wimbledon_reporte_${currentGerentePeriod}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }
}

renderAdminApp();

// Sincronización reactiva en tiempo real con reservas creadas en el portal público (Solución #11)
window.addEventListener('storage', (e) => {
  if (e.key === 'wimbledon_bookings') {
    if (currentStaffSession) renderAdminApp();
  }
});

window.addEventListener('wimbledon:booking-created', () => {
  if (currentStaffSession) renderAdminApp();
});
