import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  Target,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  Users,
  Award,
  BarChart3,
  Phone,
  Mail,
  MessageSquare,
  Sparkles,
  Clock,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle, MetricCard, Avatar, formatMoney } from "./shared";
import { HubStore } from "@/lib/supabase/store";
import type { Lead, UserProfile, MemberPerformanceMetrics } from "@/lib/supabase/types";
import {
  getWorkingStatusConfig,
  getLeadPotentialConfig,
  STAGE_PROBABILITIES,
} from "./performance-constants";

interface ReportsViewProps {
  leads: Lead[];
  openLead: (id: string) => void;
  currentUser: UserProfile;
}

type Timeframe = "today" | "week" | "month" | "all";

export function ReportsView({ leads, openLead, currentUser }: ReportsViewProps) {
  const isFounder = currentUser.role === "founder";
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  // For founder, can view "all" or specific member; for member, always locked to their own ID
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    isFounder ? "all" : currentUser.id,
  );

  const users = HubStore.getUsers() || [];
  const teamMembers = useMemo(() => users.filter((u) => u && u.role !== "founder"), [users]);

  // Team metrics (for founder view)
  const { metrics: allMetrics, totals } = useMemo(
    () => HubStore.getTeamPerformanceMetrics(timeframe),
    [timeframe],
  );

  // Single member metrics (for member view or single filtered member)
  const memberPersonalMetrics = useMemo(() => {
    return HubStore.getMemberPerformanceMetrics(
      isFounder && selectedMemberId !== "all" ? selectedMemberId : currentUser.id,
      timeframe,
    );
  }, [isFounder, selectedMemberId, currentUser.id, timeframe]);

  // Active stats for the 4 primary KPI cards
  const activeStats = useMemo(() => {
    if (isFounder && selectedMemberId === "all") {
      return {
        leads: Number(totals.leadsGenerated) || 0,
        uniqueContacted: Number(totals.uniqueBusinessesContacted) || 0,
        outreach: Number(totals.totalOutreachAttempts) || 0,
        emails: Number(totals.emailOutreach) || 0,
        whatsapp: Number(totals.whatsappOutreach) || 0,
        calls: Number(totals.callOutreach) || 0,
        responses: Number(totals.responsesReceived) || 0,
        positive: Number(totals.positiveResponses) || 0,
        meetings: Number(totals.meetingsBooked) || 0,
        proposals: Number(totals.proposalsRequested) || 0,
        won: Number(totals.convertedWonLeads) || 0,
        wonValue: Number(totals.wonValue) || 0,
        responseRate: Number(totals.avgResponseRatePct) || 0,
        meetingRate: Number(totals.avgMeetingRatePct) || 0,
      };
    }

    const single =
      isFounder && selectedMemberId !== "all"
        ? allMetrics.find((m) => m.userId === selectedMemberId) || memberPersonalMetrics
        : memberPersonalMetrics;

    return {
      leads: Number(single.leadsGenerated) || 0,
      uniqueContacted: Number(single.uniqueBusinessesContacted) || 0,
      outreach: Number(single.totalOutreachAttempts) || 0,
      emails: Number(single.emailOutreach) || 0,
      whatsapp: Number(single.whatsappOutreach) || 0,
      calls: Number(single.callOutreach) || 0,
      responses: Number(single.responsesReceived) || 0,
      positive: Number(single.positiveResponses) || 0,
      meetings: Number(single.meetingsBooked) || 0,
      proposals: Number(single.proposalsRequested) || 0,
      won: Number(single.convertedWonLeads) || 0,
      wonValue: Number(single.wonValue) || 0,
      responseRate: Number(single.responseRatePct) || 0,
      meetingRate: Number(single.meetingConversionRatePct) || 0,
    };
  }, [isFounder, selectedMemberId, totals, allMetrics, memberPersonalMetrics]);

  // Lead Conversion Funnel Data (Discovered -> Contacted -> Responses -> Meetings/Proposals -> Deals Won)
  const funnelSteps = useMemo(() => {
    const s1 = Math.max(activeStats.leads, activeStats.uniqueContacted, 0);
    const s2 = Math.max(activeStats.uniqueContacted, 0);
    const s3 = Math.max(activeStats.responses, 0);
    const s4 = Math.max(activeStats.meetings + activeStats.proposals, 0);
    const s5 = Math.max(activeStats.won, 0);

    return [
      { label: "1. Discovered Leads", count: s1, color: "oklch(0.65 0.15 280)" },
      { label: "2. Businesses Contacted", count: s2, color: "oklch(0.6 0.2 290)" },
      { label: "3. Responses Received", count: s3, color: "oklch(0.55 0.22 300)" },
      { label: "4. Meetings & Proposals", count: s4, color: "oklch(0.5 0.24 310)" },
      { label: "5. Deals Won", count: s5, color: "oklch(0.6 0.2 150)" },
    ];
  }, [activeStats]);

  const funnelMax = useMemo(() => {
    const counts = funnelSteps.map((s) => s.count);
    return Math.max(...counts, 1);
  }, [funnelSteps]);

  // Member's personal daily updates and assigned leads
  const memberPastUpdates = useMemo(() => {
    return HubStore.getDailyUpdates(currentUser.id);
  }, [currentUser.id]);

  const memberAssignedLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        Boolean(l) &&
        (l.ownerId === currentUser.id ||
          (l.ownerName || "").toLowerCase().includes((currentUser.name || "").toLowerCase())),
    );
  }, [leads, currentUser]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (isFounder) {
      const headers = [
        "Team Member",
        "Working Status",
        "Leads Generated",
        "Unique Contacted",
        "Outreach Attempts",
        "Emails",
        "WhatsApp",
        "Calls",
        "Responses",
        "Response Rate %",
        "Positive Responses",
        "Meetings Booked",
        "Proposals Requested",
        "Deals Won",
        "Won Value ($)",
        "Followup Completion %",
      ];

      const rows = allMetrics.map((m) => [
        `"${m.userName}"`,
        `"${m.workingStatus}"`,
        m.leadsGenerated,
        m.uniqueBusinessesContacted,
        m.totalOutreachAttempts,
        m.emailOutreach,
        m.whatsappOutreach,
        m.callOutreach,
        m.responsesReceived,
        `${m.responseRatePct}%`,
        m.positiveResponses,
        m.meetingsBooked,
        m.proposalsRequested,
        m.convertedWonLeads,
        m.wonValue,
        `${m.followupCompletionRatePct}%`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `buildicy_team_performance_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Team performance report downloaded as CSV");
    } else {
      // Member CSV export
      const headers = [
        "Metric",
        "Value",
        "Reporting Period",
      ];
      const rows = [
        ["Representative Name", `"${currentUser.name}"`, timeframe],
        ["Role & Title", `"${currentUser.title}"`, timeframe],
        ["Current Working Status", `"${currentUser.workingStatus || "Outreach"}"`, timeframe],
        ["Leads Generated", activeStats.leads, timeframe],
        ["Unique Contacted", activeStats.uniqueContacted, timeframe],
        ["Total Outreach Attempts", activeStats.outreach, timeframe],
        ["Email Touchpoints", activeStats.emails, timeframe],
        ["WhatsApp Touchpoints", activeStats.whatsapp, timeframe],
        ["Direct Calls", activeStats.calls, timeframe],
        ["Responses Received", activeStats.responses, timeframe],
        ["Response Rate", `${activeStats.responseRate}%`, timeframe],
        ["Positive Responses", activeStats.positive, timeframe],
        ["Meetings Booked", activeStats.meetings, timeframe],
        ["Meeting Conversion Rate", `${activeStats.meetingRate}%`, timeframe],
        ["Proposals Requested", activeStats.proposals, timeframe],
        ["Deals Won", activeStats.won, timeframe],
        ["Closed Revenue ($)", activeStats.wonValue, timeframe],
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `buildicy_${currentUser.name.toLowerCase().replace(/\s+/g, "_")}_report_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("My performance report downloaded as CSV");
    }
  };

  return (
    <>
      <PageTitle
        eyebrow={isFounder ? "Performance & Work Reporting" : `${currentUser.name}'s Reporting`}
        title={isFounder ? "Team Analytics & Reports" : "My Performance & Reports"}
        description={
          isFounder
            ? "Comprehensive daily, weekly and monthly performance reports across outreach, pipeline and conversion."
            : "Your personal daily, weekly and monthly outreach metrics, conversion funnel and closed revenue."
        }
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Timeframe Filter Buttons */}
            <div className="segmented" style={{ height: "36px" }}>
              <button
                className={timeframe === "today" ? "active" : ""}
                onClick={() => setTimeframe("today")}
              >
                Daily
              </button>
              <button
                className={timeframe === "week" ? "active" : ""}
                onClick={() => setTimeframe("week")}
              >
                Weekly
              </button>
              <button
                className={timeframe === "month" ? "active" : ""}
                onClick={() => setTimeframe("month")}
              >
                Monthly
              </button>
              <button
                className={timeframe === "all" ? "active" : ""}
                onClick={() => setTimeframe("all")}
              >
                All Time
              </button>
            </div>

            {/* Member selector for Founder only */}
            {isFounder && (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  padding: "0 10px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                <option value="all">All Team Members</option>
                {teamMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.title})
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="desktop-only"
              style={{ height: "36px" }}
            >
              <Download style={{ width: "13px", height: "13px", marginRight: "6px" }} />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label={isFounder && selectedMemberId === "all" ? "Total Outreach" : "My Outreach"}
          value={String(activeStats.outreach)}
          change={`${activeStats.emails} Mail · ${activeStats.whatsapp} WA · ${activeStats.calls} Calls`}
          footnote={`${activeStats.uniqueContacted} distinct businesses`}
          icon={<MessageCircle />}
        />
        <MetricCard
          label="Response Rate"
          value={`${activeStats.responseRate}%`}
          change={`${activeStats.responses} replies`}
          footnote={`${activeStats.positive} positive responses`}
          icon={<TrendingUp />}
        />
        <MetricCard
          label="Meeting Conversion"
          value={`${activeStats.meetingRate}%`}
          change={`${activeStats.meetings} meetings booked`}
          footnote={`${activeStats.proposals} proposals requested`}
          icon={<Calendar />}
        />
        <MetricCard
          label="Revenue Closed"
          value={formatMoney(activeStats.wonValue)}
          change={`${activeStats.won} deals won`}
          footnote="Live closed pipeline"
          icon={<Award />}
        />
      </div>

      {/* Charts & Funnel Grid */}
      <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
        {/* Lead Conversion Funnel */}
        <section className="panel" style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                {isFounder && selectedMemberId === "all" ? "Team Conversion Funnel" : "My Conversion Funnel"}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                Step-by-step conversion progression for{" "}
                {timeframe === "today"
                  ? "today"
                  : timeframe === "week"
                  ? "this week"
                  : timeframe === "month"
                  ? "this month"
                  : "all time"}
                .
              </p>
            </div>
          </div>

          <div className="funnel-container">
            {funnelSteps.map((step, idx) => {
              const safeCount = Number(step.count) || 0;
              const pct = funnelMax > 0 ? Math.max(12, Math.round((safeCount / funnelMax) * 100)) : 12;
              const prevCount = idx > 0 && funnelSteps[idx - 1] ? Number(funnelSteps[idx - 1]!.count) || 0 : safeCount;
              const conversionFromPrev = prevCount > 0 ? Math.round((safeCount / prevCount) * 100) : 0;
              return (
                <div key={step.label} className="funnel-step">
                  <span className="funnel-step-label">{step.label}</span>
                  <div className="funnel-bar-track">
                    <div
                      className="funnel-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: step.color,
                      }}
                    >
                      <span>{safeCount}</span>
                    </div>
                  </div>
                  <span className="funnel-step-rate">
                    {idx === 0 ? "100%" : `${conversionFromPrev}% conv`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Outreach Channel Distribution */}
        <section className="panel" style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                {isFounder && selectedMemberId === "all" ? "Team Outreach Channels" : "My Outreach Channels"}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                Distribution of touchpoints across communication channels.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
            {[
              { name: "Email", count: activeStats.emails, icon: Mail, color: "oklch(0.55 0.22 290)" },
              {
                name: "WhatsApp",
                count: activeStats.whatsapp,
                icon: MessageSquare,
                color: "oklch(0.65 0.2 150)",
              },
              { name: "Direct Calls", count: activeStats.calls, icon: Phone, color: "oklch(0.6 0.2 40)" },
              {
                name: "Meetings Booked",
                count: activeStats.meetings,
                icon: Calendar,
                color: "oklch(0.6 0.22 330)",
              },
            ].map((ch) => {
              const Icon = ch.icon;
              const totalAttempts = Math.max(activeStats.outreach, 1);
              const countNum = Number(ch.count) || 0;
              const pct = Math.round((countNum / totalAttempts) * 100);
              return (
                <div
                  key={ch.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
                    <span style={{ color: ch.color }}>
                      <Icon size={16} />
                    </span>
                    <strong style={{ fontSize: "12px" }}>{ch.name}</strong>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: "8px",
                      background: "var(--muted)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: ch.color,
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      minWidth: "70px",
                      textAlign: "right",
                    }}
                  >
                    {countNum}{" "}
                    <small style={{ color: "var(--muted-foreground)" }}>({pct}%)</small>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* FOUNDER VIEW: Team Member Comparison Table */}
      {isFounder && (
        <section className="panel" style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Team Member Comparison</h3>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                Side-by-side performance breakdown across marketing representatives for {timeframe === "today" ? "today" : timeframe === "week" ? "this week" : timeframe === "month" ? "this month" : "all time"}.
              </p>
            </div>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Working Status</th>
                  <th>Leads Generated</th>
                  <th>Unique Contacted</th>
                  <th>Outreach Attempts</th>
                  <th>Responses (Rate)</th>
                  <th>Positive Replies</th>
                  <th>Meetings Booked</th>
                  <th>Deals Won</th>
                  <th>Closed Revenue</th>
                  <th>Follow-up Completion</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((m) => {
                  const statusConf = getWorkingStatusConfig(m.workingStatus);
                  return (
                    <tr key={m.userId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar
                            initials={m.userInitials}
                            color={m.userColor}
                            avatarUrl={users.find((u) => u.id === m.userId)?.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <strong>{m.userName}</strong>
                            <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                              {m.userTitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="working-status-pill"
                          style={{
                            background: statusConf.bgColor,
                            borderColor: "transparent",
                            fontSize: "10px",
                          }}
                        >
                          <span
                            className="status-dot"
                            style={{ background: statusConf.dotColor, color: statusConf.dotColor }}
                          />
                          {m.workingStatus}
                        </span>
                      </td>
                      <td>
                        <strong>{m.leadsGenerated}</strong>
                      </td>
                      <td>{m.uniqueBusinessesContacted}</td>
                      <td>
                        <span>{m.totalOutreachAttempts}</span>
                        <small
                          style={{
                            display: "block",
                            fontSize: "10px",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {m.emailOutreach}E · {m.whatsappOutreach}W · {m.callOutreach}C
                        </small>
                      </td>
                      <td>
                        <strong>{m.responsesReceived}</strong> ({m.responseRatePct}%)
                      </td>
                      <td>
                        <span style={{ color: "oklch(0.4 0.15 145)", fontWeight: 600 }}>
                          {m.positiveResponses} ({m.positiveRatePct}%)
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--primary)" }}>{m.meetingsBooked}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "oklch(0.45 0.18 150)" }}>{m.convertedWonLeads}</strong>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                        {formatMoney(m.wonValue)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{m.followupCompletionRatePct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MEMBER VIEW: Personal Work Submissions & Assigned Leads Pipeline */}
      {!isFounder && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {/* 1. Member's Daily Work Updates Submissions */}
          <section className="panel" style={{ padding: "20px 24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                  My Daily Work Submissions ({memberPastUpdates.length})
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                  Your submitted daily accomplishments, working status logs and tomorrow's priorities.
                </p>
              </div>
            </div>

            {memberPastUpdates.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted-foreground)",
                  padding: "16px 0",
                  textAlign: "center",
                }}
              >
                No daily updates submitted yet. Use "My workspace" to submit today's work reflection!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {memberPastUpdates.map((u) => {
                  const statusConf = getWorkingStatusConfig(u.workingStatus);
                  return (
                    <div
                      key={u.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--background)",
                        fontSize: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{u.date}</span>
                        <span
                          className="working-status-pill"
                          style={{
                            padding: "2px 8px",
                            fontSize: "11px",
                            background: statusConf.bgColor,
                          }}
                        >
                          <span
                            className="status-dot"
                            style={{ background: statusConf.dotColor, color: statusConf.dotColor }}
                          />
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
                          <strong>Tomorrow's Priorities:</strong> {u.tomorrowPriorities}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: "14px",
                          marginTop: "10px",
                          fontSize: "11px",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        <span>Outreach: {u.totalOutreachCount}</span>
                        <span>Responses: {u.responsesReceivedCount}</span>
                        <span>Meetings: {u.meetingsBookedCount}</span>
                        <span>Follow-ups: {u.completedFollowupsCount} completed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Member's Assigned Leads & Stage Probability */}
          <section className="panel" style={{ padding: "20px 24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                  My Assigned Leads Pipeline ({memberAssignedLeads.length})
                </h3>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                  Status, quality potential, estimated closing probability and next follow-up dates.
                </p>
              </div>
            </div>

            {memberAssignedLeads.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted-foreground)",
                  padding: "16px 0",
                  textAlign: "center",
                }}
              >
                No leads assigned to you yet. Discover or create a new lead to start your pipeline!
              </p>
            ) : (
              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Prospect Company</th>
                      <th>Quality Potential</th>
                      <th>Stage</th>
                      <th>Deal Value</th>
                      <th>Stage Probability</th>
                      <th>Next Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberAssignedLeads.map((l) => {
                      const potConf = getLeadPotentialConfig(l.qualityPotential);
                      const stageProb = STAGE_PROBABILITIES[l.status] || { probability: 10, label: "Initial" };
                      return (
                        <tr
                          key={l.id}
                          onClick={() => openLead(l.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <strong>{l.name}</strong>
                            <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                              {l.company}
                            </div>
                          </td>
                          <td>
                            <span className={potConf.className} style={{ fontSize: "10px" }}>
                              {l.qualityPotential || "Medium potential"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{l.status}</span>
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                            {formatMoney(Number(l.value) || 0)}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "30px" }}>
                                {stageProb.probability}%
                              </span>
                              <div
                                style={{
                                  width: "60px",
                                  height: "6px",
                                  background: "var(--muted)",
                                  borderRadius: "3px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${stageProb.probability}%`,
                                    height: "100%",
                                    background: "var(--primary)",
                                    borderRadius: "3px",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "11px",
                                color: l.nextFollowupDate ? "var(--foreground)" : "var(--muted-foreground)",
                              }}
                            >
                              {l.nextFollowupDate || "None scheduled"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
