# Diagrama de Clases UML (POO) — Entidades del backend Java

Paquete `com.wimbledon.backend.domain` y `com.wimbledon.backend.domain.enums`.
Los getters/setters, constructores y `builder()` los genera Lombok
(`@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`) y se omiten.

```mermaid
classDiagram
    direction TB

    class UserDetails {
        <<interface>>
        +getUsername() String
        +getPassword() String
        +getAuthorities() Collection~GrantedAuthority~
        +isAccountNonExpired() boolean
        +isAccountNonLocked() boolean
        +isCredentialsNonExpired() boolean
        +isEnabled() boolean
    }

    class Usuario {
        <<Entity>>
        -Integer id
        -String nombre
        -String email
        -String passwordHash
        -Rol rol
        -RolSolicitable rolSolicitado
        -EstadoCuenta estado
        -Boolean activo
        -LocalDateTime creadoEn
        #onCreate() void
        +getUsername() String
        +getPassword() String
        +getAuthorities() Collection~GrantedAuthority~
        +isEnabled() boolean
    }

    class Habitacion {
        <<Entity>>
        -Integer id
        -String nombre
        -String tipo
        -String descripcion
        -BigDecimal tarifaBase
        -Integer duracionBloqueHoras = 6
        -Integer capacidadUnidades = 1
        -EstadoHabitacion estado
        -String imagenUrl
        -LocalDateTime creadoEn
        #onCreate() void
    }

    class Reserva {
        <<Entity>>
        -Integer id
        -Habitacion habitacion
        -Usuario cliente
        -String nombreHuesped
        -String telefono
        -String email
        -LocalDate fecha
        -LocalTime horaIngreso
        -LocalTime horaSalida
        -String notas
        -EstadoReserva estado
        -OrigenReserva origen
        -String qrToken
        -Boolean qrUsado = false
        -LocalDateTime expiraEn
        -BigDecimal montoTotal
        -BigDecimal adelanto
        -LocalDateTime creadoEn
        #onCreate() void
    }

    class Incidencia {
        <<Entity>>
        -Integer id
        -Habitacion habitacion
        -Usuario reportadoPor
        -String descripcion
        -PrioridadIncidencia prioridad
        -EstadoIncidencia estado
        -LocalDateTime creadoEn
        #onCreate() void
    }

    class Turno {
        <<Entity>>
        -Integer id
        -Usuario usuario
        -LocalDate fecha
        -LocalTime horaInicio
        -LocalTime horaFin
    }

    class IntentoCheckin {
        <<Entity>>
        -Integer id
        -Integer reservaId
        -String operadorEmail
        -String operadorRol
        -ResultadoIntento resultado
        -MotivoRechazo motivoRechazo
        -LocalDateTime marcadoEn
        -String ipOrigen
        #onCreate() void
    }

    class Rol {
        <<enumeration>>
        SUPER_ADMIN
        ADMINISTRADOR
        RECEPCIONISTA
        LIMPIEZA
        CLIENTE
    }

    class RolSolicitable {
        <<enumeration>>
        RECEPCIONISTA
        GERENTE
        LIMPIEZA
        +toRol() Rol
    }

    class EstadoCuenta {
        <<enumeration>>
        PENDIENTE_APROBACION
        ACTIVO
        DESACTIVADO
    }

    class EstadoHabitacion {
        <<enumeration>>
        DISPONIBLE
        OCUPADA
        LIMPIEZA_PENDIENTE
        EN_PROCESO
        LISTA
        MANTENIMIENTO
    }

    class EstadoReserva {
        <<enumeration>>
        PENDIENTE
        CONFIRMADA
        CHECKIN
        FINALIZADA
        CANCELADA
    }

    class OrigenReserva {
        <<enumeration>>
        ONLINE
        MANUAL
    }

    class PrioridadIncidencia {
        <<enumeration>>
        BAJA
        MEDIA
        ALTA
    }

    class EstadoIncidencia {
        <<enumeration>>
        ABIERTA
        EN_REVISION
        RESUELTA
    }

    class ResultadoIntento {
        <<enumeration>>
        EXITOSO
        FALLIDO
    }

    class MotivoRechazo {
        <<enumeration>>
        DESCONOCIDA
        FUERA_DE_VENTANA
        YA_USADA
        CANCELADA
        FINALIZADA
        HABITACION_REQUIERE_ASEO
        ERROR
    }

    class ModalidadEstadia {
        <<enumeration>>
        TRES_HORAS(3)
        SEIS_HORAS(6)
        DOCE_HORAS(12)
        +int horas
        +getHoras() int
    }

    %% Herencia / realización
    UserDetails <|.. Usuario : implements

    %% Asociaciones @ManyToOne (navegables solo desde el lado "muchos")
    Reserva "0..*" --> "1" Habitacion : habitacion
    Reserva "0..*" --> "0..1" Usuario : cliente
    Incidencia "0..*" --> "1" Habitacion : habitacion
    Incidencia "0..*" --> "1" Usuario : reportadoPor
    Turno "0..*" --> "1" Usuario : usuario

    %% Referencia lógica por id (sin asociación JPA)
    IntentoCheckin ..> Reserva : reservaId

    %% Uso de enumeraciones
    Usuario ..> Rol
    Usuario ..> RolSolicitable
    Usuario ..> EstadoCuenta
    RolSolicitable ..> Rol : toRol()
    Habitacion ..> EstadoHabitacion
    Reserva ..> EstadoReserva
    Reserva ..> OrigenReserva
    Incidencia ..> PrioridadIncidencia
    Incidencia ..> EstadoIncidencia
    IntentoCheckin ..> ResultadoIntento
    IntentoCheckin ..> MotivoRechazo
```

## Notas

- **`Usuario` implementa `UserDetails`** (Spring Security): el email actúa como username, el rol se
  expone como autoridad `ROLE_<ROL>` y `isEnabled()` exige `estado == ACTIVO && activo`.
- **Asociaciones unidireccionales**: todas son `@ManyToOne(fetch = LAZY)` desde el lado "muchos";
  ninguna entidad tiene colecciones `@OneToMany` de vuelta.
- **`IntentoCheckin` es deliberadamente desacoplado**: guarda `reservaId` como `Integer` y
  `operadorRol` como `String` (no como enum `Rol`) para que el registro de auditoría no dependa
  del ciclo de vida de `Reserva` ni de cambios futuros en `Rol`.
- **`ModalidadEstadia`** no se persiste en ninguna entidad; lo usan `CrearReservaRequest` y `TarifaService`
  para validar las duraciones permitidas (3, 6 y 12 horas).
- Cada entidad con `creadoEn`/`marcadoEn` lo asigna en su callback `@PrePersist onCreate()`.
