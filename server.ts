import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_AUCTIONS } from './src/data/auctionsData';
import dotenv from 'dotenv';

dotenv.config();

// Inicializa o cliente do Supabase usando as variáveis de ambiente configuradas na Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const BANNED_PATTERNS = /govdeals|copart|liquidation\.com|apple certified/i;

const sanitizeAuctions = (lots: any[]): any[] => {
  if (!Array.isArray(lots)) return [];
  return lots.filter(lot => {
    const house = String(lot.auctionHouse || '');
    const title = String(lot.title || '');
    const source = String(lot.sourceType || '');
    return !BANNED_PATTERNS.test(house) && !BANNED_PATTERNS.test(title) && !BANNED_PATTERNS.test(source);
  });
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100mb' }));

  // Endpoint para buscar leilões direto do Supabase
  app.get('/api/auctions', async (req, res) => {
    try {
      const q = String(req.query.search || '').trim().toLowerCase();
      const source = String(req.query.source || '').trim().toUpperCase();

      // Busca os dados da tabela 'auctions' no Supabase
      let { data: auctionsData, error } = await supabase
        .from('auctions')
        .select('*');

      if (error) {
        console.error('[Supabase Error] Falha ao buscar leilões:', error);
        return res.json({ ok: true, count: INITIAL_AUCTIONS.length, total: INITIAL_AUCTIONS.length, auctions: INITIAL_AUCTIONS });
      }

      let results = auctionsData && auctionsData.length > 0 ? auctionsData : INITIAL_AUCTIONS;
      results = sanitizeAuctions(results);

      if (source && source !== 'ALL') {
        results = results.filter((lot: any) => 
          (lot.sourceType || '').toUpperCase() === source ||
          (lot.auctionHouse || '').toUpperCase().includes(source)
        );
      }

      if (q) {
        results = results.filter((lot: any) =>
          (lot.title || '').toLowerCase().includes(q) ||
          (lot.lotNumber || '').toLowerCase().includes(q) ||
          (lot.modelFamily || '').toLowerCase().includes(q) ||
          (lot.location || '').toLowerCase().includes(q) ||
          (lot.primaryStorage || '').toLowerCase().includes(q)
        );
      }

      return res.json({ ok: true, count: results.length, total: results.length, auctions: results });
    } catch (e: any) {
      console.error('[API GET /api/auctions] Erro:', e);
      return res.json({ ok: true, count: INITIAL_AUCTIONS.length, total: INITIAL_AUCTIONS.length, auctions: INITIAL_AUCTIONS });
    }
  });

  // Endpoint para salvar os leilões importados direto no Supabase
  app.post('/api/auctions', async (req, res) => {
    try {
      const { auctions } = req.body || {};
      if (Array.isArray(auctions) && auctions.length > 0) {
        const sanitized = sanitizeAuctions(auctions);

        // Opcional: limpa a tabela ou insere/atualiza os lotes novos
        // Aqui limpamos os antigos e inserimos os novos lotes da planilha importada
        const { error: deleteError } = await supabase.from('auctions').delete().neq('id', 0); // Limpa registros anteriores se necessário
        
        const { error: insertError } = await supabase
          .from('auctions')
          .insert(sanitized);

        if (insertError) {
          console.error('[Supabase Error] Erro ao inserir no banco:', insertError);
          return res.status(500).json({ ok: false, error: insertError.message });
        }

        console.log(`[Database Engine] Sincronizados ${sanitized.length} lots com sucesso no Supabase!`);
        return res.json({ ok: true, count: sanitized.length });
      }
      return res.status(400).json({ ok: false, error: 'Array de leilões inválido' });
    } catch (e: any) {
      console.error('[API POST /api/auctions] Erro ao salvar:', e);
      return res.status(500).json({ ok: false, error: e?.message || 'Falha ao salvar' });
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
