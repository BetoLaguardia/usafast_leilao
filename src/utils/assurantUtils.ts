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

/**
 * Retorna preço atacadista realístico de mercado (em USD) para quando a planilha
 * importada vier sem coluna de preço ou com valor $0.
 * Evita o bug de aparelhos ficarem com apenas o markup de $5.
 */
export function getEstimatedWholesalePrice(modelRaw?: string, capacityRaw?: string, gradeRaw?: string): number {
  const m = String(modelRaw || '').toLowerCase();
  const c = String(capacityRaw || '').toLowerCase();
  const g = String(gradeRaw || '').toUpperCase();

  let base = 180;

  // iPhones
  if (m.includes('16 pro max')) {
    if (c.includes('1tb')) base = 780;
    else if (c.includes('512')) base = 720;
    else base = 670;
  } else if (m.includes('16 pro')) {
    if (c.includes('1tb')) base = 690;
    else if (c.includes('512')) base = 630;
    else base = 590;
  } else if (m.includes('16 plus')) {
    base = 530;
  } else if (m.includes('16e')) {
    base = 340;
  } else if (m.includes('16')) {
    base = 480;
  } else if (m.includes('15 pro max')) {
    if (c.includes('1tb')) base = 610;
    else if (c.includes('512')) base = 550;
    else base = 500;
  } else if (m.includes('15 pro')) {
    if (c.includes('1tb')) base = 520;
    else if (c.includes('512')) base = 470;
    else base = 420;
  } else if (m.includes('15 plus')) {
    base = 380;
  } else if (m.includes('15')) {
    base = 330;
  } else if (m.includes('14 pro max')) {
    base = 420;
  } else if (m.includes('14 pro')) {
    base = 360;
  } else if (m.includes('14 plus')) {
    base = 290;
  } else if (m.includes('14')) {
    base = 240;
  } else if (m.includes('13 pro max')) {
    base = 330;
  } else if (m.includes('13 pro')) {
    base = 280;
  } else if (m.includes('13 mini')) {
    base = 190;
  } else if (m.includes('13')) {
    base = 220;
  } else if (m.includes('12 pro max')) {
    base = 260;
  } else if (m.includes('12 pro')) {
    base = 210;
  } else if (m.includes('12 mini')) {
    base = 130;
  } else if (m.includes('12')) {
    base = 160;
  } else if (m.includes('11 pro max')) {
    base = 180;
  } else if (m.includes('11 pro')) {
    base = 150;
  } else if (m.includes('11')) {
    base = 120;
  } else if (m.includes('se') || m.includes('iphone se')) {
    base = 110;
  } else if (m.includes('xr') || m.includes('xs max')) {
    base = 115;
  } else if (m.includes('xs') || m.includes('iphone x')) {
    base = 95;
  } else if (m.includes('iphone 8') || m.includes('iphone 7')) {
    base = 75;
  }
  // iPads
  else if (m.includes('ipad pro 13') || m.includes('m4') || m.includes('pro 7')) {
    base = 650;
  } else if (m.includes('ipad pro 12.9')) {
    base = 380;
  } else if (m.includes('ipad pro 11') || m.includes('pro 6') || m.includes('pro 5')) {
    base = 340;
  } else if (m.includes('ipad pro')) {
    base = 320;
  } else if (m.includes('ipad air 13') || m.includes('air 2 13') || m.includes('air 7') || m.includes('air 6')) {
    base = 410;
  } else if (m.includes('ipad air 5')) {
    base = 280;
  } else if (m.includes('ipad air')) {
    base = 220;
  } else if (m.includes('ipad mini 6') || m.includes('mini (6th')) {
    base = 270;
  } else if (m.includes('ipad mini')) {
    base = 160;
  } else if (m.includes('ipad 10') || m.includes('10th gen') || m.includes('a16') || m.includes('a2696') || m.includes('a2757')) {
    base = 220;
  } else if (m.includes('ipad 9') || m.includes('9th gen') || m.includes('a2603')) {
    base = 150;
  } else if (m.includes('ipad 8') || m.includes('8th gen') || m.includes('ipad 7') || m.includes('ipad 6') || m.includes('ipad 5')) {
    base = 120;
  } else if (m.includes('ipad')) {
    base = 180;
  }
  // Apple Watch
  else if (m.includes('ultra 2') || m.includes('ultra')) {
    base = 390;
  } else if (m.includes('series 10') || m.includes('s10')) {
    base = 280;
  } else if (m.includes('series 9') || m.includes('s9')) {
    base = 210;
  } else if (m.includes('series 8') || m.includes('s8')) {
    base = 160;
  } else if (m.includes('series 7') || m.includes('s7')) {
    base = 140;
  } else if (m.includes('series 6') || m.includes('series 5') || m.includes('series 4')) {
    base = 110;
  } else if (m.includes('watch se') || m.includes('se 2') || m.includes('a2726') || m.includes('a3324')) {
    base = 120;
  } else if (m.includes('apple watch') || m.includes('watch')) {
    base = 140;
  }
  // MacBooks
  else if (m.includes('macbook pro 16') || m.includes('m3 max')) {
    base = 1450;
  } else if (m.includes('macbook pro 14') || m.includes('m3 pro')) {
    base = 1100;
  } else if (m.includes('macbook pro') || m.includes('m2') || m.includes('m1 pro')) {
    base = 780;
  } else if (m.includes('macbook air 15')) {
    base = 750;
  } else if (m.includes('macbook air 13') || m.includes('air m2')) {
    base = 620;
  } else if (m.includes('macbook air m1') || m.includes('air m1')) {
    base = 450;
  } else if (m.includes('macbook')) {
    base = 480;
  }
  // Samsung Galaxy
  else if (m.includes('fold6') || m.includes('fold 6')) {
    base = 620;
  } else if (m.includes('fold5') || m.includes('fold 5')) {
    base = 480;
  } else if (m.includes('fold4') || m.includes('fold 4')) {
    base = 380;
  } else if (m.includes('fold3') || m.includes('fold 3') || m.includes('fold')) {
    base = 320;
  } else if (m.includes('flip6') || m.includes('flip 6')) {
    base = 380;
  } else if (m.includes('flip5') || m.includes('flip 5')) {
    base = 290;
  } else if (m.includes('flip4') || m.includes('flip 4')) {
    base = 220;
  } else if (m.includes('flip')) {
    base = 190;
  } else if (m.includes('s25 ultra')) {
    base = 750;
  } else if (m.includes('s24 ultra')) {
    base = 620;
  } else if (m.includes('s24+') || m.includes('s24 plus')) {
    base = 430;
  } else if (m.includes('s24')) {
    base = 380;
  } else if (m.includes('s23 ultra')) {
    base = 420;
  } else if (m.includes('s23+') || m.includes('s23 plus')) {
    base = 330;
  } else if (m.includes('s23')) {
    base = 280;
  } else if (m.includes('s22 ultra')) {
    base = 330;
  } else if (m.includes('s22')) {
    base = 210;
  } else if (m.includes('s21 ultra')) {
    base = 260;
  } else if (m.includes('s21')) {
    base = 170;
  } else if (m.includes('s20') || m.includes('note 20')) {
    base = 160;
  } else if (m.includes('note 10') || m.includes('s10')) {
    base = 120;
  } else if (m.includes('a55') || m.includes('a54')) {
    base = 160;
  } else if (m.includes('a53') || m.includes('a35') || m.includes('a34')) {
    base = 130;
  } else if (m.includes('a25') || m.includes('a24') || m.includes('a16') || m.includes('a15') || m.includes('a14')) {
    base = 95;
  } else if (m.includes('a05') || m.includes('a04') || m.includes('a03')) {
    base = 75;
  } else if (m.includes('tab s9')) {
    base = 420;
  } else if (m.includes('tab s8')) {
    base = 310;
  } else if (m.includes('tab s7') || m.includes('galaxy tab')) {
    base = 190;
  } else if (m.includes('galaxy') || m.includes('samsung')) {
    base = 240;
  }
  // Google Pixel
  else if (m.includes('pixel 9 pro xl')) {
    base = 620;
  } else if (m.includes('pixel 9 pro')) {
    base = 540;
  } else if (m.includes('pixel 9')) {
    base = 420;
  } else if (m.includes('pixel 8 pro')) {
    base = 390;
  } else if (m.includes('pixel 8')) {
    base = 290;
  } else if (m.includes('pixel 7 pro')) {
    base = 260;
  } else if (m.includes('pixel 7')) {
    base = 190;
  } else if (m.includes('pixel 6')) {
    base = 140;
  } else if (m.includes('pixel')) {
    base = 170;
  }
  // Motorola
  else if (m.includes('razr')) {
    base = 340;
  } else if (m.includes('edge 50') || m.includes('edge 40') || m.includes('edge+')) {
    base = 240;
  } else if (m.includes('moto g') || m.includes('motorola')) {
    base = 95;
  }
  // Xiaomi / Redmi / POCO
  else if (m.includes('xiaomi 14') || m.includes('xiaomi 13')) {
    base = 380;
  } else if (m.includes('poco f') || m.includes('poco x')) {
    base = 210;
  } else if (m.includes('redmi note')) {
    base = 160;
  } else if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
    base = 140;
  }
  // OnePlus
  else if (m.includes('oneplus 12') || m.includes('oneplus open')) {
    base = 460;
  } else if (m.includes('oneplus 11') || m.includes('oneplus 10')) {
    base = 290;
  } else if (m.includes('oneplus')) {
    base = 220;
  }
  // Generic Keyword Fallbacks
  else if (/ultra|pro max/i.test(m)) {
    base = 520;
  } else if (/pro|plus|max|fold/i.test(m)) {
    base = 360;
  } else if (/flip|mini/i.test(m)) {
    base = 220;
  }

  // Adjust for cosmetic condition / Grade
  let gradeMultiplier = 1.0;
  if (g.includes('A+') || g.includes('DNA') || g.includes('AA+')) {
    gradeMultiplier = 1.05;
  } else if (g.includes('A')) {
    gradeMultiplier = 1.0;
  } else if (g.includes('B+') || g.includes('DNB') || g.includes('B')) {
    gradeMultiplier = 0.88;
  } else if (g.includes('C+') || g.includes('DNC') || g.includes('C')) {
    gradeMultiplier = 0.74;
  } else if (g.includes('D') || g.includes('DND')) {
    gradeMultiplier = 0.60;
  }

  return Math.max(50, Math.round(base * gradeMultiplier));
}
