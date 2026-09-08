package com.wimbledon.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Servicio centralizado para operaciones JWT (jjwt 0.12.x).
 *
 * El token incluye:
 *  - sub: email del usuario
 *  - rol: nombre del enum Rol (ej. "RECEPCIONISTA")
 *  - iat / exp: emitido / expira
 */
@Service
public class JwtService {

    @Value("${wimbledon.jwt.secret}")
    private String jwtSecret;

    @Value("${wimbledon.jwt.expiration}")
    private long jwtExpiration;

    // ── Generación ────────────────────────────────────────────────────────────

    public String generarToken(UserDetails userDetails) {
        return generarToken(new HashMap<>(), userDetails);
    }

    public String generarToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        // Agregamos el rol como claim adicional para que el frontend
        // pueda leerlo sin necesidad de llamar a /api/auth/me en cada carga
        extraClaims.put("rol",
                userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse(""));

        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())    // email
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    // ── Validación ────────────────────────────────────────────────────────────

    public boolean esTokenValido(String token, UserDetails userDetails) {
        final String email = extraerEmail(token);
        return email.equals(userDetails.getUsername()) && !estaExpirado(token);
    }

    // ── Extracción de claims ───────────────────────────────────────────────────

    public String extraerEmail(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    public String extraerRol(String token) {
        return extraerClaim(token, claims -> claims.get("rol", String.class));
    }

    public <T> T extraerClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extraerTodosLosClaims(token);
        return claimsResolver.apply(claims);
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    private boolean estaExpirado(String token) {
        return extraerExpiracion(token).before(new Date());
    }

    private Date extraerExpiracion(String token) {
        return extraerClaim(token, Claims::getExpiration);
    }

    private Claims extraerTodosLosClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
