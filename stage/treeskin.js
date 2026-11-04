// treeskin.js —— 树的「设计感」皮肤（第 8 期 v10 定；index.html 里放在 space9.js 后面）。
// 各章一行不改，树就换成新皮肤：它替换 K.T9.node / arrow / label / board（参数和以前一样），重写 K.treeHTML（画登记表里的东西），
// 并且兼容 space9.js 的 K.treeView(…, {dof, thick, persp, dust})（SP.tree 临时替换 T9.node 加厚度，这里照常；SP.board 也换成新底板）。
// 贴图：stage/skin/*.png，chonggu render 第一次跑时自动生成（chonggu/render/skin.py，约 10 秒，不联网）。同一个 t 永远画出同一帧（不用随机数，不读时间）。
//
// ===================== 新皮肤自动做的事（不用改代码）=====================
//  · 卡片：按配色换材质（钱 = 钞票扭索纹，金 = 金箔，方向盘 = 拉丝蓝钢，越界 = 深红 + 底边警示斜纹，下一代 = 紫色全息，
//    OpenAI = 青绿细点阵，Anthropic = 赭橙纸纹，灰 = 哑光，纸 = 纸纹）；细内框 + 四角角饰 + 顶上小徽记 + 倒角高光；落下时一道高光扫过。
//    第二轮：卡面亮一档，由上往下打光（顶亮底暗），外沿一道细亮边 + 两层柔和外发光；主角卡（宽 ≥ 520 或标题字号 ≥ 64）材质用足，小卡材质只用 4 成。
//  · 字：中文标题用思源黑体最粗那一档（SkinHei = Noto Sans SC 900，film.css），单行约占卡高 4 成多；两层（后层深色细描边 + 立体投影，前层由上往下的渐变字）；
//    sub 英文大写、拉开字距、带一点投影；标题里的数字用窄体数字（Num = Bebas Neue）放大 + 金属渐变，前面的 $ € ¥ 和后面的单位（亿 万 倍 % +）小一号。
//  · 压暗：没轮到的卡变成深色剪影（形状、边框、角饰还在，字几乎看不见）；亮着的卡更亮、更饱和，带外发光和地上的一片反光。
//  · 远景（语义缩放）：镜头拉远、卡上的字在屏幕上小于约 20 像素时，小字（sub、细字）淡掉，标题放大到占满卡面；
//    连放大的标题也看不清时，只剩发光的色块。虚线箭头在远处变成细实线（不闪）。标签的字也一样淡掉，只留一条淡淡的底。
//  · 箭头：粗方块虚线（18×11），每块带光晕，一直往前流；箭头头部更大、更实。
//  · 底板：点阵更细更淡，镜头看着的地方地上亮一片，远处有一点雾；可以按时段换颜色（K.tmood）。
//
// ===================== 直接抄的例子 =====================
//
// ① 卡片的新选项（K.tnode 登记的卡，或 T9.node 直接画的卡都认）
//      K.tnode('oa_x', {x, y, at, zh: 'OpenAI', sub: 'SINCE 2015', pal: 'oa', icon: 'openai'});          // 标题左边放真标志（名字在 episode.yaml 的 logos 里登记：logos: {openai: assets/logos/openai.png}）
//      K.tnode('an_x', {x, y, at, zh: 'Anthropic', pal: 'an', icon: 'anthropic', iconPos: 'top'});       // 标志放在标题上面
//      K.tnode('hf_x', {x, y, at, zh: 'Hugging Face', pal: 'grey', icon: 'hf'});                         // logos 里的 svg 也行（标志的授权自己查清楚，素材清单里写出处）
//      K.tnode('p_x',  {x, y, at, zh: '伯南克', pal: 'wheel', icon: 'assets/wh/bernanke.jpg'});         // 任何图片路径：.jpg 当小照片（圆角方块），.png/.svg 当标志
//      K.tnode('q_x',  {x, y, at, zh: '利息', pal: 'oa', badge: 'yes'});                                // 卡上沿正中盖一个章：'yes' ✓ / 'no' ✗ / 'warn' !
//      K.tnode('q_y',  {x, y, at, zh: '本金', pal: 'red', badge: {kind: 'no', at: 512.3, pos: 'bottom'}});   // 章晚一点落、盖在下沿（pos: top|bottom|left|right）
//      K.tnode('m_x',  {x, y, at, zh: '自定材质', pal: 'grey', mat: 'steel'});                            // 只换材质贴图：note|foil|steel|hazard|holo|grid|fiber|grain|paper
//      K.tnode('n_x',  {x, y, at, zh: '超过 90%', pal: 'next', num: false});                            // 标题里的数字不要金属字
//    其他：glow: 1.6（外发光加强，主角卡用），noOrn: true（不画角饰和徽记），iconSize（像素）
//
// ② 箭头的新选项
//      K.tarrow('a_x', {at, d: .6, pts: [[x1, y1], [x2, y2]], col: '#9cc6ff', chip: '115 亿'});         // 箭头中段挂金额牌（念到时弹出来）
//      K.tarrow('a_y', {at, pts, kind: 'ok', chip: '€150 亿', chipAt: .4});                              // kind 定颜色：flow 蓝（流向）| ok 绿（成了）| no 粉红（被挡）| money 金
//      T9.arrow(t, t0, d, pts, col, {a, chip, chipAt, chipSize, kind, lw: 10, dash: [18, 11]})          // 直接画也认这些
//
// ③ 章：K.tbadge(id, {x, y, at, kind: 'yes'|'no'|'warn', r: 46, on})   落下时从大到小回弹一下
//      K.tbadge('b_int', {x: 1300, y: 2210, at: 401.2, kind: 'yes'});
//      T9.badge(t, t0, x, y, 'no', {r, dim, z})                                      // 在自己的 tlayer 里直接画
//
// ④ 大数字板：K.tnum(id, {x, y, at, s: '1,150 亿', pal: 'money', w, h, size: 150, sub, on})   一块躺在板上的厚板，数字是金属渐变大字
//      K.tnum('n_rev', {x: 1300, y: 3300, at: 120.5, s: '$115.55 亿', pal: 'money', sub: '二季度收入'});
//      T9.num(t, t0, x, y, '6,370 亿', {pal: 'gold', size: 130, dim})
//
// ⑤ 情绪底：K.tmood([[开始, 结束, '颜色'], …])   底板的颜色和地上的光跟着换，进出各约 0.6 秒
//      K.tmood([[150.2, 168.4, 'red'], [430, 436, '#1d2c4a', .7]]);     // 颜色可写 red|gold|blue|purple|teal|black 或任意 #色；第 4 项是浓度（默认 1）
//
// ⑥ 背景大字：K.tword(id, {x, y, at, s: '15 倍', col, size: 640, a: .12, rot, on})   一个巨大的条纹字铺在板上，很淡，不抢卡的戏
//      K.tword('w_profit', {x: 1300, y: 2600, at: 160, s: '非常规利润', col: '#ff9a8f', on: [[160, 172]]});
//
// ⑦ 退场（不让树画得太满）：这一期目录里的 tree_keep.json（episode.yaml 的 tree.keep 可以换文件名）
//      {"retire": true, "keep": ["layer:开头", "br_money", "br_arrow_money", "wh_T", "oa_line", …]}
//    · 不在 keep 里的登记的东西（卡、箭头、标签、章、数字板、背景字）：最后一段亮着的时间结束 1 秒后，.6 秒淡到看不见，之后不画；
//      箭头两头都碰到名单里的卡，就自动留下。
//    · 各章自己画的图层（K.tlayer）按章算：写 "layer:章名" 才留，不写的这一章结束后约 1.4–2 秒淡掉。
//    · 拉远（cam.s 从 .32 到 .18）时只剩名单里的骨架；远景里各章图层的截图淡到 2 成。名单里的东西照常压暗成剪影，片尾全树只有它们。
//    · 没有这个文件、或 retire 是 false：和没有退场时完全一样。试别的名单：episode.yaml 里 tree: {keep: 别的.json}
//    · 查哪些卡字太多：K.tskin.audit()（一张卡一个短标题、最多一行英文小字；章节里改）
//
// ⑧ 远景的可选新选项（2026-11-03 下一代那章片尾总图加的，只加不改，不传时一个像素都不变）：
//      卡：farMode: 'block'（拉远只剩发光色块，不画字）| 'logo'（拉远只画标志，farIcon: 'openai' 等）；farPx: 40（主角卡拉远时标题的屏幕字号，默认 26）；farAt: 全片时刻（从这一刻起才生效）
//      数字板、截图卡也认 farMode: 'block'。K.treeView(t, cam, '', {farGrid: false})：拉远（s < .34）时点阵淡掉（远处的点阵会出摩尔纹横带，镜头一动就闪）
//      K.treeView(t, cam, '', {still: true})：板不自己轻轻晃（镜头不动时整块板一帧都不变，不用重画）
//      T9.board(t, cam, html, {grid: false})：底板不画点阵（下一代那章把总图先渲成图时用，图放大缩小时点阵会出摩尔纹）
//      K.treeView(t, cam, '', {lite: true})：轻量远景——卡片和数字板不画材质贴图、内框角饰、落地影子、地面光、侧面，外发光只留一层
//        （拉远看全树时几十张卡同时重画，渲视频时机器一忙偶尔有一帧画不完 = 闪一帧暗的；片尾卡那一闪就是这个）
// 调试：K.tskin.VIEW（当前镜头）、K.tskin.MAT（材质表）、K.tskin.proj(x, y)（板上一点在屏幕上放大多少倍）、K.tskin.projXY(x, y)（屏幕坐标）、K.tskin.RET（退场名单）
//   数卡：K.tskin.COUNT.on = true 以后每次 seek(t, true)，COUNT.n / COUNT.lit 是这一帧屏幕里看得见 / 亮着的卡几张，COUNT.tree 是不是树的镜头（各章自画的卡不算在内，COUNT.layers 记下有哪些章的图层在画）
//
// 性能（1080p，一帧从 seek 到截图，和 render.mjs 的计法一样，2026-11-03 第二轮量的 32 个时刻，各两遍取快的）：原来 134–216 毫秒（中位 164.5），
//   加皮肤后 136–217（中位 164.5），平均 1.01 倍，最多 1.14 倍；开了退场后远景反而更快（848.5 秒 225 → 188）。
//   省时间的地方：箭头从几十个小方块 div 改成一整条 SVG。
// 已知限制：ch/ct.js 自己画的合同卡、标签、虚线（不经过 T9.node / arrow / label）不换皮，只有底板换了；以后那一章改用 T9.node 就有。
//   退场对各章图层只能整章留或整章收（图层里没有 id）；开头那一章的推文截图是开头图层自己画的，远景里只能整体淡到 2 成。
(() => {
const K = window.K, { lerp, C } = K, T9 = K.T9, TR = K.TREE, SP = K.SP;
const f1 = v => (+v).toFixed(1), f2 = v => (+v).toFixed(2), f3 = v => (+v).toFixed(3);
const D2R = Math.PI / 180, OUT = x => 1 - (1 - C(x)) ** 4, IO3 = x => { x = C(x); return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; };
const SM = x => { x = C(x); return x * x * (3 - 2 * x); }, BACK = (x, c1 = 1.6) => { x = C(x); const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const EP = window.EP ?? {};
const SKIN = 'skin/';
const HEI = "SkinHei,'Noto Sans SC',sans-serif";   // 标题：思源黑体 900（film.css 里的 SkinHei）
const EN = K.EN, NUM = K.NUM;


// ---------------- 颜色小工具 ----------------
const HX = new Map();
const hx = c => { if (Array.isArray(c)) return c; let v = HX.get(c); if (v) return v; const s = String(c).trim();
  if (s[0] === '#') { let h = s.slice(1); if (h.length <= 4) h = [...h].map(x => x + x).join(''); v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); v.push(h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1); }
  else { const m = s.match(/rgba?\(([^)]+)\)/); v = m ? m[1].split(',').map(Number) : [255, 255, 255]; if (v.length < 4) v.push(1); }
  HX.set(c, v); return v; };
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return [lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k), lerp(A[3], B[3], k)]; };
const rgba = (c, a = 1) => { const v = hx(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${f3(C(v[3] * a))})`; };

// ---------------- 材质表 ----------------
// g：卡面三段渐变（上 → 下，两种相近的色相，像小Lin的青绿→蓝；第二轮整体亮了一档）；tex：叠在上面的质感贴图；ink：标题字色；metal：数字的金属色；glow：外发光；edge：边框和饰件色；deep：剪影色
const MAT = {
  money:  { g: ['#b08a2c', '#7c5f18', '#3e2c09'], tex: 'note',   ink: '#fff4d6', metal: 'gold',   glow: '#f0cf7a', edge: '#f3d891', deep: '#100c03' },
  gold:   { g: ['#e3b64c', '#a8772a', '#583810'], tex: 'foil',   ink: '#fffaf0', metal: 'gold',   glow: '#ffd98a', edge: '#ffe6a6', deep: '#120d03' },
  wheel:  { g: ['#4189d2', '#2a5aae', '#18306e'], tex: 'steel',  ink: '#f6f9ff', metal: 'silver', glow: '#8cc4ff', edge: '#a9d4ff', deep: '#050c15' },
  bounds: { g: ['#cc4673', '#902659', '#4c1034'], tex: 'hazard', ink: '#fff2f6', metal: 'rose',   glow: '#ff8ba6', edge: '#ffadc0', deep: '#120408' },
  red:    { g: ['#d2444b', '#9d2333', '#55101d'], tex: 'grain',  ink: '#fff4f0', metal: 'rose',   glow: '#ff8b80', edge: '#ffaaa0', deep: '#130405' },
  next:   { g: ['#8b5ce0', '#5d3dc1', '#352283'], tex: 'holo',   ink: '#faf5ff', metal: 'silver', glow: '#c9a8ff', edge: '#dcc4ff', deep: '#0a0518' },
  oa:     { g: ['#2ca58c', '#1f7088', '#153e66'], tex: 'grid',   ink: '#f6fff2', metal: 'silver', glow: '#7fd6c4', edge: '#9fe8d6', deep: '#041214' },
  an:     { g: ['#e0814a', '#ab4f2a', '#5a2311'], tex: 'fiber',  ink: '#fff6ea', metal: 'gold',   glow: '#ffb48a', edge: '#ffcaa6', deep: '#140803' },
  grey:   { g: ['#5c626e', '#3d424c', '#22252b'], tex: 'grain',  ink: '#f4f5f8', metal: 'silver', glow: '#dfe6f0', glowA: .35, edge: '#c9ced8', deep: '#0a0b0d' },
  paper:  { g: ['#f6f1e5', '#ebe5d6', '#dad3c1'], tex: 'paper',  ink: '#1b1a17', metal: 'ink',    glow: '#fff6e0', glowA: .5, edge: '#8a7f66', deep: '#16140f', light: true },
};
const METAL = { gold: ['#fff8de', '#f6dc98', '#b98b36', '#ffe9ad'], silver: ['#ffffff', '#e6eef8', '#9eb1c8', '#f4f8ff'], rose: ['#fff6f3', '#ffd7cf', '#c9867c', '#ffe8e3'], ink: ['#3a352c', '#1b1a17', '#000000', '#2c281f'] };
const KIND = { flow: '#9cc6ff', ok: '#8fe39c', no: '#ff8f9a', warn: '#ffc46b', money: '#f0cf7a' };
const MOODS = { red: '#561b1f', gold: '#47370f', blue: '#13304e', purple: '#2b1c4c', teal: '#103a3a', black: '#08090b' };
const LOGO = { ...(EP.logos ?? {}) };   // 真标志：episode.yaml 的 logos（名字 → 这一期 assets 里的图），工具包里不带任何公司的标志
const BYC1 = {}; for (const [k, p] of Object.entries(K.PAL)) if (MAT[k]) BYC1[p.c1.toLowerCase()] = k;
// 卡用哪套材质：pal 名字 > 按 c1 认出 K.PAL 的配色（ch/open.js 直接传颜色）> 现编一套
const matOf = o => { if (o.pal && MAT[o.pal]) return [o.pal, MAT[o.pal]]; const k = o.c1 && BYC1[String(o.c1).toLowerCase()]; if (k) return [k, MAT[k]];
  const c1 = o.c1 ?? '#23303a', c2 = o.c2 ?? '#141a20', e = o.edge ?? '#ffffff55';
  return [null, { g: [c1, mix(c1, c2, .5), c2], tex: 'grain', ink: '#ffffff', metal: 'silver', glow: e, edge: e, deep: mix(c2, '#000', .55), frame: 'grey' }]; };

// ---------------- 预载：贴图和字体先读好再开始（不然第一次出现的那帧会缺贴图 = 闪）----------------
const PRE = ['mat_note', 'mat_foil', 'mat_steel', 'mat_hazard', 'mat_holo', 'mat_grid', 'mat_fiber', 'mat_grain', 'mat_paper', 'grain',
  ...['money', 'gold', 'wheel', 'bounds', 'red', 'next', 'oa', 'an', 'grey', 'paper', 'photo'].flatMap(k => ['frame_' + k, 'emb_' + k])].map(n => SKIN + n + '.png');
const KEEP = [];
// 退场名单：tree_keep.json（这一期的目录）{"keep": ["br_money", "layer:开头", …], "retire": true}。没有这个文件、或 retire 是 false：和没有退场时一模一样。
// 用哪个文件由 chonggu render 写进 EP.tree_keep（episode.yaml 的 tree.keep，默认 tree_keep.json；文件不存在就是 null，不去读）
const RET = { on: false, keep: new Set(), src: null };
const keepURL = window.TREE_KEEP_URL ?? EP.tree_keep ?? null;
const keepReady = (keepURL ? fetch(keepURL).then(r => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then(j => { RET.on = !!(j && j.retire); RET.keep = new Set(j?.keep ?? []); RET.src = j ? keepURL : null; });
const ready = Promise.all([...PRE, ...Object.values(LOGO)].map(src => new Promise(r => { const im = new Image(); KEEP.push(im); im.onload = () => im.decode().then(r, r); im.onerror = () => { console.error('皮肤贴图读不到：' + src); r(); }; im.src = src; }))
  .concat([document.fonts.load('700 60px SkinHei', '重估树卡标题'), keepReady]));
if (window.FB?.init) { const i0 = FB.init; FB.init = async (...a) => { await ready; return i0(...a); }; }

// ---------------- 镜头：画板上东西时知道它在屏幕上有多大（语义缩放用）----------------
// 板的变换是 rotateX(rx)·rotateZ(rz)·scale(s)·translate(-x,-y)，透视 P，所以板上一点 (x,y) 在屏幕上的放大倍数 = s·P/(P − z)，z 由它在镜头前后的位置定
const VIEW = { cam: null, P: 1500 };
const proj = (x, y) => { const v = VIEW.cam; if (!v) return 1; const s = v.s ?? 1, rz = (v.rz ?? 0) * D2R, rx = (v.rx ?? 0) * D2R;
  const u2 = ((x - v.x) * Math.sin(rz) + (y - v.y) * Math.cos(rz)) * s, Z = u2 * Math.sin(rx); return s * VIEW.P / Math.max(300, VIEW.P - Z); };
{ const tv0 = K.treeView; K.treeView = (t, cam, extra = '', o = {}) => { VIEW.cam = cam; VIEW.P = o.persp ?? 1500; VIEW.cy = o.cy ?? 480; VIEW.lite = !!o.lite; if (COUNT.on) COUNT.tree = true; return tv0(t, cam, extra, o); }; }
// 板上一点 (x, y) 在屏幕上的位置（数卡用）
const projXY = (x, y) => { const v = VIEW.cam; if (!v) return [960, 540]; const s = v.s ?? 1, rz = (v.rz ?? 0) * D2R, rx = (v.rx ?? 0) * D2R, P = VIEW.P, cy = VIEW.cy ?? 480;
  const dx = (x - v.x) * s, dy = (y - v.y) * s, u1 = dx * Math.cos(rz) - dy * Math.sin(rz), u2 = dx * Math.sin(rz) + dy * Math.cos(rz), f = P / Math.max(300, P - u2 * Math.sin(rx));
  return [960 + u1 * f, 453.6 + (cy + u2 * Math.cos(rx) - 453.6) * f]; };
// 数卡（调试用，平时关着，不影响画面和速度）：K.tskin.COUNT.on = true 以后，每画一帧树记下屏幕里看得见的卡有几张（亮着的几张）、有没有各章自己画的图层
const COUNT = { on: false, tree: false, n: 0, lit: 0, layers: [], LA: 1 };
const countCard = (x, y, a, L) => { if (!COUNT.on || a * COUNT.LA < .3) return; const [sx, sy] = projXY(x, y); if (sx < 40 || sx > 1880 || sy < 40 || sy > 1000) return; COUNT.n++; if (L > .5) COUNT.lit++; };

// ---------------- 字 ----------------
// 估字宽（单位 em）：中文 1，数字（Num 放大 1.3 倍）约 .6，大写 .68，小写 .56
const emW = s => { let w = 0; for (const ch of s) { const c = ch.codePointAt(0); w += c > 0x2e7f ? 1 : ch >= '0' && ch <= '9' ? .6 : ch >= 'A' && ch <= 'Z' ? .68 : ch === ' ' ? .3 : '.,:;·%'.includes(ch) ? .32 : .56; } return w; };
const cjkN = s => [...s].filter(ch => ch.codePointAt(0) > 0x2e7f).length;
const isCJK = l => cjkN(l) * 2 >= [...l.replace(/\s/g, '')].length;   // 这一行主要是中文吗（中文拉开字距，英文不拉）
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// 标题里的数字：窄体数字（Num）放大 1.3 倍、金属渐变；前面的 $ € ¥ 和后面的单位（亿 万 倍 % +）小一号，像小Lin的「$3000亿」
// front：前面那层（渐变字、金属数字）；back：后面那层（同样排版，只是深色，用来做描边和立体投影）
const NUMRE = /([$€¥]?)(\d[\d,.]*)(\s?)(亿|万|倍\+?|%|＋|\+)?/g;
const titleLine = (l, met, num, front) => { const s = esc(l); if (!num || !met) return s;
  return s.replace(NUMRE, (m0, pre, d, sp, unit) => (pre ? `<span style="font-size:.6em">${pre}</span>` : '') +
    `<span style="font-family:${NUM};font-size:1.3em;line-height:0;letter-spacing:.01em;vertical-align:-.04em;${front ? `background:linear-gradient(180deg,${met[0]} 8%,${met[1]} 46%,${met[2]} 54%,${met[3]} 94%);-webkit-background-clip:text;background-clip:text;color:transparent` : ''}">${d}</span>` +
    (unit ? `<span style="font-size:.6em;margin-left:${sp ? '.08em' : '.04em'}">${unit}</span>` : sp)); };

// ---------------- 卡片 ----------------
// T9.node(t, t0, x, y, zh, o)：参数和 tree9.js 一样（w, h, c1, c2, edge, img, pos, imgA, sub, subSize, dim, z, big, col, d），新选项见文件头 ①
T9.node = (t, t0, x, y, zh, o = {}) => { if (t < t0) return '';
  const e = OUT((t - t0) / (o.d ?? .5)), w = o.w ?? 460, h = o.h ?? 210, dim = o.dim ?? 0, z = lerp(150, o.z ?? 16, e), a = C((t - t0) / .14) * (o.op ?? 1);
  if (a <= .001) return '';
  const k = C(dim / .78), L = 1 - k, [mk0, M0] = o.img && !zh ? ['photo', null] : matOf(o), M = M0 ?? MAT.grey, mk = mk0 ?? M.frame ?? 'grey';
  if (COUNT.on && !o.noShadow) countCard(x, y, a, L);
  const palEdge = mk0 && K.PAL[mk0]?.edge, edge = o.edge && o.edge !== palEdge ? o.edge : (mk0 === 'photo' ? '#f1ead8' : M.edge);
  const ss = proj(x, y), html = /</.test(zh), txt = String(zh ?? ''), lines = txt.split('\n');
  // 标题字号：单行约占卡高的 42%，两行合起来约 62%；不超出卡（估算字宽）；不比章节给的 big 小
  const n = Math.max(...lines.map(cjkN)), lsC = n <= 3 ? .16 : n <= 5 ? .1 : .04, lsOf = l => isCJK(l) ? lsC : .02, big = o.big ?? 58, padX = html ? 0 : Math.max(18, Math.min(40, w * .06));   // 章节自己排版的 HTML 卡（rv、nx）不加边距，和以前一样宽
  const maxEm = Math.max(...lines.map(l => emW(l) + lsOf(l) * [...l].length)), sub = o.sub, subSize = o.subSize ?? 20, subH = sub ? subSize * 1.7 : 0;
  const fitW = (w - 2 * padX) / Math.max(.5, maxEm), fitH = (h - 22 - subH) / (lines.length * 1.14), tgt = lines.length === 1 ? h * .42 : h * .62 / (lines.length * 1.12), fs = html ? big : Math.max(big, Math.min(tgt, fitW, fitH));
  // 语义缩放：near = 正常卡面；far = 只留标题，放大到占满卡面；都看不清时只剩色块
  const near = SM((fs * ss - 17) / 10), FP0 = html || !txt ? 0 : Math.max(fs, Math.min((w * .84) / Math.max(.5, maxEm), (h * .7) / (lines.length * 1.08)));
  // 主角卡（标题字号 ≥ 64，或 far: 倍数）：拉远时标题可以长到卡外，屏幕上保持约 26 像素，四根枝和招股书在总图上一直读得出
  // 远景的可选新做法（下一代那章片尾总图用，2026-11-03 加，只加不改）：farMode 'block' 拉远时只剩发光色块、不画字；'logo' 拉远时只画标志（farIcon 或 icon）；
  //   farPx：主角卡拉远时标题在屏幕上保持多少像素（默认 26）；farAt：从全片哪一刻起生效（之前照旧）。这几个都不传时 fm = null、farPx = 26，和原来一字不差
  const fm = o.farMode && t >= (o.farAt ?? -Infinity) ? o.farMode : null, farPx = o.farPx != null && t >= (o.farAt ?? -Infinity) ? o.farPx : 26;
  const hero = fm ? 0 : o.far ?? (big >= 64 ? 2.2 : 0), FP = hero ? Math.min(FP0 * hero, Math.max(FP0, farPx / Math.max(.02, ss))) : FP0;
  const poster = fm ? 0 : (1 - near) * SM((FP * ss - 12) / 6), detail = Math.max(near, poster);   // detail：远近两种状态下标题读不读得出
  const subFs = sub ? Math.min(subSize, (w - 2 * padX) * .94 / Math.max(1, emW(String(sub)) + (/[\u2e80-\uffff]/.test(sub) ? .05 : .24) * [...String(sub)].length)) : 0;
  const subA = sub ? SM((subFs * ss - 11) / 5) * near : 0;
  const glowK = (o.glow ?? 1) * (M.glowA ?? 1) * lerp(.25, 1, fm ? 1 : detail), dk = mix(M.g[2], '#000', .45), dk2 = mix(M.g[2], '#000', .7);   // 远处读不出字的小块不发光，总图才不乱
  const met = o.num === false ? null : METAL[M.metal], ink = o.col ?? M.ink, inkLow = M.light ? ink : mix(ink, M.glow, .2), strong = w >= 520 || big >= 64;
  const X0 = f1(x - w / 2), Y0 = f1(y - h / 2);
  let out = '';
  // 地上：亮着的卡在板上投一片自己颜色的光（地面反光）+ 软影子
  const spill = .38 * L * a * e * glowK;
  if (spill > .01 && !o.noShadow && !VIEW.lite) out += `<div style="position:absolute;left:${f1(x - w / 2 - 150)}px;top:${f1(y - h / 2 - 110)}px;width:${w + 300}px;height:${h + 220}px;background:radial-gradient(closest-side,${rgba(M.glow, .42)},${rgba(M.glow, .12)} 55%,transparent);opacity:${f3(spill)}"></div>`;
  if (!o.noShadow && !VIEW.lite) out += `<div style="position:absolute;left:${f1(x - w / 2 + 10)}px;top:${f1(y - h / 2 + 22)}px;width:${w}px;height:${h}px;border-radius:14px;background:rgba(0,0,0,.6);box-shadow:0 6px 34px 12px rgba(0,0,0,.55);opacity:${f3(.8 * a * e)}"></div>`;
  // 卡面（裁成圆角）：材质、光、扫光、剪影、内框、徽记
  let face = '';
  const imgBottom = o.img && !o.imgA;
  if (o.img) face += `<img src="${o.img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${o.pos ?? '50% 50%'};opacity:${o.imgA ?? 1}">${imgBottom && txt ? '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#0000 45%,#000c)"></div>' : ''}`;
  else if (!VIEW.lite) face += `<img src="${SKIN}mat_${o.mat ?? M.tex}.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${strong ? 1 : .42}">`;   // 主角卡（宽 ≥ 520 或标题字号 ≥ 64）用足材质，小卡淡一些，免得花
  // 光：由上往下，顶上亮、底下暗，顶部正中一团柔光（固定的，不随时间）
  if (!o.img) face += `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,${M.light ? .3 : .2}) 0%,rgba(255,255,255,.05) 36%,rgba(0,0,0,0) 56%,rgba(0,0,0,${M.light ? .06 : .24}) 100%),radial-gradient(80% 60% at 50% 0%,rgba(255,255,255,${M.light ? .2 : .15}),transparent 70%)"></div>`;
  // 落下时一道高光扫过（.2 秒后开始，.8 秒扫完；起点终点都在卡外，不会跳）
  const sw = (t - t0 - .2) / .8;
  if (sw > 0 && sw < 1 && L > .05) { const p = lerp(-30, 130, IO3(sw)); face += `<div style="position:absolute;inset:0;background:linear-gradient(105deg,transparent ${f1(p - 16)}%,rgba(255,255,255,${f3(.26 * L)}) ${f1(p)}%,transparent ${f1(p + 16)}%)"></div>`; }
  // 压暗：深色剪影盖住卡面（字在上面一层，按同样的比例淡下去）
  if (k > .002) face += `<div style="position:absolute;inset:0;background:${rgba(M.deep)};opacity:${f3(.9 * k)}"></div>`;
  // 内框 + 四角角饰（九宫格）+ 顶上小徽记：在剪影之上，压暗时还看得见
  if (!o.noOrn && !VIEW.lite) { const bw = Math.round(Math.max(12, Math.min(26, Math.min(w, h) * .11))), fi = Math.round(Math.max(6, Math.min(12, Math.min(w, h) * .045))), oa = lerp(1, .42, k) * lerp(.6, 1, near);
    face += `<div style="position:absolute;inset:${fi}px;border:${bw}px solid transparent;border-image:url(${SKIN}frame_${mk}.png) 40 / ${bw}px stretch;opacity:${f3(oa)}"></div>`;
    const ew = Math.min(w * .42, 230), eh = ew / 10, room = (h - lines.length * fs * 1.14 - subH) / 2;
    if (!o.img && txt && w >= 240 && room >= eh + fi + 12) face += `<img src="${SKIN}emb_${mk}.png" style="position:absolute;left:${f1((w - ew) / 2 - 2)}px;top:${f1(fi + Math.min(14, room * .25))}px;width:${f1(ew)}px;height:${f1(eh)}px;opacity:${f3(oa * near)}">`; }
  // 字（不裁）：只有一个标题，字号跟着远近连续变（近 = fs，远 = FP），不会两层叠影；主角卡拉远时标题可以超出卡边
  const icon = o.icon ? (LOGO[o.icon] ?? o.icon) : null;
  const iconH = (sz, row) => { if (!icon) return ''; const photo = /\.jpe?g$/i.test(icon), S = o.iconSize ? o.iconSize * sz / fs : Math.round(sz * (photo ? 1.15 : 1.0));
    return `<img src="${icon}" style="${row ? `margin-right:${f1(sz * .32)}px;` : `margin-bottom:${f1(sz * .18)}px;`}width:${f1(S)}px;height:${f1(S)}px;object-fit:${photo ? 'cover' : 'contain'};${photo ? `border-radius:${f1(S * .18)}px;border:2px solid ${rgba(ink, .85)};` : ''}flex:none">`; };
  const ts = FP ? lerp(FP, fs, near) : fs, tA = html ? near : SM((ts * ss - 12) / 6) * (fm ? near * (fm === 'block' ? SM((fs * ss - 30) / 8) : 1) : 1), halo = ts > fs * 1.05 ? `,0 0 ${f1(ts * .25)}px rgba(0,0,0,${f3(.6 * (1 - near))})` : '';
  // 标题两层：后面一层深色（细描边 + 往下几层硬投影 + 一团软影 = 立体），前面一层由上往下的渐变字；数字是金属字（见 titleLine）
  const lineHTML = front => lines.map(l => `<div style="letter-spacing:${lsOf(l)}em;white-space:nowrap">${titleLine(l, met, o.num !== false, front)}</div>`).join('');
  const titleDiv = sz => { if (html) return `<div style="font:700 ${f1(sz)}px ${HEI};color:${ink};line-height:1.14;letter-spacing:3px;white-space:pre-line;text-shadow:0 2px 0 ${rgba(dk, .9)},0 6px 16px rgba(0,0,0,.45)${halo}">${zh}</div>`;
    const back = M.light ? `color:rgba(255,255,255,.7);text-shadow:0 2px 4px rgba(0,0,0,.18)${halo}` : `color:${rgba(dk)};-webkit-text-stroke:${f2(Math.max(.8, sz * .015))}px ${rgba(dk)};text-shadow:0 ${f1(sz * .022)}px 0 ${rgba(dk)},0 ${f1(sz * .04)}px 0 ${rgba(dk2)},0 ${f1(sz * .08)}px ${f1(sz * .18)}px rgba(0,0,0,.45)${halo}`;
    return `<div style="position:relative;font:700 ${f1(sz)}px ${HEI};line-height:1.14"><div style="${back}">${lineHTML(false)}</div><div style="position:absolute;inset:0;background:linear-gradient(180deg,${rgba(ink)} 28%,${rgba(inkLow)} 100%);-webkit-background-clip:text;background-clip:text;color:transparent">${lineHTML(true)}</div></div>`; };
  const row = icon && (o.iconPos ?? 'left') === 'left';
  const wrapT = (sz, inner) => row ? `<div style="display:flex;align-items:center;justify-content:center">${iconH(sz, true)}${inner}</div>` : `${iconH(sz, false)}${inner}`;
  const textA = tA * (1 - .94 * k);   // 压暗时字几乎看不见
  let text = '';
  if (txt && textA > .002) text = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:${imgBottom ? 'flex-end' : 'center'};text-align:center;padding:0 ${f1(padX)}px ${imgBottom ? 12 : 0}px;opacity:${f3(textA)}">${wrapT(ts, titleDiv(ts))}${sub && subA > .002 ? `<div style="font:600 ${f1(subFs * near)}px ${/[\u2e80-\uffff]/.test(sub) ? K.HAN : EN};letter-spacing:${/[\u2e80-\uffff]/.test(sub) ? '.05em' : '.24em'};text-transform:uppercase;color:${M.light ? 'rgba(27,26,23,.75)' : 'rgba(255,255,255,.9)'};text-shadow:${M.light ? 'none' : '0 1px 2px rgba(0,0,0,.6)'};margin-top:${f1(subFs * .5 * near)}px;white-space:nowrap;opacity:${f3(tA > 0 ? Math.min(1, subA / tA) : 0)}">${sub}</div>` : ''}</div>`;
  const gl = L * glowK, rim = M.light ? edge : mix(edge, '#ffffff', .35);   // 亮着：外沿一道细亮边 + 两层柔和外发光；压暗：边只剩 3 成
  out += `<div style="position:absolute;left:${X0}px;top:${Y0}px;width:${w}px;height:${h}px;transform:translateZ(${f1(z)}px);opacity:${f3(a)};border-radius:12px;border:2px solid ${rgba(mix(edge, rim, L), lerp(1, .3, k))};background:linear-gradient(178deg,${M.g[0]},${M.g[1]} 55%,${M.g[2]});box-shadow:inset 0 1.5px 0 rgba(255,255,255,${f3(.5 * L + .08)}),inset 0 0 0 1px rgba(255,255,255,${f3(.1 * L)}),inset 0 -2px 0 rgba(0,0,0,.35)${gl > .01 ? `,0 0 ${f1(14 * gl)}px ${rgba(M.glow, .5 * gl)}${VIEW.lite ? '' : `,0 0 ${f1(46 * gl)}px ${rgba(M.glow, .32 * gl)}`}` : ''}"><div style="position:absolute;inset:0;border-radius:10px;overflow:hidden">${face}</div>${text}</div>`;
  // 远景只画标志（farMode 'logo'）：标志浮在卡面正中，拉远才出来；屏幕上约 o.farLogoPx（默认 44）像素，最大不超过卡宽
  if (fm === 'logo') { const lg = o.farIcon ?? o.icon, src = lg ? (LOGO[lg] ?? lg) : null, la = (1 - near) * (1 - .7 * k);
    if (src && la > .002) { const S = Math.min((o.farLogoPx ?? 44) / Math.max(.02, ss), w * .9); out += `<img src="${src}" style="position:absolute;left:${f1(x - S / 2)}px;top:${f1(y - S / 2)}px;width:${f1(S)}px;height:${f1(S)}px;object-fit:contain;transform:translateZ(${f1(z + 3)}px);opacity:${f3(la * a)};filter:drop-shadow(0 0 ${f1(S * .12)}px ${rgba(M.glow, .6)})">`; } }
  // 章
  if (o.badge) { const b = typeof o.badge === 'string' ? { kind: o.badge } : o.badge, pos = b.pos ?? 'top', bx = pos === 'left' ? x - w / 2 : pos === 'right' ? x + w / 2 : x, by = pos === 'top' ? y - h / 2 : pos === 'bottom' ? y + h / 2 : y;
    out += T9.badge(t, b.at ?? t0 + .35, bx, by, b.kind ?? 'yes', { r: b.r, dim, z: z + 24, a: o.op ?? 1 }); }   // 章跟着卡一起退场淡掉
  return out; };

