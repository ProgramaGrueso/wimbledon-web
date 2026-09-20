/**
 * Cliente API REST para comunicación con el backend Spring Boot de Hotel Wimbledon.
 * Resuelve Hallazgos #1, #3, #5, #7 y #8:
 *  - Valida solapamiento en el servidor.
 *  - Despacha reservas al backend Java como única fuente de verdad.
 *  - Maneja errores de negocio y códigos HTTP 4xx / 5xx.
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
      errorMsg = data.message || data.error || JSON.stringify(data);
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
  /**
   * Crea una nueva reserva en estado PENDIENTE con validación de solapamiento en el servidor.
   * @param {Object} payload { habitacionId, fecha, horaIngreso, nombreCompleto, telefono, email, notas }
   */
  async crearReserva(payload) {
    return request('/api/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Permite al huésped desistir de su solicitud PENDIENTE enviando su qrToken.
   * @param {number|string} id ID numérico de la reserva
   * @param {string} qrToken Token único emitido al solicitar la reserva
   */
  async cancelarReservaPendiente(id, qrToken) {
    return request(`/api/reservas/${id}/cancelar-pendiente`, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  },

  /**
   * Realiza el check-in oficial desde mostrador validando el qrToken ante el backend.
   * @param {string} qrToken Token escaneado del huésped
   * @param {string} jwtToken Token JWT de la sesión de staff en el backend
   */
  async checkinRecepcion(qrToken, jwtToken) {
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    return request('/api/recepcion/checkin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ qrToken }),
    });
  },

  /**
   * Consulta el catálogo público con disponibilidad real evaluada según horario.
   * @param {string} fecha YYYY-MM-DD
   * @param {string} horaIngreso HH:mm
   * @param {number} duracionHoras
   */
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
};

export default api;
