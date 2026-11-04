// 示例期第二章「无盐村」：章节卡 → 树上摆出村子和四周的山、河、邻村（K.tnode / K.tlabel / K.tarrow，镜头在板上走）→ 两张卡 → 大字 → 拉远看全树。
// 树是全片共用的一块板：卡片按全片时刻落下，落下后亮 8 秒，其余时间压暗；K.treveal 那一段全部亮着。
CH.push({ name: '无盐村', build: (F, K, X) => {
  const { cue, B, BE } = F, T9 = K.T9;
  const c = (id, s) => K.cut(s ? cue(id, s) : B(id)), w = (id, s) => (s ? cue(id, s) : B(id)) - 2 / 30;
  const s1 = c('wy1', '无盐村位'), s2 = c('wy3'), s3 = c('wy4'), s4 = K.cut(BE('wy4') + .15);

  // 树：村子在中间，北边是山，南边是河，河对岸是后亭村。
  // 板上的小标签（K.tlabel）在画面上小到读不出就整个收起来（treeskin.js）：镜头拉远时字号要大，这里用 56–64
  // （板上的字号乘镜头的 s ≥ 24 才完整显示）
  const hill = w('wy2', '韩山'), river = w('wy2', '大清河'), ht = w('wy2', '后亭村');
  K.tnode('wy_v', { x: 0, y: 0, at: s1 + .1, zh: '无盐村', sub: 'WUYAN VILLAGE', pal: 'gold', w: 520, h: 230, big: 66, on: [[s1, BE('wy2')]] });
  K.tlabel('wy_loc', { at: w('wy1', '山东'), x: 0, y: -185, s: '山东 · 泰安 · 东平', col: K.GOLD, size: 56 });
  K.tnode('wy_hill', { x: 0, y: -560, at: hill, zh: '韩山 · 龙山', sub: 'HILLS · EAST / WEST / NORTH', pal: 'oa', w: 620, h: 200, big: 56 });
  K.tarrow('wy_a1', { at: hill + .25, d: .5, pts: [[0, -455], [0, -205]], col: '#7fd6c4' });
  K.tlabel('wy_three', { at: w('wy2', '三面'), x: 520, y: -330, s: '东 · 西 · 北 三面', col: '#7fd6c4', size: 58 });
  K.tnode('wy_river', { x: 0, y: 470, at: river, zh: '大清河', sub: 'DAQING RIVER', pal: 'wheel', w: 560, h: 180, big: 56 });
  K.tarrow('wy_a2', { at: river + .2, d: .5, pts: [[0, 120], [0, 375]] });
  K.tnode('wy_ht', { x: 0, y: 920, at: ht, zh: '后亭村', sub: 'HOUTING VILLAGE', pal: 'grey', w: 460, h: 180, big: 52 });
  K.tlabel('wy_across', { at: w('wy2', '隔河'), x: 480, y: 700, s: '隔河相对', col: '#8cc4ff', size: 64 });
  K.treveal(s4, X.t1 + 1);
  const cam = t => T9.camAt(t, [[s1, 0, { x: 0, y: 0, s: .72, rx: 38, rz: -5 }],
    [hill - .2, 1.0, { y: -240, s: .6 }], [river - .3, 1.1, { y: 260, s: .56 }], [ht - .2, 1.2, { y: 300, s: .5, rz: -3 }]]);
  const far = t => T9.camAt(t, [[s4, 0, { x: 0, y: 160, s: .4, rx: 40, rz: -3 }], [s4 + .05, 1.4, { s: .34, rz: -6 }]]);

  K.sfx(w('wy1', '无盐村位'), 'swish', -18);
  K.sfx(hill, 'pop', -22); K.sfx(river, 'swish', -24); K.sfx(ht, 'pop', -22);   // 同一个音效不连用 3 次（qa 的「音效连用」）
  K.sfx(s2, 'swish', -18); K.sfx(w('wy3', '钟离春'), 'pop', -20); K.sfx(w('wy3', '治所'), 'pop', -20);
  K.sfx(s3, 'swish', -18); K.sfx(w('wy4', '县级文物'), 'pop', -20);
  K.src(s1, s2, '中文维基百科「无盐村」（CC BY-SA 3.0）');

  const L = (x, zh, en, chip, at, state, t, seed) => K.card(
    K.label(zh, en, { align: 'center', size: 60 }) + `<div style="text-align:center;margin-top:22px">${K.chip(chip, { size: 32, color: state === 'blue' ? K.BLUE : K.GOLD })}</div>`,
    { x, y: 600, w: 640, h: 260, anchor: 'c', state, e: K.E(K.k(t, at, .35)), t, seed });

  K.seq(X.t0, X.t1, [
    [X.t0, t => K.chapterCard(t, X.t0, { eyebrow: '一个村子', zh: '无盐村', en: 'WUYAN VILLAGE · DONGPING', seed: 5 })],
    [s1, t => K.treeView(t, cam(t))],
    [s2, t => K.plate(t) +
      K.words(t, s2 + .05, '故乡和治所', { y: 300, size: 96, hi: { '故乡': K.GOLD, '治所': K.BLUE } }) +
      L(590, '钟离春', 'ZHONGLI CHUN', '无盐丑女', w('wy3', '钟离春'), 'gold', t, 1) +
      L(1330, '无盐邑 · 无盐县', 'ANCIENT COUNTY SEAT', '古代的治所', w('wy3', '无盐邑'), 'blue', t, 2)],
    [s3, t => K.plate(t, { c1: '#3a2f14', c2: '#1a1a24' }) +
      K.words(t, s3 + .05, '无盐故城遗址', { y: 380, size: 128, hi: { '故城': K.GOLD } }) +
      K.card(K.label('县级文物保护单位', 'PROTECTED HERITAGE SITE', { align: 'center', size: 58 }),
        { x: 960, y: 650, w: 820, h: 190, anchor: 'c', state: 'lit', e: K.E(K.k(t, w('wy4', '县级文物'), .35)), t }) +
      K.chipAt(840, 800, '东平县', { e: K.E(K.k(t, w('wy4', '东平县'), .3)), size: 34 })],
    [s4, t => K.treeView(t, far(t))],
  ]);
} });
