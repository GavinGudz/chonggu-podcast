import puppeteer from 'puppeteer-core'
import { pathToFileURL } from 'node:url'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--allow-file-access-from-files'] })
const p = await b.newPage(); await p.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 })
await p.goto(pathToFileURL(process.argv[2]).href); await p.evaluate(() => document.fonts.ready)
await p.screenshot({ path: process.argv[3], clip: { x: 0, y: 0, width: 1080, height: 1440 } })
await b.close()
