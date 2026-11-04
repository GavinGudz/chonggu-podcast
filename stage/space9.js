// space9.js —— 「空间感」工具（第 8 期 v10 定），全片共用（index.html 里放在 tree9.js 后面）。
// 一个真透视的 3D 空间：东西放在不同远近，镜头一动近快远慢（视差），焦点外的虚掉（景深），远处变暗（雾），近的挡住远的（遮挡），
// 卡片和屏幕有厚度，地面有倒影，空中漂光斑，镜头可以从一件东西穿过去飞到下一件。同一个 t 永远画出同一帧（不用随机数，不读时间）。
//
// 坐标：世界单位就是像素。x 往右，y 往下，z 往远处（越大越远）。镜头默认焦距 f = 1500（和树板的 perspective 一样），
// 一件东西离镜头 1500 远时按原像素大小显示；离 3000 远时缩一半。
//
// ===================== 直接抄的例子 =====================
//
// ① 透视空间：K.SP.world(t, 镜头, 东西, 选项)
//    镜头 cam = {x, y, z: 对准的那一点（画面中心看着它）, d: 镜头离这一点多远（默认 1500）, yaw: 绕到左边往右看（度）, pitch: 往下看（度）, roll,
//               f 或 fov, focus: 对焦距离（默认 = d，对准的那一点最清楚）, ap: 景深强度（焦外最远处虚多少像素，默认 22）, fog: {d: 3000, min: .3}}
//    东西 item = {kind: 'img'|'html'|'clip'|'dot', x, y, z: 中心, w, h: 像素大小, s: 缩放, ry: 右边往远处转（度）, rx: 上边往后倒, rz: 平面里顺时针,
//                 src | html | clip+c0+rate, r: 圆角, thick: 厚度, side: 侧面颜色, glow: 外发光颜色, refl: 地面倒影, shadow: 落地影子, op, br, sat, dof:false 不虚, layer}
//      const cam = t => K.SP.camAt(t, [[s0, 0, {x: 0, y: 0, z: 0, d: 2600, yaw: 20, pitch: 6}], [s0, 1.2, {d: 1300, yaw: -6, pitch: 2}]]);
//      K.SP.world(t, cam, [
//        {kind: 'img', src: 'assets/tw_post.png', x: 0, y: 0, z: 0, w: 900, h: 603, r: 14, thick: 10, refl: true},
//        {kind: 'img', src: 'assets/s1/p47.png', x: 700, y: -60, z: 900, w: 1100, h: 1000, ry: -18},   // 后面一张，自动虚掉、变暗
//      ], {floor: {y: 420}, dust: {n: 18}, mb: .7});   // mb：镜头快的时候自动分几次曝光（运动模糊）
//
// ② 3D 照片：先把照片拆成几层透明 PNG（近的在前），写一个 <photo_dir>/<组>/L_<名>.json：{w, h, layers: [{f: 层图路径, x, y, w, h, z: 0 远 … 1 近}, …]}
//    photo_dir 在 episode.yaml（默认 assets/layers）；第 8 期用 tools/layers.py 拆的（assets/v9/sp/L_afp.json）
//      K.SP.photo3d(t, s0, 'sp/afp', {dur: 4, dolly: [0, .22], truck: [-60, 40], yaw: [3, -2], focus: ['far', 'near', s0 + 1.2, .6], dust: true})
//    dolly 往前推（占焦距的比例），truck 左右平移（像素），rise 上下，yaw/pitch 绕主体转（度），每个都写 [开始, 结束]；
//    focus：层号 / 'near' / 'far'，或 [从, 到, 何时开始换焦, 换多久]（移焦）；spread 层与层拉开多远（默认 .6）；cx, cy 画面中心对着原图哪个像素；br, sat 调色
//
// ③ 纸在空间里：文件原页（招股书等，<docs.dir>/boxes_*.json 里的框）、PDF 页、网页截图、推文。后面自动叠三张虚掉的真页，镜头从远处飞来（前景有一张纸角擦过），
//    到了先看到整张纸斜悬在空中，念到那一行再推近贴着它，荧光笔划过；译文压条、页码牌画在屏幕上（清楚）
//      K.SP.page(t, s0, {id: 'rv_q', top: 165, hlAt: w('rv03', '115'), hlDur: .45, trans: '二季度收入：115.55 亿美元', transAt: w('rv03', '115'), pg: '第 157'})
//      K.SP.page(t, s0, {img: 'assets/tw_post.png', iw: 1644, ih: 1101, w: 1000, hl: [[44, 513, 462, 62]] /* 原图像素 */, hlAt: s0 + 1.3, zoom: 1.3, close: 1.25, behind: ['p47', 'first', 'exist']})
//    几张纸串起来，镜头穿过这一张飞到下一张（同一个空间里，后一张在前一张后面 2600 远）：
//      K.SP.pages(t, [{id: 'rv_q', top: 165, at: s0 + 1, hlAt: s0 + 1.05, trans: '…'}, {id: 'rv_fast1', at: s1 + .2, hlAt: s1 + .25}], {fly: 1, move: .9})
//    at：镜头到这张纸的时刻（飞进来的 fly 秒、飞去下一张的 move 秒都算在 at 之前）；top：S1 截图上面切掉多少像素（上一页页脚和灰缝）；key：用 boxes 里 extra 的另一组框
//    选项：zoom 到了以后多近（默认 1.6 倍），close 念到时再推近几倍（默认 1.55，从 hlAt 起 1.3 秒），yaw/pitch/roll 最后的角度，
//          from {dz, dx, dy, yaw, pitch, roll} 从哪飞来，behind ['p47', …] 后面的虚页，fg: false 不要前景纸角，mb 运动模糊（默认 .5）
//
// ④ 视频放成空间里的屏（有厚度、边缘光、地面倒影），镜头从一块移到另一块：
//      K.SP.screens(t, [{clip: 'rv_wsj', c0: s0, at: s0 + 1}, {clip: 'rv_benioff', c0: s0, at: s0 + 2.6}], {move: 1})
//      K.SP.screen(t, s0, {clip: 'rv_wsj', c0: s0})        // 只有一块
//
// ⑤ 穿过去的过渡（代替硬切，0.6–1 秒，带运动模糊和飞过的光点）：在镜头表里用 K.SP.seq 代替 K.seq，给要穿过去的那一镜加第三项
//      K.SP.seq(X.t0, X.t1, [[s1, shotA], [s2, shotB, {thru: .8, x: 960, y: 480}], [s3, shotC, {wipe: 'paper'}]]);
//    thru：从上一镜里 (x, y) 那一点穿进去（切点在过渡正中）；wipe: 'paper'|'edge'|'glow'：前景一个虚化的东西划过，切点藏在它后面
//    单独用：K.SP.through(t, 开始, 时长, t => 上一镜(t), t => 下一镜(t), {x, y})；K.SP.pass(t, 开始, 时长, 'paper')
//    音效自己加：穿过去在切点前 .15 秒放 K.sfx(t, 'swish', -18)，纸角划过放 'page'
//
// ⑥ 树也有景深和厚度（不传这几个选项时 K.treeView 和原来完全一样）：
//      K.treeView(t, T9.camAt(t, keys), '', {dof: 1, thick: 14, persp: 1000, dust: true})
//    dof：景深强度（1 = 默认，0 关）；focusY：对焦在屏幕哪一行（默认镜头对准的那点）；thick：卡片厚度（像素）；persp：透视（小 = 广角、近大远小更明显，默认 1500）
//
// 性能（1080p，一帧从 seek 到截图，和 render.mjs 一样的计法；现在的片子 143–185 毫秒）：3D 照片 180–230，树（三份景深）190–240，
//   屏 / 纸 150–190，穿过去的过渡那几帧 200–250。都在现在的 2 倍以内。省的办法：树用 {levels: 2}（少画一份），world 的 mb 设 0。
// 已知限制：每件东西是一整块平面，交叉的两块不会互相切开（按中心远近排先后）；景深按每件东西的中心算一个模糊值，很斜的大平面（地面）不按远近分段虚；
//   树的景深按屏幕高低分带（板是平的，这样是对的），板上浮起来的卡片按板面算；3D 照片的层是硬纸片，人身上没有起伏，切在身上的地方用软边交叉淡化。
(() => {
const K = window.K, { lerp, C } = K, T9 = K.T9;
const f1 = v => (+v).toFixed(1), f2 = v => (+v).toFixed(2), f3 = v => (+v).toFixed(3), g = v => +(+v).toFixed(4);
const D2R = Math.PI / 180, OUT = x => 1 - (1 - C(x)) ** 4, IO3 = x => { x = C(x); return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; };
const SM = x => { x = C(x); return x * x * (3 - 2 * x); };
const SP = K.SP = {};

// ---------------- 3×3 小矩阵 ----------------
const Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const tr = A => [0, 1, 2].map(i => [A[0][i], A[1][i], A[2][i]]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
SP.math = { Rx, Ry, Rz, mm, mv, tr };

// ---------------- 镜头 ----------------
SP.CAM0 = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, f: 1500, ap: 22, maxBlur: 30, near: 60, nf: 260 };
// 镜头：对准 (x,y,z)，从 d 远处看；yaw 正 = 镜头绕到左边往右看，pitch 正 = 往下看
SP.cam = c0 => { const c = { ...SP.CAM0, ...c0 }; const f = c0.fov ? 540 / Math.tan(c0.fov * D2R / 2) : c.f;
  const R = mm(mm(Ry(c.yaw * D2R), Rx(-c.pitch * D2R)), Rz(c.roll * D2R)), fwd = [R[0][2], R[1][2], R[2][2]], d = c.d ?? f, T = [c.x, c.y, c.z];
  return { ...c, f, R, RT: tr(R), fwd, d, T, E: sub(T, mul(fwd, d)), focus: c.focus ?? d }; };
SP.eye = (cm, P) => mv(cm.RT, sub(P, cm.E));
SP.proj = (cm, P) => { const q = SP.eye(cm, P); return [960 + cm.f * q[0] / q[2], 540 + cm.f * q[1] / q[2], q[2]]; };
SP.unproj = (cm, sx, sy, D) => add(mv(cm.R, [(sx - 960) * D / cm.f, (sy - 540) * D / cm.f, D]), cm.E);
// 镜头关键帧：[[开始, 时长, {字段}], …]，第一项是起始姿势；后面每项只写要变的字段。e 可选：每段自己的缓动
// 镜头停下来以后不定住（同 tree9.js）：最后一个动作做完，镜头每秒再往前推 1.5% 的距离、转 .3°（最多 4 秒），下一个动作从那里接着走
SP.camAt = (t, keys) => { const p = { ...keys[0][2] }; let tE = keys[0][0] + keys[0][1];
  const idle = u => { if (u > 0) { u = Math.min(u, 4); p.d = (p.d ?? SP.CAM0.d ?? 1500) * (1 - .015 * u); p.yaw = (p.yaw ?? 0) + .3 * u; } };
  let pre = true;   // 第一个动作之前：只在它前面 4 秒里推（同 tree9.js）
  for (let i = 1; i < keys.length; i++) { const [a, d, q, e] = keys[i]; if (t <= a) { if (pre) idle(4 - (a - t)); break; } idle(pre ? 4 : a - tE); pre = false; const k = (e ?? IO3)(d > 0 ? (t - a) / d : 1); for (const n in q) p[n] = lerp(p[n] ?? SP.CAM0[n] ?? (n === 'd' ? 1500 : 0), q[n], k); tE = Math.max(tE, a + d); }
  if (!pre) idle(t - tE); return p; };
// 景深：弥散圈（像素），焦外越远越虚；近处更虚
SP.coc = (cm, z) => Math.min(cm.maxBlur, cm.ap * Math.abs(z - cm.focus) / Math.max(z, 1));

// ---------------- 颜色小工具 ----------------
const hex = s => { s = s.replace('#', ''); if (s.length === 3) s = [...s].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
const shadeHex = (s, k) => { const [r, gg, b] = hex(s); const m = v => Math.round(Math.max(0, Math.min(255, v * k))); return `rgb(${m(r)},${m(gg)},${m(b)})`; };

// ---------------- 一件东西 → 一个 CSS matrix3d ----------------
// 局部像素 (u, v, 0) → 世界 P = L·(u, v, wz) + o；refl 时按地面 y = fy 镜像
const modelOf = (it, fy) => { const s = it.s ?? 1, M = mm(mm(Ry(-(it.ry ?? 0) * D2R), Rx(-(it.rx ?? 0) * D2R)), Rz((it.rz ?? 0) * D2R));
  let L = M.map(r => r.map(v => v * s)), o = sub([it.x ?? 0, it.y ?? 0, it.z ?? 0], mv(L, [it.w / 2, it.h / 2, 0]));
  if (fy != null) { L = [L[0], L[1].map(v => -v), L[2]]; o = [o[0], 2 * fy - o[1], o[2]]; }
  return { L, o, M }; };
const css3d = (cm, L, o) => { const A = mm(cm.RT, L), b = mv(cm.RT, sub(o, cm.E)), f = cm.f;
  const r0 = [0, 1, 2].map(j => f * A[0][j] + 960 * A[2][j]), r1 = [0, 1, 2].map(j => f * A[1][j] + 540 * A[2][j]), r2 = A[2], r3 = A[2];
  const t0 = f * b[0] + 960 * b[2], t1 = f * b[1] + 540 * b[2], t2 = b[2] - 1, t3 = b[2];
  return `matrix3d(${[r0[0], r1[0], r2[0], r3[0], r0[1], r1[1], r2[1], r3[1], r0[2], r1[2], r2[2], r3[2], t0, t1, t2, t3].map(g).join(',')})`; };
const ptOf = (L, o, u, v, wz = 0) => add(mv(L, [u, v, wz]), o);

// 一件东西的内容（平面里的 HTML）
const content = (it, t) => {
  const inner = it.kind === 'clip' ? `<img src="${K.frameSrc(it.clip, t, it.c0 ?? 0, it.rate ?? 1)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${it.pos ?? '50% 50%'}">`
    : it.kind === 'img' ? `<img src="${it.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${it.fit ?? 'fill'};object-position:${it.pos ?? '50% 50%'}">` : '';
  return inner + (it.html ?? ''); };

// 画一件东西：返回 {z, layer, html}；看不见返回 null
const drawItem = (cm, it, t, o, refl) => {
  const fy = refl ? o.floor.y : null, { L, o: org, M } = modelOf(it, fy), w = it.w, h = it.h;
  const cs = [[0, 0], [w, 0], [w, h], [0, h]].map(([u, v]) => SP.eye(cm, ptOf(L, org, u, v)));
  const qc = SP.eye(cm, ptOf(L, org, w / 2, h / 2)), zc = qc[2];
  if (Math.min(...cs.map(q => q[2])) < 4 || zc < cm.near) return null;   // 到了镜头背后：不画（穿过去的那一下已经淡掉了）
  const sc = cs.map(q => [960 + cm.f * q[0] / q[2], 540 + cm.f * q[1] / q[2]]), xs = sc.map(p => p[0]), ys = sc.map(p => p[1]);
  if (Math.max(...xs) < -300 || Math.min(...xs) > 2220 || Math.max(...ys) < -300 || Math.min(...ys) > 1380) return null;
  const near = C((zc - cm.near) / (it.nf ?? cm.nf)), op = (it.op ?? 1) * near * (refl ? (o.floor.gloss ?? .2) * (it.reflA ?? 1) : 1);
  if (op < .004) return null;
  const blur = (it.dof === false ? 0 : SP.coc(cm, zc)) + (it.blur ?? 0) + (refl ? 3 : 0);
  const fog = cm.fog ? (cm.fog.min ?? .3) + (1 - (cm.fog.min ?? .3)) * Math.exp(-Math.max(0, zc - cm.focus) / (cm.fog.d ?? 3000)) : 1;
  // 朝向：正面法线和「到镜头的方向」的夹角，侧过去的面暗一点；看到背面就画成深色背板
  const nW = nrm(mv(M, [0, 0, -1])), toEye = nrm(sub(cm.E, ptOf(L, org, w / 2, h / 2))), facing = dot(refl ? [nW[0], -nW[1], nW[2]] : nW, toEye);
  const br = (it.br ?? 1) * fog * (it.shade === false ? 1 : .62 + .38 * Math.abs(facing));
  let sides = '';
  if (it.thick && blur < 6 && !refl) {   // 厚度：四个侧面，只画朝着镜头的，按朝上/朝下给明暗
    const T = it.thick / (it.s ?? 1), sideCol = it.side ?? '#1d2026', faces = [[[0, 0], [w, 0], [0, -1, 0]], [[w, 0], [w, h], [1, 0, 0]], [[w, h], [0, h], [0, 1, 0]], [[0, h], [0, 0], [-1, 0, 0]]];
    let poly = '', bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; const pts = [];
    for (const [[u0, v0], [u1, v1], nl] of faces) { const n = mv(M, nl), mid = ptOf(L, org, (u0 + u1) / 2, (v0 + v1) / 2, T / 2); if (dot(n, sub(cm.E, mid)) <= 0) continue;
      const P = [[u0, v0, 0], [u1, v1, 0], [u1, v1, T], [u0, v0, T]].map(([u, v, wz]) => SP.proj(cm, ptOf(L, org, u, v, wz)));
      if (P.some(p => p[2] < 4)) continue; pts.push([P, .55 - .35 * n[1] + .1 * n[0]]); for (const p of P) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); } }
    if (pts.length) { bx0 = Math.floor(bx0) - 2; by0 = Math.floor(by0) - 2; for (const [P, k] of pts) poly += `<polygon points="${P.map(p => `${f1(p[0] - bx0)},${f1(p[1] - by0)}`).join(' ')}" fill="${shadeHex(sideCol, k)}"/>`;
      sides = `<svg style="position:absolute;left:${bx0}px;top:${by0}px;overflow:visible" width="${Math.ceil(bx1 - bx0) + 4}" height="${Math.ceil(by1 - by0) + 4}">${poly}</svg>`; }
  }
  const back = facing < 0 && !refl && it.back !== false;
  const rad = it.r ? `border-radius:${it.r}px;overflow:hidden;` : '', glow = it.glow && !refl ? `box-shadow:0 0 ${f1(it.glowR ?? 50)}px ${it.glow};` : '';
  const mask = refl ? `-webkit-mask-image:linear-gradient(to top,#000d 0%,#0000 ${it.reflLen ?? 55}%);mask-image:linear-gradient(to top,#000d 0%,#0000 ${it.reflLen ?? 55}%);` : '';
  const face = `<div style="position:absolute;left:0;top:0;width:${f1(w)}px;height:${f1(h)}px;transform-origin:0 0;transform:${css3d(cm, L, org)};${back ? `background:${it.side ?? '#1d2026'};${rad}` : `${it.bg ? `background:${it.bg};` : ''}${rad}${glow}${mask}${it.css ?? ''}`}">${back ? '' : content(it, t)}${it.rim && !back && !refl ? `<div style="position:absolute;inset:0;${rad}box-shadow:inset 0 0 0 2px ${it.rim},inset 0 3px 0 ${it.rim}"></div>` : ''}</div>`;
  const fil = (blur > .35 ? `blur(${f2(blur)}px) ` : '') + (Math.abs(br - 1) > .01 ? `brightness(${f3(br)}) ` : '') + (it.sat != null ? `saturate(${f2(it.sat)})` : '');
  return { z: zc, layer: refl ? -1 : it.layer ?? 0, html: `<div style="position:absolute;left:0;top:0;width:0;height:0;${fil ? `filter:${fil};` : ''}${op < .999 ? `opacity:${f3(op)};` : ''}">${sides}${face}</div>` };
};

// 光斑 / 灰尘：只是一个按远近放大、按景深变大变淡的圆
const drawDot = (cm, it) => { const q = SP.eye(cm, [it.x, it.y, it.z]); if (q[2] < cm.near * .6) return null;
  const sx = 960 + cm.f * q[0] / q[2], sy = 540 + cm.f * q[1] / q[2], r0 = Math.max(.8, (it.r ?? 5) * cm.f / q[2]), coc = cm.ap * Math.abs(q[2] - cm.focus) / q[2] * (it.bokeh ?? 1.6), R = Math.min(r0 + coc, 260);
  if (sx < -R || sx > 1920 + R || sy < -R || sy > 1080 + R) return null;
  const a = (it.a ?? .5) * Math.max(.06, Math.min(1, (r0 / R) ** 1.2)) * C((q[2] - cm.near * .6) / cm.nf);
  const [r, gg, b] = hex(it.col ?? '#ffd9a0');
  return { z: q[2], layer: it.layer ?? 0, html: `<div style="position:absolute;left:${f1(sx - R)}px;top:${f1(sy - R)}px;width:${f1(2 * R)}px;height:${f1(2 * R)}px;border-radius:50%;background:radial-gradient(circle,rgba(${r},${gg},${b},${f3(a)}) 0%,rgba(${r},${gg},${b},${f3(a * .8)}) ${R > 14 ? 55 : 25}%,rgba(${r},${gg},${b},0) 72%)"></div>` }; };

// 漂浮光斑：在一个盒子里撒 n 个点（种子固定），慢慢漂
SP.dust = (t, o = {}) => { const rnd = K.rnd(o.seed ?? 7), n = o.n ?? 18, [x0, x1] = o.x ?? [-1400, 1400], [y0, y1] = o.y ?? [-800, 700], [z0, z1] = o.z ?? [-400, 2600], out = [];
  for (let i = 0; i < n; i++) { const px = lerp(x0, x1, rnd()), py = lerp(y0, y1, rnd()), pz = lerp(z0, z1, rnd()), ph = rnd() * 6.28, sp = (o.drift ?? 14) * (.5 + rnd());
    out.push({ kind: 'dot', x: px + Math.sin(t * .31 + ph) * sp * 2, y: py - ((t * sp + ph * 40) % (y1 - y0 + 1)) * (o.rise ?? .25) + Math.cos(t * .23 + ph) * sp, z: pz, r: (o.r ?? 4) * (.6 + rnd() * .9), col: (o.cols ?? ['#ffe2b0', '#bcd8ff', '#ffffff'])[i % 3], a: (o.a ?? .55) * (.5 + rnd() * .5) }); }
  return out; };

// 地面：一大块平放的板（点阵 + 往远处淡掉），跟着镜头走、按格子对齐（看起来是不动的）
const floorItem = (cm, fl) => { const G = fl.grid ?? 120, S = fl.size ?? 9000, cx = Math.round(cm.E[0] / G) * G, cz = Math.round((cm.E[2] + S * .42) / G) * G, col = fl.col ?? '#121419';
  const dots = fl.dots === false ? '' : `background-image:radial-gradient(${fl.dotCol ?? '#ffffff2a'} 1.6px,transparent 2.2px);background-size:${G}px ${G}px;background-position:${G / 2}px ${G / 2}px;`;
  return { kind: 'html', x: cx, y: fl.y, z: cz, w: S, h: S, rx: 90, layer: -2, dof: false, shade: false, html: `<div style="position:absolute;inset:0;background-color:${col};${dots}-webkit-mask-image:radial-gradient(ellipse 50% 50% at 50% 92%,#000 0%,#000a 45%,#0000 100%);mask-image:radial-gradient(ellipse 50% 50% at 50% 92%,#000 0%,#000a 45%,#0000 100%)"></div>` }; };

// ---------------- ① 透视空间 ----------------
// cam、items 都可以是 t 的函数（这样运动模糊能按时间多采几次）。o: bg 背景, floor {y, col, gloss 倒影强度, dots}, dust {n, seed, x, y, z, r, a}, mb 快门（帧，.5–1）, mbMax, fog
SP.world = (t, cam, items, o = {}) => {
  const camF = typeof cam === 'function' ? cam : () => cam, itF = typeof items === 'function' ? items : () => items;
  const one = (tt) => { const cm = SP.cam({ ...camF(tt), ...(o.fog ? { fog: o.fog } : {}) }), its = itF(tt).filter(Boolean), list = [];
    if (o.floor) { const fi = drawItem(cm, floorItem(cm, o.floor), tt, o); if (fi) list.push(fi); }
    for (const it of its) { if (it.kind === 'dot') { const d = drawDot(cm, it); if (d) list.push(d); continue; }
      const d = drawItem(cm, it, tt, o); if (d) list.push(d);
      if (o.floor && it.refl) { const r = drawItem(cm, it, tt, o, true); if (r) list.push(r); }
      if (o.floor && (it.shadow || it.pool)) { const sw = it.w * (it.s ?? 1);   // 落在地上的影子 / 屏幕照在地上的光
        const sh = drawItem(cm, { kind: 'html', x: it.x, y: o.floor.y - 1, z: (it.z ?? 0) + 30, w: sw * 1.3, h: sw * .5, rx: 90, ry: it.ry ?? 0, layer: -1.5, dof: false, shade: false,
          html: `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 50% 50% at 50% 50%,${it.pool ?? '#000000aa'} 0%,#0000 70%)"></div>` }, tt, o); if (sh) list.push(sh); } }
    if (o.dust) for (const p of SP.dust(tt, o.dust)) { const d = drawDot(cm, p); if (d) list.push(d); }
    list.sort((a, b) => a.layer - b.layer || b.z - a.z);
    return list.map(x => x.html).join(''); };
  // 运动模糊：镜头一帧里在焦平面上挪了多少像素，挪得多就在快门时间里多采几次，平均叠起来
  let n = 1, sp = 0, sh = (o.mb ?? 0) / 30;
  if (sh > 0 && typeof cam === 'function') { const c0 = SP.cam(camF(t)), c1 = SP.cam(camF(t - sh)); let disp = 0;
    for (const [px, py] of [[960, 540], [260, 200], [1660, 200], [260, 880], [1660, 880]]) { const P = SP.unproj(c0, px, py, c0.focus), q = SP.proj(c1, P); if (q[2] > 1) disp = Math.max(disp, Math.hypot(q[0] - px, q[1] - py)); }
    n = disp < 10 ? 1 : Math.min(o.mbMax ?? 4, Math.ceil(disp / 10) + 1); sp = n > 1 ? disp / (n - 1) : 0; }
  const bg = `<div style="position:absolute;inset:0;background:${o.bg ?? 'radial-gradient(ellipse at 50% 38%,#1f232b 0%,#121419 55%,#08090c 100%)'}"></div>`;
  if (n === 1) return `<div style="position:absolute;inset:0;overflow:hidden">${bg}${one(t)}</div>`;
  // 只有挪得很多时才给每一份加一点模糊（推近时画面中心几乎不动，要保持清楚）
  let h = '', bl = sp > 12 ? Math.min(4, (sp - 12) * .3) : 0; for (let j = 0; j < n; j++) h += `<div style="position:absolute;inset:0;opacity:${f3(1 / (j + 1))};${bl > .5 ? `filter:blur(${f1(bl)}px);` : ''}">${one(t - sh * j / (n - 1))}</div>`;
  return `<div style="position:absolute;inset:0;overflow:hidden">${bg}${h}</div>`;
};

// ---------------- ② 3D 照片 ----------------
const JS = {};
SP.load = path => { if (JS[path]) return JS[path]; const x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); if (x.status >= 400 || !x.responseText) throw Error(`读不到 ${path}（3D 照片要先拆层）`); return (JS[path] = JSON.parse(x.responseText)); };
const span = (v, e) => Array.isArray(v) ? lerp(v[0], v[1], e) : (v ?? 0);
// 照片拆成的层放在不同远近：近层在 f，远层在 f·(1+spread)；每层按距离放大，所以静止时拼起来和原图一模一样，镜头一动才分开
const PHOTO = String(window.EP?.photo_dir ?? 'assets/layers').replace(/\/+$/, '');   // 3D 照片的层放在哪（episode.yaml 的 photo_dir）
SP.photoItems = (name, o = {}) => { const [pre, nm] = name.includes('/') ? name.split('/') : [o.pre, name], P = SP.load(`${PHOTO}/${pre}/L_${nm}.json`), f = o.f ?? 1500;
  const k0 = Math.max(1920 / P.w, 1080 / P.h) * (o.over ?? 1.12), cx = C2(o.cx ?? P.w / 2, 960 / k0, P.w - 960 / k0), cy = C2(o.cy ?? P.h / 2, 540 / k0, P.h - 540 / k0), sp = o.spread ?? .6;
  const L = P.layers.map((l, i) => { const D = f * (1 + sp * (1 - l.z)), s = k0 * D / f;
    return { kind: 'img', src: l.f, x: (l.x + l.w / 2 - cx) * s, y: (l.y + l.h / 2 - cy) * s, z: D, w: l.w, h: l.h, s, br: o.br, sat: o.sat, shade: false, i, layer: 0 }; });
  return { L, f, P }; };
