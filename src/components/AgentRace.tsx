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

type HumanStage = 'intro' | 'running' | 'summary';
type Decision = typeof config.agentRace.decisions[number];
type Region = 'North' | 'South' | 'East' | 'West' | 'Central';

interface Props {
  paused: boolean;
  onReplay: () => void;
  hopTarget?: { target: HopTarget; id: number } | null;
  registerNextHandler?: (handler: (() => boolean) | null) => void;
  registerPrevHandler?: (handler: (() => boolean) | null) => void;
}

const defaultPublicDraft = 'Dear Customers,\n\nWe sincerely apologise for the concern and inconvenience caused by the quality issue affecting YummChips batch HLD-2407-A. Our investigation identified a sealing-temperature deviation during production, and we have issued withdrawal orders to the affected stores.\n\nCustomers who purchased this batch should not consume the product and should contact our customer care team for assistance. We are addressing the production issue and will provide further updates as verified information becomes available. Product quality and customer trust remain our priorities.\n\nYours sincerely,\nThe YummChips Team';
const defaultCustomerDraft = 'Hi Sarah, thank you for bringing this to our attention. We are sorry for your experience. We have identified the affected batch, withdrawn stock, and would like to make this right for you.';

export function AgentRace({ paused, onReplay, hopTarget, registerNextHandler, registerPrevHandler }: Props) {
  const [humanStage, setHumanStage] = useState<HumanStage>('intro');
  const [humanMessageIndex, setHumanMessageIndex] = useState(0);
  const [humanJumpMessage, setHumanJumpMessage] = useState<{ step: number; id: number }>();
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage | null>(null);
  const [decision, setDecision] = useState<Decision | null>(config.agentRace.decisions[0]!);
  const [regions, setRegions] = useState<Region[]>(['North']);
  const [publicDraft, setPublicDraft] = useState(defaultPublicDraft);
  const [channels, setChannels] = useState(['Website']);
  const [customerDraft, setCustomerDraft] = useState(defaultCustomerDraft);
  const [compensation, setCompensation] = useState<'Hamper' | 'Voucher'>('Hamper');
  const [approvalFeedback, setApprovalFeedback] = useState<WorkflowStage | null>(null);
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
    setPublicDraft(defaultPublicDraft);
    setChannels(['Website']);
    setCustomerDraft(defaultCustomerDraft);
    setCompensation('Hamper');
  }, []);

  const advanceWorkflow = useCallback(() => {
    setWorkflowStage((current) => {
      if (!current) return current;
      if (current === 'socialMedia') return 'orchestrator';
      if (current === 'orchestrator') return 'orchestratorApproval';
      if (current === 'orchestratorApproval') return 'identification';
      if (current === 'identification') return 'rca';
      if (current === 'rca') return 'resolution';
       if (current === 'resolution') {
         if (!decision) return current;
         return decision.id === 'nothing' ? 'outcome' : 'recall';
       }
      if (current === 'recall') return decision?.id === 'full' ? 'comms' : 'support';
      if (current === 'comms') return 'support';
      if (current === 'support') return 'outcome';
      return current;
    });
  }, [decision]);

  const approveWithFeedback = useCallback((stage: WorkflowStage) => {
    setApprovalFeedback(stage);
  }, []);

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

  const toggleRegion = useCallback((region: Region) => {
    setRegions((current) => current.includes(region) ? current.filter((item) => item !== region) : [...current, region]);
  }, []);
  const toggleChannel = useCallback((channel: string) => {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
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
    if (['orchestratorApproval', 'resolution', 'recall', 'comms', 'support', 'outcome'].includes(workflowStage)) return true;
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
       orchestrator: 'socialMedia', orchestratorApproval: 'orchestrator', identification: 'orchestratorApproval', rca: 'identification', resolution: 'rca', recall: 'resolution', comms: 'recall', support: decision?.id === 'full' ? 'comms' : 'recall', outcome: decision?.id === 'nothing' ? 'resolution' : 'support',
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
          decision={decision}
          regions={regions}
          publicDraft={publicDraft}
          channels={channels}
          customerDraft={customerDraft}
          compensation={compensation}
          approvalFeedback={approvalFeedback}
          onAdvance={advanceWorkflow}
          onApproval={approveWithFeedback}
          onChooseDecision={setDecision}
          onToggleRegion={toggleRegion}
          onSetRegions={setRegions}
          onPublicDraft={setPublicDraft}
          onToggleChannel={toggleChannel}
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
