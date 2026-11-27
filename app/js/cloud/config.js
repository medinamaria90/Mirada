// Proyecto de Supabase (acceso con Google y progreso en la nube). La clave anónima es pública por diseño: solo
// deja hacer lo que permiten las reglas de la base (RLS: cada cuenta lee y escribe solo su fila). La clave de
// servicio nunca va aquí. Vacío = sin cuenta: el botón no aparece y no se hace ninguna petición.
// .github/workflows/supabase-despierta.yml lee estos dos valores de este archivo.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const cloudReady = (url = SUPABASE_URL, key = SUPABASE_ANON_KEY) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && key.length > 0;
