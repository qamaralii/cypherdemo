# AGENTS.md

Guide for coding agents working in this repo. Read this first, then the feature doc for the area you touch.

## What this is
Intugle's booth demo for Cypher 2026. A laptop runs a cinematic React demo of a food-safety incident (YummChips, batch HLD-2407-A): human teams coordinate slowly, then Intugle agents resolve it with a person approving each step. An optional **Slack-style phone companion** lets a visitor scan a QR code and be that person on their own phone.

| Doc | Read it for |
| --- | --- |
| [context.md](context.md) | Scene order, presenter keys, visual rules, key laptop files |
| [docs/features/incident-workflow.md](docs/features/incident-workflow.md) | Laptop agent workflow (current state) |
| [docs/features/slack-companion.md](docs/features/slack-companion.md) | Phone companion, Supabase, Railway (current state) |
| [docs/decisions/slack-companion-architecture.md](docs/decisions/slack-companion-architecture.md) | Why the companion is built the way it is |
| [docs/README.md](docs/README.md) | Index of all feature, decision and session docs |

## Repo map
```text
src/                 laptop demo (Vite + React 19 + GSAP + Tailwind 4)
  config.ts          laptop content, assets, decisions, social posts
  components/        scenes; AgentRace.tsx (workflow controller), WorkflowPanel.tsx (workflow UI)
  companion/         laptop side of the phone companion (session, QR, relay)
shared/              single source of truth used by BOTH apps: copy, agent roster, laptop↔phone protocol
companion/           phone app (separate Vite root): derive.ts, App.tsx, session.ts, mock.ts, assets/
supabase/migrations/ SQL for the companion's session table and RPCs (apply in order)
public/assets/       laptop media (videos, music, images)
docs/                knowledge base (features = current state, sessions = history, decisions)
```

## Commands
```bash
npm install
npm run dev                 # laptop demo (default 5173; in the Claude Browser pane use 5199)
npm run dev:companion       # phone app on 5174 (LAN-reachable); add -- --port 5175 if taken
npm run build               # laptop: tsc -b + vite build → dist/
npm run build:companion     # phone: type-check + vite build → dist-companion/
npx oxlint src shared companion/src
```
There is no unit-test suite; verification is build + lint + manual runs (below).

## Environment
`.env.local` (gitignored; see `.env.example`), read by both apps:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable/anon key only — never a secret/service-role key), `VITE_COMPANION_URL` (phone URL encoded in the QR). Never print or commit their values. Without them the laptop runs laptop-only.

## Rules that must hold
- **Laptop-only mode must always work.** The companion is optional; no Supabase/network → no QR, demo unchanged.
- **The laptop is the source of truth.** It broadcasts its whole position (`DemoState`); the phone renders purely from it (`companion/src/derive.ts`). Don't add phone-side story state.
- **Every phone action is validated on the laptop** (token, current gate, ready, not paused). Approvals carry their final selections/text.
- **Shared copy lives in `shared/`**. Change agent names, options, drafts or the protocol there, not in one app.
- **New gates:** add to `WorkflowStage`, `GATE_STAGES`, `GATE_AGENT`, `stagePath()`, `AgentRace.advanceWorkflow/handlePrev/handleNext`, `WorkflowPanel` (visual + approvalAgent), and a `GateBlock` case on the phone.
- **Story integrity:** no batch number before the Identification Agent's result; no RCA findings before the RCA Agent (Planner stage, channel names, titles and graph labels stay neutral).
- **Phone channel hygiene:** at most two messages per agent (status goes into "typing…" or into the request); `#incidents` starts with no history.
- The Orchestrator agent is user-facing **Planner Agent**; its internal id stays `orchestrator`.
- Laptop core flow stays offline-capable with local assets; don't add CDNs, web fonts or external runtime assets there.
- Respect pause and `prefers-reduced-motion` in every animation.

## Database (Supabase)
- Table `demo_sessions` is closed to `anon`; access only via `security definer` RPCs with `search_path = ''` and explicit `grant execute ... to anon`.
- Schema changes = new timestamped file in `supabase/migrations/`. There is no CLI access to the hosting account: the user runs new SQL in the dashboard SQL editor. Test SQL first in a throwaway container (`docker run postgres:17-alpine`, create `anon`/`authenticated` roles, apply all migrations in order).
- Stores visitor first names and optional WhatsApp numbers (plus legacy emails): treat as personal data; don't log or export them.

## Testing manually (Claude Browser pane)
- Show the pane first; hidden/background tabs throttle animation and stall stage progress. Keep the laptop tab in front while a stage must advance.
- Run laptop on 5199 and phone on 5175 (`.claude/launch.json`, local). Another process may hold 5173/5174.
- Pair: on the laptop press `2` (human summary), read the QR link from `document.querySelector('[data-join-url]').dataset.joinUrl`, open it in a 375×812 tab.
- Hop keys `1`–`9` jump stages; `A` approves for the phone; `R` replays (new session).
- Phone without backend: `/?mock=summary|socialMedia|socialMediaApproval|resolution|recall|support|stayed` or `/?mock=outcome&decision=full|recall|nothing&comp=Hamper|Voucher`. Clear `localStorage` to re-see one-time steps (alert, WhatsApp step, report auto-open).
- Prefer reading state from the DOM (`.workflow-panel[data-stage]`, `.sl-*` classes) over screenshots.

## Deploying (Railway, project `passionate-smile`)
CLI: `npx @railway/cli` (user logs in themselves). Deploy a **clean export** so `.env.local` and untracked files never upload:
```bash
git archive feature/slack-companion | tar -x -C <scratch-dir>
```
```bash
npx @railway/cli up <scratch-dir> --path-as-root -s cypherdemo -e production --ci
```
- `cypherdemo` = phone app (`RAILPACK_BUILD_CMD=npm run build:companion`, `RAILPACK_SPA_OUTPUT_DIR=dist-companion`). `laptop-demo` = laptop app (default Vite static build).
- Never set a start command (breaks Railpack static serving); no `railway.json` (ignored/deprecated).
- `VITE_*` vars are baked at build time: redeploy after changing them. Uploads sometimes fail transiently; retry.
- Verify by fetching the page and grepping the built JS for a string you just added.

## Git and docs
- Work on `feature/slack-companion` (Railway deploys from it); don't commit to `main` without being asked.
- Check `git status`/`git diff` before committing: other people/sessions edit this tree.
- After meaningful work, update the feature doc (current state) and add a dated session doc under `docs/sessions/`, linked from `docs/README.md`.

## Gotchas
- Two Vite dev servers must not share a dependency cache (the companion uses `node_modules/.vite-companion`); otherwise 504 "Outdated Optimize Dep" and a blank page.
- Browsers block audio until a user gesture on the laptop page: press `F` before visitors arrive.
- Effects keyed on derived objects re-run on every broadcast; key timers on stable ids (see the alert/notice effects in `companion/src/App.tsx`).
- Page unload kills sockets and normal fetches; the laptop ends sessions with `keepalive` fetches on `pagehide`.
