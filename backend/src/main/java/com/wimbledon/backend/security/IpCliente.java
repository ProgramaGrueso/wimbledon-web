package com.wimbledon.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resuelve la IP real del cliente para los límites anti-abuso.
 *
 * X-Forwarded-For solo se respeta si wimbledon.proxy.confiar-x-forwarded-for=true,
 * es decir, cuando el backend corre detrás de un proxy propio que la sobrescribe.
 * Sin proxy, cualquiera podría inventar esa cabecera y saltarse el límite por IP.
 */
@Component
public class IpCliente {

    @Value("${wimbledon.proxy.confiar-x-forwarded-for:false}")
    private boolean confiarXForwardedFor;

    public String de(HttpServletRequest request) {
        if (confiarXForwardedFor) {
            String xf = request.getHeader("X-Forwarded-For");
            if (xf != null && !xf.isBlank()) {
                return xf.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
