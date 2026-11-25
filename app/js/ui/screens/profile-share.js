// Compartir el resultado del test: una tarjeta de imagen (canvas, JPEG) con la marca, un cuadro con su
// título y autor, el resultado y la cuadrícula del test. Con Web Share y archivos se comparte la imagen; si
// el navegador no lo admite, se descarga; y si el canvas falla, se comparte o copia el texto (el mismo que
// comparte el test). Todo en el navegador: nada sale a ningún servidor. Se carga al pulsar «Compartir».

import { cssVar } from '../dom.js';
import { logoMark } from '../icons.js';
import { shareText, GRID_OK, GRID_HALF } from '../../test/resultado.js';

const CARD_W = 1080;
const CARD_H = 1350;
const ART_H = 800;
const PAD = 72;
const JPEG_QUALITY = 0.88;
const FILE_NAME = 'sfumato-test.jpg';
const ART_ZOOM = 1.05; // un poco de más: así no asoma el filo del marco del cuadro
const ARCH_ZOOM = 1.35; // y más si el cuadro tiene esquinas claras (arcos): se recortan
const CORNER_LIGHT = 232; // brillo medio de una esquina por encima del cual se considera «papel»
const FOOTER_H = 170; // sitio del pie (lema y dirección) bajo el resultado
const CELL = 64;
const CELL_GAP = 16;

// Líneas de la tarjeta (puro, para probar). En primera persona, como el texto que se comparte.
export function cardLines(last) {
  return {
    level: last.level || '',
    score: `${last.correct} de ${last.asked}`,
    percentile: last.percentile != null ? `Sé más de pintura que el ${last.percentile} % de la gente` : '',
  };
}

