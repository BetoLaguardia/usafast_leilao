import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const STORE_PATH = '/tmp/auctions_store.json';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/auctions', (_req, res) => {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ auctions: parsed });
        }
      }
    } catch (e) {
      // ignore
    }
    return res.json({ auctions: null });
  });

  app.post('/api/auctions', (req, res) => {
    try {
      const { auctions } = req.body || {};
      if (Array.isArray(auctions)) {
        fs.writeFileSync(STORE_PATH, JSON.stringify(auctions), 'utf-8');
        return res.json({ ok: true, count: auctions.length });
      }
      return res.status(400).json({ ok: false, error: 'Invalid auctions array' });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || 'Failed to save' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
  });
}

startServer();
