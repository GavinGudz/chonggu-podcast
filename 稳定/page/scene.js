// 《重估：“稳定”》 renderer v2.  Every frame is a pure function of t.  Each act paints its own sky, the frames are
// cross-faded, then a bloom pass, shake, flashes, grain and subtitles go on top.
(async () => {
  const L_ = window.LIB
  const { PI, TAU, clamp, lerp, eIO, eOut, eIn, eBack, prog, win, hash, rng, gauss, COL, rgba, mixc, mk, SPR, glow, coin, coinStack, NEB, text, goldText, textPoints, particleText, cut, neon, line, qbez, cbez, rrect, comet, bolt, drawBolt, crackPaths, drawCracks, figure, constellation, rings, sparkle, heart, star4, cloud, compassDraw, pen, hourglass, clockFace, leaf, burst } = L_
  const Q = new URLSearchParams(location.search)
  const W = +Q.get('w') || 1080, H = +Q.get('h') || 1920
  const cv = document.getElementById('cv')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const TL = await (await fetch('../data/timeline.json')).json()
  await Promise.all(['900 100px "Songti SC"', '700 100px "Songti SC"', '600 40px "PingFang SC"', '500 40px "PingFang SC"'].map((f) => document.fonts.load(f, '稳定扎根金钱我的积蓄时间重估顾东政离婚假设情境亲密关系结婚方向战略策略行动“”')))

  // ------------------------------------------------------------------ anchors
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
  const EV = [], SHAKE = [], FLASH = []
  const ev = (t, k, extra = {}) => EV.push({ t: +t.toFixed(3), k, ...extra })
  const shake = (t, amp, dur = 0.6) => SHAKE.push({ t, amp, dur })
  const flash = (t, col, amp = 0.6, dur = 0.5) => FLASH.push({ t, col, amp, dur })

  // ------------------------------------------------------------------ shared scenery
  function sky(c, stops) { const g = c.createLinearGradient(0, 0, 0, H); stops.forEach(([o, col]) => g.addColorStop(o, typeof col === 'string' ? col : rgba(col))); c.fillStyle = g; c.fillRect(0, 0, W, H) }
  function nebula(c, key, t, a = 0.5, o = {}) {
    const { sc = 4.2, dx = 18, dy = 6, y0 = 0 } = o
    const set = NEB[key]
    c.save(); c.globalCompositeOperation = 'lighter'
    set.forEach((n, i) => {
      const s = sc * (1 + i * 0.35), w = n.width * s, h = n.height * s
      const ox = ((t * dx * (i + 1) * 0.6 + i * 300) % w + w) % w, oy = y0 + Math.sin(t * 0.07 + i) * 40 + t * dy * 0.2 * (i % 2 ? 1 : -1)
      c.globalAlpha = a * (0.55 - i * 0.12)
      const oyy = ((oy % h) + h) % h
      for (let ky = -1; ky * h - oyy < H; ky++) for (let k = -1; k * w - ox < W; k++) c.drawImage(n, k * w - ox, ky * h + oyy - h + h, w, h)
    })
    c.restore()
  }
  const STARS = (() => { const r = rng(77); return Array.from({ length: 360 }, () => ({ x: r() * W, y: r() * H, s: Math.pow(r(), 3) * 2.6 + 0.4, p: r() * TAU, f: 0.5 + r() * 2 })) })()
  function stars(c, t, a = 1, yMax = H) {
    if (a <= 0.003) return
    c.save(); c.globalAlpha *= a
    for (const s of STARS) { if (s.y > yMax) continue; const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.p); c.fillStyle = `rgba(255,248,235,${0.75 * tw})`; c.fillRect(s.x, s.y, s.s, s.s); if (s.s > 2.2) glow(c, s.x, s.y, s.s * 5, 'white', 0.35 * tw) }
    c.restore()
  }
  const BOKEH = (() => { const r = rng(91); return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * H, r: 10 + Math.pow(r(), 2) * 60, v: 6 + r() * 20, p: r() * TAU, k: r() })) })()
  function bokeh(c, t, keys, a = 0.5) {
    if (a <= 0.003) return
    for (const b of BOKEH) { const y = ((b.y - t * b.v) % (H + 200) + H + 200) % (H + 200) - 100, x = b.x + Math.sin(t * 0.4 + b.p) * 30; glow(c, x, y, b.r, keys[Math.floor(b.k * keys.length)], a * (0.35 + 0.3 * Math.sin(t + b.p))) }
  }
  const DUST = (() => { const r = rng(5); return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, v: 8 + r() * 26, p: r() * TAU, s: 1.5 + r() * 3 })) })()
  function dust(c, t, key = 'gold', a = 0.6) {
    for (const d of DUST) { const y = ((d.y - t * d.v) % H + H) % H, x = d.x + Math.sin(t * 0.6 + d.p) * 24; glow(c, x, y, d.s * 3, key, a * (0.5 + 0.5 * Math.sin(t * 2 + d.p))) }
  }
  function godRays(c, x, y, t, a = 0.3, col = [255, 200, 120], n = 9, len = 2200) {
    if (a <= 0.003) return
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y)
    for (let i = 0; i < n; i++) {
      const ang = PI / 2 + (i - (n - 1) / 2) * 0.16 + Math.sin(t * 0.3 + i) * 0.04, w = 0.035 + 0.03 * hash(i)
      const g = c.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len)
      g.addColorStop(0, rgba(col, a * (0.6 + 0.4 * Math.sin(t * 0.8 + i * 2)))); g.addColorStop(1, rgba(col, 0))
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang - w) * len, Math.sin(ang - w) * len); c.lineTo(Math.cos(ang + w) * len, Math.sin(ang + w) * len); c.closePath(); c.fill()
    }
    c.restore()
  }
  function flare(c, x, y, a = 1, len = 900, col = 'gold') {
    if (a <= 0.003) return
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= a
    const g = c.createLinearGradient(x - len, 0, x + len, 0)
    g.addColorStop(0, 'rgba(255,200,120,0)'); g.addColorStop(0.5, col === 'red' ? 'rgba(255,120,100,0.95)' : 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,200,120,0)')
    c.fillStyle = g; c.fillRect(x - len, y - 2.5, len * 2, 5)
    c.restore()
    glow(c, x, y, 160, col, a * 0.8); glow(c, x, y, 40, 'white', a)
  }
  function shockRing(c, x, y, d, col = COL.gold, R = 600) {
    if (d < 0 || d > 1) return
    const r = R * eOut(d)
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(col, 0.7 * (1 - d)); c.lineWidth = 14 * (1 - d) + 1; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore()
  }
  function label(c, s, x, y, o = {}) { if (!o.keep) return; text(c, s, x, y, { size: 34, weight: 600, glow: 14, ...o }) }
  const RIDGE = (() => { const r = rng(404), pts = []; let y = 0, v = 0; for (let i = 0; i <= 400; i++) { v = v * 0.85 + (r() - 0.5) * 0.5; y = y * 0.97 + v * 0.3; pts.push(Math.tanh(y)) } return pts })()
  function ridge(c, off, base, h, col, seed, a = 1) {
    const step = 18, n = RIDGE.length - 1, span = n * step
    c.save(); c.globalAlpha *= a; c.fillStyle = rgba(col); c.beginPath(); c.moveTo(-10, base)
    for (let x = -10; x <= W + step; x += step) { const u = (((x - off) % span) + span) % span, i = Math.floor(u / step), f = u / step - i; const yv = lerp(RIDGE[(i + seed * 37) % n], RIDGE[(i + 1 + seed * 37) % n], f); c.lineTo(x, base - h * (0.55 + 0.45 * yv)) }
    c.lineTo(W + 10, base); c.closePath(); c.fill(); c.restore()
  }
  function edge(c, col, a) {
    if (a <= 0.003) return
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75)
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a)); c.fillStyle = g; c.fillRect(0, 0, W, H)
  }

  // ================================================================== 0 HOOK + TITLE
  // wordless opening (no narration until 我会问自己): coins pile up, lightning, the coins become the title
  const HK = L.h1 ? { t0: 0, line: at('h1'), crack: at('h1', '多少年'), strike: at('h1', '回到', -0.05), end: lend('h1'), next: S.two }
                  : { t0: 0, line: 0.6, crack: 1.5, strike: 2.3, end: 2.8, next: S.two }
  HK.title = HK.end + 0.15; HK.slam = HK.title + 1.25
  const TITLE_PTS = textPoints('“稳定”', 200, 5, 'serif', 14)
  const TOWER = [{ x: 540, n: 30 }, { x: 330, n: 20 }, { x: 750, n: 22 }, { x: 150, n: 11 }, { x: 930, n: 13 }]
  const TB = 1360, TR = 92
  const FLY = (() => { const r = rng(3), out = []; TOWER.forEach((tw, k) => { const s = k === 0 ? 1 : k < 3 ? 0.82 : 0.6; for (let i = 0; i < tw.n; i += 1) out.push({ x: tw.x, y: TB - i * TR * s * 0.2 - 30, vx: (r() - 0.5) * 1700 + (tw.x - 540) * 1.6, vy: -600 - r() * 1300, spin: r() * 20, rs: 10 + r() * 22, s, grow: 1 + r() * 2.4 }) }); return out })()
  ev(0.0, 'boom'); ev(0.05, 'riser', { d: HK.strike - 0.05 }); ev(0.15, 'coins', { d: HK.strike - 0.3, n: 46 }); ev(0.3, 'heartbeat', { d: HK.strike - 0.5 }); ev(HK.crack, 'crackle', { d: 0.8 }); ev(HK.strike, 'strike'); ev(HK.strike + 0.05, 'coins', { d: 1.6 })
  ev(HK.title, 'swoosh', { d: 1.2 }); ev(HK.slam, 'slam')
  shake(HK.crack, 6, 0.8); shake(HK.strike, 34, 1.2); shake(HK.slam, 16, 0.7)
  flash(HK.strike, COL.red, 0.85, 0.6); flash(HK.slam, COL.white, 0.6, 0.5)
  function drawHook(c, t) {
    const lit = eOut(prog(t, 0.1, 1.2)), red = eOut(prog(t, HK.crack, 0.6)), boom = t >= HK.strike
    sky(c, [[0, '#050308'], [0.55, rgba(mixc([20, 10, 20], [70, 8, 12], red))], [1, rgba(mixc([60, 34, 10], [120, 20, 10], red))]])
    nebula(c, red > 0.3 ? 'red' : 'amber', t, 0.35 * lit)
    stars(c, t, 0.4)
    const slow = (d) => (d < 0.18 ? d : 0.18 + (d - 0.18) * 0.32)
    if (!boom) {
      // coins raining into towers
      const cam = 1 + 0.06 * eIO(prog(t, 0, HK.strike))
      c.save(); c.translate(540, 1000); c.scale(cam, cam); c.translate(-540, -1000)
      glow(c, 540, TB + 30, 520, 'gold', 0.35 * lit)
      TOWER.forEach((tw, k) => {
        const s = k === 0 ? 1 : k < 3 ? 0.82 : 0.6
        const n = Math.floor(tw.n * eOut(prog(t, 0.05 + k * 0.08, HK.line + 0.9)))
        const tremble = red * Math.sin(t * 60 + k) * 3
        const topY = coinStack(c, tw.x + tremble, TB, TR * s, n, 1)
        for (let j = 0; j < 3; j++) {
          const ph = ((t * 2.2 + j / 3 + k * 0.13) % 1)
          if (n >= tw.n || ph < 0.05) continue
          coin(c, tw.x + Math.sin(j + k) * 10, lerp(-120, topY || TB - 40, eIn(ph)), TR * s * 0.5, t * 9 + j, 0.95)
        }
        if (n > 0) sparkle(c, tw.x + (hash(n + k) - 0.5) * 60, (topY || TB) - 8, 28, 0.6 + 0.4 * Math.sin(t * 9 + k))
      })
      if (red > 0) drawCracks(c, crackPaths(9, 540, TB - 180, 7, 260), eOut(prog(t, HK.crack, 0.7)), 1)
      c.restore()
    } else {
      const d = t - HK.strike, sd = slow(d)
      drawBolt(c, bolt(41, 560, -50, 540, TB - 230), 1 - prog(d, 0.08, 0.5), COL.white, COL.red, 7)
      glow(c, 540, TB - 230, 600, 'red', 0.8 * (1 - prog(d, 0, 0.8)))
      shockRing(c, 540, TB - 200, d / 1.1, COL.red, 900)
      const dissolve = prog(t, HK.title - 0.2, 0.7)
      FLY.forEach((f) => {
        const x = f.x + f.vx * sd, y = f.y + f.vy * sd + 0.5 * 2600 * sd * sd * 0.35
        const sc = TR * f.s * 0.5 * (1 + f.grow * eOut(prog(sd, 0, 1.4)))
        coin(c, x, y, sc, f.spin + f.rs * sd, 1 - dissolve)
      })
      burst(c, 540, TB - 220, d, 7, { n: 120, speed: 1400, life: 1.6, col: ['gold', 'red', 'white'], size: 10, grav: 300 })
      const k = eIO(prog(t, HK.title, 1.25))
      if (k > 0) {
        particleText(c, TITLE_PTS, 540, 880, k, 4, { col: 'gold', spread: 900, r: 2.6, a: 1 - prog(t, HK.slam + 0.1, 0.4) })
        const sk = prog(t, HK.slam, 0.3)
        if (sk > 0) {
          godRays(c, 540, 880, t, 0.22 * eOut(sk), [255, 200, 120], 14, 1600)
          glow(c, 540, 880, 700, 'gold', 0.45 * (1 - prog(t, HK.slam, 1.5)) + 0.15)
          goldText(c, '“稳定”', 540, 880, 200, { a: eOut(sk), ls: 14, shine: prog(t, HK.slam + 0.2, 1.1) })
          shockRing(c, 540, 880, (t - HK.slam) / 1.2, COL.gold, 900)
          flare(c, 540, 880, 1 - prog(t, HK.slam, 1.2), 1000)
          text(c, '重  估', 540, 700, { size: 40, color: COL.gold, ls: 14, a: eOut(prog(t, HK.slam + 0.25, 0.6)), weight: 600, glow: 16 })
          text(c, '顾东政', 540, 1050, { size: 36, color: COL.ink, ls: 16, a: eOut(prog(t, HK.slam + 0.45, 0.6)), glow: 10 })
        }
      }
    }
  }

  // ================================================================== 1 TWO LIVES (sunset) -> SPLIT -> MONEY
  const TH = {
    t0: S.two - 0.5, me: at('q1', '伴侣'), fut: at('q1', '长期'), rings: at('q2', '结婚'), fork: at('q2', '持续'),
    split: at('s1', '分开'), cracks: at('s1', '扩展'), n: [at('s2', '金钱'), at('s2', '个人发展'), at('s2', '负面情绪')],
    re: at('s2', '重新考虑'), fear: at('s3', '最让我恐惧'), money: at('s3', '金钱'),
  }
  const HOR = 1040, FEET = 1330
  const NODES = [
    { x: 260, y: 600, label: '金钱上的安排', kind: 'coin' },
    { x: 820, y: 600, label: '个人发展上的计划', kind: 'flag' },
    { x: 540, y: 880, label: '负面情绪', kind: 'cloud' },
  ]
  const GCRACK = crackPaths(17, 540, FEET - 10, 9, 520)
  ev(TH.me, 'pop'); ev(TH.rings, 'chime'); ev(TH.fork, 'tick'); ev(TH.split, 'shatter'); ev(TH.cracks, 'rumble', { d: 1.8 })
  TH.n.forEach((t) => ev(t, 'orb')); ev(TH.re, 'tick'); ev(TH.fear, 'heartbeat', { d: 2.0 }); ev(TH.money, 'boom')
  shake(TH.split, 14, 0.8); shake(TH.cracks, 8, 1.6); shake(TH.money, 10, 0.6)
  flash(TH.money, COL.gold, 0.35, 0.6)
  const walkerX = (t) => lerp(150, 520, eOut(prog(t, TH.t0, TH.split - TH.t0 + 0.6)))
  function arrowUp(c, x, y, h, t) { const k = (t * 0.8) % 1; neon(c, [[x, y], [x, y - h]], { color: COL.cyan, w: 3, a: 0.9 }); neon(c, [[x - 12, y - h + 14], [x, y - h], [x + 12, y - h + 14]], { color: COL.cyan, w: 3, a: 0.9 }); glow(c, x, y - h * k, 10, 'cyan', 1 - k) }
  function drawTwo(c, t) {
    const sp = eIO(prog(t, TH.split, 1.4)), fear = eIO(prog(t, TH.fear, 1.0)), mk_ = eIO(prog(t, TH.money, 1.2))
    const dk = Math.max(sp * 0.8, fear)
    sky(c, [[0, rgba(mixc([24, 12, 52], [30, 6, 14], dk))], [0.38, rgba(mixc([92, 30, 92], [90, 10, 24], dk))], [0.53, rgba(mixc([255, 128, 70], [200, 40, 30], dk))], [0.545, rgba(mixc([90, 30, 60], [60, 8, 12], dk))], [1, rgba(mixc([20, 10, 30], [16, 4, 8], dk))]])
    stars(c, t, 0.6, HOR - 300)
    nebula(c, dk > 0.4 ? 'red' : 'magenta', t, 0.3)
    glow(c, 760, HOR - 10, 700, dk > 0.5 ? 'red' : 'gold', 0.6 * (1 - 0.5 * dk))
    glow(c, 760, HOR - 10, 160, 'white', 0.5 * (1 - dk))
    godRays(c, 760, HOR - 10, t, 0.06 * (1 - dk), [255, 170, 110], 10, 1500)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = -12; i <= 12; i++) { c.strokeStyle = rgba(dk > 0.4 ? COL.coral : [255, 150, 120], 0.12); c.lineWidth = 1.5; c.beginPath(); c.moveTo(540 + i * 12, HOR); c.lineTo(540 + i * 220, H); c.stroke() }
    for (let j = 1; j < 12; j++) { const y = HOR + Math.pow(j / 12, 2.2) * (H - HOR); c.strokeStyle = rgba([255, 150, 120], 0.1); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke() }
    c.restore()
    bokeh(c, t, ['gold', 'pink', 'violet'], 0.35 * (1 - dk))
    const wx = walkerX(t), wob = (x, s) => FEET + 6 + s * 16 * Math.sin((x - wx) / 50)
    const xs = []; for (let x = -40; x <= Math.min(wx, 520); x += 6) xs.push(x)
    const trA = 1 - 0.7 * mk_
    neon(c, xs.map((x) => [x, wob(x, -1) - 6]), { color: COL.blue, w: 4, a: trA })
    neon(c, xs.map((x) => [x, wob(x, 1) + 6]), { color: COL.gold, w: 4, a: trA })
    const fa = 0.7 * win(t, TH.fut, TH.split + 0.3, 0.8, 0.5), forkK = eOut(prog(t, TH.fork, 1.0))
    if (fa > 0) {
      neon(c, qbez([wx + 60, FEET], [700, FEET - 140], [760, HOR + 6]), { color: COL.ink, w: 3, a: fa * (1 - forkK * 0.5), dash: [14, 16], off: -t * 40, glowW: 3 })
      if (forkK > 0) { neon(c, qbez([wx + 120, FEET - 30], [880, FEET - 120], [1080, HOR + 60]), { color: COL.ink, w: 3, a: fa * forkK, dash: [14, 16], off: -t * 40 }); neon(c, qbez([wx + 120, FEET - 30], [500, FEET - 160], [330, HOR + 10]), { color: COL.ink, w: 3, a: fa * forkK, dash: [14, 16], off: -t * 40 }) }
      text(c, '?', 760, HOR - 120 + Math.sin(t * 2) * 10, { font: 'serif', size: 120, color: COL.ink, a: fa * (0.5 + 0.5 * forkK), glow: 30 })
    }
    const apart = sp, walking = t < TH.split + 0.2
    const gx = lerp(wx - 30, 820, apart), gy = lerp(FEET, FEET + 40, apart), bx = lerp(wx + 40, 290, apart), by = lerp(FEET, FEET - 120, apart)
    const fs = 1.55, bs = lerp(1.5, 1.0, apart)
    const figA = 1 - 0.8 * mk_
    const handY = gy - 66 * fs, handMidX = (gx + bx) / 2
    figure(c, bx, by, bs, COL.blue, figA * (1 - 0.3 * apart), { walk: walking ? t * 6 : 0, armTo: apart < 0.15 ? [handMidX - bx, handY] : null, face: apart > 0.3 ? -1 : 1 })
    figure(c, gx, gy, fs, COL.gold, figA, { walk: walking ? t * 6 + 1 : 0, armTo: apart < 0.15 ? [handMidX - gx, handY] : null })
    const la = eOut(prog(t, TH.me, 0.6)) * (1 - prog(t, TH.split - 0.3, 0.5))
    label(c, '我', gx, gy - 280, { color: COL.gold, a: la }); label(c, 'TA', bx, by - 280, { color: COL.blue, a: la })
    const rk = eBack(prog(t, TH.rings, 0.7))
    if (rk > 0 && t < TH.split + 1.5) {
      const ry = 640 - Math.sin(t * 2) * 8
      if (t < TH.split) {
        glow(c, wx + 5, ry, 260, 'gold', 0.5 * rk)
        rings(c, wx + 5, ry, 1.5 * rk, 1, t)
        for (let i = 0; i < 6; i++) { const ph = (t * 0.5 + i / 6) % 1; heart(c, wx + 5 + Math.sin(i * 2 + t) * 120, ry + 60 - ph * 260, 1.2, COL.pink, rk * Math.sin(PI * ph) * 0.9) }
        sparkle(c, wx - 25, ry - 60, 60, 0.6 + 0.4 * Math.sin(t * 6))
      } else {
        const d = t - TH.split
        rings(c, wx + 5, ry, 1.5, 1 - prog(d, 0, 0.7), t, eOut(prog(d, 0, 0.8)))
        burst(c, wx + 5, ry, d, 13, { n: 70, speed: 700, life: 1.2, col: ['gold', 'white', 'blue'], size: 9, grav: 900 })
      }
    }
    const ck = eOut(prog(t, TH.cracks - 0.3, 1.8))
    drawCracks(c, GCRACK, ck, 1 - 0.6 * mk_)
    if (ck > 0) { glow(c, 540, FEET, 400 * ck, 'red', 0.5 * (1 - 0.6 * mk_)); burst(c, 540, FEET, t - TH.cracks, 21, { n: 60, speed: 500, life: 1.5, col: ['coral', 'gold'], size: 7, grav: 600 }) }
    NODES.forEach((n, i) => {
      const k = eBack(prog(t, TH.n[i], 0.7)); if (k <= 0) return
      let x = n.x, y = n.y + (1 - eOut(prog(t, TH.n[i], 0.9))) * 400 + Math.sin(t * 1.6 + i) * 10, r = 86 * k, a = 1
      if (i > 0) a *= 1 - 0.85 * fear
      else { x = lerp(x, 540, mk_); y = lerp(y, 760, mk_); r = lerp(r, 210, mk_) }
      if (a <= 0.01) return
      c.save(); c.globalAlpha *= a
      if (i === 0 && mk_ > 0) godRays(c, x, y, t, 0.08 * mk_, [255, 210, 120], 12, 1100)
      glow(c, x, y, r * 2.6, i === 0 ? 'gold' : i === 1 ? 'cyan' : 'violet', 0.55)
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.7, 'rgba(120,140,200,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0.28)')
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill()
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.stroke()
      if (n.kind === 'coin') coin(c, x, y, r * 0.62, t * (mk_ > 0 ? 3 + 6 * (1 - mk_) : 2.4), 1)
      else if (n.kind === 'flag') { c.save(); c.translate(x, y); c.strokeStyle = rgba(COL.ink); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-18, 46); c.lineTo(-18, -46); c.stroke(); const wv = Math.sin(t * 5) * 6; const fg = c.createLinearGradient(-18, 0, 40, 0); fg.addColorStop(0, '#5ae0ff'); fg.addColorStop(1, '#2a7aff'); c.fillStyle = fg; c.beginPath(); c.moveTo(-18, -46); c.quadraticCurveTo(10, -46 + wv, 40, -32); c.quadraticCurveTo(10, -18 - wv, -18, -16); c.fill(); c.restore(); arrowUp(c, x + 30, y + 40, 50, t) }
      else { cloud(c, x, y - 12, 1.1, 1, true); for (let j = 0; j < 7; j++) { const ph = (t * 1.8 + j / 7) % 1; line(c, [[x - 36 + j * 12, y + 22 + ph * 40], [x - 40 + j * 12, y + 34 + ph * 40]], { color: COL.blue, w: 2.5, a: 1 - ph }) } if (Math.sin(t * 3.1) > 0.93) drawBolt(c, bolt(Math.floor(t * 3), x + 10, y + 10, x - 8, y + 60, 4), 0.9, COL.white, COL.violet, 2.5) }
      c.restore()
      label(c, n.label, x, y + r + 50, { a: a * (i === 0 ? 1 - mk_ : 1), size: 36 })
      const re = eOut(prog(t, TH.re, 0.6)) * (i === 0 ? 1 - mk_ : 1) * a
      if (re > 0) {
        c.save(); c.globalAlpha *= re; c.setLineDash([8, 12]); c.lineDashOffset = -t * 30; c.strokeStyle = rgba(COL.ink, 0.7); c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r + 26, 0, TAU); c.stroke(); c.restore()
        for (let j = 0; j < 3; j++) { const an = t * 1.2 + j * TAU / 3 + i; text(c, '?', x + Math.cos(an) * (r + 40), y + Math.sin(an) * (r + 40), { font: 'serif', size: 40, color: COL.ink, a: re, glow: 12 }) }
      }
    })
    if (mk_ > 0) {
      if (0) goldText(c, '金钱', 540, 1110 + 30 * (1 - eOut(prog(t, TH.money + 0.15, 0.8))), 170, { a: eOut(prog(t, TH.money + 0.15, 0.8)), ls: 24, shine: prog(t, TH.money + 0.5, 1.2) })

    }
    if (fear > 0) { const hb = Math.pow(Math.max(0, Math.sin((t - TH.fear) * 7)), 8); edge(c, [140, 0, 0], 0.35 * fear + 0.25 * hb * fear * (1 - mk_)) }
  }

  // ================================================================== 2 FOG: what comes next
  const FG = { t0: S.fog - 0.5, next: at('f1', '下一步'), unc: at('f2', '不确定性'), afraid: at('f2', '害怕') }
  const CLIFF = [420, 1180]
  const FAN = (() => { const r = rng(7), out = []; for (let i = 0; i < 60; i++) { let y = CLIFF[1] - 40, v = gauss(r) * 2.5; const p = [[CLIFF[0] + 20, y]]; for (let x = CLIFF[0] + 32; x <= 1160; x += 12) { v = v * 0.9 + gauss(r) * 3.4; y += v - 0.6; p.push([x, y]) } out.push(p) } return out })()
  ev(FG.next, 'flicker', { d: 2.4 }); ev(FG.unc, 'thunder', { d: 2.6 }); ev(FG.afraid, 'heartbeat', { d: 2.2 })
  function drawFog(c, t) {
    const fe = eOut(prog(t, FG.afraid, 1.2)), un = eOut(prog(t, FG.unc, 1.0))
    sky(c, [[0, '#02050c'], [0.5, '#0a1a33'], [0.75, '#16304f'], [1, '#050a14']])
    stars(c, t, 0.7 * (1 - un * 0.5), 900)
    glow(c, 820, 360, 160, 'white', 0.5); glow(c, 820, 360, 600, 'blue', 0.25)
    nebula(c, 'fog', t, 0.3 + 0.12 * un, { sc: 5, dx: 30, y0: 700 })
    c.save(); c.fillStyle = '#04070d'; c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, CLIFF[1] - 10); c.quadraticCurveTo(200, CLIFF[1] - 30, CLIFF[0] + 20, CLIFF[1] - 6); c.lineTo(CLIFF[0] - 10, CLIFF[1] + 160); c.lineTo(CLIFF[0] - 60, H); c.closePath(); c.fill()
    c.strokeStyle = 'rgba(120,170,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, CLIFF[1] - 10); c.quadraticCurveTo(200, CLIFF[1] - 30, CLIFF[0] + 20, CLIFF[1] - 6); c.stroke(); c.restore()
    neon(c, qbez([-20, CLIFF[1] - 12], [200, CLIFF[1] - 28], [CLIFF[0], CLIFF[1] - 10]), { color: COL.gold, w: 4, k: eIO(prog(t, FG.t0, 1.4)) })
    if (un > 0) for (let i = 0; i < 4; i++) { const ph = ((t - FG.unc) * 1.3 + i * 0.37) % 1; if (ph < 0.12) { const x = 600 + hash(i * 3 + Math.floor((t - FG.unc) * 1.3)) * 400; drawBolt(c, bolt(i * 7 + Math.floor(t * 1.3), x, 600, x - 60, 1000, 5), (1 - ph / 0.12) * 0.8, COL.white, COL.violet, 3); glow(c, x, 800, 400, 'violet', 0.4 * (1 - ph / 0.12)) } }
    const ca = eOut(prog(t, FG.next, 0.5)) * (1 - 0.6 * un)
    ;[[700, 1000], [760, 1180], [700, 1360]].forEach((e, i) => {
      const fl = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (6 + i * 1.7) + i * 2.1))
      neon(c, qbez([CLIFF[0] + 20, CLIFF[1] - 40], [(CLIFF[0] + e[0]) / 2, CLIFF[1] - 40], e, 20), { color: COL.ink, w: 3, a: ca * fl, dash: [10, 14], off: -t * 30 })
      text(c, '?', e[0] + 50, e[1], { font: 'serif', size: 70, color: COL.ink, a: ca * fl, glow: 20 })
    })
    if (un > 0) FAN.forEach((p, i) => { const k = eOut(prog(t, FG.unc + i * 0.02, 1.6)); neon(c, p, { color: mixc(COL.gold, COL.blue, hash(i)), w: 1.6, a: (0.25 + 0.15 * Math.sin(t * 7 + i)) * (1 - 0.3 * fe), k, glowW: 3, core: false }) })
    nebula(c, 'fog', t + 40, 0.16 + 0.08 * un, { sc: 6, dx: 50, y0: 900 })
    const jx = Math.sin(t * 53) * 3 * fe
    figure(c, CLIFF[0] - 20 + jx, CLIFF[1] - 8, 1.4, COL.gold, 1, { glowA: 1 - 0.6 * fe })
    if (fe > 0) edge(c, [0, 0, 0], 0.75 * fe)
  }

  // ================================================================== 3 CHART -> GAP -> GOLD BARS -> BACK
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
    zin: S.bricks - 0.4, f0: at('b1', '一点一点', -0.2), f1: at('b2', '$现在的积蓄'), on: at('b3', '基础上', -0.3), go: at('b3', '往前走'),
    crumble: at('b4', '突然'), zout: at('b4', '我就会想', -0.3), today: at('b5', '今天的位置', -0.4), years: at('b5', '多少年'),
  }
  const CHIPS = [{ label: '财产分配', icon: 'split' }, { label: '搬家', icon: 'box' }, { label: '重新安排生活', icon: 'cal' }]
  const NC = 24, BH = 0.25
  const COLS = Array.from({ length: NC }, (_, cI) => ({ x0: X(cI / 6), x1: X((cI + 1) / 6), n: Math.round(sav((cI + 0.5) / 6) / BH) }))
  const LOSTROWS = Math.round(LOSS / BH), LOSTC = 17
  const colT = (cI) => lerp(BK.f0, BK.f1, cI / NC)
  const INGOT = (() => {
    const w = 64, h = 32, c = mk(w, h), g = c.getContext('2d')
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff2bf'); gr.addColorStop(0.45, '#f4bf55'); gr.addColorStop(1, '#a8660f')
    g.fillStyle = gr; g.beginPath(); g.moveTo(8, 2); g.lineTo(w - 8, 2); g.lineTo(w - 1, h - 1); g.lineTo(1, h - 1); g.closePath(); g.fill()
    gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr; g.fillRect(8, 3, w - 16, 6)
    g.strokeStyle = 'rgba(110,60,8,0.7)'; g.lineWidth = 1.2; g.stroke()
    return c
  })()
  ev(CH.t0 + 0.2, 'whoosh'); ev(CH.leg1, 'pop'); ev(CH.leg2, 'pop'); ev(CH.start, 'coin'); ev(CH.months, 'coins', { d: 1.6, n: 12 })
  ev(CH.div, 'strike'); CH.b.forEach((t) => ev(t, 'pop')); ev(CH.drop, 'drop'); ev(CH.gap, 'swell', { d: 1.4 }); ev(CH.zero, 'glitch')
  for (let cI = 0; cI < NC; cI++) ev(colT(cI), 'coin', { quiet: 1, i: cI })
  ev(BK.on, 'pop'); ev(BK.crumble, 'crumble', { d: 1.4 }); ev(BK.crumble + 0.62, 'thud'); ev(BK.today, 'chime')
  const yrsN = Math.round(YREC - DIV)
  for (let k = 1; k <= yrsN; k++) ev(BK.years + 0.3 + ((k - 0.4) / yrsN) * 2.2, 'tick')
  shake(CH.div, 26, 0.9); shake(CH.drop, 18, 0.8); shake(BK.crumble, 22, 1.0)
  flash(CH.div, COL.red, 0.7, 0.5); flash(CH.drop, COL.red, 0.35, 0.4)
  function chipIcon(c, kind, x, y) {
    c.save(); c.translate(x, y); c.strokeStyle = rgba(COL.ink); c.lineWidth = 3; c.lineJoin = 'round'
    if (kind === 'split') { coin(c, -10, 0, 15, 0.5); c.strokeStyle = rgba(COL.coral); c.beginPath(); c.moveTo(-10, -18); c.lineTo(-4, 0); c.lineTo(-14, 4); c.lineTo(-8, 18); c.stroke(); coin(c, 16, 6, 11, 1.2) }
    else if (kind === 'box') { c.fillStyle = 'rgba(200,150,90,0.9)'; c.fillRect(-18, -10, 36, 26); c.strokeRect(-18, -10, 36, 26); c.beginPath(); c.moveTo(-18, -10); c.lineTo(-10, -20); c.lineTo(26, -20); c.lineTo(18, -10); c.stroke(); c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 16); c.stroke() }
    else { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(-18, -16, 36, 34); c.fillStyle = rgba(COL.coral); c.fillRect(-18, -16, 36, 9); c.fillStyle = '#333'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c.fillRect(-12 + i * 10, -2 + j * 7, 5, 4) }
    c.restore()
  }
  function drawChart(c, t) {
    const back = eIO(prog(t, BK.zout, 1.4))
    const m = eIO(prog(t, BK.zin, 1.5)) * (1 - back)
    const divK = eOut(prog(t, CH.div, 0.6)), gapK = eOut(prog(t, CH.gap, 0.8))
    const redK = 0.55 * divK * (1 - prog(t, CH.c0, 2.5)) + 0.25 * gapK * (1 - m)
    sky(c, [[0, rgba(mixc([3, 12, 22], [30, 4, 8], redK))], [0.55, rgba(mixc([6, 34, 50], [60, 10, 14], redK))], [1, rgba(mixc([2, 10, 16], [20, 2, 4], redK))]])
    nebula(c, redK > 0.3 ? 'red' : 'teal', t, 0.22)
    dust(c, t, redK > 0.3 ? 'coral' : 'cyan', 0.35)
    const z = lerp(1, 2.05, m), cx = lerp(540, X(2.15), m), cy = lerp(900, Yv(4.3), m)
    c.save(); c.translate(540, 900); c.scale(z, z); c.translate(-cx, -cy)
    const lw = (w) => w / z
    const inB = Math.max(m, prog(t, BK.zin - 0.45, 0.4) * (1 - prog(t, BK.zout + 0.9, 0.5)))
    const ak = eOut(prog(t, CH.t0 + 0.15, 1.0))
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(COL.cyan, 0.07 * ak); c.lineWidth = lw(1)
    for (let yr = 0; yr <= YR; yr++) { c.beginPath(); c.moveTo(X(yr), CY0); c.lineTo(X(yr), CYT - 40); c.stroke() }
    for (let u = 0; u <= UMAX; u += 2) { c.beginPath(); c.moveTo(CX0, Yv(u)); c.lineTo(CX1 + 20, Yv(u)); c.stroke() }
    c.restore()
    neon(c, [[CX0, CY0], [lerp(CX0, CX1 + 30, ak), CY0]], { color: COL.cyan, w: lw(2.5), a: 0.85, glowW: 3 })
    neon(c, [[CX0, CY0], [CX0, lerp(CY0, CYT - 50, ak)]], { color: COL.cyan, w: lw(2.5), a: 0.85, glowW: 3 })
    const la = eOut(prog(t, CH.t0 + 0.7, 0.7)) * (1 - inB)
    label(c, '我的积蓄', CX0 - 10, CYT - 92, { align: 'left', a: la, color: COL.ink , keep: 1 })
    label(c, '时间', CX1 + 30, CY0 + 52, { align: 'right', a: la, color: COL.ink , keep: 1 })
    c.save(); c.globalAlpha *= la; rrect(c, 790, 300, 170, 56, 28); c.strokeStyle = rgba(COL.cyan, 0.8); c.lineWidth = 2; c.shadowColor = rgba(COL.cyan); c.shadowBlur = 12; c.stroke(); c.restore()
    text(c, '假设情境', 875, 329, { size: 28, color: COL.cyan, a: la, ls: 4, weight: 600 })
    const l1 = eOut(prog(t, CH.leg1, 0.5)) * (1 - inB), l2 = eOut(prog(t, CH.leg2, 0.5)) * (1 - inB)
    neon(c, [[190, 1345], [250, 1345]], { color: COL.gold, w: 5, a: l1 }); label(c, '没有离婚', 266, 1347, { size: 32, align: 'left', a: l1 , keep: 1 })
    neon(c, [[520, 1345], [580, 1345]], { color: COL.coral, w: 5, a: l2 }); label(c, '离婚', 596, 1347, { size: 32, align: 'left', a: l2 , keep: 1 })
    const mk2 = prog(t, CH.months, 1.6), nm = Math.floor(120 * mk2)
    if (nm > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(COL.gold, 0.8 * (1 - 0.6 * inB)); c.lineWidth = lw(2); c.beginPath(); for (let i = 1; i <= nm; i++) { const x = X(i / 12), h = i % 12 === 0 ? 18 : 8; c.moveTo(x, CY0); c.lineTo(x, CY0 + h) } c.stroke(); c.restore() }
    for (let i = 0; i < 12; i++) { const ti = CH.months + i * 0.13, d = t - ti; if (d < 0 || d > 0.6) continue; coin(c, X(0), lerp(Yv(S0) - 300, Yv(S0), eIn(clamp(d / 0.35))), 18, d * 18, 1 - clamp((d - 0.35) / 0.25)) }
    const brA = clamp(prog(t, BK.zin + 0.3, 0.6)) * (1 - 0.82 * back)
    if (brA > 0) {
      const crum = t - BK.crumble
      c.save(); c.globalAlpha *= brA
      COLS.forEach((col, cI) => {
        const w = col.x1 - col.x0, grow = eOut(prog(t, colT(cI), 0.35))
        for (let r = 0; r < col.n; r++) {
          const base = r < S0 / BH
          let a = base ? clamp(prog(t, BK.zin + 0.3 + r * 0.04, 0.4)) : grow
          if (!base && grow <= 0) continue
          let y0 = Yv((r + 1) * BH), y1 = Yv(r * BH), dx = 0, dy = 0, rot = 0
          if (!base) { const drop = (1 - grow) * 120; y0 -= drop; y1 -= drop }
          const lost = cI >= LOSTC && r >= col.n - LOSTROWS
          if (lost && crum > 0) { const d = crum - hash(cI * 31 + r) * 0.35; if (d > 0) { dy = 0.5 * 2600 * d * d; dx = (hash(cI * 7 + r) - 0.3) * 260 * d; rot = (hash(r * 13 + cI) - 0.5) * 7 * d; a *= 1 - clamp(d / 1.2) } }
          if (a <= 0.01) continue
          c.save(); c.globalAlpha *= a; c.translate((col.x0 + col.x1) / 2 + dx, (y0 + y1) / 2 + dy); c.rotate(rot)
          c.drawImage(INGOT, -w / 2 + lw(0.6), -(y1 - y0) / 2 + lw(0.6), w - lw(1.2), y1 - y0 - lw(1.2))
          c.restore()
        }
        if (grow > 0 && grow < 1) sparkle(c, (col.x0 + col.x1) / 2, Yv(col.n * BH), lw(40), 1 - grow)
      })
      c.restore()
      if (crum > 0) burst(c, X(3.6), Yv(5.5), crum, 31, { n: 80, speed: lw(500), life: 1.4, col: ['gold', 'white'], size: lw(7), grav: lw(900) })
      const sh = ((t - BK.f0) * 0.5) % 1
      if (t > BK.f0) glow(c, lerp(X(0), X(4), sh), Yv(3), lw(160), 'gold', 0.25 * brA)
    }
    const gk = eIO(prog(t, CH.g0, CH.g1 - CH.g0))
    const postA = (1 - 0.6 * divK + 0.45 * gapK * (1 - inB)) * (1 - 0.9 * back)
    if (t > CH.g0 - 0.1) {
      const pre = GOLDP.slice(0, iDIV + 1), post = GOLDP.slice(iDIV)
      const kPre = clamp(gk / (DIV / YR)), kPost = clamp((gk - DIV / YR) / (1 - DIV / YR))
      const fillP = cut(GOLDP, gk)
      if (fillP.length > 1 && inB < 1) {
        c.save(); c.globalAlpha *= (1 - inB) * (1 - 0.6 * divK); c.beginPath(); c.moveTo(fillP[0][0], CY0); fillP.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(fillP[fillP.length - 1][0], CY0); c.closePath()
        const g = c.createLinearGradient(0, CYT, 0, CY0); g.addColorStop(0, 'rgba(255,190,80,0.32)'); g.addColorStop(1, 'rgba(255,190,80,0)'); c.fillStyle = g; c.fill(); c.restore()
      }
      neon(c, pre, { color: COL.gold, w: lw(5), k: kPre })
      if (kPost > 0) neon(c, post, { color: COL.gold, w: lw(5), k: kPost, a: postA * (1 - inB) })
      const head = cut(GOLDP, gk), hp = head[head.length - 1], hq = head[Math.max(0, head.length - 4)]
      if (gk < 1) comet(c, hp, hq, 'gold', t, 1 / z)
    }
    const sd = eBack(prog(t, CH.start, 0.5))
    if (sd > 0) { coin(c, X(0), Yv(S0), lw(22) * sd, 0.3, 1); label(c, '一开始的积蓄', X(0) + 36, Yv(S0) + 48, { size: 30, align: 'left', color: COL.gold, a: eOut(prog(t, CH.start, 0.6)) * (1 - inB) }) }
    const dA = (1 - inB) * (1 - 0.3 * back)
    if (divK > 0) {
      const d = t - CH.div
      if (d < 0.7) { drawBolt(c, bolt(55, X(DIV) + 30, CYT - 300, X(DIV), Yv(sav(DIV)), 6), (1 - prog(d, 0.1, 0.5)) * dA, COL.white, COL.red, 6); glow(c, X(DIV), Yv(sav(DIV)), 500, 'red', 0.8 * (1 - prog(d, 0, 0.7)) * dA) }
      neon(c, [[X(DIV), CY0], [X(DIV), lerp(CY0, Yv(13.2), divK)]], { color: COL.red, w: lw(2.5), a: 0.9 * dA, dash: [12, 10], off: -t * 30 })
      goldText(c, '离婚', X(DIV), Yv(13.2) - 40, 54, { a: divK * dA, palette: 'red', ls: 8 })
      shockRing(c, X(DIV), Yv(sav(DIV)), d / 0.9, COL.red, 400)
    }
    const fall = t - CH.drop
    CHIPS.forEach((b, j) => {
      const k = eBack(prog(t, CH.b[j], 0.5)); if (k <= 0) return
      const x = X(DIV) + 70, y = Yv(sav(DIV)) - 10 + j * 72
      let dy = 0, rot = 0, a = clamp(prog(t, CH.b[j], 0.3)) * (1 - inB)
      if (fall > 0) { const d = Math.max(0, fall - j * 0.07); dy = 0.5 * 2400 * d * d; rot = (j - 1) * 0.8 * d; a *= 1 - clamp(d / 0.9) }
      if (a <= 0.01) return
      c.save(); c.globalAlpha *= a; c.translate(x + 120, y + dy); c.rotate(rot); c.scale(k, k)
      rrect(c, -110, -34, 68, 68, 34); c.fillStyle = 'rgba(60,8,8,0.85)'; c.fill(); c.strokeStyle = rgba(COL.coral, 0.9); c.lineWidth = 2; c.shadowColor = rgba(COL.red); c.shadowBlur = 16; c.stroke(); c.shadowBlur = 0
      chipIcon(c, b.icon, -88, 0)

      c.restore()
    })
    const dk = eIn(prog(t, CH.drop, 0.3))
    if (dk > 0) {
      neon(c, [[X(DIV), Yv(sav(DIV))], [X(DIV), lerp(Yv(sav(DIV)), Yv(savD(DIV)), dk)]], { color: COL.red, w: lw(5), a: 1 - inB })
      if (fall > 0 && fall < 1.8) for (let i = 0; i < 26; i++) { const h1 = hash(i * 3.3), h2 = hash(i * 7.1); coin(c, X(DIV) + (h1 - 0.5) * 600 * fall, Yv(5) - 400 * h2 * fall + 0.5 * 2400 * fall * fall, lw(16 + h2 * 12), fall * (10 + h1 * 20), (1 - clamp(fall / 1.6)) * (1 - inB)) }
      burst(c, X(DIV), Yv(sav(DIV)), fall, 61, { n: 70, speed: 700, life: 1.0, col: ['red', 'gold'], size: 8, grav: 800, a: 1 - inB })
      const ck = eIO(prog(t, CH.c0, CH.c1 - CH.c0))
      if (ck > 0) { const hd = cut(CORALP, ck); neon(c, CORALP, { color: COL.red, w: lw(5), k: ck, a: 1 - inB }); if (ck < 1) comet(c, hd[hd.length - 1], hd[Math.max(0, hd.length - 4)], 'red', t, 1 / z) }
    }
    if (gapK > 0) {
      c.save(); c.globalAlpha *= gapK * (1 - inB) * (1 - 0.7 * back)
      c.beginPath(); GOLDP.slice(iDIV).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); for (let i = CORALP.length - 1; i >= 0; i--) c.lineTo(CORALP[i][0], CORALP[i][1]); c.closePath()
      c.fillStyle = 'rgba(255,60,40,0.18)'; c.fill(); c.clip()
      c.strokeStyle = 'rgba(255,90,60,0.35)'; c.lineWidth = 3; const off = (t * 40) % 30
      for (let x = X(DIV) - 600; x < X(YR) + 100; x += 30) { c.beginPath(); c.moveTo(x + off, Yv(14)); c.lineTo(x + off + 400, Yv(0)); c.stroke() }
      c.restore()
    }
    const zk = eOut(prog(t, CH.zero, 0.5)) * (1 - inB) * (1 - back)
    if (0 && zk > 0) { const gl = Math.max(0, Math.sin((t - CH.zero) * 40)) * (1 - prog(t, CH.zero, 0.8)) * 8; goldText(c, '从头开始', X(DIV) + 150 + gl, Yv(savD(DIV)) + 80, 48, { a: zk, palette: 'red', ls: 6 }); if (gl > 0) text(c, '从头开始', X(DIV) + 150 - gl, Yv(savD(DIV)) + 80, { size: 48, color: COL.cyan, a: zk * 0.4, weight: 900, font: 'serif', ls: 6 }) }
    const pa = eOut(prog(t, BK.on, 0.5)) * (1 - back)
    if (pa > 0) {
      const topU = (cI) => COLS[cI].n * BH
      const walkK = eIO(prog(t, BK.go, 1.8)), cIdx = lerp(18.5, 23.4, walkK), ci = Math.min(NC - 1, Math.floor(cIdx))
      let fy = Yv(topU(ci)); const fx = lerp(COLS[18].x0, COLS[23].x1, (cIdx - 18) / 6)
      const fallK = eIn(prog(t, BK.crumble + 0.25, 0.4)); fy = lerp(fy, Yv(topU(ci) - LOSS), fallK)
      const fw = eOut(prog(t, BK.on + 0.3, 0.8)) * (1 - prog(t, BK.crumble, 0.3))
      neon(c, GOLDP.slice(iDIV, iDIV + 24), { color: COL.gold, w: lw(3), a: 0.8 * fw, dash: [lw(10), lw(10)], off: -t * 20 })
      figure(c, fx, fy, 0.42, COL.ink, pa, { walk: walkK > 0 && walkK < 1 ? t * 9 : 0, glowA: 0.6 })
    }
    const tk = eOut(prog(t, BK.today, 0.9))
    if (tk > 0) {
      const yT = Yv(sav(DIV))
      neon(c, [[X(DIV), yT], [lerp(X(DIV), X(YR) + 20, tk), yT]], { color: COL.ink, w: 2.5, a: 0.8, dash: [12, 10], off: -t * 20, glowW: 3 })
      label(c, '今天的位置', X(YR) + 20, yT + 42, { size: 30, align: 'right', a: tk })
      const yk = eIO(prog(t, BK.years, 2.4))
      if (yk > 0) {
        const yrNow = lerp(DIV, YREC, yk), p = [X(yrNow), Yv(savD(yrNow))]
        comet(c, p, [X(yrNow - 0.08), Yv(savD(yrNow - 0.08))], 'red', t)
        const bx0 = X(DIV), bx1 = X(yrNow), by = yT - 60
        neon(c, [[bx0, by + 16], [bx0, by], [bx1, by], [bx1, by + 16]], { color: COL.gold, w: 3, a: 0.95 })
        const n = Math.min(yrsN, Math.floor(yrNow - DIV + 0.05))
        hourglass(c, X((DIV + YREC) / 2) - 190, by - 56, 0.15, 1 - yk, yk, eOut(prog(t, BK.years, 0.5)), 0, t)
        label(c, '重新攒回来的时间', X((DIV + YREC) / 2) + 20, by - 52, { size: 34, color: COL.gold, a: eOut(prog(t, BK.years, 0.5)) })
        if (n > 0) goldText(c, `${n}`, bx1 + 34, by - 4, 52, { a: 1, font: 'sans', glowA: 1 })
        if (yk >= 1) shockRing(c, X(YREC), yT, (t - BK.years - 2.4) / 1.0, COL.gold, 120)
      }
    }
    c.restore()
    const mc = clamp(prog(t, BK.f0 - 0.3, 0.4)) * (1 - prog(t, BK.crumble - 0.3, 0.5))
    if (mc > 0) {
      const months = Math.min(48, Math.max(2, Math.floor(prog(t, BK.f0, BK.f1 - BK.f0) * NC + 1) * 2))
      c.save(); c.globalAlpha *= mc; rrect(c, 330, 290, 420, 120, 60); c.fillStyle = 'rgba(30,20,6,0.75)'; c.fill(); c.strokeStyle = rgba(COL.gold, 0.9); c.lineWidth = 2.5; c.shadowColor = rgba(COL.gold); c.shadowBlur = 20; c.stroke(); c.restore()
      text(c, '第', 410, 352, { size: 40, color: COL.ink, a: mc })
      goldText(c, String(months), 540, 348, 84, { a: mc, font: 'sans' })
      text(c, '个月', 660, 352, { size: 40, color: COL.ink, a: mc })
    }
  }

  // ================================================================== 4 “稳定” (golden hour) -> STAIRS
  const ST = {
    t0: S.stable - 0.5, word: at('w1', '稳定'), s0: S.stairs - 0.3, past: at('w2', '过去的积累'), next: at('w2', '下一步'),
    w3a: at('w3', '往前走'), w3b: at('w3', '$建立起来'), cut: at('w4', '打断'), notyet: at('w4', '还没有发生'), afraid: at('w4', '开始害怕'),
  }
  const WORD_PTS = textPoints('“稳定”', 180, 5, 'serif', 12)
  const NSTEP = 6, STX = 80, STW = 120, STH = 92, GROUND = 1290, DEPTH = 34
  const stepT = [ST.s0, ST.s0 + 0.18, ST.s0 + 0.36, ST.next, lerp(ST.w3a, ST.w3b, 0.15), lerp(ST.w3a, ST.w3b, 0.85)]
  ev(ST.word - 0.8, 'swoosh', { d: 0.9 }); ev(ST.word, 'slam', { soft: 1 }); stepT.forEach((t, i) => ev(t, 'step', { i })); ev(ST.cut, 'thunder', { d: 2.0, soft: 1 }); ev(ST.afraid, 'heartbeat', { d: 1.8 })
  flash(ST.word, COL.gold, 0.3, 0.5)
  function block(c, x, yTop, w, k, hot = 0) {
    const yT = GROUND - (GROUND - yTop) * k
    c.save()
    let g = c.createLinearGradient(0, yT, 0, GROUND); g.addColorStop(0, `rgba(255,${200 + 30 * hot},120,0.9)`); g.addColorStop(1, 'rgba(150,80,20,0.85)')
    c.fillStyle = g; c.fillRect(x, yT, w, GROUND - yT)
    g = c.createLinearGradient(0, yT - DEPTH * 0.6, 0, yT); g.addColorStop(0, '#fff6d2'); g.addColorStop(1, '#ffd27a')
    c.fillStyle = g; c.beginPath(); c.moveTo(x, yT); c.lineTo(x + DEPTH, yT - DEPTH * 0.6); c.lineTo(x + w + DEPTH, yT - DEPTH * 0.6); c.lineTo(x + w, yT); c.closePath(); c.fill()
    g = c.createLinearGradient(x + w, 0, x + w + DEPTH, 0); g.addColorStop(0, '#9a5a14'); g.addColorStop(1, '#5a3008')
    c.fillStyle = g; c.beginPath(); c.moveTo(x + w, yT); c.lineTo(x + w + DEPTH, yT - DEPTH * 0.6); c.lineTo(x + w + DEPTH, GROUND - DEPTH * 0.6); c.lineTo(x + w, GROUND); c.closePath(); c.fill()
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,230,160,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, yT); c.lineTo(x + w, yT); c.lineTo(x + w + DEPTH, yT - DEPTH * 0.6); c.stroke()
    c.restore()
  }
  function drawStable(c, t) {
    const up = eIO(prog(t, ST.s0, 1.0)), fe = eOut(prog(t, ST.afraid, 1.2)), storm = eOut(prog(t, ST.cut, 1.4))
    sky(c, [[0, rgba(mixc([20, 10, 4], [10, 8, 18], storm))], [0.55, rgba(mixc([110, 50, 12], [40, 20, 40], storm))], [0.68, rgba(mixc([255, 170, 70], [120, 60, 60], storm))], [0.7, rgba(mixc([60, 30, 10], [30, 16, 20], storm))], [1, '#0c0703']])
    godRays(c, 540, -100, t, 0.08 * (1 - storm * 0.7), [255, 200, 120], 12, 2400)
    nebula(c, 'amber', t, 0.25 * (1 - storm))
    dust(c, t, 'gold', 0.5)
    const wk = eIO(prog(t, ST.word - 0.9, 1.0))
    const wy = lerp(820, 330, up), ws = lerp(180, 80, up)
    if (wk > 0 && wk < 1) particleText(c, WORD_PTS, 540, 820, wk, 9, { col: 'gold', spread: 700, r: 2.4 })
    if (wk >= 1) {
      if (up < 0.6) goldText(c, '“稳定”', 540, wy, ws, { ls: lerp(12, 6, up), shine: prog(t, ST.word + 0.1, 1.2), a: 1 - 0.3 * up })
      neon(c, [[160, 960], [920, 960]], { color: COL.gold, w: 3, a: (1 - up) * eOut(prog(t, ST.word + 0.3, 0.8)) })
    }
    if (t < ST.s0 - 0.2) return
    neon(c, [[40, GROUND], [1040, GROUND]], { color: COL.gold, w: 2, a: eOut(prog(t, ST.s0 - 0.2, 0.6)) * 0.7, glowW: 3 })
    glow(c, 540, GROUND, 700, 'gold', 0.18)
    for (let i = 0; i < NSTEP; i++) {
      const k = eBack(prog(t, stepT[i], 0.55)); if (k <= 0) continue
      const x = STX + i * STW, yTop = GROUND - (i + 1) * STH
      block(c, x, yTop, STW - 6, Math.min(1, k), i === NSTEP - 1 ? 0.5 : 0)
      const d = t - stepT[i]
      if (d > 0 && d < 1) burst(c, x + STW / 2, GROUND, d, 70 + i, { n: 10, speed: 160, life: 0.7, col: 'gold', size: 4, grav: 300 })
    }
    const pa = eOut(prog(t, ST.past, 0.6)) * (1 - prog(t, ST.cut - 0.5, 0.6))
    neon(c, [[STX + 6, GROUND + 30], [STX + 6, GROUND + 42], [STX + 3 * STW - 12, GROUND + 42], [STX + 3 * STW - 12, GROUND + 30]], { color: COL.ink, w: 2, a: pa, glowW: 2 })
    label(c, '过去的积累', STX + 1.5 * STW, GROUND + 86, { size: 34, a: pa })
    const na = eOut(prog(t, ST.next, 0.5)) * (1 - prog(t, ST.w3a, 0.6))
    label(c, '下一步', STX + 3.5 * STW, GROUND - 4 * STH - 90, { size: 38, color: COL.gold, a: na })
    if (storm > 0) {
      const fl = 0.55 + 0.45 * Math.sin(t * 9), x = STX + NSTEP * STW, y = GROUND - 3 * STH
      c.save(); c.globalAlpha *= storm * fl; c.setLineDash([10, 9]); c.lineDashOffset = -t * 20
      c.fillStyle = 'rgba(255,80,60,0.08)'; c.fillRect(x, y, STW - 14, GROUND - y); c.strokeStyle = rgba(COL.red); c.lineWidth = 2.6; c.shadowColor = rgba(COL.red); c.shadowBlur = 16; c.strokeRect(x, y, STW - 14, GROUND - y); c.restore()
      drawCracks(c, [[[x + 10, y + 10], [x + 40, y + 60], [x + 20, y + 110], [x + 60, y + 180], [x + 40, y + 260]]], storm, 0.9 * fl)
      label(c, '还没有发生', x + STW / 2 - 14, y - 40, { size: 30, color: COL.coral, a: eOut(prog(t, ST.notyet, 0.5)) })
      for (let i = 0; i < 9; i++) cloud(c, lerp(1500 + i * 120, 60 + i * 130, storm) + Math.sin(t * 0.5 + i) * 20, 250 + (i % 3) * 70, 2.6 + (i % 2) * 0.8, 0.8 * storm, true)
      if (Math.sin(t * 2.3) > 0.95) { drawBolt(c, bolt(Math.floor(t * 2.3), 820, 420, 760, 860, 5), 0.9 * storm, COL.white, COL.violet, 4); glow(c, 800, 600, 500, 'violet', 0.5 * storm) }
    }
    let cur = 0
    for (let i = 0; i < NSTEP; i++) if (t >= stepT[i] + 0.25) cur = i
    const hop = prog(t, stepT[cur] + 0.25, 0.42), prev = Math.max(0, cur - 1)
    const fx = lerp(STX + prev * STW + STW * 0.45, STX + cur * STW + STW * 0.45, cur ? eIO(hop) : 1)
    const fy = lerp(GROUND - (prev + 1) * STH, GROUND - (cur + 1) * STH, cur ? eIO(hop) : 1) - (cur ? Math.sin(PI * hop) * 40 : 0) - DEPTH * 0.3
    figure(c, fx + Math.sin(t * 47) * 2.5 * fe, fy, 0.75, COL.ink, eOut(prog(t, ST.s0 + 0.3, 0.5)), { walk: hop > 0 && hop < 1 ? t * 10 : 0, glowA: 0.8 })
    if (fe > 0) edge(c, [90, 10, 0], 0.55 * fe)
  }

  // ================================================================== 5 HOURGLASS -> A CHOICE THAT REWINDS
  const SA = { t0: S.sand - 0.5, today: at('u1', '今天积累'), keep: at('u1', '留得住'), u2: at('u2'), choose: at('u2', '选择'), day: at('u2', '有一天'), restart: at('u2', '重新开始') }
  ev(SA.today, 'sand', { d: 3.0, quiet: 1 }); ev(SA.keep - 0.4, 'shatter', { soft: 1 }); ev(SA.keep - 0.2, 'sand', { d: 3.0 }); ev(SA.choose, 'pop'); ev(SA.restart - 0.25, 'rewind', { d: 1.2 })
  shake(SA.restart - 0.2, 10, 0.8); flash(SA.restart - 0.2, COL.coral, 0.3, 0.4)
  function drawSand(c, t) {
    sky(c, [[0, '#07040f'], [0.5, '#25103a'], [0.75, '#5a1d48'], [1, '#12061a']])
    stars(c, t, 0.8)
    nebula(c, 'violet', t, 0.35)
    bokeh(c, t, ['violet', 'pink'], 0.25)
    const ba = eOut(prog(t, SA.t0, 0.8)) * (1 - eIO(prog(t, SA.u2 - 0.1, 0.8)))
    if (ba > 0) {
      const leak = prog(t, SA.keep - 0.2, 3.5), flow = prog(t, SA.t0, 9)
      const top = clamp(0.85 - flow * 0.5), bot = clamp(0.2 + flow * 0.45 - leak * 0.5)
      glow(c, 540, 820, 520, 'gold', 0.3 * ba)
      hourglass(c, 540, 820, 1.55, top, bot, ba, eOut(prog(t, SA.keep - 0.4, 0.4)), t)
      label(c, '今天积累起来的', 540, 400, { size: 44, color: COL.gold, a: ba * eOut(prog(t, SA.today, 0.6)) })
      if (t > SA.keep - 0.2) for (let i = 0; i < 160; i++) {
        const t0 = SA.keep - 0.2 + hash(i) * 3.2, d = t - t0; if (d < 0 || d > 2.4) continue
        const x = 540 + 0.4 * 1.55 * 120 + d * (180 + hash(i * 3) * 380) + Math.sin(d * 3 + i) * 20, y = 820 + 0.75 * 1.55 * 210 + 0.5 * 300 * d * d - d * 60 * hash(i * 7)
        glow(c, x, y, 5 + 4 * hash(i * 5), 'gold', ba * (1 - d / 2.4))
      }
      text(c, '?', 860, 1180, { font: 'serif', size: 110, color: COL.ink, a: ba * eOut(prog(t, SA.keep, 0.6)), glow: 30 })
    }
    const fa = eOut(prog(t, SA.u2 + 0.2, 0.7))
    if (fa > 0) {
      const N0 = [200, 1080], up = [[200, 1080], [400, 1060], [560, 860]], dn = [[200, 1080], [400, 1100], [560, 1280]]
      const ck = eOut(prog(t, SA.choose, 0.5)), rw = eIO(prog(t, SA.restart - 0.2, 1.0))
      neon(c, qbez(...up), { color: ck ? COL.gold : COL.ink, w: ck ? 5 : 3, a: fa * (ck ? 1 : 0.7), dash: ck ? null : [10, 12] })
      neon(c, qbez(...dn), { color: COL.ink, w: 3, a: fa * (1 - 0.6 * ck), dash: [10, 12] })
      const onK = eIO(prog(t, SA.day - 0.2, 1.8))
      const path = [...qbez(...up, 20), ...qbez([560, 860], [720, 760], [900, 720], 20).slice(1)]
      const kk = (0.45 + 0.55 * onK) * ck * (1 - rw)
      const hp = neon(c, path, { color: COL.gold, w: 6, k: kk, a: fa })
      if (kk > 0.01) comet(c, hp, null, 'gold', t)
      glow(c, N0[0], N0[1], 30, 'white', fa)
      label(c, '选择', 200, 1010, { size: 34, a: fa * ck })
      if (rw > 0) {
        const ra = eOut(prog(t, SA.restart - 0.2, 0.5))
        clockFace(c, 760, 560, 150, -TAU * 6 * eIO(prog(t, SA.restart - 0.3, 1.6)), ra)

        c.save(); c.globalAlpha *= ra; c.strokeStyle = rgba(COL.coral); c.lineWidth = 6; c.lineCap = 'round'; c.shadowColor = rgba(COL.red); c.shadowBlur = 20
        c.beginPath(); c.arc(N0[0], N0[1], 60, -PI * 0.15, -PI * 0.15 - TAU * 0.8 * rw, true); c.stroke(); c.restore()
        glow(c, N0[0], N0[1], 120, 'coral', ra * (0.6 + 0.4 * Math.sin(t * 8)))
      }
    }
  }

  // ================================================================== 6 TWO CARDS, struck by lightning
  const CC = { t0: S.choice - 0.5, no: at('x1', '不结婚'), bomb: at('x1', '爆雷'), love: at('x2', '只谈恋爱'), age: at('x2', '尤其'), thirty: at('x2', '30') }
  const AGE0 = 18, AGE1 = 34, AX0 = 110, AX1 = 970, AY = 1300
  const AX = (a) => AX0 + ((AX1 - AX0) * (a - AGE0)) / (AGE1 - AGE0)
  ev(CC.t0 + 0.4, 'card'); ev(CC.t0 + 0.65, 'card'); ev(CC.no, 'chime'); ev(CC.bomb, 'strike'); ev(CC.age, 'whoosh'); ev(CC.thirty, 'slam', { soft: 1 })
  shake(CC.bomb, 30, 1.0); flash(CC.bomb, COL.white, 0.75, 0.5)
  function drawChoice(c, t) {
    sky(c, [[0, '#03050c'], [0.6, '#0b1430'], [1, '#04060c']])
    stars(c, t, 0.5)
    nebula(c, 'blue', t, 0.2)
    for (const [x, col] of [[320, [255, 190, 120]], [760, [160, 190, 255]]]) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(x, -100, x, 1300); g.addColorStop(0, rgba(col, 0.18)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(x - 40, -100); c.lineTo(x + 40, -100); c.lineTo(x + 260, 1300); c.lineTo(x - 260, 1300); c.closePath(); c.fill(); c.restore() }
    const lift = eIO(prog(t, CC.age, 0.8)), noK = eOut(prog(t, CC.no, 0.6)), bk = t - CC.bomb
    const cards = [{ x: 320, label: '亲密关系', at: CC.t0 + 0.4 }, { x: 760, label: '结婚', at: CC.t0 + 0.65 }]
    cards.forEach((cd, i) => {
      const k = eBack(prog(t, cd.at, 0.7)); if (k <= 0) return
      const y = 760 - 70 * lift + Math.sin(t * 1.4 + i) * 8, w = 360, h = 480
      const flip = i === 1 ? noK : 0, tilt = (i === 0 ? -0.05 : 0.05) + Math.sin(t * 0.9 + i) * 0.03
      const shk = i === 1 && bk > 0 && bk < 0.6 ? Math.sin(t * 70) * 12 * (1 - bk / 0.6) : 0
      c.save(); c.translate(cd.x + shk, y); c.rotate(tilt); c.scale(k * (1 - 0.06 * flip), k)
      glow(c, 0, 0, 380, i === 0 ? 'gold' : 'blue', (i === 0 ? 0.35 + 0.35 * noK : 0.35 * (1 - flip)))
      const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
      if (i === 0) { g.addColorStop(0, '#3a1a2a'); g.addColorStop(1, '#170a14') } else { g.addColorStop(0, rgba(mixc([30, 40, 70], [30, 30, 34], flip))); g.addColorStop(1, rgba(mixc([10, 14, 30], [14, 14, 16], flip))) }
      rrect(c, -w / 2, -h / 2, w, h, 30); c.fillStyle = g; c.fill()
      const bg = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); bg.addColorStop(0, '#fff1c0'); bg.addColorStop(0.5, '#c98a22'); bg.addColorStop(1, '#ffe08a')
      c.strokeStyle = i === 1 ? rgba(mixc([255, 220, 150], [90, 90, 96], flip)) : bg; c.lineWidth = 4; c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5; rrect(c, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 22); c.stroke()
      if (i === 0) {
        figure(c, -34, 30, 0.95, COL.gold, 1, { armTo: [34, -60], glowA: 0.5 }); figure(c, 34, 30, 0.95, COL.blue, 1, { armTo: [-34, -60], face: -1, glowA: 0.5 })
        for (let j = 0; j < 5; j++) { const ph = (t * 0.45 + j / 5) % 1; heart(c, -90 + j * 45, -40 - ph * 140, 1.1, COL.pink, (0.4 + noK * 0.6) * Math.sin(PI * ph)) }
      } else rings(c, 0, -50, 1.5, 1 - 0.6 * flip, t)
      c.restore()
      if (0) goldText(c, cd.label, cd.x + shk, y + 170, cd.label.length > 2 ? 62 : 80, { a: clamp(prog(t, cd.at, 0.3)) * (i === 1 ? 1 - 0.6 * flip : 1), palette: i === 1 && flip > 0.5 ? 'silver' : 'gold', ls: 6, shine: i === 0 ? prog(t, CC.no, 1.2) : -1 })
    })
    if (bk > 0 && bk < 1.6) {
      drawBolt(c, bolt(88, 820, -60, 760, 700 - 70 * lift, 6), 1 - prog(bk, 0.15, 0.5), COL.white, COL.blue, 7)
      burst(c, 760, 700, bk, 99, { n: 140, speed: 1100, life: 1.3, col: ['coral', 'gold', 'white', 'red'], size: 11, grav: 700 })
      glow(c, 760, 700, 600, 'coral', 0.8 * (1 - prog(bk, 0, 1.0)))
      shockRing(c, 760, 700, bk / 1.0, COL.coral, 800)
    }
    if (bk > 0.2) drawCracks(c, crackPaths(5, 760, 640 - 70 * lift, 5, 160), eOut(prog(bk, 0.2, 0.5)), 0.85)
    const rk = eOut(prog(t, CC.age, 0.9))
    if (rk > 0) {
      neon(c, [[AX0, AY], [lerp(AX0, AX1, rk), AY]], { color: COL.ink, w: 2.5, a: 0.8, glowW: 3 })
      for (let a = AGE0; a <= AGE1; a++) { if (AX(a) > lerp(AX0, AX1, rk) + 1) break; line(c, [[AX(a), AY], [AX(a), AY + (a % 2 === 0 ? 18 : 9)]], { color: COL.ink, w: 2, a: 0.7 }) }
      for (const a of [18, 22, 26, 30, 34]) label(c, `${a}`, AX(a), AY + 54, { size: 30, color: a === 30 ? COL.coral : COL.dim, a: clamp((lerp(AX0, AX1, rk) - AX(a) + 30) / 60), keep: 1 })
      text(c, '岁', AX1 + 6, AY + 54, { size: 28, color: COL.dim, align: 'left', a: rk })
      const hk = eIO(prog(t, CC.thirty - 0.4, 1.1))
      if (hk > 0) {
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(AX0, 0, AX(30), 0); g.addColorStop(0, 'rgba(255,190,80,0.15)'); g.addColorStop(1, 'rgba(255,190,80,0.55)'); c.fillStyle = g; c.fillRect(AX0, AY - 18, (AX(30) - AX0) * hk, 18); c.restore()
        comet(c, [lerp(AX0, AX(30), hk), AY - 9], [lerp(AX0, AX(30), hk) - 20, AY - 9], 'gold', t, 0.8)
        neon(c, [[AX(30), AY - 110], [AX(30), AY + 24]], { color: COL.red, w: 3, a: hk, dash: [8, 7] })
        if (0) goldText(c, '30 岁之前', (AX0 + AX(30)) / 2, AY - 70, 56, { a: hk, font: 'sans', shine: prog(t, CC.thirty + 0.3, 1.0) })
      }
    }
  }

  // ================================================================== 7 THE STARS: who you want to become
  const CP = { t0: S.compass - 0.5, who: at('d1', '什么样的人'), dir: at('d2', '方向'), strat: at('d2', '战略'), tac: at('d2', '策略'), act: at('d2', '付诸行动'), all: at('d3', '所有的行为'), serve: at('d3', '服务于'), dir2: at('d3', '方向') }
  const NSTAR = [540, 300]
  const TREE = (() => { const lv1 = [[540, 620]], lv2 = [[290, 850], [540, 880], [790, 850]], lv3 = []; lv2.forEach((p, i) => { for (let j = 0; j < 4; j++) lv3.push({ p: [p[0] + (j - 1.5) * 62 + (hash(i * 4 + j) - 0.5) * 20, 1090 + hash(i * 9 + j) * 70], from: p }) }); return { lv1, lv2, lv3 } })()
  const FLOW = (() => { const r = rng(15); return Array.from({ length: 260 }, () => ({ x: r() * W, y: 500 + r() * 1100, a0: r() * TAU, sp: 0.6 + r() * 0.8, ph: r() })) })()
  ev(CP.t0 + 0.3, 'shimmer', { d: 2 }); ev(CP.who, 'shimmer', { d: 1.8 }); ev(CP.dir, 'chime'); ev(CP.strat, 'pop'); ev(CP.tac, 'pop'); ev(CP.act, 'coins', { d: 1.0, n: 12, soft: 1 }); ev(CP.serve, 'swell', { d: 2.0 }); ev(CP.dir2, 'slam', { soft: 1 })
  function drawCompass(c, t) {
    sky(c, [[0, '#010208'], [0.5, '#0a0c24'], [1, '#03030a']])
    c.save(); c.translate(540, 900); c.rotate(-0.5); c.translate(-540, -900); nebula(c, 'violet', t, 0.45, { sc: 5.5, dx: 6 }); nebula(c, 'blue', t + 30, 0.3, { sc: 4, dx: 4 }); c.restore()
    stars(c, t, 1)
    const d1 = 1 - eIO(prog(t, CP.dir - 0.6, 0.9))
    const fk = eOut(prog(t, CP.who, 1.4))
    if (d1 > 0) {
      c.save(); c.globalAlpha *= d1
      figure(c, 230, 1380, 1.1, COL.gold, eOut(prog(t, CP.t0 + 0.3, 0.6)), { glowA: 1 })
      label(c, '我', 230, 1430, { color: COL.gold })
      constellation(c, 720, 1050, 3.4, fk, t, 1)
      label(c, '想成为的人', 720, 1110, { size: 34, color: COL.cyan, a: fk })
      neon(c, cbez([290, 1300], [420, 1200], [520, 1100], [640, 1000]), { color: COL.ink, w: 2, dash: [4, 14], a: 0.6 * fk, k: fk, glowW: 2 })
      c.restore()
    }
    const sa = Math.max(fk * d1 * 0.9, eOut(prog(t, CP.dir - 0.3, 0.6)))
    const sx = lerp(720, NSTAR[0], 1 - d1), sy = lerp(560, NSTAR[1], 1 - d1)
    star4(c, sx, sy, 34 + 6 * Math.sin(t * 3), COL.gold, sa, t * 0.2)
    const cA = eOut(prog(t, CP.dir - 0.3, 0.6)) * (1 - eIO(prog(t, CP.all - 0.2, 0.8)))
    const treeK1 = eOut(prog(t, CP.strat, 0.8))
    if (cA > 0) {
      const lock = prog(t, CP.dir, 1.6), needle = Math.sin((t - CP.dir) * 9) * 1.4 * Math.exp(-(t - CP.dir) * 2.2) * (t > CP.dir ? 1 : 0) + (t < CP.dir ? Math.sin(t * 5) * 1.2 : 0)
      const cy = lerp(880, 1330, treeK1), R = lerp(230, 110, treeK1)
      compassDraw(c, 540, cy, R, needle, t, cA)
      if (lock > 0.5) neon(c, [[540, cy - R * 0.7], [540, NSTAR[1] + 40]], { color: COL.gold, w: 2, a: cA * (lock - 0.5) * 2 * (1 - treeK1), dash: [6, 10], off: -t * 40 })
    }
    const treeA = 1 - eIO(prog(t, CP.all - 0.2, 0.8))
    const lab = (s, y, at0) => 0 && text(c, s, 100, y, { size: 38, color: t < at0 + 1.6 ? COL.gold : COL.dim, a: eOut(prog(t, at0, 0.5)) * treeA, align: 'left', ls: 6, weight: 600, glow: 14 })
    lab('方向', NSTAR[1], CP.dir)
    const k2 = eOut(prog(t, CP.tac, 0.8)), k3 = eOut(prog(t, CP.act, 1.0))
    c.save(); c.globalAlpha *= treeA
    if (treeK1 > 0) { neon(c, [[NSTAR[0], NSTAR[1] + 40], TREE.lv1[0]], { color: COL.gold, w: 10, k: treeK1 }); lab('战略', 560, CP.strat) }
    if (k2 > 0) { TREE.lv2.forEach((p) => neon(c, qbez(TREE.lv1[0], [lerp(540, p[0], 0.3), 760], p, 20), { color: COL.gold, w: 6, k: k2 })); lab('策略', 800, CP.tac) }
    if (k3 > 0) { TREE.lv3.forEach((q, i) => { const kk = clamp(k3 * 1.4 - i * 0.03); neon(c, qbez(q.from, [lerp(q.from[0], q.p[0], 0.2), q.p[1] - 80], q.p, 12), { color: COL.gold, w: 2.6, k: kk }); if (kk > 0.6) glow(c, q.p[0], q.p[1], 16, 'gold', 1) }); lab('行动', 1120, CP.act) }
    if (k3 > 0.5) TREE.lv3.forEach((q, i) => { const ph = (t * 0.8 + hash(i)) % 1; const pts = [[NSTAR[0], NSTAR[1] + 40], TREE.lv1[0], q.from, q.p]; const seg = Math.min(2, Math.floor(ph * 3)), f = ph * 3 - seg; glow(c, lerp(pts[seg][0], pts[seg + 1][0], f), lerp(pts[seg][1], pts[seg + 1][1], f), 12, 'white', 0.8) })
    c.restore()
    const fa = eOut(prog(t, CP.all - 0.2, 0.8))
    if (fa > 0) {
      const k = eIO(prog(t, CP.serve - 0.3, 1.6))
      FLOW.forEach((f) => {
        const ang = Math.atan2(NSTAR[1] - f.y, NSTAR[0] - f.x)
        const ph = ((t - CP.all) * 0.35 * f.sp + f.ph) % 1
        const dist = Math.hypot(NSTAR[0] - f.x, NSTAR[1] - f.y)
        const x = f.x + Math.cos(ang) * dist * ph * k + Math.cos(f.a0 + t) * 20 * (1 - k), y = f.y + Math.sin(ang) * dist * ph * k + Math.sin(f.a0 + t) * 20 * (1 - k)
        const a = fa * (k > 0 ? lerp(0.6, Math.sin(PI * ph), k) : 0.6)
        const L2 = 18 + 18 * k, aa = lerp(f.a0 + t * 0.5, ang, k)
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(mixc(COL.cyan, COL.gold, k), 0.8 * a); c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - Math.cos(aa) * L2, y - Math.sin(aa) * L2); c.lineTo(x, y); c.stroke(); c.restore()
        glow(c, x, y, 7, k > 0.5 ? 'gold' : 'cyan', a)
      })
      shockRing(c, NSTAR[0], NSTAR[1], prog(t, CP.dir2, 1.4), COL.gold, 500)
      godRays(c, NSTAR[0], NSTAR[1], t, 0.18 * fa, [255, 210, 140], 16, 1800)
    }
  }

  // ================================================================== 8 THE WALK -> THE PEN -> SILENCE -> ROOTS
  const J = {
    t0: S.walk - 0.5, many: at('t1', '多谈恋爱'), manyEnd: at('t1', '$不同的人', 1.2), self: at('t2', '了解自己'), partner: at('t2', '伴侣', -0.6),
    support: at('t3', '互相支持'), sweet: at('t3', '添一点甜'), spice: at('p1', '调味剂', -0.3), boost: at('p2', '助力'),
    pen: at('p3', '主动权', -0.2), grip: at('p3', '紧紧握'), pain0: at('p4', '承受', -0.2), pain1: at('p4', '$痛苦', 0.4),
    silent: S.silent - 0.3, effort: at('r2', '很多努力'), noresult: at('r2', '得不到结果'), call: at('r3', '叫作', -0.4), root: at('r3', '扎根'),
  }
  const GY = 1250, HEADSX = 540
  const vel = (t) => {
    let v = 150
    if (t > J.boost) v = lerp(150, 260, eIO(prog(t, J.boost, 0.6))) * (1 - eIO(prog(t, J.boost + 2.8, 1.5))) + 150 * eIO(prog(t, J.boost + 2.8, 1.5))
    if (t > J.pain0) v = lerp(v, 90, eIO(prog(t, J.pain0, 0.6))) * (1 - eIO(prog(t, J.pain1, 0.8))) + v * eIO(prog(t, J.pain1, 0.8))
    if (t > J.silent) v = lerp(v, 95, eIO(prog(t, J.silent, 1.5)))
    if (t > J.call) v *= 1 - eIO(prog(t, J.call, 1.6))
    return v
  }
  const DT = 1 / 120, HX = [200]
  for (let t = J.t0; t < TOTAL + 1; t += DT) HX.push(HX[HX.length - 1] + vel(t) * DT)
  const hxAt = (t) => { const f = (t - J.t0) / DT; if (f <= 0) return HX[0]; const i = Math.floor(f); if (i >= HX.length - 1) return HX[HX.length - 1]; return lerp(HX[i], HX[i + 1], f - i) }
  const camX = (t) => Math.max(0, hxAt(t) - HEADSX)
  const XJ = { support: hxAt(J.support), pain0: hxAt(J.pain0), pain1: hxAt(J.pain1), silent: hxAt(J.silent) }
  const OTHERS = [0, 1, 2, 3, 4].map((i) => { const tc = lerp(J.many, J.manyEnd, i / 4); return { tc, x: hxAt(tc) + 260, col: [COL.violet, COL.pink, COL.cyan, COL.green, COL.coral][i] } })
  const pathY = (x) => { let y = GY; if (x > XJ.pain0 && x < XJ.pain1) { const e = Math.sin(PI * (x - XJ.pain0) / (XJ.pain1 - XJ.pain0)); y += 34 * e * (2 * Math.abs(((x / 24) % 2) - 1) - 1) } return y }
  const TICKS = []
  for (let t = J.silent + 0.9; t < J.call + 0.4; t += 0.2) TICKS.push({ t, x: hxAt(t) - 30 })
  const RCX = (TICKS[0].x + TICKS[TICKS.length - 1].x) / 2
  const ROOTS = TICKS.map((tk, i) => {
    const r = rng(1000 + i), segs = []
    const grow = (x, y, ang, len, depth, t0, w) => {
      const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len, dur = 0.25 + len / 700
      segs.push({ x0: x, y0: y, x1, y1, t0, dur, w })
      if (depth <= 0) return
      const n = depth > 2 ? 2 : 1 + (r() < 0.6 ? 1 : 0)
      for (let k = 0; k < n; k++) grow(x1, y1, PI / 2 + clamp(ang - PI / 2 + (r() - 0.5) * 1.3, -1.1, 1.1), len * (0.62 + r() * 0.3), depth - 1, t0 + dur * (0.6 + r() * 0.3), w * 0.68)
    }
    grow(tk.x, GY + 4, PI / 2 + (r() - 0.5) * 0.5, 90 + r() * 120, 3 + Math.floor(r() * 3), (i / TICKS.length) * 1.3 + r() * 0.3, 3.4 + r() * 1.8)
    return segs
  })
  const rootLayer = mk(W, H)
  OTHERS.forEach((o) => ev(o.tc, 'pass'))
  ev(J.partner + 0.4, 'join'); ev(J.sweet, 'shimmer', { d: 1.6 }); ev(J.spice, 'sprinkle', { d: 2.2 }); ev(J.boost, 'wind', { d: 2.6 })
  ev(J.pen, 'swoosh', { d: 0.6 }); ev(J.grip, 'slam', { soft: 1 }); ev(J.pain0, 'pain', { d: J.pain1 - J.pain0 }); ev(J.silent, 'hush'); ev(J.silent + 0.5, 'rain', { d: J.call - J.silent })
  TICKS.forEach((tk, i) => { if (i % 2 === 0) ev(tk.t, 'tick', { quiet: 1 }) })
  ev(J.call, 'root', { d: 4.5 }); ev(J.root, 'final'); ev(J.root + 1.4, 'sprout')
  shake(J.pain0 + 0.3, 8, 1.2); shake(J.root, 22, 1.2); flash(J.root, COL.gold, 0.5, 0.8)
  function drawJourney(c, t) {
    const hx = hxAt(t), pan = eIO(prog(t, J.call, 2.4)), camY = 640 * pan
    const cx = lerp(camX(t), RCX - 540, pan)
    const silentK = eIO(prog(t, J.silent, 1.5)), dawn = eIO(prog(t, J.root - 0.4, 2.5)), painK = win(t, J.pain0, J.pain1 + 0.6, 0.5, 0.6)
    const top = mixc(mixc([30, 12, 50], [6, 8, 20], silentK), [34, 16, 52], dawn), mid = mixc(mixc([110, 40, 90], [16, 22, 44], silentK), [170, 70, 80], dawn)
    sky(c, [[0, rgba(top)], [0.45 - 0.33 * pan, rgba(mid)], [0.6 - 0.33 * pan, rgba(mixc(mid, [255, 150, 90], dawn * 0.55))], [1, '#08060a']])
    stars(c, t, 0.8 * (1 - silentK * 0.6) * (1 - dawn), 1100)
    nebula(c, dawn > 0.3 ? 'amber' : silentK > 0.5 ? 'blue' : 'magenta', t, 0.25)
    if (dawn > 0) { glow(c, 540, GY - camY - 10, 500, 'gold', 0.18 * dawn); godRays(c, 540, GY - camY, t, 0.07 * dawn, [255, 200, 130], 14, 1500) }
    // moon and two ranges of hills, drifting slower than the ground
    glow(c, 210, 420 - camY * 0.4, 70, 'white', 0.55 * (1 - dawn)); glow(c, 210, 420 - camY * 0.4, 260, 'violet', 0.25 * (1 - dawn))
    ridge(c, -cx * 0.15, GY - camY, 330, [50, 22, 70], 3, 0.9)
    ridge(c, -cx * 0.35, GY - camY, 190, [32, 14, 44], 8, 1)
    star4(c, 940, 300 - camY * 0.3, 16 + 3 * Math.sin(t * 2.5), COL.gold, eOut(prog(t, J.t0 + 0.4, 1)) * (1 - 0.6 * silentK) * (1 - pan * 0.5))
    if (painK > 0) edge(c, [120, 0, 0], 0.35 * painK)
    c.save(); c.translate(-cx, -camY)
    const gg = c.createLinearGradient(0, GY, 0, GY + 1500)
    gg.addColorStop(0, `rgba(36,22,16,${0.6 + 0.35 * pan})`); gg.addColorStop(0.3, `rgba(26,16,12,${0.8 + 0.2 * pan})`); gg.addColorStop(1, 'rgba(10,6,4,1)')
    c.fillStyle = gg; c.fillRect(cx - 10, GY, W + 20, 1700)
    if (pan > 0) {
      c.save(); c.globalAlpha *= pan
      for (let i = 0; i < 6; i++) { c.strokeStyle = `rgba(120,80,50,${0.14 - i * 0.015})`; c.lineWidth = 2; c.beginPath(); for (let x = cx - 20; x < cx + W + 40; x += 30) c.lineTo(x, GY + 140 + i * 160 + Math.sin(x / 140 + i) * 18); c.stroke() }
      for (let i = 0; i < 40; i++) { const x = cx + hash(i) * W, y = GY + 80 + hash(i * 3) * 1200; c.fillStyle = 'rgba(90,70,56,0.5)'; c.beginPath(); c.ellipse(x, y, 8 + hash(i * 5) * 16, 5 + hash(i * 7) * 8, hash(i) * 3, 0, TAU); c.fill() }
      c.restore()
    }
    const pts = []; for (let x = Math.max(-40, cx - 40); x <= hx; x += 5) pts.push([x, pathY(x)])
    pts.push([hx, pathY(hx)])
    const seg = (a, b, col) => { const p = pts.filter((q) => q[0] >= a && q[0] <= b); if (p.length > 1) neon(c, p, { color: col, w: 5 }) }
    seg(-1e9, XJ.pain0, COL.gold); seg(XJ.pain0, XJ.pain1, COL.red); seg(XJ.pain1, 1e9, COL.gold)
    neon(c, [[hx, GY], [cx + W + 60, GY]], { color: COL.ink, w: 2, a: 0.25 * (1 - pan), dash: [10, 14], glowW: 2 })
    if (painK > 0) for (let i = 0; i < 18; i++) { const x = XJ.pain0 + (i / 18) * (XJ.pain1 - XJ.pain0); if (x > hx) break; line(c, [[x, GY + 4], [x + 8, GY - 26 - hash(i) * 20], [x + 16, GY + 4]], { color: COL.coral, w: 3, a: 0.8 }) }
    OTHERS.forEach((o, i) => { const a = win(t, o.tc - 1.6, o.tc + 1.8, 0.6, 0.8); if (a <= 0) return; const ox = o.x - (t - (o.tc - 1.6)) * 210; figure(c, ox, GY, 1.45, o.col, a * 0.85, { walk: t * 6 + i, face: -1, glowA: 0.6 }) })
    TICKS.forEach((tk) => { if (t < tk.t) return; const d = t - tk.t; glow(c, tk.x, GY + 10 + Math.min(d, 0.3) * 30, 9, 'gold', 0.9 * (1 - 0.5 * clamp(d / 2))) })
    if (t > J.call) {
      const lt = t - J.call, rc = rootLayer.getContext('2d')
      rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, W, H); rc.setTransform(1, 0, 0, 1, -cx, -camY); rc.lineCap = 'round'
      const buckets = new Map()
      for (const segs of ROOTS) for (const sg of segs) { const k = eOut(clamp((lt - sg.t0) / sg.dur)); if (k <= 0) continue; const b = Math.round(sg.w * 4) / 4; if (!buckets.has(b)) buckets.set(b, []); buckets.get(b).push(sg.x0, sg.y0, lerp(sg.x0, sg.x1, k), lerp(sg.y0, sg.y1, k)) }
      const rg = rc.createLinearGradient(0, GY, 0, GY + 1100); rg.addColorStop(0, '#ffe7a0'); rg.addColorStop(1, '#ff9a3a'); rc.strokeStyle = rg
      for (const [w, a] of buckets) { rc.lineWidth = w; rc.beginPath(); for (let i = 0; i < a.length; i += 4) { rc.moveTo(a[i], a[i + 1]); rc.lineTo(a[i + 2], a[i + 3]) } rc.stroke() }
      rc.globalCompositeOperation = 'lighter'
      for (let i = 0; i < ROOTS.length; i += 2) { const segs = ROOTS[i]; const sg = segs[Math.floor(hash(i) * segs.length)]; const ph = 1 - ((t * 0.9 + hash(i * 3)) % 1); if (lt > sg.t0 + sg.dur) rc.drawImage(SPR.white, lerp(sg.x0, sg.x1, ph) - 10, lerp(sg.y0, sg.y1, ph) - 10, 20, 20) }
      rc.globalCompositeOperation = 'source-over'
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalCompositeOperation = 'lighter'; c.filter = 'blur(12px)'; c.globalAlpha = 0.75; c.drawImage(rootLayer, 0, 0)
      c.filter = 'none'; c.globalAlpha = 1; c.drawImage(rootLayer, 0, 0)
      c.restore()
    }
    const hopeA = win(t, J.effort, J.noresult + 1.4, 0.6, 1.2) * 0.7
    if (hopeA > 0) { const x0 = hxAt(J.effort); neon(c, qbez([x0, GY - 150], [x0 + 300, GY - 160], [x0 + 620, GY - 470], 30), { color: COL.ink, w: 2.5, a: hopeA, dash: [10, 12], glowW: 2 }); text(c, '?', x0 + 660, GY - 500, { font: 'serif', size: 80, color: COL.ink, a: hopeA, glow: 20 }) }
    const pIn = prog(t, J.partner, 1.4), pA = eOut(pIn) * (1 - 0.65 * silentK) * (1 - pan)
    const hold = eOut(prog(t, J.support, 0.6)) * (1 - prog(t, J.silent, 0.8))
    const px = hx + lerp(480, 96, eOut(pIn))
    if (pA > 0) {
      figure(c, px, GY, 1.7, COL.blue, pA, { walk: t * 6 + 1, armTo: hold > 0.5 ? [-(px - hx) / 2, GY - 112] : null, face: pIn < 0.9 ? -1 : 1 })
      if (t > J.support) { const xs = []; for (let x = Math.max(XJ.support, cx - 40); x <= hx; x += 6) xs.push(x); if (xs.length > 1) neon(c, xs.map((x) => [x, GY - 6 + 10 * Math.sin((x - XJ.support) / 50)]), { color: COL.blue, w: 3, a: pA * 0.8 }) }
    }
    const sw = win(t, J.sweet, J.spice + 4, 0.4, 1.5)
    if (sw > 0) for (let i = 0; i < 14; i++) { const ph = (t * 0.5 + hash(i)) % 1; heart(c, hx + 40 + (hash(i * 3) - 0.5) * 300, GY - 260 - ph * 300, 1 + hash(i * 5), COL.pink, sw * Math.sin(PI * ph)) }
    const shA = win(t, J.spice - 0.2, J.boost + 1.2, 0.5, 0.6)
    if (shA > 0) {
      const sxp = cx + 760, syp = 520 + Math.sin(t * 2) * 10, tilt = -0.9 + Math.sin(t * 8) * 0.25 * eOut(prog(t, J.spice + 0.2, 0.3))
      c.save(); c.globalAlpha *= shA; c.translate(sxp, syp); c.rotate(tilt); c.scale(1.7, 1.7)
      const gl2 = c.createLinearGradient(-36, 0, 36, 0); gl2.addColorStop(0, 'rgba(200,230,255,0.25)'); gl2.addColorStop(0.5, 'rgba(255,255,255,0.08)'); gl2.addColorStop(1, 'rgba(200,230,255,0.3)')
      rrect(c, -36, -40, 72, 120, 18); c.fillStyle = gl2; c.fill(); c.strokeStyle = 'rgba(230,245,255,0.7)'; c.lineWidth = 2.5; c.stroke()
      c.fillStyle = 'rgba(255,170,200,0.7)'; c.fillRect(-30, 20, 60, 54)
      const mg = c.createLinearGradient(-36, 0, 36, 0); mg.addColorStop(0, '#8a8f9a'); mg.addColorStop(0.5, '#f4f6fa'); mg.addColorStop(1, '#6a6f7a')
      c.fillStyle = mg; c.beginPath(); c.moveTo(-36, -40); c.quadraticCurveTo(0, -84, 36, -40); c.closePath(); c.fill()
      c.restore()
      for (let i = 0; i < 90; i++) { const ts = J.spice + 0.3 + hash(i * 5) * 2.0, d = t - ts; if (d < 0 || d > 1.6) continue; const x = cx + 700 - (t - ts) * 150 + (hash(i) - 0.5) * 80, y = 500 + 0.5 * 1200 * d * d; star4(c, x, Math.min(y, GY - 20), 5 + 4 * hash(i * 7), hash(i * 11) < 0.5 ? COL.pink : COL.gold, (1 - d / 1.6) * shA, t * 3 + i) }
    }
    const fy = pathY(hx)
    const penA = eOut(prog(t, J.pen, 0.6)) * (1 - eIO(prog(t, J.silent, 1.0)))
    const hand = [hx + 80, fy - 118]
    figure(c, hx, fy, 1.75, COL.gold, 1 - pan, { walk: vel(t) > 1 ? t * 6 : 0, armTo: penA > 0.3 ? [hand[0] - hx, hand[1]] : null, glowA: 1 })
    if (penA > 0) {
      const shk = painK > 0 ? Math.sin(t * 50) * 3 * painK : 0, g = 1 + 0.08 * Math.sin(clamp((t - J.grip) / 0.5) * PI)
      const tip = [hx + 190 + shk, fy - 4]
      pen(c, tip[0], tip[1], 0.75, 0.9 * g, penA)
      glow(c, tip[0], tip[1], 60, 'gold', penA)
      if (t > J.grip) for (let i = 0; i < 6; i++) { const d = ((t * 3 + i / 6) % 1); glow(c, tip[0] - d * 40, tip[1] - d * 30 + Math.sin(i * 3) * 10, 6, 'gold', penA * (1 - d)) }
    }
    const sp = eOut(prog(t, J.root + 1.0, 2.2))
    if (sp > 0) {
      const x = RCX + 60, y = GY
      c.save(); c.translate(x, y); c.scale(1.5, 1.5); c.translate(-x, -y)
      c.save(); const sg2 = c.createLinearGradient(0, y, 0, y - 260); sg2.addColorStop(0, '#3a2410'); sg2.addColorStop(1, '#4f9a2a'); c.strokeStyle = sg2; c.lineWidth = 10 * sp; c.lineCap = 'round'
      c.shadowColor = 'rgba(160,255,120,0.6)'; c.shadowBlur = 20; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 10, y - 80 * sp, x + 14, y - 160 * sp, x + 4, y - 250 * sp); c.stroke(); c.restore()
      ;[[0.35, -1, 70], [0.5, 1, 80], [0.68, -1, 90], [0.82, 1, 84], [1, -1, 70], [1, 1, 76]].forEach(([f, s, len], i) => { const lk = eBack(prog(t, J.root + 1.4 + i * 0.25, 0.8)); leaf(c, x + 4 * f, y - 250 * sp * f, len, s > 0 ? -0.5 : PI + 0.5, lk * sp) })
      glow(c, x, y - 250 * sp, 200, 'green', 0.3 * sp)
      c.restore()
    }
    c.restore()
    const rain = win(t, J.silent + 0.3, J.call + 0.8, 1.0, 1.2)
    if (rain > 0) { c.save(); c.strokeStyle = `rgba(170,200,255,${0.35 * rain})`; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i < 160; i++) { const x = (hash(i) * W + t * 60) % W, y = ((hash(i * 3) * H + t * (900 + hash(i * 7) * 500)) % H); c.moveTo(x, y); c.lineTo(x - 6, y + 30) } c.stroke(); c.restore() }
    if (t > J.boost && t < J.boost + 3.4) for (let i = 0; i < 18; i++) { const ph = ((t - J.boost) * 1.6 + hash(i)) % 1, y = 760 + hash(i * 3) * 420, a = Math.sin(ph * PI) * 0.55 * win(t, J.boost, J.boost + 3.4, 0.4, 0.8); neon(c, [[ph * 1300 - 260, y], [ph * 1300 - 40, y]], { color: COL.ink, w: 2, a, glowW: 2, core: false }); if (i % 3 === 0) heart(c, ph * 1300 - 20, y - 20, 0.8, COL.pink, a) }
    const ka = eOut(prog(t, J.pen + 0.2, 0.6)) * (1 - prog(t, J.pain0 + 0.4, 0.8))
    if (0) goldText(c, '主动权', HEADSX + 160, 640, 66, { a: ka, ls: 8, shine: prog(t, J.grip, 1.0) })
    const daysA = win(t, J.effort - 0.4, J.call + 0.3, 0.5, 0.6)
    if (0 && daysA > 0) { const n = Math.floor(1 + 364 * eIn(prog(t, J.effort - 0.4, J.call - J.effort + 0.6))); text(c, `第 ${n} 天`, 900, 380, { size: 46, color: COL.ink, a: daysA * 0.85, align: 'right', weight: 600, glow: 12 }) }
    const zk = eOut(prog(t, J.root, 1.0))
    if (zk > 0) {
      goldText(c, '扎根', 540, 1140 + 40 * (1 - zk), 240, { a: zk, ls: 30, shine: prog(t, J.root + 0.3, 1.4) })
      shockRing(c, 540, 1140, (t - J.root) / 1.4, COL.gold, 900)
      flare(c, 540, 1140, 1 - prog(t, J.root, 1.4), 1100)
      burst(c, 540, 1140, t - J.root, 123, { n: 160, speed: 900, life: 2.0, col: ['gold', 'white', 'green'], size: 9, grav: -120 })
    }
  }

  // ------------------------------------------------------------------ assembly
  const ACTS = [
    { t0: 0, draw: drawHook }, { t0: TH.t0, draw: drawTwo }, { t0: FG.t0, draw: drawFog }, { t0: CH.t0, draw: drawChart },
    { t0: ST.t0, draw: drawStable }, { t0: SA.t0, draw: drawSand }, { t0: CC.t0, draw: drawChoice }, { t0: CP.t0, draw: drawCompass }, { t0: J.t0, draw: drawJourney },
  ]
  ACTS.slice(2).forEach((a) => ev(a.t0, 'transition'))
  const XF = 0.75
  const CAMS = [
    (t) => { const k = eIO(prog(t, 0, HK.strike)) * (1 - eOut(prog(t, HK.title, 1.4))); return { z: 1 + 0.16 * k, x: 0, y: 170 * k } },
    (t) => { const sp = eIO(prog(t, TH.split - 0.2, 1.6)), mk_ = eIO(prog(t, TH.money, 1.4)); return { z: lerp(lerp(1.16, 1.04, sp), 1.14, mk_), x: lerp((walkerX(t) - 330) * 0.5, 0, sp), y: lerp(lerp(150, 40, sp), -120, mk_) } },
    (t) => { const k = eIO(prog(t, FG.t0, 9)); return { z: 1.04 + 0.12 * k, x: -90 * k, y: 140 * k } },
    (t) => { const gk = eIO(prog(t, CH.g0, CH.g1 - CH.g0)), w = win(t, CH.g0 - 0.3, CH.g1 + 1.0, 0.8, 1.0), ck = eIO(prog(t, CH.c0, CH.c1 - CH.c0)), w2 = win(t, CH.c0 - 0.3, CH.c1 + 1.0, 0.8, 1.0)
      return { z: 1.12, x: (X(gk * YR) - 540) * 0.4 * w + (X(DIV + ck * (YR - DIV)) - 540) * 0.4 * w2, y: (Yv(sav(gk * YR)) - 900) * 0.35 * w } },
    (t) => ({ z: 1.12 + 0.05 * eIO(prog(t, ST.word - 0.8, 2)) * (1 - eIO(prog(t, ST.s0, 1))), x: 0, y: 60 - 150 * eIO(prog(t, ST.s0, ST.w3b - ST.s0 + 1.2)) }),
    (t) => ({ z: 1.1 + 0.04 * eIO(prog(t, SA.keep - 0.5, 2)), x: 0, y: 0, r: 0.02 * Math.sin(t * 0.35) }),
    (t) => { const b = eIO(prog(t, CC.bomb - 0.4, 0.8)) * (1 - eIO(prog(t, CC.age - 0.3, 1))), a = eIO(prog(t, CC.age - 0.3, 1.2)); return { z: 1.14 + 0.04 * b, x: 70 * b, y: 130 * a - 40 } },
    (t) => { const up = eIO(prog(t, CP.t0, CP.who - CP.t0 + 1)); return { z: 1.14 + 0.06 * eIO(prog(t, CP.all, 3)), x: 0, y: lerp(140, -60, up) } },
    (t) => ({ z: 1.05, x: 0, y: Math.sin(t * 6) * 3 }),
  ]
  const layers = [0, 1].map(() => mk(W, H))
  const BW = W / 4, BHh = H / 4, b1 = mk(BW, BHh), b2 = mk(BW, BHh)
  const vig = mk(W, H)
  { const v = vig.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.65)'); v.fillStyle = g; v.fillRect(0, 0, W, H) }
  const grains = [0, 1, 2, 3].map((s) => { const g = mk(256, 256), gc = g.getContext('2d'), im = gc.createImageData(256, 256), r = rng(s + 1); for (let i = 0; i < 65536; i++) { const v = 128 + (r() - 0.5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 } gc.putImageData(im, 0, 0); return ctx.createPattern(g, 'repeat') })

  // ------------------------------------------------------------------ subtitles
  const HL = {
    h1: ['多少年'], q1: ['长期稳定'], s3: ['金钱'], f2: ['不确定性'], c4: ['离婚'], c5: ['少了一截'], c7: ['从头开始'], b5: ['多少年'], w1: ['稳定'],
    w2: ['下一步的基础'], u2: ['重新开始'], x1: ['不结婚'], x2: ['30 岁之前'], d1: ['什么样的人'], d3: ['方向'], p1: ['调味剂'], p3: ['主动权'],
    p4: ['痛苦'], r1: ['沉默的时光'], r3: ['扎根'],
  }
  const BR = { x1: '爆雷', t2: '人生方向' }
  const SUBS = []
  for (const l of LINES) {
    const s = l.text, parts = []
    let cur = '', st = 0
    for (let i = 0; i < s.length; i++) { cur += s[i]; if ('，。？！：；'.includes(s[i]) || (s[i] === '—' && s[i + 1] !== '—')) { parts.push({ s: cur, i0: st }); cur = ''; st = i + 1 } }
    if (cur) parts.push({ s: cur, i0: st })
    const merged = []
    for (const p of parts) { const last = merged[merged.length - 1], vis = (q) => q.replace(/[，。？！：；、—\s]/g, '').length; if (last && vis(last.s) + vis(p.s) <= 15 && !/[。？！]$/.test(last.s)) last.s += p.s; else merged.push({ ...p }) }
    merged.forEach((p, k) => {
      const t0 = l.chars[p.i0] - 0.08, t1 = k + 1 < merged.length ? l.chars[merged[k + 1].i0] - 0.08 : l.t1 + 0.3
      SUBS.push({ id: l.id, t0, t1, s: p.s.replace(/[，。：；]+$/, '').replace(/——$/, '').replace(/[，、：；]/g, ' ').replace(/——/g, ' ') })
    })
  }
  for (let i = 0; i + 1 < SUBS.length; i++) SUBS[i].t1 = Math.min(SUBS[i].t1, SUBS[i + 1].t0)
  function drawSub(c, t) {
    const sb = SUBS.find((q) => t >= q.t0 && t < q.t1)
    if (!sb || (sb.id === 'r3' && t > J.root - 0.1)) return
    const a = clamp((t - sb.t0) / 0.12) * clamp((sb.t1 - t) / 0.12), pop = 1 + 0.06 * (1 - eOut(clamp((t - sb.t0) / 0.25)))
    const hl = HL[sb.id] || []
    const chars = []; let i = 0
    while (i < sb.s.length) { const h = hl.find((w) => sb.s.startsWith(w, i)); if (h) { for (const ch of h) chars.push({ ch, h: true }); i += h.length } else { chars.push({ ch: sb.s[i], h: false }); i++ } }
    const size = sb.id === 'h1' ? 62 : 54
    c.save(); c.globalAlpha = a; c.font = `600 ${size}px ${L_.SANS}`; c.letterSpacing = '3px'; c.textBaseline = 'middle'
    const width = (cs) => c.measureText(cs.map((q) => q.ch).join('')).width
    let rows = [chars]
    if (width(chars) > 960) {
      let best = -1, bd = 1e9; const hint = BR[sb.id] ? sb.s.indexOf(BR[sb.id]) : -1
      if (hint > 0) best = hint
      else for (let k = 4; k < chars.length - 3; k++) { if (chars[k - 1].h && chars[k].h) continue; const d = Math.abs(k - chars.length / 2) - (chars[k - 1].ch === ' ' ? 3 : 0); if (d < bd) { bd = d; best = k } }
      rows = [chars.slice(0, best), chars.slice(best)].map((r) => r.filter((q, k) => !(q.ch === ' ' && (k === 0 || k === r.length - 1))))
    }
    const yC = sb.id === 'h1' ? 1560 : 1590
    c.translate(540, yC); c.scale(pop, pop); c.translate(-540, -yC)
    rows.forEach((row, ri) => {
      let x = 540 - width(row) / 2
      const y = yC + (ri - (rows.length - 1) / 2) * (size + 16)
      for (const q of row) {
        c.shadowColor = q.h ? 'rgba(255,170,60,0.9)' : 'rgba(0,0,0,0.95)'; c.shadowBlur = q.h ? 22 : 14
        if (q.h) { const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, '#fff3c8'); g.addColorStop(0.5, '#ffc95a'); g.addColorStop(1, '#e08a20'); c.fillStyle = g } else c.fillStyle = '#fff8ec'
        c.fillText(q.ch, x, y); x += c.measureText(q.ch).width
      }
    })
    c.restore()
  }

  // ------------------------------------------------------------------ frame
  function shakeAt(t) { let x = 0, y = 0; for (const s of SHAKE) { const d = t - s.t; if (d < 0 || d > s.dur) continue; const e = s.amp * Math.pow(1 - d / s.dur, 2); x += Math.sin(d * 63 + s.t) * e; y += Math.cos(d * 51 + s.t * 2) * e } return [x, y] }
  function renderFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
    const [sx, sy] = shakeAt(t)
    let li = 0
    for (let i = 0; i < ACTS.length; i++) {
      const a = ACTS[i], nx = ACTS[i + 1]
      if (t < a.t0 || (nx && t > nx.t0 + XF)) continue
      const kin = i === 0 ? 1 : eIO(prog(t, a.t0, XF)), kout = nx ? eIO(prog(t, nx.t0, XF)) : 0
      const alpha = kin * (1 - kout)
      if (alpha <= 0.002) continue
      const lay = layers[li++ % 2], c = lay.getContext('2d')
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, W, H)
      // the act's own camera: tracking, craning, pushing in (kept inside the frame so no edge shows)
      const cm = CAMS[i](t), mxx = (cm.z - 1) * 540, myy = (cm.z - 1) * 960
      const fx = clamp(cm.x || 0, -mxx, mxx), fy = clamp(cm.y || 0, -myy, myy)
      c.translate(540, 960); c.scale(cm.z, cm.z); if (cm.r) c.rotate(cm.r); c.translate(-540 - fx, -960 - fy)
      a.draw(c, t)
      // transitions with motion: even boundaries push through the old shot, odd ones whip sideways
      const comp = (k, incoming, style) => {
        const blur = Math.sin(PI * k)
        if (style === 0) {
          const scs = incoming ? [0.86 + 0.14 * eOut(k)] : [1 + 0.55 * eIn(k)]
          const copies = blur > 0.05 ? [0, 1, 2] : [0]
          copies.forEach((j) => { const sc = scs[0] * (1 + j * 0.035 * blur * (incoming ? -1 : 1)); ctx.save(); ctx.globalAlpha = (incoming ? k : 1 - k) / copies.length; ctx.translate(540 + sx, 960 + sy); ctx.scale(sc, sc); ctx.translate(-540, -960); ctx.drawImage(lay, 0, 0); ctx.restore() })
        } else {
          const off = incoming ? W * 0.9 * (1 - eOut(k)) : -W * 0.9 * eIn(k)
          const copies = blur > 0.05 ? [0, 1, 2] : [0]
          copies.forEach((j) => { ctx.save(); ctx.globalAlpha = (incoming ? Math.min(1, k * 1.6) : Math.min(1, (1 - k) * 1.6)) / copies.length; ctx.drawImage(lay, off + sx + j * 46 * blur * (incoming ? 1 : -1), sy); ctx.restore() })
        }
      }
      if (kout > 0) comp(kout, false, (i + 1) % 2)
      else if (kin < 1) comp(kin, true, i % 2)
      else { const sz = 1 + Math.min(0.06, (Math.abs(sx) + Math.abs(sy)) / 450); ctx.save(); ctx.translate(540 + sx, 960 + sy); ctx.scale(sz, sz); ctx.translate(-540, -960); ctx.drawImage(lay, 0, 0); ctx.restore() }
    }
    const g1 = b1.getContext('2d'), g2 = b2.getContext('2d')
    g1.globalCompositeOperation = 'source-over'; g1.filter = 'none'; g1.drawImage(cv, 0, 0, BW, BHh)
    g1.globalCompositeOperation = 'multiply'; g1.drawImage(b1, 0, 0); g1.globalCompositeOperation = 'source-over'
    g2.clearRect(0, 0, BW, BHh); g2.filter = 'blur(6px)'; g2.drawImage(b1, 0, 0); g2.filter = 'none'
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(b2, 0, 0, W, H); ctx.restore()
    for (const f of FLASH) { const d = t - f.t; if (d < 0 || d > f.dur) continue; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(f.col, f.amp * Math.pow(1 - d / f.dur, 2)); ctx.fillRect(0, 0, W, H); ctx.restore() }
    const fr = Math.floor(t * 30)
    ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = grains[fr % 4]; ctx.translate((fr * 37) % 256, (fr * 91) % 256); ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore()
    ctx.drawImage(vig, 0, 0)
    drawSub(ctx, t)
    if (window.__cover) return
    const lab = Math.max(win(t, HK.slam + 0.3, HK.next + 0.4, 0.5, 0.6), win(t, TOTAL - 4.6, TOTAL + 1, 0.6, 0.1))
    text(ctx, '配音由 AI 根据顾东政本人声音合成', 540, 1810, { size: 26, color: COL.dim, a: lab * 0.9, ls: 2 })
    const endK = eOut(prog(t, TOTAL - 4.4, 1.0))
    goldText(ctx, '重估 · “稳定”', 540, 1730, 46, { a: endK * (1 - prog(t, TOTAL - 0.9, 0.8)), font: 'serif', ls: 8, glowA: 0.6 })
    const fo = eIO(prog(t, TOTAL - 1.3, 1.2))
    if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H) }
  }
  function renderCover() {
    window.__cover = true
    renderFrame(J.root + 3.0)
    goldText(ctx, '我要再花多少年，', 540, 1350, 70, { font: 'sans', palette: 'silver', glowA: 0.4 })
    goldText(ctx, '才能回到今天的位置？', 540, 1450, 70, { font: 'sans' })
    text(ctx, '重估 · “稳定”　｜　顾东政', 540, 1530, { size: 30, color: COL.ink, ls: 4, a: 0.85 })
  }

  if (missing.length) console.log('MISSING ANCHORS', JSON.stringify(missing))
  EV.sort((a, b) => a.t - b.t)
  window.__EVENTS = { total: TOTAL, scenes: S, acts: { hook: 0, title: HK.title, slam: HK.slam, threads: TH.t0, fog: FG.t0, chart: CH.t0, stable: ST.t0, sand: SA.t0, choice: CC.t0, compass: CP.t0, journey: J.t0 },
    marks: { strike: HK.strike, split: TH.split, money: TH.money, divorce: CH.div, drop: CH.drop, crumble: BK.crumble, stableWord: ST.word, cut: ST.cut, restart: SA.restart, bomb: CC.bomb, dir: CP.dir, serve: CP.serve, walk: J.t0, partner: J.partner, sweet: J.sweet, boost: J.boost, pen: J.pen, pain0: J.pain0, pain1: J.pain1, silent: J.silent, call: J.call, root: J.root },
    events: EV, lines: LINES.map((l) => ({ id: l.id, t0: l.t0, t1: l.t1, file: l.file })) }
  window.__S = S
  window.TOTAL = TOTAL
  window.renderFrame = renderFrame
  window.renderCover = renderCover
  window.ready = true
})()
