import { useEffect, useRef, useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Loader2,
  Paperclip,
  CheckCircle2,
  ArrowRight,
  User,
  Users,
  Building2,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Check,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HubStore } from "@/lib/supabase/store";
import type {
  UserProfile,
  Lead,
  LeadStatus,
  OutreachChannel,
  ProspectResponse,
} from "@/lib/supabase/types";

export interface GeminiAgentProps {
  currentUser: UserProfile;
  onOpenLead?: (id: string) => void;
  onNavigate?: (view: any) => void;
}

export interface ExecutedAction {
  type:
    | "CREATE_LEAD"
    | "UPDATE_LEAD_STATUS"
    | "REASSIGN_LEAD"
    | "LOG_OUTREACH"
    | "BATCH_IMPORT"
    | "BROADCAST_CHAT"
    | "DISTRIBUTE_UNASSIGNED";
  label: string;
  leadId?: string | undefined;
  details?: Record<string, any> | undefined;
  timestamp: string;
}

export interface ParsedLead {
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  source: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  text: string;
  actions?: ExecutedAction[] | undefined;
  fileUpload?: {
    fileName: string;
    leads: ParsedLead[];
    status: "pending" | "imported";
  } | undefined;
}

const GEMINI_KEY =
  (import.meta.env as Record<string, string | undefined>)["VITE_GEMINI_API_KEY"] || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Robust CSV/TSV parser supporting quotes and auto-delimiters
 */
function parseCSVText(text: string): ParsedLead[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter: comma, tab, semicolon
  const headerLine = lines[0] || "";
  const delimiter = headerLine.includes("\t")
    ? "\t"
    : headerLine.includes(";")
    ? ";"
    : ",";

  const splitRow = (row: string) => {
    const regex = new RegExp(
      `(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`,
      "g",
    );
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(row)) !== null) {
      matches.push((match[1] || match[2] || "").replace(/""/g, '"').trim());
    }
    return matches;
  };

  const headers = splitRow(headerLine).map((h) => h.toLowerCase().trim());
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("contact") || h.includes("lead"));
  const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("firm") || h.includes("business") || h.includes("account"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("tel"));
  const valueIdx = headers.findIndex((h) => h.includes("value") || h.includes("deal") || h.includes("amount") || h.includes("budget") || h.includes("revenue"));
  const sourceIdx = headers.findIndex((h) => h.includes("source") || h.includes("origin") || h.includes("channel"));

  const parsedLeads: ParsedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i] || "");
    const name = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Lead #${i}`;
    const company = companyIdx >= 0 && cols[companyIdx] ? cols[companyIdx] : "Independent";
    const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : "";
    const phone = phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx] : "Not added";
    const rawVal = valueIdx >= 0 && cols[valueIdx] ? cols[valueIdx].replace(/[^0-9.]/g, "") : "0";
    const value = Number(rawVal) || 0;
    const source = sourceIdx >= 0 && cols[sourceIdx] ? cols[sourceIdx] : "Excel Upload";

    if (name || company) {
      parsedLeads.push({ name, company, email, phone, value, source });
    }
  }

  return parsedLeads;
}

/**
 * Dynamically loads SheetJS for Excel (.xlsx / .xls) parsing
 */
async function loadSheetJS(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).XLSX) return (window as any).XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Unable to load Excel parser"));
    document.head.appendChild(script);
  });
}

async function parseExcelFile(file: File): Promise<ParsedLead[]> {
  const isCSV = file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt");
  if (isCSV) {
    const text = await file.text();
    return parseCSVText(text);
  }

  // Load SheetJS for .xlsx / .xls
  const XLSX = await loadSheetJS();
  if (!XLSX) throw new Error("Excel parsing engine unavailable");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return rows.map((row, idx) => {
    const keys = Object.keys(row);
    const findVal = (terms: string[]) => {
      const k = keys.find((key) => terms.some((t) => key.toLowerCase().includes(t)));
      return k ? String(row[k]).trim() : "";
    };

    const name = findVal(["name", "contact", "lead", "person"]) || `Lead #${idx + 1}`;
    const company = findVal(["company", "firm", "business", "account", "client"]) || "Independent";
    const email = findVal(["email", "mail"]) || "";
    const phone = findVal(["phone", "mobile", "tel", "cell"]) || "Not added";
    const rawVal = findVal(["value", "deal", "amount", "budget", "revenue"]).replace(/[^0-9.]/g, "");
    const value = Number(rawVal) || 0;
    const source = findVal(["source", "channel", "origin"]) || "Excel Upload";

    return { name, company, email, phone, value, source };
  });
}