const C2 = (v, a, b) => a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v));
SP.photo3d = (t, t0, name, o = {}) => { const { L, f } = SP.photoItems(name, o), dur = o.dur ?? 5, ez = o.ease ?? (x => SM(x) * .5 + C(x) * .5);
  const Dof = i => L[i === 'near' ? L.length - 1 : i === 'far' ? 0 : Math.max(0, Math.min(L.length - 1, i))].z;
  const pivot = Dof(o.pivot ?? 'near');
  const camF = tt => { const e = ez((tt - t0) / dur), dz = span(o.dolly ?? [0, .12], e) * f;
    const fo = o.focus ?? 'near', fd = Array.isArray(fo) ? lerp(Dof(fo[0]), Dof(fo[1]), SM((tt - fo[2]) / (fo[3] ?? .6))) : Dof(fo);
    return { x: span(o.truck, e), y: span(o.rise, e), z: pivot, d: pivot - dz, yaw: span(o.yaw, e), pitch: span(o.pitch, e), f, ap: o.ap ?? 12, focus: fd - dz }; };
  return SP.world(t, camF, L, { bg: '#000', dust: o.dust ? { n: 16, x: [-900, 900], y: [-600, 500], z: [400, pivot * .9], r: 3.5, a: .45, ...(o.dust === true ? {} : o.dust) } : null, mb: o.mb ?? 0 }) + (o.over2 ?? ''); };

