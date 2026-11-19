// Dev-only: drive the phone UI without a laptop or Supabase. Open /?mock=<stage>, e.g. ?mock=summary, ?mock=socialMedia or ?mock=recall.
import { useCallback, useState } from 'react';
import { applySelection, initialDemoState, stagePath, type DemoState, type PhoneAction, type SessionStatus } from '../../shared/protocol';
import { defaultCustomerDraft, type WorkflowStage } from '../../shared/workflow';

export const mockStage = import.meta.env.DEV ? new URLSearchParams(location.search).get('mock') : null;

function stateFor(target: string): DemoState {
  const base: DemoState = { ...initialDemoState, customerDraft: defaultCustomerDraft, seq: 1 };
  if (target === 'summary') return { ...base, scene: 'agentRace', humanStage: 'summary' };
  if (target === 'outcome' || target === 'stayed') {
    // ?mock=outcome&decision=full|recall|nothing&comp=Hamper|Voucher, or ?mock=stayed
    const params = new URLSearchParams(location.search);
    const decisionId = (params.get('decision') ?? 'full') as DemoState['decisionId'];
    return { ...base, scene: 'agentRace', humanStage: 'summary', stage: 'outcome', decisionId, stayedHuman: target === 'stayed',
      regions: ['North', 'West'], compensation: params.get('comp') === 'Voucher' ? 'Voucher' : 'Hamper', agentMinutes: 1.62,
      approvals: { socialMediaApproval: 'phone', orchestratorApproval: 'phone', resolution: 'phone', recall: 'presenter', support: 'phone' } };
  }
  return { ...base, scene: 'agentRace', humanStage: 'summary', stage: target as WorkflowStage, gateReady: true };
}

export function useMockSession() {
  const [state, setState] = useState(() => stateFor(mockStage ?? 'summary'));
  const send = useCallback((action: PhoneAction) => {
    setState((current) => {
      if (action.type === 'start') return { ...current, stage: 'socialMedia', gateReady: false, seq: current.seq + 1 };
      if (action.type !== 'approve') return applySelection(current, action);
      const next = { ...current, ...(action.decisionId ? { decisionId: action.decisionId } : {}), approvals: { ...current.approvals, [action.stage]: 'phone' as const } };
      const path = stagePath(next.decisionId);
      const stage = path[path.indexOf(action.stage) + 1] ?? 'outcome';
      return { ...next, stage, gateReady: stage !== 'outcome', seq: current.seq + 1 };
    });
  }, []);
  const submitEmail = useCallback(async (email: string) => (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? 'invalid' : 'ok') as 'ok' | 'invalid' | 'error', []);
  return { submitEmail, phase: { kind: 'ready' as const }, state, status: (state.stage === 'outcome' ? 'ended' : 'live') as SessionStatus, me: 'Alex', connected: true, join: async () => {}, send };
}
