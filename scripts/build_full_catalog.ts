import fs from 'fs';
import path from 'path';
import { getDeviceImageUrl, stripLotPrefix } from '../src/utils/deviceImages';
import { INITIAL_AUCTIONS } from '../src/data/auctionsData';
import { AuctionLot, GradeType } from '../src/types/auction';

// Helper to clean model & title
function cleanTitle(str: string): string {
  if (!str) return '';
  return stripLotPrefix(str)
    .replace(/^Apple\s+/i, '')
    .replace(/^Samsung\s+/i, '')
    .trim();
}

function mapVerizonGrade(raw: string): GradeType {
  const g = String(raw || '').trim().toUpperCase();
  if (g.includes('DND') || g.includes('D(T)') || g.includes('D+(T)') || g.includes('GRADE D') || (g.includes('D') && !g.includes('DNA') && !g.includes('DNB') && !g.includes('DNC'))) {
    return 'DND';
  }
  if (g.includes('DNC') || g.includes('C(T)') || g.includes('C+(T)') || g.includes('GRADE C') || g.includes('C+') || (g.includes('C') && !g.includes('DNA') && !g.includes('DNB'))) {
    return 'DNC';
  }
  if (g.includes('DNB') || g.includes('B(T)') || g.includes('B+(T)') || g.includes('GRADE B') || g.includes('B+') || (g.includes('B') && !g.includes('DNA') && !g.includes('DNC'))) {
    return 'DNB';
  }
  if (g.includes('DNA') || g.includes('A(T)') || g.includes('A+(T)') || g.includes('GRADE A') || g.includes('A+')) {
    return 'DNA';
  }
  return 'DNA';
}

function parsePrice(rawVal: any): number {
  if (typeof rawVal === 'number') {
    if (rawVal > 10000 && Number.isInteger(rawVal)) {
      return Math.round((rawVal / 100) * 100) / 100;
    }
    return rawVal;
  }
  const str = String(rawVal || '').replace(/[^0-9.,]/g, '').trim();
  if (!str) return 0;
  const num = parseFloat(str.replace(/,/g, ''));
  if (num > 10000) {
    return Math.round(num / 100);
  }
  return num || 0;
}

const allLots: AuctionLot[] = [];
const seenKeys = new Set<string>();

// 1. First add initial curated lots (high quality)
INITIAL_AUCTIONS.forEach(lot => {
  const key = `${lot.sourceType}-${lot.lotNumber}`;
  seenKeys.add(key);
  allLots.push(lot);
});

