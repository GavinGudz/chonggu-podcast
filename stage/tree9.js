// tree9.js —— 贯穿全片的 3D 树状图：深灰点阵底，整张板斜放，卡片落在板上，虚线箭头一段段走出来，镜头在板上走，旧卡片压暗，片尾拉远看全貌。
(() => {
const K = window.K, { lerp, C } = K, f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);
const IO3 = x => { x = C(x); return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; }, OUT = x => 1 - (1 - C(x)) ** 4;
// 镜头：keys [[开始, 时长, {x,y,s,rx,rz}], …]
// 镜头停下来以后不定住：最后一个动作做完，每秒再往前推 1.5%、转 .3°（最多 4 秒）；下一个动作从推到的地方接着走，不跳（v15：气口里画面不能停）
const IDLE = (p, u) => { if (u <= 0) return; u = Math.min(u, 4); if (p.s != null) p.s *= 1 + .015 * u; if (p.rz != null) p.rz += .3 * u; };   // 每秒推 1.5%、转 .3°
//   第一个动作之前不知道这一镜从哪开始，就只在它前面 4 秒里推（推到第一个动作开始时正好 4%，接得上）
const camAt = (t, keys) => { let p = { ...keys[0][2] }, tE = null; for (let i = 1; i < keys.length; i++) { const [a, d, q] = keys[i]; if (t <= a) { if (tE === null) IDLE(p, 4 - (a - t)); break; } IDLE(p, tE === null ? 4 : a - tE); const e = IO3((t - a) / d); for (const k in q) p[k] = lerp(p[k], q[k], e); tE = Math.max(tE ?? -1e9, a + d); } if (tE !== null) IDLE(p, t - tE); return p; };
K.T9 = {
  camAt,
  // 整张板：inner 是世界坐标里的 HTML
  board: (t, cam, inner, o = {}) => { const w = Math.sin(t * .37) * .5, s = cam.s * (1 + .004 * Math.sin(t * .23));
    return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#262a31 0%,#16181d 62%,#0d0e12 100%);overflow:hidden;perspective:1500px;perspective-origin:50% 42%"><div style="position:absolute;left:960px;top:${o.cy ?? 480}px;width:0;height:0;transform-style:preserve-3d;transform:rotateX(${f1(cam.rx)}deg) rotateZ(${f3(cam.rz + w)}deg) scale(${f3(s)}) translate(${f1(-cam.x)}px,${f1(-cam.y)}px)"><div style="position:absolute;left:-3000px;top:-1600px;width:8400px;height:10000px;background-image:radial-gradient(#ffffff17 1.6px,transparent 2px),linear-gradient(#ffffff06 1px,transparent 1px),linear-gradient(90deg,#ffffff06 1px,transparent 1px);background-size:40px 40px,200px 200px,200px 200px"></div>${inner}</div><div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#0000 52%,#000b 100%);pointer-events:none"></div></div>`; },
  // 卡片：落到板上。o: w,h, c1,c2 渐变, img 底图, sub 英文, dim(0..1), z 高度, big 字号, badge
  node: (t, t0, x, y, zh, o = {}) => { if (t < t0) return ''; const e = OUT((t - t0) / (o.d ?? .5)), w = o.w ?? 460, h = o.h ?? 210, dim = o.dim ?? 0, z = lerp(150, o.z ?? 16, e), c1 = o.c1 ?? '#23303a', c2 = o.c2 ?? '#141a20', edge = o.edge ?? '#ffffff55', a = C((t - t0) / .14);
    const shadow = `<div style="position:absolute;left:${f1(x - w / 2 + 10)}px;top:${f1(y - h / 2 + 22)}px;width:${w}px;height:${h}px;border-radius:12px;background:#000;opacity:${f3(.55 * a * e)}"></div>`;
    return shadow + `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${w}px;height:${h}px;transform:translateZ(${f1(z)}px);opacity:${f3(a)};border-radius:12px;overflow:hidden;border:2.5px solid ${edge};background:linear-gradient(145deg,${c1},${c2});box-shadow:0 0 ${f1(34 * (1 - dim))}px ${edge}">${o.img ? `<img src="${o.img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${o.pos ?? '50% 50%'};opacity:${o.imgA ?? 1}">` : ''}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:${o.img && !o.imgA ? 'flex-end' : 'center'};text-align:center;${o.img && !o.imgA ? 'background:linear-gradient(180deg,#0000 45%,#000c);padding-bottom:12px;' : ''}"><div style="font:700 ${o.big ?? 58}px ${K.HAN};letter-spacing:3px;color:${o.col ?? '#fff'};line-height:1.15;white-space:pre-line;text-shadow:0 2px 10px #0009">${zh}</div>${o.sub ? `<div style="font:600 ${o.subSize ?? 20}px ${K.EN};letter-spacing:3px;color:#ffffffa8;margin-top:8px">${o.sub}</div>` : ''}</div>${dim > 0 ? `<div style="position:absolute;inset:0;background:#0f1115;opacity:${f3(.72 * dim)}"></div>` : ''}</div>`; },
  // 虚线箭头：沿折线走出来，小方块一直往前流。pts [[x,y],…]
  arrow: (t, t0, d, pts, col = '#9cc6ff', o = {}) => { if (t < t0) return ''; let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([L, l, pts[i - 1], pts[i]]); L += l; } const P = IO3((t - t0) / d) * L, gap = 26, off = ((t * 36) % gap); let h = '', tip = pts[0], ang = 0;
    const at = u => { for (const [a, l, p, q] of seg) if (u <= a + l || q === pts[pts.length - 1]) { const k = C((u - a) / l); return [lerp(p[0], q[0], k), lerp(p[1], q[1], k), Math.atan2(q[1] - p[1], q[0] - p[0]) * 57.3]; } };
    for (let u = off; u < P - 6; u += gap) { const [x, y, r] = at(u); h += `<div style="position:absolute;left:${f1(x - 7)}px;top:${f1(y - 4.5)}px;width:14px;height:9px;background:${col};transform:translateZ(6px) rotate(${f1(r)}deg);opacity:${o.a ?? 1};box-shadow:0 0 8px ${col}66"></div>`; }
    [tip[0], tip[1], ang] = at(P); const T = o.head ?? 26; h += `<div style="position:absolute;left:${f1(tip[0] - T)}px;top:${f1(tip[1] - T)}px;width:${T * 2}px;height:${T * 2}px;transform:translateZ(7px) rotate(${f1(ang)}deg);opacity:${o.a ?? 1}"><svg width="${T * 2}" height="${T * 2}" viewBox="-26 -26 52 52"><path d="M -14 -18 L 16 0 L -14 18 Z" fill="${col}"/></svg></div>`; return h; },
  label: (t, t0, x, y, s, o = {}) => t < t0 ? '' : `<div style="position:absolute;left:${f1(x)}px;top:${f1(y)}px;transform:translate(-50%,-50%) translateZ(10px);opacity:${f3(C((t - t0) / .2) * (o.a ?? 1))};white-space:nowrap;background:${o.bg ?? '#0d1016e8'};border:1.5px solid ${o.col ?? '#9cc6ff'}88;border-radius:8px;padding:8px 18px;font:700 ${o.size ?? 34}px ${K.HAN};letter-spacing:2px;color:${o.col ?? '#cfe3ff'}">${s}</div>`,
};
})();

