package com.wimbledon.backend.admin;

import com.wimbledon.backend.domain.Usuario;
import com.wimbledon.backend.domain.enums.EstadoCuenta;
import com.wimbledon.backend.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
@PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPER_ADMIN')")
@RequiredArgsConstructor
public class UsuarioAdminController {

    private final UsuarioRepository usuarioRepository;

    @GetMapping("/pendientes")
    public ResponseEntity<List<UsuarioPendienteDTO>> listarPendientes() {
        List<UsuarioPendienteDTO> pendientes = usuarioRepository.findByEstado(EstadoCuenta.PENDIENTE_APROBACION)
                .stream()
                .map(UsuarioPendienteDTO::from)
                .toList();
        return ResponseEntity.ok(pendientes);
    }

    @PatchMapping("/{id}/aprobar")
    public ResponseEntity<Void> aprobar(@PathVariable Integer id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con id " + id));

        if (u.getRolSolicitado() != null) {
            u.setRol(u.getRolSolicitado().toRol());
        }
        u.setEstado(EstadoCuenta.ACTIVO);
        u.setActivo(true);
        usuarioRepository.save(u);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/rechazar")
    public ResponseEntity<Void> rechazar(@PathVariable Integer id) {
        if (!usuarioRepository.existsById(id)) {
            throw new EntityNotFoundException("Usuario no encontrado con id " + id);
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