// 2. Parse Verizon Official CSV
try {
  const vzPath = path.join(process.cwd(), 'public/assets/aistudio/verizon_listings_official.csv');
  if (fs.existsSync(vzPath)) {
    const vzRaw = fs.readFileSync(vzPath, 'utf8');
    const vzLines = vzRaw.split('\n').filter(Boolean);
    const header = vzLines[0].split(',').map(h => h.trim());
    const lotIdx = header.indexOf('Lot #');
    const titleIdx = header.indexOf('Title');
    const qtyIdx = header.indexOf('Qty');
    const oemIdx = header.indexOf('OEM');
    const modelIdx = header.indexOf('Model');
    const gradeIdx = header.indexOf('Grade');
    const capIdx = header.indexOf('Capacity');
    const colorIdx = header.indexOf('Color');
    const urlIdx = header.indexOf('URL');
    const itemDescIdx = header.indexOf('Item Description');

    const vzGroups = new Map<string, any>();

    for (let i = 1; i < vzLines.length; i++) {
      const parts = vzLines[i].split(',');
      if (parts.length < 5) continue;
      const lotNum = (parts[lotIdx] || `VZ-${i}`).trim();
      const oem = (parts[oemIdx] || 'Apple').trim();
      const model = (parts[modelIdx] || 'Smartphone').trim();
      const gradeRaw = (parts[gradeIdx] || 'C(T)').trim();
      const cap = (parts[capIdx] || '128GB').trim();
      const color = (parts[colorIdx] || 'Black').trim();
      const qty = parseInt(parts[qtyIdx], 10) || 1;
      const url = (parts[urlIdx] || '').trim();
      const title = (parts[titleIdx] || `${oem} ${model}`).trim();

      if (!vzGroups.has(lotNum)) {
        vzGroups.set(lotNum, {
          lotNum,
          oem,
          model,
          gradeRaw,
          cap,
          color,
          totalQty: 0,
          url,
          title,
          items: []
        });
      }
      const g = vzGroups.get(lotNum);
      g.totalQty += qty;
      g.items.push({
        model,
        storage: cap,
        color,
        grade: mapVerizonGrade(gradeRaw),
        qty,
        itemDesc: parts[itemDescIdx] || ''
      });
    }

    let vzCount = 0;
    for (const [lotNum, g] of vzGroups.entries()) {
      const key = `VERIZON-${lotNum}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const mappedGrade = mapVerizonGrade(g.gradeRaw);
      const isSamsung = /samsung|galaxy|fold|flip/i.test(g.model) || /samsung/i.test(g.oem);
      const isApple = /iphone|apple/i.test(g.model) || /apple/i.test(g.oem);
      const isPremium = /fold|ultra|pro max/i.test(g.model);
      const isBudget = /a1|a2|a0/i.test(g.model);
      const unitRate = isPremium ? 135 : isBudget ? 55 : 85;
      const currentBidUsd = Math.max(120, Math.round(g.totalQty * unitRate));
      const startingBidUsd = Math.round(currentBidUsd * 0.75);
      const estimatedBrazilRetailBrl = Math.round(currentBidUsd * 5.6 * 1.55);

      const imageUrl = isSamsung
        ? getDeviceImageUrl('Samsung', g.model, 'Phone')
        : getDeviceImageUrl(g.oem, g.model, isApple ? 'iPhone' : 'Phone');

      const cleanModelTitle = `${g.totalQty}x ${g.oem} ${g.model} ${g.cap} - Grade ${mappedGrade}`;

      allLots.push({
        id: `vz-lot-${lotNum}`,
        lotNumber: lotNum,
        title: cleanModelTitle,
        modelFamily: g.model,
        oemBrand: g.oem,
        quantity: g.totalQty,
        grade: mappedGrade,
        primaryStorage: g.cap,
        colorHighlights: [g.color || 'Preto'],
        batteryHealthRange: '85% - 98% (Testado Verizon)',
        carrierStatus: 'Verizon Clean / Desbloqueado Global',
        imeiStatus: 'Clean ESN / 100% Verificado',
        auctionHouse: 'Verizon Wholesale Liquidation',
        location: 'Dallas, TX / Miami Logistics Hub',
        startingBidUsd,
        currentBidUsd,
        reservePriceMet: true,
        estimatedBrazilRetailBrl,
        totalBidsCount: Math.floor(Math.random() * 20) + 5,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        imageUrl,
        galleryImages: [imageUrl, '/images/iphone_lot_wholesale_inspection_1793849011081.jpg'],
        description: `Lote oficial atacado Verizon (${lotNum}) contendo ${g.totalQty} unidades de ${g.oem} ${g.model}. Diagnóstico Verizon 100% testado, Clean ESN e telas originais.`,
        diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
        manifest: g.items.map((it: any, idx: number) => ({
          id: `man-vz-${lotNum}-${idx}`,
          model: it.model,
          storage: it.storage,
          color: it.color,
          grade: it.grade,
          batteryHealth: 85 + (idx % 14),
          imeiMasked: `359820******${String(100 + (idx * 17) % 899)}`,
          carrierStatus: 'Verizon Clean / Unlocked',
          icloudStatus: 'Clean / FMI OFF',
          screenCondition: `Conforme Grade Verizon ${it.grade}`,
          housingCondition: `Conforme Grade Verizon ${it.grade}`,
          qty: it.qty
        })),
        bidsHistory: [
          { id: `bid-vz-${lotNum}-1`, bidderName: 'Licitante EUA Oficial', amountUsd: currentBidUsd, timestamp: 'Início do Leilão' }
        ],
        sourceType: 'VERIZON'
      });
      vzCount++;
    }
    console.log(`[Build] Added ${vzCount} Verizon lots.`);
  }
} catch (e) {
  console.error('Error reading Verizon CSV:', e);
}

// 3. Parse Stock Apple CSV (Stock_List_Filtered_11052026_cd908cec.csv)
try {
  const stockPath = path.join(process.cwd(), 'public/assets/aistudio/Stock_List_Filtered_11052026_cd908cec.csv');
  if (fs.existsSync(stockPath)) {
    const stockRaw = fs.readFileSync(stockPath, 'utf8');
    const lines = stockRaw.split('\n');
    let headerIdx = -1;
    for (let i = 0; i < 20; i++) {
      if (lines[i] && lines[i].includes('Item #')) { headerIdx = i; break; }
    }
    const headers = lines[headerIdx].split(';').map(h => h.trim());
    const makeIdx = headers.indexOf('Make');
    const modelIdx = headers.indexOf('Model');
    const lockIdx = headers.indexOf('Lock Status');
    const capIdx = headers.indexOf('Capacity');
    const gradeIdx = headers.indexOf('Grade');
    const catIdx = headers.indexOf('Category');
    const qtyIdx = headers.indexOf('Available Quantity');
    const priceIdx = headers.indexOf('List Price');
    const colorIdx = headers.indexOf('Color');
    const descIdx = headers.indexOf('Description');
    const itemNumIdx = headers.indexOf('Item #');

    const stockGroups = new Map<string, any>();

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 10) continue;
      const make = (parts[makeIdx] || '').trim();
      const model = (parts[modelIdx] || '').trim();
      const lock = (parts[lockIdx] || '').trim();
      const cap = (parts[capIdx] || '128GB').trim();
      const gradeRaw = (parts[gradeIdx] || 'Grade A').trim();
      const cat = (parts[catIdx] || '').trim();
      const qty = parseInt(parts[qtyIdx], 10) || 1;
      const price = parsePrice(parts[priceIdx]);
      const color = (parts[colorIdx] || 'Space Gray').trim();
      const itemNum = (parts[itemNumIdx] || `ITM-${i}`).trim();

      if (make.toLowerCase() !== 'apple' || lock.toLowerCase() !== 'unlocked' || !model) {
        continue;
      }

      // Group by Model + Capacity + Grade
      const groupKey = `${model} | ${cap} | ${gradeRaw}`;
      if (!stockGroups.has(groupKey)) {
        stockGroups.set(groupKey, {
          model,
          cap,
          gradeRaw,
          cat,
          totalQty: 0,
          totalPriceSum: 0,
          colors: new Set<string>(),
          items: []
        });
      }

      const g = stockGroups.get(groupKey);
      g.totalQty += qty;
      g.totalPriceSum += (price * qty);
      if (color) g.colors.add(color);
      if (g.items.length < 30) {
        g.items.push({
          itemNum,
          model,
          storage: cap,
          color,
          grade: gradeRaw,
          price,
          qty
        });
      }
    }

    let stockLotsAdded = 0;
    for (const [groupKey, g] of stockGroups.entries()) {
      const avgUnitUsd = g.totalQty > 0 ? Math.round(g.totalPriceSum / g.totalQty) : 250;
      if (avgUnitUsd <= 0) continue;

      const lotNum = `UF-APL-${1000 + stockLotsAdded}`;
      const key = `STOCK_APPLE-${groupKey}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const isTablet = /ipad|tablet/i.test(g.model) || /tablet/i.test(g.cat);
      const isWatch = /watch/i.test(g.model) || /wearable/i.test(g.cat);
      const deviceType = isTablet ? 'iPad' : isWatch ? 'Apple Watch' : 'iPhone';
      const imageUrl = getDeviceImageUrl('Apple', g.model, deviceType);

      // Map Grade
      let standardGrade: GradeType = 'Grade A';
      const gr = g.gradeRaw.toUpperCase();
      if (gr.includes('NEW') || gr.includes('MINT') || gr.includes('A+')) standardGrade = 'Grade A+';
      else if (gr.includes('B+') || gr.includes(' B ') || gr.includes('B1') || gr.includes('VERY GOOD')) standardGrade = 'Grade B';
      else if (gr.includes('C') || gr.includes('GOOD')) standardGrade = 'Grade C';
      else standardGrade = 'Grade A';

      const currentBidUsd = avgUnitUsd;
      const startingBidUsd = Math.round(currentBidUsd * 0.85);
      const estimatedBrazilRetailBrl = Math.round(currentBidUsd * 5.6 * 1.6);

      const title = `${g.totalQty > 1 ? `${g.totalQty}x ` : ''}Apple ${g.model} ${g.cap} - Grade ${g.gradeRaw} (Desbloqueado)`;

      allLots.push({
        id: `stock-lot-${lotNum.toLowerCase()}`,
        lotNumber: lotNum,
        title,
        modelFamily: g.model,
        oemBrand: 'Apple',
        quantity: g.totalQty,
        grade: standardGrade,
        primaryStorage: g.cap,
        colorHighlights: Array.from(g.colors).slice(0, 4),
        batteryHealthRange: '88% - 100% (Testado Apple)',
        carrierStatus: '100% Factory Unlocked (Global)',
        imeiStatus: 'Clean ESN / 100% Verificado',
        auctionHouse: 'USAFAST Stock Hub',
        location: 'Miami Hub - Armazém W23',
        startingBidUsd,
        currentBidUsd,
        reservePriceMet: true,
        estimatedBrazilRetailBrl,
        totalBidsCount: Math.floor(Math.random() * 15) + 3,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        imageUrl,
        galleryImages: [imageUrl, '/images/iphone_lot_wholesale_inspection_1793849011081.jpg'],
        description: `Lote oficial de atacado Apple Desbloqueado contendo ${g.totalQty} aparelho(s) (${g.model} ${g.cap}). Classificação técnica ${g.gradeRaw}. 100% desbloqueado de fábrica e auditado pelo hub USAFAST.`,
        diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
        manifest: g.items.map((it: any, idx: number) => ({
          id: `man-apl-${lotNum}-${idx}`,
          model: it.model,
          storage: it.storage,
          color: it.color,
          grade: it.grade,
          batteryHealth: 88 + (idx % 12),
          imeiMasked: `359820******${String(100 + (idx * 23) % 899)}`,
          carrierStatus: '100% Desbloqueado (Global Unlocked)',
          icloudStatus: 'Clean / FMI OFF',
          screenCondition: `Conforme Grade ${it.grade}`,
          housingCondition: `Conforme Grade ${it.grade}`,
          qty: it.qty
        })),
        bidsHistory: [
          { id: `bid-apl-${lotNum}-1`, bidderName: 'Licitante Inicial Hub', amountUsd: currentBidUsd, timestamp: 'Início do Leilão' }
        ],
        sourceType: 'STOCK_APPLE'
      });
      stockLotsAdded++;
    }
    console.log(`[Build] Added ${stockLotsAdded} Stock Apple lots.`);
  }
} catch (e) {
  console.error('Error reading Stock Apple CSV:', e);
}

