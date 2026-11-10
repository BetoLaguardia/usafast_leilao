export type Language = 'pt' | 'es' | 'en';

export interface Translations {
  home: string;
  auctions: string;
  grading: string;
  aboutUs: string;
  clientPanel: string;
  adminPanel: string;
  accessSystem: string;
  registerSystem: string;
  placeBids: string;
  logout: string;
  hello: string;
  allAuctions: string;
  searchPlaceholder: string;
  sortLabel: string;
  endingSoon: string;
  highestProfit: string;
  lowestPrice: string;
  highestPrice: string;
  mostBids: string;
  auctionFilter: string;
  gradeFilter: string;
  capacityFilter: string;
  allAuctionsFilter: string;
  allGradesFilter: string;
  allCapacitiesFilter: string;
  clearFilters: string;
  bidNow: string;
  currentBid: string;
  grossProfit: string;
  viewManifest: string;
  bidsCount: string;
  verizonBadge: string;
  assurantBadge: string;
  disputeStatus: string;
  winning: string;
  outbid: string;
  accepted: string;
  inReview: string;
  counterOffer: string;
  rejected: string;
  coverBid: string;
  accept: string;
  increase: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  pt: {
    home: 'Início',
    auctions: 'Leilões',
    grading: 'Gradeamento',
    aboutUs: 'Quem Somos',
    clientPanel: 'Painel do Cliente',
    adminPanel: 'Painel Admin',
    accessSystem: 'Acessar Sistema de Leilões',
    registerSystem: 'Cadastrar no Sistema',
    placeBids: 'Dar Lances',
    logout: 'Sair',
    hello: 'Olá',
    allAuctions: 'Lotes de iPhones Disponíveis para Arrematação',
    searchPlaceholder: 'Buscar por modelo, lote, cor ou cidade dos EUA...',
    sortLabel: 'Ordenar:',
    endingSoon: 'Terminando Logo',
    highestProfit: 'Maior Lucro Estimado',
    lowestPrice: 'Menor Lance Atual',
    highestPrice: 'Maior Lance Atual',
    mostBids: 'Mais Disputados',
    auctionFilter: 'Leilão:',
    gradeFilter: 'Grade:',
    capacityFilter: 'Capacidade:',
    allAuctionsFilter: 'Todos os Leilões',
    allGradesFilter: 'Todas',
    allCapacitiesFilter: 'Todas',
    clearFilters: 'Limpar filtros',
    bidNow: 'Dar Lance',
    currentBid: 'Lance Atual:',
    grossProfit: 'Lucro Bruto Est.:',
    viewManifest: 'Ver Manifesto',
    bidsCount: 'lances dados',
    verizonBadge: 'Verizon',
    assurantBadge: 'Assurant',
    disputeStatus: 'Situação da Disputa',
    winning: 'Maior Lance (Você está ganhando)',
    outbid: 'Lance Superado',
    accepted: 'Oferta Aceita (Arrematado)',
    inReview: 'Em Análise pela Diretoria',
    counterOffer: 'Contra-Oferta',
    rejected: 'Oferta Recusada',
    coverBid: 'Cobrir Lance',
    accept: 'Aceitar',
    increase: 'Aumentar'
  },
  es: {
    home: 'Inicio',
    auctions: 'Subastas',
    grading: 'Clasificación',
    aboutUs: 'Quiénes Somos',
    clientPanel: 'Panel del Cliente',
    adminPanel: 'Panel Admin',
    accessSystem: 'Acceder al Sistema de Subastas',
    registerSystem: 'Registrarse en el Sistema',
    placeBids: 'Pujar',
    logout: 'Salir',
    hello: 'Hola',
    allAuctions: 'Lotes de iPhones Disponibles para Puja',
    searchPlaceholder: 'Buscar por modelo, lote, color o ciudad de EE. UU...',
    sortLabel: 'Ordenar:',
    endingSoon: 'Termina Pronto',
    highestProfit: 'Mayor Ganancia Estimada',
    lowestPrice: 'Oferta Más Baja',
    highestPrice: 'Oferta Más Alta',
    mostBids: 'Más Disputados',
    auctionFilter: 'Subasta:',
    gradeFilter: 'Grado:',
    capacityFilter: 'Capacidad:',
    allAuctionsFilter: 'Todas las Subastas',
    allGradesFilter: 'Todas',
    allCapacitiesFilter: 'Todas',
    clearFilters: 'Limpiar filtros',
    bidNow: 'Pujar',
    currentBid: 'Oferta Actual:',
    grossProfit: 'Ganancia Est.:',
    viewManifest: 'Ver Manifiesto',
    bidsCount: 'pujas realizadas',
    verizonBadge: 'Verizon',
    assurantBadge: 'Assurant',
    disputeStatus: 'Estado de la Puja',
    winning: 'Mayor Oferta (Vas Ganando)',
    outbid: 'Oferta Superada',
    accepted: 'Oferta Aceptada (Adjudicado)',
    inReview: 'En Revisión por la Directiva',
    counterOffer: 'Contraoferta',
    rejected: 'Oferta Rechazada',
    coverBid: 'Cubrir Oferta',
    accept: 'Aceptar',
    increase: 'Aumentar'
  },
  en: {
    home: 'Home',
    auctions: 'Auctions',
    grading: 'Grading',
    aboutUs: 'About Us',
    clientPanel: 'Client Panel',
    adminPanel: 'Admin Panel',
    accessSystem: 'Access Auction System',
    registerSystem: 'Register in System',
    placeBids: 'Place Bids',
    logout: 'Log out',
    hello: 'Hello',
    allAuctions: 'iPhone Wholesale Lots Available for Bidding',
    searchPlaceholder: 'Search by model, lot, color, or US city...',
    sortLabel: 'Sort by:',
    endingSoon: 'Ending Soon',
    highestProfit: 'Highest Estimated Profit',
    lowestPrice: 'Lowest Current Bid',
    highestPrice: 'Highest Current Bid',
    mostBids: 'Most Bids',
    auctionFilter: 'Auction:',
    gradeFilter: 'Grade:',
    capacityFilter: 'Capacity:',
    allAuctionsFilter: 'All Auctions',
    allGradesFilter: 'All',
    allCapacitiesFilter: 'All',
    clearFilters: 'Clear filters',
    bidNow: 'Place Bid',
    currentBid: 'Current Bid:',
    grossProfit: 'Est. Gross Profit:',
    viewManifest: 'View Manifest',
    bidsCount: 'bids placed',
    verizonBadge: 'Verizon',
    assurantBadge: 'Assurant',
    disputeStatus: 'Dispute Status',
    winning: 'Highest Bid (You are winning)',
    outbid: 'Outbid',
    accepted: 'Bid Accepted (Won)',
    inReview: 'Under Review',
    counterOffer: 'Counter-Offer',
    rejected: 'Bid Declined',
    coverBid: 'Outbid / Cover Bid',
    accept: 'Accept',
    increase: 'Increase'
  }
};
