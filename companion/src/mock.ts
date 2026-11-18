// Dev-only: drive the phone UI without a laptop or Supabase. Open /?mock=<stage>, e.g. ?mock=recall or ?mock=human.
import { useCallback, useState } from 'react';
import { applySelection, initialDemoState, stagePath, type DemoState, type PhoneAction, type SessionStatus } from '../../shared/protocol';
import { defaultCustomerDraft, defaultPublicDraft, type WorkflowStage } from '../../shared/workflow';

export const mockStage = import.meta.env.DEV ? new URLSearchParams(location.search).get('mock') : null;

function stateFor(target: string): DemoState {
  const base: DemoState = { ...initialDemoState, publicDraft: defaultPublicDraft, customerDraft: defaultCustomerDraft, seq: 1 };
  if (target === 'opening') return base;
  if (target === 'video') return { ...base, scene: 'f2b' };
  if (target === 'human') return { ...base, scene: 'agentRace', humanStage: 'running', humanIndex: 4 };
  return { ...base, scene: 'agentRace', humanStage: 'summary', stage: target as WorkflowStage, gateReady: true };
}

export function useMockSession() {
  const [state, setState] = useState(() => stateFor(mockStage ?? 'opening'));
  const send = useCallback((action: PhoneAction) => {
    setState((current) => {
      if (action.type === 'start') return { ...current, scene: 'f1' };
      if (action.type !== 'approve') return applySelection(current, action);
      const next = { ...current, ...(action.decisionId ? { decisionId: action.decisionId } : {}), approvals: { ...current.approvals, [action.stage]: 'phone' as const } };
      const path = stagePath(next.decisionId);
      const stage = path[path.indexOf(action.stage) + 1] ?? 'outcome';
      return { ...next, stage, gateReady: stage !== 'outcome', seq: current.seq + 1 };
    });
  }, []);
  return { phase: { kind: 'ready' as const }, state, status: (state.stage === 'outcome' ? 'ended' : 'live') as SessionStatus, me: 'Alex', connected: true, join: async () => {}, send };
}