// 4. Parse Marketplace 1 (Mannapov) CSV
try {
  const mPath = path.join(process.cwd(), 'public/assets/aistudio/Mannapov_-_StockList1105_4667a37f.csv');
  if (fs.existsSync(mPath)) {
    const mRaw = fs.readFileSync(mPath, 'utf8');
    const lines = mRaw.split('\n');
    let headerIdx = -1;
    for (let i = 0; i < 20; i++) {
      if (lines[i] && lines[i].includes('Item #')) { headerIdx = i; break; }
    }
    if (headerIdx !== -1) {
      const headers = lines[headerIdx].split(';').map(h => h.trim());
      const modelIdx = headers.indexOf('Model');
      const capIdx = headers.indexOf('Memory') !== -1 ? headers.indexOf('Memory') : headers.indexOf('Capacity');
      const gradeIdx = headers.indexOf('Grade');
      const priceIdx = headers.indexOf('List Price');
      const qtyIdx = headers.indexOf('Quantity Available');
      const makeIdx = headers.indexOf('Manufacturer');
      const colorIdx = headers.indexOf('Color');

      const mGroups = new Map<string, any>();
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 8) continue;
        const model = (parts[modelIdx] || '').trim();
        const make = (parts[makeIdx] || 'Apple').trim();
        const cap = (parts[capIdx] || '128GB').trim();
        const gradeRaw = (parts[gradeIdx] || 'Grade A').trim();
        const price = parsePrice(parts[priceIdx]);
        const qty = parseInt(parts[qtyIdx], 10) || 1;
        const color = (parts[colorIdx] || 'Black').trim();

        if (!model || price <= 0) continue;
        const groupKey = `${model} | ${cap} | ${gradeRaw}`;
        if (!mGroups.has(groupKey)) {
          mGroups.set(groupKey, { model, make, cap, gradeRaw, totalQty: 0, totalPriceSum: 0, colors: new Set([color]) });
        }
        const g = mGroups.get(groupKey);
        g.totalQty += qty;
        g.totalPriceSum += (price * qty);
        if (color) g.colors.add(color);
      }

      let mkt1Added = 0;
      for (const [groupKey, g] of mGroups.entries()) {
        const avgPrice = Math.round(g.totalPriceSum / g.totalQty);
        if (avgPrice <= 0) continue;
        const lotNum = `MKT1-${2000 + mkt1Added}`;
        const key = `MKT1-${groupKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const imageUrl = getDeviceImageUrl(g.make, g.model, /ipad/i.test(g.model) ? 'iPad' : /watch/i.test(g.model) ? 'Apple Watch' : /macbook/i.test(g.model) ? 'MacBook' : 'iPhone');
        allLots.push({
          id: `mkt1-lot-${lotNum.toLowerCase()}`,
          lotNumber: lotNum,
          title: `${g.totalQty > 1 ? `${g.totalQty}x ` : ''}${g.make} ${g.model} ${g.cap} - Grade ${g.gradeRaw}`,
          modelFamily: g.model,
          oemBrand: g.make,
          quantity: g.totalQty,
          grade: 'Grade A',
          primaryStorage: g.cap,
          colorHighlights: Array.from(g.colors).slice(0, 3),
          batteryHealthRange: '88% - 100%',
          carrierStatus: 'Desbloqueado Global',
          imeiStatus: 'Clean ESN / Verificado',
          auctionHouse: 'Marketplace 1 Hub',
          location: 'Miami Hub - Marketplace 1',
          startingBidUsd: Math.round(avgPrice * 0.85),
          currentBidUsd: avgPrice,
          reservePriceMet: true,
          estimatedBrazilRetailBrl: Math.round(avgPrice * 5.6 * 1.55),
          totalBidsCount: Math.floor(Math.random() * 10) + 2,
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          imageUrl,
          galleryImages: [imageUrl],
          description: `Lote Marketplace 1 contendo ${g.totalQty}x ${g.model} ${g.cap}. Grade ${g.gradeRaw}.`,
          diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
          manifest: [],
          bidsHistory: [{ id: `bid-m1-${lotNum}`, bidderName: 'Licitante Hub MKT1', amountUsd: avgPrice, timestamp: 'Início' }],
          sourceType: 'MARKETPLACE_1'
        });
        mkt1Added++;
      }
      console.log(`[Build] Added ${mkt1Added} Marketplace 1 lots.`);
    }
  }
} catch (e) {
  console.error('Error reading Mannapov CSV:', e);
}

// 5. Parse Marketplace 2 (RecirQ Global) CSV
try {
  const rPath = path.join(process.cwd(), 'public/assets/aistudio/RecirQ_Global_-_StockList1105_95d9e1bd.csv');
  if (fs.existsSync(rPath)) {
    const rRaw = fs.readFileSync(rPath, 'utf8');
    const lines = rRaw.split('\n');
    let headerIdx = -1;
    for (let i = 0; i < 20; i++) {
      if (lines[i] && lines[i].includes('Item #')) { headerIdx = i; break; }
    }
    if (headerIdx !== -1) {
      const headers = lines[headerIdx].split(';').map(h => h.trim());
      const modelIdx = headers.indexOf('Model');
      const capIdx = headers.indexOf('Capacity');
      const gradeIdx = headers.indexOf('Grade');
      const priceIdx = headers.indexOf('List Price');
      const qtyIdx = headers.indexOf('Quantity Available');
      const makeIdx = headers.indexOf('Manufacturer');
      const colorIdx = headers.indexOf('Color');

      const rGroups = new Map<string, any>();
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 8) continue;
        const model = (parts[modelIdx] || '').trim();
        const make = (parts[makeIdx] || 'Apple').trim();
        const cap = (parts[capIdx] || '128GB').trim();
        const gradeRaw = (parts[gradeIdx] || 'Grade A').trim();
        const price = parsePrice(parts[priceIdx]);
        const qty = parseInt(parts[qtyIdx], 10) || 1;
        const color = (parts[colorIdx] || 'Black').trim();

        if (!model || price <= 0) continue;
        const groupKey = `${model} | ${cap} | ${gradeRaw}`;
        if (!rGroups.has(groupKey)) {
          rGroups.set(groupKey, { model, make, cap, gradeRaw, totalQty: 0, totalPriceSum: 0, colors: new Set([color]) });
        }
        const g = rGroups.get(groupKey);
        g.totalQty += qty;
        g.totalPriceSum += (price * qty);
        if (color) g.colors.add(color);
      }

      let mkt2Added = 0;
      for (const [groupKey, g] of rGroups.entries()) {
        const avgPrice = Math.round(g.totalPriceSum / g.totalQty);
        if (avgPrice <= 0) continue;
        const lotNum = `MKT2-${3000 + mkt2Added}`;
        const key = `MKT2-${groupKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const imageUrl = getDeviceImageUrl(g.make, g.model, 'iPhone');
        allLots.push({
          id: `mkt2-lot-${lotNum.toLowerCase()}`,
          lotNumber: lotNum,
          title: `${g.totalQty > 1 ? `${g.totalQty}x ` : ''}${g.make} ${g.model} ${g.cap} - Grade ${g.gradeRaw}`,
          modelFamily: g.model,
          oemBrand: g.make,
          quantity: g.totalQty,
          grade: 'Grade B',
          primaryStorage: g.cap,
          colorHighlights: Array.from(g.colors).slice(0, 3),
          batteryHealthRange: '86% - 96%',
          carrierStatus: 'Desbloqueado Global',
          imeiStatus: 'Clean ESN / Verificado',
          auctionHouse: 'Marketplace 2 Hub',
          location: 'Miami Hub - Marketplace 2',
          startingBidUsd: Math.round(avgPrice * 0.85),
          currentBidUsd: avgPrice,
          reservePriceMet: true,
          estimatedBrazilRetailBrl: Math.round(avgPrice * 5.6 * 1.55),
          totalBidsCount: Math.floor(Math.random() * 8) + 2,
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 50).toISOString(),
          imageUrl,
          galleryImages: [imageUrl],
          description: `Lote Marketplace 2 contendo ${g.totalQty}x ${g.model} ${g.cap}. Grade ${g.gradeRaw}.`,
          diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
          manifest: [],
          bidsHistory: [{ id: `bid-m2-${lotNum}`, bidderName: 'Licitante Hub MKT2', amountUsd: avgPrice, timestamp: 'Início' }],
          sourceType: 'MARKETPLACE_2'
        });
        mkt2Added++;
      }
      console.log(`[Build] Added ${mkt2Added} Marketplace 2 lots.`);
    }
  }
} catch (e) {
  console.error('Error reading RecirQ CSV:', e);
}

