import { AuctionLot } from '../types/auction';

/**
 * Verificação estrita se o lote pertence ao Leilão ASSURANT
 */
export function isAssurantLot(lot: AuctionLot | null | undefined): boolean {
  if (!lot) return false;
  return (
    lot.sourceType === 'ASSURANT' ||
    /assurant/i.test(lot.auctionHouse || '') ||
    /assurant/i.test(lot.location || '')
  );
}

/**
 * Calcula o valor histórico da "Média lance aprovado arremate anterior" para lotes ASSURANT
 * aplicando variações de -$7, -$10, -$15 ou -$5 sobre o valor inicial/atual.
 */
export function getAssurantPreviousApprovedBid(lot: AuctionLot): number {
  const str = String(lot.id || lot.lotNumber || '0');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  
  // Variações especificadas: -$7, -$10, -$15, -$5
  const offsets = [7, 10, 15, 5];
  const selectedOffset = offsets[Math.abs(hash) % offsets.length];
  
  const basePrice = lot.currentBidUsd;
  return Math.max(15, basePrice - selectedOffset);
}
