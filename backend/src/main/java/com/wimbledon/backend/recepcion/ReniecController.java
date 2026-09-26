package com.wimbledon.backend.recepcion;

import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recepcion/reniec")
@PreAuthorize("hasAnyRole('RECEPCIONISTA','ADMINISTRADOR','SUPER_ADMIN')")
@RequiredArgsConstructor
@Validated
public class ReniecController {

    private final ReniecService reniecService;

    @GetMapping("/{dni}")
    public ResponseEntity<ReniecPersonaDTO> consultar(
            @PathVariable @Pattern(regexp = "\\d{8}", message = "El DNI debe tener 8 dígitos numéricos") String dni
    ) {
        return ResponseEntity.ok(reniecService.consultarConCache(dni));
    }
}
