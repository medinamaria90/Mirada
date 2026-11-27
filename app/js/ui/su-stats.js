// Fila «Estadísticas» del Superusuario: enlace al panel de GoatCounter y, si María activó el contador
// público («Allow adding visitor counts on your website»), «Visitantes esta semana: N». Sin token de
// API (sería público): solo el JSON público /counter/TOTAL.json. Si falla, queda solo el enlace.

import { GOATCOUNTER_CODE } from '../stats-config.js';

const CODE_RE = /^[a-z0-9][a-z0-9-]*$/i;
const WEEK_DAYS = 7;
const FETCH_TIMEOUT_MS = 6000;

export const panelUrl = (code) => (CODE_RE.test(String(code || '')) ? `https://${code}.goatcounter.com` : '');

const isoDay = (d) => d.toISOString().slice(0, 10);

export function counterUrl(code, now = new Date()) {
  const base = panelUrl(code);
  if (!base) return '';
  const start = new Date(now.getTime() - WEEK_DAYS * 86400000);
  return `${base}/counter/TOTAL.json?start=${isoDay(start)}&end=${isoDay(now)}`;
}

/** El JSON trae textos con separadores («1 234», «1,234»). Devuelve un entero o null si no es válido. */
export function parseVisitors(json) {
  const raw = json?.count_unique ?? json?.count;
  const n = Number(String(raw ?? '').replace(/\D/g, ''));
  return String(raw ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
}

/** Visitantes de la última semana, o null si no hay código, el contador no está activado o falla la petición. */
export async function fetchWeeklyVisitors(code, fetchFn = globalThis.fetch, now = new Date()) {
  const url = counterUrl(code, now);
  if (!url || typeof fetchFn !== 'function') return null;
  try {
    const res = await fetchFn(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return res.ok ? parseVisitors(await res.json()) : null;
  } catch {
    return null; // sin red o contador sin activar: se muestra solo el enlace
  }
}

/** HTML de la fila; vacío si no hay código. */
export function statsRowHtml(code = GOATCOUNTER_CODE) {
  const url = panelUrl(code);
  if (!url) return '';
  return `<a class="setting su-stats" href="${url}" target="_blank" rel="noopener">
    <span>Estadísticas</span><span class="su-stats-n" data-su-visitors hidden></span>
  </a>`;
}

/** Rellena el número bajo demanda sin bloquear nada. */
export async function fillVisitors(root, code = GOATCOUNTER_CODE, fetchFn = globalThis.fetch) {
  const el = root.querySelector('[data-su-visitors]');
  if (!el) return;
  const n = await fetchWeeklyVisitors(code, fetchFn);
  if (n === null || !el.isConnected) return;
  el.textContent = `Visitantes esta semana: ${n.toLocaleString('es-ES')}`;
  el.hidden = false;
}
