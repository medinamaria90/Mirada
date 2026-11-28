// Con una hoja o diálogo modal abierto, el fondo no se desplaza (Android encadenaba el scroll hacia lo de detrás).
// Sin navegador: comprueba que el CSS bloquea el documento mientras haya un <dialog open> y que el diálogo no encadena.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'css', 'main.css'), 'utf8');

test('hojas: el documento no se desplaza con un diálogo abierto', () => {
  assert.match(css, /html:has\(dialog\[open\]\)\s*\{[^}]*overflow:\s*hidden/);
});

test('hojas: el scroll del diálogo no se encadena al fondo', () => {
  assert.match(css, /(^|\n)dialog\s*\{[^}]*overscroll-behavior:\s*contain/);
});

test('hojas: un diálogo más alto que la pantalla se desplaza por dentro', () => {
  assert.match(css, /\.card-dialog\s*\{[^}]*max-height:\s*92dvh;\s*overflow-y:\s*auto/);
  assert.match(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'css', 'profile.css'), 'utf8'), /\.sheet-dialog\s*\{[^}]*overflow-y:\s*auto/);
});
