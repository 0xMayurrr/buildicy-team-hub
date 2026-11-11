import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Hash,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  BarChart3,
  Calendar,
  AlertCircle,
  Clock,
  Award,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, FollowUp, MetricCard, PageTitle, SectionHeading, StatusPill, formatMoney } from "./shared";
export { formatMoney };
import { LoginPage } from "./LoginPage";
import { HubStore, useHubState } from "@/lib/supabase/store";
import type { Lead, LeadStatus, LeadPotential, UserProfile, ChatMessage, LeadDiscussion } from "@/lib/supabase/types";
import { ReportsView } from "./ReportsView";
import { OutreachDialog } from "./OutreachDialog";
import { MemberUpdates } from "./MemberUpdates";
import { MemberProfileModal } from "./MemberProfileModal";
import { TeamChat } from "./TeamChat";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { GeminiAgent } from "./GeminiAgent";
import { CookieBanner } from "./CookieBanner";
import {
  WORKING_STATUS_CONFIG,
  LEAD_POTENTIAL_CONFIG,
  STAGE_PROBABILITIES,
  getWorkingStatusConfig,
  getLeadPotentialConfig,
} from "./performance-constants";

export type View = "founder" | "member" | "leads" | "lead" | "reports" | "chat" | "notifications" | "team";
const statuses: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export function TeamHubApp() {
  const [mounted, setMounted] = useState(false);
  const { currentUser, users, leads, activities, notifications, unreadCount } = useHubState();
  const [view, setView] = useState<View>("member");
  const [selectedId, setSelectedId] = useState<string>("");
  const [mobileNav, setMobileNav] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // Compulsory avatar selection on first login / onboarding (strictly for team members, founder is exempt)
  const isAvatarCompulsory = Boolean(currentUser && currentUser.role !== "founder" && !currentUser.avatarChosen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "founder") {
        setView((prev) => (prev === "member" ? "founder" : prev));
      } else {
        // Enforce RBAC: Team members cannot view founder or team views
        setView((prev) => (prev === "founder" || prev === "team" ? "member" : prev));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (leads.length > 0 && leads[0] && !selectedId) {
      setSelectedId(leads[0].id);
    }
  }, [leads, selectedId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matchedLeads = leads
      .filter((l) => `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map((l) => ({ type: "lead" as const, id: l.id, label: l.name, sub: `${l.company} · ${l.status}` }));
    const matchedUsers = users
      .filter((u) => `${u.name} ${u.email} ${u.title}`.toLowerCase().includes(q))
      .slice(0, 2)
      .map((u) => ({ type: "user" as const, id: u.id, label: u.name, sub: u.title }));
    return [...matchedLeads, ...matchedUsers];
  }, [searchQuery, leads, users]);

  // SSR hydration placeholder — prevents hydration mismatch between server and client
  if (!mounted) {
    return (
      <div className="login-minimal-shell">
        <div className="login-ambient-glow" />
        <div className="login-minimal-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="login-minimal-brand">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
              <img
                src="/buildicy-logo.png"
                alt="Buildicy Logo"
                style={{ maxHeight: "50px", width: "auto", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/buildicy-mark.png";
                }}
              />
            </div>
            <span className="brand-subtitle">Team Hub · Internal Workspace</span>
          </div>
          <div className="loading-spinner-row" style={{ justifyContent: "center", marginTop: "24px" }}>
            <span className="spinner-dot" />
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Connecting workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render login page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setView(user.role === "founder" ? "founder" : "member");
        }}
      />
    );
  }

  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];

  const go = (next: View) => {
    if (currentUser.role === "founder" && next === "member") {
      setView("founder");
    } else if (currentUser.role === "member" && (next === "founder" || next === "team")) {
      setView("member");
    } else {
      setView(next);
    }
    setMobileNav(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  };

  const openLead = (id: string) => {
    setSelectedId(id);
    go("lead");
  };

  const handleLogout = () => {
    HubStore.logout();
    toast.info("Signed out successfully.");
  };

  // Role-based navigation items
  const nav = [
    ...(currentUser.role === "founder"
      ? [
          { id: "founder" as View, label: "Founder overview", icon: LayoutDashboard },
          { id: "leads" as View, label: "All leads", icon: Target, count: leads.length },
          { id: "reports" as View, label: "Reports & KPIs", icon: BarChart3 },
          { id: "chat" as View, label: "Team chat", icon: MessageCircle },
          { id: "notifications" as View, label: "Notifications", icon: Bell, count: unreadCount > 0 ? unreadCount : undefined },
          { id: "team" as View, label: "Team management", icon: Users },
        ]
      : [
          { id: "member" as View, label: "My workspace", icon: BriefcaseBusiness },
          {
            id: "leads" as View,
            label: "My leads",
            icon: Target,
            count: leads.filter((l) => Boolean(l) && (l.ownerId === currentUser.id || (l.ownerName || "").toLowerCase().includes((currentUser.name || "").toLowerCase()))).length,
          },
          { id: "reports" as View, label: "My reports", icon: BarChart3 },
          { id: "chat" as View, label: "Team chat", icon: MessageCircle },
          { id: "notifications" as View, label: "Notifications", icon: Bell, count: unreadCount > 0 ? unreadCount : undefined },
        ]),
  ];

  return (
    <div className="hub-shell">
      <aside className={`hub-sidebar ${mobileNav ? "is-open" : ""}`} data-sidebar>
        <div className="brand-row">
          <Brand />
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <div className="welcome-copy">
          <p>Good morning,</p>
          <h2>{currentUser.name} 👋</h2>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "oklch(0.6 0.18 150)" }}></span>
            {currentUser.role === "founder" ? "Founder & CEO" : `${currentUser.title} (${currentUser.department})`}
          </span>
        </div>
        <nav className="hub-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon, ...item }) => (
            <button
              key={id}
              className={view === id || (id === "leads" && view === "lead") ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon />
              <span>{label}</span>
              {"count" in item && item.count !== undefined && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-team">
          <div className="avatar-stack">
            {users
              .filter((m) => m.role !== "founder")
              .map((m) => (
                <Avatar key={m.id || m.email} initials={m.initials} color={m.color} avatarUrl={m.avatarUrl} />
              ))}
          </div>
          <div className="mini-chat">
            <div className="mini-chat-head">
              <strong>Team Chat</strong>
              <span>Real-time</span>
            </div>
            <p className="mini-bubble">Collaborate via custom channels & direct messages</p>
            <button onClick={() => go("chat")}>
              Open team chat <Send />
            </button>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="hub-main">
        <header className="hub-topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="global-search-wrap">
            <label className="global-search">
              <Search />
              <input
                placeholder="Search leads, people, conversations…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
              <kbd>⌘K</kbd>
            </label>
            {searchOpen && searchResults.length > 0 && (
              <div className="global-search-results">
                {searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    className="global-search-item"
                    onClick={() => {
                      if (item.type === "lead") {
                        openLead(item.id);
                      } else {
                        go("chat");
                      }
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.sub}</small>
                    </div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="round-action"
              onClick={() => go("notifications")}
              aria-label="Notifications"
            >
              <Bell />
              {unreadCount > 0 && <i />}
            </button>
            <button className="round-action desktop-only" aria-label="Settings">
              <Settings />
            </button>
            <Button className="primary-pill desktop-only" onClick={() => setAddOpen(true)}>
              <Plus />
              New lead
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="profile-button">
                {currentUser.role === "founder" ? (
                  <span className="avatar avatar-founder" title="Heyy Founder · CEO">
                    HF
                  </span>
                ) : (
                  <Avatar initials={currentUser.initials} color={currentUser.color} avatarUrl={currentUser.avatarUrl} />
                )}
                <span>
                  <strong>{currentUser.name}</strong>
                  <small>{currentUser.role === "founder" ? "Founder & CEO" : currentUser.title}</small>
                </span>
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>{currentUser.name}</div>
                  <div style={{ fontSize: "11px", fontWeight: "normal", color: "var(--muted-foreground)" }}>
                    {currentUser.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role !== "founder" && (
                  <>
                    <DropdownMenuItem onClick={() => setAvatarPickerOpen(true)}>
                      <Users style={{ width: "14px", height: "14px", marginRight: "6px", color: "var(--primary)" }} />
                      Change avatar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {currentUser.role === "founder" && (
                  <>
                    <DropdownMenuItem onClick={() => go("founder")}>Founder overview</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go("reports")}>Reports & KPIs</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go("leads")}>All leads</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go("team")}>Team management</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm("Reset workspace to completely clean fresh slate (0 leads, 0 mock data)?")) {
                          HubStore.resetToCleanSlate();
                          toast.success("Workspace reset to 100% clean fresh slate!");
                        }
                      }}
                      style={{ color: "oklch(0.65 0.2 25)" }}
                    >
                      <Trash2 style={{ width: "14px", height: "14px", marginRight: "6px" }} />
                      Reset to Clean Workspace
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {currentUser.role === "member" && (
                  <>
                    <DropdownMenuItem onClick={() => go("member")}>My workspace</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go("leads")}>My leads</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go("reports")}>Reports & KPIs</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut style={{ width: "14px", height: "14px", marginRight: "6px" }} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="hub-canvas">
          {view === "founder" && currentUser.role === "founder" && (
            <FounderDashboard leads={leads} openLead={openLead} go={go} />
          )}
          {view === "member" && (
            <MemberDashboard
              leads={leads}
              openLead={openLead}
              currentUser={currentUser}
            />
          )}
          {view === "leads" && (
            <LeadsView
              leads={leads}
              openLead={openLead}
              openAdd={() => setAddOpen(true)}
              currentUser={currentUser}
            />
          )}
          {view === "reports" && (
            <ReportsView
              leads={leads}
              openLead={openLead}
              currentUser={currentUser}
            />
          )}
          {view === "lead" && selected ? (
            <LeadDetail
              lead={selected}
              back={() => go("leads")}
              currentUser={currentUser}
              users={users}
            />
          ) : view === "lead" ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ color: "var(--muted-foreground)", marginBottom: "16px" }}>No lead selected or lead was removed.</p>
              <Button onClick={() => go("leads")} className="primary-pill">
                Go to leads
              </Button>
            </div>
          ) : null}
          {view === "chat" && <TeamChat currentUser={currentUser} users={users} />}
          {view === "notifications" && (
            <Notifications openLead={openLead} notifications={notifications} />
          )}
          {view === "team" && currentUser.role === "founder" && (
            <TeamManagement users={users} />
          )}
        </div>
      </main>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        currentUser={currentUser}
        users={users}
        onAdd={(lead) => {
          setSelectedId(lead.id);
          go("leads");
          toast.success(`${lead.name} was created & assigned to ${lead.ownerName}`);
        }}
      />

      {mounted && currentUser && currentUser.role !== "founder" && (
        <AvatarPickerModal
          open={isAvatarCompulsory || avatarPickerOpen}
          currentUser={currentUser}
          isCompulsory={isAvatarCompulsory}
          onClose={() => setAvatarPickerOpen(false)}
          onSelectSuccess={() => setAvatarPickerOpen(false)}
        />
      )}

      {/* Gemini AI Agent */}
      {mounted && currentUser && (
        <GeminiAgent currentUser={currentUser} onOpenLead={openLead} onNavigate={go} />
      )}

      {/* Cookie consent */}
      {mounted && <CookieBanner />}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <img
        src="/logo.png"
        alt="Buildicy"
        className="brand-logo-img"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/buildicy-mark.png";
        }}
      />
      <span className="brand-text">
        <strong>Buildicy</strong>
        <small>Team Hub</small>
      </span>
    </div>
  );
}

function FounderDashboard({
  leads,
  openLead,
  go,
}: {
  leads: Lead[];
  openLead: (id: string) => void;
  go: (v: View) => void;
}) {
  const [range, setRange] = useState("week");
  const [inspectedMember, setInspectedMember] = useState<UserProfile | null>(null);
  const activities = HubStore.getActivities();
  const users = HubStore.getUsers();

  const totalValue = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const activeLeads = leads.filter((l) => !["Won", "Lost"].includes(l.status)).length;
  const wonLeads = leads.filter((l) => l.status === "Won").length;
  const lostLeads = leads.filter((l) => l.status === "Lost").length;
  const conversionRate = leads.length > 0 ? ((wonLeads / leads.length) * 100).toFixed(1) : "0.0";

  // Group activities dynamically by weekday (Mon=0 .. Sun=6)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDayIdx = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6

  const weekCounts = [0, 0, 0, 0, 0, 0, 0];
  activities.forEach((act) => {
    try {
      const d = act.createdAt ? new Date(act.createdAt) : new Date();
      const idx = (d.getDay() + 6) % 7;
      weekCounts[idx] = (weekCounts[idx] || 0) + 1;
    } catch {}
  });

  const maxActivity = Math.max(...weekCounts, 1);
  const totalTouchpoints = activities.length;

  return (
    <>
      <PageTitle
        eyebrow="Wednesday, 11 November"
        title="Team performance"
        description="A calm overview of your pipeline, people and priorities."
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" onClick={() => go("reports")}>
              <BarChart3 style={{ width: "14px", height: "14px", marginRight: "6px" }} />
              Reports & KPIs
            </Button>
            <Button className="primary-pill" onClick={() => go("leads")}>
              View pipeline
            </Button>
          </div>
        }
      />
      <div className="metrics-grid">
        <MetricCard
          label="Total pipeline"
          value={formatMoney(totalValue)}
          change="Real-time"
          footnote={`From ${leads.length} total deals`}
          icon={<TrendingUp />}
        />
        <MetricCard
          label="Active leads"
          value={String(activeLeads)}
          change={`${leads.length} total`}
          footnote={`${wonLeads} won · ${lostLeads} lost`}
          icon={<Target />}
        />
        <MetricCard
          label="Conversion rate"
          value={`${conversionRate}%`}
          change={`${wonLeads} closed`}
          footnote="Lead to customer"
          icon={<CalendarClock />}
        />
        <MetricCard
          label="Team touchpoints"
          value={String(totalTouchpoints)}
          change="Live activity"
          footnote="Logged activities & notes"
          icon={<MessageCircle />}
        />
      </div>

      {/* Enhanced Member Performance Section */}
      <section className="panel" style={{ padding: "20px 24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Team Member Performance & Live Status</h2>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
              Live tracking of outreach attempts, response rates, meetings booked, and active working status.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => go("reports")}>
            <BarChart3 style={{ width: "13px", height: "13px", marginRight: "6px" }} />
            Open Full Reports
          </Button>
        </div>

        <div className="member-perf-grid">
          {users
            .filter((u) => u.role !== "founder")
            .map((m) => {
              const perf = HubStore.getMemberPerformanceMetrics(m.id, "week");
              const statusConf = getWorkingStatusConfig(m.workingStatus);
              return (
              <div key={m.id} className="member-perf-card">
                <div className="member-perf-header">
                  <div className="member-perf-info">
                    <Avatar initials={m.initials} color={m.color} size="md" avatarUrl={m.avatarUrl} />
                    <div>
                      <strong style={{ fontSize: "13px", display: "block" }}>{m.name}</strong>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{m.title}</span>
                    </div>
                  </div>
                  <span
                    className="working-status-pill"
                    style={{ background: statusConf.bgColor, borderColor: "transparent" }}
                    title={statusConf.description}
                  >
                    <span
                      className="status-dot"
                      style={{ background: statusConf.dotColor, color: statusConf.dotColor }}
                    />
                    {m.workingStatus || "Outreach"}
                  </span>
                </div>

                <div className="member-perf-stats-row">
                  <div className="member-perf-stat-item">
                    <span>Leads</span>
                    <strong>{perf.leadsGenerated}</strong>
                  </div>
                  <div className="member-perf-stat-item">
                    <span>Contacted</span>
                    <strong>{perf.uniqueBusinessesContacted}</strong>
                  </div>
                  <div className="member-perf-stat-item">
                    <span>Outreach</span>
                    <strong>{perf.totalOutreachAttempts}</strong>
                  </div>
                  <div className="member-perf-stat-item">
                    <span>Replies</span>
                    <strong>
                      {perf.responsesReceived}{" "}
                      <small style={{ fontWeight: "normal", fontSize: "10px" }}>({perf.responseRatePct}%)</small>
                    </strong>
                  </div>
                  <div className="member-perf-stat-item">
                    <span>Meetings</span>
                    <strong style={{ color: "var(--primary)" }}>{perf.meetingsBooked}</strong>
                  </div>
                  <div className="member-perf-stat-item">
                    <span>Deals Won</span>
                    <strong style={{ color: "oklch(0.5 0.18 150)" }}>{perf.convertedWonLeads}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Pending follow-ups: <strong>{perf.pendingFollowups}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectedMember(m)}
                    style={{ fontSize: "11px", height: "28px" }}
                  >
                    View Profile →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <SectionHeading
            title="Lead activity"
            detail="Touchpoints logged by the team across the week"
            action={<Segmented value={range} setValue={setRange} />}
          />
          <div className="bar-chart">
            {weekDays.map((dayName, i) => {
              const count = weekCounts[i] ?? 0;
              const heightPct = count > 0 ? Math.max(16, Math.round((count / maxActivity) * 100)) : 8;
              const isToday = i === currentDayIdx;
              const isPeak = count === maxActivity && count > 0;
              return (
                <div key={dayName} className="bar-column">
                  <span
                    className={isToday || isPeak ? "bar active" : "bar"}
                    style={{ height: `${heightPct}%` }}
                    title={`${dayName}: ${count} touchpoints`}
                  >
                    {(isToday || isPeak) && (
                      <em>
                        {count} {count === 1 ? "action" : "actions"}
                      </em>
                    )}
                  </span>
                  <small>{dayName}</small>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionHeading title="Team leaderboard" detail="Active team members & win distribution" />
          <div className="leaderboard">
            {users
              .filter((u) => u.role !== "founder")
              .map((m, i) => {
                const memberLeads = leads.filter((l) => l.ownerId === m.id || l.ownerName === m.name);
              const memberWon = memberLeads.filter((l) => l.status === "Won").length;
              const winPct = memberLeads.length > 0 ? Math.round((memberWon / memberLeads.length) * 100) : 0;
              const totalVal = memberLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
              const progressPct = leads.length > 0 ? Math.round((memberLeads.length / leads.length) * 100) : 0;
              return (
                <div key={m.email}>
                  <span className="rank">{i + 1}</span>
                  <Avatar initials={m.initials} color={m.color} size="sm" />
                  <p>
                    <strong>{m.name}</strong>
                    <small>
                      {memberLeads.length} leads · {formatMoney(totalVal)} · {winPct}% win
                    </small>
                  </p>
                  <span className="progress">
                    <i style={{ width: `${Math.max(6, progressPct)}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionHeading
            title="Recent activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => go("notifications")}>
                View all
              </Button>
            }
          />
          <ActivityList activities={activities.slice(0, 5)} />
        </section>
        <section className="panel">
          <SectionHeading title="Follow-ups due" detail="Conversations needing attention" />
          <div className="followup-list">
            {leads.slice(0, 4).map((l) => (
              <FollowUp
                key={l.id}
                name={l.name}
                initials={l.initials}
                color={l.color}
                company={l.company}
                note={l.status ? `Stage: ${l.status}` : "Follow-up"}
                time={l.nextFollowupDate ? `Due: ${l.nextFollowupDate}` : "Date pending"}
                onClick={() => openLead(l.id)}
              />
            ))}
            {leads.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "16px 0" }}>
                No active follow-ups due. Create your first lead to begin tracking.
              </p>
            )}
          </div>
        </section>
      </div>

      <MemberProfileModal
        user={inspectedMember}
        open={Boolean(inspectedMember)}
        onOpenChange={(open) => !open && setInspectedMember(null)}
        openLead={openLead}
      />
    </>
  );
}

