-- Slack companion: one row per booth demo run.
-- The table is closed to the publishable (anon) key. Everything goes through the security-definer
-- functions below, which check the laptop's host secret or the phone's decider token.

create table public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  host_secret uuid not null default gen_random_uuid(),
  decider_token uuid,
  decider_name text,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'live', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index demo_sessions_created_at_idx on public.demo_sessions (created_at desc);

alter table public.demo_sessions enable row level security;
revoke all on public.demo_sessions from anon, authenticated;

-- Laptop: start a run. The host secret never leaves the laptop.
create function public.create_demo_session()
returns table (id uuid, host_secret uuid)
language sql
security definer
set search_path = ''
as $$
  insert into public.demo_sessions default values
  returning demo_sessions.id, demo_sessions.host_secret;
$$;

-- Laptop: persist the latest position (for phones that reconnect) and optionally change status.
create function public.host_update_session(p_id uuid, p_secret uuid, p_state jsonb, p_status text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.demo_sessions
     set state = coalesce(p_state, state),
         status = case
           when status = 'ended' then 'ended'
           when p_status in ('open', 'live', 'ended') then p_status
           else status
         end,
         updated_at = now()
   where id = p_id and host_secret = p_secret;
end;
$$;

-- Laptop: who is the decider? The token lets the laptop reject actions from anyone else.
create function public.host_get_session(p_id uuid, p_secret uuid)
returns table (decider_token uuid, decider_name text, status text)
language sql
security definer
set search_path = ''
as $$
  select s.decider_token, s.decider_name, s.status
    from public.demo_sessions s
   where s.id = p_id and s.host_secret = p_secret;
$$;

-- Phone: claim the decider seat, or resume it with the token saved on this phone.
-- Exactly one phone per run. Later scanners get reason 'taken'.
create function public.join_demo_session(p_id uuid, p_name text, p_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.demo_sessions;
  clean_name text := left(nullif(btrim(coalesce(p_name, '')), ''), 32);
begin
  select * into s from public.demo_sessions where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if s.decider_token is not null then
    if p_token is not null and p_token = s.decider_token then
      return jsonb_build_object('ok', true, 'token', s.decider_token, 'name', s.decider_name, 'state', s.state, 'status', s.status);
    end if;
    return jsonb_build_object('ok', false, 'reason', case when s.status = 'ended' then 'ended' else 'taken' end);
  end if;

  if s.status = 'ended' then
    return jsonb_build_object('ok', false, 'reason', 'ended');
  end if;

  update public.demo_sessions
     set decider_token = gen_random_uuid(),
         decider_name = coalesce(clean_name, 'Guest'),
         status = 'live',
         updated_at = now()
   where id = p_id
  returning * into s;

  return jsonb_build_object('ok', true, 'token', s.decider_token, 'name', s.decider_name, 'state', s.state, 'status', s.status);
end;
$$;

revoke all on function public.create_demo_session() from public;
revoke all on function public.host_update_session(uuid, uuid, jsonb, text) from public;
revoke all on function public.host_get_session(uuid, uuid) from public;
revoke all on function public.join_demo_session(uuid, text, uuid) from public;

grant execute on function public.create_demo_session() to anon, authenticated;
grant execute on function public.host_update_session(uuid, uuid, jsonb, text) to anon, authenticated;
grant execute on function public.host_get_session(uuid, uuid) to anon, authenticated;
grant execute on function public.join_demo_session(uuid, text, uuid) to anon, authenticated;
