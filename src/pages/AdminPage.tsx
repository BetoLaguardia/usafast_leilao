import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
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

  // ----------------------------------------------------
  // ASSURANT AUCTION ENGINE (+ $5 USD PER UNIT ADJUSTMENT)
  // ----------------------------------------------------
  const [addAssurantFiveUsd, setAddAssurantFiveUsd] = useState(true);
  const [assurantMarkupAmount, setAssurantMarkupAmount] = useState<number>(5);

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
    deviceType: 'iPhone' | 'iPad' | 'Apple Watch';
    status: 'APPROVED' | 'DISCARDED_LOCKED' | 'DISCARDED_NON_APPLE';
    discardReason?: string;
  }

  interface StockAppleGroupedLot {
    groupKey: string;
    lotNumber: string;
    title: string;
    deviceType: 'iPhone' | 'iPad' | 'Apple Watch';
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
    totalApprovedUnits: 0,
    discardedLockedCount: 0,
    discardedNonAppleCount: 0
  });
  const [stockAppleGroupMode, setStockAppleGroupMode] = useState<'grouped' | 'individual'>('grouped');
  const [stockAppleFilterType, setStockAppleFilterType] = useState<'ALL' | 'IPHONE' | 'IPAD' | 'WATCH' | 'DISCARDED_LOCKED'>('ALL');
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

  // Helper: map grade from CSV to GradeType (Standard / Generic auctions)
  const mapGrade = (raw: string): GradeType => {
    const g = String(raw || '').toUpperCase();
    if (g.includes('A+')) return 'Grade A+';
    if (g.includes('A') && !g.includes('A/B') && !g.includes('B(')) return 'Grade A';
    if (g.includes('B') || g.includes('A/B')) return 'Grade B';
    if (g.includes('C') || g.includes('C(T)')) return 'Grade C';
    if (g.includes('CPO') || g.includes('REFURB')) return 'CPO Refurbished';
    return 'Grade C';
  };

  // Helper: map grade exclusively for VERIZON auctions
  // "tire o grade B+(T), A+(T), C+(T) nao deixe aparecer altere tudo para DNA, DNB, DNC , DND isso só no verizon"
  const mapVerizonGrade = (raw: string): GradeType => {
    const g = String(raw || '').trim().toUpperCase();
    if (g.includes('DND') || g.includes('D(T)') || g.includes('D+(T)') || (g.includes('D') && !g.includes('DNA') && !g.includes('DNB') && !g.includes('DNC'))) {
      return 'DND';
    }
    if (g.includes('DNC') || g.includes('C(T)') || g.includes('C+(T)') || g.includes('C+') || g.includes('C')) {
      return 'DNC';
    }
    if (g.includes('DNB') || g.includes('B(T)') || g.includes('B+(T)') || g.includes('B+') || g.includes('B') || g.includes('A/B')) {
      return 'DNB';
    }
    if (g.includes('DNA') || g.includes('A(T)') || g.includes('A+(T)') || g.includes('A+') || g.includes('A')) {
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
      const lotNum = String(r['Lot #'] || r['Lot#'] || r['Lot'] || r['lotNumber'] || '').trim();
      if (!lotNum) return;

      if (!groups.has(lotNum)) {
        groups.set(lotNum, {
          lotNumber: lotNum,
          title: String(r['Title'] || r['title'] || `Lote ${lotNum}`).trim(),
          oem: String(r['OEM'] || r['oem'] || 'Samsung').trim(),
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
      const source = String(r['Inventory Source'] || r['inventorySource'] || 'Carrier Return').trim();

      if (model) g.models.add(model);
      if (cap) g.capacities.add(cap);
      if (color) g.colors.add(color);
      if (source) g.sources.add(source);

      // Transform grade ONLY for Verizon: A(T) -> A(T) DNA, B(T) -> B(T) DNB, C(T) -> C(T) DNC, etc.
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
        screenCondition: 'Conforme Grade Verizon DNA',
        housingCondition: 'Conforme Grade Verizon DNA',
        partNumber: String(r['Part #'] || r['partNumber'] || '').trim(),
        inventorySource: source,
        itemDescription: String(r['Item Description'] || r['itemDescription'] || '').trim(),
        qty: q
      });
    });

    const parsedGroupedLots: VerizonGroupedLot[] = Array.from(groups.values()).map(g => {
      // Transform grade ONLY for Verizon to DNA, DNB, DNC, DND (never A+(T), B+(T), C+(T))
      const mappedGrade = mapVerizonGrade(g.gradeRaw);

      // Clean title for Verizon to never show B+(T), A+(T), C+(T)
      const cleanTitle = g.title
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
        .replace(/\bD\(T\)\b/gi, 'DND');

      const isPremium = /fold|ultra|pro max/i.test(g.primaryModel);
      const isBudget = /a1|a2|a0/i.test(g.primaryModel);
      const perUnit = isPremium ? unitRate * 1.6 : isBudget ? unitRate * 0.6 : unitRate;
      const calculatedCurrentBidUsd = Math.max(150, Math.round(g.totalQty * perUnit));
      const calculatedStartingBidUsd = Math.round(calculatedCurrentBidUsd * 0.75);
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

  // 1-Click Loader for the user's attached official VERIZON CSV
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

  // ----------------------------------------------------
  // UNIVERSAL XML SPREADSHEET PARSER (.xml / text XML)
  // ----------------------------------------------------
  const parseXmlSpreadsheet = (xmlText: string): any[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      throw new Error('Erro na estrutura do XML: ' + (parseError.textContent?.slice(0, 100) || 'Formato XML inválido'));
    }

    // 1. Excel XML Spreadsheet 2003 (<Workbook><Worksheet><Table><Row><Cell><Data>...)
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

    // 2. Element-based lists (<listing>, <lot>, <item>, <stockitem>, <device>, <row>, <auction>)
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

    // 3. Fallback: direct root children
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

  // ----------------------------------------------------
  // HELPERS FOR STOCK FEED & NORMALIZATION
  // ----------------------------------------------------
  const normalizeField = (row: any, ...keys: string[]): string => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    // Case/whitespace-insensitive lookup
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
        return Math.round((rawVal / 100) * 100) / 100;
      }
      return rawVal;
    }
    const str = String(rawVal || '').replace(/[^0-9.,]/g, '').trim();
    if (!str) return 0;
    if (str.includes(',') && !str.includes('.')) {
      const num = parseFloat(str.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
    if (str.includes(',') && str.includes('.')) {
      const num = parseFloat(str.replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
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

  // Sample XML representing the exact schema of Stock List
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
  <Item>
    <ItemNumber>2397541</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Tablet</Category>
    <Make>Apple</Make>
    <Model>iPad (10th Gen)</Model>
    <ModelNumber>A2696</ModelNumber>
    <Capacity>64GB</Capacity>
    <Description>Apple / iPad (10th Gen) / A2696 / 10.9 / 64GB / WIFI / Silver / OTH / LOCKED / DLS C</Description>
    <Carrier>OTH</Carrier>
    <LockStatus>LOCKED</LockStatus>
    <Color>Silver</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>2</AvailableQuantity>
    <ListPrice>231.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2610092</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Tablet</Category>
    <Make>Apple</Make>
    <Model>iPad (A16)</Model>
    <ModelNumber>A3355</ModelNumber>
    <Capacity>128GB</Capacity>
    <Description>Apple / iPad (A16) / A3355 / 128GB / GSM / Blue / ATT / UNLOCKED / DLS A+</Description>
    <Carrier>ATT</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Blue</Color>
    <Grade>DLS A+</Grade>
    <AvailableQuantity>12</AvailableQuantity>
    <ListPrice>424.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2041332</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 11</Model>
    <ModelNumber>A2111</ModelNumber>
    <Capacity>64GB</Capacity>
    <Description>Apple / iPhone 11 / A2111 / 64GB / GSM / Black / UNL / UNLOCKED / DLS A</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Black</Color>
    <Grade>DLS A</Grade>
    <AvailableQuantity>1</AvailableQuantity>
    <ListPrice>124.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2041333</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 11</Model>
    <ModelNumber>A2111</ModelNumber>
    <Capacity>64GB</Capacity>
    <Description>Apple / iPhone 11 / A2111 / 64GB / GSM / Black / UNL / UNLOCKED / DLS A+</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Black</Color>
    <Grade>DLS A+</Grade>
    <AvailableQuantity>46</AvailableQuantity>
    <ListPrice>134.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2810144</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 15 Pro</Model>
    <ModelNumber>A2848</ModelNumber>
    <Capacity>128GB</Capacity>
    <Description>Apple / iPhone 15 Pro / A2848 / 128GB / 5G / Natural Titanium / UNL / UNLOCKED / DLS A+</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Natural Titanium</Color>
    <Grade>DLS A+</Grade>
    <AvailableQuantity>15</AvailableQuantity>
    <ListPrice>610.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2810199</ItemNumber>
    <Warehouse>W23-ATT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 16 Pro Max</Model>
    <ModelNumber>A3084</ModelNumber>
    <Capacity>256GB</Capacity>
    <Description>Apple / iPhone 16 Pro Max / A3084 / 256GB / 5G / Desert Titanium / UNL / UNLOCKED / DLS AA+</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Desert Titanium</Color>
    <Grade>DLS AA+</Grade>
    <AvailableQuantity>20</AvailableQuantity>
    <ListPrice>890.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2392318</ItemNumber>
    <Warehouse>W12-GGL</Warehouse>
    <Category>Wearables</Category>
    <Make>Apple</Make>
    <Model>Watch SE (2nd Gen)</Model>
    <ModelNumber>A2726</ModelNumber>
    <Capacity>32GB</Capacity>
    <Description>Apple / Watch SE (2nd Gen) / A2726 / 32GB / 40mm / Aluminum / X / GSM / Starlight / ATT / DLS B</Description>
    <Carrier>ATT</Carrier>
    <LockStatus></LockStatus>
    <Color>Starlight</Color>
    <Grade>DLS B</Grade>
    <AvailableQuantity>1</AvailableQuantity>
    <ListPrice>75.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2568033</ItemNumber>
    <Warehouse>W12-GGL</Warehouse>
    <Category>Wearables</Category>
    <Make>Apple</Make>
    <Model>Watch SE 3</Model>
    <ModelNumber>A3324</ModelNumber>
    <Capacity>64GB</Capacity>
    <Description>Apple / Watch SE 3 / A3324 / 64GB / 40mm / Aluminum / X / WIFI / Midnight / OTH / DLS B</Description>
    <Carrier>OTH</Carrier>
    <LockStatus></LockStatus>
    <Color>Midnight</Color>
    <Grade>DLS B</Grade>
    <AvailableQuantity>1</AvailableQuantity>
    <ListPrice>108.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2599001</ItemNumber>
    <Warehouse>W12-GGL</Warehouse>
    <Category>Phones</Category>
    <Make>Samsung</Make>
    <Model>Galaxy S24 Ultra</Model>
    <ModelNumber>SM-S928U</ModelNumber>
    <Capacity>256GB</Capacity>
    <Description>Samsung Galaxy S24 Ultra Titanium UNLOCKED</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Titanium</Color>
    <Grade>A</Grade>
    <AvailableQuantity>5</AvailableQuantity>
    <ListPrice>650.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
</StockList>`;

  // ----------------------------------------------------
  // PROCESS STOCK APPLE ROWS (STRICT FILTER: ONLY UNLOCKED IPHONES, IPADS & WATCHES)
  // ----------------------------------------------------
  const processStockAppleRows = (rawRows: any[], allowAllBrands = false) => {
    let approvedIPhones = 0;
    let approvedIPads = 0;
    let approvedWatches = 0;
    let discardedLockedCount = 0;
    let discardedNonAppleCount = 0;
    let totalApprovedUnits = 0;

    const processedItems: StockAppleItem[] = [];

    rawRows.forEach((row, idx) => {
      const itemNumber = normalizeField(row, 'Item #', 'Item#', 'ItemNumber', 'item_number', 'item-number', 'Item', 'id') || `ITM-${100000 + idx}`;
      const warehouse = normalizeField(row, 'Warehouse', 'warehouse', 'Armazem') || 'W23-ATT';
      const category = normalizeField(row, 'Category', 'category', 'Categoria') || '';
      const make = normalizeField(row, 'Make', 'make', 'Fabricante', 'Brand', 'OEM') || 'Apple';
      const model = normalizeField(row, 'Model', 'model', 'Modelo') || '';
      const modelNumber = normalizeField(row, 'Model Number', 'ModelNumber', 'model_number', 'PartNumber', 'part_number') || '';
      const capacity = normalizeField(row, 'Capacity', 'capacity', 'Capacidade', 'Storage', 'storage') || '128GB';
      const description = normalizeField(row, 'Description', 'description', 'Descricao') || '';
      const carrier = normalizeField(row, 'Carrier', 'carrier', 'Operadora') || '';
      const lockStatus = normalizeField(row, 'Lock Status', 'LockStatus', 'lock_status', 'lock-status', 'StatusBloqueio') || '';
      const color = normalizeField(row, 'Color', 'color', 'Cor') || 'Space Gray';
      const grade = normalizeField(row, 'Grade', 'grade', 'Condicao') || 'DLS A';
      
      const qtyRaw = normalizeField(row, 'Available Quantity', 'AvailableQuantity', 'Quantity', 'qty', 'Quantidade') || '1';
      const availableQuantity = Math.max(1, parseInt(String(qtyRaw).replace(/[^0-9]/g, '') || '1', 10) || 1);
      
      const priceRaw = normalizeField(row, 'List Price', 'ListPrice', 'list_price', 'Price', 'price', 'Preco') || '0';
      const listPrice = parsePrice(priceRaw);
      const currency = normalizeField(row, 'Currency', 'currency', 'Moeda') || 'USD';

      // 1. BRAND CHECK: Must be Apple unless allowAllBrands (Assurant) is active
      const isAppleMake = allowAllBrands ||
        make.trim().toLowerCase() === 'apple' ||
        /iphone|ipad|apple watch|\bwatch\b/i.test(model) ||
        /apple/i.test(description);

      if (!isAppleMake) {
        discardedNonAppleCount++;
        processedItems.push({
          id: `stock-item-${idx}`,
          itemNumber,
          warehouse,
          category,
          make,
          model,
          modelNumber,
          capacity,
          description,
          carrier,
          lockStatus,
          color,
          grade,
          availableQuantity,
          listPrice,
          currency,
          deviceType: 'iPhone',
          status: 'DISCARDED_NON_APPLE',
          discardReason: `Fabricante "${make}" não é Apple`
        });
        return;
      }

      // 2. DEVICE CLASSIFICATION: iPhone, iPad, Apple Watch ONLY
      let deviceType: 'iPhone' | 'iPad' | 'Apple Watch' | null = null;
      const catLower = category.trim().toLowerCase();
      const modelLower = model.trim().toLowerCase();

      if (modelLower.includes('iphone') || catLower === 'phones') {
        deviceType = 'iPhone';
      } else if (modelLower.includes('ipad') || catLower === 'tablet') {
        deviceType = 'iPad';
      } else if (modelLower.includes('watch') || catLower === 'wearables') {
        deviceType = 'Apple Watch';
      } else if (allowAllBrands) {
        deviceType = 'iPhone';
      }

      if (!deviceType) {
        discardedNonAppleCount++;
        processedItems.push({
          id: `stock-item-${idx}`,
          itemNumber,
          warehouse,
          category,
          make,
          model,
          modelNumber,
          capacity,
          description,
          carrier,
          lockStatus,
          color,
          grade,
          availableQuantity,
          listPrice,
          currency,
          deviceType: 'iPhone',
          status: 'DISCARDED_NON_APPLE',
          discardReason: 'Categoria não é iPhone, iPad ou Apple Watch'
        });
        return;
      }

      // 3. LOCK STATUS CHECK: ONLY UNLOCKED!
      // "importará apenas os iphones, applewatches, Ipads desbloqueados entendeu?"
      const lockUpper = lockStatus.trim().toUpperCase();
      const descUpper = description.trim().toUpperCase();
      const carrierUpper = carrier.trim().toUpperCase();

      // Explicit LOCKED check
      const isExplicitlyLocked = lockUpper === 'LOCKED' ||
        (lockUpper.includes('LOCKED') && !lockUpper.includes('UNLOCKED')) ||
        (descUpper.includes('LOCKED') && !descUpper.includes('UNLOCKED'));

      if (isExplicitlyLocked) {
        discardedLockedCount++;
        processedItems.push({
          id: `stock-item-${idx}`,
          itemNumber,
          warehouse,
          category,
          make,
          model,
          modelNumber,
          capacity,
          description,
          carrier,
          lockStatus,
          color,
          grade,
          availableQuantity,
          listPrice,
          currency,
          deviceType,
          status: 'DISCARDED_LOCKED',
          discardReason: 'Aparelho bloqueado (LOCKED detectado no status ou descrição)'
        });
        return;
      }

      // For Phones & Tablets: Must be verified UNLOCKED (for Assurant, any non-LOCKED item is approved)
      if (!allowAllBrands && (deviceType === 'iPhone' || deviceType === 'iPad')) {
        const isConfirmedUnlocked = lockUpper.includes('UNLOCKED') ||
          descUpper.includes('UNLOCKED') ||
          carrierUpper === 'UNL' ||
          carrierUpper === 'UNLOCKED';

        if (!isConfirmedUnlocked) {
          discardedLockedCount++;
          processedItems.push({
            id: `stock-item-${idx}`,
            itemNumber,
            warehouse,
            category,
            make,
            model,
            modelNumber,
            capacity,
            description,
            carrier,
            lockStatus,
            color,
            grade,
            availableQuantity,
            listPrice,
            currency,
            deviceType,
            status: 'DISCARDED_LOCKED',
            discardReason: 'Aparelho não possui status UNLOCKED confirmado'
          });
          return;
        }
      }

      // Approved as UNLOCKED!
      if (deviceType === 'iPhone') approvedIPhones++;
      else if (deviceType === 'iPad') approvedIPads++;
      else if (deviceType === 'Apple Watch') approvedWatches++;
      totalApprovedUnits += availableQuantity;

      processedItems.push({
        id: `stock-item-${idx}`,
        itemNumber,
        warehouse,
        category,
        make,
        model,
        modelNumber,
        capacity,
        description,
        carrier,
        lockStatus: lockStatus || 'UNLOCKED',
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
      approvedCount: approvedIPhones + approvedIPads + approvedWatches,
      approvedIPhones,
      approvedIPads,
      approvedWatches,
      totalApprovedUnits,
      discardedLockedCount,
      discardedNonAppleCount
    };

    setStockAppleAudit(audit);
    setStockAppleItems(processedItems);

    // Group approved items by Model + Capacity + Grade
    const approvedOnly = processedItems.filter(i => i.status === 'APPROVED');
    const groupsMap = new Map<string, {
      groupKey: string;
      deviceType: 'iPhone' | 'iPad' | 'Apple Watch';
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
      const key = `${item.model}___${item.capacity}___${item.grade}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          groupKey: key,
          deviceType: item.deviceType,
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
      const avgUnitPrice = g.totalQuantity > 0 ? Math.round(g.unitPriceSum / g.totalQuantity) : 250;
      const totalCurrentBidUsd = Math.round(avgUnitPrice);
      const calculatedStartingBidUsd = Math.round(totalCurrentBidUsd * (1 - stockAppleDiscountPercent / 100));
      const calculatedRetailBrl = Math.round(totalCurrentBidUsd * usdRate * (1 + stockAppleMarginPercent / 100));

      let imageUrl = '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
      if (g.deviceType === 'Apple Watch') {
        imageUrl = '/images/hero_auction_warehouse_iphones_1793849010124.jpg';
      } else if (g.deviceType === 'iPad') {
        imageUrl = g.totalQuantity > 3
          ? '/images/iphone_lot_wholesale_inspection_1793849011081.jpg'
          : '/images/hero_auction_warehouse_iphones_1793849010124.jpg';
      } else if (g.totalQuantity > 3) {
        imageUrl = '/images/iphone_lot_wholesale_inspection_1793849011081.jpg';
      } else if (/15 pro/i.test(g.modelFamily)) {
        imageUrl = '/images/iphone_15_pro_natural_titanium_1793849011192.jpg';
      }

      const title = `Lote ${g.totalQuantity}x Apple ${g.modelFamily} ${g.capacity} - Grade ${g.grade} (Desbloqueado)`;
      const lotNumber = `UF-APL-${String(1000 + idx)}`;

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

  const handleLoadSampleStockXml = () => {
    try {
      const rows = parseXmlSpreadsheet(SAMPLE_STOCK_APPLE_XML);
      setUploadedFileName('exemplo_estoque_apple_unlocked.xml');
      setRawHeaders(Object.keys(rows[0] || {}));
      setParsedPreviewRows(rows);
      setPresetFormat('STOCK_APPLE');
      const { audit } = processStockAppleRows(rows);
      showNotice(`Exemplo XML Apple processado! ${audit.approvedCount} itens aprovados (iPhones, iPads e Watches DESBLOQUEADOS) e ${audit.discardedLockedCount} bloqueados descartados.`, 'success');
    } catch (err: any) {
      showNotice(`Erro ao processar exemplo XML: ${err?.message}`, 'error');
    }
  };

  const handleLoadOfficialStockCsv = async () => {
    setIsLoadingStockCsv(true);
    try {
      const res = await fetch('/assets/aistudio/Stock_List_Filtered_11052026_cd908cec.csv');
      if (!res.ok) throw new Error('Não foi possível ler o arquivo da planilha anexada.');
      const text = await res.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) throw new Error('A planilha anexada não retornou linhas legíveis.');

      setUploadedFileName('Stock_List_Filtered_11052026.csv (Anexo Oficial)');
      setRawHeaders(Object.keys(rows[0] || {}));
      setParsedPreviewRows(rows);
      setPresetFormat('STOCK_APPLE');
      const { audit } = processStockAppleRows(rows);
      showNotice(`Planilha oficial em anexo carregada! ${audit.approvedCount.toLocaleString()} itens aprovados (iPhones, iPads e Watches DESBLOQUEADOS) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
    } catch (err: any) {
      showNotice(`Erro ao carregar planilha oficial: ${err?.message}`, 'error');
    } finally {
      setIsLoadingStockCsv(false);
    }
  };

  // Publish Stock Apple Lots to Auction Store
  const handleApplyStockAppleImport = () => {
    const approvedItems = stockAppleItems.filter(i => i.status === 'APPROVED');
    if (approvedItems.length === 0) {
      showNotice('Nenhum item Apple desbloqueado aprovado para publicar.', 'error');
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
        newLots = stockAppleGroupedLots.map((g, idx) => ({
          id: `${meta.prefix.toLowerCase()}-lot-grp-${Date.now()}-${idx}`,
          lotNumber: `${meta.prefix}-${g.lotNumber.replace(/^(UF-|ASR-)/, '')}`,
          title: g.title,
          modelFamily: g.modelFamily,
          oemBrand: 'Apple',
          quantity: g.totalQuantity,
          grade: g.grade,
          primaryStorage: g.capacity,
          colorHighlights: g.colorHighlights.length > 0 ? g.colorHighlights : ['Prata', 'Preto Espacial'],
          batteryHealthRange: '88% - 100% (Verificado Apple)',
          carrierStatus: '100% Factory Unlocked (Desbloqueado Global)',
          imeiStatus: 'Clean ESN / 100% Verificado',
          auctionHouse: presetFormat === 'STOCK_APPLE' ? `USAFAST Stock Hub (${g.warehouse})` : meta.house,
          location: presetFormat === 'STOCK_APPLE' ? (g.warehouse.includes('W23') ? 'Miami Hub - Armazém W23' : 'Miami Hub - Armazém W12') : meta.loc,
          startingBidUsd: Math.round(g.calculatedStartingBidUsd + markupPerUnit),
          currentBidUsd: Math.round(g.calculatedCurrentBidUsd + markupPerUnit),
          reservePriceMet: true,
          estimatedBrazilRetailBrl: g.calculatedRetailBrl,
          totalBidsCount: Math.floor(Math.random() * 12) + 2,
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
          imageUrl: g.imageUrl,
          galleryImages: [
            g.imageUrl,
            '/images/iphone_lot_wholesale_inspection_1793849011081.jpg',
            '/images/hero_auction_warehouse_iphones_1793849010124.jpg'
          ],
          description: `Lote oficial de atacado Apple Desbloqueado contendo ${g.totalQuantity} aparelho(s) (${g.modelFamily} ${g.capacity}). Classificação técnica ${g.grade}. 100% desbloqueado de fábrica e auditado pelo hub USAFAST.`,
          diagnosticReport: {
            faceId: true,
            trueTone: true,
            camerasPassed: true,
            batteryTested: true,
            cleanEsn: true,
            mdmFree: true
          },
          manifest: g.manifest,
          bidsHistory: [
            {
              id: `bid-apl-init-${idx}`,
              bidderName: 'Licitante Inicial Hub',
              amountUsd: g.calculatedCurrentBidUsd,
              timestamp: 'Início do Leilão'
            }
          ],
          sourceType: (isStockFeedFormat(presetFormat) ? presetFormat : 'STOCK_APPLE') as AuctionLot['sourceType']
        }));
      } else {
        // Individual item mode
        newLots = approvedItems.map((it, idx) => {
          const unitPriceWithMarkup = it.listPrice + markupPerUnit;
          const totalCurrentBidUsd = Math.round(unitPriceWithMarkup);
          const startingBidUsd = Math.round(totalCurrentBidUsd * (1 - stockAppleDiscountPercent / 100));
          const estimatedBrazilRetailBrl = Math.round(totalCurrentBidUsd * usdRate * (1 + stockAppleMarginPercent / 100));

          let imageUrl = '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
          if (it.deviceType === 'Apple Watch') imageUrl = '/images/hero_auction_warehouse_iphones_1793849010124.jpg';
          else if (it.deviceType === 'iPad') imageUrl = '/images/iphone_lot_wholesale_inspection_1793849011081.jpg';
          else if (it.availableQuantity > 3) imageUrl = '/images/iphone_lot_wholesale_inspection_1793849011081.jpg';

          return {
            id: `${meta.prefix.toLowerCase()}-lot-ind-${Date.now()}-${idx}`,
            lotNumber: `${meta.prefix}-${it.itemNumber}`,
            title: presetFormat !== 'STOCK_APPLE'
              ? `Lote ${it.availableQuantity}x ${it.make || 'Apple'} ${it.model} ${it.capacity} ${it.color} - Grade ${it.grade} (Desbloqueado)`
              : `Lote ${it.availableQuantity}x Apple ${it.model} ${it.capacity} ${it.color} - Grade ${it.grade} (Desbloqueado)`,
            modelFamily: it.model,
            oemBrand: presetFormat !== 'STOCK_APPLE' ? (it.make || 'Apple') : 'Apple',
            quantity: it.availableQuantity,
            grade: it.grade,
            primaryStorage: it.capacity,
            colorHighlights: [it.color],
            batteryHealthRange: '88% - 100% (Verificado)',
            carrierStatus: '100% Factory Unlocked (Desbloqueado Global)',
            imeiStatus: 'Clean ESN / 100% Verificado',
            auctionHouse: presetFormat === 'STOCK_APPLE' ? `USAFAST Stock Hub (${it.warehouse})` : meta.house,
            location: presetFormat === 'STOCK_APPLE' ? (it.warehouse.includes('W23') ? 'Miami Hub - Armazém W23' : 'Miami Hub - Armazém W12') : meta.loc,
            startingBidUsd,
            currentBidUsd: totalCurrentBidUsd,
            reservePriceMet: true,
            estimatedBrazilRetailBrl,
            totalBidsCount: Math.floor(Math.random() * 8) + 1,
            endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
            imageUrl,
            galleryImages: [
              imageUrl,
              '/images/iphone_lot_wholesale_inspection_1793849011081.jpg',
              '/images/hero_auction_warehouse_iphones_1793849010124.jpg'
            ],
            description: `Item #${it.itemNumber} - Apple ${it.model} ${it.capacity}. Quantidade: ${it.availableQuantity}. ${it.description}. Grade ${it.grade}. Status: 100% UNLOCKED.`,
            diagnosticReport: {
              faceId: true,
              trueTone: true,
              camerasPassed: true,
              batteryTested: true,
              cleanEsn: true,
              mdmFree: true
            },
            manifest: [
              {
                id: `man-ind-${idx}`,
                model: it.model,
                storage: it.capacity,
                color: it.color,
                grade: it.grade,
                batteryHealth: 92,
                imeiMasked: `359820******${String(100 + (idx * 13) % 899)}`,
                carrierStatus: '100% Desbloqueado',
                icloudStatus: 'Clean / FMI OFF',
                screenCondition: `Conforme Grade ${it.grade}`,
                housingCondition: `Conforme Grade ${it.grade}`,
                partNumber: it.modelNumber,
                inventorySource: it.warehouse,
                itemDescription: it.description,
                qty: it.availableQuantity
              }
            ],
            bidsHistory: [
              {
                id: `bid-ind-${idx}`,
                bidderName: 'Licitante Inicial Hub',
                amountUsd: totalCurrentBidUsd,
                timestamp: 'Início do Leilão'
              }
            ],
            sourceType: (isStockFeedFormat(presetFormat) ? presetFormat : 'STOCK_APPLE') as AuctionLot['sourceType']
          };
        });
      }

      const finalLots = replaceExistingLots
        ? newLots
        : [...newLots, ...auctions];

      onUpdateAuctions(finalLots);
      try {
        localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(finalLots));
      } catch (e) {}

      showNotice(`🎉 ${newLots.length} Lotes ${meta.label} (${newLots.reduce((acc, l) => acc + l.quantity, 0)} aparelhos) publicados com sucesso no catálogo e painel do cliente!`, 'success');
      setAdminTab('lots');
    } catch (err: any) {
      showNotice(`Falha ao publicar lotes Apple: ${err?.message}`, 'error');
    }
  };

  const SAMPLE_VERIZON_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Leiloes_USAFAST_XML">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Lot #</Data></Cell>
        <Cell><Data ss:Type="String">Title</Data></Cell>
        <Cell><Data ss:Type="String">OEM</Data></Cell>
        <Cell><Data ss:Type="String">Model</Data></Cell>
        <Cell><Data ss:Type="String">Grade</Data></Cell>
        <Cell><Data ss:Type="String">Qty</Data></Cell>
        <Cell><Data ss:Type="String">Capacity</Data></Cell>
        <Cell><Data ss:Type="String">Color</Data></Cell>
        <Cell><Data ss:Type="String">Inventory Source</Data></Cell>
        <Cell><Data ss:Type="String">Part #</Data></Cell>
        <Cell><Data ss:Type="String">End Date</Data></Cell>
        <Cell><Data ss:Type="String">End Time</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">UF-XML-01</Data></Cell>
        <Cell><Data ss:Type="String">Lote 15x iPhone 16 Pro Max 256GB - Grade DNA (USAFAST Hub Miami)</Data></Cell>
        <Cell><Data ss:Type="String">Apple</Data></Cell>
        <Cell><Data ss:Type="String">iPhone 16 Pro Max</Data></Cell>
        <Cell><Data ss:Type="String">DNA</Data></Cell>
        <Cell><Data ss:Type="Number">15</Data></Cell>
        <Cell><Data ss:Type="String">256GB</Data></Cell>
        <Cell><Data ss:Type="String">Desert Titanium</Data></Cell>
        <Cell><Data ss:Type="String">Verizon Clean Trade-In</Data></Cell>
        <Cell><Data ss:Type="String">MU773LL/A</Data></Cell>
        <Cell><Data ss:Type="String">11/09/2026</Data></Cell>
        <Cell><Data ss:Type="String">04:30 PM</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">UF-XML-02</Data></Cell>
        <Cell><Data ss:Type="String">Lote 25x iPhone 15 Pro 128GB - Grade DNB Natural Titanium</Data></Cell>
        <Cell><Data ss:Type="String">Apple</Data></Cell>
        <Cell><Data ss:Type="String">iPhone 15 Pro</Data></Cell>
        <Cell><Data ss:Type="String">DNB</Data></Cell>
        <Cell><Data ss:Type="Number">25</Data></Cell>
        <Cell><Data ss:Type="String">128GB</Data></Cell>
        <Cell><Data ss:Type="String">Natural Titanium</Data></Cell>
        <Cell><Data ss:Type="String">Carrier Return Unlocked</Data></Cell>
        <Cell><Data ss:Type="String">MTV13LL/A</Data></Cell>
        <Cell><Data ss:Type="String">11/09/2026</Data></Cell>
        <Cell><Data ss:Type="String">05:00 PM</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">UF-XML-03</Data></Cell>
        <Cell><Data ss:Type="String">Lote 40x iPhone 14 128GB - Grade DNC Midnight Black</Data></Cell>
        <Cell><Data ss:Type="String">Apple</Data></Cell>
        <Cell><Data ss:Type="String">iPhone 14</Data></Cell>
        <Cell><Data ss:Type="String">DNC</Data></Cell>
        <Cell><Data ss:Type="Number">40</Data></Cell>
        <Cell><Data ss:Type="String">128GB</Data></Cell>
        <Cell><Data ss:Type="String">Midnight Black</Data></Cell>
        <Cell><Data ss:Type="String">Verizon Bulk Surplus</Data></Cell>
        <Cell><Data ss:Type="String">MPUD3LL/A</Data></Cell>
        <Cell><Data ss:Type="String">11/09/2026</Data></Cell>
        <Cell><Data ss:Type="String">06:00 PM</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  const SAMPLE_ASSURANT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<StockList lastUpdated="11/05/2026 04:11AM CST">
  <Item>
    <ItemNumber>2395677</ItemNumber>
    <Warehouse>A02-ASSURANT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 14</Model>
    <ModelNumber>A2649</ModelNumber>
    <Capacity>256GB</Capacity>
    <Description>Apple / iPhone 14 / A2649 / 256GB / GSM / Blue / UNL / UNLOCKED / DLS C</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Blue</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>6</AvailableQuantity>
    <ListPrice>233.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2395894</ItemNumber>
    <Warehouse>A02-ASSURANT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 14 Pro</Model>
    <ModelNumber>A2650</ModelNumber>
    <Capacity>256GB</Capacity>
    <Description>Apple / iPhone 14 Pro / A2650 / 256GB / GSM / Space Black / UNL / UNLOCKED / DLS C</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Space Black</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>10</AvailableQuantity>
    <ListPrice>345.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2501696</ItemNumber>
    <Warehouse>A02-ASSURANT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 16 Pro Max</Model>
    <ModelNumber>A3084</ModelNumber>
    <Capacity>256GB</Capacity>
    <Description>Apple / iPhone 16 Pro Max / A3084 / 256GB / GSM / Black Titanium / UNL / UNLOCKED / DLS C</Description>
    <Carrier>UNL</Carrier>
    <LockStatus>UNLOCKED</LockStatus>
    <Color>Black Titanium</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>14</AvailableQuantity>
    <ListPrice>505.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
  <Item>
    <ItemNumber>2380459</ItemNumber>
    <Warehouse>A02-ASSURANT</Warehouse>
    <Category>Phones</Category>
    <Make>Apple</Make>
    <Model>iPhone 14</Model>
    <ModelNumber>A2649</ModelNumber>
    <Capacity>128GB</Capacity>
    <Description>Apple / iPhone 14 / A2649 / 128GB / GSM / Blue / OTH / LOCKED / DLS C</Description>
    <Carrier>OTH</Carrier>
    <LockStatus>LOCKED</LockStatus>
    <Color>Blue</Color>
    <Grade>DLS C</Grade>
    <AvailableQuantity>2</AvailableQuantity>
    <ListPrice>158.00</ListPrice>
    <Currency>USD</Currency>
  </Item>