// ---------------- ③ 纸在空间里 ----------------
// 一张纸的数据：文件原页（<docs.dir>/<id>.png，1100×1000，框在 boxes_*.json）或任意图片（img + iw, ih 原图像素，hl 框也写原图像素）
// S1 截图是 EDGAR 网页：1100×1000，两边是灰底，白纸在 x 64–1036；top 可以切掉上一页的页脚和灰缝（像素，截图坐标）
const paperOf = p => { if (p.id) { const bx = FB.S1BOX[p.id]; if (!bx) throw Error(`文件截图 ${p.id} 不存在（${K.DOCS}/boxes*.json）`); const x0 = 64, y0 = p.top ?? 0, rs = (p.key ? bx.extra?.[p.key] ?? bx.rects : bx.rects).map(([x, y, w, h]) => [x - x0, y - y0, w, h]);
    return { src: `${K.DOCS}/${p.id}.png`, w: 972, h: 1000 - y0, iw: 1100, ih: 1000, ix: -x0, iy: -y0, rects: rs }; }
  const w = p.w ?? 1100, k = w / p.iw; return { src: p.img, w, h: p.ih * k, rects: (p.hl ?? []).map(r => r.map(v => v * k)) }; };
const wipe = (rects, k, col) => { const tot = rects.reduce((s, r) => s + r[2], 0) || 1; let acc = 0, h = '';
  for (const [x, y, w, hh] of rects) { const q = C((k - acc / tot) / (w / tot)); acc += w; if (q > 0) h += `<div style="position:absolute;left:${f1(x - 3)}px;top:${f1(y - 2)}px;width:${f1((w + 6) * q)}px;height:${f1(hh + 5)}px;border-radius:3px;background:${col};mix-blend-mode:multiply"></div>`; }
  return h; };
