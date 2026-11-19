# Session: 2026-11-19 | Critical alert and no public statement

Date: 2026-11-19
Session Focus: Make the Social Media Agent's phone alert feel urgent, and remove the public statement step from the whole demo.

## Summary
1. The phone's Social Media alert is now a **critical incident banner**: red gradient, white ⚠ icon, a blinking "Critical · P1 incident" tag, shake and pulsing glow, a red screen flash behind it, a two-tone siren (6 beeps, ~1.4 s; replaced the same day by a calm rising three-note chime played twice, at the user's request) and a longer vibration (`[400,120,400,120,400,120,700]`). It stays 9 s (was 6 s) or until tapped. The alert message in `#incidents` carries the same red tag.
2. The **Public Response Agent / `comms` gate is gone** from laptop, phone and protocol. Recall now goes straight to Customer Care for both response branches.

## Decisions
- User chose to **keep all three response options and their titles** ("Withdraw stock and issue public statement" still exists and still leads to the good outcome; "Withdraw stock only" still leads to the partial outcome) and only drop the step. Consequence: the two branches run the same agents; only the outcome differs.

## Changes Made
- `shared/protocol.ts`: `GateStage` without `comms`; `DraftField = 'customerDraft'`; `DemoState` without `channels`/`publicDraft`; `PhoneAction` without `toggleChannel` and `approve.channels`; `stagePath()` tail is always `recall → support`.
- `shared/workflow.ts`: `comms` removed from `WorkflowStage` and the roster; `channelOptions` and `defaultPublicDraft` removed.
- Laptop: `AgentRace.tsx` (state, advance/prev, phone actions, `A` override) and `WorkflowPanel.tsx` (`CommsVisual`, comms feedback, skipped-card logic) cleaned up. Old `.comms-workspace`/`.feedback-comms` CSS in `race.css` is now unused but harmless.
- Phone: comms `GateBlock`, outcome line "Public statement published on N channels" and the report's "Public statement" decision row removed; `alerts.ts` siren; `App.tsx`/`slack.css` critical banner, flash and tag.
- Not touched: legacy, unimported screens (`DecisionScreen`, `ExecutionScreen`, `AgentPanel`) and config `execAgents`/`executionNodes`, which still mention a Comms Agent.

## Verification
Live pairing (laptop 5199 + phone 5175 via Supabase): critical banner, flash and tag render on the alert; phone approvals for response → recall → support advance the laptop resolution → recall → **support** → outcome; phone channel has no public-statement messages; outcome card and laptop outcome are correct. Both builds and oxlint pass. Siren and vibration not checked on a real phone.

## Related Documentation
- [Slack companion (phone)](../features/slack-companion.md)
- [Incident workflow presentation](../features/incident-workflow.md)
