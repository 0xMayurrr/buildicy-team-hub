import type { WorkingStatus, LeadPotential, LeadStatus, OutreachChannel, ProspectResponse } from "@/lib/supabase/types";

export const WORKING_STATUS_CONFIG: Record<
  WorkingStatus,
  { label: string; dotColor: string; bgColor: string; description: string }
> = {
  Researching: {
    label: "Researching",
    dotColor: "oklch(0.65 0.2 240)",
    bgColor: "color-mix(in oklab, oklch(0.65 0.2 240) 12%, transparent)",
    description: "Finding and qualifying prospective companies",
  },
  Outreach: {
    label: "Outreach",
    dotColor: "oklch(0.6 0.2 150)",
    bgColor: "color-mix(in oklab, oklch(0.6 0.2 150) 12%, transparent)",
    description: "Actively reaching out via Email, WhatsApp & Calls",
  },
  "Follow-ups": {
    label: "Follow-ups",
    dotColor: "oklch(0.7 0.18 50)",
    bgColor: "color-mix(in oklab, oklch(0.7 0.18 50) 12%, transparent)",
    description: "Following up with warm prospects and pending replies",
  },
  Meetings: {
    label: "Meetings",
    dotColor: "oklch(0.55 0.24 290)",
    bgColor: "color-mix(in oklab, oklch(0.55 0.24 290) 12%, transparent)",
    description: "Conducting discovery calls & client demos",
  },
  "Proposal Preparation": {
    label: "Proposal Prep",
    dotColor: "oklch(0.65 0.22 330)",
    bgColor: "color-mix(in oklab, oklch(0.65 0.22 330) 12%, transparent)",
    description: "Drafting custom proposals & pricing scopes",
  },
  Other: {
    label: "Other Task",
    dotColor: "oklch(0.5 0.05 260)",
    bgColor: "color-mix(in oklab, oklch(0.5 0.05 260) 12%, transparent)",
    description: "General marketing and admin tasks",
  },
  Break: {
    label: "Break",
    dotColor: "oklch(0.75 0.15 85)",
    bgColor: "color-mix(in oklab, oklch(0.75 0.15 85) 12%, transparent)",
    description: "Stepped away for lunch or break",
  },
  Offline: {
    label: "Offline",
    dotColor: "oklch(0.45 0.02 260)",
    bgColor: "color-mix(in oklab, oklch(0.45 0.02 260) 12%, transparent)",
    description: "Shift ended or signed off",
  },
};

/**
 * Safe accessor for WorkingStatus configuration.
 * Always returns a valid config even if an unknown or legacy status is passed.
 */
export function getWorkingStatusConfig(status?: string | null) {
  if (status && status in WORKING_STATUS_CONFIG) {
    return WORKING_STATUS_CONFIG[status as WorkingStatus];
  }
  return WORKING_STATUS_CONFIG["Outreach"];
}

/**
 * Safe accessor for LeadPotential configuration.
 * Always returns a valid config even if an unknown potential is passed.
 */
export function getLeadPotentialConfig(potential?: string | null) {
  if (potential && potential in LEAD_POTENTIAL_CONFIG) {
    return LEAD_POTENTIAL_CONFIG[potential as LeadPotential];
  }
  return LEAD_POTENTIAL_CONFIG["Medium potential"];
}

export const LEAD_POTENTIAL_CONFIG: Record<
  LeadPotential,
  { label: string; className: string; description: string }
> = {
  "Low potential": {
    label: "Low potential",
    className: "potential-badge low",
    description: "Low match with target client persona or small budget",
  },
  "Medium potential": {
    label: "Medium potential",
    className: "potential-badge medium",
    description: "Good industry fit, moderate budget and active need",
  },
  "High potential": {
    label: "High potential",
    className: "potential-badge high",
    description: "High budget, immediate intent, key decision maker",
  },
  "Ready to convert": {
    label: "Ready to convert",
    className: "potential-badge ready",
    description: "Verbal agreement reached, proposal under final review",
  },
};

export const STAGE_PROBABILITIES: Record<LeadStatus, { probability: number; label: string }> = {
  New: { probability: 10, label: "Initial discovery phase" },
  Contacted: { probability: 25, label: "First outreach initiated" },
  Qualified: { probability: 50, label: "Budget & requirements confirmed" },
  Proposal: { probability: 75, label: "Commercial proposal submitted" },
  Won: { probability: 100, label: "Deal successfully closed" },
  Lost: { probability: 0, label: "Lead dropped or disqualified" },
};

export const OUTREACH_CHANNELS: OutreachChannel[] = [
  "Email",
  "WhatsApp",
  "Call",
  "Meeting",
  "LinkedIn",
  "Other",
];

export const PROSPECT_RESPONSES: { response: ProspectResponse; isPositive: boolean; label: string }[] = [
  { response: "No response yet", isPositive: false, label: "No response yet" },
  { response: "Positive response", isPositive: true, label: "Positive response" },
  { response: "Interested - Needs info", isPositive: true, label: "Interested - Requested info" },
  { response: "Meeting booked", isPositive: true, label: "Meeting / Demo booked" },
  { response: "Proposal requested", isPositive: true, label: "Proposal requested" },
  { response: "Follow up later", isPositive: false, label: "Follow up later" },
  { response: "Not interested", isPositive: false, label: "Not interested" },
  { response: "Wrong contact", isPositive: false, label: "Wrong contact / Left company" },
];