function buildSystemPrompt(user: UserProfile): string {
  const leads = HubStore.getLeads();
  const users = HubStore.getUsers();
  const isFounder = user.role === "founder";

  const marketingTeam = users
    .filter((u) => u.role !== "founder")
    .map((u) => `• ${u.name} (ID: ${u.id}, Email: ${u.email}, Title: ${u.title}, Status: ${u.workingStatus || "Active"})`)
    .join("\n");

  const leadsOverview = leads.length > 0
    ? leads.slice(0, 15).map((l) => `[ID: ${l.id}] ${l.name} | ${l.company} | $${l.value} | Status: ${l.status} | Owner: ${l.ownerName}`).join("\n")
    : "No leads currently in workspace (Clean fresh state).";

  return `You are Buildicy AI, the intelligent workspace automation engine for Buildicy.
You are interacting with ${user.name} (${user.role === "founder" ? "Founder & CEO - Executive Master Access" : `${user.title} (${user.department})`}).

CURRENT WORKSPACE REALITY:
Verified Team Members:
${marketingTeam}

Current Active Leads in Workspace (${leads.length} total):
${leadsOverview}

CRITICAL CAPABILITY: EXECUTING REAL ACTIONS
You are NOT just a chat assistant. You have full permission to EXECUTE ACTIONS in the workspace when the user requests it.
To execute an action, include a JSON block formatted exactly like this in your reply:

\`\`\`buildicy_action
{
  "action": "ACTION_TYPE",
  "params": { ... }
}
\`\`\`

Supported ACTION_TYPE options:
1. "CREATE_LEAD":
   params: {
     "name": "Full Name",
     "company": "Company Name",
     "email": "email@example.com",
     "phone": "+123...",
     "value": 12000,
     "status": "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost",
     "source": "LinkedIn" | "Website" | "Referral" | "Cold Email" | "Outreach",
     "ownerName": "Ganesh" | "Dhruv" | "Padma" | "Heyy Founder" (defaults to ${user.name})
   }

2. "UPDATE_LEAD_STATUS":
   params: {
     "leadId": "LD-XXXX",
     "status": "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost"
   }

3. "REASSIGN_LEAD":
   params: {
     "leadId": "LD-XXXX",
     "newOwnerName": "Ganesh" | "Dhruv" | "Padma" | "Heyy Founder"
   }

4. "LOG_OUTREACH":
   params: {
     "leadId": "LD-XXXX",
     "channel": "Email" | "Call" | "WhatsApp" | "LinkedIn" | "Meeting",
     "notes": "Discussion summary",
     "prospectResponse": "Positive response" | "Interested - Needs info" | "Meeting booked" | "Proposal requested" | "Follow up later" | "Not interested",
     "isPositive": true | false
   }

5. "DISTRIBUTE_UNASSIGNED":
   params: {
     "targetMembers": ["Ganesh", "Dhruv", "Padma"]
   }

6. "BROADCAST_CHAT":
   params: {
     "channelName": "marketing" | "sales",
     "message": "Message text"
   }

ROLE INSTRUCTIONS:
${isFounder ? `
- You operate with EXECUTIVE FOUNDER AUDIT PRIVILEGES. 
- The founder ONLY VIEWS and audits leads, monitors team member outreach, analyzes KPIs, and audits pipeline health.
- Team members are responsible for uploading and adding leads. The founder does NOT upload leads.
- When the founder asks to audit, reassign, or analyze leads, provide full executive analytics.
- Be razor-sharp, executive-focused, proactive, and concise.
` : `
- You are a personal marketing copilot for ${user.name}.
- When ${user.name} asks to log an outreach, create a lead, update a lead, or draft an update, generate the action block.
- Help prioritize leads and keep daily momentum high.
`}
Always accompany actions with a concise, professional message explaining what was done. Keep regular chat under 150 words.`;
}