// ---------------- 章：✓ ✗ ! ----------------
T9.badge = (t, t0, x, y, kind = 'yes', o = {}) => { if (t < t0) return ''; const r = o.r ?? 46, u = C((t - t0) / .34), sc = lerp(1.9, 1, BACK(u)), a = C((t - t0) / .08) * (o.a ?? 1), k = C((o.dim ?? 0) / .78);
  const P = { yes: ['#4fae62', '#1d5a2c', '#c4f5c9'], no: ['#c7384a', '#5c0e1a', '#ffbcc5'], warn: ['#d6962a', '#6b4306', '#ffe2a6'] }[kind] ?? ['#888', '#333', '#fff'];
  const g = kind === 'no' ? '<path d="M -16 -16 L 16 16 M 16 -16 L -16 16" stroke="#fff" stroke-width="11" stroke-linecap="round" fill="none"/>'
    : kind === 'warn' ? '<path d="M 0 -23 L 0 5" stroke="#fff" stroke-width="11" stroke-linecap="round"/><circle cx="0" cy="21" r="6.5" fill="#fff"/>'
    : '<path d="M -21 1 L -6 16 L 22 -15" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  return `<div style="position:absolute;left:${f1(x - r)}px;top:${f1(y - r)}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;transform:translateZ(${f1(o.z ?? 40)}px) scale(${f3(sc)});opacity:${f3(a)};background:radial-gradient(circle at 36% 28%,${P[0]},${P[1]} 78%);border:3px solid ${P[2]};box-shadow:0 0 0 3px rgba(0,0,0,.55),0 10px 22px rgba(0,0,0,.6),0 0 ${f1(26 * (1 - k))}px ${rgba(P[2], .45)};overflow:hidden"><svg viewBox="-50 -50 100 100" width="100%" height="100%" style="position:absolute;inset:0">${g}</svg>${k > .002 ? `<div style="position:absolute;inset:0;background:#0b0c0f;opacity:${f3(.8 * k)}"></div>` : ''}</div>`; };

// ---------------- 虚线箭头 ----------------
// T9.arrow(t, t0, d, pts, col, o)：一整条 SVG（以前是几十个小方块 div），块 18×11，每块带光晕，一直往前流；新选项见文件头 ②
T9.arrow = (t, t0, d, pts, col = '#9cc6ff', o = {}) => { if (t < t0 || !pts || pts.length < 2) return '';
  if (o.kind && KIND[o.kind]) col = KIND[o.kind];
  const k = C((o.dim ?? 0) / .78); if (k > 0) col = mix(col, '#80858f', .5 * k);
  let Lt = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([Lt, l, pts[i - 1], pts[i]]); Lt += l; }
  if (Lt < 1) return '';
  const P = IO3((t - t0) / d) * Lt; if (P < .5) return '';
  const at = u => { for (const [a, l, p, q] of seg) if (u <= a + l || q === pts[pts.length - 1]) { const kk = C((u - a) / (l || 1)); return [lerp(p[0], q[0], kk), lerp(p[1], q[1], kk), Math.atan2(q[1] - p[1], q[0] - p[0]) * 57.2958]; } };
  const hs = (o.head ?? 26) * 1.3, lw = o.lw ?? 10, dash = o.dash ?? [18, 11], per = dash[0] + dash[1], end = Math.max(0, P - .45 * hs);
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity; for (const [px, py] of pts) { mnx = Math.min(mnx, px); mny = Math.min(mny, py); mxx = Math.max(mxx, px); mxy = Math.max(mxy, py); }
  const pad = hs + 30, ox = mnx - pad, oy = mny - pad, W = mxx - mnx + 2 * pad, H = mxy - mny + 2 * pad;
  let dp = `M${f1(pts[0][0] - ox)} ${f1(pts[0][1] - oy)}`; for (const [a, l, p, q] of seg) { if (a >= end) break; const kk = C((end - a) / (l || 1)); dp += ` L${f1(lerp(p[0], q[0], kk) - ox)} ${f1(lerp(p[1], q[1], kk) - oy)}`; }
  const [tx, ty, ang] = at(P), mid = at(Lt / 2), ss = proj(mid[0], mid[1]), D = SM((dash[0] * ss - 3.5) / 3.5);   // 远处方块小于约 4 像素就换成细实线，不闪
  const off = f1((t * 40) % per), c = rgba(col), da = `stroke-dasharray="${dash[0]} ${dash[1]}" stroke-dashoffset="${-off}"`;
  let s = '';
  if (end > .5) { if (D > .002) s += `<path d="${dp}" fill="none" stroke="${c}" stroke-width="${lw + 12}" stroke-opacity="${f3(.16 * D)}" ${da}/><path d="${dp}" fill="none" stroke="${c}" stroke-width="${lw}" stroke-opacity="${f3(D)}" ${da}/>`;
    if (D < .998) s += `<path d="${dp}" fill="none" stroke="${c}" stroke-width="${f1(lw * .7)}" stroke-opacity="${f3((1 - D) * .7)}"/>`; }
  const hp = `M ${f1(.62 * hs)} 0 L ${f1(-.62 * hs)} ${f1(-.8 * hs)} L ${f1(-.62 * hs)} ${f1(.8 * hs)} Z`;
  s += `<g transform="translate(${f1(tx - ox)} ${f1(ty - oy)}) rotate(${f1(ang)})"><path d="${hp}" fill="${c}" stroke="${c}" stroke-width="10" stroke-opacity=".22" stroke-linejoin="round"/><path d="${hp}" fill="${c}"/></g>`;
  let h = `<svg width="${f1(W)}" height="${f1(H)}" style="position:absolute;left:${f1(ox)}px;top:${f1(oy)}px;overflow:visible;transform:translateZ(6px);opacity:${f3(o.a ?? 1)}">${s}</svg>`;
  // 金额牌：箭头走到 chipAt（默认一半）时弹出来
  if (o.chip != null) { const u = o.chipAt ?? .5, x0 = u < .5 ? Math.cbrt(u / 4) : 1 - Math.cbrt(2 * (1 - u)) / 2, tc = t0 + d * x0;
    if (t >= tc) { const [cx, cy] = at(u * Lt), pop = lerp(.55, 1, BACK(C((t - tc) / .3))), sz = o.chipSize ?? 44, ca = C((t - tc) / .1) * (o.a ?? 1) * SM((sz * ss - 12) / 8);
      const body = String(o.chip).replace(/[^\d,.$€¥%+\-−]+/g, m => `<span style="font:700 ${f1(sz * .72)}px ${HEI};letter-spacing:.04em;margin:0 .08em">${m}</span>`);
      if (ca > .002) h += `<div style="position:absolute;left:${f1(cx)}px;top:${f1(cy)}px;transform:translate(-50%,-50%) translateZ(14px) scale(${f3(pop)});opacity:${f3(ca)};white-space:nowrap;padding:0 ${f1(sz * .36)}px;border-radius:9px;background:linear-gradient(180deg,${rgba(mix(col, '#000', .45))},${rgba(mix(col, '#000', .7))});border:2px solid ${c};box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 18px ${rgba(col, .38)},0 8px 18px rgba(0,0,0,.6);font:${f1(sz * 1.18)}px ${NUM};line-height:${f1(sz * 1.36)}px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)">${body}</div>`; } }
  return h; };

