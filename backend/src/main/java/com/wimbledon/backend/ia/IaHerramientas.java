package com.wimbledon.backend.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.wimbledon.backend.cliente.CrearReservaRequest;
import com.wimbledon.backend.cliente.DatosPago;
import com.wimbledon.backend.cliente.HabitacionPublicaResponse;
import com.wimbledon.backend.cliente.ReservaResponse;
import com.wimbledon.backend.cliente.ReservaService;
import com.wimbledon.backend.cliente.TarifaService;
import com.wimbledon.backend.domain.enums.ExtraReserva;
import com.wimbledon.backend.domain.enums.ModalidadEstadia;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Funciones que el modelo puede llamar. Todas pasan por ReservaService, así que
 * las mismas reglas del portal (solapamientos, límites, tarifas) valen para el chat:
 * el modelo nunca confirma nada por su cuenta.
 */
@Component
@RequiredArgsConstructor
public class IaHerramientas {

    private final ObjectMapper mapper;
    private final ReservaService reservaService;
    private final TarifaService tarifaService;
    private final DatosPago datosPago;

    /** Definiciones (JSON Schema) que se envían al modelo. */
    public ArrayNode definiciones() {
        ArrayNode herramientas = mapper.createArrayNode();

        herramientas.add(definicion("listar_habitaciones",
                "Lista las habitaciones con precios por modalidad (3, 6 y 12 horas). "
                        + "Si das fecha y hora_ingreso, 'disponible' refleja ese horario; si no, el estado actual.",
                objeto(
                        propiedad("fecha", "string", "Fecha YYYY-MM-DD (opcional)"),
                        propiedad("hora_ingreso", "string", "Hora HH:mm (opcional)"),
                        propiedad("modalidad", "string", "TRES_HORAS, SEIS_HORAS o DOCE_HORAS (opcional)")),
                List.of()));

        herramientas.add(definicion("ver_horarios",
                "Horas de ingreso libres u ocupadas de una habitación en una fecha.",
                objeto(
                        propiedad("habitacion_id", "integer", "Id de la habitación"),
                        propiedad("fecha", "string", "Fecha YYYY-MM-DD"),
                        propiedad("modalidad", "string", "TRES_HORAS, SEIS_HORAS o DOCE_HORAS (opcional)")),
                List.of("habitacion_id", "fecha")));

        ObjectNode propsReserva = objeto(
                propiedad("habitacion_id", "integer", "Id de la habitación"),
                propiedad("fecha", "string", "Fecha YYYY-MM-DD"),
                propiedad("hora_ingreso", "string", "Hora HH:mm"),
                propiedad("modalidad", "string", "TRES_HORAS, SEIS_HORAS o DOCE_HORAS"),
                propiedad("nombre_completo", "string", "Nombre del huésped"),
                propiedad("telefono", "string", "Celular del huésped"));
        ObjectNode extras = mapper.createObjectNode().put("type", "array");
        ObjectNode itemsExtras = extras.putObject("items").put("type", "string");
        ArrayNode valores = itemsExtras.putArray("enum");
        Arrays.stream(ExtraReserva.values()).forEach(e -> valores.add(e.name()));
        extras.put("description", "Adicionales opcionales; máximo una decoración (DECO_*)");
        ((ObjectNode) propsReserva.get("properties")).set("extras", extras);

        herramientas.add(definicion("crear_reserva",
                "Crea la reserva (queda PENDIENTE hasta que el huésped deposite). "
                        + "Úsala SOLO cuando el usuario ya confirmó todos los datos.",
                propsReserva,
                List.of("habitacion_id", "fecha", "hora_ingreso", "modalidad", "nombre_completo", "telefono")));

        return herramientas;
    }

    /** Ejecuta una función y devuelve texto JSON para el modelo. Los errores también son datos. */
    public String ejecutar(String nombre, String argumentosJson, String ip) {
        try {
            JsonNode a = mapper.readTree(argumentosJson == null || argumentosJson.isBlank() ? "{}" : argumentosJson);
            return switch (nombre) {
                case "listar_habitaciones" -> listarHabitaciones(a);
                case "ver_horarios" -> verHorarios(a);
                case "crear_reserva" -> crearReserva(a, ip);
                default -> error("Función desconocida.");
            };
        } catch (RuntimeException | java.io.IOException e) {
            // Los mensajes de ReservaService ya están redactados para el huésped.
            return error(e.getMessage() == null ? "No se pudo completar la acción." : e.getMessage());
        }
    }

    // ── Implementaciones ──────────────────────────────────────────────────────

    private String listarHabitaciones(JsonNode a) {
        LocalDate fecha = fecha(a, "fecha");
        LocalTime hora = hora(a, "hora_ingreso");
        ModalidadEstadia modalidad = modalidad(a);
        Integer duracion = modalidad == null ? null : modalidad.horas;

        List<HabitacionPublicaResponse> habitaciones =
                reservaService.listarHabitacionesConDisponibilidad(fecha, hora, duracion);

        ArrayNode salida = mapper.createArrayNode();
        for (HabitacionPublicaResponse h : habitaciones) {
            ObjectNode o = salida.addObject();
            o.put("id", h.id());
            o.put("nombre", h.nombre());
            o.put("tipo", h.tipo());
            o.put("disponible", Boolean.TRUE.equals(h.disponible()));
            o.put("precio_3h", tarifaService.tarifaSobreBase(h.tarifaBase(), ModalidadEstadia.TRES_HORAS).toPlainString());
            o.put("precio_6h", tarifaService.tarifaSobreBase(h.tarifaBase(), ModalidadEstadia.SEIS_HORAS).toPlainString());
            o.put("precio_12h", tarifaService.tarifaSobreBase(h.tarifaBase(), ModalidadEstadia.DOCE_HORAS).toPlainString());
            if (h.descripcion() != null) {
                String d = h.descripcion().strip();
                o.put("resumen", d.length() > 140 ? d.substring(0, 140) : d);
            }
        }
        return salida.toString();
    }

