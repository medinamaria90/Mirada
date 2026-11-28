// Recorrido real en Chrome headless. Uso: node tools/e2e.mjs <baseUrl> <catalogPath> [outDir] [prefix]
// No depende de pintores concretos: lee el catálogo con el motor de la app (buildIndex).
// MIRADA_E2E_MODE=smoke: modo «humo» (~20 s): arranque, una etapa completa (con teclado en la intro,
// «Conoce a» y las respuestas 1-4), un cuadro en el visor, resultado, perfil y auditorías de
// contraste y táctiles. Es el que corre dentro de `node --test` con MIRADA_E2E=1; el completo, con
// e2e.sh (incluye el visor en cada pantalla, oleada 8).
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { stageTitle } from '../app/js/engine/painters.js';
import { ringLevels } from '../app/js/engine/level-ring.js';
import { buildIndex } from '../app/js/engine/catalog.js';
import { hasMovementReview } from '../app/js/engine/progress.js';
import { isoWeek, dayKey } from '../app/js/engine/dates.js';
import { madridDayKey } from '../app/js/engine/dates.js';

const require = createRequire(import.meta.url);
// Rutas de Playwright y Chrome: por variable de entorno (MIRADA_PLAYWRIGHT, MIRADA_CHROME) o las del
// entorno de referencia (Linux).
const PLAYWRIGHT_PATH = process.env.MIRADA_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright';
const CHROME_PATH = process.env.MIRADA_CHROME || '/usr/bin/google-chrome';
const { chromium } = require(PLAYWRIGHT_PATH);

const base = process.argv[2] || 'http://127.0.0.1:8881/';
const catalog = JSON.parse(readFileSync(process.argv[3] || new URL('../app/data/catalog.json', import.meta.url), 'utf8'));
const out = process.argv[4] || '/home/claude/mirada/docs/screens';
const prefix = process.argv[5] ?? 'o9-';
const SMOKE = process.env.MIRADA_E2E_MODE === 'smoke';
let challengeText = '';
let dailyText = '';
mkdirSync(out, { recursive: true });

const index = buildIndex(catalog);
const art = new Map(catalog.artworks.map((w) => [w.id, w]));
const artist = new Map(catalog.artists.map((a) => [a.id, a]));
const movement = new Map(catalog.movements.map((m) => [m.id, m]));

const problems = [];
const notes = [];
const shots = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };
async function shot(page, name, full = false) {
  const path = `${out}/${prefix}${name}.png`;
  await page.waitForTimeout(500);
  await page.screenshot({ path, fullPage: full });
  shots.push(path);
}

// Peticiones al contador permitido (GoatCounter); con el código vacío (por defecto) no debe haber ninguna.
const externalCounter = [];

function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${label}] console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  page.on('requestfailed', (r) => {
    // Navegar justo después de cargar aborta las peticiones pendientes (net::ERR_ABORTED): no es un fallo.
    if (r.failure()?.errorText === 'net::ERR_ABORTED') return;
    problems.push(`[${label}] requestfailed: ${r.url()} (${r.failure()?.errorText || ''})`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(new URL(base).origin) && !r.url().startsWith('data:')) {
      // Único servicio externo permitido: el contador GoatCounter (solo si se configura su código).
      const host = (() => { try { return new URL(r.url()).hostname; } catch { return ''; } })();
      if (host === 'gc.zgo.at' || host.endsWith('.goatcounter.com')) externalCounter.push(r.url());
      else problems.push(`[${label}] recurso remoto: ${r.url()}`);
    }
  });
}

// Jugador «omnisciente»: deduce la respuesta del DOM + catálogo. wrongAt = pasos a fallar a propósito.
// La opción elegida y la correcta quedan por encima de la hoja de feedback y bajo la barra.
async function assertAnswersVisible(page, label) {
  const r = await page.evaluate(() => {
    const sheet = document.querySelector('.feedback').getBoundingClientRect();
    const bar = document.querySelector('.lesson-bar').getBoundingClientRect();
    const marked = [...document.querySelectorAll('.option.is-correct, .option.is-wrong')].map((o) => o.getBoundingClientRect());
    const crosses = (m) => m.right > sheet.left && m.left < sheet.right;
    return { ok: marked.every((m) => !crosses(m) || (m.bottom <= sheet.top + 1 && m.top >= bar.bottom - 1)), n: marked.length, sheetTop: sheet.top, marks: marked.map((m) => [Math.round(m.top), Math.round(m.bottom)]) };
  });
  check(r.ok, `${label}: respuesta tapada por la hoja ${JSON.stringify(r)}`);
}

// La frase que explica el cuadro (fb-line) se lee entera por encima de «Continuar» (no queda en la
// zona que se desvanece ni bajo el botón).
async function assertLookVisible(page, label) {
  const r = await page.evaluate(() => {
    const line = document.querySelector('.feedback .fb-line');
    if (!line) return { ok: true };
    const l = line.getBoundingClientRect();
    const box = document.querySelector('.feedback .fb-text').getBoundingClientRect();
    const btn = document.querySelector('.feedback [data-action="continue"]').getBoundingClientRect();
    return { ok: l.bottom <= btn.top && l.bottom <= box.bottom - 8, line: [Math.round(l.top), Math.round(l.bottom)], box: Math.round(box.bottom), btn: Math.round(btn.top) };
  });
  check(r.ok, `${label}: la frase del cuadro queda tapada ${JSON.stringify(r)}`);
}

async function playRound(page, { wrongAt = [], shotsFor = {}, maxSteps = 40, stopAfter = Infinity, onStep = null, checkReveal = null, keys = false, checkLook = null } = {}) {
  let step = 0;
  let answered = 0;
  const seenTypes = new Set();
  const guestCards = []; // invitados presentados en esta ronda (artistId); el siguiente paso debe preguntar por el último
  let pendingGuest = null;
  while (step < maxSteps) {
    await page.waitForTimeout(110);
    if (await page.locator('.res').count()) return step;
    // «Te presentamos a…»: tarjeta de invitado antes de su primera pregunta. No es pregunta ni puntúa: se pulsa «Seguir».
    const guestCard = page.locator('.guest-card');
    if (await guestCard.count()) {
      const title = (await guestCard.locator('.guest-title').innerText()).replace(/\s+/g, ' ').trim();
      const name = (await guestCard.locator('.guest-name').innerText()).trim();
      const who = [...artist.values()].find((a) => a.name === name);
      check(title === `Te presentamos a ${name}`, `tarjeta de invitado con título raro: ${title}`);
      check(Boolean(who) && (who.guest || who.category === 'invitado'), `la tarjeta presenta a alguien que no es invitado: ${name}`);
      check(who && !guestCards.includes(who.id), `la tarjeta de ${name} sale dos veces en la ronda`);
      check(await guestCard.locator('[data-action="guest-continue"][data-primary]').innerText() === 'Seguir', 'la tarjeta de invitado no tiene «Seguir»');
      if (who) { guestCards.push(who.id); pendingGuest = who; }
      await guestCard.locator('[data-action="guest-continue"]').click();
      continue;
    }
    const look = page.locator('.look-first [data-action="go"]');
    if (await look.count()) { await look.click(); continue; }
    const interlude = page.locator('.interlude [data-action="continue"]');
    if (await interlude.count()) {
      if (shotsFor.interlude) { await shot(page, shotsFor.interlude); delete shotsFor.interlude; }
      if (keys) {
        // Teclado: el foco ya está en «Vamos» (anunciado con el título) y Enter sigue.
        const focused = await page.evaluate(() => document.activeElement?.closest('.interlude [data-action="continue"]') != null
          && document.activeElement.getAttribute('aria-describedby') === 'interlude-title');
        check(focused, 'pantalla intermedia: el foco no está en «Vamos» (con el título como descripción)');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(250);
        check(!(await page.locator('.interlude').count()), 'pantalla intermedia: Enter no avanza');
        continue;
      }
      await interlude.click();
      continue;
    }
    const options = page.locator('.lesson-stage .option');
    if (!(await options.count())) { await page.waitForTimeout(200); step++; continue; }
    const prompt = (await page.locator('.q-prompt').innerText()).trim();
    let target = null;
    let type;
    if (await page.locator('.option-art').count()) {
      type = 'which';
      const short = prompt.replace(/^¿Cuál es de /, '').replace(/\?$/, '');
      const n = await options.count();
      for (let i = 0; i < n; i++) {
        const id = await options.nth(i).locator('.art').getAttribute('data-art');
        const a = artist.get(art.get(id).artistId);
        if ((a.short || a.name) === short) target = i;
      }
    } else {
      const id = await page.locator('.q-art .art').getAttribute('data-art');
      const a = artist.get(art.get(id).artistId);
      type = prompt.includes('movimiento') ? 'movement' : 'who';
      const wanted = type === 'movement' ? a.movementId : a.id;
      const n = await options.count();
      for (let i = 0; i < n; i++) {
        const id = await options.nth(i).getAttribute('data-id');
        if (id === wanted) target = i;
        // Las opciones de movimiento llevan el nombre y, debajo, el periodo del catálogo.
        if (type === 'movement') {
          const m = movement.get(id);
          const text = (await options.nth(i).innerText()).replace(/^\d\s*/, '').trim();
          check(m && text.startsWith(m.name) && text.endsWith(m.period), `opción de movimiento sin periodo: ${text}`);
        }
      }
    }
    if (pendingGuest) {
      // La tarjeta sale justo antes de la primera pregunta sobre ese invitado.
      const asked = type === 'which' ? target != null && art.get(await options.nth(target).locator('.art').getAttribute('data-art')).artistId
        : artist.get(art.get(await page.locator('.q-art .art').getAttribute('data-art')).artistId).id;
      check(asked === pendingGuest.id, `tras la tarjeta de ${pendingGuest.name} la pregunta no es sobre él: ${prompt}`);
      pendingGuest = null;
    }
    const key = `q-${type}`;
    if (shotsFor[key] && !seenTypes.has(type)) { seenTypes.add(type); await shot(page, shotsFor[key]); }
    check(target != null, `no se encontró respuesta para: ${prompt}`);
    const wrong = wrongAt.includes(step);
    const pick = wrong ? ((target ?? 0) + 1) % (await options.count()) : (target ?? 0);
    if (type === 'which' && keys) {
      // Atajo de teclado: 1-4 responden directamente (sin pasar por el visor).
      await page.keyboard.press(String(pick + 1));
    } else if (type === 'which') {
      // Pulsar una miniatura abre el visor con las 4; «Es este» responde con la que se ve. La primera
      // de cada ronda se abre en otra y se llega a la buena con las flechas del visor.
      await answerWhichInViewer(page, pick, { navigate: !seenTypes.has('which-viewer'), label: `paso ${step}` });
      seenTypes.add('which-viewer');
    } else await options.nth(pick).click();
    await page.waitForSelector('.feedback.is-open');
    await page.waitForTimeout(450);
    if (checkReveal) await assertAnswersVisible(page, `${checkReveal} paso ${step}`);
    if (checkLook) await assertLookVisible(page, `${checkLook} paso ${step}`);
    if (onStep) await onStep({ step, wrong, type });
    if (wrong && shotsFor.wrong) { await shot(page, shotsFor.wrong); delete shotsFor.wrong; }
    if (!wrong && shotsFor.right) { await shot(page, shotsFor.right); delete shotsFor.right; }
    if (shotsFor.combo && await page.locator('.combo.is-on').count()) { await shot(page, shotsFor.combo); delete shotsFor.combo; }
    answered++;
    if (answered >= stopAfter) return step;
    await page.locator('.feedback [data-action="continue"]').click();
    step++;
  }
  throw new Error('La ronda no terminó');
}

// Tras un fallo de autor, lo elegido se marca en su propia opción, sin línea aparte en la hoja
// (ni «El que has elegido es de X» ni «No es de X»); el lector de pantalla oye «Elegiste…». En
// «¿Cuál?», la miniatura elegida lleva solo el nombre de su pintor y, abierta en el visor tras
// responder, enseña pintor y título.
async function assertChosenFeedback(page, type, label) {
  const sheet = (await page.locator('.feedback .fb-inner').innerText()).trim();
  check(!/has elegido|^No es de/m.test(sheet) && await page.locator('.feedback .fb-line-2').count() === 0, `${label}: la hoja aún tiene la línea del elegido`);
  const sr = page.locator('.feedback .fb-chosen');
  if (type === 'movement') {
    check(await sr.count() === 0, `${label}: «Elegiste…» en una pregunta de movimiento`);
    return;
  }
  const wrongOpt = page.locator('.lesson-stage .option.is-wrong');
  const speech = (await sr.textContent() || '').trim();
  if (type === 'which') {
    const id = await wrongOpt.locator('.art').getAttribute('data-art');
    const w = art.get(id);
    const a = artist.get(w.artistId);
    const name = a.short || a.name;
    check(speech === `Elegiste un cuadro de ${name}.`, `${label}: el lector no oye de quién es el cuadro elegido: ${speech}`);
    const tag = wrongOpt.locator('.option-tag');
    check(await tag.count() === 1 && (await tag.innerText()).trim() === name, `${label}: la miniatura elegida no lleva su pintor`);
    // El visor, tras responder, enseña pintor y título de la elegida.
    await wrongOpt.click();
    await page.waitForSelector('.viewer .viewer-caption', { timeout: 3000 }).catch(() => {});
    const caption = (await page.locator('.viewer .viewer-caption').allTextContents()).join(' | ');
    check(caption.includes(w.title) && caption.includes(w.by || a.name), `${label}: el visor no enseña pintor y título tras responder: ${caption}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.viewer', { state: 'detached', timeout: 3000 }).catch(() => {});
  } else {
    const a = artist.get(await wrongOpt.getAttribute('data-id'));
    check(Boolean(a) && speech === `Elegiste a ${a.short || a.name}.`, `${label}: el lector no oye a quién se eligió: ${speech}`);
  }
}

// ---------------------------------------------------------------- Visor a pantalla completa (oleada 8)
// Textos que el visor no puede mostrar en una pregunta sin responder: título, año y autor de cada
// cuadro (en «¿Cuál es de X?», el pintor X sí está en la pregunta).
// allowTitle: en «¿Quién?» y «¿Movimiento?» el título puede verse antes de responder (si no delata).
function forbiddenFor(ids, allowArtist = null, allowTitle = false) {
  const out = [];
  for (const id of ids) {
    const w = art.get(id);
    if (!w) continue;
    if (!allowTitle) out.push(w.title);
    if (w.year && /\d{4}/.test(w.year)) out.push(w.year);
    const a = artist.get(w.artistId);
    if (a && a.id !== allowArtist) out.push(a.name, a.short || a.name);
  }
  return [...new Set(out.filter((t) => t && t.length >= 3))];
}

async function viewerLeaks(page, forbidden) {
  return page.evaluate((words) => {
    const dlg = document.querySelector('.viewer');
    if (!dlg) return ['sin visor'];
    const texts = [dlg.innerText];
    for (const el of [dlg, ...dlg.querySelectorAll('*')]) {
      for (const at of ['alt', 'aria-label', 'title', 'data-label', 'aria-roledescription']) if (el.getAttribute(at)) texts.push(el.getAttribute(at));
    }
    const all = texts.join(' | ');
    return words.filter((w) => all.includes(w));
  }, forbidden);
}

async function viewerCount(page) {
  return (await page.locator('.viewer .viewer-count').innerText().catch(() => '')).trim();
}

async function waitCount(page, text) {
  await page.waitForFunction((t) => document.querySelector('.viewer .viewer-count')?.textContent.trim() === t, text, { timeout: 4000 }).catch(() => {});
  return viewerCount(page);
}

async function answerWhichInViewer(page, pick, { navigate = false, label = '' } = {}) {
  const options = page.locator('.lesson-stage .option');
  const n = await options.count();
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(await options.nth(i).locator('.art').getAttribute('data-art'));
  const short = (await page.locator('.q-prompt').innerText()).replace(/^¿Cuál es de /, '').replace(/\?$/, '').trim();
  const allow = [...artist.values()].find((a) => (a.short || a.name) === short)?.id;
  const start = navigate ? (pick + 1) % n : pick;
  await options.nth(start).click();
  await page.waitForSelector('.viewer[open]');
  check(await waitCount(page, `${start + 1} / ${n}`) === `${start + 1} / ${n}`, `«¿Cuál?» ${label}: el visor no abre en la miniatura pulsada`);
  const leaks = await viewerLeaks(page, forbiddenFor(ids, allow));
  check(!leaks.length, `«¿Cuál?» ${label}: el visor revela ${leaks.join(', ')}`);
  if (navigate) {
    // Hacia la buena con las flechas del visor (anterior o siguiente).
    let at = start;
    while (at !== pick) {
      const dir = pick > at ? 'next' : 'prev';
      await page.click(`.viewer [data-v="${dir}"]`);
      at += dir === 'next' ? 1 : -1;
      check(await waitCount(page, `${at + 1} / ${n}`) === `${at + 1} / ${n}`, `«¿Cuál?» ${label}: las flechas del visor no pasan de cuadro`);
    }
  }
  // «Es este» no responde mientras el cuadro se desliza (oleada 9): se espera a que llegue.
  await page.waitForSelector('.viewer [data-v="pick"][aria-disabled="false"]', { timeout: 3000 });
  await page.click('.viewer [data-v="pick"]');
  await page.waitForSelector('.viewer', { state: 'detached' });
}

// Abre el visor desde `opener` y comprueba: diálogo con nombre que ocupa toda la ventana, imagen
// GRANDE (img/<id>.jpg) cargada y entera (contain) con la miniatura del atlas debajo, cerrar ≥ 48 px,
// foco dentro (también con Tab), sin revelar nada si es una pregunta (o con pie si no), paso de
// cuadro si hay varios, auditoría de contraste y táctil, captura y cierre (aspa, Esc, atrás o
// tocando fuera) con el foco de vuelta en el cuadro pulsado.
async function viewerCheck(page, label, opener, { reveal = true, forbidden = [], group = 0, close = 'button', shotName = null, touch = false, keepDialog = null } = {}) {
  await opener.scrollIntoViewIfNeeded();
  await opener.evaluate((el) => el.setAttribute('data-e2e-opener', '1'));
  const urlBefore = page.url();
  if (touch) await opener.tap(); else await opener.click();
  await page.waitForSelector('.viewer[open]');
  await page.waitForFunction(() => {
    const s = [...document.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    const i = s && s.querySelector('.viewer-img');
    return Boolean(s) && (!i || (i.complete && i.naturalWidth > 0 && s.classList.contains('is-big')));
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => {
    const dlg = document.querySelector('.viewer');
    const r = dlg.getBoundingClientRect();
    const slide = [...dlg.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    const img = slide.querySelector('.viewer-img');
    const thumb = slide.querySelector('.viewer-thumb img');
    const frame = slide.querySelector('.viewer-frame').getBoundingClientRect();
    const stage = slide.querySelector('.viewer-stage').getBoundingClientRect();
    const fs = slide.querySelector('.viewer-frame').style;
    const ratio = Number(fs.getPropertyValue('--arw')) / Number(fs.getPropertyValue('--arh'));
    const close = dlg.querySelector('[data-v="close"]').getBoundingClientRect();
    return {
      tag: dlg.tagName, modal: dlg.matches(':modal'), name: dlg.getAttribute('aria-label') || '',
      full: Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1 && r.top === 0 && r.left === 0,
      src: img ? img.getAttribute('src') : null, loaded: img ? img.naturalWidth > 0 : false,
      thumb: thumb ? thumb.getAttribute('src') : null,
      fit: frame.left >= stage.left - 1 && frame.right <= stage.right + 1 && frame.top >= stage.top - 1 && frame.bottom <= stage.bottom + 1
        && (Math.abs(frame.width - stage.width) < 2 || Math.abs(frame.height - stage.height) < 2)
        && Math.abs(frame.width / frame.height - ratio) < 0.03,
      inView: frame.top >= 0 && frame.bottom <= innerHeight && frame.left >= 0 && frame.right <= innerWidth,
      big: stage.width >= 0.8 * innerWidth && stage.height >= 0.35 * innerHeight,
      close: [close.width, close.height],
      focusIn: dlg.contains(document.activeElement),
      caption: slide.querySelector('.viewer-caption')?.innerText || '',
      count: dlg.querySelector('.viewer-count')?.textContent.trim() || '',
      zoom: getComputedStyle(dlg.querySelector('.viewer-track')).touchAction,
      stage: getComputedStyle(slide.querySelector('.viewer-stage')).touchAction,
    };
  });
  check(info.tag === 'DIALOG' && info.modal && info.name.trim().length > 0, `[visor ${label}] no es un diálogo modal con nombre ${JSON.stringify(info.name)}`);
  check(info.full, `[visor ${label}] no ocupa toda la ventana`);
  check(/^img\/w\d+\.jpg$/.test(info.src || '') && info.loaded, `[visor ${label}] sin la imagen grande cargada (${info.src})`);
  check(!info.thumb || /^img\/(s\/|w\d+\.jpg)/.test(info.thumb), `[visor ${label}] miniatura rara (${info.thumb})`);
  check(info.fit && info.inView && info.big, `[visor ${label}] el cuadro no se ve entero y grande ${JSON.stringify({ fit: info.fit, inView: info.inView, big: info.big })}`);
  check(info.close[0] >= 48 && info.close[1] >= 48, `[visor ${label}] cerrar de ${info.close.map(Math.round).join('×')}`);
  check(info.focusIn, `[visor ${label}] el foco no está en el visor`);
  check(info.zoom === 'pan-x pan-y', `[visor ${label}] touch-action ${info.zoom}`);
  check(info.stage === 'none', `[visor ${label}] touch-action del escenario ${info.stage} (el pellizco debe ampliar el cuadro)`);
  if (reveal) {
    check(info.caption.trim().length > 0, `[visor ${label}] sin pie (título · autor · año)`);
  } else {
    const leaks = await viewerLeaks(page, forbidden);
    check(!leaks.length && !info.caption, `[visor ${label}] revela ${leaks.join(', ')}${info.caption ? ` · pie «${info.caption}»` : ''}`);
    // Ampliar (teclado) tampoco revela nada; 0 restablece.
    await page.keyboard.press('+');
    await page.waitForTimeout(300);
    const zoomed = await viewerFrameState(page);
    check(zoomed && zoomed.scale > 1, `[visor ${label}] la tecla + no amplía`);
    const leaks2 = await viewerLeaks(page, forbidden);
    check(!leaks2.length && !(await page.locator('.viewer .viewer-caption').count()), `[visor ${label}] ampliado revela ${leaks2.join(', ')}`);
    await page.keyboard.press('0');
    await page.waitForTimeout(300);
    check((await viewerFrameState(page)).scale === 1, `[visor ${label}] la tecla 0 no restablece`);
  }
  if (group > 1) {
    const m = /^(\d+) \/ (\d+)$/.exec(info.count);
    check(m && Number(m[2]) === group, `[visor ${label}] contador «${info.count}» (esperado de ${group})`);
    if (m) {
      const at = Number(m[1]);
      const key = at < group ? 'ArrowRight' : 'ArrowLeft';
      const want = `${at < group ? at + 1 : at - 1} / ${group}`;
      await page.keyboard.press(key);
      check(await waitCount(page, want) === want, `[visor ${label}] las flechas del teclado no pasan de cuadro (${await viewerCount(page)})`);
      await page.keyboard.press(key === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
      await waitCount(page, info.count);
    }
  }
  for (let k = 0; k < 4; k++) await page.keyboard.press('Tab');
  check(await page.evaluate(() => Boolean(document.activeElement?.closest('.viewer'))), `[visor ${label}] el foco sale del visor con Tab`);
  await audit(page, `visor ${label}`);
  if (shotName) await shot(page, shotName);
  if (close === 'button') await page.click('.viewer [data-v="close"]');
  else if (close === 'esc') await page.keyboard.press('Escape');
  else if (close === 'back') await page.goBack();
  else if (close === 'outside') {
    const pt = await viewerBackground(page);
    check(Boolean(pt), `[visor ${label}] no queda fondo que tocar alrededor del cuadro`);
    if (pt) { if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y); }
  }
  await page.waitForSelector('.viewer', { state: 'detached', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(250);
  check(await page.locator('.viewer').count() === 0, `[visor ${label}] no se cierra con ${close}`);
  check(await page.evaluate(() => document.activeElement?.hasAttribute('data-e2e-opener') === true), `[visor ${label}] el foco no vuelve al cuadro (cierre: ${close})`);
  check(page.url() === urlBefore, `[visor ${label}] cambia la dirección al cerrar (${page.url()})`);
  check(await page.locator('.quit-sheet:not([hidden])').count() === 0, `[visor ${label}] cerrar abre «¿Salir de la ronda?»`);
  if (keepDialog) check(await page.locator(`${keepDialog}[open]`).count() === 1, `[visor ${label}] cerrar el visor cierra también ${keepDialog}`);
  await opener.evaluate((el) => el.removeAttribute('data-e2e-opener')).catch(() => {});
}

// Un punto del fondo del visor (ni el cuadro ni un botón), lo más cerca posible del cuadro: a los
// lados, encima o debajo; si no, en la barra superior. Prefiere el hueco junto al cuadro (oleada 9).
async function viewerBackground(page, { nearFrame = false } = {}) {
  return page.evaluate((near) => {
    const dlg = document.querySelector('.viewer');
    const slide = [...dlg.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    const f = slide.querySelector('.viewer-frame').getBoundingClientRect();
    const st = slide.querySelector('.viewer-stage').getBoundingClientRect();
    const sl = slide.getBoundingClientRect();
    const ok = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && dlg.contains(el) && !el.closest('.viewer-frame, button');
    };
    const cands = [
      [(sl.left + f.left) / 2, f.top + f.height / 2], [(f.right + sl.right) / 2, f.top + f.height / 2],
      [f.left + f.width / 2, (st.top + f.top) / 2], [f.left + f.width / 2, (f.bottom + st.bottom) / 2],
      [Math.max(2, f.left - 3), f.top + f.height / 2], [Math.min(innerWidth - 2, f.right + 3), f.top + f.height / 2],
    ];
    if (!near) cands.push([innerWidth / 2 - 40, 20]);
    for (const [x, y] of cands) if (x > 0 && y > 0 && x < innerWidth && y < innerHeight && ok(x, y)) return { x: Math.round(x), y: Math.round(y), beside: true };
    return null;
  }, nearFrame);
}

// Gestos táctiles reales (CDP Input.dispatchTouchEvent): uno o dos dedos.
async function touchSwipe(page, cdp, { x = null, y = null, from = 0, to = 0, fromX = null, toX = null }) {
  const steps = 14;
  const at = (k) => (fromX != null ? { x: fromX + ((toX - fromX) * k) / steps, y } : { x, y: from + ((to - from) * k) / steps });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at(0)] });
  for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at(k)] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
  return page.evaluate(() => window.scrollY);
}
async function touchPinch(page, cdp) {
  const vp = page.viewportSize();
  const cx = vp.width / 2;
  const cy = vp.height / 2;
  const two = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: two(20) });
  for (let d = 30; d <= Math.min(160, cx - 4); d += 10) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: two(d) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
  return page.evaluate(() => window.visualViewport.scale);
}
async function touchTap(page, cdp, x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
// Pellizco con dos dedos en (cx, cy), separándolos (o juntándolos) de d0 a d1 píxeles del centro.
async function touchPinchAt(page, cdp, cx, cy, d0, d1) {
  const two = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  const step = d1 > d0 ? 8 : -8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: two(d0) });
  for (let d = d0 + step; step > 0 ? d <= d1 : d >= d1; d += step) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: two(d) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

// Estado del cuadro actual del visor: centro y medidas del marco en pantalla, su escala (de la
// transformación) y si el escenario recorta.
async function viewerFrameState(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('.viewer');
    const s = dlg && [...dlg.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    if (!s) return null;
    const f = s.querySelector('.viewer-frame');
    const r = f.getBoundingClientRect();
    const st = s.querySelector('.viewer-stage').getBoundingClientRect();
    const tag = dlg.querySelector('.viewer-zoom');
    return {
      x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
      scale: new DOMMatrixReadOnly(getComputedStyle(f).transform).a,
      inStage: r.left <= st.left + 1 && r.right >= st.right - 1 || r.width <= st.width + 1,
      zoomed: s.classList.contains('is-zoomed'),
      stageTouch: getComputedStyle(s.querySelector('.viewer-stage')).touchAction,
      tag: tag && !tag.hidden ? tag.textContent : '',
      page: window.visualViewport.scale,
    };
  });
}

// Ampliar dentro del visor (abierto, con varios cuadros, en un contexto táctil): el pellizco por
// CDP escala el marco (no la página), con el indicador «n×»; ampliado, deslizar no cambia de cuadro
// y el dedo lo desplaza sin salirse; el doble toque alterna 2,5× ↔ 1×; a 1× deslizar sí pasa de
// cuadro (y el cuadro nuevo llega a 1×); cerrar ampliado y volver a abrir empieza a 1×. Deja el
// visor abierto, a 1×, en el cuadro siguiente al inicial.
async function viewerZoomCheck(page, cdp, label, opener) {
  const L = (m) => `[zoom ${label}] ${m}`;
  const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
  const at = await viewerFrameState(page);
  check(at && at.stageTouch === 'none', L(`touch-action del escenario ${at && at.stageTouch}`));
  check(at && at.scale === 1 && !at.zoomed, L('el cuadro no empieza a 1×'));
  const count0 = await viewerCount(page);
  // Pellizco: de 30 a 90 px del centro (×3), con un dedo a cada lado del centro del cuadro.
  await touchPinchAt(page, cdp, at.x, at.y, 30, 90);
  const big = await viewerFrameState(page);
  check(near(big.scale, 3, 0.15) && near(big.w / at.w, 3, 0.15), L(`el pellizco no amplía el cuadro (escala ${big.scale.toFixed(2)}, ancho ×${(big.w / at.w).toFixed(2)})`));
  check(big.page === 1, L(`el pellizco amplía la página (×${big.page})`));
  check(big.zoomed && /^\d+(,\d)?×$/.test(big.tag), L(`indicador de escala «${big.tag}»`));
  // Ampliado: deslizar no cambia de cuadro y el cuadro no deja hueco en el escenario.
  await touchSwipe(page, cdp, { y: at.y, fromX: at.x + 120, toX: at.x - 160 });
  const moved = await viewerFrameState(page);
  check(await viewerCount(page) === count0, L(`ampliado, deslizar cambia de cuadro (${await viewerCount(page)})`));
  check(near(moved.scale, big.scale, 0.01) && moved.inStage, L('al arrastrar ampliado, el cuadro deja hueco o cambia de escala'));
  await page.waitForTimeout(ZOOM_TAG_HIDE_MS);
  check(!(await viewerFrameState(page)).tag, L('el indicador de escala no se va solo'));
  // Pellizco al revés: vuelve a 1× y el escenario deja de recortar.
  await touchPinchAt(page, cdp, at.x, at.y, 90, 20);
  await page.waitForTimeout(350);
  const back = await viewerFrameState(page);
  check(back.scale === 1 && !back.zoomed, L(`juntar los dedos no vuelve a 1× (escala ${back.scale.toFixed(2)})`));
  // Doble toque: 2,5× centrado en el punto tocado; otro doble toque vuelve a 1×.
  const tapX = at.x + at.w * 0.2;
  const tapY = at.y;
  await touchTap(page, cdp, tapX, tapY);
  await page.waitForTimeout(70);
  await touchTap(page, cdp, tapX, tapY);
  await page.waitForTimeout(450);
  const dbl = await viewerFrameState(page);
  check(near(dbl.scale, 2.5, 0.01), L(`el doble toque no amplía a 2,5× (escala ${dbl.scale.toFixed(2)})`));
  check(dbl.page === 1, L('el doble toque amplía la página'));
  check(dbl.x < at.x - 10, L('el doble toque no amplía centrado en el punto tocado'));
  await touchTap(page, cdp, tapX, tapY);
  await page.waitForTimeout(70);
  await touchTap(page, cdp, tapX, tapY);
  await page.waitForTimeout(450);
  check((await viewerFrameState(page)).scale === 1, L('el segundo doble toque no vuelve a 1×'));
  check(await page.locator('.viewer[open]').count() === 1, L('el doble toque cierra el visor'));
  // Teclado: + amplía, 0 restablece.
  await page.keyboard.press('+');
  await page.waitForTimeout(350);
  check((await viewerFrameState(page)).scale > 1, L('la tecla + no amplía'));
  await page.keyboard.press('0');
  await page.waitForTimeout(350);
  check((await viewerFrameState(page)).scale === 1, L('la tecla 0 no restablece'));
  // A 1×, deslizar sí pasa al siguiente (y llega a 1×).
  await touchSwipe(page, cdp, { y: at.y, fromX: at.x + 120, toX: at.x - 160 });
  const m = /^(\d+) \/ (\d+)$/.exec(count0);
  const next = m ? `${Number(m[1]) + 1} / ${m[2]}` : '';
  check(await waitCount(page, next) === next, L(`a 1×, deslizar no pasa de cuadro (${await viewerCount(page)})`));
  await page.waitForTimeout(400);
  check((await viewerFrameState(page)).scale === 1, L('el cuadro siguiente no llega a 1×'));
  // Cerrar ampliado y volver a abrir: empieza a 1×.
  await page.keyboard.press('+');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.viewer', { state: 'detached' });
  await opener.tap();
  await page.waitForSelector('.viewer[open]');
  await page.waitForTimeout(300);
  const again = await viewerFrameState(page);
  check(again && again.scale === 1 && !again.zoomed && !again.tag, L('al volver a abrir, el cuadro no está a 1×'));
}
const ZOOM_TAG_HIDE_MS = 1100;

// Pasa la historia del pintor tarjeta a tarjeta hasta el botón final («Ir a las preguntas»; la X devolvería al mapa).
async function skipStory(page) {
  const MAX_CARDS = 20;
  for (let k = 0; k < MAX_CARDS && !(await page.locator('.story[open] [data-deck="play"]').count()); k++) await page.keyboard.press('ArrowRight');
  await page.click('.story[open] [data-deck="play"]');
}

// Hasta «Conoce a»: pasa la presentación del movimiento (Entrar) y la historia del pintor, que sale siempre (se salta).
async function toLearn(page) {
  const STEP_MS = 15000;
  const PASSES = 4;
  for (let k = 0; k < PASSES; k++) {
    await page.waitForSelector('.learn, .intro .deck-primary, .story[open] .story-text', { timeout: STEP_MS });
    if (await page.locator('.learn').count()) return;
    if (await page.locator('.story[open]').count()) await skipStory(page);
    else await page.$eval('.intro [data-action="enter"]', (b) => b.click());
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('.learn', { timeout: STEP_MS });
}

// El momento de dominar a un maestro se queda encima del resultado hasta cerrarlo: si sale, Esc lo cierra.
async function closeMatchMoment(page) {
  const SHOW_MS = 1500;
  if (!(await page.waitForSelector('.match[open]', { timeout: SHOW_MS }).catch(() => null))) return;
  await page.keyboard.press('Escape');
  await page.waitForSelector('.match', { state: 'detached' });
}

// Hasta la ronda de un pintor: su historia sale siempre y «Jugar» empieza la ronda, sin «Conoce a» (decisión de María, 26/11).
async function toRound(page) {
  const STEP_MS = 15000;
  await page.waitForSelector('.story[open] .story-text', { timeout: STEP_MS });
  await skipStory(page);
  await page.waitForSelector('.lesson .option', { timeout: STEP_MS });
  check(await page.locator('.learn').count() === 0, `tras la historia sale «Conoce a» (${page.url()})`);
}

async function assertPracticeVisible(page, label) {
  const box = await page.locator('[data-action="practice"]').boundingBox();
  const vh = page.viewportSize().height;
  check(box && box.y >= 0 && box.y + box.height <= vh + 0.5, `${label}: «Practicar» fuera de pantalla (${box && Math.round(box.y)})`);
}

async function noHorizontalScroll(page, label) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth,
    cut: [...document.querySelectorAll('.option, .stage, .card, .event, .panel, .stats > div, .q-prompt, .res-title, .res-chip')]
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).map((e) => e.className).slice(0, 3) }));
  check(r.sw <= r.w && !r.cut.length, `${label}: desborde horizontal ${JSON.stringify(r)}`);
}


// ---------------------------------------------------------------- Auditorías (contraste y objetivos táctiles)
// Contraste medido de TODOS los textos visibles: el texto y su fondo tal como se pintan (capas de
// fondo de los antepasados, con la opacidad y el grayscale de cada grupo; con degradado, el peor de
// sus colores). Umbral 4,5:1 para todo.
const audits = { contrast: 0, targets: 0, screens: [] };
async function contrastAudit(page, label) {
  const fails = await page.evaluate(() => {
    const toRgb = (c) => {
      if (!c) return null;
      let m = c.match(/^rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
      m = c.match(/^color\(srgb ([^)]+)\)/);
      if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
        return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
      }
      return null;
    };
    const over = (top, bottom) => {
      const a = top.a + bottom.a * (1 - top.a);
      if (!a) return { r: 0, g: 0, b: 0, a: 0 };
      const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
      return { r: mix('r'), g: mix('g'), b: mix('b'), a };
    };
    const lum = (c) => {
      const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const gradientColors = (img) => (img.match(/(rgba?\([^)]+\)|color\(srgb [^)]+\))/g) || []).map(toRgb).filter(Boolean);
    const gray = (c, g) => {
      const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      return { r: c.r + (y - c.r) * g, g: c.g + (y - c.g) * g, b: c.b + (y - c.b) * g, a: c.a };
    };
    const mixRgb = (x, y, t) => ({ r: x.r * t + y.r * (1 - t), g: x.g * t + y.g * (1 - t), b: x.b * t + y.b * (1 - t), a: 1 });
    // Pinta la pila de antepasados de abajo arriba y devuelve, para cada candidato de fondo (los
    // colores del degradado más cercano: se evalúa el peor), el fondo y el texto tal como se ven.
    // La opacidad y el filtro grayscale de un antepasado afectan a su grupo entero (su fondo, el de
    // sus hijos y el texto), compuesto sobre lo que tiene detrás; antes solo se aplicaban al texto.
    const visibleColors = (el, fg) => {
      const chain = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);
      let candidates = null;
      const layersOf = chain.map((n) => {
        const cs = getComputedStyle(n);
        let bgs = [];
        const bg = toRgb(cs.backgroundColor);
        if (bg && bg.a > 0) bgs = [bg];
        if (cs.backgroundImage && cs.backgroundImage !== 'none') {
          const cols = gradientColors(cs.backgroundImage).filter((c) => c.a > 0.5);
          if (cols.length) { bgs = cols.map((c) => ({ ...c, a: 1 })); candidates = n; }
        }
        const g = /grayscale\(([\d.]+)(%?)\)/.exec(cs.filter || '');
        return { n, bgs, op: Number(cs.opacity), gray: g ? Math.min(1, Number(g[1]) / (g[2] ? 100 : 1)) : 0 };
      });
      const variants = Math.max(1, ...layersOf.filter((l) => l.n === candidates).map((l) => l.bgs.length));
      const results = [];
      for (let v = 0; v < variants; v++) {
        let base = { r: 255, g: 255, b: 255, a: 1 };
        const groups = [];
        for (const l of layersOf) {
          if (l.op < 1 || l.gray) groups.push({ backdrop: base, op: l.op, gray: l.gray });
          const layer = l.bgs.length ? l.bgs[l.n === candidates ? v : 0] : null;
          if (layer) base = over(layer, base);
        }
        let text = over(fg, base);
        let back = base;
        for (const gr of groups.reverse()) {
          if (gr.gray) { text = gray(text, gr.gray); back = gray(back, gr.gray); }
          text = mixRgb(text, gr.backdrop, gr.op);
          back = mixRgb(back, gr.backdrop, gr.op);
        }
        results.push({ text, back });
      }
      return results;
    };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) => (t.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const seen = new Set();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('.sr-only, [hidden], template, script, style, noscript')) continue;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      // Toda la página (no solo lo que cabe en la pantalla); fuera del ancho = no visible.
      if (r.width < 2 || r.height < 2 || r.right < 0 || r.left > innerWidth) continue;
      // Avisos que aún se están desvaneciendo (toast) no cuentan.
      if (el.closest('.toast:not(.is-on)')) continue;
      const cs = getComputedStyle(el);
      let fg = toRgb(cs.color);
      if (!fg) continue;
      let op = 1;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= Number(getComputedStyle(n).opacity) || 0;
      if (op < 0.05) continue;
      const k = Math.min(...visibleColors(el, fg).map(({ text, back }) => ratio(text, back)));
      if (k < 4.5) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')} «${t.nodeValue.trim().slice(0, 24)}» ${k.toFixed(2)}:1`);
    }
    return out;
  });
  audits.contrast += 1;
  audits.screens.push(label);
  for (const f of fails) problems.push(`[contraste ${label}] ${f}`);
}

