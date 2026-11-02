// Render our three.js film page: serves site/ (+ three.js) on localhost, saves stills or a full MP4.
// usage: node render3d.mjs <site> <threeBuildDir> stills <outDir> t1 t2 ...   |   video <out.mp4> [fps]
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';
const [site, threeDir, mode, out, ...rest] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/three/') ? join(threeDir, url.slice(7)) : join(site, url === '/' ? 'index.html' : url);
  try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(base);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const frame = t => page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/png'); }, t);
if (mode === 'stills') {
  for (const t of rest) await writeFile(`${out}/t_${t}.png`, Buffer.from((await frame(Number(t))).split(',')[1], 'base64'));
} else {
  const fps = Number(rest[0] || 30), dur = await page.evaluate(() => window.DUR), n = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = Buffer.from((await frame(i / fps)).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await writeFile(out.replace(/\.mp4$/, '.events.json'), JSON.stringify(await page.evaluate(() => window.EV)));
  console.log('done', n, 'frames');
}
await browser.close(); server.close();
