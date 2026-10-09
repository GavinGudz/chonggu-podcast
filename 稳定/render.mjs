// Render the canvas page with N parallel headless Chrome pages, piping JPEGs into ffmpeg chunks.
// node render.mjs --out out/video.mp4 [--from 0 --to 57.7] [--workers 8] [--fps 30]
// node render.mjs --stills 1,5.5,9 [--dir out/stills]
import puppeteer from 'puppeteer-core'
import http from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, extname, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
const ROOT = dirname(new URL(import.meta.url).pathname)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' }
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []))
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  res.end(readFileSync(f))
}).listen(0)
const port = server.address().port
const FPS = Number(args.fps || 30), VW = Number(args.w || 1920), VH = Number(args.h || 1080)
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 0,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
})
async function openPage() {
  const p = await browser.newPage()
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 })
  p.on('console', (m) => console.log('[page]', m.text()))
  p.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await p.goto(`http://localhost:${port}/page/${args.page || 'index.html'}?w=${VW}&h=${VH}`, { waitUntil: 'load' })
  await p.waitForFunction(() => window.ready === true, { timeout: 60000 })
  const cdp = await p.createCDPSession()
  return { p, cdp }
}
async function shot(pg, t) {
  await pg.p.evaluate((t) => window.renderFrame(t), t)
  const r = await pg.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true, fromSurface: true, clip: { x: 0, y: 0, width: VW, height: VH, scale: 1 } })
  return Buffer.from(r.data, 'base64')
}
try {
  if (args.cover) {
    const pg = await openPage()
    await pg.p.evaluate(() => window.renderCover())
    const shotPng = await pg.cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: VW, height: VH, scale: 1 } })
    writeFileSync(resolve(args.cover), Buffer.from(shotPng.data, 'base64'))
    console.log('cover ->', args.cover)
  } else if (args.events) {
    const pg = await openPage()
    writeFileSync(resolve(args.events), JSON.stringify(await pg.p.evaluate(() => window.__EVENTS), null, 1))
    console.log('events ->', args.events)
  } else if (args.stills) {
    const pg = await openPage()
    const dir = resolve(args.dir || join(ROOT, 'out', 'stills')); mkdirSync(dir, { recursive: true })
    for (const s of args.stills.split(',')) writeFileSync(join(dir, `s_${Number(s).toFixed(2).padStart(6, '0')}.jpg`), await shot(pg, Number(s)))
    console.log('scenes', JSON.stringify(await pg.p.evaluate(() => window.__S)), 'total', await pg.p.evaluate(() => window.TOTAL))
    console.log('stills ->', dir)
  } else {
    const probe = await openPage(); const total = await probe.p.evaluate(() => window.TOTAL); await probe.p.close()
    const from = Number(args.from || 0), to = Number(args.to || total), N = Number(args.workers || 8)
    const out = resolve(args.out)
    const tmp = out + '.parts'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS), totalF = f1 - f0, per = Math.ceil(totalF / N)
    let done = 0; const T0 = Date.now()
    const tick = setInterval(() => console.log(`${done}/${totalF} frames, ${(done / ((Date.now() - T0) / 1000)).toFixed(1)} fps`), 15000)
    const pages = await Promise.all(Array.from({ length: N }, async (_, w) => {
      const a = f0 + w * per, b = Math.min(f1, a + per)
      if (a >= b) return null
      const pg = await openPage()
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), join(tmp, `part_${String(w).padStart(3, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
      for (let f = a; f < b; f++) {
        const buf = await shot(pg, f / FPS)
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        done++
      }
      ff.stdin.end(); await new Promise((r) => ff.on('close', r))
      return pg
    }))
    await Promise.all(pages.filter(Boolean).map((pg) => pg.p.close()))
    clearInterval(tick)
    const list = Array.from({ length: N }, (_, w) => join(tmp, `part_${String(w).padStart(3, '0')}.mp4`)).filter(existsSync)
    writeFileSync(join(tmp, 'list.txt'), list.map((f) => `file '${f}'`).join('\n'))
    await new Promise((r, j) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', (c) => (c ? j(c) : r())))
    rmSync(tmp, { recursive: true, force: true })
    console.log(`video -> ${out} (${totalF} frames in ${((Date.now() - T0) / 1000).toFixed(0)} s)`)
  }
} finally {
  await browser.close(); server.close()
}
