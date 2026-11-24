// Mide la altura de cada mesa y guarda una captura a 390 px.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const files = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const out = {};
  for (const f of files) {
    await page.goto('file://' + f);
    await page.waitForLoadState('load');
    const h = await page.evaluate(() => {
      const r = document.body.firstElementChild;
      return Math.max(r.scrollHeight, r.offsetHeight);
    });
    out[f] = Math.ceil(h);
    await page.screenshot({ path: f.replace(/\.html$/, '.png'), fullPage: true });
  }
  await browser.close();
  process.stdout.write(JSON.stringify(out));
})();
