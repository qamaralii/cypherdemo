// Shared by the booth demo (laptop) and the Slack companion (phone).
// Agent roster, approval options and default drafts live here so both screens use the same words.

export type WorkflowStage =
  | 'socialMedia'
  | 'socialMediaApproval'
  | 'orchestrator'
  | 'orchestratorApproval'
  | 'identification'
  | 'rca'
  | 'resolution'
  | 'recall'
  | 'support'
  | 'outcome';

export type Region = 'North' | 'South' | 'East' | 'West' | 'Central';
export type Compensation = 'Hamper' | 'Voucher';

export interface AgentStage {
  id: WorkflowStage;
  name: string;
  summary: string;
  tasks: string[];
  /** Avatar initials and colour used in the phone's Slack channel. */
  initials: string;
  color: string;
  /** What the agent posts in Slack when its turn starts. */
  update: string;
}

export const workflowStages: AgentStage[] = [
  { id: 'socialMedia', name: 'Social Media Agent', summary: 'Spots the complaint and gets the details needed to help.', tasks: ['Detect company tag', 'Collect contact details', 'Hand off incident'], initials: 'SM', color: '#C7527D', update: 'New @YummChips mention from @sarah_mitchell: mould in a packet. Checking the post and collecting her contact details.' },
  { id: 'orchestrator', name: 'Planner Agent', summary: 'Sets the investigation plan and assigns the work.', tasks: ['Set the plan', 'Connect the evidence', 'Request approval'], initials: 'PL', color: '#D96239', update: 'Mapping production, quality, warehouse and sales data to draft an incident plan.' },
  { id: 'identification', name: 'Identification Agent', summary: 'Finds the exact product batch involved.', tasks: ['Scan the image', 'Read the batch number', 'Match the production record'], initials: 'ID', color: '#597EB2', update: 'Scanning Sarah’s photo for the printed batch code.' },
  { id: 'rca', name: 'RCA Agent', summary: 'Finds what went wrong and where the stock went.', tasks: ['Search factory logs', 'Find the anomaly', 'Map affected stores'], initials: 'RC', color: '#769B58', update: 'Searching Line 4 factory logs and tracing where the cartons went.' },
  { id: 'resolution', name: 'Response Planning Agent', summary: 'Puts clear response choices in front of a person.', tasks: ['Collate the options', 'Summarise the risks', 'Request approval'], initials: 'RP', color: '#D79A3B', update: 'Collating response options and their risks.' },
  { id: 'recall', name: 'Recall Agent', summary: 'Tells affected stores to remove stock.', tasks: ['Draft store list', 'Confirm selected regions', 'Issue recall orders'], initials: 'RA', color: '#B84A43', update: 'Drafting the withdrawal list for the 40 affected stores.' },
  { id: 'support', name: 'Customer Care Agent', summary: 'Makes things right with the customer.', tasks: ['Draft personal message', 'Choose compensation', 'Request approval'], initials: 'CC', color: '#2F8F83', update: 'Drafting a personal reply to Sarah.' },
];

export const regionOptions: { name: Region; stores: number }[] = [
  { name: 'North', stores: 8 }, { name: 'South', stores: 9 }, { name: 'East', stores: 7 }, { name: 'West', stores: 10 }, { name: 'Central', stores: 6 },
];

export const compensationOptions: { id: Compensation; detail: string }[] = [
  { id: 'Hamper', detail: 'Curated apology hamper' },
  { id: 'Voucher', detail: '£40 goodwill voucher' },
];

export const orchestratorPlan = [
  ['Confirm the exact product batch', 'Read the batch code from Sarah’s photo'],
  ['Find the cause and affected stores', 'Check Line 4 logs and trace all deliveries'],
  ['Prepare clear response choices', 'Withdraw stock, inform customers, and support Sarah'],
] as const;

export const defaultCustomerDraft = 'Hi Sarah, thank you for bringing this to our attention. We are sorry for your experience. We have identified the affected batch, withdrawn stock, and would like to make this right for you.';

export function storesForRegions(regions: Region[]) {
  return regions.reduce((total, region) => total + (regionOptions.find((item) => item.name === region)?.stores ?? 0), 0);
}

/** The few Line 4 log rows the RCA Agent shares on the phone: the two flagged sealing-temperature readings and their neighbours. */
export const rcaLogExcerpt = [
  { time: '08:08:14', batch: 'HLD-2407-B', temperature: 160, anomaly: false },
  { time: '08:14:22', batch: 'HLD-2407-A', temperature: 134, anomaly: true },
  { time: '08:14:28', batch: 'HLD-2409-B', temperature: 160, anomaly: false },
  { time: '08:17:08', batch: 'HLD-2407-A', temperature: 136, anomaly: true },
  { time: '08:17:35', batch: 'HLD-2410-B', temperature: 159, anomaly: false },
] as const;
