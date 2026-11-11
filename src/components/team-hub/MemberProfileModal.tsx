import { Mail, Phone, MessageSquare, Calendar, Award, Target, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, StatusPill, formatMoney } from "./shared";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile, Lead } from "@/lib/supabase/types";
import { getWorkingStatusConfig } from "./performance-constants";

interface MemberProfileModalProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openLead: (id: string) => void;
}

export function MemberProfileModal({
  user,
  open,
  onOpenChange,
  openLead,
}: MemberProfileModalProps) {
  if (!user) return null;

  const metrics = HubStore.getMemberPerformanceMetrics(user.id, "all");
  const leads = HubStore.getLeads().filter((l) => Boolean(l) && (l.ownerId === user.id || l.ownerName === user.name));
  const outreach = HubStore.getOutreach().filter((o) => Boolean(o) && (o.userId === user.id || o.userName === user.name));
  const dailyUpdates = HubStore.getDailyUpdates(user.id);
  const statusConfig = getWorkingStatusConfig(user.workingStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hub-dialog" style={{ maxWidth: "680px", maxHeight: "85vh", overflowY: "auto" }}>
        <DialogHeader>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "4px" }}>
            <Avatar initials={user.initials} color={user.color} size="lg" avatarUrl={user.avatarUrl} />
            <div>
              <DialogTitle style={{ fontSize: "18px", margin: 0 }}>{user.name}</DialogTitle>
              <DialogDescription style={{ margin: "2px 0 0" }}>
                {user.title} · {user.department} ({user.email})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Live Working Status Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: "8px",
            background: statusConfig.bgColor,
            border: "1px solid var(--border)",
            margin: "8px 0 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className="status-dot"
              style={{ background: statusConfig.dotColor, color: statusConfig.dotColor }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
              Current Status: {user.workingStatus || "Outreach"}
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            {statusConfig.description}
          </span>
        </div>

        {/* All-time Performance Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "18px" }}>
          <div className="daily-counter-card">
            <span className="counter-label">Leads Generated</span>
            <strong className="counter-val">{metrics.leadsGenerated}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Unique Contacted</span>
            <strong className="counter-val">{metrics.uniqueBusinessesContacted}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Outreach Attempts</span>
            <strong className="counter-val">{metrics.totalOutreachAttempts}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Responses</span>
            <strong className="counter-val">
              {metrics.responsesReceived}{" "}
              <small style={{ fontSize: "11px", fontWeight: 500, color: "oklch(0.5 0.15 150)" }}>
                ({metrics.responseRatePct}%)
              </small>
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Positive Responses</span>
            <strong className="counter-val">
              {metrics.positiveResponses}{" "}
              <small style={{ fontSize: "11px", fontWeight: 500, color: "oklch(0.5 0.15 150)" }}>
                ({metrics.positiveRatePct}%)
              </small>
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Meetings Booked</span>
            <strong className="counter-val" style={{ color: "var(--primary)" }}>
              {metrics.meetingsBooked}
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Deals Won</span>
            <strong className="counter-val" style={{ color: "oklch(0.5 0.18 150)" }}>
              {metrics.convertedWonLeads} ({formatMoney(metrics.wonValue)})
            </strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Lost Deals</span>
            <strong className="counter-val">{metrics.lostLeads}</strong>
          </div>
          <div className="daily-counter-card">
            <span className="counter-label">Follow-up Rate</span>
            <strong className="counter-val">{metrics.followupCompletionRatePct}%</strong>
          </div>
        </div>

        {/* Assigned Leads */}
        <div style={{ marginBottom: "18px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
            Assigned Leads ({leads.length})
          </h4>
          <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {leads.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>No leads currently assigned.</p>
            ) : (
              leads.map((l) => (
                <div
                  key={l.id}
                  onClick={() => {
                    onOpenChange(false);
                    openLead(l.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong>{l.name}</strong>
                    <span style={{ color: "var(--muted-foreground)" }}>({l.company})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StatusPill status={l.status} />
                    <span style={{ fontWeight: 600 }}>{formatMoney(Number(l.value) || 0)}</span>
                    <ChevronRight size={13} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Daily Updates */}
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
            Submitted Daily Updates ({dailyUpdates.length})
          </h4>
          <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {dailyUpdates.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>No daily updates submitted yet.</p>
            ) : (
              dailyUpdates.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "12px" }}>{u.date}</strong>
                    <span
                      className="working-status-pill"
                      style={{ padding: "1px 6px", fontSize: "10px" }}
                    >
                      {u.workingStatus}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0" }}>
                    <strong>Achievements:</strong> {u.achievements}
                  </p>
                  {u.challenges && (
                    <p style={{ margin: "2px 0", color: "var(--muted-foreground)" }}>
                      <strong>Challenges:</strong> {u.challenges}
                    </p>
                  )}
                  {u.tomorrowPriorities && (
                    <p style={{ margin: "2px 0", color: "var(--muted-foreground)" }}>
                      <strong>Priorities:</strong> {u.tomorrowPriorities}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

