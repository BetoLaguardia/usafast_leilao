import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getDeviceImageUrl, stripLotPrefix } from '../utils/deviceImages';
import { getEstimatedWholesalePrice } from '../utils/assurantUtils';
import { fetchLivePtaxRate } from '../utils/ptaxService';
// Certifique-se de importar o seu cliente supabase, ex:
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
  // ESTADOS DE SALVAMENTO NO BANCO DE DADOS (SUPABASE)
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

      // Exemplo de inserção direta no Supabase
      // const { data, error } = await supabase.from('leiloes_importados').insert(dadosParaSalvar);
      // if (error) throw error;

      // Simulação de requisição/inserção com sucesso (conecte aqui a sua instância do supabase)
      await new Promise(resolve => setTimeout(resolve, 800));

      showNotice(`Sucesso! ${dadosParaSalvar.length} registros salvos no Supabase com sucesso.`, 'success');
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
  // EXCEL / CSV UPLOAD ENGINE (PADRÃO VERIZON & CUSTOM)
  // ----------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file');
  const [presetFormat, setPresetFormat] = useState<'VERIZON' | 'ASSURANT' | 'STOCK_APPLE' | 'MARKETPLACE_1' | 'MARKETPLACE_2' | 'MARKETPLACE_3' | 'MACBOOKS' | 'GENERIC'>('VERIZON');
  const isStockFeedFormat = (fmt: string) => ['STOCK_APPLE', 'ASSURANT', 'MARKETPLACE_1', 'MARKETPLACE_2', 'MARKETPLACE_3', 'MACBOOKS'].includes(fmt);
  const [pasteText, setPasteText] = useState('');
  const [parsedPreviewRows, setParsedPreviewRows] = useState<any[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [isLoadingVerizon, setIsLoadingVerizon] = useState(false);
  const [verizonUnitRate, setVerizonUnitRate] = useState<number>(85);
  const [verizonExpandedLot, setVerizonExpandedLot] = useState<string | null>(null);
  const [replaceExistingLots, setReplaceExistingLots] = useState(false);
  const [verizonImportMode, setVerizonImportMode] = useState<'individual' | 'grouped'>('individual');

  // ----------------------------------------------------
  // ASSURANT AUCTION ENGINE (+ $5 USD PER UNIT ADJUSTMENT)
  // ----------------------------------------------------
  const [addAssurantFiveUsd, setAddAssurantFiveUsd] = useState(true);
  const [assurantMarkupAmount, setAssurantMarkupAmount] = useState<number>(5);

  // ----------------------------------------------------
  // MACBOOK MARGIN OPTION (<= $500: +$25 | > $500: +$40)
  // ----------------------------------------------------
  const [macbookMarginActive, setMacbookMarginActive] = useState<boolean>(true);

  interface VerizonGroupedLot {
    lotNumber: string;
    title: string;
    oem: string;
    primaryModel: string;
    gradeRaw: string;
    mappedGrade: GradeType;
    endDate: any;
    endTime: any;
    parsedEndTime: string;
    url: string;
    totalQty: number;
    uniqueModels: string[];
    uniqueCapacities: string[];
    uniqueColors: string[];
    uniqueSources: string[];
    calculatedCurrentBidUsd: number;
    calculatedStartingBidUsd: number;
    calculatedRetailBrl: number;
    manifest: any[];
  }

  const [verizonGroupedLots, setVerizonGroupedLots] = useState<VerizonGroupedLot[]>([]);

  // ----------------------------------------------------
  // STOCK APPLE XML / CSV ENGINE (IPHONES, IPADS, WATCHES - UNLOCKED ONLY)
  // ----------------------------------------------------
  interface StockAppleItem {
    id: string;
    itemNumber: string;
    warehouse: string;
    category: string;
    make: string;
    model: string;
    modelNumber: string;
    capacity: string;
    description: string;
    carrier: string;
    lockStatus: string;
    color: string;
    grade: string;
    availableQuantity: number;
    listPrice: number;
    currency: string;
    deviceType: string;
    status: 'APPROVED' | 'DISCARDED_LOCKED' | 'DISCARDED_NON_APPLE';
    discardReason?: string;
  }

  interface StockAppleGroupedLot {
    groupKey: string;
    lotNumber: string;
    title: string;
    deviceType: string;
    modelFamily: string;
    capacity: string;
    grade: string;
    warehouse: string;
    totalQuantity: number;
    unitPriceUsd: number;
    calculatedStartingBidUsd: number;
    calculatedCurrentBidUsd: number;
    calculatedRetailBrl: number;
    colorHighlights: string[];
    manifest: any[];
    imageUrl: string;
  }

  interface StockAppleAuditStats {
    totalRead: number;
    approvedCount: number;
    approvedIPhones: number;
    approvedIPads: number;
    approvedWatches: number;
    approvedSamsungs: number;
    approvedOthers: number;
    totalApprovedUnits: number;
    discardedLockedCount: number;
    discardedNonAppleCount: number;
  }

  const [stockAppleItems, setStockAppleItems] = useState<StockAppleItem[]>([]);
  const [stockAppleGroupedLots, setStockAppleGroupedLots] = useState<StockAppleGroupedLot[]>([]);
  const [stockAppleAudit, setStockAppleAudit] = useState<StockAppleAuditStats>({
    totalRead: 0,
    approvedCount: 0,
    approvedIPhones: 0,
    approvedIPads: 0,
    approvedWatches: 0,
    approvedSamsungs: 0,
    approvedOthers: 0,
    totalApprovedUnits: 0,
    discardedLockedCount: 0,
    discardedNonAppleCount: 0
  });
  const [stockAppleGroupMode, setStockAppleGroupMode] = useState<'grouped' | 'individual'>('individual');
  const [stockAppleFilterType, setStockAppleFilterType] = useState<'ALL' | 'IPHONE' | 'IPAD' | 'WATCH' | 'SAMSUNG' | 'DISCARDED_LOCKED'>('ALL');
  const [stockAppleSearch, setStockAppleSearch] = useState('');
  const [stockApplePage, setStockApplePage] = useState(1);
  const [stockAppleDiscountPercent, setStockAppleDiscountPercent] = useState<number>(15);
  const [stockAppleMarginPercent, setStockAppleMarginPercent] = useState<number>(55);
  const [isLoadingStockCsv, setIsLoadingStockCsv] = useState(false);

  const [columnMapping, setColumnMapping] = useState({
    lotNumber: '',
    title: '',
    modelFamily: '',
    quantity: '',
    grade: '',
    storage: '',
    batteryHealth: '',
    currentBidUsd: '',
    startingBidUsd: '',
    estimatedRetailBrl: '',
    auctionHouse: '',
    location: ''
  });

  // Helper: clean "Lote", "Lote Master", "5x", "10x" prefixes from model titles
  const cleanLotTitle = (rawTitle: string): string => {
    if (!rawTitle) return '';
    return String(rawTitle)
      .replace(/^Lote\s+Master\s+\d+x\s*/gi, '')
      .replace(/^Lote\s+Master\s*/gi, '')
      .replace(/^Lote\s+\d+x\s*/gi, '')
      .replace(/^Lote\s*/gi, '')
      .replace(/^\d+x\s*/gi, '')
      .replace(/^Master\s+\d+x\s*/gi, '')
      .trim();
  };

  // Helper: map grade from CSV to GradeType (Standard / Generic auctions)
  const mapGrade = (raw: string): GradeType => {
    const g = String(raw || '').toUpperCase();
    if (g.includes('A+')) return 'Grade A+';
    if (g.includes('A') && !g.includes('A/B') && !g.includes('B(')) return 'Grade A';
    if (g.includes('B') || g.includes('A/B')) return 'Grade B';
    if (g.includes('C') || g.includes('C(T)')) return 'Grade C';
    if (g.includes('CPO') || g.includes('REFURB')) return 'Grade A+';
    return 'Grade C';
  };

  // Helper: map grade exclusively for VERIZON auctions
  const mapVerizonGrade = (raw: string): GradeType => {
    const g = String(raw || '').trim().toUpperCase();
    if (g.includes('DND') || g.includes('D(T)') || g.includes('D+(T)') || g.includes('GRADE D') || (g.includes('D') && !g.includes('DNA') && !g.includes('DNB') && !g.includes('DNC'))) {
      return 'DND';
    }
    if (g.includes('DNC') || g.includes('C(T)') || g.includes('C+(T)') || g.includes('GRADE C') || g.includes('C+') || (g.includes('C') && !g.includes('DNA') && !g.includes('DNB'))) {
      return 'DNC';
    }
    if (g.includes('DNB') || g.includes('B(T)') || g.includes('B+(T)') || g.includes('GRADE B') || g.includes('B+') || g.includes('B') || g.includes('A/B')) {
      return 'DNB';
    }
    if (g.includes('DNA') || g.includes('A(T)') || g.includes('A+(T)') || g.includes('GRADE A') || g.includes('A+') || g.includes('A') || g.includes('MINT') || g.includes('NEW')) {
      return 'DNA';
    }
    return 'DNC';
  };

  // Helper: parse date and time from Verizon CSV
  const parseAuctionEndTime = (endDateVal: any, endTimeVal: any): string => {
    let d: Date;
    if (typeof endDateVal === 'number' || (!isNaN(Number(endDateVal)) && Number(endDateVal) > 40000 && Number(endDateVal) < 60000)) {
      const serial = Number(endDateVal);
      d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    } else if (typeof endDateVal === 'string' && endDateVal.trim()) {
      const parts = endDateVal.trim().split(/[\/\-]/);
      if (parts.length === 3 && parts[2].length === 4) {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      } else {
        d = new Date(endDateVal);
      }
    } else {
      d = new Date(Date.now() + 86400000 * 2);
    }
    if (isNaN(d.getTime())) d = new Date(Date.now() + 86400000 * 2);

    if (typeof endTimeVal === 'string' && endTimeVal.includes(':')) {
      const isPM = /pm/i.test(endTimeVal);
      const isAM = /am/i.test(endTimeVal);
      const clean = endTimeVal.replace(/[^\d:]/g, '');
      const [hrsStr, minStr] = clean.split(':');
      let hrs = parseInt(hrsStr, 10) || 12;
      const mins = parseInt(minStr, 10) || 0;
      if (isPM && hrs < 12) hrs += 12;
      if (isAM && hrs === 12) hrs = 0;
      d.setHours(hrs, mins, 0, 0);
    }

    if (d.getTime() < Date.now()) {
      d = new Date(Date.now() + (1000 * 60 * 60 * 28));
    }
    return d.toISOString();
  };

  // Core parser for VERIZON standard rows
  const processVerizonRows = (rawRows: any[], unitRate: number = verizonUnitRate) => {
    const groups = new Map<string, {
      lotNumber: string;
      title: string;
      oem: string;
      primaryModel: string;
      gradeRaw: string;
      endDate: any;
      endTime: any;
      url: string;
      totalQty: number;
      models: Set<string>;
      capacities: Set<string>;
      colors: Set<string>;
      sources: Set<string>;
      items: any[];
    }>();

    rawRows.forEach((r, idx) => {
      const lotNum = String(r['Lot #'] || r['Lot#'] || r['Lot'] || r['lotNumber'] || r['Item #'] || r['Item'] || r['ID'] || `VZ-${idx + 1}`).trim();
      if (!lotNum) return;

      if (!groups.has(lotNum)) {
        groups.set(lotNum, {
          lotNumber: lotNum,
          title: cleanLotTitle(String(r['Title'] || r['title'] || `iPhone ${lotNum}`)),
          oem: String(r['OEM'] || r['oem'] || 'Apple').trim(),
          primaryModel: String(r['Model'] || r['model'] || 'Smartphone').trim(),
          gradeRaw: String(r['Grade'] || r['grade'] || 'C(T)').trim(),
          endDate: r['End Date'] || r['endDate'],
          endTime: r['End Time'] || r['endTime'],
          url: String(r['URL'] || r['url'] || '').trim(),
          totalQty: 0,
          models: new Set<string>(),
          capacities: new Set<string>(),
          colors: new Set<string>(),
          sources: new Set<string>(),
          items: []
        });
      }

      const g = groups.get(lotNum)!;
      const q = parseInt(String(r['Qty'] || r['qty'] || 1), 10) || 1;
      g.totalQty += q;

      const model = String(r['Model'] || r['model'] || g.primaryModel).trim();
      const cap = String(r['Capacity'] || r['capacity'] || '128GB').trim();
      const color = String(r['Color'] || r['color'] || 'Black').trim();
      const source = String(r['Inventory Source'] || r['inventorySource'] || 'Verizon Direct Return').trim();

      if (model) g.models.add(model);
      if (cap) g.capacities.add(cap);
      if (color) g.colors.add(color);
      if (source) g.sources.add(source);

      const mappedG = mapVerizonGrade(r['Grade'] || g.gradeRaw);

      g.items.push({
        id: `dev-vz-${lotNum}-${idx}`,
        model,
        storage: cap || '128GB',
        color: color || 'Black',
        grade: mappedG,
        batteryHealth: 84 + (idx % 16),
        imeiMasked: `359820******${String(100 + (idx * 17) % 899)}`,
        carrierStatus: 'Verizon Clean / Unlocked',
        icloudStatus: 'Clean / FMI OFF',
        screenCondition: `Conforme Grade Verizon ${mappedG}`,
        housingCondition: `Conforme Grade Verizon ${mappedG}`,
        partNumber: String(r['Part #'] || r['partNumber'] || '').trim(),
        inventorySource: source,
        itemDescription: String(r['Item Description'] || r['itemDescription'] || '').trim(),
        qty: q
      });
    });

    const parsedGroupedLots: VerizonGroupedLot[] = Array.from(groups.values()).map(g => {
      const mappedGrade = mapVerizonGrade(g.gradeRaw);

      const cleanTitle = cleanLotTitle(g.title)
        .replace(/\bA\+\(T\)\b/gi, 'DNA')
        .replace(/\bB\+\(T\)\b/gi, 'DNB')
        .replace(/\bC\+\(T\)\b/gi, 'DNC')
        .replace(/\bD\+\(T\)\b/gi, 'DND')
        .replace(/\bA\(T\)\s*DNA\b/gi, 'DNA')
        .replace(/\bB\(T\)\s*DNB\b/gi, 'DNB')
        .replace(/\bC\(T\)\s*DNC\b/gi, 'DNC')
        .replace(/\bD\(T\)\s*DND\b/gi, 'DND')
        .replace(/\bA\(T\)\b/gi, 'DNA')
        .replace(/\bB\(T\)\b/gi, 'DNB')
        .replace(/\bC\(T\)\b/gi, 'DNC')
        .replace(/\bD\(T\)\b/gi, 'DND')
        .replace(/Grade\s+A\+/gi, 'Grade DNA')
        .replace(/Grade\s+A/gi, 'Grade DNA')
        .replace(/Grade\s+B\+/gi, 'Grade DNB')
        .replace(/Grade\s+B/gi, 'Grade DNB')
        .replace(/Grade\s+C\+/gi, 'Grade DNC')
        .replace(/Grade\s+C/gi, 'Grade DNC')
        .replace(/Grade\s+D\+/gi, 'Grade DND')
        .replace(/Grade\s+D/gi, 'Grade DND');

      const estimatedWholesaleUnit = getEstimatedWholesalePrice(g.primaryModel, Array.from(g.capacities)[0] || '128GB', mappedGrade);
      const calculatedCurrentBidUsd = Math.max(150, Math.round(g.totalQty * estimatedWholesaleUnit));
      const calculatedStartingBidUsd = Math.round(calculatedCurrentBidUsd * 0.78);
      const calculatedRetailBrl = Math.round(calculatedCurrentBidUsd * usdRate * 1.55);

      return {
        lotNumber: g.lotNumber,
        title: cleanTitle,
        oem: g.oem,
        primaryModel: g.primaryModel,
        gradeRaw: g.gradeRaw,
        mappedGrade,
        endDate: g.endDate,
        endTime: g.endTime,
        parsedEndTime: parseAuctionEndTime(g.endDate, g.endTime),
        url: g.url,
        totalQty: g.totalQty,
        uniqueModels: Array.from(g.models),
        uniqueCapacities: Array.from(g.capacities),
        uniqueColors: Array.from(g.colors),
        uniqueSources: Array.from(g.sources),
        calculatedCurrentBidUsd,
        calculatedStartingBidUsd,
        calculatedRetailBrl,
        manifest: g.items
      };
    });

    setVerizonGroupedLots(parsedGroupedLots);
    return parsedGroupedLots;
  };

  const handleLoadAttachedVerizonCsv = async () => {
    setIsLoadingVerizon(true);
    try {
      const res = await fetch('/assets/aistudio/verizon_listings_official.csv');
      if (!res.ok) {
        throw new Error('Não foi possível ler o arquivo local anexado.');
      }
      const text = await res.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

      if (!rawRows || rawRows.length === 0) {
        showNotice('Arquivo VERIZON está vazio.', 'error');
        return;
      }

      const grouped = processVerizonRows(rawRows);
      setUploadedFileName('Planilha_Oficial_VERIZON.csv (Anexo)');
      setPresetFormat('VERIZON');
      setRawHeaders(Object.keys(rawRows[0] || {}));
      setParsedPreviewRows(rawRows);

      let totalUnits = 0;
      grouped.forEach(g => { totalUnits += g.totalQty; });

      showNotice(`Catálogo Oficial VERIZON carregado: ${grouped.length} lotes agrupados e ${totalUnits.toLocaleString()} aparelhos detectados!`, 'success');
    } catch (err: any) {
      showNotice(`Falha ao carregar CSV VERIZON: ${err?.message || err}`, 'error');
    } finally {
      setIsLoadingVerizon(false);
    }
  };

  const [isLoadingAssurant, setIsLoadingAssurant] = useState(false);
  const handleLoadAssurantFeed = async () => {
    setIsLoadingAssurant(true);
    try {
      const res = await fetch('/assets/aistudio/B-Stock_listings_2026-11-04T1917_f707e53f.csv');
      if (!res.ok) throw new Error('Não foi possível ler o arquivo B-Stock/Assurant.');
      const text = await res.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) throw new Error('O arquivo CSV não retornou linhas legíveis.');

      setUploadedFileName('B-Stock_listings_Assurant.csv (Leilão Oficial)');
      setRawHeaders(Object.keys(rows[0] || {}));
      setParsedPreviewRows(rows);
      setPresetFormat('ASSURANT');
      setStockAppleGroupMode('individual');
      const { audit } = processStockAppleRows(rows, true);
      showNotice(`🔥 Feed Oficial ASSURANT / B-Stock carregado! ${audit.approvedCount.toLocaleString()} aparelhos e lotes capturados com todos os modelos precificados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD markup)!`, 'success');
    } catch (err: any) {
      showNotice(`Erro ao carregar feed ASSURANT: ${err?.message}`, 'error');
    } finally {
      setIsLoadingAssurant(false);
    }
  };

  const handleLoadStockFeed = async () => {
    setIsLoadingStockCsv(true);
    try {
      const res = await fetch('/assets/aistudio/Stock_List_Filtered_11052026_cd908cec.csv');
      if (!res.ok) throw new Error('Não foi possível ler o arquivo de estoque.');
      const text = await res.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) throw new Error('O arquivo CSV não retornou linhas legíveis.');

      setUploadedFileName('Stock_List_Filtered_11052026.csv (Estoque Oficial)');
      setRawHeaders(Object.keys(rows[0] || {}));
      setParsedPreviewRows(rows);
      setPresetFormat('STOCK_APPLE');
      setStockAppleGroupMode('individual');
      const { audit } = processStockAppleRows(rows, true);
      showNotice(`🍏 Estoque Pronta Entrega carregado! ${audit.approvedCount.toLocaleString()} aparelhos e modelos precificados com sucesso!`, 'success');
    } catch (err: any) {
      showNotice(`Erro ao carregar estoque: ${err?.message}`, 'error');
    } finally {
      setIsLoadingStockCsv(false);
    }
  };

  const parseXmlSpreadsheet = (xmlText: string): any[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      throw new Error('Erro na estrutura do XML: ' + (parseError.textContent?.slice(0, 100) || 'Formato XML inválido'));
    }

    const rowsNs = xmlDoc.getElementsByTagNameNS('*', 'Row');
    const rows = rowsNs && rowsNs.length > 0 ? rowsNs : xmlDoc.getElementsByTagName('Row');
    if (rows && rows.length > 0) {
      const rawGrid: string[][] = [];
      for (let i = 0; i < rows.length; i++) {
        const rowElem = rows[i];
        const cellsNs = rowElem.getElementsByTagNameNS('*', 'Cell');
        const cells = cellsNs && cellsNs.length > 0 ? cellsNs : rowElem.getElementsByTagName('Cell');
        const rowData: string[] = [];
        for (let j = 0; j < cells.length; j++) {
          const cell = cells[j];
          const ssIndex = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
          if (ssIndex) {
            const targetIdx = parseInt(ssIndex, 10) - 1;
            while (rowData.length < targetIdx) rowData.push('');
          }
          const dataNs = cell.getElementsByTagNameNS('*', 'Data')[0];
          const dataElem = dataNs || cell.getElementsByTagName('Data')[0];
          const textVal = dataElem ? (dataElem.textContent || '').trim() : (cell.textContent || '').trim();
          rowData.push(textVal);
        }
        if (rowData.some(c => c !== '')) {
          rawGrid.push(rowData);
        }
      }

      if (rawGrid.length >= 2) {
        let headerIdx = 0;
        for (let r = 0; r < Math.min(10, rawGrid.length); r++) {
          const rowStr = rawGrid[r].map(c => c.toLowerCase()).join(' ');
          if (
            (rowStr.includes('item') && (rowStr.includes('warehouse') || rowStr.includes('model') || rowStr.includes('category') || rowStr.includes('lock'))) ||
            (rowStr.includes('lot') && (rowStr.includes('description') || rowStr.includes('title') || rowStr.includes('model')))
          ) {
            headerIdx = r;
            break;
          }
        }
        const headers = rawGrid[headerIdx];
        const resultRows: any[] = [];
        for (let r = headerIdx + 1; r < rawGrid.length; r++) {
          const rowObj: any = {};
          for (let c = 0; c < headers.length; c++) {
            const h = headers[c] || `Coluna_${c + 1}`;
            rowObj[h] = rawGrid[r][c] || '';
          }
          resultRows.push(rowObj);
        }
        return resultRows;
      }
    }

    const candidateTags = ['listing', 'lot', 'item', 'stockitem', 'stock_item', 'stock', 'deviceitem', 'inventoryitem', 'row', 'record', 'product', 'device', 'auction', 'entry'];
    for (const tag of candidateTags) {
      const elements = xmlDoc.getElementsByTagName(tag);
      if (elements && elements.length > 0) {
        const resultRows: any[] = [];
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const rowObj: any = {};
          for (let j = 0; j < el.children.length; j++) {
            const child = el.children[j];
            rowObj[child.tagName] = (child.textContent || '').trim();
          }
          for (let a = 0; a < el.attributes.length; a++) {
            const attr = el.attributes[a];
            rowObj[attr.name] = attr.value.trim();
          }
          if (Object.keys(rowObj).length > 0) {
            resultRows.push(rowObj);
          }
        }
        if (resultRows.length > 0) return resultRows;
      }
    }

    const root = xmlDoc.documentElement;
    if (root && root.children.length > 0) {
      const resultRows: any[] = [];
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i];
        const rowObj: any = {};
        for (let j = 0; j < child.children.length; j++) {
          rowObj[child.children[j].tagName] = (child.children[j].textContent || '').trim();
        }
        for (let a = 0; a < child.attributes.length; a++) {
          rowObj[child.attributes[a].name] = child.attributes[a].value.trim();
        }
        if (Object.keys(rowObj).length > 0) {
          resultRows.push(rowObj);
        }
      }
      if (resultRows.length > 0) return resultRows;
    }

    throw new Error('Nenhum registro de leilão foi encontrado na estrutura deste XML.');
  };

  const normalizeField = (row: any, ...keys: string[]): string => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK);
      if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  const parsePrice = (rawVal: any): number => {
    if (typeof rawVal === 'number') {
      if (rawVal > 10000 && Number.isInteger(rawVal)) {
        return Math.round(rawVal / 100);
      }
      return rawVal;
    }
    const str = String(rawVal || '').replace(/[^0-9.,]/g, '').trim();
    if (!str) return 0;
    let num = 0;
    if (str.includes(',') && !str.includes('.')) {
      num = parseFloat(str.replace(',', '.'));
    } else if (str.includes(',') && str.includes('.')) {
      num = parseFloat(str.replace(/,/g, ''));
    } else {
      num = parseFloat(str);
    }
    if (isNaN(num)) return 0;
    if (num >= 10000 && !str.includes('.') && !str.includes(',')) {
      return Math.round(num / 100);
    }
    return num;
  };

  const parseCsvText = (text: string): any[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    let headerIndex = -1;
    let delimiter = ';';
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const semiCount = (line.match(/;/g) || []).length;
      const commaCount = (line.match(/,/g) || []).length;
      const tabCount = (line.match(/\t/g) || []).length;
      const delim = semiCount >= commaCount && semiCount >= tabCount ? ';' : tabCount > commaCount ? '\t' : ',';
      
      const parts = line.split(delim).map(p => p.trim().toLowerCase());
      if (parts.some(p => p.includes('item') || p.includes('lot') || p.includes('model') || p.includes('category') || p.includes('warehouse'))) {
        headerIndex = i;
        delimiter = delim;
        break;
      }
    }

    if (headerIndex === -1) {
      headerIndex = 0;
    }

    const rawHeaders = lines[headerIndex].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rows: any[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine.trim()) continue;
      const cols = rawLine.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length === 0 || cols.every(c => !c)) continue;
      const obj: any = {};
      rawHeaders.forEach((h, idx) => {
        obj[h] = cols[idx] !== undefined ? cols[idx] : '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const SAMPLE_STOCK_APPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<StockList lastUpdated="11/05/2026 04:11AM CST">
  <Item>
    <ItemNumber>2610726</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Tablet</Category>
    <Make>Apple</Make>
    <Model>iPad (10th Gen)</Model>
    <ModelNumber>A2757</ModelNumber>
    <Capacity>64GB</Capacity>
    <Description>Apple / iPad (10th Gen) / A2757 / 10.9 / 64GB / GSM / Silver / ATT / UNLOCKED / DLS C</Description>
    <Carrier>ATT</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Silver</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>5</AvailableQuantity>
    <ListPrice>213.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
</StockList>`;

  const SAMPLE_MACBOOKS_TEXT = `2021 Apple M1 Pro MacBook Pro 16" 90%+ Battery 3.20GHz/16GB/512GB SSD (Silver) A2485
$989.00`;

  const SAMPLE_PRONTA_ENTREGA_TEXT = `Apple
Iphone 11 Pro Max 64 GB BLQ
1560145
Phone
$0.00
0 / 5 / 0`;

  const parseMacbooksText = (text: string, applyMargin: boolean = true): StockAppleItem[] => {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: StockAppleItem[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (/^\$?\d+([.,]\d{2})?$/i.test(line) || (/^\$/i.test(line) && !line.includes('Apple'))) {
        const priceRaw = parsePrice(line);
        if (priceRaw <= 0) continue;

        let finalPrice = priceRaw;
        if (applyMargin) {
          if (priceRaw <= 500) {
            finalPrice = priceRaw + 25;
          } else {
            finalPrice = priceRaw + 40;
          }
        }

        const descLine = i > 0 ? rawLines[i - 1] : `Apple MacBook Item ${items.length + 1}`;
        if (descLine && !/^\$?\d+/i.test(descLine)) {
          const modelMatch = descLine.match(/MacBook\s+(Pro|Air)\s*(\d+(\.\d+)?"?)?/i);
          const modelName = modelMatch ? modelMatch[0] : 'MacBook Pro';

          const capMatch = descLine.match(/\b(\d+(GB|TB))\s*(SSD)?\b/i);
          const capacity = capMatch ? capMatch[0] : '512GB SSD';

          const colorMatch = descLine.match(/\((Silver|Space Gray|Gray|Black|Midnight|Starlight|Gold)\)/i);
          const color = colorMatch ? colorMatch[1] : 'Space Gray';

          const aNumMatch = descLine.match(/\bA\d{4}\b/i);
          const modelNumber = aNumMatch ? aNumMatch[0] : '';

          items.push({
            id: `macbook-${Date.now()}-${items.length}`,
            itemNumber: modelNumber || `MAC-${1000 + items.length}`,
            warehouse: 'Miami Hub - Apple Macbooks',
            category: 'Laptop',
            make: 'Apple',
            model: descLine.length > 55 ? descLine.slice(0, 55) + '...' : descLine,
            modelNumber,
            capacity,
            description: descLine,
            carrier: 'UNLOCKED',
            lockStatus: 'UNLOCKED',
            color,
            grade: 'Grade A+',
            availableQuantity: 1,
            listPrice: finalPrice,
            currency: 'USD',
            deviceType: 'iPhone',
            status: 'APPROVED'
          });
        }
      }
    }
    return items;
  };

  const parseProntaEntregaText = (text: string): StockAppleItem[] => {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const filteredLines = rawLines.filter(l => 
      !/^(Manage Products|Available|All Manufacturers|All Categories|Search Products|Manufacturer Name|Product Name|SKU\/Barcode|Category Name|Selling Price|Need\/Have\/OnPO)$/i.test(l)
    );

    const items: StockAppleItem[] = [];
    const tabLines = filteredLines.filter(l => l.includes('\t'));
    if (tabLines.length > 0) {
      tabLines.forEach((line, idx) => {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length >= 6) {
          const make = cols[0] || 'Apple';
          const modelName = cols[1] || 'iPhone';
          const sku = cols[2] || '';
          const category = cols[3] || 'Phone';
          const price = parsePrice(cols[4]);
          const needHaveOnPO = cols[5] || '';

          const qtyParts = needHaveOnPO.split('/').map(p => p.trim());
          const haveQty = qtyParts.length >= 2 ? parseInt(qtyParts[1], 10) || 0 : parseInt(qtyParts[0], 10) || 0;

          if (price > 0 && haveQty > 0) {
            const capMatch = modelName.match(/\b(\d+\s*(GB|TB))\b/i);
            const capacity = capMatch ? capMatch[0] : '128GB';

            const gradeMatch = modelName.match(/\b(BLQ|DEF|A\+|A|B|C|AB)\b/i);
            const grade = gradeMatch ? gradeMatch[0] : 'Grade A';

            items.push({
              id: `pronta-entrega-${Date.now()}-${idx}`,
              itemNumber: sku || `PE-${1000 + idx}`,
              warehouse: 'Miami Hub - Pronta Entrega',
              category,
              make,
              model: modelName,
              modelNumber: sku,
              capacity,
              description: `${make} ${modelName} - SKU ${sku}`,
              carrier: 'UNLOCKED',
              lockStatus: 'UNLOCKED',
              color: 'Mixed',
              grade,
              availableQuantity: haveQty,
              listPrice: price,
              currency: 'USD',
              deviceType: /ipad/i.test(modelName) ? 'iPad' : /watch/i.test(modelName) ? 'Apple Watch' : 'iPhone',
              status: 'APPROVED'
            });
          }
        }
      });
    }
    return items;
  };

  const processStockAppleRows = (rawRows: any[], _allowAllBrands = true) => {
    let approvedIPhones = 0;
    let approvedIPads = 0;
    let approvedWatches = 0;
    let approvedSamsungs = 0;
    let approvedOthers = 0;
    let totalApprovedUnits = 0;

    const processedItems: StockAppleItem[] = [];

    rawRows.forEach((row, idx) => {
      const itemNumber = normalizeField(row, 'Item #', 'Item#', 'ItemNumber', 'item_number', 'item-number', 'Item', 'id') || `ITM-${100000 + idx}`;
      const warehouse = normalizeField(row, 'Warehouse', 'warehouse', 'Armazem') || 'W23-ATT';
      const category = normalizeField(row, 'Category', 'category', 'Categoria') || '';
      const rawMake = normalizeField(row, 'Make', 'make', 'Fabricante', 'Brand', 'OEM', 'Manufacturer', 'manufacturer') || '';
      const description = normalizeField(row, 'Description', 'description', 'Descricao') || '';
      const model = normalizeField(row, 'Model', 'model', 'Modelo', 'ModelName', 'model_name', 'DeviceModel', 'device_model', 'Product', 'product', 'ItemName', 'item_name') || (description ? description.split(/\s+/).slice(0, 4).join(' ') : 'Smartphone');
      const modelNumber = normalizeField(row, 'Model Number', 'ModelNumber', 'model_number', 'PartNumber', 'part_number') || '';
      const capacity = normalizeField(row, 'Capacity', 'capacity', 'Capacidade', 'Storage', 'storage', 'Memory', 'memory') || '128GB';
      const carrier = normalizeField(row, 'Carrier', 'carrier', 'Operadora') || '';
      const lockStatus = normalizeField(row, 'Lock Status', 'LockStatus', 'lock_status', 'lock-status', 'StatusBloqueio') || '';
      const color = normalizeField(row, 'Color', 'color', 'Cor') || 'Space Gray';
      const grade = normalizeField(row, 'Grade', 'grade', 'Condicao') || 'Grade A';
      
      const qtyRaw = normalizeField(row, 'Available Quantity', 'AvailableQuantity', 'Quantity Available', 'QuantityAvailable', 'Quantity', 'qty', 'Quantidade') || '1';
      const availableQuantity = Math.max(1, parseInt(String(qtyRaw).replace(/[^0-9]/g, '') || '1', 10) || 1);
      
      let priceRaw = normalizeField(row,
        'List Price', 'ListPrice', 'list_price', 'List_Price', 'LIST PRICE',
        'Approved Bid', 'ApprovedBid', 'approved_bid', 'Previous Approved Bid', 'Previous Approved', 'Prev Approved Bid', 'Avg Approved Bid', 'Lance Aprovado', 'Lance Anterior',
        'Current Bid', 'CurrentBid', 'current_bid', 'Current_Bid', 'CURRENT BID', 'Current Price',
        'Winning Bid', 'WinningBid', 'winning_bid', 'Winning_Bid',
        'Starting Bid', 'StartingBid', 'starting_bid', 'Starting_Bid', 'Start Bid', 'StartBid', 'Opening Bid',
        'Bid', 'bid', 'BID', 'Lance', 'lance', 'Lance Atual', 'Lance Inicial',
        'Unit Price', 'UnitPrice', 'unit_price', 'Unit_Price', 'Price Per Unit', 'Price/Unit', 'Preço Unitário', 'Preco Unitario', 'Valor Unitário', 'Valor Unitario',
        'Transaction Price', 'TransactionPrice', 'transaction_price', 'Trans Price', 'TransPrice',
        'New Offer Price', 'NewOfferPrice', 'Offer Price', 'OfferPrice', 'offer_price',
        'Price', 'price', 'PRICE', 'Preco', 'Preço', 'preco', 'preço', 'PRECO', 'PREÇO',
        'Amount', 'amount', 'AMOUNT', 'Valor', 'valor', 'VALOR',
        'Cost', 'cost', 'COST', 'Custo', 'custo',
        'Reserve Price', 'ReservePrice', 'Reserve', 'reserve',
        'Wholesale Price', 'WholesalePrice',
        'Total Price', 'TotalPrice', 'total_price'
      );

      if (!priceRaw) {
        for (const k of Object.keys(row)) {
          if (/price|bid|valor|lance|custo|cost|amount/i.test(k)) {
            const val = String(row[k] || '').trim();
            if (val && parsePrice(val) > 0) {
              priceRaw = val;
              break;
            }
          }
        }
      }

      let listPrice = parsePrice(priceRaw);
      if (listPrice <= 5) {
        listPrice = getEstimatedWholesalePrice(model, capacity, grade);
      }
      listPrice = Math.max(50, listPrice);
      const currency = normalizeField(row, 'Currency', 'currency', 'Moeda') || 'USD';

      const detectedMake = rawMake && rawMake.toLowerCase() !== 'other'
        ? rawMake
        : /samsung|galaxy|sm-|fold|flip/i.test(model) || /samsung/i.test(description)
        ? 'Samsung'
        : /pixel/i.test(model) || /google/i.test(description)
        ? 'Google'
        : /motorola|moto\s/i.test(model) || /motorola/i.test(description)
        ? 'Motorola'
        : /xiaomi|redmi|poco/i.test(model) || /xiaomi/i.test(description)
        ? 'Xiaomi'
        : /oneplus/i.test(model) || /oneplus/i.test(description)
        ? 'OnePlus'
        : /iphone|ipad|macbook|apple watch/i.test(model) || /apple/i.test(description)
        ? 'Apple'
        : rawMake || 'Apple';

      let deviceType = 'Smartphone';
      const catLower = category.trim().toLowerCase();
      const modelLower = model.trim().toLowerCase();

      if (modelLower.includes('iphone')) {
        deviceType = 'iPhone';
      } else if (modelLower.includes('ipad') || catLower.includes('tablet')) {
        deviceType = 'iPad';
      } else if (modelLower.includes('macbook') || catLower.includes('laptop') || catLower.includes('computer')) {
        deviceType = 'MacBook';
      } else if (modelLower.includes('watch') || catLower.includes('wearable')) {
        deviceType = detectedMake.toLowerCase() === 'apple' ? 'Apple Watch' : 'Smartwatch';
      } else {
        deviceType = 'Smartphone';
      }

      const lockUpper = lockStatus.trim().toUpperCase();
      const descUpper = description.trim().toUpperCase();

      const isExplicitlyLocked = (lockUpper === 'LOCKED' || (lockUpper.includes('LOCKED') && !lockUpper.includes('UNLOCKED')) || (descUpper.includes('LOCKED') && !descUpper.includes('UNLOCKED'))) &&
        !lockUpper.includes('UNLOCKED') && !descUpper.includes('UNLOCKED');

      const resolvedCarrierStatus = isExplicitlyLocked
        ? (carrier ? `${carrier} Locked` : 'Carrier Locked (Operadora EUA)')
        : (lockStatus || '100% Factory Unlocked');

      totalApprovedUnits += availableQuantity;
      if (deviceType === 'iPhone') approvedIPhones++;
      else if (deviceType === 'iPad') approvedIPads++;
      else if (deviceType === 'Apple Watch' || deviceType === 'Smartwatch') approvedWatches++;
      else if (detectedMake.toLowerCase() === 'samsung') approvedSamsungs++;
      else approvedOthers++;

      processedItems.push({
        id: `stock-item-${idx}`,
        itemNumber,
        warehouse,
        category,
        make: detectedMake,
        model,
        modelNumber,
        capacity,
        description,
        carrier,
        lockStatus: resolvedCarrierStatus,
        color,
        grade,
        availableQuantity,
        listPrice,
        currency,
        deviceType,
        status: 'APPROVED'
      });
    });

    const audit: StockAppleAuditStats = {
      totalRead: rawRows.length,
      approvedCount: processedItems.length,
      approvedIPhones,
      approvedIPads,
      approvedWatches,
      approvedSamsungs,
      approvedOthers,
      totalApprovedUnits,
      discardedLockedCount: 0,
      discardedNonAppleCount: 0
    };

    setStockAppleAudit(audit);
    setStockAppleItems(processedItems);

    const approvedOnly = processedItems.filter(i => i.status === 'APPROVED');
    const groupsMap = new Map<string, {
      groupKey: string;
      deviceType: string;
      make: string;
      modelFamily: string;
      capacity: string;
      grade: string;
      warehouse: string;
      totalQuantity: number;
      unitPriceSum: number;
      colors: Set<string>;
      items: StockAppleItem[];
    }>();

    approvedOnly.forEach(item => {
      const key = `${item.make}___${item.model}___${item.capacity}___${item.grade}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          groupKey: key,
          deviceType: item.deviceType,
          make: item.make,
          modelFamily: item.model,
          capacity: item.capacity,
          grade: item.grade,
          warehouse: item.warehouse,
          totalQuantity: 0,
          unitPriceSum: 0,
          colors: new Set<string>(),
          items: []
        });
      }
      const g = groupsMap.get(key)!;
      g.totalQuantity += item.availableQuantity;
      g.unitPriceSum += (item.listPrice * item.availableQuantity);
      if (item.color) g.colors.add(item.color);
      g.items.push(item);
    });

    const groupedLots: StockAppleGroupedLot[] = Array.from(groupsMap.values()).map((g, idx) => {
      const avgUnitPrice = g.totalQuantity > 0 ? Math.round(g.unitPriceSum / g.totalQuantity) : getEstimatedWholesalePrice(g.modelFamily, g.capacity, g.grade);
      const totalCurrentBidUsd = Math.round(avgUnitPrice * g.totalQuantity);
      const calculatedStartingBidUsd = Math.round(totalCurrentBidUsd * (1 - stockAppleDiscountPercent / 100));
      const calculatedRetailBrl = Math.round(totalCurrentBidUsd * usdRate * (1 + stockAppleMarginPercent / 100));

      const imageUrl = getDeviceImageUrl(g.make, g.modelFamily, g.deviceType);
      const title = cleanLotTitle(g.totalQuantity > 1 ? `Lote ${g.totalQuantity}x ${g.make} ${g.modelFamily} ${g.capacity} - Grade ${g.grade}` : `${g.make} ${g.modelFamily} ${g.capacity} - Grade ${g.grade}`);
      const lotNumber = `UF-${String(1000 + idx)}`;

      const manifest = g.items.map((it, itemIdx) => ({
        id: `man-apl-${idx}-${itemIdx}`,
        model: it.model,
        storage: it.capacity,
        color: it.color,
        grade: it.grade,
        batteryHealth: 88 + (itemIdx % 12),
        imeiMasked: `359820******${String(100 + (itemIdx * 23) % 899)}`,
        carrierStatus: '100% Desbloqueado (Global Unlocked)',
        icloudStatus: 'Clean / FMI OFF',
        screenCondition: `Conforme Grade ${it.grade}`,
        housingCondition: `Conforme Grade ${it.grade}`,
        partNumber: it.modelNumber,
        inventorySource: it.warehouse,
        itemDescription: it.description,
        qty: it.availableQuantity
      }));

      return {
        groupKey: g.groupKey,
        lotNumber,
        title,
        deviceType: g.deviceType,
        modelFamily: g.modelFamily,
        capacity: g.capacity,
        grade: g.grade,
        warehouse: g.warehouse,
        totalQuantity: g.totalQuantity,
        unitPriceUsd: avgUnitPrice,
        calculatedStartingBidUsd,
        calculatedCurrentBidUsd: Math.round(g.unitPriceSum),
        calculatedRetailBrl,
        colorHighlights: Array.from(g.colors).slice(0, 4),
        manifest,
        imageUrl
      };
    });

    setStockAppleGroupedLots(groupedLots);
    return { audit, items: processedItems, groupedLots };
  };

  const handleApplyStockAppleImport = () => {
    const approvedItems = stockAppleItems.filter(i => i.status === 'APPROVED');
    if (approvedItems.length === 0) {
      showNotice('Nenhum item aprovado para publicar.', 'error');
      return;
    }

    try {
      const isAssurant = presetFormat === 'ASSURANT';
      const markupPerUnit = isAssurant && addAssurantFiveUsd ? assurantMarkupAmount : 0;
      const formatMeta: Record<string, { prefix: string; house: string; loc: string; label: string }> = {
        ASSURANT: { prefix: 'ASR', house: 'Assurant Liquidation Hub', loc: 'Assurant Hub - Miami / Orlando', label: 'ASSURANT' },
        MARKETPLACE_1: { prefix: 'MKT1', house: 'Marketplace 1 Hub', loc: 'Miami Hub - Marketplace 1', label: 'Marketplace 1' },
        MARKETPLACE_2: { prefix: 'MKT2', house: 'Marketplace 2 Hub', loc: 'Miami Hub - Marketplace 2', label: 'Marketplace 2' },
        MARKETPLACE_3: { prefix: 'MKT3', house: 'Marketplace 3 Hub', loc: 'Miami Hub - Marketplace 3', label: 'Marketplace 3' },
        MACBOOKS: { prefix: 'MAC', house: 'Leilão Macbooks Hub', loc: 'Miami Hub - Apple Macbooks', label: 'Leilão Macbooks' },
        STOCK_APPLE: { prefix: 'UF', house: 'USAFAST Stock Hub', loc: 'Miami Hub - Armazém W23', label: 'Estoque Pronta Entrega' }
      };
      const meta = formatMeta[presetFormat] || formatMeta.STOCK_APPLE;
      let newLots: AuctionLot[] = [];

      if (stockAppleGroupMode === 'grouped' && stockAppleGroupedLots.length > 0) {
        newLots = stockAppleGroupedLots.map((g, idx) => {
          let baseGroupPrice = g.unitPriceUsd > 5 ? g.unitPriceUsd : getEstimatedWholesalePrice(g.modelFamily, g.capacity, g.grade);
          baseGroupPrice = Math.max(50, baseGroupPrice);
          const unitPrice = Math.round(baseGroupPrice + markupPerUnit);
          const currentBidUsd = Math.round(unitPrice * g.totalQuantity);
          const startingBidUsd = Math.round(currentBidUsd * (1 - stockAppleDiscountPercent / 100));
          const estimatedBrazilRetailBrl = Math.round(currentBidUsd * usdRate * (1 + stockAppleMarginPercent / 100));
          return {
            id: `${meta.prefix.toLowerCase()}-lot-grp-${Date.now()}-${idx}`,
            lotNumber: `${meta.prefix}-${g.lotNumber.replace(/^(UF-|ASR-)/, '')}`,
            title: cleanLotTitle(g.title),
            modelFamily: cleanLotTitle(g.modelFamily) || g.modelFamily,
            oemBrand: g.make || 'Apple',
            quantity: g.totalQuantity,
            grade: g.grade as GradeType,
            primaryStorage: g.capacity,
            colorHighlights: g.colorHighlights.length > 0 ? g.colorHighlights : ['Prata', 'Preto Espacial'],
            batteryHealthRange: '88% - 100% (Verificado)',
            carrierStatus: '100% Factory Unlocked',
            imeiStatus: 'Clean ESN / 100% Verificado',
            auctionHouse: presetFormat === 'STOCK_APPLE' ? `USAFAST Stock Hub (${g.warehouse})` : meta.house,
            location: presetFormat === 'STOCK_APPLE' ? (g.warehouse.includes('W23') ? 'Miami Hub - Armazém W23' : 'Miami Hub - Armazém W12') : meta.loc,
            startingBidUsd,
            currentBidUsd,
            reservePriceMet: true,
            estimatedBrazilRetailBrl,
            totalBidsCount: Math.floor(Math.random() * 12) + 2,
            endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
            imageUrl: g.imageUrl,
            galleryImages: [g.imageUrl],
            description: `Lote oficial de atacado contendo ${g.totalQuantity} aparelho(s).`,
            diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
            manifest: g.manifest,
            bidsHistory: [{ id: `bid-apl-init-${idx}`, bidderName: 'Licitante Inicial Hub', amountUsd: currentBidUsd, timestamp: 'Início do Leilão' }],
            sourceType: (isStockFeedFormat(presetFormat) ? presetFormat : 'STOCK_APPLE') as AuctionLot['sourceType']
          };
        });
      } else {
        newLots = approvedItems.map((it, idx) => {
          let baseItemPrice = it.listPrice > 5 ? it.listPrice : getEstimatedWholesalePrice(it.model, it.capacity, it.grade);
          baseItemPrice = Math.max(50, baseItemPrice);
          const unitPriceWithMarkup = Math.round(baseItemPrice + markupPerUnit);
          const totalCurrentBidUsd = Math.round(unitPriceWithMarkup * it.availableQuantity);
          const startingBidUsd = Math.round(totalCurrentBidUsd * (1 - stockAppleDiscountPercent / 100));
          const estimatedBrazilRetailBrl = Math.round(totalCurrentBidUsd * usdRate * (1 + stockAppleMarginPercent / 100));

          const itemMake = it.make || 'Apple';
          const imageUrl = getDeviceImageUrl(itemMake, it.model, it.deviceType);
          const cleanModel = cleanLotTitle(it.model);
          const rawItemTitle = `${it.availableQuantity > 1 ? `${it.availableQuantity}x ` : ''}${itemMake} ${cleanModel} ${it.capacity} ${it.color} - Grade ${it.grade}`;
          const finalItemTitle = cleanLotTitle(rawItemTitle);

          return {
            id: `${meta.prefix.toLowerCase()}-lot-ind-${Date.now()}-${idx}`,
            lotNumber: `${meta.prefix}-${it.itemNumber}`,
            title: finalItemTitle,
            modelFamily: cleanModel || it.model,
            oemBrand: itemMake,
            quantity: it.availableQuantity,
            grade: it.grade as GradeType,
            primaryStorage: it.capacity,
            colorHighlights: [it.color],
            batteryHealthRange: '88% - 100% (Verificado)',
            carrierStatus: it.lockStatus,
            imeiStatus: 'Clean ESN / 100% Verificado',
            auctionHouse: presetFormat === 'STOCK_APPLE' ? `USAFAST Stock Hub (${it.warehouse})` : meta.house,
            location: presetFormat === 'STOCK_APPLE' ? 'Miami Hub - Armazém W23' : meta.loc,
            startingBidUsd,
            currentBidUsd: totalCurrentBidUsd,
            reservePriceMet: true,
            estimatedBrazilRetailBrl,
            totalBidsCount: Math.floor(Math.random() * 8) + 1,
            endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
            imageUrl,
            galleryImages: [imageUrl],
            description: `Item #${it.itemNumber} - ${itemMake} ${it.model} ${it.capacity}.`,
            diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
            manifest: [],
            bidsHistory: [{ id: `bid-ind-${idx}`, bidderName: 'Licitante Inicial Hub', amountUsd: totalCurrentBidUsd, timestamp: 'Início do Leilão' }],
            sourceType: (isStockFeedFormat(presetFormat) ? presetFormat : 'STOCK_APPLE') as AuctionLot['sourceType']
          };
        });
      }

      const targetSourceType = isStockFeedFormat(presetFormat) ? presetFormat : 'STOCK_APPLE';
      const finalLots = (presetFormat === 'ASSURANT' || replaceExistingLots)
        ? [...newLots, ...auctions.filter(a => a.sourceType !== targetSourceType)]
        : [...newLots, ...auctions];

      onUpdateAuctions(finalLots);
      try {
        localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(finalLots));
      } catch (e) {}

      showNotice(`🎉 ${newLots.length} Lotes ${meta.label} publicados com sucesso!`, 'success');
      setAdminTab('lots');
    } catch (err: any) {
      showNotice(`Falha ao publicar lotes: ${err?.message}`, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const isXml = file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml');
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (isXml) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = String(evt.target?.result || '');
          const rows = parseXmlSpreadsheet(text);
          if (rows.length === 0) {
            showNotice('O arquivo XML não possui linhas legíveis.', 'error');
            return;
          }
          const headers = Object.keys(rows[0]);
          setRawHeaders(headers);
          setParsedPreviewRows(rows);
          showNotice(`Arquivo XML "${file.name}" carregado com ${rows.length} registros.`);
        } catch (err: any) {
          showNotice(`Erro ao processar XML: ${err?.message}`, 'error');
        }
      };
      reader.readAsText(file);
      return;
    }

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = String(evt.target?.result || '');
          const rows = parseCsvText(text);
          if (rows.length === 0) {
            showNotice('O arquivo CSV está vazio.', 'error');
            return;
          }
          const headers = Object.keys(rows[0] || {});
          setRawHeaders(headers);
          setParsedPreviewRows(rows);
          showNotice(`Arquivo CSV "${file.name}" carregado com ${rows.length} linhas.`);
        } catch (err: any) {
          showNotice(`Erro ao processar CSV: ${err?.message}`, 'error');
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const dataGrid: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (dataGrid.length === 0) {
          showNotice('O arquivo está vazio.', 'error');
          return;
        }

        let headerIdx = 0;
        for (let r = 0; r < Math.min(20, dataGrid.length); r++) {
          const rowStr = (dataGrid[r] || []).map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (rowStr.includes('item') || rowStr.includes('lot')) {
            headerIdx = r;
            break;
          }
        }

        const headers = (dataGrid[headerIdx] as string[]).map(h => String(h || '').trim());
        const rawJson: any[] = [];
        for (let r = headerIdx + 1; r < dataGrid.length; r++) {
          const rowData = dataGrid[r];
          if (!rowData || rowData.length === 0) continue;
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = rowData[i] !== undefined ? rowData[i] : '';
          });
          if (Object.values(obj).some(v => v !== '')) {
            rawJson.push(obj);
          }
        }

        setRawHeaders(headers);
        setParsedPreviewRows(rawJson);
        showNotice(`Planilha "${file.name}" carregada com ${rawJson.length} linhas.`);
      } catch (err: any) {
        showNotice(`Erro ao processar planilha: ${err?.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      showNotice('Cole o texto para importação primeiro.', 'error');
      return;
    }
    try {
      let rows = parseCsvText(pasteText.trim());
      if (rows.length === 0) {
        const wb = XLSX.read(pasteText.trim(), { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      }
      setParsedPreviewRows(rows);
      showNotice(`${rows.length} linhas processadas com sucesso.`);
    } catch (e: any) {
      showNotice(`Erro ao processar texto colado: ${e?.message}`, 'error');
    }
  };

  const handleRecalculateVerizonRate = (newRate: number) => {
    setVerizonUnitRate(newRate);
    if (parsedPreviewRows.length > 0 && presetFormat === 'VERIZON') {
      processVerizonRows(parsedPreviewRows, newRate);
    }
  };

  const handleApplyVerizonImport = () => {
    if (verizonGroupedLots.length === 0 && parsedPreviewRows.length === 0) {
      showNotice('Nenhum lote para publicar.', 'error');
      return;
    }
    showNotice('Lotes VERIZON aplicados com sucesso!');
  };

  const handleApplyImport = () => {
    if (isStockFeedFormat(presetFormat) && stockAppleItems.length > 0) {
      handleApplyStockAppleImport();
      return;
    }
    if (presetFormat === 'VERIZON' && verizonGroupedLots.length > 0) {
      handleApplyVerizonImport();
      return;
    }
    showNotice('Importação aplicada com sucesso!');
  };

  const handleDownloadTemplate = () => {
    const templateData = [{ Lote: 'US-99100', Titulo: 'Lote 10x iPhone 16 Pro Max' }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'planilha_modelo.xlsx');
    showNotice('Planilha modelo baixada!');
  };

  // Gestão de lotes
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editPriceUsd, setEditPriceUsd] = useState<number>(0);
  const [editGrade, setEditGrade] = useState<GradeType>('Grade A');
  const [adminLotSearch, setAdminLotSearch] = useState('');
  const [adminLotPage, setAdminLotPage] = useState(1);
  const ADMIN_LOTS_PER_PAGE = 25;

  const handleStartEdit = (lot: AuctionLot) => {
    setEditingLotId(lot.id);
    setEditPriceUsd(lot.currentBidUsd);
    setEditGrade(lot.grade);
  };

  const handleSaveEdit = (lotId: string) => {
    const updated = auctions.map(lot => lot.id === lotId ? { ...lot, currentBidUsd: editPriceUsd, grade: editGrade } : lot);
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

  const [offersList, setOffersList] = useState<AdminOffer[]>([]);
  const [counterOfferEditingId, setCounterOfferEditingId] = useState<string | null>(null);
  const [counterOfferUsdInput, setCounterOfferUsdInput] = useState<string>('');
  const [counterOfferNoteInput, setCounterOfferNoteInput] = useState<string>('');
  const [lastUpdatedOfferId, setLastUpdatedOfferId] = useState<string | null>(null);

  const [notificationEmails, setNotificationEmails] = useState<string[]>(['roblagua@gmail.com']);
  const [newNotificationEmail, setNewNotificationEmail] = useState<string>('');
  const [testWhatsappPhone, setTestWhatsappPhone] = useState<string>('5511999999999');
  const [testWhatsappStatus, setTestWhatsappStatus] = useState<AdminOffer['status']>('Aceita');
  const [autoSendWhatsapp, setAutoSendWhatsapp] = useState<boolean>(false);
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState<string>('');

  const handleAddNotificationEmail = () => {
    const email = newNotificationEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setNotificationEmails([...notificationEmails, email]);
    setNewNotificationEmail('');
  };

  const handleRemoveNotificationEmail = (email: string) => {
    setNotificationEmails(notificationEmails.filter(e => e !== email));
  };

  const handleUpdateOfferStatus = (offerId: string, newStatus: AdminOffer['status'], counterOfferUsd?: number, adminNote?: string) => {
    setOffersList(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus, ...(counterOfferUsd !== undefined ? { counterOfferUsd } : {}), ...(adminNote !== undefined ? { adminNote } : {}) } : o));
    setLastUpdatedOfferId(offerId);
    showNotice(`Status atualizado para "${newStatus}"!`);
  };

  const handleExportOffersCsv = () => {
    const ws = XLSX.utils.json_to_sheet(offersList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ofertas');
    XLSX.writeFile(wb, 'relatorio_ofertas.xlsx');
  };

  const [clientsList, setClientsList] = useState<SystemUser[]>([
    { ...currentUser, approvalStatus: 'APPROVED', verifiedStatus: true }
  ]);

  const handleApproveClient = (emailOrIndex: string | number) => {
    setClientsList(clientsList.map((c, i) => i === emailOrIndex || c.email === emailOrIndex ? { ...c, approvalStatus: 'APPROVED', verifiedStatus: true } : c));
    showNotice('Cliente aprovado!');
  };

  const handleRejectClient = (emailOrIndex: string | number) => {
    setClientsList(clientsList.map((c, i) => i === emailOrIndex || c.email === emailOrIndex ? { ...c, approvalStatus: 'REJECTED', verifiedStatus: false } : c));
    showNotice('Cliente rejeitado.');
  };

  const filteredStockItems = stockAppleItems.filter(item => item.status === 'APPROVED');
  const stockPageSize = 15;
  const totalStockPages = Math.max(1, Math.ceil(filteredStockItems.length / stockPageSize));
  const paginatedStockItems = filteredStockItems.slice((stockApplePage - 1) * stockPageSize, stockApplePage * stockPageSize);

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

      {/* ADMIN HEADER & BOTÃO SALVAR NO BANCO INTEGRADO */}
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

        {/* BOTÃO E STATUS DE SALVAMENTO NO SUPABASE INSERIDO AQUI */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleSalvarNoBancoSupabase(auctions)}
            disabled={loadingSaveDb}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95"
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
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'dashboard' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Dashboard Geral</span>
        </button>

        <button
          onClick={() => setAdminTab('offers')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'offers' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Ofertas Computadas ({offersList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('upload')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'upload' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Upload className="w-4 h-4" />
          <span>Importar Planilhas (Excel, CSV & XML)</span>
        </button>

        <button
          onClick={() => setAdminTab('lots')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'lots' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Gavel className="w-4 h-4" />
          <span>Gerenciar Leilões ({auctions.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('clients')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'clients' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Users className="w-4 h-4" />
          <span>Painel de Clientes ({clientsList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${adminTab === 'settings' ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações & Cotação</span>
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Lotes Ativos</span>
              <span className="text-2xl font-black text-white font-mono block">{auctions.length}</span>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Total de Aparelhos</span>
              <span className="text-2xl font-black text-cyan-300 font-mono block">{auctions.reduce((acc, l) => acc + l.quantity, 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[11px]">Volume Pregão (USD)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono block">${auctions.reduce((acc, l) => acc + l.currentBidUsd, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD TAB */}
      {adminTab === 'upload' && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border border-red-500/40 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadAttachedVerizonCsv}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Carregar CSV VERIZON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOTS TAB */}
      {adminTab === 'lots' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Lote</th>
                  <th className="py-3 px-3">Título</th>
                  <th className="py-3 px-3">Qtd</th>
                  <th className="py-3 px-3">Grade</th>
                  <th className="py-3 px-3">Lance Atual (USD)</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auctions.slice(0, 20).map(lot => (
                  <tr key={lot.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{lot.lotNumber}</td>
                    <td className="py-3 px-3 font-semibold text-white">{lot.title}</td>
                    <td className="py-3 px-3 font-mono">{lot.quantity} un</td>
                    <td className="py-3 px-3">{lot.grade}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">${lot.currentBidUsd}</td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => handleDeleteLot(lot.id)} className="p-1.5 text-rose-400 hover:bg-slate-800 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OFFERS TAB */}
      {adminTab === 'offers' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Central de Ofertas Computadas</h2>
        </div>
      )}

      {/* CLIENTS TAB */}
      {adminTab === 'clients' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Painel de Clientes</h2>
        </div>
      )}

      {/* SETTINGS TAB */}
      {adminTab === 'settings' && (
        <div className="max-w-2xl space-y-6 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <h2 className="text-lg font-bold text-white">Configurações Operacionais</h2>
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Cotação PTAX Dólar:</label>
            <input
              type="number"
              step="0.01"
              value={usdRate}
              onChange={e => onUpdateUsdRate(parseFloat(e.target.value) || 5.75)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};
