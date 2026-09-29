// 《重估》 episode renderer. Everything is a pure function of t (seconds on the edited timeline),
// so any frame can be rendered in any order by any worker.  window.renderFrame(t) is the entry point.
(() => {
  const EP = window.EP
  const $ = (tag, cls, parent, css) => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (css) Object.assign(e.style, css)
    if (parent) parent.appendChild(e)
    return e
  }
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
  const prog = (t, t0, d) => (d > 0 ? clamp((t - t0) / d) : t >= t0 ? 1 : 0)
  const eOut = (x) => 1 - Math.pow(1 - clamp(x), 3)
  const eOut5 = (x) => 1 - Math.pow(1 - clamp(x), 5)
  const eIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const lerp = (a, b, x) => a + (b - a) * x
  const mixRGB = (a, b, x) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], x))).join(',')})`
  const INK = [27, 25, 21], GRAY = [142, 138, 131], RED = [196, 52, 44], WHITE = [240, 236, 228], DIMW = [120, 116, 108]
  const TEAL = [43, 84, 89], AMBER = [181, 140, 70]
  const SPK = { gu: { name: '顾东政', c: TEAL, soft: '#94aaa8', css: '#2b5459' }, wu: { name: '吴原同', c: AMBER, soft: '#d6be92', css: '#b58c46' } }

  // ---------------------------------------------------------------- audio envelope (100 Hz, 0..255)
  const ENV = EP.env
  const env = (t) => {
    const k = t * 100, i = Math.floor(k), f = k - i
    if (i < 0 || i >= ENV.length - 1) return 0
    return lerp(ENV[i], ENV[i + 1], f) / 255
  }
  const envSmooth = (t, w = 0.06) => (env(t - w) + env(t) * 2 + env(t + w)) / 4

  // ---------------------------------------------------------------- chars and anchors
  // EP.chars: [{c, t0, t1, spk}] in spoken order (body only). Anchors are phrases found in this stream.
  const CH = EP.chars
  const plain = CH.map((c) => c.c).join('')
  function anchor(a, from = 0) {
    if (typeof a === 'number') return a
    if (a == null) return null
    let s = String(a), off = 0
    const m = s.match(/^(.*?)([+-]\d+(?:\.\d+)?)$/)
    if (m && m[1]) { s = m[1]; off = parseFloat(m[2]) }
    let end = false
    if (s.startsWith('$')) { end = true; s = s.slice(1) } // "$phrase" = when the phrase ends
    let startIdx = 0
    while (startIdx < CH.length && CH[startIdx].t0 < from - 1.5) startIdx++
    const at = plain.indexOf(s, startIdx)
    if (at < 0) { console.log('ANCHOR NOT FOUND', a, 'from', from); return from + off }
    return (end ? CH[at + s.length - 1].t1 : CH[at].t0) + off
  }
  window.__anchor = anchor

  // ---------------------------------------------------------------- stage
  const stage = document.getElementById('stage')
  const dark = $('div', 'layer', stage); dark.id = 'dark'
  const sceneLayer = $('div', 'layer', stage)
  const chrome = $('div', 'layer', stage)

  // top bar
  const topbar = $('div', 'layer', chrome); topbar.id = 'topbar'
  $('div', 'show', topbar).textContent = EP.show.name
  $('div', 'dot', topbar)
  $('div', 'ep', topbar).textContent = `第 ${EP.show.ep} 期`
  const chapEl = $('div', 'chap', topbar)
  $('div', null, topbar).id = 'tl-base'
  const tlProg = $('div', null, topbar); tlProg.id = 'tl-prog'
  const B0 = EP.body.t0, B1 = EP.body.t1
  const X0 = 60, X1 = 1020
  const tx = (t) => X0 + (X1 - X0) * clamp((t - B0) / (B1 - B0))
  const ticks = EP.chapters.map((c) => {
    const e = $('div', 'tick', topbar); e.style.left = tx(c.t0) - 1 + 'px'; return e
  })
  const tlDot = $('div', null, topbar); tlDot.id = 'tl-dot'

  // chips
  const chips = {}
  ;[['gu', 52], ['wu', 182]].forEach(([k, x]) => {
    const e = $('div', 'chip', chrome); e.style.left = x + 'px'
    const ring = $('div', 'ring', e)
    const dot = $('i', null, ring)
    const name = $('span', null, e); name.textContent = SPK[k].name
    chips[k] = { e, ring, dot, name }
  })
  const vb = $('div', null, chrome); vb.id = 'voicebars'
  const vbars = Array.from({ length: 8 }, (_, i) => { const b = $('i', null, vb); b.style.left = i * 11 + 'px'; return b })

  // subtitles
  const subEl = $('div', null, chrome); subEl.id = 'sub'
  const subName = $('div', null, chrome); subName.id = 'subname'
  let curSub = -1, subSpans = []

  function speakerAt(t) {
    // the speaker of the subtitle line around t (hold the last one through pauses)
    let s = null
    for (const L of EP.subs) { if (L.t0 - 0.15 <= t) s = L.spk; else break }
    return s
  }

  // ---------------------------------------------------------------- element factory for board scenes
  const ELS = {}
  function charSpans(parent, text) {
    const spans = []
    for (const ch of text) {
      if (ch === '\n') { $('br', null, parent); continue }
      const s = $('span', null, parent); s.textContent = ch; spans.push(s)
    }
    return spans
  }
  function place(e, d) {
    e.style.position = 'absolute'
    if (d.x != null) e.style.left = d.x + 'px'
    if (d.y != null) e.style.top = d.y + 'px'
    if (d.w != null) e.style.width = d.w + 'px'
    if (d.h != null) e.style.height = d.h + 'px'
    if (d.size) e.style.fontSize = d.size + 'px'
    if (d.color) e.style.color = d.color === 'red' ? 'var(--red)' : d.color === 'gray' ? 'var(--gray)' : d.color === 'ink' ? 'var(--ink)' : d.color
    if (d.align === 'center') { e.style.textAlign = 'center'; e.style.transform = 'translateX(-50%)' }
    if (d.align === 'right') { e.style.textAlign = 'right' }
    if (d.css) Object.assign(e.style, d.css)
  }
  const fadeUp = (e, p, dy = 16, base = '') => {
    e.style.opacity = eOut(p)
    e.style.transform = `${base} translateY(${(1 - eOut5(p)) * dy}px)`
  }
  // typed text: chars fade in one by one from gray
  function typer(spans, t, t0, cps, colorTo = INK, colorFrom = GRAY) {
    const n = spans.length
    for (let i = 0; i < n; i++) {
      const p = prog(t, t0 + i / cps, 0.22)
      spans[i].style.opacity = p <= 0 ? 0 : 0.35 + 0.65 * eOut(p)
      spans[i].style.color = p >= 1 ? `rgb(${colorTo.join(',')})` : mixRGB(colorFrom, colorTo, eOut(p))
    }
  }

  ELS.kicker = (p, d) => { const e = $('div', 'kicker', p); e.textContent = d.text; place(e, d); return (t, a) => fadeUp(e, prog(t, a, 0.45), 10, d.align === 'center' ? 'translateX(-50%)' : '') }
  ELS.headline = (p, d) => {
    const e = $('div', 'headline', p); place(e, d)
    const spans = charSpans(e, d.text)
    const col = d.color === 'red' ? RED : INK
    const cps = d.cps || 14
    return (t, a) => { typer(spans, t, a, cps, col); if (d.align === 'center') e.style.transform = 'translateX(-50%)' }
  }
  ELS.bigword = (p, d) => {
    const e = $('div', 'bigword', p); place(e, d); e.textContent = d.text
    const base = d.align === 'center' ? 'translateX(-50%)' : ''
    return (t, a) => { const q = prog(t, a, 0.5); e.style.opacity = eOut(q); e.style.transform = `${base} scale(${lerp(1.06, 1, eOut5(q))})`; e.style.transformOrigin = d.align === 'center' ? '50% 60%' : '0 60%' }
  }
  ELS.num = (p, d) => {
    const e = $('div', 'num', p); place(e, d); e.textContent = d.text
    return (t, a) => fadeUp(e, prog(t, a, 0.5), 24)
  }
  ELS.para = (p, d) => {
    const e = $('div', 'para', p); place(e, d)
    if (d.hl) { e.innerHTML = d.text.replace(new RegExp(`(${d.hl.join('|')})`, 'g'), '<b style="color:var(--red);font-weight:600">$1</b>') } else e.textContent = d.text
    const base = d.align === 'center' ? 'translateX(-50%)' : ''
    return (t, a) => fadeUp(e, prog(t, a, 0.45), 12, base)
  }
  ELS.label = (p, d) => {
    const e = $('div', 'label', p); place(e, d); e.textContent = d.text
    const base = d.align === 'center' ? 'translateX(-50%)' : ''
    return (t, a) => fadeUp(e, prog(t, a, 0.4), 10, base)
  }
  ELS.rule = (p, d) => {
    const e = $('div', 'rule', p); place(e, d)
    if (d.thick) e.style.height = d.thick + 'px'
    if (d.color === 'ink') e.style.background = 'var(--ink)'
    return (t, a) => { const q = eIO(prog(t, a, d.dur || 0.6)); e.style.transform = `scaleX(${q})`; e.style.opacity = q > 0 ? 1 : 0 }
  }
  ELS.hline = (p, d) => {
    const e = $('div', 'hline', p); place(e, d)
    if (d.color) e.style.background = d.color === 'red' ? 'var(--red)' : d.color === 'light' ? 'var(--light)' : d.color
    if (d.thick) e.style.height = d.thick + 'px'
    return (t, a) => { const q = eIO(prog(t, a, d.dur || 0.8)); e.style.transform = `scaleX(${q})`; e.style.opacity = q > 0 ? 1 : 0 }
  }
  ELS.vline = (p, d) => {
    const e = $('div', null, p, { position: 'absolute', left: d.x - (d.thick || 3) / 2 + 'px', top: d.y + 'px', width: (d.thick || 3) + 'px', height: d.h + 'px',
      background: d.color === 'red' ? 'var(--red)' : d.color === 'ink' ? 'var(--ink)' : 'var(--light)', transformOrigin: '50% 0' })
    return (t, a) => { const q = eIO(prog(t, a, d.dur || 1.0)); e.style.transform = `scaleY(${q})`; e.style.opacity = q > 0 ? 1 : 0 }
  }
  ELS.strike = (p, d) => {
    const e = $('div', 'strike', p); place(e, d)
    if (d.rot) e.style.rotate = d.rot + 'deg'
    return (t, a) => { const q = eIO(prog(t, a, 0.35)); e.style.transform = `scaleX(${q})`; e.style.opacity = q > 0 ? 1 : 0 }
  }
  ELS.vbar = (p, d) => {
    const e = $('div', 'vbar', p); place(e, d)
    return (t, a) => { const q = eOut5(prog(t, a, 0.5)); e.style.transform = `scaleY(${q})` }
  }
  ELS.card = (p, d) => {
    const e = $('div', 'card', p); place(e, d)
    if (d.no) $('div', 'no', e).textContent = d.no
    $('div', 'ti', e).textContent = d.title
    if (d.sub) $('div', 'su', e).textContent = d.sub
    if (d.hot) { e.style.background = 'var(--pink)'; e.style.borderColor = 'var(--red)' }
    return (t, a) => fadeUp(e, prog(t, a, 0.5), 28)
  }
  ELS.box = (p, d) => {
    const e = $('div', 'box ' + (d.style || ''), p); place(e, d)
    $('div', 'ti', e).textContent = d.title
    if (d.sub) $('div', 'su', e).textContent = d.sub
    if (d.tsize) e.firstChild.style.fontSize = d.tsize + 'px'
    if (d.center) { e.style.alignItems = 'center'; e.style.textAlign = 'center' }
    return (t, a) => fadeUp(e, prog(t, a, 0.45), 18)
  }
  ELS.arrow = (p, d) => {
    // horizontal or vertical arrow from (x,y) of length len, dir 'r'|'d'
    const svgNS = 'http://www.w3.org/2000/svg'
    const len = d.len || 60, vert = d.dir === 'd'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', vert ? 30 : len + 4); svg.setAttribute('height', vert ? len + 4 : 30)
    Object.assign(svg.style, { position: 'absolute', left: (vert ? d.x - 15 : d.x) + 'px', top: (vert ? d.y : d.y - 15) + 'px', overflow: 'visible' })
    const col = d.color === 'ink' ? '#1b1915' : '#c4342c'
    const line = document.createElementNS(svgNS, 'path')
    line.setAttribute('d', vert ? `M15 0 L15 ${len}` : `M0 15 L${len} 15`)
    line.setAttribute('stroke', col); line.setAttribute('stroke-width', 3); line.setAttribute('fill', 'none')
    const head = document.createElementNS(svgNS, 'path')
    head.setAttribute('d', vert ? `M5 ${len - 12} L15 ${len} L25 ${len - 12}` : `M${len - 12} 5 L${len} 15 L${len - 12} 25`)
    head.setAttribute('stroke', col); head.setAttribute('stroke-width', 3); head.setAttribute('fill', 'none')
    svg.appendChild(line); svg.appendChild(head); p.appendChild(svg)
    line.setAttribute('stroke-dasharray', len); head.setAttribute('stroke-dasharray', 40)
    return (t, a) => { const q = eIO(prog(t, a, 0.45)); line.setAttribute('stroke-dashoffset', len * (1 - q)); head.style.opacity = q > 0.85 ? 1 : 0; svg.style.opacity = q > 0 ? 1 : 0 }
  }
  ELS.check = (p, d) => {
    const e = $('div', 'check', p); place(e, d)
    const cb = $('div', 'cb', e)
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', 60); svg.setAttribute('height', 60)
    const path = document.createElementNS(svgNS, 'path')
    const cross = d.mark === 'x'
    path.setAttribute('d', cross ? 'M16 16 L44 44 M44 16 L16 44' : 'M15 31 L26 42 L46 18')
    path.setAttribute('stroke', '#c4342c'); path.setAttribute('stroke-width', 5); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('stroke-dasharray', 90); svg.appendChild(path); cb.appendChild(svg)
    const tx_ = $('span', null, e); tx_.textContent = d.text
    if (d.size) tx_.style.fontSize = d.size + 'px'
    if (d.size) { const s = Math.round(d.size * 0.95); cb.style.width = cb.style.height = s + 'px'; svg.setAttribute('viewBox', '0 0 60 60'); svg.setAttribute('width', s); svg.setAttribute('height', s) }
    return (t, a) => { fadeUp(e, prog(t, a, 0.4), 14); path.setAttribute('stroke-dashoffset', 90 * (1 - eIO(prog(t, a + (d.markDelay ?? 0.35), 0.4)))) }
  }
  ELS.bubble = (p, d) => {
    const e = $('div', 'bubble' + (d.tail === 'up' ? ' up' : ''), p); place(e, d); e.textContent = d.text
    return (t, a) => { const q = prog(t, a, 0.45); e.style.opacity = eOut(q); e.style.transform = `scale(${lerp(0.9, 1, eOut5(q))})`; e.style.transformOrigin = d.tail === 'up' ? '50% 0' : '40px 100%' }
  }
  ELS.tag = (p, d) => { const e = $('div', 'tag', p); place(e, d); e.textContent = d.text; return (t, a) => fadeUp(e, prog(t, a, 0.4), 8) }
  ELS.qmark = (p, d) => { const e = $('div', 'qmark', p); place(e, d); e.textContent = d.text || '?'; return (t, a) => { const q = prog(t, a, 0.9); e.style.opacity = eOut(q); e.style.transform = `translateY(${(1 - eOut5(q)) * 40}px)` } }
  ELS.quotemark = (p, d) => { const e = $('div', 'quote-mark', p); place(e, d); e.textContent = '“'; return (t, a) => fadeUp(e, prog(t, a, 0.4), 10) }
  ELS.node = (p, d) => {
    const e = $('div', 'node' + (d.red ? ' red' : ''), p); place(e, d)
    return (t, a) => { const q = prog(t, a, 0.35); e.style.opacity = eOut(q); e.style.transform = `scale(${lerp(0.3, 1, eOut5(q))})` }
  }
  ELS.icon = (p, d) => {
    const e = $('div', null, p); place(e, d)
    const s = d.size || 120
    e.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" stroke="${d.color === 'red' ? '#c4342c' : '#1b1915'}" stroke-width="${d.sw || 4.5}" stroke-linecap="round" stroke-linejoin="round">${ICONS[d.name] || ''}</svg>`
    const paths = e.querySelectorAll('path,circle,rect,line,polyline,ellipse')
    paths.forEach((q) => { const L = q.getTotalLength ? q.getTotalLength() : 300; q.style.strokeDasharray = L; q.dataset.L = L })
    return (t, a) => {
      const q = prog(t, a, d.dur || 0.9)
      e.style.opacity = q > 0 ? 1 : 0
      paths.forEach((pp, i) => { const L = +pp.dataset.L; const qq = eIO(clamp(q * 1.3 - i * 0.08)); pp.style.strokeDashoffset = L * (1 - qq) })
    }
  }
  ELS.avatar = (p, d) => {
    // simple head-and-shoulders silhouette in a rounded frame (interviewer)
    const e = $('div', null, p); place(e, d)
    const s = d.size || 150
    e.innerHTML = `<div style="width:${s}px;height:${s * 0.78}px;border:2px solid #1b1915;border-radius:8px;background:rgba(250,248,243,.55);position:relative;overflow:hidden">
      <svg width="${s}" height="${s * 0.78}" viewBox="0 0 100 78" style="position:absolute;left:0;top:0"><circle cx="50" cy="32" r="13" fill="#1b1915"/><path d="M24 78 C26 56 38 49 50 49 C62 49 74 56 76 78 Z" fill="#1b1915"/></svg>
      <div style="position:absolute;left:12px;bottom:10px;font:600 22px/1 var(--sans);color:#f0ece4;background:#1b1915;padding:5px 10px;letter-spacing:2px">${d.text || ''}</div></div>`
    return (t, a) => fadeUp(e, prog(t, a, 0.45), 20)
  }
  ELS.phone = (p, d) => {
    // a vertical phone with a feed card; 'fire' flame badge appears at d.fire
    const e = $('div', null, p); place(e, d)
    e.innerHTML = `<div style="position:relative;width:300px;height:560px;border:3px solid #1b1915;border-radius:40px;background:rgba(250,248,243,.6)">
      <div style="position:absolute;left:110px;top:16px;width:80px;height:10px;border-radius:5px;background:#1b1915"></div>
      <div class="ph-card" style="position:absolute;left:26px;top:60px;width:242px;height:330px;background:#1b1915;border-radius:12px;overflow:hidden">
        <svg width="242" height="330" viewBox="0 0 242 330"><polygon points="100,135 100,195 150,165" fill="#f0ece4"/></svg></div>
      <div style="position:absolute;left:26px;top:410px;width:190px;height:14px;border-radius:7px;background:#c4bfb6"></div>
      <div style="position:absolute;left:26px;top:438px;width:140px;height:14px;border-radius:7px;background:#c4bfb6"></div>
      <div style="position:absolute;left:26px;top:480px;display:flex;gap:18px">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1b1915" stroke-width="2"><path d="M12 21s-7-4.6-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6C19 16.4 12 21 12 21z"/></svg>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1b1915" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1b1915" stroke-width="2"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg></div></div>`
    return (t, a) => fadeUp(e, prog(t, a, 0.5), 30)
  }

  ELS.photo = (p, d) => {
    const e = $('div', 'photo', p); place(e, { x: d.x, y: d.y })
    const fr = $('div', 'frame', e, { width: d.w + 'px', height: d.h + 'px' })
    const img = $('img', null, fr); img.src = d.src
    if (d.pos) img.style.objectPosition = d.pos
    if (d.cap) $('div', 'cap', e).textContent = d.cap
    if (d.cred) $('div', 'cred', e).textContent = d.cred
    return (t, a) => {
      const q = prog(t, a, 0.6)
      e.style.opacity = eOut(q)
      e.style.transform = `translateY(${(1 - eOut5(q)) * 22}px)`
      const z = d.zoom ?? 0.05
      img.style.transform = `scale(${1.02 + z * clamp((t - a) / (d.kb || 9))})`
    }
  }
  ELS.quote = (p, d) => {
    const e = $('div', 'quote', p); place(e, d)
    const spans = charSpans(e, d.text)
    return (t, a) => typer(spans, t, a, d.cps || 16)
  }
  ELS.src = (p, d) => { const e = $('div', 'src', p); place(e, d); e.textContent = d.text; return (t, a) => fadeUp(e, prog(t, a, 0.45), 8) }

  const ICONS = {
    compass: '<circle cx="50" cy="50" r="38"/><path d="M50 12 L50 20 M50 80 L50 88 M12 50 L20 50 M80 50 L88 50"/><path d="M62 38 L55 55 L38 62 L45 45 Z"/>',
    eye: '<path d="M8 50 C22 28 36 20 50 20 C64 20 78 28 92 50 C78 72 64 80 50 80 C36 80 22 72 8 50 Z"/><circle cx="50" cy="50" r="14"/>',
    stetho: '<path d="M26 12 L26 40 C26 56 46 56 46 40 L46 12"/><path d="M36 54 L36 66 C36 82 64 84 64 66 L64 56"/><circle cx="64" cy="48" r="9"/>',
    code: '<polyline points="34,28 14,50 34,72"/><polyline points="66,28 86,50 66,72"/><line x1="56" y1="20" x2="44" y2="80"/>',
    bulb: '<path d="M36 64 C36 54 26 48 26 34 A24 24 0 0 1 74 34 C74 48 64 54 64 64 Z"/><line x1="38" y1="74" x2="62" y2="74"/><line x1="42" y1="84" x2="58" y2="84"/>',
    pen: '<path d="M20 80 L24 62 L66 20 L80 34 L38 76 Z"/><line x1="58" y1="28" x2="72" y2="42"/>',
    chart: '<polyline points="12,78 36,52 52,62 86,24"/><polyline points="70,24 86,24 86,40"/><line x1="12" y1="88" x2="88" y2="88"/>',
    target: '<circle cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="5"/>',
    book: '<path d="M50 26 C40 18 24 18 12 22 L12 80 C24 76 40 76 50 84 C60 76 76 76 88 80 L88 22 C76 18 60 18 50 26 Z"/><line x1="50" y1="26" x2="50" y2="84"/>',
    clock: '<circle cx="50" cy="50" r="38"/><polyline points="50,26 50,50 66,60"/>',
    fire: '<path d="M50 90 C30 90 20 76 20 60 C20 42 34 34 36 16 C48 26 52 38 50 50 C56 44 60 38 60 30 C72 40 80 52 80 62 C80 78 68 90 50 90 Z"/>',
    user: '<circle cx="50" cy="34" r="16"/><path d="M18 88 C20 64 34 56 50 56 C66 56 80 64 82 88"/>',
    chat: '<path d="M16 22 L84 22 L84 66 L44 66 L26 82 L28 66 L16 66 Z"/>',
    mic: '<rect x="38" y="12" width="24" height="46" rx="12"/><path d="M26 46 C26 62 36 70 50 70 C64 70 74 62 74 46"/><line x1="50" y1="70" x2="50" y2="86"/><line x1="36" y1="86" x2="64" y2="86"/>',
    school: '<path d="M10 40 L50 20 L90 40 L50 60 Z"/><path d="M26 48 L26 68 C38 78 62 78 74 68 L74 48"/><line x1="90" y1="40" x2="90" y2="62"/>',
    coin: '<ellipse cx="50" cy="30" rx="30" ry="12"/><path d="M20 30 L20 70 C20 77 34 82 50 82 C66 82 80 77 80 70 L80 30"/><path d="M20 50 C20 57 34 62 50 62 C66 62 80 57 80 50"/>',
    robot: '<rect x="22" y="34" width="56" height="44" rx="8"/><circle cx="40" cy="54" r="5"/><circle cx="60" cy="54" r="5"/><line x1="50" y1="34" x2="50" y2="20"/><circle cx="50" cy="16" r="4"/><line x1="40" y1="68" x2="60" y2="68"/>',
    doc: '<path d="M26 12 L62 12 L78 28 L78 88 L26 88 Z"/><polyline points="62,12 62,28 78,28"/><line x1="36" y1="46" x2="68" y2="46"/><line x1="36" y1="58" x2="68" y2="58"/><line x1="36" y1="70" x2="56" y2="70"/>',
  }

  // ---------------------------------------------------------------- scenes
  const scenes = EP.scenes.map((S, idx) => {
    const el = $('div', 'layer', sceneLayer)
    el.style.opacity = 0
    const t0 = anchor(S.t0), t1 = anchor(S.t1, t0)
    const items = (S.els || []).map((d) => {
      const f = ELS[d.kind]
      if (!f) { console.log('unknown kind', d.kind); return null }
      const upd = f(el, d)
      const a = d.at == null ? t0 + (d.delay || 0) : anchor(d.at, t0) + (d.delay || 0)
      return { upd, a }
    }).filter(Boolean)
    return { S, el, t0, t1, items, idx }
  })
  window.__scenes = scenes.map((s) => ({ idx: s.idx, t0: s.t0, t1: s.t1, id: s.S.id }))

  // ---------------------------------------------------------------- cold open
  const co = $('div', 'layer', stage)
  const coQuote = $('div', null, co); coQuote.id = 'co-quote'
  const coAttr = $('div', null, co); coAttr.id = 'co-attr'
  const coBars = $('div', null, co); coBars.id = 'co-bars'
  const NB = 80, BAR_Y = 1040
  const bars = Array.from({ length: NB }, (_, i) => { const b = $('i', null, coBars); b.style.left = 63 + i * 12 + 'px'; return b })
  let coCur = -1, coSpans = []
  function drawColdOpen(t) {
    const C = EP.coldopen
    const on = t < C.t1 + 0.6
    co.style.display = on ? 'block' : 'none'
    if (!on) return
    // quote in view
    let qi = -1
    C.quotes.forEach((q, i) => { if (t >= q.t0 - 0.3) qi = i })
    if (qi !== coCur) {
      coCur = qi; coQuote.innerHTML = ''; coSpans = []
      if (qi >= 0) {
        const q = C.quotes[qi]
        const lines = q.text.split('\n')
        coQuote.style.top = (q.y || Math.round(560 - lines.length * 94 / 2)) + 'px'
        let k = 0
        lines.forEach((ln, li) => {
          if (li) $('br', null, coQuote)
          for (const ch of ln) { const s = $('span', null, coQuote); s.textContent = ch; s.dataset.k = k++; coSpans.push(s) }
        })
        coAttr.textContent = '—— ' + q.who
        coAttr.style.top = (parseFloat(coQuote.style.top) + lines.length * 94 + 40) + 'px'
      }
    }
    if (qi >= 0) {
      const q = C.quotes[qi]
      // q.times: reveal time per displayed char (quote marks included)
      coSpans.forEach((s, i) => {
        const p = prog(t, q.times[i], 0.18)
        s.style.opacity = p
        s.style.color = mixRGB(DIMW, WHITE, eOut(p))
      })
      const intro = C.handoff === 'intro'
      const outp = qi < C.quotes.length - 1 ? prog(t, C.quotes[qi + 1].t0 - 0.55, 0.35) : (intro ? prog(t, C.t1 - 0.75, 0.5) : prog(t, C.t1 - 0.1, 0.5))
      coQuote.style.opacity = 1 - outp
      coAttr.style.opacity = prog(t, q.t1 - 0.2, 0.5) * (1 - outp)
    } else { coAttr.style.opacity = 0 }
    // waveform: history, newest on the right, 30 bars per second
    // handoff 'intro': end on the flat, evenly lit bars that the 《重估》 intro opens with
    const intro = C.handoff === 'intro'
    const fadeAll = intro ? 1 : 1 - prog(t, C.t1 - 0.1, 0.5)
    const flat = intro ? eIO(prog(t, C.t1 - 0.8, 0.7)) : 0
    for (let i = 0; i < NB; i++) {
      const tt = t - (NB - 1 - i) / 30
      const v = tt < C.t0 ? 0 : envSmooth(tt, 0.02)
      const h = lerp(9 + Math.pow(v, 1.1) * 96, 9, flat)
      const b = bars[i]
      b.style.height = h.toFixed(1) + 'px'
      b.style.top = (BAR_Y - h / 2).toFixed(1) + 'px'
      b.style.opacity = (lerp(0.28 + 0.62 * (i / (NB - 1)), 0.485, flat) * fadeAll).toFixed(3)
    }
  }

  // ---------------------------------------------------------------- 《重估》 intro (portrait)
  // Same beats as make_intro.py (anchors from its JSON); laid out for 1080x1440:
  //   kicker 今天我们 / 重估 / topic row / ruler / two-line sentence. The old mark 默认 sits at the left, the new mark
  //   writes the topic along the ruler, then the ruler rises to become the episode timeline.
  const IN = EP.intro
  let drawIntro = () => {}
  if (IN) {
    const A = IN.a, I0 = IN.t0, W_ = 1080, H_ = 1440
    const Y_R = 900, Y_T = 100, TS = 188, TITLE_BASE_TOP = 452, TOPIC_TOP = 686
    const DARKc = [24, 24, 20], WAVE = [237, 233, 225], SECOND = [78, 74, 66], TIMELINE = [194, 186, 172], MINOR = [179, 173, 162], GHOST = [163, 158, 149]
    const L_ = $('div', 'layer', stage); L_.id = 'intro'
    const dkTop = $('div', 'dk', L_), dkBot = $('div', 'dk', L_)
    // bars -> line
    const ibars = Array.from({ length: NB }, (_, i) => $('div', 'bar', L_))
    const line = $('div', 'bar', L_)
    const ticksI = Array.from({ length: 22 }, (_, j) => $('div', 'bar', L_))
    // title rising out of the ruler
    const clipT = $('div', 'clipTitle', L_)
    const ttl = [0, 1].map((i) => { const e = $('div', 'ttl', clipT); e.textContent = '重估'[i]; e.style.left = 60 + i * TS + 'px'; return e })
    // sentence: line 1 我们重新审视那些被 / line 2 默认接受的答案 (so 默认 lands at the left, over the old mark)
    const SENT = '我们重新审视那些被默认接受的答案'
    const s1 = $('div', 'sent', L_, { left: '60px', top: Y_R + 34 + 'px' }), s2 = $('div', 'sent', L_, { left: '60px', top: Y_R + 98 + 'px' })
    const sp = [...SENT].map((ch, i) => { const e = $('span', null, i < 9 ? s1 : s2); e.textContent = ch; return e })
    const X_OLD = 60 + 46   // centre of 默认 (chars 9-10 = first two of line 2)
    const moren = $('div', 'sent', L_); moren.textContent = '默认'
    // kicker
    const kick = $('div', 'kick', L_, { left: '60px', top: '372px' })
    const ks = [...'今天我们'].map((ch) => { const e = $('span', null, kick); e.textContent = ch; return e })
    // topic
    const topic = $('div', 'topic', L_, { left: X_OLD + 'px', top: TOPIC_TOP + 'px', fontSize: IN.tsize + 'px' }); topic.textContent = IN.topic
    const date = $('div', 'date', L_); date.textContent = IN.date || ''
    const measure = $('div', 'bar', L_)
    const ghostBg = $('div', 'disc', L_), ghost = $('div', 'disc', L_)
    const halo = $('div', 'disc', L_), dot = $('div', 'disc', L_), ripple = $('div', 'disc', L_)
    // top bar pieces (become the body's top bar)
    const tbTick = $('div', 'bar', L_), tbHalo = $('div', 'disc', L_), tbDot = $('div', 'disc', L_), tbRip = $('div', 'disc', L_)
    const brand = $('div', null, L_, { position: 'absolute', left: '60px', top: '46px', font: '900 31px/1 var(--serif)', letterSpacing: '1px' }); brand.textContent = '重估'
    const bdot = $('div', null, L_, { position: 'absolute', left: '141px', top: '64px', width: '6px', height: '6px', borderRadius: '3px', background: 'var(--gray)' })
    const issue = $('div', null, L_, { position: 'absolute', left: '174px', top: '56px', font: '400 22px/1 var(--sans)', color: 'var(--ink2)', letterSpacing: '2px' }); issue.textContent = `第 ${EP.show.ep} 期`
    const chapI = $('div', null, L_, { position: 'absolute', right: '60px', top: '53px', font: '400 22px/1 var(--sans)', color: 'var(--ink2)', whiteSpace: 'nowrap', letterSpacing: '1px' })
    chapI.innerHTML = `<b style="font-weight:600;color:var(--red);margin-right:14px">${EP.chapters[0].no}</b>${EP.chapters[0].name}`
    const chTicksI = EP.chapters.slice(1).map((c) => $('div', 'bar', L_))
    const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`
    const mixc = (a, b, x) => a.map((v, i) => lerp(v, b[i], clamp(x)))
    const box = (e, x0, y0, x1, y1, col, al = 1) => Object.assign(e.style, { left: x0 + 'px', top: y0 + 'px', width: Math.max(0, x1 - x0) + 'px', height: Math.max(0, y1 - y0) + 'px', background: rgb(col), opacity: al, display: 'block' })
    const disc = (e, cx, cy, r, col, al = 1, ring = 0) => Object.assign(e.style, { left: cx - r + 'px', top: cy - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: al, display: 'block',
      background: ring ? 'transparent' : rgb(col), border: ring ? `${ring}px solid ${rgb(col)}` : '0', boxSizing: 'border-box' })
    const eIOs = (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2
    const eIOq = (x) => { x = clamp(x); return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2 }
    const eBack = (x, k = 1.4) => { x = clamp(x); return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2 }
    const TW = IN.topic_w, D = TW + 40, X_NEW = X_OLD + D
    const lineY = (u) => (u >= A.R0 ? lerp(Y_R, Y_T, eIO(prog(u, A.R0, A.R1 - A.R0))) : lerp(BAR_Y, Y_R, eIO(prog(u, 0.35, 0.5))))
    const dotX = (u) => (u < A.T0 ? X_OLD : X_OLD + D * eIOs(prog(u, A.T0, A.T1 - A.T0)))
    const spk = (u) => { let k = null; [[A.P1s, 'wu'], [A.P2s, 'gu'], [A.P3s, 'gu'], [A.P4s, 'wu']].forEach(([s, w]) => { if (u >= s - 0.1) k = w }); return k }
    window.__introSpeaker = (t) => spk(t - I0)
    const barL = (i) => 63 + i * 12, BW = 6
    drawIntro = (t) => {
      const u = t - I0
      const on = u >= 0 && t < EP.body.t0 + 0.02
      L_.style.display = on ? 'block' : 'none'
      if (!on) return
      // stage content fades as the body takes over (the top bar stays: the body draws the same one)
      const out = prog(t, EP.body.t0 - 0.4, 0.4)
      const yc = lineY(u)
      // paper band opening from the line
      const e = eIOq(prog(u, 0.48, 0.52))
      const top = yc * (1 - e), bot = yc + (H_ - yc) * e
      if (u < 0.48) { box(dkTop, 0, 0, W_, H_, [255, 255, 255]); dkTop.style.background = ''; dkBot.style.display = 'none' }
      else { box(dkTop, 0, 0, W_, top, [0, 0, 0]); dkTop.style.background = ''; dkTop.style.backgroundPosition = '0 0'; box(dkBot, 0, bot, W_, H_, [0, 0, 0]); dkBot.style.background = ''; dkBot.style.backgroundPosition = `0 ${-bot}px` }
      if (e >= 1) { dkTop.style.display = 'none'; dkBot.style.display = 'none' }
      // bars flatten and join into the line, then the line slides to the ruler
      const restCol = mixc(DARKc, [217, 211, 200], 0.485)
      const lineCol0 = mixc(DARKc, WAVE, 0.75)
      if (u < 0.40) {
        const flat = eOut(prog(u, 0, 0.25)), widen = eIOs(prog(u, 0.15, 0.25))
        for (let i = 0; i < NB; i++) {
          const x0 = barL(i), x1 = x0 + BW
          const Lx = i ? (barL(i - 1) + BW / 2 + x0 + BW / 2) / 2 : x0 - 3, Rx = i < NB - 1 ? (x0 + BW / 2 + barL(i + 1) + BW / 2) / 2 : x1 + 3
          const hh = lerp(9, 2, flat)
          box(ibars[i], lerp(x0, Lx, widen), yc - hh / 2, lerp(x1, Rx, widen), yc + hh / 2, mixc(restCol, lineCol0, flat))
        }
        line.style.display = 'none'
      } else {
        ibars.forEach((b) => (b.style.display = 'none'))
        const s = eIO(prog(u, 0.35, 0.5))
        let col = mixc(lineCol0, SECOND, eIO(prog(u, 0.48, 0.25))), al = 1
        if (u >= A.R0) {
          col = mixc(SECOND, TIMELINE, eIO(prog(u, A.R0, A.R1 - A.R0)))
          const dist = Math.max(360 - yc, yc - 860, 0); al = 1 - 0.7 * (1 - clamp(dist / 24))
        }
        box(line, lerp(barL(0) - 3, X0, s), yc - 1, lerp(barL(NB - 1) + BW + 3, X1, s), yc + 1, col, al)
      }
      // ruler ticks while the sentence is read
      const tf = u < A.R0 ? 1 : 1 - Math.sin(Math.PI / 2 * prog(u, A.R0, 0.3 * (A.R1 - A.R0))) * 0 - (1 - Math.cos(Math.PI / 2 * prog(u, A.R0, 0.3 * (A.R1 - A.R0))))
      ticksI.forEach((tk, j) => {
        const x = 60 + 44 * j
        const g = u < A.P3s ? 0 : eOut(prog(u, A.P3s + 0.1 + (x - 60) / 960 * 0.6, 0.16))
        if (g <= 0 || tf <= 0) { tk.style.display = 'none'; return }
        if (j % 5 === 0) box(tk, x - 1, yc - 7 * g, x + 1, yc + 7 * g, SECOND, tf)
        else box(tk, x, yc - 4 * g, x + 1, yc + 4 * g, MINOR, tf)
      })
      // 重估 rises out of the ruler
      clipT.style.height = Math.min(Y_R, yc) - 1 + 'px'
      ;[A.t1g - 0.15, A.t1g - 0.07].forEach((st, i) => {
        const q = prog(u, st, 0.85)
        ttl[i].style.top = TITLE_BASE_TOP + 470 * (1 - eOut5(q)) + 'px'
        ttl[i].style.display = u >= st ? 'block' : 'none'
        ttl[i].style.opacity = 1 - out
      })
      if (u >= A.R0) clipT.style.height = '1440px'
      // sentence karaoke
      const appear = prog(u, A.P3s - 0.1, 0.2), gone = prog(u, A.P3e + 0.05, 0.2)
      sp.forEach((e2, i) => {
        if (i === 9 || i === 10) { e2.style.opacity = u < A.P3e + 0.05 ? appear : 0; e2.style.color = mixRGB(GRAY, INK, prog(u, A.t3[i] - 0.05, 0.12)); return }
        e2.style.opacity = appear * (1 - gone)
        e2.style.color = mixRGB(GRAY, INK, prog(u, A.t3[i] - 0.05, 0.12))
      })
      // 默认 travels to the old mark and shrinks
      const g = eIO(prog(u, A.P3e + 0.05, 0.4))
      if (u >= A.P3e + 0.05) {
        const sc = lerp(1, 32 / 46, g)
        moren.style.display = 'block'
        moren.style.fontSize = 46 * sc + 'px'
        const w = 92 * sc
        moren.style.left = lerp(60, X_OLD - w / 2, g) + 'px'
        moren.style.top = lerp(Y_R + 98, Y_R + 22, g) + 'px'
        moren.style.color = mixRGB(INK, GRAY, g)
        moren.style.opacity = 1 - out
      } else moren.style.display = 'none'
      // old mark lands on 默认, lifts and turns red on the spoken 重估, then writes the topic
      if (u >= A.t3d - 0.04) {
        let y = lerp(Y_R - 28, Y_R, eBack(prog(u, A.t3d - 0.04, 0.24), 1.2))
        const a = prog(u, A.t3d - 0.04, 0.1)
        const lift = eOut(prog(u, A.t4v - 0.1, 0.25))
        if (lift > 0) y = Y_R - 22 * lift
        let sc = 1 + 0.15 * lift
        if (u >= A.T1) { const sd = prog(u, A.T1, 0.12); y = lerp(Y_R - 22, Y_R, sd * sd); sc = lerp(1.15, 1, sd) }
        const yy = y
        const x = dotX(u)
        if (lift > 0) disc(halo, x, yy, 19 * sc, RED, 0.22 * lift * (1 - out)); else halo.style.display = 'none'
        disc(dot, x, yy, 11 * sc, mixc(INK, RED, lift), a * (1 - out))
        if (u >= A.L) { const pp = eOut(prog(u, A.L, 0.42)); if (pp < 1) disc(ripple, x, yy, lerp(11, 32, pp), RED, 0.45 * (1 - pp), 2); else ripple.style.display = 'none' } else ripple.style.display = 'none'
      } else { dot.style.display = 'none'; halo.style.display = 'none'; ripple.style.display = 'none' }
      if (u >= A.t4v) {
        const a = prog(u, A.t4v, 0.2) * (1 - out)
        const yy = Y_R
        disc(ghostBg, X_OLD, yy, 9.5, [236, 232, 224], a); disc(ghost, X_OLD, yy, 11, GHOST, a, 2)
      } else { ghostBg.style.display = 'none'; ghost.style.display = 'none' }
      if (u >= A.T0 && dotX(u) > X_OLD + 14) box(measure, X_OLD + 14, Y_R - 2, dotX(u), Y_R + 2, RED, 1 - out)
      else measure.style.display = 'none'
      // kicker 今天我们
      if (u >= A.P4s - 0.12) {
        const a = eOut(prog(u, A.P4s - 0.12, 0.15))
        kick.style.display = 'block'; kick.style.opacity = a * (1 - out); kick.style.transform = `translateY(${6 * (1 - a)}px)`
        ks.forEach((e2, i) => { const onT = (i < 2 ? [A.P4s, A.t4t][i] : A.t4w + 0.06 * (i - 2)) - 0.05; e2.style.color = mixRGB([196, 191, 182], SECOND, prog(u, onT, 0.08)) })
      } else kick.style.display = 'none'
      // topic, written by the travelling dot (soft 24 px edge)
      if (u >= A.T0) {
        const E = dotX(u) - 10 - X_OLD
        topic.style.display = 'block'
        topic.style.webkitMaskImage = `linear-gradient(to right, #000 ${E - 24}px, transparent ${E}px)`
        topic.style.opacity = 1 - out
      } else topic.style.display = 'none'
      if (IN.date && u >= A.L) {
        const a = eOut(prog(u, A.L, 0.25))
        const cx = Math.min(X_NEW, 1020 - 80)
        Object.assign(date.style, { display: 'block', left: cx + 'px', top: Y_R + 24 + 6 * (1 - a) + 'px', opacity: a * (1 - out), transform: 'translateX(-50%)' })
      } else date.style.display = 'none'
      // the ruler has risen: top bar marks, brand, chapter
      if (u >= A.R1 - 0.04) {
        const pp = prog(u, A.R1 - 0.04, 0.2), sc = lerp(0.6, 1, eBack(pp, 1.2)), o = Math.min(1, pp * 3)
        box(tbTick, X0, Y_T - 6 * sc, X0 + 2, Y_T + 6 * sc, RED, o)
        const hp = prog(u, A.R1 + 0.16, 0.35)
        if (hp > 0 && hp < 1) disc(tbRip, X0, Y_T, lerp(15, 26, eOut(hp)), RED, 0.3 * (1 - hp)); else tbRip.style.display = 'none'
        disc(tbHalo, X0, Y_T, 15 * sc, RED, 0.18 * o); disc(tbDot, X0, Y_T, 9 * sc, RED, o)
      } else { [tbTick, tbHalo, tbDot, tbRip].forEach((x) => (x.style.display = 'none')) }
      const bp = u >= A.R1 - 0.15 ? eOut(prog(u, A.R1 - 0.15, 0.25)) : 0
      ;[brand, bdot, issue].forEach((x) => { x.style.opacity = bp; x.style.transform = `translateX(${-10 * (1 - bp)}px)` })
      chapI.style.opacity = bp
      chTicksI.forEach((tk, i) => { const x = tx(EP.chapters[i + 1].t0); if (u >= A.R0) box(tk, x - 1, lineY(u) - 6, x + 1, lineY(u) + 6, INK, eOut(prog(u, A.R0 + 0.65 * (A.R1 - A.R0), 0.35 * (A.R1 - A.R0)))); else tk.style.display = 'none' })
    }
  }

  // ---------------------------------------------------------------- title card and end card
  function card(spec, kind) {
    const L = $('div', 'layer', stage)
    const k = $('div', 'tc-kicker abs', L, { left: '80px', top: (spec.y0 || 440) + 'px' }); k.textContent = spec.kicker
    const h = $('div', 'tc-head abs', L, { left: '80px', top: (spec.y0 || 440) + 64 + 'px' })
    const hs = charSpans(h, spec.head)
    const nl = spec.head.split('\n').length
    const ruleY = (spec.y0 || 440) + 64 + nl * 128 + 36
    const r = $('div', 'rule abs', L, { left: '80px', top: ruleY + 'px', width: (spec.ruleW || 526) + 'px' })
    let s = null
    if (spec.sub) { s = $('div', 'tc-sub abs', L, { left: '80px', top: ruleY + 50 + 'px' }); s.textContent = spec.sub }
    const who = $('div', 'tc-who abs', L, { left: '80px', top: ruleY + (spec.sub ? 152 : 58) + 'px' })
    who.innerHTML = `<i style="background:var(--teal)"></i><span>顾东政</span><span class="x">×</span><i style="background:var(--amber)"></i><span>吴原同</span>`
    let e2 = null
    if (spec.foot) { e2 = $('div', 'tc-sub abs', L, { left: '80px', top: ruleY + 136 + 'px', fontSize: '32px', color: 'var(--ink2)' }); e2.textContent = spec.foot }
    return (t) => {
      const on = t >= spec.t0 - 0.05 && t <= spec.t1 + 0.05
      L.style.display = on ? 'block' : 'none'
      if (!on) return
      const a = spec.t0
      const out = prog(t, spec.t1 - 0.45, 0.45)
      L.style.opacity = 1 - out
      fadeUp(k, prog(t, a + 0.15, 0.5), 10)
      typer(hs, t, a + 0.35, spec.cps || 16)
      const hEnd = a + 0.35 + hs.length / (spec.cps || 16)
      const rq = eIO(prog(t, hEnd - 0.1, 0.6)); r.style.transform = `scaleX(${rq})`; r.style.opacity = rq > 0 ? 1 : 0
      if (s) fadeUp(s, prog(t, hEnd + 0.15, 0.5), 10)
      fadeUp(who, prog(t, hEnd + (s ? 0.4 : 0.2), 0.5), 10)
      if (e2) fadeUp(e2, prog(t, hEnd + 0.6, 0.5), 10)
    }
  }
  const drawTitle = card(EP.title, 'title')
  const drawEnd = card(EP.end, 'end')

  // ---------------------------------------------------------------- frame
  function drawChrome(t) {
    const introOn = IN && t >= IN.t0 + IN.a.t1n - 0.2 && t < B0
    const on = introOn || (t >= B0 - (IN ? 0 : 0.4) && t <= B1 + 0.3)
    chrome.style.display = on ? 'block' : 'none'
    if (!on) return
    chrome.style.opacity = IN ? (t < B0 ? eOut(prog(t, IN.t0 + IN.a.t1n - 0.2, 0.25)) : 1) * (1 - prog(t, B1 - 0.1, 0.4)) : prog(t, B0 - 0.4, 0.5) * (1 - prog(t, B1 - 0.1, 0.4))
    topbar.style.display = t >= B0 ? 'block' : 'none'
    subEl.style.display = subName.style.display = t >= B0 ? 'block' : 'none'
    const x = tx(t)
    tlProg.style.width = x - X0 + 'px'
    tlDot.style.left = x + 'px'
    EP.chapters.forEach((c, i) => { ticks[i].style.background = t >= c.t0 ? 'var(--red)' : 'var(--ink)' })
    let ci = 0
    EP.chapters.forEach((c, i) => { if (t >= c.t0 - 0.2) ci = i })
    const C = EP.chapters[ci]
    const key = C.no + C.name
    if (chapEl.dataset.k !== key) { chapEl.dataset.k = key; chapEl.innerHTML = `<b>${C.no}</b>${C.name}` }
    chapEl.style.opacity = 0.35 + 0.65 * prog(t, C.t0 - 0.2, 0.5)
    // speaker chips
    const spk = t < B0 && IN ? window.__introSpeaker(t) : speakerAt(t)
    for (const k of ['gu', 'wu']) {
      const c = chips[k], act = k === spk
      c.name.style.color = act ? 'var(--ink)' : '#a8a39a'
      if (act) {
        Object.assign(c.ring.style, { border: `2.5px solid ${SPK[k].css}`, background: 'rgba(250,248,243,.5)' })
        Object.assign(c.dot.style, { width: '14px', height: '14px', background: k === 'gu' ? '#1f3d41' : SPK[k].css })
      } else {
        Object.assign(c.ring.style, { border: '0', background: 'none' })
        Object.assign(c.dot.style, { width: '10px', height: '10px', background: SPK[k].soft })
      }
    }
    // voice bars
    const col = spk ? SPK[spk].css : '#8e8a83'
    for (let i = 0; i < 8; i++) {
      const v = envSmooth(t - i * 0.035, 0.03)
      const h = 6 + v * (18 + 8 * Math.sin(i * 1.7 + 0.5) + 6)
      vbars[i].style.height = h.toFixed(1) + 'px'
      vbars[i].style.background = col
      vbars[i].style.opacity = 0.55 + 0.45 * v
    }
    // subtitles
    let li = -1
    for (let i = 0; i < EP.subs.length; i++) { const L = EP.subs[i]; if (L.t0 - 0.12 <= t) li = i; else break }
    if (li >= 0) { const L = EP.subs[li]; const nxt = EP.subs[li + 1]; if (t > L.t1 + 0.9 && (!nxt || t < nxt.t0 - 0.12)) li = -1 }
    if (li !== curSub) {
      curSub = li; subEl.innerHTML = ''; subSpans = []
      if (li >= 0) {
        const L = EP.subs[li]
        L.chars.forEach((c) => { const s = $('span', null, subEl); s.textContent = c.c; subSpans.push(s) })
        const prev = EP.subs[li - 1]
        const showName = !prev || prev.spk !== L.spk || L.t0 - prev.t1 > 6
        subName.textContent = showName ? SPK[L.spk].name : ''
        subName.style.color = SPK[L.spk].css
      } else { subName.textContent = '' }
    }
    if (li >= 0) {
      const L = EP.subs[li]
      const fin = prog(t, L.t0 - 0.12, 0.12)
      subEl.style.opacity = fin
      subName.style.opacity = fin
      L.chars.forEach((c, i) => {
        const p = prog(t, c.t0, 0.09)
        const hot = c.hl ? RED : INK
        subSpans[i].style.color = mixRGB(GRAY, hot, p)
      })
    }
  }

  // portrait: centre each scene's content between the top bar and the subtitles (measured once, after fonts load)
  let centred = false
  function centreScenes() {
    centred = true
    const TOP = 168, BOT = 1178
    for (const sc of scenes) {
      if (sc.S.noCenter) continue
      const prev = sc.el.style.display
      sc.el.style.display = 'block'
      let y0 = 1e9, y1 = -1e9
      for (const c of sc.el.children) {
        if (c.classList.contains('qmark')) continue
        const r = c.getBoundingClientRect()
        if (r.height <= 0) continue
        y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom)
      }
      sc.el.style.display = prev
      if (y1 < y0) continue
      let dy = (TOP + BOT) / 2 - (y0 + y1) / 2
      dy = Math.min(dy, BOT - y1)          // never into the subtitles
      dy = Math.max(dy, TOP - y0)          // never under the top bar
      if (sc.S.dy != null) dy = sc.S.dy
      sc.el.style.top = Math.round(dy) + 'px'
      sc.dy = Math.round(dy)
    }
    window.__scenes = scenes.map((s) => ({ idx: s.idx, t0: s.t0, t1: s.t1, dy: s.dy }))
  }

  function drawScenes(t) {
    if (!centred) centreScenes()
    for (const s of scenes) {
      const fin = prog(t, s.t0 - 0.05, 0.4)
      const fout = s.S.hold ? 0 : prog(t, s.t1 - 0.3, 0.35)
      const vis = t >= s.t0 - 0.1 && t <= s.t1 + 0.1
      if (!vis) { if (s.el.style.display !== 'none') s.el.style.display = 'none'; continue }
      s.el.style.display = 'block'
      s.el.style.opacity = Math.min(fin, 1 - fout)
      for (const it of s.items) it.upd(t, it.a)
    }
  }

  window.renderFrame = (t) => {
    const C = EP.coldopen
    // dark plate over the cold open, cross to paper at the title
    const d = IN ? (t < C.t1 ? 1 : 0) : 1 - prog(t, C.t1 + 0.05, 0.55)
    dark.style.opacity = d
    dark.style.display = d > 0 ? 'block' : 'none'
    drawColdOpen(t)
    if (IN) { drawIntro(t); drawTitle(-100) } else drawTitle(t)
    drawScenes(t)
    drawChrome(t)
    drawEnd(t)
  }
  window.ready = true
})()
