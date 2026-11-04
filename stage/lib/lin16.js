// lin16.js —— 《重估》16:9 横版（小Lin 讲机制的那套画面，第 8 期定型）的固定零件。只放零件，不放镜头。
// 载入顺序：lib/stage25d.js → lib/film_base.js → lib/moves.js → lib/lin16.js → lib/kit8.js → … → ch/*.js → film.js
// 每期自己的设置在 window.EP（chonggu render 从 episode.yaml 生成，写在 index.html 里）：主讲、文件截图的目录、徽记文字等。
// 只属于第 8 期的零件（老周面馆、股票字母牌、两副眼镜、三个循环）搬到了 stage/props_ep8_reference/，要用就在 episode.yaml 的 props 里加载。
// 舞台 1920×1080；同一个 t 永远画出同一帧（不用 Date / Math.random，随机数用 K.rnd(seed)）。
// 每个零件返回一段 HTML 字符串（绝对定位）。动画一律写成 t 的函数：k = K.k(t, 开始, 时长) 得到 0..1。
//
// 颜色就是意思（全片统一；下面是第 8 期的分法，新的一期在稿子里先定好每种颜色说什么）：
//   K.GOLD 金 = 钱这副眼镜 / 收入 / 已经拆开的东西      K.BLUE 蓝 = 方向盘这副眼镜 / 谁说了算
//   K.RED  红 = 亏损 / 代价 / 风险                       K.CREAM 奶油金 = 卡片「点亮」（问题解开了）
//   暗卡（state:'dark'）= 还没解开的问题；点亮（'lit'）= 解开了
(() => {
const { C, IO, lerp, L, camKeys, camPath } = S25;
const K = {};
K.GOLD = '#e4c06c'; K.GOLD2 = '#b48c3c'; K.CREAM = '#f5e9c8'; K.RED = '#e0605a'; K.RED2 = '#8f2a2c';
K.BLUE = '#6fb7de'; K.BLUE2 = '#2c5d7c'; K.TEXT = '#eef0f3'; K.MUTED = '#9ba3ad'; K.INK = '#0a0c11';
// 字体：全部是随包下载的开源字体（OFL，stage/fonts/FONTS.json），film.css 里 @font-face。Mac 和 Windows 出来的画面一样。
//   HAN 标题（思源黑体）、SANS 正文（思源黑体）、NUM 窄体数字（Bebas Neue，代替 DIN Condensed）、EN 英文（Montserrat，代替 Avenir Next）、
//   KAI / SERIF 宋体（思源宋体，代替楷体和 Georgia）
K.HAN = "'Noto Sans SC',sans-serif"; K.SANS = "'Noto Sans SC',sans-serif";
K.NUM = 'Num'; K.EN = "Montserrat,'Noto Sans SC',sans-serif"; K.KAI = "'Noto Serif SC',serif"; K.SERIF = "'Noto Serif SC',serif";
const EP = window.EP ?? {}; K.EP = EP;
K.DOCS = String(EP.docs?.dir ?? 'assets/s1').replace(/\/+$/, '');   // 文件截图的目录（K.s1、K.SP.page 用）

// ---------------- 时间和缓动 ----------------
K.C = C; K.IO = IO; K.lerp = lerp;
K.k = (t, t0, d = .5) => C((t - t0) / d);                     // 线性 0..1
K.E = x => 1 - (1 - C(x)) ** 3;                               // 快进慢停
K.back = x => { x = C(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };   // 冲过头再回来
K.sp = (t, t0, d = .55) => K.back((t - t0) / d);             // 弹进来
K.rnd = seed => { let s = (seed * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
K.bob = (t, seed = 0, amp = 6, per = 3.4) => amp * Math.sin((t + seed * 1.37) * 2 * Math.PI / per);   // 待机时轻轻浮动（px）
K.f = (v, n = 1) => (+v).toFixed(n);
const f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);

// 出场：e 是 0..1（通常 K.sp 或 K.E 的结果），返回 style 片段（位移 + 缩放 + 透明度）
K.enter = (e, o = {}) => { const dy = (o.dy ?? 36) * (1 - e), s = lerp(o.s0 ?? .9, 1, e); return `opacity:${f3(C(e * 1.6))};transform:translate(${f1(o.dx ? o.dx * (1 - e) : 0)}px,${f1(dy)}px) scale(${f3(s)});`; };

// ---------------- 实拍 ----------------
// 帧序列在 assets/clips/<名>/0001.jpg…（30fps）。来回放（ping-pong），永远不会停住或跳帧。
K.frameSrc = (name, t, t0 = 0, rate = 1) => {
  const n = FB.CL[name]; if (!n) throw Error(`实拍 ${name} 没登记（assets/clips/counts.json）`);
  const i = Math.floor(Math.max(0, t - t0) * 30 * rate), p = 2 * (n - 1), j = i % p;
  return FB.fr(name, (j < n ? j : p - j) + 1);
};
K.has = name => !!FB.CL[name];
// 几段实拍里挑第一个已经下载好的；一个都没有就用暗底（素材还没到时也能出画）
K.pick = (...names) => names.find(n => K.has(n)) ?? null;
K.bgx = (names, t, t0, o = {}) => { const n = K.pick(...[].concat(names)); return n ? K.bg(n, t, t0, o) : K.plate(t, o); };
K.brollx = (names, t, t0, o = {}) => { const n = K.pick(...[].concat(names)); return n ? K.broll(n, t, t0, o) : K.plate(t, o); };
// 整屏实拍底：压暗、去色、略虚，慢慢推近（每秒 push）。o: br .34, sat .55, bl 1.5, push .03, x/y 推近中心(%), tint 一层颜色(如 '#e4c06c22')
K.bg = (name, t, t0, o = {}) => {
  const s = 1.04 + (o.push ?? .03) * Math.max(0, t - t0);
  return `<div style="position:absolute;inset:0;overflow:hidden"><img src="${K.frameSrc(name, t, t0, o.rate ?? 1)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:${o.x ?? 50}% ${o.y ?? 50}%;transform:scale(${f3(s)});filter:brightness(${o.br ?? .34}) saturate(${o.sat ?? .55})${(o.bl ?? 1.5) > .2 ? ` blur(${o.bl ?? 1.5}px)` : ''}"></div>${o.tint ? `<div style="position:absolute;inset:0;background:${o.tint};mix-blend-mode:soft-light"></div>` : ''}`;
};
// 实拍当画面主体（B-roll，一词一镜）：不压那么暗，慢推。o 同上，默认 br .8 sat .9 bl 0
K.broll = (name, t, t0, o = {}) => K.bg(name, t, t0, { br: .8, sat: .9, bl: 0, push: .045, ...o });
// 引用框：素材缩到 75% 放中间，底下垫同一段素材的放大、模糊、压暗版（她放低清素材的办法）
K.boxed = (name, t, t0, o = {}) => K.bg(name, t, t0, { br: .25, sat: .4, bl: 22, push: .02 }) +
  `<div style="position:absolute;left:${f1(240 + (o.dx ?? 0))}px;top:${120 + (o.dy ?? 0)}px;width:1440px;height:810px;border-radius:18px;overflow:hidden;box-shadow:0 40px 90px #000c,0 0 0 1.5px #ffffff22">${K.bg(name, t, t0, { br: o.br ?? .85, sat: o.sat ?? .9, bl: 0, push: .03 })}</div>`;

// ---------------- 暗底（没有实拍时的舞台） ----------------
// 深色渐变 + 两团慢慢漂的光（c1/c2 颜色，默认金和蓝），不会是死黑一片
K.plate = (t, o = {}) => {
  const c1 = o.c1 ?? '#3a2f14', c2 = o.c2 ?? '#122638', a = t * .035;
  const x1 = 30 + 12 * Math.sin(a), y1 = 38 + 8 * Math.cos(a * 1.3), x2 = 72 + 10 * Math.cos(a * .8), y2 = 62 + 9 * Math.sin(a * 1.1);
  return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at ${f1(x1)}% ${f1(y1)}%,${c1} 0%,#0000 55%),radial-gradient(ellipse at ${f1(x2)}% ${f1(y2)}%,${c2} 0%,#0000 58%),linear-gradient(180deg,#0d1016,#07080b)"></div>`;
};
// 一层很淡的颗粒 + 暗角（film.js 每帧都会叠，章节里不用再加）
K.grain = `<div style="position:absolute;inset:0;background:url(skin/grain.png) 0 0/420px;opacity:.12;mix-blend-mode:overlay;z-index:84;pointer-events:none"></div><div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%,#0000 58%,#000a 100%);z-index:83;pointer-events:none"></div>`;

// ---------------- 玻璃卡 ----------------
// K.card(内容, {x,y,w,h, state:'dark'|'lit'|'gold'|'red'|'blue'|'plain', e: 出场 0..1, t: 当前时刻(给浮动), seed, r 圆角, pad, glow 0..1})
// x,y 是卡的左上角；anchor:'c' 时 x,y 是中心
K.card = (html, o = {}) => {
  const st = o.state ?? 'dark', w = o.w ?? 420, h = o.h ?? 200;
  const edge = { dark: '#ffffff26', lit: '#f5e9c8cc', gold: '#e4c06caa', red: '#e0605aaa', blue: '#6fb7deaa', plain: '#ffffff33' }[st];
  const bgc = { dark: 'linear-gradient(180deg,#1a1e27e6,#0d1016e6)', lit: 'linear-gradient(180deg,#f7ecd0f2,#e3d2a6f2)', gold: 'linear-gradient(180deg,#2a2412ee,#14110aee)', red: 'linear-gradient(180deg,#2c1414ee,#160a0aee)', blue: 'linear-gradient(180deg,#132634ee,#0a131bee)', plain: 'linear-gradient(180deg,#191c24e0,#0f1117e0)' }[st];
  const glowC = { dark: '#ffffff', lit: K.CREAM, gold: K.GOLD, red: K.RED, blue: K.BLUE, plain: '#ffffff' }[st];
  const g = o.glow ?? (st === 'dark' || st === 'plain' ? .25 : .6);
  const e = o.e ?? 1, fy = o.t != null ? K.bob(o.t, o.seed ?? 0, o.amp ?? 5) : 0;
  const x = o.anchor === 'c' ? o.x - w / 2 : o.x, y = (o.anchor === 'c' ? o.y - h / 2 : o.y) + fy;
  return `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;width:${w}px;height:${h}px;border-radius:${o.r ?? 18}px;background:${bgc};border:1.5px solid ${edge};box-shadow:0 26px 60px #000b,0 0 ${f1(50 * g)}px ${glowC}${Math.round(40 * g).toString(16).padStart(2, '0')},inset 0 1px 0 #ffffff18;padding:${o.pad ?? 26}px;color:${st === 'lit' ? '#1d1708' : K.TEXT};${K.enter(e, o)}transform-origin:50% 60%;${o.css ?? ''}">${html}</div>`;
};
// 卡里的标题：中文大字 + 下面一行英文小字（她的「罪犯 Criminals」）
K.label = (zh, en, o = {}) => `<div style="font:${o.wt ?? 700} ${o.size ?? 44}px ${K.HAN};letter-spacing:${o.ls ?? 3}px;line-height:1.15;color:${o.color ?? 'inherit'};text-align:${o.align ?? 'left'}">${zh}</div>${en ? `<div style="font:600 ${Math.round((o.size ?? 44) * .36)}px ${K.EN};letter-spacing:${o.els ?? 5}px;opacity:.6;margin-top:8px;text-transform:uppercase;text-align:${o.align ?? 'left'}">${en}</div>` : ''}`;
// 数字（窄体数字 Num），带金/白/红渐变
K.num = (txt, o = {}) => { const g = { gold: ['#fff7da', K.GOLD, '#c99d45'], white: ['#ffffff', '#e8ebef', '#aab2bc'], red: ['#ffd9d4', K.RED, '#b23d3a'], blue: ['#e6f6ff', K.BLUE, '#3d86b0'], ink: ['#3b2f12', '#2a210c', '#1d1708'] }[o.color ?? 'gold'];
  return `<span style="font:${o.size ?? 120}px ${K.NUM};line-height:1.08;padding-top:.06em;display:inline-block;background:linear-gradient(180deg,${g[0]},${g[1]} 55%,${g[2]});-webkit-background-clip:text;background-clip:text;color:transparent;${o.css ?? ''}">${txt}</span>`; };
// 小胶囊：「自己算的」「编的」「按标价」这类角标
K.chip = (txt, o = {}) => { const c = o.color ?? K.GOLD; return `<span style="display:inline-block;font:600 ${o.size ?? 26}px ${K.SANS};letter-spacing:2px;color:${c};border:1.5px solid ${c}aa;background:${c}1c;border-radius:999px;padding:5px 18px;white-space:nowrap;${o.css ?? ''}">${txt}</span>`; };
K.chipAt = (x, y, txt, o = {}) => `<div style="position:absolute;left:${x}px;top:${y}px;${o.e != null ? K.enter(o.e, { dy: 14, s0: .8 }) : ''}">${K.chip(txt, o)}</div>`;

// ---------------- 大数字（满屏）：砸进来 + 可选滚数 ----------------
// K.bigStat(t, t0, {x,y(中心), value:'250', pre:'', unit:'倍+', label:'内部用量', sub:'2026.1 → 2026.9 · 按标价', chip:'自己算的', color:'gold', size:260, count:[0,250,0.8](从,到,秒), fmt:v=>…})
// o.hard：0 帧硬出（无 blur、无缩放、chip 同时到位）；滚数停 14 帧后线性走，到数当帧停（新章节都用这个）
K.bigStat = (t, t0, o) => {
  const e = K.sp(t, t0, .5), x = o.x ?? 960, y = o.y ?? 470, size = o.size ?? 250;
  let v = o.value;
  if (o.count) { const [a, b, d] = o.count, kk = o.hard ? K.k(t, t0 + 14 / 30, d ?? .9) : K.E(K.k(t, t0, d ?? .9)); const n = lerp(a, b, kk); v = o.fmt ? o.fmt(n) : Math.round(n).toLocaleString('en-US'); }
  const blur = f1(10 * (1 - K.E(K.k(t, t0, .35))));
  return `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%)${o.hard ? '' : ` scale(${f3(lerp(1.35, 1, K.E(K.k(t, t0, .4))))})`};${o.hard ? '' : `opacity:${f3(K.k(t, t0, .18))};filter:blur(${blur}px);`}text-align:center;white-space:nowrap">
   ${o.label ? `<div style="font:700 46px ${K.HAN};letter-spacing:6px;color:${K.TEXT};margin-bottom:6px;text-shadow:0 4px 16px #000c">${o.label}</div>` : ''}
   <div>${o.pre ? `<span style="font:700 ${Math.round(size * .3)}px ${K.HAN};color:${K.TEXT};margin-right:14px">${o.pre}</span>` : ''}${K.num(v, { size, color: o.color ?? 'gold' })}${o.unit ? `<span style="font:700 ${Math.round(size * .32)}px ${K.HAN};color:${o.color === 'red' ? K.RED : o.color === 'blue' ? K.BLUE : o.color === 'white' ? K.TEXT : K.GOLD};margin-left:10px">${o.unit}</span>` : ''}</div>
   ${o.sub ? `<div style="font:500 32px ${K.SANS};letter-spacing:3px;color:${K.MUTED};margin-top:4px">${o.sub}</div>` : ''}
   ${o.chip ? `<div style="margin-top:18px;opacity:${o.hard ? 1 : f3(K.k(t, t0 + .35, .3))}">${K.chip(o.chip, { color: o.chipColor })}</div>` : ''}
  </div>`.replace(/\n\s*/g, '') + (e < 0 ? '' : '');
};

// ---------------- 一行字逐字弹出 ----------------
// K.words(t, t0, '一边经营赚钱，一边巨亏', {x,y, size, color, anchor:'c'|'l', step:.067, hi:{'巨亏':K.RED}, wt})  只用于标题；每字 2 帧，不缩放
K.words = (t, t0, txt, o = {}) => {
  const step = o.step ?? .067, size = o.size ?? 72, hi = o.hi ?? {};
  const marks = new Array(txt.length).fill(null);
  for (const [w, c] of Object.entries(hi)) { let i = txt.indexOf(w); while (i >= 0) { for (let j = i; j < i + w.length; j++) marks[j] = c; i = txt.indexOf(w, i + 1); } }
  const sp = [...txt].map((ch, i) => { const e = K.sp(t, t0 + i * step, .42); return `<span style="display:inline-block;opacity:${f3(C(e * 2))};transform:translateY(${f1(8 * (1 - e))}px);color:${marks[i] ?? o.color ?? K.TEXT}">${ch === ' ' ? '&nbsp;' : ch}</span>`; }).join('');
  const tx = o.anchor === 'l' ? '0' : o.anchor === 'r' ? '-100%' : '-50%';
  return `<div style="position:absolute;left:${o.x ?? 960}px;top:${o.y ?? 480}px;transform:translate(${tx},-50%);white-space:nowrap;font:${o.wt ?? 700} ${size}px ${o.font ?? K.HAN};letter-spacing:${o.ls ?? 4}px;text-shadow:0 6px 26px #000d">${sp}</div>`;
};

// ---------------- 章节卡（13 张一个模板） ----------------
// K.chapterCard(t, t0, {eyebrow:'第一层', zh:'按量收钱', en:'PAY PER TOKEN', bg:'meter', tint, seed})
// 第 1 帧全部到位（0 帧，不糊、不缩放），停 48–86 帧后硬切走；只有底片和飘纸在动。底是这一章题材的实拍压暗
K.chapterCard = (t, t0, o) => {
  K._ff = Object.assign(K._ff || {}, { nohud: true, nosrc: true });
  const bg = K.bgx([].concat(o.bg ?? []), t, t0 - 1, { br: .45, bl: 0, push: 0, tint: o.tint });
  const inE = K.k(t, t0, .45), inO = 1 - (1 - inE) ** 4;   // 字缓缓落定（13 帧），线从中间拉开
  const title = `<div style="position:absolute;left:0;right:0;top:418px;text-align:center;font:700 150px ${K.HAN};letter-spacing:${f1(lerp(40, 24, inO))}px;color:#fff;text-shadow:0 10px 40px #000e;opacity:${f3(C(inE * 2.2))}">${o.zh}</div>`;
  const brow = `<div style="position:absolute;left:0;right:0;top:350px;text-align:center;font:600 34px ${K.HAN};letter-spacing:14px;color:${K.GOLD};opacity:${f3(C(inE * 2.2))}">${o.eyebrow ?? ''}</div>`;
  const en = `<div style="position:absolute;left:0;right:0;top:612px;text-align:center;font:600 26px ${K.EN};letter-spacing:16px;color:#ffffffa0;opacity:${f3(K.k(t, t0 + .2, .3))}">${o.en ?? ''}</div>`;
  const line = `<div style="position:absolute;left:700px;top:592px;width:520px;height:2px;background:linear-gradient(90deg,#0000,${K.GOLD},#0000);transform:scaleX(${f3(inO)})"></div>`;
  return bg + K.paper(t, t0, o.seed ?? 3) + `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,#0006 0%,#0000 60%)"></div>` + brow + title + line + en;
};
// 纸页碎片往镜头飞（章节卡、片名卡用）
K.paper = (t, t0, seed = 1, n = 14) => {
  const R = K.rnd(seed * 17 + 3); let h = '';
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r0 = 160 + R() * 380, sp = .5 + R() * .8, ph = R(), w = 70 + R() * 110, rot = R() * 360, vr = (R() - .5) * 90;
    const life = ((t - t0) * sp * .35 + ph) % 1, z = life, r = r0 * (1 + z * 2.6), s = .35 + z * 1.9;
    const x = 960 + Math.cos(a) * r, y = 540 + Math.sin(a) * r * .62, op = Math.min(1, z * 4) * (1 - z) * .85;
    const lines = Array.from({ length: 5 }, (_, j) => `<div style="height:3px;margin:7px 8px;background:#5a5a5a;width:${55 + ((i * 7 + j * 13) % 40)}%;opacity:.55"></div>`).join('');
    h += `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - w * .65)}px;width:${f1(w)}px;height:${f1(w * 1.3)}px;background:#efece4;opacity:${f3(op)};transform:scale(${f3(s)}) rotate(${f1(rot + vr * (t - t0))}deg);box-shadow:0 8px 20px #0008;filter:blur(${f1(Math.max(0, (s - 1.4) * 3))}px)">${lines}</div>`;
  }
  return `<div style="position:absolute;inset:0;overflow:hidden">${h}</div>`;
};

// ---------------- 观点画面（代替她的脸：说「在我看来」时切到这里） ----------------
// K.opinion(t, t0, {line:'这是会计规则制造的黑色幽默', hi:{'黑色幽默':K.GOLD}, bg:'forge'|null, size, sub:'一行小字'})
// 左上角写「观点 · 主讲」：主讲的字标来自 episode.yaml（host_mark，默认主讲名字的后两个字），英文小字 opinion_en
K.opinion = (t, t0, o) => {
  K._ff = Object.assign(K._ff || {}, { nohud: true, nosrc: true });
  const bg = K.bgx([].concat(o.bg ?? []), t, t0 - .5, { br: .22, sat: .35, bl: 14, push: .025, c1: '#2c2410', c2: '#101820' });
  const n = [...o.line].length, size = o.size ?? (n > 16 ? 70 : n > 11 ? 84 : 100);
  const lines = o.line.split('\n');
  const body = lines.map((ln, i) => K.words(t, t0 + .15 + i * .35, ln, { y: 520 + (i - (lines.length - 1) / 2) * size * 1.35, size, hi: o.hi, step: .035 })).join('');
  const mk = K.sp(t, t0, .5);
  const mono = `<div style="position:absolute;left:144px;top:${f1(150 + 20 * (1 - mk))}px;display:flex;align-items:center;gap:22px;opacity:${f3(C(mk * 1.5))}">${K.monogram(96)}<div><div style="font:700 34px ${K.HAN};letter-spacing:8px;color:${K.GOLD}">观点 · ${K.hostMark()}</div><div style="font:600 15px ${K.EN};letter-spacing:6px;color:#ffffff70;margin-top:6px">${EP.opinion_en ?? 'MY READING'}</div></div></div>`;
  const rule = `<div style="position:absolute;left:144px;top:270px;width:${f1(380 * K.E(K.k(t, t0 + .1, .6)))}px;height:2px;background:linear-gradient(90deg,${K.GOLD},#0000)"></div>`;
  const sub = o.sub ? `<div style="position:absolute;left:0;right:0;top:${520 + lines.length * size * .75 + 40}px;text-align:center;font:500 32px ${K.SANS};letter-spacing:3px;color:${K.MUTED};opacity:${f3(K.k(t, t0 + .8, .5))}">${o.sub}</div>` : '';
  return bg + `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,#0000 30%,#000a 100%)"></div>` + mono + rule + body + sub;
};
// 主讲的字标：EP.host_mark（没写就取主讲名字的后两个字）
K.hostMark = () => EP.host_mark ?? (EP.host ? [...String(EP.host)].slice(-2).join('') : '主讲');
// 金色主讲字标（圆）
K.monogram = (d = 96) => `<div style="width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a2f15,#15110a 70%);border:2px solid ${K.GOLD};box-shadow:0 0 30px ${K.GOLD}55,inset 0 0 18px #000a;display:flex;align-items:center;justify-content:center;font:700 ${Math.round(d * .3)}px ${K.HAN};letter-spacing:2px;color:${K.GOLD}">${K.hostMark()}</div>`;

// ---------------- 文件原文（招股书、报告、判决书的网页截图）：斜放、慢推、荧光笔、中文译文压条 ----------------
// 截图目录：EP.docs.dir（默认 assets/s1），每张 <id>.png 是 1100×1000，框在同目录的 boxes*.json（film.js 读进 FB.S1BOX）
// K.s1(t, t0, {id:'april', still:true 文件定格（新章节都用这个，硬切入、死静、其余压暗加黄块）, hlAt: 荧光笔开始刷的时刻, hlDur:.2, trans:'中文译文（粗体一行，可用 \n 两行）', transAt, rot:-8, x:960, y:500, s:1.05, focus:0..1 镜头对准荧光那一行的程度, focusKey:'because' 改成对准另一句,
//   marks:[{key:'because', kind:'cover'|'hl', at:开始, d:.6, off:撤掉的时刻, color}]  —— 同一张截图里另几句（boxes.json 的 extra）：盖黑条（先不念）或刷另一种颜色})
// 图来自 <docs.dir>/<id>.png，只露页面正文那一块；荧光笔只刷要念的那几个词
const wipeBars = (rects, kk, css) => { const total = rects.reduce((a, r) => a + r[2], 0); let acc = 0;
  return rects.map(([x, y, w, h]) => { const a = acc / total, b = (acc + w) / total; acc += w; const q = C((kk - a) / Math.max(.001, b - a));
    return q <= 0 ? '' : `<div style="position:absolute;left:${f1(x - 3)}px;top:${f1(y - 2)}px;width:${f1((w + 6) * q)}px;height:${f1(h + 5)}px;border-radius:3px;${css}"></div>`; }).join(''); };
K.s1 = (t, t0, o) => {
  K._ff = Object.assign(K._ff || {}, { subband: true });   // 白纸上的字幕看不清：底部垫一条暗带
  const bx = FB.S1BOX[o.id]; if (!bx) throw Error(`文件截图 ${o.id} 不存在（${K.DOCS}/boxes*.json）`);
  const fr = o.focusKey ? bx.extra?.[o.focusKey] ?? bx.rects : bx.rects;
  const ys = fr.map(r => r[1]), cy = (Math.min(...ys) + Math.max(...ys) + fr[0][3]) / 2;
  const still = !!o.still, u = t - t0, e = still ? 1 : K.E(K.k(t, t0, .7));   // still：硬切进来就死静（只留初始角度），只有高亮会动
  const rot = still ? o.rot ?? -8 : (o.rot ?? -8) * (1 - .15 * C(u / 6)), s = still ? o.s ?? 1.05 : (o.s ?? 1.05) * (1 + .018 * u) * lerp(.94, 1, e);
  const scroll = still ? 0 : (o.scroll ?? 12) * u;
  const hlCss = c => `background:${c};mix-blend-mode:multiply;opacity:.85`;
  // still 的高亮：其余文字压到 .35（盖一层白），要念的那几行原样露出来，再加黄块。短句 ≤6 帧整块亮；擦除式只给 ≥15 个汉字（或 ≥40 个英文字符）的长句，10 帧
  const longHl = [...(bx.hl ?? '')].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 1 : .375), 0) >= 15, wipe = o.wipe ?? longHl;
  const bars = (rects, at, d, css) => {
    if (!still) return wipeBars(rects, K.E(K.k(t, at, d)), css);
    if (wipe) return wipeBars(rects, K.k(t, at, 10 / 30), css);
    const a = K.k(t, at, d); return a <= 0 ? '' : `<div style="position:absolute;inset:0;opacity:${f3(a)}">${wipeBars(rects, 1, css)}</div>`;
  };
  const keep = (rects, a) => rects.map(([x, y, w, h]) => `<div style="position:absolute;left:${f1(x - 3)}px;top:${f1(y - 2)}px;width:${f1(w + 6)}px;height:${f1(h + 5)}px;overflow:hidden;opacity:${f3(a)}"><img src="${K.DOCS}/${o.id}.png" style="position:absolute;left:${f1(3 - x)}px;top:${f1(2 - y)}px;width:1100px;height:1000px"></div>`).join('');
  let marks = '';
  if (still && o.hlAt != null) { const a = K.k(t, o.hlAt, o.hlDur ?? .2); if (a > 0) marks += `<div style="position:absolute;inset:0;background:#fff;opacity:${f3(.65 * a)}"></div>` + keep(bx.rects, a); }
  if (o.hlAt != null) marks += bars(bx.rects, o.hlAt, o.hlDur ?? .2, hlCss(o.hlColor ?? '#ffe44d'));
  for (const m of still ? (o.marks ?? []).slice(0, o.hlAt != null ? 1 : 2) : o.marks ?? []) {   // still：同一页最多两层标注
    const rs = bx.extra?.[m.key]; if (!rs) throw Error(`截图 ${o.id} 里没有 ${m.key}`);
    if (still && m.kind !== 'cover') { if (m.off == null || t < m.off) marks += bars(rs, m.at, m.d ?? .2, hlCss(m.color ?? '#ffe44d')); continue; }
    let kk = K.E(K.k(t, m.at, m.d ?? .2)); if (m.off != null) kk *= 1 - K.E(K.k(t, m.off, .5));
    marks += m.kind === 'cover' ? wipeBars(rs, kk, `background:#121418`) : wipeBars(rs, kk, hlCss(m.color ?? '#ffe44d'));
  }
  const crop = `<div style="position:absolute;left:0;top:0;width:1100px;height:1000px;overflow:hidden;background:#fff"><img src="${K.DOCS}/${o.id}.png" style="position:absolute;left:0;top:0;width:1100px;height:1000px">${marks}</div>`;
  const focus = o.focus ?? .6, oy = lerp(500, cy, focus) + scroll * (1 - focus * .7);
  const page = `<div style="position:absolute;left:${o.x ?? 960}px;top:${o.y ?? 500}px;width:0;height:0;transform:rotate(${f1(rot)}deg) scale(${f3(s)});opacity:${f3(C(e * 1.5))}"><div style="position:absolute;left:-470px;top:${f1(-oy)}px;width:940px;height:1000px;overflow:hidden;box-shadow:0 40px 90px #000d;border-radius:4px;background:#fff"><div style="position:absolute;left:-120px;top:0">${crop}</div></div></div>`;
  let tr = '';
  if (o.trans) { const ta = o.transAt ?? (o.hlAt ?? t0) + .5, tk = still ? K.on(t, ta) : K.E(K.k(t, ta, .5)); const ls = o.trans.split('\n');
    tr = `<div style="position:absolute;left:0;right:0;top:${o.transY ?? 760}px;display:flex;justify-content:center;opacity:${f3(tk)};transform:translateY(${f1(20 * (1 - tk))}px)"><div style="background:#0d1016ee;border-left:6px solid ${o.hlColor ?? '#ffe44d'};padding:18px 34px;border-radius:6px;box-shadow:0 20px 50px #000c;max-width:1500px">${ls.map(l => `<div style="font:700 44px ${K.HAN};letter-spacing:2px;color:#fff;line-height:1.35">${l}</div>`).join('')}</div></div>`; }
  return page + tr;
};

// ---------------- 小图标（SVG）----------------
K.icon = {
  wheel: (d = 120, c = K.BLUE, rot = 0) => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100" style="transform:rotate(${f1(rot)}deg)"><circle r="42" fill="none" stroke="${c}" stroke-width="8"/><circle r="10" fill="${c}"/><g stroke="${c}" stroke-width="7" stroke-linecap="round"><line x1="0" y1="10" x2="0" y2="40"/><line x1="-9" y1="-5" x2="-37" y2="-18"/><line x1="9" y1="-5" x2="37" y2="-18"/></g></svg>`,
  coin: (d = 120, c = K.GOLD, s = '钱') => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100"><circle r="44" fill="${c}"/><circle r="36" fill="none" stroke="#7a5a1c" stroke-width="3"/><text y="14" text-anchor="middle" font-family="Noto Sans SC" font-weight="700" font-size="40" fill="#5a4210">${s}</text></svg>`,
  loop: (d = 120, c = K.GOLD, rot = 0) => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100" style="transform:rotate(${f1(rot)}deg)"><path d="M 0 -38 A 38 38 0 1 1 -33 19" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M -44 8 L -33 22 L -19 12" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  doc: (d = 100, c = '#e8e4da') => `<svg width="${d}" height="${d * 1.25}" viewBox="0 0 80 100"><path d="M5 2 H55 L75 22 V98 H5 Z" fill="${c}"/><path d="M55 2 V22 H75" fill="#bdb7a8"/>${[34, 46, 58, 70, 82].map(y => `<rect x="14" y="${y}" width="${y === 82 ? 30 : 50}" height="4" fill="#8d877a"/>`).join('')}</svg>`,
  lock: (d = 100, c = K.RED) => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100"><path d="M -20 -5 V -22 A 20 20 0 0 1 20 -22 V -5" fill="none" stroke="${c}" stroke-width="8"/><rect x="-30" y="-6" width="60" height="46" rx="8" fill="${c}"/><circle cy="14" r="6" fill="#1a0c0c"/></svg>`,
  chip: (d = 100, c = K.GOLD) => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100"><rect x="-28" y="-28" width="56" height="56" rx="6" fill="#1b1d22" stroke="${c}" stroke-width="4"/><rect x="-14" y="-14" width="28" height="28" fill="${c}" opacity=".7"/>${[-18, -6, 6, 18].map(v => `<line x1="${v}" y1="-40" x2="${v}" y2="-30" stroke="${c}" stroke-width="4"/><line x1="${v}" y1="30" x2="${v}" y2="40" stroke="${c}" stroke-width="4"/><line x1="-40" y1="${v}" x2="-30" y2="${v}" stroke="${c}" stroke-width="4"/><line x1="30" y1="${v}" x2="40" y2="${v}" stroke="${c}" stroke-width="4"/>`).join('')}</svg>`,
  bolt: (d = 100, c = K.GOLD) => `<svg width="${d}" height="${d}" viewBox="-50 -50 100 100"><path d="M 8 -44 L -26 6 H -2 L -10 44 L 26 -8 H 2 Z" fill="${c}"/></svg>`,
  person: (d = 60, c = '#c9ced6') => `<svg width="${d}" height="${d}" viewBox="-30 -30 60 60"><circle cy="-14" r="11" fill="${c}"/><path d="M -20 28 Q -20 2 0 2 Q 20 2 20 28 Z" fill="${c}"/></svg>`,
  bot: (d = 60, c = K.GOLD) => `<svg width="${d}" height="${d}" viewBox="-30 -30 60 60"><rect x="-16" y="-24" width="32" height="24" rx="6" fill="${c}"/><circle cx="-7" cy="-12" r="3.5" fill="#1a1408"/><circle cx="7" cy="-12" r="3.5" fill="#1a1408"/><line x1="0" y1="-24" x2="0" y2="-30" stroke="${c}" stroke-width="3"/><path d="M -20 28 Q -20 4 0 4 Q 20 4 20 28 Z" fill="${c}" opacity=".85"/></svg>`,
};
// ---------------- 遮幅黑边（冷开场） ----------------
K.letterbox = k => k <= 0 ? '' : `<div style="position:absolute;left:0;right:0;top:0;height:${f1(120 * k)}px;background:#000;z-index:88"></div><div style="position:absolute;left:0;right:0;bottom:0;height:${f1(120 * k)}px;background:#000;z-index:88"></div>`;

// ---------------- 登记：镜头、出处、遮幅 ----------------
// K.seq(t0, t1, [[开始, t=>HTML], …])：连续登记一串镜头，后一镜的开始就是前一镜的结束，第一镜必须从 t0 开始
K.seq = (t0, t1, list) => {
  const L2 = list.filter(Boolean).map(([a, f]) => [a, f]).sort((p, q) => p[0] - q[0]);
  if (Math.abs(L2[0][0] - t0) > 1e-3) console.error(`K.seq 第一镜从 ${L2[0][0].toFixed(2)} 开始，章节从 ${t0.toFixed(2)}`);
  for (let i = 0; i < L2.length; i++) { const a = Math.max(t0, L2[i][0]), b = i + 1 < L2.length ? L2[i + 1][0] : t1; if (b - a < 1e-3) { console.error(`K.seq 有一镜长度为 0（${a.toFixed(2)}）`); continue; } FB_SHOT(a, Math.min(b, t1), L2[i][1]); }
};
let FB_SHOT = null; K._bind = shot => { FB_SHOT = shot; };
K.SRC = []; K.LB = []; K.NOHUD = [];
// 左下角出处：K.src(开始, 结束, '第 185 页') 或 K.src(开始, 结束, ['F187','V4']) 用标签查页码
K.src = (a, b, x) => { K.SRC.push([a, b, Array.isArray(x) ? K.pageOf(...x) : x]); };
K.pageOf = (...tags) => { const ps = [...new Set(tags.map(g => FB.SOURCES?.tags?.[g]?.page).filter(Boolean))].sort((p, q) => (typeof p === 'number' ? p : 1e4 + +p.slice(2)) - (typeof q === 'number' ? q : 1e4 + +q.slice(2))); return ps.length ? `第 ${ps.slice(0, 3).join('、')} 页` : ''; };
K.lb = (a, b, fade = .3) => { K.LB.push([a, b, fade]); };          // 这一段加遮幅黑边
K.nohud = (a, b) => { K.NOHUD.push([a, b]); };                    // 这一段不显示章节小标签和台标（章节卡、观点画面、片名卡自动不显示）

// ---------------- 相机 ----------------
K.cam = camKeys; K.camPath = camPath; K.L = L;
// 世界坐标里一块大图，相机在上面走：K.world(t, keys, html, {after:{s:.01}})；keys=[[时刻,{x,y,s}],…]（x,y 是画面中心对着的世界坐标）
K.world = (t, keys, html, o = {}) => { const c = camKeys(t, keys, o.after ?? {}), cp = camKeys(t - 1 / 30, keys, o.after ?? {}); return L(c, cp, 1, html, { mb: o.mb === true }); };

// ---- 剪辑规范补丁（第 7 期定的剪辑规范：硬切、短出场、0 帧硬出）----
K.back = (x, c1 = 1.1) => { x = C(x); const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
K.sp = (t, t0, d = .17) => K.E((t - t0) / Math.min(d, .2));
K.stamp = (t, t0, d = .17) => K.back((t - t0) / d);
K.on = (t, t0) => (t >= t0 ? 1 : 0);
K.enter = (e, o = {}) => { const dy = (o.dy ?? 8) * (1 - e), s = lerp(o.s0 ?? 1, 1, e); return `opacity:${f3(C(e * 1.6))};transform:translate(${f1(o.dx ? o.dx * (1 - e) : 0)}px,${f1(dy)}px) scale(${f3(s)});`; };
K.EL = x => { x = C(x); const v = 1 / .85; return x < .7 ? v * x : v * (.7 + (x - .7) - (x - .7) ** 2 / .6); };
K.camSnap = (t, keys) => { let p = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [ta, to, fr = 6] = keys[i]; if (t < ta) break; const k = (fr >= 36 ? K.EL : K.E)((t - ta + 1 / 30) / (Math.max(1, fr) / 30)); p = { x: lerp(p.x, to.x ?? p.x, k), y: lerp(p.y, to.y ?? p.y, k), s: lerp(p.s, to.s ?? p.s, k) }; } return p; };
K.snap = (t, keys, html, o = {}) => L(K.camSnap(t, keys), o.mb ? K.camSnap(t - 1 / 30, keys) : null, 1, html, { mb: !!o.mb });
K.cut = t => Math.round((t - 2 / 30) * 30) / 30;
K.SCENES = []; K.SFX = []; K.sfx = (t, kind, db) => { K.SFX.push([+t.toFixed(3), kind, db ?? null]); };
K.cutId = (F, id) => K.cut(F.T.beats.find(b => b.id === id).chars.find(c => !/\s/.test(c[0]))[1]);
{ const bg0 = K.bg; K.bg = (name, t, t0, o = {}) => bg0(name, t, t0, { br: .55, bl: 0, push: 0, ...o }); K.broll = (name, t, t0, o = {}) => bg0(name, t, t0, { br: .8, sat: .9, bl: 0, push: 0, ...o }); }
{ const seq0 = K.seq; K.seq = (t0, t1, list) => { for (const x of list.filter(Boolean)) K.SCENES.push(+x[0].toFixed(3)); return seq0(t0, t1, list); }; }

window.K = K;
})();
