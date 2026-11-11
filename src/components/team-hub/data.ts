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

export const leadsSeed: Lead[] = [
  {
    id: "LD-2408",
    name: "Olivia Rhye",
    company: "Layers Studio",
    email: "olivia@layers.design",
    phone: "+1 (415) 555-0186",
    source: "Website",
    value: 12800,
    status: "Qualified",
    owner: "Mayur Buildicy",
    initials: "OR",
    color: "avatar-lilac",
    updated: "12 min ago",
  },
  {
    id: "LD-2407",
    name: "Phoenix Baker",
    company: "Circooles",
    email: "phoenix@circooles.com",
    phone: "+1 (415) 555-0142",
    source: "Referral",
    value: 8400,
    status: "Proposal",
    owner: "Sofia Chen",
    initials: "PB",
    color: "avatar-peach",
    updated: "38 min ago",
  },
  {
    id: "LD-2406",
    name: "Lana Steiner",
    company: "Catalog",
    email: "lana@catalog.io",
    phone: "+1 (415) 555-0109",
    source: "LinkedIn",
    value: 6200,
    status: "Contacted",
    owner: "Alex Morgan",
    initials: "LS",
    color: "avatar-sage",
    updated: "2 hours ago",
  },
  {
    id: "LD-2405",
    name: "Demi Wilkinson",
    company: "Quotient",
    email: "demi@quotient.co",
    phone: "+1 (415) 555-0174",
    source: "Website",
    value: 15600,
    status: "New",
    owner: "Mayur Buildicy",
    initials: "DW",
    color: "avatar-blue",
    updated: "3 hours ago",
  },
  {
    id: "LD-2404",
    name: "Candice Wu",
    company: "Sisyphus",
    email: "candice@sisyphus.com",
    phone: "+1 (415) 555-0128",
    source: "Event",
    value: 9200,
    status: "Qualified",
    owner: "Sofia Chen",
    initials: "CW",
    color: "avatar-rose",
    updated: "Yesterday",
  },
  {
    id: "LD-2403",
    name: "Natali Craig",
    company: "Hourglass",
    email: "natali@hourglass.app",
    phone: "+1 (415) 555-0131",
    source: "Referral",
    value: 5400,
    status: "Won",
    owner: "Alex Morgan",
    initials: "NC",
    color: "avatar-sky",
    updated: "Yesterday",
  },
  {
    id: "LD-2402",
    name: "Drew Cano",
    company: "Bloom Labs",
    email: "drew@bloomlabs.com",
    phone: "+1 (415) 555-0193",
    source: "LinkedIn",
    value: 11200,
    status: "Proposal",
    owner: "Mayur Buildicy",
    initials: "DC",
    color: "avatar-green",
    updated: "Oct 9",
  },
  {
    id: "LD-2401",
    name: "Orlando Diggs",
    company: "Fable & Co.",
    email: "orlando@fable.co",
    phone: "+1 (415) 555-0198",
    source: "Website",
    value: 3800,
    status: "Lost",
    owner: "Sofia Chen",
    initials: "OD",
    color: "avatar-lilac",
    updated: "Oct 8",
  },
];

export const teamSeed: TeamMember[] = [
  {
    name: "Mayur Buildicy",
    initials: "MB",
    role: "Founder",
    email: "mayur@buildicy.com",
    active: "Active now",
    leads: 12,
    color: "avatar-lilac",
  },
  {
    name: "Sofia Chen",
    initials: "SC",
    role: "Sales lead",
    email: "sofia@buildicy.com",
    active: "Active 4m ago",
    leads: 18,
    color: "avatar-peach",
  },
  {
    name: "Alex Morgan",
    initials: "AM",
    role: "Account executive",
    email: "alex@buildicy.com",
    active: "Active 12m ago",
    leads: 14,
    color: "avatar-sage",
  },
  {
    name: "Jordan Lee",
    initials: "JL",
    role: "Account executive",
    email: "jordan@buildicy.com",
    active: "Active yesterday",
    leads: 9,
    color: "avatar-blue",
  },
];

export const channelMessages: ChatMessage[] = [
  {
    author: "Sofia Chen",
    initials: "SC",
    color: "avatar-peach",
    text: "Morning team! Just sent the updated proposal to Phoenix. Feeling really good about this one.",
    time: "9:08 AM",
  },
  {
    author: "Alex Morgan",
    initials: "AM",
    color: "avatar-sage",
    text: "Nice, Sofia! I’ll make sure the onboarding deck is ready if they come back today.",
    time: "9:11 AM",
  },
  {
    author: "Mayur Buildicy",
    initials: "MB",
    color: "avatar-lilac",
    text: "Great work. Let’s keep the momentum going — we’re already ahead of our weekly target 🎉",
    time: "9:14 AM",
    own: true,
  },
  {
    author: "Jordan Lee",
    initials: "JL",
    color: "avatar-blue",
    text: "Olivia from Layers asked if we can jump on a quick call this afternoon. I’ve added a follow-up to the board.",
    time: "9:16 AM",
  },
];

export const activityFeed = [
  {
    person: "Sofia Chen",
    initials: "SC",
    color: "avatar-peach",
    action: "moved",
    subject: "Phoenix Baker",
    detail: "to Proposal",
    time: "12 min ago",
    type: "status",
  },
  {
    person: "Alex Morgan",
    initials: "AM",
    color: "avatar-sage",
    action: "added a note to",
    subject: "Lana Steiner",
    detail: "Discovery call booked for Friday",
    time: "38 min ago",
    type: "note",
  },
  {
    person: "Mayur Buildicy",
    initials: "MB",
    color: "avatar-lilac",
    action: "added a new lead",
    subject: "Demi Wilkinson",
    detail: "from the website",
    time: "1 hour ago",
    type: "lead",
  },
  {
    person: "Jordan Lee",
    initials: "JL",
    color: "avatar-blue",
    action: "completed a follow-up with",
    subject: "Candice Wu",
    detail: "Sent the case study",
    time: "2 hours ago",
    type: "check",
  },
];

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
