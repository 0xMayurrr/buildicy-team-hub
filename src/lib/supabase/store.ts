import { useEffect, useState } from "react";
import type {
  UserProfile,
  UserRole,
  Lead,
  LeadStatus,
  LeadPotential,
  LeadActivity,
  LeadDiscussion,
  ChatMessage,
  NotificationItem,
  DailyTask,
  WorkingStatus,
  OutreachChannel,
  ProspectResponse,
  LeadOutreachInteraction,
  DailyWorkUpdate,
  MemberPerformanceMetrics,
} from "./types";
import { supabase, getSupabaseConfig } from "./client";

// Credentials for Founder and Marketing Team
export const CREDENTIALS: Record<
  string,
  {
    pass: string;
    role: UserRole;
    name: string;
    initials: string;
    color: string;
    title: string;
    workingStatus: WorkingStatus;
    avatarUrl: string;
  }
> = {
  "founder@buildicy.com": {
    pass: "Buildicy@2026",
    role: "founder",
    name: "Heyy Founder",
    initials: "HF",
    color: "avatar-lilac",
    title: "Founder & CEO",
    workingStatus: "Outreach",
  },
  "ganesh.marketing@buildicy.com": {
    pass: "GaneshBuildicy@2026",
    role: "member",
    name: "Ganesh",
    initials: "GM",
    color: "avatar-peach",
    title: "Marketing Lead",
    workingStatus: "Outreach",
    avatarUrl: "/avatars/3d-avatar-1.jpg",
  },
  "dhruv.marketing@buildicy.com": {
    pass: "DhruvBuildicy@2026",
    role: "member",
    name: "Dhruv",
    initials: "DM",
    color: "avatar-sage",
    title: "Growth Marketing",
    workingStatus: "Researching",
    avatarUrl: "/avatars/3d-avatar-3.jpg",
  },
  "padma.amarketing@buildicy.com": {
    pass: "PadmaBuildicy@2026",
    role: "member",
    name: "Padma",
    initials: "PM",
    color: "avatar-rose",
    title: "Content & Inbound",
    workingStatus: "Follow-ups",
    avatarUrl: "/avatars/3d-avatar-2.jpg",
  },
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "founder@buildicy.com",
    name: "Heyy Founder",
    role: "founder",
    title: "Founder & CEO",
    department: "Leadership",
    initials: "HF",
    color: "avatar-lilac",
    activeStatus: "Active now",
    workingStatus: "Outreach",
    statusUpdatedAt: new Date().toISOString(),
    avatarUrl: "",
    avatarChosen: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "ganesh.marketing@buildicy.com",
    name: "Ganesh",
    role: "member",
    title: "Marketing Lead",
    department: "Marketing",
    initials: "GM",
    color: "avatar-peach",
    activeStatus: "Active now",
    workingStatus: "Outreach",
    statusUpdatedAt: new Date().toISOString(),
    avatarUrl: "/avatars/3d-avatar-1.jpg",
    avatarChosen: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "dhruv.marketing@buildicy.com",
    name: "Dhruv",
    role: "member",
    title: "Growth Marketing",
    department: "Marketing",
    initials: "DM",
    color: "avatar-sage",
    activeStatus: "Active now",
    workingStatus: "Researching",
    statusUpdatedAt: new Date().toISOString(),
    avatarUrl: "/avatars/3d-avatar-3.jpg",
    avatarChosen: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "padma.amarketing@buildicy.com",
    name: "Padma",
    role: "member",
    title: "Content & Inbound",
    department: "Marketing",
    initials: "PM",
    color: "avatar-rose",
    activeStatus: "Active now",
    workingStatus: "Follow-ups",
    statusUpdatedAt: new Date().toISOString(),
    avatarUrl: "/avatars/3d-avatar-2.jpg",
    avatarChosen: false,
  },
];

// Clean fresh database state — 0 mock leads
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_ACTIVITIES: LeadActivity[] = [];
export const INITIAL_DISCUSSIONS: Record<string, LeadDiscussion[]> = {};
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_OUTREACH: LeadOutreachInteraction[] = [];
export const INITIAL_DAILY_UPDATES: DailyWorkUpdate[] = [];

export const INITIAL_CHAT: Record<string, ChatMessage[]> = {};
export const INITIAL_CHANNELS: ChatChannel[] = [];

export const INITIAL_TASKS: Record<string, DailyTask[]> = {};

// Automatic one-time wipe of old mock data in client browser
if (typeof window !== "undefined") {
  localStorage.removeItem("buildicy_tasks");
  const isFreshV6 = localStorage.getItem("buildicy_fresh_v6");
  if (!isFreshV6) {
    localStorage.removeItem("buildicy_chat");
    localStorage.removeItem("buildicy_channels");
    localStorage.setItem("buildicy_fresh_v6", "true");
  }
}

// Cookie storage helpers for persistent session across refreshes
export const CookieAuth = {
  set: (name: string, value: string, days = 30) => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },
  get: (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[2]) : null;
  },
  remove: (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },
};

const getStored = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("buildicy_storage_update"));
  } catch (err) {
    console.error("Storage write error:", err);
  }
};

