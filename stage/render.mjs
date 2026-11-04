// 《重估》舞台渲染：页面（window.ready / window.seek）用 puppeteer 自带的 Chrome for Testing 逐帧截，ffmpeg 编码。Mac 和 Windows 一样跑：
// 排版（字体、字号、位置）两边一样，像素差一点（Windows 的 Chrome 用 DirectWrite 画字，抗锯齿和 Mac 不同；--font-render-hinting 只在 Linux 上管用）。
// 逐帧比较只在同一台机器上比（2K 对 1080p），不拿 Windows 的帧和 Mac 的成片硬比。
// 一般不直接用，由 python -m chonggu stills / render 调（它先生成 index.html、字体、贴图）。直接用时：
//   node render.mjs --root <这一期>/out/stage --root <这一期> --root <工具包>/stage --stills 1,5,9 [--h 720] [--out 文件夹]   → 截图（几个人同时抽帧时各用各的 --out）
//   node render.mjs --root … --video out.mp4 [--from 0 --to 91.35] [--h 1080] [--workers 6] [--stable 8 --tol .002] [--gpumem 8192]
//   node render.mjs --root … --cues cues.json        → 导出画面代码登记的切点、音效、原声（混音用）
// --root 可以给好几个：网址 /x/y.js 依次在这几个文件夹里找，先找到的算（这一期的文件可以盖过工具包的同名文件）。不给就是当前文件夹。
// 浏览器：默认 puppeteer 装的 Chrome for Testing（npm install 时下载；没有就 npx puppeteer browsers install chrome）；环境变量 CHONGGU_CHROME 可以换成别的 Chrome。
// ffmpeg：PATH 里的 ffmpeg，或环境变量 CHONGGU_FFMPEG。帧率固定 30（实拍帧序列都是 30fps）。
import puppeteer from 'puppeteer'
import http from 'node:http'
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, extname, resolve, sep, basename } from 'node:path'
import { spawn } from 'node:child_process'
const TY = { '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' }
// 参数：--名字 值；--root 可以重复
const ARGV = process.argv.slice(2), A = {}, ROOTS = []
for (let i = 0; i < ARGV.length; i++) { const v = ARGV[i]; if (!v.startsWith('--')) continue; const k = v.slice(2), x = ARGV[i + 1] !== undefined && !ARGV[i + 1].startsWith('--') ? ARGV[++i] : 'true'; if (k === 'root') ROOTS.push(resolve(x)); else A[k] = x }
if (!ROOTS.length) ROOTS.push(process.cwd())
const find = (p) => { for (const r of ROOTS) { const f = resolve(r, '.' + p); if ((f === r || f.startsWith(r + sep)) && existsSync(f) && statSync(f).isFile()) return f } return null }   // 不许跳出 root
const srv = http.createServer((q, r) => { let p; try { p = decodeURIComponent(new URL(q.url, 'http://x').pathname) } catch { r.writeHead(400); return r.end() } const f = find(p); if (!f) { r.writeHead(404); return r.end() } r.writeHead(200, { 'Content-Type': TY[extname(f).toLowerCase()] || 'application/octet-stream' }); r.end(readFileSync(f)) }).listen(0, '127.0.0.1')
await new Promise((r) => srv.once('listening', r))
const port = srv.address().port, H = Number(A.h || 720), W = Math.round(H * 16 / 9), FPS = 30
const FFMPEG = process.env.CHONGGU_FFMPEG || 'ffmpeg'
const GPUMEM = A.gpumem ? [`--force-gpu-mem-available-mb=${A.gpumem}`, '--enable-gpu-rasterization', `--force-gpu-mem-discardable-limit-mb=${Math.round(A.gpumem / 2)}`] : []   // --gpumem MB：2K 时浏览器默认的显存额度不够，有的图层整块不画（树图上的标签只剩空框）
const WINTEXT = process.platform === 'win32' ? ['--disable-lcd-text', '--disable-font-subpixel-positioning'] : []   // Windows：字的抗锯齿每次一样（不随 ClearType 设置变）
// timeout 3 分钟：Windows Defender 头几次要扫一遍新的 Chrome，几路浏览器一起起，默认的 30 秒常常不够
const launch = () => puppeteer.launch({ executablePath: process.env.CHONGGU_CHROME || undefined, headless: true, timeout: 180000, protocolTimeout: 0, args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--allow-file-access-from-files', '--font-render-hinting=none', ...WINTEXT, ...GPUMEM] })
const RM = { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }   // Windows：ffmpeg 刚退出时杀毒、索引还拿着新文件（EBUSY / EPERM），多试几次
let br
try { br = await launch() } catch (e) { console.log('[出错] 浏览器起不来：' + e.message + '\n  先在 stage 文件夹里跑 npm install（会下载 Chrome for Testing），或设环境变量 CHONGGU_CHROME 指向一个 Chrome'); srv.close(); process.exit(3) }
async function open(b0) {
  const b1 = b0 ?? br; const p = await b1.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  p.on('console', (m) => { const s = m.text(); if (m.type() === 'error') console.log('[page:error]', s); else if (/error|NOT|找不到|没有|空档|重叠|出错|读不到/i.test(s)) console.log('[page]', s) })   // console.error 一律算错（chonggu 的门槛认 [page:error]）
  p.on('pageerror', (e) => console.log('[pageerror]', e.message))
  p.on('response', (r) => { if (r.status() >= 400) console.log('[http ' + r.status() + ']', decodeURIComponent(r.url())) })
  await p.goto(`http://127.0.0.1:${port}/${A.page || 'index.html'}`, { waitUntil: 'load' })
  await p.evaluate(() => window.ready)
  p.__cdp = await p.createCDPSession()   // 截图走同一个 CDP 会话（一帧开一个会越积越多）
  return p
}
const cap = async (p) => Buffer.from((await p.__cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } })).data, 'base64')
const shotAt = async (p, t) => { await p.evaluate(async (t) => { await window.seek(t); for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r)) }, t); await new Promise(r => setTimeout(r, 40)); return cap(p) }
// --stable N：截完一帧不换时刻再截一次，两次 JPEG 大小差超过 tol 就再等再截（最多 N 次），防止重画面没画完就被截走（半帧）
const TOL = Number(A.tol || .01)   // --tol：两次截图大小差多少算画完（默认 1%；一个小牌子只画了一半，大小差远不到 1%，2026-11-04 树图拉远时「ANT」牌子半帧就是这么漏的，重渲用 .002）
const stableAt = async (p, t) => { let a = await shotAt(p, t); const n = Number(A.stable || 0); for (let k = 0; k < n; k++) { await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await new Promise(r => setTimeout(r, 30)); const b = await cap(p); if (Math.abs(b.length - a.length) / a.length < TOL) return b; a = b } return a }
const run = (args) => new Promise((ok, no) => { const c = spawn(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'] }); c.on('error', no); c.on('close', (k) => (k ? no(Error(`ffmpeg 退出 ${k}`)) : ok())) })
try {
  if (A.cues) {   // 导出画面代码登记的切点和音效：node render.mjs --cues out.json
    const p = await open(); const r = await p.evaluate(() => ({ duration: window.duration, scenes: window.K?.SCENES || [], sfx: window.K?.SFX || [], aud: window.K?.AUD || [], src: window.K?.SRC || [], chapters: (window.timeline?.chapters || []).map(c => ({ pre: c.pre, name: c.name, t0: c.t0, t1: c.t1 })) }))
    writeFileSync(resolve(A.cues), JSON.stringify(r)); console.log('cues', r.scenes.length, r.sfx.length, r.aud.length)
  } else if (A.stills) {
    const p = await open(); const dir = resolve(A.out || 'stills'); mkdirSync(dir, { recursive: true })
    for (const s of String(A.stills).split(',').filter(Boolean)) writeFileSync(join(dir, `s_${Number(s).toFixed(2).padStart(6, '0')}.jpg`), await (A.stable ? stableAt(p, Number(s)) : shotAt(p, Number(s))))
    console.log('stills ->', dir)
  } else if (A.video) {
    const dur = await (await open()).evaluate(() => window.duration)
    const from = Number(A.from || 0), to = Number(A.to || dur), N = Number(A.workers || 8), out = resolve(A.video)
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS), per = Math.ceil((f1 - f0) / N), tmp = out + '.parts'
    rmSync(tmp, RM); mkdirSync(tmp, { recursive: true }); let done = 0; const T0 = Date.now()
    const tick = setInterval(() => console.log(`${done}/${f1 - f0} frames`), 15000)
    await Promise.all(Array.from({ length: N }, async (_, w) => {
      const a = f0 + w * per, b = Math.min(f1, a + per); if (a >= b) return
      await new Promise((r) => setTimeout(r, w * 500))   // 错开半秒一个，不一起抢着起浏览器
      const own = await launch(); const p = await open(own)
      const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), join(tmp, `p${String(w).padStart(3, '0')}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] })
      const closed = new Promise((r, j) => { ff.on('close', r); ff.on('error', j) })
      await shotAt(p, a / FPS)   // 每个 worker 的第一帧常常还没画好（曾闪过一帧空纸），先空拍一次
      for (let f = a; f < b; f++) { const buf = await stableAt(p, f / FPS); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); done++ }
      ff.stdin.end(); await closed; await own.close()
    }))
    clearInterval(tick)
    // 接起来：清单里只写文件名（相对清单所在的文件夹），Windows 的反斜杠和中文路径都不用转义
    const list = Array.from({ length: N }, (_, w) => `p${String(w).padStart(3, '0')}.mp4`).filter((f) => existsSync(join(tmp, f)))
    writeFileSync(join(tmp, 'list.txt'), list.map((f) => `file '${f}'`).join('\n'))
    await run(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', out])
    try { rmSync(tmp, RM) } catch (e) { console.log('[提醒] 临时文件夹没删掉：' + tmp) }   // 视频已经接好了，删不掉临时文件不算失败
    console.log(`video -> ${basename(out)} (${f1 - f0} frames, ${((Date.now() - T0) / 1000).toFixed(0)} s)`)
  } else console.log('要给 --stills、--video 或 --cues')
} finally { await br.close().catch(() => {}); srv.close() }
process.exit(0)
