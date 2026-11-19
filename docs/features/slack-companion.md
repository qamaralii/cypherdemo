# Slack Companion (phone)

## Purpose
Make the booth demo personal and memorable: the visitor becomes the **human in the loop** on their own phone. The laptop tells the story; the phone is a Slack-style workspace where each Intugle agent posts its update and asks the visitor for its approval. The visitor's taps drive the laptop.

## Current State
Live and tested laptop ↔ phone against the real backend (branch `feature/slack-companion`). Not yet tested on real iOS/Android handsets.

| Piece | Where it runs |
| --- | --- |
| Laptop demo (existing booth app + companion hooks) | Booth laptop (`npm run dev`), also hosted: https://laptop-demo-production.up.railway.app |
| Phone app (`companion/`) | Railway: https://cypherdemo-production-e62872af.up.railway.app |
| Relay + session store | Supabase (Realtime broadcast + Postgres RPCs), project currently in a friend's account |

### Visitor journey
1. Opening, videos, social post and the human-team thread run on the **laptop only**. No QR, no phone involvement.
2. **Human-team summary:** the laptop's right panel shows a QR card ("Now you take over"). The phone opens a join screen (optional first name), then `#incidents`.
3. `#incidents` looks like a freshly created Slack channel: name, "@Planner Agent created this channel today…", a description box, no history. Below it: **Unlock Intugle's Agentic Alpha** (starts the agents) and **I'll take my chances** (adverse outcome). The laptop shows "👋 <name> joined #incidents"; its own Unlock/Take-chances buttons still work.
4. **Social Media Agent run (19 s):** phone stays silent and the channel empty (`#general` gets a quiet "agents are on it" note).
5. **Run complete:** after a settle delay, a push-style banner + alarm + vibration; the channel fills with the alert (@-mentions the visitor, Sarah's post card) and the agent's second message carrying **🔍 Start investigation** (gate `socialMediaApproval`).
6. Each later agent: "typing…" while it works, then its request with Block-Kit-style controls, then (after approval) its result. **At most two messages per agent.**
   - **Agent graphics** mirror the laptop visual inside the existing messages (no extra messages): Sarah's photo in the Social Media alert card, the cropped printed batch label (`BATCH NO: HLD-2407-A`) under the Identification result, and a dark "Factory log search" window with the two red anomaly rows (134°C, 136°C) under the RCA result. Photos open full screen on tap. The Planner and later agents have no graphic.
7. Gates on the phone: Start investigation, Approve plan, response choice (3 radios), recall regions (checkboxes + Select all), public statement (✎ Edit + channel checkboxes), reply to Sarah (✎ Edit + Hamper/Voucher). Selections mirror live on the laptop.
8. **Outcome:** Planner Agent posts the outcome card with **📄 View your incident report**. 2.5 s later an **optional work-email step** appears (Skip always available), then the **incident report** sheet.
9. The session freezes at the outcome; the phone keeps its final channel and report. Replay (`R`) on the laptop creates a new session and QR.

### Laptop behaviour while a phone is paired
- At every gate the laptop's approval button is hidden; a "Waiting for <name> on Slack" banner (or, for Start investigation, a pill inside the "Investigation ready" card) replaces it. Enter/Right cannot bypass it.
- **Presenter override:** `A` approves the waiting gate on the phone's behalf (recorded as "Booth presenter").
- No pairing / no Supabase env / backend unreachable → the demo runs exactly as before (laptop-only).

## Architecture and Ownership

| Path | Role |
| --- | --- |
| `shared/protocol.ts` | Sync contract: `DemoState`, `PhoneAction`, gates (`GATE_STAGES`, `GATE_AGENT`), `stagePath()`, `applySelection()`, `DRAFT_FOR_GATE`, channel/event names, `AGENT_CHANNEL = 'incidents'`. |
| `shared/workflow.ts` | Agent roster (names, tasks, update copy), region/channel/compensation options, default drafts, `WorkflowStage` (incl. `socialMediaApproval`). Laptop and phone both import it. |
| `shared/humanMessages.ts` | Human-team chat script (laptop only now; phone no longer mirrors it). |
| `src/companion/CompanionProvider.tsx` | Laptop session lifecycle: create session on the opening screen, broadcast state, relay validated phone actions, end session at outcome / replay / page unload (keepalive). |
| `src/companion/CompanionQr.tsx` + `companion.css` | QR card on the human summary (`data-join-url` attribute for tests). |
| `src/components/AgentRace.tsx` | Publishes position (`publish(...)`), applies `PhoneAction`s, `approveGate()`, `A` override, `start`/`stayHuman`. |
| `src/components/WorkflowPanel.tsx` | `remoteDecider` lock, `onGateReadyChange`, phone-wait banner, `SocialMediaVisual` with the Start-investigation action. |
| `companion/src/derive.ts` | Pure `DemoState → channels/messages/gates/alert/start/report`. The phone keeps no story state of its own. |
| `companion/src/App.tsx` | Join screen, Slack shell, gates (Block-Kit style), notification banner, Edit sheet, email step, report sheet, Intugle-logo avatars. |
| `companion/src/session.ts` | Join/resume via RPC, Realtime subscription, `send`, `submitEmail`, 15 s ended-status safety poll. |
| `companion/src/alerts.ts` | Knock (approvals) and alarm (incident alert) via Web Audio, vibration, Screen Wake Lock. |
| `companion/src/mock.ts` | Dev-only `?mock=` driver (no laptop/Supabase). |
| `companion/src/assets/` | Compressed hamper/voucher JPEGs (~100 KB), Sarah's photo (`sarah-post.jpg`, 720 px, 88 KB), the batch-label crop (`batch-label.jpg`, region 1030,440 224×140 of `public/assets/social-post.png`), and the Intugle logo SVG. The RCA log rows come from `rcaLogExcerpt` in `shared/workflow.ts`. |
| `supabase/migrations/` | `demo_sessions` table + RPCs; visitor email columns. |
| `vite.companion.config.ts`, `tsconfig.companion.json` | Phone app build (root `companion/`, env from repo root, own Vite cache `node_modules/.vite-companion`). |

## Data Model / Persistence
Table `public.demo_sessions` (one row per demo run). Table is closed to `anon`; everything goes through `security definer` RPCs.

| Column | Meaning |
| --- | --- |
| `id` uuid | Session id (in the QR URL `?s=`). |
| `host_secret` uuid | Known only to the laptop; required to update state/status. |
| `decider_token` / `decider_name` | Set when the first phone joins; later scanners get `taken`. |
| `state` jsonb | Latest `DemoState` (for reconnects / reloads). |
| `status` | `open` → `live` (phone joined) → `ended` (outcome, replay or laptop unload). Ended is sticky. |
| `visitor_email`, `email_submitted_at` | Optional email from the phone's email step (lowercased). |

RPCs: `create_demo_session()`, `host_update_session(id, secret, state, status)`, `host_get_session(id, secret)`, `join_demo_session(id, name, token?)`, `submit_visitor_email(id, token, email)` (returns false for wrong token / invalid email; empty clears).

Export emails after the event (Supabase SQL editor):
```sql
select decider_name, visitor_email, email_submitted_at from demo_sessions where visitor_email is not null order by email_submitted_at;
```

## API or Interface Contract
- Realtime channel `demo:<sessionId>` (public broadcast). Events: `state` (laptop → phone, full `DemoState` with monotonic `seq`), `status` (`ended`), `action` (phone → laptop, `{ token, action }`), `joined`, `hello` (phone asks for a re-send).
- **State sync, not an event log:** the laptop broadcasts its whole position on every change; the phone renders whatever that implies. Navigation, hops, replay and reconnects therefore never desync.
- The laptop validates every action: right token, gate currently open and ready, not paused, not in feedback. Approvals carry their selections/final draft so late toggles can't change what was approved.
- `PhoneAction`: `start`, `stayHuman`, `chooseDecision`, `toggleRegion`, `setRegions`, `toggleChannel`, `setCompensation`, `setDraft` (live text, capped 1200 / 600), `approve` (+ `decisionId`/`regions`/`channels`/`compensation`/`draft`).
- `DemoState.agentMinutes` = laptop agent timer (elapsed ms / 30 000, same as its on-screen "mins"), used by the report.

## UI Behavior (phone)
- Opens in `#incidents`; `#general` holds only the welcome (no unread badge). Channel name/description in `CHANNELS`.
- No batch number appears before the Identification Agent's result (Planner stage, channel name and page title are batch-free; the laptop's Planner graph shows neutral cluster labels).
- Alert fires only when `stage === 'socialMediaApproval'`, never sooner than 4 s after the app opened (`SETTLE_MS`), ≥1.5 s after its trigger. Delivered alerts are remembered per session in `localStorage`; stepping the laptop back before the alert (stage `null` or `socialMedia`) re-arms it; a plain reload does not replay it.
- Approval requests (other gates): knock + short vibration + jump to `#incidents`.
- ✎ Edit: bottom sheet, live debounced `setDraft`, Cancel restores the original, Done keeps it; quote shows "(edited)".
- Report sheet: hero (Resolved / Partially resolved / Not resolved, visitor name), agents' time vs human team 13 hrs 40 min, decisions with approver ("You (Alex)", "Booth presenter", "Approved" for hopped steps, "rewritten by you" for edited drafts), findings, outcome, Sarah's Instagram-style update (hamper/voucher photo) on full/withdraw-only outcomes, optional "we'll be in touch at …".
- All agents and the Intugle bot use the Intugle logo (original orange, white tile) as their avatar; Sarah keeps "S".
- Branding of the shell is Slack-like by user decision (open item: trademark sign-off).

