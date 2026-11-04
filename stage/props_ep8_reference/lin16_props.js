// lin16_props.js —— 第 8 期（Anthropic 招股书）专用的零件，从 lib/lin16.js 搬出来当例子：别的期照着改，或者整个不用。
// 要用：episode.yaml 里写  props: [props_ep8_reference/lin16_props.js]（chonggu render 生成 index.html 时放在 lib/kit8.js 后面、章节前面）。
//   K.lens / K.lensBadge   两副眼镜（钱 / 方向盘）的卡和角标
//   K.zhou / K.shop / K.folk / K.iou   老周和他的面馆（编出来的人，扁平卡通，讲可转债用的）
//   K.TOK / K.token        股票字母牌 A / N / T / F / E（双层股权）
//   K.loopCard             三个循环的卡（①②③）
// 字体已经换成随包的开源字体（思源黑体 / 思源宋体 / Bebas Neue / Montserrat）。
(() => {
const K = window.K, { lerp, C } = K, f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);

// 一副眼镜的卡：kind 'money' | 'wheel'；state 'dark'（暗卡，还没用上）| 'lit'（点亮）
// K.lens('money', {x,y(中心), s, state, e, t, flip 0..1 翻到背面})
K.lens = (kind, o = {}) => {
  const money = kind === 'money', c = money ? K.GOLD : K.BLUE, st = o.state ?? 'dark', s = o.s ?? 1;
  const lit = st === 'lit', w = 360 * s, h = 440 * s;
  const icon = money ? K.icon.coin(150 * s, lit ? K.GOLD : '#6b5a33') : K.icon.wheel(150 * s, lit ? K.BLUE : '#2f4d61', o.t ? 4 * Math.sin(o.t * .8) : 0);
  const inner = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:${f1(22 * s)}px">${icon}<div style="font:700 ${f1(64 * s)}px ${K.HAN};letter-spacing:${f1(10 * s)}px;color:${lit ? c : '#8b919a'}">${money ? '钱' : '方向盘'}</div><div style="font:600 ${f1(18 * s)}px ${K.EN};letter-spacing:${f1(6 * s)}px;color:#ffffff66">${money ? 'FOLLOW THE MONEY' : 'WHO HOLDS THE WHEEL'}</div></div>`;
  const fl = o.flip ?? 0;
  return `<div style="position:absolute;left:${o.x ?? 960}px;top:${o.y ?? 540}px;width:0;height:0;perspective:1400px"><div style="position:absolute;left:${f1(-w / 2)}px;top:${f1(-h / 2)}px;width:${f1(w)}px;height:${f1(h)}px;transform:rotateY(${f1(180 * fl)}deg)">${K.card(inner, { x: 0, y: 0, w, h, state: lit ? (money ? 'gold' : 'blue') : 'dark', e: o.e ?? 1, t: o.t, seed: money ? 1 : 2, glow: lit ? .9 : .15, pad: 0 })}</div></div>`;
};
// 角落里「暗卡回来」提醒这一段属于哪副眼镜：K.lensBadge('money'|'wheel', t, t0, {x,y})
K.lensBadge = (kind, t, t0, o = {}) => { const e = K.sp(t, t0, .5), money = kind === 'money', c = money ? K.GOLD : K.BLUE;
  return `<div style="position:absolute;left:${o.x ?? 1560}px;top:${o.y ?? 120}px;display:flex;align-items:center;gap:16px;padding:14px 26px 14px 18px;border-radius:16px;background:#0d1016dd;border:1.5px solid ${c}99;box-shadow:0 0 30px ${c}44,0 16px 40px #000a;${K.enter(e, { dy: -20, s0: .7 })}">${money ? K.icon.coin(54, c) : K.icon.wheel(54, c, 10 * Math.sin(t))}<div style="font:700 38px ${K.HAN};letter-spacing:6px;color:${c}">${money ? '钱' : '方向盘'}</div></div>`; };

// ---------------- 老周和他的面馆（编出来的人，扁平卡通，不是真人） ----------------
// K.zhou(x, y(脚底), s, {t, mood:'smile'|'worry'|'happy', look:-1..1 眼睛看向, wave 0..1})
K.zhou = (x, y, s = 1, o = {}) => {
  const t = o.t ?? 0, blink = ((t + .7) % 3.6) < .12 ? .15 : 1, by = K.bob(t, 3, 4 * s, 2.6), lk = (o.look ?? 0) * 5;
  const mouth = o.mood === 'worry' ? 'M -16 44 Q 0 34 16 44' : o.mood === 'happy' ? 'M -20 36 Q 0 60 20 36' : 'M -16 38 Q 0 50 16 38';
  const brow = o.mood === 'worry' ? '<path d="M -34 -6 L -14 -12 M 34 -6 L 14 -12" stroke="#4a2f1c" stroke-width="5" stroke-linecap="round"/>' : '<path d="M -34 -10 Q -24 -16 -14 -10 M 34 -10 Q 24 -16 14 -10" stroke="#4a2f1c" stroke-width="5" fill="none" stroke-linecap="round"/>';
  const arm = o.wave ? `<g transform="translate(78 120) rotate(${f1(-40 - 25 * Math.sin(t * 9) * o.wave)})"><rect x="-12" y="-80" width="24" height="84" rx="12" fill="#f0c8a0"/></g>` : '<rect x="66" y="112" width="24" height="84" rx="12" fill="#f0c8a0"/>';
  return `<svg style="position:absolute;left:${f1(x - 120 * s)}px;top:${f1(y - 400 * s + by)}px;overflow:visible" width="${f1(240 * s)}" height="${f1(400 * s)}" viewBox="-120 -170 240 400">
   <ellipse cx="0" cy="226" rx="90" ry="10" fill="#000" opacity=".35"/>
   <path d="M -78 230 L -70 110 Q 0 86 70 110 L 78 230 Z" fill="#2f6f8f"/>
   <path d="M -48 230 L -44 120 Q 0 108 44 120 L 48 230 Z" fill="#f4efe6"/>
   <text x="0" y="190" text-anchor="middle" font-family="Noto Sans SC" font-weight="700" font-size="44" fill="#2f6f8f">周</text>
   <rect x="-90" y="112" width="24" height="84" rx="12" fill="#f0c8a0"/>${arm}
   <circle cx="0" cy="20" r="70" fill="#f2cba4"/>
   <path d="M -62 -18 Q -66 -96 0 -98 Q 66 -96 62 -18 Q 40 -40 0 -40 Q -40 -40 -62 -18 Z" fill="#fbfbf7"/>
   <ellipse cx="0" cy="-104" rx="54" ry="36" fill="#fbfbf7"/><ellipse cx="-34" cy="-90" rx="30" ry="26" fill="#fbfbf7"/><ellipse cx="34" cy="-90" rx="30" ry="26" fill="#fbfbf7"/>
   <rect x="-62" y="-30" width="124" height="16" rx="8" fill="#e8e3d8"/>
   ${brow}<ellipse cx="${-24 + lk}" cy="12" rx="7" ry="${f1(8 * blink)}" fill="#2a1a10"/><ellipse cx="${24 + lk}" cy="12" rx="7" ry="${f1(8 * blink)}" fill="#2a1a10"/>
   <circle cx="-42" cy="34" r="10" fill="#f19c8a" opacity=".5"/><circle cx="42" cy="34" r="10" fill="#f19c8a" opacity=".5"/>
   <path d="${mouth}" stroke="#7a3b26" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`.replace(/\n\s*/g, '');
};
// 面馆门脸：K.shop(x(中心), y(地面), s, {t, lit:0..1 灯亮, sign:'老周面馆', branch:false})
K.shop = (x, y, s = 1, o = {}) => {
  const t = o.t ?? 0, lit = o.lit ?? 1, steam = [0, 1, 2].map(i => { const p = ((t * .35 + i / 3) % 1); return `<path d="M ${-30 + i * 30} ${-20 - p * 60} q 10 -14 0 -28 q -10 -14 0 -28" stroke="#ffffff" stroke-width="5" fill="none" opacity="${f3((1 - p) * .5 * lit)}"/>`; }).join('');
  return `<svg style="position:absolute;left:${f1(x - 260 * s)}px;top:${f1(y - 420 * s)}px;overflow:visible" width="${f1(520 * s)}" height="${f1(420 * s)}" viewBox="-260 -420 520 420">
   <rect x="-240" y="-330" width="480" height="330" fill="#3b2a1e"/>
   <rect x="-250" y="-372" width="500" height="62" rx="6" fill="#7b1f1c"/>
   <text x="0" y="-326" text-anchor="middle" font-family="Noto Serif SC,Noto Sans SC" font-weight="700" font-size="44" fill="#f6d27a">${o.sign ?? '老周面馆'}</text>
   <path d="M -250 -310 L 250 -310 L 230 -262 L -230 -262 Z" fill="#c9442f"/>${[-200, -120, -40, 40, 120, 200].map(v => `<path d="M ${v - 40} -310 L ${v} -310 L ${v - 4} -262 L ${v - 36} -262 Z" fill="#f2e6d0" opacity=".9"/>`).join('')}
   <rect x="-200" y="-230" width="250" height="150" fill="${lit > .5 ? '#ffd27a' : '#2a2a2a'}" opacity="${f3(.25 + .6 * lit)}"/><rect x="80" y="-230" width="120" height="230" fill="#24170f"/>
   <g transform="translate(-75 -110)">${steam}<path d="M -50 0 Q 0 40 50 0 Z" fill="#f4efe6"/><rect x="-55" y="-6" width="110" height="8" rx="4" fill="#f4efe6"/></g>
   <circle cx="-230" cy="-250" r="20" fill="#e2402f" opacity="${f3(.6 + .4 * lit)}"/><circle cx="230" cy="-250" r="20" fill="#e2402f" opacity="${f3(.6 + .4 * lit)}"/>
   <rect x="-260" y="-6" width="520" height="12" fill="#1a1410"/>
  </svg>`.replace(/\n\s*/g, '');
};
// 街坊（出钱的人）：K.folk(x, y(脚底), s, {t, seed, color, coin:true 手里拿个金币})
K.folk = (x, y, s = 1, o = {}) => { const c = o.color ?? ['#c98b6b', '#7d9bb8', '#9bb07a', '#b88fc0', '#d0a861'][(o.seed ?? 0) % 5], by = K.bob(o.t ?? 0, o.seed ?? 0, 3 * s, 2.2);
  return `<svg style="position:absolute;left:${f1(x - 60 * s)}px;top:${f1(y - 190 * s + by)}px;overflow:visible" width="${f1(120 * s)}" height="${f1(190 * s)}" viewBox="-60 -100 120 190"><ellipse cx="0" cy="88" rx="44" ry="6" fill="#000" opacity=".3"/><path d="M -42 88 Q -42 10 0 10 Q 42 10 42 88 Z" fill="${c}"/><circle cy="-30" r="34" fill="#f0c8a0"/><circle cx="-11" cy="-32" r="4" fill="#2a1a10"/><circle cx="11" cy="-32" r="4" fill="#2a1a10"/><path d="M -9 -16 Q 0 -10 9 -16" stroke="#7a3b26" stroke-width="3" fill="none"/>${o.coin ? `<g transform="translate(46 40)"><circle r="18" fill="${K.GOLD}"/><circle r="13" fill="none" stroke="#7a5a1c" stroke-width="2"/></g>` : ''}</svg>`; };
// 欠条：K.iou(x(中心), y(中心), {s, rot, amount:'100', note:'可按今天的价钱换成面馆股份', e, t, value:null|'500' 盖一个「现值」章})
K.iou = (x, y, o = {}) => { const s = o.s ?? 1, e = o.e ?? 1, fy = o.t != null ? K.bob(o.t, 5, 4) : 0;
  return `<div style="position:absolute;left:${f1(x - 230 * s)}px;top:${f1(y - 150 * s + fy)}px;width:${f1(460 * s)}px;height:${f1(300 * s)}px;background:linear-gradient(180deg,#f6f0df,#e9dfc4);border-radius:6px;box-shadow:0 24px 50px #000b;transform:rotate(${f1(o.rot ?? -4)}deg) scale(${f3(lerp(.8, 1, e))});opacity:${f3(C(e * 1.5))};padding:${f1(26 * s)}px ${f1(34 * s)}px;font-family:${K.KAI};color:#3a2c1a">
   <div style="font-size:${f1(54 * s)}px;font-weight:700;letter-spacing:${f1(18 * s)}px;text-align:center">欠 条</div>
   <div style="font-size:${f1(30 * s)}px;margin-top:${f1(14 * s)}px;line-height:1.5">今借到 ¥${o.amount ?? '100'}<br>${o.note ?? '日后可按今天的价钱换成面馆股份'}</div>
   <div style="position:absolute;right:${f1(34 * s)}px;bottom:${f1(22 * s)}px;font-size:${f1(30 * s)}px">—— 老周</div>
   <div style="position:absolute;left:${f1(30 * s)}px;bottom:${f1(16 * s)}px;width:${f1(70 * s)}px;height:${f1(70 * s)}px;border:${f1(4 * s)}px solid #c0392b;border-radius:50%;color:#c0392b;font:700 ${f1(22 * s)}px ${K.KAI};display:flex;align-items:center;justify-content:center;transform:rotate(-14deg);opacity:.8">周记</div>
   ${o.value ? `<div style="position:absolute;right:${f1(-40 * s)}px;top:${f1(-40 * s)}px;transform:rotate(10deg);background:${K.RED};color:#fff;font:700 ${f1(34 * s)}px ${K.HAN};padding:${f1(8 * s)}px ${f1(20 * s)}px;border-radius:8px;box-shadow:0 10px 24px #000a">现值 ¥${o.value}</div>` : ''}
  </div>`.replace(/\n\s*/g, ''); };

// ---------------- 股票字母牌：A / N / T / F / E ----------------
// K.token('T', {x,y(中心), s, e, t, dim:0..1, sub:'1 股'})
K.TOK = { A: { c: '#e8ebef', d: '#2a2f38', zh: 'A 类', en: '一股一票' }, N: { c: '#9aa6b4', d: '#1f252d', zh: 'N 类', en: '有钱 · 没票' }, T: { c: K.BLUE, d: '#0f2433', zh: 'T 类', en: '信托 · 1 股' }, F: { c: K.GOLD, d: '#2a2210', zh: 'F 类', en: '创始人 · 1 股' }, E: { c: '#7f8790', d: '#1a1d22', zh: 'E 类', en: '员工' } };
K.token = (L0, o = {}) => { const T = K.TOK[L0], s = o.s ?? 1, e = o.e ?? 1, d = 170 * s, fy = o.t != null ? K.bob(o.t, L0.charCodeAt(0), 4) : 0, dim = o.dim ?? 0;
  return `<div style="position:absolute;left:${f1((o.x ?? 960) - d / 2)}px;top:${f1((o.y ?? 540) - d / 2 + fy)}px;width:${f1(d)}px;height:${f1(d)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${T.d},#07080b 80%);border:${f1(4 * s)}px solid ${T.c};box-shadow:0 0 ${f1(40 * s)}px ${T.c}55,0 20px 40px #000b;display:flex;flex-direction:column;align-items:center;justify-content:center;${K.enter(e, { dy: 30, s0: .5 })}filter:brightness(${f3(1 - .6 * dim)}) saturate(${f3(1 - .7 * dim)})">
   <div style="font:${f1(92 * s)}px ${K.NUM};line-height:.9;color:${T.c}">${L0}</div>
   <div style="font:600 ${f1(20 * s)}px ${K.SANS};color:${T.c};opacity:.85;margin-top:${f1(4 * s)}px;white-space:nowrap">${o.sub ?? T.en}</div></div>`.replace(/\n\s*/g, ''); };

// ---------------- 三个循环 ----------------
// K.loopCard(1|2|3, {x,y(中心), s, e, t, state:'dark'|'lit'|'gold'|'q' (问号卡), label, sub})
K.loopCard = (n, o = {}) => { const s = o.s ?? 1, w = 380 * s, h = 300 * s, st = o.state ?? 'dark';
  const c = st === 'gold' ? K.GOLD : st === 'lit' ? '#1d1708' : st === 'q' ? '#8b919a' : '#c9ced6';   // lit 是奶油底，图标要深色
  const rot = (o.t ?? 0) * (st === 'gold' ? 90 : 30);
  const inner = st === 'q' ? `<div style="height:100%;display:flex;align-items:center;justify-content:center;font:${f1(170 * s)}px ${K.NUM};color:#8b919a">?</div>` :
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:${f1(10 * s)}px">${K.icon.loop(96 * s, c, rot)}<div style="font:700 ${f1(46 * s)}px ${K.HAN};letter-spacing:${f1(4 * s)}px;color:${st === 'lit' ? '#1d1708' : c}">${o.label ?? ''}</div>${o.sub ? `<div style="font:500 ${f1(26 * s)}px ${K.SANS};color:${st === 'lit' ? '#3a2f12' : K.MUTED}">${o.sub}</div>` : ''}</div>`;
  return K.card(`<div style="position:absolute;left:${f1(16 * s)}px;top:${f1(10 * s)}px;font:${f1(40 * s)}px ${K.NUM};color:${c};opacity:.7">${['①', '②', '③'][n - 1] ?? n}</div>` + inner, { x: o.x ?? 960, y: o.y ?? 540, w, h, anchor: 'c', state: st === 'gold' ? 'gold' : st === 'lit' ? 'lit' : 'dark', e: o.e ?? 1, t: o.t, seed: n, pad: 0, glow: st === 'gold' ? 1 : .2 });
};
})();
