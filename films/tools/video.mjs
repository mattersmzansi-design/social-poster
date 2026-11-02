// Render every frame of our film page into an MP4 (no audio) by piping PNGs to ffmpeg.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const [site, out, fps = '30'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
await page.goto('file://' + site + '/index.html');
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
const dur = await page.evaluate(() => window.DUR);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(dur * Number(fps));
for (let i = 0; i < n; i++) {
  const png = await page.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/png'); }, i / Number(fps));
  const buf = Buffer.from(png.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${n}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
const ev = await page.evaluate(() => window.EV);
const fs = await import('node:fs'); fs.writeFileSync(out.replace(/\.mp4$/, '.events.json'), JSON.stringify(ev));
await browser.close();
console.log('done', n, 'frames');
