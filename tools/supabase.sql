-- Esquema de la nube de Sfumato (proyecto de Supabase «sfumato»). Se aplica una vez, como migración.
-- Una fila por cuenta con el paquete de progreso (formato de app/js/state/mudanza.js). RLS: cada cuenta solo ve
-- y toca su fila. La app no usa nunca la clave de servicio.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "progress: leer la mía" on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "progress: crear la mía" on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "progress: cambiar la mía" on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: borrar la mía" on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.progress from anon;

-- XP del paquete (0 si falta o no es un número).
create or replace function public.progress_xp(p jsonb) returns numeric
  language sql immutable set search_path = ''
as $$
  select case when jsonb_typeof(p -> 's' -> 'progress' -> 'xp') = 'number'
    then (p -> 's' -> 'progress' ->> 'xp')::numeric else 0 end
$$;

-- Guarda el paquete de quien llama si no hay en la nube algo más avanzado (más XP); con p_force, siempre
-- («Empezar de cero»). Devuelve true si lo ha guardado. Corre con los permisos de quien llama (RLS).
create or replace function public.save_progress(p_state jsonb, p_force boolean default false) returns boolean
  language plpgsql security invoker set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n int;
begin
  if me is null then raise exception 'sin sesión'; end if;
  if pg_column_size(p_state) > 2000000 then raise exception 'paquete demasiado grande'; end if;
  insert into public.progress as p (user_id, state, updated_at) values (me, p_state, now())
  on conflict (user_id) do update set state = excluded.state, updated_at = now()
    where p_force or public.progress_xp(p.state) <= public.progress_xp(excluded.state);
  get diagnostics n = row_count;
  return n > 0;
end
$$;

-- «Borrar mi cuenta y datos»: borra la cuenta de quien llama (y su progreso, en cascada).
create or replace function public.delete_my_account() returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from auth.users where id = auth.uid();
end
$$;

-- Latido para que el plan gratuito no se pause (.github/workflows/supabase-despierta.yml): no lee ningún dato.
create or replace function public.ping() returns integer
  language sql stable set search_path = ''
as $$ select 1 $$;

revoke execute on function public.save_progress(jsonb, boolean) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.progress_xp(jsonb) from public, anon;
grant execute on function public.save_progress(jsonb, boolean) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.progress_xp(jsonb) to authenticated;
grant execute on function public.ping() to anon, authenticated;
