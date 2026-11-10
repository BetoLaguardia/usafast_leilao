import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Gavel, 
  Clock, 
  Layers, 
  Calculator, 
  Flame, 
  ShieldCheck, 
  Play, 
  Pause,
  ExternalLink,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { AuctionLot } from '../types/auction';
import { stripLotPrefix } from '../utils/deviceImages';

interface ModelCarouselProps {
  auctions: AuctionLot[];
  usdRate: number;
  currency: 'USD' | 'BRL';
  onSelectLot: (lot: AuctionLot) => void;
  onQuickBid: (lot: AuctionLot) => void;
  onCalculateLot: (lot: AuctionLot) => void;
  onViewAllAuctions: () => void;
}

export const ModelCarousel: React.FC<ModelCarouselProps> = ({
  auctions,
  usdRate,
  currency,
  onSelectLot,
  onQuickBid,
  onCalculateLot,
  onViewAllAuctions
}) => {
  // Filter only real spreadsheet auctions (Verizon & Assurant), excluding any banned platforms
  const carouselLots = auctions.filter(lot => {
    const house = (lot.auctionHouse || '').toLowerCase();
    const title = (lot.title || '').toLowerCase();
    const src = (lot.sourceType || '').toLowerCase();
    if (house.includes('govdeals') || title.includes('govdeals')) return false;
    if (house.includes('copart') || title.includes('copart')) return false;
    if (house.includes('liquidation.com') || title.includes('liquidation.com')) return false;
    if (house.includes('apple certified') || title.includes('apple certified')) return false;
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = carouselLots.length;

  // Auto-play alternation every 4 seconds when not hovered and active
  useEffect(() => {
    if (!isAutoPlaying || isHovered || total <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % total);
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlaying, isHovered, total]);

  const handleNext = () => {
    if (total === 0) return;
    setCurrentIndex(prev => (prev + 1) % total);
  };

  const handlePrev = () => {
    if (total === 0) return;
    setCurrentIndex(prev => (prev - 1 + total) % total);
  };

  if (total === 0) {
    return null;
  }

  const currentLot = carouselLots[currentIndex];
  const isVerizon = currentLot.sourceType === 'VERIZON' || /verizon/i.test(currentLot.auctionHouse);
  const auctionHouseName = isVerizon ? 'Leilão Oficial VERIZON' : 'Leilão Oficial ASSURANT';
  const cleanTitle = stripLotPrefix(currentLot.title);

  // Price calculations
  const priceUsd = currentLot.currentBidUsd;
  const priceBrl = Math.round(priceUsd * usdRate);
  const unitPriceUsd = Math.round(priceUsd / (currentLot.quantity || 1));
  const unitPriceBrl = Math.round(priceBrl / (currentLot.quantity || 1));
  const formattedUsd = `$${priceUsd.toLocaleString('en-US')}`;
  const formattedBrl = `R$ ${priceBrl.toLocaleString('pt-BR')}`;
  const displayPrice = currency === 'USD' ? formattedUsd : formattedBrl;
  const secondaryPrice = currency === 'USD' ? formattedBrl : formattedUsd;
  const displayUnitPrice = currency === 'USD' ? `$${unitPriceUsd.toLocaleString('en-US')}` : `R$ ${unitPriceBrl.toLocaleString('pt-BR')}`;

  return (
    <section 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Modelos em Destaque nos Leilões dos EUA
            </span>
            <span className="text-xs text-slate-400">
              ({currentIndex + 1} de {total} modelos)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Catálogo Rotativo de Lotes Ativos
          </h2>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Pause / Play Button */}
          <button
            onClick={() => setIsAutoPlaying(prev => !prev)}
            title={isAutoPlaying ? 'Pausar rotação automática' : 'Retomar rotação automática'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
          >
            {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Previous Button */}
          <button
            onClick={handlePrev}
            aria-label="Modelo anterior"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 flex items-center gap-1 active:scale-95 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-semibold">Anterior</span>
          </button>

          {/* Next Button ("botão para passar pra frente") */}
          <button
            onClick={handleNext}
            aria-label="Passar para frente"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition-all font-bold text-xs flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
          >
            <span>Passar pra Frente</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>

          <button
            onClick={onViewAllAuctions}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 text-xs font-medium"
          >
            <span>Ver Todos ({total})</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Carousel Feature Card */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* IMAGE COLUMN WITH PROMINENT AUCTION NAME CARD */}
          <div className="lg:col-span-5 relative group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner">
              <img
                src={currentLot.imageUrl}
                alt={cleanTitle}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

              {/* CARD NA IMAGEM COM O NOME DO LEILÃO (REQUIREMENT) */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-auto">
                <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/90 shadow-xl flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isVerizon ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                      Origem Oficial dos EUA
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                      {auctionHouseName}
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ao Vivo</span>
                </div>
              </div>

              {/* Bottom Image Badge: Grade & Quantity */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
                <span className="px-3 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 font-bold text-amber-400 shadow-md">
                  Grade {currentLot.grade}
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 font-semibold text-slate-200 shadow-md">
                  {currentLot.quantity} {currentLot.quantity > 1 ? 'Aparelhos' : 'Aparelho'}
                </span>
              </div>
            </div>

            {/* Quick Navigation Chevron Overlays on Image */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              title="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* DETAILS & BIDDING COLUMN */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Lot Tag & Model */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-slate-400 font-semibold">
                  #{currentLot.lotNumber}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {currentLot.carrierStatus || '100% Factory Unlocked'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {currentLot.location || 'Miami Hub, FL'}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                {cleanTitle}
              </h3>
            </div>

            {/* Spec Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Armazenamento</span>
                <span className="text-sm font-bold text-white">{currentLot.primaryStorage || '128GB'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Bateria Média</span>
                <span className="text-sm font-bold text-emerald-400">{currentLot.batteryHealthRange || '88% - 100%'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">IMEI / ESN</span>
                <span className="text-sm font-bold text-white">Clean ESN</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Lances</span>
                <span className="text-sm font-bold text-amber-400">{currentLot.totalBidsCount || 12} Lances</span>
              </div>
            </div>

            {/* Description quote */}
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              {currentLot.description || 'Lote verificado de atacado americano com manifesto auditado de IMEI e testes de hardware aprovados.'}
            </p>

            {/* Price Box & Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {currentLot.quantity > 1 ? `Lance Unitário (${currentLot.quantity} unidades no lote)` : 'Lance Atual no Leilão'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-mono">
                    {currentLot.quantity > 1 ? `${displayUnitPrice} / un.` : displayPrice}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentLot.quantity > 1 ? `(Lote: ${displayPrice})` : `(${secondaryPrice})`}
                  </span>
                </div>
                {currentLot.estimatedBrazilRetailBrl && (
                  <span className="text-[11px] text-emerald-400 font-medium block">
                    Venda estimada no Brasil: ~R$ {currentLot.estimatedBrazilRetailBrl.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCalculateLot(currentLot)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-semibold"
                  title="Simular Lucro e Impostos"
                >
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Simular</span>
                </button>

                <button
                  onClick={() => onSelectLot(currentLot)}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Gavel className="w-4 h-4 text-slate-950" />
                  <span>Dar Lance / Detalhes</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Carousel Thumbnails / Indicators */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Thumbnails preview (up to 8 models) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {carouselLots.slice(0, 10).map((lot, idx) => (
              <button
                key={lot.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border transition-all ${
                  currentIndex === idx 
                    ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105' 
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={lot.imageUrl} 
                  alt={lot.title} 
                  className="w-full h-full object-cover" 
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-white text-center truncate px-0.5 font-mono">
                  {lot.primaryStorage}
                </span>
              </button>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1 shrink-0">
            {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
