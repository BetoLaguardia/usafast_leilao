import React, { useState } from 'react';
import { Gavel, UserPlus, ShieldCheck, DollarSign, Layers, Users, Lock, Menu, X, UserCheck, Globe } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

export type AppPage = 'home' | 'leiloes' | 'gradeamento' | 'quem-somos' | 'cliente' | 'admin';

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenSystem: (tab?: 'terminal' | 'register') => void;
  currency: 'USD' | 'BRL';
  onToggleCurrency: () => void;
  usdRate: number;
  isClientAuthenticated?: boolean;
  isAdminAuthenticated?: boolean;
  onClientLogout?: () => void;
  onAdminLogout?: () => void;
  clientName?: string;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  isPtaxOnline?: boolean;
  ptaxSource?: string;
  ptaxLastUpdated?: string;
  onRefreshPtax?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenSystem,
  currency,
  onToggleCurrency,
  usdRate,
  isClientAuthenticated,
  isAdminAuthenticated,
  onClientLogout,
  onAdminLogout,
  clientName,
  language,
  onSelectLanguage,
  isPtaxOnline = true,
  ptaxSource = 'Banco Central do Brasil (PTAX)',
  ptaxLastUpdated,
  onRefreshPtax
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const handleNavClick = (page: AppPage) => {
    if (page === 'leiloes' && !isClientAuthenticated && !isAdminAuthenticated) {
      onNavigate('cliente');
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-800">
      {/* Top System Bar: EXPLICIT PROMINENT LINKS TO 'NOSSO SISTEMA DE LEILÕES' */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-500/20 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              USAFAST LEILÕES HUB
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden md:inline">
              Portal do Importador Brasil · Leilões Oficiais Assurant, Marketplaces USA, Macbooks & Verizon
            </span>
            <span className="text-slate-600 hidden lg:inline">|</span>
            <div 
              onClick={onRefreshPtax}
              className="inline-flex items-center gap-1.5 font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[11px] cursor-pointer hover:bg-emerald-900/60 transition-colors shadow-sm"
              title={`${ptaxSource} ${ptaxLastUpdated ? `· Atualizado às ${ptaxLastUpdated}` : ''} (Clique para atualizar)`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Dólar Online (PTAX): 1 USD = R$ {usdRate.toFixed(2)}</span>
            </div>
          </div>

          {/* TWO PROMINENT LINKS TO "NOSSO SISTEMA DE LEILÕES" */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isClientAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('cliente')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded font-bold text-xs transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Olá, {clientName?.split(' ')[0] || 'Arrematante'}</span>
                </button>
                {onClientLogout && (
                  <button
                    onClick={onClientLogout}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
                    title="Encerrar sessão do cliente"
                  >
                    Sair
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('cliente')}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded font-bold text-xs transition-colors shadow-sm"
                title="Acesse o Sistema de Lances e Arrematação de Leilões Americanos"
              >
                <Gavel className="w-3.5 h-3.5 text-amber-400" />
                <span>Acessar Sistema de Leilões</span>
              </button>
            )}

            {!isClientAuthenticated && (
              <button
                onClick={() => onOpenSystem('register')}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition-colors shadow-sm"
                title="Cadastrar Arrematante no Sistema Oficial de Leilões"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Cadastrar no Sistema de Leilões</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-inner shadow-black/30 group-hover:scale-105 transition-transform">
            <Gavel className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white whitespace-nowrap block group-hover:text-amber-300 transition-colors">
              USAFAST LEILÕES HUB
            </span>
            <span className="text-[11px] text-amber-400/90 font-semibold block -mt-0.5">
              Leilões de Atacado & Varejo EUA
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-slate-300">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              currentPage === 'home'
                ? 'bg-slate-800 text-amber-400 font-bold'
                : 'hover:text-white hover:bg-slate-900'
            }`}
          >
            {t.home}
          </button>

          <button
            onClick={() => handleNavClick('leiloes')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentPage === 'leiloes'
                ? 'bg-slate-800 text-amber-400 font-bold'
                : 'hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>{t.auctions}</span>
            {!isClientAuthenticated && !isAdminAuthenticated && (
              <Lock className="w-3 h-3 text-amber-400 opacity-80" />
            )}
          </button>

          <button
            onClick={() => handleNavClick('gradeamento')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentPage === 'gradeamento'
                ? 'bg-slate-800 text-amber-400 font-bold'
                : 'hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.grading}</span>
          </button>

          <button
            onClick={() => handleNavClick('quem-somos')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentPage === 'quem-somos'
                ? 'bg-slate-800 text-amber-400 font-bold'
                : 'hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.aboutUs}</span>
          </button>

          {/* Dedicated Portal do Cliente / Arrematante tab */}
          <button
            onClick={() => handleNavClick('cliente')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border ${
              currentPage === 'cliente'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.clientPanel}</span>
          </button>

          {/* Admin panel */}
          <button
            onClick={() => handleNavClick('admin')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 border ${
              currentPage === 'admin'
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                : 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>{t.adminPanel}</span>
          </button>
        </nav>

        {/* Zone 3: Language Selector, Currency Switch & Quick Bids Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 border border-slate-700 rounded-md text-xs font-semibold transition-colors"
              title="Selecionar Idioma / Select Language / Seleccionar Idioma"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'pt' ? '🇧🇷 PT' : language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    onSelectLanguage('pt');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 ${language === 'pt' ? 'text-amber-400 font-bold bg-slate-800/50' : 'text-slate-200'}`}
                >
                  <span>🇧🇷</span> Português
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLanguage('es');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 ${language === 'es' ? 'text-amber-400 font-bold bg-slate-800/50' : 'text-slate-200'}`}
                >
                  <span>🇪🇸</span> Español
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLanguage('en');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 ${language === 'en' ? 'text-amber-400 font-bold bg-slate-800/50' : 'text-slate-200'}`}
                >
                  <span>🇺🇸</span> English
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCurrency}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-md text-xs font-mono transition-colors"
            title="Alternar moeda entre USD e BRL"
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">{currency === 'USD' ? 'USD ($)' : 'BRL (R$)'}</span>
          </button>

          <button
            onClick={() => handleNavClick('cliente')}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-500/10"
          >
            <Gavel className="w-4 h-4" />
            <span>{t.placeBids}</span>
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 lg:hidden text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2 text-xs">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${currentPage === 'home' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'}`}
          >
            Início
          </button>
          <button
            onClick={() => handleNavClick('leiloes')}
            className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${currentPage === 'leiloes' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'}`}
          >
            Leilões Ativos
          </button>
          <button
            onClick={() => handleNavClick('gradeamento')}
            className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${currentPage === 'gradeamento' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'}`}
          >
            Gradeamento (A+, A, B, C, DNA...)
          </button>
          <button
            onClick={() => handleNavClick('quem-somos')}
            className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${currentPage === 'quem-somos' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'}`}
          >
            Quem Somos & Assessoria Miami
          </button>
          <button
            onClick={() => handleNavClick('cliente')}
            className={`w-full text-left px-3 py-2 rounded-lg font-bold flex items-center gap-2 ${currentPage === 'cliente' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Painel do Cliente (Lances & Modelos)</span>
          </button>
          <button
            onClick={() => handleNavClick('admin')}
            className={`w-full text-left px-3 py-2 rounded-lg font-bold flex items-center gap-2 ${currentPage === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Painel Admin & Importar Excel</span>
          </button>
        </div>
      )}
    </header>
  );
};