// ---------------- 板上的小标签 ----------------
T9.label = (t, t0, x, y, s, o = {}) => { if (t < t0) return ''; const col = o.col ?? '#9cc6ff', sz = o.size ?? 34, ss = proj(x, y), tw = SM((sz * ss - 15) / 9), a = C((t - t0) / .2) * (o.a ?? 1) * tw;   // 远处读不出字就整个收起来
  if (a <= .002) return '';
  const bg = o.bg ?? 'linear-gradient(180deg,rgba(22,26,34,.94),rgba(11,13,18,.94))';
  return `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;transform:translate(-50%,-50%) translateZ(10px);opacity:${f3(a)};white-space:nowrap;background:${bg};border:1.5px solid ${rgba(col, .55)};border-radius:8px;padding:8px 20px;font:700 ${sz}px ${K.HAN};letter-spacing:2px;color:${col};box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 20px rgba(0,0,0,.55),0 0 20px ${rgba(col, .14)}"><span style="opacity:${f3(tw)}">${s}</span></div>`; };

// ---------------- 大数字板 ----------------
T9.num = (t, t0, x, y, s, o = {}) => { if (t < t0) return ''; const [, M] = matOf({ pal: o.pal ?? 'money' }), e = OUT((t - t0) / (o.d ?? .55)), a = C((t - t0) / .14) * (o.op ?? 1), k = C((o.dim ?? 0) / .78), L = 1 - k;
  if (a <= .001) return '';
  if (COUNT.on) countCard(x, y, a, L);
  const size = o.size ?? 150, str = String(s), h = o.h ?? Math.round(size * (o.sub ? 1.62 : 1.3)), w = o.w ?? Math.round(emW(str) * size * .78 + size * 1.1), T = o.thick ?? 24, z = lerp(170, T, e);
  const met = METAL[M.metal] ?? METAL.gold, ss = proj(x, y), tw = SM((size * ss - 14) / 10) * (o.farMode === 'block' && t >= (o.farAt ?? -Infinity) ? SM((size * ss - 40) / 14) : 1);   // farMode 'block'（可选）：远处数字收掉，只剩发光的板
  const runs = str.replace(/[^\d,.$€¥%+\-−]+/g, m => `\u0001${m}\u0002`).split(/(\u0001[^\u0002]*\u0002)/).filter(Boolean);
  const txt = (shadow) => runs.map(r => r[0] === '\u0001' ? `<span style="font:${f1(size * .44)}px ${HEI};letter-spacing:.06em;margin:0 .12em;${shadow ? `color:${rgba(mix(M.g[2], '#000', .5))}` : `color:${M.ink};text-shadow:0 2px 0 ${rgba(mix(M.g[2], '#000', .4))}`}">${r.slice(1, -1)}</span>`
    : `<span style="font:${size}px ${NUM};letter-spacing:.02em;${shadow ? `color:${rgba(mix(M.g[2], '#000', .5))}` : `background:linear-gradient(180deg,${met[0]} 8%,${met[1]} 44%,${met[2]} 56%,${met[3]} 94%);-webkit-background-clip:text;background-clip:text;color:transparent`}">${r}</span>`).join('');
  const X0 = x - w / 2, Y0 = y - h / 2, side = rgba(mix(M.g[2], '#000', .25));
  // 厚度：下、左、右三面（板往后倒，上面那面看不见）
  const wall = (css, ww, hh, tf) => `<div style="position:absolute;${css}width:${f1(ww)}px;height:${f1(hh)}px;transform-origin:${tf[0]};transform:translateZ(${f1(z)}px) ${tf[1]};background:linear-gradient(${tf[2]},${rgba(M.g[1])},${side});opacity:${f3(a)}">${k > .002 ? `<div style="position:absolute;inset:0;background:${rgba(M.deep)};opacity:${f3(.85 * k)}"></div>` : ''}</div>`;
  let out = `<div style="position:absolute;left:${f1(X0 + 14)}px;top:${f1(Y0 + 26)}px;width:${w}px;height:${h}px;border-radius:14px;background:rgba(0,0,0,.6);box-shadow:0 6px 40px 14px rgba(0,0,0,.5);opacity:${f3(.8 * a * e)}"></div>`;
  if (VIEW.lite) out = '';   // 轻量远景：数字板不画落地影子、地面光和三个侧面
  if (L > .01 && !VIEW.lite) out += `<div style="position:absolute;left:${f1(X0 - 160)}px;top:${f1(Y0 - 120)}px;width:${w + 320}px;height:${h + 240}px;background:radial-gradient(closest-side,${rgba(M.glow, .4)},transparent);opacity:${f3(.5 * L * a * e)}"></div>`;
  if (!VIEW.lite) out += wall(`left:${f1(X0)}px;top:${f1(Y0 + h)}px;`, w, T, ['50% 0', 'rotateX(-90deg)', '180deg']) + wall(`left:${f1(X0)}px;top:${f1(Y0)}px;`, T, h, ['0 50%', 'rotateY(90deg)', '90deg']) + wall(`left:${f1(X0 + w)}px;top:${f1(Y0)}px;`, T, h, ['0 50%', 'rotateY(90deg)', '270deg']);
  const sw = (t - t0 - .25) / .9, sweep = sw > 0 && sw < 1 && L > .05 ? `<div style="position:absolute;inset:0;background:linear-gradient(105deg,transparent ${f1(lerp(-30, 130, IO3(sw)) - 14)}%,rgba(255,255,255,${f3(.3 * L)}) ${f1(lerp(-30, 130, IO3(sw)))}%,transparent ${f1(lerp(-30, 130, IO3(sw)) + 14)}%)"></div>` : '';
  const sub = o.sub ? `<div style="font:600 ${f1(size * .2)}px ${/[\u2e80-\uffff]/.test(o.sub) ? K.HAN : EN};letter-spacing:.2em;color:rgba(255,255,255,.72);margin-top:${f1(size * .02)}px;white-space:nowrap">${o.sub}</div>` : '';
  out += `<div style="position:absolute;left:${f1(X0)}px;top:${f1(Y0)}px;width:${w}px;height:${h}px;transform:translateZ(${f1(z)}px);opacity:${f3(a)};border-radius:12px;overflow:hidden;border:2px solid ${rgba(mix(M.edge, '#ffffff', .35 * L), lerp(1, .3, k))};background:linear-gradient(178deg,${M.g[0]},${M.g[1]} 55%,${M.g[2]});box-shadow:inset 0 2px 0 rgba(255,255,255,${f3(.5 * L + .05)}),inset 0 -3px 0 rgba(0,0,0,.35),0 0 ${f1(16 * L)}px ${rgba(M.glow, .5 * L)},0 0 ${f1(54 * L)}px ${rgba(M.glow, .34 * L)}">` +
    `${VIEW.lite ? '' : `<img src="${SKIN}mat_${M.tex}.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`}<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.05) 36%,rgba(0,0,0,0) 56%,rgba(0,0,0,.24) 100%)"></div>` +
    `<div style="position:absolute;inset:10px;border:1.5px solid ${rgba(M.edge, .45)};border-radius:7px"></div>` +
    `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:${f3(tw)}"><div style="position:relative;white-space:nowrap;line-height:1"><div style="position:absolute;left:0;top:${f1(size * .045)}px;white-space:nowrap">${txt(true)}</div><div style="position:relative;white-space:nowrap">${txt(false)}</div></div>${sub}</div>` +
    sweep + (k > .002 ? `<div style="position:absolute;inset:0;background:${rgba(M.deep)};opacity:${f3(.88 * k)}"></div>` : '') + `</div>`;
  return out; };

