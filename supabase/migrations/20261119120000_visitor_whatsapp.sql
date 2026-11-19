-- Slack companion: optional WhatsApp number, collected on the phone just before the incident report.
-- Replaces the email step in the app. The email columns and RPC from 20261118160000 stay so nothing
-- already collected is lost; the app no longer calls submit_visitor_email.
-- Nothing is sent to the number automatically; the team exports the list after the event.

alter table public.demo_sessions
  add column visitor_whatsapp text,
  add column whatsapp_submitted_at timestamptz;

-- Phone: save (or clear, with an empty value) the decider's WhatsApp number in E.164 form (+<country code><number>).
-- Spaces, dashes, dots and brackets are ignored. Only the phone holding this run's decider token can write it.
-- Returns false for an invalid number or a wrong token.
create function public.submit_visitor_whatsapp(p_id uuid, p_token uuid, p_number text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := regexp_replace(btrim(coalesce(p_number, '')), '[\s().-]', '', 'g');
begin
  if clean <> '' and clean !~ '^\+[1-9][0-9]{7,14}$' then
    return false;
  end if;

  update public.demo_sessions
     set visitor_whatsapp = nullif(clean, ''),
         whatsapp_submitted_at = case when clean = '' then null else now() end,
         updated_at = now()
   where id = p_id and decider_token = p_token;

  return found;
end;
$$;

revoke all on function public.submit_visitor_whatsapp(uuid, uuid, text) from public;
grant execute on function public.submit_visitor_whatsapp(uuid, uuid, text) to anon, authenticated;

-- For the team after the event (run in the SQL editor; not callable with the public key):
--   select decider_name, visitor_whatsapp, whatsapp_submitted_at
--     from public.demo_sessions
--    where visitor_whatsapp is not null
--    order by whatsapp_submitted_at;
