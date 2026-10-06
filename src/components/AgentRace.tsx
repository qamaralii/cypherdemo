import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { IncidentHeader } from './IncidentHeader';
import { HumanPanel, HUMAN_MESSAGE_COUNT } from './HumanPanel';
import { AUTO_STAGE_DURATIONS, WorkflowPanel } from './WorkflowPanel';
import type { WorkflowStage } from './WorkflowPanel';
import { config } from '../config';
import type { HopTarget } from '../hooks/useSceneController';
import './race.css';

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

const allRegions: Region[] = ['North', 'South', 'East', 'West', 'Central'];
const defaultPublicDraft = 'We are sorry for the concern caused by a product-quality incident. We have withdrawn the affected batch from stores and are working directly with customers who contacted us.';
const defaultCustomerDraft = 'Hi Sarah, thank you for bringing this to our attention. We are sorry for your experience. We have identified the affected batch, withdrawn stock, and would like to make this right for you.';

export function AgentRace({ paused, onReplay, hopTarget, registerNextHandler, registerPrevHandler }: Props) {
  const [humanStage, setHumanStage] = useState<HumanStage>('intro');
  const [humanMessageIndex, setHumanMessageIndex] = useState(0);
  const [humanJumpMessage, setHumanJumpMessage] = useState<{ step: number; id: number }>();
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [regions, setRegions] = useState<Region[]>(allRegions);
  const [publicDraft, setPublicDraft] = useState(defaultPublicDraft);
  const [channels, setChannels] = useState(['Website', 'Instagram', 'Email']);
  const [customerDraft, setCustomerDraft] = useState(defaultCustomerDraft);
  const [compensation, setCompensation] = useState<'Hamper' | 'Voucher'>('Hamper');
  const [approvalFeedback, setApprovalFeedback] = useState<WorkflowStage | null>(null);
  const approvalTimeline = useRef<gsap.core.Timeline | null>(null);
  const [agentLaunch, setAgentLaunch] = useState(false);
  const agentLaunchTimeline = useRef<gsap.core.Timeline | null>(null);

  const handleHumanComplete = useCallback(() => {
    setHumanStage('summary');
  }, []);

  const startWorkflow = useCallback(() => {
    setAgentLaunch(true);
    setDecision(null);
    setRegions(allRegions);
    setPublicDraft(defaultPublicDraft);
    setChannels(['Website', 'Instagram', 'Email']);
    setCustomerDraft(defaultCustomerDraft);
    setCompensation('Hamper');
  }, []);

  useEffect(() => {
    if (!agentLaunch) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAgentLaunch(false);
      setWorkflowStage('socialMedia');
      return;
    }
    const timeline = gsap.timeline({
      onComplete: () => {
        setAgentLaunch(false);
        setWorkflowStage('socialMedia');
      },
    });
    timeline
      .fromTo('.agent-launch-agent-app', { clipPath: 'inset(0 0 0 100%)', opacity: 0 }, { clipPath: 'inset(0 0 0 0%)', opacity: 1, duration: 0.7, ease: 'power3.out' })
      .to('.agent-launch-manual-app', { filter: 'saturate(.3) contrast(.9)', opacity: 0.45, duration: 0.7, ease: 'power2.out' }, 0)
      .to('.agent-launch-divider', { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.55)
      .from('.agent-launch-agent-row', { opacity: 0, x: 22, stagger: 0.12, duration: 0.35, ease: 'power2.out' }, 0.65)
      .to('.agent-launch-agent-app', { width: '100%', duration: 0.8, ease: 'power2.inOut' }, '+=0.15')
      .to('.agent-launch-manual-app', { opacity: 0, duration: 0.55, ease: 'power2.in' }, '<')
      .to('.agent-launch-divider', { opacity: 0, scale: 0.8, duration: 0.25 }, '<')
      .to({}, { duration: 1.2 });
    agentLaunchTimeline.current = timeline;
    return () => {
      timeline.kill();
      agentLaunchTimeline.current = null;
    };
  }, [agentLaunch]);

  useEffect(() => {
    agentLaunchTimeline.current?.paused(paused);
  }, [paused]);

  const advanceWorkflow = useCallback(() => {
    setWorkflowStage((current) => {
      if (!current) return current;
      if (current === 'socialMedia') return 'orchestrator';
      if (current === 'orchestrator') return 'orchestratorApproval';
      if (current === 'orchestratorApproval') return 'identification';
      if (current === 'identification') return 'rca';
      if (current === 'rca') return 'resolution';
      if (current === 'resolution') return 'reviewOptions';
      if (current === 'reviewOptions') {
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
    approvalTimeline.current?.paused(paused);
  }, [paused]);

  useEffect(() => {
    if (paused || !workflowStage || !['socialMedia', 'orchestrator', 'identification', 'rca'].includes(workflowStage)) return;
    const duration = AUTO_STAGE_DURATIONS[workflowStage] ?? 0;
    const timer = window.setTimeout(advanceWorkflow, duration);
    return () => window.clearTimeout(timer);
  }, [workflowStage, paused, advanceWorkflow]);

  const toggleRegion = useCallback((region: Region) => {
    setRegions((current) => current.includes(region) ? current.filter((item) => item !== region) : [...current, region]);
  }, []);
  const toggleChannel = useCallback((channel: string) => {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  }, []);

  const handleNext = useCallback(() => {
    if (agentLaunch) return true;
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
    if (['orchestratorApproval', 'resolution', 'reviewOptions', 'recall', 'comms', 'support', 'outcome'].includes(workflowStage)) return true;
    advanceWorkflow();
    return true;
  }, [agentLaunch, workflowStage, humanStage, humanMessageIndex, advanceWorkflow]);

  const handlePrev = useCallback(() => {
    if (agentLaunch) {
      setAgentLaunch(false);
      setWorkflowStage(null);
      setApprovalFeedback(null);
      setHumanStage('summary');
      return true;
    }
    if (!workflowStage) {
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
      orchestrator: 'socialMedia', orchestratorApproval: 'orchestrator', identification: 'orchestratorApproval', rca: 'identification', resolution: 'rca', reviewOptions: 'resolution', recall: 'reviewOptions', comms: 'recall', support: decision?.id === 'full' ? 'comms' : 'recall', outcome: decision?.id === 'nothing' ? 'reviewOptions' : 'support',
    };
    const target = previous[workflowStage];
    if (target) setWorkflowStage(target);
    return true;
  }, [agentLaunch, workflowStage, humanStage, humanMessageIndex, decision]);

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
    const full = config.agentRace.decisions[0]!;
    const targetMap: Record<Exclude<HopTarget, 'humanStart' | 'humanEnd'>, WorkflowStage> = {
      unstructuredStart: 'socialMedia', analysisStart: 'orchestrator', resolutionGate: 'identification', diagnosis: 'rca', decision: 'reviewOptions', execution: 'recall', outcome: 'outcome',
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
        <div className="workflow-human-stage">
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
            {humanStage === 'intro' && <button onClick={() => setHumanStage('running')}>Start human simulation →</button>}
          </aside>
          {agentLaunch && <AgentLaunchTransition />}
        </div>
      ) : (
        <WorkflowPanel
          stage={workflowStage}
          paused={paused}
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
      )}
      <footer className="race-footnote"><span>ILLUSTRATIVE SCENARIO <b>·</b> Timings are simulated and compressed for this demo.</span><button onClick={onReplay}>↺ Replay experience</button></footer>
    </main>
  );
}

function AgentLaunchTransition() {
  return <div className="agent-launch-transition" aria-live="polite"><div className="agent-launch-frame">
    <section className="agent-launch-manual-app">
      <header><span>BEFORE · MANUAL COORDINATION</span><em>Manual handoffs · 13 hrs 40 mins</em></header>
      <strong>Customer complaint <b>HLD-2407-A</b></strong>
      <div className="agent-launch-manual-rows"><p><i>1</i><span>Post noticed</span><b>Ava</b><em>3 hrs later</em></p><p><i>2</i><span>Senior review</span><b>Maya</b><em>20 mins later</em></p><p><i>3</i><span>Quality check</span><b>Priya</b><em>Waiting on logs</em></p><p><i>4</i><span>Store tracing</span><b>Elena</b><em>Access request</em></p><p><i>5</i><span>Exposure analysis</span><b>Noah</b><em>Data mismatch</em></p><p className="launch-risk"><i>!</i><span>Response decision</span><b>Management</b><em>Still unresolved</em></p></div>
      <footer><span>TIME TO RESOLUTION</span><strong>13 hrs 40 mins · unresolved</strong></footer>
    </section>
    <div className="agent-launch-divider">→</div>
    <section className="agent-launch-agent-app">
      <header><span>AFTER · INTUGLE ORCHESTRATION</span><em>Connected evidence · governed human approval</em></header>
      <strong>Intugle Agent Workflow</strong>
      <div className="agent-launch-rows"><p className="agent-launch-agent-row"><i />Detect company mention <b>Social Media Agent</b></p><p className="agent-launch-agent-row"><i />Build investigation plan <b>Orchestrator Agent</b></p><p className="agent-launch-agent-row"><i />Identify product batch <b>Identification Agent</b></p><p className="agent-launch-agent-row"><i />Find cause and exposure <b>Find the Cause Agent</b></p><p className="agent-launch-agent-row launch-human-approval"><i>YOU</i>Approve key decisions <b>Human-in-the-loop</b></p></div>
      <footer><strong>Evidence connected in minutes</strong><span>One workflow · no handoffs lost</span></footer>
    </section>
  </div></div>;
}
