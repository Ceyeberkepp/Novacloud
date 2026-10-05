#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this installer as root: sudo ./install.sh"
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Unable to identify this operating system."
  exit 1
fi

source /etc/os-release
if [[ "${ID}" != "debian" || "${VERSION_ID%%.*}" -lt 12 ]]; then
  echo "This installer supports Debian 12 and Debian 13 LXCs."
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/novacloud"
DB_NAME="novacloud"
DB_USER="novacloud"
DB_PASSWORD=""
SESSION_SECRET=""

echo "Cyverax Nova LXC installer"
APP_HOST="${NOVA_APP_HOST:-}"
if [[ -z "${APP_HOST}" ]]; then
  read -rp "Web hostname or IP address: " APP_HOST
fi
APP_HOST="${APP_HOST:-_}"
if [[ "${APP_HOST}" == */* ]]; then
  echo "Using host ${APP_HOST%%/*}; CIDR suffixes are not used in web addresses."
  APP_HOST="${APP_HOST%%/*}"
fi
ADMIN_NAME="${NOVA_ADMIN_NAME:-}"
if [[ -z "${ADMIN_NAME}" ]]; then
  read -rp "Administrator name [Nova Administrator]: " ADMIN_NAME
fi
ADMIN_NAME="${ADMIN_NAME:-Nova Administrator}"
ADMIN_EMAIL="${NOVA_ADMIN_EMAIL:-}"
if [[ -z "${ADMIN_EMAIL}" ]]; then
  read -rp "Administrator email: " ADMIN_EMAIL
fi
while [[ ! "${ADMIN_EMAIL}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; do
  read -rp "Enter a valid administrator email: " ADMIN_EMAIL
done
ADMIN_PASSWORD="${NOVA_ADMIN_PASSWORD:-}"
if [[ -z "${ADMIN_PASSWORD}" ]]; then
  while true; do
    read -rsp "Administrator password (minimum 12 characters): " ADMIN_PASSWORD
    echo
    if [[ ${#ADMIN_PASSWORD} -ge 12 ]]; then break; fi
    echo "Password must contain at least 12 characters."
  done
  read -rsp "Confirm administrator password: " ADMIN_PASSWORD_CONFIRM
  echo
  if [[ "${ADMIN_PASSWORD}" != "${ADMIN_PASSWORD_CONFIRM}" ]]; then
    echo "Passwords do not match."
    exit 1
  fi
elif [[ ${#ADMIN_PASSWORD} -lt 12 ]]; then
  echo "NOVA_ADMIN_PASSWORD must contain at least 12 characters."
  exit 1
fi
GEMINI_API_KEY="${NOVA_GEMINI_API_KEY:-}"
if [[ -z "${NOVA_UNATTENDED:-}" ]]; then
  read -rp "Optional Gemini API key (press Enter to skip): " GEMINI_API_KEY
fi

PROXMOX_HOST="${NOVA_PROXMOX_HOST:-}"
PROXMOX_TOKEN_ID="${NOVA_PROXMOX_TOKEN_ID:-}"
PROXMOX_TOKEN_SECRET="${NOVA_PROXMOX_TOKEN_SECRET:-}"
PROXMOX_VERIFY_TLS="${NOVA_PROXMOX_VERIFY_TLS:-true}"
if [[ -z "${NOVA_UNATTENDED:-}" ]]; then
  read -rp "Optional Proxmox API URL, e.g. https://10.0.0.10:8006 (press Enter to skip): " PROXMOX_HOST
  if [[ -n "${PROXMOX_HOST}" ]]; then
    read -rp "Proxmox API token ID (user@realm!token): " PROXMOX_TOKEN_ID
    read -rsp "Proxmox API token secret: " PROXMOX_TOKEN_SECRET
    echo
    read -rp "Verify Proxmox TLS certificate? [Y/n]: " PROXMOX_TLS_ANSWER
    if [[ "${PROXMOX_TLS_ANSWER:-Y}" =~ ^[Nn]$ ]]; then
      PROXMOX_VERIFY_TLS="false"
    else
      PROXMOX_VERIFY_TLS="true"
    fi
  fi
fi

echo "Installing system packages..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git gnupg nginx openssl postgresql postgresql-contrib rsync
DB_PASSWORD="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 48)"

mkdir -p "${APP_DIR}"
if [[ "${SOURCE_DIR}" != "${APP_DIR}" ]]; then
  rsync -a --exclude='.env' --exclude='node_modules/' --exclude='dist/' "${SOURCE_DIR}/" "${APP_DIR}/"
fi

NODE_MAJOR="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)"
if [[ -z "${NODE_MAJOR}" || "${NODE_MAJOR}" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

systemctl enable --now postgresql nginx
runuser -u postgres -- psql --set=ON_ERROR_STOP=1 --set=db_password="${DB_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE novacloud LOGIN PASSWORD %L', :'db_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'novacloud')\gexec
SELECT format('ALTER ROLE novacloud PASSWORD %L', :'db_password')\gexec
SELECT 'CREATE DATABASE novacloud OWNER novacloud'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'novacloud')\gexec
SQL

APP_URL="http://${APP_HOST}"
COOKIE_SECURE="false"
cat > "${APP_DIR}/.env" <<EOF
PORT=3000
APP_URL=${APP_URL}
COOKIE_SECURE=${COOKIE_SECURE}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
GEMINI_API_KEY=${GEMINI_API_KEY}
PROXMOX_HOST=${PROXMOX_HOST}
PROXMOX_TOKEN_ID=${PROXMOX_TOKEN_ID}
PROXMOX_TOKEN_SECRET=${PROXMOX_TOKEN_SECRET}
PROXMOX_VERIFY_TLS=${PROXMOX_VERIFY_TLS}
EOF
chmod 600 "${APP_DIR}/.env"

cd "${APP_DIR}"
npm install
npm run db:migrate
ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" ADMIN_NAME="${ADMIN_NAME}" npm run admin:create
npm run build

if ! id novacloud >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin novacloud
fi
chown -R novacloud:novacloud "${APP_DIR}/dist" "${APP_DIR}/node_modules"
chown novacloud:novacloud "${APP_DIR}/.env"

cat > /etc/systemd/system/novacloud.service <<EOF
[Unit]
Description=Cyverax Nova Cloud Console
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=novacloud
Group=novacloud
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node ${APP_DIR}/dist/server.cjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/novacloud <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/novacloud /etc/nginx/sites-enabled/novacloud
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl daemon-reload
systemctl enable novacloud
systemctl restart novacloud
systemctl reload nginx

if [[ "${APP_HOST}" != "_" && ! "${APP_HOST}" =~ ^[0-9.]+$ ]]; then
  ENABLE_TLS="${NOVA_ENABLE_TLS:-}"
  if [[ -z "${ENABLE_TLS}" ]]; then
    read -rp "Configure free Let's Encrypt HTTPS now? [Y/n]: " ENABLE_TLS
  fi
  ENABLE_TLS="${ENABLE_TLS:-Y}"
  if [[ "${ENABLE_TLS}" =~ ^[Yy]$ ]]; then
    TLS_EMAIL="${NOVA_TLS_EMAIL:-}"
    if [[ -z "${TLS_EMAIL}" ]]; then
      read -rp "Email for certificate notices: " TLS_EMAIL
    fi
    DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
    if certbot --nginx --non-interactive --agree-tos --redirect -m "${TLS_EMAIL}" -d "${APP_HOST}"; then
      sed -i 's/^APP_URL=.*/APP_URL=https:\/\/'"${APP_HOST}"'/' "${APP_DIR}/.env"
      sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' "${APP_DIR}/.env"
      systemctl restart novacloud
      APP_URL="https://${APP_HOST}"
    else
      echo "HTTPS was not enabled. Confirm DNS points to this LXC, then run certbot --nginx -d ${APP_HOST}."
    fi
  fi
fi

HEALTHY="false"
for _ in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null; then
    HEALTHY="true"
    break
  fi
  sleep 1
done
if [[ "${HEALTHY}" != "true" ]]; then
  echo "Nova did not become healthy within 30 seconds."
  systemctl status novacloud --no-pager --full || true
  journalctl -u novacloud -n 50 --no-pager || true
  exit 1
fi
echo
echo "Cyverax Nova installation completed."
echo "Open: ${APP_URL}"
echo "Admin: ${ADMIN_EMAIL}"
echo "Service status: systemctl status novacloud"
