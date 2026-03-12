const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const PORT = Number(process.env.PORT || process.env.ENTRY_PORT || 8080);
const BACKEND_TARGET = process.env.BACKEND_TARGET || 'http://127.0.0.1:3000';
const DIST_DIR = path.resolve(__dirname, '../../frontend/dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

app.disable('x-powered-by');

app.get('/entry-health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'same-origin-entry',
    backendTarget: BACKEND_TARGET,
    distDir: DIST_DIR,
    timestamp: new Date().toISOString(),
  });
});

const apiProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 15000,
  timeout: 15000,
  logLevel: 'warn',
});

const directProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 15000,
  timeout: 15000,
  logLevel: 'warn',
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return apiProxy(req, res, next);
  }
  if (req.path === '/health' || req.path === '/metrics') {
    return directProxy(req, res, next);
  }
  next();
});

app.use(express.static(DIST_DIR, {
  index: false,
  extensions: ['html'],
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(INDEX_FILE, (err) => {
    if (err) {
      next(err);
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error('[same-origin-entry] request failed:', err && err.message ? err.message : err);
  if (res.headersSent) {
    return;
  }
  res.status(502).json({
    code: 50200,
    message: 'same-origin entry proxy failed',
    detail: err && err.message ? err.message : String(err),
  });
});

app.listen(PORT, () => {
  console.log(`[same-origin-entry] listening on http://127.0.0.1:${PORT}`);
  console.log(`[same-origin-entry] proxy /api/* -> ${BACKEND_TARGET}`);
  console.log(`[same-origin-entry] serving frontend dist -> ${DIST_DIR}`);
});
