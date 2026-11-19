# Session: 2026-11-19 | Agent graphics on the phone

Date: 2026-11-19
Session Focus: Show the laptop's agent graphics in the Slack companion so the phone is more visual.

## Summary
The user asked for the graphic each agent shows on the laptop to appear on the phone too, but only for three agents: Social Media (Sarah's photo), Identification (the cropped batch number from that photo) and RCA (the dark factory-log window with the detected red log rows). The Planner and the response agents get none.

## Changes Made
- `Card` (alert/result) gained an optional `media: 'sarahPhoto' | 'batchLabel' | 'factoryLog'` in `companion/src/derive.ts`; the graphics ride on existing messages, so the two-messages-per-agent cap holds.
- `MediaView` in `companion/src/App.tsx`: Slack-style image attachment with filename and tap-to-enlarge lightbox; `FactoryLog` renders the log window in HTML/CSS (crisper and lighter than a screenshot).
- New assets: `companion/src/assets/sarah-post.jpg` (720 px, 88 KB) and `batch-label.jpg` (224×140 crop of the label, 6 KB), made with `npx sharp-cli` (`extract <top> <left> <width> <height>`).
- `rcaLogExcerpt` (5 rows, two anomalies) added to `shared/workflow.ts`.
- Fix during testing: "Seal temp 134°C" was truncated on a 375 px screen; the cell now reads "Seal 134°C".

## Story integrity
Images appear only with each agent's result: the batch label after Identification, the log after RCA. Sarah's photo shows the label small, as the laptop's photo already does.

## Verification
Mock states `socialMediaApproval` and `resolution` at 375×812: all three graphics load, log cells fit, lightbox opens and closes. Both builds and oxlint pass. Not yet checked on a real phone or against the live laptop.

## Related Documentation
- Feature: [Slack companion (phone)](../features/slack-companion.md)
