# Skill Registry — Hotel Wimbledon (`wimbledon-web`)

Índice de skills disponibles para este workspace. Este archivo es un **índice, no un resumen generado**: los subagentes reciben rutas exactas y leen el `SKILL.md` completo como fuente de verdad.

- **Generado:** 2026-09-25 (fase `sdd-init`)
- **Raíz del workspace:** `/mnt/Datos/wimbledon-web`
- **Precedencia:** skills de proyecto sobre skills de usuario, con deduplicación por nombre
- **Excluidas:** `sdd-*`, `_shared` y `skill-registry` (infraestructura del pipeline, no estándares del proyecto)
- **Convenciones:** `.agents/AGENTS.md` (canónico), `.agents/agents.md` (duplicado por diferencia de casing)

---

## Project Skills (scope: `project`)

| Name | Trigger | Path | Scope |
| ---- | ------- | ---- | ----- |
| `redteam-security` | Auditoría de seguridad del backend Spring Boot 3 y del frontend: bypass de autenticación/RBAC, inyección de inputs, tokens JWT, almacenamiento en cliente y lógica de reservas. | `/mnt/Datos/wimbledon-web/.agents/skills/redteam-security/SKILL.md` | project |
| `ui-critique` | Auditoría UX/UI, accesibilidad, consistencia visual y alineación con el flujo BPMN del portal y del panel administrativo; flujos de reserva y check-in. | `/mnt/Datos/wimbledon-web/.agents/skills/ui-critique/SKILL.md` | project |

### Referencias de skills de proyecto

| Path | Contenido |
| ---- | --------- |
| `/mnt/Datos/wimbledon-web/.agents/skills/redteam-security/references/backend-endpoints-map.md` | Mapa de endpoints del backend para la auditoría |
| `/mnt/Datos/wimbledon-web/.agents/skills/ui-critique/references/rack-heuristics.md` | Heurísticas de evaluación del Rack |

---

## User Skills (scope: `user`)

Origen canónico: `/home/juang/.config/opencode/skills/`. Los directorios `~/.gemini/skills/` y `~/.copilot/skills/` contienen copias idénticas y se deduplicaron por nombre.

| Name | Trigger | Path | Scope |
| ---- | ------- | ---- | ----- |
| `chained-pr` | PRs de más de 400 líneas, PRs encadenados y franjas de revisión. Divide cambios sobredimensionados en PRs encadenados que protejan el foco de la revisión. | `/home/juang/.config/opencode/skills/chained-pr/SKILL.md` | user |
| `cognitive-doc-design` | Diseño de documentación que reduce la carga cognitiva: guías, README, RFC, onboarding y arquitectura. | `/home/juang/.config/opencode/skills/cognitive-doc-design/SKILL.md` | user |
| `judgment-day` | Revisión dual ciega y revisión adversarial, con máximo dos rondas acotadas de corrección. | `/home/juang/.config/opencode/skills/judgment-day/SKILL.md` | user |
| `skill-creator` | Creación de nuevas skills e instrucciones de agente con frontmatter válido. | `/home/juang/.config/opencode/skills/skill-creator/SKILL.md` | user |
| `skill-improver` | Auditoría y mejora de skills existentes: estructura, triggers y calidad LLM-first. | `/home/juang/.config/opencode/skills/skill-improver/SKILL.md` | user |
| `work-unit-commits` | Planificación de commits como unidades de trabajo revisables; separación de código, tests y documentación. | `/home/juang/.config/opencode/skills/work-unit-commits/SKILL.md` | user |
| `go-testing` | Patrones de testing en Go. **No aplica a este workspace** (no hay proyectos Go). | `/home/juang/.config/opencode/skills/go-testing/SKILL.md` | user |

---

## Project Convention Files

| Path | Rol |
| ---- | --- |
| `/mnt/Datos/wimbledon-web/.agents/AGENTS.md` | Índice canónico del equipo de agentes de aseguramiento de calidad. Define los dos agentes especializados (`UI-Critic` y `RedTeam`), su foco técnico, cuándo invocarlos, sus límites y el formato obligatorio de reporte. |
| `/mnt/Datos/wimbledon-web/.agents/agents.md` | Duplicado por diferencia de casing. Solo difiere en la tabla 1, donde cita rutas alternativas de skills. No usar como fuente de verdad. |

### Archivos referenciados desde el índice

| Path | Referenciado en |
| ---- | --------------- |
| `/mnt/Datos/wimbledon-web/.agents/skills/ui-critique/SKILL.md` | `.agents/AGENTS.md` §1 y §2.1 |
| `/mnt/Datos/wimbledon-web/.agents/skills/redteam-security/SKILL.md` | `.agents/AGENTS.md` §1 y §2.2 |
| `/mnt/Datos/wimbledon-web/exposicion/avanze1/arquitectura/01-RBAC-Hotel-Wimbledon.md` | Javadoc de `backend/.../domain/enums/Rol.java` (matriz RBAC completa) |

---

## Resumen de cobertura

- **Project skills:** 2 (`redteam-security`, `ui-critique`) — únicas normas locales del proyecto.
- **User skills indexadas:** 7, de las cuales `go-testing` no aplica a este stack.
- **Convention files:** 1 canónico más 1 duplicado.
- **Directorios de skills de usuario ausentes:** `~/.pi/agent/skills`, `~/.config/agents/skills`, `~/.agents/skills`, `~/.kimi/skills`, `~/.config/kilo/skills`, `~/.claude/skills`, `~/.gemini/antigravity/skills`, `~/.cursor/skills`, `~/.codex/skills`, `~/.codeium/windsurf/skills`, `~/.qwen/skills`, `~/.kiro/skills`, `~/.openclaw/skills`.
- **Directorios de skills de proyecto ausentes:** `skills/`, `.opencode/skills/`, `.claude/skills/`, `.gemini/skills/`, `.cursor/skills/`, `.github/skills/`, `.codex/skills/`, `.qwen/skills/`, `.kiro/skills/`, `.openclaw/skills/`, `.pi/skills/`, `.agent/skills/`, `.atl/skills/`. El único existente es `.agents/skills/`.
- **Nota de procedencia:** este registro se creó durante la fase `sdd-init`. Antes de esa fase no existía ni `.atl/skill-registry.md` ni una entrada `skill-registry` en Engram.
