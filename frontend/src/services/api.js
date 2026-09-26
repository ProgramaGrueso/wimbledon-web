/**
 * Cliente de integración con la API REST de Spring Boot.
 *
 * Base URL configurable por variable de entorno VITE_API_URL.
 * En desarrollo local apunta a http://localhost:8080 (o al proxy de Vite).
 * En producción (Vercel) apunta al backend desplegado.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Función base para peticiones HTTP a la API REST.
 * Maneja serialización de JSON, headers comunes y formato de error estándar.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  // 204 No Content no contiene cuerpo
  if (response.status === 204) {
    return null;
  }

  // Parsear JSON o texto según content-type
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Si la respuesta no es 2xx, lanzar error estructurado
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

  async registrarPersonal(payload) {
    return request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload),
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

  async obtenerHabitacionesRecepcion(jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/recepcion/habitaciones', {
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

  async confirmarReservaRecepcion(id, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/recepcion/reservas/${id}/confirmar`, {
      method: 'POST',
      headers,
    });
  },

  async consultarReniec(jwtToken, dni) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/recepcion/reniec/${dni}`, {
      method: 'GET',
      headers,
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

  async obtenerKpisAdmin(jwtToken, periodoOrAnio, mes) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    const params = new URLSearchParams();
    if (typeof periodoOrAnio === 'string') {
      params.append('periodo', periodoOrAnio);
    } else {
      if (periodoOrAnio) params.append('anio', periodoOrAnio);
      if (mes) params.append('mes', mes);
    }
    const q = params.toString();
    return request(`/api/admin/kpis${q ? `?${q}` : ''}`, {
      method: 'GET',
      headers,
    });
  },

  async listarUsuariosPendientes(jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/admin/usuarios/pendientes', {
      method: 'GET',
      headers,
    });
  },

  async aprobarUsuario(id, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/admin/usuarios/${id}/aprobar`, {
      method: 'PATCH',
      headers,
    });
  },

  async rechazarUsuario(id, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request(`/api/admin/usuarios/${id}/rechazar`, {
      method: 'PATCH',
      headers,
    });
  },
};

export default api;
