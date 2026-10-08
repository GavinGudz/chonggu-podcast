// Drawing library for 《“稳定”》: math, sprites, glow, particles, figures and props.  Everything is deterministic
// (seeded), so any frame can be rendered by any worker.
window.LIB = (() => {
  const PI = Math.PI, TAU = PI * 2
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
  const lerp = (a, b, x) => a + (b - a) * x
  const eIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const eOut = (x) => 1 - Math.pow(1 - clamp(x), 3)
  const eIn = (x) => Math.pow(clamp(x), 3)
  const eBack = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const eElastic = (x) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1 }
  const prog = (t, t0, d) => (d > 0 ? clamp((t - t0) / d) : t >= t0 ? 1 : 0)
  const win = (t, t0, t1, fi = 0.4, fo = 0.4) => Math.min(prog(t, t0, fi), 1 - prog(t, t1 - fo, fo))
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TAU * r())

  const COL = {
    ink: [246, 238, 222], dim: [150, 140, 126], gold: [255, 196, 92], goldD: [196, 128, 40], coral: [255, 84, 60],
    red: [255, 60, 48], blue: [120, 190, 255], pink: [255, 130, 170], green: [150, 230, 120], violet: [170, 120, 255],
    cyan: [90, 230, 255], white: [255, 255, 255],
  }
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
  const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k)
  const SERIF = '"Songti SC", "STSong", serif', SANS = '"PingFang SC", "Hiragino Sans GB", sans-serif'
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

  // ------------------------------------------------------------------ sprites
  const SPR = {}
  function glowSprite(col, size = 128, core = 0.12) {
    const c = mk(size, size), g = c.getContext('2d'), r = size / 2
    const gr = g.createRadialGradient(r, r, 0, r, r, r)
    gr.addColorStop(0, rgba(mixc(col, COL.white, 0.7), 1)); gr.addColorStop(core, rgba(col, 0.9))
    gr.addColorStop(0.4, rgba(col, 0.25)); gr.addColorStop(1, rgba(col, 0))
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c
  }
  for (const k of ['gold', 'coral', 'red', 'blue', 'pink', 'white', 'green', 'violet', 'cyan', 'ink']) SPR[k] = glowSprite(COL[k])
  function glow(c, x, y, r, key = 'gold', a = 1) {
    if (a <= 0.003 || r <= 0) return
    c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter'; c.drawImage(SPR[key], x - r, y - r, r * 2, r * 2); c.restore()
  }
  // coin face, drawn once
  SPR.coin = (() => {
    const s = 160, c = mk(s, s), g = c.getContext('2d'), r = s / 2 - 4
    let gr = g.createLinearGradient(0, 0, s, s)
    gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.35, '#f7c85a'); gr.addColorStop(0.65, '#c98a22'); gr.addColorStop(1, '#ffe08a')
    g.fillStyle = gr; g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(120,70,10,0.8)'; g.lineWidth = 5; g.stroke()
    gr = g.createLinearGradient(s, 0, 0, s)
    gr.addColorStop(0, '#ffe9a8'); gr.addColorStop(0.5, '#d9992e'); gr.addColorStop(1, '#fff0b8')
    g.strokeStyle = gr; g.lineWidth = 7; g.beginPath(); g.arc(s / 2, s / 2, r * 0.8, 0, TAU); g.stroke()
    g.font = `700 ${r * 1.05}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = 'rgba(255,250,220,0.85)'; g.fillText('¥', s / 2 - 2, s / 2 - 1)
    g.fillStyle = 'rgba(140,80,10,0.9)'; g.fillText('¥', s / 2 + 2, s / 2 + 3)
    g.fillStyle = '#e8b04a'; g.fillText('¥', s / 2, s / 2 + 1)
    // specular
    const sp = g.createRadialGradient(s * 0.32, s * 0.28, 0, s * 0.32, s * 0.28, r)
    sp.addColorStop(0, 'rgba(255,255,255,0.55)'); sp.addColorStop(0.4, 'rgba(255,255,255,0)')
    g.fillStyle = sp; g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill()
    return c
  })()
  // one coin seen from the side, for stacks
  SPR.slice = (() => {
    const w = 120, h = 52, c = mk(w, h), g = c.getContext('2d'), rx = 56, ry = 18, th = 12
    let gr = g.createLinearGradient(4, 0, w - 4, 0)
    gr.addColorStop(0, '#8a5512'); gr.addColorStop(0.3, '#f2c060'); gr.addColorStop(0.55, '#fff0b0'); gr.addColorStop(0.8, '#c98a22'); gr.addColorStop(1, '#6e420c')
    g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, ry + th + 2, rx, ry, 0, 0, PI); g.lineTo(w / 2 - rx, ry + 2); g.ellipse(w / 2, ry + 2, rx, ry, 0, PI, 0, true); g.closePath(); g.fill()
    // ridges
    g.strokeStyle = 'rgba(110,60,10,0.35)'; g.lineWidth = 1
    for (let i = -10; i <= 10; i++) { const x = w / 2 + (i / 10) * rx * 0.98; const yy = ry + 2 + ry * Math.sqrt(1 - Math.pow((x - w / 2) / rx, 2)); g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy + th); g.stroke() }
    gr = g.createLinearGradient(0, 2, 0, ry * 2 + 2)
    gr.addColorStop(0, '#fff6cf'); gr.addColorStop(1, '#e2a43c')
    g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, ry + 2, rx, ry, 0, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(150,90,20,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(w / 2, ry + 2, rx * 0.78, ry * 0.78, 0, 0, TAU); g.stroke()
    g.strokeStyle = 'rgba(80,40,4,0.85)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(w / 2, ry + th + 2, rx, ry, 0, 0.05, PI - 0.05); g.stroke()
    g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(w / 2, ry + 2, rx, ry, 0, 0.1, PI - 0.1); g.stroke()
    return c
  })()
  function coin(c, x, y, r, spin = 0, a = 1) {
    if (a <= 0.003) return
    const sx = Math.cos(spin), th = r * 0.14
    c.save(); c.globalAlpha *= a; c.translate(x, y)
    if (Math.abs(sx) < 0.999) { // edge
      c.fillStyle = '#9a6316'; c.beginPath(); c.ellipse(th * Math.sign(sx || 1) * 0.6, 0, Math.max(th * 0.5, Math.abs(sx) * r), r, 0, 0, TAU); c.fill()
    }
    c.scale(Math.max(0.04, Math.abs(sx)), 1)
    c.drawImage(SPR.coin, -r, -r, r * 2, r * 2)
    c.restore()
  }
  function coinStack(c, x, yBase, r, n, a = 1, topFace = true) {
    if (a <= 0.003 || n <= 0) return
    const sw = r * 2 * (120 / 112), sh = sw * (52 / 120), step = sw * (12 / 120)
    c.save(); c.globalAlpha *= a
    for (let i = 0; i < n; i++) c.drawImage(SPR.slice, x - sw / 2, yBase - sh - i * step, sw, sh)
    c.restore()
    return yBase - (n - 1) * step - sh + sw * (20 / 120)
  }
  // soft noise textures for fog / nebula
  function noiseCanvas(seed, w = 256, h = 256, oct = 5) {
    const c = mk(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), r = rng(seed)
    const grids = []
    for (let o = 0; o < oct; o++) { const n = 4 << o; grids.push({ n, v: Array.from({ length: (n + 1) * (n + 1) }, () => r()) }) }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0, amp = 1, tot = 0
      for (const gd of grids) {
        const fx = (x / w) * gd.n, fy = (y / h) * gd.n, ix = Math.floor(fx), iy = Math.floor(fy), dx = fx - ix, dy = fy - iy
        const at = (i, j) => gd.v[(j % gd.n) * (gd.n + 1) + (i % gd.n)]   // wraps, so the texture tiles
        const sx = dx * dx * (3 - 2 * dx), sy = dy * dy * (3 - 2 * dy)
        const val = lerp(lerp(at(ix, iy), at(ix + 1, iy), sx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy)
        v += val * amp; tot += amp; amp *= 0.55
      }
      v /= tot
      const k = (y * w + x) * 4
      im.data[k] = im.data[k + 1] = im.data[k + 2] = 255
      im.data[k + 3] = Math.max(0, Math.min(255, (v - 0.35) * 2.2 * 255))
    }
    g.putImageData(im, 0, 0); return c
  }
  function tint(src, col) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = rgba(col); g.fillRect(0, 0, c.width, c.height); return c }
  const NOISE = [noiseCanvas(11), noiseCanvas(23), noiseCanvas(37)]
  const NEB = {}
  for (const [k, col] of Object.entries({ violet: [150, 90, 255], magenta: [255, 80, 170], amber: [255, 160, 60], blue: [70, 140, 255], teal: [40, 200, 200], red: [255, 50, 40], fog: [190, 205, 230] }))
    NEB[k] = NOISE.map((n) => tint(n, col))

  // ------------------------------------------------------------------ text
  function text(c, s, x, y, o = {}) {
    const { size = 40, font = 'sans', weight, color = COL.ink, a = 1, align = 'center', base = 'middle', ls = 0, glow: gl = 0, glowCol } = o
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a
    c.font = `${weight || (font === 'serif' ? 900 : 500)} ${size}px ${font === 'serif' ? SERIF : SANS}`
    c.textAlign = align; c.textBaseline = base; c.letterSpacing = ls + 'px'
    if (gl) { c.shadowColor = rgba(glowCol || color, 0.8); c.shadowBlur = gl }
    c.fillStyle = typeof color === 'string' ? color : rgba(color)
    c.fillText(s, x + (align === 'center' ? ls / 2 : 0), y)
    c.restore()
  }
  // metallic gold lettering with a moving shine
  const scratch = mk(1080, 520), sg = scratch.getContext('2d')
  function goldText(c, s, x, y, size, o = {}) {
    const { a = 1, shine = -1, ls = 0, font = 'serif', palette = 'gold', glowA = 0.8 } = o
    if (a <= 0.003) return
    const f = `900 ${size}px ${font === 'serif' ? SERIF : SANS}`
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, scratch.width, scratch.height)
    sg.font = f; sg.letterSpacing = ls + 'px'; sg.textAlign = 'center'; sg.textBaseline = 'middle'
    const cy = scratch.height / 2
    const P = {
      gold: ['#fff7d6', '#ffd56e', '#d48e22', '#8a5410', '#ffe49a'],
      silver: ['#ffffff', '#dfe6f0', '#9aa6b8', '#5d6878', '#e8eef7'],
      red: ['#ffd6c8', '#ff7a5a', '#d4321c', '#7a1408', '#ff9a7a'],
    }[palette]
    const gr = sg.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55)
    gr.addColorStop(0, P[0]); gr.addColorStop(0.35, P[1]); gr.addColorStop(0.62, P[2]); gr.addColorStop(0.8, P[3]); gr.addColorStop(1, P[4])
    sg.fillStyle = gr; sg.fillText(s, 540 + ls / 2, cy)
    if (shine >= 0 && shine <= 1) {
      sg.globalCompositeOperation = 'source-atop'
      const w = sg.measureText(s).width, sx = 540 - w / 2 - 200 + (w + 400) * shine
      const sh = sg.createLinearGradient(sx - 90, 0, sx + 90, 0)
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.95)'); sh.addColorStop(1, 'rgba(255,255,255,0)')
      sg.save(); sg.translate(sx, cy); sg.transform(1, 0, -0.35, 1, 0, 0); sg.translate(-sx, -cy); sg.fillStyle = sh; sg.fillRect(sx - 90, 0, 180, scratch.height); sg.restore()
      sg.globalCompositeOperation = 'source-over'
    }
    c.save(); c.globalAlpha *= a
    if (glowA > 0) { c.shadowColor = rgba(palette === 'red' ? COL.red : palette === 'silver' ? COL.blue : COL.gold, 0.7 * glowA); c.shadowBlur = size * 0.25 }
    c.drawImage(scratch, x - 540, y - cy)
    c.restore()
  }
  // sample the pixels of a word so particles can fly in and form it
  function textPoints(s, size, step, font = 'serif', ls = 0) {
    const cv = mk(1080, Math.ceil(size * 1.6)), g = cv.getContext('2d')
    g.font = `900 ${size}px ${font === 'serif' ? SERIF : SANS}`; g.letterSpacing = ls + 'px'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'
    g.fillText(s, 540 + ls / 2, cv.height / 2)
    const d = g.getImageData(0, 0, cv.width, cv.height).data, pts = []
    for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) if (d[(y * cv.width + x) * 4 + 3] > 140) pts.push([x - 540, y - cv.height / 2])
    return pts
  }
  function particleText(c, pts, x, y, k, seed, o = {}) {
    // k: 0 scattered .. 1 assembled
    const { col = 'gold', spread = 700, r = 2.4, a = 1 } = o
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter'
    const sprite = SPR[col]
    for (let i = 0; i < pts.length; i++) {
      const h1 = hash(i * 3.1 + seed), h2 = hash(i * 7.7 + seed), h3 = hash(i * 1.3 + seed)
      const d = clamp((k - h3 * 0.35) / 0.65)
      const e = eOut(d)
      const ang = h1 * TAU, rad = spread * (0.4 + h2)
      const sx = x + pts[i][0] + Math.cos(ang) * rad, sy = y + pts[i][1] + Math.sin(ang) * rad
      const swirl = (1 - e) * 1.8
      const px = lerp(sx, x + pts[i][0], e) + Math.sin(h1 * 20 + swirl * 3) * 30 * (1 - e)
      const py = lerp(sy, y + pts[i][1], e) + Math.cos(h2 * 20 + swirl * 3) * 30 * (1 - e)
      const rr = r * (1 + 2.5 * (1 - e))
      c.globalAlpha = a * (0.35 + 0.65 * e)
      c.drawImage(sprite, px - rr * 3, py - rr * 3, rr * 6, rr * 6)
    }
    c.restore()
  }

  // ------------------------------------------------------------------ lines
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
  function path(c, p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]) }
  // neon line: wide soft glow + bright core
  function neon(c, pts, o = {}) {
    const { color = COL.gold, w = 4, a = 1, k = 1, dash = null, off = 0, core = true, glowW = 4 } = o
    if (a <= 0.003 || pts.length < 2) return pts[pts.length - 1]
    const p = cut(pts, k)
    if (p.length < 2) return p[0]
    c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.lineJoin = 'round'
    if (dash) { c.setLineDash(dash); c.lineDashOffset = off }
    path(c, p)
    c.globalCompositeOperation = 'lighter'
    c.strokeStyle = rgba(color, 0.18); c.lineWidth = w * glowW; c.stroke()
    c.strokeStyle = rgba(color, 0.35); c.lineWidth = w * 2; c.stroke()
    c.globalCompositeOperation = 'source-over'
    c.strokeStyle = rgba(color, 1); c.lineWidth = w; c.stroke()
    if (core) { c.strokeStyle = rgba(mixc(color, COL.white, 0.65), 0.9); c.lineWidth = Math.max(1, w * 0.35); c.stroke() }
    c.restore()
    return p[p.length - 1]
  }
  function line(c, pts, o = {}) {
    const { color = COL.ink, w = 2, a = 1, dash = null, k = 1, off = 0 } = o
    if (a <= 0.003 || pts.length < 2) return pts[pts.length - 1]
    const p = cut(pts, k)
    c.save(); c.globalAlpha *= a; c.strokeStyle = rgba(color); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'
    if (dash) { c.setLineDash(dash); c.lineDashOffset = off }
    path(c, p); c.stroke(); c.restore()
    return p[p.length - 1]
  }
  const qbez = (p0, p1, p2, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]] })
  const cbez = (p0, p1, p2, p3, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]] })
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
  // comet head with a short particle tail
  function comet(c, p, prev, col = 'gold', t = 0, size = 1) {
    glow(c, p[0], p[1], 46 * size, col, 0.9)
    glow(c, p[0], p[1], 14 * size, 'white', 1)
    if (!prev) return
    const dx = p[0] - prev[0], dy = p[1] - prev[1], L = Math.hypot(dx, dy) || 1
    for (let i = 0; i < 14; i++) {
      const h = hash(i + Math.floor(t * 30) * 0.37), back = (i / 14) * 60 * size
      glow(c, p[0] - (dx / L) * back + (h - 0.5) * 14, p[1] - (dy / L) * back + (hash(i * 3 + t) - 0.5) * 14, (5 - i * 0.3) * size, col, 0.7 * (1 - i / 14))
    }
  }

  // lightning bolt: jagged main path + branches
  function bolt(seed, x0, y0, x1, y1, depth = 6, spread = 0.18) {
    const r = rng(seed), segs = []
    const sub = (a, b, d, amp, w) => {
      if (d === 0) { segs.push([a, b, w]); return }
      const m = [(a[0] + b[0]) / 2 + (r() - 0.5) * amp, (a[1] + b[1]) / 2 + (r() - 0.5) * amp * 0.3]
      sub(a, m, d - 1, amp / 2, w); sub(m, b, d - 1, amp / 2, w)
      if (d > 2 && r() < 0.28) { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (r() - 0.5) * 1.6, L = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.7; sub(m, [m[0] + Math.cos(ang) * L, m[1] + Math.sin(ang) * L], d - 2, amp / 2, w * 0.45) }
    }
    sub([x0, y0], [x1, y1], depth, Math.hypot(x1 - x0, y1 - y0) * spread, 1)
    return segs
  }
  function drawBolt(c, segs, a, col = COL.white, outer = COL.blue, w = 5) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.globalCompositeOperation = 'lighter'
    for (const [lw, cc, al] of [[w * 7, outer, 0.16], [w * 2.5, outer, 0.45], [w, col, 1]]) {
      c.strokeStyle = rgba(cc, al)
      for (const [p, q, sw] of segs) { c.lineWidth = lw * sw; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke() }
    }
    c.restore()
  }
  // a crack with molten glow
  function crackPaths(seed, x, y, n, len) {
    const r = rng(seed), out = []
    const jag = (a, b, d, amp) => { if (d === 0) return [a, b]; const m = [(a[0] + b[0]) / 2 + (r() - 0.5) * amp, (a[1] + b[1]) / 2 + (r() - 0.5) * amp]; return [...jag(a, m, d - 1, amp * 0.55).slice(0, -1), ...jag(m, b, d - 1, amp * 0.55)] }
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + (r() - 0.5) * 0.6, L = len * (0.5 + r() * 0.7)
      const p = jag([x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L * 0.55], 5, 70)
      out.push(p)
      if (r() < 0.7) { const j = 2 + Math.floor(r() * 3), q = p[Math.min(p.length - 1, j * 4)], a2 = ang + (r() - 0.5) * 1.4; out.push(jag(q, [q[0] + Math.cos(a2) * L * 0.4, q[1] + Math.sin(a2) * L * 0.25], 4, 40)) }
    }
    return out
  }
  function drawCracks(c, paths, k, a = 1) {
    if (a <= 0.003 || k <= 0) return
    c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.lineJoin = 'round'
    for (const p0 of paths) {
      const p = cut(p0, k); if (p.length < 2) continue
      path(c, p)
      c.globalCompositeOperation = 'lighter'
      c.strokeStyle = 'rgba(255,90,30,0.22)'; c.lineWidth = 22; c.stroke()
      c.strokeStyle = 'rgba(255,140,40,0.55)'; c.lineWidth = 7; c.stroke()
      c.strokeStyle = 'rgba(255,230,160,0.95)'; c.lineWidth = 2.2; c.stroke()
      c.globalCompositeOperation = 'source-over'
    }
    c.restore()
  }

  // ------------------------------------------------------------------ people
  // glowing silhouette; feet at (x, y), height ~ 150 * s
  function figure(c, x, y, s, col, a = 1, o = {}) {
    if (a <= 0.003) return
    const { walk = 0, armTo = null, face = 1, glowA = 1, dashed = false, rim = true } = o
    const sw = Math.sin(walk), cw = Math.cos(walk)
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s * face, s)
    // aura
    if (glowA > 0) { c.save(); c.scale(1 / face, 1); glow(c, 0, -80, 120, col === COL.gold ? 'gold' : col === COL.blue ? 'blue' : col === COL.pink ? 'pink' : 'white', 0.35 * glowA); c.restore() }
    const body = dashed ? null : (() => { const g = c.createLinearGradient(-20, -150, 20, 0); g.addColorStop(0, rgba(mixc(col, COL.white, 0.35))); g.addColorStop(1, rgba(mixc(col, [0, 0, 0], 0.35))); return g })()
    c.lineCap = 'round'; c.lineJoin = 'round'
    const limb = (pts, w) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.lineWidth = w; c.stroke() }
    c.strokeStyle = dashed ? rgba(col, 0.9) : body; c.fillStyle = dashed ? 'rgba(0,0,0,0)' : body
    if (dashed) { c.setLineDash([6, 7]); c.lineWidth = 2.5 }
    // legs
    const hip = [0, -62], kL = [-6 + sw * 12, -32], fL = [-8 + sw * 22, 0], kR = [6 - sw * 12, -32], fR = [8 - sw * 22, 0]
    if (dashed) { limb([hip, kL, fL], 2.5); limb([hip, kR, fR], 2.5) } else { limb([hip, kL, fL], 15); limb([hip, kR, fR], 15) }
    // torso
    c.beginPath(); c.moveTo(-17, -112); c.quadraticCurveTo(0, -120, 17, -112); c.lineTo(13, -60); c.quadraticCurveTo(0, -54, -13, -60); c.closePath()
    dashed ? c.stroke() : c.fill()
    // arms
    const sh = [[-15, -108], [15, -108]]
    const handL = [-24 - cw * 8, -66 + Math.abs(sw) * 4], handR = armTo ? [armTo[0] / s / face, (armTo[1] - y) / s] : [24 + cw * 8, -66 + Math.abs(sw) * 4]
    if (dashed) { limb([sh[0], [-22, -88], handL], 2.5); limb([sh[1], [22, -88], handR], 2.5) } else { limb([sh[0], [-22, -88], handL], 11); limb([sh[1], [lerp(15, handR[0], 0.5) + 4, lerp(-108, handR[1], 0.5)], handR], 11) }
    // neck + head
    c.beginPath(); c.arc(0, -134, 15, 0, TAU); dashed ? c.stroke() : c.fill()
    if (rim && !dashed) {
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(mixc(col, COL.white, 0.6), 0.55); c.lineWidth = 2.5
      c.beginPath(); c.arc(0, -134, 15, -PI * 0.9, -PI * 0.1); c.stroke()
      c.beginPath(); c.moveTo(-17, -112); c.quadraticCurveTo(0, -120, 17, -112); c.stroke()
    }
    c.restore()
  }
  // constellation person: stars on the joints
  const STARMAN = [[0, -134], [-15, -108], [15, -108], [-24, -78], [24, -78], [-28, -50], [28, -50], [0, -62], [-8, -32], [8, -32], [-10, 0], [10, 0]]
  const STARMAN_E = [[0, 1], [0, 2], [1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 7], [7, 8], [7, 9], [8, 10], [9, 11]]
  function constellation(c, x, y, s, k, t, a = 1) {
    if (a <= 0.003) return
    const P = STARMAN.map((p) => [x + p[0] * s, y + p[1] * s])
    c.save(); c.globalAlpha *= a
    STARMAN_E.forEach(([i, j], n) => { const kk = clamp(k * 1.6 - n * 0.05); if (kk > 0) line(c, [P[i], [lerp(P[i][0], P[j][0], kk), lerp(P[i][1], P[j][1], kk)]], { color: COL.blue, w: 1.6, a: 0.7 }) })
    P.forEach((p, i) => { const kk = clamp(k * 1.5 - i * 0.04); const tw = 0.7 + 0.3 * Math.sin(t * 3 + i * 1.9); glow(c, p[0], p[1], (i === 0 ? 36 : 24) * kk, 'cyan', tw); glow(c, p[0], p[1], 6 * kk, 'white', 1) })
    c.restore()
  }

  // ------------------------------------------------------------------ props
  function rings(c, x, y, s, a = 1, t = 0, apart = 0) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s)
    for (const [dx, dy, tilt, col] of [[-20 - 120 * apart, 90 * apart, -0.25, ['#fff3c4', '#e8a83a', '#8a5512']], [20 + 120 * apart, -90 * apart, 0.25, ['#ffffff', '#c9d6e8', '#6a7a90']]]) {
      c.save(); c.translate(dx, dy); c.rotate(tilt + apart * 1.2)
      const g = c.createLinearGradient(-36, -36, 36, 36); g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2])
      c.strokeStyle = g; c.lineWidth = 11; c.beginPath(); c.ellipse(0, 0, 34, 30, 0, 0, TAU); c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 34, 30, 0, PI * 1.1, PI * 1.6); c.stroke()
      c.restore()
    }
    // diamond
    if (apart < 0.05) { c.save(); c.translate(-20, -34); glow(c, 0, 0, 40, 'white', 0.6 + 0.4 * Math.sin(t * 5)); c.fillStyle = '#eaf6ff'; c.beginPath(); c.moveTo(0, -12); c.lineTo(10, 0); c.lineTo(0, 12); c.lineTo(-10, 0); c.closePath(); c.fill(); c.restore() }
    c.restore()
  }
  function sparkle(c, x, y, r, a = 1, col = 'white', rot = 0) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter'; c.translate(x, y); c.rotate(rot)
    const g = c.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, rgba(COL[col] || COL.white, 1)); g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g; c.fillRect(-r, -1.5, r * 2, 3); c.rotate(PI / 2); c.fillRect(-r * 0.7, -1.2, r * 1.4, 2.4)
    c.restore()
    glow(c, x, y, r * 0.5, col, a)
  }
  function heart(c, x, y, s, col = COL.pink, a = 1) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s)
    c.shadowColor = rgba(col, 0.9); c.shadowBlur = 18
    const g = c.createLinearGradient(0, -12, 0, 14); g.addColorStop(0, rgba(mixc(col, COL.white, 0.5))); g.addColorStop(1, rgba(col))
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-16, 0, -14, -14, 0, -6); c.bezierCurveTo(14, -14, 16, 0, 0, 12); c.fill()
    c.restore()
  }
  function star4(c, x, y, r, col = COL.gold, a = 1, rot = 0) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.fillStyle = rgba(mixc(col, COL.white, 0.5)); c.shadowColor = rgba(col, 1); c.shadowBlur = r * 1.2
    c.beginPath(); for (let i = 0; i < 8; i++) { const ang = (i * PI) / 4 - PI / 2, rr = i % 2 ? r * 0.22 : r; c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) } c.closePath(); c.fill(); c.restore()
    glow(c, x, y, r * 2.4, 'gold', 0.5 * a)
  }
  function cloud(c, x, y, s, a = 1, dark = true) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s)
    const g = c.createLinearGradient(0, -40, 0, 30); g.addColorStop(0, dark ? '#5a5f78' : '#f4f6ff'); g.addColorStop(1, dark ? '#23263a' : '#b9c4e0')
    c.fillStyle = g
    for (const [cx, cy, r] of [[-34, 6, 26], [-8, -12, 34], [24, -2, 28], [44, 10, 20], [0, 14, 30]]) { c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill() }
    c.restore()
  }
  function compassDraw(c, x, y, R, needle, t, a = 1) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y)
    glow(c, 0, 0, R * 1.6, 'gold', 0.25)
    let g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, R)
    g.addColorStop(0, 'rgba(40,34,60,0.95)'); g.addColorStop(1, 'rgba(18,16,30,0.95)')
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill()
    g = c.createLinearGradient(-R, -R, R, R); g.addColorStop(0, '#fff1c0'); g.addColorStop(0.5, '#c98a22'); g.addColorStop(1, '#ffe08a')
    c.strokeStyle = g; c.lineWidth = R * 0.07; c.beginPath(); c.arc(0, 0, R * 0.96, 0, TAU); c.stroke()
    c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); c.stroke()
    for (let i = 0; i < 72; i++) { const an = (i / 72) * TAU, l = i % 9 === 0 ? 0.12 : 0.05; c.strokeStyle = rgba(COL.gold, i % 9 === 0 ? 0.95 : 0.55); c.lineWidth = i % 9 === 0 ? 3 : 1.5; c.beginPath(); c.moveTo(Math.sin(an) * R * 0.9, -Math.cos(an) * R * 0.9); c.lineTo(Math.sin(an) * R * (0.9 - l), -Math.cos(an) * R * (0.9 - l)); c.stroke() }
    c.font = `700 ${R * 0.14}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = rgba(COL.ink, 0.9)
    ;['北', '东', '南', '西'].forEach((s, i) => { const an = (i * PI) / 2; c.fillText(s, Math.sin(an) * R * 0.63, -Math.cos(an) * R * 0.63) })
    // rose
    c.save(); c.rotate(PI / 4); c.fillStyle = 'rgba(255,200,100,0.12)'
    for (let i = 0; i < 4; i++) { c.rotate(PI / 2); c.beginPath(); c.moveTo(0, -R * 0.5); c.lineTo(R * 0.06, 0); c.lineTo(-R * 0.06, 0); c.fill() }
    c.restore()
    // needle
    c.save(); c.rotate(needle)
    c.shadowColor = 'rgba(255,90,60,0.8)'; c.shadowBlur = 20
    c.fillStyle = '#ff5a3c'; c.beginPath(); c.moveTo(0, -R * 0.72); c.lineTo(R * 0.07, 0); c.lineTo(-R * 0.07, 0); c.closePath(); c.fill()
    c.shadowBlur = 0; c.fillStyle = '#dfe6f0'; c.beginPath(); c.moveTo(0, R * 0.72); c.lineTo(R * 0.07, 0); c.lineTo(-R * 0.07, 0); c.closePath(); c.fill()
    c.restore()
    c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(0, 0, R * 0.05, 0, TAU); c.fill()
    // glass
    g = c.createLinearGradient(-R, -R, R * 0.2, R * 0.2); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 0.92, 0, TAU); c.fill()
    c.restore()
  }
  function pen(c, x, y, ang, s, a = 1) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(ang); c.scale(s, s)
    // nib
    let g = c.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#a8701c'); g.addColorStop(0.5, '#fff0b0'); g.addColorStop(1, '#b07a20')
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-16, -30, -14, -60); c.lineTo(14, -60); c.quadraticCurveTo(16, -30, 0, 0); c.fill()
    c.strokeStyle = 'rgba(60,30,5,0.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -40); c.stroke()
    c.fillStyle = 'rgba(60,30,5,0.9)'; c.beginPath(); c.arc(0, -42, 3.5, 0, TAU); c.fill()
    // grip + barrel
    g = c.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#0b0b12'); g.addColorStop(0.35, '#3b3f58'); g.addColorStop(0.5, '#8a90b0'); g.addColorStop(0.65, '#2a2d40'); g.addColorStop(1, '#07070c')
    c.fillStyle = g; rrect(c, -16, -140, 32, 82, 10); c.fill()
    g = c.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#6e4510'); g.addColorStop(0.5, '#ffe8a0'); g.addColorStop(1, '#6e4510')
    c.fillStyle = g; c.fillRect(-17, -148, 34, 10); c.fillRect(-17, -270, 34, 8)
    g = c.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#120612'); g.addColorStop(0.3, '#5a1e3a'); g.addColorStop(0.5, '#c0567a'); g.addColorStop(0.7, '#3a1026'); g.addColorStop(1, '#0a0308')
    c.fillStyle = g; rrect(c, -18, -330, 36, 184, 16); c.fill()
    // clip
    g = c.createLinearGradient(14, 0, 26, 0); g.addColorStop(0, '#8a5512'); g.addColorStop(1, '#ffe8a0')
    c.fillStyle = g; rrect(c, 16, -320, 8, 110, 4); c.fill()
    c.restore()
  }
  function hourglass(c, x, y, s, top, bot, a = 1, crack = 0, t = 0) {
    // top/bot: sand fractions 0..1
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s)
    const H = 210, Wd = 120, neck = 10
    const shape = () => { c.beginPath(); c.moveTo(-Wd, -H); c.bezierCurveTo(-Wd, -H * 0.35, -neck, -H * 0.2, -neck, 0); c.bezierCurveTo(-neck, H * 0.2, -Wd, H * 0.35, -Wd, H); c.lineTo(Wd, H); c.bezierCurveTo(Wd, H * 0.35, neck, H * 0.2, neck, 0); c.bezierCurveTo(neck, -H * 0.2, Wd, -H * 0.35, Wd, -H); c.closePath() }
    // sand
    c.save(); shape(); c.clip()
    const sg2 = c.createLinearGradient(0, -H, 0, H); sg2.addColorStop(0, '#ffe39a'); sg2.addColorStop(1, '#d9902a')
    c.fillStyle = sg2
    if (top > 0) { const yTop = lerp(-6, -H * 0.85, top); c.beginPath(); c.moveTo(-Wd, yTop); c.quadraticCurveTo(0, yTop + 30 * top, Wd, yTop); c.lineTo(Wd, 0); c.lineTo(-Wd, 0); c.fill() }
    if (bot > 0) { const hB = H * 0.8 * bot; c.beginPath(); c.moveTo(-Wd, H); c.lineTo(-Wd, H - hB * 0.4); c.quadraticCurveTo(0, H - hB * 1.5, Wd, H - hB * 0.4); c.lineTo(Wd, H); c.fill() }
    c.restore()
    // stream
    if (top > 0.01) { c.strokeStyle = 'rgba(255,214,120,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, H - H * 0.8 * bot * 1.1); c.stroke(); for (let i = 0; i < 8; i++) glow(c, (hash(i + t * 9) - 0.5) * 4, lerp(0, H - H * 0.8 * bot, (i / 8 + t * 2) % 1), 6, 'gold', 0.6) }
    // glass
    shape(); c.fillStyle = 'rgba(180,210,255,0.06)'; c.fill()
    c.strokeStyle = 'rgba(220,235,255,0.55)'; c.lineWidth = 3; c.stroke()
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-Wd + 22, -H + 20); c.bezierCurveTo(-Wd + 22, -H * 0.45, -40, -H * 0.25, -30, -H * 0.12); c.stroke()
    c.beginPath(); c.moveTo(-Wd + 22, H - 20); c.bezierCurveTo(-Wd + 22, H * 0.5, -46, H * 0.3, -34, H * 0.16); c.stroke()
    // caps
    const cg = c.createLinearGradient(0, -H - 24, 0, -H); cg.addColorStop(0, '#5a3a14'); cg.addColorStop(0.5, '#e8b860'); cg.addColorStop(1, '#5a3a14')
    c.fillStyle = cg; rrect(c, -Wd - 22, -H - 26, (Wd + 22) * 2, 26, 8); c.fill(); rrect(c, -Wd - 22, H, (Wd + 22) * 2, 26, 8); c.fill()
    // crack
    if (crack > 0) {
      const cp = [[Wd * 0.55, H * 0.55], [Wd * 0.35, H * 0.62], [Wd * 0.48, H * 0.72], [Wd * 0.28, H * 0.8], [Wd * 0.4, H * 0.92]]
      c.save(); c.globalCompositeOperation = 'lighter'; line(c, cp, { color: COL.white, w: 2.5, k: crack, a: 0.95 }); line(c, cp, { color: COL.blue, w: 8, k: crack, a: 0.3 }); c.restore()
    }
    c.restore()
  }
  function clockFace(c, x, y, R, ang, a = 1) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y)
    glow(c, 0, 0, R * 1.8, 'coral', 0.35)
    c.fillStyle = 'rgba(30,20,30,0.85)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill()
    c.strokeStyle = rgba(COL.coral, 0.9); c.lineWidth = 5; c.stroke()
    for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.sin(an) * R * 0.85, -Math.cos(an) * R * 0.85); c.lineTo(Math.sin(an) * R * 0.72, -Math.cos(an) * R * 0.72); c.stroke() }
    c.strokeStyle = rgba(COL.ink); c.lineCap = 'round'
    c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(ang / 12) * R * 0.45, -Math.cos(ang / 12) * R * 0.45); c.stroke()
    c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(ang) * R * 0.7, -Math.cos(ang) * R * 0.7); c.stroke()
    c.restore()
  }
  function leaf(c, x, y, len, ang, k, a = 1) {
    if (k <= 0 || a <= 0.003) return
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(ang); c.scale(k, k)
    const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, '#2f7a2a'); g.addColorStop(0.6, '#7ed957'); g.addColorStop(1, '#c8ff8a')
    c.shadowColor = 'rgba(150,255,120,0.6)'; c.shadowBlur = 14
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0); c.fill()
    c.shadowBlur = 0; c.strokeStyle = 'rgba(230,255,200,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.9, 0); c.stroke()
    c.restore()
  }

  // shared particle helper: deterministic burst
  function burst(c, x, y, t, seed, o = {}) {
    // t: seconds since the burst
    const { n = 60, speed = 600, life = 1.2, col = 'gold', size = 6, grav = 500, a = 1, spreadY = 1 } = o
    if (t < 0 || t > life * 1.6) return
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 1.7 + seed), h2 = hash(i * 9.1 + seed), h3 = hash(i * 4.3 + seed)
      const lf = life * (0.5 + h3 * 0.8); if (t > lf) continue
      const ang = h1 * TAU, v = speed * (0.3 + h2 * 0.9)
      const px = x + Math.cos(ang) * v * t * (1 - t / (lf * 2.2)), py = y + Math.sin(ang) * v * t * spreadY * (1 - t / (lf * 2.2)) + 0.5 * grav * t * t
      glow(c, px, py, size * (1 - t / lf) + 1, typeof col === 'string' ? col : col[i % col.length], a * (1 - t / lf))
    }
  }

  return { PI, TAU, clamp, lerp, eIO, eOut, eIn, eBack, eElastic, prog, win, hash, rng, gauss, COL, rgba, mixc, SERIF, SANS, mk, SPR, glow, coin, coinStack, NOISE, NEB, text, goldText, textPoints, particleText, cut, path, neon, line, qbez, cbez, rrect, comet, bolt, drawBolt, crackPaths, drawCracks, figure, constellation, rings, sparkle, heart, star4, cloud, compassDraw, pen, hourglass, clockFace, leaf, burst }
})()
