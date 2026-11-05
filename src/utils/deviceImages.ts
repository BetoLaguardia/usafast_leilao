// Banco de dados de imagens reais por marca e modelo para importação automática de lotes

export function getDeviceImageUrl(make?: string, model?: string, deviceType?: string): string {
  const m = `${make || ''} ${model || ''} ${deviceType || ''}`.toLowerCase();

  // MacBooks
  if (m.includes('macbook')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80';
  }

  // Apple Watch
  if (m.includes('watch')) {
    return 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80';
  }

  // iPad
  if (m.includes('ipad') || m.includes('tablet')) {
    return 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80';
  }

  // iPhone 16 Series
  if (m.includes('16 pro')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg';
  }
  if (m.includes('16')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg';
  }

  // iPhone 15 Series
  if (m.includes('15 pro')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg';
  }
  if (m.includes('15')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg';
  }

  // iPhone 14 Series
  if (m.includes('14 pro')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg';
  }
  if (m.includes('14')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg';
  }

  // iPhone 13 Series
  if (m.includes('13 pro')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro-max.jpg';
  }
  if (m.includes('13')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg';
  }

  // iPhone 12 / 11 / SE
  if (m.includes('12')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro-max-.jpg';
  }
  if (m.includes('11')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11-pro-max-.jpg';
  }
  if (m.includes('se')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-se-2022.jpg';
  }

  // Samsung Galaxy
  if (m.includes('s24')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928-stylus.jpg';
  }
  if (m.includes('s23')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg';
  }
  if (m.includes('s22')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-ultra-5g.jpg';
  }
  if (m.includes('fold')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5-5g.jpg';
  }
  if (m.includes('flip')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5-5g.jpg';
  }
  if (m.includes('samsung') || m.includes('galaxy')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg';
  }

  // Google Pixel
  if (m.includes('pixel 9')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-xl.jpg';
  }
  if (m.includes('pixel 8')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg';
  }
  if (m.includes('pixel')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-7-pro.jpg';
  }

  // Motorola
  if (m.includes('razr')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/motorola-razr-50-ultra.jpg';
  }
  if (m.includes('motorola') || m.includes('moto')) {
    return 'https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-pro.jpg';
  }

  return '/images/iphone_16_pro_max_grade_a_1793849011033.jpg';
}