// ---------------- 背景大字（条纹字，躺在板上）----------------
T9.word = (t, t0, x, y, s, o = {}) => { if (t < t0) return ''; const a = (o.a ?? .12) * (o.vis ?? C((t - t0) / .6)); if (a <= .002) return ''; const size = o.size ?? 640, per = Math.max(8, size * .056), col = o.col ?? '#ffffff';
  return `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;transform:translate(-50%,-50%) rotate(${f1(o.rot ?? 0)}deg) translateZ(1px);white-space:nowrap;font:700 ${size}px ${HEI};letter-spacing:.04em;line-height:1.1;color:transparent;background:repeating-linear-gradient(180deg,${rgba(col)} 0 ${f1(per * .46)}px,transparent ${f1(per * .46)}px ${f1(per)}px);-webkit-background-clip:text;background-clip:text;opacity:${f3(a)}">${s}</div>`; };

// ---------------- 底板 ----------------
const MOOD = [];
const moodAt = t => { let W = 0, r = 0, g = 0, b = 0; for (const [a, bb, col, kk] of MOOD) { const w = Math.min(SM((t - a) / .6), 1 - SM((t - bb) / .6)) * (kk ?? 1); if (w <= 0) continue; const c = hx(MOODS[col] ?? col); W += w; r += c[0] * w; g += c[1] * w; b += c[2] * w; }
  return W <= 0 ? null : { w: Math.min(1, W), c: [r / W, g / W, b / W, 1] }; };
