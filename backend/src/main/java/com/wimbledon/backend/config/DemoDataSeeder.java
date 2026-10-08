package com.wimbledon.backend.config;

import com.wimbledon.backend.cliente.TarifaService;
import com.wimbledon.backend.domain.CobroCaja;
import com.wimbledon.backend.domain.Habitacion;
import com.wimbledon.backend.domain.Reserva;
import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.*;
import com.wimbledon.backend.repository.CobroCajaRepository;
import com.wimbledon.backend.repository.HabitacionRepository;
import com.wimbledon.backend.repository.ReservaRepository;
import com.wimbledon.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Datos de demostración para el panel administrativo: reservas, cobros de caja y
 * cuentas de personal de los últimos 90 días (nunca más de 3 meses de antigüedad).
 *
 * Solo corre con wimbledon.seed.demo-data=true (variable SEED_DEMO_DATA). Todo lo que
 * crea queda marcado (reservas.notas = 'demo-seed', correos @wimbledon.test) para poder
 * regenerarlo sin tocar datos reales. Si el último dato demo tiene más de 1 día, se
 * regenera solo para que la ventana siempre sea "los últimos 90 días hasta hoy".
 *
 * Las cuentas demo usan la contraseña de wimbledon.seed.demo-password (DEMO_PASSWORD);
 * si está vacía no se crean cuentas, solo reservas.
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String MARCA = "demo-seed";
    private static final int DIAS = 90;
    private static final String RECEPCION_EMAIL = "recepcion.demo@wimbledon.test";

    private static final String[] NOMBRES = {"Carlos", "Luis", "Jorge", "Miguel", "José", "Andrea", "Lucía", "Valeria",
            "Camila", "Diego", "Renato", "Fiorella", "Daniela", "Sofía", "Mateo", "Rodrigo", "Paola", "Gabriela",
            "Álvaro", "Mariana", "Hugo", "Karen", "Jimena", "Sebastián", "Natalia", "Ricardo"};
    private static final String[] APELLIDOS = {"Quispe", "Mendoza", "Flores", "Rojas", "Torres", "Huamán", "Castillo",
            "Vargas", "Chávez", "Ramírez", "Salazar", "Paredes", "Cárdenas", "Medina", "Gutiérrez", "Rivera"};

    @Value("${wimbledon.seed.demo-data:false}")
    private boolean activo;
    @Value("${wimbledon.seed.demo-password:}")
    private String passwordDemo;

    private final HabitacionRepository habitacionRepo;
    private final ReservaRepository reservaRepo;
    private final UsuarioRepository usuarioRepo;
    private final CobroCajaRepository cobroRepo;
    private final TarifaService tarifaService;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;

    private record Cliente(String nombre, String telefono, String email) {}

    @Override
    public void run(String... args) {
        if (!activo) return;
        List<Habitacion> habitaciones = habitacionRepo.findAll();
        if (habitaciones.isEmpty()) {
            log.warn("DemoDataSeeder — no hay habitaciones; se omite.");
            return;
        }
        LocalDate hoy = LocalDate.now();
        LocalDate ultima = jdbc.queryForObject("SELECT MAX(fecha) FROM reservas WHERE notas = ?", LocalDate.class, MARCA);
        if (ultima != null && !ultima.isBefore(hoy.minusDays(1))) {
            log.info("DemoDataSeeder — datos demo vigentes (hasta {}), se omite.", ultima);
            return;
        }
        if (ultima != null) {
            log.info("DemoDataSeeder — datos demo vencidos (hasta {}), regenerando...", ultima);
            jdbc.update("DELETE FROM cobros_caja WHERE recepcionista_email = ?", RECEPCION_EMAIL);
            jdbc.update("DELETE FROM reservas WHERE notas = ?", MARCA);
        }
        sembrarCuentas();
        int total = sembrarReservas(habitaciones, hoy);
        log.info("DemoDataSeeder — {} reservas demo creadas ({} → {}).", total, hoy.minusDays(DIAS), hoy);
    }

    private void sembrarCuentas() {
        if (passwordDemo.isBlank()) {
            log.warn("DemoDataSeeder — DEMO_PASSWORD vacía: no se crean cuentas demo.");
            return;
        }
        String hash = encoder.encode(passwordDemo);
        cuenta("Recepción Demo", RECEPCION_EMAIL, Rol.RECEPCIONISTA, hash);
        cuenta("Gerencia Demo", "gerencia.demo@wimbledon.test", Rol.ADMINISTRADOR, hash);
        cuenta("Limpieza Demo", "limpieza.demo@wimbledon.test", Rol.LIMPIEZA, hash);
    }

    private void cuenta(String nombre, String email, Rol rol, String hash) {
        if (usuarioRepo.existsByEmail(email)) return;
        usuarioRepo.save(Usuario.builder().nombre(nombre).email(email).passwordHash(hash).rol(rol)
                .estado(EstadoCuenta.ACTIVO).activo(true).build());
    }

    private int sembrarReservas(List<Habitacion> habitaciones, LocalDate hoy) {
        Random rnd = new Random(2026);
        LocalDateTime ahora = LocalDateTime.now();

        List<Cliente> clientes = new ArrayList<>();
        for (int i = 0; i < 140; i++) {
            String nombre = NOMBRES[rnd.nextInt(NOMBRES.length)] + " " + APELLIDOS[rnd.nextInt(APELLIDOS.length)];
            clientes.add(new Cliente(nombre, "9" + (10000000 + rnd.nextInt(89999999)),
                    "cliente" + i + "@wimbledon.test"));
        }

        // Peso por habitación: las económicas rotan más que las presidenciales.
        double[] pesos = habitaciones.stream().mapToDouble(h -> 1000.0 / (50 + h.getTarifaBase().doubleValue())).toArray();
        double sumaPesos = Arrays.stream(pesos).sum();

        Map<Integer, List<LocalDateTime[]>> ocupacion = new HashMap<>();
        List<Object[]> creadoEn = new ArrayList<>();
        List<CobroCaja> cobros = new ArrayList<>();
        Set<Integer> ocupadasAhora = new HashSet<>();
        Set<Integer> recienSalidas = new HashSet<>();
        int creadas = 0;

        for (int d = DIAS; d >= 0; d--) {
            LocalDate fecha = hoy.minusDays(d);
            boolean finDeSemana = fecha.getDayOfWeek().getValue() >= 5;
            double tendencia = 1.0 + (DIAS - d) / (double) DIAS * 0.25;      // el negocio crece
            int cantidad = (int) Math.round((7 + rnd.nextInt(7)) * (finDeSemana ? 1.5 : 1.0) * tendencia);

            for (int n = 0; n < cantidad; n++) {
                Habitacion hab = elegir(habitaciones, pesos, sumaPesos, rnd);
                ModalidadEstadia mod = elegirModalidad(rnd);
                LocalTime ingreso = elegirHora(rnd);
                LocalDateTime inicio = fecha.atTime(ingreso);
                LocalDateTime fin = inicio.plusHours(mod.horas);
                if (d == 0 && inicio.isAfter(ahora.plusHours(5))) continue;   // hoy no se inventa el futuro lejano
                if (!hayCupo(ocupacion, hab, inicio, fin)) continue;

                boolean online = rnd.nextDouble() < 0.6;
                Cliente c = clientes.get((int) (Math.abs(rnd.nextGaussian()) * 35) % clientes.size());
                EstadoReserva estado;
                if (fin.isBefore(ahora)) {
                    estado = (online && rnd.nextDouble() < 0.14) ? EstadoReserva.CANCELADA : EstadoReserva.FINALIZADA;
                } else if (inicio.isBefore(ahora)) {
                    estado = EstadoReserva.CHECKIN;
                } else {
                    estado = EstadoReserva.CONFIRMADA;
                }

                BigDecimal monto = tarifaService.calcularTarifa(hab, mod);
                List<ExtraReserva> extras = new ArrayList<>();
                if (rnd.nextDouble() < 0.25) {
                    ExtraReserva e = ExtraReserva.values()[rnd.nextInt(ExtraReserva.values().length)];
                    extras.add(e);
                    monto = monto.add(e.precio);
                }
                boolean usado = estado == EstadoReserva.CHECKIN || estado == EstadoReserva.FINALIZADA;
                boolean pagada = estado != EstadoReserva.CANCELADA;

                Reserva r = reservaRepo.save(Reserva.builder()
                        .habitacion(hab)
                        .nombreHuesped(c.nombre())
                        .telefono(c.telefono())
                        .email(online ? c.email() : null)
                        .fecha(fecha)
                        .horaIngreso(ingreso)
                        .horaSalida(ingreso.plusHours(mod.horas))
                        .notas(MARCA)
                        .estado(estado)
                        .origen(online ? OrigenReserva.ONLINE : OrigenReserva.MANUAL)
                        .qrToken(UUID.nameUUIDFromBytes(("demo-" + creadas + "-" + rnd.nextLong()).getBytes()).toString())
                        .qrUsado(usado)
                        .montoTotal(monto)
                        .adelanto(pagada && online ? monto : BigDecimal.ZERO)
                        .extras(extras.isEmpty() ? null : extras.get(0).name())
                        .build());
                // @PrePersist fija creado_en = ahora; se corrige a "unas horas antes del ingreso".
                creadoEn.add(new Object[]{inicio.minusHours(1 + rnd.nextInt(30)), r.getId()});
                ocupacion.computeIfAbsent(hab.getId(), k -> new ArrayList<>()).add(new LocalDateTime[]{inicio, fin});
                creadas++;

                if (!online && usado) {
                    boolean turnoAbierto = d == 0;
                    cobros.add(CobroCaja.builder()
                            .recepcionistaEmail(RECEPCION_EMAIL)
                            .recepcionistaNombre("Recepción Demo")
                            .habitacionNumero(String.valueOf(hab.getId()))
                            .habitacionNombre(hab.getNombre())
                            .dni(String.valueOf(10000000 + rnd.nextInt(89999999)))
                            .huespedNombre(c.nombre())
                            .duracion(mod.horas + " Horas")
                            .monto(monto)
                            .cerrado(!turnoAbierto)
                            .cierreEn(turnoAbierto ? null : fecha.atTime(23, 59))
                            .creadoEn(inicio)
                            .build());
                }
                if (d == 0 && estado == EstadoReserva.CHECKIN) ocupadasAhora.add(hab.getId());
                if (d == 0 && estado == EstadoReserva.FINALIZADA && fin.isAfter(ahora.minusHours(2))) recienSalidas.add(hab.getId());
            }
        }

        jdbc.batchUpdate("UPDATE reservas SET creado_en = ? WHERE id = ?", creadoEn);
        cobroRepo.saveAll(cobros);

        // Estado actual del rack coherente con la agenda de hoy.
        for (Habitacion h : habitaciones) {
            EstadoHabitacion e = ocupadasAhora.contains(h.getId()) ? EstadoHabitacion.OCUPADA
                    : recienSalidas.contains(h.getId()) ? EstadoHabitacion.LIMPIEZA_PENDIENTE
                    : EstadoHabitacion.DISPONIBLE;
            h.setEstado(e);
        }
        habitacionRepo.saveAll(habitaciones);
        return creadas;
    }

    private static Habitacion elegir(List<Habitacion> hs, double[] pesos, double suma, Random rnd) {
        double x = rnd.nextDouble() * suma;
        for (int i = 0; i < hs.size(); i++) {
            x -= pesos[i];
            if (x <= 0) return hs.get(i);
        }
        return hs.get(hs.size() - 1);
    }

    private static ModalidadEstadia elegirModalidad(Random rnd) {
        double x = rnd.nextDouble();
        return x < 0.15 ? ModalidadEstadia.TRES_HORAS : x < 0.85 ? ModalidadEstadia.SEIS_HORAS : ModalidadEstadia.DOCE_HORAS;
    }

    /** Franjas: madrugada 20 %, día 30 %, noche 50 %. */
    private static LocalTime elegirHora(Random rnd) {
        double x = rnd.nextDouble();
        int hora = x < 0.20 ? rnd.nextInt(6) : x < 0.50 ? 6 + rnd.nextInt(12) : 18 + rnd.nextInt(6);
        return LocalTime.of(hora, rnd.nextBoolean() ? 0 : 30);
    }

    private static boolean hayCupo(Map<Integer, List<LocalDateTime[]>> ocupacion, Habitacion h,
                                   LocalDateTime inicio, LocalDateTime fin) {
        long solapadas = ocupacion.getOrDefault(h.getId(), List.of()).stream()
                .filter(o -> o[0].isBefore(fin) && o[1].isAfter(inicio)).count();
        return solapadas < h.getCapacidadUnidades();
    }
}
