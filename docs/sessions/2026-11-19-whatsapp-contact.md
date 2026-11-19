# Session: 2026-11-19 | WhatsApp number instead of email

Date: 2026-11-19
Session Focus: Replace the optional work-email step before the incident report with an optional WhatsApp-number step.

## Changes Made
- New migration `supabase/migrations/20261119120000_visitor_whatsapp.sql`: columns `visitor_whatsapp`, `whatsapp_submitted_at`; RPC `submit_visitor_whatsapp(p_id, p_token, p_number)` (security definer, `search_path = ''`, granted to `anon`). Strips spaces, dashes, dots and brackets, requires E.164 (`^\+[1-9][0-9]{7,14}$`), empty clears, wrong token returns false. Email columns/RPC left in place (additive change; earlier entries survive).
- Phone (`companion/src/App.tsx`): `WhatsappStep` replaces `EmailStep`: WhatsApp icon, country-code box pre-filled `+91` (booth in India) plus number field (`type="tel"`), client-side E.164 check, leading trunk `0` dropped, a number typed with `+code` overrides the box. Skip still available. Report thanks line: "The Intugle team will message you on WhatsApp at …".
- `session.ts`: `submitWhatsapp` calls the new RPC; mock mirrors validation. One-time flag key is now `cypher-companion:whatsapp-step:<sid>`.

## Verification
- Migrations applied in order in a throwaway `postgres:17-alpine` with `anon`/`authenticated`: `+91 98765 43210` saved as `+919876543210`; no `+`, too short, letters, wrong token rejected; table still closed to `anon`.
- Mock outcome at 375×812: invalid number shows the error; `098765 43210` with `+91` saves as `+919876543210`; report shows the thanks line.
- Live (after the user ran the SQL, deployed 4b16dfe to both Railway services): hosted laptop + hosted phone run saved `+447700900123` and showed the thanks line. Test row to delete: name BoothTest.

## Related Documentation
- [Slack companion (phone)](../features/slack-companion.md)
- [Slack companion architecture](../decisions/slack-companion-architecture.md)
