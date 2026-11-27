// node proto-shot.mjs <variante a|b> <salida> <selector> [ancho] [hash]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [v, out, sel, w = '360', hash = 'inicio'] = process.argv.slice(2);
const ids = ['botticelli', 'masaccio', 'piero', 'berruguete', 'leonardo', 'miguel-angel', 'rafael', 'tiziano', 'veronese', 'bosch', 'durero'];
const a = {}; for (const id of ids) a[id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-26' };
const st = { version: 10, onboarded: true, progress: { xp: 900, artists: a, salas: {}, intros: { renacimiento: '2026-11-20' }, reviews: {}, srs: {}, collection: {}, medals: {}, streak: { current: 2, best: 2, last: '2026-11-26', graceOn: null, days: [] }, stats: { answered: 20, correct: 18, newCorrect: 10, rounds: 3 }, daily: {}, weekly: {}, challenges: { played: 0 }, xpByDay: {} }, settings: { music: false, sfx: false, volume: 0.6, reducedMotion: true, dailyGoal: 50, theme: 'light' }, session: {} };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('mirada.state', JSON.stringify(s)); localStorage.setItem('mirada.coach', '1'); localStorage.setItem('sfumato.coach', '1'); } }, st);
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`http://localhost:8765/?proto=${v}#${hash}`); await p.waitForTimeout(1800);
await p.evaluate(() => document.querySelectorAll('.news-card,.map-return').forEach((e) => e.remove()));
for (let i = 0; i < 30 && !(await p.locator(sel).count()); i++) { await p.mouse.wheel(0, -1500); await p.waitForTimeout(150); }
await p.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelectorAll('.news-card,.map-return').forEach((e) => e.remove()));
await p.screenshot({ path: out }); await b.close();
