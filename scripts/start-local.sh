#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5500}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_in_use() {
  local port="$1"
  if command_exists nc; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return $?
  fi

  if command_exists python3; then
    python3 - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sys.exit(0 if sock.connect_ex(("127.0.0.1", port)) == 0 else 1)
PY
    return $?
  fi

  return 1
}

if port_in_use "$API_PORT"; then
  echo "A porta $API_PORT ja esta em uso. Encerre o processo atual ou informe outra porta com API_PORT=." >&2
  exit 1
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "A porta $FRONTEND_PORT ja esta em uso. Encerre o processo atual ou informe outra porta com FRONTEND_PORT=." >&2
  exit 1
fi

if [[ -x "$BACKEND_DIR/mvnw" ]]; then
  MAVEN_CMD="$BACKEND_DIR/mvnw"
elif command_exists mvn; then
  MAVEN_CMD="mvn"
else
  echo "Maven nao foi encontrado. Instale Maven ou rode a API manualmente." >&2
  exit 1
fi

if command_exists python3; then
  PYTHON_CMD="python3"
elif command_exists python; then
  PYTHON_CMD="python"
else
  echo "Python 3 nao foi encontrado. Instale Python ou rode o frontend manualmente com outro servidor estatico." >&2
  exit 1
fi

API_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Iniciando API na porta $API_PORT..."
(
  cd "$BACKEND_DIR"
  "$MAVEN_CMD" spring-boot:run "-Dspring-boot.run.arguments=--server.port=$API_PORT"
) &
API_PID="$!"

echo "Iniciando frontend na porta $FRONTEND_PORT..."
"$PYTHON_CMD" -m http.server "$FRONTEND_PORT" --directory "$FRONTEND_DIR" &
FRONTEND_PID="$!"

echo
echo "API:      http://localhost:$API_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT/index.html"
echo
echo "Pressione Enter para encerrar API e frontend."

read -r _