// 一张很斜的纸上的景深：焦外那一边慢慢虚掉。另画一份虚的，用渐变遮罩只露出焦外那边（在纸自己的坐标里，跟着纸转）。
// dg = [左边全虚到, 左边清楚从, 右边清楚到, 右边全虚从]（占纸宽的比例；不要哪边就写 null）
SP.dgLayer = (inner, dg, bl = 3) => { const [l0, l1, r0, r1] = dg, st = [];
  if (l0 != null) st.push('#000 0%', `#000 ${f1(l0 * 100)}%`, `#0000 ${f1(l1 * 100)}%`); else st.push('#0000 0%');
  if (r0 != null) st.push(`#0000 ${f1(r0 * 100)}%`, `#000 ${f1(r1 * 100)}%`, '#000 100%'); else st.push('#0000 100%');
  const m = `linear-gradient(to right,${st.join(',')})`;
  return `<div style="position:absolute;inset:0;overflow:hidden;filter:blur(${f1(bl)}px);-webkit-mask-image:${m};mask-image:${m}">${inner}</div>`; };
const pageItem = (pp, t, extra = {}) => { const pa = paperOf(pp), k = pp.hlAt != null ? SM((t - pp.hlAt) / (pp.hlDur ?? .5)) : 0;
  const img = pa.iw ? `<img src="${pa.src}" style="position:absolute;left:${pa.ix}px;top:${pa.iy}px;width:${pa.iw}px;height:${pa.ih}px">` : `<img src="${pa.src}" style="position:absolute;inset:0;width:100%;height:100%">`;
  return { kind: 'html', w: pa.w, h: pa.h, bg: '#fff', r: 2, thick: 4, side: '#cfc9bb', html: img + (pp.dg && t > -1e8 ? SP.dgLayer(img, pp.dg, pp.dgBlur ?? 3) : '') + (k > 0 ? wipe(pa.rects, k, pp.hlCol ?? '#ffe44d') : ''), ...extra, _pa: pa }; };
