// 示例期第一章「这段录音」：片名卡 → 「来自维基百科」 → 大字 CC0。只用舞台自带的零件（K.titleCard、K.words、K.card、K.bigStat），没有任何素材。
// 时刻一律按字取：cue(句id, '字') 是那个字开口的时刻；c(…) 是它前两帧的切点（镜头先到、声音后到），w(…) 是零件出场的时刻。
CH.push({ name: '这段录音', build: (F, K, X) => {
  const { cue, B } = F;
  const c = (id, s) => K.cut(s ? cue(id, s) : B(id)), w = (id, s) => (s ? cue(id, s) : B(id)) - 2 / 30;
  const s1 = K.cutId(F, 'ly1'), s2 = c('ly2');
  K.sfx(w('ly1', '自由'), 'pop', -20); K.sfx(s2, 'swish', -18); K.sfx(w('ly2', '公有'), 'pop', -22);
  K.src(s2, X.t1, 'Wikimedia Commons · File:无盐村.ogg');

  K.seq(X.t0, X.t1, [
    // 片名卡：第一句开口前那 1.6 秒的气口（episode.yaml 的 breath）
    [X.t0, t => K.titleCard(t, X.t0)],
    [s1, t => K.plate(t) +
      K.words(t, s1 + .05, '来自维基百科', { y: 360, size: 116, hi: { '维基百科': K.GOLD } }) +
      K.card(K.label('自由的百科全书', 'THE FREE ENCYCLOPEDIA', { align: 'center', size: 56 }),
        { x: 960, y: 640, w: 760, h: 190, anchor: 'c', state: 'blue', e: K.E(K.k(t, w('ly1', '自由'), .35)), t })],
    [s2, t => K.plate(t, { c1: '#2f2a12' }) +
      K.bigStat(t, s2, { value: 'CC0', label: '这段录音', sub: 'PUBLIC DOMAIN · 公有领域', y: 470, size: 300, hard: true }) +
      K.chipAt(830, 720, '谁都可以拿去用', { e: K.E(K.k(t, w('ly2', '公有'), .3)), size: 34 })],
  ]);
} });
