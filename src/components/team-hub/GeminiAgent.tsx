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
    | "DISTRIBUTE_UNASSIGNED"
    | "ASSIGN_TECH_TASK"
    | "UPDATE_TECH_TASK"
    | "NAVIGATE"
    | "ADD_NOTIFICATION"
    | "SUBMIT_DAILY_UPDATE"
    | "UPDATE_WORKING_STATUS";
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
  const activities = HubStore.getActivities().slice(0, 10);
  const outreach = HubStore.getOutreach().slice(0, 10);
  const notifications = HubStore.getNotifications().slice(0, 5);
  const channels = HubStore.getChannels();
  const techTasks = HubStore.getTechTasks();
  const techUpdates = HubStore.getTechDailyUpdates();
  const dailyUpdates = HubStore.getDailyUpdates();
  const isTechie = user.role === "techie";
  const isFounder = user.role === "founder";

  const teamList = users.map((u) =>
    `• ${u.name} | role: ${u.role} | id: ${u.id} | email: ${u.email} | title: ${u.title} | status: ${u.workingStatus || "Active"}`
  ).join("\n");

  const leadsList = leads.length > 0
    ? leads.slice(0, 20).map((l) =>
        `[${l.id}] ${l.name} | ${l.company} | value: ${l.value} | status: ${l.status} | owner: ${l.ownerName} | followup: ${l.nextFollowupDate || "none"}`
      ).join("\n")
    : "No leads in workspace.";

  const techTasksList = techTasks.length > 0
    ? techTasks.map((t) =>
        `[${t.id}] "${t.title}" | assigned to: ${t.assignedToName} | by: ${t.assignedByName} | priority: ${t.priority} | status: ${t.status} | progress: ${t.progressPct}% | due: ${t.dueDate || "none"}`
      ).join("\n")
    : "No tech tasks assigned.";

  const recentActivity = activities.map((a) =>
    `• ${a.person} ${a.action} "${a.subject}" — ${a.detail}`
  ).join("\n") || "No recent activity.";

  const myTechTasks = techTasks.filter((t) => t.assignedTo === user.id);
  const myLeads = leads.filter((l) => l.ownerId === user.id || l.ownerName?.toLowerCase().includes(user.name?.toLowerCase()));
  const myDailyUpdate = dailyUpdates.find((d) => d.userId === user.id && d.date === new Date().toISOString().slice(0, 10));
  const myTechUpdate = techUpdates.find((d) => d.userId === user.id && d.date === new Date().toISOString().slice(0, 10));

  return `You are Buildicy AI — a fully autonomous workspace agent for Buildicy Team Hub.
You have COMPLETE READ ACCESS to the live dashboard and MUST EXECUTE REAL ACTIONS automatically.
You are talking to: ${user.name} (${user.role}${isTechie ? " — Tech Team" : ""})

CRITICAL RULE: When a user asks you to DO something — DO IT IMMEDIATELY with an action block. Never just describe. ALWAYS execute the action.
Examples: "help me write my daily update" = SUBMIT_TECH_UPDATE or SUBMIT_DAILY_UPDATE immediately using live data. "set status" = UPDATE_WORKING_STATUS immediately. "update task" = UPDATE_TECH_TASK immediately.

═══════════════════════════════════════
LIVE DASHBOARD SNAPSHOT
═══════════════════════════════════════

👥 TEAM (${users.length} members):
${teamList}

📋 LEADS PIPELINE (${leads.length} total):
${leadsList}

🔧 TECH TASKS (${techTasks.length} total):
${techTasksList}

📣 RECENT ACTIVITY:
${recentActivity}

💬 CHAT CHANNELS: ${channels.map((c) => `#${c.name}`).join(", ") || "None"}