// Objetivos táctiles: todo elemento interactivo visible mide al menos 48×48.
async function targetAudit(page, label) {
  const small = await page.evaluate(() => {
    // Zona de toque real: la caja del elemento y, si la amplía, un ::before/::after posicionado que recibe toques (la
    // técnica de agrandar el toque sin agrandar el dibujo, p. ej. las tablillas del mapa).
    const hitRect = (e) => {
      const b = e.getBoundingClientRect();
      let { left, top, right, bottom } = b;
      for (const pseudo of ['::before', '::after']) {
        const cs = getComputedStyle(e, pseudo);
        if (cs.content === 'none' || cs.display === 'none' || cs.position !== 'absolute' || cs.pointerEvents === 'none') continue;
        const px = (v) => (v.endsWith('px') ? parseFloat(v) : 0);
        left = Math.min(left, b.left + px(cs.left));
        top = Math.min(top, b.top + px(cs.top));
        right = Math.max(right, b.right - px(cs.right));
        bottom = Math.max(bottom, b.bottom - px(cs.bottom));
      }
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    return [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [role="switch"], [tabindex]:not([tabindex="-1"])')]
    .filter((e) => !e.closest('[hidden], .sr-only') && !e.disabled && (typeof e.checkVisibility !== 'function' || e.checkVisibility({ visibilityProperty: true })))
    .map((e) => ({ r: hitRect(e), t: (e.getAttribute('aria-label') || e.textContent || e.className || e.tagName).trim().slice(0, 30) }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && (r.width < 47.5 || r.height < 47.5))
    .map(({ r, t }) => `${t} ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  audits.targets += 1;
  for (const f of small) problems.push(`[táctil ${label}] ${f}`);
}

async function audit(page, label) {
  // Se miden los colores finales: las animaciones de entrada (finitas) se dan por terminadas.
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try { if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish(); } catch { /* nada */ }
    }
  });
  await page.waitForTimeout(60);
  await contrastAudit(page, label);
  await targetAudit(page, label);
}

// «Conoce a»: la barra fija no tapa la pista ni las flechas/contador, y deja hueco debajo.
async function assertLearnLayout(page, label, { strict = true } = {}) {
  const r = await page.evaluate(() => {
    const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, h: b.height }; };
    const body = document.querySelector('.learn-body');
    return {
      vh: innerHeight, cta: rect('.learn-cta'), hint: rect('.learn-body .hint'), controls: rect('.carousel-controls'),
      practice: rect('[data-action="practice"]'), bar: rect('.lesson-bar'),
      pad: parseFloat(getComputedStyle(body).paddingBottom), controlsInBar: Boolean(document.querySelector('.learn-cta .carousel-controls')),
    };
  });
  check(r.cta && r.cta.bottom <= r.vh + 0.5 && r.practice.bottom <= r.vh + 0.5, `${label}: barra de «Practicar» fuera de la pantalla`);
  check(r.controlsInBar || (r.controls && r.controls.bottom <= r.cta.top + 0.5), `${label}: la barra tapa las flechas del carrusel ${JSON.stringify(r.controls)}`);
  check(r.controls && r.controls.top >= 0 && r.controls.bottom <= r.vh + 0.5, `${label}: flechas/contador fuera de la vista`);
  if (strict) check(r.hint && r.hint.bottom <= r.cta.top + 0.5 && r.hint.top >= r.bar.bottom - 0.5, `${label}: la barra tapa la pista «Fíjate en…» ${JSON.stringify({ hint: r.hint, cta: r.cta })}`);
  check(r.pad >= r.cta.h - 0.5, `${label}: hueco inferior (${r.pad}) menor que la barra (${r.cta.h})`);
  // Al final del desplazamiento, nada del contenido queda bajo la barra.
  const end = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const cta = document.querySelector('.learn-cta').getBoundingClientRect();
    const items = [...document.querySelectorAll('.learn-body .hint, .learn-body .slide figcaption')].map((e) => e.getBoundingClientRect().bottom);
    const last = Math.max(...items);
    window.scrollTo(0, 0);
    return { last, ctaTop: cta.top };
  });
  check(end.last <= end.ctaTop + 0.5, `${label}: al final, el contenido queda bajo la barra ${JSON.stringify(end)}`);
}

// Estado sembrado (esquema v4): paradas dominadas hasta `upTo` (índice de parada, exclusivo).
function seededState({ upTo = 0, mastered = true, xp = 900, extra = {} } = {}) {
  const artists = {};
  const salas = {};
  const intros = {};
  const medals = {};
  index.steps.slice(0, upTo).forEach((s) => {
    const rec = { plays: 1, best: mastered ? 0.9 : 0.5, mastered, last: '2026-11-20' };
    if (s.type === 'sala') salas[s.id] = rec; else artists[s.id] = rec;
    intros[s.movementId] = '2026-11-20';
    if (mastered && s.type === 'artist') medals[`artist-${s.id}`] = '2026-11-20';
  });
  if (mastered) {
    for (const m of index.visibleMovements) {
      const steps = index.stepsOf(m.id);
      if (steps.length && steps.every((s) => index.steps.indexOf(s) < upTo)) medals[`movement-${m.id}`] = '2026-11-20';
    }
  }
  return {
    version: 4, onboarded: true,
    progress: {
      xp, artists, salas, intros, reviews: {}, srs: {}, collection: {}, medals,
      streak: { current: 0, best: 0, last: null, graceOn: null, days: [] },
      stats: { answered: 0, correct: 0, newCorrect: 0, rounds: 0 }, daily: {}, weekly: {}, challenges: { played: 0 }, xpByDay: {}, ...extra,
    },
    settings: { music: true, sfx: true, volume: 0.6, reducedMotion: false, dailyGoal: 50 },
    session: {},
  };
}
// Guarda una partida en el navegador cuando la app ya ha arrancado: al cargar el catálogo, la app concilia los pintores
// nuevos y guarda su estado (main.js), lo que pisaría una partida escrita antes de tiempo.
async function writeState(pg, state) {
  await pg.waitForSelector('#app .screen > *');
  await pg.evaluate((st) => localStorage.setItem('mirada.state', JSON.stringify(st)), state);
}
// Cuadro del día en pantalla: falla `misses` veces (comprueba que el nombre se apaga) y acierta; espera a la historia.
async function playCuadro(pg, misses = 1) {
  const { answer } = await pg.evaluate(async () => {
    const data = await import('./js/ui/cuadro-data.js');
    const dates = await import('./js/engine/dates.js');
    await data.ensureCuadroIndex();
    const today = data.cuadroToday(dates.madridDayKey(new Date()));
    return { answer: (await data.loadCuadroDay(today.slot)).artistId };
  });
  const wrong = (await pg.$$eval('.cdd-opt', (bs) => bs.map((b) => b.dataset.id))).filter((id) => id !== answer);
  for (let k = 0; k < misses; k++) {
    await pg.click(`.cdd-opt[data-id="${wrong[k]}"]`);
    await pg.waitForTimeout(250);
    check(await pg.locator(`.cdd-opt.is-off[data-id="${wrong[k]}"]`).count() === 1, 'el nombre fallado no se apaga');
    check(await pg.locator('.cdd-hint').count() === k + 1, `tras ${k + 1} fallos no hay ${k + 1} pistas`);
  }
  await pg.click(`.cdd-opt[data-id="${answer}"]`);
  await pg.waitForSelector('.story[open] .story-text');
}
async function seed(pg, state, hash = 'inicio') {
  await pg.goto(base);
  await writeState(pg, state);
  await pg.goto(`${base}#${hash}`);
  await pg.reload();
}

// Sin ventana y sin sonido: el recorrido no debe oírse en la máquina donde corre.
const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox', '--mute-audio'] });
// La guía de bienvenida (ui/coach.js) sale una vez por navegador: en todos los contextos se da por vista, salvo en
// su comprobación (rawNewContext).
const rawNewContext = browser.newContext.bind(browser);
browser.newContext = async (opts) => {
  const c = await rawNewContext(opts);
  // Las historias de inicio de nivel también salen una vez: se dan todas por vistas (salvo en su comprobación).
  const storyKeys = index.artists.flatMap((a) => [`${a.id}:1`, ...index.deepLevels(a.id).map((l) => `${a.id}:${l.id}`)]);
  await c.addInitScript((keys) => { try { window.localStorage.setItem('sfumato.coach', '1'); window.localStorage.setItem('sfumato.stories', JSON.stringify(keys)); } catch { /* sin almacenamiento */ } }, storyKeys);
  return c;
};
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-ES', permissions: ['clipboard-read', 'clipboard-write'], hasTouch: true };

// ---------------------------------------------------------------- Arranque: peticiones y bytes hasta el primer pintado útil
// «Útil»: la pantalla (bienvenida o inicio) está en el DOM, sus imágenes visibles han cargado y las
// tipografías también. Presupuesto (falla si se supera). Antes de la oleada 6 (HEAD 4a3db26, misma
// medida): bienvenida 30 peticiones / 424 KB, inicio 29 / 402 KB. El tema de Ajustes (ui/theme.js, 2 KB) va en
// la cadena de arranque: +1 petición en el inicio; los KB absorben el bloque oscuro duplicado de brand.css.
// Mapa v10 (inicio): +2 módulos (ui/screens/path-map.js) y el paisaje SVG del tramo
// de la parada actual y, si asoma, el del siguiente (≤ 30 KB cada uno; los demás se piden al acercarse):
// 32 peticiones; los KB bajan (339 medidos) porque el mapa pinta menos miniaturas del atlas de golpe.
// La bienvenida gana 7 KB por las variables del mapa en brand.css (claro + dos copias del oscuro).
// Catálogo grande: +1 petición en la bienvenida (state/legacy-ids.js, la tabla de la migración v7, que importa schema.js).
// El servidor de pruebas comprime como Render (tools/serve_local.py), así que los KB son los comprimidos.
// 27/11: el mapa vivo, los carteles, las ramas y los niveles van en módulos pequeños, uno por responsabilidad (sin paso
// de build): medidos 31 peticiones en la bienvenida (3 hojas del mapa que el HTML pide antes de saber la pantalla, roster,
// encuadre) y 58 en el inicio (≈25 módulos del mapa y la precarga de historias). Por HTTP/2 y con el service worker eso cuesta poco; lo que manda
// es el peso, y ese presupuesto no cambia.
// Inicio +1: ui/lazy-css.js en la cadena estática (pide las hojas del arranque si un index.html viejo no las enlaza).
// 27/11 (tarde): main sin cambios ya medía 59 en el inicio (oscila con el orden de carga): 60 de margen; los KB no cambian.
const BOOT_BUDGET = { welcome: { requests: 32, kb: 410 }, home: { requests: 60, kb: 440 } };
const boot = {};
for (const kind of ['welcome', 'home']) {
  const bctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (kind === 'home') await bctx.addInitScript(() => { try { if (!localStorage.getItem('mirada.state')) localStorage.setItem('mirada.state', JSON.stringify({ version: 4, onboarded: true })); } catch { /* nada */ } });
  const bp = await bctx.newPage();
  watch(bp, `arranque-${kind}`);
  const got = [];
  bp.on('response', (r) => got.push({ url: r.url(), len: Number(r.headers()['content-length'] || 0), t: Date.now() }));
  await bp.goto(base);
  await bp.waitForFunction((sel) => {
    if (!document.querySelector(sel)) return false;
    const imgs = [...document.querySelectorAll('#app img')].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && i.loading !== 'lazy'; });
    return imgs.every((i) => i.complete) && document.fonts.status === 'loaded';
  }, kind === 'welcome' ? '.welcome-title' : '.path');
  const t = Date.now();
  const until = got.filter((x) => x.t <= t);
  boot[kind] = { requests: until.length, kb: Math.round(until.reduce((a, x) => a + x.len, 0) / 1024) };
  check(boot[kind].requests <= BOOT_BUDGET[kind].requests, `arranque ${kind}: ${boot[kind].requests} peticiones (presupuesto ${BOOT_BUDGET[kind].requests})`);
  check(boot[kind].kb <= BOOT_BUDGET[kind].kb, `arranque ${kind}: ${boot[kind].kb} KB (presupuesto ${BOOT_BUDGET[kind].kb})`);
  check(!until.some((x) => /\/js\/(audio|ui\/screens\/(flows|lesson|result|profile|collection|gallery))/.test(x.url)), `arranque ${kind}: se cargan módulos que no hacen falta para pintar`);
  await bctx.close();
}

// ---------------------------------------------------------------- Recorrido principal 390×844
const context = await browser.newContext(ctxOpts);
const page = await context.newPage();
watch(page, 'main');
const early = [];
page.on('request', (r) => early.push(r.url()));
await page.goto(base);
await page.waitForSelector('.welcome');
// Rendimiento: ni motor de audio ni imágenes grandes antes de pintar la primera pantalla.
check(!early.some((u) => u.includes('/js/audio/')), 'el audio se carga antes de pintar');
check(early.filter((u) => /\/img\//.test(u)).every((u) => /\/img\/s\//.test(u)), 'imágenes grandes en la bienvenida');
check(early.filter((u) => /\/img\//.test(u)).length <= 1, `la bienvenida pide ${early.filter((u) => /\/img\//.test(u)).length} hojas`);
await shot(page, '01-bienvenida');
await audit(page, '390 bienvenida');
await page.click('[data-action="start"]');
await page.waitForSelector('.path');
await shot(page, '02-mapa');
await audit(page, '390 mapa');
check(await page.locator('.today-strip, .lupa-dialog').count() === 0, 'quedan la franja «Hoy» o la lupa del día');
check(await page.locator('.topbar .chip-cuadro').count() === 1 && await page.locator('.chip-level, .chip-daily').count() === 0, 'la cabecera lleva el Cuadro del día (y ni rango ni reto diario)');
check((await page.locator('.chip-cuadro').getAttribute('aria-label')) === 'Cuadro del día, pendiente', 'el Cuadro del día de la cabecera no dice «pendiente»');
check(await page.locator('.overall-bar, .card-daily, .card-continue, .card-review, .today-block').count() === 0, 'quedan tarjetas de arriba del camino');
// Cabecera: objetivos táctiles ≥ 48 px
for (const box of await page.$$eval('.topbar a', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, t: e.getAttribute('aria-label') }; }))) {
  check(box.w >= 48 && box.h >= 48, `cabecera: ${box.t} mide ${Math.round(box.w)}×${Math.round(box.h)}`);
}
// Meta y racha en una pieza: la llama dentro del aro de la meta y «n día(s)»; al tocarla, su explicación en una línea.
const streakChip = await page.locator('.chip-streak').evaluate((a) => ({ label: a.getAttribute('aria-label'), text: a.textContent.trim(), icon: Boolean(a.querySelector('.ring .icon')) }));
check(/^Racha: \d+ días?\. Meta de hoy: 0 de 50 puntos$/.test(streakChip.label) && streakChip.icon, `pieza de racha y meta: ${JSON.stringify(streakChip)}`);
check(/\d+\s*días?$/.test(streakChip.text), `racha sin «n día(s)»: ${streakChip.text}`);
await page.locator('.chip-streak').click();
check(/meta de hoy: 0 de 50 puntos/.test(await page.locator('.chip-tip').innerText()), 'la racha no se explica al tocarla');
await page.mouse.click(5, 400);
check(await page.locator('.chip-tip').count() === 0, 'la explicación de la racha no se cierra al tocar fuera');
check(await page.locator('.brand > span').isVisible(), 'la cabecera no lleva el nombre «Sfumato» a 390 px');
check(!/\bsol\b/i.test(await page.locator('.topbar').evaluate((e) => e.innerHTML)), 'la cabecera sigue hablando de un sol');
check((await page.locator('.topbar').boundingBox()).height < 80, 'la cabecera salta a dos líneas a 390 px');
const mapSrcs = await page.$$eval('.stage-thumb img, .card-thumb img', (els) => els.map((e) => e.getAttribute('src')));
check(mapSrcs.length && mapSrcs.every((src) => src.startsWith('img/s/')), `miniaturas del mapa: ${mapSrcs.slice(0, 3)}`);
// Miniatura del atlas bien recortada: la imagen cubre el marco y no se sale de la hoja.
const crop = await page.$eval('.stage-thumb', (f) => {
  const a = f.getBoundingClientRect(); const i = f.querySelector('img').getBoundingClientRect();
  return { covers: i.left <= a.left + 0.5 && i.top <= a.top + 0.5 && i.right >= a.right - 0.5 && i.bottom >= a.bottom - 0.5, big: i.width > a.width * 1.5 };
});
check(crop.covers && crop.big, `recorte del atlas raro: ${JSON.stringify(crop)}`);
// Repaso de movimiento solo con ≥3 pintores con etapa (el mapa pinta las épocas lejanas por partes: se espera)
await page.waitForSelector('.path-era.is-pending', { state: 'detached' });
const expectedReviews = index.visibleMovements.filter((m) => hasMovementReview(index, m.id)).length;
check(await page.locator('.stage-review').count() === expectedReviews, `repasos en el mapa: ${await page.locator('.stage-review').count()} vs ${expectedReviews}`);
// Mapa v10: de abajo arriba (el primer nodo del DOM, el primero del juego, es el más bajo en pantalla),
// con «Tu museo» arriba y el paisaje del tramo actual cargado (los demás esperan a acercarse). Sin
// personaje ni cofres (vuelven en la v2).
const mapV10 = await page.evaluate(() => {
  const stages = [...document.querySelectorAll('.stage:not(.stage-gallery)')];
  const eras = [...document.querySelectorAll('.path-era')];
  const top = (e) => e.getBoundingClientRect().top + window.scrollY;
  const land = (e) => e.querySelector('.path-land');
  const cur = document.querySelector('.stage-spot.is-current');
  return {
    bottomUp: stages.length > 1 && top(stages[0]) > top(stages[stages.length - 1]) && top(eras[0]) > top(eras[eras.length - 1]),
    museumOnTop: top(document.querySelector('.path-museum')) < top(eras[eras.length - 1]),
    eras: eras.length, extras: document.querySelectorAll('.path-chest, .path-character').length,
    // El paisaje se mete en la página como SVG (map-land.js); si falla, queda como imagen.
    loaded: eras.filter((e) => land(e).tagName === 'svg' || land(e).getAttribute('src')).map((e) => e.dataset.era),
    currentLoaded: Boolean(cur) && (land(cur.closest('.path-era')).tagName === 'svg' || (land(cur.closest('.path-era')).complete && land(cur.closest('.path-era')).naturalWidth > 0)),
    // Sin abrir la presentación de la época, «Tú» está en su medallón (path-lore.js); si no, en la parada actual.
    ringText: [...document.querySelectorAll('.lore-spot.is-here .stage-you, .stage-spot.is-current .stage-you')].map((e) => e.textContent.trim()),
  };
});
check(mapV10.bottomUp, 'el mapa no va de abajo arriba');
check(mapV10.museumOnTop, '«Tu museo» no está arriba del todo');
check(mapV10.extras === 0, 'quedan el personaje o los cofres en el mapa');
check(mapV10.currentLoaded && mapV10.loaded.length <= 2, `paisajes cargados al abrir: ${mapV10.loaded.join(', ') || 'ninguno'}`);
check(mapV10.ringText.join() === 'Tú', `marca del nodo actual: ${mapV10.ringText.join()}`);
const locked = page.locator('.stage.is-locked').first();
await locked.scrollIntoViewIfNeeded();
await locked.click();
await page.waitForTimeout(300);
check(await page.locator('.lock-note.is-visible').count() === 1, 'pulsar una parada cerrada no explica por qué');
await shot(page, '03-mapa-bloqueado');
await page.evaluate(() => window.scrollTo(0, 0));
// Primera etapa: presentación de la época («Entrar» deja en el camino), historia del pintor y ronda (tras la historia
// no hay «Conoce a»), con un fallo y el botón atrás a mitad.
await page.click('.stage-spot.is-current .stage');
await page.waitForSelector('.intro');
await shot(page, '04-intro');
await audit(page, '390 intro');
// Visor: el cuadro central de la presentación en grande (Esc lo cierra y el foco vuelve); dentro, pellizco y doble
// toque reales (CDP) sobre el cuadro, sin zoom de página.
const introArt = page.locator('.intro .wall-1 .art-zoom');
const introGroup = await page.locator('.intro .wall .art-zoom').count();
await viewerCheck(page, '390 intro (humo)', introArt, { group: introGroup, close: 'esc' });
if (introGroup > 1) {
  await introArt.tap();
  await page.waitForSelector('.viewer[open]');
  await page.waitForTimeout(300);
  await viewerZoomCheck(page, await context.newCDPSession(page), '390 intro (humo)', introArt);
  await shot(page, '05b-visor-ampliado-antes');
  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await page.waitForTimeout(350);
  await shot(page, '05c-visor-ampliado');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.viewer', { state: 'detached' });
}
// Como paso del camino, «Saltar» sigue el camino: el cartel del tramo (también con «Saltar») y después la historia del
// pintor, sin volver a la presentación.
await page.click('.intro .deck-secondary');
await page.waitForSelector('dialog.sign-cards[open] .deck-secondary');
check(page.url().includes('#etapa-'), `«Saltar» no sigue hacia el pintor: ${page.url()}`);
await page.click('dialog.sign-cards .deck-secondary');
await page.waitForSelector('.story[open] .story-text');
check(await page.locator('.story[open]').count() === 1, 'tras el cartel del tramo no sale la historia del pintor');
await page.waitForTimeout(400);
await shot(page, '05-historia');
await toRound(page);
const fbTexts = [];
await playRound(page, {
  wrongAt: [1],
  keys: true,
  checkReveal: '390',
  shotsFor: { 'q-who': '06-pregunta-quien', 'q-which': '07-pregunta-cual', 'q-movement': '08-pregunta-movimiento', wrong: '09-fallo', right: '10-acierto', interlude: '11-cuadros-nuevos', combo: '11b-combo' },
  onStep: async ({ step, wrong, type }) => {
    fbTexts.push(await page.locator('.feedback .fb-inner').innerText());
    if (wrong) await assertChosenFeedback(page, type, `390 fallo paso ${step}`);
    if (step === 1) await audit(page, '390 pregunta con fallo');
    if (step === 2) {
      // Botón atrás del navegador durante la ronda: pide confirmación y no sale.
      await page.goBack();
      await page.waitForTimeout(350);
      check(await page.locator('.quit-sheet:not([hidden])').count() === 1, 'atrás no abre «¿Salir de la ronda?»');
      check(await page.locator('.lesson').count() === 1, 'atrás sale de la ronda');
      await shot(page, '12-atras-salir');
      await page.click('[data-action="stay"]');
    }
  },
});
check(fbTexts.every((t) => t.split('\n').length >= 3), 'feedback sin explicación');
const hintPart = (t) => t.split('Dato curioso')[0];
const bothHints = fbTexts.map(hintPart).find((t) => t.includes('Mira') && t.includes('Fíjate'));
check(!bothHints, `feedback con «Mira…» y «Fíjate…» a la vez: ${JSON.stringify(bothHints)}`);
const twoHints = fbTexts.map(hintPart).find((t) => t.split('\n').filter((l) => /^(Mira|Fíjate)/.test(l)).length > 1);
check(!twoHints, `feedback con más de una frase de pista: ${JSON.stringify(twoHints)}`);
check(new Set(fbTexts).size === fbTexts.length, 'feedback repetido idéntico');
await page.waitForSelector('.res');
await page.keyboard.press('Escape'); // el momento de dominar a un maestro, si sale, se cierra antes
await page.waitForTimeout(500);
await shot(page, '13-fin-etapa');
await audit(page, '390 resultado');
check(await page.locator('.res-line').count() === 1, 'falta lo aprendido bajo el titular');
check(/1 día/.test(await page.locator('[data-chip="streak"]').innerText()), 'la racha no se ve el día 1');
check(await page.locator('[data-chip="goal"]').count() === 1, 'meta diaria no celebrada');
check(!/Precisión/.test(await page.locator('.res-tally').innerText()), 'el resultado repite la precisión');
check(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.querySelector('.res-foot [data-primary]').getBoundingClientRect().bottom <= innerHeight), 'el resultado se desplaza o «Seguir» no queda a la vista');
if (SMOKE) {
  await page.goto(`${base}#inicio`);
  await page.waitForSelector('.stage-spot.is-current .stage-you');
  check(await page.locator('.path-character, .path-chest').count() === 0, '390 vuelta al mapa: quedan personaje o cofres');
  check(await page.locator('.stage-spot.is-current .stage-you').count() === 1 && await page.locator('.stage-spot.is-current .stage-meta').count() === 0, 'la parada nueva no lleva la marca «Tú» (o aún lleva botón)');
  await shot(page, '14c-mapa-parada-nueva');
  await audit(page, '390 mapa parada nueva');
  // Presentación de una época en un móvil lento: sale una sola vez, ya con sus tarjetas, sin saltos de maquetación
  // (antes el carrusel se montaba sobre la portada ya pintada y todo se movía).
  const eraCdp = await page.context().newCDPSession(page);
  await eraCdp.send('Network.enable');
  await eraCdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 400 * 1024, uploadThroughput: 200 * 1024 });
  await eraCdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__eraShift = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__eraShift += e.value; }).observe({ type: 'layout-shift' });
  });
  await page.evaluate((id) => { location.hash = `movimiento-${id}`; }, index.visibleMovements[0].id);
  await page.waitForSelector('.intro .era-track .era-card');
  await page.waitForTimeout(1500);
  const eraShift = await page.evaluate(() => window.__eraShift);
  check(eraShift < 0.01, `la presentación de la época salta al abrirse (Layout Shift ${eraShift.toFixed(3)})`);
  await eraCdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await eraCdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await eraCdp.detach();
  await page.goto(`${base}#inicio`);
  await page.waitForSelector('.stage-spot.is-current .stage-you');
  // Rama jugable: cerrada el primer día (tocarla dice qué falta); con el primer tramo del Renacimiento dominado, el
  // desvío del Gótico entra en su pantalla (#rama-gotico): su paisaje, sus pintores como paradas y la marca «Tú» en el
  // primero propio. La ronda sabe que viene del Gótico (#etapa-<pintor>--gotico) y su resultado sigue en él.
  const goticoSign = '.branch[data-id="gotico"]';
  check(await page.locator(`${goticoSign}.is-locked`).count() === 1, 'el Gótico está abierto el primer día');
  await page.locator(goticoSign).scrollIntoViewIfNeeded();
  await page.click(goticoSign);
  await page.waitForSelector('.branch-spot .lock-note.is-visible');
  check(/^Se abre después de /.test(await page.locator('.branch-spot .lock-note.is-visible').innerText()), 'la rama cerrada no dice qué falta');
  check(page.url().endsWith('#inicio'), 'una rama cerrada deja entrar');
  const ownGotico = index.branch('gotico').artists.filter((id) => index.pathIndex(id) < 0);
  const tramo1 = index.steps.filter((x) => x.movementId === index.steps[0].movementId).findIndex((x) => index.artist(x.id).section !== index.artist(index.steps[0].id).section);
  const branchNode = (id) => `.page-branch .stage-spot[data-step="artist:${id}"] .stage`;
  const openGotico = async () => {
    await page.click(goticoSign);
    await page.waitForSelector('.page-branch .stage-spot .stage');
  };
  // Entra en una rama desde el mapa: su cartel propio o, si va en «Ramas (n)», la fila de su hoja.
  const enterBranch = async (id) => {
    if (await page.locator(`.branch[data-id="${id}"]`).count()) await page.click(`.branch[data-id="${id}"]`);
    else {
      await page.click(`.branch[data-members~="${id}"]`);
      await page.click(`dialog.map-sheet [data-ms="go"][data-id="${id}"]`);
    }
    await page.waitForSelector('.page-branch .stage-spot .stage');
  };
  // Meta alta: si la ronda cumpliera la meta, el siguiente paso sería «Por hoy, hecho» (engine/next-step.js, regla 2).
  const branchState = seededState({ upTo: tramo1 });
  branchState.settings.dailyGoal = 200;
  await seed(page, branchState);
  await page.waitForSelector(`${goticoSign}.is-open`);
  await openGotico();
  check(page.url().endsWith('#rama-gotico'), `el desvío no entra en la pantalla de la rama: ${page.url()}`);
  check(await page.locator(`.page-branch .stage-spot.is-current[data-step="artist:${ownGotico[0]}"] .stage-you`).count() === 1, 'la rama no marca al primer pintor como parada actual');
  check(await page.locator(branchNode(ownGotico[1])).getAttribute('data-status') === 'locked', 'la rama deja jugar a un pintor aún cerrado');
  check(await page.locator('.page-branch .path-land:not(.path-movers)').count() === 1, 'la rama no tiene paisaje');
  await shot(page, '14e-rama-pantalla');
  await audit(page, '390 pantalla de rama');
  await page.click(branchNode(ownGotico[0]));
  await toRound(page);
  check(page.url().endsWith(`#etapa-${ownGotico[0]}--gotico`), `la rama no lleva a la etapa con su rama: ${page.url()}`);
  await playRound(page);
  await page.waitForSelector('.res');
  await closeMatchMoment(page);
  // Resultado de rama: su avance en la primera ficha (pulsable, a la rama) y «Siguiente en la rama» como acción principal.
  check(/Rama · \d+\/\d+/i.test(await page.locator('[data-chip="branch"]').innerText()), 'el resultado no enseña el avance de la rama');
  check(await page.locator('[data-chip="branch"][data-to="rama-gotico"]').count() === 1, 'el avance de la rama no lleva a su pantalla');
  check(await page.evaluate(() => document.querySelector('.res-chip')?.dataset.chip === 'branch'), 'la ficha de rama no va la primera');
  check(await page.locator(`[data-primary][data-to="etapa-${ownGotico[1]}--gotico"]`).innerText() === 'Siguiente en la rama', 'la acción principal no es «Siguiente en la rama» del Gótico');
  await shot(page, '14f-rama-resultado', true);
  await audit(page, '390 resultado de rama');
  check(await page.locator('[data-action="done"]').innerText() === 'Volver a la rama', 'el resultado de rama no ofrece «Volver a la rama»');
  await page.click('[data-action="done"]');
  await page.waitForSelector('.page-branch .stage-spot .stage');
  await page.waitForTimeout(400);
  check(page.url().endsWith('#rama-gotico') && await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }, branchNode(ownGotico[0])), '«Volver a la rama» no vuelve a la rama, en la parada jugada');
  check(await page.locator(branchNode(ownGotico[1])).getAttribute('data-status') !== 'locked', 'tras la ronda no se abre el siguiente pintor de la rama');
  // «Camino» vuelve al mapa centrado en el desvío; atrás del móvil, igual.
  await page.click('.branch-back');
  await page.waitForSelector(goticoSign);
  await page.waitForTimeout(400);
  check(page.url().endsWith('#inicio') && await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }, goticoSign), '«Camino» no vuelve al desvío');
  await openGotico();
  await page.goBack();
  await page.waitForSelector(goticoSign);
  check(page.url().endsWith('#inicio'), `atrás desde la rama no vuelve al mapa: ${page.url()}`);
  // «Repetir» tras una ronda floja sigue en la rama (Duccio, del Gótico, todo fallado).
  await openGotico();
  await page.click(branchNode(ownGotico[1]));
  await toRound(page);
  await playRound(page, { wrongAt: Array.from({ length: 30 }, (_, k) => k) });
  await page.waitForSelector('.res');
  check(await page.locator(`[data-primary][data-to="etapa-${ownGotico[1]}--gotico"]`).count() === 1, '«Repetir» tras una ronda de rama no sigue en la rama');
  // Dentro de una rama manda su estado allí: con Duccio sin superar, Giotto está cerrado en el Gótico aunque en
  // Descubre el Renacimiento se pueda jugar. La URL directa no lo deja jugar y su parada dice qué falta.
  await page.goto(`${base}#etapa-giotto--gotico`);
  await page.waitForFunction(() => location.hash === '#inicio');
  await page.waitForSelector(goticoSign);
  check(await page.locator('.learn').count() === 0, 'Giotto cerrado en el Gótico se puede jugar como Gótico');
  await openGotico();
  check(await page.locator(branchNode('giotto')).getAttribute('data-status') === 'locked', 'la rama no marca a Giotto cerrado');
  await page.click(branchNode('giotto'));
  await page.waitForSelector('.page-branch .lock-note.is-visible');
  check(/acierta la mitad con duccio/i.test(await page.locator('.page-branch .lock-note.is-visible').innerText()), 'la parada de Giotto en el Gótico no dice qué falta');
  check(page.url().endsWith('#rama-gotico'), 'tocar un pintor cerrado de la rama cambia de pantalla');
  await audit(page, '390 parada cerrada en la rama');
  // Doble toque (muy habitual en el móvil) en un cartel: una sola entrada en el historial y ninguna hoja.
  const openDialogs = () => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.className));
  await page.goto(`${base}#inicio`);
  await page.waitForSelector(goticoSign);
  await page.locator(goticoSign).dispatchEvent('click');
  await page.locator(goticoSign).dispatchEvent('click');
  await page.waitForSelector('.page-branch .stage-spot .stage');
  check((await openDialogs()).length === 0, `doble toque en un cartel: ${JSON.stringify(await openDialogs())}`);
  await page.goBack();
  await page.waitForSelector(goticoSign);
  check(page.url().endsWith('#inicio'), `doble toque: atrás no vuelve al mapa (${page.url()})`);
  // Sin caseta en la salida: «Cómo se juega» está en Perfil → Ajustes y «Vamos» lo cierra.
  check(await page.locator('[data-action="start"], .start-kiosk').count() === 0, 'queda la caseta de la salida');
  await page.goto(`${base}#perfil`);
  await page.click('[data-action="open-settings"]');
  await page.click('.settings-dialog [data-action="how"]');
  await page.waitForSelector('dialog.map-sheet[open] .ms-how');
  await audit(page, '390 cómo se juega');
  await page.click('dialog.map-sheet .ms-ok');
  await page.waitForTimeout(300);
  check((await openDialogs()).length === 0, '«Vamos» no cierra «Cómo se juega»');
  await page.goto(`${base}#inicio`);
  await page.waitForSelector('.path-map .stage');
  // Un pintor del camino común dentro de una rama se ve «En el camino» y lleva a su parada (Berruguete en Maestros
  // españoles).
  await enterBranch('maestros-espanoles');
  check((await page.locator(`${branchNode('berruguete')} .stage-meta`).innerText()) === 'En el camino', 'Berruguete no se ve «En el camino» en Maestros españoles');
  await shot(page, '14g-rama-espanoles');
  await page.click(branchNode('berruguete'));
  await page.waitForSelector('.path-map .stage-spot[data-step="artist:berruguete"] .stage');
  await page.waitForTimeout(400);
  check(page.url().endsWith('#inicio') && await page.evaluate(() => { const r = document.querySelector('.stage-spot[data-step="artist:berruguete"] .stage').getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }), 'Berruguete «En el camino» no lleva a su parada del camino');
  // Una rama de un grupo «Ramas (n)» se entra desde su hoja y juega en ella (su primer pintor, desde Descubre el
  // Renacimiento).
  const firstDiscover = index.branch('descubre-renacimiento').artists[0];
  await enterBranch('descubre-renacimiento');
  await page.click(branchNode(firstDiscover));
  await page.waitForSelector('.story[open] .story-text');
  check(page.url().endsWith(`#etapa-${firstDiscover}--descubre-renacimiento`), `la rama no juega en ella: ${page.url()}`);
  await page.goto(`${base}#perfil`);
  await page.waitForSelector('.pf-hero');
  await audit(page, '390 perfil');
  check((await page.locator('.pf-rank-name').innerText()).length > 0 && (await page.locator('.pf-layout').innerText()).includes('Logros'), 'perfil sin rango ni logros');
  check(await page.locator('button.pf-medal').count() >= 1, 'las medallas del perfil no son pulsables');
  // Colección: buscador siempre, «Lo último» y una fila por época; los que esperan, bloqueados y sin obras.
  const pintSeen = Object.fromEntries(index.artists.slice(0, 16).filter((a) => index.worksOf(a.id).length).map((a) => [index.worksOf(a.id)[0].id, '2026-11-20']));
  pintSeen[index.worksOf(index.path[0].id)[1].id] = '2026-11-21';
  await seed(page, seededState({ upTo: 3, extra: { collection: pintSeen } }), 'coleccion-pintores');
  await page.waitForSelector('.cx-card');
  await audit(page, '390 colección');
  check(await page.locator('.cx-works .art-zoom').count() >= 1, 'no sale «Lo último»');
  check(await page.locator('.cx-card.is-locked img').count() === 0, 'un pintor bloqueado enseña una obra');
  await page.fill('.sg-input', 'zzzz');
  check(await page.locator('.sg-empty:not([hidden])').count() === 1, 'la búsqueda sin resultados no lo dice');
  await page.fill('.sg-input', '');
  const firstRowArtist = index.path[0].id;
  const storyRow = page.locator(`.cx-card[data-artist="${firstRowArtist}"]`);
  await storyRow.scrollIntoViewIfNeeded();
  const listY = await page.evaluate(() => window.scrollY);
  await storyRow.click();
  await page.waitForSelector('.ap-name');
  await page.waitForTimeout(400);
  check(page.url().endsWith(`#pintor-${firstRowArtist}`), `la ficha no es una pantalla con su ruta: ${page.url()}`);
  check((await page.locator('.ap-name').innerText()).length > 2, 'la ficha de pintor no tiene nombre');
  check(await page.locator('.ap-facts, .ap-stages, .ap-life').count() === 0, 'la ficha repite datos, etapas o «Quién fue»');
  // Estilo Instagram: pintor dominado, avatar con el aro de niveles (tocarlo juega el siguiente) y portada con su cuadro
  // más famoso visto.
  check(await page.locator('button.ap-avatar[data-ap="deep"] .ap-ring.has-levels').count() === 1
    && /^Jugar /.test(await page.locator('button.ap-avatar').getAttribute('aria-label')), 'el avatar del pintor dominado no lleva el aro de niveles con el siguiente nivel');
  check(await page.locator('.ap-cover img').count() === 1, 'la portada no enseña ningún cuadro visto');
  const galleryShown = await page.locator('.ap-gallery li:not(.ap-gap)').count();
  const galleryText = await page.locator('.ap-gallery .ap-count').innerText();
  check(galleryShown === Number(galleryText.split(' ')[0]), `la galería enseña ${galleryShown} y dice «${galleryText}»`);
  check(await page.locator('.ap-gap img').count() === 0, 'un hueco enseña imagen');
  await shot(page, '14d-ficha-pintor');
  await audit(page, '390 ficha de pintor');
  // Historia destacada del nivel hecho: vuelve a poner su historia.
  await page.locator('.hl-row .hl[data-hl="1"][data-state="done"]').click();
  await page.waitForSelector('.story[open] .story-text');
  await page.waitForTimeout(300);
  check(await page.locator('.story .deck-bar.is-done').count() === 1 && await page.locator('.story .deck-primary').innerText() === 'Seguir', 'la historia no empieza en la primera tarjeta con «Seguir»');
  await shot(page, '14m-ficha-historia');
  // Atrás cierra la historia y deja en la ficha.
  const storyUrl = page.url();
  await page.goBack();
  await page.waitForSelector('.story', { state: 'detached' });
  check(page.url() === storyUrl && await page.locator('.ap-name').count() === 1, `atrás con la historia abierta no deja en la ficha: ${page.url()}`);
  await page.goBack();
  await page.waitForSelector('.cx-card');
  check(Math.abs((await page.evaluate(() => window.scrollY)) - listY) < 8, 'atrás no devuelve la lista donde estaba');
  // Historia al empezar el nivel: tarjetas (≤ 3) con barra de progreso, saltable, solo la primera vez.
  // Con movimiento reducido las tarjetas no avanzan solas: se pasa a mano (con él, avanzan al llenarse la barra).
  const storyCtx = await rawNewContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const sp = await storyCtx.newPage();
  watch(sp, 'historia');
  await sp.goto(base);
  const storyArtist = index.path[0];
  await writeState(sp, seededState({ upTo: 0, extra: { collection: { [index.worksOf(storyArtist.id)[0].id]: '2026-11-20' } } }));
  // Sin ver la historia, el anillo del avatar es de marca; al verla, gris.
  await sp.goto(`${base}#pintor-${storyArtist.id}`);
  await sp.reload();
  await sp.waitForSelector('.ap-name');
  check(await sp.locator('button.ap-avatar .ap-ring.is-new').count() === 1, 'el anillo de una historia sin ver no es de marca');
  await sp.goto(`${base}#etapa-${storyArtist.id}`);
  await sp.reload();
  await sp.waitForSelector('.intro, .story[open]');
  // La primera vez sale la presentación de la época: «Saltar» pasa por el cartel del tramo («Saltar») y abre la historia.
  if (await sp.locator('.intro').count()) {
    await sp.click('.intro .deck-secondary');
    await sp.waitForSelector('dialog.sign-cards[open] .deck-secondary, .story[open]');
    if (await sp.locator('dialog.sign-cards[open]').count()) await sp.click('dialog.sign-cards .deck-secondary');
  }
  await sp.waitForSelector('.story[open] .story-text');
  // De 1 a 5 tarjetas (decisión de María, 26/11).
  const MAX_STORY_CARDS = 5;
  const nCards = await sp.locator('.story .deck-bar').count();
  check(nCards >= 1 && nCards <= MAX_STORY_CARDS, `la historia tiene ${nCards} tarjetas`);
  check(await sp.locator('.story-img').count() === 1 && await sp.locator('.story-text').innerText() !== '', 'la tarjeta no enseña cuadro y texto');
  await sp.waitForTimeout(400);
  await shot(sp, '14g-historia');
  await audit(sp, '390 historia');
  // Teclado: una flecha, exactamente una tarjeta (antes saltaba de dos en dos: el manejador del documento la contaba otra vez).
  if (nCards >= 3) {
    await sp.keyboard.press('ArrowRight');
    check(await sp.locator('.story .deck-bar.is-done').count() === 2, `→ no avanza exactamente una tarjeta (${await sp.locator('.story .deck-bar.is-done').count()} barras)`);
    await sp.keyboard.press('ArrowLeft');
    check(await sp.locator('.story .deck-bar.is-done').count() === 1, `← no retrocede exactamente una tarjeta (${await sp.locator('.story .deck-bar.is-done').count()} barras)`);
  }
  for (let k = 0; k < nCards - 1; k++) {
    await sp.keyboard.press('ArrowRight');
    await sp.waitForTimeout(150);
  }
  check(await sp.locator('.story .deck-bar.is-done').count() === nCards && await sp.locator('.story [data-deck="play"]').count() === 1 && await sp.locator('.story [data-deck="more"]').count() === 1, 'la última tarjeta no ofrece «Ir a las preguntas» y «Más sobre…»');
  check(await sp.locator('.story-caption').count() === 1, 'la tarjeta no lleva el pie con el título de la obra');
  // «Ir a las preguntas» empieza la ronda: sin «Conoce a» tras la historia.
  await sp.click('.story [data-deck="play"]');
  await sp.waitForSelector('.lesson .option');
  await sp.waitForTimeout(500); // pasado el margen contra toques fantasma al cerrar la historia (ui/tap-guard.js)
  check(await sp.locator('.story').count() === 0, 'la historia no se cierra al terminar');
  check(await sp.locator('.learn').count() === 0, 'tras la historia sale «Conoce a»');
  // Sale de la ronda (si no, al volver a la parada se retoma la ronda guardada).
  await sp.click('.lesson [data-action="quit"]');
  if (await sp.locator('.quit-sheet:not([hidden])').count()) await sp.click('.quit-sheet [data-action="leave"]');
  await sp.waitForSelector('.lesson', { state: 'detached' });
  await sp.goto(`${base}#pintor-${storyArtist.id}`);
  await sp.reload();
  await sp.waitForSelector('.ap-name');
  check(await sp.locator('button.ap-avatar .ap-ring.is-seen').count() === 1, 'tras ver la historia el anillo no pasa a gris');
  // La historia sale siempre al entrar en un pintor (decisión de María, 26/11).
  await sp.goto(`${base}#etapa-${storyArtist.id}`);
  await sp.waitForSelector('.story[open] .story-text');
  check(await sp.locator('.learn').count() === 0, 'al volver a la parada no sale la historia');
  await storyCtx.close();
  // Niveles «a fondo»: aro por tramos en el retrato del pintor dominado (un tramo por nivel, el 1 incluido); tocarlo abre su
  // tarjeta con un círculo por nivel y «Empezar · <nivel>»; ronda propia con su celebración (nivel superado) o, si faltan
  // cuadros por ver, el aviso de «una ronda más».
  // Uno cuyo nivel 2 tenga historia (la tarjeta la pone antes de la ronda).
  const toldDeep = (id) => { try { return JSON.parse(readFileSync(new URL(`../app/data/historias/${id}.json`, import.meta.url), 'utf8')).levels.some((l) => l.level === 2); } catch { return false; } };
  const deepArtist = index.path.find((a) => ringLevels(index, a.id).length >= 3 && toldDeep(a.id));
  const deepUpTo = index.pathIndex(deepArtist.id) + 1;
  const deepLevel = index.deepLevels(deepArtist.id)[0];
  const deepSeen = (all) => ({ artists: { ...seededState({ upTo: deepUpTo }).progress.artists, [deepArtist.id]: { plays: 1, best: 1, mastered: true, works: [...index.worksOf(deepArtist.id)].filter((w) => w.level === 1 || all).map((w) => w.id) } } });
  // La tarjeta se ve al instante aunque su historia tarde (docs/eval/rendimiento.md): se pinta y los círculos se
  // completan con la historia al llegar. Se retrasa la historia de este pintor para comprobarlo.
  const STORY_DELAY_MS = 2500;
  const CARD_FAST_MS = 600;
  const slowStory = `**/data/historias/${deepArtist.id}.json`;
  await context.route(slowStory, async (route) => { await new Promise((r) => setTimeout(r, STORY_DELAY_MS)); await route.continue(); });
  await seed(page, seededState({ upTo: deepUpTo, extra: deepSeen(false) }), 'inicio');
  const deepNode = '.stage-spot[data-step="artist:' + deepArtist.id + '"] .stage';
  await page.waitForSelector(`${deepNode} .level-ring`);
  const rungs = ringLevels(index, deepArtist.id).length;
  const ring = await page.locator(deepNode).evaluate((b) => ({ arcs: b.querySelectorAll('.ring-arc').length, done: b.querySelectorAll('.ring-arc.is-done').length, next: b.querySelectorAll('.ring-arc.is-next').length, label: b.getAttribute('aria-label'), badge: b.querySelector('.stage-badge.is-next')?.textContent }));
  check(ring.arcs === rungs && ring.done === 1 && ring.next === 1 && ring.badge === '2' && ring.label.endsWith(`Nivel 2 de ${index.deepLevels(deepArtist.id).length + 1} por jugar`), `aro de niveles: ${JSON.stringify(ring)}`);
  await page.locator(deepNode).scrollIntoViewIfNeeded();
  await shot(page, '14h-mapa-aro-niveles');
  const tapAt = Date.now();
  await page.locator(deepNode).click();
  await page.waitForSelector('.lc[open] .lc-card');
  const cardMs = Date.now() - tapAt;
  check(cardMs < CARD_FAST_MS && await page.locator('.lc .hl[data-story="1"]').count() === 0, `la tarjeta del nodo espera a la historia (${cardMs} ms)`);
  await page.waitForSelector('.lc .hl[data-story="1"]', { timeout: STORY_DELAY_MS * 3 });
  await context.unroute(slowStory);
  check(await page.locator('.lc .hl').count() === rungs && await page.locator('.lc .hl.is-next').count() === 1 && await page.locator('.lc .hl.is-locked').count() === rungs - 2, 'la tarjeta del nodo no enseña un círculo por nivel con su estado');
  check((await page.locator('.lc-play').innerText()).replace(/\s+/g, ' ').trim() === `Empezar · ${stageTitle(deepArtist, deepLevel)}`, `el botón de la tarjeta no es «Empezar · <nivel>»: ${await page.locator('.lc-play').innerText()}`);
  await page.locator('.lc .hl.is-locked').first().click();
  check((await page.locator('.lc .hl-note').innerText()).startsWith('Se abre al terminar'), 'un nivel cerrado no dice qué falta');
  await shot(page, '14i-tarjeta-nodo');
  await audit(page, '390 tarjeta del nodo');
  await page.locator('.lc .hl.is-done').click();
  await page.waitForSelector('.story[open]');
  check(await page.locator('.lc .hl-pick-btn').count() === 0, 'un nivel hecho no abre directamente su historia');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.story[open]', { state: 'detached' });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lc', { state: 'detached' });
  check(page.url().endsWith('#inicio'), `cerrar la tarjeta cambia de pantalla: ${page.url()}`);
  await page.locator(deepNode).click();
  await page.click('.lc-play');
  await page.waitForSelector('.story[open] .story-text');
  await skipStory(page);
  await page.waitForSelector('.lesson');
  check(page.url().endsWith('#a-fondo-' + deepArtist.id + '-' + deepLevel.id), `la etapa no lleva a su ronda: ${page.url()}`);
  await playRound(page);
  await page.waitForSelector('.res-title');
  check(/por ver: una ronda más/.test(await page.locator('.res-line').innerText()) || await page.locator('[data-chip="deep"]').count() === 1, 'faltan cuadros por ver y el resultado no lo dice');
  check(await page.locator('.res-foot [data-to="a-fondo-' + deepArtist.id + '-' + deepLevel.id + '"]').count() === 1 || await page.locator('[data-chip="deep"]').count() === 1, 'sin «Repetir» en el nivel a fondo');
  await shot(page, '14j-resultado-a-fondo-faltan', true);
  await seed(page, seededState({ upTo: deepUpTo, extra: deepSeen(true) }), `a-fondo-${deepArtist.id}-${deepLevel.id}`);
  await page.waitForSelector('.story[open] .story-text');
  await skipStory(page);
  await page.waitForSelector('.lesson');
  await playRound(page);
  await page.waitForSelector('.res-title');
  check(await page.locator('.res-seal').count() === 1 && (await page.locator('.res-kicker').innerText()).toLowerCase().includes(stageTitle(deepArtist, deepLevel).toLowerCase()), 'el nivel a fondo superado no se celebra');
  check(await page.locator('.res .btn-primary').count() === 1, `la celebración a fondo no tiene un solo «siguiente» principal (${await page.locator('.res .btn-primary').count()})`);
  await shot(page, '14k-resultado-a-fondo-superado', true);
  await audit(page, '390 resultado a fondo');

  // La historia de una etapa «a fondo» precede a la ronda: al pasarla («Jugar» o hasta el final) la ronda empieza limpia,
  // sin «¿Salir de la ronda?» (su entrada de historial llegaba cuando la ronda ya estaba montada). Esc la cierra y
  // vuelve al camino, sin ronda.
  const storyIndexJson = JSON.parse(readFileSync(new URL('../app/data/historias/index.json', import.meta.url), 'utf8'));
  const stageStoryArtist = index.path.find((a) => (storyIndexJson[a.id] || []).includes(2) && index.deepLevels(a.id).some((l) => l.id === 2));
  const stageStoryUpTo = index.pathIndex(stageStoryArtist.id) + 1;
  for (const how of ['saltar', 'esc', 'hasta el final', 'desde la ficha']) {
    const sc = await rawNewContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const spg = await sc.newPage();
    watch(spg, `historia-etapa-${how}`);
    await spg.goto(base);
    await writeState(spg, seededState({ upTo: stageStoryUpTo, extra: { collection: Object.fromEntries(index.levelWorks(stageStoryArtist.id, 1).map((w) => [w.id, '2026-11-20'])) } }));
    if (how === 'desde la ficha') {
      // El camino real: ficha → etapa, sin recargar.
      await spg.goto(`${base}#pintor-${stageStoryArtist.id}-etapas`);
      await spg.reload();
      await spg.waitForSelector('.hl[data-hl="2"]');
      await spg.click('.hl[data-hl="2"]');
    } else {
      await spg.goto(`${base}#a-fondo-${stageStoryArtist.id}-2`);
      await spg.reload();
    }
    await spg.waitForSelector('.story[open] .story-text');
    if (how === 'esc') {
      await spg.keyboard.press('Escape');
      await spg.waitForSelector('.story', { state: 'detached' });
      await spg.waitForTimeout(800);
      check(await spg.locator('.lesson').count() === 0 && !spg.url().includes('#a-fondo-'), `historia de etapa «a fondo» (esc): no vuelve al camino (${spg.url()})`);
      await sc.close();
      continue;
    }
    const MAX_CARDS = 8;
    if (how === 'saltar' || how === 'desde la ficha') await skipStory(spg);
    else {
      // Tocando a la derecha de la tarjeta hasta la última, que no se cierra sola: allí, el botón final.
      const frame = spg.locator('.story[open] .story-frame');
      const box = await frame.boundingBox();
      for (let k = 0; k < MAX_CARDS && !(await spg.locator('.story[open] [data-deck="play"]').count()); k++) {
        await frame.click({ position: { x: box.width * 0.85, y: box.height * 0.3 } });
        await spg.waitForTimeout(150);
      }
      await spg.click('.story[open] [data-deck="play"]');
    }
    await spg.waitForSelector('.lesson');
    await spg.waitForTimeout(800);
    check(await spg.locator('.quit-sheet:not([hidden])').count() === 0, `historia de etapa «a fondo» (${how}): sale «¿Salir de la ronda?» sobre la ronda recién empezada`);
    check(spg.url().endsWith(`#a-fondo-${stageStoryArtist.id}-2`), `historia de etapa «a fondo» (${how}): la ruta cambia a ${spg.url()}`);
    await sc.close();
  }
  // Galería del pintor (desde su ficha, «Ver todos»): las desbloqueadas como miniaturas y lo que falta en una frase.
  const allArtist = index.path[0];
  const allWorks = index.worksOf(allArtist.id);
  const fourColl = Object.fromEntries(allWorks.slice(0, 4).map((w) => [w.id, '2026-11-20']));
  await seed(page, seededState({ upTo: 3, extra: { collection: fourColl } }), `pintor-${allArtist.id}`);
  await page.waitForSelector('.ap-all');
  await page.locator('.ap-all').click();
  await page.waitForSelector('.aw-grid');
  check(page.url().endsWith(`#obras-${allArtist.id}`), `«Ver sus 4 cuadros» no lleva a su galería: ${page.url()}`);
  const gal = await page.evaluate(() => {
    const g = document.querySelector('.aw-grid');
    return { shown: g.querySelectorAll('li .art').length, gaps: document.querySelectorAll('.ap-gap').length, missing: (document.querySelector('.ap-missing') || {}).textContent || '', badges: g.querySelectorAll('.zoom-badge').length, sub: document.querySelector('.aw-sub').textContent.trim(), cols: getComputedStyle(g).gridTemplateColumns.split(' ').length };
  });
  check(gal.shown === 4 && gal.gaps === 0 && gal.badges === 0 && gal.missing.includes(`Te faltan ${allWorks.length - 4} ·`) && gal.sub === `4 de ${allWorks.length} cuadros` && gal.cols >= 3, `galería del pintor: ${JSON.stringify(gal)}`);
  await shot(page, '14l-galeria-pintor');
  await audit(page, '390 galería del pintor');
  await page.locator('.aw-grid li:not(.ap-gap) .art-zoom').first().click();
  await page.waitForSelector('.viewer[open]');
  check(await page.locator('.viewer-slide').count() === 4, 'el visor de la galería no pasa por las 4 obras');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.viewer', { state: 'detached' });
  await page.locator('.aw-ficha').click();
  await page.waitForSelector('.ap-name');
  check(page.url().endsWith(`#pintor-${allArtist.id}`), 'el enlace «Su ficha» no lleva a la ficha');
  await page.locator('.ap-all').click();
  await page.waitForSelector('.aw-grid');
  check(page.url().endsWith(`#obras-${allArtist.id}`), '«Ver sus n cuadros» de la ficha no lleva a la galería');
  await page.locator('.ap-back').click();
  await page.waitForSelector('.ap-name');
  await page.locator('.ap-back').click();
  await page.waitForSelector('.aw-grid');
  const manyColl = Object.fromEntries(index.artists.slice(0, 16).filter((a) => index.worksOf(a.id).length).map((a) => [index.worksOf(a.id)[0].id, '2026-11-20']));
  await seed(page, seededState({ upTo: 3, extra: { collection: manyColl } }), 'coleccion');
  await page.waitForSelector('.sg-input');
  const target = index.artist(index.artwork(Object.keys(manyColl)[0]).artistId);
  await page.fill('.sg-input', target.name.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase());
  await page.waitForSelector('.sg-option');
  const sg = await page.evaluate(() => ({ n: document.querySelectorAll('.sg-option').length, expanded: document.querySelector('.sg-input').getAttribute('aria-expanded'), role: document.querySelector('.sg-input').getAttribute('role'), strong: document.querySelectorAll('.sg-option strong').length, h: [...document.querySelectorAll('.sg-option')].map((o) => o.getBoundingClientRect().height) }));
  check(sg.n >= 1 && sg.n <= 6 && sg.expanded === 'true' && sg.role === 'combobox' && sg.strong >= 1 && sg.h.every((h) => h >= 48), `sugerencias: ${JSON.stringify(sg)}`);
  await shot(page, '14f-buscador');
  await audit(page, '390 colección con buscador');
  await page.fill('.sg-input', 'zzzq');
  check(await page.locator('.sg-empty').isVisible() && await page.locator('.sg-option').count() === 0, 'sin resultados no dice nada amable');
  await page.fill('.sg-input', target.name.slice(0, 3));
  await page.waitForSelector('.sg-option');
  await page.keyboard.press('ArrowDown');
  check(await page.locator('.sg-option[aria-selected="true"]').count() === 1, 'las flechas no marcan una sugerencia');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.ap-name');
  check(page.url().includes('#pintor-'), 'elegir un pintor no abre su ficha');
  await page.goBack();
  await page.waitForSelector('.cx-card');
  await page.locator('.cx-card[data-artist]').first().click();
  await page.waitForSelector('.ap-name');
  await page.goBack();
  await page.waitForSelector('.cx-card');
  // Un pintor por descubrir: su hoja dice quién es y dónde se conoce, sin ninguna obra suya.
  await page.locator('.cx-card.is-locked').first().click();
  await page.waitForSelector('.map-sheet[open] .ms-title');
  check(await page.locator('.map-sheet[open] .art, .map-sheet[open] img:not(.av-bg)').count() === 0 && await page.locator('.map-sheet[open] .ms-lock').count() === 1, 'la hoja de un pintor por descubrir enseña obras o no dice dónde se conoce');
  await shot(page, '14g-pintor-bloqueado');
  await audit(page, '390 pintor por descubrir');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.map-sheet', { state: 'detached' });
  // Pintor sin ver (enlace directo): ficha sin cuadros nombrados ni historia; invitados con autor y huecos resumidos; texto al 200 %.
  await seed(page, seededState({ upTo: 0 }), 'pintor-goya');
  await page.waitForSelector('.ap-name');
  const unseenBio = await page.locator('#main').innerText();
  check(!/maja|brujas/i.test(unseenBio) && await page.locator('.ap-gallery').count() === 0 && await page.locator('button.ap-avatar').count() === 0, `la ficha de un pintor sin ver revela cuadros o historia: ${unseenBio.slice(0, 80)}`);
  await page.goto(`${base}#obras-goya`);
  await page.waitForSelector('.aw-empty');
  check(await page.locator('.ap-gap').count() === 0, 'la galería de un pintor sin ver pinta huecos');
  const guestArtist = index.artists.find((a) => a.category === 'invitado' && index.worksOf(a.id).length >= 2);
  await seed(page, seededState({ upTo: 3, extra: { collection: { [index.worksOf(guestArtist.id)[0].id]: '2026-11-20' } } }), `obras-invitados-${guestArtist.movementId}`);
  await page.waitForSelector('.aw-grid');
  check(await page.locator('.aw-who').count() === 1 && /^y \d+ por descubrir$/.test((await page.locator('.aw-more').innerText()).trim()) && await page.locator('.ap-gap').count() === 0, 'la galería de invitados no pone el autor ni resume los huecos');
  // La Colección entra por los ojos: el primer cuadro de «Lo último» se ve entero en la primera pantalla de 360×640.
  const eyeCtx2 = await rawNewContext({ viewport: { width: 360, height: 640 } });
  const ep = await eyeCtx2.newPage();
  watch(ep, 'primer-cuadro');
  await ep.goto(base);
  await writeState(ep, seededState({ upTo: index.stepsOf(index.visibleMovements[0].id).length, extra: { collection: Object.fromEntries(index.artists.slice(0, 16).filter((a) => index.worksOf(a.id).length).map((a) => [index.worksOf(a.id)[0].id, '2026-11-20'])) } }));
  await ep.goto(`${base}#coleccion`);
  await ep.reload();
  await ep.waitForSelector('.cx-works .art');
  await ep.waitForTimeout(500);
  const eye = await ep.evaluate(() => { const i = document.querySelector('.cx-works .art').getBoundingClientRect(); return { bottom: i.bottom, vh: innerHeight, search: Boolean(document.querySelector('.sg-input')), salas: document.querySelectorAll('.cx-sala').length }; });
  check(eye.bottom <= eye.vh - 64 && eye.search && eye.salas === 1, `el primer cuadro no se ve en la primera pantalla de 360×640: ${JSON.stringify(eye)}`);
  await shot(ep, '14n-coleccion-360');
  await audit(ep, '360 colección con buscador');
  await eyeCtx2.close();
  const bigText = await rawNewContext({ viewport: { width: 360, height: 640 } });
  const bp = await bigText.newPage();
  watch(bp, 'texto-200');
  await bp.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '200%'; }));
  const bigSeen = Object.fromEntries(index.artists.slice(0, 16).filter((a) => index.worksOf(a.id).length).map((a) => [index.worksOf(a.id)[0].id, '2026-11-20']));
  bigSeen[index.worksOf(index.path[0].id)[0].id] = '2026-11-20';
  await bp.goto(base);
  await writeState(bp, seededState({ upTo: 3, extra: { collection: bigSeen } }));
  for (const r of ['coleccion', 'coleccion-pintores', `pintor-${index.path[0].id}`, `obras-${index.path[0].id}`]) {
    await bp.goto(`${base}#${r}`);
    await bp.reload();
    await bp.waitForSelector('.cx-card, .ap-name, .aw-grid');
    await bp.waitForTimeout(300);
    const over = await bp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(over <= 0, `texto al 200 % en 360 px: #${r} desborda ${over} px`);
    if (r === 'coleccion') {
      // Con letra grande, el nombre de cada pintor se lee (dos líneas como mucho, sin cortar la palabra).
      const names = await bp.evaluate(() => [...document.querySelectorAll('.cx-name')].slice(0, 6).map((n) => n.scrollWidth <= n.clientWidth + 1));
      check(names.every(Boolean), `texto al 200 %: nombres de pintor cortados ${JSON.stringify(names)}`);
    }
    if (r.startsWith('obras-')) {
      // El título de la galería no se parte letra a letra: ancho útil y sin recortes; «Su ficha» en su fila.
      const g = await bp.evaluate(() => { const t = document.querySelector('.aw-title'); const f = document.querySelector('.aw-ficha'); const b = t.getBoundingClientRect(); return { w: b.width, h: b.height, fs: parseFloat(getComputedStyle(t).fontSize), clipped: t.scrollWidth > t.clientWidth + 1, ficha: f ? f.getBoundingClientRect().top >= b.bottom - 2 : true }; });
      check(g.w >= 150 && g.h < g.fs * 1.4 * 4 && !g.clipped && g.ficha, `texto al 200 %: título de la galería ${JSON.stringify(g)}`);
    }
  }
  // La historia con letra grande: el texto se desplaza en su panel, «Siguiente» queda a la vista, el foco no sale y dura más.
  await bp.goto(`${base}#pintor-${index.path[0].id}`);
  await bp.reload();
  // Pintor dominado: su historia, desde el círculo de su nivel hecho (el avatar juega el siguiente nivel).
  await bp.waitForSelector('.hl-row .hl[data-hl="1"][data-state="done"]');
  await bp.locator('.hl-row .hl[data-hl="1"][data-state="done"]').click();
  await bp.waitForSelector('.story[open] .story-text');
  await bp.waitForTimeout(300);
  const st200 = await bp.evaluate(() => { const n = document.querySelector('.story .deck-primary').getBoundingClientRect(); return { nextBottom: n.bottom, vh: innerHeight, headOverlap: document.querySelector('.story .deck-head').getBoundingClientRect().bottom > document.querySelector('.story-copy').getBoundingClientRect().top + 1 }; });
  const stHead = await bp.evaluate(() => { const who = document.querySelector('.story-who-text, .story-who'); const w = who.getBoundingClientRect(); return [...document.querySelectorAll('.story .deck-head button')].map((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left < w.right - 1 && r.right > w.left + 1 && r.top < w.bottom - 1 && r.bottom > w.top + 1; }); });
  check(!stHead.some(Boolean), `historia al 200 %: compartir o la X pisan el subtítulo ${JSON.stringify(stHead)}`);
  check(st200.nextBottom <= st200.vh && !st200.headOverlap, `historia al 200 %: ${JSON.stringify(st200)}`);
  for (let k = 0; k < 6; k++) {
    await bp.keyboard.press('Tab');
    check(await bp.evaluate(() => Boolean(document.activeElement.closest('.story'))), 'el foco sale de la historia con Tab');
  }
  await bp.keyboard.press('Escape');
  await bigText.close();
  // Guía de bienvenida: la primera vez, tres pasos que se saltan con Esc y no vuelven.
  const coachCtx = await rawNewContext({ viewport: { width: 390, height: 844 } });
  const cp = await coachCtx.newPage();
  watch(cp, 'guía');
  await cp.goto(base);
  await writeState(cp, seededState({ upTo: 0 }));
  await cp.goto(`${base}#inicio`);
  await cp.reload();
  await cp.waitForSelector('.coach-card');
  check(await cp.locator('.coach-text').innerText() !== '', 'guía sin texto');
  const coachBox = async () => cp.evaluate(() => { const t = document.querySelector('.coach-ring').getBoundingClientRect(); const c = document.querySelector('.coach-card').getBoundingClientRect(); return { overlap: !(c.bottom <= t.top || c.top >= t.bottom || c.right <= t.left || c.left >= t.right), inside: c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight }; });
  for (let k = 0; k < 3; k++) {
    await cp.waitForTimeout(450);
    const b = await coachBox();
    check(!b.overlap && b.inside, `guía paso ${k + 1}: la tarjeta tapa lo señalado o se sale ${JSON.stringify(b)}`);
    if (k === 0) await shot(cp, '14e-guia');
    if (k < 2) await cp.click('[data-coach="next"]'); else await cp.click('[data-coach="next"]');
    await cp.waitForTimeout(450);
  }
  check(await cp.locator('.coach-card').count() === 0, 'la guía no se cierra al terminar');
  await cp.reload();
  await cp.waitForSelector('.path');
  await cp.waitForTimeout(600);
  check(await cp.locator('.coach-card').count() === 0, 'la guía vuelve a salir');
  await coachCtx.close();
  // Cuadro del día desde la cabecera: abrir, fallar una vez (el nombre se apaga, sale la época), acertar, ver la historia de
  // 3 tarjetas, cerrarla y comprobar la pantalla de hecho y el chip hecho (miniatura con ✓).
  await seed(page, seededState({ upTo: 0 }));
  await page.waitForSelector('.path');
  await page.waitForSelector('.chip-cuadro .chip-cuadro-img');
  await page.locator('.chip-cuadro').click();
  await page.waitForSelector('.cdd-opt');
  check(page.url().endsWith('#cuadro-del-dia'), `el Cuadro del día de la cabecera lleva a ${page.url()}`);
  check(await page.locator('.cdd-opt').count() === 6, 'el Cuadro del día no ofrece 6 pintores');
  await shot(page, '14b-cuadro-paso1');
  await audit(page, '390 cuadro del día');
  await playCuadro(page, 1);
  check(await page.locator('.story .deck-bar').count() === 3, 'la historia del Cuadro del día no lleva 3 tarjetas');
  check(/^Era |\. Era /.test(await page.locator('.story-text').innerText()), 'la primera tarjeta no dice de quién era');
  await shot(page, '14b-cuadro-historia');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.cdd-done');
  check(/A la segunda/.test(await page.locator('.cdd-done .cdd-title').innerText()), 'el hecho no dice «A la segunda»');
  check(/Llevas 1 cuadro del día/.test(await page.locator('.cdd-count').innerText()), 'el hecho no cuenta los cuadros');
  check(await page.locator('.cdd-done [data-action="story"]').count() === 1 && await page.locator('.cdd-done [data-action="meet"]').count() === 1, 'faltan «Ver la historia» o «Conocer…»');
  await audit(page, '390 cuadro del día hecho');
  const cuadroChipDone = await page.locator('.chip-cuadro').evaluate((a) => ({ label: a.getAttribute('aria-label'), done: a.classList.contains('is-done'), ok: Boolean(a.querySelector('.chip-cuadro-ok')), w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height }));
  check(cuadroChipDone.done && cuadroChipDone.ok && cuadroChipDone.label === 'Cuadro del día, hecho: a la segunda', `Cuadro del día hecho en la cabecera: ${JSON.stringify(cuadroChipDone)}`);
  check(cuadroChipDone.w >= 48 && cuadroChipDone.h >= 48, `el Cuadro del día de la cabecera mide ${Math.round(cuadroChipDone.w)}×${Math.round(cuadroChipDone.h)}`);
  await shot(page, '14b-cuadro-hecho');
  // #reto-diario (los enlaces antiguos) lleva al mismo sitio.
  await page.goto(`${base}#reto-diario`);
  await page.waitForSelector('.cdd-done');
  await page.goto(`${base}#inicio`);
  await page.waitForSelector('.path');

  // --- Test de cultura pictórica (app/test/): página indexable; cada partida sortea sus preguntas
  // de la bolsa por tramos, así que la pregunta se lee de la pantalla y la respuesta sale del
  // catálogo (como el jugador omnisciente). Título y Open Graph, cuatro preguntas (el primer bloque
  // lleva las tres mecánicas), «Ver mi resultado» con «n de m», compartir (copia al portapapeles: se
  // anula navigator.share, que en Chrome de escritorio existe y no hace nada en headless) y
  // auditorías de contraste y táctil en claro y oscuro.
  const fixedBank = JSON.parse(readFileSync(new URL('../app/test/preguntas.json', import.meta.url), 'utf8')).questions;
  const catalogText = JSON.parse(readFileSync(new URL('../app/data/catalog-text.json', import.meta.url), 'utf8'));
  // Pistas posibles del feedback: la escrita a mano (preguntas fijas), el «look» de la obra o la del pintor.
  const hintsFor = (q) => [
    fixedBank.find((f) => f.artwork === q.artwork && f.kind === q.kind)?.hint,
    catalogText.look?.[q.artwork],
    catalogText.looks?.[q.artwork]?.[0]?.text,
    artist.get(art.get(q.artwork).artistId).hint,
  ].filter(Boolean);
  for (const scheme of ['light', 'dark']) {
    const L = (s) => `[test ${scheme}] ${s}`;
    const tctx = await browser.newContext({ ...ctxOpts, colorScheme: scheme });
    await tctx.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
    const tp = await tctx.newPage();
    watch(tp, `test-${scheme}`);
    await tp.goto(`${base}test/`);
    await tp.waitForFunction(() => document.fonts.status === 'loaded');
    check(/¿Distinguirías un Velázquez de un Murillo\?/.test(await tp.title()), L(`título «${await tp.title()}»`));
    const meta = await tp.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], link[rel="canonical"]')].map((m) => [m.getAttribute('property') || m.getAttribute('name') || m.getAttribute('rel'), m.getAttribute('content') || m.getAttribute('href')])));
    for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'description', 'canonical']) check(Boolean(meta[k]), L(`falta la meta ${k}`));
    check(/\/test\/portada\.jpg$/.test(meta['og:image'] || ''), L(`og:image ${meta['og:image']}`));
    const cover = await tp.request.get(`${base}test/portada.jpg`);
    check(cover.ok() && (await cover.body()).length <= 150 * 1024, L('portada.jpg no se sirve o pesa más de 150 KB'));
    check(/o a las 40 preguntas/.test(await tp.locator('.test-home').innerText()), L('la portada no dice cuántas preguntas'));
    await audit(tp, L('portada'));
    if (scheme === 'light') await shot(tp, '15-test-portada');
    await tp.click('[data-action="start"]');
    await tp.waitForSelector('.lesson-stage .option');
    // «Atrás» (gesto de Android o botón del navegador) a mitad de test pide confirmación y no sale; «Seguir jugando» vuelve.
    await tp.evaluate(() => history.back());
    await tp.waitForSelector('#test-leave:not([hidden])');
    check(await tp.locator('.lesson-stage .option').count() > 0 && new URL(tp.url()).pathname.endsWith('/test/'), L('«atrás» saca del test sin preguntar'));
    await tp.locator('#test-leave [data-action="leave-stay"]').tap();
    await tp.waitForSelector('#test-leave', { state: 'hidden' });
    // La pregunta en pantalla: mecánica, opciones y, del catálogo, la respuesta.
    const questionOnScreen = async () => {
      const kind = await tp.locator('.lesson-stage').getAttribute('data-type');
      const options = await tp.$$eval('.lesson-stage .option', (els) => els.map((e) => e.dataset.id));
      if (kind === 'which') {
        const short = (await tp.locator('.q-prompt').innerText()).replace(/^¿Cuál es de /, '').replace(/\?$/, '').trim();
        const answer = options.find((id) => { const a = artist.get(art.get(id)?.artistId); return a && (a.short || a.name) === short; });
        return answer ? { kind, options, answer, artwork: answer } : null;
      }
      const id = await tp.locator('.q-art .art').getAttribute('data-art');
      const a = art.get(id) && artist.get(art.get(id).artistId);
      if (!a) return null;
      const answer = kind === 'movement' ? a.movementId : a.id;
      return options.includes(answer) ? { kind, options, answer, artwork: id } : null;
    };
    // Cuatro preguntas (la primera se falla a propósito). Las de cuadro grande se abren en el visor
    // sin responder; la «¿Cuál es de X?» se responde desde el visor con «Es este» (tocar la miniatura
    // no responde).
    const kindsSeen = new Set();
    for (let i = 0; i < 4; i++) {
      const q = await questionOnScreen();
      check(Boolean(q), L(`pregunta ${i + 1}: no se encuentra la respuesta en el catálogo`));
      if (!q) break;
      kindsSeen.add(q.kind);
      const number = (await tp.locator('.q-tag').textContent()).trim();
      check(number === `Pregunta ${i + 1}`, L(`numeración «${number}»`));
      if (q.kind === 'movement') {
        const texts = await tp.$$eval('.lesson-stage .option .opt-sub', (els) => els.map((e) => e.textContent.trim()));
        check(texts.length === 4 && texts.every(Boolean), L('las opciones de movimiento no llevan periodo'));
      }
      await tp.waitForSelector('.lesson-stage .art.is-loaded');
      if (i === 0) await audit(tp, L('pregunta'));
      if (i === 0 && scheme === 'light') await shot(tp, '15-test-pregunta');
      // Primera a propósito mal, el resto bien: así se ven los dos feedbacks.
      const pick = i === 0 ? q.options.find((o) => o !== q.answer) : q.answer;
      if (q.kind === 'which') {
        check(await tp.locator('.option-art .marco').count() === 4 && await tp.locator('.option-art .zoom-badge').count() === 0, L('las miniaturas van en marco y sin marca de ampliar'));
        // Tocar una miniatura abre el visor (sin responder y sin revelar nada); cerrar no responde.
        const pos = q.options.indexOf(pick);
        await tp.locator('.option-art').nth((pos + 1) % 4).tap();
        await tp.waitForSelector('.viewer[open]');
        check(await tp.locator('.feedback.is-open').count() === 0, L('tocar una miniatura responde'));
        const leaks = await viewerLeaks(tp, forbiddenFor(q.options, art.get(q.answer).artistId));
        check(!leaks.length, L(`el visor revela ${leaks.join(', ')}`));
        await tp.keyboard.press('Escape');
        await tp.waitForSelector('.viewer', { state: 'detached' });
        check(await tp.locator('.feedback.is-open').count() === 0 && await tp.locator('.lesson-stage .option.is-done').count() === 0, L('cerrar el visor responde'));
        await answerWhichInViewer(tp, pos, { navigate: true, label: 'test' });
      } else {
        // El cuadro de la pregunta se abre en grande sin responder ni revelar nada.
        await tp.locator('.q-art [data-action="zoom"]').tap();
        await tp.waitForSelector('.viewer[open]');
        check(await tp.locator('.feedback.is-open').count() === 0, L('tocar el cuadro responde'));
        const leaks = await viewerLeaks(tp, forbiddenFor([q.artwork], null, true));
        check(!leaks.length, L(`el visor de la pregunta revela ${leaks.join(', ')}`));
        if (i === 0) await audit(tp, L('visor de la pregunta'));
        await tp.locator('.viewer [data-v="close"]').tap();
        await tp.waitForSelector('.viewer', { state: 'detached' });
        await tp.locator(`.lesson-stage .option[data-id="${pick}"]`).tap();
      }
      await tp.waitForSelector('.feedback.is-open');
      await tp.waitForTimeout(400);
      const fb = await tp.locator('.feedback').innerText();
      check(i === 0 ? /Esta vez no/.test(fb) && /Era /.test(fb) : /¡Eso es!/.test(fb), L(`feedback ${i + 1}: «${fb.replace(/\s+/g, ' ').slice(0, 60)}»`));
      const line = (await tp.locator('.feedback .fb-line').innerText()).trim();
      check(line && hintsFor(q).some((h) => h.trim() === line), L(`feedback ${i + 1}: pista «${line}» que no es de la obra ni del pintor`));
      await assertAnswersVisible(tp, L(`feedback ${i + 1}`));
      if (i === 0) await audit(tp, L('feedback'));
      if (q.kind === 'which') {
        // Respondida: la miniatura sigue abriendo el visor, ya con su ficha.
        await tp.locator('.option-art.is-correct').tap();
        await tp.waitForSelector('.viewer[open]');
        const w = art.get(q.answer);
        check((await tp.locator('.viewer').innerText()).includes(w.title), L('tras responder, el visor no muestra la ficha'));
        await tp.keyboard.press('Escape');
        await tp.waitForSelector('.viewer', { state: 'detached' });
      }
      await tp.locator('.feedback [data-action="continue"]').tap();
      await tp.waitForTimeout(200);
    }
    check(kindsSeen.size === 3, L(`el primer bloque no lleva las tres mecánicas: ${[...kindsSeen].join(', ')}`));
    await tp.locator('.test-finish').tap();
    await tp.waitForSelector('.test-result');
    await tp.waitForTimeout(500);
    const rt = await tp.locator('.test-result').innerText();
    check(/Has acertado 3 de 4/.test(rt), L(`resultado sin «n de 4»: «${rt.replace(/\s+/g, ' ').slice(0, 80)}»`));
    check(/\d+ %\s*de la gente sabe menos pintura que tú/.test(rt) && /aproximado/.test(rt), L('resultado sin percentil estimado'));
    check(await tp.locator('.test-result a[href="../#inicio"]').count() >= 1, L('falta «Aprende a mirar en Sfumato»'));
    await audit(tp, L('resultado'));
    if (scheme === 'light') await shot(tp, '15-test-resultado', true);
    await tp.locator('[data-action="share"]').tap();
    await tp.waitForTimeout(400);
    const shared = await tp.evaluate(() => navigator.clipboard.readText());
    check(/^Sfumato · (Sé más de pintura que el \d+ % de la gente|He acertado 3 de 4 en el test de pintura)\. ¿Y tú\?\n/.test(shared) && shared.includes(`${base}test/`), L(`texto compartido «${shared}»`));
    check(/Copiado/.test(await tp.locator('.copy-status').innerText()), L('no avisa de que se ha copiado'));
    // El último resultado se recuerda en la portada.
    await tp.goto(`${base}test/`);
    await tp.waitForSelector('.test-last:not([hidden])');
    check(/La última vez: 3 de 4/.test(await tp.locator('.test-last').innerText()), L('la portada no recuerda el último resultado'));
    // Las vistas (las 4 respondidas y la 5.ª, que llegó a salir) quedan en el historial, que evita el
    // sorteo siguiente: otra partida empieza distinta.
    const recent = await tp.evaluate(() => JSON.parse(localStorage.getItem('mirada.test.recent') || '[]'));
    check(Array.isArray(recent) && recent.length === 1 && recent[0].length === 5, L(`historial de vistas ${JSON.stringify(recent)}`));
    await tp.click('[data-action="start"]');
    await tp.waitForSelector('.lesson-stage .option');
    const again = await tp.evaluate(() => JSON.parse(localStorage.getItem('mirada.test.recent') || '[]'));
    check(again.length === 2 && !recent[0].includes(again[1][0]), L(`la partida nueva repite la primera pregunta ${JSON.stringify(again)}`));
    await tctx.close();
  }
}
// Del recorrido completo en adelante (no entra en el modo humo).
if (!SMOKE) {
// Retar a un amigo
await page.click('[data-action="share"]');
await page.waitForTimeout(300);
challengeText = await page.evaluate(() => navigator.clipboard.readText());
// La primera ronda cumple la meta del día (50 XP): ficha «Meta · Cumplida», sin siguiente etapa (la enseña el mapa) ni
// otras llamadas a seguir jugando. Se sigue por el enlace de la etapa.
const second = index.steps[1];
check(await page.locator('[data-chip="goal"]').count() === 1, 'el cierre del día no dice que la meta está cumplida');
check(!/Siguiente etapa|La próxima vez/.test(await page.locator('.res').innerText()), 'el cierre del día lleva la siguiente etapa');
check(!/Repetir|Repasar|Sigue:/.test(await page.locator('.res-foot').innerText()), 'el cierre del día lleva llamadas a seguir jugando');
check(/Por hoy, hecho/.test(await page.locator('.res-title').innerText()), 'el cierre del día no dice «Por hoy, hecho»');
await page.goto(`${base}#${second.type === 'sala' ? 'sala' : 'etapa'}-${second.id}`);
await page.waitForSelector('.learn, .intro, .story[open]');
check(page.url().endsWith(`#${second.type === 'sala' ? 'sala' : 'etapa'}-${second.id}`), `la tarjeta lleva a ${page.url()}`);
await toLearn(page);
await page.click('[data-action="practice"]');
await playRound(page);
// Volver atrás desde el resultado vuelve al camino (no se queda colgado).
await page.goBack();
await page.waitForSelector('.path');

// Cuadro del día (fallando dos veces) y su texto para compartir
await page.click('.chip-cuadro');
await page.waitForSelector('.cdd-opt');
await playCuadro(page, 2);
await page.keyboard.press('Escape');
await page.waitForSelector('.cdd-done');
await shot(page, '15-cuadro-del-dia-fin', true);
await page.evaluate(() => { navigator.share = undefined; });
await page.click('[data-action="share"]');
await page.waitForTimeout(300);
dailyText = await page.evaluate(() => navigator.clipboard.readText());
check(/^Sfumato · Cuadro del día \d+\n🖼️ 🟥🟥🟩⬛\nhttp/.test(dailyText), `texto del Cuadro del día «${dailyText}»`);
await page.goto(`${base}#inicio`);
await page.waitForSelector('.path');
await shot(page, '16-mapa-tras-jugar');

// Colección y ficha
await page.click('.nav-item[href="#coleccion"]');
await page.waitForSelector('.cx-works .art-zoom');
await page.locator('.cx-works .art-zoom').first().click();
await page.waitForSelector('.viewer[open]');
await shot(page, '17-ficha');
await audit(page, '390 visor desde la colección');
await page.keyboard.press('Escape');
await page.waitForSelector('.viewer', { state: 'detached' });

// Perfil: meta diaria ajustable, medallas con icono, reinicio con borde
await page.click('.nav-item[href="#perfil"]');
await page.waitForSelector('.pf-hero');
await shot(page, '18-perfil', true);
await audit(page, '390 perfil');
check((await page.locator('.pf-rank-name').innerText()).length > 0 && (await page.locator('.pf-layout').innerText()).includes('Logros'), 'perfil sin rango ni logros');
await page.click('[data-action="open-settings"]');
await page.waitForSelector('.settings-dialog[open]');
const range = await page.locator('[data-setting="volume"]').boundingBox();
check(range.height >= 48, `deslizador de volumen de ${Math.round(range.height)} px`);
await page.click('[data-action="goal"][data-goal="100"]');
check((await page.locator('.chip-streak').getAttribute('aria-label')).includes('de 100 puntos'), 'la cabecera no refleja la nueva meta');
check(await page.evaluate(() => JSON.parse(localStorage.getItem('mirada.state')).settings.dailyGoal) === 100, 'meta no persistida');
check(await page.locator('.pf-medal.is-got .medal-art img').count() >= 1, 'medalla de pintor sin miniatura');
await page.goto(`${base}#coleccion`);
await page.waitForSelector('.cx-works');
await page.waitForTimeout(500);
await shot(page, '17b-coleccion');
await audit(page, '390 coleccion');
// «Empezar de cero» vive en la sección «Superusuario» de Ajustes: se entra en el modo para medirlo.
await page.evaluate(() => localStorage.setItem('sfumato.su', '1'));
await page.goto(`${base}#perfil`);
await page.waitForSelector('.pf-hero');
await page.click('[data-action="open-settings"]');
await page.waitForSelector('.settings-dialog[open]');
for (const sw of await page.$$eval('.switch', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }))) {
  check(sw[0] >= 48 && sw[1] >= 48, `interruptor de ${sw.map(Math.round).join('×')}`);
}
const resetBox = await page.locator('[data-action="ask-reset"]').boundingBox();
check(resetBox.height >= 48, 'botón de reinicio < 48 px');
await page.locator('[data-setting="reducedMotion"]').check();
check(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'reducir animaciones no aplica la clase');
await page.locator('[data-setting="reducedMotion"]').uncheck();
// Tema: tres opciones de 48 px; con el móvil en oscuro, «Claro» fuerza el claro (también en la barra del
// navegador), se guarda y sobrevive a la recarga; «Como el móvil» vuelve al sistema.
check(await page.locator('[data-action="theme"]').count() === 3, 'selector de tema sin tres opciones');
for (const h of await page.$$eval('[data-action="theme"]', (els) => els.map((e) => e.getBoundingClientRect().height))) check(h >= 48, `opción de tema de ${Math.round(h)} px`);
await page.emulateMedia({ colorScheme: 'dark' });
const bgDark = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
await page.click('[data-action="theme"][data-value="light"]');
const themeInfo = await page.evaluate(() => ({
  attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  meta: [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content')),
  saved: JSON.parse(localStorage.getItem('mirada.state')).settings.theme, pressed: document.querySelector('[data-action="theme"][aria-pressed="true"]')?.dataset.value,
}));
check(themeInfo.attr === 'light' && themeInfo.saved === 'light' && themeInfo.pressed === 'light', `tema claro forzado: ${JSON.stringify(themeInfo)}`);
check(themeInfo.bg !== bgDark && themeInfo.meta.every((c) => c === themeInfo.bg), `con el móvil en oscuro, «Claro» no fuerza el claro o la barra del navegador: ${JSON.stringify(themeInfo)}`);
await shot(page, '18b-perfil-claro-forzado');
await audit(page, '390 perfil claro forzado');
await page.reload();
await page.waitForSelector('.pf-hero');
check(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', 'el tema forzado no sobrevive a la recarga');
await page.click('[data-action="open-settings"]');
await page.waitForSelector('.settings-dialog[open]');
await page.click('[data-action="theme"][data-value="system"]');
const backToSystem = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() }));
check(backToSystem.attr === null && backToSystem.bg === bgDark, `«Como el móvil» no vuelve al tema del sistema: ${JSON.stringify(backToSystem)}`);
await page.emulateMedia({ colorScheme: 'light' });
// Perfil nuevo: nombre editable (se guarda solo en el navegador), objetivos táctiles y enlaces.
await page.keyboard.press('Escape');
for (const sel of ['.pf-gear', '.pf-name-btn', '.pf-practice a[href="test/"]', '.pf-rank-head', '.pf-stat', '.pf-medals-sec .pf-link']) {
  const b = await page.locator(sel).first().boundingBox();
  check(b && b.height >= 48 && b.width >= 48, `${sel} < 48 px`);
}
check(await page.locator('.pf-practice a.pf-go[href="test/"]').count() === 1, '«Test de pintura» no lleva a test/');
await page.click('[data-action="edit-name"]');
await page.fill('.name-dialog .pf-input', 'María Medina Cañete con un nombre larguísimo');
await page.click('.name-dialog button[type="submit"]');
const savedName = await page.evaluate(() => JSON.parse(localStorage.getItem('mirada.state')).settings.name);
check(savedName.length <= 24 && savedName.startsWith('María'), `nombre guardado: «${savedName}»`);
check((await page.locator('.pf-greeting').innerText()).includes('Hola, María'), 'el saludo no usa el nombre');
check((await page.locator('.pf-initial').innerText()) === 'M', 'el avatar no muestra la inicial');
await noHorizontalScroll(page, 'perfil con nombre largo');
// Perfil: cabecera sin portada (avatar, saludo y engranaje en una fila), hoja del avatar, texto al 200 % y móvil apaisado.
{
  const collection = Object.fromEntries(index.path.slice(0, 4).flatMap((a) => index.learnWorks(a.id)).map((w) => [w.id, '2026-11-20']));
  const st = seededState({ upTo: 3, extra: { collection } });
  st.settings.name = 'Maximiliana Wolfgangette';
  const pctx = await browser.newContext(ctxOpts);
  const pp = await pctx.newPage();
  await seed(pp, st, 'perfil');
  await pp.waitForSelector('.pf-avatar-btn');
  const row = await pp.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const av = r('.pf-avatar'); const gear = r('.pf-gear'); const name = r('.pf-name-btn');
    return { cover: document.querySelectorAll('.pf-cover, .pf-look').length, gearRight: gear.left > name.left, sameRow: Math.abs((gear.top + gear.bottom) / 2 - (av.top + av.bottom) / 2) < 12 };
  });
  check(row.cover === 0 && row.gearRight && row.sameRow, `cabecera del perfil: ${JSON.stringify(row)}`);
  await pp.click('.pf-avatar-btn');
  await pp.waitForSelector('.look-dialog[open]');
  check(await pp.locator('.look-dialog [role="tab"]').count() === 0, 'la hoja del avatar aún tiene pestañas');
  await pp.locator('.look-dialog .pf-pick').first().click();
  check(await pp.evaluate(() => Boolean(JSON.parse(localStorage.getItem('mirada.state')).settings.avatar)), 'elegir un cuadro no guarda el avatar');
  check(await pp.locator('.pf-avatar.has-art').count() === 1, 'el avatar elegido no se ve en la cabecera');
  await pp.keyboard.press('Escape');
  await pp.waitForTimeout(450);
  // Texto al 200 %: el nombre se ve entero (sin recorte ni puntos suspensivos) y sin desplazamiento horizontal.
  await pp.addStyleTag({ content: 'html{font-size:200%}' });
  await pp.waitForTimeout(300);
  const clip = await pp.evaluate(() => {
    const t = document.querySelector('.pf-name-text');
    const cs = getComputedStyle(t);
    return { w: t.scrollWidth - t.clientWidth, h: t.scrollHeight - t.clientHeight, ellipsis: cs.textOverflow === 'ellipsis', clamp: cs.webkitLineClamp !== 'none', boxW: Math.round(t.getBoundingClientRect().width), text: t.textContent };
  });
  check(clip.w <= 1 && clip.h <= 1 && !clip.ellipsis && !clip.clamp && clip.boxW >= 150, `al 200 % el nombre se recorta: ${JSON.stringify(clip)}`);
  await noHorizontalScroll(pp, 'perfil al 200 %');
  await pp.click('.pf-avatar-btn');
  await pp.waitForSelector('.look-dialog[open]');
  const look200 = await pp.evaluate(() => ({ reset: document.querySelector('[data-action="look-reset"]').getBoundingClientRect().bottom, vh: innerHeight, inner: document.querySelector('.look-panel').scrollHeight - document.querySelector('.look-panel').clientHeight }));
  check(look200.reset <= look200.vh + 1 && look200.inner <= 1, `hoja del avatar al 200 %: botón fuera de vista o segundo scroll ${JSON.stringify(look200)}`);
  await pp.keyboard.press('Escape');
  await pctx.close();
  // Móvil apaisado: el avatar no se come la pantalla.
  const lctx = await browser.newContext({ ...ctxOpts, viewport: { width: 844, height: 390 } });
  const lp = await lctx.newPage();
  await seed(lp, st, 'perfil');
  await lp.waitForSelector('.pf-hero');
  const land = await lp.evaluate(() => Math.round(document.querySelector('.pf-avatar').getBoundingClientRect().width));
  check(land <= 64, `perfil apaisado con avatar de ${land} px`);
  await lp.click('.pf-avatar-btn');
  await lp.waitForSelector('.look-dialog[open]');
  const landLook = await lp.evaluate(() => ({ reset: document.querySelector('[data-action="look-reset"]').getBoundingClientRect().bottom, vh: innerHeight, cols: getComputedStyle(document.querySelector('.look-grid')).gridTemplateColumns.split(' ').length }));
  check(landLook.reset <= landLook.vh + 1 && landLook.cols >= 5, `hoja del avatar apaisada: ${JSON.stringify(landLook)}`);
  await lctx.close();
  // Tableta: dos columnas desde 720 px.
  const tctx = await browser.newContext({ ...ctxOpts, viewport: { width: 768, height: 1024 } });
  const tp = await tctx.newPage();
  await seed(tp, st, 'perfil');
  await tp.waitForSelector('.pf-hero');
  check(await tp.evaluate(() => getComputedStyle(document.querySelector('.pf-layout')).gridTemplateColumns.split(' ').length) === 2, 'perfil en tableta sin dos columnas');
  await noHorizontalScroll(tp, 'perfil en tableta');
  await tctx.close();
}
await page.goto(`${base}#logros`);
await page.waitForSelector('.pf-logros');
await page.waitForTimeout(400);
check(await page.locator('.pf-medal.is-got .medal-thumb img').count() >= 1, 'medalla sin miniatura del atlas');
await shot(page, '19-medallas');

