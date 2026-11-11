import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Bell, BriefcaseBusiness, Building2, CalendarClock, ChevronDown, Filter, Hash, LayoutDashboard,
  Mail, Menu, MessageCircle, Phone, Plus, Search, Send, Settings, Target, TrendingUp, UserPlus, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activityFeed, channelMessages, formatMoney, leadsSeed, teamSeed, type ChatMessage, type Lead, type LeadStatus } from "./data";
import { Avatar, FollowUp, MetricCard, PageTitle, SectionHeading, StatusPill } from "./shared";

export type View = "founder" | "member" | "leads" | "lead" | "chat" | "notifications" | "team";
const statuses: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
const nav = [
  { id: "founder", label: "Founder view", icon: LayoutDashboard },
  { id: "member", label: "My workspace", icon: BriefcaseBusiness },
  { id: "leads", label: "Leads", icon: Target, count: 8 },
  { id: "chat", label: "Team chat", icon: MessageCircle, count: 3 },
  { id: "notifications", label: "Notifications", icon: Bell, count: 4 },
  { id: "team", label: "Team", icon: Users },
] as const;

export function TeamHubApp() {
  const [view, setView] = useState<View>("founder");
  const [leads, setLeads] = useState(leadsSeed);
  const [selectedId, setSelectedId] = useState(leadsSeed[0].id);
  const [mobileNav, setMobileNav] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  const go = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0 }); };
  const openLead = (id: string) => { setSelectedId(id); go("lead"); };

  return (
    <div className="hub-shell">
      <aside className={`hub-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-row"><Brand /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button></div>
        <div className="welcome-copy"><p>Good morning,</p><h2>Mayur 👋</h2></div>
        <nav className="hub-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon, ...item }) => (
            <button key={id} className={view === id || (id === "leads" && view === "lead") ? "active" : ""} onClick={() => go(id)}>
              <Icon /><span>{label}</span>{"count" in item && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-team">
          <div className="avatar-stack">{teamSeed.map((m) => <Avatar key={m.name} initials={m.initials} color={m.color} />)}<span>+6</span></div>
          <div className="mini-chat">
            <div className="mini-chat-head"><strong>Sofia Chen</strong><span>Sales lead</span></div>
            <p className="mini-bubble">Phoenix opened the proposal twice 👀</p>
            <p className="mini-bubble own">Great — let’s follow up at 3!</p>
            <button onClick={() => go("chat")}>Reply in chat <Send /></button>
          </div>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="hub-main">
        <header className="hub-topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button>
          <label className="global-search"><Search /><input placeholder="Search leads, people, conversations…" /><kbd>⌘K</kbd></label>
          <div className="topbar-actions">
            <button className="round-action" onClick={() => go("notifications")} aria-label="Notifications"><Bell /><i /></button>
            <button className="round-action desktop-only" aria-label="Settings"><Settings /></button>
            <Button className="primary-pill desktop-only" onClick={() => setAddOpen(true)}><Plus />New lead</Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="profile-button"><Avatar initials="MB" /><span><strong>Mayur Buildicy</strong><small>Founder</small></span><ChevronDown /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Buildicy workspace</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => go("founder")}>Founder view</DropdownMenuItem><DropdownMenuItem onClick={() => go("member")}>Member view</DropdownMenuItem><DropdownMenuItem onClick={() => go("team")}>Workspace settings</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="hub-canvas">
          {view === "founder" && <FounderDashboard leads={leads} openLead={openLead} go={go} />}
          {view === "member" && <MemberDashboard leads={leads} openLead={openLead} />}
          {view === "leads" && <LeadsView leads={leads} openLead={openLead} openAdd={() => setAddOpen(true)} />}
          {view === "lead" && <LeadDetail lead={selected} back={() => go("leads")} update={(status) => setLeads((all) => all.map((l) => l.id === selected.id ? { ...l, status, updated: "Just now" } : l))} />}
          {view === "chat" && <TeamChat />}
          {view === "notifications" && <Notifications openLead={openLead} />}
          {view === "team" && <TeamManagement />}
        </div>
      </main>
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onAdd={(lead) => { setLeads((all) => [lead, ...all]); setSelectedId(lead.id); go("leads"); toast.success(`${lead.name} was added to Leads`); }} />
    </div>
  );
}

function Brand() { return <div className="brand"><span className="brand-mark">B</span><span><strong>Buildicy</strong><small>Team Hub</small></span></div>; }

function FounderDashboard({ leads, openLead, go }: { leads: Lead[]; openLead: (id: string) => void; go: (v: View) => void }) {
  const [range, setRange] = useState("week");
  const values = range === "week" ? [42, 58, 76, 52, 88, 64, 70] : [62, 48, 80, 72, 92, 68, 84];
  return <>
    <PageTitle eyebrow="Wednesday, 11 November" title="Team performance" description="A calm overview of your pipeline, people and priorities." action={<Button className="primary-pill" onClick={() => go("leads")}>View pipeline</Button>} />
    <div className="metrics-grid">
      <MetricCard label="Total pipeline" value="$72,600" change="18.2%" footnote="vs. last month" icon={<TrendingUp />} />
      <MetricCard label="Active leads" value={String(leads.filter((l) => !["Won", "Lost"].includes(l.status)).length)} change="12.5%" footnote="6 added this week" icon={<Target />} />
      <MetricCard label="Conversion rate" value="24.8%" change="3.1%" footnote="Lead to customer" icon={<CalendarClock />} />
      <MetricCard label="Response time" value="1h 42m" change="8.4%" trend="down" footnote="Team average" icon={<MessageCircle />} />
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><SectionHeading title="Lead activity" detail="Touchpoints logged by the team" action={<Segmented value={range} setValue={setRange} />} />
        <div className="bar-chart">{values.map((v, i) => <div key={i} className="bar-column"><span className={i === 4 ? "bar active" : "bar"} style={{ height: `${v}%` }}>{i === 4 && <em>88 actions</em>}</span><small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</small></div>)}</div>
      </section>
      <section className="panel"><SectionHeading title="Team leaderboard" detail="This month" />
        <div className="leaderboard">{teamSeed.map((m, i) => <div key={m.name}><span className="rank">{i + 1}</span><Avatar initials={m.initials} color={m.color} size="sm" /><p><strong>{m.name}</strong><small>{m.leads} leads · {[38, 31, 27, 19][i]}% won</small></p><span className="progress"><i style={{ width: `${[92, 78, 66, 48][i]}%` }} /></span></div>)}</div>
      </section>
      <section className="panel"><SectionHeading title="Recent activity" action={<Button variant="ghost" size="sm" onClick={() => go("notifications")}>View all</Button>} /><ActivityList /></section>
      <section className="panel"><SectionHeading title="Follow-ups due" detail="4 conversations need attention" />
        <div className="followup-list">{leads.slice(0, 4).map((l, i) => <FollowUp key={l.id} name={l.name} initials={l.initials} color={l.color} company={l.company} note={["Proposal check-in", "Send pricing", "Book demo", "Contract review"][i]} time={["10:30", "1:00 PM", "3:15 PM", "5:00 PM"][i]} onClick={() => openLead(l.id)} />)}</div>
      </section>
    </div>
  </>;
}

function Segmented({ value, setValue }: { value: string; setValue: (v: string) => void }) { return <div className="segmented">{["week", "month"].map((v) => <button key={v} className={value === v ? "active" : ""} onClick={() => setValue(v)}>{v === "week" ? "Week" : "Month"}</button>)}</div>; }

function ActivityList() { return <div className="activity-list">{activityFeed.map((a) => <div key={a.time}><Avatar initials={a.initials} color={a.color} size="sm" /><p><strong>{a.person}</strong> {a.action} <strong>{a.subject}</strong><span>{a.detail}</span></p><small>{a.time}</small></div>)}</div>; }

function MemberDashboard({ leads, openLead }: { leads: Lead[]; openLead: (id: string) => void }) {
  const [tasks, setTasks] = useState([{ text: "Call Olivia about onboarding scope", done: false, time: "10:30" }, { text: "Send revised proposal to Drew", done: true, time: "12:00" }, { text: "Prepare discovery notes for Demi", done: false, time: "15:30" }, { text: "Update Q4 pipeline forecast", done: false, time: "17:00" }]);
  const mine = leads.filter((l) => l.owner === "Mayur Buildicy");
  return <>
    <PageTitle eyebrow="Your workspace" title="Today, made simple" description="Your leads, assignments and progress in one focused view." />
    <div className="member-hero"><div><p>Daily goal</p><h2>{tasks.filter((t) => t.done).length} of {tasks.length} tasks complete</h2><span className="hero-progress"><i style={{ width: `${(tasks.filter((t) => t.done).length / tasks.length) * 100}%` }} /></span></div><div className="hero-stat"><strong>{mine.length}</strong><span>owned leads</span></div><div className="hero-stat"><strong>$43k</strong><span>open value</span></div></div>
    <div className="member-grid">
      <section className="panel"><SectionHeading title="My assignments" detail="Click to mark complete" /><div className="task-list">{tasks.map((t, i) => <button key={t.text} className={t.done ? "done" : ""} onClick={() => setTasks((all) => all.map((x, j) => j === i ? { ...x, done: !x.done } : x))}><span className="check-dot" /><span>{t.text}</span><small>{t.time}</small></button>)}</div></section>
      <section className="panel"><SectionHeading title="My leads" detail="Recently updated" /><div className="compact-leads">{mine.map((l) => <button key={l.id} onClick={() => openLead(l.id)}><Avatar initials={l.initials} color={l.color} size="sm" /><span><strong>{l.name}</strong><small>{l.company}</small></span><StatusPill status={l.status} /></button>)}</div></section>
      <section className="panel member-wide"><SectionHeading title="Daily activity" detail="Your time across the week" /><div className="schedule">{[["Mon", "Discovery calls", "Proposal work"], ["Tue", "Follow-ups", "Demo"], ["Wed", "Pipeline review", "Calls"], ["Thu", "Client workshop", ""], ["Fri", "Outreach", "Planning"]].map(([d, a, b], i) => <div key={d}><span>{d}</span><div><i className={`event e${i}`}>{a}</i>{b && <i className={`event alt e${i}`}>{b}</i>}</div></div>)}</div></section>
    </div>
  </>;
}

function LeadsView({ leads, openLead, openAdd }: { leads: Lead[]; openLead: (id: string) => void; openAdd: () => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | LeadStatus>("All");
  const filtered = useMemo(() => leads.filter((l) => (status === "All" || l.status === status) && `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(query.toLowerCase())), [leads, query, status]);
  return <>
    <PageTitle eyebrow="Pipeline" title="Leads" description={`${leads.length} leads · ${formatMoney(leads.reduce((s, l) => s + l.value, 0))} total value`} action={<Button className="primary-pill" onClick={openAdd}><Plus />Add lead</Button>} />
    <section className="panel table-panel">
      <div className="table-toolbar"><label className="table-search"><Search /><input aria-label="Search leads" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, company or email" /></label>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="filter-button"><Filter />{status === "All" ? "All statuses" : status}<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{(["All", ...statuses] as const).map((s) => <DropdownMenuItem key={s} onClick={() => setStatus(s)}>{s}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      </div>
      <div className="status-tabs">{(["All", ...statuses] as const).map((s) => <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}<span>{s === "All" ? leads.length : leads.filter((l) => l.status === s).length}</span></button>)}</div>
      <div className="lead-table-wrap"><table className="lead-table"><thead><tr><th>Lead</th><th>Status</th><th>Value</th><th>Source</th><th>Owner</th><th>Updated</th></tr></thead><tbody>{filtered.map((l) => <tr key={l.id} onClick={() => openLead(l.id)}><td><div className="lead-person"><Avatar initials={l.initials} color={l.color} size="sm" /><span><strong>{l.name}</strong><small>{l.company}</small></span></div></td><td><StatusPill status={l.status} /></td><td className="money">{formatMoney(l.value)}</td><td>{l.source}</td><td>{l.owner}</td><td className="muted-cell">{l.updated}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search /><strong>No leads found</strong><span>Try a different search or status.</span></div>}</div>
    </section>
  </>;
}

function AddLeadDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (lead: Lead) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim();
    if (!name) return;
    onAdd({ id: `LD-${2409 + Math.floor(Math.random() * 90)}`, name, company: String(data.get("company") || "Independent"), email: String(data.get("email") || "hello@example.com"), phone: String(data.get("phone") || "Not added"), source: String(data.get("source")), value: Number(data.get("value") || 0), status: "New", owner: "Mayur Buildicy", initials: name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(), color: "avatar-lilac", updated: "Just now" });
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="hub-dialog"><DialogHeader><DialogTitle>Add a new lead</DialogTitle><DialogDescription>Capture the essentials now — you can add more context later.</DialogDescription></DialogHeader><form onSubmit={submit} className="lead-form"><label>Full name<Input name="name" required placeholder="e.g. Maya Patel" /></label><label>Company<Input name="company" placeholder="Company name" /></label><label>Email<Input name="email" type="email" placeholder="name@company.com" /></label><label>Phone<Input name="phone" placeholder="+1 (555) 000-0000" /></label><label>Deal value<Input name="value" type="number" min="0" placeholder="10000" /></label><label>Source<select name="source"><option>Website</option><option>Referral</option><option>LinkedIn</option><option>Event</option></select></label><DialogFooter className="form-footer"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="primary-pill">Add lead</Button></DialogFooter></form></DialogContent></Dialog>;
}