</StockList>`;

  const handleLoadSampleAssurantXml = () => {
    try {
      const rows = parseXmlSpreadsheet(SAMPLE_ASSURANT_XML);
      const headers = Object.keys(rows[0] || {});
      setRawHeaders(headers);
      setParsedPreviewRows(rows);
      setUploadedFileName('leilao_assurant_unlocked.xml');
      setPresetFormat('ASSURANT');
      const { audit } = processStockAppleRows(rows);
      showNotice(`XML Leilão ASSURANT carregado! ${audit.approvedCount} aparelhos UNLOCKED aprovados (${audit.discardedLockedCount} LOCKED descartados). ${addAssurantFiveUsd ? `+$${assurantMarkupAmount} USD aplicado!` : ''}`, 'success');
    } catch (e: any) {
      showNotice(`Erro ao carregar XML Assurant: ${e?.message}`, 'error');
    }
  };

  const handleLoadSampleXml = () => {
    try {
      const rows = parseXmlSpreadsheet(SAMPLE_VERIZON_XML);
      const headers = Object.keys(rows[0] || {});
      setRawHeaders(headers);
      setParsedPreviewRows(rows);
      setUploadedFileName('planilha_exemplo_verizon.xml');
      setPresetFormat('VERIZON');
      const grouped = processVerizonRows(rows);
      let totalUnits = 0;
      grouped.forEach(g => { totalUnits += g.totalQty; });
      showNotice(`Exemplo XML processado com sucesso! ${grouped.length} lotes agrupados e ${totalUnits} aparelhos detectados.`);
    } catch (e: any) {
      showNotice(`Erro ao carregar exemplo XML: ${e?.message}`, 'error');
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
            showNotice('O arquivo XML não possui linhas ou lotes legíveis.', 'error');
            return;
          }
          const headers = Object.keys(rows[0]);
          setRawHeaders(headers);
          setParsedPreviewRows(rows);

          const isStockApple = headers.some(h => /item #|warehouse|lock status|available quantity|list price/i.test(h)) ||
                               /stock/i.test(file.name) ||
                               (headers.some(h => /category/i.test(h)) && headers.some(h2 => /make/i.test(h2)));

          const isVerizon = headers.some(h => /lot #|item description|part #|inventory source|model/i.test(h)) ||
                            /verizon|usafast/i.test(file.name);

          if (isStockFeedFormat(presetFormat) && presetFormat !== 'STOCK_APPLE') {
            setStockAppleGroupMode('individual');
            const { audit } = processStockAppleRows(rows, true);
            showNotice(`Arquivo XML ${presetFormat} processado! ${audit.approvedCount.toLocaleString()} lotes/aparelhos UNLOCKED aprovados.`, 'success');
          } else if (/assurant/i.test(file.name)) {
            setPresetFormat('ASSURANT');
            setStockAppleGroupMode('individual');
            const { audit } = processStockAppleRows(rows, true);
            showNotice(`Arquivo XML ASSURANT processado! ${audit.approvedCount.toLocaleString()} lotes/aparelhos UNLOCKED aprovados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD/un) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
          } else if (isStockApple || presetFormat === 'STOCK_APPLE') {
            setPresetFormat('STOCK_APPLE');
            const { audit } = processStockAppleRows(rows);
            showNotice(`Arquivo XML Estoque Apple processado! ${audit.approvedCount.toLocaleString()} aparelhos aprovados (iPhones, iPads e Watches UNLOCKED) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
          } else if (isVerizon || presetFormat === 'VERIZON') {
            setPresetFormat('VERIZON');
            const grouped = processVerizonRows(rows);
            let totalUnits = 0;
            grouped.forEach(g => { totalUnits += g.totalQty; });
            showNotice(`Arquivo XML processado! ${grouped.length} lotes agrupados e ${totalUnits} aparelhos lidos.`);
          } else {
            setPresetFormat('GENERIC');
            showNotice(`Arquivo XML "${file.name}" carregado com ${rows.length} registros.`);
          }
        } catch (err: any) {
          showNotice(`Erro ao processar arquivo XML: ${err?.message}`, 'error');
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
            showNotice('O arquivo CSV parece vazio ou sem cabeçalhos legíveis.', 'error');
            return;
          }
          const headers = Object.keys(rows[0] || {});
          setRawHeaders(headers);
          setParsedPreviewRows(rows);

          const isStockApple = headers.some(h => /item #|warehouse|lock status|available quantity|list price/i.test(h)) ||
                               /stock/i.test(file.name) ||
                               (headers.some(h => /category/i.test(h)) && headers.some(h2 => /make/i.test(h2)));

          const isVerizon = headers.some(h => /lot #|item description|part #|inventory source/i.test(h)) ||
                            /verizon/i.test(file.name);

          if (isStockFeedFormat(presetFormat) && presetFormat !== 'STOCK_APPLE') {
            setStockAppleGroupMode('individual');
            const { audit } = processStockAppleRows(rows, true);
            showNotice(`Planilha ${presetFormat} detectada! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados.`, 'success');
          } else if (/assurant/i.test(file.name)) {
            setPresetFormat('ASSURANT');
            setStockAppleGroupMode('individual');
            const { audit } = processStockAppleRows(rows, true);
            showNotice(`Planilha ASSURANT detectada! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD/un) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
          } else if (isStockApple || presetFormat === 'STOCK_APPLE') {
            setPresetFormat('STOCK_APPLE');
            const { audit } = processStockAppleRows(rows);
            showNotice(`Planilha Estoque Apple detectada! ${audit.approvedCount.toLocaleString()} itens aprovados (iPhones, iPads e Watches UNLOCKED) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
          } else if (isVerizon || presetFormat === 'VERIZON') {
            setPresetFormat('VERIZON');
            const grouped = processVerizonRows(rows);
            let totalUnits = 0;
            grouped.forEach(g => { totalUnits += g.totalQty; });
            showNotice(`Arquivo VERIZON detectado! ${grouped.length} lotes agrupados e ${totalUnits} aparelhos lidos.`);
          } else {
            setPresetFormat('GENERIC');
            showNotice(`Arquivo "${file.name}" carregado com ${rows.length} linhas.`);
          }
        } catch (err: any) {
          showNotice(`Erro ao processar arquivo CSV: ${err?.message}`, 'error');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Standard binary reading for XLSX / XLS
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const dataGrid: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (dataGrid.length === 0) {
          showNotice('O arquivo parece vazio ou sem dados válidos.', 'error');
          return;
        }

        // Find header row in first 10 rows
        let headerIdx = 0;
        for (let r = 0; r < Math.min(10, dataGrid.length); r++) {
          const rowStr = (dataGrid[r] || []).map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (rowStr.includes('item') && (rowStr.includes('warehouse') || rowStr.includes('model') || rowStr.includes('category') || rowStr.includes('lock'))) {
            headerIdx = r;
            break;
          } else if (rowStr.includes('lot') && (rowStr.includes('description') || rowStr.includes('title') || rowStr.includes('model'))) {
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

        if (rawJson.length === 0) {
          showNotice('O arquivo parece vazio ou sem dados válidos.', 'error');
          return;
        }

        setRawHeaders(headers);
        setParsedPreviewRows(rawJson);

        const isStockApple = headers.some(h => /item #|warehouse|lock status|available quantity|list price/i.test(h)) ||
                             /stock/i.test(file.name) ||
                             (headers.some(h => /category/i.test(h)) && headers.some(h2 => /make/i.test(h2)));

        const isVerizonFormat = headers.some(h => /lot #|item description|part #|inventory source|package type/i.test(h)) ||
                                /verizon/i.test(file.name);

        if (isStockFeedFormat(presetFormat) && presetFormat !== 'STOCK_APPLE') {
          setStockAppleGroupMode('individual');
          const { audit } = processStockAppleRows(rawJson, true);
          showNotice(`Planilha ${presetFormat} detectada! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados.`, 'success');
        } else if (/assurant/i.test(file.name)) {
          setPresetFormat('ASSURANT');
          setStockAppleGroupMode('individual');
          const { audit } = processStockAppleRows(rawJson, true);
          showNotice(`Planilha ASSURANT detectada! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD/un) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
        } else if (isStockApple || presetFormat === 'STOCK_APPLE') {
          setPresetFormat('STOCK_APPLE');
          const { audit } = processStockAppleRows(rawJson);
          showNotice(`Planilha Estoque Apple detectada! ${audit.approvedCount.toLocaleString()} itens aprovados (iPhones, iPads e Watches UNLOCKED) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
        } else if (isVerizonFormat || presetFormat === 'VERIZON') {
          setPresetFormat('VERIZON');
          const grouped = processVerizonRows(rawJson);
          let totalUnits = 0;
          grouped.forEach(g => { totalUnits += g.totalQty; });
          showNotice(`Arquivo VERIZON detectado! ${grouped.length} lotes agrupados e ${totalUnits} aparelhos lidos.`);
        } else {
          setPresetFormat('GENERIC');
          const mapping = {
            lotNumber: headers.find(h => /lote|lot|id|codigo/i.test(h)) || headers[0] || '',
            title: headers.find(h => /titulo|title|produto|descricao/i.test(h)) || headers[1] || '',
            modelFamily: headers.find(h => /modelo|model|familia|aparelho/i.test(h)) || headers[2] || '',
            quantity: headers.find(h => /quantidade|qtd|unidades|units|qty/i.test(h)) || headers[3] || '',
            grade: headers.find(h => /grade|condicao|classificacao/i.test(h)) || headers[4] || '',
            storage: headers.find(h => /armazenamento|storage|capacidade|memoria/i.test(h)) || '',
            batteryHealth: headers.find(h => /bateria|battery|saude/i.test(h)) || '',
            currentBidUsd: headers.find(h => /lance atual|current bid|lance|valor usd|preco/i.test(h)) || '',
            startingBidUsd: headers.find(h => /lance inicial|starting bid|minimo|abertura/i.test(h)) || '',
            estimatedRetailBrl: headers.find(h => /revenda|varejo|brasil|brl|mercado livre/i.test(h)) || '',
            auctionHouse: headers.find(h => /casa|auction house|origem|fornecedor/i.test(h)) || '',
            location: headers.find(h => /localizacao|armazem|cidade|location|estado/i.test(h)) || ''
          };
          setColumnMapping(mapping);
          showNotice(`Arquivo "${file.name}" carregado com ${rawJson.length} linhas.`);
        }
      } catch (err: any) {
        showNotice(`Erro ao processar planilha: ${err?.message || 'Arquivo inválido'}`, 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      showNotice('Cole o texto da sua planilha ou código XML primeiro.', 'error');
      return;
    }

    // Check if pasted content is XML
    if (pasteText.trim().startsWith('<')) {
      try {
        const rows = parseXmlSpreadsheet(pasteText.trim());
        if (rows.length === 0) {
          showNotice('Nenhum registro reconhecido no XML colado.', 'error');
          return;
        }
        const headers = Object.keys(rows[0]);
        setRawHeaders(headers);
        setParsedPreviewRows(rows);
        setUploadedFileName('Dados Colados em XML');

        const isStockApple = headers.some(h => /item #|itemnumber|warehouse|lock status|lockstatus|available quantity|list price/i.test(h)) ||
                             (headers.some(h => /category/i.test(h)) && headers.some(h2 => /make/i.test(h2)));

        const isVerizon = headers.some(h => /lot #|item description|part #|inventory source|model/i.test(h));

        if (presetFormat === 'ASSURANT' || /A02-ASSURANT|assurant/i.test(pasteText)) {
          setPresetFormat('ASSURANT');
          setStockAppleGroupMode('individual');
          const { audit } = processStockAppleRows(rows, true);
          showNotice(`XML ASSURANT processado! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD/un) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
        } else if (isStockApple || presetFormat === 'STOCK_APPLE') {
          setPresetFormat('STOCK_APPLE');
          const { audit } = processStockAppleRows(rows);
          showNotice(`XML Estoque Apple processado! ${audit.approvedCount.toLocaleString()} itens aprovados (iPhones, iPads e Watches UNLOCKED) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
        } else if (isVerizon || presetFormat === 'VERIZON') {
          setPresetFormat('VERIZON');
          const grouped = processVerizonRows(rows);
          showNotice(`XML Padrão VERIZON processado! ${grouped.length} lotes agrupados.`);
        } else {
          setPresetFormat('GENERIC');
          showNotice(`${rows.length} registros XML processados com sucesso!`);
        }
        return;
      } catch (err: any) {
        showNotice(`Falha ao interpretar XML colado: ${err?.message}`, 'error');
        return;
      }
    }

    try {
      let rows = parseCsvText(pasteText.trim());
      if (rows.length === 0) {
        const wb = XLSX.read(pasteText.trim(), { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      }

      if (rows.length === 0) {
        showNotice('Nenhum registro reconhecido no texto colado.', 'error');
        return;
      }

      const headers = Object.keys(rows[0] || {});
      setRawHeaders(headers);
      setParsedPreviewRows(rows);
      setUploadedFileName('Dados Colados do Excel / CSV');

      const isStockApple = headers.some(h => /item #|itemnumber|warehouse|lock status|lockstatus|available quantity|list price/i.test(h)) ||
                           (headers.some(h => /category/i.test(h)) && headers.some(h2 => /make/i.test(h2)));

      const isVerizon = headers.some(h => /lot #|item description|part #|inventory source/i.test(h));

      if (presetFormat === 'ASSURANT' || /A02-ASSURANT|assurant/i.test(pasteText)) {
        setPresetFormat('ASSURANT');
        setStockAppleGroupMode('individual');
        const { audit } = processStockAppleRows(rows, true);
        showNotice(`ASSURANT processado! ${audit.approvedCount.toLocaleString()} lotes/itens UNLOCKED aprovados (+$${addAssurantFiveUsd ? assurantMarkupAmount : 0} USD/un) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
      } else if (isStockApple || presetFormat === 'STOCK_APPLE') {
        setPresetFormat('STOCK_APPLE');
        const { audit } = processStockAppleRows(rows);
        showNotice(`Estoque Apple processado! ${audit.approvedCount.toLocaleString()} itens aprovados (iPhones, iPads e Watches UNLOCKED) e ${audit.discardedLockedCount.toLocaleString()} bloqueados descartados.`, 'success');
      } else if (isVerizon || presetFormat === 'VERIZON') {
        setPresetFormat('VERIZON');
        const grouped = processVerizonRows(rows);
        showNotice(`Padrão VERIZON detectado! ${grouped.length} lotes agrupados.`);
      } else {
        setPresetFormat('GENERIC');
        const mapping = {
          lotNumber: headers.find(h => /lote|lot|id|codigo/i.test(h)) || headers[0] || '',
          title: headers.find(h => /titulo|title|produto|descricao/i.test(h)) || headers[1] || '',
          modelFamily: headers.find(h => /modelo|model|familia|aparelho/i.test(h)) || headers[2] || '',
          quantity: headers.find(h => /quantidade|qtd|unidades|units|qty/i.test(h)) || headers[3] || '',
          grade: headers.find(h => /grade|condicao|classificacao/i.test(h)) || headers[4] || '',
          storage: headers.find(h => /armazenamento|storage|capacidade|memoria/i.test(h)) || '',
          batteryHealth: headers.find(h => /bateria|battery|saude/i.test(h)) || '',
          currentBidUsd: headers.find(h => /lance atual|current bid|lance|valor usd|preco/i.test(h)) || '',
          startingBidUsd: headers.find(h => /lance inicial|starting bid|minimo|abertura/i.test(h)) || '',
          estimatedRetailBrl: headers.find(h => /revenda|varejo|brasil|brl|mercado livre/i.test(h)) || '',
          auctionHouse: headers.find(h => /casa|auction house|origem|fornecedor/i.test(h)) || '',
          location: headers.find(h => /localizacao|armazem|cidade|location|estado/i.test(h)) || ''
        };
        setColumnMapping(mapping);
        showNotice(`${rows.length} linhas de leilão processadas com sucesso!`);
      }
    } catch (e: any) {
      showNotice(`Erro ao processar dados colados: ${e?.message}`, 'error');
    }
  };

  // Recalculate Verizon bids when unit rate slider is adjusted
  const handleRecalculateVerizonRate = (newRate: number) => {
    setVerizonUnitRate(newRate);
    if (parsedPreviewRows.length > 0 && presetFormat === 'VERIZON') {
      processVerizonRows(parsedPreviewRows, newRate);
    }
  };

  // Publish VERIZON grouped lots to store and localStorage
  const handleApplyVerizonImport = () => {
    if (verizonGroupedLots.length === 0) {
      showNotice('Nenhum lote VERIZON agrupado para publicar.', 'error');
      return;
    }

    try {
      const newLots: AuctionLot[] = verizonGroupedLots.map((g, idx) => {
        const isSamsung = /samsung|galaxy|fold|flip/i.test(g.primaryModel) || /samsung/i.test(g.oem);
        const imageUrl = isSamsung
          ? '/images/samsung_galaxy_lot_1793851025604.jpg'
          : g.totalQty > 8
            ? '/images/iphone_lot_wholesale_inspection_1793849011081.jpg'
            : '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';

        const galleryImages = [
          imageUrl,
          '/images/iphone_lot_wholesale_inspection_1793849011081.jpg',
          '/images/hero_auction_warehouse_iphones_1793849010124.jpg'
        ];

        const primaryStorage = g.uniqueCapacities.length > 0
          ? g.uniqueCapacities.slice(0, 2).join(' / ')
          : '128GB';

        return {
          id: `vz-lot-${Date.now()}-${idx}`,
          lotNumber: g.lotNumber,
          title: g.title,
          modelFamily: g.primaryModel,
          oemBrand: g.oem,
          quantity: g.totalQty,
          grade: g.mappedGrade,
          primaryStorage,
          colorHighlights: g.uniqueColors.slice(0, 3),
          batteryHealthRange: '84% - 100% (Testado Verizon)',
          carrierStatus: 'Verizon Clean / Desbloqueado Global',
          imeiStatus: 'Clean ESN / 100% Verificado',
          auctionHouse: 'Verizon Direct Liquidation',
          location: 'Dallas, TX / Miami Hub',
          startingBidUsd: g.calculatedStartingBidUsd,
          currentBidUsd: g.calculatedCurrentBidUsd,
          reservePriceMet: true,
          estimatedBrazilRetailBrl: g.calculatedRetailBrl,
          totalBidsCount: Math.floor(Math.random() * 14) + 2,
          endTime: g.parsedEndTime,
          imageUrl,
          galleryImages,
          description: `Lote oficial do padrão VERIZON contendo ${g.totalQty} aparelho(s). Fontes de estoque: ${g.uniqueSources.join(', ') || 'Carrier Returns'}. Classificação técnica ${g.gradeRaw}.`,
          diagnosticReport: {
            faceId: true,
            trueTone: true,
            camerasPassed: true,
            batteryTested: true,
            cleanEsn: true,
            mdmFree: true
          },
          manifest: g.manifest,
          bidsHistory: [
            {
              id: `bid-vz-${idx}`,
              bidderName: 'Licitante EUA Inicial',
              amountUsd: g.calculatedCurrentBidUsd,
              timestamp: 'Início do Leilão'
            }
          ],
          originalListingUrl: g.url,
          listingUrl: g.url,
          sourceType: 'VERIZON'
        };
      });

      const finalLots = replaceExistingLots
        ? newLots
        : [...newLots, ...auctions];

      onUpdateAuctions(finalLots);
      try {
        localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(finalLots));
      } catch (e) {}

      showNotice(`🎉 ${newLots.length} Lotes Oficiais VERIZON (${newLots.reduce((acc, l) => acc + l.quantity, 0)} aparelhos) publicados com sucesso no catálogo e painel do cliente!`, 'success');
      setAdminTab('lots');
    } catch (err: any) {
      showNotice(`Falha ao publicar lotes VERIZON: ${err?.message}`, 'error');
    }
  };

  // Publish Generic Custom Lots
  const handleApplyImport = () => {
    if (isStockFeedFormat(presetFormat) && stockAppleItems.length > 0) {
      handleApplyStockAppleImport();
      return;
    }

    if (presetFormat === 'VERIZON' && verizonGroupedLots.length > 0) {
      handleApplyVerizonImport();
      return;
    }

    if (parsedPreviewRows.length === 0) {
      showNotice('Nenhum dado para importar.', 'error');
      return;
    }

    try {
      const newLots: AuctionLot[] = parsedPreviewRows.map((row, idx) => {
        const lotNumber = String(row[columnMapping.lotNumber] || `US-${Math.floor(10000 + Math.random() * 90000)}`);
        const title = String(row[columnMapping.title] || `Lote Importado iPhone ${idx + 1}`);
        const modelFamilyRaw = String(row[columnMapping.modelFamily] || 'iPhone 16 Pro Max');
        
        let modelFamily: string = 'iPhone 16 Pro Max';
        if (/16 pro max/i.test(modelFamilyRaw)) modelFamily = 'iPhone 16 Pro Max';
        else if (/16 pro/i.test(modelFamilyRaw)) modelFamily = 'iPhone 16 Pro';
        else if (/16/i.test(modelFamilyRaw)) modelFamily = 'iPhone 16 / 16 Plus';
        else if (/15 pro max/i.test(modelFamilyRaw)) modelFamily = 'iPhone 15 Pro Max';
        else if (/15 pro/i.test(modelFamilyRaw)) modelFamily = 'iPhone 15 Pro';
        else if (/15/i.test(modelFamilyRaw)) modelFamily = 'iPhone 15';
        else if (/14/i.test(modelFamilyRaw)) modelFamily = 'iPhone 14 Series';
        else modelFamily = modelFamilyRaw || 'Lote Misto';

        const grade = mapGrade(String(row[columnMapping.grade] || 'Grade A'));
        const quantity = Math.max(1, parseInt(String(row[columnMapping.quantity] || '1'), 10) || 1);
        const currentBidUsd = Math.max(100, parseFloat(String(row[columnMapping.currentBidUsd] || '500')) || 500);
        const startingBidUsd = Math.max(50, parseFloat(String(row[columnMapping.startingBidUsd] || String(currentBidUsd * 0.8))) || currentBidUsd * 0.8);
        const estimatedBrazilRetailBrl = parseFloat(String(row[columnMapping.estimatedRetailBrl] || String(currentBidUsd * usdRate * 1.5))) || (currentBidUsd * usdRate * 1.5);

        return {
          id: `lot-imported-${Date.now()}-${idx}`,
          lotNumber,
          title,
          modelFamily,
          quantity,
          grade,
          primaryStorage: String(row[columnMapping.storage] || '256GB'),
          colorHighlights: ['Titanium', 'Space Black'],
          batteryHealthRange: String(row[columnMapping.batteryHealth] || '90% - 100%'),
          carrierStatus: 'Factory Unlocked (Global)',
          imeiStatus: 'Clean ESN / 100% Verificado',
          auctionHouse: String(row[columnMapping.auctionHouse] || 'Verizon Direct US Liquidation'),
          location: String(row[columnMapping.location] || 'Miami, FL (Armazém 01)'),
          startingBidUsd,
          currentBidUsd,
          reservePriceMet: true,
          estimatedBrazilRetailBrl,
          totalBidsCount: Math.floor(Math.random() * 20) + 1,
          endTime: new Date(Date.now() + 1000 * 60 * 60 * (Math.floor(Math.random() * 8) + 2)).toISOString(),
          imageUrl: quantity > 1 ? '/images/iphone_lot_wholesale_inspection_1793849011081.jpg' : '/images/iphone_16_pro_max_grade_a_1793849011033.jpg',
          galleryImages: [
            '/images/iphone_16_pro_max_grade_a_1793849011033.jpg',
            '/images/iphone_lot_wholesale_inspection_1793849011081.jpg'
          ],
          description: `Lote importado via planilha administrativa. Contém ${quantity} aparelho(s) com certificação Clean ESN e laudo de 30 pontos.`,
          diagnosticReport: {
            faceId: true,
            trueTone: true,
            camerasPassed: true,
            batteryTested: true,
            cleanEsn: true,
            mdmFree: true
          },
          manifest: Array.from({ length: quantity }).map((_, mIdx) => ({
            id: `dev-imp-${idx}-${mIdx}`,
            model: modelFamily,
            storage: '256GB',
            color: 'Titanium',
            grade,
            batteryHealth: 90 + (mIdx % 10),
            imeiMasked: `359820******${String(100 + mIdx * 13).slice(-3)}`,
            carrierStatus: 'Factory Unlocked',
            icloudStatus: 'Clean / FMI OFF',
            screenCondition: 'Conforme Grade',
            housingCondition: 'Conforme Grade'
          })),
          bidsHistory: [
            {
              id: `bid-seed-${idx}`,
              bidderName: 'Licitante EUA Inicial',
              amountUsd: currentBidUsd,
              timestamp: 'Início do Leilão'
            }
          ],
          sourceType: 'CUSTOM'
        };
      });

      const finalLots = replaceExistingLots ? newLots : [...newLots, ...auctions];
      onUpdateAuctions(finalLots);
      try {
        localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(finalLots));
      } catch (e) {}

      showNotice(`${newLots.length} lotes importados e publicados no catálogo com sucesso!`);
      setParsedPreviewRows([]);
      setUploadedFileName(null);
      setAdminTab('lots');
    } catch (err: any) {
      showNotice(`Falha na importação: ${err?.message}`, 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Lote': 'US-99100-MIA',
        'Titulo': 'Palete 10x iPhone 16 Pro Max 256GB Desbloqueados',
        'Modelo': 'iPhone 16 Pro Max',
        'Quantidade': 10,
        'Grade': 'Grade A+',
        'Armazenamento': '256GB',
        'Saude Bateria': '95% - 100%',
        'Lance Inicial USD': 6000,
        'Lance Atual USD': 7200,
        'Revenda Brasil BRL': 79000,
        'Casa de Leilao': 'Verizon Direct US Liquidation',
        'Localizacao': 'Miami, FL'
      },
      {
        'Lote': 'US-99101-DAL',
        'Titulo': 'Lote 5x iPhone 15 Pro 128GB Grade A Natural Titanium',
        'Modelo': 'iPhone 15 Pro',
        'Quantidade': 5,
        'Grade': 'Grade A',
        'Armazenamento': '128GB',
        'Saude Bateria': '88% - 94%',
        'Lance Inicial USD': 2200,
        'Lance Atual USD': 2800,
        'Revenda Brasil BRL': 26000,
        'Casa de Leilao': 'Liquidation.com Enterprise',
        'Localizacao': 'Dallas, TX'
      },
      {
        'Lote': 'US-99102-MIA',
        'Titulo': '1x iPhone 16 Pro Max 512GB Desert Titanium (Unidade Avulsa)',
        'Modelo': 'iPhone 16 Pro Max',
        'Quantidade': 1,
        'Grade': 'Grade A+',
        'Armazenamento': '512GB',
        'Saude Bateria': '100%',
        'Lance Inicial USD': 650,
        'Lance Atual USD': 890,
        'Revenda Brasil BRL': 9200,
        'Casa de Leilao': 'Apple Certified Wholesale',
        'Localizacao': 'Miami, FL'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Leiloes');
    XLSX.writeFile(wb, 'planilha_modelo_leiloes_iphones.xlsx');
    showNotice('Planilha modelo Excel baixada com sucesso!');
  };



  // ----------------------------------------------------
  // GESTÃO DE LOTES (EDIÇÃO RÁPIDA & EXCLUSÃO)
  // ----------------------------------------------------
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editPriceUsd, setEditPriceUsd] = useState<number>(0);
  const [editGrade, setEditGrade] = useState<GradeType>('Grade A');

  const handleStartEdit = (lot: AuctionLot) => {
    setEditingLotId(lot.id);
    setEditPriceUsd(lot.currentBidUsd);
    setEditGrade(lot.grade);
  };

  const handleSaveEdit = (lotId: string) => {
    const updated = auctions.map(lot => {
      if (lot.id === lotId) {
        return {
          ...lot,
          currentBidUsd: editPriceUsd,
          grade: editGrade
        };
      }
      return lot;
    });
    onUpdateAuctions(updated);
    setEditingLotId(null);
    showNotice('Lote atualizado com sucesso no catálogo!');
  };

  const handleDeleteLot = (lotId: string) => {
    if (!confirm('Deseja realmente remover este lote do leilão?')) return;
    const updated = auctions.filter(l => l.id !== lotId);
    onUpdateAuctions(updated);
    showNotice('Lote removido do catálogo com sucesso!');
  };

  // ----------------------------------------------------
  // OFERTAS COMPUTADAS (OFFERS CONSOLE)
  // ----------------------------------------------------
  const [offersList, setOffersList] = useState<AdminOffer[]>(() => {
    try {
      const saved = localStorage.getItem('us_admin_offers_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'off-101',
        lotId: auctions[0]?.id || 'lot-1',
        lotNumber: auctions[0]?.lotNumber || 'US-89104',
        lotTitle: auctions[0]?.title || 'Lote Master 10x iPhone 16 Pro Max',
        clientName: 'Carlos Mendes (Tech Imports)',
        clientEmail: 'carlos.mendes@importtech.com.br',
        amountUsd: 7450,
        amountBrl: 7450 * usdRate,
        timestamp: 'Hoje, 14:32',
        status: 'Vencendo',
        isAutoSniper: true
      },
      {
        id: 'off-102',
        lotId: auctions[1]?.id || 'lot-2',
        lotNumber: auctions[1]?.lotNumber || 'US-77402',
        lotTitle: 'Lote 5x iPhone 15 Pro 128GB Grade A',
        clientName: 'Pedro Apple Reseller SP',
        clientEmail: 'pedro@applereseller.com.br',
        amountUsd: 2850,
        amountBrl: 2850 * usdRate,
        timestamp: 'Hoje, 13:50',
        status: 'Homologada / Arrematada'
      },
      {
        id: 'off-103',
        lotId: auctions[2]?.id || 'lot-3',
        lotNumber: auctions[2]?.lotNumber || 'US-90311',
        lotTitle: '1x iPhone 16 Pro Max 512GB Desert Titanium',
        clientName: 'Vitor Importações Sul',
        clientEmail: 'vitor.imports@gmail.com',
        amountUsd: 890,
        amountBrl: 890 * usdRate,
        timestamp: 'Hoje, 12:15',
        status: 'Vencendo'
      }
    ];
  });

  const [counterOfferEditingId, setCounterOfferEditingId] = useState<string | null>(null);
  const [counterOfferUsdInput, setCounterOfferUsdInput] = useState<string>('');
  const [counterOfferNoteInput, setCounterOfferNoteInput] = useState<string>('');

  const handleUpdateOfferStatus = (
    offerId: string,
    newStatus: AdminOffer['status'],
    counterOfferUsd?: number,
    adminNote?: string
  ) => {
    setOffersList(prev => {
      const updated = prev.map(o =>
        o.id === offerId
          ? {
              ...o,
              status: newStatus,
              ...(counterOfferUsd !== undefined ? { counterOfferUsd } : {}),
              ...(adminNote !== undefined ? { adminNote } : {})
            }
          : o
      );
      try {
        localStorage.setItem('us_admin_offers_v1', JSON.stringify(updated));
        window.dispatchEvent(new Event('offers_updated'));
      } catch (e) {}
      return updated;
    });
    showNotice(`Status da oferta alterado para "${newStatus}"! Cliente notificado no painel.`);
  };

  const handleExportOffersCsv = () => {
    const ws = XLSX.utils.json_to_sheet(offersList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ofertas');
    XLSX.writeFile(wb, 'relatorio_ofertas_computadas.xlsx');
    showNotice('Relatório de ofertas exportado em Excel!');
  };

  // ----------------------------------------------------
  // CLIENTES / PAINEL DE ARREMATANTES
  // ----------------------------------------------------
  const [clientsList, setClientsList] = useState<SystemUser[]>([
    currentUser,
    {
      name: 'EletroCell Lojistas Associados',
      email: 'compras@eletrocell.com.br',
      cpfCnpj: '24.119.802/0001-90',
      phone: '+55 (31) 98765-4321',
      biddingLimitUsd: 50000,
      verifiedStatus: true,
      registeredDate: '15/01/2026'
    },
    {
      name: 'Rodrigo Barbosa Silva',
      email: 'rodrigo.silva@gmail.com',
      cpfCnpj: '348.910.228-11',
      phone: '+55 (21) 97722-3344',
      biddingLimitUsd: 10000,
      verifiedStatus: false,
      registeredDate: '03/02/2026'
    }
  ]);

  const handleToggleClientVerify = (idx: number) => {
    setClientsList(prev => prev.map((c, i) => i === idx ? { ...c, verifiedStatus: !c.verifiedStatus } : c));
    showNotice('Status do cliente atualizado com sucesso!');
  };

  // Filtering and pagination for Stock Apple preview table
  const filteredStockItems = stockAppleItems.filter(item => {
    if (stockAppleFilterType === 'IPHONE' && (item.deviceType !== 'iPhone' || item.status !== 'APPROVED')) return false;
    if (stockAppleFilterType === 'IPAD' && (item.deviceType !== 'iPad' || item.status !== 'APPROVED')) return false;
    if (stockAppleFilterType === 'WATCH' && (item.deviceType !== 'Apple Watch' || item.status !== 'APPROVED')) return false;
    if (stockAppleFilterType === 'DISCARDED_LOCKED' && item.status !== 'DISCARDED_LOCKED') return false;
    if (stockAppleFilterType === 'ALL' && item.status !== 'APPROVED') return false;

    if (stockAppleSearch.trim()) {
      const q = stockAppleSearch.toLowerCase();
      const matchModel = item.model.toLowerCase().includes(q);
      const matchNumber = item.itemNumber.toLowerCase().includes(q);
      const matchStorage = item.capacity.toLowerCase().includes(q);
      const matchColor = item.color.toLowerCase().includes(q);
      const matchWarehouse = item.warehouse.toLowerCase().includes(q);
      if (!matchModel && !matchNumber && !matchStorage && !matchColor && !matchWarehouse) return false;
    }
    return true;
  });

  const stockPageSize = 15;
  const totalStockPages = Math.max(1, Math.ceil(filteredStockItems.length / stockPageSize));
  const paginatedStockItems = filteredStockItems.slice((stockApplePage - 1) * stockPageSize, stockApplePage * stockPageSize);

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-200 space-y-8">
      {/* Top Banner Notice */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              USAFAST LEILÕES HUB · ADMIN
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-emerald-400 font-mono">
              PTAX: R$ {usdRate.toFixed(2)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            USAFAST LEILÕES HUB — Painel Executivo
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dashboard de pregões, gestão de ofertas computadas, importação de planilhas (Excel, CSV & XML) e controle de arrematações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Baixar planilha modelo no formato Excel"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Planilha Modelo (XLSX)</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Encerrar sessão de administrador"
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
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'dashboard'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Dashboard Geral</span>
        </button>

        <button
          onClick={() => setAdminTab('offers')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'offers'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Ofertas Computadas ({offersList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('upload')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'upload'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Importar Planilhas (Excel, CSV & XML)</span>
        </button>

        <button
          onClick={() => setAdminTab('lots')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'lots'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>Gerenciar Leilões ({auctions.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('clients')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'clients'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Painel de Clientes ({clientsList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            adminTab === 'settings'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações & Cotação</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 0: DASHBOARD EXECUTIVO USAFAST LEILÕES HUB */}
      {/* ======================================================== */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Operational Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Lotes Ativos</span>
                <Gavel className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-white font-mono block">
                {auctions.length}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">
                {auctions.filter(a => a.sourceType === 'VERIZON').length} lotes Padrão Oficial VERIZON
              </span>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Total de Aparelhos</span>
                <Smartphone className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-2xl font-black text-cyan-300 font-mono block">
                {auctions.reduce((acc, l) => acc + l.quantity, 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Unidades em disputa nos EUA
              </span>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Volume em Pregão (USD)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-black text-emerald-400 font-mono block">
                ${auctions.reduce((acc, l) => acc + l.currentBidUsd, 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ≈ R$ {(auctions.reduce((acc, l) => acc + l.currentBidUsd, 0) * usdRate).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Ofertas Computadas</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-400 font-mono block">
                {offersList.length}
              </span>
              <span className="text-[10px] text-emerald-400 block">
                {offersList.filter(o => o.status === 'Vencendo').length} ofertas vencedoras
              </span>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Arrematantes</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-2xl font-black text-white font-mono block">
                {clientsList.length}
              </span>
              <span className="text-[10px] text-emerald-400 block">
                {clientsList.filter(c => c.verifiedStatus).length} verificados com limite
              </span>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Ações rápidas da central <strong className="text-white">USAFAST LEILÕES HUB</strong>:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAdminTab('upload')}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Planilha (Excel / XML)</span>
              </button>
              <button
                onClick={() => setAdminTab('offers')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerenciar Ofertas ({offersList.length})</span>
              </button>
              <button
                onClick={() => setAdminTab('lots')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
              >
                <Gavel className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Todos os Lotes</span>
              </button>
            </div>
          </div>

          {/* Analytical Charts and Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Family Breakdown */}
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Distribuição por Modelo de Smartphone</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {auctions.length} lotes catalogados
                </span>
              </div>
              <div className="space-y-3 text-xs">
                {Array.from(new Set(auctions.map(a => a.modelFamily))).slice(0, 5).map(model => {
                  const count = auctions.filter(a => a.modelFamily === model).length;
                  const pct = Math.round((count / auctions.length) * 100) || 10;
                  return (
                    <div key={model} className="space-y-1">
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span className="font-medium text-white">{model}</span>
                        <span className="font-mono text-amber-400">{count} lote(s) · {pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-300 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aesthetic Grade Breakdown */}
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Distribuição por Grade Estético</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Laudo 30 pontos
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(['Grade A+', 'Grade A', 'Grade B', 'Grade C'] as GradeType[]).map(grade => {
                  const lotsWithGrade = auctions.filter(a => a.grade === grade);
                  const totalGradeUnits = lotsWithGrade.reduce((acc, l) => acc + l.quantity, 0);
                  return (
                    <div key={grade} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{grade}</span>
                        <span className="text-[10px] text-amber-400 font-mono">{lotsWithGrade.length} lotes</span>
                      </div>
                      <span className="text-lg font-black text-slate-200 font-mono block">
                        {totalGradeUnits} aparelhos
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {grade === 'Grade A+' ? 'Zero detalhes (Mint)' : grade === 'Grade A' ? 'Excelente estado' : grade === 'Grade B' ? 'Marcas leves' : 'Econômico'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Live Computed Offers Feed */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Últimas Ofertas Computadas pelos Clientes</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lances enviados em tempo real através do painel do cliente USAFAST
                </p>
              </div>
              <button
                onClick={() => setAdminTab('offers')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Ver Todas as Ofertas ({offersList.length}) →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                    <th className="py-2.5 px-3">Horário</th>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-3">Arrematante</th>
                    <th className="py-2.5 px-3">Oferta (USD)</th>
                    <th className="py-2.5 px-3">Valor (BRL)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {offersList.slice(0, 5).map(offer => (
                    <tr key={offer.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{offer.timestamp}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{offer.lotNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{offer.clientName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">${offer.amountUsd.toLocaleString()} USD</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">R$ {offer.amountBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          offer.status === 'Vencendo'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : offer.status === 'Homologada / Arrematada'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, 'Homologada / Arrematada')}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[11px] font-medium transition-colors"
                        >
                          Homologar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: UPLOAD / IMPORTAR (EXCEL, CSV & XML) */}
      {/* ======================================================== */}
      {adminTab === 'upload' && (
        <div className="space-y-6">
          {/* Verizon Featured Banner */}
          <div className="p-6 bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border border-red-500/40 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-black text-[11px] tracking-wider uppercase shadow-md">
                    PADRÃO VERIZON
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/30 font-mono text-[11px]">
                    US Carrier Wholesale Standard
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Importador Especializado de Leilões VERIZON (Arquivo Anexado)
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Reconhece o layout exato com as 16 colunas oficiais (<span className="text-amber-300 font-mono">Lot #, Title, Qty, OEM, Model, Item Description, Part #, Category, Grade, Capacity, Color, Inventory Source, End Date, End Time, URL</span>) e agrupa automaticamente linhas com o mesmo número de lote.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  disabled={isLoadingVerizon}
                  onClick={handleLoadAttachedVerizonCsv}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95"
                >
                  {isLoadingVerizon ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                  )}
                  <span>
                    {isLoadingVerizon ? 'Lendo e Agrupando...' : '⚡ Carregar CSV VERIZON Oficial (Anexo)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadOfficialStockCsv}
                  disabled={isLoadingStockCsv}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95"
                  title="Carregar a planilha oficial em anexo com 8.160 itens (filtra apenas iPhones, iPads e Watches UNLOCKED)"
                >
                  {isLoadingStockCsv ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Package className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>
                    {isLoadingStockCsv ? 'Lendo e Filtrando...' : '🍏 Carregar Planilha Apple Oficial (8.160 itens)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleStockXml}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  title="Testar importação com XML do padrão Estoque Apple (com UNLOCKED e demonstração do filtro de bloqueados)"
                >
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span>⚡ Exemplo XML Apple (Stock)</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleXml}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  title="Testar importação com XML modelo da Verizon"
                >
                  <Code className="w-4 h-4 text-amber-400" />
                  <span>⚡ Exemplo XML (Verizon)</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleAssurantXml}
                  className="px-4 py-2.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  title="Testar importação com XML modelo da Assurant (apenas UNLOCKED + $5 USD)"
                >
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>⚡ Exemplo XML (Assurant)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
            {/* Format & Mode Selector Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-300 block">Formato de Importação:</span>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPresetFormat('ASSURANT');
                      setStockAppleGroupMode('individual');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'ASSURANT'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>★ Leilão ASSURANT (XML / CSV)</span>
                    <span className="px-1.5 py-0.2 bg-indigo-300 text-slate-950 font-black rounded text-[9px] uppercase tracking-wider">
                      UNLOCKED +$5
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPresetFormat('STOCK_APPLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'STOCK_APPLE'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>🍏 Estoque Pronta Entrega (XML / CSV Stock List)</span>
                    <span className="px-1.5 py-0.2 bg-emerald-400 text-slate-950 font-black rounded text-[9px] uppercase tracking-wider">
                      UNLOCKED ONLY
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPresetFormat('VERIZON')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'VERIZON'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>★ Padrão VERIZON (DNA, DNB, DNC, DND)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPresetFormat('MARKETPLACE_1');
                      setStockAppleGroupMode('individual');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'MARKETPLACE_1'
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-1 ring-sky-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>★ Marketplace 1 (XML / CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPresetFormat('MARKETPLACE_2');
                      setStockAppleGroupMode('individual');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'MARKETPLACE_2'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25 ring-1 ring-cyan-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>★ Marketplace 2 (XML / CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPresetFormat('MARKETPLACE_3');
                      setStockAppleGroupMode('individual');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'MARKETPLACE_3'
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>★ Marketplace 3 (XML / CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPresetFormat('MACBOOKS');
                      setStockAppleGroupMode('individual');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'MACBOOKS'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>💻 Leilão Macbooks (XML / CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPresetFormat('GENERIC')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      presetFormat === 'GENERIC'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>Padrão Custom / Genérico</span>
                  </button>
                </div>
              </div>

              {/* Upload Mode Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    uploadMode === 'file'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Arquivo (.xlsx / .csv / .xml)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    uploadMode === 'paste'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Colar Texto ou XML (Ctrl+V)</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Drag & Drop File Zone */}
            {uploadMode === 'file' ? (
              <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-red-500/80 rounded-2xl p-6 sm:p-10 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv, .xml, text/xml, application/xml"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">
                    {uploadedFileName ? `Arquivo Carregado: ${uploadedFileName}` : 'Clique para subir ou arraste sua planilha (XML / CSV / Excel) aqui'}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Formatos aceitos: Arquivos XML (.xml), CSV (.csv) e Microsoft Excel (.xlsx, .xls)
                  </span>
                  <span className="text-[11px] text-emerald-400 block font-medium">
                    🛡️ Regra de Filtro Ativa: Na importação Apple, são aprovados exclusivamente iPhones, iPads e Apple Watches DESBLOQUEADOS (UNLOCKED).
                  </span>
                </div>
              </div>
              {uploadedFileName && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl">
                  <div className="text-xs text-emerald-200">
                    <span className="font-bold block">Planilha pronta: {uploadedFileName}</span>
                    <span className="text-[11px] text-emerald-400">
                      {(presetFormat === 'STOCK_APPLE' || presetFormat === 'ASSURANT')
                        ? `${stockAppleAudit.approvedCount.toLocaleString()} lotes UNLOCKED prontos para carregar`
                        : `${parsedPreviewRows.length.toLocaleString()} linhas lidas`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importar / Carregar Lotes Agora</span>
                  </button>
                </div>
              )}
            </div>
            ) : (
              /* Mode 2: Paste Direct from Excel or Paste XML */
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs text-slate-300 block font-medium">
                    Cole abaixo as linhas copiadas do Excel, CSV ou o código XML da sua planilha:
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPasteText(SAMPLE_STOCK_APPLE_XML)}
                      className="text-emerald-400 hover:underline text-[11px] font-bold"
                    >
                      Inserir Exemplo XML Apple
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setPasteText(SAMPLE_VERIZON_XML)}
                      className="text-amber-400 hover:underline text-[11px] font-semibold"
                    >
                      Inserir Exemplo XML Verizon
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Cole aqui linhas tabulares do Excel OU o código XML completo (ex: <?xml version='1.0'?> <Workbook>... ou <listings><listing>...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-red-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md shadow-red-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Processar Dados Colados (Excel / CSV / XML)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteText('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                  >
                    Limpar Campo
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Compatível com exportações oficiais Verizon Wireless Returns, AT&T Liquidation e operadoras dos EUA.
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="text-amber-400 hover:underline font-semibold"
              >
                Baixar Planilha Modelo Exemplo (.xlsx) ➔
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STOCK APPLE / ASSURANT UNLOCKED (XML / CSV) CONSOLE      */}
          {/* ======================================================== */}
          {isStockFeedFormat(presetFormat) && stockAppleItems.length > 0 && (
            <div className={`space-y-6 p-6 bg-slate-900/90 border rounded-2xl shadow-2xl ${presetFormat === 'ASSURANT' ? 'border-indigo-500/40' : 'border-emerald-500/40'}`}>
              {presetFormat === 'ASSURANT' && (
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black uppercase">
                      LEILÃO ASSURANT
                    </span>
                    <span className="text-xs text-indigo-200 font-semibold">
                      Acréscimo automático de +$5 USD por aparelho nos valores importados (apenas UNLOCKED)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addAssurantFiveUsd}
                      onChange={(e) => setAddAssurantFiveUsd(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500"
                    />
                    <span>Acrescentar +${assurantMarkupAmount} USD em todos os valores</span>
                  </label>
                </div>
              )}
              {/* Header & Stats Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>FILTRO RIGOROSO ATIVO: 100% APPLE UNLOCKED</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                      Apenas iPhones, iPads & Apple Watches Desbloqueados
                    </span>
                  </div>
                  <h3 className="font-black text-white text-lg mt-1.5 flex items-center gap-2">
                    <span>Estoque Apple Desbloqueado: {stockAppleAudit.approvedCount.toLocaleString()} Itens Aprovados</span>
                    <span className="text-slate-400 text-sm font-normal">({stockAppleAudit.totalApprovedUnits.toLocaleString()} Aparelhos Físicos)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Critério de seleção aplicado: Apenas modelos da Apple (<span className="text-emerald-300 font-semibold">iPhones</span>, <span className="text-emerald-300 font-semibold">iPads</span> e <span className="text-emerald-300 font-semibold">Apple Watches</span>) com status <span className="text-emerald-400 font-mono font-bold">UNLOCKED</span>. Todos os aparelhos com bloqueio de operadora ou iCloud (<span className="text-rose-400 font-mono font-bold">LOCKED</span>) foram automaticamente excluídos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleApplyStockAppleImport}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Carregar e Publicar {stockAppleGroupMode === 'grouped' ? `${stockAppleGroupedLots.length} Lotes no Atacado` : `${stockAppleAudit.approvedCount.toLocaleString()} Lotes Individuais`} no Hub</span>
                  </button>
                </div>
              </div>

              {/* 4 Quick-Stat Audit Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-950/25 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>Aprovados (Desbloqueados)</span>
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stockAppleAudit.approvedCount.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300 font-medium pt-1 border-t border-emerald-500/20">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-300">
                      📱 {stockAppleAudit.approvedIPhones.toLocaleString()} iPhones
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-300">
                      📲 {stockAppleAudit.approvedIPads.toLocaleString()} iPads
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-300">
                      ⌚ {stockAppleAudit.approvedWatches.toLocaleString()} Watches
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
                    <span>Total Unidades Físicas</span>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stockAppleAudit.totalApprovedUnits.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Soma da quantidade disponível dos itens aprovados para arremate
                  </div>
                </div>

                <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-rose-400 font-bold">
                    <span>Descartados Bloqueados (LOCKED)</span>
                    <Lock className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-rose-300 font-mono">
                    {stockAppleAudit.discardedLockedCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-rose-300/80 font-medium">
                    100% filtrados para proteger o cliente de aparelhos bloqueados
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                    <span>Lotes Prontos para Publicação</span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    {stockAppleGroupMode === 'grouped' ? stockAppleGroupedLots.length.toLocaleString() : stockAppleAudit.approvedCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {stockAppleGroupMode === 'grouped' ? 'Agrupados por Modelo + Capacidade + Grade' : 'Individualmente linha a linha por Item #'}
                  </div>
                </div>
              </div>

              {/* Price Multiplier & Mode Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Modo de Consolidação de Lotes:</label>
                  <div className="flex flex-col gap-2 text-xs">
                    <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      stockAppleGroupMode === 'grouped'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="appleGroupMode"
                        checked={stockAppleGroupMode === 'grouped'}
                        onChange={() => setStockAppleGroupMode('grouped')}
                        className="accent-emerald-400"
                      />
                      <span>Consolidar por Modelo & Grade ({stockAppleGroupedLots.length} lotes de atacado)</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      stockAppleGroupMode === 'individual'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="appleGroupMode"
                        checked={stockAppleGroupMode === 'individual'}
                        onChange={() => setStockAppleGroupMode('individual')}
                        className="accent-emerald-400"
                      />
                      <span>Lotes Individuais por Linha ({stockAppleAudit.approvedCount.toLocaleString()} lotes)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Desconto Lance Inicial (%):</span>
                    <span className="text-emerald-400 font-mono font-black">{stockAppleDiscountPercent}% OFF</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="5"
                    value={stockAppleDiscountPercent}
                    onChange={e => setStockAppleDiscountPercent(parseInt(e.target.value, 10) || 15)}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Define o lance de abertura abaixo do List Price de atacado para incentivar lances.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Modo de Publicação no Catálogo:</label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={replaceExistingLots}
                      onChange={e => setReplaceExistingLots(e.target.checked)}
                      className="accent-emerald-400 rounded w-4 h-4"
                    />
                    <span>Substituir leilões atuais pelos novos lotes Apple</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block">
                    Cotação PTAX aplicada: R$ {usdRate.toFixed(2)} por USD.
                  </span>
                </div>
              </div>

              {/* Table Filter Tabs & Search Bar */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setStockAppleFilterType('ALL'); setStockApplePage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        stockAppleFilterType === 'ALL'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Todos Aprovados ({stockAppleAudit.approvedCount.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStockAppleFilterType('IPHONE'); setStockApplePage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        stockAppleFilterType === 'IPHONE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>iPhones ({stockAppleAudit.approvedIPhones.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStockAppleFilterType('IPAD'); setStockApplePage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        stockAppleFilterType === 'IPAD'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Tablet className="w-3.5 h-3.5" />
                      <span>iPads ({stockAppleAudit.approvedIPads.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStockAppleFilterType('WATCH'); setStockApplePage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        stockAppleFilterType === 'WATCH'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Watch className="w-3.5 h-3.5" />
                      <span>Apple Watches ({stockAppleAudit.approvedWatches.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStockAppleFilterType('DISCARDED_LOCKED'); setStockApplePage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        stockAppleFilterType === 'DISCARDED_LOCKED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 border border-rose-500/30'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Auditoria: Descartados LOCKED ({stockAppleAudit.discardedLockedCount.toLocaleString()})</span>
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrar por modelo, cor, GB..."
                      value={stockAppleSearch}
                      onChange={e => { setStockAppleSearch(e.target.value); setStockApplePage(1); }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Table of items */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item #</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Modelo & Capacidade</th>
                        <th className="py-2.5 px-3">Cor</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3 text-center">Status Bloqueio</th>
                        <th className="py-2.5 px-3 text-right">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                        <th className="py-2.5 px-3">Armazém</th>
                        <th className="py-2.5 px-3 text-center">Filtro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedStockItems.map((item, idx) => {
                        const isApproved = item.status === 'APPROVED';
                        return (
                          <tr
                            key={item.id || idx}
                            className={`hover:bg-slate-900/60 transition-colors ${
                              !isApproved ? 'bg-rose-950/10' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300 font-bold">
                              {item.itemNumber}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 flex items-center gap-1 w-fit">
                                {item.deviceType === 'iPhone' && <Smartphone className="w-3 h-3 text-blue-400" />}
                                {item.deviceType === 'iPad' && <Tablet className="w-3 h-3 text-emerald-400" />}
                                {item.deviceType === 'Apple Watch' && <Watch className="w-3 h-3 text-amber-400" />}
                                <span>{item.deviceType}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-white">
                              <div>{item.model}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.capacity} · {item.modelNumber}</div>
                            </td>
                            <td className="py-2 px-3 text-slate-300">{item.color}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                                {item.grade}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isApproved ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>UNLOCKED</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>LOCKED</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-white">
                              {item.availableQuantity}x
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              ${item.listPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                              {item.warehouse}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isApproved ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                                  APROVADO
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold" title={item.discardReason}>
                                  DESCARTADO
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedStockItems.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-500">
                            Nenhum item encontrado para este filtro ou busca.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-400">
                  <span>
                    Mostrando {filteredStockItems.length > 0 ? (stockApplePage - 1) * stockPageSize + 1 : 0} a {Math.min(stockApplePage * stockPageSize, filteredStockItems.length)} de {filteredStockItems.length.toLocaleString()} itens
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={stockApplePage <= 1}
                      onClick={() => setStockApplePage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded text-xs font-semibold text-white flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <span className="font-mono text-slate-300 font-bold px-2">
                      Página {stockApplePage} de {totalStockPages}
                    </span>
                    <button
                      type="button"
                      disabled={stockApplePage >= totalStockPages}
                      onClick={() => setStockApplePage(p => Math.min(totalStockPages, p + 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded text-xs font-semibold text-white flex items-center gap-1"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERIZON PREVIEW & PUBLISH CONSOLE */}
          {/* ======================================================== */}
          {presetFormat === 'VERIZON' && verizonGroupedLots.length > 0 && (
            <div className="space-y-6 p-6 bg-slate-900/90 border border-red-500/40 rounded-2xl shadow-2xl">
              {/* Header & Stats Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase">
                      VERIZON OFICIAL PRONTO
                    </span>
                    <h3 className="font-black text-white text-lg">
                      {verizonGroupedLots.length} Lotes Agrupados Detectados ({verizonGroupedLots.reduce((acc, l) => acc + l.totalQty, 0).toLocaleString()} Aparelhos)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Cada lote foi unificado a partir de suas respectivas linhas de manifesto com IMEI mascarado, capacidade e operadora limpa.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleApplyVerizonImport}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publicar {verizonGroupedLots.length} Lotes no Catálogo & Painel</span>
                  </button>
                </div>
              </div>

              {/* Price Multiplier & Settings Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Custo Base Estimado por Aparelho (USD):</span>
                    <span className="text-amber-400 font-mono font-black">${verizonUnitRate} USD</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    step="5"
                    value={verizonUnitRate}
                    onChange={e => handleRecalculateVerizonRate(parseInt(e.target.value, 10) || 85)}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Ajuste dinâmico do lance wholesale por unidade nos lotes (multiplica pela quantidade de aparelhos).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Modo de Publicação no Catálogo:</label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={replaceExistingLots}
                      onChange={e => setReplaceExistingLots(e.target.checked)}
                      className="accent-amber-400 rounded w-4 h-4"
                    />
                    <span>Substituir leilões mock pelos 50 lotes oficiais VERIZON</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 block">Resumo do Catálogo VERIZON:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                      {verizonGroupedLots.length} Lotes
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold">
                      {verizonGroupedLots.reduce((acc, l) => acc + l.totalQty, 0).toLocaleString()} Aparelhos
                    </span>
                  </div>
                </div>
              </div>

              {/* Grouped Lots Accordion Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Prévia dos Lotes Agrupados:</span>
                  <span>Clique em &quot;Ver Manifesto&quot; para auditar cada aparelho</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
                  {verizonGroupedLots.map((lot, idx) => {
                    const isExpanded = verizonExpandedLot === lot.lotNumber;
                    return (
                      <div key={lot.lotNumber} className="transition-colors hover:bg-slate-900/40">
                        {/* Summary Row */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="font-mono text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold shrink-0">
                              #{idx + 1} · {lot.lotNumber}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {lot.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span className="text-slate-300 font-medium">{lot.primaryModel}</span>
                                <span>·</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-bold">
                                  {lot.totalQty} unidades
                                </span>
                                <span>·</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {lot.mappedGrade} ({lot.gradeRaw})
                                </span>
                                <span>·</span>
                                <span>Fontes: {lot.uniqueSources.slice(0, 2).join(', ') || 'Carrier'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-mono font-black text-emerald-400 block">
                                ${lot.calculatedCurrentBidUsd.toLocaleString()} USD
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                R$ {lot.calculatedRetailBrl.toLocaleString('pt-BR')} (Revenda BR)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setVerizonExpandedLot(isExpanded ? null : lot.lotNumber)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <Layers className="w-3.5 h-3.5 text-amber-400" />
                              <span>{isExpanded ? 'Ocultar' : `Manifesto (${lot.manifest.length})`}</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Manifest Accordion */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-900/80 border-t border-slate-800 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                                Itens e Especificações de Peças do Lote {lot.lotNumber}
                              </span>
                              {lot.url && (
                                <a
                                  href={lot.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  <span>Ver anúncio oficial do lote ↗</span>
                                </a>
                              )}
                            </div>

                            <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-slate-800">
                              <table className="w-full text-left text-[11px] border-collapse bg-slate-950">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/90">
                                    <th className="py-1.5 px-2.5">Qtd</th>
                                    <th className="py-1.5 px-2.5">Modelo</th>
                                    <th className="py-1.5 px-2.5">Memória</th>
                                    <th className="py-1.5 px-2.5">Part #</th>
                                    <th className="py-1.5 px-2.5">Descrição da Peça</th>
                                    <th className="py-1.5 px-2.5">Origem</th>
                                    <th className="py-1.5 px-2.5">Grade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                  {lot.manifest.map((item, mIdx) => (
                                    <tr key={mIdx} className="hover:bg-slate-900/50">
                                      <td className="py-1.5 px-2.5 font-mono text-amber-400 font-bold">{item.qty || 1}x</td>
                                      <td className="py-1.5 px-2.5 font-medium text-white">{item.model}</td>
                                      <td className="py-1.5 px-2.5 font-mono">{item.storage}</td>
                                      <td className="py-1.5 px-2.5 font-mono text-slate-400">{item.partNumber || '-'}</td>
                                      <td className="py-1.5 px-2.5 text-slate-300 truncate max-w-[200px]" title={item.itemDescription}>
                                        {item.itemDescription || '-'}
                                      </td>
                                      <td className="py-1.5 px-2.5">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                          {item.inventorySource || 'Return'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2.5">{item.grade}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* GENERIC PREVIEW & MAPPING CONSOLE */}
          {/* ======================================================== */}
          {presetFormat === 'GENERIC' && parsedPreviewRows.length > 0 && (
            <div className="space-y-4 p-6 bg-slate-900/70 border border-amber-500/30 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Mapeamento de Colunas ({parsedPreviewRows.length} linhas prontas)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Confira se os campos da sua planilha correspondem aos atributos do leilão
                  </p>
                </div>

                <button
                  onClick={handleApplyImport}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publicar {parsedPreviewRows.length} Lotes no Catálogo Agora</span>
                </button>
              </div>

              {/* Mapping Selectors Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Lote / ID:</label>
                  <select
                    value={columnMapping.lotNumber}
                    onChange={e => setColumnMapping({ ...columnMapping, lotNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Título do Lote:</label>
                  <select
                    value={columnMapping.title}
                    onChange={e => setColumnMapping({ ...columnMapping, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Modelo Aparelho:</label>
                  <select
                    value={columnMapping.modelFamily}
                    onChange={e => setColumnMapping({ ...columnMapping, modelFamily: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Grade (A+, A, B, C):</label>
                  <select
                    value={columnMapping.grade}
                    onChange={e => setColumnMapping({ ...columnMapping, grade: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Quantidade (Qtd):</label>
                  <select
                    value={columnMapping.quantity}
                    onChange={e => setColumnMapping({ ...columnMapping, quantity: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Lance Atual USD ($):</label>
                  <select
                    value={columnMapping.currentBidUsd}
                    onChange={e => setColumnMapping({ ...columnMapping, currentBidUsd: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Casa de Leilão:</label>
                  <select
                    value={columnMapping.auctionHouse}
                    onChange={e => setColumnMapping({ ...columnMapping, auctionHouse: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Localização / Galpão:</label>
                  <select
                    value={columnMapping.location}
                    onChange={e => setColumnMapping({ ...columnMapping, location: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview Table of Rows */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 text-[11px]">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Lote</th>
                      <th className="py-2 px-3">Título</th>
                      <th className="py-2 px-3">Modelo</th>
                      <th className="py-2 px-3">Qtd</th>
                      <th className="py-2 px-3">Grade</th>
                      <th className="py-2 px-3">Lance USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {parsedPreviewRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">{row[columnMapping.lotNumber] || '-'}</td>
                        <td className="py-2 px-3 font-semibold text-white truncate max-w-[200px]">{row[columnMapping.title] || '-'}</td>
                        <td className="py-2 px-3">{row[columnMapping.modelFamily] || '-'}</td>
                        <td className="py-2 px-3 font-mono">{row[columnMapping.quantity] || '1'}</td>
                        <td className="py-2 px-3">{row[columnMapping.grade] || 'Grade A'}</td>
                        <td className="py-2 px-3 font-mono text-emerald-400">${row[columnMapping.currentBidUsd] || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GERENCIAR LEILÕES (EDIÇÃO & STATUS) */}
      {/* ======================================================== */}
      {adminTab === 'lots' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Catálogo de Leilões em Andamento</h2>
              <p className="text-xs text-slate-400">Edite lances atuais, altere grades ou remova lotes encerrados</p>
            </div>
            <button
              onClick={() => setAdminTab('upload')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Importar Mais Lotes (Excel)</span>
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
                  <th className="py-3 px-3">Lance Atual (USD)</th>
                  <th className="py-3 px-3">Revenda Brasil</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auctions.map(lot => {
                  const isEditing = editingLotId === lot.id;
                  return (
                    <tr key={lot.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{lot.lotNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white block truncate max-w-[240px]">{lot.title}</span>
                        <span className="text-[10px] text-slate-400">{lot.modelFamily} · {lot.primaryStorage}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">{lot.quantity} un</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select
                            value={editGrade}
                            onChange={e => setEditGrade(e.target.value as GradeType)}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                          >
                            <option value="Grade A+">Grade A+</option>
                            <option value="Grade A">Grade A</option>
                            <option value="Grade B">Grade B</option>
                            <option value="Grade C">Grade C</option>
                            <option value="CPO Refurbished">CPO Refurbished</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700">
                            {lot.grade}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPriceUsd}
                            onChange={e => setEditPriceUsd(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-emerald-400"
                          />
                        ) : (
                          <span className="font-mono font-bold text-emerald-400">
                            ${lot.currentBidUsd.toLocaleString()} USD
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        R$ {lot.estimatedBrazilRetailBrl.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-[120px]">
                        {lot.location}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(lot.id)}
                              className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded text-[11px]"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingLotId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(lot)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              title="Editar preço e grade"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLot(lot.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              title="Excluir lote"
                            >
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
      {/* TAB 3: OFERTAS COMPUTADAS (OFFERS CONSOLE) */}
      {/* ======================================================== */}
      {adminTab === 'offers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Central de Ofertas Computadas (Offers)</h2>
              <p className="text-xs text-slate-400">
                Lances e ofertas enviadas pelos arrematantes brasileiros em tempo real
              </p>
            </div>

            <button
              onClick={handleExportOffersCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Ofertas (Excel)</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Lote</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">Qtd</th>
                  <th className="py-3 px-3">Grade</th>
                  <th className="py-3 px-3">Cor</th>
                  <th className="py-3 px-3">Incremento</th>
                  <th className="py-3 px-3">Arrematante / Cliente</th>
                  <th className="py-3 px-3">Valor USD</th>
                  <th className="py-3 px-3">Valor BRL (PTAX)</th>
                  <th className="py-3 px-3">Status da Oferta</th>
                  <th className="py-3 px-3 text-right">Gerenciar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {offersList.map(offer => {
                  const lot = auctions.find(a => a.lotNumber === offer.lotNumber || a.id === offer.lotId);
                  return (
                  <tr key={offer.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-slate-400">{offer.timestamp}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-amber-400 block">{offer.lotNumber}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px] block">{offer.lotTitle}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {lot?.modelFamily || offer.lotTitle}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      {lot?.quantity ? `${lot.quantity} un.` : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px]">
                        {lot?.grade || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {lot?.colorHighlights?.join(', ') || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      +$25 USD
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">{offer.clientName}</span>
                      <span className="text-[10px] text-slate-400">{offer.clientEmail}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      ${offer.amountUsd.toLocaleString()} USD
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      R$ {offer.amountBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        offer.status === 'Aceita' || offer.status === 'Vencendo'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : offer.status === 'Contra-Oferta'
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                          : offer.status === 'Em Análise' || offer.status === 'Homologada / Arrematada'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : offer.status === 'Recusada'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {offer.status}
                      </span>
                      {offer.status === 'Contra-Oferta' && offer.counterOfferUsd && (
                        <div className="text-[10px] text-indigo-300 font-mono mt-1">
                          Contra: ${offer.counterOfferUsd.toLocaleString()} USD
                        </div>
                      )}
                      {offer.adminNote && (
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] truncate" title={offer.adminNote}>
                          Obs: {offer.adminNote}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, 'Aceita')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          title="Aceitar oferta"
                        >
                          Aceita
                        </button>
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, 'Em Análise')}
                          className="px-2 py-1 bg-amber-600/80 hover:bg-amber-500 text-white rounded text-[11px] font-semibold"
                          title="Colocar em análise"
                        >
                          Em Análise
                        </button>
                        <button
                          onClick={() => {
                            setCounterOfferEditingId(counterOfferEditingId === offer.id ? null : offer.id);
                            setCounterOfferUsdInput(String(offer.counterOfferUsd || Math.round(offer.amountUsd * 1.05)));
                            setCounterOfferNoteInput(offer.adminNote || '');
                          }}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
                          title="Enviar contra-oferta"
                        >
                          Contra-Oferta
                        </button>
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, 'Recusada')}
                          className="px-2 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-[11px] font-semibold"
                          title="Recusar oferta"
                        >
                          Recusada
                        </button>
                        {(() => {
                          const phone = (offer.clientWhatsapp || clientsList.find(c => c.email === offer.clientEmail)?.whatsapp || '').replace(/\D/g, '');
                          if (!phone) return null;
                          const msg = encodeURIComponent(
                            `Olá ${offer.clientName}, sua oferta no lote ${offer.lotNumber} ($${offer.amountUsd} USD) está com status: ${offer.status}${offer.counterOfferUsd ? ` (Contra-oferta: $${offer.counterOfferUsd} USD)` : ''}.`
                          );
                          return (
                            <a
                              href={`https://wa.me/${phone}?text=${msg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded text-[11px] font-bold"
                              title="Enviar aviso no WhatsApp do cliente"
                            >
                              WhatsApp
                            </a>
                          );
                        })()}
                      </div>
                      {counterOfferEditingId === offer.id && (
                        <div className="mt-2 p-2.5 bg-slate-950 border border-indigo-500/40 rounded-lg flex flex-col sm:flex-row items-center justify-end gap-2">
                          <input
                            type="number"
                            value={counterOfferUsdInput}
                            onChange={(e) => setCounterOfferUsdInput(e.target.value)}
                            placeholder="Valor USD"
                            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                          <input
                            type="text"
                            value={counterOfferNoteInput}
                            onChange={(e) => setCounterOfferNoteInput(e.target.value)}
                            placeholder="Observação opcional..."
                            className="w-44 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => {
                              const val = Number(counterOfferUsdInput);
                              if (!val || val <= 0) {
                                showNotice('Informe um valor válido em USD para a contra-oferta.', 'error');
                                return;
                              }
                              handleUpdateOfferStatus(offer.id, 'Contra-Oferta', val, counterOfferNoteInput.trim() || undefined);
                              setCounterOfferEditingId(null);
                            }}
                            className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-[11px] font-bold"
                          >
                            Enviar
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
      {/* TAB 4: CLIENTES & PAINEL DE ARREMATANTES */}
      {/* ======================================================== */}
      {adminTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Base de Arrematantes Credenciados</h2>
              <p className="text-xs text-slate-400">
                Controle os limites em dólares e aprovação de habilitação cadastral
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px]">
                  <th className="py-3 px-3">Arrematante / Razão Social</th>
                  <th className="py-3 px-3">E-mail</th>
                  <th className="py-3 px-3">CPF / CNPJ</th>
                  <th className="py-3 px-3">Telefone WhatsApp</th>
                  <th className="py-3 px-3">Limite de Arrematação</th>
                  <th className="py-3 px-3">Status de Habilitação</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {clientsList.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{client.name}</td>
                    <td className="py-3 px-3 text-slate-400">{client.email}</td>
                    <td className="py-3 px-3 font-mono">{client.cpfCnpj}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{client.phone}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      ${client.biddingLimitUsd.toLocaleString()} USD
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        client.verifiedStatus
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {client.verifiedStatus ? '● Habilitado / Verificado' : '○ Em Análise'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleClientVerify(idx)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors"
                      >
                        {client.verifiedStatus ? 'Suspender' : 'Aprovar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CONFIGURAÇÕES GERAIS */}
      {/* ======================================================== */}
      {adminTab === 'settings' && (
        <div className="max-w-2xl space-y-6 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <h2 className="text-lg font-bold text-white">Parâmetros Operacionais do Sistema</h2>
          
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Cotação PTAX Dólar Comercial (USD / BRL):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={usdRate}
                  onChange={e => onUpdateUsdRate(parseFloat(e.target.value) || 5.75)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-400"
                />
                <span className="text-slate-400">Usado para cálculo em reais de todos os leilões</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="text-slate-300 block mb-1 font-semibold">
                Endereço do Galpão de Recebimento em Miami:
              </label>
              <input
                type="text"
                disabled
                value="8350 NW 53rd Street, Suite 302, Doral, FL 33166"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};
