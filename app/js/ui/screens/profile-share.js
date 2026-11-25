// Compartir el resultado del test: una tarjeta de imagen (canvas, JPEG) con la marca, el resultado y un
// cuadro (o, sin cuadros, la marca grande). Con Web Share y archivos se comparte la imagen; si el
// navegador no lo admite, se descarga; y si el canvas falla, se comparte o copia el texto (el mismo que
// comparte el test). Todo en el navegador: nada sale a ningún servidor. Se carga al pulsar «Compartir».

import { cssVar } from '../dom.js';
import { logoMark } from '../icons.js';
import { shareText } from '../../test/resultado.js';

const CARD_W = 1080;
const CARD_H = 1350;
const ART_H = 760;
const PAD = 72;
const JPEG_QUALITY = 0.88;
const FILE_NAME = 'sfumato-test.jpg';
const NO_ART_LOGO = 420;

// Líneas de la tarjeta (puro, para probar).
export function cardLines(last) {
  return {
    level: last.level || '',
    score: `${last.correct} de ${last.asked}`,
    percentile: last.percentile != null ? `Sabes más de pintura que el ${last.percentile} % de la gente` : '',
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

// Pinta `img` cubriendo el rectángulo (recortado a él), centrado en el punto de interés si lo hay.
function drawCover(g, img, x, y, w, h, focus) {
  const k = Math.max(w / img.width, h / img.height);
  const fx = Array.isArray(focus) ? focus[0] : 0.5;
  const fy = Array.isArray(focus) ? focus[1] : 0.3;
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

async function drawCard(last, work) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const g = canvas.getContext('2d');
  const c = { bg: cssVar('--bg'), ink: cssVar('--ink'), ink2: cssVar('--ink-2'), brand: cssVar('--brand'), brandText: cssVar('--brand-text'), soft: cssVar('--brand-soft'), surface2: cssVar('--surface-2') };
  const lines = cardLines(last);
  try { await document.fonts.load('500 64px Outfit'); } catch { /* sin la letra de marca vale la del sistema */ }
  g.fillStyle = c.bg;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const art = work ? await loadImage(work.img) : null;
  if (art) {
    drawCover(g, art, 0, 0, CARD_W, ART_H, work.focus);
    const fade = g.createLinearGradient(0, ART_H * 0.6, 0, ART_H);
    fade.addColorStop(0, 'transparent');
    fade.addColorStop(1, c.bg);
    g.fillStyle = fade;
    g.fillRect(0, 0, CARD_W, ART_H);
  } else {
    // Sin cuadros: la marca grande sobre un fondo de la casa.
    const bgArt = g.createLinearGradient(0, 0, CARD_W, ART_H);
    bgArt.addColorStop(0, c.soft);
    bgArt.addColorStop(1, c.surface2);
    g.fillStyle = bgArt;
    g.fillRect(0, 0, CARD_W, ART_H);
    const big = await logoImage(NO_ART_LOGO, c.brand);
    if (big) { g.globalAlpha = 0.5; g.drawImage(big, (CARD_W - NO_ART_LOGO) / 2, (ART_H - NO_ART_LOGO) / 2, NO_ART_LOGO, NO_ART_LOGO); g.globalAlpha = 1; }
  }
  // Zona del texto: siempre del color de fondo (nada del cuadro asoma por debajo del fundido).
  g.fillStyle = c.bg;
  g.fillRect(0, ART_H, CARD_W, CARD_H - ART_H);
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
  // Resultado, todo sobre el fondo liso.
  g.textBaseline = 'alphabetic';
  let y = ART_H + 24;
  if (lines.level) {
    g.fillStyle = c.ink;
    g.font = '500 58px Outfit, system-ui, sans-serif';
    y += 58;
    g.fillText(lines.level, PAD, y);
  }
  g.fillStyle = c.brandText;
  g.font = '600 168px Outfit, system-ui, sans-serif';
  y += 170;
  g.fillText(lines.score, PAD, y);
  g.fillStyle = c.ink;
  g.font = '400 44px Outfit, system-ui, sans-serif';
  for (const l of wrap(g, lines.percentile, CARD_W - PAD * 2)) { y += 60; g.fillText(l, PAD, y); }
  g.fillStyle = c.ink2;
  g.font = '400 36px Outfit, system-ui, sans-serif';
  g.fillText(hostText(), PAD, CARD_H - PAD + 10);
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

// work: cuadro de fondo de la tarjeta (el de la portada); null: sin cuadros, la marca grande.
export async function shareTest(ctx, last, work) {
  let blob = null;
  try { blob = await drawCard(last, work); } catch (err) { console.error(err); }
  if (!blob) { await shareAsText(ctx, last); return; }
  const file = new File([blob], FILE_NAME, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: shareText(last, testUrl()) }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
  }
  download(blob);
  ctx.toast('Imagen guardada');
}
