#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="https://github.com/Ceyeberkepp/Novacloud.git"

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: curl -fsSL https://raw.githubusercontent.com/Ceyeberkepp/Novacloud/main/bootstrap.sh | sudo bash"
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Unable to identify this operating system."
  exit 1
fi

source /etc/os-release
if [[ "${ID}" != "debian" || "${VERSION_ID%%.*}" -lt 12 ]]; then
  echo "Cyverax Nova supports Debian 12 and Debian 13 LXCs."
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates git

BOOTSTRAP_DIR="$(mktemp -d /tmp/novacloud-bootstrap.XXXXXX)"
cleanup() {
  rm -rf -- "${BOOTSTRAP_DIR}"
}
trap cleanup EXIT

git clone --depth 1 "${REPOSITORY_URL}" "${BOOTSTRAP_DIR}/Novacloud"

if [[ "${NOVA_UNATTENDED:-}" == "1" ]]; then
  bash "${BOOTSTRAP_DIR}/Novacloud/install.sh"
elif [[ -r /dev/tty ]]; then
  bash "${BOOTSTRAP_DIR}/Novacloud/install.sh" </dev/tty
else
  echo "An interactive terminal is required to create the administrator account."
  exit 1
fi
