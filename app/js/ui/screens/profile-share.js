// Compartir el resultado del test: una tarjeta de imagen (canvas) con la marca, el resultado y un cuadro.
// Con Web Share y archivos se comparte la imagen; si el navegador no lo admite, se descarga; y si el
// canvas falla, se comparte o copia el texto. Todo en el navegador: nada sale a ningún servidor.

import { cssVar } from '../dom.js';
import { logoMark } from '../icons.js';
import { testShareText } from '../../engine/profile.js';

const CARD_W = 1080;
const CARD_H = 1350;
const ART_H = 760;
const PAD = 72;
const TEST_HOST = 'sfumato-arte.onrender.com/test';
const FILE_NAME = 'sfumato-test.png';

// Líneas de la tarjeta (puro, para probar).
export function cardLines(last) {
  return {
    level: last.level || '',
    score: `${last.correct} de ${last.asked}`,
    percentile: last.percentile != null ? `Sabes más de pintura que el ${last.percentile} % de la gente` : '',
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Pinta `img` cubriendo el rectángulo, centrado en el punto de interés (fracciones) si lo hay.
function drawCover(g, img, x, y, w, h, focus) {
  const k = Math.max(w / img.width, h / img.height);
  const fx = Array.isArray(focus) ? focus[0] : 0.5;
  const fy = Array.isArray(focus) ? focus[1] : 0.3;
  const dw = img.width * k;
  const dh = img.height * k;
  const dx = x - Math.min(Math.max(fx * dw - w / 2, 0), dw - w);
  const dy = y - Math.min(Math.max(fy * dh - h / 2, 0), dh - h);
  g.drawImage(img, dx, dy, dw, dh);
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
  const color = { bg: cssVar('--bg'), ink: cssVar('--ink'), ink2: cssVar('--ink-2'), brand: cssVar('--brand'), brandText: cssVar('--brand-text'), surface: cssVar('--surface') };
  const lines = cardLines(last);
  try { await document.fonts.load('500 64px Outfit'); } catch { /* sin la letra de marca vale la del sistema */ }
  g.fillStyle = color.bg;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const art = work ? await loadImage(work.img) : null;
  if (art) {
    drawCover(g, art, 0, 0, CARD_W, ART_H, work.focus);
    const fade = g.createLinearGradient(0, ART_H * 0.55, 0, ART_H);
    fade.addColorStop(0, 'transparent');
    fade.addColorStop(1, color.bg);
    g.fillStyle = fade;
    g.fillRect(0, 0, CARD_W, ART_H);
  } else {
    g.fillStyle = color.surface;
    g.fillRect(0, 0, CARD_W, ART_H);
  }
  // Marca arriba a la izquierda, sobre una pastilla del color de fondo.
  g.globalAlpha = 0.88;
  g.fillStyle = color.bg;
  g.beginPath();
  g.roundRect(PAD - 24, PAD - 24, 330, 120, 60);
  g.fill();
  g.globalAlpha = 1;
  const logo = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(logoMark(96).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, color.brand))}`);
  if (logo) g.drawImage(logo, PAD, PAD - 12, 96, 96);
  g.fillStyle = color.ink;
  g.textBaseline = 'middle';
  g.font = '500 56px Outfit, system-ui, sans-serif';
  g.fillText('Sfumato', PAD + 116, PAD + 36);
  // Resultado.
  g.textBaseline = 'alphabetic';
  let y = ART_H + 40;
  if (lines.level) {
    g.fillStyle = color.ink2;
    g.font = '500 54px Outfit, system-ui, sans-serif';
    g.fillText(lines.level, PAD, y);
    y += 40;
  }
  g.fillStyle = color.brandText;
  g.font = '600 168px Outfit, system-ui, sans-serif';
  g.fillText(lines.score, PAD, y + 150);
  y += 150;
  g.fillStyle = color.ink;
  g.font = '400 44px Outfit, system-ui, sans-serif';
  for (const l of wrap(g, lines.percentile, CARD_W - PAD * 2)) { y += 62; g.fillText(l, PAD, y + 24); }
  g.fillStyle = color.ink2;
  g.font = '400 36px Outfit, system-ui, sans-serif';
  g.fillText(TEST_HOST, PAD, CARD_H - PAD + 10);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

async function shareText(ctx, last) {
  const text = testShareText(last, new URL('test/', location.href).href);
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

// work: cuadro de fondo de la tarjeta (el de la portada del perfil).
export async function shareTest(ctx, last, work) {
  let blob = null;
  try { blob = await drawCard(last, work); } catch (err) { console.error(err); }
  if (!blob) return shareText(ctx, last);
  const file = new File([blob], FILE_NAME, { type: 'image/png' });
  const text = testShareText(last, new URL('test/', location.href).href);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
  }
  download(blob);
  ctx.toast('Imagen guardada');
}
