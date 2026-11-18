# Slack Companion (phone)

The demo stays on the laptop through the videos and the human-team thread. When the human summary appears, the laptop shows a QR code;
the visitor joins a Slack-style workspace on their phone and taps “Unlock Intugle's Agentic Alpha” to start the agents.
The phone opens in #incidents: a fresh Slack channel (name, creator, description; no history) plus the Unlock button (#general holds only the welcome). While the Social Media Agent runs, the channel stays empty and silent. Once its run completes (and at least 4 s after the app opened), an urgent alert arrives (push-style banner, alarm, vibration) that @-mentions the visitor and fills the channel. Stepping the laptop back before the alert re-arms it; a plain phone reload does not replay it.
When its run finishes, the Social Media Agent asks the visitor to **Start investigation** (a HITL gate, `socialMediaApproval`) before the Planner Agent begins.
Each later approval is likewise posted by its agent and answered from the phone. The agents' channel is `#incidents`:
each agent posts at most two messages (status lines are folded into its request; it shows as typing while it works);
no batch number appears before the Identification Agent finds it (the Planner Agent stage is batch-free on both screens).
At the outcome, the Planner Agent's message links an **Incident report** (auto-opens once, 2.5 s later): the visitor's decisions and who approved each, agents' time vs the human team's 13 hrs 40 min, findings, outcome, and Sarah's hamper/voucher post on good outcomes. Phone photos are compressed copies in `companion/src/assets/`.
The public statement and the reply to Sarah have an **✎ Edit** button on the phone: a bottom sheet whose text shows live in the laptop's draft box (Cancel restores it; the approval carries the final text). The report notes “rewritten by you”.
Just before the report first opens, the phone asks for an optional work email (Skip is always available). It is stored on the run's `demo_sessions` row (`visitor_email`, `email_submitted_at`) via `submit_visitor_email`; nothing is emailed. Export after the event in the Supabase SQL editor: `select decider_name, visitor_email, email_submitted_at from demo_sessions where visitor_email is not null order by email_submitted_at;`
The laptop waits for the phone at every gate (presenter override: `A`). With no Supabase env vars the demo runs laptop-only.

## Pieces
- `shared/` — human script, agent roster, approval options, sync protocol (`DemoState` laptop → phone, `PhoneAction` phone → laptop).
- `src/companion/` — laptop session lifecycle (one Supabase session per run), QR card, action relay.
- `companion/` — the phone app. `derive.ts` turns `DemoState` into channels/messages; the phone never keeps its own story state.
- `supabase/migrations/` — `demo_sessions` table behind security-definer RPCs (one decider per run, host secret, frozen sessions).

## Environment (`.env.local`, see `.env.example`)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable/anon key only), `VITE_COMPANION_URL` (phone app URL encoded in the QR).

## Run
- Laptop demo: `npm run dev`
- Phone app: `npm run dev:companion` (port 5174, LAN-reachable). Mock without backend: `/?mock=resolution` (also `summary`, `socialMedia`, `recall`, `comms`, `support`, `stayed`, and `outcome` with `&decision=full|recall|nothing&comp=Hamper|Voucher`).

## Deploy (Railway, project `passionate-smile`, service `cypherdemo`)
Railpack serves the phone app as a static site with Caddy. Service variables:
- `RAILPACK_BUILD_CMD=npm run build:companion`
- `RAILPACK_SPA_OUTPUT_DIR=dist-companion`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (baked in at build time; redeploy after changing)

Do not set a start command: it disables Railpack's static-site mode.
