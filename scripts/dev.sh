#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no encontrado. Instala Docker Desktop o ejecuta Redis localmente." >&2
  exit 1
fi

container_name="unemi-api-redis"
if docker inspect "$container_name" >/dev/null 2>&1; then
  image_name="$(docker inspect -f '{{.Config.Image}}' "$container_name" 2>/dev/null || true)"
  if [ -n "$image_name" ] && [[ "$image_name" != redis* ]]; then
    echo "El contenedor $container_name ya existe pero no es Redis (imagen: $image_name)." >&2
    exit 1
  fi

  state="$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || true)"
  if [ "$state" != "running" ]; then
    echo "Redis ya existe pero esta detenido. Iniciando..."
    docker start "$container_name" >/dev/null
  else
    echo "Redis ya esta en ejecucion."
  fi
else
  echo "Levantando Redis con Docker..."
  compose up -d redis
  container_id="$(compose ps -q redis 2>/dev/null || true)"
  if [ -n "$container_id" ]; then
    container_name="$container_id"
  fi
fi

echo "Esperando a que Redis este saludable..."
timeout_seconds=60
start_ts="$(date +%s)"
while true; do
  state="$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")"
  if [ "$state" != "running" ]; then
    echo "Redis no esta en ejecucion (state=$state)." >&2
    docker logs "$container_name" | tail -n 50 || true
    exit 1
  fi

  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_name" 2>/dev/null || echo "unknown")"

  if [ "$status" = "healthy" ]; then
    break
  fi

  if [ "$status" = "unhealthy" ]; then
    echo "Redis esta unhealthy. Revisa logs:" >&2
    docker logs "$container_name" | tail -n 50 || true
    exit 1
  fi

  if [ "$status" = "no-healthcheck" ] || [ "$status" = "unknown" ]; then
    if docker exec "$container_name" redis-cli ping >/dev/null 2>&1; then
      break
    fi
  fi

  now_ts="$(date +%s)"
  if [ $((now_ts - start_ts)) -ge $timeout_seconds ]; then
    echo "Timeout esperando healthcheck de Redis." >&2
    docker logs "$container_name" | tail -n 50 || true
    exit 1
  fi

  sleep 2
done

export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export NODE_ENV="${NODE_ENV:-development}"

echo "Redis OK. Iniciando Nest en modo desarrollo..."
run_nest() {
  if command -v node >/dev/null 2>&1; then
    yarn start:dev
    return $?
  fi

  if command -v cmd.exe >/dev/null 2>&1; then
    echo "Node no encontrado en este entorno (WSL). Usando Windows Node via cmd.exe..."
    cmd.exe /c "yarn start:dev"
    return $?
  fi

  echo "Node no encontrado. Instala Node en WSL o ejecuta este script desde Windows." >&2
  return 1
}

set +e
run_nest
exit_code=$?
set -e

if [ "$exit_code" -eq 130 ] || [ "$exit_code" -eq 255 ]; then
  echo "Detenido por el usuario."
  exit 0
fi

exit "$exit_code"
