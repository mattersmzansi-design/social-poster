// Minimal renderer for our own film page: opens site/index.html and saves PNG stills at given times.
import { chromium } from 'playwright-core';
const [site, out, ...times] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
await page.goto('file://' + site + '/index.html');
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
for (const t of times) {
  await page.evaluate(t => window.render(t), Number(t));
  await page.locator('#c').screenshot({ path: `${out}/t_${t}.png` });
}
await browser.close();
