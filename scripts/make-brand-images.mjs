/**
 * Generates favicons + the 1200×630 OG image into /public.
 * Run after changing the logo or headline: `npm run images`
 * (uses sharp from Astro's deps and the preinstalled Playwright/Chromium).
 */
import sharp from 'sharp';
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = path.join(root, 'src/assets/brand/AH-junk-removal-logo-google-1080.png');
const pub = (f) => path.join(root, 'public', f);

// Square icons: the logo already sits on its gradient tile.
for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  await sharp(logo).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(pub(file));
}

// favicon.ico (single 32×32 PNG-in-ICO)
const png32 = await sharp(logo).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png32.length, 14); header.writeUInt32LE(22, 18);
await writeFile(pub('favicon.ico'), Buffer.concat([header, png32]));

// OG image — rendered HTML so we get the real brand fonts.
// Playwright resolved via require so a globally installed copy (NODE_PATH) works too.
const { chromium } = createRequire(import.meta.url)('playwright');
const font = async (f) => `data:font/woff2;base64,${(await readFile(pub(`fonts/${f}`))).toString('base64')}`;
const logoData = `data:image/png;base64,${(await sharp(logo).resize(440, 440).png().toBuffer()).toString('base64')}`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:D;font-style:italic;font-weight:800;src:url(${await font('barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:B;font-weight:600;src:url(${await font('barlow-latin-600-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#080D16;color:#fff;font-family:B,sans-serif;position:relative}
.g{position:absolute;inset:auto 0 0 0;height:18px;background:linear-gradient(100deg,#DE5C08,#614355 50%,#0248A9)}
.glow{position:absolute;right:-120px;top:-120px;width:760px;height:760px;background:radial-gradient(circle,rgba(2,72,169,.55),transparent 65%)}
.wrap{position:relative;display:flex;align-items:center;gap:56px;height:612px;padding:0 72px}
img{width:400px;height:400px;border-radius:36px;box-shadow:0 30px 80px rgba(0,0,0,.5);flex:none}
h1{font-family:D;font-style:italic;text-transform:uppercase;font-size:112px;line-height:.9}
h1 span{color:#FF8A3D}
p{margin-top:22px;font-size:34px;color:#E9ECF1}
.k{display:inline-block;margin-bottom:22px;padding:6px 18px;background:#FD5E01;color:#080D16;font-family:D;font-size:28px;text-transform:uppercase;letter-spacing:.06em;transform:skewX(-6deg)}
</style></head><body><div class="glow"></div><div class="wrap"><img src="${logoData}"><div>
<div class="k">Houston, TX · 7 days a week</div><h1>Junk gone.<br><span>Today.</span></h1><p>Same-day junk removal · (346) 599-8378</p></div></div><div class="g"></div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: 'png' });
await browser.close();
await sharp(shot).jpeg({ quality: 82, mozjpeg: true }).toFile(pub('og.jpg'));
console.log('brand images written to /public');
