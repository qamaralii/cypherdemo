# Decision: Slack companion architecture

Date: 2026-11-17 → 2026-11-18 (decided in a grill-me interview with the user, then refined during the build)
Feature: [Slack companion (phone)](../features/slack-companion.md)
Session: [2026-11-18 — Slack companion build](../sessions/2026-11-18-slack-companion.md)

| # | Decision | Why | Alternatives rejected |
| --- | --- | --- | --- |
| 1 | Cloud relay: phone uses its own mobile data, laptop connects out to a hosted service. | Asking visitors to join a laptop hotspot loses people; only the laptop's connectivity has to be controlled. | Laptop-only LAN hotspot; hybrid. |
| 2 | One visitor (decider) per run; later scanners get "taken". | Unambiguous human in the loop; governance story. Data model allows observers later. | Decider + observers; group voting. |
| 3 | Phone is primary for approvals; laptop shows "Waiting for <name> on Slack"; hidden presenter override `A`; laptop-only mode when no phone. | The pause on the big screen is the "aha"; a stalled booth demo is fatal. | Phone only; either device first-wins. |
| 4 | Slack Block-Kit-style controls (buttons, radios, checkboxes); drafts as quotes with optional Edit sheet. | Fast on a phone, credible "agents in your Slack"; typing optional. | Full forms; approve-only buttons. |
| 5 | Same repo, shared content module (`shared/`); the laptop sends **state**, not copy. | One source of truth for every word; tiny versionable messages. | Separate repo; full payloads over the wire. |
| 6 | **State sync** (laptop broadcasts its whole position; phone derives everything) rather than an event log. | Navigation, hops, replay and reconnects can never desync. | Append-only event log. |
| 7 | Session freezes at the outcome or replay; replay creates a new session/QR. | Replay must not wipe a visitor's finished channel. | Rolling the phone back on replay. |
| 8 | Supabase (Realtime broadcast + Postgres + security-definer RPCs), cloud from day one; Railway hosts the phone app; work on branch `feature/slack-companion`. | Least custom code; user preference for Railway and a dedicated branch. | Cloudflare Durable Objects, Node/Socket.IO, Vercel, local-first dev. |
| 9 | Slack-faithful look, chosen by the user over Intugle-branded. | User preference. Open item: trademark sign-off and integration claim. | Slack-familiar but Intugle-branded. |
| 10 | Phone joins only after the human thread (QR on the human summary); phone never mirrors human chat. | Keep the cinematic part on the laptop; phone starts at "now you take over". | QR on opening screen, human mirroring (built in Tier 1, then removed). |
| 11 | Agents' channel `#incidents`, fresh-channel intro, no history; at most two messages per agent; Intugle logo as every agent's avatar (no per-agent colour). | Avoid crowding a small screen; branding; natural Slack feel. | Busy per-step messages, threads, coloured initials. |
| 12 | Incident alert only after the Social Media run completes, with a settle delay; a "Start investigation" HITL gate follows it. | The notification should mark the moment the problem is confirmed, not interrupt the start. | Alert on agent start. |
| 13 | No batch number before the Identification Agent finds it (Planner stage, channel, title and graph labels neutral). | Story integrity: the planner can't know findings yet. | — |
| 14 | Optional email stored in Supabase; nothing is emailed. | Lead capture without email infrastructure (DNS/provider). | Emailing the report (dropped). |
| 15 | Tier 2 scope: final report and draft editing kept; `#social-mentions` and agent threads dropped. | `#social-mentions` no longer fits once the phone joins late; threads conflict with the two-message cap. | — |

Security notes: the table is closed to `anon`; the laptop proves itself with `host_secret`, the phone with `decider_token`; actions with the wrong token are ignored by the laptop; session ids are unguessable UUIDs. Realtime channels are public broadcast (acceptable for a booth demo; nothing sensitive is broadcast).