// o.still（可选，下一代那章总图用）：板不自己轻轻晃
const board = (t, cam, inner, o = {}, P = 1500) => { const wb = o.still ? 0 : Math.sin(t * .37) * .5, s = cam.s * (1 + (o.still ? 0 : .004 * Math.sin(t * .23))), cy = o.cy ?? 480, md = moodAt(t), mw = md ? md.w : 0;
  const c0 = md ? mix('#262a31', md.c, mw) : '#262a31', c1 = md ? mix('#15171c', mix(md.c, '#000', .4), mw) : '#15171c', c2 = md ? mix('#0b0c10', mix(md.c, '#000', .72), mw) : '#0b0c10';
  const pool = md ? mix('#96a8c4', mix(md.c, '#fff', .35), mw * .9) : '#96a8c4', poolA = md ? lerp(.11, .2, mw) : .11;   // 地上那片光
  const gridA = lerp(.35, 1, SM((s - .2) / .45)) * (o.farGrid === false ? SM((s - .24) / .1) : 1) * (o.grid === false ? 0 : 1), fogA = .5 * SM(((cam.rx ?? 0) - 10) / 32), fogC = md ? mix('#454d5b', mix(md.c, '#fff', .2), mw) : '#454d5b';
  const PW = 2400 / Math.max(.15, s), PH = 1700 / Math.max(.15, s);
  return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,${rgba(c0)} 0%,${rgba(c1)} 62%,${rgba(c2)} 100%);overflow:hidden;perspective:${P}px;perspective-origin:50% 42%">` +
    `<div style="position:absolute;left:960px;top:${cy}px;width:0;height:0;transform-style:preserve-3d;transform:rotateX(${f1(cam.rx)}deg) rotateZ(${f3(cam.rz + wb)}deg) scale(${f3(s)}) translate(${f1(-cam.x)}px,${f1(-cam.y)}px)">` +
    (gridA > .002 ? `<div style="position:absolute;left:-3000px;top:-1600px;width:8400px;height:10000px;opacity:${f3(gridA)};background-image:radial-gradient(rgba(255,255,255,.085) 1.15px,transparent 1.6px),linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:32px 32px,320px 320px,320px 320px"></div>` : '') +   // 点阵淡没了（只有 farGrid: false 拉远时）就整块不画
    `<div style="position:absolute;left:${f1(cam.x - PW / 2)}px;top:${f1(cam.y - PH / 2)}px;width:${f1(PW)}px;height:${f1(PH)}px;background:radial-gradient(closest-side,${rgba(pool, poolA)} 0%,${rgba(pool, poolA * .45)} 45%,transparent 100%)"></div>` +
    `${inner}</div>` +
    `<div style="position:absolute;inset:0;background:linear-gradient(180deg,${rgba(fogC, .9)} 0%,${rgba(fogC, .35)} 22%,transparent 50%);opacity:${f3(fogA)};pointer-events:none"></div>` +
    `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#0000 52%,#000b 100%);pointer-events:none"></div></div>`; };
