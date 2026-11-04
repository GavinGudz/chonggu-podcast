// kit8.js —— 第 8 期定下来的手感工具（缓动、进场、纸、出处小字、片名卡）。章节里：const KK = K.kit8(X); const { UP, PO, T, N, box, sheet, … } = KK;
// 同一个 t 永远画出同一帧。片名卡的字、清单的条目这类每期不一样的东西都从 window.EP（episode.yaml）来，这里不写死。
(() => {
const K = window.K, { lerp, C } = K, f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);
const INK = '#1b1a17', INK2 = '#6d685d', PAPER = '#f4f0e6', CREAM = '#efe5cd', RULE = '#d8d1c1', RI = '#c5302a', GI = '#94690f', BI = '#1f5f86';
const OUT = x => 1 - (1 - C(x)) ** 4;                                         // 快进、长长地慢停
const IO = x => { x = C(x); return x < .5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2; };   // 位移用：起步也缓
const CUB = x => 1 - (1 - C(x)) ** 3;                                         // 柱子和数字：跟着话长，不是一抽
const IO3 = x => { x = C(x); return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; };   // 整组大位移：看得见走的过程
const sinPi = x => Math.sin(Math.PI * C(x));
const rise = (t, t0, o = {}) => { const d = o.d ?? .4, e = OUT((t - t0) / d), dx = (o.dx ?? 0) * (1 - e), dy = (o.dy ?? 22) * (1 - e), s = lerp(o.s0 ?? 1, 1, e), bl = (o.blur ?? 1.5) * (1 - C((t - t0) / (d * .55))); return `opacity:${f3(C((t - t0) / (d * .35)))};transform:translate(${f1(dx)}px,${f1(dy)}px) scale(${f3(s)});${bl > .15 ? `filter:blur(${f1(bl)}px);` : ''}`; };
const pop = (t, t0, o = {}) => { const d = o.d ?? .3; return `opacity:${f3(C((t - t0) / .07))};transform:scale(${f3(lerp(o.s0 ?? .5, 1, K.back((t - t0) / d, o.c ?? 1.6)))});`; };
const AT = (x, y, html, o = {}) => `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;transform:translate(${o.a ?? '-50%'},-50%);white-space:nowrap;z-index:${o.z ?? 'auto'};${o.css ?? ''}">${html}</div>`;
const UP = (t, t0, x, y, html, o = {}) => t < t0 ? '' : AT(x, y, `<div style="display:inline-block;${rise(t, t0, o)}">${html}</div>`, o);       // 缓出进场
const PO = (t, t0, x, y, html, o = {}) => t < t0 ? '' : AT(x, y, `<div style="display:inline-block;${pop(t, t0, o)}">${html}</div>`, o);        // 带一点回弹：只给盖章、硬币、关键的一个数
const T = (s, size = 40, col = K.TEXT, o = {}) => `<span style="font:${o.wt ?? 700} ${size}px ${o.f ?? K.HAN};color:${col};letter-spacing:${o.ls ?? 2}px;${o.css ?? ''}">${s}</span>`;
const N = (s, size, col, o = {}) => `<span style="font:${size}px ${K.NUM};color:${col};line-height:1.05;${o.css ?? ''}">${s}</span>`;
const box = (x, y, bw, bh, bg, css = '') => `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;width:${f1(Math.max(0, bw))}px;height:${f1(Math.max(0, bh))}px;background:${bg};${css}"></div>`;
const shade = '0 3px 10px #000d,0 0 26px #0009';
const WT = (s, size, col = '#fff', o = {}) => T(s, size, col, { ...o, css: `text-shadow:${shade};${o.css ?? ''}` });
const WN = (s, size, col = '#fff', o = {}) => N(s, size, col, { ...o, css: `text-shadow:${shade};${o.css ?? ''}` });
const count = (t, t0, a, b, d = .7, n = 0, fn = OUT) => { const v = lerp(a, b, fn((t - t0) / d)); return n ? v.toFixed(n) : Math.round(v).toLocaleString('en-US'); };
const bed = (n, t, t0, o = {}) => K.bg(n, t, t0 - (o.skip ?? 0), { sat: .85, ...o });
const upA = (d, col) => `<svg width="${f1(d * .7)}" height="${d}" viewBox="-35 -50 70 100"><path d="M 0 -46 L 32 -6 H 12 V 46 H -12 V -6 H -32 Z" fill="${col}"/></svg>`;
const downA = (d, col) => `<svg width="${f1(d * .7)}" height="${d}" viewBox="-35 -50 70 100"><path d="M 0 46 L 32 6 H 12 V -46 H -12 V 6 H -32 Z" fill="${col}"/></svg>`;
const coin = (x, y, d, css = '', on = true) => `<div style="position:absolute;left:${f1(x - d / 2)}px;top:${f1(y - d / 2)}px;width:${d}px;height:${d}px;border-radius:50%;background:${on ? `radial-gradient(circle at 35% 30%,#ffe9a8,#dcab3e 55%,#a87d24)` : '#dfd9cb'};${on ? 'box-shadow:0 2px 5px #7a5a1c55;' : ''}${css}"></div>`;
const marker = (s, a) => `<span style="background:linear-gradient(rgba(255,222,60,.85),rgba(255,222,60,.85)) no-repeat 0 0/${f1(100 * a)}% 100%;border-radius:4px;padding:0 4px;margin:0 -4px">${s}</span>`;   // 荧光笔从左往右划
const EP = window.EP ?? {}, SHOW = EP.show ?? '重估';   // 台标：节目名
const pill = `<div style="position:absolute;right:130px;top:62px;font:700 30px ${K.HAN};letter-spacing:6px;color:${K.GOLD};background:#0d1016f0;border:1.5px solid ${K.GOLD}99;padding:6px 14px 6px 20px;border-radius:6px;z-index:87">${SHOW}</div>`;
const PZ = 1720 / 1920;

K.kit8 = (X, opt = {}) => {
  let RUNS = opt.runs ?? [];
  const inkHud = `<div style="position:absolute;left:130px;top:62px;display:flex;align-items:center;gap:16px;z-index:86"><div style="width:4px;height:44px;background:${GI}"></div><div><div style="font:600 20px ${K.HAN};letter-spacing:6px;color:${GI}">${X.meta?.eb ?? ''}</div><div style="font:700 32px ${K.HAN};letter-spacing:4px;color:${INK}">${X.name}</div></div></div>`;
  // 纸：略斜，压在虚化的实拍上，字幕落在纸下面。纸内坐标 1920×915（内容别超出 y 880）。同一段故事斜度不变，慢推按段走（跨纸不归零）
  // RUNS 每段 [开始, 结束, 这段总共推多少(.05), 斜度(度)]；o: bg 纸色, under 底下虚化的实拍名, shake [x,y,rot]
  const sheet = (t, html, o = {}) => { K._ff = Object.assign(K._ff || {}, { nohud: true, pill: true }); const bg = o.bg ?? PAPER, run = RUNS.find(r => t >= r[0] && t < r[1]) ?? [t, t + 1, 0, -1.2], push = 1 + run[2] * (t - run[0]) / (run[1] - run[0]), [sx, sy, sr] = o.shake ?? [0, 0, 0];
    return `<div style="position:absolute;inset:0;z-index:85;background:#0b0d11">${K.bgx([].concat(o.under ?? opt.under ?? X.meta?.bg ?? []), t, t - 30, { br: .3, sat: .35, bl: 18, push: 0 })}<div style="position:absolute;left:100px;top:36px;width:1720px;height:820px;background:${bg};transform:translate(${f1(sx)}px,${f1(sy)}px) rotate(${f3(run[3] + sr)}deg) scale(${f3(push)});box-shadow:0 34px 80px #000d,0 0 0 1px #0003;overflow:hidden"><div style="position:absolute;left:0;top:0;width:1920px;height:${f1(820 / PZ)}px;transform:scale(${PZ});transform-origin:0 0">${html}</div></div>${inkHud}</div>`; };
  // 出处小字：纸上用 INK2，实拍上 dark:true。一镜最多一行，≥ 30px，放限定和「谁说的」
  const fine = (t, t0, x, y, s, o = {}) => UP(t, t0, x, y, T(s, o.size ?? 32, o.dark ? '#ffffffc8' : INK2, { wt: 500, ls: 1, css: o.dark ? `text-shadow:${shade};` : '' }), { a: o.a ?? '0', dy: 8, blur: 0, ...o });
  const chipAt = (t, t0, x, y, s, o = {}) => UP(t, t0, x, y, K.chip(s, { size: o.size ?? 34, color: o.color ?? GI, css: o.css ?? '' }), { a: o.a ?? '0' });
  // 镜头表登记：over(t) 叠在每一镜上（编的角标之类）；纸上的台标自动补
  const finish = (shots, over) => K.seq(X.t0, X.t1, shots.map(([a, f]) => [a, t => { const h = f(t); return h + (K._ff?.pill ? pill : '') + (over ? over(t) : ''); }]));
  return { OUT, IO, CUB, IO3, sinPi, rise, pop, AT, UP, PO, T, N, box, shade, WT, WN, count, bed, upA, downA, coin, marker, pill, sheet, fine, chipAt, finish, PZ, inkHud,
    INK, INK2, PAPER, CREAM, RULE, RI, GI, BI, runs: r => { RUNS = r; } };
};

// ---- 跨章要长得一样的东西 ----
// 片名卡（冷开场、片尾各一次）：K.titleCard(t, t0, {q: 问号出现的时刻})；字、副标题、底片都在 episode.yaml 的 title_card 里：
//   title_card: {text: 只是工具？, sub: ANTHROPIC · S-1, plate: forge, c0: 1, rate: 1}   （plate 底片的实拍名，可以写一串挑第一个有的；sub 也可以写成 en）
// 片名最后一个字是问号（？/?）时，它单独用金色、到 q 时刻才出来。章节传的 o 会盖过 episode.yaml。
// 片名卡的底片可以给 c0（片名出来那一刻放到底片第几秒）和 rate（放多快）：素材里自带镜头切换时用来避开（主人：1 分 18 秒闪）
K.titleCard = (t, t0, o = {}) => { K._ff = Object.assign(K._ff || {}, { nohud: true, nosrc: true }); o = { ...(EP.title_card ?? {}), ...o }; o.bg = o.bg ?? o.plate; o.sub = o.sub ?? o.en; const e = OUT((t - t0) / .55), q = o.q ?? t0;
  const txt = String(o.text ?? ''), m = /[？?]$/.test(txt), head = m ? txt.slice(0, -1) : txt, mark = m ? txt.slice(-1) : '', size = o.size ?? 190;
  return K.bgx([].concat(o.bg ?? []), t, t0 - (o.c0 ?? 1), { br: .3, sat: .4, bl: 2, rate: o.rate }) + `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,#0007 0%,#0000 65%)"></div>` +
    `<div style="position:absolute;left:0;right:0;top:${f1(372 + (190 - size) * .55)}px;text-align:center;white-space:nowrap;transform:scale(${f3(1 + .008 * Math.max(0, t - t0))});opacity:${f3(C((t - t0) / .2))};font:700 ${size}px ${K.HAN};letter-spacing:${f1(lerp(34, 18, e))}px;color:#fff;text-shadow:0 10px 40px #000e">${head}${mark ? `<span style="color:${K.GOLD};opacity:${f3(C((t - q) / .2))}">${mark}</span>` : ''}</div>` +
    `<div style="position:absolute;left:640px;top:600px;width:640px;height:2px;background:linear-gradient(90deg,#0000,${K.GOLD},#0000);transform:scaleX(${f3(e)})"></div>` +
    (o.sub ? `<div style="position:absolute;left:0;right:0;top:622px;text-align:center;font:600 34px ${K.EN};letter-spacing:14px;color:#ffffffc0;opacity:${f3(C((t - t0 - .2) / .3))}">${o.sub}</div>` : ''); };
// 清单（同一张清单在片子里出现几次时，长得一样）。放在纸上：K.checklist(t, {x, y, s, rows:[{at, hi}], list: 'trust'})：rows 每行的出现时刻，给 hi 时刻就在那时高亮
// 标题和条目在 episode.yaml：data: {checklist: {title: 做之前，先书面通知信托, items: [清算, 破产, …]}}；好几张清单就写 data: {checklists: {trust: {title, items}}}，用 list 选
K.checklist = (t, o = {}) => { const s = o.s ?? 1, x = o.x ?? 960, y = o.y ?? 470, rows = o.rows ?? [], D = EP.data ?? {}, cl = (o.list ? D.checklists?.[o.list] : D.checklist) ?? {}, items = o.items ?? cl.items ?? [], title = o.title ?? cl.title ?? ''; let h = '';
  if (!items.length) console.error('K.checklist 没有条目（episode.yaml 的 data.checklist.items）');
  items.forEach((r, i) => { const a = rows[i]?.at ?? -1e9; if (t < a) return; const hi = rows[i]?.hi, g = hi != null ? CUB((t - hi) / .4) : 0, e = rise(t, a, { dx: -24, dy: 0, blur: 0, d: .35 });
    h += `<div style="position:relative;margin-top:${f1(20 * s)}px;${e}"><div style="display:flex;align-items:center;gap:${f1(22 * s)}px;padding:${f1(10 * s)}px ${f1(18 * s)}px;border-radius:${f1(10 * s)}px;background:rgba(255,222,60,${f3(.85 * g)})"><span style="width:${f1(30 * s)}px;height:${f1(30 * s)}px;border:${f1(4 * s)}px solid ${INK};border-radius:6px;flex:none"></span><span style="font:700 ${f1(50 * s)}px ${K.HAN};letter-spacing:2px;color:${INK}">${r}</span></div></div>`; });
  return `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;transform:translate(-50%,-50%);white-space:nowrap;background:#fffdf6;border:2px solid ${RULE};box-shadow:0 18px 44px #0003;border-radius:12px;padding:${f1(30 * s)}px ${f1(46 * s)}px ${f1(34 * s)}px">${title ? `<div style="font:700 ${f1(56 * s)}px ${K.HAN};letter-spacing:3px;color:${BI}">${title}</div>` : ''}${h}</div>`; };
})();
