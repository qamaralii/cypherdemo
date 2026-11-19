// Turns the laptop's DemoState into Slack channels and messages.
// Pure and deterministic: the same state always renders the same channel, which is what makes
// navigation, jumps, replays and reconnects safe (the phone never disagrees with the laptop).
//
// The phone joins at the end of the human-team thread (the laptop shows the QR code there),
// so it starts at “unleash the agents” and never mirrors the human conversation.

import { config } from '../../src/config';
import { AGENT_CHANNEL, GATE_AGENT, isGate, stagePath, type DemoState, type GateStage, type SessionStatus } from '../../shared/protocol';
import { defaultCustomerDraft, storesForRegions, workflowStages, type WorkflowStage } from '../../shared/workflow';

export type ChannelId = 'general' | 'agents';

export const CHANNELS: Record<ChannelId, { name: string; topic: string }> = {
  general: { name: 'general', topic: 'Company-wide announcements' },
  agents: { name: AGENT_CHANNEL, topic: 'Customer and product incidents · Intugle agents raise issues here and ask for approvals' },
};

/** `logo`: show the Intugle logo as the avatar (every agent and the Intugle bot share it). */
export interface Person { name: string; initials: string; color: string; app?: boolean; logo?: boolean }

/** Picture shown with an agent's result, mirroring the graphic on the laptop for that agent. */
export type Media = 'sarahPhoto' | 'batchLabel' | 'factoryLog';

export type Card =
  | { kind: 'alert'; handle: string; caption: string; stats: string; media?: Media }
  | { kind: 'result'; color: string; title: string; lines: string[]; media?: Media }
  | { kind: 'outcome'; tone: 'good' | 'partial' | 'bad'; title: string; lines: string[]; report?: boolean };

export interface Msg {
  id: string;
  author: Person;
  time: string;
  text: string;
  card?: Card;
  gate?: GateStage;
  urgent?: boolean;
}

export interface GateView {
  stage: GateStage;
  interactive: boolean;
  /** Line shown under a decided gate, e.g. “✅ Priya approved”. */
  resolvedText: string | null;
}

export interface ChannelView { id: ChannelId; visible: boolean; messages: Msg[]; typing: string | null }

/** A phone-level notification banner (like a push notification), shown once per id. */
export interface PhoneAlert { id: string; title: string; body: string }

export interface DerivedView {
  channels: Record<ChannelId, ChannelView>;
  gates: Partial<Record<GateStage, GateView>>;
  /** The gate waiting on this phone right now, if any. */
  activeGate: GateStage | null;
  alert: PhoneAlert | null;
  /** The “Unlock” button shown as the empty incident channel's only content, before the agents start. */
  start: { label: string; decline: string } | null;
  /** The visitor's incident report, once the run reaches its outcome. */
  report: IncidentReport | null;
}

export interface IncidentReport {
  tone: 'good' | 'partial' | 'bad';
  title: string;
  outcome: string[];
  findings: string[];
  decisions: { label: string; value: string; by: string }[];
  agentMinutes: number | null;
  sarah: { image: 'hamper' | 'voucher'; caption: string; likes: number; comments: { handle: string; text: string; color: string }[] } | null;
}

const intugleBot: Person = { name: 'Intugle', initials: 'IN', color: '#D2643E', app: true, logo: true };
const agent = (id: WorkflowStage): Person => {
  const item = workflowStages.find((entry) => entry.id === id)!;
  return { name: item.name, initials: item.initials, color: item.color, app: true, logo: true };
};

