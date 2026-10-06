import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import path from 'path';
import os from 'os';
import fs from 'fs';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error('DATABASE_URL and SESSION_SECRET must be set');
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PgStore = connectPgSimple(session);
const app = express();
const port = Number(process.env.PORT || 3000);

const proxmoxHost = String(process.env.PROXMOX_HOST || '').replace(/\/$/, '');
const proxmoxTokenId = String(process.env.PROXMOX_TOKEN_ID || '');
const proxmoxTokenSecret = String(process.env.PROXMOX_TOKEN_SECRET || '');
const proxmoxVerifyTls = process.env.PROXMOX_VERIFY_TLS !== 'false';
let lastProxmoxSyncAt = 0;
let proxmoxSyncPromise: Promise<void> | null = null;

function proxmoxConfigured() {
  return Boolean(proxmoxHost && proxmoxTokenId && proxmoxTokenSecret);
}

function proxmoxGet(pathname: string): Promise<any> {
  if (!proxmoxConfigured()) {
    return Promise.reject(new Error('Proxmox provider is not configured'));
  }
  const target = new URL(pathname, proxmoxHost.endsWith('/') ? proxmoxHost : `${proxmoxHost}/`);
  const transport = target.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = transport.request(target, {
      method: 'GET',
      headers: {
        Authorization: `PVEAPIToken=${proxmoxTokenId}=${proxmoxTokenSecret}`,
        Accept: 'application/json',
      },
      ...(target.protocol === 'https:' ? { rejectUnauthorized: proxmoxVerifyTls } : {}),
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Proxmox API returned HTTP ${response.statusCode || 0}`));
          return;
        }
        try {
          resolve(JSON.parse(body)?.data ?? []);
        } catch {
          reject(new Error('Proxmox returned invalid JSON'));
        }
      });
    });
    request.setTimeout(10000, () => request.destroy(new Error('Proxmox API request timed out')));
    request.on('error', reject);
    request.end();
  });
}

async function upsertProviderResource(type: string, externalId: string, data: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO resources (type, provider, external_id, data)
     VALUES ($1, 'proxmox', $2, $3)
     ON CONFLICT (provider, external_id)
     DO UPDATE SET type = EXCLUDED.type, data = EXCLUDED.data, updated_at = NOW()`,
    [type, externalId, data],
  );
}

async function syncProxmoxInventory(force = false) {
  if (!proxmoxConfigured()) return;
  if (!force && Date.now() - lastProxmoxSyncAt < 30000) return;
  if (proxmoxSyncPromise) return proxmoxSyncPromise;

  proxmoxSyncPromise = (async () => {
    const [compute, storage] = await Promise.all([
      proxmoxGet('/api2/json/cluster/resources?type=vm'),
      proxmoxGet('/api2/json/cluster/resources?type=storage'),
    ]);

    const computeIds: string[] = [];
    for (const item of Array.isArray(compute) ? compute : []) {
      const externalId = `${item.type || 'vm'}:${item.vmid}`;
      computeIds.push(externalId);
      const maxMem = Number(item.maxmem || 0);
      const usedMem = Number(item.mem || 0);
      await upsertProviderResource('vm', externalId, {
        id: `proxmox-${item.vmid}`,
        name: item.name || `VM ${item.vmid}`,
        status: item.status === 'running' ? 'Running' : 'Stopped',
        os: item.type === 'lxc' ? 'Linux Container' : 'Virtual Machine',
        vcpu: Number(item.maxcpu || item.cpus || 0),
        memoryGb: Number((maxMem / 1024 ** 3).toFixed(2)),
        storageGb: Number((Number(item.maxdisk || 0) / 1024 ** 3).toFixed(2)),
        privateIp: '—',
        publicIp: '—',
        region: 'local',
        environment: 'Production',
        vpc: item.node || 'proxmox',
        subnet: '—',
        securityPolicy: 'Proxmox',
        hostname: item.name || String(item.vmid),
        created: '—',
        uptime: Number(item.uptime || 0) > 0 ? `${Math.floor(Number(item.uptime) / 3600)}h` : '0h',
        cpuUsagePct: Number((Number(item.cpu || 0) * 100).toFixed(1)),
        memUsagePct: maxMem > 0 ? Number(((usedMem / maxMem) * 100).toFixed(1)) : 0,
        diskIops: 0,
        networkInMb: Number((Number(item.netin || 0) / 1024 ** 2).toFixed(1)),
        networkOutMb: Number((Number(item.netout || 0) / 1024 ** 2).toFixed(1)),
        tags: {
          provider: 'proxmox',
          node: String(item.node || ''),
          kind: String(item.type || ''),
          vmid: String(item.vmid || ''),
        },
        attachedDisks: [],
        snapshots: [],
      });
    }

    const storageIds: string[] = [];
    for (const item of Array.isArray(storage) ? storage : []) {
      const externalId = `${item.node || 'cluster'}:${item.storage || item.id}`;
      storageIds.push(externalId);
      await upsertProviderResource('storage', externalId, {
        id: `proxmox-storage-${String(item.storage || item.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        name: item.storage || item.id || 'Proxmox storage',
        type: 'Block Storage',
        capacityGb: Number((Number(item.maxdisk || 0) / 1024 ** 3).toFixed(2)),
        usedGb: Number((Number(item.disk || 0) / 1024 ** 3).toFixed(2)),
        region: item.node || 'cluster',
        status: 'Healthy',
        attachedResource: item.node || 'cluster',
        created: '—',
      });
    }

    await pool.query(
      `DELETE FROM resources
       WHERE provider = 'proxmox' AND type = 'vm'
         AND NOT (external_id = ANY($1::text[]))`,
      [computeIds],
    );
    await pool.query(
      `DELETE FROM resources
       WHERE provider = 'proxmox' AND type = 'storage'
         AND NOT (external_id = ANY($1::text[]))`,
      [storageIds],
    );

    lastProxmoxSyncAt = Date.now();
  })().finally(() => {
    proxmoxSyncPromise = null;
  });

  return proxmoxSyncPromise;
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  name: 'nova.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE !== 'false',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', version: '1.0.0' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'unavailable' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const result = await pool.query(
    'SELECT id, email, display_name, password_hash, role FROM users WHERE email = $1 AND active = TRUE',
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('nova.sid');
    res.status(204).end();
  });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  const result = await pool.query(
    'SELECT id, email, display_name, role FROM users WHERE id = $1 AND active = TRUE',
    [req.session.userId],
  );
  if (!result.rows[0]) return res.status(401).json({ error: 'Authentication required' });
  const user = result.rows[0];
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
});

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

app.get('/api/providers/proxmox/status', requireAuth, async (_req, res) => {
  if (!proxmoxConfigured()) {
    return res.json({ configured: false, connected: false, lastSyncAt: null });
  }
  try {
    const version = await proxmoxGet('/api2/json/version');
    res.json({
      configured: true,
      connected: true,
      host: proxmoxHost,
      version,
      lastSyncAt: lastProxmoxSyncAt ? new Date(lastProxmoxSyncAt).toISOString() : null,
    });
  } catch (error) {
    res.status(502).json({
      configured: true,
      connected: false,
      host: proxmoxHost,
      error: error instanceof Error ? error.message : 'Unable to reach Proxmox',
      lastSyncAt: lastProxmoxSyncAt ? new Date(lastProxmoxSyncAt).toISOString() : null,
    });
  }
});

app.post('/api/providers/proxmox/sync', requireAuth, async (_req, res) => {
  if (!proxmoxConfigured()) return res.status(400).json({ error: 'Proxmox provider is not configured' });
  try {
    await syncProxmoxInventory(true);
    res.json({ success: true, syncedAt: new Date(lastProxmoxSyncAt).toISOString() });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Proxmox sync failed' });
  }
});

app.get('/api/system/summary', requireAuth, async (_req, res) => {
  const rootFs = fs.statfsSync('/');
  const [resourceCount, userCount, activityCount] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM resources'),
    pool.query('SELECT COUNT(*)::int AS count FROM users WHERE active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS count FROM activity_events'),
  ]);

  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const network = Object.entries(os.networkInterfaces())
    .flatMap(([name, addresses]) =>
      (addresses || [])
        .filter((address) => address.family === 'IPv4' && !address.internal)
        .map((address) => ({ name, address: address.address, cidr: address.cidr }))
    );

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    architecture: os.arch(),
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    cpuCount: os.cpus().length,
    loadAverage: os.loadavg(),
    uptimeSeconds: os.uptime(),
    memory: {
      totalBytes: totalMemoryBytes,
      usedBytes: totalMemoryBytes - freeMemoryBytes,
      freeBytes: freeMemoryBytes,
      usedPercent: totalMemoryBytes > 0
        ? Number((((totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes) * 100).toFixed(1))
        : 0,
    },
    disk: {
      totalBytes: rootFs.blocks * rootFs.bsize,
      freeBytes: rootFs.bavail * rootFs.bsize,
      usedBytes: (rootFs.blocks - rootFs.bfree) * rootFs.bsize,
    },
    database: {
      resources: resourceCount.rows[0]?.count || 0,
      activeUsers: userCount.rows[0]?.count || 0,
      activityEvents: activityCount.rows[0]?.count || 0,
    },
    network,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/dashboard', requireAuth, async (_req, res) => {
  try { await syncProxmoxInventory(); } catch (error) { console.error('Proxmox sync failed', error); }
  const [resources, activity] = await Promise.all([
    pool.query('SELECT id, type, data FROM resources ORDER BY updated_at DESC'),
    pool.query(`SELECT id, action, resource, status, actor AS "user", source_ip AS ip,
                       created_at AS timestamp FROM activity_events ORDER BY created_at DESC LIMIT 20`),
  ]);
  const byType = (type: string) => resources.rows.filter((row) => row.type === type).map((row) => ({ id: row.id, ...row.data }));
  res.json({
    vms: byType('vm'),
    applications: byType('application'),
    databases: byType('database'),
    storage: byType('storage'),
    notifications: byType('notification'),
    securityAlerts: byType('security_alert'),
    aiRecommendations: byType('ai_recommendation'),
    activities: activity.rows,
  });
});

app.get('/api/activity', requireAuth, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, actor, action, resource, status, source_ip AS ip, created_at AS timestamp
       FROM activity_events ORDER BY created_at DESC LIMIT 250`
  );
  res.json(result.rows);
});

app.get('/api/iam/users', requireAuth, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, email, display_name AS "displayName", role, active,
            created_at AS "createdAt", last_login_at AS "lastLoginAt"
       FROM users ORDER BY created_at ASC`
  );
  res.json(result.rows);
});

app.get('/api/resources', requireAuth, async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : null;
  const result = type
    ? await pool.query('SELECT id, type, provider, external_id, data, created_at, updated_at FROM resources WHERE type = $1 ORDER BY updated_at DESC', [type])
    : await pool.query('SELECT id, type, provider, external_id, data, created_at, updated_at FROM resources ORDER BY updated_at DESC');
  res.json(result.rows);
});

app.post('/api/resources', requireAuth, async (req, res) => {
  const type = String(req.body?.type || '');
  const data = req.body?.data;
  if (!type || !data || typeof data !== 'object') {
    return res.status(400).json({ error: 'type and data are required' });
  }
  const result = await pool.query(
    'INSERT INTO resources (type, data) VALUES ($1, $2) RETURNING id, type, data, created_at, updated_at',
    [type, data],
  );
  res.status(201).json(result.rows[0]);
});

let aiClient: GoogleGenAI | null = null;
app.post('/api/ai/query', requireAuth, async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Nova AI is not configured on this installation' });
  }
  aiClient ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are Nova AI, a cloud infrastructure assistant. Give precise, safe, actionable guidance. User request: ${prompt}`,
    });
    res.json({ source: 'gemini', response: response.text || 'No response returned', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Gemini request failed', error);
    res.status(502).json({ error: 'Nova AI request failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(port, '127.0.0.1', () => console.log(`Cyverax Nova listening on http://127.0.0.1:${port}`));
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