## Operations and Troubleshooting
- **Env** (`.env.local`, gitignored; template `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable/anon key only), `VITE_COMPANION_URL` (phone URL encoded in the QR). Restart dev servers after editing.
- **Run locally:** `npm run dev` (laptop), `npm run dev:companion` (phone, port 5174, LAN-reachable via `host: true`).
- **Mock phone (no backend):** `/?mock=summary|socialMedia|socialMediaApproval|resolution|recall|comms|support|stayed`, or `/?mock=outcome&decision=full|recall|nothing&comp=Hamper|Voucher`. Mock flags live in `localStorage` key `cypher-companion:*:mock` — clear it to re-see auto-open steps.
- **Migrations:** no CLI access to the Supabase account; run new files from `supabase/migrations/` in the dashboard SQL editor, in order.
- **Railway** (project `passionate-smile`, CLI via `npx @railway/cli`):
  - Service `cypherdemo` (phone): variables `RAILPACK_BUILD_CMD=npm run build:companion`, `RAILPACK_SPA_OUTPUT_DIR=dist-companion`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Do **not** set a start command (it disables Railpack static mode). `railway.json` was removed: Railway ignored it and config-as-code is deprecated (2026-12-01).
  - Service `laptop-demo` (laptop): default Railpack Vite static (`npm run build` → `dist`), variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_COMPANION_URL`. Not connected to GitHub.
  - Deploy a clean export (no `.env.local`, no untracked files):
    ```bash
    git archive feature/slack-companion | tar -x -C <scratch-dir> && npx @railway/cli up <scratch-dir> --path-as-root -s cypherdemo -e production --ci
    ```
    (`-s laptop-demo` for the laptop). Uploads occasionally fail with "error sending request"; retry.
  - `VITE_*` values are baked in at build time: redeploy after changing them.
- **Symptoms:** QR missing → no Supabase env or `create_demo_session` failed (laptop runs laptop-only). Phone "Couldn't connect" → migration missing or network. Phone stuck on "Sending…" → laptop page reloaded mid-run (now ends the session via keepalive; phone also polls every 15 s). Laptop blank page with 504 "Outdated Optimize Dep" → two dev servers sharing a Vite cache (fixed with `cacheDir`); reload.
- **Booth:** press `F` (fullscreen) before visitors arrive so the browser allows audio. Laptop needs internet (4G dongle/tether recommended). Use `A` if the phone goes quiet.

## Verification
- `npm run build`, `npm run build:companion`, `npx oxlint src shared companion/src`.
- SQL: migrations were exercised in a throwaway `postgres:17-alpine` container with `anon`/`authenticated` roles (one decider, wrong secret ignored, frozen ended sessions, email validation/clearing).
- Manual laptop ↔ phone runs in the Browser pane (laptop tab + 375×812 phone tab), using the QR card's `data-join-url`: pairing, phone start, alert timing, every gate, live selection/draft mirroring, `A` override, all four outcomes, report auto-open, email save, replay, reload/resume, laptop-unload end.
- Not verified: real handsets (Web Audio unlock, vibration, wake lock, on-screen keyboard with the Edit sheet), venue network.

## Known Gaps and Follow-Up Work
- [ ] Real-phone rehearsal (iPhone + Android over mobile data).
- [ ] Move Supabase to an Intugle-owned project before collecting real emails; add a privacy-policy link on the email step.
- [ ] Railway service `cypherdemo` still auto-deploys from `main` (would fail: no `build:companion` on `main`). Switch Source → Branch to `feature/slack-companion`, or merge.
- [ ] Trademark sign-off for the Slack look; confirm whether Intugle agents really integrate with Slack.
- [ ] Social Media Agent visual overflows ~60 px at 1440×810 (fits at 1920×1080).
- Dropped by decision: emailing the report, `#social-mentions` channel, agent threads.

## Historical Sessions
- [2026-11-18 — Slack companion build](../sessions/2026-11-18-slack-companion.md)
- [2026-11-19 — Agent graphics on the phone](../sessions/2026-11-19-companion-agent-graphics.md)

## Related Documentation
- Decision record: [Slack companion architecture](../decisions/slack-companion-architecture.md)
- Laptop workflow it drives: [Incident workflow presentation](incident-workflow.md)
