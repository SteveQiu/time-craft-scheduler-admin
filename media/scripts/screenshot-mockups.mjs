import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_FILE = join(__dirname, 'mockup-pages.html');
const OUT_DIR = join(__dirname, '..', 'public', 'screenshots');

mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  { id: 1, name: 'browse-landing.png' },
  { id: 2, name: 'dashboard.png' },
  { id: 3, name: 'premium-upgrade.png' },
  { id: 4, name: 'premium-active.png' },
  { id: 5, name: 'calendar.png' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/') + '#' + p.id;
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.evaluate((id) => {
      document.querySelectorAll('section[data-page]').forEach(s => {
        s.style.display = s.dataset.page == id ? 'block' : 'none';
      });
    }, p.id.toString());
    await page.waitForTimeout(800);
    const file = join(OUT_DIR, p.name);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    const size = statSync(file).size;
    console.log(`✓ ${p.name} (${Math.round(size / 1024)}KB)`);
    await page.close();
  }
  await browser.close();
  console.log('Done!');
})();
