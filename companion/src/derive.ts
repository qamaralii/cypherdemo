// Turns the laptop's DemoState into Slack channels and messages.
// Pure and deterministic: the same state always renders the same channel, which is what makes
// navigation, jumps, replays and reconnects safe (the phone never disagrees with the laptop).

import { config } from '../../src/config';
import { humanMessages } from '../../shared/humanMessages';
import { GATE_AGENT, isGate, stagePath, type DemoState, type GateStage, type SessionStatus } from '../../shared/protocol';
import { storesForRegions, workflowStages, type WorkflowStage } from '../../shared/workflow';

export type ChannelId = 'general' | 'incident' | 'agents';

export const CHANNELS: Record<ChannelId, { name: string; topic: string }> = {
  general: { name: 'general', topic: 'Company-wide announcements' },
  incident: { name: 'incident-hld-2407-a', topic: 'Quality incident · batch HLD-2407-A' },
  agents: { name: 'hld-2407-a-intugle', topic: 'Intugle agents · incident response' },
};

export interface Person { name: string; initials: string; color: string; app?: boolean; role?: string }

export type Card =
  | { kind: 'attachment'; title: string; status: string }
  | { kind: 'start' }
  | { kind: 'result'; color: string; title: string; lines: string[] }
  | { kind: 'plan' }
  | { kind: 'outcome'; tone: 'good' | 'partial' | 'bad'; title: string; lines: string[] };

export interface Msg {
  id: string;
  author: Person;
  time: string;
  text: string;
  card?: Card;
  gate?: GateStage;
}

export interface GateView {
  stage: GateStage;
  interactive: boolean;
  /** Line shown under a decided gate, e.g. “✅ Priya approved”. */
  resolvedText: string | null;
}

export interface ChannelView { id: ChannelId; visible: boolean; messages: Msg[]; typing: string | null }

export interface DerivedView {
  channels: Record<ChannelId, ChannelView>;
  gates: Partial<Record<GateStage, GateView>>;
  /** The gate waiting on this phone right now, if any. */
  activeGate: GateStage | null;
  bannerScene: string | null;
}

const intugleBot: Person = { name: 'Intugle', initials: 'IN', color: '#D2643E', app: true };
const agent = (id: WorkflowStage): Person => {
  const item = workflowStages.find((entry) => entry.id === id)!;
  return { name: item.name, initials: item.initials, color: item.color, app: true };
};
const humanColors: Record<string, string> = { AV: '#E8912D', MC: '#2BAC76', PS: '#1264A3', ML: '#7C3085', ER: '#CD2553', NB: '#3AA3E3' };

const SCENE_LABEL: Partial<Record<DemoState['scene'], string>> = {
  f1: 'Factory · Line 4 sealing station',
  f2a: 'Distribution · cartons leave the factory',
  f2b: 'Distribution · deliveries to FreshMart',
  f2c: 'Distribution · deliveries to FreshMart',
  f3: 'Customer discovery',
  socialPost: 'Sarah’s post is spreading',
  end: 'Sarah’s post is spreading',
};