${isTechie ? `🛠️ YOUR TASKS (${myTechTasks.length}):
${myTechTasks.map((t) => `• [${t.id}] "${t.title}" | ${t.status} | ${t.progressPct}% | due: ${t.dueDate || "none"}`).join("\n") || "No tasks yet."}

📝 TODAY'S TECH UPDATE: ${myTechUpdate ? `Submitted — ${myTechUpdate.overallProgressPct}% overall` : "NOT submitted yet"}
` : ""}
${user.role === "member" ? `📊 YOUR LEADS (${myLeads.length}):
${myLeads.slice(0, 8).map((l) => `• [${l.id}] ${l.name} | ${l.company} | ${l.status}`).join("\n") || "No leads."}

📝 TODAY'S DAILY UPDATE: ${myDailyUpdate ? `Submitted — ${myDailyUpdate.totalOutreachCount} outreach` : "NOT submitted yet"}
` : ""}

═══════════════════════════════════════
ACTION ENGINE
═══════════════════════════════════════
To execute, include this block in your reply:

\`\`\`buildicy_action
{ "action": "ACTION_TYPE", "params": { ... } }
\`\`\`

ACTIONS:
1. CREATE_LEAD — { name, company, email, phone, value, status, source, ownerName }
2. UPDATE_LEAD_STATUS — { leadId, status }
3. REASSIGN_LEAD — { leadId, newOwnerName }
4. LOG_OUTREACH — { leadId, channel, notes, prospectResponse, isPositive }
5. DISTRIBUTE_UNASSIGNED — {}
6. BROADCAST_CHAT — { channelId, message }
7. ASSIGN_TECH_TASK — { assignedToName, title, description, priority, dueDate } — FOUNDER ONLY
8. UPDATE_TECH_TASK — { taskId, status, progressPct, techieNote } — TECHIE ONLY
9. NAVIGATE — { view }
10. ADD_NOTIFICATION — { title, body, userId }
11. UPDATE_WORKING_STATUS — { status }
12. SUBMIT_DAILY_UPDATE — { totalOutreachCount, emailCount, whatsappCount, callCount, meetingsBooked, positiveResponses, achievements, challenges, tomorrowPriorities, workingStatus } — MEMBER ONLY — use live outreach data to fill numbers automatically
13. SUBMIT_TECH_UPDATE — { whatIWorkedOn, blockers, tomorrowPlan, overallProgressPct, workingStatus, taskProgress: [{taskId, progressPct, note}] } — TECHIE ONLY — use live task data to fill automatically

ROLE RULES:
${isFounder ? `FOUNDER: Execute ALL actions. Be sharp and proactive.` : isTechie ? `TECHIE ${user.name}: Use UPDATE_TECH_TASK, UPDATE_WORKING_STATUS, SUBMIT_TECH_UPDATE, NAVIGATE only.
When asked to write/submit daily update — read the live task snapshot above and IMMEDIATELY fire SUBMIT_TECH_UPDATE with real task data. Do NOT ask what they did.` : `MEMBER ${user.name}: Use CREATE_LEAD, LOG_OUTREACH, UPDATE_LEAD_STATUS, UPDATE_WORKING_STATUS, SUBMIT_DAILY_UPDATE, NAVIGATE.
When asked to write/submit daily update — read live leads/outreach snapshot and IMMEDIATELY fire SUBMIT_DAILY_UPDATE with real numbers. Do NOT ask what they did.`}

Respond under 150 words. Always execute actions immediately. Never just describe — DO IT.`;
}

