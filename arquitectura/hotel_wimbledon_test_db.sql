-- =====================================================================
-- Hotel Wimbledon — Base de datos de PRUEBA (uso académico)
-- MySQL 8.x
-- No contiene datos reales de huéspedes; todo es data ficticia.
-- =====================================================================

DROP DATABASE IF EXISTS hotel_wimbledon;
CREATE DATABASE hotel_wimbledon CHARACTER SET utf8mb4;
USE hotel_wimbledon;

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO roles (nombre) VALUES
    ('SUPER_ADMIN'),
    ('ADMINISTRADOR'),
    ('RECEPCIONISTA'),
    ('LIMPIEZA'),
    ('CLIENTE');

-- ---------------------------------------------------------------------
-- Usuarios (staff + clientes)
-- Password de prueba para todos: "Password123!" -> hash BCrypt de ejemplo
-- =====================================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
    ('Juan Francisco Ganoza', 'superadmin@wimbledon.test', '$2a$10$examplehash1', 1),
    ('Sebastian Sotelo',      'admin@wimbledon.test',      '$2a$10$examplehash2', 2),
    ('Fabiana La Madrid',     'recepcion@wimbledon.test',  '$2a$10$examplehash3', 3),
    ('Vania Cerron',          'limpieza1@wimbledon.test',  '$2a$10$examplehash4', 4),
    ('Fernando Effio',        'limpieza2@wimbledon.test',  '$2a$10$examplehash5', 4),
    ('Carlos Prueba',         'cliente1@wimbledon.test',   '$2a$10$examplehash6', 5),
    ('Sofia Prueba',          'cliente2@wimbledon.test',   '$2a$10$examplehash7', 5);

-- ---------------------------------------------------------------------
-- Habitaciones (según el prototipo ya construido en el front)
-- ---------------------------------------------------------------------
CREATE TABLE habitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(60),
    descripcion TEXT,
    tarifa_base DECIMAL(8,2) NOT NULL,
    duracion_bloque_horas INT NOT NULL DEFAULT 6,
    estado ENUM('DISPONIBLE','OCUPADA','LIMPIEZA_PENDIENTE','EN_PROCESO','MANTENIMIENTO')
        DEFAULT 'DISPONIBLE',
    imagen_url VARCHAR(255),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO habitaciones (nombre, tipo, descripcion, tarifa_base, duracion_bloque_horas, imagen_url) VALUES
    ('Suite Presidencial',            'Presidencial', 'Jacuzzi hidromasaje, ducha española, pole dance, sillón tántrico, cámara seca.', 250.00, 6, '/img/suite-presidencial.jpg'),
    ('Tropical Dreams',               'Temática',     'Habitación de lujo diseñada para clientes exclusivos. Jacuzzi, ducha española, pole dance, frigobar.', 180.00, 6, '/img/tropical-dreams.jpg'),
    ('Riverside Dreams Presidencial', 'Presidencial', 'Jacuzzi, pole dance, sillón tántrico, cama king, frigobar.', 220.00, 6, '/img/riverside-dreams.jpg');

-- ---------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habitacion_id INT NOT NULL,
    cliente_id INT NULL,
    nombre_huesped VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150) NOT NULL,
    fecha DATE NOT NULL,
    hora_ingreso TIME NOT NULL,
    hora_salida TIME NOT NULL,
    notas VARCHAR(255),
    estado ENUM('PENDIENTE','CONFIRMADA','CHECKIN','FINALIZADA','CANCELADA')
        DEFAULT 'PENDIENTE',
    origen ENUM('ONLINE','MANUAL') DEFAULT 'ONLINE',
    qr_token VARCHAR(64) NOT NULL UNIQUE,
    qr_usado BOOLEAN DEFAULT FALSE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id),
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
);

INSERT INTO reservas
    (habitacion_id, cliente_id, nombre_huesped, telefono, email, fecha, hora_ingreso, hora_salida, estado, origen, qr_token)
VALUES
    (1, 6, 'Carlos Prueba', '+51999000111', 'cliente1@wimbledon.test', CURDATE(), '20:00:00', '02:00:00', 'CONFIRMADA', 'ONLINE', UUID()),
    (2, NULL, 'Walk-in Prueba', '+51999000222', 'walkin@example.test', CURDATE(), '22:00:00', '04:00:00', 'PENDIENTE', 'MANUAL', UUID());

-- ---------------------------------------------------------------------
-- Incidencias de mantenimiento (reportadas por Limpieza)
-- ---------------------------------------------------------------------
CREATE TABLE incidencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habitacion_id INT NOT NULL,
    reportado_por INT NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    prioridad ENUM('BAJA','MEDIA','ALTA') DEFAULT 'MEDIA',
    estado ENUM('ABIERTA','EN_REVISION','RESUELTA') DEFAULT 'ABIERTA',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id),
    FOREIGN KEY (reportado_por) REFERENCES usuarios(id)
);

INSERT INTO incidencias (habitacion_id, reportado_por, descripcion, prioridad) VALUES
    (3, 4, 'Aire acondicionado no enfría correctamente', 'ALTA');

-- ---------------------------------------------------------------------
-- Turnos del personal
-- ---------------------------------------------------------------------
CREATE TABLE turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

INSERT INTO turnos (usuario_id, fecha, hora_inicio, hora_fin) VALUES
    (3, CURDATE(), '08:00:00', '16:00:00'),
    (4, CURDATE(), '08:00:00', '14:00:00'),
    (5, CURDATE(), '14:00:00', '22:00:00');