// ---------------------------------------------------------------- Reto de etapa sin conocer al pintor
const url = challengeText.split('\n').pop();
const friend = await browser.newContext(ctxOpts);
const fpage = await friend.newPage();
watch(fpage, 'amigo');
await fpage.goto(url);
await fpage.waitForSelector('[data-action="accept"]');
await shot(fpage, '20-reto-amigo');
await audit(fpage, '390 reto amigo');
await fpage.click('[data-action="accept"]');
await fpage.waitForSelector('.look-first');
check(/Fíjate|Mira/i.test(await fpage.locator('.look-first .hint').innerText()), 'la pantalla previa no enseña el rasgo');
await shot(fpage, '21-reto-fijate');
await playRound(fpage, { wrongAt: [0] });
await shot(fpage, '22-reto-amigo-fin', true);

// ---------------------------------------------------------------- Movimiento completo: sello y medalla que se estampa
const mov = index.visibleMovements.find((m) => !index.isSala(m.id) && index.stageArtists(m.id).length >= 2);
const lastOfMov = index.stepsOf(mov.id).at(-1);
const sealCtx = await browser.newContext(ctxOpts);
const spage = await sealCtx.newPage();
watch(spage, 'sello');
await seed(spage, seededState({ upTo: index.steps.indexOf(lastOfMov) }), `etapa-${lastOfMov.id}`);
await spage.waitForSelector('.learn');
await spage.click('[data-action="practice"]');
await playRound(spage);
await spage.waitForTimeout(1600);
await shot(spage, '23-sello-movimiento');
check(await spage.locator('.res-medal .medal-lg').count() === 1, 'no se estampa la medalla');
check(/Completo/.test(await spage.locator('.res-kicker').innerText()), 'no se dice que el movimiento está completo');
await spage.click('[data-action="done"]');
await spage.waitForSelector('.path');
check(await spage.locator('.movement.is-sealed').count() >= 1, 'el mapa no muestra el sello');
await spage.locator('.movement.is-sealed').first().scrollIntoViewIfNeeded();
await shot(spage, '24-mapa-sello');

