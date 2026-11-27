// PKCE (RFC 7636): un secreto de un solo uso que se queda en el navegador y su huella SHA-256, que viaja a Google.
// Así el código de vuelta no sirve a nadie que no tenga el secreto.

const VERIFIER_BYTES = 32;

export function base64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function makeVerifier(cryptoApi = globalThis.crypto) {
  return base64Url(cryptoApi.getRandomValues(new Uint8Array(VERIFIER_BYTES)));
}

export async function challengeOf(verifier, cryptoApi = globalThis.crypto) {
  const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}
