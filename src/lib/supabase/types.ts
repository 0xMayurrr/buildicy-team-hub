export type UserRole = "founder" | "member";

export type WorkingStatus =
  | "Researching"
  | "Outreach"
  | "Follow-ups"
  | "Meetings"
  | "Proposal Preparation"
  | "Other"
  | "Break"
  | "Offline";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  initials: string;
  color: string;
  activeStatus: string;
  workingStatus?: WorkingStatus;
  statusUpdatedAt?: string;
  avatarUrl?: string;
  avatarChosen?: boolean;
}

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";

export type LeadPotential = "Low potential" | "Medium potential" | "High potential" | "Ready to convert";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  value: number;
  status: LeadStatus;
  ownerId: string;
  ownerName: string;
  initials: string;
  color: string;
  updated: string;
  createdAt: string;
  qualityPotential?: LeadPotential;
  promisingReason?: string;
  nextFollowupDate?: string;
  lastOutreachAt?: string;
  lastOutreachChannel?: string;
}

export type OutreachChannel = "Email" | "WhatsApp" | "Call" | "Meeting" | "LinkedIn" | "Other";

export type ProspectResponse =
  | "No response yet"
  | "Positive response"
  | "Interested - Needs info"
  | "Meeting booked"
  | "Proposal requested"
  | "Follow up later"
  | "Not interested"
  | "Wrong contact";

export interface LeadOutreachInteraction {
  id: string;
  leadId: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  channel: OutreachChannel;
  notes: string;
  prospectResponse: ProspectResponse;
  isPositive: boolean;
  statusAtTime: LeadStatus;
  nextFollowupDate?: string;
  createdAt: string;
}

export interface DailyWorkUpdate {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  date: string; // YYYY-MM-DD
  workingStatus: WorkingStatus;
  // Automatically aggregated statistics
  newLeadsCount: number;
  emailOutreachCount: number;
  whatsappOutreachCount: number;
  callOutreachCount: number;
  totalOutreachCount: number;
  responsesReceivedCount: number;
  positiveResponsesCount: number;
  meetingsBookedCount: number;
  proposalsRequestedCount: number;
  completedFollowupsCount: number;
  pendingFollowupsCount: number;
  // Qualitative daily reflection
  achievements: string;
  challenges: string;
  tomorrowPriorities: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  person: string;
  initials: string;
  color: string;
  action: string;
  subject: string;
  detail: string;
  time: string;
  type: "status" | "note" | "lead" | "check" | "outreach";
  createdAt: string;
}

export interface LeadDiscussion {
  id: string;
  leadId: string;
  userId: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  isGroup: boolean;
  description?: string;
  memberIds: string[];
  createdBy?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  leadId?: string;
  time: string;
  isRead: boolean;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  time: string;
  createdAt: string;
}

export interface MemberPerformanceMetrics {
  userId: string;
  userName: string;
  userTitle: string;
  userInitials: string;
  userColor: string;
  workingStatus: WorkingStatus;
  statusUpdatedAt: string;
  leadsGenerated: number;
  uniqueBusinessesContacted: number;
  totalOutreachAttempts: number;
  emailOutreach: number;
  whatsappOutreach: number;
  callOutreach: number;
  otherOutreach: number;
  responsesReceived: number;
  positiveResponses: number;
  meetingsBooked: number;
  proposalsRequested: number;
  convertedWonLeads: number;
  lostLeads: number;
  pendingFollowups: number;
  completedFollowups: number;
  responseRatePct: number;
  positiveRatePct: number;
  meetingConversionRatePct: number;
  followupCompletionRatePct: number;
  wonValue: number;
  pipelineValue: number;
  lastOutreachTimestamp?: string;
  lastUpdateTimestamp?: string;
}
