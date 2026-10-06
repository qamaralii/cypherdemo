import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { config } from '../config';
import { InstagramPostCard } from './InstagramPostCard';

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
  orchestrator: 8_000,
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
   const activeTaskIndex = Math.min(2, Math.floor(progress * 3));
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
            <div className="workflow-product-rail"><img src="/assets/intugle-logo.svg" alt="Intugle" /><span>AI</span></div>
            <div className="workflow-visual">
              <header><span>{visualLabel(stage)}</span><small>{stage === 'outcome' ? 'AUDIT TRAIL COMPLETE' : 'LIVE WORKSPACE'}</small></header>
              {stage === 'socialMedia' && <SocialVisual progress={visualProgress} />}
              {(stage === 'orchestrator' || stage === 'orchestratorApproval') && <OrchestratorVisual progress={visualProgress} ready={stage === 'orchestratorApproval'} onAdvance={() => props.onApproval('orchestratorApproval')} paused={paused || Boolean(approvalFeedback)} />}
              {stage === 'identification' && <IdentificationVisual progress={visualProgress} />}
              {stage === 'rca' && <RcaVisual progress={visualProgress} />}
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

function Tick() {
  return <i className="result-tick" aria-label="Complete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></i>;
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

function SocialVisual({ progress }: { progress: number }) {
  const detected = progress >= 0.1;
  const drafted = progress >= 4_500 / AUTO_STAGE_DURATIONS.socialMedia!;
  const contacted = progress >= 10_000 / AUTO_STAGE_DURATIONS.socialMedia!;
  const handedOff = progress >= 15_000 / AUTO_STAGE_DURATIONS.socialMedia!;
  const agentState = handedOff
    ? ['Ready to start the investigation', 'Sarah’s post, contact details, and product information are ready']
    : contacted
      ? ['Customer details verified', 'Preferred contact and consent recorded']
      : drafted
        ? ['Preparing customer outreach', 'Using Sarah’s name, product complaint, and brand context']
        : detected
          ? ['Brand mention identified', '@YummChips found in Sarah’s post and comments']
          : ['Monitoring brand mentions', 'Checking Sarah’s post and comment mentions'];
  return <div className="social-workspace social-story" data-detected={detected} data-phase={handedOff ? 'handoff' : contacted ? 'contact' : 'detect'}>
    <div className="social-story-heading"><span>SOCIAL MEDIA AGENT</span><strong>{agentState[0]}</strong><div><small>Instagram · sarah_mitchell</small><em>{agentState[1]}</em></div></div>
    <div className="social-workflow-body">
      <article className={`social-post-source${progress >= 0.01 ? ' entered' : ''}`}>
        <div className="social-post-source-head"><span>S</span><b>sarah_mitchell</b><small>09:00</small><i>•••</i></div>
        <img src="/assets/social-post.png" alt="Sarah’s original complaint" />
        <div className="social-post-actions"><img src="/assets/dislike.svg" alt="Dislike" /><span>○</span><span>⌁</span><span>⌑</span></div>
        <strong className="social-post-reactions">61,200 dislikes</strong>
        <div className="social-post-source-copy"><p><b>sarah_mitchell</b> Just opened <mark>@YummChips</mark>. How is this okay?</p><p><b>jake.rodriguez</b> <mark>@YummChips</mark>, this is disgusting.</p><p><b>healthwatch_official</b> <mark>@YummChips</mark>, has anyone contacted the manufacturer?</p></div>
        <div className="social-post-footer"><span>View all 847 comments</span><small>2 hours ago</small></div>
      </article>
      <div className="social-agent-path">
        <div className={`social-detection-result${detected ? ' visible' : ''}`}>{detected && <Tick />}<div><b>Brand mention found</b><span><mark>@YummChips</mark> appears in the post and comments</span><small>Detected immediately after publishing</small></div></div>
        <div className={`outreach-draft${drafted ? ' visible' : ''}`}><header>{drafted && <Tick />}<span>CUSTOMER OUTREACH DRAFT</span></header><p>Hi Sarah, we&apos;re sorry about the <b>YummChips</b> product you found. We&apos;d like to investigate and help.</p><Reveal visible={contacted} className="outreach-contact"><strong>Sarah Mitchell</strong><small>✓ Preferred contact recorded · consent captured</small></Reveal></div>
        <div className={`social-handoff${handedOff ? ' visible' : ''}`}><header>{handedOff && <Tick />}<span>INVESTIGATION READY</span></header><strong>Sarah&apos;s complaint, contact details, and product evidence are ready for the Orchestrator</strong></div>
      </div>
    </div>
  </div>;
}

function OrchestratorVisual({ progress, ready, onAdvance, paused }: Pick<Props, 'onAdvance' | 'paused'> & { progress: number; ready: boolean }) {
  const batchReady = progress >= 0.2 || ready;
  const causeReady = progress >= 0.45 || ready;
  const responseReady = progress >= 0.7 || ready;
  const graphSources = [
    { id: 'social', label: 'Customer & Social', detail: 'Post · tag · contact', glyph: '⌁', x: 88, y: 62, active: batchReady, tier: 'inner', satellites: 3 },
    { id: 'product', label: 'Product & Batch', detail: 'HLD-2407-A · label', glyph: '▦', x: 220, y: 38, active: batchReady, tier: 'inner', satellites: 3 },
    { id: 'manufacturing', label: 'Manufacturing', detail: 'Line 4 · shift', glyph: '⚙', x: 202, y: 122, active: batchReady, tier: 'inner', satellites: 2 },
    { id: 'quality', label: 'Quality', detail: 'Seal logs · hold', glyph: '◉', x: 434, y: 42, active: causeReady, tier: 'inner', satellites: 3 },
    { id: 'warehouse', label: 'Warehouse', detail: 'Cartons · dispatches', glyph: '▤', x: 552, y: 112, active: causeReady, tier: 'middle', satellites: 3 },
    { id: 'retail', label: 'Retail Exposure', detail: '40 stores · 7 cities', glyph: '⌖', x: 510, y: 232, active: causeReady, tier: 'middle', satellites: 3 },
    { id: 'sales', label: 'Sales', detail: 'Affected range', glyph: '◫', x: 392, y: 274, active: causeReady, tier: 'middle', satellites: 2 },
    { id: 'compliance', label: 'Compliance', detail: 'Recall · reporting', glyph: '§', x: 270, y: 275, active: responseReady, tier: 'outer', satellites: 3 },
    { id: 'care', label: 'Customer Care', detail: 'Sarah case · support', glyph: '♥', x: 135, y: 242, active: responseReady, tier: 'outer', satellites: 2 },
    { id: 'comms', label: 'Communications', detail: 'Statement · channels', glyph: '✉', x: 76, y: 157, active: responseReady, tier: 'outer', satellites: 3 },
  ];
  const planItems = [
    ['Confirm the exact product batch', 'HLD-2407-A identified from Sarah’s post', batchReady],
    ['Find the cause and affected stores', 'Check Line 4 logs and trace all deliveries', causeReady],
    ['Prepare clear response choices', 'Withdraw stock, inform customers, and support Sarah', responseReady],
  ] as const;
  const activePlanIndex = planItems.findIndex(([, , drafted]) => !drafted);
  const visiblePlanItems = planItems.slice(0, ready ? 3 : responseReady ? 3 : causeReady ? 2 : batchReady ? 1 : 0);
  return <div className="orchestrator-workspace"><svg className={`orchestrator-graph${responseReady ? ' plan-ready' : ''}`} viewBox="0 0 640 310" role="img" aria-label="Semantic context graph connecting incident evidence sources"><defs><radialGradient id="incident-core-glow"><stop stopColor="#d96239" stopOpacity=".22" /><stop offset="1" stopColor="#d96239" stopOpacity="0" /></radialGradient></defs><g className="semantic-field"><ellipse cx="320" cy="156" rx="112" ry="78" /><ellipse cx="320" cy="156" rx="186" ry="117" /><ellipse cx="320" cy="156" rx="266" ry="146" /></g><g className="semantic-edges">{graphSources.map((source) => <path key={source.id} className={source.active ? 'active' : ''} d={`M${source.x} ${source.y} Q${(source.x + 320) / 2} ${(source.y + 156) / 2 - 18} 320 156`} />)}</g><g className={`semantic-core${responseReady ? ' ready' : ''}`}><circle cx="320" cy="156" r="63" /><circle cx="320" cy="156" r="43" /><circle cx="320" cy="156" r="25" /><text className="core-kicker" x="320" y="145" textAnchor="middle">ACTIVE INCIDENT</text><text className="core-batch" x="320" y="162" textAnchor="middle">HLD-2407-A</text><text className="core-detail" x="320" y="178" textAnchor="middle">{responseReady ? 'Plan ready' : 'Customer complaint'}</text></g>{graphSources.map((source, sourceIndex) => { const labelAbove = source.y > 210; const labelY = source.y + (labelAbove ? -31 : 35); const detailY = source.y + (labelAbove ? -20 : 46); return <g key={source.id} className={`semantic-source tier-${source.tier}${source.active ? ' active' : ''}`} style={{ '--source-x': source.x, '--source-y': source.y } as CSSProperties}>{Array.from({ length: source.satellites }, (_, satelliteIndex) => { const angle = sourceIndex * .66 + satelliteIndex * (Math.PI * 2 / source.satellites); const sx = source.x + Math.cos(angle) * 31; const sy = source.y + Math.sin(angle) * 25; return <g key={satelliteIndex}><line className="source-satellite-edge" x1={source.x} y1={source.y} x2={sx} y2={sy} /><circle className="source-satellite" cx={sx} cy={sy} r="2.6" /></g>; })}<circle className="source-halo" cx={source.x} cy={source.y} r="25" /><circle className="source-mark" cx={source.x} cy={source.y} r="17" /><text className="source-glyph" x={source.x} y={source.y + 4} textAnchor="middle">{source.glyph}</text><text className="source-label" x={source.x} y={labelY} textAnchor="middle">{source.label}</text><text className="source-detail" x={source.x} y={detailY} textAnchor="middle">{source.detail}</text></g>; })}</svg><section className="orchestrator-plan merged-approval"><ApprovalHeading title="Approve the incident plan" />{visiblePlanItems.length === 0 && <p className="orchestrator-gathering">Gathering connected evidence…</p>}{visiblePlanItems.map(([title, detail, drafted], index) => <div key={title} className={`${drafted ? 'drafted' : ''}${activePlanIndex === index && !ready ? ' active' : ''}`}><i>{index + 1}</i><p><b>{title}</b><small>{detail}</small></p><em>{drafted ? 'Drafted' : 'Drafting'}</em></div>)}<button className="approval-action" disabled={paused || !ready} onClick={onAdvance}>{ready ? 'Approve plan' : 'Preparing incident plan'} →</button></section></div>;
}

function IdentificationVisual({ progress }: { progress: number }) {
  const labelLocated = progress >= 0.16;
  const zoomed = progress >= 0.36;
  const extracted = progress >= 0.52;
  const querying = progress >= 0.66;
  const matched = progress >= 0.84;
  return <div className="identification-workspace identification-story">
    <div className="identification-visual-top">
      <div className="identification-source">
        <img src="/assets/social-post.png" alt="Customer image with package label" />
        <div className={`label-region${labelLocated ? ' visible' : ''}`}><span>PRINTED LABEL LOCATED</span></div>
      </div>
      <div className={`label-zoom${zoomed ? ' visible' : ''}`}>
        <header><span>MAGNIFIED PACKAGE LABEL</span><i>OCR FOCUS</i></header>
        <div className="zoomed-label-image"><span className="zoom-ocr-line" /></div>
        <p>Reading printed batch information from the package</p>
      </div>
    </div>
    <div className="identification-data-flow">
      <div className={`extracted-batch${extracted ? ' visible' : ''}`}><span>EXTRACTED FROM IMAGE</span><strong>HLD-2407-A</strong></div>
      <div className={`database-query${querying ? ' visible' : ''}${matched ? ' matched' : ''}`}>
        <header><span>PRODUCTION DATABASE</span><i>{matched ? '✓' : <i className="spin-ring" />}</i></header>
        <p>{matched ? 'Production record found' : 'Searching batch: HLD-2407-A'}</p>
        {matched && <div><strong>Batch HLD-2407-A</strong><span>Line 4 · 08 July</span><small>Released without quality hold</small></div>}
      </div>
    </div>
  </div>;
}

function RcaVisual({ progress }: { progress: number }) {
  const anomaliesFound = progress >= 0.25;
  const correlated = progress >= 0.41;
  const mapVisible = progress >= 0.59;
  const resultReady = progress >= 0.77;
  const scanned = Math.min(184_260, Math.round((Math.min(progress, 0.25) / 0.25) * 184_260));
  const cityProgress = Math.min(7, Math.floor(Math.max(0, (progress - 0.59) / 0.18) * 8));
  const rows = Array.from({ length: 9 }, (_, index) => {
    const temperatures = [160, 159, 160, 158, 160, 159, 160, 158];
    const anomaly = anomaliesFound && (index === 3 || index === 6);
    return {
      time: anomaly ? (index === 3 ? '08:14:22' : '08:17:08') : `08:${String(2 + (index * 3) % 54).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
      batch: anomaly || index % 3 === 0 ? 'HLD-2407-A' : `HLD-24${String(5 + index).padStart(2, '0')}-B`,
      temperature: anomaly ? (index === 3 ? 134 : 136) : temperatures[index % temperatures.length]!,
      anomaly,
    };
  });
  const cities = [
    ['Glasgow', 184, 38], ['Manchester', 176, 120], ['Leeds', 216, 105], ['Birmingham', 197, 159], ['Cardiff', 158, 181], ['Bristol', 177, 196], ['London', 238, 208],
  ] as const;
  return <div className="rca-workspace rca-story">
    <div className="factory-log live-log"><div><b>Factory log search</b><span>Line 4 · 08 July</span></div><header><span>Scanning production records</span><strong>{new Intl.NumberFormat('en-GB').format(scanned)} / 184,260</strong></header><section>{rows.map((row, index) => <p key={index} className={row.anomaly ? 'anomaly' : ''}><i>{row.anomaly ? '!' : '›'}</i><time>{row.time}</time><b>{row.batch}</b><span>Seal temp {row.temperature}°C</span><em>{row.anomaly ? 'Anomaly' : 'Normal'}</em></p>)}</section></div>
    <div className={`rca-correlation${correlated ? ' visible' : ''}`}><span>BATCH CORRELATION</span><strong>HLD-2407-A matches the Line 4 temperature anomalies</strong><p>Expected 160°C · Observed 134°C · 18-minute temperature drop</p></div>
    <div className={`uk-exposure-map${mapVisible ? ' visible' : ''}`}><header><span>AFFECTED STORE EXPOSURE</span><small>{cityProgress} of 7 cities mapped</small></header><svg viewBox="0 0 420 250" role="img" aria-label="United Kingdom map showing affected cities"><path className="uk-outline" d="M180 14c18 5 27 19 25 34l12 15-4 21 16 15-4 22 13 18-12 17 10 22-13 19 5 27-20 15-11 24-20-4-12-27-17-9-5-27-19-19 4-24-12-21 12-23-5-26 13-18 2-27 18-17 2-24 18-13Z" /><path className="ireland-outline" d="M99 115l14-15 17 8 4 23-11 21-16-3-10-18 2-16Z" />{cities.map(([name, x, y], index) => <g key={name} className={`uk-city${index < cityProgress ? ' active' : ''}`}><circle cx={x} cy={y} r="6" /><text x={x + 10} y={y + 4}>{name}</text></g>)}</svg>{resultReady && <div className="map-result"><strong>40 affected stores</strong><span>across 7 UK cities</span></div>}</div>
    <div className={`rca-final-result${resultReady ? ' visible' : ''}`}><span>ROOT CAUSE CONFIRMED</span><strong>160°C → 134°C temperature drop</strong><p>Batch HLD-2407-A reached 40 stores across 7 cities.</p></div>
  </div>;
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
