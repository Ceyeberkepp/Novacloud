# Cyverax Nova

> **Proprietary software — active development.** Cyverax Nova is not open source. Development/evaluation access does not grant production-use rights. A valid Cyverax Nova license is required for authorized production, commercial, or continued licensed use. See [LICENSE](LICENSE).

Cyverax Nova is a self-hosted cloud-console application. A fresh installation starts with an empty PostgreSQL-backed inventory; it does not load demonstration infrastructure.

## Licensing

NovaCloud is privately developed proprietary software. Source availability in this repository does **not** grant permission to copy, redistribute, modify, sublicense, resell, host for third parties, or deploy the software outside expressly authorized development/evaluation use.

The current builds are for authorized development and testing. Production, commercial, enterprise, hosted-service, redistribution, and other operational use require a valid license or separate written authorization from the software owner.

License enforcement, editions, feature entitlements, instance limits, subscription terms, and commercial pricing may be introduced or changed as development continues.

## One-command LXC installation

Use a clean Debian 12 or Debian 13 LXC with at least 2 CPU cores, 4 GB RAM, 20 GB storage, systemd, working DNS, and Internet access.

```bash
curl -fsSL https://raw.githubusercontent.com/gustavoalmanzavargas-dotcom/Novacloud/main/bootstrap.sh | sudo bash
```

The bootstrap command downloads the current authorized build and launches the interactive installer. Run it directly from the LXC console or an SSH session.

## Create the LXC from a Proxmox node

Run this command as root on a Proxmox VE node:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gustavoalmanzavargas-dotcom/Novacloud/main/proxmox/create-lxc.sh)"
```

The helper creates an unprivileged Debian 13 LXC and asks for its VMID, storage, bridge, VLAN, DHCP or static network configuration, resources, and Nova administrator account. It then installs and starts Nova inside the container.

### Manual installation

```bash
apt update && apt install -y git && \
git clone https://github.com/gustavoalmanzavargas-dotcom/Novacloud.git && \
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
