// ── Intugle Cypher 2026 — Configuration ──
// All editable text, asset paths, timings, and counters live here.

export const config = {
  // ── Branding ──
  brandName: 'Intugle',
  tagline: 'One bad batch.  How far did it travel?',
  startButtonText: 'Investigate the incident',

  // ── Asset paths (relative to public/) ──
  assets: {
    logo: '/assets/intugle-logo.svg',
    frame1: '/assets/frame1.mp4',
    frame2: '/assets/frame2.mp4',
    frame2A: '/assets/frame2A.mp4',
    frame2B: '/assets/frame2B.mp4',
    frame2C: '/assets/frame2C.mp4',
    frame3: '/assets/frame3.mp4',
    socialPostImage: '/assets/social-post.png',
    hamper: '/assets/hamper.png',
    voucher: '/assets/voucher.png',
  },

  // ── F1 — Factory scene ──
  f1: {
    loop: false,
    playbackRate: 0.80,
    overlays: [],
    annotations: [
      {
        text: 'TEMPERATURE CONTROLLED SEALER',
        subtext: 'Line 4 sealing station',
        appear: 0,
        disappear: 6.0,
        x: 60,
        y: 45,
        targetX: 68,
        targetY: 63,
        align: 'left' as const,
        tone: 'info' as const,
        kind: 'surface-label' as const,
        rotation: -16,
      },
      {
        text: 'SEALING TEMPERATURE DROPPING',
        appear: 1.0,
        disappear: 6.0,
        x: 56,
        y: 56,
        targetX: 52,
        targetY: 48,
        align: 'left' as const,
        tone: 'warning' as const,
        hazard: true,
        compact: true,
        value: { from: 160, to: 134, unit: '°C' },
      },
      {
        text: 'FAULTY PACKETS',
        subtext: 'Batch passes without a quality hold',
        appear: 2.6,
        disappear: 6.0,
        x: 63,
        y: 31,
        targetX: 77,
        targetY: 39,
        width: 14,
        height: 14,
        align: 'left' as const,
        tone: 'danger' as const,
      },
    ],
  },

  // ── F2 — Distribution scene ──
  f2: {
    loop: false,
    overlays: [],
    annotations: [
      {
        text: 'FAULTY STOCK IN TRUCK',
        subtext: 'Affected cartons loaded for dispatch',
        appear: 1.1,
        disappear: 4.9,
        x: 47,
        y: 28,
        targetX: 62,
        targetY: 58,
        width: 10,
        height: 15,
        align: 'right' as const,
        tone: 'danger' as const,
      },
      {
        text: 'DISPATCHED TO 40 STORES',
        subtext: 'Across multiple cities',
        appear: 2.6,
        disappear: 4.9,
        x: 53,
        y: 45,
        targetX: 57,
        targetY: 54,
        align: 'left' as const,
        tone: 'warning' as const,
      },
      {
        text: 'FAULTY STOCK DELIVERED',
        subtext: 'Cartons being delivered to FreshMart Stores',
         appear: 0,
        disappear: 10.5,
        x: 55,
        y: 34,
        targetX: 35,
        targetY: 57,
        width: 16,
        height: 31,
        align: 'right' as const,
        tone: 'danger' as const,
        targetless: true,
      },
    ],
  },

  // ── F3 — Discovery scene ──
  f3: {
    loop: false,
    overlays: [],
    annotations: [
      {
        text: 'CUSTOMER OPENS THE PACKET',
        subtext: 'The affected batch reaches a retail customer',
        appear: 0.8,
        disappear: 4.0,
        x: 58,
        y: 50,
        targetX: 60,
        targetY: 73,
        width: 19,
        height: 18,
        align: 'right' as const,
        tone: 'warning' as const,
      },
      {
        text: 'MOULD DETECTED !',
        subtext: 'Visible on the chips',
        appear: 4.0,
        disappear: 10.5,
        x: 60,
        y: 50,
        targetX: 39,
        targetY: 84,
        width: 35,
        height: 18,
        align: 'right' as const,
        tone: 'danger' as const,
      },
    ],
  },

  // ── Social post (Instagram-style) ──
  socialPost: {
    customerName: 'Sarah Mitchell',
    customerHandle: 'sarah_mitchell',
    customerAvatar: 'S',
    caption: 'Just opened @YummChips. How is this okay? 🤢',
    timeAgo: '2 HOURS AGO',
    counters: {
      likes: 61_200,
      comments: 847,
    },
    reaction: 'dislikes' as const,
    likedBy: {
      highlightUser: 'jake.rodriguez',
      othersCount: 61_199,
    },
    comments: [
      { handle: 'jake.rodriguez', text: '@YummChips, this is disgusting. Where did you buy these?', avatarColor: '#e74c3c', verified: false },
      { handle: 'anna_foodie_', text: 'I bought the same brand yesterday 😬', avatarColor: '#9b59b6', verified: false },
      { handle: 'melissa.w.3', text: 'My kids eat these every day. Horrified.', avatarColor: '#2ecc71', verified: false },
      { handle: 'healthwatch_official', text: '@YummChips, has anyone contacted the manufacturer?', avatarColor: '#3498db', verified: true },
    ],
  },

  // ── Palette (referenced in Tailwind, also available in JS) ──
  colors: {
    navy: '#0a1628',
    navyLight: '#132040',
    teal: '#2dd4bf',
    cream: '#fef9ef',
    amber: '#f59e0b',
    coral: '#f87171',
  },

  // ── Agent Race ──
  agentRace: {
    cta: 'Resolve the crisis',
    finalCta: 'Review recommended action',

    humanSummary: {
      headline: 'Investigation progressing. Coordination takes time.',
      elapsed: '13 hrs 40 mins after Sarah’s post',
      detection: '@Ava, Social Media Intern, flagged Sarah’s complaint 3 hours after it was published. @Maya, Customer Care Lead, saw it 20 minutes later.',
      confirmed: 'Batch identified',
      unresolved: 'Root cause and affected stores still being verified.',
    },
    agentPrompt: {
      headline: 'Want to see the other way?',
      body: 'See how Intugle agents would have handled this same incident.',
      yes: 'Unleash the agents →',
      no: 'I’ll take my chances',
    },
    customerUpdate: {
      customerName: 'Sarah Mitchell',
      customerHandle: 'sarah_mitchell',
      customerAvatar: 'S',
      caption: 'Update: they reached out straight away, recalled the stock and sent the loveliest hamper. This is how you handle a mistake. Thank you.',
      timeAgo: 'JUST NOW',
      counters: { likes: 18_400, comments: 326 },
      likedBy: { highlightUser: 'healthwatch_official', othersCount: 18_399 },
      comments: [
        { handle: 'healthwatch_official', text: 'A prompt and transparent response. Glad this was resolved.', avatarColor: '#769b58', verified: true },
        { handle: 'anna_foodie_', text: 'This is such a thoughtful follow-up.', avatarColor: '#9b59b6', verified: false },
        { handle: 'jake.rodriguez', text: 'Great to see the company took responsibility.', avatarColor: '#e74c3c', verified: false },
      ],
    },
    voucherUpdate: {
      customerName: 'Sarah Mitchell',
      customerHandle: 'sarah_mitchell',
      customerAvatar: 'S',
      caption: 'Update: they reached out straight away, recalled the stock and sent a thoughtful £40 voucher with an apology. This is how you handle a mistake. Thank you.',
      timeAgo: 'JUST NOW',
      counters: { likes: 16_800, comments: 284 },
      likedBy: { highlightUser: 'healthwatch_official', othersCount: 16_799 },
      comments: [
        { handle: 'healthwatch_official', text: 'A prompt response and thoughtful customer care. Glad this was resolved.', avatarColor: '#769b58', verified: true },
        { handle: 'anna_foodie_', text: 'The voucher and apology were a really nice touch.', avatarColor: '#9b59b6', verified: false },
        { handle: 'jake.rodriguez', text: 'Good to see the company taking responsibility.', avatarColor: '#e74c3c', verified: false },
      ],
    },

    humanTeams: [
      { name: 'Quality Assurance', icon: 'QA', action: 'Flagging complaint for review', statuses: ['Reviewing...', 'Escalated to plant'], delay: 0, color: '#f59e0b' },
      { name: 'Plant Manager', icon: 'PM', action: 'Requesting production logs for HLD-2407-A', statuses: ['Waiting for reply...', 'Searching records'], delay: 2.5, color: '#f97316' },
      { name: 'Supply Chain', icon: 'SC', action: 'Requesting dispatch records via email', statuses: ['Awaiting access...', 'Matching batch IDs'], delay: 3.5, color: '#ef4444' },
      { name: 'Analytics', icon: 'AN', action: 'Compiling spreadsheet of affected stores', statuses: ['Requesting data...', 'Waiting for export'], delay: 3, color: '#a855f7' },
      { name: 'Customer Care', icon: 'CC', action: 'Preparing interim response to public', statuses: ['On hold', 'Drafting response'], delay: 2.5, color: '#6366f1' },
    ],

    agents: [
      {
        name: 'Unstructured Agent', icon: 'U', system: 'Social image + Production DB', delay: 0, requiresGrant: false,
        objective: 'Identify the affected batch from the customer complaint image.',
        steps: ['Ingest complaint image', 'Inspect packaging with OCR and vision', 'Extract batch number', 'Validate batch against Production DB'],
        finding: 'HLD-2407-A identified from the complaint image and matched to Line 4.',
        highlight: 'HLD-2407-A',
        highlightLabel: 'Batch identified',
      },
      {
        name: 'Analysis Agent', icon: 'A', system: 'Quality + Warehouse + Sales', delay: 0.6, requiresGrant: false,
        objective: 'Trace the root cause and measure the exposure across connected operational systems.',
        steps: ['Load production and quality records', 'Identify the temperature deviation', 'Trace released cartons through warehouse', 'Map deliveries to store locations'],
        finding: '160°C → 134°C for 18 minutes. 14 cartons reached 40 stores.',
        highlight: '40 STORES',
        highlightLabel: '14 cartons exposed to a temperature deviation',
      },
      {
        name: 'Resolution Agent', icon: 'R', system: 'Compliance + Response Systems', delay: 1.2, requiresGrant: false,
        objective: 'Turn confirmed evidence into clear response options for human approval.',
        steps: ['Review connected incident evidence', 'Review recall rules', 'Confirm recall and reporting obligations', 'Assemble response options for human approval'],
        finding: 'Targeted recall, formal notification and customer-support options are ready for review.',
        highlight: 'OPTIONS READY',
        highlightLabel: 'Response options assembled for human approval',
      },
    ],

    evidenceTrail: [
      'Batch identified',
      'Root cause + exposure traced',
      'Response plan ready',
    ],

    // ── Semantic graph layout ──
    graphNodes: {
      hubs: [
        { id: 'production', label: 'Production', x: 115, y: 125, color: '#597EB2', agentIndex: 0, locked: false },
        { id: 'quality',    label: 'Quality',    x: 295, y: 80,  color: '#769B58', agentIndex: 1, locked: false },
        { id: 'warehouse',  label: 'Warehouse',  x: 420, y: 165, color: '#D96239', agentIndex: 2, locked: false },
        { id: 'sales',      label: 'Sales',      x: 375, y: 295, color: '#C7527D', agentIndex: 3, locked: false },
        { id: 'compliance', label: 'Compliance', x: 155, y: 295, color: '#D79A3B', agentIndex: 4, locked: true },
      ],
      decorative: [
        { id: 'operations', label: 'Operations', x: 255, y: 195, color: '#94a3b8' },
        { id: 'logistics',  label: 'Logistics',  x: 75,  y: 250, color: '#94a3b8' },
        { id: 'analytics',  label: 'Analytics',  x: 455, y: 60,  color: '#94a3b8' },
      ],
      satellites: [
        // Production
        { hub: 'production', x: 60,  y: 80,  label: 'batch_id' },
        { hub: 'production', x: 55,  y: 150, label: 'line_id' },
        { hub: 'production', x: 140, y: 60,  label: 'prod_dt' },
        { hub: 'production', x: 175, y: 140, label: 'seal_temp' },
        // Quality
        { hub: 'quality', x: 230, y: 45,  label: 'temp_log' },
        { hub: 'quality', x: 355, y: 50,  label: 'threshold' },
        { hub: 'quality', x: 260, y: 130, label: 'qc_status' },
        { hub: 'quality', x: 340, y: 110, label: 'audit_id' },
        // Warehouse
        { hub: 'warehouse', x: 470, y: 105, label: 'release_dt' },
        { hub: 'warehouse', x: 490, y: 195, label: 'carton_id' },
        { hub: 'warehouse', x: 395, y: 225, label: 'dispatch' },
        { hub: 'warehouse', x: 460, y: 240, label: 'store_id' },
        // Sales
        { hub: 'sales', x: 310, y: 320, label: 'invoice_id' },
        { hub: 'sales', x: 415, y: 345, label: 'store_ref' },
        { hub: 'sales', x: 450, y: 295, label: 'qty_sold' },
        { hub: 'sales', x: 345, y: 355, label: 'region' },
        // Compliance
        { hub: 'compliance', x: 85,  y: 340, label: 'recall_id' },
        { hub: 'compliance', x: 110, y: 360, label: 'eligibility' },
        { hub: 'compliance', x: 195, y: 350, label: 'cert_no' },
      ],
    },

    summary: {
      batch: 'HLD-2407-A',
      rootCause: 'Sealing temperature deviation',
      storesAffected: 40,
    },

    timings: {
      humanEstimate: '~4 hrs 32 min',
      agentElapsed: '~47 seconds',
    },

    // ── Execution graph nodes (added to the existing semantic graph) ──
    executionNodes: [
      { id: 'recall', label: 'Recall', x: 250, y: 190, color: '#D96239' },
      { id: 'comms',  label: 'Comms',  x: 370, y: 130, color: '#C7527D' },
      { id: 'crm',    label: 'CRM',    x: 190, y: 260, color: '#597EB2' },
    ],

    // ── Decisions ──
    decisions: [
      {
        id: 'full' as const,
        title: 'Withdraw stock and issue public statement',
        description: 'Recall all 40 stores, issue a public statement, and resolve the customer complaint with personalised support and compensation.',
        agentCount: 3,
        badge: 'RECOMMENDED',
        risk: 'low' as const,
        execAgents: [
          { name: 'Recall Agent',  task: 'Removing affected cartons before further sales', objective: 'Remove affected cartons from every identified store.', steps: ['Generate 40-store withdrawal list', 'Issue stock withdrawal orders', 'Confirm store acknowledgements'], finding: 'Recall initiated · 40 stores notified', system: 'Warehouse DB', nodeId: 'recall', delay: 0 },
          { name: 'Comms Agent',   task: 'Informing customers with an evidence-backed statement', objective: 'Prepare a clear public response for the confirmed incident.', steps: ['Draft public statement', 'Route content for approval', 'Publish customer response'], finding: 'Statement drafted and queued for approval', system: 'Content System', nodeId: 'comms', delay: 1.5 },
          { name: 'Support Agent', task: 'Resolving the customer complaint', objective: 'Close the customer incident with selected compensation.', steps: ['Create CRM case', 'Link confirmed incident evidence', 'Issue selected compensation'], finding: 'Ticket #4821 raised · Compensation initiated', system: 'CRM System', nodeId: 'crm', delay: 3 },
        ],
        outcome: {
          tone: 'good' as const,
          title: 'Incident Resolved',
          lines: [
            'Stock recalled from all 40 affected stores.',
            'Public statement published — community acknowledges the response.',
            'sarah_mitchell — personal response and compensation confirmed.',
            'Batch HLD-2407-A formally closed.',
          ],
        },
      },
      {
        id: 'recall' as const,
        title: 'Withdraw stock only',
        description: 'Recall the batch without public communication. Raise a support ticket but issue no statement.',
        agentCount: 2,
        badge: null,
        risk: 'medium' as const,
        execAgents: [
          { name: 'Recall Agent',  task: 'Removing affected cartons before further sales', objective: 'Remove affected cartons from every identified store.', steps: ['Generate 40-store withdrawal list', 'Issue stock withdrawal orders', 'Confirm store acknowledgements'], finding: 'Recall initiated · 40 stores notified', system: 'Warehouse DB', nodeId: 'recall', delay: 0 },
          { name: 'Support Agent', task: 'Resolving the customer complaint without a public statement', objective: 'Close the customer incident with selected compensation.', steps: ['Create CRM case', 'Link confirmed incident evidence', 'Issue selected compensation'], finding: 'Ticket #4821 raised · No public statement', system: 'CRM System', nodeId: 'crm', delay: 2 },
        ],
        outcome: {
          tone: 'partial' as const,
          title: 'Partially Resolved',
          lines: [
            'Stock recalled from all 40 affected stores.',
            'No public statement issued.',
            'Public backlash continues — 3,200 new comments in 2 hours.',
            'Brand trust index: ▼ 12 points this week.',
          ],
        },
      },
      {
        id: 'nothing' as const,
        title: 'Take no action',
        description: 'Do not recall the batch. Do not issue a statement or respond to the customer.',
        agentCount: 0,
        badge: 'HIGH RISK',
        risk: 'high' as const,
        execAgents: [],
        outcome: {
          tone: 'bad' as const,
           title: 'FreshMart delists the product range',
           lines: [
             'FreshMart has removed the supplier\'s products from all stores and suspended future orders.',
            'Public complaint thread reached 2.1M views — trending nationally.',
            'Health authority has opened a formal investigation.',
            'This incident is now on the public record.',
          ],
        },
      },
    ],
  },
} as const;

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type OverlayStyle = 'default' | 'warning' | 'danger' | 'subtle';
export type AnnotationTone = 'info' | 'warning' | 'danger';
export type AnnotationAlign = 'left' | 'right';

export interface Overlay {
  text: string;
  subtext?: string;
  appear: number;
  disappear: number;
  position: OverlayPosition;
  style?: OverlayStyle;
}

export interface VideoAnnotation {
  text: string;
  subtext?: string;
  appear: number;
  disappear: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width?: number;
  height?: number;
  align: AnnotationAlign;
  tone: AnnotationTone;
  alert?: boolean;
  hazard?: boolean;
  compact?: boolean;
  value?: { from: number; to: number; unit: string };
  kind?: 'callout' | 'surface-label';
  rotation?: number;
  targetless?: boolean;
}