T9.board = (t, cam, inner, o = {}) => board(t, cam, inner, o, 1500);
if (SP) SP.board = (t, cam, inner, o = {}) => board(t, cam, inner, o, o.persp ?? 1500);

// ---------------- 登记表 ----------------
const litOf = (t, on, fi = .35, fo = .6) => on.reduce((m, [a, b]) => Math.max(m, Math.min(C((t - a) / fi), 1 - C((t - b) / fo))), 0);
// 登记（和 tree9.js 一样；选项里的 kind（箭头的颜色含义、章的种类）存成 kind2，不和东西的种类打架）
const reg = (kind, id, o) => { if (TR.byId[id]) console.error(`树上重复的 id：${id}`); const { kind: k2, ...rest } = o; const it = { kind, id, ...rest, kind2: k2, on: o.on ?? [[o.at, o.at + 8]] }; TR.items.push(it); TR.byId[id] = it; return it; };
K.tnode = (id, o) => reg('node', id, o); K.tcard = (id, o) => reg('card', id, o); K.tarrow = (id, o) => reg('arrow', id, o); K.tlabel = (id, o) => reg('label', id, o);
K.tbadge = (id, o) => reg('badge', id, o); K.tnum = (id, o) => reg('num', id, o); K.tword = (id, o) => reg('word', id, { ...o, on: o.on ?? [[o.at, Infinity]] });
K.tmood = (list) => { for (const r of list) MOOD.push(r); };
const NODE_KEYS = ['w', 'h', 'big', 'sub', 'subSize', 'img', 'pos', 'imgA', 'd', 'z', 'icon', 'iconPos', 'iconSize', 'badge', 'mat', 'num', 'glow', 'noOrn', 'far', 'farMode', 'farAt', 'farPx', 'farIcon', 'farLogoPx'];
const draw = (it, t) => { if (t < it.at) return ''; const ra = retA(it, t); if (ra <= .001) return ''; const dim = K.tdim(t, it.on), k = C(dim / .78);
  if (it.kind === 'node') { const o = {}; for (const q of NODE_KEYS) if (it[q] !== undefined) o[q] = it[q];
    const to = it.pal ?? 'grey', P1 = K.PAL[to] ?? K.PAL.grey; o.dim = dim; o.op = ra;
    // 没轮到的枝是灰的，第一次亮起时 .35 秒里换成自己的颜色（以前是一下子换，会跳一帧）
    if (it.off) { const st = it.on.filter(([a]) => a <= t).map(([a]) => a), m = st.length ? C((t - Math.min(...st)) / .35) : 0, P0 = K.PAL[it.off] ?? K.PAL.grey;
      if (m < .999) { const base = T9.node(t, it.at, it.x, it.y, it.zh ?? '', { ...P0, pal: it.off, ...o, col: it.col ?? P0.col });
        return m <= .001 ? base : base + T9.node(t, it.at, it.x, it.y, it.zh ?? '', { ...P1, pal: to, ...o, col: it.col ?? P1.col, op: m * ra, noShadow: true }); } }
    return T9.node(t, it.at, it.x, it.y, it.zh ?? '', { ...P1, pal: to, ...o, col: it.col ?? P1.col }); }
  if (it.kind === 'arrow') return T9.arrow(t, it.at, it.d ?? .6, it.pts, it.col ?? '#9cc6ff', { a: lerp(1, .32, k) * ra, dim, chip: it.chip, chipAt: it.chipAt, chipSize: it.chipSize, kind: it.kind2, lw: it.lw, dash: it.dash, head: it.head });
  if (it.kind === 'label') return T9.label(t, it.at, it.x, it.y, it.s, { col: it.col, size: it.size, a: lerp(1, .3, k) * ra, bg: it.bg });
  if (it.kind === 'badge') return T9.badge(t, it.at, it.x, it.y, it.kind2 ?? 'yes', { r: it.r, dim, z: it.z, a: ra });
  if (it.kind === 'num') return T9.num(t, it.at, it.x, it.y, it.s, { pal: it.pal, w: it.w, h: it.h, size: it.size, sub: it.sub, dim, d: it.d, thick: it.thick, op: ra, farMode: it.farMode, farAt: it.farAt });
  if (it.kind === 'card') { if (COUNT.on) countCard(it.x, it.y, C((t - it.at) / .14) * ra, 1 - k); const w = it.w ?? 900, h = w * it.ih / it.iw, sc = w / it.iw, e = OUT((t - it.at) / .5), a = C((t - it.at) / .14) * ra, x = it.x, y = it.y, L = 1 - k, farK = (it.farMode === 'block' && t >= (it.farAt ?? -Infinity) ? .92 : .5) * (1 - SM((w * proj(x, y) - 90) / 110));   // farMode 'block'（可选）：远处截图几乎压成色块
    let hl = ''; if (it.hl && it.hlAt != null && t >= it.hlAt) { const tot = it.hl.reduce((s, r) => s + r[2], 0); let acc = 0, q0 = C((t - it.hlAt) / (it.hlDur ?? .6)); for (const [hx2, hy, hw, hh] of it.hl) { const q = C((q0 - acc / tot) / (hw / tot)); acc += hw; if (q > 0) hl += `<div style="position:absolute;left:${f1(hx2 * sc)}px;top:${f1(hy * sc)}px;width:${f1(hw * sc * q)}px;height:${f1(hh * sc)}px;background:#ffd83d66"></div>`; } }
    const sw = (t - it.at - .2) / .8, sweep = sw > 0 && sw < 1 && L > .05 ? `<div style="position:absolute;inset:0;background:linear-gradient(105deg,transparent ${f1(lerp(-30, 130, IO3(sw)) - 14)}%,rgba(255,255,255,${f3(.22 * L)}) ${f1(lerp(-30, 130, IO3(sw)))}%,transparent ${f1(lerp(-30, 130, IO3(sw)) + 14)}%)"></div>` : '';
    return `<div style="position:absolute;left:${f1(x - w / 2 + 12)}px;top:${f1(y - h / 2 + 24)}px;width:${w}px;height:${f1(h)}px;background:rgba(0,0,0,.6);border-radius:14px;box-shadow:0 6px 36px 12px rgba(0,0,0,.5);opacity:${f3(.8 * a)}"></div>` +
      `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${w}px;height:${f1(h)}px;transform:translateZ(${f1(lerp(170, 18, e))}px);opacity:${f3(a)};border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,${f3(lerp(.42, .14, k))});box-shadow:inset 0 1.5px 0 rgba(255,255,255,.35),0 0 ${f1(34 * L)}px rgba(255,255,255,${f3(.2 * L)});background:#111"><img src="${it.img}" style="position:absolute;inset:0;width:100%;height:100%">${hl}${sweep}${k + farK > .002 ? `<div style="position:absolute;inset:0;background:#0b0c0f;opacity:${f3(Math.max(.86 * k, farK))}"></div>` : ''}</div>`; }
  return ''; };
