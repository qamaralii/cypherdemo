-- Slack companion: optional visitor email, collected on the phone just before the incident report.
-- Stored on the run's session row. Nothing is emailed; the team exports the list after the event.

alter table public.demo_sessions
  add column visitor_email text,
  add column email_submitted_at timestamptz;

-- Phone: save (or clear, with an empty value) the decider's email. Only the phone holding this run's
-- decider token can write it, and only once the session exists. Returns false for an invalid address.
create function public.submit_visitor_email(p_id uuid, p_token uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := lower(btrim(coalesce(p_email, '')));
begin
  if clean <> '' and (length(clean) > 254 or clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return false;
  end if;

  update public.demo_sessions
     set visitor_email = nullif(clean, ''),
         email_submitted_at = case when clean = '' then null else now() end,
         updated_at = now()
   where id = p_id and decider_token = p_token;

  return found;
end;
$$;

revoke all on function public.submit_visitor_email(uuid, uuid, text) from public;
grant execute on function public.submit_visitor_email(uuid, uuid, text) to anon, authenticated;

-- For the team after the event (run in the SQL editor; not callable with the public key):
--   select decider_name, visitor_email, email_submitted_at
--     from public.demo_sessions
--    where visitor_email is not null
--    order by email_submitted_at;
