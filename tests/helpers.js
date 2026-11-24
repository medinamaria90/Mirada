import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';

const here = dirname(fileURLToPath(import.meta.url));

export function sampleCatalog() {
  return JSON.parse(readFileSync(join(here, 'fixtures', 'catalog.sample.json'), 'utf8'));
}

export function sampleIndex() {
  return buildIndex(sampleCatalog());
}

// Catálogo sintético más grande: 5 movimientos × 3 pintores × 6 obras (+1 invitado).
export function bigCatalog() {
  const movements = [];
  const artists = [];
  const artworks = [];
  let n = 0;
  for (let m = 1; m <= 5; m++) {
    movements.push({ id: `mov${m}`, name: `Movimiento ${m}`, period: '', order: m, era: 'menu', blurb: '', accent: '#666666' });
    for (let a = 1; a <= 3; a++) {
      const id = `p${m}${a}`;
      artists.push({ id, name: `Pintor ${m}.${a}`, short: `P${m}${a}`, movementId: `mov${m}`, order: a, guest: false, hint: 'Fíjate.', traits: [], similarTo: a > 1 ? [`p${m}${a - 1}`] : [] });
      for (let w = 0; w < 6; w++) {
        n++;
        artworks.push({ id: `w${n}`, artistId: id, title: `Obra ${n}`, year: '1900', yearSort: 1900, img: `img/w${n}.jpg`, w: 100, h: 100, role: w < 3 ? 'learn' : 'new', fame: (w % 3) + 1, confidence: 'high' });
      }
    }
    artists.push({ id: `g${m}`, name: `Invitado ${m}`, short: `G${m}`, movementId: `mov${m}`, order: 9, guest: true, hint: '', traits: [], similarTo: [] });
    n++;
    artworks.push({ id: `w${n}`, artistId: `g${m}`, title: `Obra ${n}`, year: '1900', yearSort: 1900, img: `img/w${n}.jpg`, w: 100, h: 100, role: 'learn', fame: 1, confidence: 'high' });
  }
  return { version: 1, movements, artists, artworks };
}

export function bigIndex() {
  return buildIndex(bigCatalog());
}

export function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
    data,
  };
}

// Catálogo sintético con salas: bigCatalog + un movimiento solo de invitados en medio (orden 2.5)
// y otro al final; cada sala con 4 invitados (3, 2, 1 y 1 obras).
export function salaCatalog() {
  const cat = bigCatalog();
  let n = 5000;
  for (const [mid, order] of [['sala-a', 2.5], ['sala-b', 6]]) {
    cat.movements.push({ id: mid, name: `Sala ${mid}`, period: 's. X', order, era: 'menu', blurb: `Blurb ${mid}`, accent: '#556677', traits: ['rasgo uno', 'rasgo dos'] });
    [3, 2, 1, 1].forEach((works, k) => {
      const id = `${mid}-g${k}`;
      cat.artists.push({ id, name: `Invitado ${mid} ${k}`, short: `I${k}`, movementId: mid, order: k + 1, guest: true, hint: 'h', traits: [], similarTo: [] });
      for (let j = 0; j < works; j++) {
        cat.artworks.push({ id: `z${n++}`, artistId: id, title: `Obra z${n}`, year: '1700', yearSort: 1700 + j, img: `img/z${n}.jpg`, w: 10, h: 10, role: j ? 'new' : 'learn', fame: 3 - j, confidence: 'high' });
      }
    });
  }
  return cat;
}

// Catálogo variado (oleada 4): pintores con 3 obras (2 learn + 1 new), un movimiento con un solo
// pintor con etapa, una sala, obras con `look` y pintores sin `section`.
export function mixedCatalog() {
  const movements = [];
  const artists = [];
  const artworks = [];
  let n = 0;
  const shape = [[6, 3, 3], [3, 3], [4], [], [3, 5, 3, 3]]; // obras por pintor con etapa en cada movimiento
  shape.forEach((counts, mi) => {
    const m = mi + 1;
    movements.push({ id: `m${m}`, name: `Mov ${m}`, period: '', order: m, era: 'menu', blurb: `Blurb ${m}.`, accent: '#666666' });
    counts.forEach((count, ai) => {
      const id = `a${m}${ai + 1}`;
      artists.push({ id, name: `Pintor ${m}.${ai + 1}`, short: `A${m}${ai + 1}`, movementId: `m${m}`, order: ai + 1, guest: false,
        hint: `Fíjate en el rasgo de ${id}.`, traits: [`detalle uno de ${id}`, `detalle dos de ${id}`], similarTo: ai ? [`a${m}${ai}`] : [] });
      for (let w = 0; w < count; w++) {
        n++;
        const learnCount = count <= 3 ? 2 : Math.ceil(count / 2);
        artworks.push({ id: `x${n}`, artistId: id, title: `Obra ${n}`, year: '1800', yearSort: 1800 + n, img: `img/x${n}.jpg`, w: 10, h: 12,
          role: w < learnCount ? 'learn' : 'new', fame: 3 - (w % 3), confidence: 'high', ...(n % 2 ? { look: `Mira el detalle ${n}` } : {}) });
      }
    });
    // Invitados (distractores y, en m4, una sala).
    for (let g = 0; g < (counts.length ? 1 : 3); g++) {
      const id = `g${m}${g}`;
      artists.push({ id, name: `Invitado ${m}.${g}`, short: `G${m}${g}`, movementId: `m${m}`, order: 9 + g, guest: true, hint: '', traits: [], similarTo: [] });
      for (let w = 0; w < (counts.length ? 1 : 2); w++) {
        n++;
        artworks.push({ id: `x${n}`, artistId: id, title: `Obra ${n}`, year: '1800', yearSort: 1800 + n, img: `img/x${n}.jpg`, w: 10, h: 10, role: 'learn', fame: 1, confidence: 'high' });
      }
    }
  });
  return { version: 1, movements, artists, artworks };
}
