# Intugle Cypher 2026 Demo

## Purpose

Offline React booth demo for a food-safety incident. It contrasts delayed human coordination with an evidence-led, governed Intugle agent workflow.

## Stack

- React 19, TypeScript, Vite, GSAP, Tailwind CSS 4, oxlint.
- Run: `npm run dev`
- Validate: `npm run build` and `npx oxlint src`
- All assets are local under `public/assets/`; deployment works offline with Vite's relative base path.

## Main Experience

```text
Opening
-> Factory video (F1)
-> Distribution videos (F2A -> F2B -> F2C)
-> Customer discovery (F3)
-> Sarah's social complaint
-> Human Teams simulation
-> Serial Intugle workflow
-> Outcome and optional Sarah appreciation post
```

### Videos And Social

- F1 uses `frame1.mp4`.
- Distribution is `frame2A.mp4`, `frame2B.mp4`, then `frame2C.mp4`.
- F3 uses `frame3.mp4`; its final frame is the background for Sarah's complaint post.
- Original social post uses `social-post.png`, dislikes, and natural `@YummChips` mentions in the caption/comments.
- Social post composition is right-aligned on desktop, retains the undimmed F3 frame, and emerges from the phone context.
- Voice narration is disabled. Human Teams message dings remain enabled and respect pause/reduced-motion behavior.

### Human Teams

- Sarah's post is missed for 3 hours.
- Ava Reid, Social Media Intern, flags it at 12:00.
- Maya Collins starts senior review 20 minutes later.
- The handoff chain ends unresolved at 13 hrs 40 mins after Sarah's post.
- The persistent social-escalation banner makes the late detection explicit.
- Left/Right arrows step through individual human messages. Right from the final message opens the summary; Left returns to it.

## Intugle Workflow

`AgentRace.tsx` owns the workflow. `WorkflowPanel.tsx` renders it.

```text
Social Media Agent
-> Orchestrator plan drafting
-> Approve plan (HITL)
-> Identification Agent
-> Find the Cause Agent
-> Response Planning Agent
-> Review options (HITL)
-> Recall Agent
-> Recall-region approval (HITL)
-> Public Response Agent, full-response branch only
-> Comms approval (HITL)
-> Customer Care Agent
-> Support approval (HITL)
-> Outcome
```

### Workflow Display Rules

- Left: only completed agents plus the current active/awaiting agent; future agents are hidden. This is the only scrolling workflow area and auto-scrolls to the latest state.
- Right: fixed, non-scrolling workspace. It tells the visual business story and hosts every HITL control.
- Context graph appears only during Orchestrator planning.
- HITL left cards show `Awaiting approval`, never a running spinner. The right-side approval is the active action.
- `Space` pauses/resumes workflows and approval feedback animations.

### Agent Stories

- Social Media: finds `@YummChips` in Sarah's post/comments, drafts personalised outreach, collects contact details, hands off incident context.
- Orchestrator: drafts a three-line incident plan in 8 seconds, then requires plan approval.
- Identification: detects packaging label, shows real enlarged label crop, extracts `HLD-2407-A`, and queries the production database.
- Find the Cause: scans stable factory logs, locks red anomalies, correlates the batch to the 160C -> 134C drop, then maps 40 affected stores across 7 UK cities.
- Response Planning: collates governed response options and requires approval to review them.
- Recall: selects all or chosen North/South/East/West/Central regions, then issues withdrawal orders.
- Public Response: editable post plus Website/Instagram/Twitter/Email/In-store channels; only runs for the full-response branch.
- Customer Care: editable Sarah message plus Hamper or Voucher compensation.

### Decision Branches

| Decision | Downstream workflow |
| --- | --- |
| Withdraw stock + public statement | Recall -> Public Response -> Customer Care -> positive outcome |
| Withdraw stock only | Recall -> Customer Care -> partial outcome |
| Take no action | Direct adverse outcome; no downstream agents |

### Approval Feedback

Animated confirmation exists only after these HITLs:

- Orchestrator: approved plan brief.
- Recall: 4-second UK map with selected regional nodes/orders.
- Comms: approved post distributed to selected channels.
- Support: Sarah's message and selected compensation confirmed.

Resolution approval and response-option approval transition directly.

### Customer Appreciation Posts

- Successful full-response outcome shows `View Sarah's update ->`.
- Hamper selection uses `hamper.png` and the hamper appreciation post.
- Voucher selection uses `voucher.png` and the voucher appreciation post.
- Both use the shared `InstagramPostCard.tsx` presentation.
- Refund is not a selectable compensation option.

## Presenter Controls

- `Space`: pause/resume.
- `Left` / `Right`: message/stage navigation; pending HITLs cannot be bypassed.
- `R`: replay from opening.
- `F`: fullscreen.
- `?`: controls.
- Numeric hops:
  - `1`: Human Teams start
  - `2`: Human Teams summary
  - `3`: Social Media Agent
  - `4`: Orchestrator plan
  - `5`: Identification Agent
  - `6`: Find the Cause Agent
  - `7`: response options
  - `8`: Recall approval
  - `9`: workflow outcome

## Key Files

| File | Role |
| --- | --- |
| `src/App.tsx` | Main scene routing. |
| `src/config.ts` | Content, assets, decisions, social posts, annotations. |
| `src/components/VideoScene.tsx` | Local video playback and annotations. |
| `src/components/SocialPost.tsx` | Full complaint post scene. |
| `src/components/InstagramPostCard.tsx` | Shared Instagram card anatomy. |
| `src/components/HumanPanel.tsx` | Human simulation, message navigation, dings, summary. |
| `src/components/AgentRace.tsx` | Human-to-workflow transition, serial stage controller, approval timing. |
| `src/components/WorkflowPanel.tsx` | Agent audit trail, right-side visuals, forms, HITLs, outcomes. |
| `src/components/race.css` | Workflow, human, stage, map, and feedback styling. |
| `src/hooks/useSceneController.ts` | Global scene state and keyboard controls. |

## Visual Rules

- Preserve the warm Intugle palette: ivory, espresso, burnt orange, raspberry, muted green, dusty blue, amber.
- Use `carton`, not `pallet`.
- Keep business language plain and outcome-led.
- Right-side visuals must communicate each agent's work without requiring the left-side audit trail.
- Do not introduce cloud/API dependencies or external runtime assets.
