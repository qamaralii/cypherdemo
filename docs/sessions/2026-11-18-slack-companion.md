# Session: 2026-11-18 | Slack companion build

Date: 2026-11-17 → 2026-11-18
Session Focus: Design (grill-me interview) and build a Slack-style phone companion where the visitor approves every agent decision, then iterate on it with the user and deploy it.
Commits (branch `feature/slack-companion`, all pushed):
- 7a815fd: Add Slack-style phone companion for the booth demo (tier 1)
- 3b29af1: Deploy companion via Railpack static site; document setup
- ae6bff7: Companion: fix outcome wording; expose QR join URL as data attribute
- 4e660ac: Companion joins after the human thread; Social Media alert; Planner Agent
- ed5bdfa: Add “Start investigation” approval after the Social Media Agent
- 307cf0a: Companion: alert only after the Social Media run completes
- 1636c4d: Companion: open in the incident channel, empty start, re-arm alert
- eab7a38: Companion: #incidents channel with a natural intro; max two messages per agent
- 3a4a3d9: Companion: drop the decorative pills from the #incidents intro
- dcec9e6: Phone offers “I'll take my chances”; Planner graph no longer shows findings
- 4f58cab: Companion: incident report at the end of the run
- e7e3560: Companion: edit the public statement and Sarah's reply from the phone
- a3776e3: Companion: optional work email just before the incident report
- 92a558e: Companion: Intugle logo as every agent's display picture
- d6d687e: Docs: record the hosted laptop-demo Railway service

---

## Summary
Started from brainstorming interactivity ideas for the booth demo; the user chose a Slack-like phone companion. After a 19-question grill-me interview, Tier 1 was built (shared content module, Supabase session relay, phone app, laptop lock + override) and deployed to Railway. The user then iterated: the phone now joins only at the human summary, opens in an empty `#incidents` channel, receives an incident alert after the Social Media run, approves a new "Start investigation" gate, edits drafts, and gets an incident report preceded by an optional email step. The Orchestrator Agent was renamed Planner Agent, batch/finding leaks before the right agent were removed, and the laptop demo was also hosted on Railway.

---

## Decisions
Full table with rationale and rejected alternatives: [Slack companion architecture](../decisions/slack-companion-architecture.md). Headlines:
- Cloud relay via Supabase; one decider per run; phone primary with `A` presenter override; laptop-only fallback.
- State sync (laptop broadcasts whole position) instead of an event log; sessions freeze at outcome/replay.
- Shared `shared/` module is the single source of truth for copy, roster and protocol.
- Railway hosts both apps from branch `feature/slack-companion`.
- Scope: email-the-report dropped; `#social-mentions` and agent threads dropped; final report and draft editing built.

---

## Changes Made

### Fixes
- **Railway built the wrong app**
  - Broken: first deploy built the laptop demo; `railway.json` build/start commands were ignored.
  - Root cause: Railway uses Railpack, which auto-detected Vite and ignored deprecated config-as-code.
  - Fix: service variables `RAILPACK_BUILD_CMD=npm run build:companion` + `RAILPACK_SPA_OUTPUT_DIR=dist-companion`; deleted `railway.json`; never set a start command.
- **Toast/alert never cleared or never switched channel**
  - Root cause: effects re-ran on every derived-state object change (and StrictMode double-run), cancelling their own timers.
  - Fix: key effects on stable ids (`alertId`), put timers in the effect owned by the visible notice.
- **Phone stuck on "Sending…" after laptop reload**
  - Root cause: WebSocket sends and normal fetches are cancelled during page unload.
  - Fix: `pagehide` sends `keepalive` fetches to `host_update_session` and Realtime's HTTP broadcast endpoint; phone also polls status every 15 s.
- **Alarm replayed after phone reload / not replayed after stepping back**
  - Fix: delivered alerts persisted per session in `localStorage`; cleared when laptop state goes back before the alert (`stage` null or `socialMedia`).
- **Blank laptop page (504 Outdated Optimize Dep) with both dev servers running**
  - Root cause: both Vite dev servers shared `node_modules/.vite`.
  - Fix: companion `cacheDir: node_modules/.vite-companion`.
