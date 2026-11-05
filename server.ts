import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_AUCTIONS } from './src/data/auctionsData';

const STORE_PATH = path.join(process.cwd(), 'auctions_store.json');

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Initialize store file if missing
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_AUCTIONS, null, 2), 'utf-8');
      console.log(`[Server persistence] Created initial auctions_store.json with ${INITIAL_AUCTIONS.length} items`);
    }
  } catch (e) {
    console.error('[Server persistence] Error initializing store file:', e);
  }

  app.get('/api/auctions', (_req, res) => {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[API GET /api/auctions] Returning ${parsed.length} lots`);
          return res.json({ auctions: parsed });
        }
      }
    } catch (e) {
      console.error('[API GET /api/auctions] Error reading store:', e);
    }
    console.log(`[API GET /api/auctions] Returning default fallback (${INITIAL_AUCTIONS.length} lots)`);
    return res.json({ auctions: INITIAL_AUCTIONS });
  });

  app.post('/api/auctions', (req, res) => {
    try {
      const { auctions } = req.body || {};
      if (Array.isArray(auctions)) {
        fs.writeFileSync(STORE_PATH, JSON.stringify(auctions, null, 2), 'utf-8');
        console.log(`[API POST /api/auctions] Successfully saved ${auctions.length} lots to auctions_store.json`);
        return res.json({ ok: true, count: auctions.length });
      }
      return res.status(400).json({ ok: false, error: 'Invalid auctions array' });
    } catch (e: any) {
      console.error('[API POST /api/auctions] Error saving:', e);
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