    private String verHorarios(JsonNode a) {
        Integer id = a.path("habitacion_id").isInt() ? a.path("habitacion_id").asInt() : null;
        LocalDate fecha = fecha(a, "fecha");
        if (id == null || fecha == null) return error("Faltan habitacion_id o fecha.");
        ModalidadEstadia modalidad = modalidad(a);
        var horarios = reservaService.listarHorarios(id, fecha, modalidad == null ? null : modalidad.horas);

        ArrayNode libres = mapper.createArrayNode();
        horarios.stream().filter(h -> h.disponible()).forEach(h -> libres.add(h.hora().toString()));
        ObjectNode o = mapper.createObjectNode();
        o.set("horas_libres", libres);
        return o.toString();
    }

    private String crearReserva(JsonNode a, String ip) {
        Integer id = a.path("habitacion_id").isInt() ? a.path("habitacion_id").asInt() : null;
        LocalDate fecha = fecha(a, "fecha");
        LocalTime hora = hora(a, "hora_ingreso");
        ModalidadEstadia modalidad = modalidad(a);
        String nombre = a.path("nombre_completo").asText("").strip();
        String telefono = a.path("telefono").asText("").strip();

        if (id == null || fecha == null || hora == null || modalidad == null) {
            return error("Faltan datos: habitación, fecha, hora de ingreso o modalidad.");
        }
        if (nombre.isEmpty() || nombre.length() > 150) return error("Nombre inválido.");
        if (telefono.isEmpty() || telefono.length() > 30) return error("Celular inválido.");
        if (fecha.isBefore(LocalDate.now())) return error("La fecha no puede ser en el pasado.");

        List<ExtraReserva> extras = new ArrayList<>();
        for (JsonNode e : a.path("extras")) {
            try {
                extras.add(ExtraReserva.valueOf(e.asText()));
            } catch (IllegalArgumentException ex) {
                return error("Adicional desconocido: " + e.asText());
            }
        }
        if (extras.stream().filter(e -> e.decoracion).count() > 1) {
            return error("Solo se permite una decoración por reserva.");
        }

        CrearReservaRequest req = new CrearReservaRequest(
                id, fecha, hora, nombre, telefono, null, "Reservado desde el asistente", modalidad, extras);
        ReservaResponse r = reservaService.crearReserva(req, null, ip, null);

        ObjectNode o = mapper.createObjectNode();
        o.put("reserva_creada", true);
        o.put("codigo", r.codigo());
        o.put("habitacion", r.habitacion().nombre());
        o.put("fecha", r.fecha().toString());
        o.put("hora_ingreso", r.horaIngreso().toString());
        o.put("hora_salida", r.horaSalida().toString());
        o.put("monto_a_depositar_soles", r.montoTotal().toPlainString());
        o.put("minutos_para_depositar", r.segundosRestantes() == null ? 0 : r.segundosRestantes() / 60);
        o.put("yape_plin", datosPago.yapePlin());
        o.put("whatsapp_voucher", datosPago.whatsapp());
        return o.toString();
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    private String error(String mensaje) {
        return mapper.createObjectNode().put("error", mensaje).toString();
    }

    private LocalDate fecha(JsonNode a, String campo) {
        String v = a.path(campo).asText("");
        try { return v.isBlank() ? null : LocalDate.parse(v); } catch (RuntimeException e) { return null; }
    }

    private LocalTime hora(JsonNode a, String campo) {
        String v = a.path(campo).asText("");
        try { return v.isBlank() ? null : LocalTime.parse(v); } catch (RuntimeException e) { return null; }
    }

    private ModalidadEstadia modalidad(JsonNode a) {
        String v = a.path("modalidad").asText("");
        try { return v.isBlank() ? null : ModalidadEstadia.valueOf(v); } catch (IllegalArgumentException e) { return null; }
    }

    private ObjectNode definicion(String nombre, String descripcion, ObjectNode parametros, List<String> requeridos) {
        ArrayNode req = parametros.putArray("required");
        requeridos.forEach(req::add);
        ObjectNode fn = mapper.createObjectNode();
        fn.put("name", nombre);
        fn.put("description", descripcion);
        fn.set("parameters", parametros);
        ObjectNode envoltura = mapper.createObjectNode();
        envoltura.put("type", "function");
        envoltura.set("function", fn);
        return envoltura;
    }

    private ObjectNode objeto(ObjectNode... propiedades) {
        ObjectNode esquema = mapper.createObjectNode().put("type", "object");
        ObjectNode props = esquema.putObject("properties");
        for (ObjectNode p : propiedades) {
            props.set(p.get("nombre").asText(), p.get("def"));
        }
        return esquema;
    }

    private ObjectNode propiedad(String nombre, String tipo, String descripcion) {
        ObjectNode p = mapper.createObjectNode().put("nombre", nombre);
        p.putObject("def").put("type", tipo).put("description", descripcion);
        return p;
    }
}
