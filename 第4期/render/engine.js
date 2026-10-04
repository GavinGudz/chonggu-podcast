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
  $('div', 'ep', topbar).textContent = EP.show.label || `第 ${EP.show.ep} 期`
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
    const ti = $('div', 'ti', e); ti.textContent = d.title
    let su = null
    if (d.sub) { su = $('div', 'su', e); su.textContent = d.sub }
    if (d.tsize) ti.style.fontSize = d.tsize + 'px'
    if (su && d.ssize) su.style.fontSize = d.ssize + 'px'
    if (d.center) { e.style.alignItems = 'center'; e.style.textAlign = 'center' }
    const draw = d.draw !== false && d.w && d.h && d.style !== 'dark'
    if (!draw) return (t, a) => fadeUp(e, prog(t, a, 0.45), 18)
    // outline draws round from the top-left, then the fill and the words come in
    const col = d.style === 'pink' || d.style === 'dashed' ? '#c4342c' : '#1b1915'
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    Object.assign(svg.style, { position: 'absolute', left: '-2px', top: '-2px', overflow: 'visible', pointerEvents: 'none' })
    svg.setAttribute('width', d.w); svg.setAttribute('height', d.h)
    const r = document.createElementNS(svgNS, 'rect')
    r.setAttribute('x', 1); r.setAttribute('y', 1); r.setAttribute('width', d.w - 2); r.setAttribute('height', d.h - 2)
    r.setAttribute('fill', 'none'); r.setAttribute('stroke', col); r.setAttribute('stroke-width', 2)
    if (d.style === 'dashed') r.setAttribute('stroke-dasharray', '8 6')
    const L = 2 * (d.w + d.h)
    if (d.style !== 'dashed') r.setAttribute('stroke-dasharray', L)
    svg.appendChild(r); e.appendChild(svg)
    const bg = getComputedStyle(e).backgroundColor
    return (t, a) => {
      const q = eIO(prog(t, a, 0.55))
      e.style.opacity = q > 0 ? 1 : 0
      e.style.borderColor = q >= 1 ? '' : 'transparent'
      svg.style.display = q >= 1 ? 'none' : 'block'
      if (d.style !== 'dashed') r.setAttribute('stroke-dashoffset', L * (1 - q))
      else r.style.opacity = q
      const f = eOut(prog(t, a + 0.25, 0.4))
      e.style.backgroundColor = f >= 1 ? '' : 'transparent'
      e.style.boxShadow = f > 0 && f < 1 ? `inset 0 0 0 2000px rgba(${d.style === 'pink' ? '241,217,211' : '250,248,243'},${(d.style === 'pink' ? 1 : 0.5) * f})` : ''
      ;[ti, su].forEach((x, i) => { if (!x) return; const g = prog(t, a + 0.3 + i * 0.12, 0.4); x.style.opacity = eOut(g); x.style.transform = `translateY(${(1 - eOut5(g)) * 12}px)` })
    }
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
    e.style.lineHeight = '0'
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


  // ================================================================ 第 4 期 additions: illustrated, animated primitives
  const svgNS_ = 'http://www.w3.org/2000/svg'
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(svgNS_, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e }
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x) }   // deterministic jitter
  const COL = { red: '#c4342c', ink: '#1b1915', gray: '#8e8a83', light: '#c4bfb6', pink: '#f1d9d3', teal: '#2b5459', amber: '#b58c46' }

  // ruler: the show's own motif (the intro's ruler). Line draws, ticks grow along it, labels sit under ticks,
  // an optional red dot lands and slides (from -> to), an optional red segment marks a span.
  ELS.ruler = (p, d, res) => {
    const W = d.w || 900, n = d.ticks || 10, sub = d.minor ?? 4
    const e = $('div', null, p); place(e, { x: d.x, y: d.y }); e.style.width = W + 'px'; e.style.height = '120px'
    const base = $('div', null, e, { position: 'absolute', left: 0, top: '40px', width: W + 'px', height: '4px', background: COL.ink, transformOrigin: '0 50%' })
    const ticks = []
    for (let i = 0; i <= n * (sub + 1); i++) {
      const major = i % (sub + 1) === 0
      const x = (W * i) / (n * (sub + 1))
      const tk = $('div', null, e, { position: 'absolute', left: x - (major ? 2 : 1) + 'px', width: (major ? 4 : 2) + 'px', height: (major ? 34 : 16) + 'px', top: (major ? 10 : 26) + 'px', background: major ? COL.ink : COL.light, transformOrigin: '50% 100%' })
      ticks.push({ tk, x })
    }
    const labs = (d.labels || []).map((L) => { const s = $('div', null, e, { position: 'absolute', left: W * L.pos + 'px', top: '62px', transform: 'translateX(-50%)', font: `${L.serif ? '900' : '600'} ${L.size || 32}px/1 ${L.serif ? 'var(--serif)' : 'var(--sans)'}`, color: L.red ? COL.red : '#6f6a63', whiteSpace: 'nowrap', letterSpacing: '1px' }); s.textContent = L.text; return { s, L } })
    const seg = d.seg ? $('div', null, e, { position: 'absolute', left: W * d.seg.from + 'px', top: '37px', width: W * (d.seg.to - d.seg.from) + 'px', height: '9px', background: COL.red, transformOrigin: '0 50%' }) : null
    const halo = $('div', null, e, { position: 'absolute', width: '44px', height: '44px', borderRadius: '22px', background: 'rgba(196,52,44,.18)', top: '19.5px' })
    const dot = $('div', null, e, { position: 'absolute', width: '24px', height: '24px', borderRadius: '12px', background: COL.red, top: '29.5px' })
    const ghost = $('div', null, e, { position: 'absolute', width: '22px', height: '22px', borderRadius: '11px', border: '2px solid ' + COL.gray, top: '30.5px', boxSizing: 'border-box' })
    const dl = d.dot ? { a: res(d.dot.at, null), slide: res(d.dot.slide_at, null) } : null
    return (t, a) => {
      const q = eIO(prog(t, a, d.dur || 0.9))
      base.style.transform = `scaleX(${q})`; base.style.opacity = q > 0 ? 1 : 0
      ticks.forEach(({ tk, x }) => { const g = eOut(prog(t, a + 0.1 + (x / W) * (d.dur || 0.9) * 0.9, 0.18)); tk.style.transform = `scaleY(${g})`; tk.style.opacity = g })
      labs.forEach(({ s, L }) => { const g = prog(t, L.at != null ? res(L.at, a) : a + 0.3 + L.pos * 0.6, 0.4); s.style.opacity = eOut(g); s.style.marginTop = (1 - eOut5(g)) * 10 + 'px' })
      if (seg) { const g = eIO(prog(t, res(d.seg.at, a + 1), 0.6)); seg.style.transform = `scaleX(${g})`; seg.style.opacity = g > 0 ? 1 : 0 }
      if (dl && dl.a != null && t >= dl.a) {
        const land = prog(t, dl.a, 0.3)
        let pos = d.dot.from ?? 0
        if (dl.slide != null) pos = lerp(d.dot.from ?? 0, d.dot.to ?? 1, eIO(prog(t, dl.slide, d.dot.dur || 1.2)))
        const x = W * pos
        const yb = lerp(-26, 0, eOut5(land))
        dot.style.left = x - 12 + 'px'; dot.style.opacity = eOut(land); dot.style.marginTop = yb + 'px'
        halo.style.left = x - 22 + 'px'; halo.style.opacity = eOut(land)
        const gx = W * (d.dot.from ?? 0)
        ghost.style.left = gx - 11 + 'px'; ghost.style.opacity = dl.slide != null && t > dl.slide + 0.2 && d.dot.ghost !== false ? 1 : 0
      } else { dot.style.opacity = 0; halo.style.opacity = 0; ghost.style.opacity = 0 }
    }
  }

  // board: the hallway score sheet. Rows slide in one after another; at blur_at the whole sheet goes soft and private.
  ELS.board = (p, d, res) => {
    const W = d.w || 900, RH = d.rh || 78
    const e = $('div', null, p); place(e, { x: d.x, y: d.y })
    Object.assign(e.style, { width: W + 'px', border: '2px solid ' + COL.ink, background: 'rgba(250,248,243,.62)', padding: '22px 30px 18px' })
    const head = $('div', null, e, { font: '900 46px/1 var(--serif)', paddingBottom: '18px', borderBottom: '2px solid ' + COL.ink, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' })
    $('span', null, head).textContent = d.title || '成绩榜'
    const hs = $('span', null, head, { font: '400 24px/1 var(--sans)', color: '#6f6a63', letterSpacing: '2px' }); hs.textContent = d.subtitle || ''
    const body = $('div', null, e)
    const rows = (d.rows || []).map((R, i) => {
      const r = $('div', null, body, { display: 'flex', alignItems: 'center', height: RH + 'px', borderBottom: i < d.rows.length - 1 ? '1px solid ' + COL.light : '0' })
      const rk = $('div', null, r, { width: '84px', font: `900 ${R.hot ? 46 : 40}px/1 var(--serif)`, color: R.hot ? COL.red : COL.ink }); rk.textContent = R.rank
      const nm = $('div', null, r, { flex: '1', display: 'flex', alignItems: 'center' })
      const bar = $('div', null, nm, { width: (R.nw || 180 + 140 * rnd(i, 3)) + 'px', height: '22px', borderRadius: '11px', background: R.hot ? COL.ink : '#b9b3a8' })
      if (R.name) { bar.style.display = 'none'; const s = $('span', null, nm, { font: '600 32px/1 var(--sans)' }); s.textContent = R.name }
      const sc = $('div', null, r, { font: `900 ${R.hot ? 46 : 40}px/1 var(--serif)`, color: R.hot ? COL.red : COL.ink, textAlign: 'right', minWidth: '120px' }); sc.textContent = R.score
      return r
    })
    const lock = d.blur_at ? $('div', null, p) : null
    if (lock) {
      place(lock, { x: d.x + W / 2 - 60, y: d.y + 40 }); lock.style.width = '120px'
      lock.innerHTML = `<svg width="120" height="140" viewBox="0 0 100 116" fill="none" stroke="#c4342c" stroke-width="6" stroke-linecap="round"><rect x="16" y="50" width="68" height="56" rx="8" fill="rgba(241,217,211,.9)"/><path d="M30 50 V34 a20 20 0 0 1 40 0 V50"/><circle cx="50" cy="76" r="7" fill="#c4342c"/></svg>`
    }
    return (t, a) => {
      fadeUp(e, prog(t, a, 0.45), 20)
      rows.forEach((r, i) => { const at = d.rows[i].at != null ? res(d.rows[i].at, a) : a + 0.3 + i * (d.stagger || 0.22); const g = prog(t, at, 0.4); r.style.opacity = eOut(g); r.style.transform = `translateX(${(1 - eOut5(g)) * -40}px)` })
      if (d.blur_at) {
        const bt = res(d.blur_at, a + 99)
        const g = eIO(prog(t, bt, 0.9))
        body.style.filter = `blur(${10 * g}px)`; body.style.opacity = 1 - 0.55 * g
        head.style.opacity = 1 - 0.3 * g
        if (lock) { const h = prog(t, bt + 0.5, 0.5); lock.style.opacity = eOut(h); lock.style.transform = `translateY(${(1 - eOut5(h)) * 30 + (d.rows.length * RH) / 2}px) scale(${lerp(0.8, 1, eOut5(h))})` }
      }
    }
  }

  // chat: an AI chat window. Optional search box types its query; messages pop in at their anchors.
  ELS.chat = (p, d, res) => {
    const W = d.w || 900
    const e = $('div', null, p); place(e, { x: d.x, y: d.y })
    Object.assign(e.style, { width: W + 'px', border: '2px solid ' + COL.ink, borderRadius: '18px', background: 'rgba(250,248,243,.72)', overflow: 'hidden' })
    const bar = $('div', null, e, { height: '58px', borderBottom: '2px solid ' + COL.ink, display: 'flex', alignItems: 'center', padding: '0 24px', gap: '12px' })
    ;[0, 1, 2].forEach((i) => $('i', null, bar, { width: '14px', height: '14px', borderRadius: '7px', background: i ? COL.light : COL.red, display: 'block' }))
    const tl = $('div', null, bar, { marginLeft: '16px', font: '600 24px/1 var(--sans)', color: '#6f6a63', letterSpacing: '2px' }); tl.textContent = d.title || '和 AI 的聊天记录'
    let qspan = null, caret = null
    if (d.search) {
      const sb = $('div', null, e, { margin: '22px 24px 6px', height: '64px', border: '2px solid ' + COL.ink, borderRadius: '32px', display: 'flex', alignItems: 'center', padding: '0 24px', font: '600 32px/1 var(--sans)' })
      sb.innerHTML = '<svg width="34" height="34" viewBox="0 0 100 100" fill="none" stroke="#1b1915" stroke-width="9" stroke-linecap="round"><circle cx="42" cy="42" r="26"/><line x1="62" y1="62" x2="86" y2="86"/></svg>'
      qspan = $('span', null, sb, { marginLeft: '16px' }); caret = $('span', null, sb, { width: '3px', height: '36px', background: COL.red, display: 'inline-block', marginLeft: '4px' })
    }
    const list = $('div', null, e, { padding: '18px 24px 26px', display: 'flex', flexDirection: 'column', gap: (d.gap || 18) + 'px' })
    const msgs = (d.msgs || []).map((M) => {
      const row = $('div', null, list, { display: 'flex', justifyContent: M.who === 'me' ? 'flex-end' : 'flex-start' })
      const b = $('div', null, row, { maxWidth: (d.maxw || 0.78) * W + 'px', padding: '16px 24px', borderRadius: '18px', font: `600 ${M.size || d.size || 32}px/1.4 var(--sans)`, whiteSpace: 'pre-wrap',
        background: M.who === 'me' ? (M.hot ? COL.red : COL.ink) : 'rgba(255,255,255,.75)', color: M.who === 'me' ? '#f0ece4' : COL.ink, border: M.who === 'me' ? '0' : '2px solid ' + COL.light,
        transformOrigin: M.who === 'me' ? '100% 100%' : '0 100%' })
      b.textContent = M.text
      if (M.date) { const dd = $('div', null, row, { font: '400 20px/1 var(--sans)', color: COL.gray, alignSelf: 'flex-end', margin: '0 12px 6px', order: M.who === 'me' ? -1 : 1 }); dd.textContent = M.date }
      return { row, b, M }
    })
    return (t, a) => {
      fadeUp(e, prog(t, a, 0.45), 22)
      if (qspan) {
        const st = res(d.search.at, a + 0.3), txt = d.search.text, cps = d.search.cps || 8
        const k = Math.max(0, Math.min(txt.length, Math.floor((t - st) * cps)))
        qspan.textContent = t >= st ? txt.slice(0, k) : ''
        caret.style.opacity = (Math.floor(t * 2.2) % 2 === 0 || (t >= st && k < txt.length)) && t >= a ? 1 : 0
      }
      msgs.forEach(({ row, b, M }, i) => {
        const at = M.at != null ? res(M.at, a) : a + 0.5 + i * 0.6
        const g = prog(t, at, 0.35)
        row.style.opacity = g > 0 ? 1 : 0
        b.style.opacity = eOut(g); b.style.transform = `scale(${lerp(0.86, 1, eOut5(g))})`
      })
    }
  }

  // curve: small chart, axes draw, then each line draws (exp / decay / linear / flat / s), a label at its end.
  ELS.curve = (p, d, res) => {
    const W = d.w || 900, H = d.h || 520
    const e = $('div', null, p); place(e, { x: d.x, y: d.y })
    const svg = mk('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, e); svg.style.overflow = 'visible'
    const P = { l: 20, r: 150, t: 30, b: 50 }
    const ax = mk('path', { d: `M${P.l} ${P.t} L${P.l} ${H - P.b} L${W - P.r + 60} ${H - P.b}`, stroke: COL.ink, 'stroke-width': 3, fill: 'none' }, svg)
    const axL = ax.getTotalLength ? 2 * H + W : 3000
    ax.setAttribute('stroke-dasharray', axL)
    const fx = { exp: (x) => (Math.exp(3.2 * x) - 1) / (Math.exp(3.2) - 1), decay: (x) => 0.92 * Math.exp(-2.6 * x) + 0.04, linear: (x) => x * 0.8 + 0.05, flat: () => 0.45, s: (x) => 1 / (1 + Math.exp(-10 * (x - 0.55))), down: (x) => 0.9 - 0.75 * x }
    const xl = d.xlabel ? (() => { const s = $('div', null, e, { position: 'absolute', left: W - P.r + 70 + 'px', top: H - P.b - 14 + 'px', font: '600 24px/1 var(--sans)', color: COL.gray, whiteSpace: 'nowrap' }); s.textContent = d.xlabel; return s })() : null
    const lines = (d.lines || []).map((Ln) => {
      const f = fx[Ln.type] || fx.linear
      let path = ''
      for (let i = 0; i <= 80; i++) { const x = i / 80; const X = P.l + x * (W - P.l - P.r); const Y = H - P.b - f(x) * (H - P.t - P.b); path += (i ? ' L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1) }
      const col = COL[Ln.color || 'ink'] || Ln.color
      const pa = mk('path', { d: path, stroke: col, 'stroke-width': Ln.width || 6, fill: 'none', 'stroke-linecap': 'round' }, svg)
      const L = 2.2 * W
      pa.setAttribute('stroke-dasharray', L)
      const endY = H - P.b - f(1) * (H - P.t - P.b)
      const dot = mk('circle', { cx: W - P.r, cy: endY, r: 10, fill: col }, svg)
      const lab = $('div', null, e, { position: 'absolute', left: W - P.r + 24 + 'px', top: endY - 28 + (Ln.dy || 0) + 'px', font: `900 ${Ln.size || 50}px/1 var(--serif)`, color: col, whiteSpace: 'nowrap' }); lab.textContent = Ln.label || ''
      return { pa, L, dot, lab, Ln }
    })
    return (t, a) => {
      const q = eIO(prog(t, a, 0.7)); ax.setAttribute('stroke-dashoffset', axL * (1 - q)); ax.style.opacity = q > 0 ? 1 : 0
      if (xl) xl.style.opacity = eOut(prog(t, a + 0.5, 0.4))
      lines.forEach(({ pa, L, dot, lab, Ln }, i) => {
        const at = Ln.at != null ? res(Ln.at, a) : a + 0.6 + i * 1.2
        const g = eIO(prog(t, at, Ln.dur || 1.4))
        pa.setAttribute('stroke-dashoffset', L * (1 - g)); pa.style.opacity = g > 0 ? 1 : 0
        const h = prog(t, at + (Ln.dur || 1.4) * 0.85, 0.35)
        dot.style.opacity = eOut(h); lab.style.opacity = eOut(h); lab.style.transform = `translateX(${(1 - eOut5(h)) * -14}px)`
      })
    }
  }

  // stack: blocks drop in and pile up from a baseline (越叠越高).
  ELS.stack = (p, d, res) => {
    const W = d.w || 800, H = d.h || 110, G = d.gap ?? 14
    const items = (d.items || []).map((It, i) => {
      const b = $('div', 'box ' + (It.style || ''), p)
      place(b, { x: d.x + (It.dx || 0), y: d.y - (i + 1) * H - i * G, w: It.w || W, h: H })
      Object.assign(b.style, { justifyContent: 'center', alignItems: d.center ? 'center' : 'flex-start' })
      const ti = $('div', 'ti', b); ti.textContent = It.text; ti.style.fontSize = (It.size || d.size || 46) + 'px'
      if (It.sub) { const s = $('div', 'su', b); s.textContent = It.sub }
      return { b, It, i }
    })
    const base = d.base !== false ? $('div', null, p, { position: 'absolute', left: d.x - 30 + 'px', top: d.y + 6 + 'px', width: W + 60 + 'px', height: '4px', background: COL.ink, transformOrigin: '0 50%' }) : null
    return (t, a) => {
      if (base) { const q = eIO(prog(t, a, 0.5)); base.style.transform = `scaleX(${q})`; base.style.opacity = q > 0 ? 1 : 0 }
      items.forEach(({ b, It, i }) => {
        const at = It.at != null ? res(It.at, a) : a + 0.3 + i * 0.5
        const g = prog(t, at, 0.5)
        b.style.opacity = eOut(prog(t, at, 0.18))
        b.style.transform = `translateY(${-90 * (1 - eBounce(g))}px)`
      })
    }
  }
  const eBounce = (x) => { x = clamp(x); const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375 }

  // door: a frame with a door leaf that swings open at open_at, revealing what is behind it.
  ELS.door = (p, d, res) => {
    const W = d.w || 320, H = d.h || 520
    const e = $('div', null, p); place(e, { x: d.x, y: d.y }); Object.assign(e.style, { width: W + 'px', height: H + 'px', perspective: '1400px' })
    const inside = $('div', null, e, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', background: d.hot === false ? 'rgba(250,248,243,.6)' : COL.pink, border: '3px solid ' + COL.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      font: `900 ${d.isize || 56}px/1.25 var(--serif)`, color: COL.red, whiteSpace: 'pre' })
    inside.textContent = d.inside || ''
    const leaf = $('div', null, e, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', background: '#ebe6dc', border: '3px solid ' + COL.ink, transformOrigin: '0 50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 ${d.lsize || 44}px/1.3 var(--serif)`, color: COL.ink, whiteSpace: 'pre', textAlign: 'center', boxSizing: 'border-box', backfaceVisibility: 'hidden' })
    leaf.textContent = d.label || ''
    $('div', null, leaf, { position: 'absolute', right: '28px', top: H / 2 - 10 + 'px', width: '20px', height: '20px', borderRadius: '10px', border: '3px solid ' + COL.ink })
    const panel = $('div', null, leaf, { position: 'absolute', left: '26px', top: '26px', right: '26px', bottom: '26px', border: '2px solid ' + COL.light })
    return (t, a) => {
      fadeUp(e, prog(t, a, 0.5), 24)
      const g = eIO(prog(t, res(d.open_at, a + 99), d.dur || 1.1))
      leaf.style.transform = `rotateY(${-78 * g}deg)`
      leaf.style.boxShadow = g > 0 ? `${-30 * g}px 0 40px rgba(0,0,0,${0.12 * g})` : ''
      inside.style.color = mixRGB([241, 217, 211], RED, prog(t, res(d.open_at, a + 99) + 0.4, 0.5))
    }
  }

  // ticket: an admission ticket with a perforated stub; slides in with a small turn.
  ELS.ticket = (p, d) => {
    const W = d.w || 760, H = d.h || 250, S = d.stub || 190
    const e = $('div', null, p); place(e, { x: d.x, y: d.y }); Object.assign(e.style, { width: W + 'px', height: H + 'px', transformOrigin: '20% 60%' })
    const main = $('div', null, e, { position: 'absolute', left: 0, top: 0, width: W - S + 'px', height: H + 'px', background: COL.pink, border: '3px solid ' + COL.red, borderRight: '0', borderRadius: '14px 0 0 14px', padding: '0 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' })
    const ti = $('div', null, main, { font: `900 ${d.tsize || 64}px/1.15 var(--serif)`, color: COL.red, whiteSpace: 'pre' }); ti.textContent = d.title || ''
    if (d.sub) { const su = $('div', null, main, { font: '500 28px/1.4 var(--sans)', color: '#6f6a63', marginTop: '12px', whiteSpace: 'pre' }); su.textContent = d.sub }
    const stub = $('div', null, e, { position: 'absolute', left: W - S + 'px', top: 0, width: S + 'px', height: H + 'px', background: COL.pink, border: '3px solid ' + COL.red, borderLeft: '3px dashed ' + COL.red, borderRadius: '0 14px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' })
    const st = $('div', null, stub, { font: '600 30px/1.3 var(--sans)', color: COL.red, letterSpacing: '6px', writingMode: 'vertical-rl' }); st.textContent = d.stubText || '入 场'
    ;[0, H].forEach((y) => $('div', null, e, { position: 'absolute', left: W - S - 16 + 'px', top: y - 16 + 'px', width: '32px', height: '32px', borderRadius: '16px', background: '#ece8e0', border: '3px solid ' + COL.red, boxSizing: 'border-box', clipPath: y ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)' }))
    return (t, a) => { const g = prog(t, a, 0.6); e.style.opacity = eOut(g); e.style.transform = `translateX(${(1 - eOut5(g)) * 80}px) rotate(${(1 - eOut5(g)) * -5}deg)` }
  }

  // stamp: a red seal that slams down.
  ELS.stamp = (p, d) => {
    const e = $('div', null, p); place(e, { x: d.x, y: d.y })
    Object.assign(e.style, { border: `${d.bw || 6}px double ${COL.red}`, borderRadius: '12px', padding: '14px 28px', font: `900 ${d.size || 64}px/1.1 var(--serif)`, color: COL.red, whiteSpace: 'pre', letterSpacing: '6px', textAlign: 'center' })
    e.textContent = d.text
    const rot = d.rot ?? -8
    return (t, a) => { const g = prog(t, a, 0.32); e.style.opacity = g > 0 ? 0.92 * eOut(prog(t, a, 0.1)) : 0; e.style.transform = `${d.align === 'center' ? 'translateX(-50%) ' : ''}rotate(${rot}deg) scale(${lerp(1.9, 1, eOut5(g))})` }
  }

  // counter: a number that counts to its value.
  ELS.counter = (p, d) => {
    const e = $('div', 'num', p); place(e, d)
    if (d.size) e.style.fontSize = d.size + 'px'
    if (d.color === 'ink') e.style.color = 'var(--ink)'
    return (t, a) => {
      const g = eOut(prog(t, a, d.dur || 1.2))
      const v = lerp(d.from ?? 0, d.to, g)
      e.textContent = (d.prefix || '') + v.toFixed(d.dec || 0) + (d.suffix || '')
      e.style.opacity = prog(t, a, 0.2)
      if (d.align === 'center') e.style.transform = 'translateX(-50%)'
    }
  }

  // crowd: many dots. mode 'funnel' squeezes them toward a one-plank bridge (独木桥), only `pass` get through, red;
  // mode 'pick' greys everyone except `hot` dots. Dots arrive in a scattered order.
  ELS.crowd = (p, d, res) => {
    const W = d.w || 900, H = d.h || 560, N = d.n || 140, cols = d.cols || 14, R = d.r || 9
    const e = $('div', null, p); place(e, { x: d.x, y: d.y }); Object.assign(e.style, { width: W + 'px', height: H + 'px' })
    const rowsN = Math.ceil(N / cols), gx = W / cols, gy = (H * 0.55) / rowsN
    const bx = W / 2, by = H * 0.78       // bridge mouth
    const plank = d.mode === 'funnel' ? $('div', null, e, { position: 'absolute', left: bx - 16 + 'px', top: by + 'px', width: '32px', height: H - by + 'px', background: COL.ink, transformOrigin: '50% 0' }) : null
    const pass = d.pass ?? 3, hot = new Set(d.hot || Array.from({ length: d.hotn || 0 }, (_, i) => Math.floor(rnd(i, 9) * N)))
    const dots = Array.from({ length: N }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols)
      const x0 = gx * (c + 0.5) + (rnd(i, 1) - 0.5) * gx * 0.5, y0 = gy * (r + 0.5) + (rnd(i, 2) - 0.5) * gy * 0.5
      const s = $('div', null, e, { position: 'absolute', width: 2 * R + 'px', height: 2 * R + 'px', borderRadius: R + 'px', background: COL.ink })
      // funnel target: a pile above the bridge mouth, the first `pass` (closest to centre) go through
      const ang = Math.PI * (0.15 + 0.7 * rnd(i, 4)), rad = 40 + 220 * Math.sqrt(rnd(i, 5))
      const xt = bx - Math.cos(ang) * rad, yt = by - Math.sin(ang) * rad * 0.55 - 12
      return { s, x0, y0, xt, yt, order: rnd(i, 7), i }
    })
    const passers = [...dots].sort((u, v) => Math.abs(u.x0 - bx) - Math.abs(v.x0 - bx)).slice(0, pass).map((o) => o.i)
    return (t, a) => {
      const ft = d.funnel_at ? res(d.funnel_at, a + 99) : null, pt = d.pick_at ? res(d.pick_at, a + 99) : null
      if (plank) { const q = eIO(prog(t, ft ?? a, 0.6)); plank.style.transform = `scaleY(${q})`; plank.style.opacity = q > 0 ? 1 : 0 }
      dots.forEach((o) => {
        const g = prog(t, a + o.order * 0.9, 0.35)
        let x = o.x0, y = o.y0, col = COL.ink, op = eOut(g), sc = lerp(0.3, 1, eOut5(g))
        if (ft != null) {
          const m = eIO(prog(t, ft + o.order * 0.6, 1.1))
          if (passers.includes(o.i)) {
            const k = passers.indexOf(o.i)
            const m2 = eIO(prog(t, ft + 1.4 + k * 0.45, 0.9))
            x = lerp(lerp(o.x0, bx, m), bx, m2) - R; y = lerp(lerp(o.y0, by - 10, m), by + 40 + k * 70, m2) - R
            col = m2 > 0.2 ? COL.red : COL.ink
          } else { x = lerp(o.x0, o.xt, m) - R; y = lerp(o.y0, o.yt, m) - R; col = mixRGB(INK, [196, 191, 182], m) }
        } else { x -= R; y -= R }
        if (pt != null && t >= pt) {
          const m = eIO(prog(t, pt, 0.6))
          if (hot.has(o.i)) { col = COL.red; sc *= lerp(1, 1.5, m) } else col = mixRGB(INK, [206, 201, 192], m)
        }
        Object.assign(o.s.style, { left: x.toFixed(1) + 'px', top: y.toFixed(1) + 'px', opacity: op, background: col, transform: `scale(${sc})` })
      })
    }
  }

  // marker: a highlighter band sweeps behind a line of text, then the text inks in.
  ELS.marker = (p, d) => {
    const e = $('div', null, p); place(e, { x: d.x, y: d.y }); e.style.whiteSpace = 'pre'
    const band = $('div', null, e, { position: 'absolute', left: '-10px', right: '-10px', top: '42%', height: '52%', background: d.band === 'red' ? 'rgba(196,52,44,.85)' : COL.pink, transformOrigin: '0 50%' })
    const tx_ = $('div', null, e, { position: 'relative', font: `900 ${d.size || 72}px/1.25 var(--serif)`, color: d.band === 'red' ? '#f0ece4' : COL.ink }); tx_.textContent = d.text
    return (t, a) => { const g = eIO(prog(t, a + 0.15, 0.5)); band.style.transform = `scaleX(${g})`; band.style.opacity = g > 0 ? 1 : 0; fadeUp(tx_, prog(t, a, 0.4), 10) }
  }

  // swap: a word that is struck through at strike_at and replaced by another word (尺子从「分数」换成「排名」).
  ELS.swap = (p, d, res) => {
    const e = $('div', null, p); place(e, { x: d.x, y: d.y })
    const A = $('div', null, e, { font: `900 ${d.size || 96}px/1.2 var(--serif)`, color: COL.ink, whiteSpace: 'pre', position: 'relative', display: 'inline-block' }); A.textContent = d.from
    const st = $('div', null, A, { position: 'absolute', left: '-6px', right: '-6px', top: '52%', height: '8px', background: COL.red, transformOrigin: '0 50%' })
    const B = $('div', null, e, { font: `900 ${d.size || 96}px/1.2 var(--serif)`, color: COL.red, whiteSpace: 'pre' }); B.textContent = d.to
    return (t, a) => {
      fadeUp(A, prog(t, a, 0.4), 12)
      const s = eIO(prog(t, res(d.strike_at, a + 1), 0.35)); st.style.transform = `scaleX(${s})`; st.style.opacity = s > 0 ? 1 : 0
      A.style.color = mixRGB(INK, [170, 165, 156], s)
      const g = prog(t, res(d.to_at, res(d.strike_at, a + 1) + 0.4), 0.45); B.style.opacity = eOut(g); B.style.transform = `translateY(${(1 - eOut5(g)) * 20}px)`
    }
  }

  const ICONS = {
    door: '<rect x="26" y="10" width="48" height="80"/><circle cx="64" cy="52" r="3"/><line x1="14" y1="90" x2="86" y2="90"/>',
    ticket: '<path d="M12 30 L88 30 L88 44 C80 44 80 56 88 56 L88 70 L12 70 L12 56 C20 56 20 44 12 44 Z"/><line x1="62" y1="32" x2="62" y2="68" stroke-dasharray="4 5"/>',
    ruler: '<rect x="8" y="36" width="84" height="28"/><line x1="20" y1="36" x2="20" y2="48"/><line x1="32" y1="36" x2="32" y2="44"/><line x1="44" y1="36" x2="44" y2="48"/><line x1="56" y1="36" x2="56" y2="44"/><line x1="68" y1="36" x2="68" y2="48"/><line x1="80" y1="36" x2="80" y2="44"/>',
    search: '<circle cx="42" cy="42" r="26"/><line x1="62" y1="62" x2="86" y2="86"/>',
    lock: '<rect x="20" y="46" width="60" height="44" rx="6"/><path d="M32 46 V32 a18 18 0 0 1 36 0 V46"/><circle cx="50" cy="68" r="5"/>',
    building: '<rect x="20" y="16" width="44" height="74"/><rect x="64" y="40" width="20" height="50"/><line x1="30" y1="30" x2="54" y2="30"/><line x1="30" y1="44" x2="54" y2="44"/><line x1="30" y1="58" x2="54" y2="58"/><line x1="36" y1="90" x2="36" y2="74"/><line x1="48" y1="90" x2="48" y2="74"/>',
    cap: '<path d="M8 40 L50 22 L92 40 L50 58 Z"/><path d="M26 48 L26 66 C38 76 62 76 74 66 L74 48"/><line x1="92" y1="40" x2="92" y2="64"/>',
    people: '<circle cx="36" cy="34" r="13"/><circle cx="66" cy="38" r="11"/><path d="M12 84 C14 62 26 54 36 54 C46 54 58 62 60 84"/><path d="M58 60 C62 58 64 58 66 58 C76 58 86 64 88 84"/>',
    boat: '<path d="M14 66 L86 66 L74 84 L26 84 Z"/><line x1="50" y1="66" x2="50" y2="12"/><path d="M50 14 L80 56 L50 56 Z"/><path d="M48 22 L24 56 L48 56"/>',
    mountain: '<path d="M6 86 L38 30 L56 58 L68 42 L94 86 Z"/><path d="M38 30 L46 44 L32 44 Z"/>',
    hourglass: '<path d="M26 12 L74 12 M26 88 L74 88"/><path d="M30 12 C30 38 50 44 50 50 C50 56 30 62 30 88 M70 12 C70 38 50 44 50 50 C50 56 70 62 70 88"/>',
    balance: '<line x1="50" y1="14" x2="50" y2="86"/><line x1="20" y1="28" x2="80" y2="28"/><path d="M20 28 L8 56 L32 56 Z"/><path d="M80 28 L68 56 L92 56 Z"/><line x1="34" y1="86" x2="66" y2="86"/>',
    plane: '<path d="M10 54 L90 30 L58 62 L60 84 L48 66 L28 74 L36 60 Z"/>',
    globe: '<circle cx="50" cy="50" r="38"/><ellipse cx="50" cy="50" rx="16" ry="38"/><line x1="12" y1="50" x2="88" y2="50"/><path d="M18 32 L82 32 M18 68 L82 68"/>',
    star: '<path d="M50 10 L61 38 L90 40 L67 58 L75 88 L50 71 L25 88 L33 58 L10 40 L39 38 Z"/>',
    key: '<circle cx="30" cy="50" r="16"/><line x1="46" y1="50" x2="90" y2="50"/><line x1="78" y1="50" x2="78" y2="64"/><line x1="66" y1="50" x2="66" y2="60"/>',
    sprout: '<line x1="50" y1="90" x2="50" y2="44"/><path d="M50 56 C30 56 20 44 18 26 C38 26 50 36 50 56 Z"/><path d="M50 46 C66 46 78 36 82 20 C64 20 52 30 50 46 Z"/>',
    stairs: '<path d="M10 86 L10 70 L32 70 L32 52 L54 52 L54 34 L76 34 L76 16 L92 16"/>',
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
      const res = (x, dflt) => (x == null ? dflt : anchor(x, t0))
      const upd = f(el, d, res)
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
    const issue = $('div', null, L_, { position: 'absolute', left: '174px', top: '56px', font: '400 22px/1 var(--sans)', color: 'var(--ink2)', letterSpacing: '2px' }); issue.textContent = EP.show.label || `第 ${EP.show.ep} 期`
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
    const SPK4 = EP.intro.spk || ['wu', 'gu', 'gu', 'wu']
    const spk = (u) => { let k = null; [[A.P1s, SPK4[0]], [A.P2s, SPK4[1]], [A.P3s, SPK4[2]], [A.P4s, SPK4[3]]].forEach(([s, w]) => { if (u >= s - 0.1) k = w }); return k }
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
    // chapter 01 is already on screen at full strength when the intro hands over: no second fade-in (it blinked)
    chapEl.style.opacity = IN && ci === 0 ? 1 : 0.35 + 0.65 * prog(t, C.t0 - 0.2, 0.5)
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

  const eIOs2 = (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2
  function drawScenes(t) {
    if (!centred) centreScenes()
    for (const s of scenes) {
      const fin = prog(t, s.t0 - 0.05, 0.4)
      const fout = s.S.hold ? 0 : prog(t, s.t1 - 0.3, 0.35)
      const vis = t >= s.t0 - 0.1 && t <= s.t1 + 0.1
      if (!vis) { if (s.el.style.display !== 'none') s.el.style.display = 'none'; continue }
      s.el.style.display = 'block'
      s.el.style.opacity = Math.min(fin, 1 - fout)
      if (s.S.cam !== false) {
        const u = clamp((t - s.t0) / Math.max(1, s.t1 - s.t0))
        const z = s.S.cam === 'out' ? lerp(1.035, 1, eIOs2(u)) : lerp(1, s.S.zoom || 1.03, eIOs2(u))
        const enter = 1 - eOut5(prog(t, s.t0 - 0.05, 0.6))
        s.el.style.transformOrigin = `540px ${650 - (s.dy || 0)}px`
        s.el.style.transform = `translateY(${enter * 18}px) scale(${z.toFixed(4)})`
      }
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