function LeadDetail({ lead, back, update }: { lead: Lead; back: () => void; update: (s: LeadStatus) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ author: "Sofia Chen", initials: "SC", color: "avatar-peach", text: "They want onboarding included in phase one.", time: "10:12 AM" }, { author: "Mayur Buildicy", initials: "MB", color: "avatar-lilac", text: "Let’s include it as a fixed-scope add-on.", time: "10:20 AM", own: true }]);
  return <>
    <button className="back-link" onClick={back}><ArrowLeft />Back to leads</button>
    <div className="lead-detail-head"><div className="lead-identity"><Avatar initials={lead.initials} color={lead.color} size="lg" /><div><p className="eyebrow">{lead.id}</p><h1>{lead.name}</h1><span>{lead.company} · {formatMoney(lead.value)}</span></div></div><DropdownMenu><DropdownMenuTrigger asChild><Button className="primary-pill">Status: {lead.status}<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{statuses.map((s) => <DropdownMenuItem key={s} onClick={() => { update(s); toast.success(`Status changed to ${s}`); }}>{s}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
    <div className="detail-grid"><section className="panel contact-panel"><SectionHeading title="Contact" /><Info icon={<Mail />} label="Email" value={lead.email} /><Info icon={<Phone />} label="Phone" value={lead.phone} /><Info icon={<Building2 />} label="Company" value={lead.company} /><Info icon={<UserPlus />} label="Owner" value={lead.owner} /><div className="detail-status"><span>Current stage</span><StatusPill status={lead.status} /></div></section>
      <section className="panel detail-main"><Tabs defaultValue="activity"><TabsList className="hub-tabs"><TabsTrigger value="activity">Activity timeline</TabsTrigger><TabsTrigger value="discussion">Discussion</TabsTrigger></TabsList><TabsContent value="activity"><div className="timeline">{[["Status updated", `Moved to ${lead.status}`, lead.updated], ["Proposal opened", "Viewed for 6 minutes", "Yesterday, 4:12 PM"], ["Discovery call", "Budget and timeline confirmed", "Oct 9, 11:00 AM"], ["Lead created", `Captured from ${lead.source}`, "Oct 7, 9:24 AM"]].map(([a, b, c]) => <div key={a}><span /><p><strong>{a}</strong><small>{b}</small></p><time>{c}</time></div>)}</div></TabsContent><TabsContent value="discussion"><Conversation messages={messages} setMessages={setMessages} compact /></TabsContent></Tabs></section></div>
  </>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="info-row"><span>{icon}</span><p><small>{label}</small><strong>{value}</strong></p></div>; }

function Conversation({ messages, setMessages, compact = false }: { messages: ChatMessage[]; setMessages: (fn: (m: ChatMessage[]) => ChatMessage[]) => void; compact?: boolean }) {
  const [text, setText] = useState("");
  const send = (e: FormEvent) => { e.preventDefault(); if (!text.trim()) return; setMessages((m) => [...m, { author: "Mayur Buildicy", initials: "MB", color: "avatar-lilac", text: text.trim(), time: "Now", own: true }]); setText(""); };
  return <div className={compact ? "conversation compact" : "conversation"}><div className="message-list">{messages.map((m, i) => <div key={`${m.time}-${i}`} className={m.own ? "message own" : "message"}>{!m.own && <Avatar initials={m.initials} color={m.color} size="sm" />}<div><span>{m.own ? "You" : m.author} · {m.time}</span><p>{m.text}</p></div></div>)}</div><form className="composer" onSubmit={send}><Textarea aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }} /><Button type="submit" size="icon" aria-label="Send message"><Send /></Button></form></div>;
}