// ======== 全片共用的一棵树（第 8 期 2026-11-02 定）：每章往上挂卡片，后面的章节看得到前面长出来的东西 ========
// 时间一律是全片时刻。卡片在 at 落下；on 是它「亮着」的时间段（默认落下后亮 8 秒），其余时间压暗；treveal 的时段里全树都亮（开头结尾拉远看全貌）。
// K.tnode(id, {x, y, at, zh, sub, pal:'oa'|'an'|'red'|'gold'|'grey'|'money'|'wheel'|'bounds'|'next'|'paper'|episode.yaml 里 palettes 加的, w, h, big, img, on:[[a,b]], off:'grey'(没亮时换成这个配色)})
// K.tcard(id, {x, y, at, img, iw, ih(原图像素), w(板上宽度), on, hl:[[x,y,w,h]](原图像素，念到才划), hlAt, hlDur})   —— 真推文、真标题、真照片落在板上
// K.tarrow(id, {at, d, pts:[[x,y],…], col, on})     K.tlabel(id, {at, x, y, s, col, size, on})
// K.tlit(id, 开始, 结束) 让已有的卡再亮一段；K.tN(id) 取卡片（x, y, w, h）；K.treeView(t, 镜头, 叠加HTML) 画整张板
// 镜头：K.T9.camAt(t, [[开始, 时长, {x, y, s, rx, rz}], …])；x,y 是对准的世界坐标，s 越小看得越多，rx 是板往后倒的角度（30–50），rz 是转角（±15 内）
(() => {
const K = window.K, { lerp, C } = K, T9 = K.T9, f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);
const TR = K.TREE = { layers: [], items: [], byId: {}, reveals: [] };
K.PAL = { oa: { c1: '#1b4f4a', c2: '#0f2a2c', edge: '#7fd6c4' }, an: { c1: '#6a3a26', c2: '#2c1812', edge: '#ffb48a' }, red: { c1: '#7a1f1f', c2: '#3a0f10', edge: '#ff8b80' }, gold: { c1: '#6d5216', c2: '#2c2108', edge: '#f0cf7a' }, grey: { c1: '#2a2d33', c2: '#191b20', edge: '#ffffff33' },
  money: { c1: '#5c4a12', c2: '#241c06', edge: '#f0cf7a' }, wheel: { c1: '#173c5c', c2: '#0b1b2a', edge: '#8cc4ff' }, bounds: { c1: '#5e1a2c', c2: '#260a12', edge: '#ff8ba6' }, next: { c1: '#3a2560', c2: '#170e28', edge: '#c9a8ff' }, paper: { c1: '#f2eee4', c2: '#ded8c8', edge: '#ffffffaa', col: '#1b1a17' } };
Object.assign(K.PAL, window.EP?.palettes ?? {});   // 每期可以在 episode.yaml 里加自己的配色：palettes: {law: {c1: '#…', c2: '#…', edge: '#…'}}
K.tlayer = f => { TR.layers.push(f); };
K.treveal = (a, b, fi = .8, fo = .8) => { TR.reveals.push([a, b, fi, fo]); };
K.treeReveal = t => TR.reveals.reduce((m, [a, b, fi, fo]) => Math.max(m, Math.min(C((t - a) / fi), 1 - C((t - b) / fo))), 0);
const lit = (t, on) => on.reduce((m, [a, b]) => Math.max(m, Math.min(C((t - a) / .35), 1 - C((t - b) / .6))), 0);
K.tdim = (t, on, max = .78) => lerp(max * (1 - lit(t, on)), .08, K.treeReveal(t));
const reg = (kind, id, o) => { if (TR.byId[id]) console.error(`树上重复的 id：${id}`); const it = { kind, id, ...o, on: o.on ?? [[o.at, o.at + 8]] }; TR.items.push(it); TR.byId[id] = it; return it; };
K.tnode = (id, o) => reg('node', id, o); K.tcard = (id, o) => reg('card', id, o); K.tarrow = (id, o) => reg('arrow', id, o); K.tlabel = (id, o) => reg('label', id, o);
K.tlit = (id, a, b) => { const it = TR.byId[id]; if (!it) { console.error(`树上没有 ${id}`); return; } it.on.push([a, b]); };
K.tN = id => { const it = TR.byId[id]; if (!it) throw Error(`树上没有 ${id}`); return { x: it.x, y: it.y, w: it.w ?? 460, h: it.h ?? 210, at: it.at }; };
const OUT = x => 1 - (1 - C(x)) ** 4;
const draw = (it, t) => { if (t < it.at) return ''; const dim = K.tdim(t, it.on);
  if (it.kind === 'node') { const L = lit(t, it.on), been = it.on.some(([a]) => a <= t), pal = it.off && L < .5 && !been ? K.PAL[it.off] : K.PAL[it.pal ?? 'grey'] ?? K.PAL.grey; /* 没轮到的枝是灰的，讲过以后保留自己的颜色 */ return T9.node(t, it.at, it.x, it.y, it.zh ?? '', { ...pal, w: it.w, h: it.h, big: it.big, sub: it.sub, subSize: it.subSize, img: it.img, pos: it.pos, imgA: it.imgA, col: it.col ?? pal.col, dim, d: it.d }); }
  if (it.kind === 'arrow') return T9.arrow(t, it.at, it.d ?? .6, it.pts, it.col ?? '#9cc6ff', { a: lerp(1, .45, dim / .78) });
  if (it.kind === 'label') return T9.label(t, it.at, it.x, it.y, it.s, { col: it.col, size: it.size, a: lerp(1, .4, dim / .78), bg: it.bg });
  if (it.kind === 'card') { const w = it.w ?? 900, h = w * it.ih / it.iw, sc = w / it.iw, e = OUT((t - it.at) / .5), a = C((t - it.at) / .14), x = it.x, y = it.y;
    let hl = ''; if (it.hl && it.hlAt != null && t >= it.hlAt) { const tot = it.hl.reduce((s, r) => s + r[2], 0); let acc = 0, q0 = C((t - it.hlAt) / (it.hlDur ?? .6)); for (const [hx, hy, hw, hh] of it.hl) { const q = C((q0 - acc / tot) / (hw / tot)); acc += hw; if (q > 0) hl += `<div style="position:absolute;left:${f1(hx * sc)}px;top:${f1(hy * sc)}px;width:${f1(hw * sc * q)}px;height:${f1(hh * sc)}px;background:#ffd83d66"></div>`; } }
    return `<div style="position:absolute;left:${f1(x - w / 2 + 12)}px;top:${f1(y - h / 2 + 24)}px;width:${w}px;height:${f1(h)}px;background:#000;border-radius:14px;opacity:${f3(.55 * a)}"></div><div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${w}px;height:${f1(h)}px;transform:translateZ(${f1(lerp(170, 18, e))}px);opacity:${f3(a)};border-radius:14px;overflow:hidden;box-shadow:0 0 30px #ffffff30;background:#111"><img src="${it.img}" style="position:absolute;inset:0;width:100%;height:100%">${hl}${dim > .01 ? `<div style="position:absolute;inset:0;background:#0f1115;opacity:${f3(.72 * dim)}"></div>` : ''}</div>`; }
  return ''; };
K.treeHTML = t => TR.layers.map(f => f(t)).join('') + TR.items.map(it => draw(it, t)).join('');
K.treeView = (t, cam, extra = '', o = {}) => T9.board(t, cam, K.treeHTML(t), o) + extra;
})();
