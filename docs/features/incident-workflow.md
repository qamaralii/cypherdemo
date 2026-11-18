# Incident Workflow Presentation

## Purpose and Current State
Offline booth demonstration contrasting human coordination with governed agent response. See [context.md](../../context.md) for the complete scene order, keyboard shortcuts, assets, and branching rules.

## Architecture and Ownership
- `HumanPanel.tsx`: selected chat exchanges, gradual findings, compact full-incident summary.
- `AgentRace.tsx`: routing, human navigation, response selections, approval feedback.
- `WorkflowPanel.tsx`: serial audit trail, timed preparation, visuals, and human controls.
- `BatchLabelScan.tsx` / `batch-label-scan.css`: Identification scan, crop-aware geometry, paused GSAP timeline driven by workflow progress; dusty blue for scanning/extraction and muted green for matching.
- `race.css`: unified approval styling, staged reveals, pause/reduced-motion animation rules.
- `config.ts`: response options and summary copy.
- `shared/workflow.ts` / `shared/humanMessages.ts`: agent roster, approval options, default drafts and the human-team script (moved out of the components so the phone companion uses the same words).
- `src/companion/`: optional Slack phone companion hooks; see [Slack companion](slack-companion.md).

## UI Behavior
- The original complaint scene copies the captured F3 frame into a cover-fit canvas before paint. Only the post/phone signal animate; the background stays opaque to prevent a blue flash.
- Muted human intro becomes visible on Start. Left from the intro delegates to scene navigation and returns to the complaint post.
- Human totals: 13 hrs 40 mins, 15 handoffs, 16 messages, 10 people. Displayed messages are selected exchanges; their sequence and timing stay unchanged.
- Direct Social Media launch; matching green cards, SVG ticks, blue mention detection, outreach/contact merge, 19-second stage including a final four-second hold.
- RCA replaces Find the Cause naming.
- Identification adapts the supplied Batch Label Scan prototype: photo sweep → packaging/label brackets → enlarged crop/OCR → extracted-code transfer → production-record match. Existing complaint asset is reused. Animation runs for 16 seconds with a final 4-second hold; left tasks follow scan/read/search milestones. Resize rebuilds geometry at current progress; reduced motion displays the completed visual. Prototype CDN/fonts, controls, legend, and looping are excluded.
- Pink unified approval panels eliminate duplicate headings. Response decisions are on the preparation page itself.
- Four later agents prepare for 4.5 seconds; controls become active afterward. Workflow progress retains elapsed time when paused.
- Public statement is editable and includes greeting/sign-off. Appreciation posts animate on opening.
- Full response runs Recall → Public Response → Customer Care; withdrawal-only skips public response; no action goes directly to adverse outcome.
- The Orchestrator Agent is presented as the **Planner Agent** everywhere (internal stage id stays `orchestrator`).
- **Start investigation** gate (`socialMediaApproval`) follows the Social Media Agent's run: its approval sits in the "Investigation ready" card (Planner is the hand-off target).
- The Planner stage reveals no findings: plan copy reads "Read the batch code from Sarah’s photo"; graph centre is "Sarah’s post"; cluster labels are neutral (Production lines · shifts, QC logs · holds, Stores · deliveries, Products · regions).
- With a phone paired, every gate waits for the phone ("Waiting for <name> on Slack"); `A` approves on its behalf. The QR card appears on the human-team summary.

## Verification
Commands: `npm run build`, `npx oxlint src`. Manual review covers keyboard navigation, preparation/approval pacing, selected regions/channels, editable drafts, pause/reduced motion, and all decision branches.

## Historical Sessions
- [2026-11-18 — Slack companion build](../sessions/2026-11-18-slack-companion.md) (Planner rename, Start-investigation gate, batch-free Planner, phone lock/override)
- [2026-10-06 — Batch label scan integration](../sessions/2026-10-06-batch-label-scan.md)
- [2026-10-06 — Complaint transition flash fix](../sessions/2026-10-06-complaint-transition.md)
- [2026-10-06 — Workflow simplification](../sessions/2026-10-06-workflow-simplification.md)
