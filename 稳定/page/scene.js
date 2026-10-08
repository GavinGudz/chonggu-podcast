// 《稳定》 renderer.  Every frame is a pure function of t (seconds); workers render any frame in any order.
// One thread runs through the whole film: two lines braided -> split -> the savings curve -> bricks under it
// -> stairs -> a fork that rewinds -> a direction -> a pen drawing his own line -> a flat stretch -> roots.
(async () => {
  const Q = new URLSearchParams(location.search)
  const W = +Q.get('w') || 1080, H = +Q.get('h') || 1920
  const cv = document.getElementById('cv')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const TL = await (await fetch('../data/timeline.json')).json()
  await Promise.all(['900 100px "Songti SC"', '700 100px "Songti SC"', '600 40px "PingFang SC"', '500 40px "PingFang SC"', '400 40px "PingFang SC"']
    .map((f) => document.fonts.load(f, '稳定扎根金钱我的积蓄时间重估顾东政离婚假设情境恋爱结婚方向战略策略行动')))

  // ------------------------------------------------------------------ helpers
  const PI = Math.PI, TAU = PI * 2
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
  const lerp = (a, b, x) => a + (b - a) * x
  const eIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const eOut = (x) => 1 - Math.pow(1 - clamp(x), 3)
  const eIn = (x) => Math.pow(clamp(x), 3)
  const eBack = (x) => { x = clamp(x); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const prog = (t, t0, d) => (d > 0 ? clamp((t - t0) / d) : t >= t0 ? 1 : 0)
  const win = (t, t0, t1, fi = 0.4, fo = 0.4) => Math.min(prog(t, t0, fi), 1 - prog(t, t1 - fo, fo))
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TAU * r())

  const COL = {
    ink: [240, 232, 217], dim: [128, 120, 108], faint: [62, 58, 52],
    gold: [233, 180, 92], coral: [228, 88, 64], blue: [146, 186, 212], pink: [234, 150, 162],
    green: [168, 196, 112], soil: [32, 24, 18],
  }
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
  const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k))
  const SERIF = '"Songti SC", "STSong", serif', SANS = '"PingFang SC", "Hiragino Sans GB", sans-serif'

  function text(c, s, x, y, o = {}) {
    const { size = 40, font = 'sans', weight, color = COL.ink, a = 1, align = 'center', base = 'middle', ls = 0, glow = 0 } = o
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a
    c.font = `${weight || (font === 'serif' ? 900 : 500)} ${size}px ${font === 'serif' ? SERIF : SANS}`
    c.textAlign = align; c.textBaseline = base; c.letterSpacing = ls + 'px'
    if (glow) { c.shadowColor = rgba(color, 0.55); c.shadowBlur = glow }
    c.fillStyle = rgba(color)
    c.fillText(s, x + (align === 'center' ? ls / 2 : 0), y)
    c.restore()
  }
  // polyline helpers
  function cut(pts, k) {
    if (k >= 1) return pts
    if (k <= 0 || pts.length < 2) return pts.slice(0, 1)
    let tot = 0; const seg = []
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d }
    let want = tot * k; const out = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      if (want <= seg[i - 1]) { const f = seg[i - 1] ? want / seg[i - 1] : 0; out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); return out }
      want -= seg[i - 1]; out.push(pts[i])
    }
    return out
  }
  function line(c, pts, o = {}) {
    const { color = COL.ink, w = 3, a = 1, glow = 0, dash = null, k = 1, cap = 'round', off = 0 } = o
    if (a <= 0.003 || pts.length < 2) return pts[pts.length - 1]
    const p = cut(pts, k)
    c.save(); c.globalAlpha *= a; c.strokeStyle = rgba(color); c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'
    if (dash) { c.setLineDash(dash); c.lineDashOffset = off }
    c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1])
    if (glow) { c.shadowColor = rgba(color, 0.8); c.shadowBlur = glow; c.stroke(); c.shadowBlur = 0 }
    c.stroke(); c.restore()
    return p[p.length - 1]
  }
  function dot(c, x, y, r, color, a = 1, glow = 0) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.fillStyle = rgba(color)
    if (glow) { c.shadowColor = rgba(color, 0.9); c.shadowBlur = glow }
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore()
  }
  function ring(c, x, y, r, color, a = 1, w = 2, dash = null, off = 0) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.strokeStyle = rgba(color); c.lineWidth = w
    if (dash) { c.setLineDash(dash); c.lineDashOffset = off }
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore()
  }
  const qbez = (p0, p1, p2, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]] })
  const cbez = (p0, p1, p2, p3, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]] })
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }

  // little person: feet at (x, y)
  function person(c, x, y, s, color, a = 1, walk = 0, o = {}) {
    if (a <= 0.003) return
    const { dash = null, lw = 3.6, glow = 0 } = o
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s)
    c.strokeStyle = rgba(color); c.fillStyle = rgba(color); c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'
    if (glow) { c.shadowColor = rgba(color, 0.8); c.shadowBlur = glow }
    if (dash) c.setLineDash(dash)
    const sw = Math.sin(walk) * 7
    c.beginPath(); c.arc(0, -51, 8.5, 0, TAU); dash ? c.stroke() : c.fill()
    c.beginPath(); c.moveTo(0, -41); c.lineTo(0, -18)
    c.moveTo(0, -18); c.lineTo(-5 + sw, 0); c.moveTo(0, -18); c.lineTo(5 - sw, 0)
    c.moveTo(0, -35); c.lineTo(-10 - sw * 0.5, -21); c.moveTo(0, -35); c.lineTo(10 + sw * 0.5, -21)
    c.stroke(); c.restore()
  }
  function star(c, x, y, r, color, a = 1, glow = 24) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.fillStyle = rgba(color); c.shadowColor = rgba(color, 0.9); c.shadowBlur = glow
    c.beginPath()
    for (let i = 0; i < 8; i++) { const ang = (i * PI) / 4 - PI / 2, rr = i % 2 ? r * 0.26 : r; c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr) }
    c.closePath(); c.fill(); c.restore()
  }
  function icon(c, kind, x, y, s, color, a = 1) {
    if (a <= 0.003) return
    c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a
    c.strokeStyle = rgba(color); c.fillStyle = rgba(color); c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round'
    if (kind === 'coin') {
      c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.stroke()
      c.globalAlpha *= 0.45; c.beginPath(); c.arc(0, 0, 23, 0, TAU); c.stroke(); c.globalAlpha /= 0.45
      c.font = `600 32px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('¥', 0, 2)
    } else if (kind === 'flag') {
      c.beginPath(); c.moveTo(-12, 30); c.lineTo(-12, -32); c.moveTo(-26, 30); c.lineTo(2, 30); c.stroke()
      c.beginPath(); c.moveTo(-12, -32); c.lineTo(24, -21); c.lineTo(-12, -9); c.closePath(); c.globalAlpha *= 0.85; c.fill()
    } else if (kind === 'cloud') {
      c.beginPath(); c.moveTo(-26, 8)
      c.arc(-19, -1, 11, PI * 0.6, PI * 1.5); c.arc(-1, -9, 15, PI * 1.1, PI * 1.95); c.arc(18, -1, 11, PI * 1.4, PI * 0.45)
      c.closePath(); c.stroke()
      c.beginPath(); for (const dx of [-12, 0, 12]) { c.moveTo(dx, 18); c.lineTo(dx - 4, 31) } c.stroke()
    } else if (kind === 'rings') {
      c.strokeStyle = rgba(COL.gold); c.beginPath(); c.arc(-15, 0, 24, 0, TAU); c.stroke()
      c.strokeStyle = rgba(COL.blue); c.beginPath(); c.arc(15, 0, 24, 0, TAU); c.stroke()
    } else if (kind === 'bolt') {
      c.beginPath(); c.moveTo(8, -46); c.lineTo(-16, 4); c.lineTo(1, 4); c.lineTo(-8, 46); c.lineTo(18, -8); c.lineTo(1, -8); c.closePath()
      c.shadowColor = rgba(color, 0.9); c.shadowBlur = 20; c.fill()
    } else if (kind === 'pair') { // two people, close
      c.restore(); person(c, x - 18 * s, y + 34 * s, 0.9 * s, COL.gold, a); person(c, x + 18 * s, y + 34 * s, 0.9 * s, COL.blue, a); return
    }
    c.restore()
  }
  function arrow(c, x0, y0, x1, y1, color, a = 1, w = 3, head = 14) {
    if (a <= 0.003) return
    const ang = Math.atan2(y1 - y0, x1 - x0)
    c.save(); c.globalAlpha *= a; c.strokeStyle = rgba(color); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1)
    c.moveTo(x1 - head * Math.cos(ang - 0.45), y1 - head * Math.sin(ang - 0.45)); c.lineTo(x1, y1); c.lineTo(x1 - head * Math.cos(ang + 0.45), y1 - head * Math.sin(ang + 0.45))
    c.stroke(); c.restore()
  }

  // ------------------------------------------------------------------ timing anchors
  const LINES = TL.lines, L = {}
  for (const l of LINES) L[l.id] = l
  const missing = []
  function at(id, ph = null, off = 0) {
    const l = L[id]
    if (!l) { missing.push(id); return 0 }
    if (ph == null) return l.t0 + off
    let end = false
    if (ph[0] === '$') { end = true; ph = ph.slice(1) }
    const i = l.text.indexOf(ph)
    if (i < 0) { missing.push(id + ':' + ph); return l.t0 + off }
    if (!end) return l.chars[i] + off
    const j = i + ph.length
    return (j < l.chars.length ? l.chars[j] : l.t1) + off
  }
  const lend = (id, off = 0) => L[id].t1 + off
  const S = {}
  for (const l of LINES) if (!(l.scene in S)) S[l.scene] = l.t0
  const TOTAL = TL.total
  const EV = []
  const ev = (t, k, extra = {}) => EV.push({ t: +t.toFixed(3), k, ...extra })

  // ================================================================== 0 title
  const TI = { line: 0.5, kick: 0.9, word: 1.2, name: 2.0 }
  ev(1.15, 'title')
  function drawTitle(c, t) {
    const k = eIO(prog(t, TI.line, 1.6))
    line(c, [[540 - 360 * k, 1000], [540 + 360 * k, 1000]], { color: COL.ink, w: 2, a: 0.5 })
    text(c, '重  估', 540, 690, { size: 38, color: COL.gold, ls: 10, a: eOut(prog(t, TI.kick, 0.8)) })
    const kw = eOut(prog(t, TI.word, 1.3))
    text(c, '“稳定”', 540, 860 + 24 * (1 - kw), { font: 'serif', size: 196, ls: 16, a: kw, glow: 18 })
    text(c, '顾东政', 540, 1080, { size: 34, color: COL.dim, ls: 14, a: eOut(prog(t, TI.name, 0.8)) })
    // the line starts to rise at its right end, like savings
    const r = eIO(prog(t, 2.6, 1.6))
    if (r > 0) line(c, [[900, 1000], [940, 1000 - 6 * r], [1000, 1000 - 40 * r], [1090, 1000 - 110 * r]], { color: COL.gold, w: 3, a: r, glow: 10 })
  }

  // ================================================================== 1 threads: two lives braided -> split -> what breaks -> money
  const TH = {
    t0: S.two - 0.6, me: at('q1', '伴侣'), fut: at('q1', '长期'), rings: at('q2', '结婚'), fork: at('q2', '持续'),
    split: at('s1', '分开'), cracks: at('s1', '扩展'), n: [at('s2', '金钱'), at('s2', '个人发展'), at('s2', '负面情绪')],
    re: at('s2', '重新考虑'), fear: at('s3', '最让我恐惧'), money: at('s3', '金钱'),
  }
  const BY = 880, SPX = 540
  const braidY = (x, s) => BY + s * 26 * Math.sin((x - SPX) / 62)
  const headX = (t) => { const k = prog(t, TH.t0, TH.split - TH.t0); return lerp(-60, SPX, 1 - Math.pow(1 - k, 2.6)) }
  const NODES = [
    { x: 270, y: 560, label: '金钱上的安排', icon: 'coin', color: COL.gold },
    { x: 815, y: 600, label: '个人发展上的计划', icon: 'flag', color: COL.ink },
    { x: 560, y: 1270, label: '负面情绪', icon: 'cloud', color: COL.ink },
  ]
  // cracks from the split point: one to each node plus a few that go nowhere
  const CRACKS = (() => {
    const r = rng(41), out = []
    const jag = (a, b, depth, amp) => {
      if (depth === 0) return [a, b]
      const m = [(a[0] + b[0]) / 2 + (r() - 0.5) * amp, (a[1] + b[1]) / 2 + (r() - 0.5) * amp]
      return [...jag(a, m, depth - 1, amp * 0.55).slice(0, -1), ...jag(m, b, depth - 1, amp * 0.55)]
    }
    for (const n of NODES) { const d = Math.hypot(n.x - SPX, n.y - BY), f = (d - 84) / d; out.push(jag([SPX, BY], [SPX + (n.x - SPX) * f, BY + (n.y - BY) * f], 5, 90)) }
    for (const ang of [0.15, 2.6, 3.5, 5.9, 1.2]) { const len = 260 + r() * 260; out.push(jag([SPX, BY], [SPX + Math.cos(ang) * len, BY + Math.sin(ang) * len], 4, 70)) }
    return out
  })()
  ev(TH.me, 'pop'); ev(TH.rings, 'ring'); ev(TH.split, 'snap'); ev(TH.cracks, 'crackle', { d: 1.6 })
  TH.n.forEach((t) => ev(t, 'pop')); ev(TH.re, 'tick'); ev(TH.money, 'low')
  function drawThreads(c, t) {
    const hx = headX(t)
    const dimK = eIO(prog(t, TH.fear, 0.8)), mk = eIO(prog(t, TH.money, 1.0))
    const thrA = 1 - 0.75 * dimK
    // braided part
    const xs = []; for (let x = -60; x <= hx; x += 5) xs.push(x)
    xs.push(hx)
    const gold = xs.map((x) => [x, braidY(x, 1)]), blue = xs.map((x) => [x, braidY(x, -1)])
    const sp = prog(t, TH.split, 2.8), spE = eIO(sp)
    line(c, blue, { color: COL.blue, w: 4, a: thrA, glow: 8 })
    line(c, gold, { color: COL.gold, w: 4, a: thrA, glow: 8 })
    let hg = gold[gold.length - 1], hb = blue[blue.length - 1]
    if (t >= TH.split) {
      hg = line(c, qbez([SPX, BY], [720, BY + 10], [1180, 1420]), { color: COL.gold, w: 4, k: spE, a: thrA, glow: 8 })
      hb = line(c, qbez([SPX, BY], [720, BY - 10], [1180, 330]), { color: COL.blue, w: 4, k: spE, a: thrA, glow: 8 })
    }
    dot(c, hb[0], hb[1], 8, COL.blue, thrA, 16)
    dot(c, hg[0], hg[1], 8, COL.gold, thrA, 16)
    // who is who
    const la = eOut(prog(t, TH.me, 0.6)) * (1 - prog(t, TH.split - 0.4, 0.5))
    text(c, '我', hx - 6, BY + 78, { size: 34, color: COL.gold, a: la })
    text(c, '伴侣', hx - 6, BY - 80, { size: 34, color: COL.blue, a: la })
    // the future, dashed
    const fa = 0.55 * win(t, TH.fut, TH.split + 0.2, 0.8, 0.5)
    const fx0 = hx + 34, fx1 = lerp(fx0, 1100, eOut(prog(t, TH.fut, 1.2)))
    const forkK = eOut(prog(t, TH.fork, 1.0))
    if (forkK <= 0) line(c, [[fx0, BY], [fx1, BY]], { color: COL.ink, w: 2.5, a: fa, dash: [10, 14] })
    else {
      const fm = lerp(fx0, 1100, 0.3)
      line(c, [[fx0, BY], [fm, BY]], { color: COL.ink, w: 2.5, a: fa, dash: [10, 14] })
      line(c, qbez([fm, BY], [fm + 160, BY - 6], [1100, BY - 150 * forkK]), { color: COL.ink, w: 2.5, a: fa, dash: [10, 14] })
      line(c, qbez([fm, BY], [fm + 160, BY + 6], [1100, BY + 150 * forkK]), { color: COL.ink, w: 2.5, a: fa, dash: [10, 14] })
      text(c, '?', 930, BY - 4, { font: 'serif', size: 90, color: COL.dim, a: fa * forkK * 1.6 })
    }
    // rings: pop in over the heads, then come apart at the split
    const rk = eBack(prog(t, TH.rings, 0.55)) * (1 - 0.0)
    if (rk > 0) {
      const apart = eOut(prog(t, TH.split, 1.4)), ra = (1 - apart) * eOut(prog(t, TH.rings, 0.3))
      const rx = Math.min(hx, SPX), ry = BY - 175
      c.save(); c.globalAlpha *= ra; c.lineWidth = 4.5
      c.strokeStyle = rgba(COL.gold); c.beginPath(); c.arc(rx - 16 + 120 * apart, ry + 90 * apart, 26 * rk, 0, TAU); c.stroke()
      c.strokeStyle = rgba(COL.blue); c.beginPath(); c.arc(rx + 16 + 120 * apart, ry - 90 * apart, 26 * rk, 0, TAU); c.stroke()
      c.restore()
    }
    // cracks spread from the split point
    const ck = eOut(prog(t, TH.cracks, 1.8))
    if (ck > 0) {
      CRACKS.forEach((p, i) => {
        const a = i < 3 ? (i === 0 ? 1 : 1 - 0.8 * dimK) : 0.6 * (1 - 0.85 * dimK)
        line(c, p, { color: mixc(COL.dim, COL.coral, 0.25), w: i < 3 ? 2.4 : 1.6, k: ck * (i < 3 ? 1 : 0.9), a: a * (1 - mk) })
      })
      dot(c, SPX, BY, 10 * (1 - mk), COL.coral, 0.8 * (1 - 0.5 * prog(t, TH.cracks + 1, 1)), 20)
    }
    // the three things that have to be rethought
    NODES.forEach((n, i) => {
      const s = eBack(prog(t, TH.n[i], 0.55))
      if (s <= 0) return
      let a = clamp(prog(t, TH.n[i], 0.3)), x = n.x, y = n.y, sc = s, labA = 1
      if (i > 0) a *= 1 - 0.82 * dimK
      else { x = lerp(n.x, 540, mk); y = lerp(n.y, 790, mk); sc = s * (1 + 1.5 * mk); labA = 1 - mk }
      c.save(); c.globalAlpha *= a
      dot(c, x, y, 70 * sc, [20, 18, 15], 1)
      ring(c, x, y, 70 * sc, i === 0 ? mixc(COL.ink, COL.gold, mk) : COL.ink, 0.85, 2.4)
      if (i === 0 && mk > 0) dot(c, x, y, 70 * sc, COL.gold, 0.08 * mk, 60 * mk)
      icon(c, n.icon, x, y, sc, i === 0 ? COL.gold : COL.ink, 1)
      text(c, n.label, x, y + 70 * sc + 44, { size: 34, a: labA, color: COL.ink })
      const re = eOut(prog(t, TH.re, 0.6)) * (1 - (i === 0 ? mk : 0))
      if (re > 0) {
        ring(c, x, y, 96, COL.dim, re * 0.9, 2, [6, 10], -t * 24)
        text(c, '?', x + 92, y - 74, { font: 'serif', size: 44, color: COL.dim, a: re })
      }
      c.restore()
    })
    text(c, '金钱', 540, 1130 + 20 * (1 - eOut(prog(t, TH.money + 0.2, 0.8))), { font: 'serif', size: 160, color: COL.gold, ls: 20, a: eOut(prog(t, TH.money + 0.2, 0.8)), glow: 20 })
  }

  // ================================================================== 2 fog: what comes next
  const FG = { t0: S.fog - 0.5, next: at('f1', '下一步'), unc: at('f2', '不确定性'), afraid: at('f2', '害怕') }
  const FH = [400, 960]
  const FAN = (() => {
    const r = rng(7), paths = []
    for (let i = 0; i < 52; i++) {
      let y = FH[1], v = gauss(r) * 2.2; const p = [[FH[0], y]]
      for (let x = FH[0] + 12; x <= 1140; x += 12) { v = v * 0.9 + gauss(r) * 3.2; y += v; p.push([x, y]) }
      paths.push(p)
    }
    return paths
  })()
  ev(FG.next, 'flicker', { d: 2.5 }); ev(FG.unc, 'swell', { d: 2.2 }); ev(FG.afraid, 'low', { quiet: 1 })
  function drawFog(c, t) {
    const base = []; for (let x = -20; x <= FH[0]; x += 6) base.push([x, FH[1] + 7 * Math.sin(x / 55)])
    base.push(FH)
    const fe = eOut(prog(t, FG.afraid, 1.2))
    const jx = Math.sin(t * 53) * 3 * fe, jy = Math.cos(t * 41) * 3 * fe
    line(c, base, { color: COL.gold, w: 4, k: eIO(prog(t, FG.t0, 1.3)), glow: 8 })
    // three possible next steps, flickering
    const ca = eOut(prog(t, FG.next, 0.5)) * (1 - 0.7 * eIO(prog(t, FG.unc, 1)))
    const ends = [[650, 790], [690, 960], [650, 1130]]
    ends.forEach((e, i) => {
      const fl = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (5 + i * 1.7) + i * 2.1))
      line(c, qbez(FH, [(FH[0] + e[0]) / 2, FH[1]], e, 20), { color: COL.ink, w: 2.5, a: ca * fl, dash: [8, 12] })
      text(c, '?', e[0] + 40, e[1], { font: 'serif', size: 56, color: COL.dim, a: ca * fl })
    })
    // many possible futures
    const fk = prog(t, FG.unc, 0.01)
    if (fk > 0) {
      FAN.forEach((p, i) => {
        const k = eOut(prog(t, FG.unc + i * 0.022, 1.5)), fl = 0.75 + 0.25 * Math.sin(t * 7 + i)
        line(c, p, { color: mixc(COL.gold, COL.ink, hash(i)), w: 1.6, a: (0.16 + 0.1 * fe) * fl, k })
      })
    }
    // dark closing in
    if (fe > 0) {
      const g = c.createRadialGradient(FH[0], FH[1], 140, FH[0], FH[1], 1100)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.55 * fe})`)
      c.fillStyle = g; c.fillRect(0, 0, W, H)
    }
    dot(c, FH[0] + jx, FH[1] + jy, 10, COL.gold, 1, 22)
  }

  // ================================================================== 3 chart -> gap -> bricks -> back
  const CX0 = 150, CX1 = 960, CY0 = 1230, CYT = 430, YR = 10, UMAX = 14
  const X = (yr) => CX0 + ((CX1 - CX0) * yr) / YR
  const Yv = (u) => CY0 - ((CY0 - CYT) * u) / UMAX
  const DIV = 4, S0 = 2, RATE = 1, LOSS = 3
  const wig = (yr) => 0.06 * Math.sin(yr * 4.3) + 0.045 * Math.sin(yr * 11.7 + 1) + 0.025 * Math.sin(yr * 29.3 + 2)
  const sav = (yr) => S0 + RATE * yr + wig(yr) - wig(0)
  const savD = (yr) => sav(yr) - LOSS + 0.08 * Math.sin((yr - DIV) * 11.3)
  const YREC = (() => { for (let y = DIV + 0.01; y < YR; y += 0.01) if (savD(y) >= sav(DIV)) return y; return YR })()
  const GOLDP = Array.from({ length: 201 }, (_, i) => { const y = (i / 200) * YR; return [X(y), Yv(sav(y))] })
  const iDIV = Math.round((DIV / YR) * 200)
  const CORALP = Array.from({ length: 121 }, (_, i) => { const y = DIV + (i / 120) * (YR - DIV); return [X(y), Yv(savD(y))] })
  const CH = {
    t0: S.chart - 0.5, leg1: at('c1', '没有离婚'), leg2: at('c1', '和离婚', 0.2), start: at('c2', '一些积蓄'), months: at('c2', '每个月'),
    g0: at('c3', '生活'), g1: at('c3', '$往上走', 0.5), div: at('c4', '这个时候'), b: [at('c5', '财产分配'), at('c5', '搬家'), at('c5', '重新安排')],
    drop: at('c5', '少了一截'), c0: at('c6', '慢慢攒', -0.2), gap: at('c7', '两条线'), zero: at('c7', '从头开始'),
  }
  CH.c1 = Math.max(lend('c6', 1.0), CH.c0 + 2.4)
  const BK = {
    zin: S.bricks - 0.4, f0: at('b1', '一点一点', -0.2), f1: at('b2', '$现在的积蓄'), now: at('b2', '现在的积蓄'),
    on: at('b3', '基础上', -0.3), go: at('b3', '往前走'), crumble: at('b4', '突然'), zout: at('b4', '我就会想', -0.3),
    today: at('b5', '今天的位置', -0.4), years: at('b5', '多少年'),
  }
  const BLOCKS = [{ label: '财产分配', u: 1.4 }, { label: '搬家', u: 0.7 }, { label: '重新安排生活', u: 0.9 }]
  // bricks under the curve, two months per column, a quarter unit per row
  const NC = 24, BH = 0.25
  const COLS = Array.from({ length: NC }, (_, cI) => ({ x0: X(cI / 6), x1: X((cI + 1) / 6), n: Math.round(sav((cI + 0.5) / 6) / BH) }))
  const LOSTROWS = Math.round(LOSS / BH), LOSTC = 17 // columns >= LOSTC lose their top LOSTROWS rows
  const colT = (cI) => lerp(BK.f0, BK.f1, cI / NC)
  ev(CH.t0 + 0.2, 'draw'); ev(CH.leg1, 'pop'); ev(CH.leg2, 'pop'); ev(CH.start, 'pop'); ev(CH.months, 'patter', { d: 1.6 })
  ev(CH.g0, 'rise', { d: CH.g1 - CH.g0 }); ev(CH.div, 'mark'); CH.b.forEach((t) => ev(t, 'pop')); ev(CH.drop, 'drop')
  ev(CH.c0, 'rise', { d: CH.c1 - CH.c0, low: 1 }); ev(CH.gap, 'swell', { d: 1.4 })
  for (let cI = 0; cI < NC; cI++) ev(colT(cI), 'brick', { i: cI })
  ev(BK.on, 'pop'); ev(BK.crumble, 'crumble', { d: 1.2 }); ev(BK.crumble + 0.62, 'thud'); ev(BK.today, 'ring')
  const yrsN = Math.round(YREC - DIV)
  for (let k = 1; k <= yrsN; k++) ev(BK.years + 0.3 + ((k - 0.4) / yrsN) * 2.2, 'tick')

  function drawChart(c, t) {
    // camera: zoom into the first four years while the bricks are built
    const m = eIO(prog(t, BK.zin, 1.5)) * (1 - eIO(prog(t, BK.zout, 1.4)))
    const z = lerp(1, 2.05, m), cx = lerp(540, X(2.15), m), cy = lerp(900, Yv(4.3), m)
    c.save(); c.translate(540, 900); c.scale(z, z); c.translate(-cx, -cy)
    const lw = (w) => w / z
    const back = eIO(prog(t, BK.zout, 1.4))
    const inB = Math.max(m, prog(t, BK.zin - 0.45, 0.4) * (1 - prog(t, BK.zout + 0.9, 0.5))) // labels gone before the zoom
    // axes
    const ak = eOut(prog(t, CH.t0 + 0.15, 1.0))
    line(c, [[CX0, CY0], [lerp(CX0, CX1 + 30, ak), CY0]], { color: COL.ink, w: lw(2.4), a: 0.8 })
    line(c, [[CX0, CY0], [CX0, lerp(CY0, CYT - 50, ak)]], { color: COL.ink, w: lw(2.4), a: 0.8 })
    const la = eOut(prog(t, CH.t0 + 0.7, 0.7)) * (1 - inB)
    text(c, '我的积蓄', CX0 - 10, CYT - 92, { size: 34, align: 'left', a: la, color: COL.ink })
    text(c, '时间', CX1 + 30, CY0 + 52, { size: 34, align: 'right', a: la, color: COL.ink })
    // hypothetical tag
    c.save(); c.globalAlpha *= la; rrect(c, 790, 300, 170, 56, 28); c.strokeStyle = rgba(COL.dim); c.lineWidth = 2; c.stroke(); c.restore()
    text(c, '假设情境', 875, 329, { size: 28, color: COL.dim, a: la, ls: 4 })
    // legend
    const l1 = eOut(prog(t, CH.leg1, 0.5)) * (1 - inB), l2 = eOut(prog(t, CH.leg2, 0.5)) * (1 - inB)
    line(c, [[190, 1345], [250, 1345]], { color: COL.gold, w: 5, a: l1 }); text(c, '没有离婚', 266, 1347, { size: 32, align: 'left', a: l1 })
    line(c, [[520, 1345], [580, 1345]], { color: COL.coral, w: 5, a: l2 }); text(c, '离婚', 596, 1347, { size: 32, align: 'left', a: l2 })
    // months along the axis
    const mk = prog(t, CH.months, 1.6), nm = Math.floor(120 * mk)
    if (nm > 0) {
      c.save(); c.strokeStyle = rgba(COL.dim); c.lineWidth = lw(1.5); c.globalAlpha *= 0.8 * (1 - 0.6 * inB); c.beginPath()
      for (let i = 1; i <= nm; i++) { const x = X(i / 12), h = i % 12 === 0 ? 16 : 7; c.moveTo(x, CY0); c.lineTo(x, CY0 + h) }
      c.stroke(); c.restore()
    }
    // ---------------- bricks (under the gold line, years 0..4)
    const brA = clamp(prog(t, BK.zin + 0.3, 0.6)) * (1 - 0.82 * back)
    if (brA > 0) {
      const crum = t - BK.crumble
      c.save(); c.globalAlpha *= brA
      COLS.forEach((col, cI) => {
        const w = col.x1 - col.x0
        const grow = eOut(prog(t, colT(cI), 0.35))
        for (let r = 0; r < col.n; r++) {
          const base = r < S0 / BH
          let a = base ? clamp(prog(t, BK.zin + 0.3 + r * 0.04, 0.4)) : grow
          if (!base && grow <= 0) continue
          let y0 = Yv((r + 1) * BH), y1 = Yv(r * BH), dx = 0, dy = 0, rot = 0
          if (!base) { const yb = Yv(S0); y0 = lerp(yb, y0, grow); y1 = lerp(yb, y1, grow) }
          const lost = cI >= LOSTC && r >= col.n - LOSTROWS
          if (lost && crum > 0) {
            const d = crum - hash(cI * 31 + r) * 0.35
            if (d > 0) { dy = 0.5 * 2600 * d * d; dx = (hash(cI * 7 + r) - 0.3) * 160 * d; rot = (hash(r * 13 + cI) - 0.5) * 5 * d; a *= 1 - clamp(d / 1.1) }
          }
          if (a <= 0.01) continue
          c.save(); c.globalAlpha *= a; c.translate((col.x0 + col.x1) / 2 + dx, (y0 + y1) / 2 + dy); c.rotate(rot)
          c.fillStyle = rgba(base ? mixc(COL.gold, [90, 70, 40], 0.45) : COL.gold, base ? 0.55 : 0.5)
          c.fillRect(-w / 2 + lw(1.3), -(y1 - y0) / 2 + lw(1.3), w - lw(2.6), y1 - y0 - lw(2.6))
          c.restore()
        }
      })
      c.restore()
      // month counter, in screen space
    }
    // ---------------- gold line
    const gk = eIO(prog(t, CH.g0, CH.g1 - CH.g0))
    const divK = eOut(prog(t, CH.div, 0.6)), gapK = eOut(prog(t, CH.gap, 0.8))
    let postA = 1 - 0.6 * divK + 0.45 * gapK * (1 - inB)
    postA *= 1 - 0.9 * back
    if (t > CH.g0 - 0.1) {
      const pre = GOLDP.slice(0, iDIV + 1), post = GOLDP.slice(iDIV)
      const kPre = clamp(gk / (DIV / YR)), kPost = clamp((gk - DIV / YR) / (1 - DIV / YR))
      line(c, pre, { color: COL.gold, w: lw(5), k: kPre, glow: 10 })
      if (kPost > 0) line(c, post, { color: COL.gold, w: lw(5), k: kPost, a: postA * (1 - inB), glow: 10 })
      const head = cut(GOLDP, gk); const hp = head[head.length - 1]
      if (gk < 1) dot(c, hp[0], hp[1], lw(9), COL.gold, 1, 18)
    }
    // start dot
    const sd = eBack(prog(t, CH.start, 0.5))
    if (sd > 0) {
      dot(c, X(0), Yv(S0), lw(10) * sd, COL.gold, 1, 16)
      line(c, [[CX0, Yv(S0)], [X(0) - 2, Yv(S0)]], { color: COL.gold, w: lw(2), a: 0.6 })
      text(c, '一开始的积蓄', X(0) + 24, Yv(S0) + 42, { size: 30, align: 'left', color: COL.gold, a: eOut(prog(t, CH.start, 0.6)) * (1 - inB) })
    }
    // ---------------- the divorce point
    const dA = (1 - inB) * (1 - 0.3 * back)
    if (divK > 0) {
      line(c, [[X(DIV), CY0], [X(DIV), lerp(CY0, Yv(13.2), divK)]], { color: COL.coral, w: lw(2.5), a: 0.85 * dA, dash: [10, 10] })
      text(c, '离婚', X(DIV), Yv(13.2) - 34, { size: 38, color: COL.coral, a: divK * dA, weight: 600 })
      const pulse = prog(t, CH.div, 1.2)
      ring(c, X(DIV), Yv(sav(DIV)), lw(14 + 40 * pulse), COL.coral, (1 - pulse) * dA, lw(3))
    }
    // three blocks that fall away
    const fall = t - CH.drop
    let ub = sav(DIV)
    BLOCKS.forEach((b, j) => {
      const k = eOut(prog(t, CH.b[j], 0.45)); if (k <= 0) { ub -= b.u; return }
      const y0 = Yv(ub), y1 = Yv(ub - b.u); ub -= b.u
      let dy = 0, rot = 0, a = k * (1 - inB)
      if (fall > 0) { const d = Math.max(0, fall - j * 0.06); dy = 0.5 * 2200 * d * d; rot = (j - 1) * 0.6 * d; a *= 1 - clamp(d / 0.9) }
      c.save(); c.globalAlpha *= a; c.translate(X(DIV) + 30, (y0 + y1) / 2 + dy); c.rotate(rot)
      c.fillStyle = rgba(COL.coral, 0.22); c.strokeStyle = rgba(COL.coral); c.lineWidth = 2.2
      c.fillRect(-18, -(y1 - y0) / 2 + 2, 36, y1 - y0 - 4); c.strokeRect(-18, -(y1 - y0) / 2 + 2, 36, y1 - y0 - 4)
      c.restore()
      text(c, b.label, X(DIV) + 64, (y0 + y1) / 2 + 2, { size: 30, align: 'left', a: a * (1 - clamp(fall / 0.4)) * (fall > 0 ? 1 : 1) })
    })
    // coral: the drop, then the slow climb back
    const dk = eIn(prog(t, CH.drop, 0.32))
    const cA = (1 - inB) * 1
    if (dk > 0) {
      line(c, [[X(DIV), Yv(sav(DIV))], [X(DIV), lerp(Yv(sav(DIV)), Yv(savD(DIV)), dk)]], { color: COL.coral, w: lw(5), a: cA, glow: 10 })
      const ck = eIO(prog(t, CH.c0, CH.c1 - CH.c0))
      if (ck > 0) {
        const hp = line(c, CORALP, { color: COL.coral, w: lw(5), k: ck, a: cA, glow: 10 })
        if (ck < 1) dot(c, hp[0], hp[1], lw(9), COL.coral, cA, 18)
      }
    }
    // the gap between the two lines
    if (gapK > 0) {
      c.save(); c.globalAlpha *= gapK * (1 - inB) * (1 - 0.7 * back)
      c.beginPath(); GOLDP.slice(iDIV).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])))
      for (let i = CORALP.length - 1; i >= 0; i--) c.lineTo(CORALP[i][0], CORALP[i][1])
      c.closePath(); c.fillStyle = rgba(COL.coral, 0.13); c.fill(); c.restore()
    }
    const zk = eOut(prog(t, CH.zero, 0.6)) * (1 - inB) * (1 - back)
    text(c, '从头开始', X(DIV) + 20, Yv(savD(DIV)) + 48, { size: 32, align: 'left', color: COL.coral, a: zk, weight: 600 })
    // ---------------- standing on the wall, then the fall
    const pa = eOut(prog(t, BK.on, 0.5)) * (1 - back)
    if (pa > 0) {
      const topU = (cI) => COLS[cI].n * BH
      const walkK = eIO(prog(t, BK.go, 1.8))
      const cIdx = lerp(18.5, 23.4, walkK), ci = Math.min(NC - 1, Math.floor(cIdx))
      let fy = Yv(topU(ci))
      const fx = lerp(COLS[18].x0, COLS[23].x1, (cIdx - 18) / 6)
      const fallK = eIn(prog(t, BK.crumble + 0.25, 0.4))
      fy = lerp(fy, Yv(topU(ci) - LOSS), fallK)
      // a dashed way forward
      const fw = eOut(prog(t, BK.on + 0.3, 0.8)) * (1 - prog(t, BK.crumble, 0.3))
      line(c, GOLDP.slice(iDIV, iDIV + 24), { color: COL.gold, w: lw(3), a: 0.7 * fw, dash: [lw(10), lw(10)] })
      person(c, fx, fy, 0.62, COL.ink, pa, walkK > 0 && walkK < 1 ? t * 9 : 0, { lw: 3.2 })
    }
    // ---------------- back out: how many years to get back
    const tk = eOut(prog(t, BK.today, 0.9))
    if (tk > 0) {
      const yT = Yv(sav(DIV))
      line(c, [[X(DIV), yT], [lerp(X(DIV), X(YR) + 20, tk), yT]], { color: COL.ink, w: 2.2, a: 0.75, dash: [10, 10] })
      text(c, '今天的位置', X(YR) + 20, yT + 40, { size: 30, align: 'right', a: tk, color: COL.ink })
      const yk = eIO(prog(t, BK.years, 2.4))
      if (yk > 0) {
        const yrNow = lerp(DIV, YREC, yk), p = [X(yrNow), Yv(savD(yrNow))]
        dot(c, p[0], p[1], 13, COL.coral, 1, 26)
        const bx0 = X(DIV), bx1 = X(yrNow), by = yT - 54
        line(c, [[bx0, by + 14], [bx0, by], [bx1, by], [bx1, by + 14]], { color: COL.gold, w: 2.6, a: 0.9 })
        const n = Math.min(yrsN, Math.floor((yrNow - DIV) + 0.05))
        text(c, '重新攒回来的时间', X((DIV + YREC) / 2), by - 44, { size: 34, color: COL.gold, a: eOut(prog(t, BK.years, 0.5)), weight: 600 })
        if (n > 0) text(c, `${n} 年`, bx1 + 16, by - 2, { size: 30, align: 'left', color: COL.gold, a: 1 })
        if (yk >= 1) ring(c, X(YREC), yT, 18 + 30 * prog(t, BK.years + 2.4, 1), COL.coral, 1 - prog(t, BK.years + 2.4, 1), 3)
      }
    }
    c.restore()
    // month counter while the bricks go up (screen space)
    const mc = clamp(prog(t, BK.f0 - 0.3, 0.4)) * (1 - prog(t, BK.crumble - 0.3, 0.5))
    if (mc > 0) {
      const months = Math.min(48, Math.max(2, Math.floor(prog(t, BK.f0, BK.f1 - BK.f0) * NC + 1) * 2))
      text(c, '第', 400, 350, { size: 38, color: COL.dim, a: mc, align: 'right' })
      text(c, String(months), 470, 344, { size: 92, color: COL.gold, a: mc, weight: 600 })
      text(c, '个月', 540, 350, { size: 38, color: COL.dim, a: mc, align: 'left' })
      text(c, '现在', 0, 0, { a: 0 })
    }
  }

  // ================================================================== 4 stable -> stairs
  const ST = {
    t0: S.stable - 0.5, word: at('w1', '稳定'), s0: S.stairs - 0.3, past: at('w2', '过去的积累'), next: at('w2', '下一步'),
    w3a: at('w3', '往前走'), w3b: at('w3', '$建立起来'), cut: at('w4', '打断'), notyet: at('w4', '还没有发生'), afraid: at('w4', '开始害怕'),
  }
  const NSTEP = 6, STX = 70, STW = 122, STH = 92, GROUND = 1270
  const stepT = [ST.s0, ST.s0 + 0.18, ST.s0 + 0.36, ST.next, lerp(ST.w3a, ST.w3b, 0.15), lerp(ST.w3a, ST.w3b, 0.85)]
  ev(ST.word, 'title')
  stepT.forEach((t, i) => ev(t, 'step', { i }))
  ev(ST.cut, 'ghost'); ev(ST.afraid, 'low', { quiet: 1 })
  function drawStable(c, t) {
    const wk = eOut(prog(t, ST.word, 1.0)), up = eIO(prog(t, ST.s0, 1.0))
    const lk = eIO(prog(t, ST.t0 + 0.1, 1.4)) * (1 - up)
    line(c, [[100, 1000], [980, 940]], { color: COL.gold, w: 4, k: lk ? 1 : 0, a: lk, glow: 10 })
    text(c, '“稳定”', 540, lerp(820, 330, up), { font: 'serif', size: lerp(180, 76, up), ls: lerp(14, 8, up), a: wk * (1 - 0.35 * up), glow: 16 * (1 - up) })
    if (t < ST.s0 - 0.2) return
    // ground
    line(c, [[60, GROUND], [1020, GROUND]], { color: COL.dim, w: 2, a: eOut(prog(t, ST.s0 - 0.2, 0.6)) })
    let top = -1
    for (let i = 0; i < NSTEP; i++) {
      const k = eOut(prog(t, stepT[i], 0.45)); if (k <= 0) continue
      top = i
      const x = STX + i * STW, h = (i + 1) * STH, y = GROUND - h * k
      c.save(); c.globalAlpha *= k
      c.fillStyle = rgba(COL.gold, i === 3 && t < ST.next + 1.6 ? 0.42 : 0.26); c.fillRect(x + 3, y, STW - 6, GROUND - y)
      c.strokeStyle = rgba(COL.gold, 0.9); c.lineWidth = 2.4; c.strokeRect(x + 3, y, STW - 6, GROUND - y)
      // each step is built on the one before: brick lines
      c.strokeStyle = rgba(COL.gold, 0.25); c.lineWidth = 1.2; c.beginPath()
      for (let r = 1; r <= i; r++) { c.moveTo(x + 3, GROUND - r * STH); c.lineTo(x + STW - 3, GROUND - r * STH) }
      c.stroke(); c.restore()
    }
    // labels
    const pa = eOut(prog(t, ST.past, 0.6)) * (1 - prog(t, ST.cut - 0.5, 0.6))
    line(c, [[STX + 6, GROUND + 26], [STX + 6, GROUND + 38], [STX + 3 * STW - 6, GROUND + 38], [STX + 3 * STW - 6, GROUND + 26]], { color: COL.dim, w: 2, a: pa })
    text(c, '过去的积累', STX + 1.5 * STW, GROUND + 80, { size: 32, color: COL.dim, a: pa })
    const na = eOut(prog(t, ST.next, 0.5)) * (1 - prog(t, ST.w3a, 0.6))
    text(c, '下一步', STX + 3.5 * STW, GROUND - 4 * STH - 50, { size: 34, color: COL.gold, a: na, weight: 600 })
    arrow(c, STX + 2.5 * STW, GROUND - 3 * STH - 30, STX + 3.3 * STW, GROUND - 4 * STH - 14, COL.gold, na * 0.8, 2.5, 12)
    // the step that might give way (it hasn't happened)
    const gk = eOut(prog(t, ST.cut, 0.6))
    if (gk > 0) {
      const fl = 0.55 + 0.45 * Math.sin(t * 9)
      const x = STX + NSTEP * STW, y = GROUND - 3 * STH
      c.save(); c.globalAlpha *= gk * fl; c.setLineDash([9, 9]); c.lineDashOffset = -t * 20
      c.strokeStyle = rgba(COL.coral); c.lineWidth = 2.6; c.strokeRect(x + 3, y, STW - 6 - 10, GROUND - y)
      c.beginPath(); c.moveTo(x - 2, GROUND - 6 * STH); c.lineTo(x + 20, GROUND - 5 * STH); c.lineTo(x + 6, GROUND - 4.4 * STH); c.lineTo(x + 30, y - 6); c.stroke()
      c.restore()
      text(c, '还没有发生', x + STW / 2 - 8, y + 70, { size: 28, color: COL.coral, a: eOut(prog(t, ST.notyet, 0.5)) * 0.9 })
    }
    // him, climbing
    if (top >= 0) {
      let cur = 0
      for (let i = 0; i < NSTEP; i++) if (t >= stepT[i] + 0.25) cur = i
      const hop = prog(t, stepT[cur] + 0.25, 0.42), prev = Math.max(0, cur - 1)
      const fx = lerp(STX + prev * STW + STW * 0.5, STX + cur * STW + STW * 0.5, cur ? eIO(hop) : 1)
      const fy = lerp(GROUND - (prev + 1) * STH, GROUND - (cur + 1) * STH, cur ? eIO(hop) : 1) - (cur ? Math.sin(PI * hop) * 34 : 0)
      const fe = eOut(prog(t, ST.afraid, 0.6))
      person(c, fx + Math.sin(t * 47) * 2.5 * fe, fy, 1.0, COL.ink, eOut(prog(t, ST.s0 + 0.3, 0.5)), 0)
    }
    const fe = eOut(prog(t, ST.afraid, 1.2))
    if (fe > 0) {
      const g = c.createLinearGradient(1080, 0, 300, 0)
      g.addColorStop(0, `rgba(60,14,8,${0.5 * fe})`); g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g; c.fillRect(0, 0, W, H)
    }
  }

  // ================================================================== 5 sand: will it stay? -> a choice that rewinds
  const SA = { t0: S.sand - 0.5, today: at('u1', '今天积累'), keep: at('u1', '留得住'), u2: at('u2'), choose: at('u2', '选择'), day: at('u2', '有一天'), restart: at('u2', '重新开始') }
  const BOWL = { x: 540, y: 820, r: 250 }
  const GRAINS = (() => {
    const r = rng(99), g = []
    while (g.length < 760) {
      const x = BOWL.x + (r() * 2 - 1) * BOWL.r, y = BOWL.y - 70 + r() * (BOWL.r + 70)
      const inBowl = Math.hypot(x - BOWL.x, y - BOWL.y) < BOWL.r - 8 && y > BOWL.y - 70 * (1 - Math.pow((x - BOWL.x) / BOWL.r, 2))
      if (inBowl) g.push({ x, y, s: 2.6 + r() * 2.6, c: r() })
    }
    // the ones nearest the crack leave first
    const cx = BOWL.x + 30, cy = BOWL.y + BOWL.r
    g.forEach((p, i) => { p.d = Math.hypot(p.x - cx, p.y - cy) / 520 + hash(i) * 0.25 })
    return g
  })()
  ev(SA.today, 'sand', { d: 0.6, quiet: 1 }); ev(SA.keep - 0.3, 'sand', { d: 3.2 }); ev(SA.choose, 'pop'); ev(SA.restart - 0.2, 'rewind', { d: 1.0 })
  function drawSand(c, t) {
    const ba = eOut(prog(t, SA.t0, 0.8)) * (1 - eIO(prog(t, SA.u2 - 0.1, 0.8)))
    if (ba > 0) {
      c.save(); c.globalAlpha *= ba
      // bowl
      c.strokeStyle = rgba(COL.ink, 0.8); c.lineWidth = 3; c.beginPath(); c.arc(BOWL.x, BOWL.y, BOWL.r, 0.02, PI - 0.02); c.stroke()
      const crackK = eOut(prog(t, SA.keep - 0.5, 0.5))
      if (crackK > 0) line(c, [[BOWL.x + 30, BOWL.y + BOWL.r - 1], [BOWL.x + 18, BOWL.y + BOWL.r - 30], [BOWL.x + 42, BOWL.y + BOWL.r - 58], [BOWL.x + 28, BOWL.y + BOWL.r - 90]], { color: COL.coral, w: 2.6, k: crackK })
      const rel = SA.keep - 0.3
      for (let i = 0; i < GRAINS.length; i++) {
        const p = GRAINS[i]
        let x = p.x, y = p.y, a = 1
        const d = t - rel - p.d * 3.0
        if (d > 0 && p.d < 0.75) {
          // slide to the crack, then fall
          const toC = clamp(d / 0.35), fx = BOWL.x + 30 + (hash(i * 3) - 0.5) * 16
          x = lerp(p.x, fx, eIn(toC)); y = lerp(p.y, BOWL.y + BOWL.r, eIn(toC))
          if (d > 0.35) { const f = d - 0.35; y += 0.5 * 1800 * f * f; x += (hash(i) - 0.5) * 40 * f }
          a = 1 - clamp((y - (BOWL.y + BOWL.r + 300)) / 400)
        }
        if (a <= 0) continue
        c.fillStyle = rgba(mixc(COL.gold, [255, 220, 150], p.c * 0.6), 0.85 * a)
        c.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s)
      }
      c.restore()
      text(c, '今天积累起来的', 540, 470, { size: 38, color: COL.gold, a: ba * eOut(prog(t, SA.today, 0.6)) })
      text(c, '?', 860, 1180, { font: 'serif', size: 96, color: COL.dim, a: ba * eOut(prog(t, SA.keep, 0.6)) })
    }
    // a choice ... and one day, back to the start
    const fa = eOut(prog(t, SA.u2 + 0.2, 0.7))
    if (fa > 0) {
      const N0 = [220, 1000], up = [[220, 1000], [380, 980], [560, 800]], dn = [[220, 1000], [380, 1020], [560, 1180]]
      const ck = eOut(prog(t, SA.choose, 0.5))
      line(c, qbez(...up), { color: ck ? COL.gold : COL.ink, w: ck ? 4 : 2.5, a: fa * (ck ? 1 : 0.7), dash: ck ? null : [8, 10] })
      line(c, qbez(...dn), { color: COL.ink, w: 2.5, a: fa * (1 - 0.6 * ck), dash: [8, 10] })
      const onK = eIO(prog(t, SA.day - 0.2, 1.8)), rw = eIO(prog(t, SA.restart - 0.2, 1.0))
      const path = [...qbez(...up, 20), ...qbez([560, 800], [700, 720], [880, 690], 20).slice(1)]
      // total progress along the chosen path, then rewound to 0
      const kk = (0.45 + 0.55 * onK) * ck * (1 - rw)
      const hp = line(c, path, { color: COL.gold, w: 5, k: kk, a: fa, glow: 12 })
      dot(c, N0[0], N0[1], 10, COL.ink, fa, 0)
      dot(c, hp[0], hp[1], 10, COL.gold, fa * (kk > 0.01 ? 1 : 0), 20)
      text(c, '选择', 220, 940, { size: 32, color: COL.dim, a: fa * ck })
      // rewind arrow
      if (rw > 0) {
        const ra = eOut(prog(t, SA.restart - 0.2, 0.6))
        c.save(); c.globalAlpha *= ra; c.strokeStyle = rgba(COL.coral); c.lineWidth = 3.5; c.lineCap = 'round'
        c.beginPath(); c.arc(N0[0], N0[1], 46, -PI * 0.15, -PI * 0.15 - TAU * 0.8 * rw, true); c.stroke()
        c.restore()
        text(c, '重新开始', 220, 1100, { size: 38, color: COL.coral, a: ra, weight: 600 })
      }
    }
  }

  // ================================================================== 6 choice: not marrying, not before 30
  const CC = { t0: S.choice - 0.5, no: at('x1', '不结婚'), bomb: at('x1', '爆雷'), love: at('x2', '只谈恋爱'), no2: at('x2', '不结婚'), age: at('x2', '尤其'), thirty: at('x2', '30') }
  const AGE0 = 18, AGE1 = 34, AX0 = 110, AX1 = 970, AY = 1240
  const AX = (a) => AX0 + ((AX1 - AX0) * (a - AGE0)) / (AGE1 - AGE0)
  ev(CC.t0 + 0.4, 'pop'); ev(CC.t0 + 0.6, 'pop'); ev(CC.bomb, 'zap'); ev(CC.age, 'draw'); ev(CC.thirty, 'mark')
  function drawChoice(c, t) {
    const cards = [{ x: 320, label: '恋爱', icon: 'pair', at: CC.t0 + 0.4 }, { x: 760, label: '结婚', icon: 'rings', at: CC.t0 + 0.6 }]
    const lift = eIO(prog(t, CC.age, 0.8))
    const noK = eOut(prog(t, CC.no, 0.6)), loveK = 0.5 + 0.5 * Math.sin(clamp((t - CC.love) / 0.8) * PI)
    cards.forEach((cd, i) => {
      const k = eBack(prog(t, cd.at, 0.6)); if (k <= 0) return
      const y = 760 - 60 * lift, w = 330, h = 420
      const dimA = i === 1 ? 1 - 0.6 * noK : 1
      let shake = 0
      if (i === 1) shake = Math.sin(t * 60) * 6 * (1 - prog(t, CC.bomb, 0.5)) * (t > CC.bomb ? 1 : 0)
      c.save(); c.globalAlpha *= clamp(prog(t, cd.at, 0.3)) * dimA; c.translate(cd.x + shake, y); c.scale(k, k)
      rrect(c, -w / 2, -h / 2, w, h, 28); c.fillStyle = 'rgba(255,255,255,0.035)'; c.fill()
      c.strokeStyle = rgba(i === 0 ? mixc(COL.ink, COL.gold, noK) : COL.ink, 0.9); c.lineWidth = i === 0 ? 2.5 + 1.5 * noK : 2.5; c.stroke()
      if (i === 0 && noK > 0) { c.shadowColor = rgba(COL.gold, 0.6); c.shadowBlur = 30 * noK * (0.7 + 0.3 * loveK); c.stroke(); c.shadowBlur = 0 }
      c.restore()
      c.save(); c.globalAlpha *= clamp(prog(t, cd.at, 0.3)) * dimA
      icon(c, cd.icon, cd.x + shake, y - 60, 1.5 * k, COL.ink, 1)
      c.restore()
      text(c, cd.label, cd.x + shake, y + 110, { font: 'serif', size: 76, ls: 10, a: clamp(prog(t, cd.at, 0.3)) * dimA, color: i === 0 ? mixc(COL.ink, COL.gold, noK) : COL.ink })
    })
    // 爆雷
    const bk = prog(t, CC.bomb, 1.2)
    if (bk > 0) {
      const a = bk < 0.15 ? bk / 0.15 : 1 - 0.55 * clamp((bk - 0.15) / 0.85)
      icon(c, 'bolt', 760 + 120, 760 - 60 * lift - 170, 1.4, COL.coral, a)
      if (bk < 0.3) { c.fillStyle = rgba(COL.coral, 0.08 * (1 - bk / 0.3)); c.fillRect(0, 0, W, H) }
    }
    // age ruler
    const rk = eOut(prog(t, CC.age, 0.9))
    if (rk > 0) {
      line(c, [[AX0, AY], [lerp(AX0, AX1, rk), AY]], { color: COL.ink, w: 2.2, a: 0.8 })
      c.save(); c.strokeStyle = rgba(COL.ink, 0.7); c.lineWidth = 2; c.beginPath()
      for (let a = AGE0; a <= AGE1; a++) { if (AX(a) > lerp(AX0, AX1, rk) + 1) break; const h = a % 2 === 0 ? 16 : 8; c.moveTo(AX(a), AY); c.lineTo(AX(a), AY + h) }
      c.stroke(); c.restore()
      for (const a of [18, 22, 26, 30, 34]) text(c, `${a}`, AX(a), AY + 50, { size: 28, color: a === 30 ? COL.coral : COL.dim, a: clamp((lerp(AX0, AX1, rk) - AX(a) + 30) / 60) })
      text(c, '岁', AX1 + 4, AY + 50, { size: 26, color: COL.dim, align: 'left', a: rk })
      const hk = eIO(prog(t, CC.thirty - 0.3, 1.0))
      if (hk > 0) {
        c.save(); c.globalAlpha *= 0.9; c.fillStyle = rgba(COL.gold, 0.32); c.fillRect(AX0, AY - 16, (AX(30) - AX0) * hk, 16); c.restore()
        line(c, [[AX(30), AY - 90], [AX(30), AY + 22]], { color: COL.coral, w: 3, a: hk, dash: [8, 7] })
        text(c, '30 岁之前', (AX0 + AX(30)) / 2, AY - 56, { size: 40, color: COL.gold, a: hk, weight: 600 })
      }
    }
  }

  // ================================================================== 7 compass: who you want to become
  const CP = { t0: S.compass - 0.5, who: at('d1', '什么样的人'), dir: at('d2', '方向'), strat: at('d2', '战略'), tac: at('d2', '策略'), act: at('d2', '付诸行动'), all: at('d3', '所有的行为'), serve: at('d3', '服务于'), dir2: at('d3', '方向') }
  const STAR = [540, 400]
  const TREE = (() => {
    const lv1 = [[540, 640]], lv2 = [[300, 860], [540, 885], [780, 860]], lv3 = []
    lv2.forEach((p, i) => { for (let j = 0; j < 4; j++) lv3.push({ p: [p[0] + (j - 1.5) * 62 + (hash(i * 4 + j) - 0.5) * 20, 1090 + hash(i * 9 + j) * 60], from: p }) })
    return { lv1, lv2, lv3 }
  })()
  const FIELD = (() => {
    const r = rng(5), f = []
    for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 9; gx++) {
      const x = 90 + gx * 112 + (r() - 0.5) * 50, y = 600 + gy * 72 + (r() - 0.5) * 30
      f.push({ x, y, a0: r() * TAU, d: Math.hypot(x - STAR[0], y - STAR[1]) })
    }
    return f
  })()
  ev(CP.who, 'shimmer', { d: 1.5 }); ev(CP.strat, 'pop'); ev(CP.tac, 'pop'); ev(CP.act, 'patter', { d: 1.0 }); ev(CP.serve, 'align', { d: 2.0 })
  function drawCompass(c, t) {
    const d1 = 1 - eIO(prog(t, CP.dir - 0.6, 0.9))
    // you, and the person you want to become
    const yk = eOut(prog(t, CP.t0 + 0.3, 0.6)), fk = eOut(prog(t, CP.who, 1.0))
    if (d1 > 0) {
      c.save(); c.globalAlpha *= d1
      person(c, 250, 1250, 1.05, COL.gold, yk)
      text(c, '我', 250, 1300, { size: 30, color: COL.gold, a: yk })
      line(c, cbez([290, 1240], [500, 1180], [600, 1050], [740, 960]), { color: COL.ink, w: 2.2, dash: [4, 12], a: 0.6 * fk, k: fk })
      person(c, 800, 960, 3.6, COL.ink, fk, 0, { dash: [7, 7], lw: 2.2, glow: 14 })
      text(c, '想成为的人', 800, 1010, { size: 32, color: COL.ink, a: fk })
      c.restore()
    }
    // the direction, and everything that hangs from it
    const sa = Math.max(fk * d1 * 0.9, eOut(prog(t, CP.dir - 0.3, 0.6)))
    const sx = lerp(800, STAR[0], 1 - d1), sy = lerp(640, STAR[1], 1 - d1)
    star(c, sx, sy, 34 + 5 * Math.sin(t * 3), COL.gold, sa, 30)
    const treeA = 1 - eIO(prog(t, CP.all - 0.2, 0.8))
    const lab = (s, y, at0) => text(c, s, 120, y, { size: 34, color: t < at0 + 1.6 ? COL.gold : COL.dim, a: eOut(prog(t, at0, 0.5)) * treeA, align: 'left', ls: 6, weight: 600 })
    lab('方向', STAR[1], CP.dir)
    const k1 = eOut(prog(t, CP.strat, 0.7)), k2 = eOut(prog(t, CP.tac, 0.8)), k3 = eOut(prog(t, CP.act, 1.0))
    c.save(); c.globalAlpha *= treeA
    if (k1 > 0) { line(c, [STAR, ...TREE.lv1].map((p, i) => (i ? [p[0], p[1]] : [p[0], p[1] + 40])), { color: COL.gold, w: 9, k: k1, glow: 10 }); lab('战略', 560, CP.strat) }
    if (k2 > 0) { TREE.lv2.forEach((p) => line(c, qbez(TREE.lv1[0], [lerp(540, p[0], 0.3), 760], p, 20), { color: COL.gold, w: 5, k: k2, glow: 6 })); lab('策略', 800, CP.tac) }
    if (k3 > 0) { TREE.lv3.forEach((q, i) => { line(c, qbez(q.from, [lerp(q.from[0], q.p[0], 0.2), q.p[1] - 80], q.p, 12), { color: COL.gold, w: 2.4, k: clamp(k3 * 1.4 - i * 0.03) }); dot(c, q.p[0], q.p[1], 6, COL.gold, clamp(k3 * 1.4 - i * 0.03 - 0.3) * 1.4, 10) }); lab('行动', 1110, CP.act) }
    c.restore()
    // every small action turns to face it
    const fa = eOut(prog(t, CP.all - 0.2, 0.8))
    if (fa > 0) {
      FIELD.forEach((f, i) => {
        const target = Math.atan2(STAR[1] - f.y, STAR[0] - f.x)
        const k = eIO(prog(t, CP.serve + (f.d - 200) / 1400 * 1.2, 0.9))
        let a0 = f.a0; while (a0 - target > PI) a0 -= TAU; while (target - a0 > PI) a0 += TAU
        const ang = lerp(a0, target, k), len = 30
        const col = mixc(COL.dim, COL.gold, k)
        arrow(c, f.x - Math.cos(ang) * len / 2, f.y - Math.sin(ang) * len / 2, f.x + Math.cos(ang) * len / 2, f.y + Math.sin(ang) * len / 2, col, fa * (0.55 + 0.45 * k), 2.6, 10)
      })
      const pulse = prog(t, CP.dir2, 1.2)
      ring(c, STAR[0], STAR[1], 40 + 120 * pulse, COL.gold, (1 - pulse) * 0.8, 3)
    }
  }

  // ================================================================== 8 journey: walking with someone -> the pen -> silence -> roots
  const J = {
    t0: S.walk - 0.5, many: at('t1', '多谈恋爱'), manyEnd: at('t1', '$不同的人', 1.2), self: at('t2', '了解自己'), partner: at('t2', '伴侣', -0.6),
    support: at('t3', '互相支持'), sweet: at('t3', '添一点甜'), spice: at('p1', '调味剂', -0.3), boost: at('p2', '助力'),
    pen: at('p3', '主动权', -0.2), grip: at('p3', '紧紧握'), pain0: at('p4', '承受', -0.2), pain1: at('p4', '$痛苦', 0.4),
    silent: S.silent - 0.3, effort: at('r2', '很多努力'), noresult: at('r2', '得不到结果'), call: at('r3', '叫作', -0.4), root: at('r3', '扎根'),
  }
  const JBY = 900, HEADSX = 600
  // head speed (px/s), integrated so the line is the same world object in every frame
  const vel = (t) => {
    let v = 150
    if (t > J.boost) v = lerp(150, 250, eIO(prog(t, J.boost, 0.6))) * (1 - eIO(prog(t, J.boost + 2.8, 1.5))) + 150 * eIO(prog(t, J.boost + 2.8, 1.5))
    if (t > J.silent) v = lerp(v, 95, eIO(prog(t, J.silent, 1.5)))
    if (t > J.call) v *= 1 - eIO(prog(t, J.call, 1.6))
    return v
  }
  const DT = 1 / 120, HX = [200]
  for (let t = J.t0; t < TOTAL + 1; t += DT) HX.push(HX[HX.length - 1] + vel(t) * DT)
  const hxAt = (t) => { const f = (t - J.t0) / DT; if (f <= 0) return HX[0]; const i = Math.floor(f); if (i >= HX.length - 1) return HX[HX.length - 1]; return lerp(HX[i], HX[i + 1], f - i) }
  const camX = (t) => Math.max(0, hxAt(t) - HEADSX)
  const XJ = { partner: hxAt(J.partner + 0.6), support: hxAt(J.support), pain0: hxAt(J.pain0), pain1: hxAt(J.pain1), silent: hxAt(J.silent) }
  // other people crossing his path
  const OTHERS = [0, 1, 2, 3, 4].map((i) => {
    const tc = lerp(J.many, J.manyEnd, i / 4), cx = hxAt(tc) + 60, s = i % 2 ? 1 : -1
    const col = [[150, 170, 200], [200, 150, 170], [140, 180, 160], [180, 160, 210], [200, 180, 140]][i]
    return { tc, col, pts: cbez([cx - 330, JBY + s * 640], [cx - 120, JBY + s * 40], [cx + 100, JBY - s * 10], [cx + 420, JBY - s * (520 + 80 * hash(i))], 50) }
  })
  const myWave = (x) => {
    let y = JBY + 10 * Math.sin(x / 95)
    const br = clamp((x - XJ.support) / 320)
    y += 20 * br * Math.sin(x / 70)
    if (x > XJ.pain0 && x < XJ.pain1) {
      const e = Math.sin(PI * (x - XJ.pain0) / (XJ.pain1 - XJ.pain0))
      const tri = 2 * Math.abs(((x / 26) % 2) - 1) - 1
      y += 46 * e * tri
    }
    const fl = clamp((x - XJ.silent) / 220)
    return lerp(y, JBY, fl)
  }
  const partnerY = (x) => {
    if (x < XJ.partner) { const u = clamp((x - (XJ.partner - 420)) / 420); return JBY + 48 + 560 * Math.pow(1 - eIO(u), 1.4) }
    const off = 48 * (1 - clamp((x - XJ.support) / 320))
    const br = clamp((x - XJ.support) / 320)
    let y = JBY + off + 10 * Math.sin(x / 95) - 20 * br * Math.sin(x / 70)
    const fl = clamp((x - XJ.silent) / 220)
    return lerp(y, JBY + 30, fl)
  }
  // effort ticks during the silent stretch become roots
  const TICKS = []
  for (let t = J.silent + 0.9; t < J.call + 0.4; t += 0.2) TICKS.push({ t, x: hxAt(t) - 8 })
  const RCX = (TICKS[0].x + TICKS[TICKS.length - 1].x) / 2
  const ROOTS = TICKS.map((tk, i) => {
    const r = rng(1000 + i), segs = []
    const grow = (x, y, ang, len, depth, t0, w) => {
      const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len
      const dur = 0.25 + len / 700
      segs.push({ x0: x, y0: y, x1, y1, t0, dur, w })
      if (depth <= 0) return
      const n = depth > 2 ? 2 : 1 + (r() < 0.6 ? 1 : 0)
      for (let k = 0; k < n; k++) {
        const na = PI / 2 + clamp(ang - PI / 2 + (r() - 0.5) * 1.3, -1.1, 1.1)
        grow(x1, y1, na, len * (0.62 + r() * 0.3), depth - 1, t0 + dur * (0.6 + r() * 0.3), w * 0.68)
      }
    }
    const depth = 3 + Math.floor(r() * 3)
    grow(tk.x, JBY + 2, PI / 2 + (r() - 0.5) * 0.5, 90 + r() * 120, depth, (i / TICKS.length) * 1.3 + r() * 0.3, 3.2 + r() * 1.6)
    return segs
  })
  OTHERS.forEach((o) => ev(o.tc, 'pass'))
  ev(J.partner + 0.4, 'join'); ev(J.sweet, 'shimmer', { d: 1.6 }); ev(J.spice, 'sprinkle', { d: 2.2 }); ev(J.boost, 'wind', { d: 2.6 })
  ev(J.pen, 'scratch', { d: 0.6 }); ev(J.pain0, 'pain', { d: J.pain1 - J.pain0 }); ev(J.silent, 'hush')
  TICKS.forEach((tk, i) => { if (i % 2 === 0) ev(tk.t, 'tick', { quiet: 1 }) })
  ev(J.call, 'root', { d: 4.5 }); ev(J.root, 'title'); ev(J.root + 1.4, 'sprout')
  function drawJourney(c, t) {
    const hx = hxAt(t)
    const pan = eIO(prog(t, J.call, 2.4)), camY = 640 * pan
    const cx = lerp(camX(t), RCX + 60 - 540, pan)
    const silentK = eIO(prog(t, J.silent, 1.5))
    // star: the direction
    const stA = eOut(prog(t, J.t0 + 0.4, 1)) * (1 - 0.6 * silentK) * (1 - pan * 0.4)
    star(c, 950, 330 - camY * 0.3, 15 + 2 * Math.sin(t * 2.5), COL.gold, stA, 22)
    c.save(); c.translate(-cx, -camY)
    // soil once we look under the line
    if (pan > 0) {
      const g = c.createLinearGradient(0, JBY, 0, JBY + 1500)
      g.addColorStop(0, `rgba(44,32,22,${0.95 * pan})`); g.addColorStop(1, `rgba(16,12,9,${0.95 * pan})`)
      c.fillStyle = g; c.fillRect(cx - 10, JBY, W + 20, 1600)
    }
    // other people
    OTHERS.forEach((o) => {
      const a = win(t, o.tc - 1.6, o.tc + 1.8, 0.6, 0.8)
      if (a <= 0) return
      line(c, o.pts, { color: o.col, w: 3, a: a * 0.6, k: eOut(prog(t, o.tc - 1.6, 2.4)) })
    })
    // partner
    const pA = (1 - 0.6 * silentK) * (1 - pan * 0.3)
    if (hx > XJ.partner - 420) {
      const pts = []; for (let x = XJ.partner - 420; x <= hx; x += 5) pts.push([x, partnerY(x)])
      pts.push([hx, partnerY(hx)])
      line(c, pts, { color: COL.blue, w: 4, a: pA, glow: 8 })
      dot(c, hx, partnerY(hx), 8, COL.blue, pA, 14)
    }
    // his line
    const pts = []; for (let x = Math.max(-40, cx - 40); x <= hx; x += 4) pts.push([x, myWave(x)])
    pts.push([hx, myWave(hx)])
    // painted in segments so the hard stretch can be coral
    const seg = (a, b, col) => { const p = pts.filter((q) => q[0] >= a && q[0] <= b); if (p.length > 1) line(c, p, { color: col, w: 4.5, glow: 10 }) }
    seg(-1e9, XJ.pain0, COL.gold); seg(XJ.pain0, XJ.pain1, mixc(COL.coral, COL.gold, 0.15)); seg(XJ.pain1, 1e9, COL.gold)
    // effort ticks
    TICKS.forEach((tk) => { if (t >= tk.t) line(c, [[tk.x, JBY + 3], [tk.x, JBY + 18]], { color: COL.gold, w: 2, a: 0.75 * eOut(prog(t, tk.t, 0.2)) }) })
    // the curve he hoped for, that doesn't come
    const hopeA = win(t, J.effort, J.noresult + 1.4, 0.6, 1.2) * 0.6
    if (hopeA > 0) { const x0 = hxAt(J.effort); line(c, qbez([x0, JBY], [x0 + 300, JBY - 10], [x0 + 620, JBY - 320], 30), { color: COL.ink, w: 2.8, a: hopeA, dash: [10, 10] }); text(c, '?', x0 + 660, JBY - 350, { font: 'serif', size: 64, color: COL.dim, a: hopeA }) }
    // roots: batched by width into a separate layer, then one blurred copy for the glow
    if (t > J.call) {
      const lt = t - J.call
      const rc = rootLayer.getContext('2d')
      rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, W, H); rc.setTransform(1, 0, 0, 1, -cx, -camY)
      rc.lineCap = 'round'; rc.strokeStyle = rgba(COL.gold, 0.78)
      const buckets = new Map()
      for (const segs of ROOTS) for (const sg of segs) {
        const k = eOut(clamp((lt - sg.t0) / sg.dur)); if (k <= 0) continue
        const b = Math.round(sg.w * 4) / 4
        if (!buckets.has(b)) buckets.set(b, [])
        buckets.get(b).push(sg.x0, sg.y0, lerp(sg.x0, sg.x1, k), lerp(sg.y0, sg.y1, k))
      }
      for (const [w, a] of buckets) {
        rc.lineWidth = w; rc.beginPath()
        for (let i = 0; i < a.length; i += 4) { rc.moveTo(a[i], a[i + 1]); rc.lineTo(a[i + 2], a[i + 3]) }
        rc.stroke()
      }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.globalAlpha = 0.6; c.drawImage(rootLayer, 0, 0)
      c.filter = 'none'; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.drawImage(rootLayer, 0, 0)
      c.restore()
    }
    // sweetness between them
    const sw = win(t, J.sweet, J.spice + 4, 0.4, 1.5)
    if (sw > 0) for (let i = 0; i < 26; i++) {
      const x = hx - 40 - hash(i) * 520, y = (myWave(x) + partnerY(x)) / 2 + (hash(i * 3) - 0.5) * 50
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7)
      star(c, x, y, 5 + 4 * tw, COL.pink, sw * (0.4 + 0.6 * tw), 10)
    }
    // seasoning, sprinkled from above
    if (t > J.spice - 0.2) {
      for (let i = 0; i < 90; i++) {
        const ts = J.spice + 0.3 + hash(i * 5) * 2.0, d = t - ts; if (d < 0) continue
        const sx0 = camX(ts) + 690 + (hash(i) - 0.5) * 90, y = 650 + 0.5 * 1400 * d * d
        const land = myWave(sx0) - 4
        const yy = Math.min(y, land), a = y > land ? 1 - clamp((y - land) / 900) : 1
        star(c, sx0 + (hash(i * 2) - 0.5) * 40 * Math.min(d, 0.5), yy, 3 + 3 * hash(i * 7), hash(i * 11) < 0.5 ? COL.pink : COL.gold, a * 0.9, 8)
      }
    }
    // heads
    dot(c, hx, myWave(hx), 9, COL.gold, 1, 20)
    // the pen in his own hand
    const penA = eOut(prog(t, J.pen, 0.6)) * (1 - eIO(prog(t, J.silent, 1.0)))
    if (penA > 0) {
      const g = 1 + 0.08 * Math.sin(clamp((t - J.grip) / 0.5) * PI)
      const shk = t > J.pain0 && t < J.pain1 ? Math.sin(t * 50) * 2.5 : 0
      c.save(); c.translate(hx + shk, myWave(hx)); c.rotate(0.55); c.scale(g, g); c.globalAlpha *= penA
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-12, -36); c.lineTo(-12, -48); c.lineTo(12, -48); c.lineTo(12, -36); c.closePath()
      c.fillStyle = rgba(COL.gold); c.shadowColor = rgba(COL.gold, 0.8); c.shadowBlur = 16; c.fill(); c.shadowBlur = 0
      c.strokeStyle = 'rgba(20,16,12,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -32); c.stroke()
      c.beginPath(); c.arc(0, -33, 3, 0, TAU); c.fillStyle = 'rgba(20,16,12,0.9)'; c.fill()
      rrect(c, -15, -250, 30, 204, 12); c.fillStyle = '#1d1a16'; c.fill(); c.strokeStyle = rgba(COL.ink, 0.85); c.lineWidth = 2.4; c.stroke()
      c.fillStyle = rgba(COL.gold, 0.85); c.fillRect(-15, -70, 30, 7)
      c.restore()
    }
    // the sprout
    const sp = eOut(prog(t, J.root + 1.3, 1.6))
    if (sp > 0) {
      const x = RCX + 60, y = JBY
      c.save(); c.strokeStyle = rgba(COL.green); c.fillStyle = rgba(COL.green, 0.9); c.lineWidth = 4; c.lineCap = 'round'
      c.shadowColor = rgba(COL.green, 0.6); c.shadowBlur = 12
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 4, y - 30 * sp, x + 2, y - 62 * sp); c.stroke()
      const lf = eBack(prog(t, J.root + 2.1, 0.9))
      if (lf > 0) for (const s of [-1, 1]) {
        c.save(); c.translate(x + 2, y - 62 * sp); c.rotate(s * 0.9); c.scale(lf, lf)
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 14, -22, 0, -42); c.quadraticCurveTo(-s * 14, -22, 0, 0); c.fill(); c.restore()
      }
      c.restore()
    }
    c.restore()
    // screen-space overlays: wind
    if (t > J.boost && t < J.boost + 3.4) {
      for (let i = 0; i < 16; i++) {
        const ph = ((t - J.boost) * 1.6 + hash(i)) % 1, y = 780 + hash(i * 3) * 260, a = Math.sin(ph * PI) * 0.5 * win(t, J.boost, J.boost + 3.4, 0.4, 0.8)
        line(c, [[ph * 1300 - 260, y], [ph * 1300 - 60, y]], { color: COL.ink, w: 2, a })
      }
    }
    const ka = eOut(prog(t, J.pen + 0.2, 0.6)) * (1 - prog(t, J.pain0 + 0.4, 0.8))
    text(c, '主动权', HEADSX + 120, 560, { size: 44, color: COL.gold, a: ka, weight: 600, ls: 8 })
    // the word, in the soil
    const zk = eOut(prog(t, J.root, 1.4))
    text(c, '扎根', 540, 1130 + 30 * (1 - zk), { font: 'serif', size: 230, ls: 30, a: zk, glow: 30, color: COL.ink })
  }

  // ------------------------------------------------------------------ assembly
  const ACTS = [
    { t0: 0, draw: drawTitle },
    { t0: TH.t0, draw: drawThreads },
    { t0: FG.t0, draw: drawFog },
    { t0: CH.t0, draw: drawChart },
    { t0: ST.t0, draw: drawStable },
    { t0: SA.t0, draw: drawSand },
    { t0: CC.t0, draw: drawChoice },
    { t0: CP.t0, draw: drawCompass },
    { t0: J.t0, draw: drawJourney },
  ]
  const XF = 0.75
  const layers = [0, 1].map(() => { const l = document.createElement('canvas'); l.width = W; l.height = H; return l })
  const rootLayer = document.createElement('canvas'); rootLayer.width = W; rootLayer.height = H
  // background, grain, vignette
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H
  { const b = bg.getContext('2d'); b.fillStyle = '#0d0c0a'; b.fillRect(0, 0, W, H)
    const g = b.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.45, H * 0.75); g.addColorStop(0, 'rgba(40,34,26,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    b.fillStyle = g; b.fillRect(0, 0, W, H) }
  const vig = document.createElement('canvas'); vig.width = W; vig.height = H
  { const v = vig.getContext('2d'); const g = v.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); v.fillStyle = g; v.fillRect(0, 0, W, H) }
  const grains = [0, 1, 2, 3].map((s) => {
    const g = document.createElement('canvas'); g.width = 256; g.height = 256; const gc = g.getContext('2d'); const im = gc.createImageData(256, 256); const r = rng(s + 1)
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() - 0.5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 }
    gc.putImageData(im, 0, 0); return ctx.createPattern(g, 'repeat')
  })

  // ------------------------------------------------------------------ subtitles
  const HL = {
    q1: ['长期稳定'], s3: ['金钱'], f2: ['不确定性'], c4: ['离婚'], c5: ['少了一截'], c7: ['从头开始'], b5: ['多少年'], w1: ['稳定'],
    w2: ['下一步的基础'], u2: ['重新开始'], x1: ['不结婚'], x2: ['30 岁之前'], d1: ['什么样的人'], d3: ['方向'], p1: ['调味剂'], p3: ['主动权'],
    p4: ['痛苦'], r1: ['沉默的时光'], r3: ['扎根'],
  }
  const SUBS = []
  for (const l of LINES) {
    const s = l.text, parts = []
    let cur = '', st = 0
    for (let i = 0; i < s.length; i++) {
      cur += s[i]
      if ('，。？！：；'.includes(s[i]) || (s[i] === '—' && s[i + 1] !== '—')) { parts.push({ s: cur, i0: st }); cur = ''; st = i + 1 }
    }
    if (cur) parts.push({ s: cur, i0: st })
    // merge short pieces up to ~15 visible chars
    const merged = []
    for (const p of parts) {
      const last = merged[merged.length - 1], vis = (q) => q.replace(/[，。？！：；、—\s]/g, '').length
      if (last && vis(last.s) + vis(p.s) <= 15 && !/[。？！]$/.test(last.s)) last.s += p.s
      else merged.push({ ...p })
    }
    merged.forEach((p, k) => {
      const t0 = l.chars[p.i0] - 0.08, t1 = k + 1 < merged.length ? l.chars[merged[k + 1].i0] - 0.08 : l.t1 + 0.3
      let disp = p.s.replace(/[，。：；]+$/, '').replace(/——$/, '').replace(/[，、：；]/g, ' ').replace(/——/g, ' ')
      SUBS.push({ id: l.id, t0, t1, s: disp })
    })
  }
  for (let i = 0; i + 1 < SUBS.length; i++) SUBS[i].t1 = Math.min(SUBS[i].t1, SUBS[i + 1].t0)
  function drawSub(c, t) {
    const sb = SUBS.find((q) => t >= q.t0 && t < q.t1)
    if (!sb) return
    if (sb.id === 'r3' && t > J.root - 0.1) return
    const a = clamp((t - sb.t0) / 0.12) * clamp((sb.t1 - t) / 0.12)
    const hl = HL[sb.id] || []
    // split into runs of normal / highlighted
    const runs = []; let i = 0
    while (i < sb.s.length) {
      const h = hl.find((w) => sb.s.startsWith(w, i))
      if (h) { runs.push({ s: h, h: true }); i += h.length } else { if (runs.length && !runs[runs.length - 1].h) runs[runs.length - 1].s += sb.s[i]; else runs.push({ s: sb.s[i], h: false }); i++ }
    }
    c.save(); c.globalAlpha = a
    c.font = `500 52px ${SANS}`; c.letterSpacing = '3px'; c.textBaseline = 'middle'
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 14
    // one row, or two when it would run past the margins (break nearest the middle, never inside a highlight)
    const chars = []
    runs.forEach((r) => { for (const ch of r.s) chars.push({ ch, h: r.h }) })
    const width = (cs) => c.measureText(cs.map((q) => q.ch).join('')).width
    let rows = [chars]
    if (width(chars) > 960) {
      let best = -1, bd = 1e9
      const BR = { x1: '爆雷', t2: '人生方向' } // break before these, not inside a word
      const hint = BR[sb.id] ? sb.s.indexOf(BR[sb.id]) : -1
      if (hint > 0) bd = -1e9, best = hint
      for (let i = 4; i < chars.length - 3 && hint <= 0; i++) {
        if (chars[i - 1].h && chars[i].h) continue
        const d = Math.abs(i - chars.length / 2) - (chars[i - 1].ch === ' ' ? 3 : 0)
        if (d < bd) { bd = d; best = i }
      }
      rows = [chars.slice(0, best), chars.slice(best)].map((r) => r.filter((q, k) => !(q.ch === ' ' && (k === 0 || k === r.length - 1))))
    }
    rows.forEach((row, ri) => {
      let x = 540 - width(row) / 2
      const y = 1590 + (ri - (rows.length - 1) / 2) * 68
      for (const q of row) { c.fillStyle = rgba(q.h ? COL.gold : COL.ink); c.fillText(q.ch, x, y); x += c.measureText(q.ch).width }
    })
    c.restore()
  }

  // ------------------------------------------------------------------ frame
  function renderFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(bg, 0, 0)
    let li = 0
    for (let i = 0; i < ACTS.length; i++) {
      const a = ACTS[i], nx = ACTS[i + 1]
      if (t < a.t0 || (nx && t > nx.t0 + XF)) continue
      const alpha = (i === 0 ? 1 : eIO(prog(t, a.t0, XF))) * (nx ? 1 - eIO(prog(t, nx.t0, XF)) : 1)
      if (alpha <= 0.002) continue
      const lay = layers[li++ % 2], c = lay.getContext('2d')
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H)
      a.draw(c, t)
      ctx.globalAlpha = alpha; ctx.drawImage(lay, 0, 0); ctx.globalAlpha = 1
    }
    // grain
    const f = Math.floor(t * 30)
    ctx.save(); ctx.globalAlpha = 0.045; ctx.fillStyle = grains[f % 4]; ctx.translate((f * 37) % 256, (f * 91) % 256); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore()
    ctx.drawImage(vig, 0, 0)
    drawSub(ctx, t)
    // AI voice label at the start and the end
    if (window.__cover) return
    const lab = Math.max(win(t, 0.3, 4.4, 0.5, 0.6), win(t, TOTAL - 4.6, TOTAL + 1, 0.6, 0.1))
    text(ctx, '配音由 AI 根据顾东政本人声音合成', 540, 1800, { size: 26, color: COL.dim, a: lab * 0.9, ls: 2 })
    const endK = eOut(prog(t, TOTAL - 4.4, 1.0))
    text(ctx, '重估 · “稳定”', 540, 1720, { size: 34, color: COL.ink, a: endK * (1 - prog(t, TOTAL - 0.9, 0.8)), ls: 10 })
    const fo = eIO(prog(t, TOTAL - 1.3, 1.2))
    if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H) }
  }

  function renderCover() {
    // 3:4 or 9:16 cover: the roots frame, with the question
    const tC = J.root + 3.0
    window.__cover = true
    renderFrame(tC)
    text(ctx, '我要再花多少年，', 540, 1350, { size: 66, color: COL.ink, weight: 600 })
    text(ctx, '才能回到今天的位置？', 540, 1445, { size: 66, color: COL.gold, weight: 600 })
    text(ctx, '重估 · “稳定”　｜　顾东政', 540, 1525, { size: 30, color: COL.dim, ls: 4 })
  }

  if (missing.length) console.log('MISSING ANCHORS', JSON.stringify(missing))
  EV.sort((a, b) => a.t - b.t)
  window.__EVENTS = { total: TOTAL, scenes: S, acts: { title: 0, threads: TH.t0, fog: FG.t0, chart: CH.t0, stable: ST.t0, sand: SA.t0, choice: CC.t0, compass: CP.t0, journey: J.t0 },
    marks: { split: TH.split, money: TH.money, drop: CH.drop, divorce: CH.div, crumble: BK.crumble, stableWord: ST.word, restart: SA.restart, boost: J.boost, pain0: J.pain0, pain1: J.pain1, silent: J.silent, call: J.call, root: J.root, sweet: J.sweet, partner: J.partner },
    events: EV, lines: LINES.map((l) => ({ id: l.id, t0: l.t0, t1: l.t1, file: l.file })) }
  window.__S = S
  window.TOTAL = TOTAL
  window.renderFrame = renderFrame
  window.renderCover = renderCover
  window.ready = true
})()
