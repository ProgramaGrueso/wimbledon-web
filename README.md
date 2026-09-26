# Hotel Wimbledon — Plataforma Web

Sistema integral de reservas, check-in digital y gestión operativa para el Hotel Wimbledon.

---

## Estructura del Repositorio

El proyecto está organizado como un monorepo desacoplado en tres áreas principales:

```text
wimbledon-web/
├── frontend/               # Aplicación cliente web (Vite, HTML5, CSS3, JavaScript Vanilla, GSAP, Lenis)
│   ├── index.html          # Landing page principal y catálogo interactivo
│   ├── admin.html          # Panel de administración y dashboard
│   ├── src/                # Lógica del cliente, animaciones y componentes
│   ├── public/             # Datos JSON, medios (videos HD/WebM), favicon e íconos
│   ├── package.json        # Dependencias y scripts de Vite
│   └── vite.config.js      # Configuración de compilación multi-página (MPA)
│
├── backend/                # API REST (Java 21, Spring Boot 3, Spring Security, JWT, JPA)
│   ├── bdd/                # Script SQL DDL y datos de prueba para MySQL
│   ├── pom.xml             # Dependencias Maven
│   └── src/                # Controladores, servicios, entidades de dominio y seguridad
│
└── exposicion/             # Documentación técnica, entregables académicos y presentaciones
    ├── avanze1/            # Primer entregable del proyecto
    │   ├── anexos/         # Capturas de pantalla y flujos visuales de la interfaz
    │   ├── arquitectura/   # Matriz RBAC, especificación de confirmación QR y script de BD
    │   └── documentos/     # Prompts de desarrollo por módulo, datos extraídos e información de versión
    ├── avanze2/            # Segundo entregable
    └── avanze3/            # Tercer entregable
```

---

## Instrucciones de Ejecución

### 1. Frontend

Requisitos: Node.js 18+ y npm.

```bash
cd frontend
npm install       # Solo si no se cuenta con node_modules
npm run dev       # Inicia el servidor de desarrollo local
npm run build     # Genera el bundle de producción en frontend/dist
npm run preview   # Previsualiza la compilación de producción
```

- Landing Page: `http://localhost:5173/`
- Panel Administrativo: `http://localhost:5173/admin.html`

### 2. Backend

Requisitos: Java 21 y Maven 3.8+.

```bash
cd backend
mvn clean compile   # Compila el código fuente
mvn test            # Ejecuta la suite de pruebas
mvn spring-boot:run # Levanta el servidor backend en http://localhost:8080
```

### 3. Base de Datos — MySQL (Única Fuente de Verdad)

La arquitectura de persistencia utiliza exclusivamente **MySQL** (desplegado en Aiven / local) como la única fuente transaccional de verdad para reservas, inventario de suites y cuentas de usuarios. No existen bases de datos paralelas ni persistencias desacopladas.

El script con el esquema y la información de prueba académica se encuentra en:
- `backend/bdd/hotel_wimbledon_test_db.sql`
- `exposicion/avanze1/arquitectura/hotel_wimbledon_test_db.sql`