function Segmented({ value, setValue }: { value: string; setValue: (v: string) => void }) {
  return (
    <div className="segmented">
      {["week", "month"].map((v) => (
        <button key={v} className={value === v ? "active" : ""} onClick={() => setValue(v)}>
          {v === "week" ? "Week" : "Month"}
        </button>
      ))}
    </div>
  );
}

function ActivityList({ activities }: { activities: any[] }) {
  return (
    <div className="activity-list">
      {activities.map((a) => (
        <div key={a.id}>
          <Avatar initials={a.initials} color={a.color} size="sm" />
          <p>
            <strong>{a.person}</strong> {a.action} <strong>{a.subject}</strong>
            <span>{a.detail}</span>
          </p>
          <small>{a.time}</small>
        </div>
      ))}
      {activities.length === 0 && (
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "16px 0" }}>
          No activity logged yet. Workspace touchpoints will appear here live.
        </p>
      )}
    </div>
  );
}

function MemberDashboard({
  leads,
  openLead,
  currentUser,
}: {
  leads: Lead[];
  openLead: (id: string) => void;
  currentUser: UserProfile;
}) {
  const mine = leads.filter(
    (l) => Boolean(l) && (l.ownerId === currentUser.id || (l.ownerName || "").toLowerCase().includes((currentUser.name || "").toLowerCase())),
  );
  const myTotalValue = mine.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const myWonLeads = mine.filter((l) => l.status === "Won");
  const myFollowups = mine.filter((l) => Boolean(l.nextFollowupDate));
  const recentOutreach = HubStore.getOutreach({ userId: currentUser.id }).slice(0, 4);

  return (
    <>
      <PageTitle
        eyebrow={`${currentUser.name}'s Workspace`}
        title="My Daily Workspace"
        description="Your live outreach updates, assigned leads, and daily reporting."
      />

      {/* Member Daily Updates Section (Requirement 1) */}
      <MemberUpdates currentUser={currentUser} />

      {/* Real Pipeline Summary Card */}
      <div className="member-hero" style={{ marginTop: "16px" }}>
        <div>
          <p>My Pipeline</p>
          <h2>
            {mine.length} {mine.length === 1 ? "Assigned Lead" : "Assigned Leads"}
          </h2>
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            Active leads in your pipeline
          </span>
        </div>
        <div className="hero-stat">
          <strong>{formatMoney(myTotalValue)}</strong>
          <span>Pipeline Value</span>
        </div>
        <div className="hero-stat">
          <strong>{myWonLeads.length}</strong>
          <span>Won Deals</span>
        </div>
        <div className="hero-stat">
          <strong>{myFollowups.length}</strong>
          <span>Follow-ups Due</span>
        </div>
      </div>

      <div className="member-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {/* Panel 1: My Leads */}
        <section className="panel">
          <SectionHeading title="My assigned leads" detail="Recently updated" />
          <div className="compact-leads">
            {mine.map((l) => (
              <button key={l.id} onClick={() => openLead(l.id)}>
                <Avatar initials={l.initials} color={l.color} size="sm" />
                <span>
                  <strong>{l.name}</strong>
                  <small>{l.company} · {formatMoney(Number(l.value) || 0)}</small>
                </span>
                <StatusPill status={l.status} />
              </button>
            ))}
            {mine.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "16px 0", textAlign: "center" }}>
                No leads assigned yet. Click "New lead" to add your first prospect.
              </p>
            )}
          </div>
        </section>

        {/* Panel 2: Scheduled Follow-ups & Recent Touchpoints */}
        <section className="panel">
          <SectionHeading title="Scheduled follow-ups" detail="Next touchpoints due" />
          <div className="compact-leads">
            {myFollowups.map((l) => (
              <button key={l.id} onClick={() => openLead(l.id)}>
                <Avatar initials={l.initials} color={l.color} size="sm" />
                <span>
                  <strong>{l.name}</strong>
                  <small>{l.company} · Due: <strong style={{ color: "var(--primary)" }}>{l.nextFollowupDate}</strong></small>
                </span>
                <StatusPill status={l.status} />
              </button>
            ))}
            {myFollowups.length === 0 && (
              <div style={{ padding: "16px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
                <p style={{ fontSize: "13px", margin: 0 }}>No pending follow-ups scheduled.</p>
                <small style={{ fontSize: "11.5px" }}>Set next follow-up dates in lead details when logging outreach.</small>
              </div>
            )}
          </div>

          {recentOutreach.length > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <SectionHeading title="Recent outreach logged" detail="Latest touchpoints" />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {recentOutreach.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => openLead(o.leadId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "var(--muted)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <span>
                      <strong>{o.channel}</strong> · {leads.find((l) => l.id === o.leadId)?.name || "Lead"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {o.statusAtTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function LeadsView({
  leads,
  openLead,
  openAdd,
  currentUser,
}: {
  leads: Lead[];
  openLead: (id: string) => void;
  openAdd: () => void;
  currentUser: UserProfile;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | LeadStatus>("All");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">(
    currentUser.role === "founder" ? "all" : "mine",
  );

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = status === "All" || l.status === status;
      const matchQuery = `${l.name || ""} ${l.company || ""} ${l.email || ""} ${l.ownerName || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchOwner =
        ownerFilter === "all" ||
        l.ownerId === currentUser.id ||
        (l.ownerName || "").toLowerCase().includes((currentUser.name || "").toLowerCase());
      return matchStatus && matchQuery && matchOwner;
    });
  }, [leads, query, status, ownerFilter, currentUser]);

  const exportCSV = () => {
    const headers = ["ID", "Name", "Company", "Email", "Phone", "Source", "Value", "Status", "Owner", "Created"];
    const rows = filtered.map((l) => [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.company.replace(/"/g, '""')}"`,
      l.email,
      `"${l.phone}"`,
      l.source,
      l.value,
      l.status,
      `"${l.ownerName}"`,
      l.createdAt,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `buildicy_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Leads exported to CSV");
  };

  return (
    <>
      <PageTitle
        eyebrow="Pipeline"
        title="Leads"
        description={`${filtered.length} leads · ${formatMoney(
          filtered.reduce((s, l) => s + (Number(l.value) || 0), 0),
        )} value`}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div className="segmented" style={{ height: "36px" }}>
              <button
                className={ownerFilter === "mine" ? "active" : ""}
                onClick={() => setOwnerFilter("mine")}
              >
                My leads
              </button>
              <button
                className={ownerFilter === "all" ? "active" : ""}
                onClick={() => setOwnerFilter("all")}
              >
                All team leads
              </button>
            </div>
            <Button variant="outline" className="desktop-only" onClick={exportCSV}>
              <Download style={{ width: "14px", height: "14px", marginRight: "6px" }} />
              Export CSV
            </Button>
            <Button className="primary-pill" onClick={openAdd}>
              <Plus />
              Add lead
            </Button>
          </div>
        }
      />
      <section className="panel table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search />
            <input
              aria-label="Search leads"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company, email or owner"
            />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="filter-button">
                <Filter />
                {status === "All" ? "All statuses" : status}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["All", ...statuses] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="status-tabs">
          {(["All", ...statuses] as const).map((s) => (
            <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
              {s}
              <span>{s === "All" ? filtered.length : filtered.filter((l) => l.status === s).length}</span>
            </button>
          ))}
        </div>
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Potential</th>
                <th>Status</th>
                <th>Value</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Next Follow-up</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const pot = l.qualityPotential || "Medium potential";
                const potConf = LEAD_POTENTIAL_CONFIG[pot] || LEAD_POTENTIAL_CONFIG["Medium potential"];
                return (
                  <tr key={l.id} onClick={() => openLead(l.id)}>
                    <td>
                      <div className="lead-person">
                        <Avatar initials={l.initials} color={l.color} size="sm" />
                        <span>
                          <strong>{l.name}</strong>
                          <small>{l.company}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={potConf.className} style={{ fontSize: "10px" }}>
                        {pot}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={l.status} />
                    </td>
                    <td className="money">{formatMoney(Number(l.value) || 0)}</td>
                    <td>{l.source}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: l.ownerId === currentUser.id ? "oklch(0.53 0.23 292)" : "oklch(0.6 0.1 200)",
                          }}
                        />
                        {l.ownerName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: l.nextFollowupDate ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        {l.nextFollowupDate || "—"}
                      </span>
                    </td>
                    <td className="muted-cell">{l.updated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search />
              <strong>No leads found</strong>
              <span>Try a different search or change filter.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AddLeadDialog({
  open,
  onOpenChange,
  currentUser,
  users,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserProfile;
  users: UserProfile[];
  onAdd: (lead: Lead) => void;
}) {
  const [selectedOwnerId, setSelectedOwnerId] = useState(currentUser.id);
  const [uploadTab, setUploadTab] = useState<"manual" | "import">("manual");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseAndImport = (file: File) => {
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2 || !lines[0]) { toast.error("File has no data rows."); setImporting(false); return; }
        const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes("name"));
        const companyIdx = headers.findIndex((h) => h.includes("company"));
        const emailIdx = headers.findIndex((h) => h.includes("email"));
        const phoneIdx = headers.findIndex((h) => h.includes("phone"));
        const valueIdx = headers.findIndex((h) => h.includes("value") || h.includes("deal"));
        const sourceIdx = headers.findIndex((h) => h.includes("source"));
        if (nameIdx === -1) { toast.error("CSV must have a 'name' column."); setImporting(false); return; }
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const lineStr = lines[i];
          if (!lineStr) continue;
          const cols = lineStr.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
          const name = cols[nameIdx];
          if (!name) continue;
          const assignedUser = users.find((u) => u.id === selectedOwnerId) ?? currentUser;
          const newLead = HubStore.addLead({
            name,
            company: companyIdx >= 0 && cols[companyIdx] ? cols[companyIdx]! : "Independent",
            email: emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx]! : "",
            phone: phoneIdx >= 0 ? cols[phoneIdx] || "Not added" : "Not added",
            source: sourceIdx >= 0 ? cols[sourceIdx] || "Import" : "Import",
            value: valueIdx >= 0 ? Number(cols[valueIdx]) || 0 : 0,
            status: "New",
            qualityPotential: "Medium potential",
            ownerId: assignedUser.id,
            ownerName: assignedUser.name,
            initials: name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
            color: assignedUser.color,
          });
          onAdd(newLead);
          count++;
        }
        toast.success(`${count} lead${count !== 1 ? "s" : ""} imported successfully!`);
        onOpenChange(false);
      } catch {
        toast.error("Failed to parse file. Make sure it's a valid CSV.");
      }
      setImporting(false);
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseAndImport(file);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;

    const assignedUser = users.find((u) => u.id === selectedOwnerId) ?? currentUser;

    const newLead = HubStore.addLead({
      name,
      company: String(data.get("company") || "Independent"),
      email: String(data.get("email") || "hello@example.com"),
      phone: String(data.get("phone") || "Not added"),
      source: String(data.get("source") || "Website"),
      value: Number(data.get("value") || 0),
      status: "New",
      qualityPotential: (String(data.get("qualityPotential") || "Medium potential")) as LeadPotential,
      promisingReason: String(data.get("promisingReason") || "").trim(),
      nextFollowupDate: String(data.get("nextFollowupDate") || "").trim() || undefined,
      ownerId: assignedUser.id,
      ownerName: assignedUser.name,
      initials: name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      color: assignedUser.color,
    });

    onAdd(newLead);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hub-dialog" style={{ maxWidth: "560px" }}>
        <DialogHeader>
          <DialogTitle>Add leads</DialogTitle>
          <DialogDescription>
            Add manually or import from Excel / CSV / Google Sheets export.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="segmented" style={{ marginBottom: "16px", width: "fit-content" }}>
          <button type="button" className={uploadTab === "manual" ? "active" : ""} onClick={() => setUploadTab("manual")}>Manual entry</button>
          <button type="button" className={uploadTab === "import" ? "active" : ""} onClick={() => setUploadTab("import")}>
            <FileSpreadsheet style={{ width: "12px", height: "12px", marginRight: "4px", display: "inline" }} />
            Import file
          </button>
        </div>

        {/* Import tab */}
        {uploadTab === "import" && (
          <div>
            <div
              className="import-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload style={{ width: "28px", height: "28px", color: "var(--primary)", marginBottom: "10px" }} />
              <strong>Drop your file here or click to browse</strong>
              <span>Supports .csv, .xlsx (save as CSV from Excel/Google Sheets)</span>
              <span style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                Required column: <code>name</code> · Optional: company, email, phone, value, source
              </span>
              {importing && <span style={{ color: "var(--primary)", fontSize: "12px", marginTop: "8px" }}>Importing...</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods,.tsv"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseAndImport(f); }}
            />
            <div style={{ marginTop: "14px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>Assign imported leads to:</p>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 10px", background: "var(--input)", border: "1px solid var(--border)", fontSize: "12px" }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.title}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: "12px", padding: "10px 12px", background: "var(--muted)", borderRadius: "8px", fontSize: "11px", color: "var(--muted-foreground)" }}>
              💡 <strong>Tip:</strong> In Excel or Google Sheets, go to <em>File → Download → CSV</em> and upload that file here.
            </div>
          </div>
        )}

        {/* Manual tab */}
        {uploadTab === "manual" && (
        <form onSubmit={submit} className="lead-form">
          <label>
            Full name
            <Input name="name" required placeholder="e.g. Maya Patel" />
          </label>
          <label>
            Company
            <Input name="company" placeholder="Company name" />
          </label>
          <label>
            Email
            <Input name="email" type="email" placeholder="name@company.com" />
          </label>
          <label>
            Phone
            <Input name="phone" placeholder="+1 (555) 000-0000" />
          </label>
          <label>
            Deal value ($)
            <Input name="value" type="number" min="0" placeholder="10000" />
          </label>
          <label>
            Source
            <select name="source">
              <option>Website</option>
              <option>Referral</option>
              <option>LinkedIn</option>
              <option>Event</option>
              <option>Inbound Marketing</option>
            </select>
          </label>
          <label>
            Lead Potential
            <select name="qualityPotential">
              <option value="Medium potential">Medium potential</option>
              <option value="High potential">High potential</option>
              <option value="Ready to convert">Ready to convert</option>
              <option value="Low potential">Low potential</option>
            </select>
          </label>
          <label>
            Next Follow-up Date
            <Input name="nextFollowupDate" type="date" />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Why is this prospect promising?
            <Input name="promisingReason" placeholder="e.g. Expanding sales team, actively seeking agency partners" />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Assign to team member
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              style={{ width: "100%", height: "40px", borderRadius: "8px", padding: "0 10px", background: "var(--input)" }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.title} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <DialogFooter className="form-footer">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="primary-pill">
              Add lead
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeadDetail({
  lead,
  back,
  currentUser,
  users,
}: {
  lead: Lead;
  back: () => void;
  currentUser: UserProfile;
  users: UserProfile[];
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [potential, setPotential] = useState<LeadPotential>(lead.qualityPotential || "Medium potential");
  const [promisingReason, setPromisingReason] = useState(lead.promisingReason || "");
  const [nextFollowupDate, setNextFollowupDate] = useState(lead.nextFollowupDate || "");
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachList, setOutreachList] = useState(() => HubStore.getOutreach(lead.id));
  const [messages, setMessages] = useState<LeadDiscussion[]>(() =>
    HubStore.getDiscussions(lead.id),
  );
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const activities = HubStore.getActivities(lead.id);

  const stageProb = STAGE_PROBABILITIES[status] || STAGE_PROBABILITIES.New;
  const potConf = LEAD_POTENTIAL_CONFIG[potential] || LEAD_POTENTIAL_CONFIG["Medium potential"];

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    HubStore.updateLeadStatus(lead.id, newStatus);
    toast.success(`Status updated to ${newStatus}`);
  };

  const handlePotentialChange = (newPotential: LeadPotential) => {
    setPotential(newPotential);
    HubStore.updateLeadQuality(lead.id, newPotential, promisingReason);
    toast.success(`Potential updated to ${newPotential}`);
  };

  const handleSaveReason = () => {
    HubStore.updateLeadQuality(lead.id, potential, promisingReason);
    toast.success("Promising reason saved");
  };

  const handleSaveFollowup = () => {
    HubStore.updateLeadFollowup(lead.id, nextFollowupDate);
    toast.success("Follow-up date scheduled");
  };

  const handleReassign = (newUser: UserProfile) => {
    HubStore.reassignLead(lead.id, newUser);
    toast.success(`Lead reassigned to ${newUser.name}`);
  };

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    HubStore.addActivity({
      leadId: lead.id,
      userId: currentUser.id,
      person: currentUser.name,
      initials: currentUser.initials,
      color: currentUser.color,
      action: "added a note to",
      subject: lead.name,
      detail: noteText.trim(),
      time: "Just now",
      type: "note",
    });

    setNoteText("");
    setShowNoteInput(false);
    toast.success("Activity note added to timeline");
  };

  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft />
        Back to leads
      </button>
      <div className="lead-detail-head">
        <div className="lead-identity">
          <Avatar initials={lead.initials} color={lead.color} size="lg" />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <p className="eyebrow" style={{ margin: 0 }}>{lead.id}</p>
              <span className={potConf.className} style={{ fontSize: "11px" }}>
                {potential}
              </span>
            </div>
            <h1>{lead.name}</h1>
            <span>
              {lead.company} · {formatMoney(Number(lead.value) || 0)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Quality Potential Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Target size={13} style={{ marginRight: "4px", color: "var(--primary)" }} />
                Potential: {potential}
                <ChevronDown size={12} style={{ marginLeft: "4px" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Lead Quality Potential</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["Low potential", "Medium potential", "High potential", "Ready to convert"] as const).map((p) => (
                <DropdownMenuItem key={p} onClick={() => handlePotentialChange(p)}>
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reassign dropdown (Founder or owner) */}
          {(currentUser.role === "founder" || currentUser.id === lead.ownerId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCheck style={{ width: "13px", height: "13px", marginRight: "6px" }} />
                  Owner: {lead.ownerName}
                  <ChevronDown size={12} style={{ marginLeft: "4px" }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Reassign Lead</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {users.map((u) => (
                  <DropdownMenuItem key={u.id} onClick={() => handleReassign(u)}>
                    {u.name} ({u.title})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="primary-pill" size="sm">
                Status: {status}
                <ChevronDown size={12} style={{ marginLeft: "4px" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statuses.map((s) => (
                <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Contact & Quality Column */}
        <section className="panel contact-panel">
          <SectionHeading title="Contact & Opportunity" />
          <Info icon={<Mail />} label="Email" value={lead.email} />
          <Info icon={<Phone />} label="Phone" value={lead.phone} />
          <Info icon={<Building2 />} label="Company" value={lead.company} />
          <Info icon={<UserPlus />} label="Owner" value={lead.ownerName} />
          
          <div className="detail-status" style={{ marginBottom: "16px" }}>
            <span>Current stage</span>
            <StatusPill status={status} />
          </div>

          {/* Lead Quality & Stage Probability (Requirement 5) */}
          <div style={{ paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
              Estimated Conversion Probability
            </span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <strong style={{ fontSize: "16px", color: "var(--primary)" }}>{stageProb.probability}%</strong>
              <small style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Stage estimate</small>
            </div>
            <div style={{ width: "100%", height: "6px", background: "var(--muted)", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
              <div style={{ width: `${stageProb.probability}%`, height: "100%", background: "var(--primary)", borderRadius: "3px" }} />
            </div>
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)", display: "block", lineHeight: "1.4" }}>
              {stageProb.label}. Distinct from final closed won/lost result.
            </span>
          </div>

          {/* Why is this prospect promising? (Requirement 5) */}
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
              Why is this prospect promising?
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. Budget confirmed $15k, founder expressed urgency for website revamp."
              value={promisingReason}
              onChange={(e) => setPromisingReason(e.target.value)}
              style={{ fontSize: "12px", minHeight: "56px", marginBottom: "6px" }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveReason}
              style={{ width: "100%", height: "28px", fontSize: "11px" }}
            >
              Save Reason
            </Button>
          </div>

          {/* Next Scheduled Follow-up */}
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
              Next Scheduled Follow-up
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <Input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                style={{ height: "32px", fontSize: "12px" }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveFollowup}
                style={{ height: "32px", fontSize: "11px" }}
              >
                Set
              </Button>
            </div>
          </div>
        </section>

        {/* Right Main Column with Outreach Timeline */}
        <section className="panel detail-main">
          <Tabs defaultValue="outreach">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <TabsList className="hub-tabs">
                <TabsTrigger value="outreach">Outreach history ({outreachList.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity timeline</TabsTrigger>
                <TabsTrigger value="discussion">Discussion ({messages.length})</TabsTrigger>
              </TabsList>
              
              <div style={{ display: "flex", gap: "6px" }}>
                <Button
                  className="primary-pill"
                  size="sm"
                  onClick={() => setOutreachOpen(true)}
                  style={{ fontSize: "11px", height: "30px" }}
                >
                  <Send style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                  + Log Outreach
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  style={{ fontSize: "11px", height: "30px" }}
                >
                  <Plus style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                  Log note
                </Button>
              </div>
            </div>

            {showNoteInput && (
              <form onSubmit={handleAddNote} style={{ display: "flex", gap: "8px", margin: "14px 0" }}>
                <Input
                  placeholder="e.g. Budget approved internally, contract in legal review..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ height: "36px", fontSize: "12px" }}
                />
                <Button type="submit" size="sm" className="primary-pill" style={{ height: "36px" }}>
                  Save
                </Button>
              </form>
            )}

            {/* Tab 1: Outreach Interaction History (Requirement 2) */}
            <TabsContent value="outreach">
              <div className="outreach-timeline">
                {outreachList.map((o) => (
                  <div key={o.id} className="outreach-item">
                    <div className="outreach-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="outreach-channel-badge">
                          {o.channel}
                        </span>
                        <span className={`outreach-response-badge ${o.isPositive ? "positive" : "neutral"}`}>
                          {o.prospectResponse}
                        </span>
                      </div>
                      <div className="outreach-meta">
                        <span>{new Date(o.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>by <strong>{o.userName}</strong></span>
                      </div>
                    </div>

                    <p className="outreach-notes">{o.notes}</p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted-foreground)", paddingTop: "6px", borderTop: "1px dashed var(--border)" }}>
                      <span>Stage during outreach: <strong>{o.statusAtTime}</strong></span>
                      {o.nextFollowupDate && (
                        <span>Next follow-up: <strong style={{ color: "var(--primary)" }}>{o.nextFollowupDate}</strong></span>
                      )}
                    </div>
                  </div>
                ))}

                {outreachList.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
                    <Send size={24} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                    <strong style={{ display: "block", fontSize: "13px", color: "var(--foreground)" }}>No outreach interactions logged yet</strong>
                    <span style={{ fontSize: "12px" }}>Click "+ Log Outreach" above to record your first Email, WhatsApp or Call touchpoint.</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: Activity Timeline */}
            <TabsContent value="activity">
              <div className="timeline">
                {activities.map((a) => (
                  <div key={a.id}>
                    <span />
                    <p>
                      <strong>
                        {a.person} {a.action}
                      </strong>
                      <small>{a.detail || a.subject}</small>
                    </p>
                    <time>{a.time}</time>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div>
                    <span />
                    <p>
                      <strong>Lead created</strong>
                      <small>Source: {lead.source}</small>
                    </p>
                    <time>{lead.updated}</time>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Discussion */}
            <TabsContent value="discussion">
              <LeadConversation
                leadId={lead.id}
                messages={messages}
                currentUser={currentUser}
                onNewMessage={(m) => setMessages((prev) => [...prev, m])}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Outreach Dialog */}
      <OutreachDialog
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        lead={lead}
        currentUser={currentUser}
        onSuccess={() => setOutreachList(HubStore.getOutreach(lead.id))}
      />
    </>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{icon}</span>
      <p>
        <small>{label}</small>
        <strong>{value}</strong>
      </p>
    </div>
  );
}

function LeadConversation({
  leadId,
  messages,
  currentUser,
  onNewMessage,
}: {
  leadId: string;
  messages: LeadDiscussion[];
  currentUser: UserProfile;
  onNewMessage: (msg: LeadDiscussion) => void;
}) {
  const [text, setText] = useState("");

  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    const added = HubStore.addDiscussion(leadId, text.trim());
    if (added) {
      onNewMessage(added);
      setText("");
    }
  };

  return (
    <div className="conversation compact">
      <div className="message-list">
        {messages.map((m) => {
          const isOwn = m.userId === currentUser.id || m.author === currentUser.name;
          return (
            <div key={m.id} className={isOwn ? "message own" : "message"}>
              {!isOwn && <Avatar initials={m.initials} color={m.color} size="sm" />}
              <div>
                <span>
                  {isOwn ? "You" : m.author} · {m.time}
                </span>
                <p>{m.text}</p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", padding: "16px 0", textAlign: "center" }}>
            No internal discussions on this lead yet. Start the conversation!
          </p>
        )}
      </div>
      <form className="composer" onSubmit={send}>
        <Textarea
          aria-label="Discussion note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an internal note or update..."
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="icon" aria-label="Send message">
          <Send />
        </Button>
      </form>
    </div>
  );
}

function Notifications({
  openLead,
  notifications,
}: {
  openLead: (id: string) => void;
  notifications: any[];
}) {
  return (
    <>
      <PageTitle
        eyebrow="Inbox"
        title="Notifications"
        description="Updates that need your attention across the workspace."
        action={
          <Button
            variant="outline"
            onClick={() => {
              HubStore.markNotificationRead();
              toast.success("All notifications marked as read");
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <section className="panel notification-panel">
        {notifications.map((n) => (
          <button
            key={n.id}
            className={n.isRead ? "notification read" : "notification"}
            onClick={() => {
              HubStore.markNotificationRead(n.id);
              if (n.leadId) {
                openLead(n.leadId);
              }
            }}
          >
            <span className="notification-icon">
              <Bell />
            </span>
            <span>
              <strong>{n.title}</strong>
              <small>{n.body}</small>
            </span>
            <time>{n.time}</time>
          </button>
        ))}
        {notifications.length === 0 && (
          <p style={{ textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)" }}>
            Inbox zero! You're completely up to date.
          </p>
        )}
      </section>
    </>
  );
}

function TeamManagement({ users }: { users: UserProfile[] }) {
  const [invite, setInvite] = useState(false);
  const leads = HubStore.getLeads();

  return (
    <>
      <PageTitle
        eyebrow="Workspace"
        title="Team management"
        description="Manage roles, ownership and team member access."
        action={
          <Button className="primary-pill" onClick={() => setInvite(true)}>
            <UserPlus />
            Invite member
          </Button>
        }
      />
      <div className="team-grid">
        {users.map((m) => {
          const userLeads = leads.filter((l) => l.ownerId === m.id || l.ownerName === m.name);
          return (
            <article className="member-card" key={m.email}>
              <Avatar initials={m.initials} color={m.color} size="lg" avatarUrl={m.avatarUrl} />
              <h3>{m.name}</h3>
              <p>{m.email}</p>
              <span className="role-pill">
                {m.role === "founder" ? "Founder" : m.title}
              </span>
              <div>
                <span>
                  <strong>{userLeads.length}</strong> leads
                </span>
                <span>{m.activeStatus}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Manage
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Change role</DropdownMenuItem>
                  <DropdownMenuItem>Reassign leads</DropdownMenuItem>
                  {m.role !== "founder" && (
                    <DropdownMenuItem className="text-destructive">Remove access</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          );
        })}
      </div>
      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent className="hub-dialog">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They’ll receive access to leads and channels based on their role.
            </DialogDescription>
          </DialogHeader>
          <form
            className="lead-form single"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const email = String(d.get("email")).trim();
              if (!email) return;

              toast.success(`Invite dispatched to ${email}`);
              setInvite(false);
            }}
          >
            <label>
              Email address
              <Input name="email" type="email" required placeholder="teammate@buildicy.com" />
            </label>
            <label>
              Role
              <select name="role">
                <option>Marketing</option>
                <option>Sales Lead</option>
                <option>Account Executive</option>
                <option>Admin</option>
              </select>
            </label>
            <Button className="primary-pill">Send invite</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
