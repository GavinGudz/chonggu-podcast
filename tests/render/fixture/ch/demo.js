// 渲染测试的一章：玻璃卡 + 卡里的标题（K.card / K.label）、大数字、胶囊、逐字标题 → 树（K.tnode / K.tarrow，皮肤贴图）→ 片名卡。
// 只用工具包里的零件，不用任何素材：底都是 K.plate（暗底），片名卡没有底片也能出。
CH.push({ name: '演示', build: (F, K, X) => {
  const { cue, B } = F, T9 = K.T9;
  const c = (id, s) => K.cut(s ? cue(id, s) : B(id)), w = (id, s) => (s ? cue(id, s) : B(id)) - 2 / 30;
  const s1 = X.t0, s2 = c('d2'), s3 = c('d2', '片名');
  K.src(s1, s2, '测试数据 · 第 1 页');
  K.sfx(w('d1', '两张'), 'pop', -20); K.sfx(s2, 'swish', -18);

  // 树：登记的卡在 at 落下；镜头从远处推近
  K.tnode('br_money', { x: 0, y: 0, at: s2 + .1, zh: '钱', sub: 'MONEY', pal: 'money', w: 520, h: 240, big: 64 });
  K.tnode('dm_rev', { x: 760, y: 40, at: s2 + .5, zh: '115 亿', sub: 'REVENUE', pal: 'gold' });
  K.tnode('dm_cost', { x: 760, y: 420, at: s2 + .8, zh: '成本', pal: 'red', badge: 'warn' });
  K.tarrow('dm_a1', { at: s2 + .45, d: .5, pts: [[270, 0], [520, 40]], kind: 'money', chip: '9 倍' });
  K.tarrow('dm_a2', { at: s2 + .75, d: .5, pts: [[200, 130], [520, 420]], kind: 'no' });
  const cam = t => T9.camAt(t, [[s2, 0, { x: 380, y: 200, s: .42, rx: 40, rz: -6 }], [s2 + .1, 1.4, { s: .62, rz: -3 }]]);

  K.seq(X.t0, X.t1, [
    [s1, t => K.plate(t) +
      K.words(t, s1 + .1, '两张卡', { y: 200, size: 84, hi: { '卡': K.GOLD } }) +
      K.card(K.label('写字的卡', 'A CARD WITH WORDS'), { x: 300, y: 330, w: 560, h: 260, state: 'blue', e: K.E(K.k(t, w('d1', '两张'), .35)), t }) +
      K.card(`<div style="text-align:center">${K.num('115', { size: 150 })}<span style="font:700 60px ${K.HAN};color:${K.GOLD}"> 亿</span></div>` + K.label('', 'BIG NUMBER', { align: 'center' }),
        { x: 1060, y: 330, w: 560, h: 260, state: 'gold', e: K.E(K.k(t, w('d1', '115'), .35)), t, seed: 2 }) +
      K.chipAt(840, 650, '自己算的', { e: K.E(K.k(t, w('d1', '亿'), .3)) })],
    [s2, t => K.treeView(t, cam(t))],
    [s3, t => K.titleCard(t, s3, { q: cue('d2', '名') })],
  ]);
} });
