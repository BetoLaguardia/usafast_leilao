/**
 * Service to fetch official live USD/BRL rate (PTAX Banco Central / Dólar Comercial)
 */

export interface PtaxFetchResult {
  rate: number;
  isOnline: boolean;
  source: string;
  lastUpdated: string;
}

export async function fetchLivePtaxRate(): Promise<PtaxFetchResult> {
  // 1. Try AwesomeAPI (Real-time Bacen USD/BRL)
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.USDBRL && data.USDBRL.bid) {
        const rate = parseFloat(data.USDBRL.bid);
        if (!isNaN(rate) && rate > 0) {
          const formattedTime = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          return {
            rate: Math.round(rate * 100) / 100,
            isOnline: true,
            source: 'Banco Central do Brasil (PTAX / Comercial)',
            lastUpdated: formattedTime
          };
        }
      }
    }
  } catch (err) {
    console.warn('AwesomeAPI fetch failed, trying secondary API...', err);
  }

  // 2. Try ExchangeRate-API fallback
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.BRL) {
        const rate = parseFloat(data.rates.BRL);
        if (!isNaN(rate) && rate > 0) {
          const formattedTime = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          return {
            rate: Math.round(rate * 100) / 100,
            isOnline: true,
            source: 'Cotação Internacional USD/BRL',
            lastUpdated: formattedTime
          };
        }
      }
    }
  } catch (err) {
    console.warn('ExchangeRate API fetch failed', err);
  }

  // 3. Fallback
  return {
    rate: 5.75,
    isOnline: false,
    source: 'Cotação Padrão (Offline)',
    lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}