// 前景：离镜头很近、整个虚掉的纸边 / 光斑（镜头一横移，它比后面的纸走得快得多 = 视差）。按某一刻的镜头 cm 放：屏幕上 (sx, sy) 那一点、离镜头 D 远
//   specs: [{sx, sy, D, w, h, rz, br, op} | {kind: 'dot', sx, sy, D, r, a, col}]
const NEAR_HTML = `<div style="position:absolute;left:8%;right:10%;top:10%;bottom:8%;background:repeating-linear-gradient(180deg,#0000 0 9px,#77716655 9px 12px)"></div>`;
SP.near = (cm, specs) => specs.map(s => { const P = SP.unproj(cm, s.sx, s.sy, s.D ?? 380);
  if (s.kind === 'dot') return { kind: 'dot', x: P[0], y: P[1], z: P[2], r: s.r ?? 7, col: s.col, a: s.a ?? .5, bokeh: s.bokeh };
  return { kind: 'html', x: P[0], y: P[1], z: P[2], w: s.w ?? 250, h: s.h ?? 170, ry: -cm.yaw + (s.ry ?? 0), rx: cm.pitch + (s.rx ?? 0), rz: s.rz ?? 20, bg: s.bg ?? '#d9d2c2', r: 3, br: s.br ?? .75, op: s.op ?? .8, nf: 40, shade: false, layer: 1, html: s.html ?? NEAR_HTML }; });
