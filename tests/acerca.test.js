// «Acerca de Sfumato»: página propia (#acerca), enlazada desde Ajustes, con autora y enlace a «Fuentes y créditos», sin contacto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRoute } from '../app/js/ui/router.js';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const src = (p) => readFileSync(join(app, p), 'utf8');

test('acerca: ruta #acerca y enlace desde Ajustes', () => {
  assert.deepEqual(parseRoute('#acerca'), { name: 'about' });
  assert.match(src('js/ui/screens/profile-settings.js'), /data-action="about"/);
  assert.match(src('js/main.js'), /case 'about'/);
});

test('acerca: nombre de la autora, enlace a fuentes y nada de contacto, ayer/mañana ni colores a mano', () => {
  const js = src('js/ui/screens/about.js');
  assert.match(js, /María Medina Cañete/);
  assert.match(js, /href="#fuentes"/);
  assert.doesNotMatch(js, /@|mailto:|tel:|\bayer\b|\bmañana\b/i);
  assert.doesNotMatch(src('css/acerca.css'), /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
});