const testUrl = () => new URL('test/', location.href).href;
const hostText = () => `${location.host}${new URL('test/', location.href).pathname.replace(/\/$/, '')}`;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const logoImage = (size, color) => loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(logoMark(size).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, color))}`);

// ¿Tiene las esquinas claras? (cuadros con arco o tondos sobre papel blanco): se muestrea una miniatura.
function hasLightCorners(img) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 16, 16);
  const corners = [[0, 0], [15, 0]].map(([x, y]) => g.getImageData(x, y, 1, 1).data);
  return corners.every((d) => (d[0] + d[1] + d[2]) / 3 >= CORNER_LIGHT);
}

// Fundido del cuadro al color de fondo: franjas del color de fondo con opacidad creciente (un degradado a
// «transparent» pasa por negro transparente y ensucia el cuadro).
function fadeTo(g, color, y0, y1) {
  g.fillStyle = color;
  for (let y = y0; y < y1; y += 1) {
    g.globalAlpha = ((y - y0) / (y1 - y0)) ** 1.4;
    g.fillRect(0, y, CARD_W, 1);
  }
  g.globalAlpha = 1;
}

// Pinta `img` cubriendo el rectángulo (recortado a él), centrado en el punto de interés si lo hay.
function drawCover(g, img, x, y, w, h, focus) {
  const arch = hasLightCorners(img);
  const k = Math.max(w / img.width, h / img.height) * (arch ? ARCH_ZOOM : ART_ZOOM);
  const fx = Array.isArray(focus) ? focus[0] : 0.5;
  const fy = Math.max(Array.isArray(focus) ? focus[1] : 0.3, arch ? 0.45 : 0); // con arco, sin el borde de arriba
  const dw = img.width * k;
  const dh = img.height * k;
  const dx = x - Math.min(Math.max(fx * dw - w / 2, 0), dw - w);
  const dy = y - Math.min(Math.max(fy * dh - h / 2, 0), dh - h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.drawImage(img, dx, dy, dw, dh);
  g.restore();
}

function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Una línea que cabe: si no, se corta con «…».
function fit(g, text, maxWidth) {
  if (g.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && g.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

// La cuadrícula del test (🟩 🟨 ⬜) como cuadrados de los colores de la casa.
function drawGrid(g, grid, x, y, c) {
  [...grid].forEach((ch, i) => {
    g.beginPath();
    g.roundRect(x + i * (CELL + CELL_GAP), y, CELL, CELL, 14);
    if (ch === GRID_OK || ch === GRID_HALF) {
      g.fillStyle = ch === GRID_OK ? c.ok : c.gold;
      g.fill();
    } else { // tramo no alcanzado: hueco con borde (visible en claro y en oscuro)
      g.lineWidth = 4;
      g.strokeStyle = c.ink2;
      g.stroke();
    }
  });
}

// work: cuadro de la tarjeta; artist: su autor (para el pie).
async function drawCard(last, work, artist) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const g = canvas.getContext('2d');
  const c = {
    bg: cssVar('--bg'), ink: cssVar('--ink'), ink2: cssVar('--ink-2'), brand: cssVar('--brand'), brandText: cssVar('--brand-text'),
    soft: cssVar('--brand-soft'), surface2: cssVar('--surface-2'), ok: cssVar('--ok'), gold: cssVar('--gold'),
  };
  const lines = cardLines(last);
  try { await document.fonts.load('500 64px Outfit'); } catch { /* sin la letra de marca vale la del sistema */ }
  g.fillStyle = c.bg;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const art = work ? await loadImage(work.img) : null;
  if (art) {
    drawCover(g, art, 0, 0, CARD_W, ART_H, work.focus);
    fadeTo(g, c.bg, Math.round(ART_H * 0.62), ART_H);
  } else {
    // Sin ningún cuadro (catálogo sin cargar): degradado de la casa.
    const bgArt = g.createLinearGradient(0, 0, CARD_W, ART_H);
    bgArt.addColorStop(0, c.soft);
    bgArt.addColorStop(1, c.bg);
    g.fillStyle = bgArt;
    g.fillRect(0, 0, CARD_W, ART_H);
  }
  // Marca arriba a la izquierda, sobre una pastilla del color de fondo.
  g.globalAlpha = 0.9;
  g.fillStyle = c.bg;
  g.beginPath();
  g.roundRect(PAD - 24, PAD - 24, 370, 120, 60);
  g.fill();
  g.globalAlpha = 1;
  const logo = await logoImage(96, c.brand);
  if (logo) g.drawImage(logo, PAD, PAD - 12, 96, 96);
  g.fillStyle = c.ink;
  g.textBaseline = 'middle';
  g.font = '500 56px Outfit, system-ui, sans-serif';
  g.fillText('Sfumato', PAD + 116, PAD + 36);
  // Título y autor del cuadro, sobre el fundido.
  g.textBaseline = 'alphabetic';
  if (work) {
    g.fillStyle = c.ink;
    g.font = '400 34px Outfit, system-ui, sans-serif';
    g.fillText(fit(g, `${work.title}${artist ? ` · ${artist.name}` : ''}`, CARD_W - PAD * 2), PAD, ART_H - 28);
  }
  // Resultado sobre el fondo liso, centrado en el espacio que queda entre el cuadro y el pie (así no hay hueco
  // cuando falta el nivel, el percentil o la cuadrícula).
  g.font = '400 44px Outfit, system-ui, sans-serif';
  const pctLines = lines.percentile ? wrap(g, lines.percentile, CARD_W - PAD * 2) : [];
  const LEVEL_H = 76;
  const SCORE_H = 170;
  const PCT_H = 58;
  const GRID_H = CELL + 34;
  const blockH = (lines.level ? LEVEL_H : 0) + SCORE_H + pctLines.length * PCT_H + (last.grid ? GRID_H : 0);
  let y = ART_H + Math.max(8, (CARD_H - FOOTER_H - ART_H - blockH) / 2);
  if (lines.level) {
    g.fillStyle = c.ink;
    g.font = '500 58px Outfit, system-ui, sans-serif';
    y += 58;
    g.fillText(lines.level, PAD, y);
    y += LEVEL_H - 58;
  }
  g.fillStyle = c.brandText;
  g.font = '600 168px Outfit, system-ui, sans-serif';
  y += 140;
  g.fillText(lines.score, PAD, y);
  y += SCORE_H - 140;
  g.fillStyle = c.ink;
  g.font = '400 44px Outfit, system-ui, sans-serif';
  for (const l of pctLines) { y += 44; g.fillText(l, PAD, y); y += PCT_H - 44; }
  if (last.grid) drawGrid(g, last.grid, PAD, y + 12, c);
  g.fillStyle = c.ink2;
  g.font = '400 38px Outfit, system-ui, sans-serif';
  g.fillText('Aprende a reconocer pintura clásica jugando', PAD, CARD_H - 104);
  g.font = '500 38px Outfit, system-ui, sans-serif';
  g.fillStyle = c.brandText;
  g.fillText(hostText(), PAD, CARD_H - 52);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY));
}

async function shareAsText(ctx, last) {
  const text = shareText(last, testUrl());
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    ctx.toast('Copiado');
  } catch {
    ctx.toast('No se ha podido copiar');
  }
}

function download(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = FILE_NAME;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// work: cuadro de fondo de la tarjeta (el de la portada del perfil, o el de muestra).
export async function shareTest(ctx, last, work) {
  let blob = null;
  try { blob = await drawCard(last, work, work ? ctx.index.artist(work.artistId) : null); } catch (err) { console.error(err); }
  if (!blob) { await shareAsText(ctx, last); return; }
  const file = new File([blob], FILE_NAME, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: shareText(last, testUrl()) }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
  }
  download(blob);
  ctx.toast('Imagen guardada');
}