const clock = (minutesAfterNine: number) => {
  const total = 9 * 60 + minutesAfterNine;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function derive(state: DemoState, me: string, status: SessionStatus): DerivedView {
  const inWorkflowScenes = state.scene === 'agentRace' || state.scene === 'resolution';
  const live = status === 'live';

  // ── #general ──
  const general: Msg[] = [{
    id: 'welcome', author: intugleBot, time: clock(0),
    text: `Welcome, @${me}! You’re the human in the loop for today’s incident at YummChips. Keep an eye on the big screen. When the agents need a decision, they’ll ask you here.`,
  }];
  if (state.scene === 'opening' && live) general.push({ id: 'start', author: intugleBot, time: clock(0), text: 'Ready when you are.', card: { kind: 'start' } });

  // ── #incident-hld-2407-a (the human team) ──
  const incident: Msg[] = [];
  let incidentTyping: string | null = null;
  if (inWorkflowScenes) {
    const showAll = state.stage !== null || state.humanStage === 'summary';
    const count = showAll ? humanMessages.length : state.humanStage === 'running' ? Math.min(humanMessages.length, state.humanIndex + 1) : 0;
    humanMessages.slice(0, count).forEach((message, index) => incident.push({
      id: `human-${index}`,
      author: { name: message.name, initials: message.initials, color: humanColors[message.initials] ?? '#616061', role: message.role },
      time: message.timestamp,
      text: message.message,
      card: message.attachment ? { kind: 'attachment', title: message.attachment, status: message.attachmentStatus ?? '' } : undefined,
    }));
    if (!showAll && state.humanStage === 'running' && count < humanMessages.length) incidentTyping = humanMessages[count]!.name;
    if (showAll) {
      const summary = config.agentRace.humanSummary;
      incident.push({
        id: 'human-summary', author: intugleBot, time: '22:41',
        text: state.stayedHuman
          ? 'You chose to stay with the human process.'
          : `13 hrs 40 mins after Sarah’s post: ${summary.confirmed.toLowerCase()}, but ${summary.unresolved.charAt(0).toLowerCase()}${summary.unresolved.slice(1)}`,
        card: state.stayedHuman ? outcomeCard(state) : { kind: 'result', color: '#E8912D', title: 'Human team · incident summary', lines: ['15 handoffs · 16 messages · 10 people', 'Root cause: not confirmed', 'Affected stores: still being traced'] },
      });
    }
  }

  // ── #hld-2407-a-intugle (the agents) ──
  const agents: Msg[] = [];
  const gates: Partial<Record<GateStage, GateView>> = {};
  let agentsTyping: string | null = null;
  let activeGate: GateStage | null = null;
  if (inWorkflowScenes && state.stage && !state.stayedHuman) {
    const path = stagePath(state.decisionId);
    const current = Math.max(0, path.indexOf(state.stage));
    let minute = 2;
    const post = (msg: Omit<Msg, 'time'>) => { agents.push({ ...msg, time: clock(minute) }); minute += 1; };
    const stores = storesForRegions(state.regions);
    const whoApproved = (gate: GateStage) => state.approvals[gate] === 'phone' ? me : state.approvals[gate] === 'presenter' ? 'The booth presenter' : 'The incident owner';

    path.slice(0, current + 1).forEach((stage, index) => {
      const isCurrent = index === current;
      const past = index < current;

      if (stage === 'outcome') {
        post({ id: 'outcome', author: agent('orchestrator'), text: outcomeText(state, me), card: outcomeCard(state) });
        return;
      }

      if (isGate(stage)) {
        const owner = GATE_AGENT[stage];
        const ready = isCurrent && state.gateReady;
        const processing = isCurrent && state.feedback === stage;
        if (owner !== 'orchestrator') post({ id: `${stage}-update`, author: agent(owner), text: workflowStages.find((item) => item.id === owner)!.update });
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

      post({ id: `${stage}-update`, author: agent(stage), text: workflowStages.find((item) => item.id === stage)!.update });
      if (isCurrent) { agentsTyping = agent(stage).name; return; }
      const result = stageResult(stage);
      if (result) post({ id: `${stage}-result`, author: agent(stage), text: result.text, card: result.card });
    });
  }

  return {
    channels: {
      general: { id: 'general', visible: true, messages: general, typing: null },
      incident: { id: 'incident', visible: inWorkflowScenes, messages: incident, typing: incidentTyping },
      agents: { id: 'agents', visible: inWorkflowScenes && state.stage !== null && !state.stayedHuman, messages: agents, typing: agentsTyping },
    },
    gates,
    activeGate,
    bannerScene: SCENE_LABEL[state.scene] ?? null,
  };
}

function stageResult(stage: WorkflowStage): { text: string; card?: Card } | null {
  switch (stage) {
    case 'socialMedia': return { text: 'Complaint confirmed minutes after it was posted. I’ve messaged @sarah_mitchell and collected her contact details. Handing over to the Orchestrator.' };
    case 'orchestrator': return null;
    case 'identification': return { text: 'Found it. The batch code is printed on the packet in Sarah’s photo.', card: { kind: 'result', color: '#597EB2', title: 'Batch HLD-2407-A', lines: ['Matched to Line 4 · produced 08 July', 'Source: complaint photo + Production DB'] } };
    case 'rca': return { text: 'Root cause and exposure confirmed.', card: { kind: 'result', color: '#769B58', title: 'Sealing temperature 160°C → 134°C', lines: ['18-minute drop on Line 4 · no quality hold', '40 FreshMart stores across 7 UK cities received the batch'] } };
    default: return null;
  }
}

function gatePrompt(stage: GateStage, me: string) {
  switch (stage) {
    case 'orchestratorApproval': return `@${me}, here’s the incident plan. Approve it and I’ll put the agents to work.`;
    case 'resolution': return `@${me}, the evidence is in. How should we respond?`;
    case 'recall': return `@${me}, which regions should I withdraw stock from?`;
    case 'comms': return `@${me}, please review the public statement and choose where to publish it.`;
    case 'support': return `@${me}, here’s my reply to Sarah. Choose how we make it right.`;
  }
}

function resolvedText(stage: GateStage, state: DemoState, who: string) {
  if (stage === 'resolution') {
    const decision = config.agentRace.decisions.find((item) => item.id === state.decisionId);
    return `✅ ${who} chose: ${decision?.title ?? 'a response'}`;
  }
  const verb = stage === 'comms' ? 'approved publishing' : stage === 'support' ? 'approved the reply' : stage === 'recall' ? 'approved the withdrawal' : 'approved the plan';
  return `✅ ${who} ${verb}`;
}

function gateResult(stage: GateStage, state: DemoState, stores: number) {
  switch (stage) {
    case 'recall': return `Withdrawal orders sent to ${stores} ${stores === 1 ? 'store' : 'stores'} (${state.regions.join(', ')}). Store acknowledgements are coming in.`;
    case 'comms': return `Statement published on ${state.channels.join(', ')}.`;
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
  const reward = state.compensation === 'Voucher' ? '£40 voucher' : 'apology hamper';
  if (state.decisionId === 'nothing' || state.stayedHuman) return { kind: 'outcome', tone: 'bad', title: 'FreshMart delists the product range', lines: ['Supplier products removed from all stores', 'Sarah’s post reached 2.1M views and is trending', 'A health-authority investigation has opened'] };
  if (state.decisionId === 'recall') return { kind: 'outcome', tone: 'partial', title: 'Stock withdrawn. Public concern remains.', lines: [`${stores} stores received withdrawal orders`, `Sarah received a direct reply and a ${reward}`, 'No public statement: 3,200 new comments in 2 hours'] };
  return { kind: 'outcome', tone: 'good', title: 'Incident resolved with evidence and care', lines: [`${stores} stores received withdrawal orders`, `Public statement published on ${state.channels.length} ${state.channels.length === 1 ? 'channel' : 'channels'}`, `Sarah received a personal reply and a ${reward}`, 'Meanwhile the human team, 13 hrs 40 mins in, still hasn’t confirmed the root cause'] };
}
