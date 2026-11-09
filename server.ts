import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_AUCTIONS } from './src/data/auctionsData';

const STORE_PATH = path.join(process.cwd(), 'auctions_store.json');

// In-Memory Fast Cache for Instant Zero-Latency Database Queries
let cachedAuctions: any[] = [];

// Initialize or Load Persistent Store on Startup
try {
  if (fs.existsSync(STORE_PATH)) {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedAuctions = parsed;
      console.log(`[Database Engine] Loaded ${cachedAuctions.length} lots from persistent storage on startup.`);
    } else {
      cachedAuctions = INITIAL_AUCTIONS;
      fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_AUCTIONS, null, 2), 'utf-8');
    }
  } else {
    cachedAuctions = INITIAL_AUCTIONS;
    fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_AUCTIONS, null, 2), 'utf-8');
    console.log(`[Database Engine] Initialized auctions_store.json with ${INITIAL_AUCTIONS.length} initial lots.`);
  }
} catch (e) {
  console.error('[Database Engine] Failed to load store, using default fallback:', e);
  cachedAuctions = INITIAL_AUCTIONS;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100mb' }));

  // Instant In-Memory Search & Query Endpoint
  app.get('/api/auctions', (req, res) => {
    try {
      const q = String(req.query.search || '').trim().toLowerCase();
      const source = String(req.query.source || '').trim().toUpperCase();

      let results = cachedAuctions;

      if (source && source !== 'ALL') {
        results = results.filter(lot => 
          (lot.sourceType || '').toUpperCase() === source ||
          (lot.auctionHouse || '').toUpperCase().includes(source)
        );
      }

      if (q) {
        results = results.filter(lot =>
          (lot.title || '').toLowerCase().includes(q) ||
          (lot.lotNumber || '').toLowerCase().includes(q) ||
          (lot.modelFamily || '').toLowerCase().includes(q) ||
          (lot.location || '').toLowerCase().includes(q) ||
          (lot.primaryStorage || '').toLowerCase().includes(q)
        );
      }

      return res.json({ ok: true, count: results.length, total: cachedAuctions.length, auctions: results });
    } catch (e: any) {
      console.error('[API GET /api/auctions] Error:', e);
      return res.json({ ok: true, count: cachedAuctions.length, total: cachedAuctions.length, auctions: cachedAuctions });
    }
  });

  // Fast In-Memory Save & Persistent Store Update Endpoint
  app.post('/api/auctions', (req, res) => {
    try {
      const { auctions } = req.body || {};
      if (Array.isArray(auctions) && auctions.length > 0) {
        cachedAuctions = auctions;
        // Asynchronous non-blocking disk persistence
        fs.writeFile(STORE_PATH, JSON.stringify(auctions, null, 2), 'utf-8', (err) => {
          if (err) console.error('[Database Engine] Non-blocking file save error:', err);
          else console.log(`[Database Engine] Persisted ${auctions.length} lots to auctions_store.json`);
        });
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
