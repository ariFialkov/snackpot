// Rasterises public/icons/icon.svg into the PNG sizes the PWA manifest needs.
// Run with: node scripts/make-icons.mjs   (needs Playwright's Chromium)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // resolves a global install via NODE_PATH too
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad, radius] of [['icon-192', 192, 0, 22], ['icon-512', 512, 0, 22], ['icon-maskable-512', 512, 12, 0], ['apple-touch-icon', 180, 0, 0]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:${pad ? 'linear-gradient(#6fcfff,#ffd6ec)' : 'transparent'}"><div style="width:${size}px;height:${size}px;box-sizing:border-box;padding:${pad}%;"><div style="width:100%;height:100%;border-radius:${radius}%;overflow:hidden">${svg}</div></div></body>`);
  await page.screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
}
await browser.close();
