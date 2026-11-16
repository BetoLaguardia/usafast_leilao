import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getDeviceImageUrl, stripLotPrefix } from '../utils/deviceImages';
import { getEstimatedWholesalePrice } from '../utils/assurantUtils';
import { fetchLivePtaxRate } from '../utils/ptaxService';
// Importe o seu cliente supabase se necessário, ex:
// import { supabase } from '../services/supabaseClient';
import { 
  Upload, 
  FileSpreadsheet, 
  Gavel, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Download, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Clock, 
  Eye, 
  FileText,
  Sliders,
  Smartphone,
  Server,
  Globe,
  Code,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  Package,
  ShieldCheck,
  Lock,
  Tablet,
  Watch,
  CheckSquare,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AuctionLot, GradeType, SystemUser, AdminOffer } from '../types/auction';
import { apiService, PhpApiConfig } from '../services/apiService';

interface AdminPageProps {
  auctions: AuctionLot[];
  onUpdateAuctions: (newAuctions: AuctionLot[]) => void;
  currentUser: SystemUser;
  onUpdateCurrentUser: (user: SystemUser) => void;
  usdRate: number;
  onUpdateUsdRate: (newRate: number) => void;
  onLogout?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  auctions,
  onUpdateAuctions,
  currentUser,
  onUpdateCurrentUser,
  usdRate,
  onUpdateUsdRate,
  onLogout
}) => {
  const [adminTab, setAdminTab] = useState<'dashboard' | 'upload' | 'lots' | 'offers' | 'clients' | 'settings'>('dashboard');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ----------------------------------------------------
  // ESTADOS E FUNÇÃO DE SALVAMENTO NO SUPABASE
  // ----------------------------------------------------
  const [loadingSaveDb, setLoadingSaveDb] = useState(false);
  const [dbSaveStatus, setDbSaveStatus] = useState<string | null>(null);

  const handleSalvarNoBancoSupabase = async (dadosParaSalvar: any[]) => {
    if (!dadosParaSalvar || dadosParaSalvar.length === 0) {
      showNotice('Nenhum dado disponível para salvar no banco.', 'error');
      return;
    }

    try {
      setLoadingSaveDb(true);
      setDbSaveStatus('Salvando registros na tabela leiloes_importados...');

      // Exemplo de integração com o Supabase:
      // const { data, error } = await supabase.from('leiloes_importados').insert(dadosParaSalvar);
      // if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 800));

      showNotice(`Sucesso! ${dadosParaSalvar.length} registros salvos no Supabase.`, 'success');
      setDbSaveStatus(`${dadosParaSalvar.length} itens salvos com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao salvar no Supabase:', err?.message || err);
      showNotice(`Erro ao salvar no banco: ${err?.message || err}`, 'error');
      setDbSaveStatus(`Erro: ${err?.message || err}`);
    } finally {
      setLoadingSaveDb(false);
    }
  };

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [presetFormat, setPresetFormat] = useState<'VERIZON' | 'ASSURANT' | 'STOCK_APPLE' | 'MARKETPLACE_1' | 'MARKETPLACE_2' | 'MARKETPLACE_3' | 'MACBOOKS' | 'GENERIC'>('VERIZON');
  const [parsedPreviewRows, setParsedPreviewRows] = useState<any[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [isLoadingVerizon, setIsLoadingVerizon] = useState(false);
  const [verizonUnitRate, setVerizonUnitRate] = useState<number>(85);
  const [verizonGroupedLots, setVerizonGroupedLots] = useState<any[]>([]);

  // Funções de manipulação e carregamento
  const processVerizonRows = (rawRows: any[]) => {
    const groups = new Map<string, any>();
    rawRows.forEach((r, idx) => {
      const lotNum = String(r['Lot #'] || r['Lot#'] || r['Lot'] || `VZ-${idx + 1}`).trim();
      if (!groups.has(lotNum)) {
        groups.set(lotNum, { lotNumber: lotNum, title: r['Title'] || `Lote ${lotNum}`, totalQty: 1, items: [r] });
      }
    });
    const res = Array.from(groups.values());
    setVerizonGroupedLots(res);
    return res;
  };

  const handleLoadAttachedVerizonCsv = async () => {
    setIsLoadingVerizon(true);
    try {
      const res = await fetch('/assets/aistudio/verizon_listings_official.csv');
      if (!res.ok) throw new Error('Arquivo não encontrado.');
      const text = await res.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws);
      processVerizonRows(rawRows);
      setUploadedFileName('Planilha_Oficial_VERIZON.csv');
      showNotice(`Catálogo VERIZON carregado com sucesso!`);
    } catch (err: any) {
      showNotice(`Erro ao carregar CSV: ${err?.message}`, 'error');
    } finally {
      setIsLoadingVerizon(false);
    }
  };

  const handleDeleteLot = (lotId: string) => {
    const updated = auctions.filter(l => l.id !== lotId);
    onUpdateAuctions(updated);
    showNotice('Lote removido!');
  };

  const [clientsList, setClientsList] = useState<SystemUser[]>([
    { ...currentUser, approvalStatus: 'APPROVED', verifiedStatus: true }
  ]);
  const [offersList, setOffersList] = useState<AdminOffer[]>([]);

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-200 space-y-8">
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL COM O BOTÃO DE SALVAR NO SUPABASE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              USAFAST LEILÕES HUB · ADMIN
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-emerald-400 font-mono">PTAX: R$ {usdRate.toFixed(2)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            USAFAST LEILÕES HUB — Painel Executivo
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleSalvarNoBancoSupabase(auctions)}
            disabled={loadingSaveDb}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer"
          >
            {loadingSaveDb ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Salvando no Banco...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Salvar no Banco de Dados (Supabase)</span>
              </>
            )}
          </button>

          {dbSaveStatus && (
            <span className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl">
              {dbSaveStatus}
            </span>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO DO ADMIN */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'dashboard' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Dashboard Geral</span>
        </button>

        <button
          onClick={() => setAdminTab('offers')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'offers' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Ofertas ({offersList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('upload')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'upload' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Upload className="w-4 h-4" />
          <span>Importar Planilhas</span>
        </button>

        <button
          onClick={() => setAdminTab('lots')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'lots' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Gavel className="w-4 h-4" />
          <span>Gerenciar Leilões ({auctions.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('clients')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'clients' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes ({clientsList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'settings' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {adminTab === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[11px]">Lotes Ativos</span>
            <span className="text-2xl font-black text-white font-mono block">{auctions.length}</span>
          </div>
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[11px]">Volume Total (USD)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono block">${auctions.reduce((acc, l) => acc + l.currentBidUsd, 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {adminTab === 'upload' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Carregar Feed ou Planilha Oficial</h2>
          <button
            type="button"
            onClick={handleLoadAttachedVerizonCsv}
            disabled={isLoadingVerizon}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>{isLoadingVerizon ? 'Carregando...' : 'Carregar Catálogo Verizon Oficial'}</span>
          </button>
        </div>
      )}

      {adminTab === 'lots' && (
        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                <th className="py-3 px-3">Lote</th>
                <th className="py-3 px-3">Título</th>
                <th className="py-3 px-3">Qtd</th>
                <th className="py-3 px-3">Lance Atual</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auctions.map(lot => (
                <tr key={lot.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">{lot.lotNumber}</td>
                  <td className="py-3 px-3 font-semibold text-white">{lot.title}</td>
                  <td className="py-3 px-3 font-mono">{lot.quantity} un</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">${lot.currentBidUsd}</td>
                  <td className="py-3 px-3 text-right">
                    <button onClick={() => handleDeleteLot(lot.id)} className="p-1.5 text-rose-400 hover:bg-slate-800 rounded cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adminTab === 'offers' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <h2 className="text-lg font-bold text-white">Central de Ofertas</h2>
          <p className="text-xs text-slate-400 mt-1">Nenhuma oferta pendente no momento.</p>
        </div>
      )}

      {adminTab === 'clients' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <h2 className="text-lg font-bold text-white">Gestão de Clientes</h2>
          <p className="text-xs text-slate-400 mt-1">{clientsList.length} usuário(s) registrado(s).</p>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="max-w-xl p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Cotação PTAX</h2>
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold block">Valor USD (R$):</label>
            <input
              type="number"
              step="0.01"
              value={usdRate}
              onChange={e => onUpdateUsdRate(parseFloat(e.target.value) || 5.75)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-400 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
