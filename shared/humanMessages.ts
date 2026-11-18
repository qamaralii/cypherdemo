// Shared by the booth demo (laptop) and the Slack companion (phone).
// Edit the human-coordination script here only.

export interface HumanMessage {
  initials: string;
  name: string;
  role: string;
  timestamp: string;
  delay: string;
  cumulative: string;
  message: string;
  status: string;
  attachment?: string;
  attachmentStatus?: string;
  threaded?: boolean;
}

export const humanMessages: HumanMessage[] = [
  { initials: 'AV', name: 'Ava Reid', role: 'Social Media Intern', timestamp: '12:00', delay: '3 hrs', cumulative: '03:00:00', message: '@Maya, I have flagged @sarah_mitchell’s mould complaint. It is gaining attention and names our product.', status: 'Escalated from social monitoring' },
  { initials: 'MC', name: 'Maya Collins', role: 'Customer Care Lead', timestamp: '12:20', delay: '20 min', cumulative: '03:20:00', message: '@Priya, I have reviewed Ava’s escalation. Please confirm the batch and whether this needs immediate quality action.', status: 'Senior review started', threaded: true },
  { initials: 'PS', name: 'Priya Shah', role: 'Quality Lead', timestamp: '13:05', delay: '45 min', cumulative: '04:05:00', message: '@Marcus, batch HLD-2407-A is involved. Can you confirm the Line 4 sealing logs and production shift?', status: 'Production review requested' },
  { initials: 'ML', name: 'Marcus Lee', role: 'Plant Manager', timestamp: '14:30', delay: '1 hr 25 min', cumulative: '05:30:00', message: '@Elena, the batch ran on Line 4. Please trace which stores received the released cartons.', status: 'Dispatch trace requested', threaded: true },
  { initials: 'ER', name: 'Elena Ruiz', role: 'Supply Chain Manager', timestamp: '16:15', delay: '1 hr 45 min', cumulative: '07:15:00', message: '@Noah, I need the store-level dispatch export analysed. IT says the detailed file needs another access request.', status: 'Awaiting store data' },
  { initials: 'NB', name: 'Noah Bennett', role: 'Analytics Lead', timestamp: '18:40', delay: '2 hrs 25 min', cumulative: '09:40:00', message: '@Maya, the export headers do not match our model. I cannot complete the exposure analysis without a corrected file.', status: 'Analysis blocked', attachment: 'store_dispatch_export.xlsx', attachmentStatus: 'Rejected by Analytics', threaded: true },
  { initials: 'MC', name: 'Maya Collins', role: 'Customer Care Lead', timestamp: '20:55', delay: '2 hrs 15 min', cumulative: '11:55:00', message: '@Priya, customers are still asking for an answer. What can the social team safely say while the investigation continues?', status: 'Public response on hold' },
  { initials: 'PS', name: 'Priya Shah', role: 'Quality Lead', timestamp: '22:40', delay: '1 hr 45 min', cumulative: '13:40:00', message: '@Marcus, @Elena, @Noah, we still cannot confirm the sealing failure or the full list of affected stores.', status: 'Escalated · unresolved', threaded: true },
];

export const HUMAN_MESSAGE_COUNT = humanMessages.length;