// ---------------------------------------------------------------- Sala (si el catálogo tiene alguna)
const sala = index.steps.find((s) => s.type === 'sala');
if (sala) {
  await seed(spage, seededState({ upTo: index.steps.indexOf(sala) }), `sala-${sala.id}`);
  await toLearn(spage);
  await spage.waitForSelector('.learn');
  await shot(spage, '25-sala-conoce');
  await spage.click('[data-action="practice"]');
  await playRound(spage, { wrongAt: [2] });
  await shot(spage, '26-sala-fin', true);
} else notes.push('El catálogo actual no tiene salas: se prueban en los tests con un catálogo sintético.');

// ---------------------------------------------------------------- Camino jugado pero sin dominar: no hay «Camino completo»
const halfCtx = await browser.newContext(ctxOpts);
const hpage = await halfCtx.newPage();
watch(hpage, 'por-dominar');
{
  const st = seededState({ upTo: index.steps.length, xp: 9000 });
  const pend = [index.path[14], index.path[27]];
  for (const a of pend) { st.progress.artists[a.id] = { plays: 1, best: 0.57, mastered: false, last: '2026-11-20' }; delete st.progress.medals[`artist-${a.id}`]; }
  await seed(hpage, st);
  await hpage.waitForSelector('.path');
  check(await hpage.locator('[data-action="free"]').count() === 0, 'ronda libre sin tener todo dominado');
  check(!/Camino completo/.test(await hpage.locator('#main').innerText()), '«Camino completo» con paradas por repasar');
  const fin = hpage.locator('.finale');
  check(/Te quedan 2 paradas/.test(await fin.innerText()), `final sin cuántas quedan: ${await fin.innerText()}`);
  check(await fin.locator(`[data-action="stage"][data-id="${pend[0].id}"]`).count() === 1, 'el final no lleva al primero por repasar');
  await fin.scrollIntoViewIfNeeded();
  await shot(hpage, '27a-por-dominar');
  await fin.locator('[data-action="stage"]').click();
  await hpage.waitForSelector('.learn, .intro');
  check(hpage.url().endsWith(`#etapa-${pend[0].id}`), `«Repasar» lleva a ${hpage.url()}`);
  await hpage.goto(`${base}#ronda-libre`);
  await hpage.waitForSelector('#toast.is-on');
  await hpage.waitForSelector('.path');
  check(hpage.url().endsWith('#inicio'), 'la ronda libre se abre sin tener todo dominado');
}