const clock = (minutesAfterNine: number) => {
  const total = 9 * 60 + minutesAfterNine;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(value);

export function derive(state: DemoState, me: string, status: SessionStatus): DerivedView {
  const live = status === 'live';
  const inWorkflow = state.scene === 'agentRace' || state.scene === 'resolution';
  const waitingToStart = inWorkflow && state.stage === null && state.humanStage === 'summary' && !state.stayedHuman;

  // ── #general: the welcome. The phone opens in the incident channel, so this is background only. ──
  const general: Msg[] = [{
    id: 'welcome', author: intugleBot, time: clock(0),
    text: `Welcome, @${me}! The human team has spent 13 hrs 40 mins on this incident and still can’t confirm the cause. Let’s give the same incident to Intugle’s agents. You’re the human in the loop: they’ll ask you for every critical decision.`,
  }];
  if (inWorkflow && state.stage !== null && !state.stayedHuman) general.push({ id: 'agents-on-it', author: intugleBot, time: clock(1), text: '🚀 Intugle’s agents are on it. Keep watching the big screen: they’ll message you here when they need you.' });

  // ── #incidents: the agents ──
  const agents: Msg[] = [];
  const gates: Partial<Record<GateStage, GateView>> = {};
  let agentsTyping: string | null = null;
  let activeGate: GateStage | null = null;
  let alert: PhoneAlert | null = null;
  if (state.stayedHuman) agents.push({ id: 'stayed-human', author: intugleBot, time: clock(1), text: 'The team chose to stay with the human process.', card: { ...outcomeCard(state), report: true } as Card });
  if (inWorkflow && state.stage && !state.stayedHuman) {
    const path = stagePath(state.decisionId);
    const current = Math.max(0, path.indexOf(state.stage));
    let minute = 2;
    const post = (msg: Omit<Msg, 'time'>) => { agents.push({ ...msg, time: clock(minute) }); minute += 1; };
    const stores = storesForRegions(state.regions);
    const whoApproved = (gate: GateStage) => state.approvals[gate] === 'phone' ? me : state.approvals[gate] === 'presenter' ? 'The booth presenter' : 'The incident owner';

    path.slice(0, current + 1).forEach((stage, index) => {
      const isCurrent = index === current;
      const past = index < current;

      if (stage === 'socialMedia') {
        // The visitor hears nothing while the agent works; everything arrives with the alert once its run is complete.
        if (isCurrent) return;
        const post_ = config.socialPost;
        const alertText = `🚨 @${me}, something’s wrong. A customer post about mouldy YummChips is spreading fast and tags @YummChips.`;
        post({ id: 'social-alert', author: agent('socialMedia'), urgent: true, text: alertText, card: { kind: 'alert', handle: post_.customerHandle, caption: post_.caption, stats: `${compact(post_.counters.likes)} dislikes · ${compact(post_.counters.comments)} comments · posted ${post_.timeAgo.toLowerCase()}`, media: 'sarahPhoto' } });
        // Raised when the run completes (the Start-investigation gate is open), not while the agent is still working.
        if (state.stage === 'socialMediaApproval') alert = { id: 'social-alert', title: 'Social Media Agent', body: `🚨 @${me}, a customer post about mouldy YummChips is going viral.` };
        return;
      }

      if (stage === 'outcome') {
        post({ id: 'outcome', author: agent('orchestrator'), text: outcomeText(state, me), card: { ...outcomeCard(state), report: true } as Card });
        return;
      }

      if (isGate(stage)) {
        const owner = GATE_AGENT[stage];
        const ready = isCurrent && state.gateReady;
        const processing = isCurrent && state.feedback === stage;
        // At most two messages per agent: the request (which says what the agent prepared) and, once approved, the result.
        // While the agent prepares, the channel shows it typing instead of a separate status message.
        if (!past && !ready && !processing) { agentsTyping = agent(owner).name; return; }
        const interactive = isCurrent && ready && !processing && live;
        if (interactive) activeGate = stage;
        gates[stage] = { stage, interactive, resolvedText: past || processing ? resolvedText(stage, state, whoApproved(stage)) : (!live && isCurrent ? 'This demo has ended.' : null) };
        post({ id: `${stage}-gate`, author: agent(owner), text: gatePrompt(stage, me), gate: stage });
        if (past) {
          const result = gateResult(stage, state, stores);
          if (result) post({ id: `${stage}-result`, author: agent(owner), text: result });
        }
        return;
      }

      // The Planner's own run shows as typing only: its two messages are the plan request and the final outcome.
      if (stage === 'orchestrator') { if (isCurrent) agentsTyping = agent(stage).name; return; }
      post({ id: `${stage}-update`, author: agent(stage), text: workflowStages.find((item) => item.id === stage)!.update });
      if (isCurrent) { agentsTyping = agent(stage).name; return; }
      const result = stageResult(stage);
      if (result) post({ id: `${stage}-result`, author: agent(stage), text: result.text, card: result.card });
    });
  }

  return {
    channels: {
      general: { id: 'general', visible: true, messages: general, typing: null },
      // The incident channel is where the phone lives; it stays empty until the Social Media Agent's alert arrives.
      agents: { id: 'agents', visible: true, messages: agents, typing: agentsTyping },
    },
    gates,
    activeGate,
    alert,
    report: inWorkflow && (state.stage === 'outcome' || state.stayedHuman) ? buildReport(state, me) : null,
    start: waitingToStart && live ? { label: config.agentRace.agentPrompt.yes.replace(/\s*→\s*$/, ''), decline: config.agentRace.agentPrompt.no } : null,
  };
}

function stageResult(stage: WorkflowStage): { text: string; card?: Card } | null {
  switch (stage) {
    case 'identification': return { text: 'Found it. The batch code is printed on the packet in Sarah’s photo.', card: { kind: 'result', color: '#597EB2', title: 'Batch HLD-2407-A', lines: ['Matched to Line 4 · produced 08 July', 'Source: complaint photo + Production DB'], media: 'batchLabel' } };
    case 'rca': return { text: 'Root cause and exposure confirmed.', card: { kind: 'result', color: '#769B58', title: 'Sealing temperature 160°C → 134°C', lines: ['18-minute drop on Line 4 · no quality hold', '40 FreshMart stores across 7 UK cities received the batch'], media: 'factoryLog' } };
    default: return null;
  }
}

function gatePrompt(stage: GateStage, me: string) {
  switch (stage) {
    case 'socialMediaApproval': return `Complaint confirmed: I’ve messaged @sarah_mitchell and collected her contact details. @${me}, this needs an investigation. Shall I hand it to the Planner Agent?`;
    case 'orchestratorApproval': return `I’ve mapped production, quality, warehouse and sales data. @${me}, here’s the incident plan. Approve it and I’ll put the agents to work.`;
    case 'resolution': return `I’ve collated the evidence and the response options. @${me}, how should we respond?`;
    case 'recall': return `I’ve drafted the withdrawal list for the 40 affected stores. @${me}, which regions should I withdraw stock from?`;
    case 'support': return `I’ve drafted a personal reply to Sarah. @${me}, choose how we make it right.`;
  }
}

function resolvedText(stage: GateStage, state: DemoState, who: string) {
  if (stage === 'resolution') {
    const decision = config.agentRace.decisions.find((item) => item.id === state.decisionId);
    return `✅ ${who} chose: ${decision?.title ?? 'a response'}`;
  }
  if (stage === 'socialMediaApproval') return `✅ ${who} started the investigation`;
  const verb = stage === 'support' ? 'approved the reply' : stage === 'recall' ? 'approved the withdrawal' : 'approved the plan';
  return `✅ ${who} ${verb}`;
}

function gateResult(stage: GateStage, state: DemoState, stores: number) {
  switch (stage) {
    case 'recall': return `Withdrawal orders sent to ${stores} ${stores === 1 ? 'store' : 'stores'} (${state.regions.join(', ')}). Store acknowledgements are coming in.`;
    case 'support': return `Reply sent to Sarah with ${state.compensation === 'Voucher' ? 'a £40 goodwill voucher' : 'a curated apology hamper'}. Case linked to the incident record.`;
    default: return null;
  }
}

function outcomeText(state: DemoState, me: string) {
  if (state.decisionId === 'nothing') return `@${me}, no action was taken. Here’s what happened next.`;
  if (state.decisionId === 'recall') return `@${me}, the approved actions are complete. Stock is off the shelves, but no public statement went out.`;
  return `@${me}, incident closed. Every step was evidence-backed and approved by a person.`;
}

function outcomeCard(state: DemoState): Card {
  const stores = storesForRegions(state.regions) || 40;
  const reward = state.compensation === 'Voucher' ? 'a £40 voucher' : 'an apology hamper';
  if (state.decisionId === 'nothing' || state.stayedHuman) return { kind: 'outcome', tone: 'bad', title: 'FreshMart delists the product range', lines: ['Supplier products removed from all stores', 'Sarah’s post reached 2.1M views and is trending', 'A health-authority investigation has opened'] };
  if (state.decisionId === 'recall') return { kind: 'outcome', tone: 'partial', title: 'Stock withdrawn. Public concern remains.', lines: [`${stores} stores received withdrawal orders`, `Sarah received a direct reply and ${reward}`, 'No public statement: 3,200 new comments in 2 hours'] };
  return { kind: 'outcome', tone: 'good', title: 'Incident resolved with evidence and care', lines: [`${stores} stores received withdrawal orders`, `Sarah received a personal reply and ${reward}`, 'Meanwhile the human team, 13 hrs 40 mins in, still hasn’t confirmed the root cause'] };
}

function buildReport(state: DemoState, me: string): IncidentReport {
  const card = outcomeCard(state) as Extract<Card, { kind: 'outcome' }>;
  const decision = config.agentRace.decisions.find((item) => item.id === state.decisionId);
  const stores = storesForRegions(state.regions);
  const by = (gate: GateStage) => state.approvals[gate] === 'phone' ? `You (${me})` : state.approvals[gate] === 'presenter' ? 'Booth presenter' : 'Approved';
  if (state.stayedHuman) {
    return { tone: 'bad', title: card.title, outcome: card.lines, findings: [], agentMinutes: null, sarah: null,
      decisions: [{ label: 'Agents', value: 'Not used: stayed with the human process', by: `You (${me})` }] };
  }
  const path = stagePath(state.decisionId);
  const decisions: IncidentReport['decisions'] = [];
  const add = (gate: GateStage, label: string, value: string) => { if (path.includes(gate)) decisions.push({ label, value, by: by(gate) }); };
  add('socialMediaApproval', 'Investigation', 'Started from the Social Media Agent’s alert');
  add('orchestratorApproval', 'Incident plan', 'Approved: identify, investigate, respond');
  add('resolution', 'Response', decision?.title ?? '—');
  add('recall', 'Stock withdrawal', `${stores} of 40 stores · ${state.regions.join(', ') || 'none'}`);
  add('support', 'Reply to Sarah', `${state.compensation === 'Voucher' ? 'Sent with a £40 goodwill voucher' : 'Sent with a curated apology hamper'}${state.customerDraft !== defaultCustomerDraft ? ` · rewritten by ${state.approvals.support === 'phone' ? 'you' : 'the team'}` : ''}`);
  const update = state.compensation === 'Voucher' ? config.agentRace.voucherUpdate : config.agentRace.customerUpdate;
  const sarahGetsUpdate = state.decisionId === 'full' || state.decisionId === 'recall';
  return {
    // The time comparison has its own boxes in the report, so the human-team line isn't repeated here.
    tone: card.tone, title: card.title, outcome: card.lines.filter((line) => !line.startsWith('Meanwhile the human team')),
    findings: ['Batch HLD-2407-A, from Sarah’s photo', 'Root cause: sealing temperature 160°C → 134°C for 18 minutes on Line 4', 'Exposure: 40 FreshMart stores across 7 UK cities'],
    decisions,
    agentMinutes: state.agentMinutes >= 0.05 ? state.agentMinutes : null,
    sarah: sarahGetsUpdate ? {
      image: state.compensation === 'Voucher' ? 'voucher' : 'hamper',
      caption: update.caption,
      likes: update.counters.likes,
      comments: update.comments.slice(0, 2).map((comment) => ({ handle: comment.handle, text: comment.text, color: comment.avatarColor })),
    } : null,
  };
}
