/**
 * Cliente API REST para comunicación con el backend Spring Boot de Hotel Wimbledon.
 * Resuelve Hallazgos #1, #3, #5, #7 y #8:
 *  - Valida solapamiento en el servidor.
 *  - Despacha reservas al backend Java como única fuente de verdad.
 *  - Maneja errores de negocio y códigos HTTP 4xx / 5xx.
 *  - Sincroniza Rack Operativo, Recepción y Housekeeping directamente con MySQL.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMsg = 'Error en el servidor al procesar la solicitud.';
    if (typeof data === 'object' && data !== null) {
      errorMsg = data.mensaje || data.message || data.error || JSON.stringify(data);
    } else if (typeof data === 'string' && data.length > 0) {
      errorMsg = data;
    }
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // ── Autenticación ─────────────────────────────────────────────────────────
  async login(email, password) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // ── Portal Huésped / Catálogo Público ─────────────────────────────────────
  async crearReserva(payload) {
    return request('/api/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelarReservaPendiente(id, qrToken) {
    return request(`/api/reservas/${id}/cancelar-pendiente`, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  },

  async obtenerHabitaciones(fecha, horaIngreso, duracionHoras) {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (horaIngreso) params.append('horaIngreso', horaIngreso);
    if (duracionHoras) params.append('duracionHoras', duracionHoras);

    const query = params.toString();
    return request(`/api/publico/habitaciones${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  // ── Recepción & Check-in ──────────────────────────────────────────────────
  async checkinRecepcion(qrToken, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/recepcion/checkin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: qrToken }),
    });
  },

  async obtenerAgendaHoy(jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/recepcion/agenda-hoy', {
      method: 'GET',
      headers,
    });
  },

  async actualizarEstadoHabitacionRecepcion(id, estado, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/recepcion/habitaciones/${id}/estado`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ estado }),
    });
  },

  async crearReservaManual(payload, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/recepcion/reserva-manual', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  // ── Housekeeping / Limpieza ───────────────────────────────────────────────
  async obtenerHabitacionesLimpieza(jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/limpieza/habitaciones', {
      method: 'GET',
      headers,
    });
  },

  async actualizarEstadoHabitacionLimpieza(id, estado, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/limpieza/habitaciones/${id}/estado`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ estado }),
    });
  },

  async reportarIncidenciaLimpieza(payload, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/limpieza/incidencias', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  // ── Gerencia / Administración ─────────────────────────────────────────────
  async obtenerHabitacionesAdmin(jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/admin/habitaciones', {
      method: 'GET',
      headers,
    });
  },

  async obtenerKpisAdmin(jwtToken, anio, mes) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    const params = new URLSearchParams();
    if (anio) params.append('anio', anio);
    if (mes) params.append('mes', mes);
    const q = params.toString();
    return request(`/api/admin/kpis${q ? `?${q}` : ''}`, {
      method: 'GET',
      headers,
    });
  },
};

export default api;
