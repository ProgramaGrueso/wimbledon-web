package com.wimbledon.backend.recepcion;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

/**
 * Identidad del operador que ejecuta una operacion de recepcion.
 *
 * Los tres campos provienen de la \`Authentication\` que construye
 * \`JwtAuthFilter\`, NUNCA del claim \`rol\` del JWT:
 *
 *  - \`email\` de \`Authentication.getName()\`, que es \`Usuario.getUsername()\`.
 *  - \`rol\` de \`Authentication.getAuthorities()\`, que \`Usuario.getAuthorities()\`
 *    deriva de la columna \`rol\` de la base de datos.
 *  - \`ip\` de \`((WebAuthenticationDetails) auth.getDetails()).getRemoteAddress()\`,
 *    que el filtro ya adjunta a la autenticacion.
 *
 * El claim \`rol\` es de presentacion para el frontend y nunca alcanza
 * \`@PreAuthorize\`, de modo que un registro construido sobre el seria
 * falsificable por quien puede alterar su propio token. Esta factorizacion
 * existe para que no exista ninguna forma de construir el registro por otra
 * via: el unico constructor publico es este.
 */
public record OperadorOperacion(String email, String rol, String ip) {

    /**
     * Deriva la identidad del operador desde la autenticacion en curso.
     *
     * @param authentication autenticacion construida por \`JwtAuthFilter\`
     * @throws IllegalStateException si no hay authorities, lo que seria una
     *         autenticacion imposible en el flujo real
     */
    public static OperadorOperacion desde(Authentication authentication) {
        return new OperadorOperacion(
                authentication.getName(),
                rolEfectivo(authentication.getAuthorities()),
                direccionIp(authentication));
    }

    /**
     * Primer rol efectivo de las autoridades, sin el prefijo \`ROLE_\` de
     * Spring. Proviene de la columna \`rol\` de la base, no del token.
     */
    private static String rolEfectivo(java.util.Collection<? extends GrantedAuthority> authorities) {
        return authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .filter(autoridad -> autoridad.startsWith("ROLE_"))
                .map(autoridad -> autoridad.substring("ROLE_".length()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "La autenticacion no expone ningun rol efectivo en sus autoridades."));
    }

    /**
     * Direccion de origen que el filtro ya adjunto. No se inyecta
     * \`HttpServletRequest\` en la capa de servicio: atarla al transporte no
     * anade garantia alguna.
     */
    private static String direccionIp(Authentication authentication) {
        Object detalles = authentication.getDetails();
        if (detalles instanceof WebAuthenticationDetails web) {
            return web.getRemoteAddress();
        }
        return null;
    }
}
