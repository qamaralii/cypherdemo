// Laptop ↔ phone sync protocol.
// The laptop is the only source of truth: it broadcasts its whole position as DemoState on every change.
// The phone renders whatever that state implies and sends PhoneActions back. The laptop validates and applies them.

import type { Compensation, Region, WorkflowStage } from './workflow';

export type DemoScene = 'opening' | 'f1' | 'f2a' | 'f2b' | 'f2c' | 'f3' | 'socialPost' | 'agentRace' | 'resolution' | 'end';
export type HumanStage = 'intro' | 'running' | 'summary';
export type DecisionId = 'full' | 'recall' | 'nothing';
export type GateStage = 'socialMediaApproval' | 'orchestratorApproval' | 'resolution' | 'recall' | 'comms' | 'support';
export type Approver = 'phone' | 'presenter';

export const GATE_STAGES: GateStage[] = ['socialMediaApproval', 'orchestratorApproval', 'resolution', 'recall', 'comms', 'support'];
export const isGate = (stage: WorkflowStage | null): stage is GateStage => GATE_STAGES.includes(stage as GateStage);

/** Which agent asks for each approval. */
export const GATE_AGENT: Record<GateStage, WorkflowStage> = {
  socialMediaApproval: 'socialMedia',
  orchestratorApproval: 'orchestrator',
  resolution: 'resolution',
  recall: 'recall',
  comms: 'comms',
  support: 'support',
};

export interface DemoState {
  v: 1;
  /** Monotonic per session; the phone ignores anything older than what it has. */
  seq: number;
  scene: DemoScene;
  humanStage: HumanStage;
  humanIndex: number;
  stage: WorkflowStage | null;
  /** The current gate's controls are live on the laptop (preparation finished, no feedback animation). */
  gateReady: boolean;
  feedback: WorkflowStage | null;
  decisionId: DecisionId | null;
  regions: Region[];
  channels: string[];
  publicDraft: string;
  customerDraft: string;
  compensation: Compensation;
  approvals: Partial<Record<GateStage, Approver>>;
  /** Visitor chose “I’ll take my chances” on the human summary: straight to the adverse outcome. */
  stayedHuman: boolean;
}

export const initialDemoState: DemoState = {
  v: 1,
  seq: 0,
  scene: 'opening',
  humanStage: 'intro',
  humanIndex: 0,
  stage: null,
  gateReady: false,
  feedback: null,
  decisionId: 'full',
  regions: ['North'],
  channels: ['Website'],
  publicDraft: '',
  customerDraft: '',
  compensation: 'Hamper',
  approvals: {},
  stayedHuman: false,
};

export type PhoneAction =
  | { type: 'start' }
  | { type: 'chooseDecision'; decisionId: DecisionId }
  | { type: 'toggleRegion'; region: Region }
  | { type: 'setRegions'; regions: Region[] }
  | { type: 'toggleChannel'; channel: string }
  | { type: 'setCompensation'; compensation: Compensation }
  /** Approval carries the phone's selections so a late-arriving toggle can never change what was approved. */
  | { type: 'approve'; stage: GateStage; decisionId?: DecisionId; regions?: Region[]; channels?: string[]; compensation?: Compensation };

export interface ActionEnvelope {
  token: string;
  action: PhoneAction;
}

export type SessionStatus = 'open' | 'live' | 'ended';

/** The agents' Slack channel. Deliberately batch-free: the batch is only known once the Identification Agent finds it. */
export const AGENT_CHANNEL = 'incidents';

/** Realtime broadcast channel and event names. */
export const channelName = (sessionId: string) => `demo:${sessionId}`;
export const EVENTS = {
  state: 'state', // laptop → phone: DemoState
  status: 'status', // laptop → phone: { status }
  action: 'action', // phone → laptop: ActionEnvelope
  joined: 'joined', // phone → laptop: a decider claimed the session
  hello: 'hello', // phone → laptop: please re-send state
} as const;

/** Workflow stages in the order this run visits them, given the response decision. */
export function stagePath(decisionId: DecisionId | null): WorkflowStage[] {
  const head: WorkflowStage[] = ['socialMedia', 'socialMediaApproval', 'orchestrator', 'orchestratorApproval', 'identification', 'rca', 'resolution'];
  const tail: WorkflowStage[] = decisionId === 'nothing' ? [] : decisionId === 'recall' ? ['recall', 'support'] : ['recall', 'comms', 'support'];
  return [...head, ...tail, 'outcome'];
}

/** Applies a selection action to a state. Used by the phone for instant (optimistic) feedback. The laptop applies the same rules to its own React state. */
export function applySelection(state: DemoState, action: PhoneAction): DemoState {
  switch (action.type) {
    case 'chooseDecision': return { ...state, decisionId: action.decisionId };
    case 'toggleRegion': return { ...state, regions: state.regions.includes(action.region) ? state.regions.filter((r) => r !== action.region) : [...state.regions, action.region] };
    case 'setRegions': return { ...state, regions: action.regions };
    case 'toggleChannel': return { ...state, channels: state.channels.includes(action.channel) ? state.channels.filter((c) => c !== action.channel) : [...state.channels, action.channel] };
    case 'setCompensation': return { ...state, compensation: action.compensation };
    default: return state;
  }
}
