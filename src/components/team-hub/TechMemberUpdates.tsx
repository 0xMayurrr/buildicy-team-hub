import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  AlertCircle,
  Calendar,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  Clock,
  Wrench,
  FolderKanban,
  User,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile, WorkingStatus, TechTask } from "@/lib/supabase/types";

const TECH_STATUSES: WorkingStatus[] = [
  "In Development",
  "In Review",
  "Testing",
  "Blocked",
  "Planning",
  "Deployment",
  "Break",
  "Offline",
];

const TECH_STATUS_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string }> = {
  "In Development": { label: "In Development", dotColor: "oklch(0.55 0.2 260)", bgColor: "oklch(0.95 0.04 260)" },
  "In Review":      { label: "In Review",      dotColor: "oklch(0.55 0.18 200)", bgColor: "oklch(0.95 0.04 200)" },
  "Testing":        { label: "Testing",         dotColor: "oklch(0.55 0.18 150)", bgColor: "oklch(0.95 0.04 150)" },
  "Blocked":        { label: "Blocked",         dotColor: "oklch(0.55 0.22 25)",  bgColor: "oklch(0.96 0.04 25)"  },
  "Planning":       { label: "Planning",        dotColor: "oklch(0.55 0.18 300)", bgColor: "oklch(0.95 0.04 300)" },
  "Deployment":     { label: "Deployment",      dotColor: "oklch(0.5 0.2 140)",   bgColor: "oklch(0.95 0.04 140)" },
  "Break":          { label: "Break",           dotColor: "oklch(0.6 0.08 60)",   bgColor: "oklch(0.97 0.02 60)"  },
  "Offline":        { label: "Offline",         dotColor: "oklch(0.6 0.0 0)",     bgColor: "oklch(0.96 0.0 0)"    },
};

interface Props {
  currentUser: UserProfile;
}

const TASK_STATUS_OPTIONS: TechTask["status"][] = ["Pending", "In Progress", "In Review", "Done", "Blocked"];

const TASK_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  Pending:      { color: "oklch(0.6 0.08 60)",   bg: "oklch(0.97 0.02 60)" },
  "In Progress":{ color: "oklch(0.55 0.2 260)",  bg: "oklch(0.95 0.04 260)" },
  "In Review":  { color: "oklch(0.55 0.18 200)", bg: "oklch(0.95 0.04 200)" },
  Done:         { color: "oklch(0.5 0.18 150)",  bg: "oklch(0.95 0.04 150)" },
  Blocked:      { color: "oklch(0.55 0.22 25)",  bg: "oklch(0.96 0.04 25)" },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  Low:    { color: "oklch(0.5 0.18 260)",  bg: "oklch(0.96 0.04 260)" },
  Medium: { color: "oklch(0.5 0.18 260)",  bg: "oklch(0.96 0.04 260)" },
  High:   { color: "oklch(0.5 0.18 45)",   bg: "oklch(0.96 0.04 45)" },
  Urgent: { color: "oklch(0.5 0.2 25)",    bg: "oklch(0.96 0.04 25)" },
};

