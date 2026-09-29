// Render frames of the episode with N parallel headless Chrome pages, piping JPEGs into ffmpeg chunks.
// node render.mjs --from 0 --to 30 --workers 12 --out ../outputs/x.mp4 [--stills 1,5.5,9] [--fps 60]
import puppeteer from 'puppeteer-core'
import http from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, extname, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
const ROOT = dirname(new URL(import.meta.url).pathname)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' }
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []))
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const f = join(ROOT, p === '/' ? 'index.html' : p)
  if (!existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  res.end(readFileSync(f))
}).listen(0)
const port = server.address().port
const FPS = Number(args.fps || 60)
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 0,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
})
async function openPage() {
  const p = await browser.newPage()
  await p.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 })
  p.on('console', (m) => { const s = m.text(); if (/NOT FOUND|unknown|Error/i.test(s)) console.log('[page]', s) })
  p.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForFunction(() => window.ready === true)
  if (args.handoff) await p.evaluate((h) => { window.EP.coldopen.handoff = h }, args.handoff)
  const cdp = await p.createCDPSession()
  return { p, cdp }
}
async function shot(pg, t, fmt = 'jpeg') {
  const vw = await pg.p.evaluate(() => [window.innerWidth, window.innerHeight, window.devicePixelRatio])
  if (vw[0] !== 1080 || vw[1] !== 1440 || vw[2] !== 1) { console.log('viewport drift', vw, 'at', t); await pg.p.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 }) }
  await pg.p.evaluate((t) => window.renderFrame(t), t)
  const r = await pg.cdp.send('Page.captureScreenshot', { format: fmt, quality: fmt === 'jpeg' ? 94 : undefined, optimizeForSpeed: true, fromSurface: true,
    clip: { x: 0, y: 0, width: 1080, height: 1440, scale: 1 } })
  return Buffer.from(r.data, 'base64')
}
try {
  if (args.stills) {
    const pg = await openPage()
    const dir = resolve(args.dir || join(ROOT, 'stills')); mkdirSync(dir, { recursive: true })
    for (const s of args.stills.split(',')) {
      const t = Number(s)
      writeFileSync(join(dir, `s_${t.toFixed(2).padStart(7, '0')}.jpg`), await shot(pg, t))
    }
    if (args.scenes) console.log(JSON.stringify(await pg.p.evaluate(() => window.__scenes)))
    console.log('stills ->', dir)
  } else {
    const from = Number(args.from || 0), to = Number(args.to), N = Number(args.workers || 12)
    const out = resolve(args.out)
    const tmp = out + '.parts'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS), total = f1 - f0
    const per = Math.ceil(total / N)
    let done = 0; const T0 = Date.now()
    const tick = setInterval(() => { const el = (Date.now() - T0) / 1000; console.log(`${done}/${total} frames, ${(done / el).toFixed(1)} fps`) }, 15000)
    await Promise.all(Array.from({ length: N }, async (_, w) => {
      const a = f0 + w * per, b = Math.min(f1, a + per)
      if (a >= b) return
      const pg = await openPage()
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), join(tmp, `part_${String(w).padStart(3, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
      for (let f = a; f < b; f++) {
        const buf = await shot(pg, f / FPS)
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        done++
      }
      ff.stdin.end()
      await new Promise((r) => ff.on('close', r))
      return pg   // pages stay open until every worker is done: closing one changed the others' viewport
    })).then((pages) => Promise.all(pages.filter(Boolean).map((pg) => pg.p.close())))
    clearInterval(tick)
    const list = Array.from({ length: N }, (_, w) => join(tmp, `part_${String(w).padStart(3, '0')}.mp4`)).filter(existsSync)
    writeFileSync(join(tmp, 'list.txt'), list.map((f) => `file '${f}'`).join('\n'))
    await new Promise((r, j) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', (c) => (c ? j(c) : r())))
    console.log(`video -> ${out} (${total} frames in ${((Date.now() - T0) / 1000).toFixed(0)} s)`)
  }
} finally {
  await browser.close(); server.close()
}