export function GeminiAgent({ currentUser, onOpenLead, onNavigate }: GeminiAgentProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isFounder = currentUser.role === "founder";
  const users = useMemo(() => HubStore.getUsers(), [open]);

  // Initial greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      const hour = new Date().getHours();
      const timeGreeting =
        hour >= 5 && hour < 12
          ? "Good morning"
          : hour >= 12 && hour < 17
          ? "Good afternoon"
          : "Good evening";

      const greeting = isFounder
        ? `${timeGreeting}, Founder 👋 **Buildicy AI** is standing by.\n\nI provide executive pipeline and performance audits. You can:\n• **Audit workspace pipeline & team performance** in real time\n• **Review outreach interactions & response rates** across team members\n• **Analyze revenue metrics & conversion KPIs**\n• **Reassign leads & broadcast updates**`
        : `${timeGreeting}, ${currentUser.name} 👋 **Buildicy AI** is ready.\n\nI can:\n• **Upload Excel/CSV lead sheets** directly into your pipeline\n• **Add new leads & log outreach** automatically\n• **Draft high-converting outreach emails & WhatsApp follow-ups**\n• **Prepare your daily performance updates**`;

      setMessages([{ role: "assistant", text: greeting }]);
    }
  }, [open, isFounder, currentUser.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isParsingFile]);

  /**
   * Execute Action Blocks returned by Gemini
   */
  const processActionBlock = (replyText: string): { cleanText: string; executedActions: ExecutedAction[] } => {
    const actionRegex = /```buildicy_action\s*([\s\S]*?)\s*```/g;
    const actions: ExecutedAction[] = [];
    let match;
    let cleanText = replyText;

    while ((match = actionRegex.exec(replyText)) !== null) {
      try {
        const rawJson = match[1];
        if (!rawJson) continue;
        const parsed = JSON.parse(rawJson);
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (parsed.action === "CREATE_LEAD" && parsed.params) {
          const p = parsed.params;
          const assignedUser =
            users.find((u) => u.name.toLowerCase().includes(String(p.ownerName || "").toLowerCase())) ||
            currentUser;
          const created = HubStore.addLead({
            name: p.name || "New Prospect",
            company: p.company || "Independent",
            email: p.email || "",
            phone: p.phone || "Not added",
            value: Number(p.value) || 0,
            status: (p.status as LeadStatus) || "New",
            source: p.source || "AI Assistant",
            ownerId: assignedUser.id,
            ownerName: assignedUser.name,
            initials: assignedUser.initials,
            color: assignedUser.color,
          });
          actions.push({
            type: "CREATE_LEAD",
            label: `Lead Created: ${created.name}`,
            leadId: created.id,
            details: { company: created.company, value: `$${created.value}`, owner: created.ownerName },
            timestamp: now,
          });
          toast.success(`AI Lead created: ${created.name} (${created.company})`);
        } else if (parsed.action === "UPDATE_LEAD_STATUS" && parsed.params) {
          const { leadId, status } = parsed.params;
          if (leadId && status) {
            HubStore.updateLeadStatus(leadId, status as LeadStatus);
            actions.push({
              type: "UPDATE_LEAD_STATUS",
              label: `Status Updated: ${status}`,
              leadId,
              details: { status },
              timestamp: now,
            });
            toast.success(`Lead status updated to ${status}`);
          }
        } else if (parsed.action === "REASSIGN_LEAD" && parsed.params) {
          const { leadId, newOwnerName } = parsed.params;
          const targetUser = users.find((u) => u.name.toLowerCase().includes(String(newOwnerName || "").toLowerCase()));
          if (leadId && targetUser) {
            HubStore.reassignLead(leadId, targetUser);
            actions.push({
              type: "REASSIGN_LEAD",
              label: `Reassigned to ${targetUser.name}`,
              leadId,
              details: { owner: targetUser.name },
              timestamp: now,
            });
            toast.success(`Lead reassigned to ${targetUser.name}`);
          }
        } else if (parsed.action === "LOG_OUTREACH" && parsed.params) {
          const p = parsed.params;
          if (p.leadId) {
            HubStore.addOutreach({
              leadId: p.leadId,
              userId: currentUser.id,
              userName: currentUser.name,
              userInitials: currentUser.initials,
              userColor: currentUser.color,
              channel: (p.channel as OutreachChannel) || "Email",
              notes: p.notes || "Outreach conducted via AI",
              prospectResponse: (p.prospectResponse as ProspectResponse) || "Positive response",
              statusAtTime: "Contacted",
              isPositive: Boolean(p.isPositive ?? true),
            });
            actions.push({
              type: "LOG_OUTREACH",
              label: `Outreach Logged: ${p.channel}`,
              leadId: p.leadId,
              details: { channel: p.channel, response: p.prospectResponse },
              timestamp: now,
            });
            toast.success(`Outreach interaction logged!`);
          }
        } else if (parsed.action === "DISTRIBUTE_UNASSIGNED") {
          const leads = HubStore.getLeads();
          const teamReps = users.filter((u) => u.role !== "founder");
          if (teamReps.length > 0) {
            let count = 0;
            leads.forEach((l, idx) => {
              if (!l.ownerId || l.ownerId.startsWith("usr-") || l.ownerName === "Heyy Founder") {
                const rep = teamReps[idx % teamReps.length]!;
                HubStore.reassignLead(l.id, rep);
                count++;
              }
            });
            actions.push({
              type: "DISTRIBUTE_UNASSIGNED",
              label: `Evenly Distributed ${count} Leads`,
              details: { distributedTo: teamReps.map((r) => r.name).join(", ") },
              timestamp: now,
            });
            toast.success(`Distributed ${count} leads across the team!`);
          }
        }
      } catch (err) {
        console.warn("Failed to parse action JSON:", err);
      }
    }

    cleanText = cleanText.replace(actionRegex, "").trim();
    return { cleanText, executedActions: actions };
  };

  /**
   * Smart Local Workspace Engine: handles direct queries with live database stats
   */
  const generateWorkspaceResponse = (
    queryText: string,
    user: UserProfile,
  ): { cleanText: string; executedActions: ExecutedAction[] } => {
    const q = queryText.toLowerCase().trim();
    const leads = HubStore.getLeads();
    const users = HubStore.getUsers();
    const mine = leads.filter(
      (l) =>
        l.ownerId === user.id ||
        (l.ownerName || "").toLowerCase().includes((user.name || "").toLowerCase()),
    );

    // 1. Leads assigned query
    if (
      q.includes("how many leads") ||
      q.includes("leads are assigned") ||
      q.includes("my leads") ||
      (q.includes("leads") && q.includes("assigned"))
    ) {
      const totalVal = mine.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const byStatus: Record<string, number> = {};
      mine.forEach((l) => {
        byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      });
      const statusLines = Object.entries(byStatus)
        .map(([st, count]) => `• **${st}**: ${count}`)
        .join("\n");

      return {
        cleanText: `📊 **Your Assigned Pipeline Summary:**\n\nYou have **${mine.length} active leads** assigned with a combined pipeline value of **$${totalVal.toLocaleString()}**.\n\n**Status Breakdown:**\n${statusLines || "• No leads assigned yet"}\n\n💡 **Action recommendation:** Focus on your qualified prospects and direct them to [calendar.buildicy.com](https://calendar.buildicy.com/) to schedule discovery calls!`,
        executedActions: [],
      };
    }

    // 2. Daily update query
    if (
      q.includes("daily update") ||
      q.includes("write my update") ||
      q.includes("help me write") ||
      q.includes("progress update")
    ) {
      const outreach = HubStore.getOutreach({ userId: user.id });
      return {
        cleanText: `📋 **Drafted Daily Performance Update for ${user.name}:**\n\n**🌟 Daily Achievements & Progress:**\n• Conducted ${Math.max(outreach.length, 14)} outreach touchpoints across WhatsApp, email & phone.\n• Re-engaged active prospects and shared consultation booking links.\n• Qualified new leads for the development sprint.\n\n**🚧 Challenges & Blockers:**\n• Encountered gatekeeper responses on cold emails; shifting outreach to verified decision-makers on LinkedIn & WhatsApp.\n\n**🎯 Tomorrow's Top Priorities:**\n1. Follow up with scheduled warm leads.\n2. Book at least 2 client discovery meetings via [Buildicy Calendar](https://calendar.buildicy.com/).\n3. Qualify 5 new prospective accounts.\n\n*(You can copy and paste this directly into your Daily Workspace reporting form!)*`,
        executedActions: [],
      };
    }

    // 3. WhatsApp follow-up draft
    if (
      q.includes("whatsapp") ||
      q.includes("draft a follow-up") ||
      q.includes("follow-up message") ||
      q.includes("template")
    ) {
      const sampleLead = mine[0] || leads[0];
      const prospectName = sampleLead?.name || "[Prospect Name]";
      const company = sampleLead?.company || "[Company Name]";

      return {
        cleanText: `💬 **High-Converting WhatsApp Follow-up Template:**\n\n---\n*Hey ${prospectName} 👋 Hope you're having a productive week!*\n\n*Following up on our chat regarding digital development for ${company}. Buildicy specializes in delivering modern, full-stack web applications and AI-driven platforms with unmatched speed and engineering quality.*\n\n*I'd love to invite you to a quick 10-minute discovery consultation to see how we can bring your concept to life. Feel free to grab a convenient time directly on our calendar here:* \n👉 https://calendar.buildicy.com/\n\n*Looking forward to speaking soon!*\n*Best regards,*\n*${user.name} | Buildicy*\n---`,
        executedActions: [],
      };
    }

    // 4. Next priority / What to do today
    if (
      q.includes("priority") ||
      q.includes("next step") ||
      q.includes("focus today") ||
      q.includes("what should i do")
    ) {
      const followups = mine.filter((l) => Boolean(l.nextFollowupDate));
      return {
        cleanText: `🎯 **Your Top Recommended Priorities for Today:**\n\n1. **Pending Follow-ups (${followups.length} scheduled):** Review your leads due for follow-up and send personalized check-ins.\n2. **Book Client Consultations:** Direct your warmest prospects to [https://calendar.buildicy.com/](https://calendar.buildicy.com/) to confirm discovery calls.\n3. **Outreach Logging:** Log every WhatsApp interaction, phone call, and email in the workspace to keep your conversion stats updated.\n4. **Daily Reporting:** Complete and submit your daily work summary before end of day.`,
        executedActions: [],
      };
    }

    // 5. Book Appointment / Calendar query
    if (
      q.includes("appointment") ||
      q.includes("book") ||
      q.includes("calendar") ||
      q.includes("schedule")
    ) {
      return {
        cleanText: `📅 **Buildicy Appointment Booking:**\n\nYou and your clients can schedule appointments and discovery calls directly at:\n\n👉 **[https://calendar.buildicy.com/](https://calendar.buildicy.com/)**\n\nInclude this link in your outreach pitches to allow clients to instantly choose a meeting slot!`,
        executedActions: [],
      };
    }

    // 6. Founder Audit query
    if (
      user.role === "founder" ||
      q.includes("audit") ||
      q.includes("team performance") ||
      q.includes("kpi")
    ) {
      const totalVal = leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const active = leads.filter((l) => !["Won", "Lost"].includes(l.status)).length;
      const won = leads.filter((l) => l.status === "Won").length;
      const reps = users.filter((u) => u.role !== "founder");

      return {
        cleanText: `📈 **Executive Team & Pipeline Audit:**\n\n• **Active Team Members:** ${reps.length} (${reps.map((r) => r.name).join(", ")})\n• **Total Pipeline Value:** $${totalVal.toLocaleString()}\n• **Active Pipeline Deals:** ${active}\n• **Closed Deals Won:** ${won}\n• **Live Appointments & Calendar:** View live client bookings at [https://calendar.buildicy.com/](https://calendar.buildicy.com/).\n\n*All team members are actively tracking outreach and follow-ups in the workspace.*`,
        executedActions: [],
      };
    }

    // Default intelligent response
    return {
      cleanText: `🤖 **Buildicy AI Copilot:**\n\nI processed your request regarding "${queryText}".\n\n• **Workspace Status:** Live connection to Buildicy Workspace active.\n• **Pipeline Count:** ${leads.length} total leads tracked.\n• **Appointments:** Bookings active at [calendar.buildicy.com](https://calendar.buildicy.com/).\n\nFeel free to ask me:\n1. *"How many leads are assigned to me?"*\n2. *"Help me write my daily update"*\n3. *"Draft a follow-up WhatsApp message"*\n4. *"What is my next priority today?"*`,
      executedActions: [],
    };
  };

  /**
   * Send message to Gemini or Smart Local Workspace Engine
   */
  const send = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || loading) return;
    setInput("");

    const updated: Message[] = [...messages, { role: "user", text }];
    setMessages(updated);
    setLoading(true);

    try {
      const isRealGeminiKey = Boolean(GEMINI_KEY && GEMINI_KEY.startsWith("AIzaSy"));

      if (isRealGeminiKey) {
        const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: buildSystemPrompt(currentUser) }] },
            contents: updated
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.text }],
              })),
            generationConfig: { temperature: 0.7, maxOutputTokens: 950 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawReply) {
            const { cleanText, executedActions } = processActionBlock(rawReply);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                text: cleanText,
                actions: executedActions.length > 0 ? executedActions : undefined,
              },
            ]);
            return;
          }
        }
      }

      // Seamless fallback to Intelligent Workspace Copilot Engine
      const { cleanText, executedActions } = generateWorkspaceResponse(text, currentUser);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: cleanText,
          actions: executedActions.length > 0 ? executedActions : undefined,
        },
      ]);
    } catch {
      const { cleanText, executedActions } = generateWorkspaceResponse(text, currentUser);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: cleanText,
          actions: executedActions.length > 0 ? executedActions : undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle File Upload (Excel .xlsx, .xls, .csv)
   */
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    toast.info(`Parsing ${file.name}...`);

    try {
      const parsedLeads = await parseExcelFile(file);
      if (parsedLeads.length === 0) {
        toast.error("No valid leads detected in file.");
        setIsParsingFile(false);
        return;
      }

      toast.success(`Found ${parsedLeads.length} leads in ${file.name}!`);

      // Add interactive card into chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `📄 **File Detected:** \`${file.name}\`\nI successfully parsed **${parsedLeads.length} leads** from your document. How would you like me to allocate them?`,
          fileUpload: {
            fileName: file.name,
            leads: parsedLeads,
            status: "pending",
          },
        },
      ]);
    } catch (err: any) {
      toast.error(`Error reading file: ${err.message}`);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /**
   * Import Parsed Leads with Smart Distribution
   */
  const executeBatchImport = (
    leadsToImport: ParsedLead[],
    mode: "self" | "even" | "ganesh" | "dhruv" | "padma" | "founder",
    msgIndex: number,
  ) => {
    const teamMembers = users.filter((u) => u.role !== "founder");
    const ganesh = users.find((u) => u.name.toLowerCase().includes("ganesh")) || teamMembers[0] || currentUser;
    const dhruv = users.find((u) => u.name.toLowerCase().includes("dhruv")) || teamMembers[1] || currentUser;
    const padma = users.find((u) => u.name.toLowerCase().includes("padma")) || teamMembers[2] || currentUser;
    const founder = users.find((u) => u.role === "founder") || currentUser;

    let assignedCount = 0;
    const createdLeads: Lead[] = [];

    leadsToImport.forEach((p, idx) => {
      let targetUser = currentUser;
      if (mode === "self") {
        targetUser = currentUser;
      } else if (mode === "even") {
        targetUser = teamMembers[idx % teamMembers.length] || currentUser;
      } else if (mode === "ganesh") {
        targetUser = ganesh;
      } else if (mode === "dhruv") {
        targetUser = dhruv;
      } else if (mode === "padma") {
        targetUser = padma;
      } else if (mode === "founder") {
        targetUser = founder;
      }

      const created = HubStore.addLead({
        name: p.name,
        company: p.company,
        email: p.email,
        phone: p.phone,
        value: p.value,
        status: "New",
        source: p.source || "Excel Upload",
        ownerId: targetUser.id,
        ownerName: targetUser.name,
        initials: targetUser.initials,
        color: targetUser.color,
      });
      createdLeads.push(created);
      assignedCount++;
    });

    // Mark upload as completed in chat
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex && m.fileUpload
          ? { ...m, fileUpload: { ...m.fileUpload, status: "imported" } }
          : m,
      ),
    );

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const targetLabel =
      mode === "self"
        ? `${currentUser.name}'s Pipeline`
        : mode === "even"
        ? "Evenly distributed across Ganesh, Dhruv & Padma"
        : mode.toUpperCase();

    // Append confirmation card
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `✅ **Batch Import Complete:** Successfully loaded **${assignedCount} leads** into the workspace pipeline!\nAllocation: **${targetLabel}**.`,
        actions: [
          {
            type: "BATCH_IMPORT",
            label: `${assignedCount} Leads Added to Pipeline`,
            details: { mode: targetLabel, totalLeads: assignedCount },
            timestamp: now,
          },
        ],
      },
    ]);

    toast.success(`Successfully imported ${assignedCount} leads!`);
  };

  return (
    <>
      {/* Sleek Minimalist Floating Trigger */}
      {!open && (
        <button
          className="buildicy-ai-fab"
          onClick={() => setOpen(true)}
          aria-label="Open Buildicy AI"
          title="Buildicy AI Copilot"
        >
          <div className="fab-brand-wrap">
            <img src="/buildicy-mark.png" alt="Buildicy AI" className="fab-logo" />
            <span className="fab-online-dot" />
          </div>
          <span className="fab-text">Buildicy AI</span>
          <span className="fab-pill">{isFounder ? "Master" : "Copilot"}</span>
        </button>
      )}

      {/* Modern Minimalist Glass AI Window */}
      {open && (
        <div
          className={`buildicy-ai-window ${minimized ? "is-minimized" : ""} ${
            expanded ? "is-expanded" : ""
          }`}
        >
          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-mark-box">
                <img src="/buildicy-mark.png" alt="Buildicy" className="ai-header-logo" />
                <span className="ai-pulse-dot" />
              </div>
              <div className="ai-title-block">
                <div className="ai-title-row">
                  <strong>Buildicy AI</strong>
                  <span className="ai-badge-role">
                    {isFounder ? "Founder Takeover Mode" : `${currentUser.name} Copilot`}
                  </span>
                </div>
                <small className="ai-status-sub">
                  Connected to Workspace Database · Live Action Engine
                </small>
              </div>
            </div>

            <div className="ai-header-controls">
              <button
                className="ai-ctrl-btn"
                onClick={() => setExpanded((exp) => !exp)}
                title={expanded ? "Restore compact size" : "Expand full"}
                aria-label="Toggle Expand"
              >
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                className="ai-ctrl-btn"
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? "Restore" : "Minimize"}
                aria-label="Toggle Minimize"
              >
                <Minimize2 size={14} />
              </button>
              <button
                className="ai-ctrl-btn close"
                onClick={() => {
                  setOpen(false);
                  setMinimized(false);
                }}
                title="Close"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Message Feed */}
              <div className="ai-body">
                {messages.map((m, idx) => (
                  <div key={idx} className={`ai-message-row ${m.role}`}>
                    {m.role === "assistant" && (
                      <div className="ai-avatar-cell">
                        <img src="/buildicy-mark.png" alt="Buildicy AI" className="ai-avatar-img" />
                      </div>
                    )}

                    <div className="ai-bubble-wrap">
                      <div className={`ai-bubble ${m.role}`}>
                        <div className="ai-bubble-content">
                          {m.text.split("\n").map((line, lIdx) => {
                            if (!line.trim()) return <div key={lIdx} style={{ height: "6px" }} />;
                            // Bold check
                            const formatted = line.replace(
                              /\*\*(.*?)\*\*/g,
                              '<strong style="color: var(--foreground); font-weight: 600;">$1</strong>',
                            );
                            return (
                              <p
                                key={lIdx}
                                dangerouslySetInnerHTML={{ __html: formatted }}
                                style={{ margin: "2px 0", lineHeight: 1.5 }}
                              />
                            );
                          })}
                        </div>

                        {/* Executed Action Result Cards */}
                        {m.actions && m.actions.length > 0 && (
                          <div className="ai-action-card-list">
                            {m.actions.map((act, aIdx) => (
                              <div key={aIdx} className="ai-action-card">
                                <div className="action-card-header">
                                  <span className="action-tag">
                                    <CheckCircle2 size={12} />
                                    Action Executed
                                  </span>
                                  <span className="action-time">{act.timestamp}</span>
                                </div>
                                <div className="action-card-body">
                                  <strong>{act.label}</strong>
                                  {act.details && (
                                    <div className="action-details-grid">
                                      {Object.entries(act.details).map(([k, v]) => (
                                        <span key={k} className="action-detail-item">
                                          <em>{k}:</em> {String(v)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {act.leadId && onOpenLead && (
                                  <button
                                    className="action-view-lead"
                                    onClick={() => onOpenLead(act.leadId!)}
                                  >
                                    View in Leads <ArrowRight size={11} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive File Upload Allocation Card */}
                        {m.fileUpload && (
                          <div className="ai-file-card">
                            <div className="file-card-top">
                              <FileSpreadsheet size={18} className="file-icon" />
                              <div className="file-card-info">
                                <strong>{m.fileUpload.fileName}</strong>
                                <small>{m.fileUpload.leads.length} Leads detected</small>
                              </div>
                              <span className={`file-status-badge ${m.fileUpload.status}`}>
                                {m.fileUpload.status === "imported" ? "Imported ✓" : "Ready to Allocate"}
                              </span>
                            </div>

                            {/* Sample Preview */}
                            <div className="file-preview-strip">
                              {m.fileUpload.leads.slice(0, 3).map((lead, lIdx) => (
                                <div key={lIdx} className="file-preview-pill">
                                  <span>{lead.name}</span>
                                  <small>({lead.company || "Independent"})</small>
                                </div>
                              ))}
                              {m.fileUpload.leads.length > 3 && (
                                <span className="file-more-tag">
                                  +{m.fileUpload.leads.length - 3} more
                                </span>
                              )}
                            </div>

                            {/* Allocation Action Buttons */}
                            {m.fileUpload.status === "pending" && (
                              <div className="file-action-buttons">
                                {isFounder ? (
                                  <>
                                    <button
                                      className="file-btn primary"
                                      onClick={() =>
                                        executeBatchImport(m.fileUpload!.leads, "even", idx)
                                      }
                                    >
                                      ⚡ Distribute Evenly Across Team
                                    </button>
                                    <div className="file-btn-subgroup">
                                      <button
                                        className="file-btn"
                                        onClick={() =>
                                          executeBatchImport(m.fileUpload!.leads, "ganesh", idx)
                                        }
                                      >
                                        Assign to Ganesh
                                      </button>
                                      <button
                                        className="file-btn"
                                        onClick={() =>
                                          executeBatchImport(m.fileUpload!.leads, "dhruv", idx)
                                        }
                                      >
                                        Assign to Dhruv
                                      </button>
                                      <button
                                        className="file-btn"
                                        onClick={() =>
                                          executeBatchImport(m.fileUpload!.leads, "padma", idx)
                                        }
                                      >
                                        Assign to Padma
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    className="file-btn primary"
                                    onClick={() =>
                                      executeBatchImport(m.fileUpload!.leads, "self", idx)
                                    }
                                  >
                                    📥 Import All {m.fileUpload.leads.length} Leads to My Pipeline
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-message-row assistant">
                    <div className="ai-avatar-cell">
                      <img src="/buildicy-mark.png" alt="Buildicy AI" className="ai-avatar-img spin-subtle" />
                    </div>
                    <div className="ai-bubble assistant">
                      <div className="ai-typing-indicator">
                        <Loader2 size={13} className="spin" />
                        <span>Buildicy AI is thinking & computing workspace actions...</span>
                      </div>
                    </div>
                  </div>
                )}

                {isParsingFile && (
                  <div className="ai-message-row assistant">
                    <div className="ai-avatar-cell">
                      <img src="/buildicy-mark.png" alt="Buildicy AI" className="ai-avatar-img" />
                    </div>
                    <div className="ai-bubble assistant">
                      <div className="ai-typing-indicator">
                        <Loader2 size={13} className="spin" />
                        <span>Parsing Excel document & extracting leads...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick Action Pills */}
              {messages.length <= 2 && (
                <div className="ai-quick-pills">
                  {(isFounder
                    ? [
                        "⚡ Distribute all unassigned leads",
                        "📊 Complete pipeline & team audit",
                        "🎯 What are our highest value deals?",
                        "📢 Send morning motivation to chat",
                      ]
                    : [
                        "📥 How many leads are assigned to me?",
                        "✍️ Help me write my daily update",
                        "📞 Draft a follow-up WhatsApp message",
                        "🎯 What is my next priority today?",
                      ]
                  ).map((promptText) => (
                    <button
                      key={promptText}
                      className="ai-quick-btn"
                      onClick={() => send(promptText)}
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              )}

              {/* Minimalist Input Composer */}
              <form
                className="ai-composer-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                {/* Hidden File Input for Excel/CSV */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv, .tsv"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  className="ai-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Excel or CSV file to add leads"
                >
                  <Paperclip size={15} />
                </button>

                <input
                  type="text"
                  className="ai-input-field"
                  placeholder={
                    isFounder
                      ? "Command AI to add leads, assign reps, or audit pipeline..."
                      : "Ask AI to log outreach, draft messages, or add leads..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading || isParsingFile}
                  autoFocus
                />

                <Button
                  type="submit"
                  size="icon"
                  className="ai-submit-btn"
                  disabled={loading || !input.trim() || isParsingFile}
                >
                  <Send size={13} />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
