/* MIAMI FLAP — konfiguracja kampanii. Wszystko, co klient może chcieć zmienić bez dotykania kodu gry. */
window.CONFIG = {
  title: 'MIAMI FLAP',                       // tytuł roboczy
  landingUrl: 'https://gamatis.com',         // dokąd prowadzi QR i przycisk CTA
  landingLabel: 'GAMATIS.COM',
  tagline: ['Zgubiłam swoje diamondsy!', 'Pomożesz mi je znaleźć?'],   // ekran startowy
  bottleName: 'Dolarsowo 0.0%',              // nazwa butelki w legendzie (produkt bezalkoholowy)
  // QR 21×21 (wersja 1, korekcja M) dla "HTTPS://GAMATIS.COM". Po zmianie adresu wygeneruj nowy: tools/make_qr.py
  qr: [
    '111111101111101111111',
    '100000100110101000001',
    '101110101011001011101',
    '101110100100001011101',
    '101110100111101011101',
    '100000101010001000001',
    '111111101010101111111',
    '000000000010000000000',
    '101000110101100100101',
    '100111011010011110101',
    '110010100001001011010',
    '001101001101000011010',
    '001100110110101101011',
    '000000001000010101011',
    '111111101100111000110',
    '100000100001101011010',
    '101110100011110111110',
    '101110100100111101000',
    '101110101011110001011',
    '100000100001101100001',
    '111111101011011000011'
  ],
  prizes: {
    main: 'Wyjazd do Miami lub gotówka',
    mainCta: 'wyjazd do Miami lub gotówkę',   // biernik: „powalcz o …”
    side: ['Czapki z daszkiem', 'Torebki na prosecco']
  },
  // Grafika kampanii na billboardach (proporcje 2:1). Pojawia się na co drugim billboardzie; null = same hasła.
  billboardImage: 'assets/img/billboard.jpg',
  billboardImageEvery: 2,
  // Billboardy z hasłami (mix łagodnych i ostrzejszych). Tekst wielkimi literami, zawijany automatycznie.
  billboards: [
    'MNIEJ DRAMY, WIĘCEJ MIAMI.',
    'PLOTKI NIE PŁACĄ RACHUNKÓW.',
    'DYM OPADA. DIAMENTY ZOSTAJĄ.',
    'NIE ZAZDROŚĆ. LEĆ.',
    'MÓWIĄ O MNIE? NIECH MÓWIĄ GŁOŚNIEJ.',
    'BOGATA Z WYBORU. OBGADANA Z ZAZDROŚCI.',
    'KTO PYTA, CZY WYPADA, TEN NIE LECI.',
    'TWOJA OPINIA? NIE ZAMAWIAŁAM.'
  ],
  // Etapy: co 12 bramek zmienia się pora dnia i rośnie prędkość. Powyżej 4. etapu motywy idą w kółko.
  stages: ['SOUTH BEACH', 'OCEAN DRIVE', 'NEON NIGHT', 'AFTER PARTY'],
  // Skiny: odblokowują się po dotarciu do danego etapu (zapamiętywane w przeglądarce).
  skins: [
    { id: 'classic', name: 'CLASSIC PINK', stage: 1, pal: {} },
    { id: 'ocean',   name: 'OCEAN DRIVE',  stage: 2, pal: { P: '#35D6E0', p: '#1CA3B5' }, shades: true },
    { id: 'neon',    name: 'NEON NIGHT',   stage: 3, pal: { P: '#8A3BFF', p: '#5A1FC2', W: '#39F0FF', H: '#FFE27A', h: '#FF74B4' } },
    { id: 'gold',    name: 'GOLD RUSH',    stage: 4, pal: { P: '#FFD447', p: '#D99A1E', W: '#FFF2B0' }, shades: true }
  ],
  // Formularz: w wersji testowej nic nie jest wysyłane na serwer — dane lecą tylko przez postMessage do strony-rodzica.
  entryEndpoint: null
};
