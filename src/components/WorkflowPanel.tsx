import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { config } from '../config';
import { InstagramPostCard } from './InstagramPostCard';
import { BatchLabelScan } from './BatchLabelScan';
import { SocialMediaAgentRun } from './SocialMediaAgentRun';
import { RcaAgentRun, rcaTaskIndex } from './RcaAgentRun';
import { OrchestratorGraph, ORCHESTRATOR_PLAN_STARTS } from './OrchestratorGraph';

export type WorkflowStage =
  | 'socialMedia'
  | 'orchestrator'
  | 'orchestratorApproval'
  | 'identification'
  | 'rca'
  | 'resolution'
  | 'recall'
  | 'comms'
  | 'support'
  | 'outcome';

export const AUTO_STAGE_DURATIONS: Partial<Record<WorkflowStage, number>> = {
  socialMedia: 19_000,
  orchestrator: 12_500,
  identification: 20_000,
  rca: 22_000,
};

type Decision = typeof config.agentRace.decisions[number];
type Region = 'North' | 'South' | 'East' | 'West' | 'Central';

interface Props {
  stage: WorkflowStage;
  paused: boolean;
  decision: Decision | null;
  regions: Region[];
  publicDraft: string;
  channels: string[];
  customerDraft: string;
  compensation: 'Hamper' | 'Voucher';
  approvalFeedback: WorkflowStage | null;
  onAdvance: () => void;
  onApproval: (stage: WorkflowStage) => void;
  onChooseDecision: (decision: Decision) => void;
  onToggleRegion: (region: Region) => void;
  onSetRegions: (regions: Region[]) => void;
  onPublicDraft: (value: string) => void;
  onToggleChannel: (channel: string) => void;
  onCustomerDraft: (value: string) => void;
  onCompensation: (value: 'Hamper' | 'Voucher') => void;
}

const stages: { id: WorkflowStage; name: string; summary: string; tasks: string[] }[] = [
  { id: 'socialMedia', name: 'Social Media Agent', summary: 'Spots the complaint and gets the details needed to help.', tasks: ['Detect company tag', 'Collect contact details', 'Hand off incident'] },
  { id: 'orchestrator', name: 'Orchestrator Agent', summary: 'Sets the investigation plan and assigns the work.', tasks: ['Set the plan', 'Connect the evidence', 'Request approval'] },
  { id: 'identification', name: 'Identification Agent', summary: 'Finds the exact product batch involved.', tasks: ['Scan the image', 'Read the batch number', 'Match the production record'] },
  { id: 'rca', name: 'RCA Agent', summary: 'Finds what went wrong and where the stock went.', tasks: ['Search factory logs', 'Find the anomaly', 'Map affected stores'] },
  { id: 'resolution', name: 'Response Planning Agent', summary: 'Puts clear response choices in front of a person.', tasks: ['Collate the options', 'Summarise the risks', 'Request approval'] },
  { id: 'recall', name: 'Recall Agent', summary: 'Tells affected stores to remove stock.', tasks: ['Draft store list', 'Confirm selected regions', 'Issue recall orders'] },
  { id: 'comms', name: 'Public Response Agent', summary: 'Prepares a clear update for customers.', tasks: ['Draft public update', 'Select channels', 'Request approval'] },
  { id: 'support', name: 'Customer Care Agent', summary: 'Makes things right with the customer.', tasks: ['Draft personal message', 'Choose compensation', 'Request approval'] },
];

const regions: { name: Region; stores: number }[] = [
  { name: 'North', stores: 8 }, { name: 'South', stores: 9 }, { name: 'East', stores: 7 }, { name: 'West', stores: 10 }, { name: 'Central', stores: 6 },
];
const channels = ['Website', 'Instagram', 'Twitter', 'Email', 'In-store notice'];

function activeStageId(stage: WorkflowStage): WorkflowStage {
  return stage === 'orchestratorApproval' ? 'orchestrator' : stage === 'outcome' ? 'support' : stage;
}

