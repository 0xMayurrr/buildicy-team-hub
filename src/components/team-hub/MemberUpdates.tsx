import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Calendar,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile, WorkingStatus, DailyWorkUpdate } from "@/lib/supabase/types";
import { WORKING_STATUS_CONFIG, getWorkingStatusConfig } from "./performance-constants";

interface MemberUpdatesProps {
  currentUser: UserProfile;
}

const ALL_STATUSES: WorkingStatus[] = [
  "Researching",
  "Outreach",
  "Follow-ups",
  "Meetings",
  "Proposal Preparation",
  "Other",
  "Break",
  "Offline",
];

export function MemberUpdates({ currentUser }: MemberUpdatesProps) {
  const [workingStatus, setWorkingStatus] = useState<WorkingStatus>(
    currentUser.workingStatus || "Outreach",
  );
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [tomorrowPriorities, setTomorrowPriorities] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-calculated live statistics for today (Requirement 6: No manual entry of existing numbers!)
  const todayMetrics = HubStore.getMemberPerformanceMetrics(currentUser.id, "today");
  const pastUpdates = HubStore.getDailyUpdates(currentUser.id);

  const handleStatusChange = (newStatus: WorkingStatus) => {
    setWorkingStatus(newStatus);
    HubStore.updateUserWorkingStatus(currentUser.id, newStatus);
    toast.success(`Working status set to ${newStatus}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!achievements.trim()) {
      toast.error("Please add at least one daily achievement or note before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      HubStore.submitDailyUpdate({
        userId: currentUser.id,
        userName: currentUser.name,
        userInitials: currentUser.initials,
        userColor: currentUser.color,
        date: new Date().toISOString().slice(0, 10),
        workingStatus,
        newLeadsCount: todayMetrics.leadsGenerated,
        emailOutreachCount: todayMetrics.emailOutreach,
        whatsappOutreachCount: todayMetrics.whatsappOutreach,
        callOutreachCount: todayMetrics.callOutreach,
        totalOutreachCount: todayMetrics.totalOutreachAttempts,
        responsesReceivedCount: todayMetrics.responsesReceived,
        positiveResponsesCount: todayMetrics.positiveResponses,
        meetingsBookedCount: todayMetrics.meetingsBooked,
        proposalsRequestedCount: todayMetrics.proposalsRequested,
        completedFollowupsCount: todayMetrics.completedFollowups,
        pendingFollowupsCount: todayMetrics.pendingFollowups,
        achievements: achievements.trim(),
        challenges: challenges.trim(),
        tomorrowPriorities: tomorrowPriorities.trim(),
      });

      toast.success("Daily work update submitted successfully! Founder notified.");
      setAchievements("");
      setChallenges("");
      setTomorrowPriorities("");
    } catch {
      toast.error("Failed to submit daily update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel" style={{ padding: "22px 24px", marginBottom: "24px" }}>
      {/* 1. Working Status Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>My Daily Work & Reporting</h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Real-time status tracking & automatic end-of-day progress logs.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600 }}>Current Status:</span>
          <span
            className="working-status-pill"
            style={{
              background: WORKING_STATUS_CONFIG[workingStatus].bgColor,
              borderColor: "transparent",
            }}
          >
            <span
              className="status-dot"
              style={{
                background: WORKING_STATUS_CONFIG[workingStatus].dotColor,
                color: WORKING_STATUS_CONFIG[workingStatus].dotColor,
              }}
            />
            {workingStatus}
          </span>
        </div>
      </div>

      {/* Status Buttons Grid */}
      <div className="working-status-bar">
        <span className="label">Update Status:</span>
        {ALL_STATUSES.map((st) => {
          const config = WORKING_STATUS_CONFIG[st];
          const active = workingStatus === st;
          return (
            <button
              type="button"
              key={st}
              className={`working-status-btn ${active ? "active" : ""}`}
              onClick={() => handleStatusChange(st)}
              title={config.description}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: active ? "white" : config.dotColor,
                }}
              />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* 2. Today's Auto-Aggregated Counters (Zero duplicate manual entry) */}
      <div style={{ margin: "16px 0 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>
            Today's Activity Metrics (Calculated Live)
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            Auto-derived from logged outreach & leads
          </span>
        </div>

        <div className="daily-counters-grid">
          <div className="daily-counter-card">
            <span className="counter-label">New Leads</span>
            <strong className="counter-val">{todayMetrics.leadsGenerated}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Email Outreach</span>
            <strong className="counter-val">{todayMetrics.emailOutreach}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">WhatsApp Outreach</span>
            <strong className="counter-val">{todayMetrics.whatsappOutreach}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Calls Conducted</span>
            <strong className="counter-val">{todayMetrics.callOutreach}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Responses</span>
            <strong className="counter-val">
              {todayMetrics.responsesReceived}{" "}
              <small style={{ fontSize: "11px", fontWeight: "normal", color: "oklch(0.5 0.15 150)" }}>
                ({todayMetrics.positiveResponses} pos)
              </small>
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Meetings Booked</span>
            <strong className="counter-val" style={{ color: "var(--primary)" }}>
              {todayMetrics.meetingsBooked}
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Pending Follow-ups</span>
            <strong className="counter-val">{todayMetrics.pendingFollowups}</strong>
          </div>
        </div>
      </div>

      {/* 3. Daily Reflection Form */}
      <form onSubmit={handleSubmit} className="daily-reflection-form">
        <label>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={13} style={{ color: "var(--primary)" }} />
            Daily Achievements & Progress Summary
          </span>
          <Textarea
            required
            rows={2}
            placeholder="e.g. Conducted 14 outreach emails, booked 2 intro calls with prospective clients, closed qualified lead."
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={13} style={{ color: "oklch(0.65 0.18 45)" }} />
              Challenges / Blockers Faced
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. High gatekeeper rejection on cold calls; need updated LinkedIn Sales Nav lead list."
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
            />
          </label>

          <label>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={13} style={{ color: "oklch(0.6 0.18 240)" }} />
              Tomorrow's Top Priorities
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. Follow up on 6 warm leads; send 2 proposals; prepare discovery meeting slide deck."
              value={tomorrowPriorities}
              onChange={(e) => setTomorrowPriorities(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "none",
              color: "var(--primary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <History size={14} />
            {showHistory ? "Hide Past Updates" : `Past Submissions (${pastUpdates.length})`}
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <Button type="submit" className="primary-pill" disabled={isSubmitting}>
            <Send size={13} style={{ marginRight: "6px" }} />
            {isSubmitting ? "Submitting..." : "Submit Today's Update"}
          </Button>
        </div>
      </form>

      {/* 4. Past Submissions History */}
      {showHistory && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Submission History</h3>
          {pastUpdates.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              No previous daily updates submitted yet. Today's submission will appear here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pastUpdates.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600 }}>{u.date}</span>
                    <span
                      className="working-status-pill"
                      style={{
                        padding: "1px 6px",
                        fontSize: "10px",
                        background: getWorkingStatusConfig(u.workingStatus).bgColor,
                      }}
                    >
                      {u.workingStatus}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0", color: "var(--foreground)" }}>
                    <strong>Achievements:</strong> {u.achievements}
                  </p>
                  {u.challenges && (
                    <p style={{ margin: "4px 0", color: "var(--muted-foreground)" }}>
                      <strong>Challenges:</strong> {u.challenges}
                    </p>
                  )}
                  {u.tomorrowPriorities && (
                    <p style={{ margin: "4px 0", color: "var(--muted-foreground)" }}>
                      <strong>Priorities:</strong> {u.tomorrowPriorities}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                    <span>Outreach: {u.totalOutreachCount}</span>
                    <span>Responses: {u.responsesReceivedCount}</span>
                    <span>Meetings: {u.meetingsBookedCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

