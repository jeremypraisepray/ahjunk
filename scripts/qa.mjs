/**
 * Acceptance checks from HANDOFF §8, run against a running site (default: `npm run dev`).
 *   npm run dev            # in one terminal (GHL_MODE unset → mock mode, nothing leaves the machine)
 *   npm run qa             # in another;  or: node scripts/qa.mjs http://localhost:4321
 * Saves screenshots to docs/screens/. Exits non-zero if any check fails.
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { default: AxeBuilder } = await import('@axe-core/playwright');

const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = (opts = {}) => browser.newContext({ reducedMotion: 'reduce', ...opts });
await mkdir('docs/screens', { recursive: true });

// 1. Mobile above-the-fold
{
  const c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const m = await p.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { h1: r('h1').bottom, chips: r('[data-step="1"] .chips').bottom, zip: r('#q-zip').bottom, next: r('[data-step="1"] [data-next]').bottom, vh: innerHeight };
  });
  check('390×844: H1 + step 1 (chips, ZIP, Next) visible without scrolling', Math.max(m.h1, m.chips, m.zip, m.next) <= m.vh, JSON.stringify(m));
  check('390×844: sticky bar hidden while hero form in view', await p.locator('[data-action-bar]').evaluate((el) => el.classList.contains('is-hidden')));
  await p.evaluate(() => window.scrollTo(0, 2400));
  await p.waitForTimeout(400);
  check('390×844: sticky bar visible after scrolling past the form', await p.locator('[data-action-bar]').evaluate((el) => !el.classList.contains('is-hidden')));
  const bar = await p.locator('[data-action-bar] a').evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href'), Math.round(a.getBoundingClientRect().height)]));
  check('Sticky bar has Call / Text a Photo / Free Quote (≥44px)', bar.length === 3 && bar[0][1].startsWith('tel:') && bar[1][1].startsWith('sms:') && bar.every((b) => b[2] >= 44), JSON.stringify(bar));
  await p.locator('[data-action-bar] a', { hasText: 'Free Quote' }).click();
  await p.waitForTimeout(700);
  const top = await p.locator('[data-quote-card]').evaluate((el) => el.getBoundingClientRect().top);
  check('Sticky bar "Free Quote" scrolls to the form', top >= 0 && top < 200, `card top ${Math.round(top)}`);
  await p.locator('#q-zip').focus();
  await p.waitForTimeout(100);
  check('Sticky bar hides while typing (keyboard up)', await p.locator('[data-action-bar]').evaluate((el) => el.classList.contains('is-hidden')));
  await p.screenshot({ path: 'docs/screens/home-390-fold.jpg', type: 'jpeg', quality: 80 });
  await c.close();
}

// 2. Desktop above-the-fold
for (const [w, h] of [[1280, 720], [1440, 900]]) {
  const c = await ctx({ viewport: { width: w, height: h } });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const b = await p.locator('[data-quote-card]').evaluate((el) => el.getBoundingClientRect().bottom);
  check(`${w}×${h}: full quote card above the fold`, b <= h, `card bottom ${Math.round(b)}`);
  if (w === 1440) await p.screenshot({ path: 'docs/screens/home-1440-fold.jpg', type: 'jpeg', quality: 80 });
  await c.close();
}

// 3. No horizontal scroll at QA breakpoints + full-page screenshots
for (const w of [360, 390, 430, 768, 834, 1024, 1280, 1440, 1920]) {
  const c = await ctx({ viewport: { width: w, height: 900 } });
  const p = await c.newPage();
  for (const path of ['/', '/services/garage-storage-cleanouts/', '/areas/bellaire/']) {
    await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) check(`No horizontal scroll at ${w}px on ${path}`, false, `scrollWidth ${sw}`);
  }
  if ([390, 768, 1440].includes(w)) {
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    // scroll through so lazy images and content-visibility sections render
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await p.waitForLoadState('networkidle');
    await p.screenshot({ path: `docs/screens/home-${w}.jpg`, type: 'jpeg', quality: 75, fullPage: true });
  }
  await c.close();
}
if (!results.some((r) => r.name.startsWith('No horizontal') && !r.ok)) check('No horizontal scroll at 360–1920px (home, service, area pages)', true);

// 4. Service card pre-selects + ZIP checker
{
  const c = await ctx({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  let allOk = true;
  for (const item of await p.locator('[data-quote-item]').evaluateAll((as) => as.map((a) => a.dataset.quoteItem))) {
    await p.locator(`[data-quote-item="${item}"]`).first().click();
    await p.waitForTimeout(600);
    const checked = await p.locator(`input[name=items][value="${item}"]`).isChecked();
    const top = await p.locator('[data-quote-card]').evaluate((el) => el.getBoundingClientRect().top);
    const focused = await p.evaluate(() => !!document.activeElement?.closest('[data-quote-card]'));
    if (!checked || top < -5 || top > 300 || !focused) allOk = false;
    await p.locator(`input[name=items][value="${item}"]`).uncheck();
  }
  check('Every service card pre-selects its chip, scrolls to and focuses the form', allOk);

  const zipCases = { '77019': 'River Oaks', '77401': 'Bellaire', '77005': 'West University Place', '77094': 'Energy Corridor', '77010': 'Downtown', '77479': 'Sugar Land', '77024': 'Hedwig Village', '77345': 'Kingwood', '77441': 'Fulshear' };
  let zipOk = true;
  for (const [zip, area] of Object.entries(zipCases)) {
    await p.fill('#q-zip', '');
    await p.locator('#q-zip').pressSequentially(zip);
    const msg = await p.locator('[data-zip-msg]').textContent();
    if (msg !== `✓ We serve ${zip} — ${area}`) zipOk = false;
    await p.fill('#zc-zip', zip);
    await p.locator('#zc-zip').dispatchEvent('input');
    if (!(await p.locator('[data-zipcheck-msg]').textContent()).includes(area)) zipOk = false;
  }
  await p.fill('#q-zip', '');
  await p.locator('#q-zip').pressSequentially('90210');
  const unknown = await p.locator('[data-zip-msg]').textContent();
  check('ZIP checker recognizes listed ZIPs (form + areas section)', zipOk);
  check('Unknown ZIP handled gracefully', unknown.includes('We may still serve you'), unknown);
  await c.close();
}

// 5. Full submit with JS (mock provider) + analytics events
{
  const c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.locator('[data-step="1"] [data-next]').click();
  const err = await p.locator('#err-items').textContent();
  check('Inline validation blocks empty step 1', err.length > 0 && (await p.locator('[data-step="1"]').isVisible()), err);
  await p.locator('label.chip', { hasText: 'Furniture' }).click();
  await p.locator('label.chip', { hasText: 'Garage/Storage' }).click();
  await p.fill('#q-zip', '77401');
  await p.locator('[data-step="1"] [data-next]').click();
  await p.locator('label.chip', { hasText: 'Half truck' }).click();
  await p.locator('label.chip', { hasText: 'Today' }).click();
  await p.setInputFiles('#q-photos', { name: 'pile.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await p.waitForTimeout(300);
  check('Photo picker adds a resized preview', (await p.locator('[data-photo-list] img').count()) === 1);
  await p.locator('[data-step="2"] [data-next]').click();
  // back-navigation persistence
  await p.reload({ waitUntil: 'networkidle' });
  const persisted = (await p.locator('input[name=items][value=furniture]').isChecked()) && (await p.inputValue('#q-zip')) === '77401';
  check('Answers persist in sessionStorage across reload', persisted);
  await p.locator('[data-step="1"] [data-next]').click();
  await p.locator('[data-step="2"] [data-next]').click();
  await p.fill('#q-name', 'QA Tester');
  await p.fill('#q-phone', '3465550100');
  check('Phone input is masked', (await p.inputValue('#q-phone')) === '(346) 555-0100');
  await p.waitForTimeout(3100 - 0); // stay above the 3s anti-bot threshold
  await p.locator('[data-submit]').click();
  await p.locator('[data-quote-success]').waitFor({ state: 'visible', timeout: 15000 });
  const title = await p.locator('.quote-success__title').textContent();
  check('JS submit → success state', title.includes('Got it, QA!'), title);
  const events = await p.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => a[1]));
  check('Analytics events fired (quote_step_1, quote_step_2, quote_submit)', ['quote_step_1', 'quote_step_2', 'quote_submit'].every((e) => events.includes(e)), events.join(','));
  await p.locator('[data-quote-success] a[href^="tel:"]').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await p.locator('[data-quote-success] a[href^="tel:"]').click();
  const ev2 = await p.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => a[1]));
  check('click_call fires on tel: links', ev2.includes('click_call'));
  await c.close();
}

// 6. No-JS fallback
{
  const c = await ctx({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  check('No-JS: all three steps render', (await p.locator('fieldset.step:visible').count()) === 3);
  await p.check('input[name=items][value=mattress]');
  await p.fill('#q-zip', '77005');
  await p.check('input[name=size][value=few-items]');
  await p.check('input[name=when][value=flexible]');
  await p.fill('#q-name', 'NoJS');
  await p.fill('#q-phone', '346-555-0101');
  await Promise.all([p.waitForURL(/thank-you/), p.locator('[data-submit]').click()]);
  check('No-JS: form posts and lands on /thank-you', p.url().includes('/thank-you'), p.url());
  await c.close();
}

// 7. Accessibility (axe) + brand name
{
  const c = await ctx({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  for (const path of ['/', '/services/estate-cleanouts/', '/areas/river-oaks/', '/privacy/', '/thank-you/']) {
    await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    check(`axe: 0 violations on ${path}`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target}`).join(' | '));
    const text = await p.evaluate(() => document.body.innerText);
    const bad = (text.match(/[^@\w.]Hernandez/gi) || []).length;
    check(`No "Hernandez" in rendered UI on ${path}`, bad === 0);
  }
  await c.close();
}

// 8. JSON-LD sanity
{
  const c = await ctx();
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const blocks = await p.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = blocks.map((b) => JSON.parse(b));
  const lb = parsed.find((b) => [b['@type']].flat().includes('LocalBusiness'));
  check('JSON-LD: LocalBusiness + FAQPage present and parse', !!lb && parsed.some((b) => b['@type'] === 'FAQPage'));
  check('JSON-LD: no aggregateRating while review count is unset', !('aggregateRating' in lb));
  check('<title> has brand + keyword', (await p.title()).includes('A&H Junk Removal') && (await p.title()).includes('Junk Removal Houston'), await p.title());
  await c.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
