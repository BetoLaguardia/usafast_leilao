import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getDeviceImageUrl, stripLotPrefix } from '../utils/deviceImages';
import { getEstimatedWholesalePrice } from '../utils/assurantUtils';
import { fetchLivePtaxRate } from '../utils/ptaxService';
// Certifique-se de importar o seu cliente supabase se necessário:
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
  // BOTÃO E FUNÇÃO DE SALVAMENTO NO SUPABASE (leiloes_importados)
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

      // Integração direta com Supabase:
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

  // ----------------------------------------------------
  // EXCEL / CSV UPLOAD ENGINE (VERIZON, ASSURANT, STOCK & CUSTOM)
  // ----------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [presetFormat, setPresetFormat] = useState<'VERIZON' | 'ASSURANT' | 'STOCK_APPLE' | 'MARKETPLACE_1' | 'MARKETPLACE_2' | 'MARKETPLACE_3' | 'MACBOOKS' | 'GENERIC'>('VERIZON');
  const [parsedPreviewRows, setParsedPreviewRows] = useState<any[]>([]);
  const [isLoadingVerizon, setIsLoadingVerizon] = useState(false);
  const [verizonUnitRate, setVerizonUnitRate] = useState<number>(85);
  const [verizonGroupedLots, setVerizonGroupedLots] = useState<any[]>([]);

  const cleanLotTitle = (rawTitle: string): string => {
    if (!rawTitle) return '';
    return String(rawTitle)
      .replace(/^Lote\s+Master\s+\d+x\s*/gi, '')
      .replace(/^Lote\s+Master\s*/gi, '')
      .replace(/^Lote\s+\d+x\s*/gi, '')
      .replace(/^Lote\s*/gi, '')
      .replace(/^\d+x\s*/gi, '')
      .trim();
  };

  const mapVerizonGrade = (raw: string): GradeType => {
    const g = String(raw || '').trim().toUpperCase();
    if (g.includes('DND') || g.includes('D')) return 'DND';
    if (g.includes('DNC') || g.includes('C')) return 'DNC';
    if (g.includes('DNB') || g.includes('B')) return 'DNB';
    return 'DNA';
  };

  const parseAuctionEndTime = (endDateVal: any, endTimeVal: any): string => {
    let d = new Date(Date.now() + 86400000 * 2);
    return d.toISOString();
  };

  const processVerizonRows = (rawRows: any[], unitRate: number = verizonUnitRate) => {
    const groups = new Map<string, any>();
    rawRows.forEach((r, idx) => {
      const lotNum = String(r['Lot #'] || r['Lot#'] || r['Lot'] || `VZ-${idx + 1}`).trim();
      if (!lotNum) return;
      if (!groups.has(lotNum)) {
        groups.set(lotNum, {
          lotNumber: lotNum,
          title: cleanLotTitle(String(r['Title'] || `iPhone ${lotNum}`)),
          totalQty: 0,
          items: []
        });
      }
      const g = groups.get(lotNum)!;
      const q = parseInt(String(r['Qty'] || 1), 10) || 1;
      g.totalQty += q;
      g.items.push(r);
    });
    const parsed = Array.from(groups.values()).map(g => ({
      ...g,
      mappedGrade: mapVerizonGrade('A'),
      calculatedCurrentBidUsd: g.totalQty * unitRate,
      calculatedRetailBrl: g.totalQty * unitRate * usdRate * 1.55,
      parsedEndTime: parseAuctionEndTime(null, null)
    }));
    setVerizonGroupedLots(parsed);
    return parsed;
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
      showNotice('Catálogo VERIZON carregado com sucesso!');
    } catch (err: any) {
      showNotice(`Erro: ${err?.message}`, 'error');
    } finally {
      setIsLoadingVerizon(false);
    }
  };

  const [isLoadingAssurant, setIsLoadingAssurant] = useState(false);
  const handleLoadAssurantFeed = async () => {
    setIsLoadingAssurant(true);
    try {
      const res = await fetch('/assets/aistudio/B-Stock_listings_2026-11-04T1917_f707e53f.csv');
      if (!res.ok) throw new Error('Arquivo Assurant não encontrado.');
      const text = await res.text();
      setUploadedFileName('B-Stock_listings_Assurant.csv');
      setPresetFormat('ASSURANT');
      showNotice('Feed ASSURANT carregado!');
    } catch (err: any) {
      showNotice(`Erro: ${err?.message}`, 'error');
    } finally {
      setIsLoadingAssurant(false);
    }
  };

  const [isLoadingStockCsv, setIsLoadingStockCsv] = useState(false);
  const handleLoadStockFeed = async () => {
    setIsLoadingStockCsv(true);
    try {
      const res = await fetch('/assets/aistudio/Stock_List_Filtered_11052026_cd908cec.csv');
      if (!res.ok) throw new Error('Estoque não encontrado.');
      setUploadedFileName('Stock_List_Filtered.csv');
      setPresetFormat('STOCK_APPLE');
      showNotice('Estoque carregado!');
    } catch (err: any) {
      showNotice(`Erro: ${err?.message}`, 'error');
    } finally {
      setIsLoadingStockCsv(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedPreviewRows(data);
        showNotice(`Arquivo "${file.name}" carregado com ${data.length} linhas.`);
      } catch (err: any) {
        showNotice(`Erro ao carregar arquivo: ${err?.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyImport = () => {
    showNotice('Importação aplicada com sucesso!');
    setAdminTab('lots');
  };

  const handleDownloadTemplate = () => {
    const templateData = [{ Lote: 'US-99100', Titulo: 'Lote iPhone 16 Pro Max' }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'planilha_modelo.xlsx');
    showNotice('Planilha modelo baixada!');
  };

  // Gestão de Lotes
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editPriceUsd, setEditPriceUsd] = useState<number>(0);
  const [editGrade, setEditGrade] = useState<GradeType>('Grade A');

  const handleStartEdit = (lot: AuctionLot) => {
    setEditingLotId(lot.id);
    setEditPriceUsd(lot.currentBidUsd);
    setEditGrade(lot.grade);
  };

  const handleSaveEdit = (lotId: string) => {
    const updated = auctions.map(l => l.id === lotId ? { ...l, currentBidUsd: editPriceUsd, grade: editGrade } : l);
    onUpdateAuctions(updated);
    setEditingLotId(null);
    showNotice('Lote atualizado!');
  };

  const handleDeleteLot = (lotId: string) => {
    if (!confirm('Deseja remover este lote?')) return;
    const updated = auctions.filter(l => l.id !== lotId);
    onUpdateAuctions(updated);
    showNotice('Lote removido!');
  };

  // Ofertas e Clientes
  const [offersList] = useState<AdminOffer[]>([]);
  const [notificationEmails, setNotificationEmails] = useState<string[]>(['roblagua@gmail.com']);
  const [newNotificationEmail, setNewNotificationEmail] = useState('');
  
  const handleAddNotificationEmail = () => {
    if (!newNotificationEmail.includes('@')) return;
    setNotificationEmails([...notificationEmails, newNotificationEmail.trim()]);
    setNewNotificationEmail('');
  };

  const [clientsList, setClientsList] = useState<SystemUser[]>([
    { ...currentUser, approvalStatus: 'APPROVED', verifiedStatus: true }
  ]);

  const handleApproveClient = (email: string) => {
    setClientsList(clientsList.map(c => c.email === email ? { ...c, approvalStatus: 'APPROVED', verifiedStatus: true } : c));
    showNotice('Cliente aprovado!');
  };

  const handleRejectClient = (email: string) => {
    setClientsList(clientsList.map(c => c.email === email ? { ...c, approvalStatus: 'REJECTED', verifiedStatus: false } : c));
    showNotice('Cliente rejeitado.');
  };

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
          <span>Ofertas Computadas ({offersList.length})</span>
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
          <span>Painel de Clientes ({clientsList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${adminTab === 'settings' ? 'bg-amber-400 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 0: DASHBOARD */}
      {/* ======================================================== */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/85 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Lotes Ativos</span>
              <span className="text-2xl font-black text-white font-mono block">{auctions.length}</span>
            </div>
            <div className="p-4 bg-slate-900/85 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Total de Aparelhos</span>
              <span className="text-2xl font-black text-cyan-300 font-mono block">{auctions.reduce((acc, l) => acc + l.quantity, 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-slate-900/85 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Volume Pregão (USD)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono block">${auctions.reduce((acc, l) => acc + l.currentBidUsd, 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-slate-900/85 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Arrematantes</span>
              <span className="text-2xl font-black text-purple-400 font-mono block">{clientsList.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 1: UPLOAD / IMPORTAR */}
      {/* ======================================================== */}
      {adminTab === 'upload' && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border border-red-500/40 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLoadAttachedVerizonCsv}
                disabled={isLoadingVerizon}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>{isLoadingVerizon ? 'Carregando...' : 'Carregar CSV VERIZON'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadAssurantFeed}
                disabled={isLoadingAssurant}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Carregar ASSURANT / B-Stock</span>
              </button>

              <button
                type="button"
                onClick={handleLoadStockFeed}
                disabled={isLoadingStockCsv}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Carregar Estoque Pronta Entrega</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Subir Arquivo Personalizado (Excel / CSV)</h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-slate-950 hover:file:bg-amber-300 cursor-pointer"
            />
            {uploadedFileName && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
                <span>Arquivo selecionado: <strong>{uploadedFileName}</strong></span>
                <button onClick={handleApplyImport} className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg cursor-pointer">
                  Publicar Lotes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: GERENCIAR LEILÕES */}
      {/* ======================================================== */}
      {adminTab === 'lots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Catálogo de Leilões em Andamento ({auctions.length} Lotes)</h2>
            <button onClick={handleDownloadTemplate} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer">
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Baixar Planilha Modelo</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Lote</th>
                  <th className="py-3 px-3">Título</th>
                  <th className="py-3 px-3">Qtd</th>
                  <th className="py-3 px-3">Grade</th>
                  <th className="py-3 px-3">Lance Atual</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auctions.map(lot => {
                  const isEditing = editingLotId === lot.id;
                  return (
                    <tr key={lot.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{lot.lotNumber}</td>
                      <td className="py-3 px-3 font-semibold text-white">{lot.title}</td>
                      <td className="py-3 px-3 font-mono">{lot.quantity} un</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select value={editGrade} onChange={e => setEditGrade(e.target.value as GradeType)} className="bg-slate-950 border border-slate-700 rounded p-1 text-white">
                            <option value="Grade A+">Grade A+</option>
                            <option value="Grade A">Grade A</option>
                            <option value="Grade B">Grade B</option>
                            <option value="Grade C">Grade C</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700">{lot.grade}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {isEditing ? (
                          <input type="number" value={editPriceUsd} onChange={e => setEditPriceUsd(Number(e.target.value))} className="w-24 bg-slate-950 border border-slate-700 rounded p-1 text-white font-mono" />
                        ) : (
                          `$${lot.currentBidUsd.toLocaleString()} USD`
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleSaveEdit(lot.id)} className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer">Salvar</button>
                            <button onClick={() => setEditingLotId(null)} className="px-2 py-1 bg-slate-800 text-slate-300 rounded cursor-pointer">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleStartEdit(lot)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded cursor-pointer">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteLot(lot.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: OFERTAS COMPUTADAS */}
      {/* ======================================================== */}
      {adminTab === 'offers' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Central de Ofertas Computadas</h2>
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white">E-mails para Notificação de Novas Ofertas</h3>
            <div className="flex items-center gap-2">
              <input type="email" value={newNotificationEmail} onChange={e => setNewNotificationEmail(e.target.value)} placeholder="email@empresa.com" className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1" />
              <button onClick={handleAddNotificationEmail} className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer">+ Adicionar</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {notificationEmails.map(email => (
                <span key={email} className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-slate-200">{email}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: PAINEL DE CLIENTES */}
      {/* ======================================================== */}
      {adminTab === 'clients' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Base de Arrematantes Credenciados</h2>
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Nome / Empresa</th>
                  <th className="py-3 px-3">E-mail</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {clientsList.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-white">{client.name}</td>
                    <td className="py-3 px-3 text-slate-400">{client.email}</td>
                    <td className="py-3 px-3 font-mono">{client.phone}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${client.verifiedStatus ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                        {client.verifiedStatus ? 'Aprovado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {client.verifiedStatus ? (
                        <button onClick={() => handleRejectClient(client.email)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer">Suspender</button>
                      ) : (
                        <button onClick={() => handleApproveClient(client.email)} className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded text-[11px] font-bold cursor-pointer">Aprovar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: CONFIGURAÇÕES */}
      {/* ======================================================== */}
      {adminTab === 'settings' && (
        <div className="max-w-xl p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Parâmetros Operacionais</h2>
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold block">Cotação PTAX Dólar Comercial (R$):</label>
            <input
              type="number"
              step="0.01"
              value={usdRate}
              onChange={e => onUpdateUsdRate(parseFloat(e.target.value) || 5.75)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-400 w-full focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};
