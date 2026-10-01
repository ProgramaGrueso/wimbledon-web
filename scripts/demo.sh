#!/usr/bin/env bash
# Levanta la demo completa en este PC y la publica con un túnel de Cloudflare:
#   MySQL (Docker) → backend Spring Boot (:8081) → frontend Vite (:5173) → túnel público
# Uso:  bash scripts/demo.sh        (Ctrl+C para apagar todo)
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="${TMPDIR:-/tmp}/wimbledon-demo"
JDK21="/usr/lib/jvm/java-21-openjdk"
mkdir -p "$LOGS"

pids=()
apagar() {
  echo -e "\nApagando la demo…"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap apagar EXIT INT TERM

esperar() { # esperar <archivo-log> <patrón> <segundos> <nombre>
  for _ in $(seq 1 "$3"); do
    grep -q -E "$2" "$1" 2>/dev/null && return 0
    sleep 1
  done
  echo "✗ $4 no arrancó. Revisa $1"; exit 1
}

for puerto in 8081 5173; do
  if ss -ltn | grep -q ":$puerto "; then
    echo "✗ El puerto $puerto ya está en uso. Cierra lo que lo ocupa y vuelve a intentarlo."; exit 1
  fi
done

echo "1/4 MySQL…"
docker start wimbledon-mysql >/dev/null
for _ in $(seq 1 60); do
  docker exec wimbledon-mysql mysqladmin ping --silent 2>/dev/null && break
  sleep 1
done

echo "2/4 Backend…"
# confiar-x-forwarded-for=true: detrás del túnel cada visitante conserva su IP real
# (si no, todos comparten la IP de este PC y el límite de reservas por IP los bloquea).
(cd "$RAIZ/backend" && JAVA_HOME="$JDK21" mvn -q -o spring-boot:run \
  -Dspring-boot.run.arguments=--wimbledon.proxy.confiar-x-forwarded-for=true \
  >"$LOGS/backend.log" 2>&1) &
pids+=($!)
esperar "$LOGS/backend.log" "Started WimbledonApplication|APPLICATION FAILED|BUILD FAILURE" 180 "El backend"
grep -q "Started WimbledonApplication" "$LOGS/backend.log" || { echo "✗ El backend falló. Revisa $LOGS/backend.log"; exit 1; }

echo "3/4 Frontend…"
if node --version >/dev/null 2>&1; then
  (cd "$RAIZ/frontend" && npx vite --port 5173 --strictPort >"$LOGS/frontend.log" 2>&1) &
else
  (cd "$RAIZ/frontend" && bun --bun ./node_modules/.bin/vite --port 5173 --strictPort >"$LOGS/frontend.log" 2>&1) &
fi
pids+=($!)
esperar "$LOGS/frontend.log" "Local:" 60 "El frontend"

echo "4/4 Túnel…"
cloudflared tunnel --url http://localhost:5173 >"$LOGS/tunel.log" 2>&1 &
pids+=($!)
esperar "$LOGS/tunel.log" "https://[a-z0-9-]+\.trycloudflare\.com" 60 "El túnel"
URL="$(grep -o -E 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOGS/tunel.log" | head -1)"

cat <<EOF

✅ Demo en línea
   Web pública:  $URL
   Panel admin:  $URL/admin.html
   En este PC:   http://localhost:5173

   La URL cambia cada vez que ejecutas este script.
   No cierres esta terminal ni suspendas el PC. Ctrl+C apaga todo.
   Logs en $LOGS
EOF

# Evita que el PC se suspenda mientras la demo está en línea.
systemd-inhibit --what=sleep:idle --who="Wimbledon demo" --why="Demo en línea" \
  bash -c 'while true; do sleep 3600; done' &
pids+=($!)
wait
