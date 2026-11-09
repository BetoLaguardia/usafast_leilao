import React, { useState, useMemo, useEffect } from 'react';
import { Header, AppPage } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { AuctionCard } from './components/AuctionCard';
import { AuctionDetailModal } from './components/AuctionDetailModal';
import { AuctionSystemModal } from './components/AuctionSystemModal';
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
  Server
} from 'lucide-react';

export default function App() {
  // Navigation Page State
  const [currentPage, setCurrentPage] = useState<AppPage>('home');

  // Auction State with Persistent LocalStorage
  const [auctions, setAuctions] = useState<AuctionLot[]>(() => {
    try {
      const saved = localStorage.getItem('us_iphone_auctions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAssurant = parsed.some((a: any) => a.sourceType === 'ASSURANT');
          if (!hasAssurant) {
            const defaultAssurant = INITIAL_AUCTIONS.filter(a => a.sourceType === 'ASSURANT');
            return [...defaultAssurant, ...parsed];
          }
          return parsed;
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
    fetch('/api/auctions')
      .then(res => res.json())
      .then(data => {
        if (!hasLocalUpdateRef.current && data && Array.isArray(data.auctions) && data.auctions.length > 0) {
          const backendLots: AuctionLot[] = data.auctions;
          let localLots: AuctionLot[] = [];
          try {
            const saved = localStorage.getItem('us_iphone_auctions_v1');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) localLots = parsed;
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
          } else {
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

  // Filtered & Sorted Auctions
  const filteredAuctions = useMemo(() => {
    return auctions.filter(lot => {
      // 1. Sanitize or exclude items containing (T)
      const cleanGrade = (lot.grade || '').replace(/\(T\)/gi, '').trim();
      if (lot.grade.includes('(T)') && !['DNA', 'DNB', 'DNC', 'DND', 'Grade A+', 'Grade A', 'Grade B', 'Grade C'].includes(cleanGrade)) {
        return false;
      }

      // 2. Verizon strict rule: When Verizon, ONLY show DNA, DNB, DNC, DND
      const isVerizon = lot.sourceType === 'VERIZON' || /verizon/i.test(lot.auctionHouse) || /verizon/i.test(lot.carrierStatus);
      if (isVerizon) {
        const allowedVerizonGrades = ['DNA', 'DNB', 'DNC', 'DND'];
        if (!allowedVerizonGrades.includes(cleanGrade)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = lot.title.toLowerCase().includes(query);
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
  const ITEMS_PER_PAGE = 12;

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

            {/* Destaques de Leilões na Home */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    OPORTUNIDADES DE MAIOR MARGEM
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Leilões Mais Disputados dos EUA
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentPage('leiloes')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 self-start sm:self-auto"
                >
                  <span>Ver Todos os {auctions.length} Leilões</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.slice(0, 3).map(lot => (
                  <AuctionCard
                    key={lot.id}
                    lot={lot}
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
                    currency={currency}
                    usdRate={usdRate}
                  />
                ))}
              </div>
            </section>

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
                  <span>CATÁLOGO COMPLETO DE LEILÕES DOS EUA</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Lotes de iPhones Disponíveis para Arrematação
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  Filtragem por modelo, grade, capacidade e leilões americanos.
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

              {/* Filter Rows: Leilão, Grade, Capacidade */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
                {/* Row 1: Leilão */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-20 shrink-0 flex items-center gap-1">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" />
                    {t.auctionFilter}
                  </span>
                  <button
                    onClick={() => setFilterAuctionHouse('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterAuctionHouse === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.allAuctionsFilter}
                  </button>

                  <button
                    onClick={() => setFilterAuctionHouse(filterAuctionHouse === 'VERIZON' ? 'all' : 'VERIZON')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      filterAuctionHouse === 'VERIZON'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-400'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    <span>⚡ {t.verizonBadge}</span>
                  </button>

                  <button
                    onClick={() => setFilterAuctionHouse(filterAuctionHouse === 'ASSURANT' ? 'all' : 'ASSURANT')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      filterAuctionHouse === 'ASSURANT'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <span>🔹 {t.assurantBadge}</span>
                  </button>

                  {/* Dynamic auction house buttons */}
                  {Array.from(new Set(auctions.map(a => a.auctionHouse))).filter(h => h && !/verizon/i.test(h) && !/assurant/i.test(h)).slice(0, 5).map(house => (
                    <button
                      key={house}
                      onClick={() => setFilterAuctionHouse(filterAuctionHouse === house ? 'all' : house)}
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

                {/* Row 2: Grade */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-20 shrink-0 flex items-center gap-1">
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

                {/* Row 3: Capacidade */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold w-20 shrink-0 flex items-center gap-1">
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

            {/* Results Count */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Exibindo <strong>{filteredAuctions.length}</strong> leilões ativos de iPhones
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

            {/* Grid */}
            {filteredAuctions.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-3">
                <Package className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum leilão encontrado com estes filtros</h3>
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