const S1IDS = () => Object.keys(FB.S1BOX ?? {});
const ghostIds = (id, n) => { const all = S1IDS().filter(x => x !== id); if (!all.length) return []; let hsh = 0; for (const ch of String(id)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; return Array.from({ length: n }, (_, i) => all[(hsh + i * 7) % all.length]); };
// 镜头对准一张纸上的某一点（默认要划的那一行的中心）
const aimOf = (pp, it) => { const pa = it._pa, rs = pa.rects?.length ? pa.rects : [[pa.w / 2 - 50, pa.h / 2, 100, 20]];
  const x0 = Math.min(...rs.map(r => r[0])), x1 = Math.max(...rs.map(r => r[0] + r[2])), y0 = Math.min(...rs.map(r => r[1])), y1 = Math.max(...rs.map(r => r[1] + r[3]));
  const u = pp.fx ?? (x0 + x1) / 2, v = pp.fy ?? (y0 + y1) / 2, { L, o } = modelOf(it); return ptOf(L, o, u, v); };
const DOCLABEL = window.EP?.docs?.label ?? '原文';   // 页码牌上的文件名（第 8 期是「招股书」）：episode.yaml 的 docs.label
SP.pages = (t, list, o = {}) => { const f = o.f ?? 1500, gap = o.gap ?? 2600;
  const its = list.map((pp, k) => pageItem(pp, t, { x: pp.x ?? (k % 2 ? 260 : -200), y: pp.y ?? (k % 2 ? -120 : 60), z: pp.z ?? k * gap, rz: pp.rz ?? (k % 2 ? 3 : -3), ry: pp.ry ?? (k % 2 ? -8 : 6), nf: pp.nf ?? 500, op: list[k + 1] ? 1 - SM((t - (list[k + 1].at - (o.move ?? .9) * .8)) / ((o.move ?? .9) * .4)) : 1 }));
  const aims = list.map((pp, k) => aimOf(pp, its[k])), dEnd = list.map(pp => f / (pp.zoom ?? o.zoom ?? 1.6));
  const fly = o.fly ?? 1.1, mv2 = o.move ?? .9, fr = { dz: 2600, dx: -700, dy: -380, yaw: 16, pitch: -9, roll: 5, ...(o.from ?? {}) };
  const end = k => ({ x: aims[k][0], y: aims[k][1], z: aims[k][2], d: dEnd[k], yaw: list[k].yaw ?? o.yaw ?? -10, pitch: list[k].pitch ?? o.pitch ?? 4, roll: list[k].roll ?? o.roll ?? -1.5 });
  const camF = tt => { const a0 = list[0].at; let c = { ...end(0) };
    if (tt < a0) { const u = C((tt - (a0 - fly)) / fly), k = 1 - (1 - u) ** 3;   // 先快后慢地飞进来
      c = { ...c, x: c.x + fr.dx * (1 - k), y: c.y + fr.dy * (1 - k), d: lerp(c.d + fr.dz, c.d, k), yaw: lerp(fr.yaw, c.yaw, k), pitch: lerp(fr.pitch, c.pitch, k), roll: lerp(fr.roll, c.roll, k) }; }
    for (let k = 1; k < list.length; k++) { const a = list[k].at - mv2; if (tt <= a) break; const e = IO3((tt - a) / mv2), n = end(k);
      for (const key in n) c[key] = lerp(c[key], n[key], e);
      c.d += Math.sin(Math.PI * e) * 500; }   // 中途退后一点再冲过去：先看到下一张在后面，再穿过这一张
    const hold = list.reduce((m, pp, k) => (tt >= pp.at ? k : m), 0), pk = list[hold], since = tt - pk.at;
    if (since > 0) { c.d -= Math.min(since, 4) * (o.drift ?? 22);   // 到了以后继续慢慢贴近
      const cl = pk.close ?? o.close ?? 1.55, ca = pk.closeAt ?? pk.hlAt ?? pk.at; c.d /= lerp(1, cl, SM((tt - ca) / (pk.closeDur ?? o.closeDur ?? 1.3))); }   // 念到那一行：再推近，贴着那一行
    return c; };
  // 每张纸后面叠几张虚掉的页（真的别的页），再在镜头飞来的路上放一张纸角从前景划过
  const extra = [];
  list.forEach((pp, k) => { const base = its[k], ids = pp.behind ?? o.behind ?? ghostIds(pp.id ?? pp.img, 3);
    ids.slice(0, 4).forEach((g, j) => { const gi = typeof g === 'string' ? { id: g } : g; extra.push(pageItem({ ...gi, hlAt: undefined }, -1e9, { x: base.x + [380, -460, 120, -200][j], y: base.y + [-160, 120, 260, -300][j], z: base.z + 300 + j * 280, rz: base.rz + [6, -5, 9, -8][j], ry: [-14, 12, -6, 18][j], br: .8, nf: 1100 })); }); });   // 虚页离镜头 1100 以内就淡掉：穿过去时不会一屏白
  if (o.fg !== false) { const e0 = end(0), P = [e0.x + fr.dx * .6 + 1050, e0.y + fr.dy * .6 + 620, its[0].z - 1700]; extra.push(pageItem({ ...list[0], hlAt: undefined }, -1e9, { x: P[0], y: P[1], z: P[2], rz: 28, ry: 34, br: .85, op: .9, nf: 420 })); }
  const cut = o.cut ?? 0;   // 已经穿过去的纸不再画（省性能）
  // o.near：镜头到了以后前景里很近、全虚的纸边和光斑（按到了 .4 秒后的镜头放，飞来时淡入）
  const nearIts = o.near ? SP.near(SP.cam(camF(list[0].at + (o.nearAt ?? .4))), o.near).map(it => { const k = C((t - list[0].at + .6) / .5); return it.kind === 'dot' ? { ...it, a: it.a * k } : { ...it, op: it.op * k }; }) : [];
  const W = SP.world(t, camF, [...extra, ...its, ...nearIts].filter((it, i) => i >= cut), { bg: o.bg ?? 'radial-gradient(ellipse at 45% 35%,#272b33 0%,#15171c 50%,#090a0d 100%)', dust: o.dust === false ? null : { n: 22, x: [-1600, 1700], y: [-900, 800], z: [-1800, list.length * gap + 600], r: 4, a: .5, seed: 3, ...(o.dust ?? {}) }, mb: o.mb ?? .5, fog: o.fog ?? { d: 2400, min: .35 } });
  K._ff = Object.assign(K._ff || {}, { subband: true });   // 白纸上的字幕看不清：底部垫暗带
  // 中文译文压条、页码牌：画在屏幕上，不进空间（要清楚）；到了才出，镜头要飞向下一张时 .25 秒淡掉
  let ov = '';
  list.forEach((pp, k) => { const nx = list[k + 1], out = nx ? 1 - C((t - (nx.at - mv2)) / .25) : 1; if (out <= 0) return;
    if (pp.trans) { const ta = pp.transAt ?? (pp.hlAt ?? pp.at) + .3, tk = OUT((t - ta) / .4) * out; if (tk > 0) ov += `<div style="position:absolute;left:0;right:0;top:${pp.transY ?? 730}px;display:flex;justify-content:center;opacity:${f3(tk)};transform:translateY(${f1(18 * (1 - OUT((t - ta) / .4)))}px)"><div style="background:#0d1016ee;border-left:6px solid ${pp.hlCol ?? '#ffe44d'};padding:16px 34px;border-radius:6px;box-shadow:0 20px 50px #000c;max-width:1500px">${pp.trans.split('\n').map(l => `<div style="font:700 46px ${K.HAN};letter-spacing:2px;color:#fff;line-height:1.35">${l}</div>`).join('')}</div></div>`; }
    if (pp.pg) { const ta = (pp.at ?? 0) - .2, tk = OUT((t - ta) / .35) * out; if (tk > 0) ov += `<div style="position:absolute;left:170px;top:150px;transform:translate(0,-50%) rotate(-4deg) translateY(${f1(14 * (1 - OUT((t - ta) / .35)))}px);opacity:${f3(tk)};background:#0d1016f0;border:2px solid #f0cf7a;border-radius:8px;padding:6px 22px;white-space:nowrap"><span style="font:700 40px ${K.HAN};color:#fff;letter-spacing:2px">${DOCLABEL} ${pp.pg.split(' ')[0]} </span><span style="font:76px ${K.NUM};color:#f0cf7a">${pp.pg.split(' ')[1] ?? ''}</span><span style="font:700 40px ${K.HAN};color:#fff"> 页</span></div>`; } });
  return W + ov; };
SP.page = (t, t0, o = {}) => SP.pages(t, [{ ...o, at: o.at ?? t0 + (o.fly ?? 1.1) }], o);

// ---------------- ④ 屏幕在空间里 ----------------
SP.screens = (t, list, o = {}) => { const f = o.f ?? 1500, W0 = o.w ?? 1280, H0 = W0 * 9 / 16, fy = o.floorY ?? H0 / 2 + 70;
  const its = list.map((s, k) => ({ kind: s.img ? 'img' : 'clip', clip: s.clip, src: s.img, c0: s.c0 ?? 0, rate: s.rate, x: s.x ?? k * 1750, y: s.y ?? 0, z: s.z ?? k * 650, w: s.w ?? W0, h: (s.w ?? W0) * 9 / 16, ry: s.ry ?? (k % 2 ? -14 : 12),
    r: 10, thick: 26, side: '#16181d', rim: '#ffffff40', glow: s.glow ?? '#7fb0ff55', glowR: 70, refl: o.refl !== false, reflA: 1, pool: s.pool ?? '#5a86d088', br: s.br ?? 1, bg: '#000' }));
  const fill = o.fill ?? .64, end = k => { const it = its[k]; return { x: it.x, y: it.y + (o.lift ?? 110), z: it.z, d: it.w * f / (1920 * fill), yaw: (it.ry ?? 0) * .5 + (list[k].yaw ?? o.yaw ?? 9), pitch: o.pitch ?? 7, roll: 0 }; };
  const fly = o.fly ?? 1, mv2 = o.move ?? 1, fr = { dz: 1800, dx: -600, dy: -200, yaw: 26, pitch: 10, ...(o.from ?? {}) };
  const camF = tt => { let c = { ...end(0) }; const a0 = list[0].at;
    if (tt < a0) { const k = 1 - (1 - C((tt - (a0 - fly)) / fly)) ** 3; c = { ...c, x: c.x + fr.dx * (1 - k), y: c.y + fr.dy * (1 - k), d: c.d + fr.dz * (1 - k), yaw: lerp(fr.yaw, c.yaw, k), pitch: lerp(fr.pitch, c.pitch, k) }; }
    for (let k = 1; k < list.length; k++) { const a = list[k].at - mv2; if (tt <= a) break; const e = IO3((tt - a) / mv2), n = end(k); for (const key in n) c[key] = lerp(c[key], n[key], e); c.d += Math.sin(Math.PI * e) * 600; }
    const hold = list.reduce((m, s, k) => (tt >= s.at ? k : m), 0); c.d -= Math.min(Math.max(0, tt - list[hold].at), 5) * (o.drift ?? 26); c.yaw += Math.sin(tt * .4) * .6;
    return c; };
  return SP.world(t, camF, its, { floor: { y: fy, gloss: o.gloss ?? .38, col: o.floorCol ?? '#111319', ...(o.floor ?? {}) }, bg: o.bg ?? 'radial-gradient(ellipse at 50% 30%,#232833 0%,#12151b 50%,#07080a 100%)', dust: o.dust === false ? null : { n: 16, x: [-1500, list.length * 1750 + 800], y: [-700, fy - 40], z: [-1500, list.length * 650 + 1200], r: 4, a: .45, seed: 11, ...(o.dust ?? {}) }, mb: o.mb ?? .7, fog: o.fog ?? { d: 3200, min: .35 } }); };
SP.screen = (t, t0, o = {}) => SP.screens(t, [{ ...o, at: o.at ?? t0 + (o.fly ?? 1) }], o);

// ---------------- ⑤ 过渡：穿过去 / 前景划过 ----------------
// 上一镜整幅画面以 (x,y) 为中心冲过镜头（越来越快地放大、变虚、淡掉，多次曝光 = 运动模糊），下一镜从那一点后面迎上来；中间飞过一串光点
SP.through = (t, t0, d, fa, fb, o = {}) => { const p = (t - t0) / d; if (p <= 0) return fa(t); if (p >= 1) return fb(t);
  const x = o.x ?? 960, y = o.y ?? 540, sA = o.sA ?? 5, sB0 = o.sB ?? .42;
  const ha0 = (p - .38) / .4 < 1 ? fa(t) : '', heavy = ha0.length > 50000;   // 上一镜很重（整棵树）就只画一次，用模糊代替多次曝光，不然一帧要画十几遍树
  const nA = heavy ? 1 : o.mbN ?? 3, dq = 1 / (30 * d);   // 一帧里 p 走多少
  // 画面边上一帧挪多少像素 ≈ 1000·ln(sA)·2q·dq；多采 nA 次，剩下的缝用模糊补上
  const A = q => { const e = q * q, s = Math.exp(Math.log(sA) * e), v = 1000 * Math.log(sA) * 2 * q * dq * (o.mbk ?? 1); return { s, bl: Math.max(1 + 18 * e, v / nA * .7), op: 1 - SM((q - .38) / .4) }; };   // o.mbk：运动模糊打几折（穿进一张要看清的卡时用）
  const B = q => { const e = OUT((q - .18) / .82), s = Math.exp(Math.log(sB0) * (1 - e)); return { s, bl: 16 * (1 - e), op: SM((q - .18) / .35) }; };
  const wrap = (h, c, j) => `<div style="position:absolute;inset:0;transform-origin:${f1(x)}px ${f1(y)}px;transform:scale(${f3(c.s)});${c.bl > .4 ? `filter:blur(${f1(c.bl)}px);` : ''}opacity:${f3(c.op / (j + 1))}">${h}</div>`;
  const ha = A(p).op > .01 ? ha0 : '', hb = fb(t);
  let h = `<div style="position:absolute;inset:0;background:#07080b"></div>`;
  h += `<div style="position:absolute;inset:0;transform-origin:${f1(x)}px ${f1(y)}px;transform:scale(${f3(B(p).s)});${B(p).bl > .4 ? `filter:blur(${f1(B(p).bl)}px);` : ''}opacity:${f3(B(p).op)}">${hb}</div>`;
  if (ha) { const n = p > .12 ? nA : 1; for (let j = 0; j < n; j++) h += wrap(ha, A(Math.max(0, p - dq * j / Math.max(1, n - 1))), j); }
  // 飞过的光点：一个只有光点的空间，镜头沿着 z 冲过去
  const pts = SP.dust(0, { n: 34, seed: o.seed ?? 21, x: [-1100, 1100], y: [-650, 650], z: [300, 3600], r: 3, a: .8, drift: 0 });
  h += SP.world(t, tt => ({ x: (x - 960) * .6, y: (y - 540) * .6, z: lerp(0, 3200, IO3((tt - t0) / d)) + 1500, d: 1500, ap: 6 }), pts, { bg: 'transparent', mb: 1.2, mbMax: 3 }).replace('position:absolute;inset:0;overflow:hidden', `position:absolute;inset:0;overflow:hidden;opacity:${f3(Math.sin(Math.PI * C(p)) * .9)};mix-blend-mode:screen`);
  h += `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at ${f1(x)}px ${f1(y)}px,#0000 25%,#000a 100%);opacity:${f3(Math.sin(Math.PI * p) * .8)}"></div>`;
  return h; };
// 前景一个虚化的东西从右往左划过（纸 / 暗的屏幕边 / 一团光）。它比画面宽，过渡正中（切点）那几帧整幅都被它挡住，换镜看不见
SP.pass = (t, t0, d, kind = 'paper', o = {}) => { const p = (t - t0) / d; if (p <= 0 || p >= 1) return ''; const e = IO3(p), Wb = 2700, dir = o.dir ?? 1;
  const cx0 = lerp(1920 + Wb / 2 + 150, -Wb / 2 - 150, e), cx = dir > 0 ? cx0 : 1920 - cx0, bl = (o.blur ?? 22) + 18 * Math.sin(Math.PI * p);   // 中间最快，最虚
  const box = (bg, extra = '') => `<div style="position:absolute;left:${f1(cx - Wb / 2)}px;top:-700px;width:${Wb}px;height:2480px;transform:rotate(${f1((o.rot ?? 12) * dir)}deg);background:${bg};filter:blur(${f1(bl)}px)${extra};z-index:80"></div>`;
  if (kind === 'edge') return box('linear-gradient(90deg,#0000,#07080a 12%,#0c0e12 55%,#1d222a 86%,#0000)');
  if (kind === 'glow') return box('radial-gradient(ellipse 50% 50% at 50% 50%,#ffe7c0 0%,#d9b27a 40%,#3a2a14 80%,#0000 100%)', ' brightness(.75)');
  return box('linear-gradient(100deg,#0000,#cfc8b6 8%,#e9e3d4 40%,#d8d1c0 80%,#0000)', ' brightness(.62)'); };   // 纸：压暗，不闪白
// 镜头表：和 K.seq 一样，第三项 {thru: 秒, x, y} 或 {wipe: 'paper'|'edge'|'glow', d}。切点（登记的镜头开始时刻）在过渡正中
SP.seq = (t0, t1, list) => { const L2 = list.filter(Boolean).map(r => [...r]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < L2.length; i++) { const [a, fb, op] = L2[i]; if (!op) continue; const fa0 = L2[i - 1][1];
    if (op.thru) { const d = op.thru, s = a - d / 2, fa = fa0, fbb = fb, tf = t => SP.through(t, s, d, fa, fbb, op);
      L2[i - 1][1] = t => (t >= s ? tf(t) : fa(t)); L2[i][1] = t => (t < s + d ? tf(t) : fbb(t)); }
    else if (op.wipe) { const d = op.d ?? .7, s = a - d / 2, fa = fa0, fbb = fb, k = op.wipe;
      L2[i - 1][1] = t => fa(t) + SP.pass(t, s, d, k, op); L2[i][1] = t => fbb(t) + SP.pass(t, s, d, k, op); } }
  return K.seq(t0, t1, L2.map(r => [r[0], r[1]])); };

// ---------------- ⑥ 树：厚度 + 景深 + 光斑 ----------------
// 树板的变换是 rotateX(rx)·rotateZ(rz)·scale(s)，所以板上每一点离镜头多远只取决于它在屏幕上的高低：景深就是按屏幕 y 分几条横带往上（远）、往下（近）越来越虚
SP.treeDepth = (cam, o = {}) => { const P = o.persp ?? 1500, py0 = 1080 * .42, cy = o.cy ?? 480, rx = cam.rx * D2R, out = [];
  for (let u = -9000; u <= 4000; u += 25) { const zp = u * Math.sin(rx), D = P - zp; if (D < 80) break; out.push([py0 + (cy + u * Math.cos(rx) - py0) * P / D, D]); }
  return out; };   // [[屏幕 y, 离镜头的距离], …]，y 从上到下
// 景深：整块板画三份——清楚的、虚一点的、很虚的——按屏幕 y 用渐变遮罩叠起来（远处、近处露出虚的那份）。
// 不用 backdrop-filter：Chrome 的 backdrop 模糊会把字糊成方块。dof = 强度（1 默认）；levels: 2 只画清楚 + 很虚两份（省一份）
SP.treeDofMasks = (cam, o = {}) => { const k = o.dof === true ? 1 : o.dof ?? 1; if (!k) return null;
  const S = SP.treeDepth(cam, o), ap = 16 * k; if (!S.length) return null;
  let Df = o.persp ?? 1500; if (o.focusY != null) { const hit = S.find(s => s[0] >= o.focusY); if (hit) Df = hit[1]; }
  const cocAt = y => { let i = S.findIndex(s => s[0] >= y); if (i < 0) i = S.length - 1; if (i === 0) i = 1; const [y0, D0] = S[i - 1], [y1, D1] = S[i], D = lerp(D0, D1, C((y - y0) / ((y1 - y0) || 1))); return ap * Math.abs(D - Df) / D; };
  const Lm = o.dofMid ?? 3.5, Lh = o.dofMax ?? 11, two = o.levels === 2, st = [], sm = [];
  for (let y = -40; y <= 1120; y += 40) { const c = cocAt(y); st.push(`rgba(0,0,0,${f3(1 - SM(c / (two ? Lh : Lm)))}) ${y}px`); sm.push(`rgba(0,0,0,${f3(1 - SM((c - Lm) / (Lh - Lm)))}) ${y}px`); }
  const mk = a => `-webkit-mask-image:linear-gradient(to bottom,${a.join(',')});mask-image:linear-gradient(to bottom,${a.join(',')});`;
  return { Lm, Lh, two, sharp: mk(st), mid: mk(sm) }; };
// 卡片的四个侧面（在树板的 3D 里，和卡片一起转）
const walls = (x, y, w, h, z, T, col, a, dim) => { if (T < 1 || a <= 0) return ''; const z0 = z, cs = `background:linear-gradient(${col},${shadeHex(col.slice(0, 7), .55)});opacity:${f3(a)};`, dk = dim > .01 ? `<div style="position:absolute;inset:0;background:#0f1115;opacity:${f3(.72 * dim)}"></div>` : '';
  return `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y + h / 2)}px;width:${w}px;height:${f1(T)}px;transform-origin:50% 0;transform:translateZ(${f1(z0)}px) rotateX(-90deg);${cs}">${dk}</div>` +
    `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${w}px;height:${f1(T)}px;transform-origin:50% 0;transform:translateZ(${f1(z0)}px) rotateX(-90deg);${cs}">${dk}</div>` +
    `<div style="position:absolute;left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${f1(T)}px;height:${h}px;transform-origin:0 50%;transform:translateZ(${f1(z0)}px) rotateY(90deg);${cs}">${dk}</div>` +
    `<div style="position:absolute;left:${f1(x + w / 2)}px;top:${f1(y - h / 2)}px;width:${f1(T)}px;height:${h}px;transform-origin:0 50%;transform:translateZ(${f1(z0)}px) rotateY(90deg);${cs}">${dk}</div>`; };
// 前景光斑（2D 镜头用）：跟着镜头平移，近的走得快
SP.dust2d = (t, cam, o = {}) => { const rnd = K.rnd(o.seed ?? 5), n = o.n ?? 12, s = cam.s ?? 1; let h = '';
  for (let i = 0; i < n; i++) { const dep = .6 + rnd() * 1.6, R = (14 + rnd() * 70) * dep, px = rnd() * 2400, py = rnd() * 1300, ph = rnd() * 6.28, col = ['255,226,176', '188,216,255', '255,255,255'][i % 3];
    const x = ((px - (cam.x ?? 0) * s * dep * .9 + Math.sin(t * .3 + ph) * 30) % 2400 + 2400) % 2400 - 240, y = ((py - (cam.y ?? 0) * s * dep * .6 + Math.cos(t * .25 + ph) * 24) % 1300 + 1300) % 1300 - 110, a = (o.a ?? .14) / dep;
    h += `<div style="position:absolute;left:${f1(x - R)}px;top:${f1(y - R)}px;width:${f1(2 * R)}px;height:${f1(2 * R)}px;border-radius:50%;background:radial-gradient(circle,rgba(${col},${f3(a)}) 0%,rgba(${col},${f3(a * .7)}) 50%,rgba(${col},0) 72%);z-index:3"></div>`; }
  return h; };
// 树板（和 tree9.js 的 T9.board 一样，多一个选项 persp：透视，小 = 广角，近大远小更明显）
SP.board = (t, cam, inner, o = {}) => { const w = Math.sin(t * .37) * .5, s = cam.s * (1 + .004 * Math.sin(t * .23)), P = o.persp ?? 1500, cy = o.cy ?? 480;
  return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#262a31 0%,#16181d 62%,#0d0e12 100%);overflow:hidden;perspective:${P}px;perspective-origin:50% 42%"><div style="position:absolute;left:960px;top:${cy}px;width:0;height:0;transform-style:preserve-3d;transform:rotateX(${f1(cam.rx)}deg) rotateZ(${f3(cam.rz + w)}deg) scale(${f3(s)}) translate(${f1(-cam.x)}px,${f1(-cam.y)}px)"><div style="position:absolute;left:-3000px;top:-1600px;width:8400px;height:10000px;background-image:radial-gradient(#ffffff17 1.6px,transparent 2px),linear-gradient(#ffffff06 1px,transparent 1px),linear-gradient(90deg,#ffffff06 1px,transparent 1px);background-size:40px 40px,200px 200px,200px 200px"></div>${inner}</div><div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#0000 52%,#000b 100%);pointer-events:none"></div></div>`; };
SP.tree = (t, cam, extra = '', o = {}) => { const TH = o.thick ?? 14, node0 = T9.node, TR = K.TREE;
  let inner;
  if (TH > 0) T9.node = (tt, t0, x, y, zh, oo = {}) => { const h = node0(tt, t0, x, y, zh, oo); if (!h) return h; const e = OUT((tt - t0) / (oo.d ?? .5)), z = lerp(150, oo.z ?? 16, e), a = C((tt - t0) / .14) * (oo.op ?? 1);   // 跟着退场一起淡
    return walls(x, y, oo.w ?? 460, oo.h ?? 210, z, Math.min(TH, z - 1), oo.c2 ?? '#141a20', a, oo.dim ?? 0) + h; };
  try { inner = K.treeHTML(t); } finally { T9.node = node0; }
  if (TH > 0) for (const it of TR.items) if (it.kind === 'card' && t >= it.at) { const ra = K.tskin?.retA ? K.tskin.retA(it, t) : 1; if (ra <= .001) continue;   // 退场的截图卡不留边框
    const w = it.w ?? 900, hh = w * it.ih / it.iw, e = OUT((t - it.at) / .5); inner = walls(it.x, it.y, w, hh, lerp(170, 18, e), Math.min(TH, 17), '#2a2d33', C((t - it.at) / .14) * ra, K.tdim(t, it.on)) + inner; }
  const b = SP.board(t, cam, inner, o), m = SP.treeDofMasks(cam, o), L = (css, h) => `<div style="position:absolute;inset:0;${css}">${h}</div>`;
  const body = !m ? b : L(`filter:blur(${m.Lh}px);`, b) + (m.two ? '' : L(m.mid, L(`filter:blur(${m.Lm}px);`, b))) + L(m.sharp, b);
  return `<div style="position:absolute;inset:0;overflow:hidden;background:#0d0e12">${body}${o.dust ? SP.dust2d(t, cam, o.dust === true ? {} : o.dust) : ''}</div>` + extra; };
// K.treeView 加选项才走新路；不加选项时一字不差走 tree9.js 原来的
{ const tv0 = K.treeView; K.treeView = (t, cam, extra = '', o = {}) => (o.dof != null || o.thick != null || o.persp != null || o.dust != null) ? SP.tree(t, cam, extra, o) : tv0(t, cam, extra, o); }
})();