// ---------------------------------------------------------------- Camino dominado: ronda libre, reto semanal, detalle del día y salas
const doneCtx = await browser.newContext(ctxOpts);
const dpage0 = await doneCtx.newPage();
watch(dpage0, 'completo');
const allWorks = index.path.flatMap((a) => index.worksOf(a.id));
const doneExtra = {
  collection: Object.fromEntries(allWorks.map((w) => [w.id, '2026-11-20'])),
  srs: Object.fromEntries(allWorks.map((w, i) => [`art:${w.id}`, { box: 2 + (i % 3), due: '2026-12-30' }])),
};
const expectRecognized = allWorks.filter((w, i) => 2 + (i % 3) >= 3).length;
await seed(dpage0, seededState({ upTo: index.steps.length, xp: 9800, extra: doneExtra }));
await dpage0.waitForSelector('.path');
await shot(dpage0, '27-camino-completo');
await audit(dpage0, '390 camino completo');
check(await dpage0.locator('[data-action="free"]').count() >= 1, 'camino completo sin ronda libre');
await dpage0.locator('.finale').scrollIntoViewIfNeeded();
check((await dpage0.locator('.finale-count').innerText()).includes(String(allWorks.length)), `contador de cuadros vistos: ${await dpage0.locator('.finale-count').innerText()} (esperado ${allWorks.length})`);
await shot(dpage0, '28-final-camino');
await dpage0.evaluate(() => window.scrollTo(0, 0));
// Camino avanzado: sin franja «Hoy» ni lupa; el mapa asoma en la primera pantalla.
check(await dpage0.locator('.today-strip').count() === 0, 'queda la franja «Hoy»');
const mapTop = await dpage0.evaluate(() => {
  const nav = document.querySelector('.bottomnav');
  const navTop = nav ? nav.getBoundingClientRect().top : innerHeight;
  return { top: document.querySelector('.path').getBoundingClientRect().top, limit: Math.min(innerHeight, navTop) };
});
check(mapTop.top < mapTop.limit - 40, `el mapa no asoma en la primera pantalla (${Math.round(mapTop.top)} de ${Math.round(mapTop.limit)})`);
// Sala de un movimiento dominado: desde el mapa y desde Colección.
const galleryRow = dpage0.locator('.stage-gallery').first();
check(await dpage0.locator('.stage-gallery').count() === index.visibleMovements.length, 'faltan salas en el mapa');
await galleryRow.scrollIntoViewIfNeeded();
await galleryRow.click();
await dpage0.waitForSelector('.gallery');
check(await dpage0.locator('.gallery-item').count() >= 3, 'sala casi vacía');
await dpage0.waitForTimeout(700);
await shot(dpage0, '29a-sala');
await audit(dpage0, '390 sala');
await shot(dpage0, '29b-sala-completa', true);
await dpage0.locator('.gallery-back').click();
await dpage0.waitForSelector('.path');
await dpage0.click('.nav-item[href="#coleccion"]');
await dpage0.waitForSelector('.sala-chip');
check(await dpage0.locator('.sala-chip').count() === index.visibleMovements.length, 'faltan salas en Colección');
await shot(dpage0, '29c-coleccion-salas');
await dpage0.locator('.sala-chip').nth(2).click();
await dpage0.waitForSelector('.gallery');
await dpage0.locator('.lesson-bar [data-action="leave"]').click();
await dpage0.waitForSelector('.sala-chip');
check(dpage0.url().endsWith('#coleccion'), `«Volver» de la sala abierta desde Colección lleva a ${dpage0.url()}`);
await dpage0.goto(`${base}#galeria-nope`);
await dpage0.waitForSelector('#toast.is-on');
// Reto semanal: 15 preguntas, compartible y una vez por semana.
await dpage0.goto(`${base}#inicio`);
await dpage0.waitForSelector('.finale [data-action="weekly"]');
await dpage0.locator('.finale [data-action="weekly"]').click();
const wSteps = await playRound(dpage0, { wrongAt: [2, 9] });
check(wSteps === 17, `el reto semanal tiene ${wSteps} pasos (15 + 2 repeticiones)`);
check(await dpage0.locator('.grid-row .sq').count() === 15, 'el reto semanal no muestra 15 casillas');
await shot(dpage0, '29d-reto-semanal-fin', true);
await audit(dpage0, '390 reto semanal fin');
await dpage0.click('[data-action="share"]');
await dpage0.waitForTimeout(300);
const weeklyText = await dpage0.evaluate(() => navigator.clipboard.readText());
const weekNow = await dpage0.evaluate(() => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date());
});
check(weeklyText.includes(`#reto-${isoWeek(weekNow).compact}-13`) && weeklyText.includes('Reto semanal'), `texto del reto semanal: ${weeklyText}`);
await dpage0.click('[data-action="done"]');
await dpage0.waitForSelector('.path');
check(JSON.parse(await dpage0.evaluate(() => JSON.stringify(Object.values(JSON.parse(localStorage.getItem('mirada.state')).progress.weekly))))[0]?.score === 13, 'el reto semanal no guarda su resultado');
await dpage0.goto(`${base}#reto-semanal`);
await dpage0.waitForSelector('.result-title');
check(/Hecho esta semana/.test(await dpage0.locator('.result-title').innerText()), 'el reto semanal se puede repetir');
// Un amigo abre el enlace del semanal.
const wFriend = await browser.newContext(ctxOpts);
const wf = await wFriend.newPage();
watch(wf, 'amigo-semanal');
await wf.goto(weeklyText.split('\n').pop());
await wf.waitForSelector('[data-action="accept"]');
check(/13 de 15/.test(await wf.locator('h1').innerText()), 'el enlace semanal no muestra la puntuación');
await wf.click('[data-action="accept"]');
check(await playRound(wf) === 15, 'el amigo no juega las 15');
await wFriend.close();
// Ronda libre.
await dpage0.goto(`${base}#inicio`);
await dpage0.waitForSelector('.finale [data-action="free"]');
await dpage0.locator('.finale [data-action="free"]').click();
await playRound(dpage0);
await shot(dpage0, '29-ronda-libre-fin', true);
check(await dpage0.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'el resultado de la ronda libre se desplaza');
await dpage0.goto(`${base}#perfil`);
await dpage0.waitForSelector('.pf-hero');
check(await dpage0.locator('.pf-stats .pf-stat').count() === 4 && !/Mi museo/i.test(await dpage0.locator('.pf-layout').innerText()), 'el perfil sin sus cuatro cifras (o con el museo)');

