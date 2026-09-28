# Diagrama Entidad-Relación — Hotel Wimbledon

Esquema **leído de la base de datos real** (MySQL 8, base `hotel_wimbledon`) desde
`information_schema`: columnas, tipos, nulabilidad, claves primarias, únicas, foráneas e índices.
Hibernate genera y mantiene este esquema a partir de las entidades JPA de
`com.wimbledon.backend.domain` (`spring.jpa.hibernate.ddl-auto=update`).

```mermaid
erDiagram
    USUARIOS {
        INT id PK "AUTO_INCREMENT"
        VARCHAR(100) nombre "NOT NULL"
        VARCHAR(150) email UK "NOT NULL"
        VARCHAR(255) password_hash "NOT NULL (BCrypt)"
        ENUM rol "NOT NULL: SUPER_ADMIN, ADMINISTRADOR, RECEPCIONISTA, LIMPIEZA, CLIENTE"
        ENUM rol_solicitado "NULL: RECEPCIONISTA, GERENTE, LIMPIEZA"
        ENUM estado "NOT NULL: PENDIENTE_APROBACION, ACTIVO, DESACTIVADO"
        BIT(1) activo "NOT NULL"
        DATETIME(6) creado_en
    }

    HABITACIONES {
        INT id PK "AUTO_INCREMENT"
        VARCHAR(100) nombre "NOT NULL"
        VARCHAR(60) tipo
        TEXT descripcion
        DECIMAL(8_2) tarifa_base "NOT NULL"
        INT duracion_bloque_horas "NOT NULL"
        INT capacidad_unidades "NOT NULL"
        ENUM estado "DISPONIBLE, OCUPADA, LIMPIEZA_PENDIENTE, EN_PROCESO, LISTA, MANTENIMIENTO"
        VARCHAR(255) imagen_url
        DATETIME(6) creado_en
    }

    RESERVAS {
        INT id PK "AUTO_INCREMENT"
        INT habitacion_id FK "NOT NULL"
        INT cliente_id FK "NULL (reserva sin cuenta)"
        VARCHAR(150) nombre_huesped "NOT NULL"
        VARCHAR(30) telefono
        VARCHAR(150) email "NOT NULL"
        DATE fecha "NOT NULL"
        TIME(6) hora_ingreso "NOT NULL"
        TIME(6) hora_salida "NOT NULL"
        VARCHAR(255) notas
        ENUM estado "PENDIENTE, CONFIRMADA, CHECKIN, FINALIZADA, CANCELADA"
        ENUM origen "ONLINE, MANUAL"
        VARCHAR(64) qr_token UK "NOT NULL"
        BIT(1) qr_usado "NOT NULL"
        DATETIME(6) expira_en
        DECIMAL(8_2) monto_total
        DECIMAL(8_2) adelanto
        DATETIME(6) creado_en
    }

    INCIDENCIAS {
        INT id PK "AUTO_INCREMENT"
        INT habitacion_id FK "NOT NULL"
        INT reportado_por FK "NOT NULL"
        VARCHAR(255) descripcion "NOT NULL"
        ENUM prioridad "BAJA, MEDIA, ALTA"
        ENUM estado "ABIERTA, EN_REVISION, RESUELTA"
        DATETIME(6) creado_en
    }

    TURNOS {
        INT id PK "AUTO_INCREMENT"
        INT usuario_id FK "NOT NULL"
        DATE fecha "NOT NULL"
        TIME(6) hora_inicio "NOT NULL"
        TIME(6) hora_fin "NOT NULL"
    }

    INTENTOS_CHECKIN {
        INT id PK "AUTO_INCREMENT"
        INT reserva_id "NULL, indexado, sin FK"
        VARCHAR(150) operador_email "NOT NULL"
        VARCHAR(20) operador_rol "NOT NULL"
        ENUM resultado "NOT NULL: EXITOSO, FALLIDO"
        ENUM motivo_rechazo "DESCONOCIDA, FUERA_DE_VENTANA, YA_USADA, CANCELADA, FINALIZADA, HABITACION_REQUIERE_ASEO, ERROR"
        DATETIME(6) marcado_en "NOT NULL, indexado"
        VARCHAR(45) ip_origen
    }

    HABITACIONES ||--o{ RESERVAS         : "es reservada en"
    USUARIOS     |o--o{ RESERVAS         : "realiza (cliente)"
    HABITACIONES ||--o{ INCIDENCIAS      : "registra"
    USUARIOS     ||--o{ INCIDENCIAS      : "reporta"
    USUARIOS     ||--o{ TURNOS           : "tiene asignados"
    RESERVAS     |o..o{ INTENTOS_CHECKIN : "audita (referencia lógica)"
```

## Restricciones reales

| Tabla | Claves foráneas | Únicas | Índices adicionales |
|---|---|---|---|
| `usuarios` | — | `email` | — |
| `habitaciones` | — | — | — |
| `reservas` | `habitacion_id → habitaciones.id`, `cliente_id → usuarios.id` | `qr_token` | — |
| `incidencias` | `habitacion_id → habitaciones.id`, `reportado_por → usuarios.id` | — | — |
| `turnos` | `usuario_id → usuarios.id` | — | — |
| `intentos_checkin` | — | — | `idx_intentos_checkin_reserva (reserva_id)`, `idx_intentos_checkin_marcado (marcado_en)` |

## Notas

- **Roles como enum, no como tabla.** No existe una tabla `roles`: el rol es una columna `ENUM` en `usuarios`.
- **`intentos_checkin` no tiene FK** hacia `reservas` a propósito: es un registro de auditoría
  append-only que debe sobrevivir al ciclo de vida de la reserva. La relación es solo lógica
  (línea punteada).
- **`reservas.cliente_id` es opcional**: una reserva puede existir asociada solo al email del huésped.
- **Sin valores `DEFAULT` en la base.** Los valores iniciales (`estado = DISPONIBLE`,
  `duracion_bloque_horas = 6`, `qr_usado = false`, `adelanto = 0`, etc.) los asigna Java con
  `@Builder.Default`, y `creado_en`/`marcado_en` los asigna el callback `@PrePersist`.
- Los booleanos de Java (`Boolean`) se guardan como `BIT(1)`; los `LocalDateTime`/`LocalTime`, con
  precisión de microsegundos (`DATETIME(6)`/`TIME(6)`).
