// Standalone Administrative Portal Logic
let currentStaffSession = null;

function renderAdminApp() {
  const container = document.getElementById('adminApp');
  if (!container) return;

  if (!currentStaffSession) {
    // LOGIN FORM PAGE
    container.innerHTML = `
      <div style="max-width: 520px; margin: 2rem auto; background: #0b0f19; border: 2px solid rgba(217, 119, 6, 0.4); border-radius: 24px; padding: 2.5rem; color: #fff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <span style="color: #fbbf24; font-size: 0.75rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">SISTEMA INTERNO</span>
          <h1 style="font-family: var(--font-serif); font-size: 2.25rem; margin-top: 0.5rem; color: #fff;">Acceso Administrativo</h1>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.35rem;">Selecciona tu rol e ingresa tu contraseña de personal.</p>
        </div>

        <form id="standaloneLoginForm" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: 600; margin-bottom: 0.5rem;">ROL EN EL SISTEMA (COMBO BOX)</label>
            <select id="roleSelect" style="width: 100%; padding: 0.9rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: #fbbf24; font-weight: bold; font-size: 0.95rem; outline: none; cursor: pointer;">
              <option value="gerente">Gerente (Administración, KPIs & Ingresos)</option>
              <option value="recepcion">Recepción (Rack en Vivo, Walk-in & Caja)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8rem; color: #cbd5e1; font-weight: 600; margin-bottom: 0.5rem;">CONTRASEÑA DE ACCESO</label>
            <input type="password" id="passInput" value="1234" placeholder="Ingresa contraseña (1234)" style="width: 100%; padding: 0.9rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: #fff; font-size: 0.95rem; outline: none;" required />
          </div>

          <div style="background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.25); border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.8rem; color: #fef08a;">
            💡 <strong>Acceso de Demostración:</strong> Usar la contraseña <code>1234</code> para ambos roles.
          </div>

          <div id="loginErrorMsg" style="display: none; color: #f43f5e; font-size: 0.85rem; text-align: center; font-weight: bold;"></div>

          <button type="submit" class="btn-editorial-light" style="width: 100%; text-align: center; justify-content: center; padding: 1rem; font-weight: bold; margin-top: 0.5rem; cursor: pointer; background: #fff; color: #000;">
            INGRESAR AL PANEL
          </button>
        </form>
      </div>
    `;

    const form = document.getElementById('standaloneLoginForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      const role = document.getElementById('roleSelect').value;
      const pass = document.getElementById('passInput').value;
      const errEl = document.getElementById('loginErrorMsg');

      if (pass === '1234') {
        currentStaffSession = {
          role: role,
          name: role === 'gerente' ? 'Gerente General (Administración)' : 'Carlos Mendoza (Recepcionista)'
        };
        renderAdminApp();
      } else {
        errEl.style.display = 'block';
        errEl.innerText = '❌ Contraseña incorrecta. Usa "1234"';
      }
    };
  } else {
    // DASHBOARD VIEW
    const isGerente = currentStaffSession.role === 'gerente';

    container.innerHTML = `
      <div style="background: #0b0f19; border: 2px solid rgba(217, 119, 6, 0.4); border-radius: 24px; padding: 2.5rem; color: #fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
        
        <!-- Header del Dashboard -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; margin-bottom: 2rem;">
          <div>
            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">SISTEMA ADMINISTRATIVO EN VIVO</span>
            <h2 style="font-family: var(--font-serif); font-size: 2rem; color: #fff; margin-top: 0.2rem;">
              ${isGerente ? '📊 Panel Gerencial & KPIs' : '🛎️ Panel Operativo de Recepción'}
            </h2>
            <span style="font-size: 0.85rem; color: #fbbf24; font-weight: 600;">
              🟢 ROL ACTIVO: ${isGerente ? 'GERENTE' : 'RECEPCIONISTA'} (${currentStaffSession.name})
            </span>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="btnSwitchRole" class="btn-editorial-outline" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; border-color: #fbbf24; color: #fbbf24; cursor: pointer;">Cambiar de Rol</button>
            <button id="btnLogout" class="btn-editorial-light" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; background: #be123c; border-color: #f43f5e; color: #fff; cursor: pointer;">Cerrar Sesión</button>
          </div>
        </div>

        ${isGerente ? `
          <!-- GERENTE WORKSPACE -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
            <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Tasa de Ocupación</span>
              <div style="font-size: 2.5rem; font-weight: 800; color: #10b981; font-family: monospace;">78.5%</div>
              <span style="font-size: 0.75rem; color: #64748b;">102 de 130 habitaciones activas</span>
            </div>

            <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Ingresos Totales Hoy</span>
              <div style="font-size: 2.5rem; font-weight: 800; color: #fbbf24; font-family: monospace;">S/ 14,850.00</div>
              <span style="font-size: 0.75rem; color: #64748b;">Habitaciones: S/ 11,200 | Minibar: S/ 3,650</span>
            </div>

            <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Duración Promedio</span>
              <div style="font-size: 2.5rem; font-weight: 800; color: #38bdf8; font-family: monospace;">6.2 hrs</div>
              <span style="font-size: 0.75rem; color: #64748b;">Hora pico: 19:00 - 02:00</span>
            </div>

            <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: bold; text-transform: uppercase;">RevPAR Promedio</span>
              <div style="font-size: 2.5rem; font-weight: 800; color: #a855f7; font-family: monospace;">S/ 114.20</div>
              <span style="font-size: 0.75rem; color: #64748b;">+12.4% vs semana anterior</span>
            </div>
          </div>

          <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
            <h4 style="font-family: var(--font-serif); font-size: 1.25rem; color: #fbbf24; margin-bottom: 1.25rem;">Ocupación por Niveles / Pisos</h4>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
                  <span>Piso 1 - Estacionamiento Directo (40 habs)</span>
                  <span style="font-weight: bold; color: #10b981;">85% (34 Ocupadas)</span>
                </div>
                <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden;">
                  <div style="width: 85%; height: 100%; background: #10b981;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
                  <span>Piso 2 - Jacuzzi Deluxe (50 habs)</span>
                  <span style="font-weight: bold; color: #fbbf24;">72% (36 Ocupadas)</span>
                </div>
                <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden;">
                  <div style="width: 72%; height: 100%; background: #fbbf24;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
                  <span>Piso 3 - Suites Presidenciales & Saunas (40 habs)</span>
                  <span style="font-weight: bold; color: #38bdf8;">80% (32 Ocupadas)</span>
                </div>
                <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden;">
                  <div style="width: 80%; height: 100%; background: #38bdf8;"></div>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- RECEPCION WORKSPACE -->
          <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
            <button onclick="alert('Módulo Walk-in activado')" class="btn-editorial-light" style="padding: 0.6rem 1.25rem; font-size: 0.85rem; cursor: pointer;">+ Registrar Walk-in</button>
            <button onclick="alert('Módulo de PIN Check-in activado')" class="btn-editorial-outline" style="padding: 0.6rem 1.25rem; font-size: 0.85rem; cursor: pointer;">Validar PIN Check-in Digital</button>
            <button onclick="alert('Módulo Room Service activado')" class="btn-editorial-outline" style="padding: 0.6rem 1.25rem; font-size: 0.85rem; cursor: pointer;">Room Service / Carta</button>
            <button onclick="alert('Cierre de Caja Turno activado')" class="btn-editorial-outline" style="padding: 0.6rem 1.25rem; font-size: 0.85rem; cursor: pointer;">Cierre de Caja</button>
          </div>

          <div style="background: #1e293b; border-radius: 16px; padding: 1.5rem; border: 1px solid #334155;">
            <h4 style="font-family: var(--font-serif); font-size: 1.25rem; color: #fbbf24; margin-bottom: 1.25rem;">
              Rack Operativo de Habitaciones por Pisos
            </h4>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
              <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 101</span>
                <strong style="font-size: 1.25rem; display: block;">101</strong>
                <span style="font-size: 0.65rem; background: #047857; padding: 0.2rem 0.5rem; border-radius: 4px;">LIBRE</span>
              </div>

              <div style="background: #881337; border: 1px solid #f43f5e; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 102</span>
                <strong style="font-size: 1.25rem; display: block;">102</strong>
                <span style="font-size: 0.65rem; background: #be123c; padding: 0.2rem 0.5rem; border-radius: 4px;">OCUPADA (01h:45m)</span>
              </div>

              <div style="background: #78350f; border: 1px solid #f59e0b; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 103</span>
                <strong style="font-size: 1.25rem; display: block;">103</strong>
                <span style="font-size: 0.65rem; background: #b45309; padding: 0.2rem 0.5rem; border-radius: 4px;">LIMPIEZA</span>
              </div>

              <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 201</span>
                <strong style="font-size: 1.25rem; display: block;">201</strong>
                <span style="font-size: 0.65rem; background: #047857; padding: 0.2rem 0.5rem; border-radius: 4px;">LIBRE</span>
              </div>

              <div style="background: #881337; border: 1px solid #f43f5e; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 202</span>
                <strong style="font-size: 1.25rem; display: block;">202</strong>
                <span style="font-size: 0.65rem; background: #be123c; padding: 0.2rem 0.5rem; border-radius: 4px;">OCUPADA (04h:20m)</span>
              </div>

              <div style="background: #312e81; border: 1px solid #6366f1; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 301</span>
                <strong style="font-size: 1.25rem; display: block;">301</strong>
                <span style="font-size: 0.65rem; background: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px;">SUITE QR</span>
              </div>

              <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 12px; padding: 1rem; text-align: center;">
                <span style="font-size: 0.7rem; opacity: 0.8; display: block;">HAB. 302</span>
                <strong style="font-size: 1.25rem; display: block;">302</strong>
                <span style="font-size: 0.65rem; background: #047857; padding: 0.2rem 0.5rem; border-radius: 4px;">LIBRE</span>
              </div>
            </div>
          </div>
        `}

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
  }
}

// Initialize
renderAdminApp();