export function GeminiAgent({ currentUser, onOpenLead, onNavigate }: GeminiAgentProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const MESSAGE_LIMIT = 20;
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isFounder = currentUser.role === "founder";
  const isTechie = currentUser.role === "techie";
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
        ? `${timeGreeting}, Founder 👋 **Buildicy AI** is standing by.\n\nI have full live access to your entire dashboard. I can:\n• **Audit pipeline, team KPIs & outreach stats** in real time\n• **Assign tech tasks** to your tech team members\n• **Reassign leads, broadcast to chat, send notifications**\n• **Navigate to any section** of the workspace`
        : isTechie
        ? `${timeGreeting}, ${currentUser.name} 👋 **Buildicy AI** is your tech copilot.\n\nI can see all your assigned tasks and I can:\n• **Show your assigned projects & task details**\n• **Update task status and progress** for you\n• **Set your working status** (In Development, Blocked, etc.)\n• **Help write your daily tech update**`
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
        } else if (parsed.action === "ASSIGN_TECH_TASK" && parsed.params) {
          const p = parsed.params;
          const techie = users.find((u) =>
            u.role === "techie" && u.name.toLowerCase().includes(String(p.assignedToName || "").toLowerCase())
          ) || users.find((u) => u.role === "techie");
          if (techie) {
            HubStore.assignTechTask({
              assignedTo: techie.id,
              assignedToName: techie.name,
              assignedBy: currentUser.id,
              assignedByName: currentUser.name,
              title: p.title || "New Task",
              description: p.description || "",
              priority: (p.priority as any) || "Medium",
              dueDate: p.dueDate || undefined,
              documentUrl: p.documentUrl || "",
              documentName: p.documentName || "",
            });
            actions.push({
              type: "ASSIGN_TECH_TASK",
              label: `Task Assigned to ${techie.name}: "${p.title}"`,
              details: { assignedTo: techie.name, priority: p.priority || "Medium", due: p.dueDate || "No due date" },
              timestamp: now,
            });
            toast.success(`Tech task assigned to ${techie.name}!`);
          }
        } else if (parsed.action === "UPDATE_TECH_TASK" && parsed.params) {
          const p = parsed.params;
          if (p.taskId) {
            HubStore.updateTechTaskStatus(p.taskId, p.status || "In Progress", Number(p.progressPct) || 0, p.techieNote || "");
            actions.push({
              type: "UPDATE_TECH_TASK",
              label: `Task Updated: ${p.status} · ${p.progressPct}%`,
              details: { taskId: p.taskId, status: p.status, progress: `${p.progressPct}%` },
              timestamp: now,
            });
            toast.success(`Task updated to ${p.status} (${p.progressPct}%)`);
          }
        } else if (parsed.action === "NAVIGATE" && parsed.params?.view) {
          if (onNavigate) {
            onNavigate(parsed.params.view);
            actions.push({
              type: "NAVIGATE",
              label: `Navigated to ${parsed.params.view}`,
              details: { view: parsed.params.view },
              timestamp: now,
            });
          }
        } else if (parsed.action === "ADD_NOTIFICATION" && parsed.params) {
          const p = parsed.params;
          HubStore.addNotification({
            title: p.title || "AI Notification",
            body: p.body || "",
            time: "Just now",
            userId: p.userId || "all",
          });
          actions.push({
            type: "ADD_NOTIFICATION",
            label: `Notification sent: "${p.title}"`,
            details: { to: p.userId || "all" },
            timestamp: now,
          });
          toast.success(`Notification sent!`);
        } else if (parsed.action === "UPDATE_WORKING_STATUS" && parsed.params?.status) {
          HubStore.updateUserWorkingStatus(currentUser.id, parsed.params.status);
          actions.push({
            type: "UPDATE_WORKING_STATUS",
            label: `Status set to: ${parsed.params.status}`,
            details: { status: parsed.params.status },
            timestamp: now,
          });
          toast.success(`Working status updated to ${parsed.params.status}`);
        } else if (parsed.action === "SUBMIT_DAILY_UPDATE" && parsed.params) {
          const p = parsed.params;
          const myLeads = HubStore.getLeads().filter((l) => l.ownerId === currentUser.id || (l.ownerName || "").toLowerCase().includes((currentUser.name || "").toLowerCase()));
          const myOutreach = HubStore.getOutreach({ userId: currentUser.id });
          const emailC = Number(p.emailCount) || myOutreach.filter((o) => o.channel === "Email").length;
          const waC = Number(p.whatsappCount) || myOutreach.filter((o) => o.channel === "WhatsApp").length;
          const callC = Number(p.callCount) || myOutreach.filter((o) => o.channel === "Call").length;
          const total = Number(p.totalOutreachCount) || myOutreach.length;
          const meetings = Number(p.meetingsBooked) || myOutreach.filter((o) => o.prospectResponse === "Meeting booked").length;
          const positive = Number(p.positiveResponses) || myOutreach.filter((o) => o.isPositive).length;
          HubStore.submitDailyUpdate({
            userId: currentUser.id,
            userName: currentUser.name,
            userInitials: currentUser.initials,
            userColor: currentUser.color,
            date: new Date().toISOString().slice(0, 10),
            workingStatus: (p.workingStatus as any) || currentUser.workingStatus || "Outreach",
            newLeadsCount: myLeads.filter((l) => l.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
            emailOutreachCount: emailC,
            whatsappOutreachCount: waC,
            callOutreachCount: callC,
            totalOutreachCount: total,
            responsesReceivedCount: myOutreach.filter((o) => o.prospectResponse !== "No response yet").length,
            positiveResponsesCount: positive,
            meetingsBookedCount: meetings,
            proposalsRequestedCount: myOutreach.filter((o) => o.prospectResponse === "Proposal requested").length,
            completedFollowupsCount: myOutreach.filter((o) => (o.notes || "").toLowerCase().includes("follow")).length,
            pendingFollowupsCount: myLeads.filter((l) => l.nextFollowupDate && !["Won","Lost"].includes(l.status)).length,
            achievements: p.achievements || "",
            challenges: p.challenges || "",
            tomorrowPriorities: p.tomorrowPriorities || "",
          });
          actions.push({
            type: "SUBMIT_DAILY_UPDATE" as any,
            label: `Daily Update Submitted — ${total} outreach, ${meetings} meetings`,
            details: { email: emailC, whatsapp: waC, calls: callC, meetings, positive },
            timestamp: now,
          });
          toast.success("Daily update submitted!");
        } else if (parsed.action === "SUBMIT_TECH_UPDATE" && parsed.params) {
          const p = parsed.params;
          const myTasks = HubStore.getTechTasks({ assignedTo: currentUser.id });
          const taskProgress = Array.isArray(p.taskProgress) ? p.taskProgress : myTasks.map((t) => ({ taskId: t.id, progressPct: t.progressPct, note: t.techieNote || "" }));
          // Also update each task's progress in store
          taskProgress.forEach((tp: any) => {
            if (tp.taskId && tp.progressPct !== undefined) {
              const task = myTasks.find((t) => t.id === tp.taskId);
              if (task) HubStore.updateTechTaskStatus(tp.taskId, task.status, Number(tp.progressPct), tp.note || "");
            }
          });
          HubStore.submitTechDailyUpdate({
            userId: currentUser.id,
            userName: currentUser.name,
            userInitials: currentUser.initials,
            userColor: currentUser.color,
            date: new Date().toISOString().slice(0, 10),
            workingStatus: (p.workingStatus as any) || currentUser.workingStatus || "In Development",
            whatIWorkedOn: p.whatIWorkedOn || myTasks.map((t) => t.title).join(", ") || "Worked on assigned tasks",
            blockers: p.blockers || "",
            tomorrowPlan: p.tomorrowPlan || "",
            taskProgress,
            overallProgressPct: Number(p.overallProgressPct) || Math.round(myTasks.reduce((s, t) => s + t.progressPct, 0) / Math.max(myTasks.length, 1)),
          });
          actions.push({
            type: "SUBMIT_DAILY_UPDATE" as any,
            label: `Tech Daily Update Submitted — ${p.overallProgressPct || 0}% overall`,
            details: { tasks: myTasks.length, blockers: p.blockers || "None" },
            timestamp: now,
          });
          toast.success("Tech daily update submitted!");
        } else if (parsed.action === "BROADCAST_CHAT" && parsed.params) {
          const p = parsed.params;
          const channelId = p.channelId || p.channelName || "";
          if (channelId && p.message) {
            HubStore.sendChatMessage(channelId, p.message);
            actions.push({
              type: "BROADCAST_CHAT",
              label: `Message sent to #${channelId}`,
              details: { channel: channelId, preview: String(p.message).slice(0, 60) },
              timestamp: now,
            });
            toast.success(`Message broadcast to #${channelId}`);
          }
        }
      } catch (err) {
        console.warn("Failed to parse action JSON:", err);
      }
    }

    cleanText = cleanText.replace(actionRegex, "").trim();
    return { cleanText, executedActions: actions };
  };

  const generateWorkspaceResponse = (
    queryText: string,
    user: UserProfile,
  ): { cleanText: string; executedActions: ExecutedAction[] } => {
    const q = queryText.toLowerCase().trim();
    const leads = HubStore.getLeads();
    const users = HubStore.getUsers();
    const techTasks = HubStore.getTechTasks({ assignedTo: user.id });
    const mine = leads.filter(
      (l) => l.ownerId === user.id || (l.ownerName || "").toLowerCase().includes((user.name || "").toLowerCase()),
    );
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const actions: ExecutedAction[] = [];

    // Tech: show my tasks
    if (user.role === "techie" && (q.includes("task") || q.includes("project") || q.includes("assigned"))) {
      if (techTasks.length === 0) {
        return { cleanText: `📋 **Your Assigned Tasks:**\n\nNo tasks assigned yet. The founder will assign projects to you here. Check back soon!`, executedActions: [] };
      }
      const taskLines = techTasks.map((t) =>
        `• **${t.title}** | ${t.status} | ${t.progressPct}% | Priority: ${t.priority}${t.dueDate ? ` | Due: ${t.dueDate}` : ""}`
      ).join("\n");
      return { cleanText: `📋 **Your Assigned Tasks (${techTasks.length}):**\n\n${taskLines}\n\nYou can say *"Update [task name] to In Progress at 40%"* and I'll do it for you!`, executedActions: [] };
    }

    // Tech: set status
    if (q.includes("set") && q.includes("status") || q.includes("in development") || q.includes("blocked") || q.includes("in review") || q.includes("testing")) {
      const statusMap: Record<string, string> = {
        "in development": "In Development", "blocked": "Blocked", "in review": "In Review",
        "testing": "Testing", "planning": "Planning", "deployment": "Deployment", "break": "Break", "offline": "Offline",
        "outreach": "Outreach", "follow-ups": "Follow-ups", "meetings": "Meetings",
      };
      const matched = Object.keys(statusMap).find((k) => q.includes(k));
      if (matched) {
        const status = statusMap[matched] as any;
        HubStore.updateUserWorkingStatus(user.id, status);
        actions.push({ type: "UPDATE_WORKING_STATUS", label: `Status set to ${status}`, details: { status }, timestamp: now });
        toast.success(`Working status set to ${status}`);
        return { cleanText: `✅ Your working status has been updated to **${status}**.`, executedActions: actions };
      }
    }

    // Tech: daily update help — auto-submit
    if (user.role === "techie" && (q.includes("daily") || q.includes("update") || q.includes("standup"))) {
      const pending = techTasks.filter((t) => t.status !== "Done").length;
      const blocked = techTasks.filter((t) => t.status === "Blocked");
      const overallPct = techTasks.length > 0 ? Math.round(techTasks.reduce((s, t) => s + t.progressPct, 0) / techTasks.length) : 0;
      const taskProgress = techTasks.map((t) => ({ taskId: t.id, taskTitle: t.title, progressPct: t.progressPct, note: t.techieNote || "" }));
      HubStore.submitTechDailyUpdate({
        userId: user.id,
        userName: user.name,
        userInitials: user.initials,
        userColor: user.color,
        date: new Date().toISOString().slice(0, 10),
        workingStatus: (user.workingStatus as any) || "In Development",
        whatIWorkedOn: techTasks.length > 0 ? techTasks.map((t) => t.title).join(", ") : "Worked on assigned tasks",
        blockers: blocked.length > 0 ? blocked.map((t) => t.title).join(", ") : "",
        tomorrowPlan: `Continue with ${pending} pending task(s). Target completing at least one to Done.`,
        taskProgress,
        overallProgressPct: overallPct,
      });
      actions.push({ type: "UPDATE_WORKING_STATUS", label: `Tech Daily Update Submitted — ${overallPct}% overall`, details: { tasks: techTasks.length, blocked: blocked.length }, timestamp: now });
      toast.success("Tech daily update submitted!");
      return {
        cleanText: `✅ **Tech Daily Update Submitted!**\n\n• **Worked on:** ${techTasks.map((t) => t.title).join(", ") || "Assigned tasks"}\n• **Overall progress:** ${overallPct}%\n• **Blockers:** ${blocked.length > 0 ? blocked.map((t) => t.title).join(", ") : "None"}\n• **Tomorrow:** Continue ${pending} pending task(s)\n\nUpdate saved to your dashboard!`,
        executedActions: actions,
      };
    }

    // Leads assigned query
    if (q.includes("how many leads") || q.includes("my leads") || (q.includes("leads") && q.includes("assigned"))) {
      const totalVal = mine.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const byStatus: Record<string, number> = {};
      mine.forEach((l) => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
      const statusLines = Object.entries(byStatus).map(([st, count]) => `• **${st}**: ${count}`).join("\n");
      return {
        cleanText: `📊 **Your Pipeline:** ${mine.length} leads · $${totalVal.toLocaleString()} value\n\n${statusLines || "• No leads yet"}`,
        executedActions: [],
      };
    }

    // Founder audit
    if (user.role === "founder" || q.includes("audit") || q.includes("team performance") || q.includes("kpi")) {
      const totalVal = leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const won = leads.filter((l) => l.status === "Won").length;
      const reps = users.filter((u) => u.role !== "founder");
      const techies = users.filter((u) => u.role === "techie");
      const allTechTasks = HubStore.getTechTasks();
      return {
        cleanText: `📈 **Executive Dashboard Audit:**\n\n• **Pipeline:** ${leads.length} leads · $${totalVal.toLocaleString()} total value · ${won} won\n• **Marketing Team:** ${reps.filter((u) => u.role === "member").length} members active\n• **Tech Team:** ${techies.length} members · ${allTechTasks.length} tasks assigned\n• **Appointments:** [calendar.buildicy.com](https://calendar.buildicy.com/)`,
        executedActions: [],
      };
    }

    // Daily update — auto-submit for members
    if (q.includes("daily update") || q.includes("write my update") || q.includes("progress update") || q.includes("submit")) {
      const myOutreach = HubStore.getOutreach({ userId: user.id });
      const emailC = myOutreach.filter((o) => o.channel === "Email").length;
      const waC = myOutreach.filter((o) => o.channel === "WhatsApp").length;
      const callC = myOutreach.filter((o) => o.channel === "Call").length;
      const meetings = myOutreach.filter((o) => o.prospectResponse === "Meeting booked").length;
      const positive = myOutreach.filter((o) => o.isPositive).length;
      HubStore.submitDailyUpdate({
        userId: user.id,
        userName: user.name,
        userInitials: user.initials,
        userColor: user.color,
        date: new Date().toISOString().slice(0, 10),
        workingStatus: (user.workingStatus as any) || "Outreach",
        newLeadsCount: mine.filter((l) => l.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        emailOutreachCount: emailC,
        whatsappOutreachCount: waC,
        callOutreachCount: callC,
        totalOutreachCount: myOutreach.length,
        responsesReceivedCount: myOutreach.filter((o) => o.prospectResponse !== "No response yet").length,
        positiveResponsesCount: positive,
        meetingsBookedCount: meetings,
        proposalsRequestedCount: myOutreach.filter((o) => o.prospectResponse === "Proposal requested").length,
        completedFollowupsCount: myOutreach.filter((o) => (o.notes || "").toLowerCase().includes("follow")).length,
        pendingFollowupsCount: mine.filter((l) => l.nextFollowupDate && !["Won","Lost"].includes(l.status)).length,
        achievements: `${myOutreach.length} outreach attempts, ${meetings} meetings booked`,
        challenges: "Gatekeeper responses on cold emails — shifting to LinkedIn.",
        tomorrowPriorities: `Follow up warm leads, book discovery calls via calendar.buildicy.com`,
      });
      actions.push({ type: "UPDATE_WORKING_STATUS", label: `Daily Update Submitted — ${myOutreach.length} outreach`, details: { email: emailC, whatsapp: waC, calls: callC, meetings }, timestamp: now });
      toast.success("Daily update submitted!");
      return {
        cleanText: `✅ **Daily Update Submitted!**\n\n• **Total outreach:** ${myOutreach.length} (Email: ${emailC}, WhatsApp: ${waC}, Calls: ${callC})\n• **Meetings booked:** ${meetings}\n• **Positive responses:** ${positive}\n• **Tomorrow:** Follow up warm leads, book discovery calls\n\nUpdate saved to your dashboard!`,
        executedActions: actions,
      };
    }

    // WhatsApp template
    if (q.includes("whatsapp") || q.includes("follow-up message") || q.includes("template")) {
      const sampleLead = mine[0] || leads[0];
      return {
        cleanText: `💬 **WhatsApp Follow-up Template:**\n\n---\n*Hey ${sampleLead?.name || "[Name]"} 👋 Following up on our chat about ${sampleLead?.company || "your project"}.*\n\n*I'd love to schedule a quick 10-min discovery call. Grab a time here:*\n👉 https://calendar.buildicy.com/\n\n*Best, ${user.name} | Buildicy*\n---`,
        executedActions: [],
      };
    }

    return {
      cleanText: `🤖 **Buildicy AI** — Live workspace connected.\n\n• ${leads.length} leads in pipeline\n• ${users.length} team members active\n\nTry asking:\n• *"Show my assigned tasks"* (tech)\n• *"How many leads do I have?"*\n• *"Help me write my daily update"*\n• *"Set my status to In Development"*`,
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
    const newCount = userMsgCount + 1;

    // Hit token limit — count only user messages
    if (newCount > MESSAGE_LIMIT) {
      setMessages([
        { role: "assistant", text: "🔄 **Session limit reached (20 messages).** Refreshing workspace context..." },
      ]);
      setTimeout(() => {
        setMessages([{ role: "assistant", text: `✅ **Fresh session started!** How can I help you, ${currentUser.name}?` }]);
        setUserMsgCount(0);
      }, 1200);
      return;
    }
    setUserMsgCount(newCount);

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
                    {isFounder ? "Founder Takeover Mode" : isTechie ? `${currentUser.name} Tech Copilot` : `${currentUser.name} Copilot`}
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
                    : isTechie
                    ? [
                        "📋 Show my assigned tasks",
                        "🔧 Set my status to In Development",
                        "✍️ Help me write my daily tech update",
                        "⚠️ I have a blocker on my task",
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

              {/* Token counter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 14px", fontSize: "10.5px", color: userMsgCount >= 18 ? "oklch(0.55 0.22 25)" : "var(--muted-foreground)" }}>
                <span>{userMsgCount}/{MESSAGE_LIMIT} messages used</span>
                {userMsgCount >= 18 && <span style={{ fontWeight: 600 }}>⚠️ Session resets at 20</span>}
                <button
                  type="button"
                  onClick={() => { setMessages([]); setUserMsgCount(0); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "10.5px", fontWeight: 600 }}
                >
                  Reset session
                </button>
              </div>

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
