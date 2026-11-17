/* Sprite'y pixel-art jako mapy znaków (ten sam zapis, z którego powstały pliki assets/svg). */
(function () {
  'use strict';
  var PAL = {
    O: '#4A2A55', H: '#F7D56A', h: '#E2AE3F', L: '#FFF2B0', S: '#FFDCC4', s: '#F3B49A',
    E: '#3B2A4A', M: '#E8457F', P: '#FF74B4', p: '#D9488F', W: '#FFFFFF', C: '#39D5E6',
    c: '#1FA3C4', K: '#BFF4FA', G: '#3FBF6B', g: '#2A8F4E', F: '#C9F7D5', Y: '#FFD447',
    y: '#D99A1E', B: '#2F7D4F', b: '#1F5A39', D: '#8E86A6', d: '#6B6385', A: '#B9B2CC',
    a: '#D9D4E6', T: '#9BE84A', t: '#5FAE22', R: '#FF4D6D', N: '#2B1B33', V: '#B14AED', U: '#FFEAF6', u: '#F7B8DA', r: '#E0243A', q: '#A8122A'
  };
  var M = {};
  M.girlA = [
    '........OOOOOOO.........', '......OOHHLLHHHOO.......', '.....OHHLLHHHHHHHO......', '....OHHLHHHHHHHHHHO.....',
    '...OHHHHHHHHHSSSSHO.....', '..OHHHHHHHHHSSSSSSO.....', '..OHHHHHHHHSSESSESO.....', '.OHHHHHHHHHSSESSESO.....',
    '.OHHhHHHHHHSSSSSSSO.....', 'OHHhHHHHHHHsSSMMSO......', 'OHhhHHHHHOOOsSSSO.......', 'OHhHHHHHO.OPPssPO.......',
    '.OhHHHHO.OPPPPPPPOO.....', '.OHHHHO.OSOPPPPPOSSO....', '..OHHO..OSOPPPPPO.OSO...', '...OO....O.OPPPPO..O....',
    '..........OPPPPPPO......', '.........OPPPpPPPPO.....', '.........OPPpPPPpPO.....', '..........OOSOOSOO......',
    '...........OSO.OSO......', '...........OSO.OSO......', '..........OWWOOWWO......', '...........OO..OO.......'];
  M.girlB = [
    '........OOOOOOO.........', '......OOHHLLHHHOO.......', '.....OHHLLHHHHHHHO......', '....OHHLHHHHHHHHHHO.....',
    '...OHHHHHHHHHSSSSHO.....', '..OHHHHHHHHHSSSSSSO.....', '.OHHHHHHHHHSSESSESO.....', 'OHHHHHHHHHHSSESSESO.....',
    'OHHhHHHHHHHSSSSSSSO.....', '.OHhHHHHHHHsSSMMSO......', '.OHhhHHHHOOOsSSSO....O..', '..OHhHHHO.OPPssPO...OSO.',
    '...OHHHO.OPPPPPPPOOOSO..', '....OOO.OSOPPPPPOSSO....', '.......OSO.OPPPPO.......', '........O..OPPPPO.......',
    '..........OPPPPPPO......', '........OOPPPpPPPPOO....', '.......OPPPPpPPPpPPPO...', '........OOOSOOOSOOOO....',
    '..........OSO..OSO......', '.........OSO....OSO.....', '........OWWO....OWWO....', '.........OO......OO.....'];
  M.dollar = [
    '.OOOOOOOOOOOOOOOO.', 'OFFFFFFFFFFFFFFFFO', 'OFgFgFOOOOOOFgFgFO', 'OFgFFOFHHHHFOFFgFO', 'OFFFOFHHHHHHFOFFFO', 'OFFFOHHSESESHOFFFO',
    'OFFFOHHSSSSSHOFFFO', 'OFFFOHHSSMSSHOFFFO', 'OFgFFOHHSSHHOFFgFO', 'OFgFgFOOOOOOFgFgFO', 'OFFFFFFFFFFFFFFFFO', '.OOOOOOOOOOOOOOOO.'];
  M.diamond = [
    '....OOOOOOOO....', '...OKKCCCCKKO...', '..OKWKCCCCKCCO..', '.OKWKCCCCCCKCCO.', 'OOOOOOOOOOOOOOOO', 'OCCKCCCCCCCCKccO',
    '.OCCKCCCCCCKccO.', '..OCCKCCCCKccO..', '...OCCKCCKccO...', '....OCCKKccO....', '.....OCCccO.....', '......OCcO......',
    '.......OO.......'];
  M.prosecco = [
    '........OOOO........', '.......OYYYYO.......', '.......OYLYyO.......', '.......OYYYyO.......', '.......OYYyyO.......',
    '.OOOOOOOYYyyOOOOOOO.', 'OFFFFFFOrYYrOFFFFFFO', 'OFgFFgFOrYYrOFgFFgFO', 'OFFFFFFOrrrrOFFFFFFO', '.OOOOOOrrrrrrOOOOOO.',
    '......OrrrqrrrO.....', '.....OrrqrrrrqrO....', '.....OrqrrFFrrrO....', '.....OrrrqrrrqrO....', '.....OPPPPPPPPPO....',
    '.....OPWWWWWWWPO....', '.....OPPPPPPPPPO....', '.....OPWPYYYPWPO....', '.....OrqrrrrrqrO....', '.....ObbbbbbbbbO....',
    '.....ObbbbbbbbbO....', '......OOOOOOOOO.....'];
  M.bottleMini = ['..OO..', '.OYYO.', '..YY..', '.FrrF.', '.OrrO.', 'OrqrrO', 'OPPPPO', 'OPWWPO', 'OrrqrO', 'ObbbbO', '.OOOO.'];
  M.smoke = [
    '..............OOOOOO............', '...........OOOAAAAAAOO..........', '.....OOOO.OAAAaaAAAAAAO.........', '...OOAAAAOAAaaaaAAAAAAAOOOOO....',
    '..OAAaaAAAAAaaAAAAAAAAAOAAAAOO..', '.OAAaaaAAAAAAAAAADDAAAAAAaaAAAO.', '.OAAaaAAAAAAAAADDDDAAAAAaaaAAAO.', 'OAAAAAAANNAAAADDAANNAAAAAAAAAADO',
    'OAAAAAANTTNAAAAAANTTNAAAAAAAADDO', 'OAAAAAANTtNAAAAAANTtNAAAAAAADDDO', 'ODAAAAAANNAAAAAAAANNAAAAAAADDDDO', 'ODDAAAAAAAAAAAAAAAAAAAAAAADDDDO.',
    '.ODDAAAAAAANNNNNNNNAAAAAADDDDDO.', '.ODDDAAAAANNDDDDDDNNAAADDDDDDO..', '..ODDDDAAAAAAAAAAAAAADDDDDDDO...', '...ODDDDDDAAAAAAADDDDDDDDdddO...',
    '....OOdDDDDDDDDDDDDDDDddddOO....', '......OOddDDDDDDDDdddddOOO......', '........OOOdddddddOOOOO.........', '...........OOOOOOO..............'];
  // kłąb bez twarzy (środek słupa dymu)
  M.puff = M.smoke.map(function (r) { return r.replace(/[NTt]/g, 'A'); });
  M.gossip = [
    '...OOOOOOOOOOOOOOOOOOOOOO...', '..OaaaaaaaaaaaaaaaaaaaaaaO..', '.OaaaaaaaaaaaaaaaaaaaaaaaaO.', 'OaaaNNNaaaaaVaVaaaaRaaaRaaaO',
    'OaaNaaaNaaaVVVVVaaaaRaRaaaaO', 'OaaNaNaNaaaaVaVaaaaaaRaaaaaO', 'OaaNaNNNaaaVVVVVaaaaRaRaaaaO', 'OaaNaaaaaaaaVaVaaaaRaaaRaaaO',
    'OaaaNNNNaaaaaaaaaaaaaaaaaaaO', 'OaaaaaaaaaTaaaaNNNaaaaNaaaaO', 'OaaaTTTaaaTaaaNaNaNaaaNaaaaO', 'OaaaaaTaaaTaaaNNNNNaaaNaaaaO',
    'OaaaaTaaaaaaaaaNNNaaaaaaaaaO', 'OaaaaaaaaaTaaaaNaNaaaaNaaaaO', '.OAAAAAAAAAAAAAAAAAAAAAAAAO.', '..OAAAAAAAAAAAAAAAAAAAAAAO..',
    '...OOOOOAAAOOOOOOOOOOOOOO...', '.......OAAO.................', '......OAAO..................', '.....OAO....................',
    '.....OO.....................'];

  function build(rows, pal, flat) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var x = c.getContext('2d');
    for (var r = 0; r < rows.length; r++) for (var k = 0; k < rows[r].length; k++) {
      var ch = rows[r][k];
      if (ch === '.') continue;
      x.fillStyle = flat || (pal && pal[ch]) || PAL[ch];
      x.fillRect(k, r, 1, 1);
    }
    return c;
  }
  function withShades(rows) {
    // okulary przeciwsłoneczne: pasek na wysokości oczu (wiersze 6–7)
    return rows.map(function (row, i) {
      if (i === 6) return row.slice(0, 12) + 'NNNNNN' + row.slice(18);
      if (i === 7) return row.slice(0, 12) + 'NN.NN'.replace('.', row[14]) + row.slice(17);
      return row;
    });
  }
  function withPatch(rows, patch) {
    if (!patch) return rows;
    rows = rows.slice();
    patch.forEach(function (p) { var r = rows[p[0]]; rows[p[0]] = r.slice(0, p[1]) + p[2] + r.slice(p[1] + p[2].length); });
    return rows;
  }
  function buildSkin(skin) {
    var a = withPatch(skin.shades ? withShades(M.girlA) : M.girlA, skin.patch), b = withPatch(skin.shades ? withShades(M.girlB) : M.girlB, skin.patch);
    return {
      frames: [build(a, skin.pal), build(b, skin.pal)],
      glowA: [build(a, null, '#3FF0FF'), build(b, null, '#3FF0FF')],
      glowB: [build(a, null, '#FF5FD2'), build(b, null, '#FF5FD2')],
      dark: build(a, null, '#1A1033')
    };
  }
  var S = {
    PAL: PAL, maps: M, build: build, buildSkin: buildSkin,
    init: function () {
      ['dollar', 'diamond', 'prosecco', 'bottleMini', 'smoke', 'puff', 'gossip'].forEach(function (n) { S[n] = build(M[n]); });
      S.bottleEmpty = build(M.bottleMini, null, 'rgba(26,16,51,0.55)');
      S.skins = {};
      window.CONFIG.skins.forEach(function (sk) { S.skins[sk.id] = buildSkin(sk); });
    },
    // powiększony obrazek do UI (ikony w DOM)
    dataUrl: function (canvas, scale) {
      var c = document.createElement('canvas');
      c.width = canvas.width * scale; c.height = canvas.height * scale;
      var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(canvas, 0, 0, c.width, c.height);
      return c.toDataURL();
    }
  };
  window.Sprites = S;
})();