export function AssignedProjectsSection({ currentUser }: { currentUser: UserProfile }) {
  const [, setVersion] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const [localNote, setLocalNote] = useState<Record<string, string>>({});
  const [localStatus, setLocalStatus] = useState<Record<string, TechTask["status"]>>({});

  const myTasks = HubStore.getTechTasks({ assignedTo: currentUser.id });

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("buildicy_storage_update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("buildicy_storage_update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleSaveTask = (task: TechTask) => {
    const status = localStatus[task.id] ?? task.status;
    const pct = localProgress[task.id] ?? task.progressPct;
    const note = localNote[task.id] ?? task.techieNote ?? "";
    HubStore.updateTechTaskStatus(task.id, status, pct, note);
    toast.success(`Task "${task.title}" updated!`);
  };

  if (myTasks.length === 0) {
    return (
      <section className="panel" style={{ padding: "22px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <FolderKanban size={18} style={{ color: "var(--primary)" }} />
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>My Assigned Projects & Tasks</h2>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", textAlign: "center", padding: "24px 0" }}>
          No tasks assigned yet. The founder will assign projects here — check back soon!
        </p>
      </section>
    );
  }

  const pending = myTasks.filter((t) => t.status !== "Done").length;
  const done = myTasks.filter((t) => t.status === "Done").length;
  const blocked = myTasks.filter((t) => t.status === "Blocked").length;

  return (
    <section className="panel" style={{ padding: "22px 24px", marginBottom: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FolderKanban size={18} style={{ color: "var(--primary)" }} />
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>My Assigned Projects & Tasks</h2>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "3px 0 0" }}>
              Tasks assigned to you by the founder. Update your progress and status here.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "oklch(0.95 0.04 260)", color: "oklch(0.45 0.2 260)", fontWeight: 700 }}>
            {pending} pending
          </span>
          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "oklch(0.95 0.04 150)", color: "oklch(0.4 0.18 150)", fontWeight: 700 }}>
            {done} done
          </span>
          {blocked > 0 && (
            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "oklch(0.96 0.04 25)", color: "oklch(0.5 0.22 25)", fontWeight: 700 }}>
              {blocked} blocked
            </span>
          )}
        </div>
      </div>

      {/* Task Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {myTasks.map((task) => {
          const isExpanded = expandedId === task.id;
          const status = localStatus[task.id] ?? task.status;
          const pct = localProgress[task.id] ?? task.progressPct;
          const note = localNote[task.id] ?? task.techieNote ?? "";
          const statusStyle = TASK_STATUS_STYLE[status] ?? TASK_STATUS_STYLE["Pending"]!;
          const priorityStyle = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE["Medium"]!;

          return (
            <div
              key={task.id}
              style={{
                borderRadius: "12px",
                border: `1px solid ${isExpanded ? "color-mix(in oklab, var(--primary) 35%, transparent)" : "var(--border)"}`,
                background: isExpanded ? "color-mix(in oklab, var(--primary) 3%, var(--card))" : "var(--card)",
                overflow: "hidden",
                transition: "all 0.15s ease",
              }}
            >
              {/* Card Header — always visible */}
              <div
                style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13.5px" }}>{task.title}</strong>
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: priorityStyle.bg, color: priorityStyle.color, fontWeight: 700 }}>
                      {task.priority}
                    </span>
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }}>
                      {status}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11.5px", color: "var(--muted-foreground)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={11} />
                      Assigned by <strong style={{ color: "var(--foreground)" }}>{task.assignedByName}</strong>
                    </span>
                    {task.dueDate && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} />
                        Due: <strong style={{ color: new Date(task.dueDate) < new Date() && status !== "Done" ? "oklch(0.55 0.22 25)" : "var(--foreground)" }}>{task.dueDate}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "16px", color: "var(--primary)", display: "block" }}>{pct}%</strong>
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>progress</span>
                  </div>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
              </div>

              {/* Progress bar — always visible */}
              <div style={{ height: "4px", background: "var(--muted)", margin: "0 16px 14px" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "oklch(0.5 0.18 150)" : "var(--primary)", borderRadius: "2px", transition: "width 0.2s" }} />
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  {/* Description */}
                  {task.description && (
                    <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "8px", background: "var(--muted)", fontSize: "12.5px", lineHeight: 1.5 }}>
                      <strong style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>DESCRIPTION</strong>
                      {task.description}
                    </div>
                  )}

                  {/* Reference doc */}
                  {task.documentUrl && (
                    <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid color-mix(in oklab, var(--primary) 25%, transparent)", background: "color-mix(in oklab, var(--primary) 5%, var(--card))" }}>
                      <FileText size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "block" }}>Reference Document</span>
                        <strong style={{ fontSize: "12px" }}>{task.documentName || task.documentUrl}</strong>
                      </div>
                      <a
                        href={task.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {/* Status update */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px", fontWeight: 600 }}>
                      Update Status
                      <select
                        value={status}
                        onChange={(e) => setLocalStatus((prev) => ({ ...prev, [task.id]: e.target.value as TechTask["status"] }))}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "12px" }}
                      >
                        {TASK_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px", fontWeight: 600 }}>
                      Progress: <strong style={{ color: "var(--primary)" }}>{pct}%</strong>
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={pct}
                        onChange={(e) => setLocalProgress((prev) => ({ ...prev, [task.id]: Number(e.target.value) }))}
                        style={{ accentColor: "var(--primary)", marginTop: "4px" }}
                      />
                    </label>
                  </div>

                  {/* Techie note */}
                  <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px", fontWeight: 600, marginBottom: "12px" }}>
                    Your Note / Update for Founder
                    <Input
                      placeholder="e.g. Auth flow done, working on payment integration next..."
                      value={note}
                      onChange={(e) => setLocalNote((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      style={{ height: "32px", fontSize: "12px" }}
                    />
                  </label>

                  <Button
                    className="primary-pill"
                    size="sm"
                    style={{ width: "100%" }}
                    onClick={() => handleSaveTask(task)}
                  >
                    Save Progress Update
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TechMemberUpdates({ currentUser }: Props) {
  const [workingStatus, setWorkingStatus] = useState<WorkingStatus>(
    currentUser.workingStatus || "In Development",
  );
  const [whatIWorkedOn, setWhatIWorkedOn] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [overallPct, setOverallPct] = useState(50);
  const [taskProgress, setTaskProgress] = useState<Record<string, { pct: number; note: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [, setVersion] = useState(0);

  const myTasks = HubStore.getTechTasks({ assignedTo: currentUser.id });
  const pastUpdates = HubStore.getTechDailyUpdates(currentUser.id);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("buildicy_storage_update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("buildicy_storage_update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleStatusChange = (st: WorkingStatus) => {
    setWorkingStatus(st);
    HubStore.updateUserWorkingStatus(currentUser.id, st);
    toast.success(`Status set to ${st}`);
  };

  const handleTaskPct = (taskId: string, pct: number) => {
    setTaskProgress((prev) => ({ ...prev, [taskId]: { pct, note: prev[taskId]?.note ?? "" } }));
  };

  const handleTaskNote = (taskId: string, note: string) => {
    setTaskProgress((prev) => ({ ...prev, [taskId]: { pct: prev[taskId]?.pct ?? 0, note } }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!whatIWorkedOn.trim()) {
      toast.error("Please describe what you worked on today.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Save per-task progress back to store
      myTasks.forEach((t) => {
        const tp = taskProgress[t.id];
        if (tp) {
          HubStore.updateTechTaskStatus(t.id, tp.pct >= 100 ? "Done" : t.status === "Pending" ? "In Progress" : t.status, tp.pct, tp.note);
        }
      });

      HubStore.submitTechDailyUpdate({
        userId: currentUser.id,
        userName: currentUser.name,
        userInitials: currentUser.initials,
        userColor: currentUser.color,
        date: new Date().toISOString().slice(0, 10),
        workingStatus,
        whatIWorkedOn: whatIWorkedOn.trim(),
        blockers: blockers.trim(),
        tomorrowPlan: tomorrowPlan.trim(),
        taskProgress: myTasks.map((t) => ({
          taskId: t.id,
          taskTitle: t.title,
          progressPct: taskProgress[t.id]?.pct ?? t.progressPct,
          note: taskProgress[t.id]?.note ?? t.techieNote ?? "",
        })),
        overallProgressPct: overallPct,
      });

      toast.success("Daily update submitted! Founder has been notified.");
      setWhatIWorkedOn("");
      setBlockers("");
      setTomorrowPlan("");
    } catch {
      toast.error("Failed to submit update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConf = TECH_STATUS_CONFIG[workingStatus] ?? TECH_STATUS_CONFIG["In Development"]!;

  return (
    <section className="panel" style={{ padding: "22px 24px", marginBottom: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>My Daily Tech Update</h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Report your progress, task completion and blockers to the founder.
          </p>
        </div>
        <span
          className="working-status-pill"
          style={{ background: statusConf.bgColor, borderColor: "transparent" }}
        >
          <span className="status-dot" style={{ background: statusConf.dotColor }} />
          {workingStatus}
        </span>
      </div>

      {/* Status Switcher */}
      <div className="working-status-bar" style={{ marginBottom: "20px" }}>
        <span className="label">Status:</span>
        {TECH_STATUSES.map((st) => {
          const conf = TECH_STATUS_CONFIG[st] ?? TECH_STATUS_CONFIG["In Development"]!;
          const active = workingStatus === st;
          return (
            <button
              key={st}
              type="button"
              className={`working-status-btn ${active ? "active" : ""}`}
              onClick={() => handleStatusChange(st)}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? "white" : conf.dotColor }} />
              {conf.label}
            </button>
          );
        })}
      </div>

      {/* Assigned Tasks Progress */}
      {myTasks.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Wrench size={14} style={{ color: "var(--primary)" }} />
            Task Progress Update
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {myTasks.map((task) => {
              const tp = taskProgress[task.id];
              const pct = tp?.pct ?? task.progressPct;
              const note = tp?.note ?? task.techieNote ?? "";
              return (
                <div
                  key={task.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>{task.title}</strong>
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "999px",
                          background: task.priority === "Urgent" ? "oklch(0.96 0.04 25)" : task.priority === "High" ? "oklch(0.96 0.04 45)" : "oklch(0.96 0.04 260)",
                          color: task.priority === "Urgent" ? "oklch(0.5 0.2 25)" : task.priority === "High" ? "oklch(0.5 0.18 45)" : "oklch(0.5 0.18 260)",
                          fontWeight: 600,
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>{pct}%</span>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0 0 8px" }}>{task.description}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={pct}
                      onChange={(e) => handleTaskPct(task.id, Number(e.target.value))}
                      style={{ flex: 1, accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontSize: "11px", minWidth: "32px", textAlign: "right", fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ width: "100%", height: "5px", background: "var(--muted)", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "oklch(0.5 0.18 150)" : "var(--primary)", borderRadius: "3px", transition: "width 0.2s" }} />
                  </div>
                  <Input
                    placeholder="Quick note on this task (optional)..."
                    value={note}
                    onChange={(e) => handleTaskNote(task.id, e.target.value)}
                    style={{ height: "30px", fontSize: "11.5px" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Progress */}
      <div style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "10px", background: "color-mix(in oklab, var(--primary) 6%, var(--card))", border: "1px solid color-mix(in oklab, var(--primary) 18%, transparent)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700 }}>Overall Day Progress</span>
          <strong style={{ fontSize: "18px", color: "var(--primary)" }}>{overallPct}%</strong>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={overallPct}
          onChange={(e) => setOverallPct(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--primary)" }}
        />
        <div style={{ width: "100%", height: "6px", background: "var(--muted)", borderRadius: "3px", overflow: "hidden", marginTop: "6px" }}>
          <div style={{ width: `${overallPct}%`, height: "100%", background: "var(--primary)", borderRadius: "3px", transition: "width 0.2s" }} />
        </div>
      </div>

      {/* Reflection Form */}
      <form onSubmit={handleSubmit} className="daily-reflection-form">
        <label>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={13} style={{ color: "var(--primary)" }} />
            What I worked on today
          </span>
          <Textarea
            required
            rows={2}
            placeholder="e.g. Completed the auth module, fixed 3 bugs in the dashboard, reviewed PR from teammate..."
            value={whatIWorkedOn}
            onChange={(e) => setWhatIWorkedOn(e.target.value)}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={13} style={{ color: "oklch(0.55 0.22 25)" }} />
              Blockers / Issues
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. Waiting for API keys, unclear requirements on payment flow..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </label>
          <label>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={13} style={{ color: "oklch(0.6 0.18 240)" }} />
              Tomorrow's Plan
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. Complete the checkout flow, write unit tests, deploy to staging..."
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: "var(--primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            <History size={14} />
            {showHistory ? "Hide History" : `Past Updates (${pastUpdates.length})`}
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <Button type="submit" className="primary-pill" disabled={isSubmitting}>
            <Send size={13} style={{ marginRight: "6px" }} />
            {isSubmitting ? "Submitting..." : "Submit Daily Update"}
          </Button>
        </div>
      </form>

      {/* History */}
      {showHistory && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Submission History</h3>
          {pastUpdates.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>No past updates yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pastUpdates.map((u) => (
                <div key={u.id} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600 }}>{u.date}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)" }}>{u.overallProgressPct}% overall</span>
                      <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "999px", background: (TECH_STATUS_CONFIG[u.workingStatus] ?? TECH_STATUS_CONFIG["In Development"]!).bgColor }}>
                        {u.workingStatus}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: "4px 0", color: "var(--foreground)" }}><strong>Worked on:</strong> {u.whatIWorkedOn}</p>
                  {u.blockers && <p style={{ margin: "4px 0", color: "var(--muted-foreground)" }}><strong>Blockers:</strong> {u.blockers}</p>}
                  {u.tomorrowPlan && <p style={{ margin: "4px 0", color: "var(--muted-foreground)" }}><strong>Tomorrow:</strong> {u.tomorrowPlan}</p>}
                  {u.taskProgress.length > 0 && (
                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {u.taskProgress.map((tp) => (
                        <span key={tp.taskId} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: "var(--muted)", fontWeight: 600 }}>
                          {tp.taskTitle}: {tp.progressPct}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