function TeamChat() {
  const [active, setActive] = useState("sales");
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({ sales: channelMessages, wins: [{ author: "Alex Morgan", initials: "AM", color: "avatar-sage", text: "Hourglass signed! 🎉", time: "Yesterday" }], sofia: [{ author: "Sofia Chen", initials: "SC", color: "avatar-peach", text: "Can you review the Circooles proposal before 2?", time: "9:42 AM" }], alex: [{ author: "Alex Morgan", initials: "AM", color: "avatar-sage", text: "Deck is ready for Lana.", time: "8:15 AM" }] });
  const items = [{ id: "sales", name: "sales-team", group: true }, { id: "wins", name: "wins", group: true }, { id: "sofia", name: "Sofia Chen", member: teamSeed[1] }, { id: "alex", name: "Alex Morgan", member: teamSeed[2] }];
  const current = items.find((i) => i.id === active)!;
  return <><PageTitle eyebrow="Messages" title="Team chat" description="Fast conversations for the people closing deals." /><section className="chat-layout"><aside className="chat-list"><Tabs defaultValue="all"><TabsList className="hub-tabs"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList><TabsContent value="all"><ChatItems items={items} active={active} setActive={setActive} /></TabsContent><TabsContent value="unread"><ChatItems items={items.slice(0, 3)} active={active} setActive={setActive} /></TabsContent></Tabs></aside><div className="chat-room"><div className="chat-room-head">{current.group ? <span className="channel-icon"><Hash /></span> : <Avatar initials={current.member!.initials} color={current.member!.color} />}<div><strong>{current.group ? `#${current.name}` : current.name}</strong><span>{current.group ? "4 members" : current.member!.active}</span></div></div><Conversation messages={threads[active]} setMessages={(fn) => setThreads((t) => ({ ...t, [active]: fn(t[active]) }))} /></div></section></>;
}