// ---------------------------------------------------------------- Ojo de… (todas las obras de un pintor en la caja más alta)
const eyeCtx = await browser.newContext(ctxOpts);
const epage = await eyeCtx.newPage();
watch(epage, 'ojo');
{
  const who = index.path[2];
  const works = index.worksOf(who.id).filter((w) => !w.spoiler && !w.attributed);
  const srsEye = Object.fromEntries(works.map((w, i) => [`art:${w.id}`, i === 0 ? { box: 3, due: '2026-11-01' } : { box: i % 2 ? 4 : 5, due: '2027-01-30' }]));
  await seed(epage, seededState({ upTo: 8, extra: { srs: srsEye } }));
  // Con pintores dominados y un cuadro vencido, el repaso (botón ↻) lo trae.
  await epage.goto(`${base}#repaso`);
  await epage.click('.review-intro [data-action="start"]');
  await playRound(epage);
  await epage.waitForTimeout(900);
  const eyeCard = epage.locator(`[data-chip="medal-eye-${who.id}"]`);
  if (await epage.locator('[data-chips="more"]').count()) await epage.click('[data-chips="more"]');
  check(await eyeCard.count() === 1, `no se gana «Ojo de ${who.short || who.name}»`);
  await shot(epage, '29e-ojo-de', true);
  await eyeCard.click();
  await epage.waitForSelector('.pf-logros');
  check(await epage.locator('.pf-medal.is-got .medal-eye').count() === 1, 'la medalla «Ojo de…» no está en el perfil');
}

// ---------------------------------------------------------------- Ronda retomada tras recargar
const resCtx = await browser.newContext(ctxOpts);
const qpage = await resCtx.newPage();
watch(qpage, 'retomar');
const first = index.steps[0];
await seed(qpage, seededState({ upTo: 1 }), `etapa-${first.id}`);
await qpage.waitForSelector('.learn');
await qpage.click('[data-action="practice"]');
await playRound(qpage, { stopAfter: 2 });
const before = await qpage.locator('.progress').getAttribute('aria-valuenow');
await qpage.reload();
await qpage.waitForSelector('.lesson .option, .lesson .interlude');
check(before === await qpage.locator('.progress').getAttribute('aria-valuenow'), 'al recargar cambia el progreso');
await qpage.evaluate(() => { location.hash = 'inicio'; });
await qpage.waitForSelector('.path, .lesson');
if (await qpage.locator('.lesson').count()) {
  await qpage.click('[data-action="quit"]');
  await qpage.click('[data-action="stay"]');
}

// ---------------------------------------------------------------- 360×640
const small = await browser.newContext({ ...ctxOpts, viewport: { width: 360, height: 640 }, hasTouch: true });
const mpage = await small.newPage();
watch(mpage, '360');
// Segunda etapa: tiene «¿Quién lo pintó?» con repaso; se falla a propósito para ver la roja y la verde.
const second360 = index.steps[1];
await seed(mpage, seededState({ upTo: 1 }));
await mpage.waitForSelector('.path');
await shot(mpage, '30-360-mapa');
await audit(mpage, '360 mapa');
await mpage.goto(`${base}#etapa-${second360.id}`);
await mpage.waitForSelector('.learn');
await mpage.waitForTimeout(400);
await assertPracticeVisible(mpage, '360');
await assertLearnLayout(mpage, '360 conoce');
await shot(mpage, '30b-360-conoce');
await audit(mpage, '360 conoce');
await mpage.click('[data-action="practice"]');
let shot360 = false;
await playRound(mpage, {
  wrongAt: [0, 1, 2, 3],
  checkReveal: '360',
  onStep: async ({ wrong, type }) => {
    if (wrong && !shot360) {
      shot360 = true;
      const barBox = await mpage.locator('.lesson-bar .progress').boundingBox();
      check(barBox && barBox.y >= 0 && barBox.y < 60, `barra de ronda fuera de la vista a 360×640 (${barBox && barBox.y})`);
      await shot(mpage, `31-360-fallo-${type}`);
    }
  },
});
await noHorizontalScroll(mpage, '360 resultado');
// Con menos de la mitad no se abre la siguiente: «Repetir» primero y una línea que lo explica.
check(await mpage.locator('.res-gate').count() === 1, 'falta el aviso de la mitad de aciertos');
check((await mpage.locator('.res-foot .btn-primary').innerText()).includes('Repetir'), '«Repetir» no es la acción principal');
check(/a la segunda se ve más/.test(await mpage.locator('.res-line').innerText()), 'falta la frase de ánimo con menos de la mitad');
await audit(mpage, '360 resultado bajo');
await shot(mpage, '31b-360-repetir', true);
await mpage.click('[data-action="done"]');
await mpage.waitForSelector('.path');
const third = index.steps[2];
check(await mpage.locator(`.stage[data-id="${third.id}"]`).getAttribute('data-status') === 'locked', 'la etapa siguiente se abre sin mérito');

// ---------------------------------------------------------------- Zoom de texto 200 % (= 195 px de ancho)
for (const mode of ['font', 'viewport']) {
  const zoom = await browser.newContext(mode === 'font' ? ctxOpts : { ...ctxOpts, viewport: { width: 195, height: 422 } });
  const zpage = await zoom.newPage();
  watch(zpage, `zoom-${mode}`);
  if (mode === 'font') await zpage.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '200%'; }));
  await seed(zpage, seededState({ upTo: 9, extra: { collection: { [catalog.artworks[0].id]: '2026-11-20' } } }));
  await zpage.waitForSelector('.path');
  await noHorizontalScroll(zpage, `zoom ${mode} inicio`);
  await shot(zpage, `33-zoom200-${mode}-inicio`);
  const target = index.steps.find((st, i) => i >= 9 && st.type === 'artist');
  await zpage.goto(`${base}#etapa-${target.id}`);
  await toLearn(zpage);
  await zpage.waitForSelector('.learn');
  await assertPracticeVisible(zpage, `zoom ${mode}`);
  await assertLearnLayout(zpage, `zoom ${mode} conoce`, { strict: false });
  await noHorizontalScroll(zpage, `zoom ${mode} conoce`);
  await shot(zpage, `33b-zoom200-${mode}-conoce`);
  await zpage.click('[data-action="practice"]');
  await zpage.waitForSelector('.lesson .option');
  await zpage.waitForTimeout(500);
  await noHorizontalScroll(zpage, `zoom ${mode} pregunta`);
  await shot(zpage, `34-zoom200-${mode}-pregunta`);
  if (mode === 'font') {
    await zpage.keyboard.press('Escape');
    await zpage.waitForSelector('.quit-sheet:not([hidden])');
    await zpage.waitForTimeout(600);
    const sheet = await zpage.$eval('.quit-sheet', (sh) => {
      const r = sh.getBoundingClientRect();
      const h = sh.querySelector('h2').getBoundingClientRect();
      const btns = [...sh.querySelectorAll('.btn')].map((b) => b.getBoundingClientRect());
      return { overflowX: sh.scrollWidth > sh.clientWidth + 1, titleOut: h.right > r.right + 1, btnOut: btns.some((b) => b.right > r.right + 1 || b.bottom > window.innerHeight + 1) };
    });
    check(!sheet.overflowX && !sheet.titleOut && !sheet.btnOut, `hoja de salir recortada al 200 %: ${JSON.stringify(sheet)}`);
    await zpage.click('[data-action="stay"]');
  }
  let zshot = false;
  await playRound(zpage, {
    wrongAt: [0, 1, 3],
    checkReveal: `zoom ${mode}`,
    checkLook: mode === 'viewport' ? 'zoom 195 px' : null,
    onStep: async ({ wrong }) => { if (wrong && !zshot) { zshot = true; await shot(zpage, `34b-zoom200-${mode}-fallo`); } },
  });
  await zpage.waitForTimeout(800);
  await noHorizontalScroll(zpage, `zoom ${mode} resultado`);
  await shot(zpage, `35-zoom200-${mode}-resultado`, true);
  await zpage.goto(`${base}#perfil`);
  await zpage.waitForSelector('.pf-hero');
  await noHorizontalScroll(zpage, `zoom ${mode} perfil`);
  await shot(zpage, `36-zoom200-${mode}-perfil`, true);
  await zoom.close();
}

// ---------------------------------------------------------------- Enlaces que no valen
// Aviso visible y en una región viva (role="status", aria-live) en todos los casos: abriendo el
// enlace en una pestaña nueva, desde dentro de la app y si la página se recarga justo después.
const badCtx = await browser.newContext(ctxOpts);
const bpage = await badCtx.newPage();
watch(bpage, 'enlaces');
await seed(bpage, seededState({ upTo: 1 }));
const toastOk = async (pg, label, text = 'Ese enlace no vale') => {
  await pg.waitForSelector('#toast.is-on', { timeout: 4000 }).catch(() => {});
  await pg.waitForFunction((t) => document.getElementById('toast').textContent.includes(t), text, { timeout: 4000 }).catch(() => {});
  const t = await pg.evaluate(() => { const e = document.getElementById('toast'); const r = e.getBoundingClientRect(); return { on: e.classList.contains('is-on'), text: e.textContent, role: e.getAttribute('role'), live: e.getAttribute('aria-live'), hidden: e.hidden, op: getComputedStyle(e).opacity, h: r.height }; });
  check(t.on && t.text.includes(text) && t.role === 'status' && t.live === 'polite' && !t.hidden && t.h > 0, `${label}: sin aviso visible/anunciado ${JSON.stringify(t)}`);
};
for (const bad of ['reto-zzz', 'reto-d20991231-3', 'reto-d90261124-9', 'etapa-nope', 'cosa-rara', 'galeria-nope', 'reto-w209901-3']) {
  const fresh = await badCtx.newPage();
  watch(fresh, `enlace ${bad}`);
  await fresh.goto(`${base}#${bad}`);
  await toastOk(fresh, `${bad} (pestaña nueva)`);
  await fresh.waitForSelector('.path');
  check(fresh.url().endsWith('#inicio'), `${bad}: no vuelve al inicio (${fresh.url()})`);
  if (bad === 'reto-zzz') await shot(fresh, '37-enlace-no-vale');
  await fresh.close();
  await bpage.goto(`${base}#${bad}`);
  await toastOk(bpage, `${bad} (desde la app)`);
  await bpage.waitForSelector('.path');
}
// Si la página se recarga nada más cambiar el enlace roto por #inicio, el aviso se repite.
await bpage.goto(`${base}#reto-zzz`);
await bpage.reload();
await toastOk(bpage, 'recarga tras enlace roto');
// Puntuación imposible para la ronda
await bpage.goto(`${base}#reto-d20261123-99`);
await toastOk(bpage, 'reto con 99 aciertos');
check(bpage.url().endsWith('#inicio'), 'reto con 99 aciertos aceptado');
// Etapa cerrada por enlace: aviso distinto
await bpage.goto(`${base}#etapa-${index.path.at(-1).id}`);
await toastOk(bpage, 'etapa cerrada', 'Aún no');

// ---------------------------------------------------------------- Repasar (botón ↻, sesión automática)
// Las rutas antiguas redirigen a #repaso; 7 preguntas como mucho; cuenta para meta y racha y, al cumplir la meta, cierra
// con «Por hoy, hecho».
const dueWorks = index.path.slice(0, 4).flatMap((a) => index.learnWorks(a.id)).filter((w) => !w.spoiler).slice(0, 6);
const srs = Object.fromEntries(dueWorks.map((w) => [`art:${w.id}`, { box: 1, due: '2026-11-01' }]));
const r5Ctx = await browser.newContext(ctxOpts);
const r5 = await r5Ctx.newPage();
watch(r5, 'repasar');
await seed(r5, seededState({ upTo: 4, extra: { srs } }));
await r5.waitForSelector('.path');
check(/pendientes/.test(await r5.locator('.chip-review').getAttribute('aria-label')), 'el botón «Repasar» no avisa de cuadros vencidos');
await r5.goto(`${base}#repaso5`);
await r5.waitForSelector('.review-intro');
check(r5.url().endsWith('#repaso'), `#repaso5 no redirige a #repaso: ${r5.url()}`);
check(/^Repasamos /.test(await r5.locator('.review-intro h1').innerText()), 'la entrada del repaso no dice qué se repasa');
await audit(r5, '390 entrada del repaso');
await r5.click('.review-intro [data-action="start"]');
await r5.waitForSelector('.lesson .option');
const rSteps = await playRound(r5);
check(rSteps >= 3 && rSteps <= 7, `el repaso tiene ${rSteps} preguntas`);
await r5.waitForTimeout(900);
check(/1 día/.test(await r5.locator('[data-chip="streak"]').innerText()), 'el repaso no cuenta para la racha');
check(await r5.locator('[data-chip="goal"]').count() === 1, 'el repaso no cumple la meta');
await shot(r5, '39c-repaso-fin', true);
await audit(r5, '390 cierre del día');
await r5Ctx.close();

// ---------------------------------------------------------------- Oscuro
const dark = await browser.newContext({ ...ctxOpts, colorScheme: 'dark' });
const kpage = await dark.newPage();
watch(kpage, 'oscuro');
await kpage.goto(`${base}`);
await kpage.waitForSelector('.welcome');
await audit(kpage, 'oscuro bienvenida');
// Con el catálogo grande el primer movimiento tiene varias paradas: la sala solo se abre con el movimiento dominado entero.
const darkUp = Math.max(4, index.stepsOf(index.visibleMovements[0].id).length);
await seed(kpage, seededState({ upTo: darkUp, extra: { collection: Object.fromEntries(index.path.slice(0, darkUp).flatMap((a) => index.learnWorks(a.id)).map((w) => [w.id, '2026-11-20'])) } }));
await kpage.waitForSelector('.path');
await shot(kpage, '34-oscuro-mapa');
await audit(kpage, 'oscuro mapa');
const darkStage = index.steps.find((s, i) => i >= darkUp && s.type === 'artist').id;
await kpage.goto(`${base}#etapa-${darkStage}`);
await kpage.waitForSelector('.learn, .intro, .story[open]');
if (await kpage.locator('.intro').count()) await audit(kpage, 'oscuro intro');
await toLearn(kpage);
await assertLearnLayout(kpage, 'oscuro conoce');
await audit(kpage, 'oscuro conoce');
await kpage.click('[data-action="practice"]');
await playRound(kpage, {
  wrongAt: [0, 2], shotsFor: { wrong: '35-oscuro-fallo' },
  onStep: async ({ step, type }) => { if (step === 0) await audit(kpage, `oscuro pregunta ${type} con fallo`); if (step === 2) await audit(kpage, `oscuro pregunta ${type} con fallo 2`); },
});
await kpage.waitForTimeout(1500);
await shot(kpage, '36-oscuro-fin');
await audit(kpage, 'oscuro resultado');
await kpage.goto(`${base}#perfil`);
await kpage.waitForSelector('.pf-hero');
await shot(kpage, '37-oscuro-perfil', true);
await audit(kpage, 'oscuro perfil');
await kpage.goto(`${base}#coleccion`);
await kpage.waitForSelector('.cx-works');
await audit(kpage, 'oscuro coleccion');
await kpage.goto(`${base}#galeria-${index.visibleMovements[0].id}`);
await kpage.waitForSelector('.gallery');
await shot(kpage, '37b-oscuro-sala');
await audit(kpage, 'oscuro sala');
await kpage.goto(`${base}#inicio`);
await kpage.waitForSelector('.path');
await audit(kpage, 'oscuro inicio con reto en la cabecera');

// ---------------------------------------------------------------- Reduced motion
const rm = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
const rpage = await rm.newPage();
watch(rpage, 'reduced');
await seed(rpage, seededState({ upTo: 1 }), `etapa-${first.id}`);
await rpage.waitForSelector('.learn');
await rpage.click('[data-action="practice"]');
await playRound(rpage);
const xpShown = await rpage.locator('.countup').innerText();
check(xpShown === await rpage.locator('.countup').getAttribute('data-to'), 'con movimiento reducido el XP no se muestra de golpe');
await shot(rpage, '38-reduced-fin');

// ---------------------------------------------------------------- Sin localStorage
const nols = await browser.newContext(ctxOpts);
await nols.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
});
const npage = await nols.newPage();
watch(npage, 'sin-storage');
await npage.goto(base);
await npage.click('[data-action="start"]');
await npage.waitForSelector('.path');
await npage.click('.stage-spot.is-current .stage');
await npage.click('.intro [data-action="enter"]');
await npage.click('[data-action="practice"]');
await playRound(npage);
await npage.click('[data-action="done"]');
check(await npage.locator('.path-character, .path-chest').count() === 0, 'sin storage: quedan personaje o cofres');
check((await npage.locator('.chip-streak').getAttribute('aria-label')).includes('50 de 50'), 'sin storage: la meta no avanza en memoria');