const drawWord = (it, t) => { if (t < it.at) return ''; const vis = litOf(t, it.on, .6, .6) * retA(it, t); return vis <= .001 ? '' : T9.word(t, it.at, it.x, it.y, it.s, { col: it.col, size: it.size, a: it.a, rot: it.rot, vis }); };
// ---------------- 分区底板（远景总图）----------------
// 镜头拉远（cam.s < .32）时，每根枝底下长出来的那一片铺一块很淡的同色底板，总图读起来是四个区，不是一地小卡。
// 区的范围 = 这根枝的卡 + 登记 id 前缀属于它的东西（已经落下的）+ 各章自己画、没登记的地盘（boxes，章开始以后才算）。新东西落下时底板 .6 秒长过去，不跳。
// 底板抬高 1 像素：ct.js 在自己地盘底下铺了一层暗底，不抬会被它盖住。
// 分区写在 episode.yaml：tree: {zones: [{pal: money, pre: [rv, ls], boxes: [[-1500, 5300, 450, 6400, 钱：几千亿合同]]}, {pal: wheel, pre: [wh]}]}
//   pal 是 MAT 里的配色名，pre 是这一区登记 id 的前缀，boxes 是各章自己画、没登记的地盘（第 5 项是章名，章开始以后才算）。章节里也能加：K.tzone('wheel', {pre: ['wh']})
const ZONES = (EP.tree?.zones ?? []).map(z => ({ ...z }));
K.tzone = (pal, o) => { const z = ZONES.find(q => q.pal === pal); if (z) Object.assign(z, o); else ZONES.push({ pal, ...o }); };
const itemBox = it => { if (it.pts) { const xs = it.pts.map(q => q[0]), ys = it.pts.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  const w = it.w ?? (it.kind === 'card' ? 900 : it.kind === 'label' ? 300 : 460), h = it.kind === 'card' ? w * it.ih / it.iw : it.h ?? (it.kind === 'label' ? 60 : 210); return [it.x - w / 2, it.y - h / 2, it.x + w / 2, it.y + h / 2]; };
const U = (a, b) => !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const zonesHTML = t => { const cam = VIEW.cam; if (!cam) return ''; const s = cam.s ?? 1, fw = 1 - SM((s - .18) / .14); if (fw <= .002) return '';
  const chs = window.timeline?.chapters ?? [], boxes = [];
  for (const z of ZONES) { let Bo = null, Bn = null, last = -1e9, n = 0; const add = (b, at) => { Bn = U(Bn, b); if (t - at >= .6) Bo = U(Bo, b); else last = Math.max(last, at); };
    for (const it of TR.items) { if (t < it.at || (RET.on && !kept(it))) continue; const p = it.id.split('_')[0]; if (it.id === 'br_' + z.pal) add(itemBox(it), it.at); else if (z.pre?.includes(p)) { add(itemBox(it), it.at); n++; } }   // 开了退场：只算名单里的（它们不退场，底板不会跟着缩）
    for (const [x0, y0, x1, y1, ch] of z.boxes ?? []) { if (RET.on && !RET.keep.has('layer:' + ch)) continue; const c = chs.find(q => q.name === ch), at = c ? c.t0 : 0; if (t >= at) { add([x0, y0, x1, y1], at); n++; } }
    if (!Bn || n < 2) continue; const u = SM((t - last) / .6), B = Bo ? Bo.map((v, i) => lerp(v, Bn[i], u)) : Bn;
    boxes.push({ z, B: [B[0] - 70, B[1] - 60, B[2] + 70, B[3] + 90], a: Bo ? 1 : u }); }
  boxes.sort((p, q) => p.B[0] - q.B[0]);
  for (let i = 1; i < boxes.length; i++) { const A = boxes[i - 1].B, Bq = boxes[i].B; if (A[2] + 40 > Bq[0] && A[1] < Bq[3] && Bq[1] < A[3]) { const m = (A[2] + Bq[0]) / 2; A[2] = m - 20; Bq[0] = m + 20; } }   // 相邻两区不叠
  const bw = Math.min(14, 2 / Math.max(.05, s));
  return boxes.map(({ z, B, a }) => { const M = MAT[z.pal] ?? MAT.grey;
    return `<div style="position:absolute;left:${f1(B[0])}px;top:${f1(B[1])}px;width:${f1(B[2] - B[0])}px;height:${f1(B[3] - B[1])}px;border-radius:70px;transform:translateZ(1px);border:${f1(bw)}px solid ${rgba(M.edge, .2)};background:linear-gradient(180deg,${rgba(M.glow, .11)},${rgba(M.glow, .045)} 22%,${rgba(M.glow, .03)});opacity:${f3(fw * a)}"></div>`; }).join(''); };
// ---------------- 退场（讲完就收掉，不留在板上）----------------
// 开了退场（tree_keep.json 的 retire: true）时：
//  · 登记的卡、箭头、标签、章、数字板、背景字：不在名单里的，在它最后一段亮着的时间（on 的最后一个结束时刻）之后 1 秒，用 .6 秒淡到看不见，之后不再画。
//    箭头两头都碰到名单里的东西（卡边外 70 像素内）就算在名单里，不用一根根写。
//  · 各章自己画的图层（K.tlayer）：按章算，名单里写 "layer:章名"（比如 "layer:开头"）就留下；不写的，这一章结束后 1.4 秒开始淡，2 秒没了。
//  · 拉远（cam.s 从 .32 到 .18）时，不在名单里的东西也一起收起来，远景只剩骨架：名单里的卡、名单里的图层、它们之间的箭头。
//  · 名单里的东西照常压暗成剪影，一直留着；全片最后看全树时只有它们。
let CUR = null;
{ const k8 = K.kit8; if (k8) K.kit8 = (X, ...r) => { CUR = X; return k8(X, ...r); }; }   // 各章开头都调 K.kit8(X)，借它知道 tlayer 是哪一章登记的
K.tlayer = f => { if (CUR) { f.__ch = CUR.name; f.__t1 = CUR.t1; } TR.layers.push(f); };
const farA = () => SM(((VIEW.cam?.s ?? 1) - .18) / .14);
const endOf = it => it.__end ?? (it.__end = Math.max(...it.on.map(r => r[1])));
const keptBoxes = () => RET.boxes ?? (RET.boxes = TR.items.filter(it => it.kind !== 'arrow' && RET.keep.has(it.id)).map(itemBox));
const touches = p => keptBoxes().some(b => p[0] >= b[0] - 70 && p[0] <= b[2] + 70 && p[1] >= b[1] - 70 && p[1] <= b[3] + 70);
const kept = it => it.__kept ?? (it.__kept = RET.keep.has(it.id) || (it.kind === 'arrow' && it.pts?.length > 1 && touches(it.pts[0]) && touches(it.pts[it.pts.length - 1])));
const retA = (it, t) => !RET.on || kept(it) ? 1 : (1 - SM((t - endOf(it) - 1) / .6)) * farA();
// 拉远时收起图层、截图淡到 2 成，只对已经讲完的章（t ≥ 这一章结束）：开头自己最后拉远看全树（s .2）时还在讲开头，不能把开头自己的卡收掉（2026-11-03 修）
const ownCh = (f, t) => f.__t1 != null && t < f.__t1;
const layerA = (f, t) => !RET.on || !f.__ch || RET.keep.has('layer:' + f.__ch) ? 1 : (1 - SM((t - f.__t1 - 1.4) / .6)) * (ownCh(f, t) ? 1 : farA());
// 图层淡出：不能包一层 opacity（会把 3D 压平，卡的高度一下子没了 = 跳），所以把透明度乘到最外层的每个元素上
const fadeTop = (html, a) => { let out = '', i = 0, depth = 0, j;
  while ((j = html.indexOf('<', i)) >= 0) { const k = html.indexOf('>', j); if (k < 0) break; out += html.slice(i, j); let tag = html.slice(j, k + 1); i = k + 1;
    if (tag[1] === '/') { depth--; out += tag; continue; } if (tag[1] === '!') { out += tag; continue; }
    const name = (/^<([a-zA-Z0-9]+)/.exec(tag) || [])[1] || '', selfC = tag.endsWith('/>') || /^(img|br|hr|input|source)$/i.test(name);
    if (depth === 0) { const st = /style="([^"]*)"/.exec(tag);
      if (st) { const m = /(^|;)\s*opacity:\s*([\d.]+)/.exec(st[1]); tag = tag.replace(st[0], `style="${m ? st[1].replace(m[0], `${m[1]}opacity:${f3(+m[2] * a)}`) : `opacity:${f3(a)};${st[1]}`}"`); }
      else tag = tag.replace(/^<([a-zA-Z0-9]+)/, `<$1 style="opacity:${f3(a)}"`); }
    if (!selfC) depth++; out += tag; }
  return out + html.slice(i); };