- **Batch and RCA findings shown too early**: Planner plan copy, graph centre label and cluster labels (Line 4, seal logs, 40 stores · 7 cities, affected range), channel name and page title made neutral.
- **Self-mention collision**: visitor named like a human-script character got highlighted in human messages (moot after human mirroring was removed).
- Copy: "a apology hamper"; duplicated human-time line removed from the report.

### Refactors
- **Shared content module**: human messages moved out of `HumanPanel.tsx`; agent roster, options and default drafts out of `WorkflowPanel.tsx`/`AgentRace.tsx` into `shared/`.
- **Approval entry point**: `approveGate(stage, by)` in `AgentRace` handles phone, presenter override and laptop UI; resolution and Start-investigation advance directly, others show feedback.
- **Companion CSS** moved out of `landing-page.css` into `src/companion/companion.css` when the QR left the opening screen.

### Design Changes
- New workflow stage/gate `socialMediaApproval` between Social Media and Planner (laptop: approval inside the "Investigation ready" card).
- Orchestrator Agent → **Planner Agent** (internal id `orchestrator` kept).
- `DemoState` gained `agentMinutes`; `PhoneAction` gained `start`, `stayHuman`, `setDraft`; approvals carry `draft`.
- Phone: `#incidents` channel, empty-state Unlock / I'll take my chances, push-style alert, two-message cap, incident report, Edit sheet, email step, Intugle-logo avatars.
- Supabase: `demo_sessions` + RPCs; later `visitor_email`, `email_submitted_at`, `submit_visitor_email`.
- Railway: services `cypherdemo` (phone) and `laptop-demo` (laptop) in project `passionate-smile`.

---

## Learnings & Insights
- The Browser pane throttles hidden tabs: front the laptop tab while a stage must advance; the phone tab can stay in the background.
- Read live state from the DOM (`data-join-url`, `.workflow-panel[data-stage]`) instead of screenshots; the pane renders at small scale.
- Supabase-js requests are not visible to the pane's network inspector; expose ids in the DOM for tests.
- Vite inlines assets under 4 KB (the logo SVG becomes a data URI) — grep the bundle for `data:image/svg+xml`, not a filename.
- `sharp-cli` via `npx` (in a scratch dir) is a dependency-free way to compress images; no Python imaging libraries are installed.
- Another session/person edited `App.tsx` once and it was swept into commit 3a4a3d9 ("stores affected" wording). Check `git diff` before committing.

---

## Behavioral / Configuration Updates
- `.env.local` (gitignored) holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_COMPANION_URL`; `.env.example` documents them.
- New npm scripts: `dev:companion`, `build:companion`, `start:companion`. New TS project `tsconfig.companion.json`; `tsconfig.app.json` includes `shared`.
- Laptop `HostControls` lists `A` (approve for the paired phone) and "Planner Agent plan".
- `.claude/launch.json` (untracked, local) runs `demo` on 5199 and `companion` on 5175 for the Browser pane.
- Added root `AGENTS.md` for future coding agents.

---

## Outstanding Items
- [ ] Real-phone rehearsal on iPhone + Android over mobile data (alarm, vibration, wake lock, Edit sheet with the on-screen keyboard).
- [ ] Switch Railway service `cypherdemo` auto-deploy branch from `main` to `feature/slack-companion` (or merge the branch).
- [ ] Move Supabase to an Intugle-owned project before real email collection; add privacy-policy link on the email step; delete the test row `booth-test@example.com`.
- [ ] Trademark sign-off for the Slack look; confirm the "works in Slack" claim.
- [ ] Optional: tighten the Social Media Agent visual for 1440×810 screens (~60 px overflow).

---

## Related Documentation
- Feature (current state): [Slack companion (phone)](../features/slack-companion.md)
- Feature (laptop workflow changes): [Incident workflow presentation](../features/incident-workflow.md)
- Decision: [Slack companion architecture](../decisions/slack-companion-architecture.md)
- Agent guide: [AGENTS.md](../../AGENTS.md)

---

Generated by session-memory-scribe
