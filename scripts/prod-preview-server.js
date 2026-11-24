import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Nap .env neu co (khong in gia tri khoa ra console)
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function enhanceRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  if (pathname.startsWith('/api/')) {
    enhanceRes(res);
    req.body = await readJsonBody(req);
    const routeName = pathname.replace(/^\/api\//, '').replace(/[^a-z0-9-_]/gi, '');
    const apiPath = path.join(ROOT, 'api', `${routeName}.js`);
    if (!fs.existsSync(apiPath)) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    try {
      const mod = await import(`file://${apiPath.replace(/\\/g, '/')}?t=${Date.now()}`);
      return await mod.default(req, res);
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'Internal API error' });
    }
  }

  let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relPath);
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h1>404 - Không tìm thấy trang</h1><p><a href="/">Quay về trang chủ Panda HSK</a></p>');
});

server.listen(PORT, () => {
  console.log(`[Panda HSK Production Server] Dang chay tai http://localhost:${PORT}`);
});