function ChatItems({ items, active, setActive }: { items: { id: string; name: string; group?: boolean; member?: (typeof teamSeed)[number] }[]; active: string; setActive: (id: string) => void }) {
  return <div className="chat-items"><p>Channels</p>{items.filter((i) => i.group).map((i) => <button key={i.id} className={active === i.id ? "active" : ""} onClick={() => setActive(i.id)}><span className="channel-icon"><Hash /></span><span>{i.name}</span></button>)}<p>Direct messages</p>{items.filter((i) => !i.group).map((i) => <button key={i.id} className={active === i.id ? "active" : ""} onClick={() => setActive(i.id)}><Avatar initials={i.member!.initials} color={i.member!.color} size="sm" /><span>{i.name}</span></button>)}</div>;
}

function Notifications({ openLead }: { openLead: (id: string) => void }) {
  const [read, setRead] = useState<number[]>([]);
  const notes = [["Phoenix Baker opened your proposal", "Circooles · 2 views in 10 minutes", "12m", "LD-2407"], ["New lead assigned to you", "Demi Wilkinson from Quotient", "1h", "LD-2405"], ["Follow-up due today", "Olivia Rhye at 10:30 AM", "2h", "LD-2408"], ["Sofia mentioned you", "“Can you review the pricing?”", "3h", "LD-2404"]];
  return <><PageTitle eyebrow="Inbox" title="Notifications" description="Updates that need your attention." action={<Button variant="outline" onClick={() => setRead([0, 1, 2, 3])}>Mark all as read</Button>} /><section className="panel notification-panel">{notes.map(([title, body, time, id], i) => <button key={title} className={read.includes(i) ? "notification read" : "notification"} onClick={() => { setRead((r) => [...new Set([...r, i])]); openLead(id); }}><span className="notification-icon"><Bell /></span><span><strong>{title}</strong><small>{body}</small></span><time>{time}</time></button>)}</section></>;
}

function TeamManagement() {
  const [members, setMembers] = useState(teamSeed);
  const [invite, setInvite] = useState(false);
  return <><PageTitle eyebrow="Workspace" title="Team management" description="Manage roles, ownership and access for your workspace." action={<Button className="primary-pill" onClick={() => setInvite(true)}><UserPlus />Invite member</Button>} /><div className="team-grid">{members.map((m) => <article className="member-card" key={m.email}><Avatar initials={m.initials} color={m.color} size="lg" /><h3>{m.name}</h3><p>{m.email}</p><span className="role-pill">{m.role}</span><div><span><strong>{m.leads}</strong> leads</span><span>{m.active}</span></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full">Manage<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Change role</DropdownMenuItem><DropdownMenuItem>Reassign leads</DropdownMenuItem><DropdownMenuItem className="text-destructive">Remove access</DropdownMenuItem></DropdownMenuContent></DropdownMenu></article>)}</div><Dialog open={invite} onOpenChange={setInvite}><DialogContent className="hub-dialog"><DialogHeader><DialogTitle>Invite a teammate</DialogTitle><DialogDescription>They’ll see the leads and conversations their role allows.</DialogDescription></DialogHeader><form className="lead-form single" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); const email = String(d.get("email")); setMembers((m) => [...m, { name: email.split("@")[0], initials: email.slice(0, 2).toUpperCase(), role: String(d.get("role")), email, active: "Invite pending", leads: 0, color: "avatar-sky" }]); setInvite(false); toast.success(`Invite prepared for ${email}`); }}><label>Email address<Input name="email" type="email" required placeholder="teammate@buildicy.com" /></label><label>Role<select name="role"><option>Account executive</option><option>Sales lead</option><option>Admin</option></select></label><Button className="primary-pill">Send invite</Button></form></DialogContent></Dialog></>;
}