// ---------------------------------------------------------------- Escritorio 1280×800
const desk = await browser.newContext({ ...ctxOpts, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
const wpage = await desk.newPage();
watch(wpage, 'escritorio');
await seed(wpage, seededState({ upTo: 6, extra: { collection: Object.fromEntries(index.path.slice(0, 6).map((a, i) => [index.learnWorks(a.id)[0].id, `2026-11-2${i}`])), streak: { current: 2, best: 2, last: '2026-11-23', graceOn: null, days: ['2026-11-23', '2026-11-24'] } } }));
await wpage.waitForSelector('.path');
await shot(wpage, '39-escritorio-mapa');
await audit(wpage, '1280 mapa');
const side = await wpage.locator('.home-side').boundingBox();
const main = await wpage.locator('.home-main').boundingBox();
check(side && main && side.x + side.width <= main.x, 'escritorio: el mapa no tiene panel lateral');
check(await wpage.locator('.side-week').isVisible(), 'escritorio: la columna lateral sigue vacía');
await wpage.goto(`${base}#etapa-${index.steps.find((s, i) => i >= 6 && s.type === 'artist').id}`);
await toLearn(wpage);
await wpage.waitForSelector('.learn');
await assertLearnLayout(wpage, '1280 conoce');
await audit(wpage, '1280 conoce');
await shot(wpage, '39b-escritorio-conoce');
await wpage.click('[data-action="practice"]');
let deskWho = false;
await playRound(wpage, {
  wrongAt: [1, 2],
  onStep: async ({ type, step }) => {
    const fb = await wpage.evaluate(() => { const r = document.querySelector('.feedback').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
    check(fb.top >= 0 && fb.bottom <= fb.vh - 4, `1280: hoja de feedback cortada ${JSON.stringify(fb)}`);
    if (step === 1) { await shot(wpage, `40b-escritorio-fallo-${type}`); await audit(wpage, `1280 pregunta ${type} con fallo`); }
    if (type === 'who' && !deskWho) {
      deskWho = true;
      const a = await wpage.locator('.q-art').boundingBox();
      const o = await wpage.locator('.options').boundingBox();
      check(a.x + a.width <= o.x + 1, 'escritorio: cuadro y opciones no van lado a lado');
      await shot(wpage, '40-escritorio-pregunta');
    }
  },
});
await wpage.waitForTimeout(1200);
await shot(wpage, '41-escritorio-fin');
await wpage.goto(`${base}#coleccion`);
await wpage.waitForSelector('.cx-works');
await wpage.waitForTimeout(500);
await shot(wpage, '42-escritorio-coleccion');

// ---------------------------------------------------------------- Tableta 768×1024 (claro y oscuro)
for (const scheme of ['light', 'dark']) {
  const tab = await browser.newContext({ ...ctxOpts, viewport: { width: 768, height: 1024 }, colorScheme: scheme });
  const tpage = await tab.newPage();
  watch(tpage, `768-${scheme}`);
  await seed(tpage, seededState({ upTo: 6, extra: { collection: Object.fromEntries(index.path.slice(0, 6).map((a) => [index.learnWorks(a.id)[0].id, '2026-11-20'])) } }));
  await tpage.waitForSelector('.path');
  await shot(tpage, `43-768-${scheme}-mapa`);
  await audit(tpage, `768 ${scheme} mapa`);
  await noHorizontalScroll(tpage, `768 ${scheme} mapa`);
  await tpage.goto(`${base}#etapa-${index.steps.find((s, i) => i >= 6 && s.type === 'artist').id}`);
  await toLearn(tpage);
  await tpage.waitForSelector('.learn');
  await assertLearnLayout(tpage, `768 ${scheme} conoce`);
  await audit(tpage, `768 ${scheme} conoce`);
  await shot(tpage, `44-768-${scheme}-conoce`);
  await tpage.click('[data-action="practice"]');
  let tshot = false;
  await playRound(tpage, {
    wrongAt: [0, 1],
    checkReveal: `768 ${scheme}`,
    onStep: async ({ wrong, type }) => { if (wrong && !tshot) { tshot = true; await shot(tpage, `45-768-${scheme}-fallo-${type}`); await audit(tpage, `768 ${scheme} pregunta con fallo`); } },
  });
  await tab.close();
}

// ---------------------------------------------------------------- Oleada 7: pantallas cambiadas, claro y oscuro, 390 y 360
// Medallas (todas las clases de sello, pendientes incluidas: así se habrían visto los números de
// racha sin contraste), hoja de medalla, inicio avanzado con el bloque «Hoy», «Ojo de…» en Colección
// y en la etapa, y el aviso del reto con pintores no vistos.
{
  const eyeWho = index.path[2];
  const eyeWorks = index.worksOf(eyeWho.id).filter((w) => !w.spoiler && !w.attributed);
  const allW = index.path.flatMap((a) => index.worksOf(a.id));
  const srs7 = Object.fromEntries(allW.map((w, i) => [`art:${w.id}`, { box: 1 + (i % 3), due: i % 4 ? '2027-02-01' : '2026-11-01' }]));
  eyeWorks.forEach((w, i) => { srs7[`art:${w.id}`] = { box: i < 2 ? 4 : 2, due: '2027-02-01' }; });
  const medals7 = {};
  for (const a of index.path) medals7[`artist-${a.id}`] = '2026-11-20';
  medals7['streak-3'] = '2026-11-20';
  medals7['new-1'] = '2026-11-20';
  const st7 = seededState({ upTo: index.steps.length, xp: 9800, extra: { srs: srs7, collection: Object.fromEntries(allW.map((w) => [w.id, '2026-11-20'])) } });
  st7.progress.medals = { ...st7.progress.medals, ...medals7 };
  for (const m of index.visibleMovements) st7.progress.medals[`movement-${m.id}`] = '2026-11-20';
  for (const scheme of ['light', 'dark']) {
    for (const width of [390, 360]) {
      const tag = `${width}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
      const c7 = await browser.newContext({ ...ctxOpts, viewport: { width, height: width === 390 ? 844 : 640 }, colorScheme: scheme });
      const p7 = await c7.newPage();
      watch(p7, `o7-${tag}`);
      // Inicio avanzado: Cuadro del día en la cabecera y el mapa asomando.
      await seed(p7, st7);
      await p7.waitForSelector('.chip-cuadro');
      if (width === 390) {
        const top = await p7.evaluate(() => ({ t: document.querySelector('.path').getBoundingClientRect().top, n: document.querySelector('.bottomnav').getBoundingClientRect().top }));
        check(top.t < top.n - 40, `[${tag}] el mapa no asoma (${Math.round(top.t)} / ${Math.round(top.n)})`);
      }
      await shot(p7, `inicio-hoy-${tag}`);
      await audit(p7, `o7 ${tag} inicio hoy`);
      // Logros (#logros): sellos pendientes con número legible, «Ojo de X» pendiente y hoja de detalle.
      await p7.goto(`${base}#logros`);
      await p7.waitForSelector('.pf-logros');
      await p7.click('[data-action="medals-filter"][data-filter="missing"]');
      await p7.waitForTimeout(500);
      check(await p7.locator('.pf-medal-groups .pf-medal.is-missing .medal-num').count() >= 1, `[${tag}] no hay rachas pendientes a la vista`);
      const eyeText = `Ojo de ${eyeWho.short || eyeWho.name}`;
      check(await p7.locator(`.pf-medal-groups .pf-medal[aria-label^="${eyeText}, pendiente"]`).count() === 1, `[${tag}] falta «${eyeText}» en Logros`);
      await p7.locator('.pf-medal-groups .pf-medal.is-missing').first().scrollIntoViewIfNeeded();
      await shot(p7, `medallas-${tag}`);
      await audit(p7, `o7 ${tag} medallas`);
      const opener = p7.locator('.pf-medal-groups .pf-medal.is-missing', { hasText: '7 días' });
      await opener.click();
      await p7.waitForSelector('.medal-dialog[open]');
      await p7.waitForTimeout(400);
      check(/7 días seguidos/.test(await p7.locator('.medal-dialog').innerText()), `[${tag}] la hoja de medalla no dice cómo se gana`);
      check(!/ya lo reconoces/i.test(await p7.locator('.medal-dialog .dlg-meta').innerText()), `[${tag}] el logro pendiente se da por hecho en su subtítulo`);
      await shot(p7, `medalla-hoja-${tag}`);
      await audit(p7, `o7 ${tag} hoja de medalla`);
      for (let k = 0; k < 3; k++) await p7.keyboard.press('Tab');
      check(await p7.evaluate(() => Boolean(document.activeElement?.closest('.medal-dialog'))), `[${tag}] el foco sale de la hoja de medalla`);
      await p7.keyboard.press('Escape');
      await p7.waitForTimeout(450);
      check(await p7.locator('.medal-dialog[open]').count() === 0, `[${tag}] Esc no cierra la hoja de medalla`);
      check(await p7.evaluate(() => document.activeElement?.textContent.includes('7 días')), `[${tag}] el foco no vuelve a la medalla`);
      // «Ojo de…» no sale en la Colección (dos contadores contradictorios); queda en la etapa del pintor dominado.
      await p7.goto(`${base}#coleccion`);
      await p7.waitForSelector('.cx-card');
      check(await p7.locator('.eye-line').count() === 0, `[${tag}] «Ojo de…» sigue en la Colección`);
      check((await p7.locator('.section-sub').innerText()).includes('cuadros'), `[${tag}] Colección sin «N cuadros»`);
      await audit(p7, `o7 ${tag} coleccion`);
      await p7.goto(`${base}#etapa-${eyeWho.id}`);
      await p7.waitForSelector('.learn');
      check((await p7.locator('.learn .eye-line').innerText()).includes(eyeText), `[${tag}] la etapa del pintor dominado no muestra «${eyeText}»`);
      await assertLearnLayout(p7, `o7 ${tag} conoce`, { strict: width === 390 });
      await shot(p7, `etapa-ojo-${tag}`);
      await audit(p7, `o7 ${tag} etapa`);
      await p7.goto(`${base}#perfil`);
      await p7.waitForSelector('.pf-hero');
      check((await p7.locator('.pf-rank-name').innerText()).length > 0, `[${tag}] Perfil sin rango`);
      check(!/cuadros? vistos?|pintores? que reconoces|Mi museo/i.test(await p7.locator('.pf-layout').innerText()), `[${tag}] el perfil repite lo que ya está en la Colección`);
      await shot(p7, `perfil-${tag}`);
      await c7.close();
      // Reto semanal aceptado por un jugador nuevo: aviso breve, sin bloquear.
      const n7 = await browser.newContext({ ...ctxOpts, viewport: { width, height: width === 390 ? 844 : 640 }, colorScheme: scheme });
      const q7 = await n7.newPage();
      watch(q7, `o7-nuevo-${tag}`);
      const wk = isoWeek(dayKey(new Date())).compact;
      await q7.goto(`${base}#reto-${wk}-9`);
      await q7.waitForSelector('[data-action="accept"]');
      check(/Salen pintores que aún no has visto/.test(await q7.locator('.welcome-note').innerText()), `[${tag}] el reto no avisa de pintores no vistos`);
      await shot(q7, `reto-nuevo-${tag}`);
      await audit(q7, `o7 ${tag} reto nuevo`);
      if (width === 390 && scheme === 'light') {
        await q7.click('[data-action="accept"]');
        await playRound(q7, { wrongAt: [0, 1, 2, 3, 4] });
        const stats = await q7.evaluate(() => JSON.parse(localStorage.getItem('mirada.state')).progress.stats);
        check(stats.answered === 0, `el reto con pintores no vistos cuenta para la precisión: ${JSON.stringify(stats)}`);
      }
      await n7.close();
    }
  }
}

// ---------------------------------------------------------------- Oleada 8: visor a pantalla completa en cada pantalla y sin zoom de página
// Con emulación táctil (hasTouch + isMobile) en móvil: se prueban toques de verdad (tap), el
// pellizco y el doble toque. En escritorio, ratón y teclado.
{
  const allW = index.path.flatMap((a) => index.worksOf(a.id));
  const st8 = seededState({ upTo: index.steps.length, xp: 9800, extra: {
    collection: Object.fromEntries(allW.map((w) => [w.id, '2026-11-20'])),
    srs: Object.fromEntries(allW.map((w, i) => [`art:${w.id}`, { box: 3 + (i % 2), due: '2027-02-01' }])),
  } });
  const roundStage = index.path.find((a, i) => i >= 8 && index.learnWorks(a.id).length >= 2) || index.path[1];
  const portrait = (w) => w.h > w.w * 1.1;
  const landscape = (w) => w.w > w.h * 1.15;
  const configs = [
    { tag: '390-claro', width: 390, height: 844, scheme: 'light', touch: true, full: true },
    { tag: '390-oscuro', width: 390, height: 844, scheme: 'dark', touch: true },
    { tag: '360-claro', width: 360, height: 640, scheme: 'light', touch: true },
    { tag: '360-oscuro', width: 360, height: 640, scheme: 'dark', touch: true, round: true },
    { tag: '1280-claro', width: 1280, height: 800, scheme: 'light', touch: false, round: true, desk: true },
    { tag: '1280-oscuro', width: 1280, height: 800, scheme: 'dark', touch: false },
    { tag: '195-claro', width: 195, height: 422, scheme: 'light', touch: true, round: true },
  ];
  for (const cfg of configs) {
    const opts = cfg.touch
      ? { ...ctxOpts, viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme, hasTouch: true, isMobile: true }
      : { ...ctxOpts, viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme, hasTouch: false, deviceScaleFactor: 1 };
    const c8 = await browser.newContext(opts);
    const p8 = await c8.newPage();
    watch(p8, `o8-${cfg.tag}`);
    const L = (x) => `${cfg.tag} ${x}`;
    const T = cfg.touch;

    // Bienvenida: la pared de cuadros también se abre (solo en el recorrido completo de 390).
    if (cfg.full) {
      await p8.goto(base);
      await p8.waitForSelector('.welcome');
      await viewerCheck(p8, L('bienvenida'), p8.locator('.welcome .wall .art-zoom').nth(1), { group: 3, close: 'outside', touch: T });
      // Sin zoom de página: viewport, touch-action y pellizco / doble toque reales (CDP).
      const vp = await p8.evaluate(() => ({
        meta: document.querySelector('meta[name="viewport"]').content,
        body: getComputedStyle(document.body).touchAction,
        btn: getComputedStyle(document.querySelector('button')).touchAction,
      }));
      check(/maximum-scale=1/.test(vp.meta) && /user-scalable=no/.test(vp.meta), `viewport permite zoom: ${vp.meta}`);
      check(vp.body === 'pan-x pan-y' && vp.btn === 'pan-x pan-y', `touch-action: ${JSON.stringify(vp)}`);
      // Control: la misma página sin estas reglas sí se amplía con el mismo gesto.
      const ctrl = await c8.newPage();
      await ctrl.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><div style="height:3000px;font-size:20px">x</div>');
      const ctrlScale = await touchPinch(ctrl, await c8.newCDPSession(ctrl));
      await ctrl.close();
      const pinch = await touchPinch(p8, await c8.newCDPSession(p8));
      check(pinch === 1, `el pellizco amplía la página (escala ${pinch})`);
      check(ctrlScale > 1, `control del pellizco sin efecto (escala ${ctrlScale}): la prueba no discrimina`);
      notes.push(`Pellizco con dos dedos (CDP): página de control ×${ctrlScale}, Sfumato ×${pinch}.`);
    }

    await seed(p8, st8);
    await p8.waitForSelector('.path');
    if (cfg.full) {
      // Doble toque y pellizco en el mapa: no amplían; el dedo sigue desplazando la página.
      const cdp = await c8.newCDPSession(p8);
      await touchTap(p8, cdp, 120, 300);
      await p8.waitForTimeout(60);
      await touchTap(p8, cdp, 120, 300);
      await p8.waitForTimeout(500);
      check(await p8.evaluate(() => window.visualViewport.scale) === 1, 'el doble toque amplía la página');
      if (await p8.locator('.viewer').count()) await p8.keyboard.press('Escape');
      await p8.goto(`${base}#inicio`);
      await p8.waitForSelector('.path');
      await p8.evaluate(() => window.scrollTo(0, 0));
      check(await touchPinch(p8, cdp) === 1, 'el pellizco amplía el mapa');
      const y = await touchSwipe(p8, cdp, { x: 190, from: 650, to: 250 });
      check(y > 100, `con touch-action el dedo ya no desplaza la página (scrollY ${y})`);
      await p8.evaluate(() => window.scrollTo(0, 0));
    }

    // «Conoce a»: el carrusel entero en el visor.
    await p8.goto(`${base}#etapa-${roundStage.id}`);
    await p8.waitForSelector('.learn');
    await p8.waitForTimeout(400);
    const nLearn = await p8.locator('.slide .art-zoom').count();
    check(nLearn === index.learnWorks(roundStage.id).length, `[${cfg.tag}] cuadros pulsables en «Conoce a»: ${nLearn}`);
    check(await p8.locator('.slide .zoom-badge').count() === nLearn, `[${cfg.tag}] «Conoce a» sin la marca de ampliar`);
    if (cfg.full) {
      // Deslizar con el dedo: el carrusel y el visor siguen pasando de cuadro.
      const cdp = await c8.newCDPSession(p8);
      const tb = await p8.locator('.carousel-track').boundingBox();
      await touchSwipe(p8, cdp, { y: tb.y + tb.height / 2, fromX: tb.x + tb.width * 0.8, toX: tb.x + tb.width * 0.15 });
      check((await p8.locator('.carousel-count').innerText()).trim().startsWith('2'), `deslizar el carrusel no pasa de cuadro (${await p8.locator('.carousel-count').innerText()})`);
      await p8.locator('.slide .art-zoom').first().tap();
      await p8.waitForSelector('.viewer[open]');
      await p8.waitForTimeout(300);
      await touchSwipe(p8, cdp, { y: 420, fromX: 330, toX: 50 });
      check(await waitCount(p8, `2 / ${nLearn}`) === `2 / ${nLearn}`, `deslizar en el visor no pasa de cuadro (${await viewerCount(p8)})`);
      // El pellizco dentro del visor amplía el cuadro (no la página); el doble toque también.
      await viewerZoomCheck(p8, cdp, L('conoce'), p8.locator('.slide .art-zoom').first());
      await p8.keyboard.press('Escape');
      await p8.waitForSelector('.viewer', { state: 'detached' });
    }
    await viewerCheck(p8, L('conoce'), p8.locator('.slide .art-zoom').first(), { group: nLearn, close: cfg.desk ? 'esc' : 'back', touch: T, shotName: `visor-conoce-${cfg.tag}` });
    check(await p8.locator('.learn').count() === 1, `[${cfg.tag}] cerrar el visor con atrás sale de «Conoce a»`);
    if (cfg.desk) {
      // Escritorio: Ctrl+rueda sobre el cuadro amplía (sin zoom de página) y 0 restablece.
      await p8.locator('.slide .art-zoom').first().click();
      await p8.waitForSelector('.viewer[open]');
      await p8.waitForTimeout(300);
      const f = await viewerFrameState(p8);
      await p8.mouse.move(f.x, f.y);
      await p8.keyboard.down('Control');
      await p8.mouse.wheel(0, -240);
      await p8.keyboard.up('Control');
      await p8.waitForTimeout(300);
      const w = await viewerFrameState(p8);
      check(w.scale > 1.2 && w.page === 1, `[${cfg.tag}] Ctrl+rueda no amplía el cuadro (escala ${w.scale.toFixed(2)}, página ×${w.page})`);
      await p8.keyboard.press('0');
      await p8.waitForTimeout(300);
      check((await viewerFrameState(p8)).scale === 1, `[${cfg.tag}] 0 no restablece tras la rueda`);
      await p8.keyboard.press('Escape');
      await p8.waitForSelector('.viewer', { state: 'detached' });
    }

    if (cfg.full || cfg.round) {
      // Ronda: imagen de la pregunta sin revelar nada, «¿Cuál es de X?» con el visor de las 4
      // (atrás y tocar fuera no responden; «Es este» sí), feedback con pie y resultado.
      await p8.click('[data-action="practice"]');
      await p8.waitForSelector('.lesson .option');
      const done = new Set();
      for (let step = 0; step < 30; step++) {
        await p8.waitForTimeout(150);
        if (await p8.locator('.res').count()) break;
        check(await p8.locator('.interlude').count() === 0, `[${cfg.tag}] la etapa aún tiene la pantalla intermedia`);
        const prompt = (await p8.locator('.q-prompt').innerText()).trim();
        const isWhich = await p8.locator('.option-art').count() > 0;
        const type = isWhich ? 'which' : prompt.includes('movimiento') ? 'movement' : 'who';
        let target = 0;
        const ids = [];
        const options = p8.locator('.lesson-stage .option');
        const n = await options.count();
        if (isWhich) {
          const short = prompt.replace(/^¿Cuál es de /, '').replace(/\?$/, '');
          for (let i = 0; i < n; i++) {
            const id = await options.nth(i).locator('.art').getAttribute('data-art');
            ids.push(id);
            const a = artist.get(art.get(id).artistId);
            if ((a.short || a.name) === short) target = i;
          }
          const allow = [...artist.values()].find((a) => (a.short || a.name) === short)?.id;
          if (!done.has('which')) {
            done.add('which');
            const other = (target + 1) % n;
            // Atrás: cierra sin responder ni salir de la ronda.
            await viewerCheck(p8, L('cuál (atrás)'), options.nth(other), { reveal: false, forbidden: forbiddenFor(ids, allow), group: n, close: 'back', touch: T, shotName: `visor-cual-${cfg.tag}` });
            check(await p8.locator('.feedback.is-open').count() === 0, `[${cfg.tag}] cerrar el visor con atrás responde`);
            // Tocar fuera y el aspa tampoco responden.
            await viewerCheck(p8, L('cuál (fuera)'), options.nth(target), { reveal: false, forbidden: forbiddenFor(ids, allow), group: n, close: cfg.desk ? 'button' : 'outside', touch: T });
            check(await p8.locator('.feedback.is-open').count() === 0, `[${cfg.tag}] cerrar el visor responde`);
            if (cfg.desk) {
              // Teclado: flecha hasta la buena y Enter en «Es este» (el foco ya está ahí).
              await options.nth(other).click();
              await p8.waitForSelector('.viewer[open]');
              check(await p8.evaluate(() => document.activeElement?.dataset.v === 'pick'), `[${cfg.tag}] el foco no empieza en «Es este»`);
              let at = other;
              while (at !== target) { await p8.keyboard.press(target > at ? 'ArrowRight' : 'ArrowLeft'); at += target > at ? 1 : -1; await waitCount(p8, `${at + 1} / ${n}`); }
              await p8.waitForSelector('.viewer [data-v="pick"][aria-disabled="false"]', { timeout: 3000 });
              await p8.keyboard.press('Enter');
            } else await answerWhichInViewer(p8, target, { navigate: true, label: L('cuál') });
            await p8.waitForSelector('.feedback.is-open');
            check(await p8.locator('.option.is-correct.is-picked').count() === 1, `[${cfg.tag}] «Es este» no responde con el cuadro visto`);
            await p8.waitForTimeout(450);
            // Con la respuesta dada, el visor ya enseña título, autor y año.
            await viewerCheck(p8, L('cuál respondida'), options.nth(target), { group: n, close: 'esc', touch: T, shotName: cfg.full ? 'visor-cual-respondida-390-claro' : null });
            check(await p8.locator('.feedback.is-open').count() === 1, `[${cfg.tag}] el visor cierra la hoja de feedback`);
          } else {
            await answerWhichInViewer(p8, target, { label: L('cuál') });
            await p8.waitForSelector('.feedback.is-open');
          }
        } else {
          const id = await p8.locator('.q-art .art').getAttribute('data-art');
          const a = artist.get(art.get(id).artistId);
          const label = type === 'movement' ? movement.get(a.movementId).name : a.name;
          for (let i = 0; i < n; i++) if ((await options.nth(i).innerText()).split('\n').pop().trim() === label) target = i;
          if (!done.has(type)) {
            done.add(type);
            const forbidden = [...forbiddenFor([id], null, true), movement.get(a.movementId).name];
            await viewerCheck(p8, L(`pregunta ${type}`), p8.locator('.q-art .art-zoom'), { reveal: false, forbidden, close: 'button', touch: T, shotName: `visor-${type}-${cfg.tag}` });
            check(await p8.locator('.feedback.is-open').count() === 0, `[${cfg.tag}] abrir la imagen responde`);
            await options.nth(target).click();
            await p8.waitForSelector('.feedback.is-open');
            await p8.waitForTimeout(450);
            await viewerCheck(p8, L(`feedback ${type}`), p8.locator('.q-art .art-zoom'), { close: 'outside', touch: T });
          } else {
            await options.nth(target).click();
            await p8.waitForSelector('.feedback.is-open');
          }
        }
        await p8.locator('.feedback [data-action="continue"]').click();
      }
      await p8.waitForSelector('.res');
      await p8.waitForTimeout(900);
      check(await p8.locator('.res').count() === 1, `[${cfg.tag}] cerrar el visor con atrás sale del resultado`);
    }

    // Intro de movimiento: la pared de 3 cuadros.
    const mov = index.visibleMovements[1] || index.visibleMovements[0];
    await p8.goto(`${base}#movimiento-${mov.id}`);
    await p8.waitForSelector('.intro');
    await viewerCheck(p8, L('intro movimiento'), p8.locator('.intro .wall .art-zoom').first(), { group: 3, close: 'button', touch: T });

    // Sala (galería): cuadro vertical y apaisado.
    const gMov = index.visibleMovements.find((m) => {
      const ws = index.stageArtists(m.id).flatMap((a) => index.worksOf(a.id));
      return ws.some(portrait) && ws.some(landscape);
    }) || index.visibleMovements[0];
    await p8.goto(`${base}#galeria-${gMov.id}`);
    await p8.waitForSelector('.gallery');
    const gIds = await p8.$$eval('.gallery .art-zoom', (els) => els.map((e) => e.dataset.zoom));
    const vIdx = gIds.findIndex((id) => portrait(art.get(id) || {}));
    const hIdx = gIds.findIndex((id) => landscape(art.get(id) || {}));
    check(vIdx >= 0 && hIdx >= 0, `[${cfg.tag}] la sala no tiene cuadro vertical y apaisado`);
    if (vIdx >= 0) await viewerCheck(p8, L('sala vertical'), p8.locator('.gallery .art-zoom').nth(vIdx), { group: gIds.length, close: 'esc', touch: T, shotName: `visor-vertical-${cfg.tag}` });
    if (hIdx >= 0) await viewerCheck(p8, L('sala apaisado'), p8.locator('.gallery .art-zoom').nth(hIdx), { group: gIds.length, close: cfg.desk ? 'button' : 'outside', touch: T, shotName: `visor-apaisado-${cfg.tag}` });

    // Colección: una miniatura abre el visor directamente.
    await p8.goto(`${base}#coleccion`);
    await p8.waitForSelector('.cx-works .art-zoom');
    await viewerCheck(p8, L('colección'), p8.locator('.cx-works .art-zoom').first(), { close: 'esc', touch: T, shotName: cfg.full ? 'visor-ficha-390-claro' : null });

    // Medallas: el sello de un pintor en su hoja.
    await p8.goto(`${base}#logros`);
    await p8.waitForSelector('.pf-logros');
    await p8.locator('.pf-medal.is-got .medal-art').first().click();
    await p8.waitForSelector('.medal-dialog[open]');
    await p8.waitForTimeout(350);
    check(await p8.locator('.medal-dialog .medal-zoom').count() === 1, `[${cfg.tag}] el sello del pintor no se puede ver en grande`);
    if (await p8.locator('.medal-dialog .medal-zoom').count()) {
      await viewerCheck(p8, L('medalla'), p8.locator('.medal-dialog .medal-zoom'), { close: 'button', touch: T, keepDialog: '.medal-dialog' });
    }
    await c8.close();
  }
}

// ---------------------------------------------------------------- Oleada 9: Leonardo, «¿Cuál?», visor (carrera, fondo, giro, lupa), recarga, Colección
{
  const leo = index.path[0];
  const allW9 = index.path.flatMap((a) => index.worksOf(a.id));
  const st9 = seededState({ upTo: index.steps.length, xp: 9800, extra: {
    collection: Object.fromEntries(allW9.map((w) => [w.id, '2026-11-20'])),
  } });
  const portrait9 = (w) => w.h > w.w * 1.1;
  const textPath = (process.argv[3] || new URL('../app/data/catalog.json', import.meta.url).pathname).toString().replace(/catalog\.json$/, 'catalog-text.json');
  const lookText = JSON.parse(readFileSync(textPath, 'utf8')).look || {};
  const landscape9 = (w) => w.w > w.h * 1.15;
  const ctxFor = (cfg) => browser.newContext(cfg.touch
    ? { ...ctxOpts, viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme, hasTouch: true, isMobile: true }
    : { ...ctxOpts, viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme, hasTouch: false, isMobile: false, deviceScaleFactor: 1 });
  const frameInfo = (pg) => pg.evaluate(() => {
    const slide = [...document.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    const r = slide.querySelector('.viewer-frame').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, count: document.querySelector('.viewer-count')?.textContent.trim() || '' };
  });
  const waitBig = (pg) => pg.waitForFunction(() => {
    const s = [...document.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    return s && s.classList.contains('is-big');
  }, null, { timeout: 6000 }).catch(() => {});
  const lensInfo = (pg) => pg.evaluate(() => {
    const l = document.querySelector('.viewer-lens');
    if (!l || l.hidden) return null;
    const r = l.getBoundingClientRect();
    const slide = [...document.querySelectorAll('.viewer-slide')].find((x) => x.getAttribute('aria-hidden') === 'false');
    const f = slide.querySelector('.viewer-frame').getBoundingClientRect();
    const [bx, by] = getComputedStyle(l).backgroundPosition.split(' ').map(parseFloat);
    const [bw] = getComputedStyle(l).backgroundSize.split(' ').map(parseFloat);
    const z = bw / f.width;
    // Punto del cuadro que se ve en el centro de la lente.
    const u = (r.width / 2 - bx) / (f.width * z);
    const v = (r.height / 2 - by) / (f.height * z);
    return { x: r.left, y: r.top, w: r.width, h: r.height, u, v, z, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, bg: getComputedStyle(l).backgroundImage };
  });

  // Lupa: activar, arrastrar (toque emulado o ratón), lente con la zona correcta y dentro de la
  // pantalla, sin cambiar de cuadro ni cerrar; teclado; Esc la apaga y después cierra.
  async function loupeCheck(pg, cdp, cfg, label, shotName = null) {
    await waitBig(pg);
    const btn = pg.locator('.viewer [data-v="loupe"]');
    const bb = await btn.boundingBox();
    check(bb && bb.width >= 48 && bb.height >= 48, `[lupa ${label}] botón de ${bb ? `${Math.round(bb.width)}×${Math.round(bb.height)}` : '—'}`);
    check(await btn.getAttribute('aria-label') === 'Lupa' && await btn.getAttribute('aria-pressed') === 'false', `[lupa ${label}] sin nombre «Lupa» o aria-pressed`);
    if (cfg.touch) await btn.tap(); else await btn.click();
    check(await btn.getAttribute('aria-pressed') === 'true', `[lupa ${label}] no se activa`);
    const f = await frameInfo(pg);
    const pts = [[0.3, 0.4], [0.55, 0.5], [0.8, 0.25]];
    const at = (k) => ({ x: f.x + f.w * pts[k][0], y: f.y + f.h * pts[k][1] });
    if (cfg.touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at(0)] });
      for (let k = 1; k <= 12; k++) {
        const a = at(0); const b = at(1);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * k) / 12, y: a.y + ((b.y - a.y) * k) / 12 }] });
        await pg.waitForTimeout(16);
      }
    } else {
      await pg.mouse.move(at(0).x, at(0).y);
      await pg.mouse.down();
      await pg.mouse.move(at(1).x, at(1).y, { steps: 10 });
    }
    await pg.waitForTimeout(150);
    const li = await lensInfo(pg);
    check(Boolean(li), `[lupa ${label}] no aparece la lente al arrastrar`);
    if (li) {
      check(Math.abs(li.u - pts[1][0]) < 0.03 && Math.abs(li.v - pts[1][1]) < 0.03, `[lupa ${label}] la lente no enseña la zona bajo el dedo (${li.u.toFixed(3)}, ${li.v.toFixed(3)})`);
      check(li.inside, `[lupa ${label}] la lente se sale de la pantalla ${JSON.stringify(li)}`);
      check(li.w >= (cfg.width >= 1000 ? 180 : 150) && li.w <= (cfg.width >= 1000 ? 240 : 175), `[lupa ${label}] lente de ${Math.round(li.w)} px`);
      check(li.z >= 1.5 && li.z <= 2.51, `[lupa ${label}] aumento ×${li.z.toFixed(2)}`);
      check(/img\/w\d+\.jpg/.test(li.bg), `[lupa ${label}] la lente no usa la imagen grande (${li.bg})`);
      if (cfg.touch) check(li.y + li.h <= at(1).y || li.y >= at(1).y, `[lupa ${label}] la lente tapa el dedo`);
      if (shotName) await shot(pg, shotName);
    }
    if (cfg.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await pg.mouse.up();
    await pg.waitForTimeout(250);
    check(!(await lensInfo(pg)), `[lupa ${label}] la lente no desaparece al soltar`);
    const f2 = await frameInfo(pg);
    check(f2.count === f.count && Math.abs(f2.x - f.x) < 2, `[lupa ${label}] arrastrar cambia de cuadro (${f.count} → ${f2.count})`);
    check(await pg.locator('.viewer[open]').count() === 1, `[lupa ${label}] arrastrar o tocar el cuadro cierra el visor`);
    // Toque en el cuadro con la lupa: no cierra.
    if (cfg.touch) await pg.touchscreen.tap(at(2).x, at(2).y); else await pg.mouse.click(at(2).x, at(2).y);
    await pg.waitForTimeout(250);
    check(await pg.locator('.viewer[open]').count() === 1, `[lupa ${label}] tocar el cuadro cierra el visor`);
    // Teclado: las flechas mueven la lente (no cambian de cuadro).
    await btn.focus();
    await pg.keyboard.press('ArrowRight');
    const k1 = await lensInfo(pg);
    await pg.keyboard.press('ArrowRight');
    await pg.keyboard.press('ArrowDown');
    const k2 = await lensInfo(pg);
    check(Boolean(k1 && k2) && k2.u > k1.u + 0.03 && k2.v > k1.v + 0.03, `[lupa ${label}] las flechas no mueven la lente ${JSON.stringify([k1 && [k1.u, k1.v], k2 && [k2.u, k2.v]])}`);
    check((await frameInfo(pg)).count === f.count, `[lupa ${label}] las flechas cambian de cuadro con la lupa`);
    // Esc: primero apaga la lupa; el visor sigue abierto.
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(150);
    check(await btn.getAttribute('aria-pressed') === 'false' && !(await lensInfo(pg)), `[lupa ${label}] Esc no apaga la lupa`);
    check(await pg.locator('.viewer[open]').count() === 1, `[lupa ${label}] Esc con la lupa cierra el visor`);
    // Con el botón también se apaga; con la lupa apagada arrastrar vuelve a pasar de cuadro.
    if (cfg.touch) await btn.tap(); else await btn.click();
    if (cfg.touch) await btn.tap(); else await btn.click();
    check(await btn.getAttribute('aria-pressed') === 'false', `[lupa ${label}] el botón no la apaga`);
  }

  const configs9 = [
    { tag: '390-claro', width: 390, height: 844, scheme: 'light', touch: true, full: true },
    { tag: '390-oscuro', width: 390, height: 844, scheme: 'dark', touch: true },
    { tag: '360-claro', width: 360, height: 640, scheme: 'light', touch: true, mid: true },
    { tag: '360-oscuro', width: 360, height: 640, scheme: 'dark', touch: true },
    { tag: '1280-claro', width: 1280, height: 800, scheme: 'light', touch: false, desk: true },
    { tag: '1280-oscuro', width: 1280, height: 800, scheme: 'dark', touch: false, desk: true },
  ];
  for (const cfg of configs9) {
    const c9 = await ctxFor(cfg);
    const p9 = await c9.newPage();
    watch(p9, `o9-${cfg.tag}`);
    const L = (x) => `[o9 ${cfg.tag}] ${x}`;
    const cdp = cfg.touch ? await c9.newCDPSession(p9) : null;
    const tap = async (loc) => { if (cfg.touch) await loc.tap(); else await loc.click(); };

    // --- Leonardo entero (primera impresión) desde cero, con capturas en 390 claro.
    if (cfg.full || cfg.mid) {
      await seed(p9, seededState({ upTo: 0 }), `etapa-${leo.id}`);
      await p9.waitForSelector('.learn, .intro, .look-first, .story[open]');
      for (let k = 0; k < 4 && !(await p9.locator('.learn').count()); k++) {
        const go = p9.locator('.intro [data-primary], .intro .btn-primary, .look-first [data-action="go"]').first();
        if (await p9.locator('.story[open]').count()) await skipStory(p9);
        else if (await go.count()) await go.click();
        await p9.waitForTimeout(400);
      }
      await p9.waitForSelector('.learn');
      check(await p9.locator('.slide').count() === 2, L(`«Conoce a» de Leonardo enseña ${await p9.locator('.slide').count()} cuadros`));
      if (cfg.full) await shot(p9, 'leonardo-0-conoce');
      await p9.click('[data-action="practice"]');
      await p9.waitForSelector('.lesson .option');
      const seq = [];
      for (let step = 0; step < 12; step++) {
        await p9.waitForTimeout(200);
        if (await p9.locator('.res').count()) break;
        const isWhich = await p9.locator('.option-art').count() > 0;
        const subj = isWhich ? null : await p9.locator('.q-art .art').getAttribute('data-art');
        const options = p9.locator('.lesson-stage .option');
        let target = 0;
        const ids = [];
        const n = await options.count();
        if (isWhich) {
          for (let i = 0; i < n; i++) {
            const id = await options.nth(i).locator('.art').getAttribute('data-art');
            ids.push(id);
            if (art.get(id).artistId === leo.id) target = i;
          }
        } else {
          for (let i = 0; i < n; i++) if ((await options.nth(i).innerText()).split('\n').pop().trim() === leo.name) target = i;
        }
        const tagText = await p9.locator('.q-tag').innerText().catch(() => '');
        seq.push({ type: isWhich ? 'which' : 'who', id: isWhich ? ids[target] : subj, isNew: /nuevo/i.test(tagText) });
        if (step === 0 && isWhich) {
          // «¿Cuál?» a 390 / 360: rejilla compacta, marcos de igual ancho, huecos de ~16 px, todo a la vista.
          const g = await p9.evaluate(() => {
            const grid = document.querySelector('.options-grid').getBoundingClientRect();
            const marcos = [...document.querySelectorAll('.option-art .marco')].map((a) => a.getBoundingClientRect());
            const cells = [...document.querySelectorAll('.option-art')].map((a) => a.getBoundingClientRect());
            const arts = [...document.querySelectorAll('.option-art .art')].map((a) => { const r = a.getBoundingClientRect(); return r.width / r.height; });
            return { bottom: grid.bottom, vh: innerHeight, marcos: marcos.map((r) => [r.left, r.top, r.width, r.height]), cellsMin: Math.min(...cells.map((r) => Math.min(r.width, r.height))), arts };
          });
          const widths = g.marcos.map((m) => m[2]);
          check(Math.max(...widths) - Math.min(...widths) < 1, L(`marcos de «¿Cuál?» con anchos distintos ${JSON.stringify(widths.map(Math.round))}`));
          const hGap = g.marcos[1][0] - (g.marcos[0][0] + g.marcos[0][2]);
          const vGap = g.marcos[2][1] - Math.max(g.marcos[0][1] + g.marcos[0][3], g.marcos[1][1] + g.marcos[1][3]);
          check(hGap >= 10 && hGap <= 20, L(`hueco horizontal de «¿Cuál?»: ${Math.round(hGap)} px`));
          check(vGap >= 10 && vGap <= 32, L(`hueco vertical de «¿Cuál?»: ${Math.round(vGap)} px`));
          check(g.bottom <= g.vh + 2, L(`la rejilla de «¿Cuál?» no cabe (${Math.round(g.bottom)} > ${g.vh})`));
          check(g.cellsMin >= 48, L(`casilla de «¿Cuál?» menor de 48 px (${Math.round(g.cellsMin)})`));
          check(g.arts.every((r) => r >= 0.74 && r <= 1.34), L(`proporción de marco fuera de 3:4–4:3 ${JSON.stringify(g.arts.map((r) => +r.toFixed(2)))}`));
          await shot(p9, `cual-${cfg.width}`);
          // Recargar con el visor abierto en la primera pregunta: vuelve a la pregunta, no a «Conoce a».
          const prompt0 = await p9.locator('.q-prompt').innerText();
          const optIds0 = ids.join(',');
          await tap(options.nth(0));
          await p9.waitForSelector('.viewer[open]');
          await p9.reload();
          await p9.waitForSelector('.lesson .option, .learn', { timeout: 8000 });
          check(await p9.locator('.learn').count() === 0 && await p9.locator('.lesson .option').count() > 0, L('recargar con el visor abierto en la primera pregunta vuelve a «Conoce a»'));
          const optIds1 = [];
          for (let i = 0; i < await options.count(); i++) optIds1.push(await options.nth(i).locator('.art').getAttribute('data-art'));
          check(await p9.locator('.q-prompt').innerText() === prompt0 && optIds1.sort().join(',') === optIds0.split(',').sort().join(','), L('al recargar cambia la primera pregunta'));
          // Carrera: «siguiente» y «Es este» en menos de 100 ms nunca responden con el cuadro anterior.
          const ids1 = [];
          for (let i = 0; i < await options.count(); i++) ids1.push(await options.nth(i).locator('.art').getAttribute('data-art'));
          const t1 = ids1.findIndex((id) => art.get(id).artistId === leo.id);
          // Se abre en la vecina de la buena y se pasa a la buena (siguiente o, si es la primera, anterior).
          const dirV = t1 > 0 ? 'next' : 'prev';
          const start = t1 > 0 ? t1 - 1 : 1;
          await tap(options.nth(start));
          await p9.waitForSelector('.viewer[open]');
          await waitBig(p9);
          if (cfg.touch) {
            const nb = await p9.locator(`.viewer [data-v="${dirV}"]`).boundingBox();
            const pb = await p9.locator('.viewer [data-v="pick"]').boundingBox();
            await touchTap(p9, cdp, nb.x + nb.width / 2, nb.y + nb.height / 2);
            await p9.waitForTimeout(40);
            await touchTap(p9, cdp, pb.x + pb.width / 2, pb.y + pb.height / 2);
          } else {
            await p9.evaluate((d) => { document.querySelector(`.viewer [data-v="${d}"]`).click(); setTimeout(() => document.querySelector('.viewer [data-v="pick"]')?.click(), 40); }, dirV);
          }
          await p9.waitForTimeout(150);
          const early = await p9.locator('.feedback.is-open').count();
          if (early) check(await options.nth(t1).evaluate((b) => b.classList.contains('is-correct') && b.classList.contains('is-picked')), L('carrera: «Es este» responde con el cuadro anterior'));
          else {
            check(await p9.locator('.viewer[open]').count() === 1, L('carrera: el visor se cierra sin responder'));
            check(await viewerCount(p9) === `${t1 + 1} / 4`, L(`carrera: el contador no se fija al pedir el cambio (${await viewerCount(p9)})`));
            await p9.waitForSelector('.viewer [data-v="pick"][aria-disabled="false"]', { timeout: 3000 }).catch(() => {});
            await tap(p9.locator('.viewer [data-v="pick"]'));
            await p9.waitForSelector('.feedback.is-open');
            check(await options.nth(t1).evaluate((b) => b.classList.contains('is-correct') && b.classList.contains('is-picked')), L('carrera: tras deslizar, «Es este» no responde con el cuadro visto'));
          }
          notes.push(`${L('carrera')}: ${early ? 'respondió al instante con el cuadro nuevo' : '«Es este» esperó al final del deslizamiento'}`);
          await p9.waitForTimeout(450);
          await assertAnswersVisible(p9, L('«¿Cuál?» con la hoja'));
          await shot(p9, `cual-feedback-${cfg.width}`);
        } else {
          if (isWhich) await answerWhichInViewer(p9, target, { label: L(`leonardo ${step}`) });
          else await options.nth(target).click();
          await p9.waitForSelector('.feedback.is-open');
          await p9.waitForTimeout(450);
          if (isWhich) await assertAnswersVisible(p9, L(`leonardo ${step}`));
          if (cfg.full) await shot(p9, `leonardo-${step + 1}-${isWhich ? 'cual' : 'quien'}`);
        }
        await p9.locator('.feedback [data-action="continue"]').click();
      }
      await p9.waitForSelector('.res');
      if (cfg.full) await shot(p9, 'leonardo-6-resultado');
      check(seq.length === 5, L(`Leonardo con ${seq.length} preguntas`));
      check(new Set(seq.map((x) => x.id)).size === seq.length, L(`Leonardo repite cuadro: ${seq.map((x) => x.id)}`));
      check(seq.filter((x) => !x.isNew).length === 1 && !seq[0].isNew, L(`Leonardo: recién vistas ${seq.filter((x) => !x.isNew).length}`));
      check(seq.filter((x) => x.type === 'who').length === 1 && seq[0].type === 'which', L(`Leonardo: tipos ${seq.map((x) => x.type)}`));
      notes.push(`${L('Leonardo')}: ${seq.map((x) => `${x.type === 'who' ? '¿Quién?' : '¿Cuál?'} ${x.id}${x.isNew ? '' : ' (vista)'}`).join(' → ')}`);
    }

    // --- Sala: vertical (fondo alrededor que cierra, deslizar no cierra, lupa) y apaisado (ancho, lupa).
    await seed(p9, st9);
    await p9.waitForSelector('.path');
    const gMov = index.visibleMovements.find((m) => {
      const ws = index.stageArtists(m.id).flatMap((a) => index.worksOf(a.id));
      return ws.some(portrait9) && ws.some(landscape9);
    }) || index.visibleMovements[0];
    await p9.goto(`${base}#galeria-${gMov.id}`);
    await p9.waitForSelector('.gallery');
    const gIds = await p9.$$eval('.gallery .art-zoom', (els) => els.map((e) => e.dataset.zoom));
    const vIdx = gIds.findIndex((id) => portrait9(art.get(id) || {}));
    const hIdx = gIds.findIndex((id) => landscape9(art.get(id) || {}));
    const wide = gIds.reduce((b, id, i) => ((art.get(id).w / art.get(id).h) > (art.get(gIds[b]).w / art.get(gIds[b]).h) ? i : b), 0);
    // Vertical
    await p9.locator('.gallery .art-zoom').nth(vIdx).scrollIntoViewIfNeeded();
    await tap(p9.locator('.gallery .art-zoom').nth(vIdx));
    await p9.waitForSelector('.viewer[open]');
    await waitBig(p9);
    const fv = await frameInfo(p9);
    if (cfg.touch) {
      // Deslizar sobre el fondo y el cuadro pasa de cuadro y no cierra.
      await touchSwipe(p9, cdp, { y: fv.y + fv.h / 2, fromX: fv.vw * 0.85, toX: fv.vw * 0.15 });
      check(await p9.locator('.viewer[open]').count() === 1, L('deslizar en el visor lo cierra'));
      check(await viewerCount(p9) !== fv.count, L('deslizar en el visor no pasa de cuadro'));
      await p9.locator('.viewer [data-v="prev"]').tap();
      await waitCount(p9, fv.count);
      await p9.waitForTimeout(500);
    }
    if (cfg.full || cfg.desk) await shot(p9, `visor-vertical-${cfg.tag}`);
    await loupeCheck(p9, cdp, cfg, L('vertical'), cfg.full || cfg.mid || cfg.tag === '1280-claro' ? `lupa-vertical-${cfg.tag}` : null);
    const bg = await viewerBackground(p9, { nearFrame: true });
    check(Boolean(bg), L('vertical: no hay fondo junto al cuadro para cerrar tocando fuera'));
    if (bg) {
      if (cfg.touch) await p9.touchscreen.tap(bg.x, bg.y); else await p9.mouse.click(bg.x, bg.y);
      await p9.waitForSelector('.viewer', { state: 'detached', timeout: 3000 }).catch(() => {});
      check(await p9.locator('.viewer').count() === 0, L(`vertical: tocar el fondo junto al cuadro (${bg.x}, ${bg.y}) no cierra`));
    }
    // Apaisado: aprovecha el ancho.
    await p9.locator('.gallery .art-zoom').nth(wide).scrollIntoViewIfNeeded();
    await tap(p9.locator('.gallery .art-zoom').nth(wide));
    await p9.waitForSelector('.viewer[open]');
    await waitBig(p9);
    const fh = await frameInfo(p9);
    if (!cfg.desk) check(fh.w >= fh.vw - 16, L(`apaisado en vertical: ${Math.round(fh.w)} de ${fh.vw} px de ancho`));
    notes.push(`${L('apaisado')}: ${Math.round(fh.w)}×${Math.round(fh.h)} en ${fh.vw}×${fh.vh}`);
    if (cfg.full || cfg.mid || cfg.desk) await shot(p9, `visor-apaisado-${cfg.tag}`);
    await loupeCheck(p9, cdp, cfg, L('apaisado'), cfg.full || cfg.mid || cfg.tag === '1280-claro' ? `lupa-apaisado-${cfg.tag}` : null);
    // La lupa sigue activa al cambiar de cuadro y se apaga al cerrar.
    await tap(p9.locator('.viewer [data-v="loupe"]'));
    await tap(p9.locator(`.viewer [data-v="${(await viewerCount(p9)).startsWith('1 ') ? 'next' : 'prev'}"]`));
    await p9.waitForTimeout(600);
    check(await p9.locator('.viewer [data-v="loupe"]').getAttribute('aria-pressed') === 'true', L('la lupa se apaga al cambiar de cuadro'));
    // Sala: al cerrar, el foco vuelve al cuadro donde te has quedado.
    const lastPos = Number((await viewerCount(p9)).split(' ')[0]) - 1;
    await tap(p9.locator('.viewer [data-v="close"]'));
    await p9.waitForSelector('.viewer', { state: 'detached' });
    const focusedZoom = await p9.evaluate(() => document.activeElement?.dataset?.zoom || '');
    check(focusedZoom === gIds[lastPos], L(`sala: el foco no vuelve al cuadro donde te quedaste (${focusedZoom} / ${gIds[lastPos]})`));
    await tap(p9.locator('.gallery .art-zoom').nth(0));
    await p9.waitForSelector('.viewer[open]');
    check(await p9.locator('.viewer [data-v="loupe"]').getAttribute('aria-pressed') === 'false', L('la lupa sigue activa al volver a abrir el visor'));
    await p9.keyboard.press('Escape');
    await p9.waitForSelector('.viewer', { state: 'detached' });

    // --- Colección: una miniatura abre el visor en esa obra y, al cerrarlo, el foco vuelve a ella.
    await p9.goto(`${base}#coleccion`);
    await p9.waitForSelector('.cx-works .art-zoom');
    await tap(p9.locator('.cx-works .art-zoom').first());
    await p9.waitForSelector('.viewer[open]');
    await p9.keyboard.press('Escape');
    await p9.waitForSelector('.viewer', { state: 'detached' });
    check(await p9.evaluate(() => document.activeElement?.classList.contains('art-zoom')), L('colección: al cerrar el visor el foco no vuelve a la miniatura'));
    await audit(p9, L('colección'));
    await c9.close();
  }

  // --- Móvil girado (844×390): el cuadro ocupa la pantalla y los controles flotan encima.
  {
    const c = await browser.newContext({ ...ctxOpts, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const pg = await c.newPage();
    watch(pg, 'o9-giro');
    await seed(pg, st9);
    await pg.waitForSelector('.path');
    await pg.goto(`${base}#coleccion`);
    await pg.waitForSelector('.cx-works .art-zoom');
    const wideId = (await pg.$$eval('.cx-works .art-zoom', (els) => els.map((e) => e.dataset.zoom))).find((id) => landscape9(art.get(id)));
    const tallId = (await pg.$$eval('.cx-works .art-zoom', (els) => els.map((e) => e.dataset.zoom))).find((id) => portrait9(art.get(id)));
    for (const [id, nm] of [[wideId, 'apaisado'], [tallId, 'vertical']]) {
      await pg.locator(`.cx-works .art-zoom[data-zoom="${id}"]`).scrollIntoViewIfNeeded();
      await pg.locator(`.cx-works .art-zoom[data-zoom="${id}"]`).tap();
      await pg.waitForSelector('.viewer[open]');
      await waitBig(pg);
      const f = await frameInfo(pg);
      check(f.h >= f.vh - 12 || f.w >= f.vw - 12, `[o9 giro ${nm}] el cuadro no ocupa la pantalla (${Math.round(f.w)}×${Math.round(f.h)} de ${f.vw}×${f.vh})`);
      notes.push(`[o9 giro ${nm}] ${Math.round(f.w)}×${Math.round(f.h)} en ${f.vw}×${f.vh}`);
      await audit(pg, `o9 giro ${nm}`);
      await shot(pg, `visor-giro-${nm}`);
      await pg.locator('.viewer [data-v="close"]').tap();
      await pg.waitForSelector('.viewer', { state: 'detached' });
      await pg.keyboard.press('Escape');
    }
    await c.close();
  }
}
} // fin de lo que no entra en el modo humo

// Contador de visitas: con el código vacío (por defecto) no se pide nada fuera del origen.
{
  const cfg = await (await fetch(`${base}js/stats-config.js`)).text();
  const code = (cfg.match(/GOATCOUNTER_CODE\s*=\s*'([^']*)'/) || [])[1];
  if (code === '') check(externalCounter.length === 0, `contador: con el código vacío se han pedido ${externalCounter.join(', ')}`);
  else notes.push(`contador: código configurado (${externalCounter.length} peticiones a GoatCounter)`);
}

await browser.close();
console.log(JSON.stringify({ shots: shots.length, boot, budget: BOOT_BUDGET, audits: { contrastScreens: audits.contrast, targetScreens: audits.targets }, problems, notes, challengeText, dailyText }, null, 2));
process.exitCode = problems.length ? 1 : 0;
