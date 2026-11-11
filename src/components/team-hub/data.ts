export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  value: number;
  status: LeadStatus;
  owner: string;
  initials: string;
  color: string;
  updated: string;
};

export type TeamMember = {
  name: string;
  initials: string;
  role: string;
  email: string;
  active: string;
  leads: number;
  color: string;
};

export type ChatMessage = {
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  own?: boolean;
};

// Clean fresh seeds — zero fake/mock leads or data
export const leadsSeed: Lead[] = [];

export const teamSeed: TeamMember[] = [];

export const channelMessages: ChatMessage[] = [];

export const activityFeed: any[] = [];

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
