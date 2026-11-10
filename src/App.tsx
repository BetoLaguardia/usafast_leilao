import React, { useState, useMemo, useEffect } from 'react';
import { Header, AppPage } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { AuctionCard } from './components/AuctionCard';
import { AuctionDetailModal } from './components/AuctionDetailModal';
import { AuctionSystemModal } from './components/AuctionSystemModal';
import { ModelCarousel } from './components/ModelCarousel';
import { GradingGuideModal } from './components/GradingGuideModal';
import { ImportCalculatorModal } from './components/ImportCalculatorModal';
import { QuemSomosPage } from './pages/QuemSomosPage';
import { GradeamentoPage } from './pages/GradeamentoPage';
import { AdminPage } from './pages/AdminPage';
import { ClientePage } from './pages/ClientePage';
import { AdminLoginGate, ClientLoginGate } from './components/AuthGates';
import { INITIAL_AUCTIONS, DEFAULT_PTAX_USD_BRL, GRADE_EXPLANATIONS } from './data/auctionsData';
import { AuctionLot, GradeType, SystemUser, AdminOffer } from './types/auction';
import { apiService } from './services/apiService';
import { Language, TRANSLATIONS } from './utils/i18n';
import { fetchLivePtaxRate } from './utils/ptaxService';
import { stripLotPrefix } from './utils/deviceImages';
import { 
  Search, 
  Filter, 
  Layers, 
  Gavel, 
  Calculator, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  SlidersHorizontal,
  Package,
  FileSpreadsheet,
  List,
  Lock,
  Sparkles,
  UserCheck,
  Download,
  Server,
  LayoutGrid,
  CheckSquare,
  Square,
  Smartphone,
  Clock
} from 'lucide-react';