const SHOTS = new RegExp(`<img src="([^"]*(?:\\/tw_|\\/pg_|\\/card_|${(K.DOCS ?? 'assets/s1').replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}\\/)[^"]*)" style="`, 'g');
// 先画分区底板和背景大字，再画各章的图层，再画登记的东西（和 tree9.js 一样的先后）
K.treeHTML = t => { let h = zonesHTML(t); for (const it of TR.items) if (it.kind === 'word') h += drawWord(it, t);
  const fa = RET.on ? farA() : 1;
  for (const f of TR.layers) { const la = layerA(f, t); if (la <= .001) continue; COUNT.LA = la; let x = f(t); COUNT.LA = 1; if (COUNT.on && x && la > .3) COUNT.layers.push(f.__ch);
    if (fa < .999 && !ownCh(f, t)) x = x.replace(SHOTS, `<img src="$1" style="opacity:${f3(lerp(.2, 1, fa))};`);   // 开了退场：远景里各章图层的截图淡到 2 成，不留看不清的字（截图按文件名认：tw_ pg_ card_ 开头，或在文件截图目录里）
    h += la >= .999 ? x : fadeTop(x, la); }
  for (const it of TR.items) if (it.kind !== 'word') h += draw(it, t); return h; };
// 查字太多的卡：K.tskin.audit() → [{id, zh, sub, 问题}]。一张卡一个短标题（一行、约 8 个字以内），最多一行英文小字
const audit = () => TR.items.filter(it => it.kind === 'node').map(it => { const zh = String(it.zh ?? ''), p = [];
  if (/</.test(zh)) p.push('标题是自排的 HTML'); else { if (zh.split('\n').length > 1) p.push('标题两行'); if (Math.max(...zh.split('\n').map(l => emW(l))) > 8.5) p.push('标题超过约 8 个字'); }
  if (it.sub && /[\u2e80-\uffff]/.test(it.sub)) p.push('小字是中文'); if (it.sub && emW(it.sub) > 22) p.push('小字太长');
  return { id: it.id, zh: zh.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 30), sub: it.sub, 问题: p }; }).filter(r => r.问题.length);

K.tskin = { MAT, VIEW, proj, projXY, MOOD, ZONES, RET, COUNT, audit, ready, retA };   // retA(登记项, t)：退场透明度，space9 的厚度用
})();
