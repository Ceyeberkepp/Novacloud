#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_RAW="https://raw.githubusercontent.com/Ceyeberkepp/Novacloud/main"

die() {
  echo "Error: $*" >&2
  exit 1
}

[[ ${EUID} -eq 0 ]] || die "Run this helper as root on a Proxmox VE node."
command -v pct >/dev/null || die "pct was not found. Run this only on a Proxmox VE node."
command -v pvesh >/dev/null || die "pvesh was not found. Run this only on a Proxmox VE node."
command -v pveam >/dev/null || die "pveam was not found. Run this only on a Proxmox VE node."

DEFAULT_VMID="$(pvesh get /cluster/nextid)"
DEFAULT_TEMPLATE_STORAGE="$(pvesm status --content vztmpl 2>/dev/null | awk 'NR > 1 && $3 == "active" {print $1; exit}')"
DEFAULT_CT_STORAGE="$(pvesm status --content rootdir 2>/dev/null | awk 'NR > 1 && $3 == "active" {print $1; exit}')"
[[ -n "${DEFAULT_TEMPLATE_STORAGE}" ]] || die "No active storage supporting container templates was found."
[[ -n "${DEFAULT_CT_STORAGE}" ]] || die "No active storage supporting LXC root disks was found."

echo "Cyverax Nova Proxmox LXC Helper"
echo
read -rp "Container ID [${DEFAULT_VMID}]: " VMID
VMID="${VMID:-${DEFAULT_VMID}}"
[[ "${VMID}" =~ ^[0-9]+$ ]] || die "Container ID must be numeric."
[[ ! -e "/etc/pve/lxc/${VMID}.conf" ]] || die "Container ${VMID} already exists."

read -rp "LXC hostname [novacloud]: " CT_HOSTNAME
CT_HOSTNAME="${CT_HOSTNAME:-novacloud}"
read -rp "CPU cores [2]: " CORES
CORES="${CORES:-2}"
read -rp "Memory in MB [4096]: " MEMORY
MEMORY="${MEMORY:-4096}"
read -rp "Swap in MB [512]: " SWAP
SWAP="${SWAP:-512}"
read -rp "Root disk in GB [20]: " DISK
DISK="${DISK:-20}"
read -rp "Container storage [${DEFAULT_CT_STORAGE}]: " CT_STORAGE
CT_STORAGE="${CT_STORAGE:-${DEFAULT_CT_STORAGE}}"
read -rp "Template storage [${DEFAULT_TEMPLATE_STORAGE}]: " TEMPLATE_STORAGE
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-${DEFAULT_TEMPLATE_STORAGE}}"
read -rp "Network bridge [vmbr0]: " BRIDGE
BRIDGE="${BRIDGE:-vmbr0}"
ip link show "${BRIDGE}" >/dev/null 2>&1 || die "Bridge ${BRIDGE} does not exist."
read -rp "Optional VLAN tag (press Enter for none): " VLAN_TAG

read -rp "Use DHCP? [Y/n]: " USE_DHCP
USE_DHCP="${USE_DHCP:-Y}"
if [[ "${USE_DHCP}" =~ ^[Yy]$ ]]; then
  NET_IP="dhcp"