export function WorkflowPanel(props: Props) {
  const { stage, paused, decision, regions: selectedRegions, publicDraft, channels: selectedChannels, customerDraft, compensation, approvalFeedback } = props;
  const activeId = activeStageId(stage);
  const activeIndex = stages.findIndex((item) => item.id === activeId);
  const selectedStores = selectedRegions.reduce((total, region) => total + (regions.find((item) => item.name === region)?.stores ?? 0), 0);
  const canRunComms = decision?.id === 'full';
  const [showCustomerUpdate, setShowCustomerUpdate] = useState(false);
  const displayStages = stages.filter((item) => {
    const itemIndex = stages.findIndex((entry) => entry.id === item.id);
    const noActionSkipsAgent = decision?.id === 'nothing' && ['recall', 'comms', 'support'].includes(item.id);
    return itemIndex <= activeIndex && !noActionSkipsAgent && (item.id !== 'comms' || canRunComms || stage === 'comms');
  });
  const progress = useStageProgress(stage, paused);
  const visualProgress = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : progress;
  const onAdvance = props.onAdvance;
  useEffect(() => {
    if (!paused && progress >= 1 && AUTO_STAGE_DURATIONS[stage]) onAdvance();
  }, [stage, progress, paused, onAdvance]);
   const activeTaskIndex = stage === 'identification'
     ? visualProgress >= .8 ? 3 : visualProgress >= 5.7 / 12 ? 2 : visualProgress >= 3.75 / 12 ? 1 : 0
     : stage === 'socialMedia'
       ? visualProgress >= 15 / 19 ? 3 : visualProgress >= 9.2 * 15 / (12.4 * 19) ? 2 : visualProgress >= 4.6 * 15 / (12.4 * 19) ? 1 : 0
     : stage === 'rca'
       ? rcaTaskIndex(visualProgress)
     : Math.min(2, Math.floor(progress * 3));
   const preparing = ['resolution', 'recall', 'comms', 'support'].includes(stage) && progress < 1;
   const controlsPaused = paused || preparing || Boolean(approvalFeedback);
  const runColumnRef = useRef<HTMLDivElement>(null);
  const approvalAgent: Partial<Record<WorkflowStage, WorkflowStage>> = {
    orchestratorApproval: 'orchestrator',
    resolution: 'resolution',
    recall: 'recall',
    comms: 'comms',
    support: 'support',
  };

  useEffect(() => {
    runColumnRef.current?.scrollTo({
      top: runColumnRef.current.scrollHeight,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [stage, activeTaskIndex]);

  return (
    <section className="workflow-panel" data-stage={stage} data-paused={paused}>
      <header className="workflow-heading">
        <div><span>02 /</span><h2>Intugle Agent Workflow</h2></div>
        <p>Connected evidence, governed decisions, auditable action</p>
      </header>

      <div className="workflow-layout">
        <div ref={runColumnRef} className="workflow-run-column">
          <div className="workflow-intro">
            <span>LIVE WORKFLOW</span>
            <strong>{stage === 'outcome' ? 'Response completed' : 'Agents coordinate the incident without losing context.'}</strong>
          </div>
          {displayStages.map((item) => {
            const itemIndex = stages.findIndex((entry) => entry.id === item.id);
            const complete = itemIndex < activeIndex || stage === 'outcome';
            const awaitingApproval = !preparing && stage !== 'resolution' && approvalAgent[stage] === item.id;
            const awaitingDecision = !preparing && stage === 'resolution' && item.id === 'resolution';
            const active = item.id === activeId && stage !== 'outcome' && !awaitingApproval && !awaitingDecision;
            const skipped = item.id === 'comms' && decision?.id === 'recall';
            const workComplete = complete || awaitingApproval || awaitingDecision;
            return (
              <article key={item.id} className={`workflow-agent${complete ? ' done' : ''}${active ? ' active' : ''}${awaitingApproval || awaitingDecision ? ' awaiting-approval' : ''}${skipped ? ' skipped' : ''}`}>
                <div className="workflow-agent-topline"><span>{workComplete ? '✓' : active ? <i className="spin-ring" /> : '○'}</span><b>{item.name}</b><em>{skipped ? 'Skipped' : awaitingDecision ? 'Human decision required' : awaitingApproval ? 'Awaiting approval' : complete ? 'Complete' : active ? 'Running' : 'Queued'}</em></div>
                {(workComplete || active) && <small>{item.summary}</small>}
                {active && <div className="workflow-task-list">{item.tasks.map((task, index) => <span key={task} className={index < activeTaskIndex ? 'done' : index === activeTaskIndex ? 'active' : ''}><i>{index < activeTaskIndex ? '✓' : index === activeTaskIndex ? <i className="spin-ring" /> : '○'}</i><b>{task}</b><em>{index < activeTaskIndex ? 'Done' : index === activeTaskIndex ? 'Working now' : 'Next'}</em></span>)}</div>}
                {(awaitingApproval || awaitingDecision) && <div className="workflow-task-list approval-wait"><span className="done"><i>✓</i><b>{awaitingDecision ? 'Response options collated' : item.tasks[0]}</b><em>Done</em></span><span><i>○</i><b>{awaitingDecision ? 'Human selects response' : 'Human approval required'}</b><em>Waiting</em></span></div>}
                {workComplete && <p>{completedFinding(item.id, decision, selectedStores)}</p>}
              </article>
            );
          })}
        </div>

        <aside className="workflow-right-column" aria-live="polite">
          <div className="workflow-product-window">
            <div className="workflow-product-rail"><img src="/assets/intugle-icon.svg" alt="Intugle" /><span>AI</span></div>
            <div className="workflow-visual">
              <header><span>{visualLabel(stage)}</span><small>{stage === 'outcome' ? 'AUDIT TRAIL COMPLETE' : 'LIVE WORKSPACE'}</small></header>
              {stage === 'socialMedia' && <SocialMediaAgentRun progress={visualProgress} />}
              {(stage === 'orchestrator' || stage === 'orchestratorApproval') && <OrchestratorVisual progress={visualProgress} ready={stage === 'orchestratorApproval'} onAdvance={() => props.onApproval('orchestratorApproval')} paused={paused || Boolean(approvalFeedback)} />}
              {stage === 'identification' && <BatchLabelScan progress={visualProgress} />}
              {stage === 'rca' && <RcaAgentRun progress={visualProgress} />}
              {stage === 'resolution' && <ResolutionVisual progress={progress} decision={decision} onChoose={props.onChooseDecision} onAdvance={props.onAdvance} paused={controlsPaused} />}
              {stage === 'recall' && <RecallVisual progress={progress} selectedRegions={selectedRegions} selectedStores={selectedStores} onToggle={props.onToggleRegion} onSetRegions={props.onSetRegions} onAdvance={() => props.onApproval('recall')} paused={controlsPaused} />}
              {stage === 'comms' && <CommsVisual progress={progress} draft={publicDraft} channels={selectedChannels} onDraft={props.onPublicDraft} onToggle={props.onToggleChannel} onAdvance={() => props.onApproval('comms')} paused={controlsPaused} />}
              {stage === 'support' && <SupportVisual progress={progress} draft={customerDraft} compensation={compensation} onDraft={props.onCustomerDraft} onCompensation={props.onCompensation} onAdvance={() => props.onApproval('support')} paused={controlsPaused} />}
              {stage === 'outcome' && <OutcomeVisual decision={decision} selectedStores={selectedStores} compensation={compensation} showCustomerUpdate={showCustomerUpdate} onViewCustomerUpdate={() => setShowCustomerUpdate(true)} onBackToOutcome={() => setShowCustomerUpdate(false)} />}
              {approvalFeedback && <ApprovalFeedback stage={approvalFeedback} regions={selectedRegions} channels={selectedChannels} compensation={compensation} />}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function completedFinding(id: WorkflowStage, decision: Decision | null, selectedStores: number) {
  const findings: Partial<Record<WorkflowStage, string>> = {
    socialMedia: 'Company tag detected minutes after publication. Sarah’s contact details collected.',
    orchestrator: 'Plan approved: identify, investigate, then prepare a governed response.',
    identification: 'Batch HLD-2407-A extracted from the image and matched to Line 4.',
    rca: '160°C → 134°C temperature drop linked to 40 affected stores.',
    resolution: 'Risk-aware response options collated for human review.',
    recall: `${selectedStores || 40} stores selected for stock withdrawal.`,
    comms: 'Approved public apology prepared for selected channels.',
    support: `Personal customer response approved with ${compensationLabel(decision)}.`,
  };
  return findings[id] ?? 'Completed.';
}

function compensationLabel(decision: Decision | null) { return decision?.id === 'nothing' ? 'no compensation' : 'customer compensation'; }
function visualLabel(stage: WorkflowStage) { return stage === 'orchestrator' ? 'Semantic Context Graph' : stage === 'resolution' ? 'Human Decision Required' : stage === 'outcome' ? 'Incident Outcome' : 'Agent Workspace'; }

function ApprovalHeading({ title, decision = false }: { title: string; decision?: boolean }) {
  return <header className="approval-heading"><span>{decision ? 'HUMAN DECISION REQUIRED' : 'HUMAN APPROVAL REQUIRED'}</span><h3>{title}</h3></header>;
}

function Reveal({ visible, children, className = '' }: { visible: boolean; children: ReactNode; className?: string }) {
  return <div className={`stage-reveal ${className}${visible ? ' visible' : ''}`} inert={!visible}>{children}</div>;
}

function ApprovalFeedback({ stage, regions: selectedRegions, channels, compensation }: { stage: WorkflowStage; regions: Region[]; channels: string[]; compensation: 'Hamper' | 'Voucher' }) {
  if (stage === 'orchestratorApproval') return <div className="approval-feedback feedback-plan"><span>PLAN APPROVED</span><strong>Investigation brief released</strong><div className="feedback-plan-lines"><i /><i /><i /></div><p>Batch identification, root-cause analysis, and response planning are now authorised.</p></div>;
  if (stage === 'recall') {
    const selectedStores = selectedRegions.reduce((total, region) => total + (regions.find((item) => item.name === region)?.stores ?? 0), 0);
    const recallRegions: [Region, number, number][] = [['North', 192, 82], ['West', 158, 160], ['Central', 194, 151], ['East', 231, 151], ['South', 211, 205]];
    return <div className="approval-feedback feedback-recall"><span>RECALL ORDERS ISSUED</span><strong>{selectedStores} stores notified</strong><div className="feedback-recall-map"><svg viewBox="125 0 155 250" role="img" aria-label="UK map showing selected recall regions"><path className="recall-uk-outline" d="M180 14c18 5 27 19 25 34l12 15-4 21 16 15-4 22 13 18-12 17 10 22-13 19 5 27-20 15-11 24-20-4-12-27-17-9-5-27-19-19 4-24-12-21 12-23-5-26 13-18 2-27 18-17 2-24 18-13Z" /><path className="recall-ireland-outline" d="M99 115l14-15 17 8 4 23-11 21-16-3-10-18 2-16Z" />{recallRegions.map(([region, x, y]) => { const selected = selectedRegions.includes(region); return <g key={region} className={`recall-region-node${selected ? ' selected' : ''}`}><line x1="194" y1="151" x2={x} y2={y} /><circle cx={x} cy={y} r="7" /><text x={x + 11} y={y + 4}>{region}</text>{selected && <text className="recall-issued" x={x + 11} y={y + 16}>Order issued</text>}</g>; })}</svg></div><p>{selectedRegions.join(', ')} selected for stock withdrawal.</p></div>;
  }
  if (stage === 'comms') return <div className="approval-feedback feedback-comms"><span>PUBLIC RESPONSE PUBLISHED</span><strong>{channels.length} selected channels updated</strong><div className="feedback-channel-row">{channels.map((channel) => <b key={channel}>{channel}</b>)}</div><p>The approved public statement is now distributing.</p></div>;
  return <div className="approval-feedback feedback-support"><span>CUSTOMER RESPONSE SENT</span><strong>Sarah&apos;s case has been updated</strong><div className="feedback-message"><b>To Sarah Mitchell</b><p>Personal response delivered · {compensation} confirmed</p></div><p>Customer care record linked to the incident.</p></div>;
}

function OrchestratorVisual({ progress, ready, onAdvance, paused }: Pick<Props, 'onAdvance' | 'paused'> & { progress: number; ready: boolean }) {
  const elapsedSeconds = ready ? 12.5 : progress * 12.5;
  const graphComplete = elapsedSeconds >= 8;
  const graphProgress = Math.min(1, elapsedSeconds / 8);
  const time = Math.max(0, elapsedSeconds - 8);
  const planItems = [
    ['Confirm the exact product batch', 'HLD-2407-A identified from Sarah’s post'],
    ['Find the cause and affected stores', 'Check Line 4 logs and trace all deliveries'],
    ['Prepare clear response choices', 'Withdraw stock, inform customers, and support Sarah'],
  ] as const;
  const visiblePlanItems = planItems.filter((_, i) => time >= ORCHESTRATOR_PLAN_STARTS[i]);
  return <div className="orchestrator-workspace"><OrchestratorGraph progress={graphProgress} ready={graphComplete} /><section className="orchestrator-plan merged-approval" style={{ visibility: graphComplete ? 'visible' : 'hidden' }} inert={!graphComplete}><ApprovalHeading title="Approve the incident plan" />{visiblePlanItems.map(([title, detail], index) => {
    const elapsed = time - ORCHESTRATOR_PLAN_STARTS[index];
    const drafted = elapsed >= 1.2;
    const typed = title.slice(0, Math.round(Math.max(0, Math.min(1, (elapsed - .15) / .9)) * title.length));
    return <div key={title} className={drafted ? 'drafted' : 'active'}><i>{index + 1}</i><p><b className="orchestrator-typed-title"><span aria-hidden="true">{title}</span><span>{typed}</span></b><small>{elapsed >= .8 ? detail : '\u00a0'}</small></p><em>{drafted ? '✓ Drafted' : 'Drafting'}</em></div>;
  })}<button className="approval-action" disabled={paused || !ready} onClick={onAdvance}>{ready ? 'Approve plan' : 'Preparing incident plan'} →</button></section></div>;
}

function ResolutionVisual({ progress, decision, onChoose, onAdvance, paused }: { progress: number; decision: Decision | null; onChoose: (decision: Decision) => void; onAdvance: () => void; paused: boolean }) {
  return <section className="resolution-workspace merged-approval"><ApprovalHeading title="Choose the incident response" decision /><Reveal visible={progress >= .12} className="response-evidence"><span>✓ Batch identified</span><span>✓ Root cause confirmed</span><span>✓ 40-store exposure linked</span></Reveal><div className="decision-option-list">{config.agentRace.decisions.map((item, index) => <Reveal key={item.id} visible={progress >= .28 + index * .22}><button disabled={paused} className={`decision-option risk-${item.risk}${decision?.id === item.id ? ' selected' : ''}`} onClick={() => onChoose(item)}><span className="decision-radio" /><span className="decision-option-main"><span className="decision-option-topline"><strong>{item.title}</strong>{item.badge && <em>{item.badge}</em>}</span><small>{item.description}</small></span><span className="decision-option-meta"><b>{item.risk} risk</b></span></button></Reveal>)}</div><button className="approval-action" disabled={paused || !decision} onClick={onAdvance}>Approve selected response →</button></section>;
}

function RecallVisual({ progress, selectedRegions, selectedStores, onToggle, onSetRegions, onAdvance, paused }: { progress: number; selectedRegions: Region[]; selectedStores: number; onToggle: (region: Region) => void; onSetRegions: (regions: Region[]) => void; onAdvance: () => void; paused: boolean }) {
  return <section className="recall-workspace merged-approval"><ApprovalHeading title="Approve stock withdrawal" /><Reveal visible={progress >= .15} className="recall-heading"><strong>{selectedStores} of 40 stores selected</strong><p>Only selected stores will receive withdrawal orders.</p></Reveal><div className="region-grid">{regions.map((region, index) => <Reveal key={region.name} visible={progress >= .25 + index * .12}><button disabled={paused} className={selectedRegions.includes(region.name) ? 'selected' : ''} onClick={() => onToggle(region.name)}><b>{region.name}</b><span>{region.stores} stores</span></button></Reveal>)}</div><Reveal visible={progress >= .85} className="recall-actions"><button disabled={paused} onClick={() => onSetRegions(regions.map((item) => item.name))}>Select all 40</button><button disabled={paused} onClick={() => onSetRegions([])}>Clear selection</button></Reveal><button className="approval-action" disabled={paused || selectedStores === 0} onClick={onAdvance}>Issue recall orders →</button></section>;
}

function CommsVisual({ progress, draft, channels: selected, onDraft, onToggle, onAdvance, paused }: { progress: number; draft: string; channels: string[]; onDraft: (value: string) => void; onToggle: (channel: string) => void; onAdvance: () => void; paused: boolean }) {
  return <section className="comms-workspace merged-approval"><ApprovalHeading title="Approve the public statement" /><Reveal visible={progress >= .2} className="draft-reveal"><label>PUBLIC APOLOGY DRAFT<textarea disabled={paused} value={draft} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onDraft(event.target.value)} /></label></Reveal><Reveal visible={progress >= .65} className="channel-select"><span>PUBLISH ON · {selected.length} SELECTED</span>{channels.map((channel) => <button disabled={paused} key={channel} className={selected.includes(channel) ? 'selected' : ''} onClick={() => onToggle(channel)}>{selected.includes(channel) ? '✓ ' : ''}{channel}</button>)}</Reveal><button className="approval-action" disabled={paused || selected.length === 0 || !draft.trim()} onClick={onAdvance}>Publish approved response →</button></section>;
}

function SupportVisual({ progress, draft, compensation, onDraft, onCompensation, onAdvance, paused }: { progress: number; draft: string; compensation: 'Hamper' | 'Voucher'; onDraft: (value: string) => void; onCompensation: (value: 'Hamper' | 'Voucher') => void; onAdvance: () => void; paused: boolean }) {
  return <section className="support-workspace merged-approval"><ApprovalHeading title="Approve Sarah’s customer response" /><Reveal visible={progress >= .2} className="draft-reveal"><label>CUSTOMER MESSAGE<textarea disabled={paused} value={draft} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onDraft(event.target.value)} /></label></Reveal><Reveal visible={progress >= .65} className="compensation-grid">{(['Hamper', 'Voucher'] as const).map((item) => <button disabled={paused} key={item} className={compensation === item ? 'selected' : ''} onClick={() => onCompensation(item)}><b>{item}</b><span>{item === 'Hamper' ? 'Curated apology hamper' : '£40 goodwill voucher'}</span></button>)}</Reveal><Reveal visible={progress >= .85}><p>Sarah Mitchell · verified contact · {compensation} selected</p></Reveal><button className="approval-action" disabled={paused || !draft.trim()} onClick={onAdvance}>Send customer response →</button></section>;
}

function OutcomeVisual({ decision, selectedStores, compensation, showCustomerUpdate, onViewCustomerUpdate, onBackToOutcome }: { decision: Decision | null; selectedStores: number; compensation: 'Hamper' | 'Voucher'; showCustomerUpdate: boolean; onViewCustomerUpdate: () => void; onBackToOutcome: () => void }) {
  if (showCustomerUpdate && decision?.id === 'full') {
    const update = compensation === 'Voucher' ? config.agentRace.voucherUpdate : config.agentRace.customerUpdate;
    return <div className="customer-appreciation"><button onClick={onBackToOutcome}>← Back to outcome</button><article className="ig-card instagram-embedded"><InstagramPostCard post={update} imageSrc={compensation === 'Voucher' ? config.assets.voucher : config.assets.hamper} reactionCount={update.counters.likes} /></article></div>;
  }
  if (decision?.id === 'nothing') return <div className="workflow-outcome bad"><span>NO ACTION TAKEN</span><strong>FreshMart delists the product range</strong><p>Supplier products removed from stores. Public complaint is trending. A formal health-authority investigation has opened.</p></div>;
  return <div className="workflow-outcome"><span>APPROVED ACTIONS COMPLETED</span><strong>{decision?.id === 'recall' ? 'Stock withdrawn. Public concern remains.' : 'Incident resolved with evidence and care.'}</strong><p>{selectedStores || 40} stores received withdrawal orders. {decision?.id === 'full' ? `Sarah received an approved ${compensation.toLowerCase()} and a direct response.` : 'No public statement was issued.'}</p>{decision?.id === 'full' && <button className="outcome-customer-update" onClick={onViewCustomerUpdate}>View Sarah&apos;s update →</button>}</div>;
}

function useStageProgress(stage: WorkflowStage, paused: boolean) {
  const [clock, setClock] = useState({ stage, progress: 0 });
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    setClock({ stage, progress: 0 });
  }, [stage]);
  useEffect(() => {
    const duration = AUTO_STAGE_DURATIONS[stage] ?? (['resolution', 'recall', 'comms', 'support'].includes(stage) ? 4_500 : 0);
    if (!duration || paused) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setClock({ stage, progress: AUTO_STAGE_DURATIONS[stage] ? 0 : 1 });
      if (!AUTO_STAGE_DURATIONS[stage]) return;
    }
    let lastFrame = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      elapsed.current += now - lastFrame;
      lastFrame = now;
      setClock({ stage, progress: Math.min(1, elapsed.current / duration) });
      if (elapsed.current < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stage, paused]);
  return clock.stage === stage ? clock.progress : 0;
}
