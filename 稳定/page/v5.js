// 《“稳定”》 v5 — one continuous shot.  "Me" is a gold point walking across a floor of days that runs out to the
// horizon; the camera never cuts and never parks.  It follows me, swings round to the side when the story turns into a
// chart, flies along the months I saved, tilts up to the stars, dives under the floor to the roots.  Scenes change
// because something in the world changes.  HUD (stability + a trace + a day counter) runs the whole film.
(async () => {
  const { PI, TAU, clamp, lerp, eIO, eOut, eIn, prog, win, hash, rng, rgba, mixc, mk, glow, textPoints, SPR } = window.LIB
  const Q = new URLSearchParams(location.search)
  const W = +Q.get('w') || 1080, H = +Q.get('h') || 1920
  const cv = document.getElementById('cv'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const TL = await (await fetch('../data/timeline.json')).json()
  const CODE_LINES = (await Promise.all(['v5.js', 'lib.js'].map(async (f) => (await (await fetch(f)).text()).split('\n').length))).reduce((a, b) => a + b, 0)
  const SERIF = '"Songti SC", serif', SANS = '"PingFang SC", sans-serif', LATIN = 'Baskerville, Georgia, serif', NUM = '"Helvetica Neue", Helvetica, sans-serif'
  await Promise.all(['300 100px "Songti SC"', '500 100px "Songti SC"', '900 100px "Songti SC"', '300 40px "PingFang SC"', '400 40px "PingFang SC"', 'italic 30px Baskerville', '200 60px "Helvetica Neue"', '300 30px "Helvetica Neue"']
    .map((f) => document.fonts.load(f, '“稳定”重估度第天年岁我会问自己扎根积蓄时间没有离婚假设情境示意≈文配音画面乐代码行台摄影机STABILITYDAY0123456789%.?')))

  const C = {
    ink: [236, 230, 218], dim: [120, 128, 140], gold: [232, 184, 98], blue: [150, 186, 216], red: [226, 82, 64], dot: [150, 166, 196], dust: [255, 236, 200],
    pink: [255, 150, 182], cyan: [110, 220, 240], violet: [178, 140, 255], green: [150, 226, 140], earth: [26, 18, 12],
  }

  // ------------------------------------------------------------------ anchors
  const L = {}; for (const l of TL.lines) L[l.id] = l
  const at = (id, ph = null, off = 0) => {
    const l = L[id]; if (ph == null) return l.t0 + off
    let end = false; if (ph[0] === '$') { end = true; ph = ph.slice(1) }
    const i = l.text.indexOf(ph); if (i < 0) { console.log('MISSING', id, ph); return l.t0 + off }
    const j = i + ph.length
    return (end ? (j < l.chars.length ? l.chars[j] : l.t1) : l.chars[i]) + off
  }
  const EV = [], SHAKE = []
  const ev = (t, k, x = {}) => EV.push({ t: +t.toFixed(3), k, ...x })
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x) }
  const END = TL.total

  const OP = { dot: 0.2, run: 0.7, snap: 2.9, glide: 3.6, title: 3.9, accel: 4.75, thru: 5.5 }
  const TW = {
    t0: L.q1.t0 - 0.6, q1end: at('q1', '吗？', -0.1), knot: at('q2', '结婚'), doubt: at('q2', '确认'), fork: at('q2', '持续'),
    split: at('s1', '分开'), spread: at('s1', '扩展'), money: at('s2', '金钱'), plans: at('s2', '个人发展'), feel: at('s2', '负面情绪'), rethink: at('s2', '重新考虑'), end: L.s2.t1,
  }
  const T = {
    fear: at('s3', '最让我恐惧'), money2: at('s3', '金钱'),
    f1: L.f1.t0, next: at('f1', '下一步'), unc: at('f2', '不确定性'), scared: at('f2', '害怕'),
    c1: L.c1.t0, chart: at('c1', '曲线图'), compare: at('c1', '对比'),
    savings: at('c2', '积蓄'), monthly: at('c2', '每个月'), up: at('c3', '慢慢往上走'),
    div: at('c4', '离婚'), drop1: at('c5', '财产分配'), drop2: at('c5', '搬家'), drop3: at('c5', '重新安排生活'), chunk: at('c5', '少了一截'),
    again: at('c6', '慢慢攒'), two: at('c7', '这两条线'), zero: at('c7', '从头开始'),
    b1: L.b1.t0, bit: at('b1', '一点一点'), now: at('b2', '现在的积蓄'), b3: L.b3.t0, forward: at('b3', '继续往前走'), less: at('b4', '少了很多'), b5: L.b5.t0, today: at('b5', '今天的位置'),
    w1: L.w1.t0, want: at('w1', '稳定'), base: at('w2', '基础'), w3: L.w3.t0, build: at('w3', '建立起来'), interrupt: at('w4', '打断'), notyet: at('w4', '还没有发生'), afraid: at('w4', '害怕'),
    u1: L.u1.t0, keep: at('u1', '留得住'), choice: at('u2', '选择'), restart: at('u2', '重新开始'),
    x1: L.x1.t0, nomarry: at('x1', '不结婚'), boom: at('x1', '爆雷'), love: at('x2', '只谈恋爱'), thirty: at('x2', '30'),
    d1: L.d1.t0, who: at('d1', '什么样的人'), strat: at('d2', '战略'), tact: at('d2', '策略'), act: at('d2', '行动'), serve: at('d3', '服务于'),
    t1: L.t1.t0, many: at('t1', '多认识'), self: at('t2', '了解自己'), mate: at('t2', '伴侣'), support: at('t3', '互相支持'), sweet: at('t3', '甜'),
    spice: at('p1', '调味剂'), sweet2: at('p2', '甜味'), boost: at('p2', '助力'), hold: at('p3', '主动权'), grip: at('p3', '紧紧握'), pain: at('p4', '痛苦'),
    r1: L.r1.t0, silent: at('r1', '沉默'), effort: at('r2', '努力'), nores: at('r2', '得不到结果'), root: at('r3', '扎根'),
  }
  const TR1 = T.restart + 1.7  // the rewind is over; everything after is "the second time"

  // ------------------------------------------------------------------ how fast I walk (m/s); the follow camera's Z is its integral
  const WALK = 3.0
  let REW = 0, SPK = []
  const keys = () => [
    [OP.thru + 0.8, WALK], [TW.money, WALK], [TW.money + 1.5, 2.75], [TW.plans + 1.5, 2.5], [TW.feel + 1.5, 2.25],
    [T.money2, 2.2], [T.money2 + 1.2, 1.6], [T.unc + 1, 1.3], [T.compare, 1.3], [T.savings - 0.8, 1.2], [T.two, 1.2], [T.b1, 0.8], [T.w1 - 0.6, 0.8], [T.w1 + 0.8, 2.6],
    [T.interrupt, 2.6], [T.afraid, 1.1], [T.restart - 0.25, 1.0], [T.restart - 0.05, -REW], [T.restart + 1.3, -REW], [TR1, 0], [TR1 + 0.9, 2.6],
    [T.x1 + 0.5, 3.0], [T.d1, 2.6], [T.serve, 3.2], [T.t1, 3.0], [T.boost - 0.2, 3.0], [T.boost + 0.8, 4.4], [T.hold + 0.5, 3.4], [T.pain, 2.2], [T.r1 - 0.5, 1.6], [T.root - 0.5, 1.4], [END + 2, 0.9]]
  function speed(t) {
    if (t < OP.run) return 1.2
    if (t < OP.snap) return 1.2 + 14.8 * Math.pow((t - OP.run) / (OP.snap - OP.run), 1.7)
    if (t < OP.glide) return lerp(16, 2.2, eOut((t - OP.snap) / (OP.glide - OP.snap)))
    if (t < OP.accel) return 2.2
    if (t < OP.thru) return 2.2 + 21 * Math.pow((t - OP.accel) / (OP.thru - OP.accel), 3)
    if (t < OP.thru + 0.8) return lerp(23.2, WALK, eOut(prog(t, OP.thru, 0.8)))
    for (let i = 0; i + 1 < SPK.length; i++) if (t < SPK[i + 1][0]) { const a = SPK[i], b = SPK[i + 1]; return lerp(a[1], b[1], eIO((t - a[0]) / (b[0] - a[0]))) }
    return SPK[SPK.length - 1][1]
  }
  const DT = 1 / 240, NZ = Math.ceil((END + 2) / DT), ZT = new Float64Array(NZ + 1)
  const integrate = () => { SPK = keys(); for (let i = 1; i <= NZ; i++) ZT[i] = ZT[i - 1] + speed((i - 0.5) * DT) * DT }
  const Zf = (t) => { const f = clamp(t, 0, NZ * DT - 1e-6) / DT, i = Math.floor(f); return lerp(ZT[i], ZT[i + 1], f - i) }
  const HY = 760, F = 1100, CH = 4.0, D0 = F * CH / (1150 - HY), S0 = F / D0
  const Zp = (t) => Zf(t) + D0                       // where I am
  integrate()
  // the stairs (w2) start where I am a little before "基础"; the rewind (u2) must land me just before them
  const STEP_L = 1.8, STEP_H = 0.26
  const Zst = Zp(T.base - 0.6), ZR = Zst - 0.8
  REW = (Zp(T.restart - 0.25) + 0.1 - ZR) / 1.65
  integrate()
  // time at which I reach Z (searching a stretch where I only walk forward)
  function tOfZ(Z, t0 = 0, t1 = T.restart - 0.3) {
    let a = Math.floor(t0 / DT), b = Math.floor(t1 / DT); if (ZT[b] + D0 < Z) return t1 + 1e3; if (ZT[a] + D0 >= Z) return t0
    while (b - a > 1) { const m = (a + b) >> 1; if (ZT[m] + D0 < Z) a = m; else b = m }
    return b * DT
  }

  // ------------------------------------------------------------------ the world's paths
  const Z_SNAP = Zp(OP.snap), Z_LINE0 = Zp(OP.dot), Z_T = Zf(OP.thru)
  const ZA = Zp(TW.t0), ZK = Zp(TW.knot), ZS = Zp(TW.split)
  const SAT = [
    { t: TW.money, kind: 'coin', col: C.gold, key: 'gold', r: 1.7, h: 1.15, w: 1.15, ph: 0.3, inc: 0.32 },
    { t: TW.plans, kind: 'flag', col: C.ink, key: 'white', r: 2.2, h: 1.85, w: -0.95, ph: 2.4, inc: -0.25 },
    { t: TW.feel, kind: 'drop', col: C.blue, key: 'blue', r: 2.7, h: 0.95, w: 0.8, ph: 4.4, inc: 0.45 },
  ]
  for (const S of SAT) S.z = Zp(S.t + 0.8)
  const braidA = (Z) => 0.42 * (1 - Math.exp(-Math.pow((Z - ZK) / 2.4, 2)))
  const braid = (Z, s) => s * braidA(Z) * Math.sin((Z - ZK) / 1.25)
  const wobble = (Z) => { let w = 0; for (const S of SAT) if (Z > S.z) w += 0.22 * Math.exp(-(Z - S.z) / 2.5) * Math.sin((Z - S.z) * 2.2); return w }
  const gX = (Z) => Z <= ZS ? braid(Z, 1) : braid(Z, 1) * (1 - smooth((Z - ZS) / 2)) + 2.6 * smooth((Z - ZS) / 9) + wobble(Z)
  const bX = (Z) => Z <= ZS ? braid(Z, -1) : braid(Z, -1) * (1 - smooth((Z - ZS) / 2)) - 7.5 * smooth((Z - ZS) / 8)
  const ZB = (t) => t <= TW.split ? Zp(t) : Zp(t) + 1.6 * Math.pow(t - TW.split, 1.35)
  const cX = (Z) => Z <= ZS ? 0 : 2.6 * smooth((Z - ZS) / 9) + 0.5 * wobble(Z)
  // the second time (after the rewind): a new lane beside the old stairs, then the right-hand road at the fork
  const Zfork = Zp(T.nomarry) + 4
  const laneOff = (Z) => 2.2 * smooth((Z - Zfork) / 8)
  const newLane = (Z) => 3.4 * smooth((Z - ZR) / 7)
  const xB = (Z) => gX(Z) + newLane(Z) + laneOff(Z)
  const cB = (Z) => cX(Z) + newLane(Z) + laneOff(Z)
  const leftLane = (Z) => cX(Z) + newLane(Z) - laneOff(Z)
  // the stairs: one step every STEP_L, the step I'd climb after "打断" is never built
  const nTop = Math.max(1, Math.floor((Zp(T.interrupt) - Zst) / STEP_L) + 1)
  function stairY(Z) {
    if (Z < Zst) return 0
    const u = (Z - Zst) / STEP_L, n = Math.floor(u), f = u - n
    if (n >= nTop) return nTop * STEP_H
    return (n + smooth(f / 0.25)) * STEP_H
  }
  const epochB = (t) => t >= TR1
  function me(t) { const Z = Zp(t); return epochB(t) ? [xB(Z), 0, Z] : [gX(Z), stairY(Z), Z] }
  // the money chart (c1–b5): I walk along the time axis; above me a column of light is my savings, its top draws the line
  const UNIT = 1.2, MONTH = 0.35, YEAR = 12 * MONTH, SLOPE = UNIT / YEAR
  const Zsav = Zp(T.savings), Zdiv = Zp(T.div), ZDR = [T.drop1, T.drop2, T.drop3].map(Zp), Zcend = Zp(T.w1 - 0.5)
  const goldY = (Z) => Z < Zsav ? 0 : 2 * UNIT * smooth((Z - Zsav) / 0.8) + SLOPE * (Z - Zsav)
  const lossY = (Z) => UNIT * ZDR.reduce((s, z) => s + smooth((Z - z) / 0.25), 0)
  const redY = (Z) => goldY(Z) - lossY(Z)
  const penY = (Z) => (Z < Zdiv ? goldY(Z) : redY(Z))
  const Zmeet = Zdiv + 3 * YEAR
  const colK = (t) => eOut(prog(t, T.savings, 0.7)) * (1 - eIO(prog(t, T.w1 - 0.5, 1.2)))
  // later stretches of the road
  const Zg = Zp(T.boom) + 6                 // the ring we don't walk through
  const Z30 = Zp(T.thirty) + 10
  const ZBL = Zp(T.mate) + 2                // where TA (the second one) falls into step beside me
  const blueX = (Z) => xB(Z) - 1.35

  // ------------------------------------------------------------------ camera: rigs blended in sequence, always moving
  function rigFollow(t) {
    const zl = Zp(t) - 1.8, B = epochB(t)
    const x = (B ? cB(zl) : cX(zl)) + 0.05 * Math.sin(t * 0.83)
    const y = CH + (B ? 0 : stairY(zl)) * 0.95
    const z = Zf(t)
    const bob = 2.5 * Math.sin(t * TAU / 1.1) * clamp(speed(t) / 3, 0, 1.4) * (t > TW.t0 ? 1 : 0) + 4 * Math.sin(t * 0.37)
    return { p: [x, y, z], g: [x, y, z + 300], hy: HY + bob, f: F, f0: 14, f1: 50 }
  }
  function rigSide(t) {   // the chart, from the side, tracking me
    const zp = Zp(t), x = gX(zp), pen = penY(zp) * colK(t), ty = 1.4 + 0.5 * pen
    return { p: [x + 22, ty + 0.9, zp - 3.5 + 0.12 * Math.sin(t * 0.3)], g: [x, ty, zp - 3.5], hy: 1010, f: F, f0: 26, f1: 60 }
  }
  function rigWide(t) {   // both lines, the whole chart
    const u = t - T.two, zc = (Zsav + Math.min(Zp(t), Zcend)) / 2 + 1 + 0.9 * u, x = gX(Zdiv), D = 41 - 1.1 * u
    return { p: [x + D, 9.5 - 0.15 * u, zc - 0.25 * u], g: [x, 8, zc], hy: 1000, f: F, f0: D + 3, f1: 70 }
  }
  function rigFly(t) {    // low among the months I saved, from the first one to today; up the column of today; the fall
    const x = gX(Zdiv), k1 = eIO(prog(t, T.b1 - 0.6, T.now - T.b1 + 0.8)), up = eIO(prog(t, T.b3 - 0.3, 2.6))
    const z = lerp(Zsav - 3, Zdiv - 1.4, k1) + 1.1 * Math.max(0, t - T.now - 0.3) + 0.6 * Math.max(0, t - T.less)
    const top = goldY(Zdiv) + 1.4
    let y = lerp(lerp(1.6, 2.3, k1), top, up)
    y -= 3 * UNIT * eOut(prog(t, T.less - 0.05, 0.6))
    const g = [lerp(x - 1.4, x - 0.2, up), lerp(y + 4.5, y + 0.2, up), z + lerp(6, 26, up)]
    return { p: [x + lerp(3.4, 1.0, up), y, z], g, hy: 960, f: F, f0: 30, f1: 60 }
  }
  function rigGap(t) {    // how many years to get back
    const u = t - T.b5, x = gX(Zdiv), zc = Zdiv + 5.4 + 0.75 * u
    return { p: [x + 28 - 0.9 * u, 7.6 - 0.12 * u, zc - 0.3 * u], g: [x, 6.2, zc], hy: 1000, f: F, f0: 30, f1: 60 }
  }
  function rigOrbit(t) {  // slowly round me while what I built starts to crumble
    const [mx, my, mz] = me(t), a = -0.62 * eIO(prog(t, T.u1 - 0.3, 8.5)) - 0.05 * Math.sin(t * 0.4)
    const rot = (dx, dz) => [mx + dx * Math.cos(a) + dz * Math.sin(a), mz - dx * Math.sin(a) + dz * Math.cos(a)]
    const p = rot(0, -D0), g = rot(0, 300 - D0), y = CH + my * 0.95
    return { p: [p[0], y, p[1]], g: [g[0], y, g[1]], hy: HY + 4 * Math.sin(t * 0.37), f: F, f0: 14, f1: 50 }
  }
  const STAR_EL = 0.25
  function rigSky(t) {    // look up at who I want to become
    const r = rigFollow(t), k = eIO(prog(t, T.d1 - 0.3, 3))
    const u = Math.max(0, t - T.d1)
    return { ...r, g: [r.p[0] + 14 * Math.sin(u * 0.45) * k, r.p[1] + 300 * Math.tan(STAR_EL * k), r.p[2] + 300], f: lerp(F, 1450, k) + 38 * u, hy: lerp(HY, 900, k) }
  }
  function rigDive(t) {   // under the floor, among the roots
    const z = Zf(t), x = cB(Zp(t) - 1.8)
    return { p: [x, -2.3, z + 3], g: [x, -4.6, z + 15], hy: 820, f: F, f0: 10, f1: 30 }
  }
  function rigEnd(t) {    // back up into the morning
    const r = rigFollow(t), u = Math.max(0, t - T.root - 1.8)
    r.p[1] += 0.28 * u
    return { ...r, g: [r.p[0], r.p[1] + 300 * 0.07, r.p[2] + 300], hy: HY + 40 }
  }
  const SHOTS = [
    [0, rigFollow, 0], [T.chart - 0.3, rigSide, 3.6], [T.two - 0.4, rigWide, 2.2], [T.b1 - 0.6, rigFly, 2.0], [T.b5 - 0.5, rigGap, 2.2],
    [T.w1 - 0.7, rigFollow, 2.8], [T.u1 - 0.3, rigOrbit, 2.5], [T.choice - 0.6, rigFollow, 1.6], [T.d1 - 0.3, rigSky, 2.4], [T.tact - 0.2, rigFollow, 3.0],
    [T.root - 1.4, rigDive, 1.5], [T.root + 1.8, rigEnd, 2.2],
  ]
  const mixRig = (a, b, k) => ({ p: a.p.map((v, i) => lerp(v, b.p[i], k)), g: a.g.map((v, i) => lerp(v, b.g[i], k)), hy: lerp(a.hy, b.hy, k), f: lerp(a.f, b.f, k), f0: lerp(a.f0, b.f0, k), f1: lerp(a.f1, b.f1, k) })
  function followRoll(t) {
    const xr = (u) => (u > TW.t0 ? (epochB(u) ? cB(Zp(u) - 1.8) : cX(Zp(u) - 1.8)) : 0)
    const acc = (xr(t + 0.2) - 2 * xr(t) + xr(t - 0.2)) / 0.04
    return clamp(-0.01 * acc, -0.014, 0.014)
  }
  function camAt(t) {
    let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k][0] <= t) i = k
    const ang = (r) => { const dx = r.g[0] - r.p[0], dy = r.g[1] - r.p[1], dz = r.g[2] - r.p[2]; r.yaw = Math.atan2(dx, dz); r.pitch = Math.atan2(-dy, Math.hypot(dx, dz)); return r }
    let r = ang(SHOTS[i][1](t)), wf = SHOTS[i][1] === rigFollow ? 1 : 0
    if (i > 0) {
      const k = eIO(prog(t, SHOTS[i][0], SHOTS[i][2]))
      if (k < 1) { const a = ang(SHOTS[i - 1][1](t)), m = mixRig(a, r, k); m.yaw = lerp(a.yaw, r.yaw, k); m.pitch = lerp(a.pitch, r.pitch, k); r = m; wf = lerp(SHOTS[i - 1][1] === rigFollow ? 1 : 0, wf, k) }
    }
    const cam = { x: r.p[0], y: r.p[1], z: r.p[2], hy: r.hy, f: r.f, f0: r.f0, f1: r.f1, yaw: r.yaw, pitch: r.pitch }
    cam.cy = Math.cos(cam.yaw); cam.sy = Math.sin(cam.yaw); cam.cp = Math.cos(cam.pitch); cam.sp = Math.sin(cam.pitch)
    cam.roll = followRoll(t) * wf + 0.004 * Math.sin(t * 0.61)
    return cam
  }
  function toCam(cam, X, Y, Z) {
    const dx = X - cam.x, dy = Y - cam.y, dz = Z - cam.z, x1 = dx * cam.cy - dz * cam.sy, z1 = dx * cam.sy + dz * cam.cy
    return [x1, dy * cam.cp + z1 * cam.sp, z1 * cam.cp - dy * cam.sp]
  }
  const proj = (cam, X, Y, Z) => { const q = toCam(cam, X, Y, Z); if (q[2] < 0.3) return null; const s = cam.f / q[2]; return [W / 2 + q[0] * s, cam.hy - q[1] * s, s, q[2]] }
  const projDir = (cam, dX, dY, dZ) => { const x1 = dX * cam.cy - dZ * cam.sy, z1 = dX * cam.sy + dZ * cam.cy, y2 = dY * cam.cp + z1 * cam.sp, z2 = z1 * cam.cp - dY * cam.sp; if (z2 < 0.02) return null; return [W / 2 + x1 * cam.f / z2, cam.hy - y2 * cam.f / z2] }
  const horizonY = (cam) => cam.hy - cam.f * Math.tan(cam.pitch)

  // ------------------------------------------------------------------ HUD: stability (live, with a trace) + day counter
  const STAB = []
  const stab = (t, v, col = C.gold, drift = 0) => STAB.push({ t, v, col, drift })
  stab(0.8, 100.0); stab(OP.snap, 37.2, C.red, -0.4); stab(5.0, '?', C.dim)
  stab(TW.t0 + 0.5, 98.6); stab(TW.q1end, '?', C.dim); stab(TW.knot, 99.9); stab(TW.doubt, '?', C.dim)
  stab(TW.split, 23.4, C.red, -0.1); stab(TW.money, 21.6, C.red, -0.1); stab(TW.plans, 19.8, C.red, -0.1); stab(TW.feel, 17.9, C.red, -0.08); stab(TW.rethink, '?', C.red)
  stab(T.money2, 12.6, C.red, -0.05); stab(T.f1 + 0.4, '?', C.dim); stab(T.compare, 58.0, C.gold, 0.05); stab(T.savings, 64.0, C.gold, 0.45)
  stab(T.div, 31.0, C.red); stab(T.drop1, 26.5, C.red); stab(T.drop2, 22.8, C.red); stab(T.drop3, 19.4, C.red, 0.12); stab(T.less, '?', C.red)
  stab(T.want, 88.0, C.gold, 0.3); stab(T.base, 92.0, C.gold, 0.2); stab(T.build, 95.5, C.gold, 0.1); stab(T.interrupt, '?', C.dim); stab(T.afraid, 41.0, C.red, -0.3)
  stab(T.u1 + 1, '?', C.dim); stab(TR1 + 0.6, 61.0, C.gold, 0.1); stab(T.nomarry, 78.0, C.gold, 0.2); stab(T.d1, 84.0, C.gold, 0.15); stab(T.serve, 90.0, C.gold, 0.1)
  stab(T.t1, 91.0, C.gold, 0.05); stab(T.support, 94.0, C.gold, 0.05); stab(T.pain, 71.0, C.red, -0.4); stab(T.r1, 76.0, C.gold, 0.02); stab(T.root, 100.0)
  STAB.sort((a, b) => a.t - b.t)
  const stabAt = (t) => { let cur = null; for (const s of STAB) if (s.t <= t) cur = s; return cur }
  const jitter = (t, big) => (big ? 0.4 : 0.06) * (Math.sin(t * 11.3) + 0.6 * Math.sin(t * 27.1 + 1)) / 1.6
  function stabVal(t) {
    const s = stabAt(t); if (!s) return null
    if (s.v === '?') { const f = t * 22, i = Math.floor(f); return lerp(hash(i * 1.7), hash((i + 1) * 1.7), f - i) * 80 + 10 }
    return clamp(s.v + s.drift * (t - s.t) + jitter(t, s.v < 50), 0, 100)
  }
  // days: proportional to how far I walk (a year of the chart is a year of days), reset by the rewind
  const DPM = 2189 / (Zf(TW.split) - Zf(TW.t0 + 0.6))
  const DAYT = new Float64Array(NZ + 1)
  for (let i = 1; i <= NZ; i++) { const t = (i - 0.5) * DT, chart = win(t, T.savings - 1, T.w1, 0.5, 0.5); DAYT[i] = DAYT[i - 1] + Math.max(0, speed(t)) * lerp(DPM, 365 / YEAR, chart) * DT }
  const dayTab = (t) => { const f = clamp(t, 0, NZ * DT - 1e-6) / DT, i = Math.floor(f); return lerp(DAYT[i], DAYT[i + 1], f - i) }
  const Zrun0 = Zf(OP.run), ZsnapCam = Zf(OP.snap)
  function dayAt(t) {
    if (t < OP.run) return null
    if (t < OP.snap) return 1 + Math.round(3649 * (Zf(t) - Zrun0) / (ZsnapCam - Zrun0))
    const crawl = 3650 + Math.floor((t - OP.snap) * 7)
    if (t < 5.0) return crawl
    if (t < TW.t0 + 0.6) return Math.max(1, Math.round(lerp(3650 + 14, 1, eIO(prog(t, 5.0, 0.65)))))
    if (t < T.restart - 0.05) return 1 + Math.round(dayTab(t) - dayTab(TW.t0 + 0.6))
    const before = 1 + Math.round(dayTab(T.restart - 0.05) - dayTab(TW.t0 + 0.6))
    if (t < TR1) return Math.max(1, Math.round(lerp(before, 1, eIO(prog(t, T.restart - 0.05, 1.5)))))
    return 1 + Math.round(dayTab(t) - dayTab(TR1))
  }
  function txt(c, s, x, y, o = {}) {
    const { size = 40, font = SANS, weight = 400, color = C.ink, a = 1, align = 'center', ls = 0, glowA = 0, italic = false } = o
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a
    c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle'; c.letterSpacing = ls + 'px'
    if (glowA) { c.shadowColor = rgba(color, 0.7 * glowA); c.shadowBlur = Math.min(120, size * 0.4) }
    c.fillStyle = rgba(color); c.fillText(s, x + (align === 'center' ? ls / 2 : 0), y); c.restore()
  }
  function hud(c, t, a) {
    if (a <= 0.003) return
    const s = window.__cover ? { v: 21.6, col: C.red, drift: 0, t: -10 } : stabAt(t)
    c.save(); c.globalAlpha *= a
    txt(c, '稳定度', 72, 132, { size: 30, weight: 300, color: C.dim, align: 'left', ls: 6 })
    txt(c, 'STABILITY', 72, 168, { size: 19, font: NUM, weight: 300, color: C.dim, align: 'left', ls: 5 })
    if (s) {
      const v = window.__cover ? s.v : stabVal(t), scr = s.v === '?' || t - s.t < 0.35
      const shown = scr ? (hash(Math.floor(t * 15)) * 99).toFixed(1) : v.toFixed(1)
      const col = s.v === '?' ? mixc(s.col, C.ink, 0.2) : s.col
      txt(c, shown, 70, 244, { size: 96, font: NUM, weight: 200, color: col, align: 'left', glowA: 0.4, a: scr ? 0.75 : 1 })
      c.font = `200 96px ${NUM}`
      const w = c.measureText(shown).width
      txt(c, '%', 78 + w, 262, { size: 40, font: NUM, weight: 300, color: col, align: 'left' })
      const x0 = 72, x1 = 1008, span = 8, y = (v) => 356 - clamp(v / 100) * 46
      c.lineWidth = 2; c.lineJoin = 'round'
      let prevS = null, px = null, py = null
      for (let x = x0; x <= x1; x += 3) {
        const tau = t - span * (x1 - x) / (x1 - x0); if (tau < 0.8) continue
        const sv = stabVal(tau), ss = stabAt(tau); if (sv == null) continue
        const yy = y(sv)
        if (px != null) { c.strokeStyle = rgba(ss.v === '?' ? mixc(ss.col, C.ink, 0.3) : ss.col, 0.15 + 0.75 * (x - x0) / (x1 - x0)); c.beginPath(); c.moveTo(px, py); c.lineTo(x, yy); c.stroke() }
        px = x; py = yy; prevS = ss
      }
      if (px != null) { glow(c, px, py, 26, prevS.col === C.red ? 'coral' : 'gold', 0.9); c.fillStyle = rgba(C.ink); c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fill() }
    }
    const d = dayAt(t)
    if (d != null) {
      const rw = (t > 5.0 && t < TW.t0 + 0.6) || (t > T.restart - 0.05 && t < TR1 + 0.3)
      txt(c, `第 ${d.toLocaleString('en-US')} 天`, 1008, 132, { size: 30, weight: 300, color: rw ? C.ink : C.dim, align: 'right', ls: 2 })
      txt(c, `DAY ${d}`, 1008, 168, { size: 19, font: NUM, weight: 300, color: C.dim, align: 'right', ls: 5 })
    }
    c.strokeStyle = rgba(C.dim, 0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(72, 384); c.lineTo(1008, 384); c.stroke()
    c.restore()
  }

  // ------------------------------------------------------------------ mood over time
  const HC = [[0, [44, 58, 92]], [OP.snap, [120, 40, 34]], [OP.thru, [44, 58, 92]], [TW.t0 + 1, [118, 92, 58]], [TW.split, [104, 40, 38]], [TW.feel, [52, 46, 70]],
    [T.f1, [64, 68, 80]], [T.chart, [50, 62, 90]], [T.div, [110, 44, 40]], [T.b1, [62, 60, 82]], [T.w1 - 0.5, [134, 102, 60]], [T.interrupt, [104, 52, 44]], [T.u1, [58, 62, 74]],
    [T.restart, [50, 70, 120]], [T.x1, [62, 72, 98]], [T.boom, [140, 50, 40]], [T.boom + 1.2, [70, 74, 100]], [T.d1, [34, 44, 92]], [T.t1, [112, 82, 98]], [T.spice, [132, 98, 92]],
    [T.pain, [124, 46, 40]], [T.r1, [26, 30, 44]], [T.root + 1.2, [150, 110, 56]], [T.root + 3, [196, 146, 84]]]
  function horizonCol(t) { let c = HC[0][1]; for (const [k, col] of HC) c = mixc(c, col, eIO(prog(t, k, 1.2))); return c }
  const DARK = (t) => 1 - 0.55 * eIO(prog(t, T.r1 - 0.5, 2.5)) + 0.55 * eIO(prog(t, T.root + 1.5, 2))
  const STARB = (t) => (1 + 1.8 * win(t, T.d1 - 0.5, T.t1 + 2, 1.5, 2) + 0.8 * win(t, T.r1, T.root + 2, 2, 1)) * (1 - 0.6 * prog(t, T.root + 2, 3))
  const FOG = (t) => win(t, T.f1 - 1.2, T.chart + 0.6, 2.2, 1.4) * (0.75 + 0.25 * eIO(prog(t, T.unc, 1.2)))

  // ------------------------------------------------------------------ sky
  const STARS = Array.from({ length: 420 }, (_, i) => { const az = (hash(i * 3.3) - 0.5) * 3.6, el = 0.02 + 1.2 * Math.pow(hash(i * 5.1), 1.4); return { d: [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], r: 0.6 + 1.3 * hash(i * 7.9), f: 0.6 + 2 * hash(i * 2.2), ph: hash(i * 9.4) * TAU } })
  // who I want to become: a standing figure in the stars, straight ahead
  const FIGP = [[0, 23.5], [-1.1, 20.6], [1.1, 20.6], [-2.6, 17.4], [2.6, 17.4], [-3.4, 13.4], [3.4, 13.4], [0, 16.2], [-0.9, 12.4], [0.9, 12.4], [-1.2, 8.2], [1.2, 8.2], [-1.4, 4.4], [1.4, 4.4]]
  const FIGL = [[0, 1], [0, 2], [1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 7], [7, 8], [7, 9], [8, 10], [9, 11], [10, 12], [11, 13]]
  const FIG = FIGP.map(([az, el]) => { const a = az * PI / 180 * 1.15, e = el * PI / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)] })
  function sky(c, t, cam) {
    const hz = horizonY(cam), hc = horizonCol(t), dk = DARK(t)
    if (cam.y < 0) {   // under the floor: earth
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgb(14,10,8)'); g.addColorStop(1, 'rgb(4,3,2)'); c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600)
      return
    }
    let g = c.createLinearGradient(0, Math.min(hz - 900, 0), 0, hz); g.addColorStop(0, 'rgb(3,5,10)'); g.addColorStop(0.75, 'rgb(8,11,20)'); g.addColorStop(1, rgba(mixc([14, 18, 30], hc, 0.25 * dk)))
    c.fillStyle = g; c.fillRect(-300, -300, W + 600, hz + 300)
    g = c.createLinearGradient(0, hz, 0, Math.max(H, hz + 400)); g.addColorStop(0, rgba(mixc([12, 15, 26], hc, 0.2 * dk))); g.addColorStop(0.3, 'rgb(7,9,16)'); g.addColorStop(1, 'rgb(3,4,8)')
    c.fillStyle = g; c.fillRect(-300, hz, W + 600, H - hz + 600)
    const sb = STARB(t)
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i], p = projDir(cam, ...s.d); if (!p || p[1] > hz - 20 || p[0] < -10 || p[0] > W + 10) continue
      c.fillStyle = rgba([220, 226, 240], Math.min(1, (0.1 + 0.3 * (0.5 + 0.5 * Math.sin(t * s.f + s.ph))) * sb) * clamp((hz - 30 - p[1]) / 160))
      c.fillRect(p[0], p[1], s.r, s.r)
    }
    figure(c, t, cam, hz)
    c.save(); c.globalCompositeOperation = 'lighter'
    const ha = dk * (1 + 0.6 * eIO(prog(t, T.root + 1.5, 2)))
    g = c.createLinearGradient(0, hz - 140, 0, hz + 90); g.addColorStop(0, rgba(hc, 0)); g.addColorStop(0.6, rgba(hc, 0.32 * ha)); g.addColorStop(0.64, rgba(mixc(hc, [255, 255, 255], 0.3), 0.5 * ha)); g.addColorStop(1, rgba(hc, 0))
    c.fillStyle = g; c.fillRect(-300, hz - 140, W + 600, 230)
    const vp = projDir(cam, 0, 0, 1)
    if (vp) { c.save(); c.translate(vp[0], hz); c.scale(3.2, 0.5); glow(c, 0, 0, 260, 'gold', (0.18 + 0.1 * eIO(prog(t, TW.t0, 3)) * (1 - prog(t, TW.split, 1)) + 0.5 * eIO(prog(t, T.root + 1.5, 3))) * dk); c.restore() }
    c.restore()
  }
  function figure(c, t, cam, hz) {
    const k = eOut(prog(t, T.d1 + 0.2, 1.6)), lk = eIO(prog(t, T.who - 0.4, 1.4)), heart = eOut(prog(t, T.strat - 0.2, 0.8))
    const keep = (0.55 + 0.45 * win(t, T.d1, T.t1 + 1, 0.5, 2) + 0.4 * win(t, T.root + 1.8, T.root + 3.6, 1.2, 1)) * (1 - 0.7 * eIO(prog(t, T.root + 3.2, 1.2)))
    if (k <= 0) return
    const P = FIG.map((d) => projDir(cam, ...d))
    c.save()
    c.strokeStyle = rgba([200, 214, 255], 0.45 * lk * keep); c.lineWidth = 1.3
    for (const [a, b] of FIGL) { if (!P[a] || !P[b]) continue; const m = lk; c.beginPath(); c.moveTo(P[a][0], P[a][1]); c.lineTo(lerp(P[a][0], P[b][0], m), lerp(P[a][1], P[b][1], m)); c.stroke() }
    P.forEach((p, i) => { if (!p || p[1] > hz) return; const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + i); glow(c, p[0], p[1], i === 0 ? 26 + 50 * heart : 18, i === 0 && heart > 0 ? 'gold' : 'white', k * keep * tw * (i === 0 ? 1 : 0.8)); c.fillStyle = rgba([255, 250, 235], k * keep); c.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3) })
    c.restore()
  }

  // ------------------------------------------------------------------ the floor of days (and its grid), seen from anywhere
  const GS = 0.5, BLK = 8
  function floorDots(c, t, cam, camP, lights, rips, o = {}) {
    const { dim = 1, fog = 0, flow = 0, flick = 0 } = o
    const R = cam.f0 + cam.f1 + 6, ox = cam.x + cam.sy * R * 0.5, oz = cam.z + cam.cy * R * 0.5, bs = GS * BLK
    const bi0 = Math.floor((ox - R * 0.62) / bs), bi1 = Math.floor((ox + R * 0.62) / bs), bk0 = Math.floor((oz - R * 0.62) / bs), bk1 = Math.floor((oz + R * 0.62) / bs)
    const act = rips.filter((r) => t > r.t && t < r.t + r.life)
    const rowL = new Map(), Rects = new Map(), Lines = new Map(), lit = []
    const { cy, sy, cp, sp, f, hy } = cam, fogNear = lerp(90, 6, fog)
    const tc = (cm, X, Y, Z) => { const dx = X - cm.x, dy = Y - cm.y, dz = Z - cm.z, x1 = dx * cm.cy - dz * cm.sy, z1 = dx * cm.sy + dz * cm.cy; return [x1, dy * cm.cp + z1 * cm.sp, z1 * cm.cp - dy * cm.sp] }
    for (let bi = bi0; bi <= bi1; bi++) for (let bk = bk0; bk <= bk1; bk++) {
      const X0 = bi * bs, Z0 = bk * bs
      let front = 0, l = 0, r = 0, u = 0, d = 0
      for (let q = 0; q < 4; q++) {
        const v = tc(cam, X0 + (q & 1) * bs, 0, Z0 + (q >> 1) * bs); if (v[2] < 0.3) continue
        front++; const s = f / v[2], x = W / 2 + v[0] * s, y = hy - v[1] * s
        if (x < -80) l++; if (x > W + 80) r++; if (y < -80) u++; if (y > H + 80) d++
      }
      if (front === 0 || (front === 4 && (l === 4 || r === 4 || u === 4 || d === 4))) continue
      for (let b = 0; b < BLK; b++) {
        const k = bk * BLK + b, Z = k * GS
        let lx = rowL.get(k)
        if (!lx) { lx = []; for (const q of lights) { const x = q.x(Z); if (x != null) { const a = typeof q.a === 'function' ? q.a(Z) : q.a; if (a > 0.01) lx.push([x, q.band, a, q]) } } rowL.set(k, lx) }
        for (let a = 0; a < BLK; a++) {
          const j = bi * BLK + a, X = j * GS
          const dx = X - cam.x, dz = Z - cam.z, x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy
          let y2 = -cam.y * cp + z1 * sp, z2 = z1 * cp + cam.y * sp
          if (z2 < 0.6 || z2 > R) continue
          let fg = clamp(1 - (z2 - cam.f0) / cam.f1) * clamp((z2 - 0.6) / 1.4)
          if (fog > 0) fg *= clamp(1 - (z2 - fogNear) / 7)
          if (fg <= 0.01) continue
          let s = f / z2, sx = W / 2 + x1 * s, syy = hy - y2 * s
          if (sx < -30 || sx > W + 30 || syy < -30 || syy > H + 30) continue
          const h1 = hash(k * 0.713 + j * 1.31)
          let kk = 0, lq = null
          for (const q of lx) { const ddx = X - q[0], w = Math.exp(-(ddx * ddx) / (q[1] * q[1])) * q[2] * (0.55 + 0.45 * h1); if (w > kk) { kk = w; lq = q[3] } }
          let rw = 0, rq = null
          for (const rr of act) { const tau = t - rr.t, dist = Math.hypot(X - rr.x, Z - rr.z), w = Math.exp(-Math.pow((dist - rr.v * tau) / 1.3, 2)) * (1 - tau / rr.life) * (rr.amp ?? 1); if (w > rw) { rw = w; rq = rr } }
          let Y = 0.6 * rw
          if (Y > 0.001) { const dy = Y - cam.y; y2 = dy * cp + z1 * sp; z2 = z1 * cp - dy * sp; if (z2 < 0.6) continue; s = f / z2; sx = W / 2 + x1 * s; syy = hy - y2 * s }
          const size = clamp(0.045 * s, 1.3, 9)
          let fl = 1; if (flick > 0) fl = 1 - flick * (hash(Math.floor(t * 9) * 0.37 + h1 * 91) > 0.55 ? 0.85 : 0)
          if (kk > 0.03 || rw > 0.04) {
            const useR = rw > kk, m = Math.max(kk, rw)
            lit.push([sx, syy, size * (1 + 1.1 * m), useR ? rq.col : lq.col, fg * fl * (0.27 + 0.73 * m) * (useR ? 1 : dim), m * fg * fl * (useR ? 1 : dim), useR ? rq.key : lq.key])
            continue
          }
          let al = 0.27 * fg * dim * fl
          if (flow > 0) al *= 1 + flow * (0.9 * Math.pow(0.5 + 0.5 * Math.sin((Z - t * 7) * 0.9 + X * 0.15), 3) - 0.2)
          const ai = Math.max(1, Math.round(al * 60)), si = Math.round(size * 2), bk2 = ai * 100 + si
          const v = camP ? tc(camP, X, Y, Z) : null
          let px = sx, py = syy
          if (v && v[2] > 0.3) { const s2 = camP.f / v[2]; px = W / 2 + v[0] * s2; py = camP.hy - v[1] * s2 }
          if (flow > 0) { const v2 = tc(cam, X, Y, Z - 0.32 * flow); if (v2[2] > 0.3) { const s3 = f / v2[2]; px = W / 2 + v2[0] * s3; py = hy - v2[1] * s3 } }
          if (Math.abs(px - sx) + Math.abs(py - syy) > 1.6) {
            let bb = Lines.get(bk2); if (!bb) { bb = { a: ai / 60, w: si / 2, p: new Path2D() }; Lines.set(bk2, bb) }
            bb.p.moveTo(px, py); bb.p.lineTo(sx, syy + 0.01)
          } else {
            let bb = Rects.get(bk2); if (!bb) { bb = { a: ai / 60, w: si / 2, p: new Path2D() }; Rects.set(bk2, bb) }
            bb.p.rect(sx - size / 2, syy - size / 2, size, size)
          }
        }
      }
    }
    c.save()
    for (const b of Rects.values()) { c.fillStyle = rgba(C.dot, b.a); c.fill(b.p) }
    c.lineCap = 'round'; for (const b of Lines.values()) { c.strokeStyle = rgba(C.dot, b.a); c.lineWidth = b.w; c.stroke(b.p) }
    for (const q of lit) { c.fillStyle = rgba(q[3], Math.min(1, q[4])); c.fillRect(q[0] - q[2] / 2, q[1] - q[2] / 2, q[2], q[2]) }
    for (const q of lit) if (q[5] > 0.35) glow(c, q[0], q[1], q[2] * 3.4, q[6], (q[5] - 0.35) * 0.5)
    c.restore()
  }
  // a world segment, clipped to the near plane, as screen coordinates
  function seg(cam, a, b) {
    let qa = toCam(cam, ...a), qb = toCam(cam, ...b); const zn = 0.4
    if (qa[2] < zn && qb[2] < zn) return null
    if (qa[2] < zn) { const k = (zn - qa[2]) / (qb[2] - qa[2]); qa = [lerp(qa[0], qb[0], k), lerp(qa[1], qb[1], k), zn] }
    else if (qb[2] < zn) { const k = (zn - qb[2]) / (qa[2] - qb[2]); qb = [lerp(qb[0], qa[0], k), lerp(qb[1], qa[1], k), zn] }
    const sa = cam.f / qa[2], sb = cam.f / qb[2]
    return [W / 2 + qa[0] * sa, cam.hy - qa[1] * sa, W / 2 + qb[0] * sb, cam.hy - qb[1] * sb, (qa[2] + qb[2]) / 2]
  }
  function grid(c, t, cam, dim = 1) {
    const R = cam.f0 + cam.f1, ox = cam.x + cam.sy * R * 0.5, oz = cam.z + cam.cy * R * 0.5, P = Array.from({ length: 6 }, () => new Path2D())
    const add = (a, b) => { const s = seg(cam, a, b); if (!s) return; const al = 0.075 * clamp(1 - (s[4] - cam.f0 * 0.6) / (cam.f1 * 0.8)); const i = Math.min(5, Math.floor(al / 0.075 * 6)); if (i <= 0) return; P[i].moveTo(s[0], s[1]); P[i].lineTo(s[2], s[3]) }
    const x0 = Math.floor((ox - R * 0.6) / 3) * 3, x1 = ox + R * 0.6, z0 = Math.floor((oz - R * 0.6) / 3) * 3, z1 = oz + R * 0.6
    for (let x = x0; x <= x1; x += 3) for (let z = z0; z < z1; z += 6) add([x, 0, z], [x, 0, z + 6])
    for (let z = z0; z <= z1; z += 3) for (let x = x0; x < x1; x += 6) add([x, 0, z], [x + 6, 0, z])
    c.save(); c.lineWidth = 1; P.forEach((p, i) => { if (!i) return; c.strokeStyle = rgba([140, 160, 200], i / 6 * 0.075 * dim); c.stroke(p) }); c.restore()
  }
  function rings(c, t, cam, rips) {
    c.save(); c.lineWidth = 1.4
    for (const r of rips) {
      const tau = t - r.t; if (tau <= 0 || tau >= r.life) continue
      const R = r.v * tau
      c.strokeStyle = rgba(r.col, 0.28 * (1 - tau / r.life) * (r.amp ?? 1)); c.beginPath()
      let pen = false
      for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU, p = proj(cam, r.x + Math.cos(a) * R, 0.02, r.z + Math.sin(a) * R); if (!p || p[3] < 1.2) { pen = false; continue } pen ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); pen = true }
      c.stroke()
    }
    c.restore()
  }

  // ------------------------------------------------------------------ lines, beads, dotted paths, cracks, points, dust
  // a luminous line: X and Y are functions of Z; drawn as a ribbon so it gets wider toward the camera
  function ribbon(c, cam, fx, fy, z0, z1, col, a, wm = 0.022, gm = 0.24, maxStep = 0.7) {
    if (a <= 0.003 || z1 <= z0 + 0.01) return
    const runs = [[]]
    for (let Z = z0; ;) {
      const p = proj(cam, fx(Z), fy ? fy(Z) : 0, Z)
      if (p && p[3] > 0.9) runs[runs.length - 1].push(p); else if (runs[runs.length - 1].length) runs.push([])
      if (Z >= z1) break
      Z = Math.min(z1, Z + clamp(0.03 * (p ? p[3] : 3), 0.05, maxStep))
    }
    c.save(); c.globalAlpha *= a
    for (const P of runs) {
      if (P.length < 2) continue
      const poly = (m) => {
        const A = [], B2 = []
        for (let i = 0; i < P.length; i++) {
          const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(P.length - 1, i + 1)]
          let nx = -(p1[1] - p0[1]), ny = p1[0] - p0[0]; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n
          const w = Math.max(0.7, m * P[i][2]); A.push([P[i][0] + nx * w, P[i][1] + ny * w]); B2.push([P[i][0] - nx * w, P[i][1] - ny * w])
        }
        c.beginPath(); c.moveTo(A[0][0], A[0][1]); for (const p of A) c.lineTo(p[0], p[1]); for (let i = B2.length - 1; i >= 0; i--) c.lineTo(B2[i][0], B2[i][1]); c.closePath()
      }
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(col, 0.08); poly(gm); c.fill(); c.fillStyle = rgba(col, 0.16); poly(gm * 0.32); c.fill()
      c.globalCompositeOperation = 'source-over'; c.fillStyle = rgba(mixc(col, [255, 255, 255], 0.25), 0.95); poly(wm); c.fill()
    }
    c.restore()
  }
  function beads(c, t, cam, fx, fy, z0, z1, key, a, rate = 7) {
    for (let k = 0; k < 6; k++) {
      const Z = z1 - ((t * rate + k * 2.3) % 13.8); if (Z < z0) continue
      const p = proj(cam, fx(Z), fy ? fy(Z) : 0, Z); if (!p || p[3] < 1.5) continue
      glow(c, p[0], p[1], 0.32 * p[2], key, 0.55 * a * clamp((z1 - Z) / 1.5))
    }
  }
  function dotted(c, t, cam, fx, fy, z0, z1, col, a, gap = 0.75, flow = 1.6) {
    if (a <= 0.003 || z1 <= z0) return
    const ph = ((t * flow) % gap + gap) % gap
    c.save(); c.fillStyle = rgba(col)
    for (let Z = Math.ceil((z0 - ph) / gap) * gap + ph; Z < z1; Z += gap) {
      const p = proj(cam, fx(Z), fy ? fy(Z) : 0, Z); if (!p || p[3] < 1) continue
      const r = clamp(0.035 * p[2], 0.8, 5)
      c.globalAlpha = a * clamp(1 - (p[3] - cam.f0 * 0.7) / (cam.f1 * 0.8)) * clamp((z1 - Z) / 2)
      c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fill()
    }
    c.restore()
  }
  function route(c, t, cam, fx, z0, z1, col, a) {
    if (a <= 0.003 || z1 <= z0) return
    const P = []; for (let Z = z0; Z <= z1; Z += 0.6) { const p = proj(cam, fx(Z), 0, Z); if (p && p[3] > 1) P.push(p) }
    if (P.length < 2) return
    const g = c.createLinearGradient(P[0][0], P[0][1], P[P.length - 1][0], P[P.length - 1][1]); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0))
    c.save(); c.strokeStyle = g; c.lineWidth = 1.6; c.setLineDash([12, 14]); c.lineDashOffset = -t * 40; c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.restore()
  }
  function crackSet(seed, x0, z0, list) {
    const r = rng(seed)
    return list.map(([ang, len]) => { const pts = [[x0, z0]]; let x = x0, z = z0, a = ang; for (let k = 1; k <= 10; k++) { a += (r() - 0.5) * 0.75; x += Math.cos(a) * len / 10; z += Math.sin(a) * len / 10; pts.push([x, z]) } return pts })
  }
  function cracks(c, cam, set, k, a, col = C.red, y = 0.01) {
    if (a <= 0.003 || k <= 0) return
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'
    for (const pts of set) {
      const m = k * (pts.length - 1), n = Math.floor(m), P = []
      for (let i = 0; i <= Math.min(n, pts.length - 1); i++) P.push(pts[i])
      if (n < pts.length - 1) { const f = m - n; P.push([lerp(pts[n][0], pts[n + 1][0], f), lerp(pts[n][1], pts[n + 1][1], f)]) }
      const S = P.map(([x, z]) => proj(cam, x, y, z))
      for (const [w, al, op] of [[9, 0.22, 'lighter'], [2.2, 0.95, 'source-over']]) {
        c.globalCompositeOperation = op; c.strokeStyle = rgba(op === 'lighter' ? col : mixc(col, [255, 220, 200], 0.4), al * a); c.beginPath()
        let pen = false
        for (const p of S) { if (!p || p[3] < 1.2) { pen = false; continue } c.lineWidth = w * clamp(p[2] / S0, 0.6, 2.2); pen ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); pen = true }
        c.stroke()
      }
    }
    c.restore()
  }
  function point(c, cam, X, Y, Z, col, key, a = 1, pulse = 0) {
    const p = proj(cam, X, Y, Z); if (!p || a <= 0.003) return null
    const k = p[2] / S0
    c.save(); c.translate(p[0], p[1]); c.scale(1.9, 0.5); glow(c, 0, 0, 130 * k, key, 0.35 * a); c.restore()
    glow(c, p[0], p[1], (140 + 40 * pulse) * k, key, 0.5 * a)
    glow(c, p[0], p[1], 26 * k, 'white', a)
    c.save(); c.globalAlpha *= a; c.fillStyle = rgba(mixc(col, [255, 255, 255], 0.5)); c.beginPath(); c.arc(p[0], p[1], 5.5 * k, 0, TAU); c.fill(); c.restore()
    return p
  }
  // a vertical quad (bar, column, step face): X fixed, Z range, Y range
  function quadZ(c, cam, X, z0, z1, y0, y1, fill) {
    const a = proj(cam, X, y0, z0), b = proj(cam, X, y0, z1), d = proj(cam, X, y1, z0), e = proj(cam, X, y1, z1); if (!a || !b || !d || !e) return false
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.lineTo(d[0], d[1]); c.closePath()
    if (typeof fill === 'function') c.fillStyle = fill(a, d); else c.fillStyle = fill
    c.fill(); return true
  }
  function quad(c, cam, P, fill) { const S = P.map((p) => proj(cam, ...p)); if (S.some((s) => !s)) return null; c.beginPath(); S.forEach((s, i) => (i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]))); c.closePath(); c.fillStyle = typeof fill === 'function' ? fill(S) : fill; c.fill(); return S }
  const DUST = Array.from({ length: 260 }, (_, i) => ({ x: hash(i * 1.1) * 44, y: 0.25 + 6.5 * Math.pow(hash(i * 2.3), 1.6), z: hash(i * 3.7) * 44, ph: hash(i * 4.9) * TAU, sz: 0.5 + hash(i * 5.3) }))
  const wrap = (v, L2) => ((v % L2) + L2) % L2 - L2 / 2
  function dust(c, t, cam, camP, a, col = C.dust, wind = 0) {
    const ox = cam.x + cam.sy * 22, oz = cam.z + cam.cy * 22
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
    for (const p of DUST) {
      const X = ox + wrap(p.x - ox + 0.25 * Math.sin(t * 0.4 + p.ph), 44), Z = oz + wrap(p.z - oz + wind * t, 44), Y = p.y + 0.18 * Math.sin(t * 0.6 + p.ph * 2) + (cam.y < 0 ? -6.5 : 0)
      const q = proj(cam, X, Y, Z); if (!q || q[3] < 0.8) continue
      if (q[0] < -80 || q[0] > W + 80 || q[1] < -80 || q[1] > H + 80) continue
      const d = q[3], al = a * 0.42 * clamp((44 - d) / 8) * clamp((d - 0.8) / 2.5) * (0.4 + 0.6 * p.sz) * (d < 4 ? 0.5 : 1)
      const r = clamp(0.022 * q[2] * p.sz, 0.6, 7)
      let pp = camP ? proj(camP, X, Y, Z - wind * 0.03) : null
      if (wind) pp = proj(cam, X, Y, Z - wind * 0.05)
      c.strokeStyle = rgba(col, al); c.lineWidth = r; c.beginPath(); c.moveTo(pp ? pp[0] : q[0], pp ? pp[1] : q[1]); c.lineTo(q[0] + 0.01, q[1]); c.stroke()
    }
    c.restore()
  }
  function glyph(c, kind, col, x, y, sc, a, spin = 1) {
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sc * spin, sc)
    c.strokeStyle = rgba(col, 0.95); c.fillStyle = c.strokeStyle; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'
    if (kind === 'coin') { c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.globalAlpha *= 0.5; c.stroke(); c.globalAlpha /= 0.5; c.font = `300 30px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('¥', 0, 1) }
    else if (kind === 'flag') { c.beginPath(); c.moveTo(-12, 34); c.lineTo(-12, -32); c.stroke(); const fl = 3 * Math.sin(x * 0.03); c.beginPath(); c.moveTo(-12, -32); c.quadraticCurveTo(4, -30 + fl, 24, -22 + fl); c.lineTo(-12, -8); c.closePath(); c.globalAlpha *= 0.35; c.fill(); c.globalAlpha /= 0.35; c.stroke() }
    else { c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(22, 4, 0, 26); c.quadraticCurveTo(-22, 4, 0, -30); c.stroke() }
    c.restore()
  }
  // world-anchored text that faces the camera
  function wtext(c, cam, s, X, Y, Z, sizeM, o = {}) { const p = proj(cam, X, Y, Z); if (!p || p[3] < 1) return null; const px = sizeM * p[2]; if (px < 4) return p; txt(c, s, p[0], p[1], { ...o, size: Math.min(px, 400) }); return p }

  // ================================================================== 0. the opening: a steady line, a count, a snap, the title
  ev(0, 'heartbeat', { d: OP.snap }); ev(OP.run, 'ticks', { d: OP.snap - OP.run }); ev(OP.snap, 'snap'); ev(OP.snap + 0.1, 'rise', { d: 1.2 })
  ev(OP.title + 0.35, 'title'); ev(OP.accel - 0.4, 'swell', { d: OP.thru - OP.accel + 0.4 }); ev(OP.thru, 'thru'); ev(5.0, 'rewind', { d: 0.65 })
  SHAKE.push({ t: OP.snap, amp: 12, dur: 0.55 }, { t: OP.thru, amp: 6, dur: 0.4 })
  const RIPS = [{ t: OP.snap, x: 0, z: Z_SNAP, v: 11, life: 3, col: C.red, key: 'coral' }]
  const SNAPCRACK = crackSet(7, 0, Z_SNAP + 0.3, [[0.02, 14], [PI - 0.02, 14], [PI * 0.38, 4.5], [PI * 0.62, 5.5], [PI * 0.5, 7], [PI * 0.2, 3.5], [PI * 0.8, 3]])
  const TSZ = 200, TITLE = textPoints('“稳定”', TSZ, 4, 'serif', 14)
  const TH = 1.28 // the title's glyph height in metres
  const PT = TITLE.map((p, i) => { const u = hash(i * 1.7 + 3); return { u, z: Z_SNAP - 0.5 - 8 * Math.pow(u, 0.8), x: (hash(i * 2.3) - 0.5) * 0.16, l: OP.snap + 0.04 + u * 0.35, d: 0.8 + 0.35 * hash(i * 5.1), h: hash(i * 6.7) } })
  const frontZ = (t) => Z_SNAP - 0.5 - 8 * Math.pow(clamp((t - OP.snap - 0.04) / 0.35), 0.8)
  const SPARKS = Array.from({ length: 80 }, (_, i) => ({ vx: (hash(i * 3.1) - 0.5) * 8, vy: 2 + 6 * hash(i * 4.3), vz: -1 + 7 * hash(i * 5.7), life: 0.8 + 0.6 * hash(i * 8.1) }))
  function sparks(c, cam, d, x0, y0, z0, n = 80, scale = 1) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const s = SPARKS[i % SPARKS.length]; if (d < 0 || d > s.life) continue
      const pos = (u) => [x0 + s.vx * u * scale, y0 + 0.1 + s.vy * u * scale - 4.9 * u * u, z0 + s.vz * u * scale]
      const p1 = pos(d), p0 = pos(Math.max(0, d - 0.04)); if (p1[1] < 0 && y0 >= 0) continue
      const a1 = proj(cam, ...p1), a0 = proj(cam, ...p0); if (!a1 || !a0) continue
      c.strokeStyle = rgba(mixc([255, 230, 170], C.red, d / s.life), 1 - d / s.life); c.lineWidth = clamp(0.03 * a1[2], 1, 4)
      c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.stroke()
    }
    c.restore()
  }
  // particles of a word gathering into a billboard; q.src(t) gives where particle i comes from (screen)
  function wordParticles(c, t, PTS, P, tc, sc, k0, near, aMul = 1) {
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < PTS.length; i++) {
      const q = P[i]; if (t < q.l) continue
      const e = eIO(prog(t, q.l, q.d)), s0 = e < 1 ? q.src(t) : [0, 0]
      const sw = Math.sin(PI * e), ang = q.h * TAU + t * 2.2
      const tx = tc[0] + PTS[i][0] * sc + Math.sin(t * 2.1 + q.h * 30) * 1.2 * sc, ty = tc[1] + PTS[i][1] * sc + Math.cos(t * 1.7 + q.h * 20) * 1.2 * sc
      const x = lerp(s0[0], tx, e) + Math.cos(ang) * 90 * sw, y = lerp(s0[1], ty, e) + Math.sin(ang) * 90 * sw
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue
      const rr = Math.min(14, 1.6 * Math.max(1, sc) * (1 + 1.5 * (1 - e)))
      c.globalAlpha = (0.35 + 0.65 * e) * (1 - 0.5 * k0) * near * aMul
      c.drawImage(SPR.gold, x - rr * 3, y - rr * 3, rr * 6, rr * 6)
    }
    c.restore()
  }
  function title(c, cam, tc, sc, a, sub = true) {
    if (a <= 0.003) return
    c.save(); c.translate(tc[0], tc[1]); c.scale(sc, sc)
    txt(c, '“稳定”', 0, 0, { size: TSZ, font: SERIF, weight: 300, color: C.gold, ls: 14, a, glowA: 0.5 })
    if (sub) { txt(c, '重  估', 0, -158, { size: 30, weight: 300, color: C.dim, ls: 12, a }); txt(c, 'STABILITY', 0, 146, { size: 30, font: LATIN, weight: 400, color: C.dim, ls: 16, a, italic: true }) }
    c.restore()
  }
  function opening(c, t, cam) {
    if (t > OP.thru + 0.4) return
    const brk = t >= OP.snap, la = eOut(prog(t, OP.dot, 0.5))
    const head = brk ? frontZ(t) : Zp(t), zero = () => 0
    if (!brk) {
      ribbon(c, cam, zero, null, Z_LINE0, head, C.gold, la)
      beads(c, t, cam, zero, null, Z_LINE0, head, 'gold', la, 9)
      point(c, cam, 0, 0, Zp(t), C.gold, 'gold', la, Math.pow(Math.max(0, Math.sin(t * 7.3)), 12))
    } else {
      ribbon(c, cam, zero, null, Z_LINE0, head, mixc(C.gold, C.red, 0.5 * (1 - prog(t, OP.snap, 1.5))), 1 - prog(t, OP.snap + 0.3, 1.2))
      const d = t - OP.snap
      cracks(c, cam, SNAPCRACK, eOut(prog(d, 0, 0.22)), 1 - prog(d, 0.6, 1.6))
      const b = proj(cam, 0, 0, Z_SNAP)
      if (b) { glow(c, b[0], b[1], 340 * b[2] / S0, 'coral', 0.85 * (1 - prog(d, 0, 0.9))); glow(c, b[0], b[1], 60 * b[2] / S0, 'white', 1 - prog(d, 0, 0.35)) }
      sparks(c, cam, d, 0, 0, Z_SNAP)
    }
    if (t > OP.snap) {
      const tc = proj(cam, 0, CH, Z_T); if (!tc) return
      const sc = tc[2] * TH / TSZ, near = clamp((tc[3] - 0.45) / 1.2)
      const tk = eOut(prog(t, OP.title + 0.3, 0.6)) * clamp((tc[3] - 0.7) / 1.6)
      wordParticles(c, t, TITLE, PT, tc, sc, tk, near)
      title(c, cam, tc, sc, tk)
    }
  }
  for (const q of PT) q.src = (t) => { const s = proj(camAt(t), q.x, 0, q.z); return s ? [s[0], s[1] - 260 * eOut(prog(t, q.l, 0.5))] : [W / 2 + q.x * 400, H + 120] }

  // ================================================================== 1. two lines -> a knot -> a fork -> the split -> what it pulls on
  ev(TW.knot, 'chime'); ev(TW.fork, 'tick'); ev(TW.split, 'split'); ev(TW.spread, 'ripple', { d: 2.5 })
  SAT.forEach((S, i) => ev(S.t + 0.45, 'arrive', { i })); ev(TW.rethink, 'rethink')
  SHAKE.push({ t: TW.split, amp: 7, dur: 0.45 })
  RIPS.push({ t: TW.knot, x: 0, z: ZK, v: 5, life: 2.6, col: C.ink, key: 'white', amp: 0.45 })
  RIPS.push({ t: TW.split, x: 0, z: ZS, v: 9, life: 4.5, col: C.red, key: 'coral' })
  for (let i = 0; i < 3; i++) RIPS.push({ t: TW.spread + i * 0.7, x: 0, z: ZS, v: 10, life: 5.5, col: i % 2 ? C.ink : C.red, key: i % 2 ? 'white' : 'coral', amp: 0.8 })
  for (const S of SAT) RIPS.push({ t: S.t + 0.8, x: gX(S.z), z: S.z, v: 6, life: 2.2, col: S.col, key: S.key, amp: 0.35 })
  const SPLITCRACK = crackSet(11, 0, ZS, [[PI * 0.05, 5], [PI * 0.3, 7], [PI * 0.62, 6], [PI * 0.9, 5.5], [PI * 1.2, 3], [PI * 1.75, 3.5]])
  const FAN = Array.from({ length: 12 }, (_, j) => ({ end: (j - 5.5) * 3.4, w: 0.5 + hash(j * 3.3), ph: hash(j * 7.1) * TAU }))
  // where each orbiting thing is; after "最让我恐惧" money comes to the front and the other two fall away
  function satPos(S, t) {
    const Zc = Zp(t), Xc = gX(Zc)
    const away = S.kind === 'coin' ? 0 : eIO(prog(t, T.fear, 2.4))
    const r = S.r * (1 + 1.6 * away), th = S.ph + S.w * (t - S.t)
    let P = [Xc + r * Math.cos(th), S.h + r * Math.sin(th) * Math.sin(S.inc) + 1.5 * away, Zc + 0.9 * r * Math.sin(th) - 9 * away * away]
    const k = eIO(prog(t, S.t - 0.3, 1.1))
    if (k < 1) {
      const far = [Xc + 3 * S.r * Math.cos(S.ph) + (S.kind === 'flag' ? -4 : 4), 3.2 + S.h, Zc + 42]
      const mid = [lerp(far[0], P[0], 0.5) + 3 * Math.sin(S.ph * 3), (far[1] + P[1]) / 2 + 1.5, lerp(far[2], P[2], 0.5)]
      const a = (1 - k) * (1 - k), b = 2 * k * (1 - k), q = k * k
      P = [a * far[0] + b * mid[0] + q * P[0], a * far[1] + b * mid[1] + q * P[1], a * far[2] + b * mid[2] + q * P[2]]
    }
    if (S.kind === 'coin') {   // money: to the front, bigger, and at "积蓄" into the column of savings
      const fr = eIO(prog(t, T.fear - 0.2, 1.6)), into = eIn(prog(t, T.savings - 0.45, 0.5))
      const front = [Xc + 0.25 * Math.sin(t * 0.9), 2.3 + 0.15 * Math.sin(t * 1.3), Zc - 2.6]
      P = P.map((v, i) => lerp(v, front[i], fr))
      if (into > 0) P = P.map((v, i) => lerp(v, [Xc, 2 * UNIT, Zc][i], into))
    }
    return P
  }
  function satellite(c, t, cam, S, front) {
    if (t < S.t - 0.3) return
    const P = satPos(S, t), Zc = Zp(t)
    if ((P[2] < Zc) !== front) return
    const gone = S.kind === 'coin' ? 1 - prog(t, T.savings + 0.05, 0.1) : 1 - prog(t, T.fear + 1.2, 1.4)
    if (gone <= 0) return
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
    let prev = proj(cam, ...P)
    for (let j = 1; j <= 14; j++) { const q = proj(cam, ...satPos(S, t - j * 0.035)); if (!q || !prev) break; c.strokeStyle = rgba(S.col, 0.35 * (1 - j / 14) * gone); c.lineWidth = clamp(0.04 * q[2], 1, 5) * (1 - j / 16); c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke(); prev = q }
    c.restore()
    const p = proj(cam, ...P); if (!p) return
    const grow = S.kind === 'coin' ? 1 + 1.3 * eIO(prog(t, T.fear - 0.2, 1.6)) : 1
    const k = eOut(prog(t, S.t - 0.3, 0.4)) * gone, sc = 0.52 * p[2] / 28 * grow
    const meP = proj(cam, gX(Zc), 0, Zc), tk = eOut(prog(t, S.t + 0.5, 0.6)) * (1 - eIO(prog(t, T.fear, 1)))
    if (meP && tk > 0) { c.save(); c.strokeStyle = rgba(S.col, 0.28 * tk * gone); c.lineWidth = 1.2; c.setLineDash([3, 6]); c.lineDashOffset = t * 12; c.beginPath(); c.moveTo(meP[0], meP[1]); c.lineTo(p[0], p[1]); c.stroke(); c.restore() }
    let rim = 0
    if (S.kind === 'coin') { rim = eOut(prog(t, T.money2 - 0.1, 0.3)) * (0.5 + 0.5 * Math.pow(Math.max(0, Math.sin((t - T.money2) * TAU / 0.86)), 6)) * (1 - prog(t, T.chart, 2)); glow(c, p[0], p[1], 46 * sc * 2.2, 'coral', 0.6 * rim * k) }
    glow(c, p[0], p[1], 90 * p[2] / S0 * grow, S.key, 0.35 * k)
    glyph(c, S.kind, rim > 0.2 ? mixc(S.col, [255, 190, 150], rim * 0.5) : S.col, p[0], p[1], sc, k * (front ? 1 : 0.7), S.kind === 'coin' && grow > 1.05 ? Math.cos(t * 1.6) : 1)
    if (S.kind === 'drop') {
      c.save(); c.strokeStyle = rgba(C.blue, 0.5 * k); c.lineWidth = 1.4
      for (let i = 0; i < 6; i++) { const u = ((t * 1.3 + i / 6) % 1), q0 = proj(cam, P[0] + (i - 2.5) * 0.12, P[1] - 0.3 - u * 1.2, P[2]), q1 = proj(cam, P[0] + (i - 2.5) * 0.12, P[1] - 0.42 - u * 1.2, P[2]); if (!q0 || !q1) continue; c.globalAlpha = (1 - u) * k; c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke() }
      c.restore()
    }
  }
  function orbitRing(c, t, cam, S) {
    const k = eOut(prog(t, S.t + 0.6, 0.8)) * (1 - eIO(prog(t, T.fear, 1.2))); if (k <= 0) return
    const Zc = Zp(t), Xc = gX(Zc), re = eOut(prog(t, TW.rethink, 0.8))
    c.save(); c.setLineDash([2, 9]); c.lineDashOffset = -t * 30; c.strokeStyle = rgba(S.col, (0.2 + 0.3 * re) * k); c.lineWidth = 1.3; c.beginPath()
    for (let i = 0; i <= 64; i++) { const th = i / 64 * TAU, p = proj(cam, Xc + S.r * Math.cos(th), S.h + S.r * Math.sin(th) * Math.sin(S.inc), Zc + 0.9 * S.r * Math.sin(th)); if (!p) continue; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]) }
    c.stroke(); c.restore()
  }
  function story(c, t, cam) {
    if (t < TW.t0 - 0.05 || t > T.u1) return
    const A = eOut(prog(t, TW.t0 - 0.05, 0.6)), zp = Zp(t), zb = ZB(t)
    const blueA = 1 - prog(t, TW.split + 1.5, 4.5)
    const fa = 0.55 * win(t, TW.doubt - 0.3, TW.split + 0.4, 0.8, 0.5), fk = eOut(prog(t, TW.fork, 1.2))
    if (fa > 0) {
      dotted(c, t, cam, () => 0, null, zp + 0.8, Math.max(zp + 0.8, ZS), C.ink, fa)
      dotted(c, t, cam, (Z) => 7 * Math.pow(clamp((Z - ZS) / 40), 1.4), null, ZS, ZS + 40 * fk, C.ink, fa)
      dotted(c, t, cam, (Z) => -7 * Math.pow(clamp((Z - ZS) / 40), 1.4), null, ZS, ZS + 40 * fk, C.ink, fa)
    }
    // "重新考虑" (and again in the fog): many possible routes ahead, re-routing as I watch
    const re = prog(t, TW.rethink - 0.2, 0.9) * (1 - prog(t, T.fear, 1.5)) + 0.8 * FOG(t)
    if (re > 0.01) FAN.forEach((f, j) => {
      const xp = gX(zp), end = f.end + 1.6 * Math.sin(t * 0.7 * f.w + f.ph)
      route(c, t, cam, (Z) => xp + end * Math.pow(clamp((Z - zp) / 44), 0.9), zp + 0.6, zp + 0.6 + 44 * eOut(clamp(re * 1.4 - j * 0.03)), j % 3 ? C.ink : C.gold, Math.min(1, re) * 0.7 * (0.5 + 0.5 * Math.sin(t * 3 + j * 1.7)) * (FOG(t) > 0.3 ? (hash(Math.floor(t * 6) + j * 7) > 0.4 ? 1 : 0.15) : 1))
    })
    const kk = eOut(prog(t, TW.knot, 0.7)), kf = 1 - prog(t, TW.knot + 0.8, 2.6)
    if (kk > 0 && kf > 0) {
      c.save(); c.strokeStyle = rgba(C.ink, 0.8 * kf); c.lineWidth = 1.8; c.beginPath()
      for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, p = proj(cam, 0.75 * kk * Math.cos(a), 0.02, ZK + 0.75 * kk * Math.sin(a)); if (!p) continue; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]) }
      c.stroke(); c.restore()
      const b = proj(cam, 0, 0, ZK), tp = proj(cam, 0, 4.5, ZK)
      if (b && tp) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, b[1], 0, tp[1]); g.addColorStop(0, rgba(C.ink, 0.35 * kf * kk)); g.addColorStop(1, rgba(C.ink, 0)); c.fillStyle = g; const w = 0.18 * b[2]; c.fillRect(b[0] - w, tp[1], w * 2, b[1] - tp[1]); c.restore(); glow(c, b[0], b[1], 0.9 * b[2], 'white', 0.4 * kf * kk) }
    }
    cracks(c, cam, SPLITCRACK, eOut(prog(t, TW.split, 0.3)), 1 - prog(t, TW.split + 1.2, 3))
    ribbon(c, cam, bX, null, ZA, Math.min(zb, ZS), C.blue, 0.85 * A * (1 - prog(t, T.f1, 3) * 0.7), 0.018, 0.2)
    if (zb > ZS && blueA > 0) ribbon(c, cam, bX, null, ZS - 0.05, zb, C.blue, 0.85 * A * blueA, 0.018, 0.2)
    if (t >= TW.split) { const b = proj(cam, 0, 0, ZS), d = t - TW.split; if (b) { glow(c, b[0], b[1], 300 * b[2] / S0, 'coral', 0.8 * (1 - prog(d, 0, 1.4))); glow(c, b[0], b[1], 50 * b[2] / S0, 'white', 0.9 * (1 - prog(d, 0, 0.5))) } }
    for (const S of SAT) orbitRing(c, t, cam, S)
    for (const S of SAT) satellite(c, t, cam, S, false)
    point(c, cam, bX(zb), 0, zb, C.blue, 'blue', 0.85 * A * blueA)
    for (const S of SAT) satellite(c, t, cam, S, true)
  }

  // ================================================================== 2. the chart: my savings, with and without the divorce
  ev(T.chart - 0.3, 'swoosh', { d: 3.0 }); ev(T.savings, 'column'); ev(T.div, 'split'); [T.drop1, T.drop2, T.drop3].forEach((tt, i) => ev(tt + 0.05, 'drop', { i }))
  ev(T.zero, 'tick'); ev(T.b3 + 0.2, 'rise', { d: 2.2 }); ev(T.less, 'fall'); ev(T.today, 'chime'); ev(T.w1 - 0.6, 'swoosh', { d: 2.4 })
  SHAKE.push({ t: T.div, amp: 8, dur: 0.45 }, { t: T.drop1 + 0.05, amp: 5, dur: 0.3 }, { t: T.drop2 + 0.05, amp: 5, dur: 0.3 }, { t: T.drop3 + 0.05, amp: 6, dur: 0.35 }, { t: T.less, amp: 9, dur: 0.5 })
  RIPS.push({ t: T.div, x: gX(Zdiv), z: Zdiv, v: 8, life: 3.5, col: C.red, key: 'coral' })
  ZDR.forEach((z, i) => RIPS.push({ t: [T.drop1, T.drop2, T.drop3][i] + 0.5, x: gX(z) + 0.6, z, v: 5, life: 2, col: C.red, key: 'coral', amp: 0.5 }))
  const DIVCRACK = crackSet(23, gX(Zdiv), Zdiv, [[0.1, 5], [PI * 0.45, 6], [PI * 0.95, 4], [PI * 1.4, 3], [PI * 1.75, 4.5]])
  const NM = Math.ceil((Zcend - Zsav) / MONTH)
  const MON = Array.from({ length: NM }, (_, m) => { const z = Zsav + (m + 0.5) * MONTH; return { z, h: penY(z), red: z > Zdiv, t: tOfZ(z) } })
  function chart(c, t, cam) {
    if (t < T.savings - 0.6 || t > T.u1) return
    const zp = Zp(t), lx = gX(zp), zEnd = Math.min(zp, Zcend), vis = 1 - prog(t, T.w1 + 1.5, 2)
    const ca = win(t, T.chart, T.w1 + 1.6, 1.2, 1.2)
    if (ca > 0) {
      c.save(); c.strokeStyle = rgba(C.ink, 0.5 * ca); c.lineWidth = 1.3
      const ax = gX(Zsav), s1 = seg(cam, [ax, 0, Zsav - 0.6], [ax, 15, Zsav - 0.6]); if (s1) { c.beginPath(); c.moveTo(s1[0], s1[1]); c.lineTo(s1[2], s1[3]); c.stroke() }
      const s2 = seg(cam, [ax, 0.01, Zsav - 0.6], [ax, 0.01, zEnd + 4]); if (s2) { c.beginPath(); c.moveTo(s2[0], s2[1]); c.lineTo(s2[2], s2[3]); c.stroke() }
      for (let u = 1; u <= 11; u++) { const s = seg(cam, [ax, u * UNIT, Zsav - 0.75], [ax, u * UNIT, Zsav - 0.45]); if (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke() } }
      for (let y = 1; Zsav + y * YEAR < zEnd + 3; y++) { const z = Zsav + y * YEAR, s = seg(cam, [ax, 0, z], [ax, 0.35, z]); if (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke() } wtext(c, cam, `${y}年`, ax, -0.55, z, 0.42, { color: C.dim, a: ca }) }
      c.restore()
      const lp = proj(cam, ax, 15.6, Zsav - 0.6); if (lp) wtext(c, cam, '积蓄', ax, 15.6, Zsav - 0.6, 0.75, { color: C.dim, a: ca * clamp((lp[1] - 470) / 60) })
      wtext(c, cam, '时间 →', ax, -1.4, Math.min(zEnd + 3, Zsav + 14), 0.6, { color: C.dim, a: ca })
    }
    for (const m of MON) {
      if (t < m.t || m.z > zEnd + 0.01) continue
      const k = eOut(prog(t, m.t, 0.35)), h = m.h * k
      const col = m.red ? C.red : C.gold
      quadZ(c, cam, gX(m.z), m.z - 0.13, m.z + 0.13, 0, h, (a, d) => { const g = c.createLinearGradient(a[0], a[1], d[0], d[1]); g.addColorStop(0, rgba(col, 0.04 * vis)); g.addColorStop(1, rgba(col, 0.42 * vis)); return g })
    }
    if (t < T.div + 0.5) for (let i = 0; i < MON.length; i += 2) { const m = MON[i]; if (m.red || m.t < T.monthly) continue; const d = t - (m.t - 0.5); if (d < 0 || d > 0.6) continue; const y = m.h + 2.4 * (1 - eIn(clamp(d / 0.5))), p = proj(cam, gX(m.z), y, m.z); if (p) glyph(c, 'coin', C.gold, p[0], p[1], 0.3 * p[2] / 28, 1 - prog(d, 0.5, 0.1)) }
    const ck = colK(t)
    if (ck > 0.003 && zp <= Zcend + 0.5) {
      const top = penY(zp) * ck
      quadZ(c, cam, lx, zp - 0.2, zp + 0.2, 0, top, (a, d) => { const g = c.createLinearGradient(a[0], a[1], d[0], d[1]); g.addColorStop(0, rgba(C.gold, 0.15)); g.addColorStop(1, rgba(mixc(C.gold, [255, 255, 255], 0.3), 0.85)); return g })
      const p = proj(cam, lx, top, zp); if (p) { glow(c, p[0], p[1], 0.9 * p[2], zp > Zdiv ? 'coral' : 'gold', 0.6); glow(c, p[0], p[1], 0.22 * p[2], 'white', 0.9) }
    }
    ZDR.forEach((z, i) => {
      const t0 = [T.drop1, T.drop2, T.drop3][i], d = t - t0; if (d < 0 || d > 1.6) return
      const top = goldY(z) - UNIT * i, y1 = top - 4.9 * d * d, y0 = y1 - UNIT, hit = y0 <= 0
      if (!hit) quadZ(c, cam, gX(z) + 0.15 * d, z - 0.2, z + 0.2, y0, y1, rgba(C.red, 0.75 * (1 - prog(d, 0.4, 0.3))))
      else sparks(c, cam, d - Math.sqrt(Math.max(0, top - UNIT) / 4.9), gX(z), 0, z, 40, 0.5)
    })
    if (t > T.div) cracks(c, cam, DIVCRACK, eOut(prog(t, T.div, 0.3)), 1 - prog(t, T.div + 1, 3))
    ribbon(c, cam, gX, goldY, Zsav - 0.1, Math.min(zEnd, Zdiv), C.gold, vis, 0.03, 0.28, 0.25)
    if (zEnd > Zdiv) {
      ribbon(c, cam, gX, redY, Zdiv, zEnd, C.red, vis, 0.03, 0.28, 0.2)
      dotted(c, t, cam, gX, goldY, Zdiv, zEnd, C.gold, 0.75 * vis, 0.45, 0.6)
      const ga = 0.14 * win(t, T.two - 0.3, T.w1, 1, 1) * vis + 0.25 * Math.exp(-Math.pow((t - T.zero - 0.3) / 0.5, 2))
      if (ga > 0.003) {
        const P = []; for (let z = Zdiv + 0.3; z <= zEnd; z += 0.5) P.push(z)
        const up = P.map((z) => proj(cam, gX(z), goldY(z), z)), dn = P.map((z) => proj(cam, gX(z), redY(z), z))
        if (up.every(Boolean) && dn.every(Boolean) && P.length > 1) { c.save(); c.fillStyle = rgba(C.red, ga); c.beginPath(); up.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); for (let i = dn.length - 1; i >= 0; i--) c.lineTo(dn[i][0], dn[i][1]); c.closePath(); c.fill(); c.restore() }
      }
    }
    const bk = win(t, T.b5 - 0.2, T.w1 + 1.2, 0.8, 1)
    if (bk > 0) {
      const hT = goldY(Zdiv), grow = eOut(prog(t, T.b5 - 0.2, 1.4)), zz = lerp(Zdiv, Zmeet, grow)
      dotted(c, t, cam, gX, () => hT, Zdiv, zz, C.ink, 0.8 * bk, 0.4, 0.3)
      const m = proj(cam, gX(Zmeet), hT, Zmeet); if (m && grow > 0.98) glow(c, m[0], m[1], 0.8 * m[2], 'white', 0.7 * bk * (0.7 + 0.3 * Math.sin(t * 5)))
      c.save(); c.strokeStyle = rgba(C.gold, 0.85 * bk); c.lineWidth = 1.6
      const s = seg(cam, [gX(Zdiv), 0.05, Zdiv], [gX(Zdiv), 0.05, zz]); if (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke() }
      for (const z of [Zdiv, zz]) { const q = seg(cam, [gX(z), 0.05, z], [gX(z), 0.55, z]); if (q) { c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); c.stroke() } }
      c.restore()
      wtext(c, cam, '≈ 3 年', gX(Zdiv), -1.0, (Zdiv + Zmeet) / 2, 0.9, { color: C.gold, a: bk * eOut(prog(t, T.today - 0.3, 0.6)), glowA: 0.4 })
    }
  }
  function legend(c, t) {
    const a = win(t, T.chart + 1.2, T.w1 + 0.4, 0.8, 0.8); if (a <= 0.003) return
    const y = 438, ra = eOut(prog(t, T.div, 0.6))
    c.save(); c.globalAlpha = a
    c.strokeStyle = rgba(C.gold); c.lineWidth = 3; c.beginPath(); c.moveTo(72, y); c.lineTo(112, y); c.stroke()
    txt(c, '没有离婚', 124, y, { size: 26, weight: 300, color: C.ink, align: 'left', ls: 2 })
    if (ra > 0) { c.globalAlpha = a * ra; c.strokeStyle = rgba(C.red); c.beginPath(); c.moveTo(290, y); c.lineTo(330, y); c.stroke(); txt(c, '离婚', 342, y, { size: 26, weight: 300, color: C.ink, align: 'left', ls: 2 }); c.globalAlpha = a }
    txt(c, '假设情境 · 示意', 1008, y, { size: 22, weight: 300, color: C.dim, align: 'right', ls: 2 })
    c.restore()
  }

  // ================================================================== 3. “稳定” again -> stairs built from what I saved -> a city of days -> the crack
  ev(T.want - 0.4, 'gather', { d: 1.2 }); ev(T.want + 0.6, 'title'); ev(T.build, 'build', { d: 4 }); ev(T.interrupt, 'crack'); ev(T.afraid, 'heart', { d: 4 })
  const WORD = { z: Zp(T.want) + 13, l0: T.want - 0.5 }
  const PW = TITLE.map((p, i) => { const h = hash(i * 4.1 + 9); return { l: WORD.l0 + h * 0.5, d: 0.9 + 0.3 * hash(i * 2.9), h, x: (hash(i * 7.7) - 0.5) * 14, z: hash(i * 5.3) * 20 } })
  for (const q of PW) q.src = (t) => { const s = proj(camAt(t), cB(Zp(t)) * 0 + gX(Zp(t)) + q.x, 0, Zp(t) - 3 + q.z); return s ? [s[0], s[1]] : [W / 2, H + 100] }
  const STEPS = Array.from({ length: nTop + 1 }, (_, k) => { const z0 = Zst + k * STEP_L; return { k, z0, z1: z0 + STEP_L, top: (k + 1) * STEP_H, t: tOfZ(z0) - 1.1 } })
  STEPS.forEach((s) => { if (s.k < nTop) ev(s.t + 0.1, 'step', { k: s.k }) })
  const CITY = Array.from({ length: 70 }, (_, i) => { const side = i % 2 ? 1 : -1, z0 = Zp(T.build - 1.5); return { x: 2.6 + side * (2.4 + 13 * Math.pow(hash(i * 3.7), 1.3)), z: z0 + 4 + 46 * hash(i * 5.9), h: 1 + 8 * Math.pow(hash(i * 8.3), 1.6), t: T.w3 + 0.2 + 3.2 * hash(i * 2.1), crumble: T.keep - 0.4 + 2.2 * hash(i * 6.6), col: hash(i * 9.1) > 0.75 ? C.blue : C.gold } })
  const STEPCRACK = crackSet(31, gX(Zst + nTop * STEP_L), Zst + nTop * STEP_L + 0.2, [[0.3, 1.2], [PI * 0.5, 1.6], [PI * 0.85, 1.1]])
  function stepBox(c, cam, s, a, col, x0, x1, top) {
    const g = (S) => { const gr = c.createLinearGradient(S[0][0], S[0][1], S[3][0], S[3][1]); gr.addColorStop(0, rgba(col, 0.1 * a)); gr.addColorStop(1, rgba(col, 0.38 * a)); return gr }
    quad(c, cam, [[x0, 0, s.z0], [x1, 0, s.z0], [x1, top, s.z0], [x0, top, s.z0]], g)
    const tp = quad(c, cam, [[x0, top, s.z0], [x1, top, s.z0], [x1, top, s.z1], [x0, top, s.z1]], rgba(mixc(col, [255, 255, 255], 0.2), 0.32 * a))
    for (const sx of [x0, x1]) quad(c, cam, [[sx, 0, s.z0], [sx, 0, s.z1], [sx, top, s.z1], [sx, top, s.z0]], rgba(col, 0.12 * a))
    if (tp) { c.save(); c.strokeStyle = rgba(mixc(col, [255, 255, 255], 0.4), 0.85 * a); c.lineWidth = 1.4; c.beginPath(); c.moveTo(tp[0][0], tp[0][1]); c.lineTo(tp[1][0], tp[1][1]); c.stroke(); c.restore() }
  }
  function stairs(c, t, cam) {
    if (t < T.want - 0.6 || t > T.x1 + 6) return
    const wk = win(t, WORD.l0, T.base - 1.0, 0.1, 0.9)
    if (wk > 0) {
      const tc = proj(cam, gX(WORD.z), CH + 1.5, WORD.z)
      if (tc) {
        const sc = tc[2] * 2.6 / TSZ, fall = eIn(prog(t, T.base - 1.9, 0.9))
        const tk = eOut(prog(t, T.want + 0.4, 0.6)) * (1 - fall)
        c.save(); c.translate(0, fall * 500); wordParticles(c, t, TITLE, PW, tc, sc, tk, 1 - fall * 0.6); c.restore()
        title(c, cam, tc, sc, tk, false)
      }
    }
    const ghost = 1 - 0.75 * prog(t, TR1, 4), lx = (z) => gX(z)
    for (let i = STEPS.length - 1; i >= 0; i--) {
      const s = STEPS[i]
      if (s.k === nTop) {
        const a = win(t, T.interrupt - 0.2, TR1 + 1, 0.3, 1.5) * (0.45 + 0.55 * (hash(Math.floor(t * 7)) > 0.35 ? 1 : 0.2))
        if (a > 0.01) {
          const x0 = lx(s.z0) - 0.7, x1 = lx(s.z0) + 0.7, top = s.top
          c.save(); c.setLineDash([6, 8]); c.lineDashOffset = t * 20; c.strokeStyle = rgba(C.red, 0.9 * a); c.lineWidth = 1.6
          const S = [[x0, nTop * STEP_H, s.z0], [x1, nTop * STEP_H, s.z0], [x1, top, s.z0], [x0, top, s.z0]].map((p) => proj(cam, ...p))
          if (S.every(Boolean)) { c.beginPath(); S.forEach((p, i2) => (i2 ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke() }
          c.restore()
          cracks(c, cam, STEPCRACK, eOut(prog(t, T.interrupt, 0.4)), a, C.red, nTop * STEP_H + 0.02)
        }
        continue
      }
      const k = eOut(prog(t, s.t, 0.55)); if (k <= 0) continue
      const crumble = eIO(prog(t, T.keep + 0.4 + (nTop - s.k) * 0.03, 2.5))
      stepBox(c, cam, s, ghost * (1 - 0.6 * crumble), C.gold, lx(s.z0) - 0.7, lx(s.z0) + 0.7, s.top * k * (1 - 0.35 * crumble))
      if (k < 1) { const p = proj(cam, lx(s.z0), s.top * k, s.z0 + STEP_L / 2); if (p) glow(c, p[0], p[1], 1.2 * p[2], 'gold', 0.5 * (1 - k)) }
    }
    const order = CITY.filter((b) => t > b.t).map((b) => ({ b, d: toCam(cam, b.x, 0, b.z)[2] })).filter((o) => o.d > 1).sort((a, b) => b.d - a.d)
    for (const { b } of order) {
      const k = eOut(prog(t, b.t, 0.9)), cr = eIO(prog(t, b.crumble, 2.2)), h = b.h * k * (1 - cr), fade = (1 - 0.8 * prog(t, TR1, 3)) * (1 - prog(t, T.x1 + 3, 3))
      if (h > 0.05 && fade > 0.01) {
        const p0 = proj(cam, b.x, 0, b.z), p1 = proj(cam, b.x, h, b.z); if (!p0 || !p1) continue
        const w = 0.32 * p0[2], g = c.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); g.addColorStop(0, rgba(b.col, 0.05 * fade)); g.addColorStop(1, rgba(b.col, 0.5 * fade))
        c.fillStyle = g; c.fillRect(p1[0] - w, p1[1], w * 2, p0[1] - p1[1])
        glow(c, p1[0], p1[1], 2.2 * w, b.col === C.blue ? 'blue' : 'gold', 0.5 * fade)
      }
      if (cr > 0 && cr < 1) {
        c.save(); c.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 10; i++) { const u = (cr * 1.4 + hash(i * 3.1 + b.x)) % 1, q = proj(cam, b.x + (hash(i * 7.3 + b.z) - 0.5) * 2 * u, b.h * (1 - cr) + 3.5 * u, b.z - 2.5 * u); if (!q) continue; glow(c, q[0], q[1], clamp(0.12 * q[2], 2, 10), 'gold', 0.5 * (1 - u) * fade) }
        c.restore()
      }
    }
  }

  // ================================================================== 4. the rewind, the fork, the ring that blows up, side by side, 30
  const T30 = tOfZ(Z30, TR1 + 0.1, END)
  ev(T.choice, 'tick'); ev(T.restart - 0.05, 'rewind', { d: 1.6 }); ev(TR1, 'land'); ev(T.boom, 'boom'); ev(T30, 'chime')
  SHAKE.push({ t: T.boom, amp: 11, dur: 0.6 })
  RIPS.push({ t: TR1, x: gX(ZR), z: ZR, v: 7, life: 2.6, col: C.blue, key: 'blue', amp: 0.6 })
  const RINGBITS = Array.from({ length: 26 }, (_, i) => ({ a0: i / 26 * TAU, v: 4 + 5 * hash(i * 3.3), vy: 2 + 5 * hash(i * 1.9), spin: (hash(i * 5.5) - 0.5) * 8 }))
  function choice(c, t, cam) {
    if (t < T.choice - 0.5 || t > T.d1 + 4) return
    const zp = Zp(t)
    const ca = win(t, T.choice - 0.3, T.restart + 0.2, 0.6, 0.3)
    if (ca > 0) { const x = gX(zp); route(c, t, cam, (Z) => x - 2.5 * smooth((Z - zp) / 12), zp + 0.5, zp + 30, C.ink, 0.6 * ca); route(c, t, cam, (Z) => x + 2.5 * smooth((Z - zp) / 12), zp + 0.5, zp + 30, C.ink, 0.6 * ca) }
    if (!epochB(t)) return
    const fa = eOut(prog(t, T.x1 - 0.6, 1.2)) * (1 - prog(t, T.d1 + 1, 3))
    dotted(c, t, cam, leftLane, null, Math.max(zp + 0.6, Zfork - 6), Zfork + 40, C.ink, 0.45 * fa, 0.8, 0)
    dotted(c, t, cam, (Z) => cB(Z), null, Math.max(zp + 0.6, Zfork - 6), Zfork + 40, C.ink, 0.45 * fa, 0.8, 0)
    const rk = eOut(prog(t, T.x1 + 0.3, 1.2)), d = t - T.boom, R = 1.7, cy = 2.1, rx = leftLane(Zg)
    if (d < 0 && rk > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'
      for (const [rr, w, al] of [[R, 6, 0.18], [R, 1.8, 0.9], [R * 0.86, 1.2, 0.4]]) {
        c.strokeStyle = rgba(mixc(C.gold, [255, 220, 200], 0.3), al * rk); c.lineWidth = w; c.beginPath()
        for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU, p = proj(cam, rx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Zg); if (!p) continue; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]) }
        c.stroke()
      }
      const gp = proj(cam, rx, cy + R, Zg); if (gp) glow(c, gp[0], gp[1], 0.5 * gp[2], 'white', 0.6 * rk * (0.6 + 0.4 * Math.sin(t * 4)))
      const warn = eOut(prog(t, T.boom - 0.9, 0.9)); if (warn > 0) { const cp = proj(cam, rx, cy, Zg); if (cp) glow(c, cp[0], cp[1], 2.4 * cp[2], 'coral', 0.4 * warn * (0.5 + 0.5 * Math.sin(t * 22))) }
      c.restore()
    } else if (d >= 0 && d < 2.5) {
      const cp = proj(cam, rx, cy, Zg)
      if (cp) { glow(c, cp[0], cp[1], 4 * cp[2], 'coral', 0.9 * (1 - prog(d, 0, 1.2))); glow(c, cp[0], cp[1], 1.2 * cp[2], 'white', 1 - prog(d, 0, 0.4)) }
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
      for (const b of RINGBITS) {
        const a0 = b.a0 + b.spin * d * 0.2, cx2 = rx + Math.cos(b.a0) * (R + b.v * d), cyy = cy + Math.sin(b.a0) * (R + b.v * d) + b.vy * d - 4.9 * d * d, zz = Zg + (hash(b.a0) - 0.3) * 4 * d
        if (cyy < 0) continue
        const p0 = proj(cam, cx2 + Math.cos(a0 + 1.57) * 0.3, cyy + Math.sin(a0 + 1.57) * 0.3, zz), p1 = proj(cam, cx2 - Math.cos(a0 + 1.57) * 0.3, cyy - Math.sin(a0 + 1.57) * 0.3, zz); if (!p0 || !p1) continue
        c.strokeStyle = rgba(mixc(C.gold, C.red, prog(d, 0, 0.8)), 1 - prog(d, 0.8, 1.6)); c.lineWidth = clamp(0.05 * p0[2], 1, 5); c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke()
      }
      c.restore()
      sparks(c, cam, d, rx, cy, Zg, 80, 1.2)
    }
    const ba = eOut(prog(t, T.love - 0.3, 1.4)) * (1 - prog(t, T.who, 2.5))
    if (ba > 0) {
      const zb0 = Zp(T.love - 0.3), zb = zp + 0.3 * Math.sin(t * 0.7)
      ribbon(c, cam, leftLane, null, zb0, zb, C.blue, 0.75 * ba, 0.018, 0.2)
      point(c, cam, leftLane(zb), 0, zb, C.blue, 'blue', 0.85 * ba)
    }
    const ta = eOut(prog(t, T.thirty - 0.4, 0.8)) * (1 - prog(t, T30 + 1.2, 1.5))
    if (ta > 0) {
      const xl = leftLane(Z30) - 1.6, xr = cB(Z30) + 1.6, s = seg(cam, [xl, 0.02, Z30], [xr, 0.02, Z30])
      if (s) { c.save(); c.strokeStyle = rgba(C.gold, 0.8 * ta); c.lineWidth = 2; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); c.restore() }
      const mid = (leftLane(Z30) + cB(Z30)) / 2
      wtext(c, cam, '30', mid, 1.5, Z30, 2.2, { font: NUM, weight: 200, color: C.gold, a: ta, glowA: 0.6 })
      wtext(c, cam, '岁', mid + 1.6, 0.85, Z30, 0.6, { color: C.gold, a: ta })
    }
  }

  // ================================================================== 5. who I want to become: the stars, a beam, strategy -> tactics -> action
  ev(T.who, 'stars', { d: 2.5 }); ev(T.strat, 'beam'); ev(T.tact, 'beam'); ev(T.act, 'beam'); ev(T.serve, 'swell2', { d: 2.0 })
  const ZACT = Zp(T.act)
  const TREE = (() => {
    const z0 = Zf(T.strat), cx = cB(Zp(T.strat)), S = [cx, CH + Math.tan(FIGP[0][1] * PI / 180) * 160, z0 + 160]
    const P1 = [cx, 26, z0 + 80], br = [-1, 0, 1].map((i) => [cx + i * 7, 9, z0 + 46]), G = []
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const z = ZACT + 7 + 3.2 * (i * 3 + j); G.push({ from: i, p: [cB(z), 0, z], t: tOfZ(z, T.act, END) }) }
    return { S, P1, br, G }
  })()
  function beamLine(c, cam, a, b, k, w, al, bend = 0) {
    if (k <= 0 || al <= 0.003) return
    const P = []; for (let i = 0; i <= 24; i++) { const u = i / 24 * k; P.push([lerp(a[0], b[0], u) + bend * Math.sin(PI * u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]) }
    const S = P.map((p) => proj(cam, ...p))
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
    for (const [ww, aa] of [[w * 5, 0.12], [w, 0.85]]) { c.strokeStyle = rgba(mixc(C.gold, [255, 255, 255], 0.3), al * aa); c.lineWidth = ww; c.beginPath(); let pen = false; for (const s of S) { if (!s) { pen = false; continue } pen ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); pen = true } c.stroke() }
    const e = S[S.length - 1]; if (e) glow(c, e[0], e[1], 30, 'gold', al * 0.8)
    c.restore()
  }
  function direction(c, t, cam) {
    if (t < T.strat - 0.3 || t > T.t1 + 3) return
    const fade = 1 - prog(t, T.serve + 2, 2.5)
    const k1 = eOut(prog(t, T.strat, 1.0)), k2 = eOut(prog(t, T.tact, 1.0)), k3 = eOut(prog(t, T.act, 1.0))
    beamLine(c, cam, TREE.S, TREE.P1, k1, 3, fade)
    TREE.br.forEach((b, i) => beamLine(c, cam, TREE.P1, b, k2, 2, fade, (i - 1) * 2))
    TREE.G.forEach((g, n) => {
      beamLine(c, cam, TREE.br[g.from], g.p, k3, 1.2, fade * 0.9, (n % 3 - 1) * 0.8)
      const hit = t - g.t; if (hit > 0 && hit < 1.2) { const p = proj(cam, ...g.p); if (p) { glow(c, p[0], p[1], 1.2 * p[2], 'gold', 0.8 * (1 - hit / 1.2)); glow(c, p[0], p[1], 0.3 * p[2], 'white', 1 - hit / 1.2) } }
    })
  }

  // ================================================================== 6. meeting people, TA, support, sweetness, seasoning, a push, my own light, thorns
  ev(T.mate, 'chime'); ev(T.support, 'pluck'); ev(T.sweet, 'sparkle', { d: 2 }); ev(T.spice, 'sparkle', { d: 3 }); ev(T.boost, 'swoosh', { d: 1.6 }); ev(T.grip, 'heart', { d: 1.8 }); ev(T.pain, 'thorns', { d: 3 })
  const PEOPLE = Array.from({ length: 8 }, (_, i) => { const side = i % 2 ? 1 : -1, t0 = T.t1 + 0.2 + i * 1.15, z0 = Zp(t0) + 6 + 5 * hash(i * 2.2); return { t0, z0, side, x0: cB(z0) + side * (5 + 2.5 * hash(i)), vx: -side * (1.6 + 0.9 * hash(i * 4.4)), vz: 1.9 + 0.9 * hash(i * 6.1), col: [C.pink, C.cyan, C.violet, C.green, [255, 170, 110], C.blue, C.pink, C.cyan][i], key: ['pink', 'cyan', 'violet', 'green', 'coral', 'blue', 'pink', 'cyan'][i], life: 7 } })
  const THORNS = Array.from({ length: 30 }, (_, i) => { const z = Zp(T.pain - 0.6) + 2 + 1.1 * i; const side = i % 2 ? 1 : -1; return { z, x: side * (0.55 + 2.4 * Math.pow(hash(i * 3.9), 1.5)), h: 0.5 + 1.5 * hash(i * 7.3), w: 0.18 + 0.2 * hash(i * 1.7) } })
  function people(c, t, cam) {
    if (t < T.t1 || t > T.mate + 6) return
    const zp = Zp(t), mx = xB(zp)
    for (const p of PEOPLE) {
      const d = t - p.t0; if (d < 0 || d > p.life) continue
      const a = eOut(prog(d, 0, 0.6)) * (1 - prog(d, p.life - 1.2, 1.2))
      const P = [p.x0 + p.vx * d, 0, p.z0 + p.vz * d]
      ribbon(c, cam, (Z) => p.x0 + p.vx * (Z - p.z0) / p.vz, null, p.z0 + p.vz * Math.max(0, d - 2.5), p.z0 + p.vz * d, p.col, 0.6 * a, 0.014, 0.16)
      point(c, cam, ...P, p.col, p.key, 0.8 * a)
      const near = Math.hypot(P[0] - mx, P[2] - zp)
      if (near < 3.2 && t < T.mate) { const s = seg(cam, [mx, 0.05, zp], [P[0], 0.05, P[2]]); if (s) { c.save(); c.strokeStyle = rgba(p.col, 0.5 * a * (1 - near / 3.2)); c.setLineDash([3, 5]); c.lineWidth = 1.4; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); c.restore() } }
    }
  }
  function together(c, t, cam) {
    if (t < T.mate - 2.5 || t > T.r1 + 3) return
    const zp = Zp(t), back = 0.9 * eIO(prog(t, T.hold, 1.2)) * (1 - eIO(prog(t, T.pain + 2, 2)))
    const join = eIO(prog(t, T.mate - 2.2, 2.6)), a = eOut(prog(t, T.mate - 2.2, 0.8)) * (1 - prog(t, T.r1, 2.5))
    if (a <= 0.003) return
    const bxAt = (Z) => lerp(xB(Z) - 6.5, blueX(Z), join)
    const zb = zp - back + 0.2 * Math.sin(t * 0.8)
    ribbon(c, cam, blueX, null, ZBL, zb, C.blue, 0.8 * a * join, 0.018, 0.2)
    const sk = eOut(prog(t, T.support - 0.2, 1.2))
    if (sk > 0) for (let z = Math.ceil(ZBL / 1.5) * 1.5; z < Math.min(zp, zb) - 0.4; z += 1.5) {
      const s = seg(cam, [blueX(z), 0.02, z], [xB(z), 0.02, z]); if (!s) continue
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(mixc(C.gold, C.blue, 0.5), 0.45 * sk * a); c.lineWidth = 1.6; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); c.restore()
    }
    point(c, cam, bxAt(zb), 0, zb, C.blue, 'blue', 0.9 * a)
    const sw = eOut(prog(t, T.sweet - 0.2, 0.8)) + 0.6 * win(t, T.spice - 0.2, T.hold, 0.5, 1.5) + 0.8 * win(t, T.sweet2 - 0.2, T.boost + 1, 0.4, 1)
    if (sw > 0.01) {
      c.save(); c.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 26; i++) { const u = (t * 0.35 + hash(i * 3.3)) % 1, z = zp - 1 + 7 * hash(i * 5.7) - u * 1.5, x = lerp(blueX(z), xB(z), hash(i * 9.1)) + 0.4 * Math.sin(t + i), p = proj(cam, x, 0.2 + 3.2 * u, z); if (!p) continue; glow(c, p[0], p[1], clamp(0.16 * p[2], 3, 16), i % 3 ? 'pink' : 'gold', Math.min(1, sw) * 0.55 * Math.sin(PI * u)) }
      c.restore()
    }
  }
  function spice(c, t, cam) {
    const a = win(t, T.spice - 0.4, T.boost + 0.6, 0.4, 1.5); if (a <= 0.003) return
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 90; i++) {
      const per = 1.1 + 0.6 * hash(i * 1.9), u = (((t - T.spice + hash(i * 4.4) * per) % per) + per) % per / per, z0 = Zf(T.spice) + 6 + 26 * hash(i * 7.7), x = lerp(blueX(z0), xB(z0), 0.5) + (hash(i * 3.1) - 0.5) * 3.2
      const y = 6 * (1 - u * u), p = proj(cam, x, y, z0); if (!p) continue
      glow(c, p[0], p[1], clamp(0.12 * p[2], 2, 12), i % 4 ? 'pink' : 'gold', a * 0.7 * (u < 0.92 ? 1 : (1 - u) / 0.08))
    }
    c.restore()
  }
  function initiative(c, t, cam) {
    const a = win(t, T.hold - 0.3, T.pain + 1, 0.6, 1.5); if (a <= 0.003) return
    const [mx, , mz] = me(t), p = proj(cam, mx, 0, mz); if (!p) return
    const g = eOut(prog(t, T.grip - 0.1, 0.5)), ring = (1 - g) * 3.5 + 0.7
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.gold, 0.6 * a * (0.4 + 0.6 * g)); c.lineWidth = 1.6; c.beginPath()
    for (let i = 0; i <= 64; i++) { const th = i / 64 * TAU, q = proj(cam, mx + Math.cos(th) * ring, 0.03, mz + Math.sin(th) * ring); if (!q) continue; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]) }
    c.stroke(); c.restore()
  }
  function thorns(c, t, cam) {
    if (t < T.pain - 1 || t > T.r1 + 4) return
    const zp = Zp(t), ord = THORNS.map((th) => ({ th, d: toCam(cam, xB(th.z) + th.x, 0, th.z)[2] })).filter((o) => o.d > 1).sort((a, b) => b.d - a.d)
    for (const { th } of ord) {
      const ahead = th.z - zp, k = eOut(clamp((16 - ahead) / 5)) * eOut(prog(t, T.pain - 0.6, 0.8)) * (1 - prog(t, T.r1 + 1, 2.5)); if (k <= 0) continue
      const x = xB(th.z) + th.x, b0 = proj(cam, x - th.w, 0, th.z), b1 = proj(cam, x + th.w, 0, th.z), tp = proj(cam, x + 0.05, th.h * k, th.z); if (!b0 || !b1 || !tp) continue
      const hit = Math.exp(-Math.pow((zp - th.z) / 0.6, 2))
      c.save(); c.fillStyle = rgba(mixc(C.red, [255, 210, 190], hit * 0.6), 0.55 + 0.35 * hit); c.beginPath(); c.moveTo(b0[0], b0[1]); c.lineTo(tp[0], tp[1]); c.lineTo(b1[0], b1[1]); c.closePath(); c.fill(); c.restore()
      glow(c, tp[0], tp[1], 0.4 * tp[2], 'coral', 0.35 + 0.6 * hit)
    }
  }
  // ================================================================== 7. silence: dark, rain, seeds planted with every step -> under the floor: roots -> morning
  ev(T.r1, 'rain', { d: T.root - T.r1 }); ev(T.nores, 'tick'); ev(T.root - 1.4, 'dive', { d: 1.4 }); ev(T.root, 'root'); ev(T.root + 1.8, 'rise', { d: 2.0 }); ev(T.root + 3.2, 'end', { d: END - T.root - 3.2 })
  const ZSEED0 = Zp(T.r1 + 0.3), ZSEED1 = Zp(T.root - 1.2)
  const SEEDS = []; for (let z = ZSEED0; z < ZSEED1; z += 1.0) SEEDS.push({ z, x: xB(z), t: tOfZ(z, TR1 + 0.1, END) })
  const ROOTS = SEEDS.map((s, i) => { const r = rng(100 + i), br = []; const n = 2 + Math.floor(r() * 2); for (let j = 0; j < n; j++) { const P = [[s.x, 0, s.z]]; let x = s.x, y = 0, z = s.z; const ax = (r() - 0.5) * 1.4, az = (r() - 0.5) * 1.2, len = 2 + 3 * r(); for (let k = 0; k < 9; k++) { x += ax * len / 9 + (r() - 0.5) * 0.25; z += az * len / 9 + (r() - 0.5) * 0.25; y -= len / 9 * (0.8 + 0.4 * r()); P.push([x, y, z]) } br.push(P) } return br })
  const RAIN = Array.from({ length: 170 }, (_, i) => ({ x: hash(i * 2.7) * 36, z: hash(i * 6.1) * 36, ph: hash(i * 8.3), v: 9 + 4 * hash(i * 1.3) }))
  function silence(c, t, cam) {
    if (t < T.r1 - 1) return
    const ra = win(t, T.r1 - 0.5, T.root - 0.8, 2, 1)
    if (ra > 0 && cam.y > 0) {
      const ox = cam.x + cam.sy * 16, oz = cam.z + cam.cy * 16
      c.save(); c.strokeStyle = rgba([150, 170, 210], 0.22 * ra); c.lineWidth = 1.1; c.beginPath()
      for (const d of RAIN) { const X = ox + wrap(d.x - ox, 36), Z = oz + wrap(d.z - oz, 36), y = 9 - ((t * d.v / 9 + d.ph) % 1) * 9, s = seg(cam, [X, y, Z], [X, y + 0.5, Z]); if (s) { c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]) } }
      c.stroke(); c.restore()
    }
    for (const s of SEEDS) {
      const d = t - s.t; if (d < 0) continue
      const p = proj(cam, s.x, 0.02, s.z); if (!p) continue
      const em = 0.35 + 0.65 * Math.exp(-d / 0.5) + 0.6 * Math.exp(-Math.pow((t - T.root) / 0.4, 2))
      glow(c, p[0], p[1], clamp(0.35 * p[2], 4, 40), 'gold', em * (cam.y < 0 ? 1 : 0.8))
    }
    const ea = win(t, T.effort - 0.2, T.nores + 1.4, 0.8, 1.0) * (0.5 + 0.5 * (hash(Math.floor(t * 8)) > 0.3 ? 1 : 0.3))
    if (ea > 0.01) { const z0 = Zp(T.effort - 0.2); dotted(c, t, cam, (Z) => xB(Z), (Z) => 0.36 * (Z - z0), z0, z0 + 30, C.gold, 0.6 * ea, 0.6, 0.8) }
    const rk = eOut(prog(t, T.root - 1.1, 1.8)), rf = 1 - prog(t, T.root + 2.5, 1.5)
    if (rk > 0 && rf > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round'
      ROOTS.forEach((br, i) => {
        const s = SEEDS[i]; if (t < s.t) return
        for (const P of br) {
          const n = Math.max(1, Math.floor(rk * (P.length - 1))), S = P.slice(0, n + 1).map((p) => proj(cam, ...p))
          for (const [w, al] of [[7, 0.12], [2, 0.75]]) { c.strokeStyle = rgba(mixc(C.gold, [255, 240, 200], 0.3), al * rf); c.lineWidth = w; c.beginPath(); let pen = false; for (const q of S) { if (!q) { pen = false; continue } pen ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); pen = true } c.stroke() }
          const u = ((t * 0.9 + i * 0.13) % 1), q = S[Math.min(S.length - 1, Math.floor(u * S.length))]; if (q) glow(c, q[0], q[1], 14, 'gold', 0.8 * rf)
        }
      })
      c.restore()
    }
  }
  const ZTREE = Zp(T.root + 1.9) + 3.2
  const TREEB = (() => { const r = rng(77), out = []; const grow = (x, y, a, len, d) => { if (d > 4) return; const x2 = x + Math.sin(a) * len, y2 = y + Math.cos(a) * len; out.push({ a: [x, y], b: [x2, y2], d }); grow(x2, y2, a - 0.45 - 0.2 * r(), len * 0.72, d + 1); grow(x2, y2, a + 0.4 + 0.2 * r(), len * 0.7, d + 1) }; grow(0, 0, 0, 1.0, 0); return out })()
  function morning(c, t, cam) {
    const g = eOut(prog(t, T.root + 2.0, 2.6)); if (g <= 0) return
    const x0 = xB(ZTREE) + 0.9
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
    for (const b of TREEB) {
      const k = clamp(g * 5 - b.d); if (k <= 0) continue
      const s = seg(cam, [x0 + b.a[0], b.a[1], ZTREE], [x0 + lerp(b.a[0], b.b[0], k), lerp(b.a[1], b.b[1], k), ZTREE]); if (!s) continue
      c.strokeStyle = rgba(mixc(C.green, C.gold, 0.35), 0.85); c.lineWidth = Math.max(1, 3.2 - b.d * 0.6); c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke()
      if (b.d === 4 && k >= 1) glow(c, s[2], s[3], 10, 'green', 0.7)
    }
    c.restore()
  }

  // ------------------------------------------------------------------ me: the line I walk and the point, for the whole film (after the opening)
  function lightsAt(t) {
    const Ls = []
    if (t < OP.thru + 0.5) {
      const head = t < OP.snap ? Zp(t) : frontZ(t), fade = t < OP.snap ? eOut(prog(t, OP.dot, 0.6)) : 1 - prog(t, OP.snap, 1.6)
      Ls.push({ x: (Z) => (Z >= Z_LINE0 && Z <= head ? 0 : null), band: 0.9, a: fade, col: t < OP.snap ? C.gold : mixc(C.gold, C.red, 0.6), key: t < OP.snap ? 'gold' : 'coral' })
    }
    if (t > TW.t0 - 0.05) {
      const A = eOut(prog(t, TW.t0 - 0.05, 0.6)), zp = Zp(t), zb = ZB(t), fadeB = 1 - prog(t, TW.split + 1.5, 4.5), B = epochB(t)
      const hiA = B ? ZR : zp
      Ls.push({ x: (Z) => (Z >= ZA && Z <= hiA ? gX(Z) : null), band: 0.8, a: (Z) => A * (Z > Zsav && Z < Zcend ? 0.6 : 1) * (Z > Zst ? 0.5 : 1), col: C.gold, key: 'gold' })
      if (B) Ls.push({ x: (Z) => (Z >= ZR && Z <= zp ? xB(Z) : null), band: 0.8, a: (Z) => (Z > ZSEED0 - 1 ? 0.55 : 1), col: C.gold, key: 'gold' })
      if (t < T.f1) Ls.push({ x: (Z) => (Z >= ZA && Z <= zb ? bX(Z) : null), band: 0.65, a: (Z) => 0.75 * A * (Z <= ZS ? 1 : fadeB), col: C.blue, key: 'blue' })
      if (t > T.mate - 2.5 && t < T.r1 + 3) { const a = 0.6 * (1 - prog(t, T.r1, 2.5)) * eIO(prog(t, T.mate - 2.2, 2.6)); Ls.push({ x: (Z) => (Z >= ZBL && Z <= zp ? blueX(Z) : null), band: 0.6, a, col: C.blue, key: 'blue' }) }
      if (t > T.love - 0.3 && t < T.who + 2.5) { const z0 = Zp(T.love - 0.3), a = 0.5 * (1 - prog(t, T.who, 2.5)); Ls.push({ x: (Z) => (Z >= z0 && Z <= zp ? leftLane(Z) : null), band: 0.6, a, col: C.blue, key: 'blue' }) }
      const cone = win(t, T.hold - 0.2, T.pain + 0.8, 0.8, 1.5)
      if (cone > 0) Ls.push({ x: (Z) => (Z > zp && Z < zp + 22 ? xB(Z) : null), band: 3.2, a: (Z) => cone * 0.75 * (1 - (Z - zp) / 22), col: mixc(C.gold, [255, 255, 255], 0.25), key: 'gold' })
    }
    return Ls
  }
  function myLine(c, t, cam) {
    if (t < TW.t0 - 0.05) return
    const A = eOut(prog(t, TW.t0 - 0.05, 0.6)), zp = Zp(t), B = epochB(t)
    const yA = (Z) => stairY(Z)
    if (!B || t < TR1 + 4) {
      const zEnd = B ? ZR : zp, a = B ? 1 - prog(t, TR1, 3) * 0.6 : 1
      ribbon(c, cam, gX, yA, ZA, Math.min(zEnd, Zst), C.gold, A * a)
      if (zEnd > Zst) ribbon(c, cam, gX, yA, Zst - 0.02, zEnd, C.gold, A * a, 0.022, 0.24, 0.3)
    }
    if (B) { ribbon(c, cam, xB, null, ZR, zp, C.gold, 1); beads(c, t, cam, xB, null, ZR, zp, 'gold', 1) } else beads(c, t, cam, gX, yA, ZA, zp, 'gold', A)
    const [mx, my, mz] = me(t)
    const pulse = Math.pow(Math.max(0, Math.sin(t * 7)), 14) + 0.8 * Math.exp(-Math.pow((t - T.grip - 0.3) / 0.25, 2)) + (t > T.afraid && t < T.u1 + 3 ? 0.6 * Math.pow(Math.max(0, Math.sin((t - T.afraid) * TAU / 0.86)), 8) : 0)
    point(c, cam, mx, my, mz, C.gold, 'gold', A * (cam.y < 0 ? 0.5 : 1), pulse)
  }

  // ------------------------------------------------------------------ subtitles: Chinese as written + a small English line
  const EN = {
    q1: 'I ask myself: can what is between two partners really stay stable for the long run?',
    q2: 'Even once two people are married, can we be sure it will keep going?',
    s1: 'I worry because when two people part, the impact spreads into every part of life.',
    s2: 'Money arrangements, plans for growing, and the dark feelings it leaves in private life — so much has to be rethought.',
    s3: 'But for me, Gu Dongzheng, of all these effects, the one I fear most is money.',
    f1: 'Why do we want so badly to know what happens next?',
    f2: 'Why is uncertainty itself already frightening?',
    c1: "Next, let's look straight at this chart: how the money in my hands changes, with and without a divorce.",
    c2: 'Say I start with some savings, and I can put some away every month.',
    c3: 'With no divorce, life goes on as planned, and my money climbs slowly along this line.',
    c4: 'But what if a divorce happened right here?',
    c5: 'Say dividing property, moving and rearranging my life take a big chunk out of my money at once.',
    c6: 'After that, I save slowly again.',
    c7: 'Looking at these two lines, what I fear most is having to build my wealth again from zero.',
    b1: 'This money is what I saved, bit by bit, with my time.',
    b2: 'Some every month — only after years did it become the savings I have now.',
    b3: 'I also hope to keep moving forward on top of this foundation.',
    b4: "But if this foundation suddenly shrank by a lot, I'd find myself thinking:",
    b5: 'how many more years would it take me to get back to where I am today?',
    w1: 'That is also why I want stability.',
    w2: "I want what I've built so far to be the base for the next step.",
    w3: 'I want my life to build up, little by little, as time moves on.',
    w4: "So when something could break that process, even before it happens, I'm already afraid.",
    u1: "For me at least, uncertainty frightens me because I don't know if what I've built today can last into the future.",
    u2: 'Nor do I know if a choice I make will one day force me to start over.',
    x1: 'So I choose not to marry, and not to put myself inside something this likely to blow up.',
    x2: "Date, but don't marry — especially before 30.",
    d1: 'For me, the first thing is to know who I want to become.',
    d2: 'Make that direction the strategy of my life, then build tactics around it, and act.',
    d3: 'Everything I do should serve that direction.',
    t1: "In college, I'd be happy to date more and meet many different people.",
    t2: 'To learn about myself through them, and to look for a partner who adds strength to the direction of my life.',
    t3: "Two people who support each other, move forward together, and add a little sweetness to each other's lives.",
    p1: 'Love is the seasoning of life.',
    p2: 'It can add sweetness to my life, and it can also push me forward.',
    p3: 'But the power to change myself must stay firmly in my own hands.',
    p4: 'To become who you want to be, you have to be willing to bear the pain that comes with it.',
    r1: 'Every outstanding person has a stretch of silent time.',
    r2: 'Those are the days of giving a great deal of effort and getting no results.',
    r3: 'We call it — taking root.',
  }
  const SUBS = []
  for (const l of TL.lines) {
    const s = l.text, parts = []; let cur = '', st = 0
    for (let i = 0; i < s.length; i++) { cur += s[i]; if ('，。？！：；'.includes(s[i]) || (s[i] === '—' && s[i + 1] !== '—')) { parts.push({ s: cur, i0: st }); cur = ''; st = i + 1 } }
    if (cur) parts.push({ s: cur, i0: st })
    const merged = []
    for (const p of parts) { const last = merged[merged.length - 1], vis = (q) => q.replace(/[，。？！：；、—\s]/g, '').length; if (last && vis(last.s) + vis(p.s) <= 15 && !/[。？！]$/.test(last.s)) last.s += p.s; else merged.push({ ...p }) }
    merged.forEach((p, k) => SUBS.push({ id: l.id, t0: l.chars[p.i0] - 0.08, t1: k + 1 < merged.length ? l.chars[merged[k + 1].i0] - 0.08 : l.t1 + 0.35, s: p.s.replace(/[，。：；]+$/, '').replace(/——$/, '').replace(/[，、：；]/g, ' ').replace(/——/g, ' ') }))
  }
  for (let i = 0; i + 1 < SUBS.length; i++) SUBS[i].t1 = Math.min(SUBS[i].t1, SUBS[i + 1].t0)
  function wrapLines(c, s, maxW) { const words = s.split(' '), rows = []; let cur = ''; for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (c.measureText(tryS).width > maxW && cur) { rows.push(cur); cur = w } else cur = tryS } if (cur) rows.push(cur); return rows }
  function bigFirst(c, t) {
    const l = L.q1; if (t < l.t0 - 0.2 || t > l.t1 + 1.0) return false
    const out = 1 - prog(t, l.t1 + 0.4, 0.6)
    const parts = [['我会问自己：', 0, 34, 460], ['伴侣之间的关系，', l.text.indexOf('伴侣'), 64, 536], ['真的会长期稳定吗？', l.text.indexOf('真的'), 76, 628]]
    parts.forEach(([s2, i0, size, y]) => {
      const t0 = l.chars[i0] - 0.1, k = eOut(prog(t, t0, 0.6))
      if (k <= 0) return
      txt(c, s2, 540, y + 16 * (1 - k), { size, font: SERIF, weight: size > 40 ? 300 : 400, color: s2.startsWith('真的') ? C.gold : C.ink, ls: size > 40 ? 8 : 6, a: k * out, glowA: s2.startsWith('真的') ? 0.5 : 0 })
    })
    const ea = eOut(prog(t, l.chars[l.text.indexOf('真的')], 0.8)) * out
    c.save(); c.globalAlpha = ea * 0.8; c.font = `italic 400 30px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = rgba(mixc(C.dim, C.ink, 0.35))
    wrapLines(c, EN.q1, 860).forEach((row, i) => c.fillText(row, 540, 690 + i * 36)); c.restore()
    return true
  }
  function subtitle(c, t) {
    if (bigFirst(c, t)) return
    const sb = SUBS.find((q) => t >= q.t0 && t < q.t1); if (!sb) return
    const a = clamp((t - sb.t0) / 0.15) * clamp((sb.t1 - t) / 0.15)
    c.save(); c.globalAlpha = a
    c.font = `400 50px ${SANS}`; c.letterSpacing = '4px'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 16; c.fillStyle = rgba(C.ink); c.fillText(sb.s, 542, 1590)
    const l = L[sb.id], en = EN[sb.id]
    if (en) {
      const la = clamp((t - l.t0 + 0.1) / 0.25) * clamp((l.t1 + 0.35 - t) / 0.25)
      c.globalAlpha = la * 0.85; c.font = `italic 400 29px ${LATIN}`; c.letterSpacing = '0.5px'; c.fillStyle = rgba(mixc(C.dim, C.ink, 0.35))
      wrapLines(c, en, 900).forEach((row, i) => c.fillText(row, 540, 1662 + i * 36))
    }
    c.restore()
  }
  function rootWord(c, t) {
    const a = win(t, T.root - 0.05, T.root + 2.1, 0.35, 0.6); if (a <= 0.003) return
    txt(c, '扎根', 540, 900 + 20 * (1 - eOut(prog(t, T.root, 0.6))), { size: 190, font: SERIF, weight: 300, color: C.gold, ls: 40, a, glowA: 0.6 })
    txt(c, 'TAKING ROOT', 540, 1040, { size: 28, font: LATIN, weight: 400, color: C.dim, ls: 14, a: a * 0.9, italic: true })
  }
  function credits(c, t) {
    const a = eOut(prog(t, T.root + 3.4, 1.2)) * (1 - prog(t, END - 0.9, 0.8)); if (a <= 0.003) return
    txt(c, '重估：“稳定”', 540, 520, { size: 64, font: SERIF, weight: 300, color: C.gold, ls: 8, a, glowA: 0.5 })
    txt(c, '文 · 顾东政', 540, 616, { size: 28, weight: 300, color: C.ink, ls: 4, a: a * 0.9 })
    txt(c, '配音由 AI 根据顾东政本人声音合成', 540, 662, { size: 24, weight: 300, color: C.dim, ls: 2, a: a * 0.9 })
    txt(c, `画面 · 配乐 · Claude　|　0 台摄影机 · ${CODE_LINES.toLocaleString('en-US')} 行代码`, 540, 708, { size: 24, weight: 300, color: C.dim, ls: 2, a: a * 0.9 })
  }

  // ------------------------------------------------------------------ frame
  const layer = mk(W, H)
  const vig = mk(W, H); { const v = vig.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)'); v.fillStyle = g; v.fillRect(0, 0, W, H) }
  const top = mk(W, 460); { const v = top.getContext('2d'), g = v.createLinearGradient(0, 0, 0, 460); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.75, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); v.fillStyle = g; v.fillRect(0, 0, W, 460) }
  const low = mk(W, H); { const v = low.getContext('2d'), g = v.createLinearGradient(0, 1380, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)'); v.fillStyle = g; v.fillRect(0, 1380, W, H - 1380) }
  const grains = [0, 1, 2, 3].map((s) => { const g = mk(256, 256), gc = g.getContext('2d'), im = gc.createImageData(256, 256), r = rng(s + 1); for (let i = 0; i < 65536; i++) { const v = 128 + (r() - 0.5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 } gc.putImageData(im, 0, 0); return ctx.createPattern(g, 'repeat') })
  const shakeAt = (t) => { let x = 0, y = 0; for (const s of SHAKE) { const d = t - s.t; if (d < 0 || d > s.dur) continue; const e = s.amp * Math.pow(1 - d / s.dur, 2); x += Math.sin(d * 63) * e; y += Math.cos(d * 51) * e } return [x, y] }
  function fogLayer(c, t, cam) {
    const f = FOG(t); if (f <= 0.01) return
    const hz = horizonY(cam), g = c.createLinearGradient(0, hz - 260, 0, hz + 520)
    g.addColorStop(0, 'rgba(70,78,96,0)'); g.addColorStop(0.35, `rgba(70,78,96,${0.55 * f})`); g.addColorStop(1, 'rgba(70,78,96,0)')
    c.fillStyle = g; c.fillRect(-300, hz - 260, W + 600, 780)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 14; i++) { const x = ((hash(i * 3.3) * 1600 + t * (18 + 20 * hash(i))) % 1600) - 260, y = hz - 120 + 420 * hash(i * 5.7); glow(c, x, y, 260 + 200 * hash(i * 7.1), 'white', 0.05 * f) }
    c.restore()
  }
  function world(c, t, cam, camP) {
    sky(c, t, cam)
    const dk = DARK(t)
    grid(c, t, cam, dk)
    const flow = win(t, T.serve - 0.2, T.t1 + 1, 0.8, 1.5)
    floorDots(c, t, cam, camP, lightsAt(t), RIPS, { dim: dk, fog: FOG(t), flow, flick: 0.6 * FOG(t) * eIO(prog(t, T.unc, 1)) })
    rings(c, t, cam, RIPS)
    if (cam.y < 0) { c.fillStyle = 'rgba(20,14,10,0.35)'; c.fillRect(0, 0, W, H) }
    opening(c, t, cam)
    chart(c, t, cam)
    stairs(c, t, cam)
    choice(c, t, cam)
    direction(c, t, cam)
    thorns(c, t, cam)
    people(c, t, cam)
    together(c, t, cam)
    spice(c, t, cam)
    initiative(c, t, cam)
    silence(c, t, cam)
    myLine(c, t, cam)
    story(c, t, cam)
    morning(c, t, cam)
    fogLayer(c, t, cam)
    dust(c, t, cam, camP, eOut(prog(t, 0, 1.2)) * (0.6 + 0.4 * dk), C.dust, 10 * win(t, T.boost - 0.2, T.hold + 0.5, 0.4, 1))
    const fl = Math.exp(-Math.pow((t - OP.thru) / 0.11, 2))
    if (fl > 0.01) { glow(c, W / 2, cam.hy, 1100, 'gold', 0.6 * fl); c.fillStyle = rgba([255, 236, 200], 0.22 * fl); c.fillRect(0, 0, W, H) }
    const rw = win(t, T.restart - 0.05, TR1, 0.15, 0.3); if (rw > 0) { c.fillStyle = `rgba(110,150,255,${0.07 * rw})`; c.fillRect(0, 0, W, H); for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(200,220,255,${0.05 * rw})`; c.fillRect(0, ((t * 1700 + i * 330) % H), W, 2) } }
    const blk = 1 - eOut(prog(t, 0, 0.9)); if (blk > 0) { c.fillStyle = `rgba(0,0,0,${blk})`; c.fillRect(0, 0, W, H) }
  }
  function renderFrame(t) {
    const cam = camAt(t), camP = camAt(t - 0.012)
    const lc = layer.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over'
    world(lc, t, cam, camP)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
    const [sx, sy] = shakeAt(t), sz = 1 + 1.85 * Math.abs(cam.roll) + Math.min(0.03, (Math.abs(sx) + Math.abs(sy)) / 600)
    ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(cam.roll); ctx.scale(sz, sz); ctx.translate(-W / 2, -H / 2); ctx.drawImage(layer, 0, 0); ctx.restore()
    ctx.drawImage(top, 0, 0)
    hud(ctx, t, eOut(prog(t, 0.6, 0.8)) * (1 - prog(t, END - 0.9, 0.8)))
    const f = Math.floor(t * 24)
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = grains[f % 4]; ctx.translate((f * 37) % 256, (f * 91) % 256); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore()
    ctx.drawImage(vig, 0, 0); ctx.drawImage(low, 0, 0)
    legend(ctx, t)
    rootWord(ctx, t)
    credits(ctx, t)
    if (window.__cover) return
    subtitle(ctx, t)
    txt(ctx, '配音由 AI 根据顾东政本人声音合成', 540, 1850, { size: 22, color: C.dim, a: win(t, OP.title + 0.6, TW.t0 + 1.4, 0.5, 0.5) * 0.8, ls: 2 })
    const fo = prog(t, END - 0.9, 0.8); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H) }
  }
  // cover: the gap in the chart, and the question it asks
  function renderCover() {
    window.__cover = true
    renderFrame(T.today + 1.6)
    txt(ctx, '我要再花多少年，', 540, 540, { size: 76, font: SERIF, weight: 500, color: C.ink, ls: 6, glowA: 0.3 })
    txt(ctx, '才能回到今天的位置？', 540, 650, { size: 76, font: SERIF, weight: 500, color: C.gold, ls: 6, glowA: 0.5 })
    txt(ctx, '重估：“稳定”　｜　顾东政', 540, 1480, { size: 34, weight: 300, color: C.ink, ls: 4, a: 0.9 })
  }
  window.renderCover = renderCover
  EV.sort((a, b) => a.t - b.t)
  const SPD = []; for (let t = 0; t <= END; t += 0.05) SPD.push(+speed(t).toFixed(3))
  window.__EVENTS = { total: END, events: EV, lines: TL.lines.map((l) => ({ id: l.id, t0: l.t0, t1: l.t1, file: l.file })), marks: { snap: OP.snap, title: OP.title, thru: OP.thru, t0: TW.t0, split: TW.split, spread: TW.spread, end: TW.end, ...T, TR1 }, speed: { dt: 0.05, v: SPD } }
  console.log('rewind lands at', (Zp(TR1) - ZR).toFixed(2), 'm from ZR; steps', nTop, 'months', NM, 'REW', REW.toFixed(1))
  window.TOTAL = END
  window.renderFrame = renderFrame
  window.ready = true
})()