export default function App() {
  // Navigation Page State
  const [currentPage, setCurrentPage] = useState<AppPage>('home');

  // Auction State with Persistent LocalStorage
  const [auctions, setAuctions] = useState<AuctionLot[]>(() => {
    try {
      const saved = localStorage.getItem('us_iphone_auctions_v1');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Exclude anything that is not a real spreadsheet auction (e.g. GovDeals, Copart, Liquidation.com, Apple Certified, etc.)
          parsed = parsed.filter((a: any) => {
            const house = (a.auctionHouse || '').toLowerCase();
            const title = (a.title || '').toLowerCase();
            const src = (a.sourceType || '').toLowerCase();
            if (house.includes('govdeals') || title.includes('govdeals') || src.includes('govdeals')) return false;
            if (house.includes('copart') || title.includes('copart') || src.includes('copart')) return false;
            if (house.includes('liquidation.com') || title.includes('liquidation.com')) return false;
            if (house.includes('apple certified') || title.includes('apple certified')) return false;
            if (house.includes('marketplace') || title.includes('marketplace')) return false;
            if (house.includes('pronta entrega') || title.includes('pronta entrega')) return false;
            return true;
          });
          // Sanitize titles to remove 'Lote' prefix
          parsed = parsed.map((a: any) => ({
            ...a,
            title: stripLotPrefix(a.title)
          }));
          const hasAssurant = parsed.some((a: any) => a.sourceType === 'ASSURANT');
          if (!hasAssurant) {
            const defaultAssurant = INITIAL_AUCTIONS.filter(a => a.sourceType === 'ASSURANT');
            return [...defaultAssurant, ...parsed];
          }
          if (parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_AUCTIONS;
  });

  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('us_iphone_lang');
      if (saved === 'pt' || saved === 'es' || saved === 'en') return saved;
    } catch (e) {}
    return 'pt';
  });

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('us_iphone_lang', lang);
    } catch (e) {}
  };

  const t = TRANSLATIONS[language];

  const [usdRate, setUsdRate] = useState<number>(() => {
    try {
      const savedRate = localStorage.getItem('us_ptax_rate');
      if (savedRate) return parseFloat(savedRate) || DEFAULT_PTAX_USD_BRL;
    } catch (e) {}
    return DEFAULT_PTAX_USD_BRL;
  });

  const [ptaxInfo, setPtaxInfo] = useState<{ isOnline: boolean; source: string; lastUpdated: string }>({
    isOnline: true,
    source: 'Banco Central do Brasil (PTAX)',
    lastUpdated: ''
  });

  const loadLivePtax = async () => {
    try {
      const res = await fetchLivePtaxRate();
      if (res && res.rate) {
        setUsdRate(res.rate);
        try {
          localStorage.setItem('us_ptax_rate', String(res.rate));
        } catch (e) {}
        setPtaxInfo({
          isOnline: res.isOnline,
          source: res.source,
          lastUpdated: res.lastUpdated
        });
      }
    } catch (err) {
      console.error('Error loading live PTAX:', err);
    }
  };

  useEffect(() => {
    loadLivePtax();
  }, []);

  const handleUpdateUsdRate = (rate: number) => {
    setUsdRate(rate);
    try {
      localStorage.setItem('us_ptax_rate', String(rate));
    } catch (e) {}
  };

  // User & Bidding State with Persistent LocalStorage
  const [currentUser, setCurrentUser] = useState<SystemUser>(() => {
    try {
      const savedUser = localStorage.getItem('us_iphone_client_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {}
    return {
      name: 'Carlos Mendes',
      email: 'carlos.mendes@importtech.com.br',
      cpfCnpj: '18.492.301/0001-44',
      phone: '+55 (11) 98844-1290',
      biddingLimitUsd: 25000,
      verifiedStatus: true,
      registeredDate: '01/02/2026'
    };
  });

  const handleUpdateCurrentUser = (user: SystemUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('us_iphone_client_user', JSON.stringify(user));
    } catch (e) {}
  };

  // Authentication Gates State (Admin and Client)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('us_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isClientAuthenticated, setIsClientAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('us_client_auth') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('us_admin_auth');
    } catch (e) {}
    showToast('Sessão administrativa encerrada.');
  };

  const handleClientLogout = () => {
    setIsClientAuthenticated(false);
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('us_client_auth');
      localStorage.removeItem('us_admin_auth');
    } catch (e) {}
    showToast('Sessão do arrematante encerrada.');
  };

  const [userBids, setUserBids] = useState<{
    lotId: string;
    lotTitle: string;
    amountUsd: number;
    timestamp: string;
    status: 'vencendo' | 'superado';
  }[]>(() => {
    try {
      const savedBids = localStorage.getItem('us_iphone_user_bids');
      if (savedBids) return JSON.parse(savedBids);
    } catch (e) {}
    return [
      {
        lotId: 'lot-us-16pm-01',
        lotTitle: 'Lote Master 10x iPhone 16 Pro Max 256GB',
        amountUsd: 7450,
        timestamp: 'Hoje, 14:32',
        status: 'vencendo'
      }
    ];
  });

  // Modals State
  const [selectedLotForDetail, setSelectedLotForDetail] = useState<AuctionLot | null>(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [systemModalTab, setSystemModalTab] = useState<'terminal' | 'register'>('terminal');
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [calculatorInitData, setCalculatorInitData] = useState({ priceUsd: 7450, units: 10 });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterCapacity, setFilterCapacity] = useState<string>('all');
  const [filterLotType, setFilterLotType] = useState<string>('all');
  const [filterAuctionHouse, setFilterAuctionHouse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'endingSoon' | 'priceAsc' | 'priceDesc' | 'profitDesc' | 'mostBids'>('endingSoon');

  // View Mode in Active Auctions catalog (List vs Cards)
  const [auctionsViewMode, setAuctionsViewMode] = useState<'list' | 'cards'>('list');
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const hasLocalUpdateRef = React.useRef(false);

  // Helper to persist auctions (localStorage + backend /api/auctions for cross-device sync)
  const handleUpdateAuctions = (newAuctions: AuctionLot[]) => {
    hasLocalUpdateRef.current = true;
    console.log(`[App.tsx] handleUpdateAuctions called with ${newAuctions.length} lots`);
    setAuctions(newAuctions);
    try {
      localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(newAuctions));
      console.log(`[App.tsx] Saved ${newAuctions.length} lots to localStorage key 'us_iphone_auctions_v1'`);
    } catch (e: any) {
      console.error('[App.tsx] Failed to save to localStorage:', e);
    }
    fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auctions: newAuctions })
    })
      .then(res => res.json())
      .then(data => console.log('[App.tsx] Backend /api/auctions POST response:', data))
      .catch(err => console.warn('[App.tsx] Backend /api/auctions POST failed (using local storage):', err));
  };

  useEffect(() => {
    console.log('[App.tsx] Fetching initial auctions from /api/auctions...');
    const sanitizeLots = (lots: any[]): AuctionLot[] => {
      const banned = /govdeals|copart|liquidation\.com|apple certified|marketplace|pronta entrega/i;
      return (lots || [])
        .filter(l => !banned.test(l.auctionHouse || '') && !banned.test(l.title || '') && !banned.test(l.sourceType || ''))
        .map(l => ({ ...l, title: stripLotPrefix(l.title) }));
    };

    fetch('/api/auctions')
      .then(res => res.json())
      .then(data => {
        if (!hasLocalUpdateRef.current && data && Array.isArray(data.auctions) && data.auctions.length > 0) {
          const backendLots: AuctionLot[] = sanitizeLots(data.auctions);
          let localLots: AuctionLot[] = [];
          try {
            const saved = localStorage.getItem('us_iphone_auctions_v1');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) localLots = sanitizeLots(parsed);
            }
          } catch (e) {}

          if (localLots.length > backendLots.length) {
            console.log(`[App.tsx] Preserving ${localLots.length} imported lots from localStorage (backend had ${backendLots.length}). Syncing to server...`);
            setAuctions(localLots);
            fetch('/api/auctions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ auctions: localLots })
            }).catch(() => {});
          } else if (backendLots.length > 0) {
            console.log(`[App.tsx] Loaded ${backendLots.length} lots from backend /api/auctions`);
            setAuctions(backendLots);
            try {
              localStorage.setItem('us_iphone_auctions_v1', JSON.stringify(backendLots));
            } catch (e) {}
          }
        }
      })
      .catch(err => console.warn('[App.tsx] Initial fetch from /api/auctions failed (using local storage):', err));
  }, []);

  // Real-time live bidding polling effect (connects to PHP or simulated live pool)
  useEffect(() => {
    const cfg = apiService.getConfig();
    if (!cfg.autoPollBids) return;

    const interval = setInterval(async () => {
      try {
        const liveBid = await apiService.pollLatestBids(auctions);
        if (liveBid && liveBid.newBidAmount) {
          setAuctions(prev => {
            let hasChanges = false;
            const next = prev.map(lot => {
              const isMatch = lot.id === liveBid.lotId || lot.lotNumber === liveBid.lotId;
              if (isMatch && liveBid.newBidAmount > lot.currentBidUsd) {
                hasChanges = true;
                return {
                  ...lot,
                  currentBidUsd: liveBid.newBidAmount,
                  totalBidsCount: lot.totalBidsCount + 1,
                  bidsHistory: [
                    {
                      id: `bid-live-${Date.now()}`,
                      bidderName: liveBid.bidderName || 'Licitante EUA Concorrente',
                      amountUsd: liveBid.newBidAmount,
                      timestamp: 'Agora'
                    },
                    ...lot.bidsHistory
                  ]
                };
              }
              return lot;
            });
            return hasChanges ? next : prev;
          });
        }
      } catch (e) {
        // silent fallback
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Place a Bid Handler (Connected to PHP API / Simulated Bridge)
  const handlePlaceBid = (lotId: string, amountUsd: number) => {
    const bidderName = currentUser.name ? `${currentUser.name} (Você)` : 'Arrematante Autorizado (Você)';

    // Trigger API / Backend submission
    apiService.submitBid(lotId, amountUsd, bidderName).catch(err => {
      console.warn('Falha no envio da API PHP, operando localmente:', err);
    });

    const updatedAuctions = auctions.map(lot => {
      if (lot.id === lotId) {
        const newBidHistory = [
          {
            id: `bid-${Date.now()}`,
            bidderName,
            amountUsd,
            timestamp: 'Agora'
          },
          ...lot.bidsHistory
        ];
        return {
          ...lot,
          currentBidUsd: amountUsd,
          totalBidsCount: lot.totalBidsCount + 1,
          bidsHistory: newBidHistory
        };
      }
      return lot;
    });

    handleUpdateAuctions(updatedAuctions);

    const targetLot = auctions.find(a => a.id === lotId);
    if (targetLot) {
      const updatedBids = [
        {
          lotId,
          lotTitle: targetLot.title,
          amountUsd,
          timestamp: 'Agora mesmo',
          status: 'vencendo' as const
        },
        ...userBids.filter(b => b.lotId !== lotId)
      ];
      setUserBids(updatedBids);
      try {
        localStorage.setItem('us_iphone_user_bids', JSON.stringify(updatedBids));
      } catch (e) {}

      // Real-time synchronization with Admin Console ("Ofertas Computadas")
      try {
        const savedAdminOffers = localStorage.getItem('us_admin_offers_v1');
        const curOffers: AdminOffer[] = savedAdminOffers ? JSON.parse(savedAdminOffers) : [];
        const newAdminOffer: AdminOffer = {
          id: `off-${Date.now()}`,
          lotId,
          lotNumber: targetLot.lotNumber || `US-${lotId.slice(-5)}`,
          lotTitle: targetLot.title,
          clientName: currentUser.name || 'Arrematante Autorizado',
          clientEmail: currentUser.email || 'cliente@usafastleiloes.com',
          amountUsd,
          amountBrl: Math.round(amountUsd * usdRate),
          timestamp: 'Agora mesmo',
          status: 'Vencendo',
          isAutoSniper: false
        };
        const nextAdminOffers = [newAdminOffer, ...curOffers.filter(o => o.lotId !== lotId)];
        localStorage.setItem('us_admin_offers_v1', JSON.stringify(nextAdminOffers));
      } catch (e) {}
    }

    showToast(`⚡ Lance de $${amountUsd.toLocaleString()} USD computado com sucesso!`);
  };

  const handleOpenSystem = (tab: 'terminal' | 'register' = 'terminal') => {
    if (tab === 'terminal') {
      setCurrentPage('cliente');
    } else {
      setSystemModalTab(tab);
      setIsSystemModalOpen(true);
    }
  };

  const handleOpenCalculatorForLot = (lot: AuctionLot) => {
    setCalculatorInitData({
      priceUsd: lot.currentBidUsd,
      units: lot.quantity
    });
    setIsCalculatorModalOpen(true);
  };

  // Dynamic list of all imported models for the selected auction (or all auctions)
  const availableImportedModels = useMemo(() => {
    const sourceLots = filterAuctionHouse === 'all'
      ? auctions
      : filterAuctionHouse === 'VERIZON'
        ? auctions.filter(a => a.sourceType === 'VERIZON' || /verizon/i.test(a.auctionHouse))
        : filterAuctionHouse === 'ASSURANT'
          ? auctions.filter(a => a.sourceType === 'ASSURANT' || /assurant/i.test(a.auctionHouse))
          : auctions.filter(a => a.auctionHouse === filterAuctionHouse);

    const modelMap = new Map<string, { model: string; count: number; totalUnits: number }>();

    sourceLots.forEach(lot => {
      const house = (lot.auctionHouse || '').toLowerCase();
      const title = (lot.title || '').toLowerCase();
      if (house.includes('govdeals') || title.includes('govdeals')) return;
      if (house.includes('copart') || title.includes('copart')) return;
      if (house.includes('liquidation.com') || title.includes('liquidation.com')) return;
      if (house.includes('apple certified') || title.includes('apple certified')) return;
      if (house.includes('marketplace') || title.includes('marketplace')) return;
      if (house.includes('pronta entrega') || title.includes('pronta entrega')) return;

      const m = (lot.modelFamily || 'Outros').trim();
      const current = modelMap.get(m) || { model: m, count: 0, totalUnits: 0 };
      current.count += 1;
      current.totalUnits += (lot.quantity || 1);
      modelMap.set(m, current);
    });

    return Array.from(modelMap.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [auctions, filterAuctionHouse]);

  // Selection handlers for List Mode
  const handleToggleSelectLot = (lotId: string) => {
    setSelectedLotIds(prev =>
      prev.includes(lotId) ? prev.filter(id => id !== lotId) : [...prev, lotId]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageLotIds = paginatedAuctions.map(l => l.id);
    const allSelected = pageLotIds.length > 0 && pageLotIds.every(id => selectedLotIds.includes(id));
    if (allSelected) {
      setSelectedLotIds(prev => prev.filter(id => !pageLotIds.includes(id)));
    } else {
      setSelectedLotIds(prev => Array.from(new Set([...prev, ...pageLotIds])));
    }
  };

  const handleOpenCalculatorForSelected = () => {
    const selectedLotsObjects = auctions.filter(a => selectedLotIds.includes(a.id));
    if (selectedLotsObjects.length === 0) return;
    const totalUnits = selectedLotsObjects.reduce((acc, l) => acc + (l.quantity || 1), 0);
    const avgPriceUsd = Math.round(
      selectedLotsObjects.reduce((acc, l) => acc + l.currentBidUsd, 0) / (selectedLotsObjects.length || 1)
    );
    setCalculatorInitData({
      priceUsd: avgPriceUsd,
      units: totalUnits
    });
    setIsCalculatorModalOpen(true);
  };

  // Filtered & Sorted Auctions
  const filteredAuctions = useMemo(() => {
    return auctions.filter(lot => {
      // 0. Exclude non-spreadsheet auctions (GovDeals, Copart, Liquidation.com, Apple Certified, etc.)
      const house = (lot.auctionHouse || '').toLowerCase();
      const title = (lot.title || '').toLowerCase();
      if (house.includes('govdeals') || title.includes('govdeals')) return false;
      if (house.includes('copart') || title.includes('copart')) return false;
      if (house.includes('liquidation.com') || title.includes('liquidation.com')) return false;
      if (house.includes('apple certified') || title.includes('apple certified')) return false;
      if (house.includes('marketplace') || title.includes('marketplace')) return false;
      if (house.includes('pronta entrega') || title.includes('pronta entrega')) return false;

      // 1. Clean grade representation
      const cleanGrade = (lot.grade || '').replace(/\(T\)/gi, '').trim();

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = stripLotPrefix(lot.title).toLowerCase().includes(query) || lot.title.toLowerCase().includes(query);
        const matchesLotNum = lot.lotNumber.toLowerCase().includes(query);
        const matchesModel = lot.modelFamily.toLowerCase().includes(query);
        const matchesLoc = lot.location.toLowerCase().includes(query);
        const matchesStorage = lot.primaryStorage.toLowerCase().includes(query);
        const matchesOem = (lot.oemBrand || '').toLowerCase().includes(query);
        const matchesHouse = (lot.auctionHouse || '').toLowerCase().includes(query);
        const matchesSource = (lot.sourceType || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesLotNum && !matchesModel && !matchesLoc && !matchesStorage && !matchesOem && !matchesHouse && !matchesSource) {
          return false;
        }
      }

      // Filter by Model
      if (filterModel !== 'all' && lot.modelFamily !== filterModel) {
        return false;
      }

      // Filter by Grade
      if (filterGrade !== 'all' && cleanGrade !== filterGrade && lot.grade !== filterGrade) {
        return false;
      }

      // Filter by Capacity
      if (filterCapacity !== 'all') {
        if (!lot.primaryStorage.toUpperCase().includes(filterCapacity.toUpperCase())) {
          return false;
        }
      }

      // Filter by Auction House / Source
      if (filterAuctionHouse === 'VERIZON') {
        const isVerizon = lot.sourceType === 'VERIZON' || /verizon/i.test(lot.auctionHouse) || /verizon/i.test(lot.carrierStatus);
        if (!isVerizon) return false;
      } else if (filterAuctionHouse === 'ASSURANT') {
        const isAssurant = lot.sourceType === 'ASSURANT' || /assurant/i.test(lot.auctionHouse);
        if (!isAssurant) return false;
      } else if (filterAuctionHouse !== 'all') {
        if (lot.auctionHouse !== filterAuctionHouse && lot.sourceType !== filterAuctionHouse) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'endingSoon') {
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
      if (sortBy === 'priceAsc') {
        return a.currentBidUsd - b.currentBidUsd;
      }
      if (sortBy === 'priceDesc') {
        return b.currentBidUsd - a.currentBidUsd;
      }
      if (sortBy === 'profitDesc') {
        const profitA = a.estimatedBrazilRetailBrl - (a.currentBidUsd * usdRate);
        const profitB = b.estimatedBrazilRetailBrl - (b.currentBidUsd * usdRate);
        return profitB - profitA;
      }
      if (sortBy === 'mostBids') {
        return b.totalBidsCount - a.totalBidsCount;
      }
      return 0;
    });
  }, [auctions, searchQuery, filterModel, filterGrade, filterCapacity, filterAuctionHouse, sortBy, usdRate]);

  // Pagination State for Instant Loading & Smooth UI
  const [auctionsPage, setAuctionsPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 15;

  // Reset page when filters change
  useEffect(() => {
    setAuctionsPage(1);
  }, [searchQuery, filterModel, filterGrade, filterCapacity, filterAuctionHouse, sortBy]);

  const totalAuctionsPages = Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE) || 1;
  const paginatedAuctions = useMemo(() => {
    const startIndex = (auctionsPage - 1) * ITEMS_PER_PAGE;
    return filteredAuctions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAuctions, auctionsPage]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header with Navigation Menu & TWO Prominent Links to "Nosso Sistema de Leilões" */}
      <Header
        currentPage={currentPage}
        onNavigate={page => setCurrentPage(page)}
        onOpenSystem={handleOpenSystem}
        currency={currency}
        onToggleCurrency={() => setCurrency(prev => prev === 'USD' ? 'BRL' : 'USD')}
        usdRate={usdRate}
        isPtaxOnline={ptaxInfo.isOnline}
        ptaxSource={ptaxInfo.source}
        ptaxLastUpdated={ptaxInfo.lastUpdated}
        onRefreshPtax={loadLivePtax}
        isClientAuthenticated={isClientAuthenticated}
        isAdminAuthenticated={isAdminAuthenticated}
        onClientLogout={handleClientLogout}
        onAdminLogout={handleAdminLogout}
        clientName={currentUser.name}
        language={language}
        onSelectLanguage={handleSelectLanguage}
      />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* VIEW 1: HOME (VISÃO GERAL + HERO + LEILÕES EM DESTAQUE) */}
        {/* ========================================================= */}
        {currentPage === 'home' && (
          <div>
            <HeroSection
              onOpenSystem={handleOpenSystem}
              onOpenGradingGuide={() => setCurrentPage('gradeamento')}
              onOpenCalculator={() => setIsCalculatorModalOpen(true)}
              totalAuctionsCount={auctions.length}
            />

            {/* Quick Banner: Only show Admin Panel / Spreadsheet import link to logged in Admins */}
            {isAdminAuthenticated ? (
              <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-y border-amber-500/20 py-3.5 px-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">
                      Modo Administrador: Gestão de leilões, arrematantes e importação de planilhas ativas.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCurrentPage('admin')}
                      className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Acessar Painel Admin</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : isClientAuthenticated ? (
              <div className="bg-gradient-to-r from-slate-950 via-emerald-950/30 to-slate-950 border-y border-emerald-500/20 py-3 px-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Bem-vindo ao Portal do Arrematante, <strong className="text-white">{currentUser.name || 'Cliente Credenciado'}</strong>! Seu limite de lances está liberado.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCurrentPage('cliente')}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Meu Painel de Cliente</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-y border-slate-800 py-3 px-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Área de Leilões dos EUA: Para visualizar lotes completos, laudos de IMEI e dar lances, faça seu login.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCurrentPage('cliente')}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Entrar ou Cadastrar-se</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Destaques de Leilões em Carrossel na Home */}
            <ModelCarousel
              auctions={auctions}
              usdRate={usdRate}
              currency={currency}
              onSelectLot={lotItem => {
                if (!isClientAuthenticated && !isAdminAuthenticated) {
                  setCurrentPage('cliente');
                  showToast('🔒 Para acessar os leilões e dar lances, faça seu login ou cadastre-se.');
                } else {
                  setSelectedLotForDetail(lotItem);
                }
              }}
              onQuickBid={lotItem => {
                if (!isClientAuthenticated && !isAdminAuthenticated) {
                  setCurrentPage('cliente');
                  showToast('🔒 Para dar lances nos leilões, faça seu login ou cadastre-se.');
                } else {
                  setSelectedLotForDetail(lotItem);
                }
              }}
              onCalculateLot={lotItem => handleOpenCalculatorForLot(lotItem)}
              onViewAllAuctions={() => setCurrentPage('leiloes')}
            />

            {/* Como Funciona na Home */}
            <section className="bg-slate-950 border-t border-slate-800 py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="text-center max-w-3xl mx-auto space-y-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    PASSO A PASSO
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Como Arrematar iPhones nos EUA pelo Nosso Sistema
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-mono text-amber-400 font-bold text-sm block">01. Cadastro</span>
                    <h3 className="text-sm font-bold text-white">Habilitação Gratuita</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Cadastre seu CPF ou CNPJ no topo para liberar limite em dólares e sua suíte de recebimento em Miami.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-mono text-amber-400 font-bold text-sm block">02. Seleção</span>
                    <h3 className="text-sm font-bold text-white">Análise de Grades</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Escolha lotes com base no laudo técnico de 30 pontos e consulte os IMEIs antes de lançar.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-mono text-amber-400 font-bold text-sm block">03. Arrematação</span>
                    <h3 className="text-sm font-bold text-white">Lances ou Sniper</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Dê lances manuais ou ative o robô para cobrir concorrentes no último segundo do leilão.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="font-mono text-amber-400 font-bold text-sm block">04. Despacho</span>
                    <h3 className="text-sm font-bold text-white">Envio Aéreo ao Brasil</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Recebemos no galpão parceiro de Miami e enviamos com seguro para seu endereço no Brasil.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: LEILÕES (CATÁLOGO COMPLETO COM FILTROS) */}
        {/* ========================================================= */}
        {currentPage === 'leiloes' && (
          !isClientAuthenticated && !isAdminAuthenticated ? (
            <ClientLoginGate
              currentUser={currentUser}
              onLoginSuccess={(user) => {
                setIsClientAuthenticated(true);
                setIsAdminAuthenticated(false);
                setCurrentUser(user);
                try {
                  localStorage.removeItem('us_admin_auth');
                  localStorage.setItem('us_client_auth', 'true');
                  localStorage.setItem('us_iphone_client_user', JSON.stringify(user));
                } catch (e) {}
                showToast(`Bem-vindo, ${user.name}! Acesso ao portal liberado.`);
              }}
              onCancel={() => setCurrentPage('home')}
            />
          ) : (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                  <Gavel className="w-4 h-4" />
                  <span>CATÁLOGO OFICIAL DE LEILÕES DOS EUA</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Modelos de iPhones Disponíveis para Arrematação
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  Filtragem oficial por leilão (Verizon e Assurant), modelos importados, grade técnica e capacidade.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenSystem('terminal')}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Gavel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Terminal de Lances</span>
                </button>
                {isAdminAuthenticated && (
                  <button
                    onClick={() => setCurrentPage('admin')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Importar Planilha (Admin)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 shadow-lg shadow-black/20">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">{t.sortLabel}</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="endingSoon">{t.endingSoon}</option>
                    <option value="profitDesc">{t.highestProfit}</option>
                    <option value="priceAsc">{t.lowestPrice}</option>
                    <option value="priceDesc">{t.highestPrice}</option>
                    <option value="mostBids">{t.mostBids}</option>
                  </select>
                </div>
              </div>

              {/* Filter Rows: Leilão, Modelos Importados, Grade, Capacidade */}
              <div className="space-y-3.5 pt-3 border-t border-slate-800/80 text-xs">
                {/* Row 1: Leilão */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-24 shrink-0 flex items-center gap-1">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" />
                    {t.auctionFilter}
                  </span>
                  <button
                    onClick={() => {
                      setFilterAuctionHouse('all');
                      setFilterModel('all');
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterAuctionHouse === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.allAuctionsFilter}
                  </button>

                  <button
                    onClick={() => {
                      setFilterAuctionHouse(filterAuctionHouse === 'VERIZON' ? 'all' : 'VERIZON');
                      setFilterModel('all');
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      filterAuctionHouse === 'VERIZON'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-400'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    <span>⚡ {t.verizonBadge}</span>
                  </button>

                  <button
                    onClick={() => {
                      setFilterAuctionHouse(filterAuctionHouse === 'ASSURANT' ? 'all' : 'ASSURANT');
                      setFilterModel('all');
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      filterAuctionHouse === 'ASSURANT'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <span>🔹 {t.assurantBadge}</span>
                  </button>

                  {/* Dynamic auction house buttons (excluding non-auctions) */}
                  {Array.from(new Set(auctions.map(a => a.auctionHouse)))
                    .filter(h => h && 
                      !/verizon/i.test(h) && 
                      !/assurant/i.test(h) && 
                      !/liquidation\.com/i.test(h) && 
                      !/apple certified/i.test(h) && 
                      !/marketplace/i.test(h) && 
                      !/pronta entrega/i.test(h) && 
                      !/stock/i.test(h)
                    )
                    .slice(0, 5)
                    .map(house => (
                      <button
                        key={house}
                        onClick={() => {
                          setFilterAuctionHouse(filterAuctionHouse === house ? 'all' : house);
                          setFilterModel('all');
                        }}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          filterAuctionHouse === house
                            ? 'bg-slate-200 text-slate-950 font-bold'
                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {house.length > 22 ? house.slice(0, 20) + '...' : house}
                      </button>
                    ))}
                </div>

                {/* Row 2: Modelos Importados por Leilão */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Modelos Importados {filterAuctionHouse === 'VERIZON' ? '(Verizon)' : filterAuctionHouse === 'ASSURANT' ? '(Assurant)' : '(Todos os Leilões)'}:
                      </span>
                    </span>
                    {filterModel !== 'all' && (
                      <button
                        onClick={() => setFilterModel('all')}
                        className="text-[11px] text-amber-400 hover:underline font-semibold"
                      >
                        ✕ Ver Todos os Modelos
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setFilterModel('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        filterModel === 'all'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                      }`}
                    >
                      Todos os Modelos ({availableImportedModels.reduce((acc, m) => acc + m.totalUnits, 0)} aparelhos)
                    </button>

                    {availableImportedModels.map(item => (
                      <button
                        key={item.model}
                        onClick={() => setFilterModel(filterModel === item.model ? 'all' : item.model)}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          filterModel === item.model
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span>{item.model}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          filterModel === item.model ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.totalUnits} un
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Grade */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-24 shrink-0 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    {t.gradeFilter}
                  </span>
                  <button
                    onClick={() => setFilterGrade('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterGrade === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.allGradesFilter}
                  </button>
                  {['Grade A+', 'Grade A', 'Grade B', 'Grade C', 'DNA', 'DNB', 'DNC', 'DND'].map(gradeKey => (
                    <button
                      key={gradeKey}
                      onClick={() => setFilterGrade(filterGrade === gradeKey ? 'all' : gradeKey)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        filterGrade === gradeKey
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {gradeKey}
                    </button>
                  ))}
                </div>

                {/* Row 4: Capacidade */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-24 shrink-0 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    {t.capacityFilter}
                  </span>
                  <button
                    onClick={() => setFilterCapacity('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterCapacity === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.allCapacitiesFilter}
                  </button>
                  {['64GB', '128GB', '256GB', '512GB', '1TB'].map(cap => (
                    <button
                      key={cap}
                      onClick={() => setFilterCapacity(filterCapacity === cap ? 'all' : cap)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        filterCapacity === cap
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Mode Switcher & Selection Toolbar Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-bold">Modo de Exibição:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAuctionsViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      auctionsViewMode === 'list'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista de Modelos & Lotes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuctionsViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      auctionsViewMode === 'cards'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards em Grade</span>
                  </button>
                </div>
              </div>

              {/* Bulk selection action bar */}
              <div className="flex items-center gap-2">
                {selectedLotIds.length > 0 ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      {selectedLotIds.length} modelo(s) selecionado(s) na lista
                    </span>
                    <button
                      onClick={handleOpenCalculatorForSelected}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Calcular Lucro</span>
                    </button>
                    <button
                      onClick={() => setSelectedLotIds([])}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 gap-3">
                    <span>
                      Exibindo <strong>{filteredAuctions.length}</strong> lotes/modelos de leilão
                    </span>
                    {(filterGrade !== 'all' || filterCapacity !== 'all' || filterAuctionHouse !== 'all' || filterModel !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setFilterGrade('all');
                          setFilterCapacity('all');
                          setFilterAuctionHouse('all');
                          setFilterModel('all');
                          setFilterLotType('all');
                          setSearchQuery('');
                        }}
                        className="text-amber-400 hover:underline font-semibold"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Results Display: List View or Grid View */}
            {filteredAuctions.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
                <Package className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum modelo encontrado com estes filtros</h3>
                <button
                  onClick={() => {
                    setFilterGrade('all');
                    setFilterCapacity('all');
                    setFilterAuctionHouse('all');
                    setFilterModel('all');
                    setFilterLotType('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Restaurar Todos os Leilões
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {auctionsViewMode === 'list' ? (
                  /* ======================================================== */
                  /* LIST VIEW: TABELA & SELEÇÃO DE MODELOS                   */
                  /* ======================================================== */
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Mobile List View (< md) */}
                    <div className="md:hidden divide-y divide-slate-800/80">
                      {paginatedAuctions.map(lot => {
                        const isSelected = selectedLotIds.includes(lot.id);
                        const cleanTitle = stripLotPrefix(lot.title);
                        const gradeInfo = GRADE_EXPLANATIONS[lot.grade] || GRADE_EXPLANATIONS['Grade A'];
                        const currentBrl = lot.currentBidUsd * usdRate;
                        const isVerizon = lot.sourceType === 'VERIZON' || /verizon/i.test(lot.auctionHouse);
                        const isAssurant = lot.sourceType === 'ASSURANT' || /assurant/i.test(lot.auctionHouse);

                        return (
                          <div key={lot.id} className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectLot(lot.id)}
                                className="mt-1 text-slate-400 hover:text-amber-400 shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-amber-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-600" />
                                )}
                              </button>
                              <img
                                src={lot.imageUrl}
                                alt={cleanTitle}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
                                }}
                                onClick={() => setSelectedLotForDetail(lot)}
                                className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-amber-400 text-xs">{lot.lotNumber}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${gradeInfo?.badgeColor || 'bg-slate-800 text-slate-200'}`}>
                                    {lot.grade}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                    {lot.quantity} un.
                                  </span>
                                  {isVerizon && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[9px] uppercase tracking-wider">
                                      VERIZON
                                    </span>
                                  )}
                                  {isAssurant && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider">
                                      ASSURANT
                                    </span>
                                  )}
                                </div>
                                <h4
                                  onClick={() => setSelectedLotForDetail(lot)}
                                  className="text-xs font-bold text-white mt-1 line-clamp-2 cursor-pointer hover:text-amber-300"
                                >
                                  {cleanTitle}
                                </h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{lot.auctionHouse}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Lance Atual:</span>
                                <span className="font-mono font-bold text-amber-400 text-sm">
                                  ${lot.currentBidUsd.toLocaleString()} USD
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                  (R$ {currentBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLotForDetail(lot)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
                                >
                                  Detalhes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLotForDetail(lot)}
                                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition-colors"
                                >
                                  Dar Lance
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800 tracking-wider">
                          <tr>
                            <th className="p-3.5 w-10 text-center">
                              <button
                                type="button"
                                onClick={handleSelectAllOnPage}
                                className="text-slate-400 hover:text-white"
                                title="Selecionar todos da página"
                              >
                                {paginatedAuctions.length > 0 && paginatedAuctions.every(l => selectedLotIds.includes(l.id)) ? (
                                  <CheckSquare className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-500" />
                                )}
                              </button>
                            </th>
                            <th className="p-3.5">Foto</th>
                            <th className="p-3.5">Modelo & Lote</th>
                            <th className="p-3.5">Leilão</th>
                            <th className="p-3.5">Grade</th>
                            <th className="p-3.5">Qtd / Memória</th>
                            <th className="p-3.5">Status Laudo</th>
                            <th className="p-3.5">Lance Atual</th>
                            <th className="p-3.5 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {paginatedAuctions.map(lot => {
                            const isSelected = selectedLotIds.includes(lot.id);
                            const cleanTitle = stripLotPrefix(lot.title);
                            const gradeInfo = GRADE_EXPLANATIONS[lot.grade] || GRADE_EXPLANATIONS['Grade A'];
                            const currentBrl = lot.currentBidUsd * usdRate;
                            const isVerizon = lot.sourceType === 'VERIZON' || /verizon/i.test(lot.auctionHouse);
                            const isAssurant = lot.sourceType === 'ASSURANT' || /assurant/i.test(lot.auctionHouse);

                            return (
                              <tr key={lot.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                                <td className="p-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSelectLot(lot.id)}
                                    className="text-slate-400 hover:text-amber-400"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-amber-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-600" />
                                    )}
                                  </button>
                                </td>

                                {/* Photo Thumbnail */}
                                <td className="p-3.5">
                                  <div
                                    onClick={() => setSelectedLotForDetail(lot)}
                                    className="w-14 h-14 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 cursor-pointer relative group shrink-0"
                                  >
                                    <img
                                      src={lot.imageUrl}
                                      alt={cleanTitle}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
                                      }}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  </div>
                                </td>

                                {/* Model & Lot Title */}
                                <td className="p-3.5">
                                  <div className="space-y-0.5">
                                    <span
                                      className="font-bold text-white text-sm block hover:text-amber-400 cursor-pointer transition-colors"
                                      onClick={() => setSelectedLotForDetail(lot)}
                                    >
                                      {lot.modelFamily}
                                    </span>
                                    <span className="text-[11px] text-slate-300 font-medium line-clamp-1">
                                      {cleanTitle}
                                    </span>
                                    <div className="flex items-center gap-2 pt-0.5">
                                      <span className="font-mono text-[10px] text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                        {lot.lotNumber}
                                      </span>
                                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                        {lot.location}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Auction Origin */}
                                <td className="p-3.5">
                                  {isVerizon ? (
                                    <span className="px-2 py-1 rounded bg-red-600/90 text-white font-black text-[10px] uppercase tracking-wider inline-block">
                                      VERIZON
                                    </span>
                                  ) : isAssurant ? (
                                    <span className="px-2 py-1 rounded bg-blue-600/90 text-white font-black text-[10px] uppercase tracking-wider inline-block">
                                      ASSURANT
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold text-[10px] inline-block">
                                      {lot.auctionHouse}
                                    </span>
                                  )}
                                </td>

                                {/* Grade */}
                                <td className="p-3.5">
                                  <span className={`px-2.5 py-1 rounded text-xs font-bold border inline-block ${gradeInfo?.badgeColor || 'bg-slate-800 text-slate-200'}`}>
                                    {lot.grade}
                                  </span>
                                </td>

                                {/* Qtd & Storage */}
                                <td className="p-3.5">
                                  <div className="font-mono">
                                    <span className="text-white font-bold block">{lot.quantity} {lot.quantity === 1 ? 'unidade' : 'unidades'}</span>
                                    <span className="text-slate-400 text-[11px] block">{lot.primaryStorage}</span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="p-3.5">
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      <span>Clean ESN / FMI OFF</span>
                                    </div>
                                    <span className="text-slate-400 font-mono text-[10px] block">
                                      Bat: {lot.batteryHealthRange}
                                    </span>
                                  </div>
                                </td>

                                {/* Current Bid */}
                                <td className="p-3.5">
                                  <div>
                                    <span className="font-mono font-bold text-amber-400 text-sm block">
                                      ${lot.currentBidUsd.toLocaleString()} USD
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      R$ {currentBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block">
                                      (${Math.round(lot.currentBidUsd / (lot.quantity || 1)).toLocaleString()}/un)
                                    </span>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCalculatorForLot(lot)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                      title="Calcular Lucro deste lote"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLotForDetail(lot)}
                                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition-colors"
                                    >
                                      Dar Lance
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedAuctions.map(lot => (
                      <AuctionCard
                        key={lot.id}
                        lot={lot}
                        onSelectLot={lotItem => setSelectedLotForDetail(lotItem)}
                        onQuickBid={lotItem => setSelectedLotForDetail(lotItem)}
                        onCalculateLot={lotItem => handleOpenCalculatorForLot(lotItem)}
                        currency={currency}
                        usdRate={usdRate}
                      />
                    ))}
                  </div>
                )}

                {/* Ultra-Fast Responsive Pagination Bar */}
                {totalAuctionsPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
                    <div>
                      Exibindo <strong className="text-white">{(auctionsPage - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong className="text-white">{Math.min(auctionsPage * ITEMS_PER_PAGE, filteredAuctions.length)}</strong> de <strong className="text-white">{filteredAuctions.length}</strong> lotes legíveis
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                      <button
                        disabled={auctionsPage === 1}
                        onClick={() => {
                          setAuctionsPage(p => Math.max(1, p - 1));
                          window.scrollTo({ top: 200, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors"
                      >
                        Anterior
                      </button>

                      {Array.from({ length: totalAuctionsPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setAuctionsPage(p);
                            window.scrollTo({ top: 200, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-lg transition-all font-mono text-xs ${
                            auctionsPage === p
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        disabled={auctionsPage === totalAuctionsPages}
                        onClick={() => {
                          setAuctionsPage(p => Math.min(totalAuctionsPages, p + 1));
                          window.scrollTo({ top: 200, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
          )
        )}

        {/* ========================================================= */}
        {/* VIEW 3: GRADEAMENTO (PÁGINA INTERNA DEDICADA) */}
        {/* ========================================================= */}
        {currentPage === 'gradeamento' && (
          <GradeamentoPage
            onSelectGradeFilter={grade => {
              setFilterGrade(grade);
              setCurrentPage('leiloes');
            }}
            onNavigateLeiloes={() => setCurrentPage('leiloes')}
          />
        )}

        {/* ========================================================= */}
        {/* VIEW 4: QUEM SOMOS (PÁGINA INTERNA DEDICADA) */}
        {/* ========================================================= */}
        {currentPage === 'quem-somos' && (
          <QuemSomosPage
            onNavigateLeiloes={() => setCurrentPage('leiloes')}
            onOpenSystem={handleOpenSystem}
          />
        )}

        {/* ========================================================= */}
        {/* VIEW 5: PAINEL DO CLIENTE (PORTAL DO ARREMATANTE) */}
        {/* ========================================================= */}
        {currentPage === 'cliente' && (
          !isClientAuthenticated ? (
            <ClientLoginGate
              currentUser={currentUser}
              onLoginSuccess={(user) => {
                setIsClientAuthenticated(true);
                setIsAdminAuthenticated(false);
                setCurrentUser(user);
                try {
                  localStorage.removeItem('us_admin_auth');
                  localStorage.setItem('us_client_auth', 'true');
                  localStorage.setItem('us_iphone_client_user', JSON.stringify(user));
                } catch (e) {}
                showToast(`Bem-vindo, ${user.name}! Acesso ao portal liberado.`);
              }}
              onCancel={() => setCurrentPage('home')}
            />
          ) : (
            <ClientePage
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              auctions={auctions}
              userBids={userBids}
              onPlaceBid={handlePlaceBid}
              onSelectLot={lotItem => setSelectedLotForDetail(lotItem)}
              currency={currency}
              usdRate={usdRate}
              onLogout={handleClientLogout}
            />
          )
        )}

        {/* ========================================================= */}
        {/* VIEW 6: PAINEL ADMIN (IMPORTAÇÃO EXCEL, OFERTAS, LOTES) */}
        {/* ========================================================= */}
        {currentPage === 'admin' && (
          !isAdminAuthenticated ? (
            <AdminLoginGate
              onLoginSuccess={() => {
                setIsAdminAuthenticated(true);
                try {
                  localStorage.setItem('us_admin_auth', 'true');
                } catch (e) {}
                showToast('Login de administrador realizado com sucesso!');
              }}
              onCancel={() => setCurrentPage('home')}
            />
          ) : (
            <AdminPage
              auctions={auctions}
              onUpdateAuctions={handleUpdateAuctions}
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              usdRate={usdRate}
              onUpdateUsdRate={handleUpdateUsdRate}
              onLogout={handleAdminLogout}
            />
          )
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800 bg-[#080c13] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">USAFAST LEILÕES HUB</span>
            <span>·</span>
            <span>Assessoria de Leilões em Miami & Plataforma Oficial de Arrematação</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCurrentPage('quem-somos')}
              className="hover:text-slate-300 transition-colors"
            >
              Quem Somos
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentPage('leiloes')}
              className="hover:text-slate-300 transition-colors"
            >
              Leilões
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentPage('gradeamento')}
              className="hover:text-slate-300 transition-colors"
            >
              Gradeamento
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentPage('cliente')}
              className="text-emerald-400 hover:underline font-semibold"
            >
              Painel do Cliente
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentPage('admin')}
              className="text-amber-400 hover:underline font-semibold"
            >
              Painel Admin (Excel)
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuctionDetailModal
        lot={selectedLotForDetail}
        isOpen={!!selectedLotForDetail}
        onClose={() => setSelectedLotForDetail(null)}
        onPlaceBid={handlePlaceBid}
        onOpenSystem={() => {
          setSelectedLotForDetail(null);
          handleOpenSystem('terminal');
        }}
        currency={currency}
        usdRate={usdRate}
      />

      <AuctionSystemModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
        initialTab={systemModalTab}
        auctions={auctions}
        userBids={userBids}
        onPlaceQuickBid={handlePlaceBid}
        currentUser={currentUser}
        onUpdateUser={updated => {
          setCurrentUser(updated);
          showToast('Cadastro atualizado com sucesso no sistema!');
        }}
        usdRate={usdRate}
      />

      <GradingGuideModal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
        onSelectGradeFilter={grade => {
          setFilterGrade(grade);
          setCurrentPage('leiloes');
        }}
      />

      <ImportCalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
        usdRate={usdRate}
        initialLotPriceUsd={calculatorInitData.priceUsd}
        initialLotUnits={calculatorInitData.units}
      />
    </div>
  );
}
