# Hotel Wimbledon — Matriz de Roles y Permisos (RBAC)

Control de acceso basado en roles para el sistema de reservas y check-in digital.
5 roles: **Super Admin, Administrador, Recepcionista, Limpieza, Cliente.**

> Igual que en RECOVR, el principio rector es la **discreción**: nadie que no
> necesite ver los datos personales del huésped debería poder verlos. Recepción
> ve lo operativo (nombre, habitación, hora); nadie ve el historial de estadías
> salvo el propio cliente y el Admin (con fines de auditoría, no de curiosidad).

| Módulo / Capacidad | Super Admin (DevOps/TI) | Administrador (Gerencia) | Recepcionista (Front-desk/Caja) | Limpieza (Housekeeping) | Cliente (Huésped) |
|---|---|---|---|---|---|
| Configuración de servidor, BD y APIs (pasarela de pago, WhatsApp, correo) | ✅ Total | ❌ Denegado | ❌ Denegado | ❌ Denegado | ❌ Denegado |
| Gestión global de cuentas y asignación de roles | ✅ Total | ✅ Personal (solo staff de su hotel) | ❌ Denegado | ❌ Denegado | ❌ Denegado |
| Dashboard financiero, ocupación y KPIs | ✅ Total | ✅ Total | ❌ Denegado | ❌ Denegado | ❌ Denegado |
| Catálogo de habitaciones (tipos, tarifas, fotos, comodidades) | ✅ Total | ✅ Total | 👁 Lectura | ❌ Denegado | 👁 Lectura pública |
| Gestión de turnos y horarios del personal | ✅ Total | ✅ Total | ❌ Denegado | 👁 Ver turno propio | ❌ Denegado |
| Ver disponibilidad de habitaciones en tiempo real | 👁 Lectura | ✅ Completo | ✅ Tiempo real | 👁 Solo estado (limpia/sucia) | 👁 Disponibilidad pública |
| Check-in express (validar QR) y cobro en caja | ✅ Auditoría | ✅ Completo | ✅ Operativo | ❌ Denegado | ❌ Denegado |
| Agendar reservas manuales (walk-in / telefónica) | — | ✅ Habilitado | ✅ Principal | ❌ Denegado | ❌ Denegado |
| Auto-reserva online 24/7 + generación de QR | — | — | — | — | ✅ Portal web |
| Cambiar estado de habitación (limpia / sucia / en proceso) | 👁 Lectura | ✅ Completo | ✅ Actualizar tras check-out | ✅ Exclusivo (marcar estado) | ❌ Denegado |
| Reportar incidencias de mantenimiento | 👁 Lectura | ✅ Completo | ✅ Habilitado | ✅ Exclusivo (crear reporte) | ❌ Denegado |
| Ficha de reserva: ver datos del huésped | 🔒 Privacidad | 🔒 Privacidad (solo auditoría) | ⚠️ Solo datos operativos (nombre, hora, habitación — sin historial) | ❌ Denegado | 🔒 Ficha propia |
| Reprogramar o cancelar reserva | — | ✅ Siempre | ✅ Siempre | — | ⚠️ Con política (ventana de tiempo) |
| Historial personal de reservas y descarga de QR | — | — | — | — | ✅ Mi cuenta |

**Leyenda**
- ✅ **Total / Habilitado / Completo** — permiso total o autorizado
- 👁 **Lectura** — solo consulta, sin poder de edición
- 🔒 **Privacidad** — acceso restringido por resguardo ético/legal, aunque técnicamente el rol podría auditar
- ⚠️ Acceso condicionado por reglas de negocio (ventana horaria, alcance limitado)
- ❌ **Denegado** — sin acceso
- **—** No aplica al flujo de ese rol

---

## Notas de diseño para tu Spring Boot backend

**Enum de roles** (`Rol`): `SUPER_ADMIN, ADMINISTRADOR, RECEPCIONISTA, LIMPIEZA, CLIENTE`

**Protección de endpoints sugerida** (Spring Security + JWT, method security):

```java
@PreAuthorize("hasRole('SUPER_ADMIN')")
// /api/config/**, /api/usuarios/roles/**

@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRADOR')")
// /api/reportes/**, /api/habitaciones/** (CUD), /api/turnos/**

@PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
// /api/reservas/manual, /api/checkin/**, /api/caja/**

@PreAuthorize("hasRole('LIMPIEZA')")
// /api/habitaciones/{id}/estado, /api/incidencias (POST)

@PreAuthorize("hasRole('CLIENTE') and #reservaId == authentication.principal.reservaId")
// /api/reservas/{reservaId}  -> ficha propia únicamente
```

Un dato clave que salió del cuadro de RECOVR y aplica igual aquí: **el rol
Recepcionista NUNCA debe tener acceso al historial completo de un cliente**,
solo a la reserva activa del día. Eso es lo que sostiene la promesa de
"discreción" del Lean Canvas.
