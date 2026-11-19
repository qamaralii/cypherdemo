import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { IncidentHeader } from './IncidentHeader';
import { HumanPanel, HumanInvestigationReport, HUMAN_MESSAGE_COUNT } from './HumanPanel';
import { ComparisonRail } from './ComparisonRail';
import { WorkflowPanel } from './WorkflowPanel';
import type { WorkflowStage } from './WorkflowPanel';
import { config } from '../config';
import type { HopTarget } from '../hooks/useSceneController';
import './race.css';
import './comparison.css';
import { useCompanion } from '../companion/CompanionProvider';
import { CompanionQr } from '../companion/CompanionQr';
import { defaultCustomerDraft, type Region } from '../../shared/workflow';
import { DRAFT_FOR_GATE, isGate, type Approver, type GateStage, type PhoneAction } from '../../shared/protocol';

type HumanStage = 'intro' | 'running' | 'summary';
type Decision = typeof config.agentRace.decisions[number];

interface Props {
  paused: boolean;
  onReplay: () => void;
  hopTarget?: { target: HopTarget; id: number } | null;
  registerNextHandler?: (handler: (() => boolean) | null) => void;
  registerPrevHandler?: (handler: (() => boolean) | null) => void;
}

export function AgentRace({ paused, onReplay, hopTarget, registerNextHandler, registerPrevHandler }: Props) {
  const [humanStage, setHumanStage] = useState<HumanStage>('intro');
  const [humanMessageIndex, setHumanMessageIndex] = useState(0);
  const [humanJumpMessage, setHumanJumpMessage] = useState<{ step: number; id: number }>();
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage | null>(null);
  const [decision, setDecision] = useState<Decision | null>(config.agentRace.decisions[0]!);
  useEffect(() => {
    if (workflowStage === 'resolution') setDecision(config.agentRace.decisions[0]!);
  }, [workflowStage]);
  const [regions, setRegions] = useState<Region[]>(['North']);
  const [customerDraft, setCustomerDraft] = useState(defaultCustomerDraft);
  const [compensation, setCompensation] = useState<'Hamper' | 'Voucher'>('Hamper');
  const [approvalFeedback, setApprovalFeedback] = useState<WorkflowStage | null>(null);
  const [approvals, setApprovals] = useState<Partial<Record<GateStage, Approver>>>({});
  const [gateReady, setGateReady] = useState(false);
  const [stayedHuman, setStayedHuman] = useState(false);
  const companion = useCompanion();
  const remoteDecider = companion.deciderName;
  const approvalTimeline = useRef<gsap.core.Timeline | null>(null);
  const [viewingHumanReport, setViewingHumanReport] = useState(false);
  const [comparisonElapsed, setComparisonElapsed] = useState(0);
  const comparisonElapsedRef = useRef(0);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const workflowPaused = paused || viewingHumanReport;
  const toggleReport = useCallback(() => {
    // Move focus off the outgoing view before it becomes inert.
    comparisonRef.current?.focus({ preventScroll: true });
    setViewingHumanReport(current => !current);
  }, []);

  const handleHumanComplete = useCallback(() => {
    setHumanStage('summary');
  }, []);

  const startWorkflow = useCallback(() => {
    setViewingHumanReport(false);
    comparisonElapsedRef.current = 0;
    setComparisonElapsed(0);
    setWorkflowStage('socialMedia');
    setDecision(config.agentRace.decisions[0]!);
    setRegions(['North']);
    setCustomerDraft(defaultCustomerDraft);
    setCompensation('Hamper');
    setApprovals({});
    setStayedHuman(false);
  }, []);

  const advanceWorkflow = useCallback(() => {
    setWorkflowStage((current) => {
      if (!current) return current;
      if (current === 'socialMedia') return 'socialMediaApproval';
      if (current === 'socialMediaApproval') return 'orchestrator';
      if (current === 'orchestrator') return 'orchestratorApproval';
      if (current === 'orchestratorApproval') return 'identification';
      if (current === 'identification') return 'rca';
      if (current === 'rca') return 'resolution';
       if (current === 'resolution') {
         if (!decision) return current;
         return decision.id === 'nothing' ? 'outcome' : 'recall';
       }
      if (current === 'recall') return 'support';
      if (current === 'support') return 'outcome';
      return current;
    });
  }, [decision]);

  const approveWithFeedback = useCallback((stage: WorkflowStage) => {
    setApprovalFeedback(stage);
  }, []);

  /** One entry point for every approval, whether it came from the phone, the presenter override, or the laptop UI (laptop-only mode). */
  const approveGate = useCallback((stage: GateStage, by: Approver) => {
    setApprovals((current) => ({ ...current, [stage]: by }));
    if (stage === 'resolution' || stage === 'socialMediaApproval') advanceWorkflow();
    else approveWithFeedback(stage);
  }, [advanceWorkflow, approveWithFeedback]);

  useEffect(() => {
    if (!approvalFeedback) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setApprovalFeedback(null);
      advanceWorkflow();
      return;
    }
    const timeline = gsap.timeline({
      onComplete: () => {
        setApprovalFeedback(null);
        advanceWorkflow();
      },
    });
    timeline.to({}, { duration: approvalFeedback === 'recall' ? 4 : 2.1 });
    approvalTimeline.current = timeline;
    return () => {
      timeline.kill();
      approvalTimeline.current = null;
    };
  }, [approvalFeedback, advanceWorkflow]);

  useEffect(() => {
    approvalTimeline.current?.paused(workflowPaused);
  }, [workflowPaused, approvalFeedback]);

  useEffect(() => {
    if (!workflowStage || workflowStage === 'outcome' || workflowPaused) return;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      comparisonElapsedRef.current += now - previous;
      previous = now;
      setComparisonElapsed(comparisonElapsedRef.current);
    }, 100);
    return () => window.clearInterval(interval);
  }, [workflowStage, workflowPaused]);

  useEffect(() => {
    if (!viewingHumanReport) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') toggleReport();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [viewingHumanReport, toggleReport]);

  // ── Slack companion: broadcast this screen's position to the paired phone ──
  const { publish, onAction } = companion;
  useEffect(() => {
    publish({
      humanStage, humanIndex: humanMessageIndex, stage: workflowStage, gateReady: isGate(workflowStage) && gateReady, feedback: approvalFeedback,
      decisionId: decision?.id ?? null, regions, customerDraft, compensation, approvals, stayedHuman,
      // Read at publish time (every stage change): at the outcome it is the final agent time.
      agentMinutes: comparisonElapsedRef.current / 30_000,
    });
  }, [publish, humanStage, humanMessageIndex, workflowStage, gateReady, approvalFeedback, decision, regions, customerDraft, compensation, approvals, stayedHuman]);

  const actionHandler = useRef<(action: PhoneAction) => void>(() => {});
  actionHandler.current = (action: PhoneAction) => {
    // The phone joins at the end of the human thread; its first button unleashes the agents.
    if (action.type === 'start') { if (!workflowStage && humanStage === 'summary') startWorkflow(); return; }
    if (action.type === 'stayHuman') { if (!workflowStage && humanStage === 'summary') directNoAction(); return; }
    if (!isGate(workflowStage) || !gateReady || approvalFeedback || workflowPaused) return;
    const findDecision = (id: string) => config.agentRace.decisions.find((item) => item.id === id) ?? null;
    switch (action.type) {
      case 'chooseDecision': if (workflowStage === 'resolution') setDecision(findDecision(action.decisionId)); return;
      case 'toggleRegion': if (workflowStage === 'recall') toggleRegion(action.region); return;
      case 'setRegions': if (workflowStage === 'recall') setRegions(action.regions); return;
      case 'setCompensation': if (workflowStage === 'support') setCompensation(action.compensation); return;
      case 'setDraft': {
        const allowed = DRAFT_FOR_GATE[workflowStage];
        if (!allowed || allowed.field !== action.field) return;
        const text = action.text.slice(0, allowed.max);
        setCustomerDraft(text);
        return;
      }
      case 'approve': {
        if (action.stage !== workflowStage) return;
        if (action.stage === 'resolution') {
          const chosen = findDecision(action.decisionId ?? decision?.id ?? 'full');
          if (!chosen) return;
          setDecision(chosen);
          setApprovals((current) => ({ ...current, resolution: 'phone' }));
          setWorkflowStage(chosen.id === 'nothing' ? 'outcome' : 'recall');
          return;
        }
        if (action.stage === 'recall' && action.regions) { if (!action.regions.length) return; setRegions(action.regions); }
        if (action.stage === 'support' && action.compensation) setCompensation(action.compensation);
        // The approval carries the final text, so a late keystroke can never change what was approved.
        const draftRule = DRAFT_FOR_GATE[action.stage];
        if (draftRule && action.draft !== undefined) {
          const text = action.draft.slice(0, draftRule.max);
          if (!text.trim()) return;
          setCustomerDraft(text);
        }
        approveGate(action.stage, 'phone');
        return;
      }
    }
  };
  useEffect(() => onAction((action) => actionHandler.current(action)), [onAction]);

  // Presenter override: “A” approves the waiting gate on the phone's behalf (phone died, visitor walked off, network dropped).
  useEffect(() => {
    if (!remoteDecider) return;
    const handleOverride = (event: KeyboardEvent) => {
      if (event.key !== 'a' && event.key !== 'A') return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!isGate(workflowStage) || !gateReady || approvalFeedback || workflowPaused) return;
      if (workflowStage === 'recall' && regions.length === 0) return;
      event.preventDefault();
      approveGate(workflowStage, 'presenter');
    };
    window.addEventListener('keydown', handleOverride);
    return () => window.removeEventListener('keydown', handleOverride);
  }, [remoteDecider, workflowStage, gateReady, approvalFeedback, workflowPaused, regions, approveGate]);

  const toggleRegion = useCallback((region: Region) => {
    setRegions((current) => current.includes(region) ? current.filter((item) => item !== region) : [...current, region]);
  }, []);

  const handleNext = useCallback(() => {
    if (viewingHumanReport) return true;
    if (!workflowStage) {
      if (humanStage === 'intro') {
        setHumanMessageIndex(0);
        setHumanStage('running');
      } else if (humanStage === 'running') {
        if (humanMessageIndex >= HUMAN_MESSAGE_COUNT - 1) setHumanStage('summary');
        else setHumanJumpMessage((current) => ({ step: humanMessageIndex + 1, id: (current?.id ?? 0) + 1 }));
      }
      return true;
    }
    if (['socialMediaApproval', 'orchestratorApproval', 'resolution', 'recall', 'support', 'outcome'].includes(workflowStage)) return true;
    advanceWorkflow();
    return true;
  }, [workflowStage, humanStage, humanMessageIndex, advanceWorkflow, viewingHumanReport]);

  const handlePrev = useCallback(() => {
    if (viewingHumanReport) return true;
    if (!workflowStage) {
      if (humanStage === 'intro') return false;
      if (humanStage === 'summary') {
        setHumanStage('running');
        setHumanJumpMessage((current) => ({ step: HUMAN_MESSAGE_COUNT - 1, id: (current?.id ?? 0) + 1 }));
      } else if (humanStage === 'running') {
        if (humanMessageIndex <= 0) setHumanStage('intro');
        else setHumanJumpMessage((current) => ({ step: humanMessageIndex - 1, id: (current?.id ?? 0) + 1 }));
      }
      return true;
    }
    if (workflowStage === 'socialMedia') {
      setWorkflowStage(null);
      setApprovalFeedback(null);
      setHumanStage('summary');
      return true;
    }
    const previous: Partial<Record<WorkflowStage, WorkflowStage>> = {
       socialMediaApproval: 'socialMedia', orchestrator: 'socialMediaApproval', orchestratorApproval: 'orchestrator', identification: 'orchestratorApproval', rca: 'identification', resolution: 'rca', recall: 'resolution', support: 'recall', outcome: decision?.id === 'nothing' ? 'resolution' : 'support',
    };
    const target = previous[workflowStage];
    if (target) setWorkflowStage(target);
    return true;
  }, [workflowStage, humanStage, humanMessageIndex, decision, viewingHumanReport]);

  useEffect(() => {
    registerNextHandler?.(handleNext);
    return () => registerNextHandler?.(null);
  }, [registerNextHandler, handleNext]);
  useEffect(() => {
    registerPrevHandler?.(handlePrev);
    return () => registerPrevHandler?.(null);
  }, [registerPrevHandler, handlePrev]);

  useEffect(() => {
    if (!hopTarget) return;
    setViewingHumanReport(false);
    comparisonElapsedRef.current = 0;
    setComparisonElapsed(0);
    const full = config.agentRace.decisions[0]!;
    const targetMap: Record<Exclude<HopTarget, 'humanStart' | 'humanEnd'>, WorkflowStage> = {
       unstructuredStart: 'socialMedia', analysisStart: 'orchestrator', resolutionGate: 'identification', diagnosis: 'rca', decision: 'resolution', execution: 'recall', outcome: 'outcome',
    };
    if (hopTarget.target === 'humanStart') { setWorkflowStage(null); setHumanMessageIndex(0); setHumanStage('running'); return; }
    if (hopTarget.target === 'humanEnd') { setWorkflowStage(null); setHumanMessageIndex(HUMAN_MESSAGE_COUNT - 1); setHumanStage('summary'); return; }
    setWorkflowStage(targetMap[hopTarget.target]);
    setHumanStage('summary');
    if (['recall', 'outcome'].includes(targetMap[hopTarget.target])) setDecision(full);
  }, [hopTarget]);

  const directNoAction = useCallback(() => {
    setDecision(config.agentRace.decisions.find((item) => item.id === 'nothing') ?? null);
    setStayedHuman(true);
    setWorkflowStage('outcome');
  }, []);

  return (
    <main className="race-shell race-shell-light workflow-shell">
      <IncidentHeader theme="light" />
      {!workflowStage ? (
        <div className="workflow-human-stage" data-human-stage={humanStage}>
          <HumanPanel
            paused={paused || humanStage !== 'running'}
            onComplete={handleHumanComplete}
            onStepChange={setHumanMessageIndex}
            jumpToMessage={humanJumpMessage}
            showSummary={humanStage === 'summary'}
            showAgentChoice={humanStage === 'summary'}
            onUnleashAgents={startWorkflow}
            onStayHuman={directNoAction}
          />
          <aside className="workflow-human-context">
            <span>01 / HUMAN COORDINATION</span>
            <h2>{humanStage === 'intro' ? 'Watch the handoffs multiply.' : 'A complaint becomes a chain of delays.'}</h2>
            <p>Messages, access requests and spreadsheets move between people while the customer waits for an answer.</p>
            {humanStage === 'summary' && <CompanionQr />}
            {humanStage === 'intro' && <button data-enter-primary onClick={() => setHumanStage('running')}>Start human simulation →</button>}
          </aside>
        </div>
      ) : (
        <div ref={comparisonRef} className="workflow-comparison" data-view={viewingHumanReport ? 'human' : 'agent'} tabIndex={-1}>
        <div id="comparison-agent-view" className="comparison-agent-view" inert={viewingHumanReport} aria-hidden={viewingHumanReport}>
        <ComparisonRail team="human" elapsed={820 / 1440 + comparisonElapsed / 60_000} onClick={toggleReport} expanded={viewingHumanReport} />
        <WorkflowPanel
          stage={workflowStage}
          paused={workflowPaused}
          agentElapsed={comparisonElapsed}
          decision={decision}
          regions={regions}
          customerDraft={customerDraft}
          compensation={compensation}
          approvalFeedback={approvalFeedback}
          onAdvance={advanceWorkflow}
          onApproval={(stage) => { if (isGate(stage)) approveGate(stage, 'presenter'); }}
          remoteDecider={remoteDecider}
          onGateReadyChange={setGateReady}
          onChooseDecision={setDecision}
          onToggleRegion={toggleRegion}
          onSetRegions={setRegions}
          onCustomerDraft={setCustomerDraft}
          onCompensation={setCompensation}
        />
        </div>
        <div id="comparison-human-view" className="comparison-human-view" inert={!viewingHumanReport} aria-hidden={!viewingHumanReport}>
          <div className="comparison-report-scroll"><HumanInvestigationReport /></div>
          <ComparisonRail team="agent" elapsed={comparisonElapsed / 30_000} onClick={toggleReport} />
        </div>
        </div>
      )}
      <footer className="race-footnote"><span>ILLUSTRATIVE SCENARIO <b>·</b> Timings are simulated and compressed for this demo.</span><button onClick={onReplay}>↺ Replay experience</button></footer>
    </main>
  );
}