export const HubStore = {
  getCurrentUser: (): UserProfile | null => {
    let user: UserProfile | null = null;
    const fromCookie = CookieAuth.get("buildicy_session_user");
    if (fromCookie) {
      try {
        const parsed = JSON.parse(fromCookie);
        if (parsed && parsed.email) user = parsed;
      } catch {}
    }
    if (!user) {
      user = getStored<UserProfile | null>("buildicy_auth_user", null);
    }
    if (user && user.email === "founder@buildicy.com") {
      user = { ...user, name: "Heyy Founder", initials: "HF", avatarUrl: "", avatarChosen: true };
      CookieAuth.set("buildicy_session_user", JSON.stringify(user));
      setStored("buildicy_auth_user", user);
    }
    return user;
  },

  setCurrentUser: (user: UserProfile | null) => {
    if (user) {
      CookieAuth.set("buildicy_session_user", JSON.stringify(user));
      setStored("buildicy_auth_user", user);
    } else {
      CookieAuth.remove("buildicy_session_user");
      setStored("buildicy_auth_user", null);
    }
  },

  updateUserAvatar: (userId: string, avatarUrl: string) => {
    const users = HubStore.getUsers();
    const updated = users.map((u) =>
      u.id === userId ? { ...u, avatarUrl, avatarChosen: true } : u,
    );
    setStored("buildicy_users", updated);

    const cur = HubStore.getCurrentUser();
    if (cur && cur.id === userId) {
      HubStore.setCurrentUser({ ...cur, avatarUrl, avatarChosen: true });
    }

    supabase.update("profiles", `id=eq.${userId}`, { avatar_url: avatarUrl });
  },

  login: async (email: string, pass: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cred = CREDENTIALS[cleanEmail];
    if (!cred || cred.pass !== pass.trim()) {
      return { success: false, error: "Invalid email or password. Please verify your credentials." };
    }

    // Attempt real Supabase Auth
    await supabase.signInWithPassword(cleanEmail, pass.trim());

    const allUsers = HubStore.getUsers();
    let profile = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!profile) {
      profile = {
        id: `00000000-0000-0000-0000-00000000000${allUsers.length + 1}`,
        email: cleanEmail,
        name: cred.name,
        role: cred.role,
        title: cred.title,
        department: "Marketing",
        initials: cred.initials,
        color: cred.color,
        activeStatus: "Active now",
        workingStatus: cred.workingStatus || "Outreach",
        avatarUrl: cred.avatarUrl || "/avatars/avatar-1.svg",
        avatarChosen: false,
        statusUpdatedAt: new Date().toISOString(),
      };
      setStored("buildicy_users", [...allUsers, profile]);
    } else if (cleanEmail === "founder@buildicy.com" && profile.name !== "Heyy Founder") {
      profile = { ...profile, name: "Heyy Founder", initials: "HF" };
      setStored(
        "buildicy_users",
        allUsers.map((u) => (u.id === profile?.id ? profile! : u)),
      );
    }

    HubStore.setCurrentUser(profile);
    HubStore.syncFromSupabase();

    return { success: true, user: profile };
  },

  logout: () => {
    supabase.setToken(null);
    HubStore.setCurrentUser(null);
  },

  // Pull real remote data from Supabase PostgreSQL tables
  syncFromSupabase: async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    try {
      const remoteLeads = await supabase.select<any>("leads", "order=created_at.desc");
      if (remoteLeads) {
        const mapped: Lead[] = remoteLeads.map((r: any) => ({
          id: r.id,
          name: r.name,
          company: r.company,
          email: r.email,
          phone: r.phone || "Not added",
          source: r.source || "Website",
          value: Number(r.value) || 0,
          status: r.status as LeadStatus,
          ownerId: r.assigned_to || "",
          ownerName: r.owner_name || "Team Member",
          initials: r.initials || "LD",
          color: r.color || "avatar-lilac",
          updated: "Just now",
          createdAt: r.created_at || new Date().toISOString(),
          qualityPotential: (r.quality_potential || "Medium potential") as LeadPotential,
          promisingReason: r.promising_reason || "",
          nextFollowupDate: r.next_followup_date || undefined,
          lastOutreachAt: r.last_outreach_at || undefined,
          lastOutreachChannel: r.last_outreach_channel || undefined,
        }));
        setStored("buildicy_leads", mapped);
      }

      const remoteActivities = await supabase.select<any>("lead_activities", "order=created_at.desc&limit=50");
      if (remoteActivities) {
        const mappedAct: LeadActivity[] = remoteActivities.map((a: any) => ({
          id: a.id,
          leadId: a.lead_id,
          userId: a.user_id,
          person: a.person_name,
          initials: a.initials,
          color: a.color,
          action: a.action,
          subject: a.subject,
          detail: a.detail,
          time: "Just now",
          type: a.activity_type || "note",
          createdAt: a.created_at,
        }));
        setStored("buildicy_activities", mappedAct);
      }

      const remoteOutreach = await supabase.select<any>("lead_outreach", "order=created_at.desc&limit=200");
      if (remoteOutreach) {
        const mappedOutreach: LeadOutreachInteraction[] = remoteOutreach.map((o: any) => ({
          id: o.id,
          leadId: o.lead_id,
          userId: o.user_id,
          userName: o.user_name,
          userInitials: o.user_initials,
          userColor: o.user_color,
          channel: o.channel as OutreachChannel,
          notes: o.notes,
          prospectResponse: o.prospect_response as ProspectResponse,
          isPositive: Boolean(o.is_positive),
          statusAtTime: o.status_at_time as LeadStatus,
          nextFollowupDate: o.next_followup_date || undefined,
          createdAt: o.created_at,
        }));
        setStored("buildicy_outreach", mappedOutreach);
      }

      const remoteDaily = await supabase.select<any>("daily_work_updates", "order=created_at.desc&limit=100");
      if (remoteDaily) {
        const mappedDaily: DailyWorkUpdate[] = remoteDaily.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          userName: d.user_name,
          userInitials: d.user_initials,
          userColor: d.user_color,
          date: d.date,
          workingStatus: d.working_status as WorkingStatus,
          newLeadsCount: Number(d.new_leads_count) || 0,
          emailOutreachCount: Number(d.email_outreach_count) || 0,
          whatsappOutreachCount: Number(d.whatsapp_outreach_count) || 0,
          callOutreachCount: Number(d.call_outreach_count) || 0,
          totalOutreachCount: Number(d.total_outreach_count) || 0,
          responsesReceivedCount: Number(d.responses_received_count) || 0,
          positiveResponsesCount: Number(d.positive_responses_count) || 0,
          meetingsBookedCount: Number(d.meetings_booked_count) || 0,
          proposalsRequestedCount: Number(d.proposals_requested_count) || 0,
          completedFollowupsCount: Number(d.completed_followups_count) || 0,
          pendingFollowupsCount: Number(d.pending_followups_count) || 0,
          achievements: d.achievements || "",
          challenges: d.challenges || "",
          tomorrowPriorities: d.tomorrow_priorities || "",
          createdAt: d.created_at,
        }));
        setStored("buildicy_daily_updates", mappedDaily);
      }

      const remoteChannels = await supabase.select<any>("chat_channels", "order=created_at.asc");
      if (remoteChannels && remoteChannels.length > 0) {
        const legacyMockNames = ["marketing", "sales-team", "wins", "general"];
        const mappedChannels: ChatChannel[] = remoteChannels
          .filter((c: any) => c && c.name && !legacyMockNames.includes(String(c.name).toLowerCase()))
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            isGroup: Boolean(c.is_group),
            description: c.description || "",
            memberIds: Array.isArray(c.member_ids) ? c.member_ids : [],
            createdBy: c.created_by,
            createdAt: c.created_at,
          }));
        setStored("buildicy_channels", mappedChannels);
      }

      const remoteMessages = await supabase.select<any>("chat_messages", "order=created_at.asc&limit=300");
      if (remoteMessages && remoteMessages.length > 0) {
        const chatMap: Record<string, ChatMessage[]> = {};
        remoteMessages.forEach((m: any) => {
          const chId = m.channel_id;
          if (!chId) return;
          if (!chatMap[chId]) chatMap[chId] = [];
          chatMap[chId].push({
            id: m.id,
            channelId: chId,
            userId: m.user_id || "",
            author: m.author,
            initials: m.initials,
            color: m.color || "avatar-peach",
            text: m.text,
            time: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Just now",
            createdAt: m.created_at,
          });
        });
        setStored("buildicy_chat", chatMap);
      }
    } catch (err) {
      console.warn("Supabase background sync:", err);
    }
  },

  getUsers: (): UserProfile[] => {
    const list = getStored<UserProfile[]>("buildicy_users", INITIAL_USERS);
    const defaultAvatars: Record<string, string> = {
      "founder@buildicy.com": "",
      "ganesh.marketing@buildicy.com": "/avatars/3d-avatar-1.jpg",
      "dhruv.marketing@buildicy.com": "/avatars/3d-avatar-3.jpg",
      "padma.amarketing@buildicy.com": "/avatars/3d-avatar-2.jpg",
    };
    return list.map((u) => {
      let updated = { ...u };
      if (updated.email === "founder@buildicy.com") {
        updated.name = "Heyy Founder";
        updated.initials = "HF";
        updated.avatarUrl = "";
        updated.avatarChosen = true;
      } else {
        // Automatically upgrade any legacy SVG avatar or empty avatar to real 3D Pixar avatar
        if (!updated.avatarUrl || updated.avatarUrl.includes(".svg")) {
          updated.avatarUrl = defaultAvatars[updated.email] || "/avatars/3d-avatar-1.jpg";
        }
      }
      return updated;
    });
  },

  updateUserWorkingStatus: (userId: string, status: WorkingStatus) => {
    const users = HubStore.getUsers();
    const now = new Date().toISOString();
    const updated = users.map((u) =>
      u.id === userId ? { ...u, workingStatus: status, statusUpdatedAt: now } : u,
    );
    setStored("buildicy_users", updated);

    // Update active user in cookie / session if it's the current user
    const cur = HubStore.getCurrentUser();
    if (cur && cur.id === userId) {
      HubStore.setCurrentUser({ ...cur, workingStatus: status, statusUpdatedAt: now });
    }

    // Persist to Supabase profiles
    supabase.update("profiles", `id=eq.${userId}`, {
      working_status: status,
      status_updated_at: now,
    });
  },

  getLeads: (): Lead[] => {
    return getStored<Lead[]>("buildicy_leads", INITIAL_LEADS);
  },

  addLead: (leadData: Omit<Lead, "id" | "createdAt" | "updated">): Lead => {
    const leads = HubStore.getLeads();
    const id = `LD-${1000 + Math.floor(Math.random() * 9000)}`;
    const newLead: Lead = {
      ...leadData,
      id,
      qualityPotential: leadData.qualityPotential || "Medium potential",
      promisingReason: leadData.promisingReason || "",
      updated: "Just now",
      createdAt: new Date().toISOString(),
    };
    setStored("buildicy_leads", [newLead, ...leads]);

    // Push to Supabase PostgreSQL table
    supabase.insert("leads", {
      id,
      name: newLead.name,
      company: newLead.company,
      email: newLead.email,
      phone: newLead.phone,
      source: newLead.source,
      value: newLead.value,
      status: newLead.status,
      quality_potential: newLead.qualityPotential,
      promising_reason: newLead.promisingReason,
      next_followup_date: newLead.nextFollowupDate || null,
      assigned_to: newLead.ownerId.startsWith("usr-") ? null : newLead.ownerId,
      owner_name: newLead.ownerName,
      initials: newLead.initials,
      color: newLead.color,
    });

    const user = HubStore.getCurrentUser();
    HubStore.addActivity({
      leadId: id,
      userId: user?.id ?? "unknown",
      person: user?.name ?? "Team member",
      initials: user?.initials ?? "TM",
      color: user?.color ?? "avatar-lilac",
      action: "created lead",
      subject: newLead.name,
      detail: `from ${newLead.source} (${newLead.company})`,
      time: "Just now",
      type: "lead",
    });

    HubStore.addNotification({
      title: `New lead created: ${newLead.name}`,
      body: `${newLead.company} · assigned to ${newLead.ownerName}`,
      leadId: id,
      time: "Just now",
      userId: "all",
    });

    return newLead;
  },

  updateLeadStatus: (leadId: string, newStatus: LeadStatus) => {
    const leads = HubStore.getLeads();
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    const oldStatus = target.status;
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status: newStatus, updated: "Just now" } : l));
    setStored("buildicy_leads", updated);

    // Update in Supabase
    supabase.update("leads", `id=eq.${leadId}`, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    const user = HubStore.getCurrentUser();
    HubStore.addActivity({
      leadId,
      userId: user?.id ?? "unknown",
      person: user?.name ?? "Team member",
      initials: user?.initials ?? "TM",
      color: user?.color ?? "avatar-lilac",
      action: "moved",
      subject: target.name,
      detail: `from ${oldStatus} to ${newStatus}`,
      time: "Just now",
      type: "status",
    });

    HubStore.addNotification({
      title: `${target.name} stage updated`,
      body: `Status changed to ${newStatus} by ${user?.name ?? "teammate"}`,
      leadId,
      time: "Just now",
      userId: "all",
    });
  },

  updateLeadQuality: (leadId: string, potential: LeadPotential, promisingReason?: string) => {
    const leads = HubStore.getLeads();
    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            qualityPotential: potential,
            promisingReason: promisingReason !== undefined ? promisingReason : l.promisingReason,
            updated: "Just now",
          }
        : l,
    );
    setStored("buildicy_leads", updated);

    supabase.update("leads", `id=eq.${leadId}`, {
      quality_potential: potential,
      promising_reason: promisingReason || "",
      updated_at: new Date().toISOString(),
    });
  },

  updateLeadFollowup: (leadId: string, nextFollowupDate: string) => {
    const leads = HubStore.getLeads();
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, nextFollowupDate, updated: "Just now" } : l,
    );
    setStored("buildicy_leads", updated);

    supabase.update("leads", `id=eq.${leadId}`, {
      next_followup_date: nextFollowupDate,
      updated_at: new Date().toISOString(),
    });
  },

  reassignLead: (leadId: string, newOwner: UserProfile) => {
    const leads = HubStore.getLeads();
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, ownerId: newOwner.id, ownerName: newOwner.name, updated: "Just now" } : l,
    );
    setStored("buildicy_leads", updated);

    supabase.update("leads", `id=eq.${leadId}`, {
      assigned_to: newOwner.id.startsWith("usr-") ? null : newOwner.id,
      owner_name: newOwner.name,
      updated_at: new Date().toISOString(),
    });

    const user = HubStore.getCurrentUser();
    HubStore.addActivity({
      leadId,
      userId: user?.id ?? "unknown",
      person: user?.name ?? "Team member",
      initials: user?.initials ?? "TM",
      color: user?.color ?? "avatar-lilac",
      action: "reassigned",
      subject: target.name,
      detail: `to ${newOwner.name}`,
      time: "Just now",
      type: "note",
    });

    HubStore.addNotification({
      title: `Lead reassigned to ${newOwner.name}`,
      body: `${target.name} (${target.company}) assigned by ${user?.name ?? "Founder"}`,
      leadId,
      time: "Just now",
      userId: newOwner.id,
    });
  },

  getActivities: (leadId?: string): LeadActivity[] => {
    const all = getStored<LeadActivity[]>("buildicy_activities", INITIAL_ACTIVITIES);
    if (leadId) {
      return all.filter((a) => a.leadId === leadId);
    }
    return all;
  },

  addActivity: (act: Omit<LeadActivity, "id" | "createdAt">) => {
    const all = HubStore.getActivities();
    const newAct: LeadActivity = {
      ...act,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setStored("buildicy_activities", [newAct, ...all]);

    supabase.insert("lead_activities", {
      lead_id: act.leadId,
      person_name: act.person,
      initials: act.initials,
      color: act.color,
      action: act.action,
      subject: act.subject,
      detail: act.detail,
      activity_type: act.type,
    });
  },

  // ==========================================
  // OUTREACH INTERACTION HISTORY
  // ==========================================
  getOutreach: (leadId?: string): LeadOutreachInteraction[] => {
    const all = getStored<LeadOutreachInteraction[]>("buildicy_outreach", INITIAL_OUTREACH);
    if (leadId) {
      return all.filter((o) => o.leadId === leadId);
    }
    return all;
  },

  addOutreach: (
    data: Omit<LeadOutreachInteraction, "id" | "createdAt" | "isPositive"> & { isPositive?: boolean },
  ): LeadOutreachInteraction => {
    const all = HubStore.getOutreach();
    const isPositive =
      data.isPositive !== undefined
        ? data.isPositive
        : ["Positive response", "Interested - Needs info", "Meeting booked", "Proposal requested"].includes(
            data.prospectResponse,
          );

    const now = new Date().toISOString();
    const newInteraction: LeadOutreachInteraction = {
      ...data,
      id: `outreach-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isPositive,
      createdAt: now,
    };

    setStored("buildicy_outreach", [newInteraction, ...all]);

    // Update lead's last outreach timestamp and next follow-up date
    const leads = HubStore.getLeads();
    const updatedLeads = leads.map((l) =>
      l.id === data.leadId
        ? {
            ...l,
            status: data.statusAtTime,
            lastOutreachAt: now,
            lastOutreachChannel: data.channel,
            nextFollowupDate: data.nextFollowupDate || l.nextFollowupDate,
            updated: "Just now",
          }
        : l,
    );
    setStored("buildicy_leads", updatedLeads);

    // Also record an activity entry for the global/lead timeline
    HubStore.addActivity({
      leadId: data.leadId,
      userId: data.userId,
      person: data.userName,
      initials: data.userInitials,
      color: data.userColor,
      action: `logged ${data.channel} outreach:`,
      subject: data.prospectResponse,
      detail: data.notes,
      time: "Just now",
      type: "outreach",
    });

    // Sync to Supabase
    supabase.insert("lead_outreach", {
      lead_id: data.leadId,
      user_id: data.userId.startsWith("usr-") ? null : data.userId,
      user_name: data.userName,
      user_initials: data.userInitials,
      user_color: data.userColor,
      channel: data.channel,
      notes: data.notes,
      prospect_response: data.prospectResponse,
      is_positive: isPositive,
      status_at_time: data.statusAtTime,
      next_followup_date: data.nextFollowupDate || null,
    });

    supabase.update("leads", `id=eq.${data.leadId}`, {
      status: data.statusAtTime,
      last_outreach_at: now,
      last_outreach_channel: data.channel,
      next_followup_date: data.nextFollowupDate || null,
      updated_at: now,
    });

    return newInteraction;
  },

  // ==========================================
  // DAILY WORK UPDATES
  // ==========================================
  getDailyUpdates: (userId?: string): DailyWorkUpdate[] => {
    const all = getStored<DailyWorkUpdate[]>("buildicy_daily_updates", INITIAL_DAILY_UPDATES);
    if (userId) {
      return all.filter((u) => u.userId === userId);
    }
    return all;
  },

  submitDailyUpdate: (data: Omit<DailyWorkUpdate, "id" | "createdAt">): DailyWorkUpdate => {
    const all = HubStore.getDailyUpdates();
    const today = new Date().toISOString().slice(0, 10);
    const existingIdx = all.findIndex((u) => u.userId === data.userId && u.date === today);

    const now = new Date().toISOString();
    const newUpdate: DailyWorkUpdate = {
      ...data,
      id: existingIdx >= 0 ? all[existingIdx].id : `update-${Date.now()}`,
      date: today,
      createdAt: now,
    };

    let updatedList: DailyWorkUpdate[];
    if (existingIdx >= 0) {
      updatedList = [...all];
      updatedList[existingIdx] = newUpdate;
    } else {
      updatedList = [newUpdate, ...all];
    }
    setStored("buildicy_daily_updates", updatedList);

    // Update member's working status
    HubStore.updateUserWorkingStatus(data.userId, data.workingStatus);

    // Add activity & notification
    HubStore.addNotification({
      title: `${data.userName} submitted daily update`,
      body: `Status: ${data.workingStatus} · ${data.totalOutreachCount} outreach attempts logged today`,
      time: "Just now",
      userId: "all",
    });

    // Sync to Supabase
    supabase.insert("daily_work_updates", {
      user_id: data.userId.startsWith("usr-") ? null : data.userId,
      user_name: data.userName,
      user_initials: data.userInitials,
      user_color: data.userColor,
      date: today,
      working_status: data.workingStatus,
      new_leads_count: data.newLeadsCount,
      email_outreach_count: data.emailOutreachCount,
      whatsapp_outreach_count: data.whatsappOutreachCount,
      call_outreach_count: data.callOutreachCount,
      total_outreach_count: data.totalOutreachCount,
      responses_received_count: data.responsesReceivedCount,
      positive_responses_count: data.positiveResponsesCount,
      meetings_booked_count: data.meetingsBookedCount,
      proposals_requested_count: data.proposalsRequestedCount,
      completed_followups_count: data.completedFollowupsCount,
      pending_followups_count: data.pendingFollowupsCount,
      achievements: data.achievements,
      challenges: data.challenges,
      tomorrow_priorities: data.tomorrowPriorities,
    });

    return newUpdate;
  },

  // ==========================================
  // AUTOMATIC REPORTING & PERFORMANCE METRICS
  // ==========================================
  getMemberPerformanceMetrics: (
    userId: string,
    timeframe: "today" | "week" | "month" | "all" = "all",
  ): MemberPerformanceMetrics => {
    const users = HubStore.getUsers();
    const member = users.find((u) => u.id === userId) || INITIAL_USERS[0];
    const leads = HubStore.getLeads();
    const outreach = HubStore.getOutreach();
    const dailyUpdates = HubStore.getDailyUpdates(userId);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now.getTime() - 7 * 864e5);
    const startOfMonth = new Date(now.getTime() - 30 * 864e5);

    const isWithinTimeframe = (dateStr?: string) => {
      if (!dateStr) return false;
      if (timeframe === "all") return true;
      const d = new Date(dateStr);
      if (timeframe === "today") {
        return dateStr.slice(0, 10) === todayStr;
      }
      if (timeframe === "week") {
        return d >= startOfWeek;
      }
      if (timeframe === "month") {
        return d >= startOfMonth;
      }
      return true;
    };

    // Filter leads owned by member within timeframe
    const memberName = (member?.name || "").toLowerCase();
    const memberLeads = leads.filter(
      (l) => Boolean(l) && (l.ownerId === userId || (l.ownerName || "").toLowerCase().includes(memberName)),
    );
    const timeframeLeads = memberLeads.filter((l) => isWithinTimeframe(l.createdAt));

    // Filter outreach interactions by this member within timeframe
    const memberOutreach = outreach.filter(
      (o) =>
        Boolean(o) &&
        (o.userId === userId || (o.userName || "").toLowerCase().includes(memberName)) &&
        isWithinTimeframe(o.createdAt),
    );

    // DEDUPLICATED METRICS (Requirement 6)
    const uniqueBusinessesContacted = new Set(
      memberOutreach.map((o) => o.leadId).filter(Boolean),
    ).size;
    const totalOutreachAttempts = memberOutreach.length;
    const emailOutreach = memberOutreach.filter((o) => o.channel === "Email").length;
    const whatsappOutreach = memberOutreach.filter((o) => o.channel === "WhatsApp").length;
    const callOutreach = memberOutreach.filter((o) => o.channel === "Call").length;
    const otherOutreach = memberOutreach.filter((o) => !["Email", "WhatsApp", "Call"].includes(o.channel)).length;

    const responsesReceived = memberOutreach.filter(
      (o) => Boolean(o.prospectResponse) && o.prospectResponse !== "No response yet",
    ).length;
    const positiveResponses = memberOutreach.filter((o) => Boolean(o.isPositive)).length;
    const meetingsBooked = memberOutreach.filter(
      (o) => o.prospectResponse === "Meeting booked" || o.channel === "Meeting",
    ).length;
    const proposalsRequested = memberOutreach.filter(
      (o) => o.prospectResponse === "Proposal requested" || o.statusAtTime === "Proposal",
    ).length;

    const convertedWonLeads = memberLeads.filter((l) => l.status === "Won").length;
    const lostLeads = memberLeads.filter((l) => l.status === "Lost").length;

    // Follow-ups
    const pendingFollowups = memberLeads.filter(
      (l) => Boolean(l.nextFollowupDate) && !["Won", "Lost"].includes(l.status),
    ).length;
    const completedFollowups = memberOutreach.filter(
      (o) => (o.notes || "").toLowerCase().includes("follow") || o.channel === "Call",
    ).length;

    // Rates
    const responseRatePct =
      totalOutreachAttempts > 0 ? Math.round((responsesReceived / totalOutreachAttempts) * 100) : 0;
    const positiveRatePct =
      responsesReceived > 0 ? Math.round((positiveResponses / responsesReceived) * 100) : 0;
    const meetingConversionRatePct =
      uniqueBusinessesContacted > 0 ? Math.round((meetingsBooked / uniqueBusinessesContacted) * 100) : 0;
    const followupTotal = pendingFollowups + completedFollowups;
    const followupCompletionRatePct =
      followupTotal > 0 ? Math.round((completedFollowups / followupTotal) * 100) : 100;

    const wonValue = memberLeads.filter((l) => l.status === "Won").reduce((s, l) => s + (Number(l.value) || 0), 0);
    const pipelineValue = memberLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);

    const latestOutreach = memberOutreach[0]?.createdAt;
    const latestDaily = dailyUpdates.filter((d) => d.userId === userId)[0]?.createdAt;

    return {
      userId: member.id,
      userName: member.name,
      userTitle: member.title,
      userInitials: member.initials,
      userColor: member.color,
      workingStatus: member.workingStatus || "Outreach",
      statusUpdatedAt: member.statusUpdatedAt || "Just now",
      leadsGenerated: timeframeLeads.length,
      uniqueBusinessesContacted,
      totalOutreachAttempts,
      emailOutreach,
      whatsappOutreach,
      callOutreach,
      otherOutreach,
      responsesReceived,
      positiveResponses,
      meetingsBooked,
      proposalsRequested,
      convertedWonLeads,
      lostLeads,
      pendingFollowups,
      completedFollowups,
      responseRatePct,
      positiveRatePct,
      meetingConversionRatePct,
      followupCompletionRatePct,
      wonValue,
      pipelineValue,
      lastOutreachTimestamp: latestOutreach,
      lastUpdateTimestamp: latestDaily,
    };
  },

  getTeamPerformanceMetrics: (timeframe: "today" | "week" | "month" | "all" = "all") => {
    const users = HubStore.getUsers() || [];
    // Exclude founder: team metrics reflect actual marketing reps (Ganesh, Dhruv, Padma)
    const teamMembers = users.filter((u) => u && u.role !== "founder");
    const metrics = teamMembers.map((u) => HubStore.getMemberPerformanceMetrics(u.id, timeframe));

    const totals = {
      leadsGenerated: metrics.reduce((s, m) => s + (Number(m.leadsGenerated) || 0), 0),
      uniqueBusinessesContacted: metrics.reduce((s, m) => s + (Number(m.uniqueBusinessesContacted) || 0), 0),
      totalOutreachAttempts: metrics.reduce((s, m) => s + (Number(m.totalOutreachAttempts) || 0), 0),
      emailOutreach: metrics.reduce((s, m) => s + (Number(m.emailOutreach) || 0), 0),
      whatsappOutreach: metrics.reduce((s, m) => s + (Number(m.whatsappOutreach) || 0), 0),
      callOutreach: metrics.reduce((s, m) => s + (Number(m.callOutreach) || 0), 0),
      responsesReceived: metrics.reduce((s, m) => s + (Number(m.responsesReceived) || 0), 0),
      positiveResponses: metrics.reduce((s, m) => s + (Number(m.positiveResponses) || 0), 0),
      meetingsBooked: metrics.reduce((s, m) => s + (Number(m.meetingsBooked) || 0), 0),
      proposalsRequested: metrics.reduce((s, m) => s + (Number(m.proposalsRequested) || 0), 0),
      convertedWonLeads: metrics.reduce((s, m) => s + (Number(m.convertedWonLeads) || 0), 0),
      lostLeads: metrics.reduce((s, m) => s + (Number(m.lostLeads) || 0), 0),
      pendingFollowups: metrics.reduce((s, m) => s + (Number(m.pendingFollowups) || 0), 0),
      wonValue: metrics.reduce((s, m) => s + (Number(m.wonValue) || 0), 0),
      pipelineValue: metrics.reduce((s, m) => s + (Number(m.pipelineValue) || 0), 0),
      avgResponseRatePct:
        metrics.length > 0
          ? Math.round(metrics.reduce((s, m) => s + (Number(m.responseRatePct) || 0), 0) / metrics.length)
          : 0,
      avgMeetingRatePct:
        metrics.length > 0
          ? Math.round(metrics.reduce((s, m) => s + (Number(m.meetingConversionRatePct) || 0), 0) / metrics.length)
          : 0,
    };

    return { metrics, totals };
  },

  getDiscussions: (leadId: string): LeadDiscussion[] => {
    const all = getStored<Record<string, LeadDiscussion[]>>("buildicy_discussions", INITIAL_DISCUSSIONS);
    return all[leadId] ?? [];
  },

  addDiscussion: (leadId: string, text: string): LeadDiscussion | null => {
    const user = HubStore.getCurrentUser();
    if (!user) return null;
    const all = getStored<Record<string, LeadDiscussion[]>>("buildicy_discussions", INITIAL_DISCUSSIONS);
    const existing = all[leadId] ?? [];
    const newDisc: LeadDiscussion = {
      id: `disc-${Date.now()}`,
      leadId,
      userId: user.id,
      author: user.name,
      initials: user.initials,
      color: user.color,
      text: text.trim(),
      time: "Just now",
      createdAt: new Date().toISOString(),
    };
    all[leadId] = [...existing, newDisc];
    setStored("buildicy_discussions", all);

    supabase.insert("lead_discussions", {
      lead_id: leadId,
      author: user.name,
      initials: user.initials,
      color: user.color,
      text: text.trim(),
    });

    return newDisc;
  },

  getChannels: (): ChatChannel[] => {
    const list = getStored<ChatChannel[]>("buildicy_channels", INITIAL_CHANNELS);
    // Legacy mock channel names to purge completely across all members & founder
    const legacyMockNames = ["marketing", "sales-team", "wins", "general"];
    const filtered = list.filter(
      (c) => c && c.name && !legacyMockNames.includes(c.name.trim().toLowerCase()),
    );
    if (filtered.length !== list.length) {
      setStored("buildicy_channels", filtered);
      const allChat = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
      legacyMockNames.forEach((n) => {
        delete allChat[n];
      });
      setStored("buildicy_chat", allChat);
    }
    return filtered;
  },

  createChannel: (data: { name: string; description?: string; memberIds: string[] }): ChatChannel | null => {
    const user = HubStore.getCurrentUser();
    if (!user) return null;

    const rawName = data.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
    const cleanName = rawName || `group-${Date.now().toString().slice(-4)}`;
    const channelId = `grp-${Date.now()}`;
    const allMembers = Array.from(new Set([...data.memberIds, user.id]));

    const newChannel: ChatChannel = {
      id: channelId,
      name: cleanName,
      isGroup: true,
      description: data.description?.trim() || "",
      memberIds: allMembers,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    const current = HubStore.getChannels();
    const updated = [...current, newChannel];
    setStored("buildicy_channels", updated);

    supabase.insert("chat_channels", {
      id: newChannel.id,
      name: newChannel.name,
      is_group: true,
      description: newChannel.description,
      member_ids: newChannel.memberIds,
      created_by: user.id,
    });

    // Send an initial announcement message
    HubStore.sendChatMessage(
      channelId,
      `Channel #${newChannel.name} created by ${user.name}. Start collaborating!`,
    );

    return newChannel;
  },

  deleteChannel: (channelId: string) => {
    const current = HubStore.getChannels();
    const updated = current.filter((c) => c.id !== channelId);
    setStored("buildicy_channels", updated);

    supabase.delete("chat_channels", `id=eq.${channelId}`);
  },

  getDmChannelId: (userAId: string, userBId: string): string => {
    return `dm_${[userAId, userBId].sort().join("_")}`;
  },

  getChat: (channelId: string): ChatMessage[] => {
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
    return all[channelId] ?? [];
  },

  sendChatMessage: (channelId: string, text: string): ChatMessage | null => {
    const user = HubStore.getCurrentUser();
    if (!user) return null;
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
    const existing = all[channelId] ?? [];
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedTime = `${hours % 12 || 12}:${minutes} ${ampm}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelId,
      userId: user.id,
      author: user.name,
      initials: user.initials,
      color: user.color,
      text: text.trim(),
      time: formattedTime,
      createdAt: now.toISOString(),
    };
    all[channelId] = [...existing, newMsg];
    setStored("buildicy_chat", all);

    supabase.insert("chat_messages", {
      channel_id: channelId,
      user_id: user.id,
      author: user.name,
      initials: user.initials,
      color: user.color,
      text: text.trim(),
    });

    return newMsg;
  },

  getNotifications: (): NotificationItem[] => {
    return getStored<NotificationItem[]>("buildicy_notifications", INITIAL_NOTIFICATIONS);
  },

  addNotification: (notif: Omit<NotificationItem, "id" | "isRead" | "createdAt">) => {
    const all = HubStore.getNotifications();
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setStored("buildicy_notifications", [newNotif, ...all]);
  },

  markNotificationRead: (id?: string) => {
    const all = HubStore.getNotifications();
    const updated = all.map((n) => (id === undefined || n.id === id ? { ...n, isRead: true } : n));
    setStored("buildicy_notifications", updated);
  },

  getTasks: (userId: string): DailyTask[] => {
    const all = getStored<Record<string, DailyTask[]>>("buildicy_tasks", INITIAL_TASKS);
    return all[userId] ?? INITIAL_TASKS["00000000-0000-0000-0000-000000000001"] ?? [];
  },

  toggleTask: (userId: string, taskId: string) => {
    const all = getStored<Record<string, DailyTask[]>>("buildicy_tasks", INITIAL_TASKS);
    const userTasks = all[userId] ?? INITIAL_TASKS[userId] ?? [];
    all[userId] = userTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    setStored("buildicy_tasks", all);
  },

  addTask: (userId: string, text: string, time: string = "Today") => {
    const all = getStored<Record<string, DailyTask[]>>("buildicy_tasks", INITIAL_TASKS);
    const userTasks = all[userId] ?? INITIAL_TASKS[userId] ?? [];
    const newTask: DailyTask = {
      id: `task-${Date.now()}`,
      userId,
      text: text.trim(),
      done: false,
      time,
      createdAt: new Date().toISOString(),
    };
    all[userId] = [...userTasks, newTask];
    setStored("buildicy_tasks", all);
  },
};

export function useHubState() {
  const [user, setUser] = useState<UserProfile | null>(() => HubStore.getCurrentUser());
  const [leads, setLeads] = useState<Lead[]>(() => HubStore.getLeads());
  const [users, setUsers] = useState<UserProfile[]>(() => HubStore.getUsers());
  const [activities, setActivities] = useState<LeadActivity[]>(() => HubStore.getActivities());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => HubStore.getNotifications());
  const [outreach, setOutreach] = useState<LeadOutreachInteraction[]>(() => HubStore.getOutreach());
  const [dailyUpdates, setDailyUpdates] = useState<DailyWorkUpdate[]>(() => HubStore.getDailyUpdates());
  const [channels, setChannels] = useState<ChatChannel[]>(() => HubStore.getChannels());
  const [, setVersion] = useState(0);

  useEffect(() => {
    HubStore.syncFromSupabase();

    // Real-time polling every 15s
    const pollInterval = setInterval(() => {
      HubStore.syncFromSupabase().then(() => {
        setLeads(HubStore.getLeads());
        setNotifications(HubStore.getNotifications());
        setActivities(HubStore.getActivities());
        setUsers(HubStore.getUsers());
        setChannels(HubStore.getChannels());
        setVersion((v) => v + 1);
      });
    }, 15000);

    const refresh = () => {
      setUser(HubStore.getCurrentUser());
      setLeads(HubStore.getLeads());
      setUsers(HubStore.getUsers());
      setActivities(HubStore.getActivities());
      setNotifications(HubStore.getNotifications());
      setOutreach(HubStore.getOutreach());
      setDailyUpdates(HubStore.getDailyUpdates());
      setChannels(HubStore.getChannels());
      setVersion((v) => v + 1);
    };

    window.addEventListener("buildicy_storage_update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("buildicy_storage_update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    currentUser: user,
    users,
    leads,
    activities,
    notifications,
    outreach,
    dailyUpdates,
    channels,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  };
}
