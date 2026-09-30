package com.wimbledon.backend.domain.enums;

import java.math.BigDecimal;

/**
 * Adicionales que el huésped puede sumar a su reserva desde el portal.
 *
 * El precio vive aquí y no en el navegador: el monto a depositar lo calcula el
 * servidor, así que alterar el precio en el cliente no cambia lo que se cobra.
 * Los tres DECO_* son excluyentes entre sí (una sola decoración por suite).
 */
public enum ExtraReserva {
    DECO_1("Pack Pasión & Globos", "60.00", true),
    DECO_2("Pack Jacuzzi & Velas", "75.00", true),
    DECO_3("Pack Luxury Aniversario", "95.00", true),
    CHAMPAGNE("Cava Helada / Champagne", "75.00", false),
    PIQUEO("Piqueo Gourmet Wimbledon", "42.00", false),
    SPA_KIT("Kit Spa & Aromaterapia", "35.00", false);

    public final String nombre;
    public final BigDecimal precio;
    public final boolean decoracion;

    ExtraReserva(String nombre, String precio, boolean decoracion) {
        this.nombre = nombre;
        this.precio = new BigDecimal(precio);
        this.decoracion = decoracion;
    }
}
