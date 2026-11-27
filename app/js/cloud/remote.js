// Progreso en la nube: tabla `progress` (una fila por cuenta, protegida con RLS) y dos funciones de la base,
// `save_progress` (guarda solo si no hay en la nube algo más avanzado, salvo `force`) y `delete_my_account`.
// El esquema está en tools/supabase.sql.

// Tope del cuerpo de una petición con keepalive (el navegador no admite más de 64 KB entre todas las pendientes).
const KEEPALIVE_MAX = 60 * 1024;

export function createRemote({ url, key, fetchFn = (...a) => fetch(...a) }) {
  const headers = (s) => ({ apikey: key, Authorization: `Bearer ${s.access}`, 'Content-Type': 'application/json' });
  const rpc = (s, name, data, { keepalive = false } = {}) => {
    const body = JSON.stringify(data);
    return fetchFn(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(s), body, keepalive: keepalive && body.length <= KEEPALIVE_MAX });
  };

  return {
    // Paquete guardado (formato de state/mudanza.js) o null si aún no hay nada.
    async load(s) {
      const res = await fetchFn(`${url}/rest/v1/progress?select=state&user_id=eq.${encodeURIComponent(s.user.id)}`, { headers: headers(s) });
      if (!res.ok) throw new Error(`progress ${res.status}`);
      const rows = await res.json();
      return Array.isArray(rows) && rows[0] ? rows[0].state : null;
    },
    // true si se ha guardado; false si la nube tenía algo más avanzado. `keepalive`: al irse de la página.
    async save(s, payload, { force = false, keepalive = false } = {}) {
      const res = await rpc(s, 'save_progress', { p_state: payload, p_force: force }, { keepalive });
      if (!res.ok) throw new Error(`save ${res.status}`);
      return (await res.json()) === true;
    },
    async deleteAccount(s) {
      const res = await rpc(s, 'delete_my_account', {});
      if (!res.ok) throw new Error(`delete ${res.status}`);
    },
  };
}