// 6. Parse Marketplace 3 (WeSell Cellular) CSV
try {
  const wPath = path.join(process.cwd(), 'public/assets/aistudio/WeSell_Cellular_-_StockList1105_0044a63d.csv');
  if (fs.existsSync(wPath)) {
    const wRaw = fs.readFileSync(wPath, 'utf8');
    const lines = wRaw.split('\n');
    let headerIdx = -1;
    for (let i = 0; i < 20; i++) {
      if (lines[i] && lines[i].includes('Item #')) { headerIdx = i; break; }
    }
    if (headerIdx !== -1) {
      const headers = lines[headerIdx].split(';').map(h => h.trim());
      const modelIdx = headers.indexOf('Model');
      const capIdx = headers.indexOf('Capacity');
      const gradeIdx = headers.indexOf('Grade');
      const priceIdx = headers.indexOf('List Price');
      const qtyIdx = headers.indexOf('Available Quantity') !== -1 ? headers.indexOf('Available Quantity') : headers.indexOf('Quantity Available');
      const makeIdx = headers.indexOf('Manufacturer');
      const colorIdx = headers.indexOf('Color');

      const wGroups = new Map<string, any>();
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 8) continue;
        const model = (parts[modelIdx] || '').trim();
        const make = (parts[makeIdx] || 'Apple').trim();
        const cap = (parts[capIdx] || '128GB').trim();
        const gradeRaw = (parts[gradeIdx] || 'Grade A').trim();
        const price = parsePrice(parts[priceIdx]);
        const qty = parseInt(parts[qtyIdx], 10) || 1;
        const color = (parts[colorIdx] || 'Black').trim();

        if (!model || price <= 0 || /generic|band|case|accessory/i.test(model)) continue;
        const groupKey = `${model} | ${cap} | ${gradeRaw}`;
        if (!wGroups.has(groupKey)) {
          wGroups.set(groupKey, { model, make, cap, gradeRaw, totalQty: 0, totalPriceSum: 0, colors: new Set([color]) });
        }
        const g = wGroups.get(groupKey);
        g.totalQty += qty;
        g.totalPriceSum += (price * qty);
        if (color) g.colors.add(color);
      }

      let mkt3Added = 0;
      for (const [groupKey, g] of wGroups.entries()) {
        const avgPrice = Math.round(g.totalPriceSum / g.totalQty);
        if (avgPrice <= 0) continue;
        const lotNum = `MKT3-${4000 + mkt3Added}`;
        const key = `MKT3-${groupKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const imageUrl = getDeviceImageUrl(g.make, g.model, 'iPhone');
        allLots.push({
          id: `mkt3-lot-${lotNum.toLowerCase()}`,
          lotNumber: lotNum,
          title: `${g.totalQty > 1 ? `${g.totalQty}x ` : ''}${g.make} ${g.model} ${g.cap} - Grade ${g.gradeRaw}`,
          modelFamily: g.model,
          oemBrand: g.make,
          quantity: g.totalQty,
          grade: 'Grade A',
          primaryStorage: g.cap,
          colorHighlights: Array.from(g.colors).slice(0, 3),
          batteryHealthRange: '88% - 98%',
          carrierStatus: 'Desbloqueado Global',
          imeiStatus: 'Clean ESN / Verificado',
          auctionHouse: 'Marketplace 3 Hub',
          location: 'Miami Hub - Marketplace 3',
          startingBidUsd: Math.round(avgPrice * 0.85),
          currentBidUsd: avgPrice,
          reservePriceMet: true,
          estimatedBrazilRetailBrl: Math.round(avgPrice * 5.6 * 1.55),
          totalBidsCount: Math.floor(Math.random() * 8) + 2,
          endTime: new Date(Date.now() + 1000 * 60 * 60 * 52).toISOString(),
          imageUrl,
          galleryImages: [imageUrl],
          description: `Lote Marketplace 3 contendo ${g.totalQty}x ${g.model} ${g.cap}. Grade ${g.gradeRaw}.`,
          diagnosticReport: { faceId: true, trueTone: true, camerasPassed: true, batteryTested: true, cleanEsn: true, mdmFree: true },
          manifest: [],
          bidsHistory: [{ id: `bid-m3-${lotNum}`, bidderName: 'Licitante Hub MKT3', amountUsd: avgPrice, timestamp: 'Início' }],
          sourceType: 'MARKETPLACE_3'
        });
        mkt3Added++;
      }
      console.log(`[Build] Added ${mkt3Added} Marketplace 3 lots.`);
    }
  }
} catch (e) {
  console.error('Error reading WeSell CSV:', e);
}

const distinctModels = Array.from(new Set(allLots.map(l => l.modelFamily))).filter(Boolean).sort();

console.log('=== CATALOG SUMMARY ===');
console.log(`Total lots in catalog: ${allLots.length}`);
console.log(`Total distinct models in catalog: ${distinctModels.length}`);
console.log('Models sample:', distinctModels);

// Write to auctions_store.json
fs.writeFileSync('auctions_store.json', JSON.stringify(allLots, null, 2), 'utf8');
console.log(`Successfully saved ${allLots.length} lots with ${distinctModels.length} distinct models to auctions_store.json!`);
