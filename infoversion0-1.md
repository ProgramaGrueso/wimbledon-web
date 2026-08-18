# Hotel Wimbledon — Documentación de Arquitectura y Versión 0.1

**Fecha:** 18 de Agosto, 2026  
**Proyecto:** Hotel Wimbledon Web & Sistema de Gestión Interno  
**Versión:** 0.1 (Prototipo Funcional & Base Editorial)  
**Estado:** Servidor Activo (Vite Dev Server)

---

## 📌 1. Resumen Ejecutivo del Proyecto

El proyecto **Hotel Wimbledon Web** es una plataforma web híbrida diseñada para cumplir dos funciones estratégicas esenciales:

1. **Portal Público (Experiencia Editorial de Lujo):** Presentación comercial de alta gama enfocada en suites, habitaciones temáticas, servicios (jacuzzi, sauna, gastronomía) y reservas rápidas con foco en la discreción y el confort.
2. **Portal Administrativo Interno (Gestión Operativa):** Panel de control dedicado para el personal del hotel (Recepción y Gerencia) enfocado en la supervisión en tiempo real del estado de las habitaciones (*Rack en Vivo*), registro de *Walk-ins*, control de caja e indicadores clave (KPIs).

---

## 🏗️ 2. Arquitectura del Sistema

La arquitectura está basada en un enfoque **Híbrido SPA/MPA ligero en Vanilla JavaScript (ES Modules)**, eliminando frameworks pesados para garantizar tiempos de carga instantáneos y máximo rendimiento en dispositivos móviles.

### 📂 Estructura de Directorios

```text
wimbledon-web/
├── public/                     # Archivos estáticos y base de datos JSON
│   ├── data/                   # APIs de datos JSON locales
│   │   ├── catalogo_habitaciones.json
│   │   ├── specs_habitaciones.json
│   │   ├── figma_catalogo.json
│   │   └── landing_real.json
│   ├── images/                 # Material fotográfico del hotel
│   ├── video/                  # Videos promocionales
│   └── icons.svg / favicon.svg
├── src/                        # Código fuente modular
│   ├── main.js                 # Lógica del Portal Público Editorial
│   ├── admin.js                # Lógica del Portal Administrativo Interno
│   └── style.css               # Sistema de diseño global y tokens CSS
├── index.html                  # Entrada del Portal Cliente
├── admin.html                  # Entrada del Portal de Personal
├── package.json                # Configuración de scripts y dependencias (Vite, Lucide)
└── infoversion0-1.md           # Este documento de especificación
```

---

## 🛠️ 3. Stack Tecnológico

| Componente | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Lenguaje Core** | HTML5 + JavaScript Vanilla (ESM) | 0ms de tiempo de arranque de framework, consumo mínimo de memoria en móviles. |
| **Entorno & Bundler** | Vite 8 | Servidor de desarrollo hiper-rápido con reemplazo de módulos en caliente (HMR) y compilación optimizada. |
| **Estilos & UI** | Vanilla CSS3 + Custom Properties | Control absoluto sobre la estética, sin clases utilitarias innecesarias de frameworks externos. |
| **Fuentes & Tipografía** | Google Fonts (*Fraunces* + *Plus Jakarta Sans*) | Combinación de tipografía serif editorial para encabezados de lujo y sans-serif limpia para lectura. |
| **Iconografía** | Lucide Icons | Conjunto de íconos vectoriales modernos y livianos. |
| **Persistencia & Datos** | Datasets JSON + LocalStorage | Renderizado dinámico cliente-servidor desconectado de backend complejo en fase 0.1. |

---

## 🎨 4. Filosofía de Diseño UI/UX

El diseño visual adopta el concepto **Dark Luxe Editorial**:

- **Paleta de Colores Exclusiva:**
  - **Fondo:** Tonos oscuros profundos (`#060911`, `#0b0f19`).
  - **Detalles / Acentos:** Ambarino y oro cálido (`#fbbf24`, `rgba(217, 119, 6, 0.4)`).
  - **Texto:** Blanco puro (`#ffffff`) y gris técnico (`#94a3b8`).
- **Interacciones Fluidas:**
  - *Drawer Lateral (Overlay):* Detalle de cada habitación mediante un panel deslizante sin abandonar la navegación.
  - *Filtros Instantáneos:* Clasificación de habitaciones (Presidencial, Jacuzzi, Vista al Mar, Temática).
  - *Reserva WhatsApp Directa:* Botones con mensajes pre-armados hacia el canal oficial de atención.

---

## ⚙️ 5. Módulos Desarrollados en v0.1

### A. Portal Público (`index.html` + `src/main.js`)
- Hero Section full-screen (100vh).
- Módulo de concepto y experiencia boutique.
- Catálogo interactivo de habitaciones con filtro dinámico por tipo.
- Panel deslizante de especificaciones por habitación.
- Sección de gastronomía y servicios adicionales.
- Integración de reservas vía WhatsApp.

### B. Portal Administrativo (`admin.html` + `src/admin.js`)
- Control de acceso por rol (Gerente General / Recepcionista).
- Tablero de control de ocupación (*Rack de Habitaciones*).
- Formulario de ingreso de huéspedes (*Walk-in*) y gestión de caja.
- Visualización de métricas e ingresos de la jornada.

---

## 🚀 6. Próximos Pasos (Hoja de Ruta v0.2+)

1. Integración de backend real (Node.js / Express / PostgreSQL o Supabase).
2. Sistema de reservas en línea con calendario de disponibilidad en tiempo real.
3. Pasarela de pagos integrada para abonos o reservas completas.
4. Notificaciones automáticas por WhatsApp / Email para confirmaciones.