else
  read -rp "Static IPv4 with prefix, for example 10.5.5.209/24: " NET_IP
  [[ "${NET_IP}" == */* ]] || die "Static address must include its prefix length."
  read -rp "IPv4 gateway: " GATEWAY
  [[ -n "${GATEWAY}" ]] || die "A gateway is required for static addressing."
fi

read -rp "Nova web hostname or IP [use LXC IP]: " NOVA_HOST
read -rp "Nova administrator name [Nova Administrator]: " ADMIN_NAME
ADMIN_NAME="${ADMIN_NAME:-Nova Administrator}"
read -rp "Nova administrator email: " ADMIN_EMAIL
[[ "${ADMIN_EMAIL}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die "Enter a valid administrator email."
while true; do
  read -rsp "Nova administrator password (minimum 12 characters): " ADMIN_PASSWORD
  echo
  [[ ${#ADMIN_PASSWORD} -ge 12 ]] && break
  echo "Password must contain at least 12 characters."
done
read -rsp "Confirm administrator password: " ADMIN_PASSWORD_CONFIRM
echo
[[ "${ADMIN_PASSWORD}" == "${ADMIN_PASSWORD_CONFIRM}" ]] || die "Passwords do not match."
read -rp "Optional Gemini API key (press Enter to skip): " GEMINI_KEY
read -rp "Proxmox API URL for inventory sync [https://127.0.0.1:8006]: " PROXMOX_HOST
PROXMOX_HOST="${PROXMOX_HOST:-https://127.0.0.1:8006}"
read -rp "Proxmox API token ID (user@realm!token, press Enter to skip provider sync): " PROXMOX_TOKEN_ID
PROXMOX_TOKEN_SECRET=""
PROXMOX_VERIFY_TLS="true"
if [[ -n "${PROXMOX_TOKEN_ID}" ]]; then
  read -rsp "Proxmox API token secret: " PROXMOX_TOKEN_SECRET
  echo
  read -rp "Verify Proxmox TLS certificate? [Y/n]: " PROXMOX_TLS_ANSWER
  if [[ "${PROXMOX_TLS_ANSWER:-Y}" =~ ^[Nn]$ ]]; then
    PROXMOX_VERIFY_TLS="false"
  fi
fi

echo
echo "Downloading the current Debian 13 LXC template list..."
pveam update
TEMPLATE="$(pveam available --section system | awk '$2 ~ /^debian-13-standard_.*_amd64\.tar\.(zst|gz)$/ {print $2}' | tail -n 1)"
[[ -n "${TEMPLATE}" ]] || die "A Debian 13 standard template was not found."
if ! pveam list "${TEMPLATE_STORAGE}" | awk '{print $1}' | grep -qx "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}"; then
  pveam download "${TEMPLATE_STORAGE}" "${TEMPLATE}"
fi

NET0="name=eth0,bridge=${BRIDGE},firewall=1,ip=${NET_IP}"
if [[ "${USE_DHCP}" =~ ^[Nn]$ ]]; then
  NET0+=",gw=${GATEWAY}"
fi
if [[ -n "${VLAN_TAG}" ]]; then
  [[ "${VLAN_TAG}" =~ ^[0-9]+$ ]] || die "VLAN tag must be numeric."
  NET0+=",tag=${VLAN_TAG}"
fi

echo "Creating unprivileged Debian 13 LXC ${VMID}..."
pct create "${VMID}" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
  --hostname "${CT_HOSTNAME}" \
  --cores "${CORES}" \
  --memory "${MEMORY}" \
  --swap "${SWAP}" \
  --rootfs "${CT_STORAGE}:${DISK}" \
  --net0 "${NET0}" \
  --ostype debian \
  --unprivileged 1 \
  --onboot 1 \
  --start 0

pct start "${VMID}"
echo "Waiting for the LXC to start..."
for _ in {1..30}; do
  if pct exec "${VMID}" -- true >/dev/null 2>&1; then break; fi
  sleep 2
done
pct exec "${VMID}" -- true >/dev/null 2>&1 || die "The LXC did not become ready."

if [[ -z "${NOVA_HOST}" ]]; then
  for _ in {1..30}; do
    NOVA_HOST="$(pct exec "${VMID}" -- ip -4 -o addr show dev eth0 scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1)"
    [[ -n "${NOVA_HOST}" ]] && break
    sleep 2
  done
fi
[[ -n "${NOVA_HOST}" ]] || die "The LXC has no IPv4 address. Check DHCP or use a static address."

ENABLE_TLS="N"
TLS_EMAIL=""
if [[ ! "${NOVA_HOST}" =~ ^[0-9.]+$ ]]; then
  read -rp "Configure Let's Encrypt HTTPS for ${NOVA_HOST}? [Y/n]: " ENABLE_TLS
  ENABLE_TLS="${ENABLE_TLS:-Y}"
  if [[ "${ENABLE_TLS}" =~ ^[Yy]$ ]]; then
    read -rp "Email for certificate notices: " TLS_EMAIL
  fi
fi

SECRETS_FILE="$(mktemp /tmp/novacloud-secrets.XXXXXX)"
trap 'rm -f -- "${SECRETS_FILE:-}"' EXIT
chmod 600 "${SECRETS_FILE}"
{
  printf 'export NOVA_UNATTENDED=1\n'
  printf 'export NOVA_APP_HOST=%q\n' "${NOVA_HOST}"
  printf 'export NOVA_ADMIN_NAME=%q\n' "${ADMIN_NAME}"
  printf 'export NOVA_ADMIN_EMAIL=%q\n' "${ADMIN_EMAIL}"
  printf 'export NOVA_ADMIN_PASSWORD=%q\n' "${ADMIN_PASSWORD}"
  printf 'export NOVA_GEMINI_API_KEY=%q\n' "${GEMINI_KEY}"
  printf 'export NOVA_PROXMOX_HOST=%q\n' "${PROXMOX_HOST}"
  printf 'export NOVA_PROXMOX_TOKEN_ID=%q\n' "${PROXMOX_TOKEN_ID}"
  printf 'export NOVA_PROXMOX_TOKEN_SECRET=%q\n' "${PROXMOX_TOKEN_SECRET}"
  printf 'export NOVA_PROXMOX_VERIFY_TLS=%q\n' "${PROXMOX_VERIFY_TLS}"
  printf 'export NOVA_ENABLE_TLS=%q\n' "${ENABLE_TLS}"
  printf 'export NOVA_TLS_EMAIL=%q\n' "${TLS_EMAIL}"
} > "${SECRETS_FILE}"

pct push "${VMID}" "${SECRETS_FILE}" /root/nova-install.env --perms 600
rm -f -- "${SECRETS_FILE}"

echo "Installing Cyverax Nova inside LXC ${VMID}..."
if ! pct exec "${VMID}" -- bash -lc "set -a; source /root/nova-install.env; set +a; curl -fsSL '${REPOSITORY_RAW}/bootstrap.sh' -o /root/nova-bootstrap.sh; bash /root/nova-bootstrap.sh"; then
  pct exec "${VMID}" -- rm -f /root/nova-install.env /root/nova-bootstrap.sh || true
  echo "Nova installation failed. LXC ${VMID} was preserved for troubleshooting." >&2
  exit 1
fi
pct exec "${VMID}" -- rm -f /root/nova-install.env /root/nova-bootstrap.sh

echo
echo "Cyverax Nova LXC ${VMID} is ready."
echo "Open: http://${NOVA_HOST}"
echo "Administrator: ${ADMIN_EMAIL}"
