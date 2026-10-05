# Cyverax Nova

Cyverax Nova is a self-hosted cloud-console application. A fresh installation starts with an empty PostgreSQL-backed inventory; it does not load demonstration infrastructure.

## One-command LXC installation

Use a clean Debian 12 or Debian 13 LXC with at least 2 CPU cores, 4 GB RAM, 20 GB storage, systemd, working DNS, and Internet access.

```bash
curl -fsSL https://raw.githubusercontent.com/Ceyeberkepp/Novacloud/main/bootstrap.sh | sudo bash
```

The bootstrap command downloads the current public release and launches the interactive installer. Run it directly from the LXC console or an SSH session.

## Create the LXC from a Proxmox node

Run this command as root on a Proxmox VE node:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Ceyeberkepp/Novacloud/main/proxmox/create-lxc.sh)"
```

The helper creates an unprivileged Debian 13 LXC and asks for its VMID, storage, bridge, VLAN, DHCP or static network configuration, resources, and Nova administrator account. It then installs and starts Nova inside the container.

### Manual installation

```bash
apt update && apt install -y git && \
git clone https://github.com/Ceyeberkepp/Novacloud.git && \
cd Novacloud && sudo bash install.sh
```

The installer asks for the web hostname, administrator account, optional Gemini key, and optional HTTPS. It automatically installs Node.js, PostgreSQL, Nginx, the database schema, the Nova service, and Let's Encrypt when selected.

## Update an installed instance

```bash
cd /opt/novacloud
sudo git pull
sudo npm install
sudo npm run db:migrate
sudo npm run build
sudo systemctl restart novacloud
```

## Troubleshooting

```bash
systemctl status novacloud --no-pager
journalctl -u novacloud -n 100 --no-pager
curl http://127.0.0.1:3000/api/health
nginx -t
```


## Real infrastructure data

NovaCloud no longer requires demonstration inventory. The dashboard reads PostgreSQL resources and can synchronize compute and storage inventory directly from Proxmox VE.

For Proxmox, create a dedicated API token with read-only/audit permissions and configure:

```bash
PROXMOX_HOST=https://your-proxmox-host:8006
PROXMOX_TOKEN_ID=novacloud@pve!inventory
PROXMOX_TOKEN_SECRET=your-token-secret
PROXMOX_VERIFY_TLS=true
```

If your Proxmox node uses a self-signed certificate during initial testing, set `PROXMOX_VERIFY_TLS=false`. Prefer a trusted certificate for production.

The dashboard refresh path performs a cached Proxmox inventory sync (at most once every 30 seconds). You can also trigger a provider sync through `POST /api/providers/proxmox/sync` while authenticated.
