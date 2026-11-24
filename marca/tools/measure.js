// Mide la altura de cada mesa y guarda una captura a 390 px.
// Rutas configurables por variables de entorno (valen en Linux y en Windows):
//   MIRADA_PLAYWRIGHT  carpeta del paquete playwright (por defecto, el require normal)
//   MIRADA_CHROME      ejecutable de Chrome (por defecto, el Chromium de Playwright)
// Siempre sin ventana y sin sonido.
const path = require('path');
const { pathToFileURL } = require('url');
const pw = process.env.MIRADA_PLAYWRIGHT
  ? require(path.join(process.env.MIRADA_PLAYWRIGHT, 'index.js'))
  : require('playwright');
(async () => {
  const files = process.argv.slice(2);
  const opts = { headless: true, args: ['--mute-audio'] };
  if (process.env.MIRADA_CHROME) opts.executablePath = process.env.MIRADA_CHROME;
  const browser = await pw.chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const out = {};
  for (const f of files) {
    await page.goto(pathToFileURL(path.resolve(f)).href);
    await page.waitForLoadState('load');
    try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
    const h = await page.evaluate(() => {
      const r = document.body.firstElementChild;
      return Math.max(r.scrollHeight, r.offsetHeight);
    });
    out[f] = Math.ceil(h);
    if (!process.env.MIRADA_SIN_CAPTURA) await page.screenshot({ path: f.replace(/\.html$/, '.png'), fullPage: true });
  }
  await browser.close();
  process.stdout.write(JSON.stringify(out));
})();
