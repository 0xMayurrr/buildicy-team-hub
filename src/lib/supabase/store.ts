import { useEffect, useState } from "react";
import { requestPushPermission } from "../firebase";
import { toast } from "sonner";
import type {
  UserProfile,
  UserRole,
  Lead,
  LeadStatus,
  LeadPotential,
  LeadActivity,
  LeadDiscussion,
  ChatMessage,
  ChatChannel,
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
    avatarUrl: "",
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
  "rizwan@buildicy.com": {
    pass: "RizwanBuildicy@2026",
    role: "member",
    name: "Rizwan",
    initials: "RZ",
    color: "avatar-sky",
    title: "Marketing Specialist",
    workingStatus: "Outreach",
    avatarUrl: "/avatars/3d-avatar-4.jpg",
  },
};

export const getStoredCredentials = (): Record<
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
> => {
  const custom = getStored<Record<string, any>>("buildicy_custom_credentials", {});
  return { ...CREDENTIALS, ...custom };
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
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "rizwan@buildicy.com",
    name: "Rizwan",
    role: "member",
    title: "Marketing Specialist",
    department: "Marketing",
    initials: "RZ",
    color: "avatar-sky",
    activeStatus: "Active now",
    workingStatus: "Outreach",
    statusUpdatedAt: new Date().toISOString(),
    avatarUrl: "/avatars/3d-avatar-4.jpg",
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
  const isFresh = localStorage.getItem("buildicy_fresh_v16_clean_slate");
  if (!isFresh) {
    [
      "buildicy_tasks",
      "buildicy_chat",
      "buildicy_channels",
      "buildicy_leads",
      "buildicy_activities",
      "buildicy_outreach",
      "buildicy_daily_updates",
      "buildicy_notifications",
      "buildicy_discussions",
      "buildicy_fresh_v7",
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("buildicy_leads", JSON.stringify([]));
    localStorage.setItem("buildicy_activities", JSON.stringify([]));
    localStorage.setItem("buildicy_outreach", JSON.stringify([]));
    localStorage.setItem("buildicy_daily_updates", JSON.stringify([]));
    localStorage.setItem("buildicy_notifications", JSON.stringify([]));
    localStorage.setItem("buildicy_discussions", JSON.stringify({}));
    localStorage.setItem("buildicy_tasks", JSON.stringify({}));
    localStorage.setItem("buildicy_chat", JSON.stringify({}));
    localStorage.setItem("buildicy_channels", JSON.stringify([]));
    localStorage.setItem("buildicy_users", JSON.stringify(INITIAL_USERS));
    localStorage.setItem("buildicy_fresh_v16_clean_slate", "true");
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
    return match && match[2] ? decodeURIComponent(match[2]) : null;
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
    } else if (user && user.email) {
      const emailLower = user.email.toLowerCase();
      if (typeof window !== "undefined") {
        const savedAvatar = localStorage.getItem(`buildicy_user_avatar_${emailLower}`);
        if (savedAvatar) {
          user = { ...user, avatarUrl: savedAvatar, avatarChosen: true };
        }
      }
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
    const targetUser = users.find((u) => u.id === userId);
    const email = (targetUser?.email || "").toLowerCase();

    if (typeof window !== "undefined" && email) {
      localStorage.setItem(`buildicy_user_avatar_${email}`, avatarUrl);
      localStorage.setItem(`buildicy_avatar_saved_${email}`, "true");
    }

    const updated = users.map((u) =>
      u.id === userId || (email && u.email.toLowerCase() === email)
        ? { ...u, avatarUrl, avatarChosen: true }
        : u,
    );
    setStored("buildicy_users", updated);

    // Also persist into custom credentials
    if (email) {
      const custom = getStored<Record<string, any>>("buildicy_custom_credentials", {});
      if (custom[email]) {
        custom[email].avatarUrl = avatarUrl;
        setStored("buildicy_custom_credentials", custom);
      }
    }

    const cur = HubStore.getCurrentUser();
    if (cur && (cur.id === userId || (email && cur.email.toLowerCase() === email))) {
      HubStore.setCurrentUser({ ...cur, avatarUrl, avatarChosen: true });
    }

    try {
      supabase.update("profiles", `id=eq.${userId}`, { avatar_url: avatarUrl });
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("buildicy_storage_update"));
    }
  },

  updateUserRole: (
    userId: string,
    updates: {
      role?: UserRole;
      title?: string;
      department?: string;
      name?: string;
    },
  ) => {
    const users = HubStore.getUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          ...(updates.role ? { role: updates.role } : {}),
          ...(updates.title ? { title: updates.title } : {}),
          ...(updates.department ? { department: updates.department } : {}),
          ...(updates.name ? { name: updates.name } : {}),
        };
      }
      return u;
    });
    setStored("buildicy_users", updated);

    const cur = HubStore.getCurrentUser();
    if (cur && cur.id === userId) {
      HubStore.setCurrentUser({
        ...cur,
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.department ? { department: updates.department } : {}),
        ...(updates.name ? { name: updates.name } : {}),
      });
    }

    try {
      supabase.update("profiles", `id=eq.${userId}`, {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.department ? { department: updates.department } : {}),
        ...(updates.name ? { full_name: updates.name } : {}),
      });
    } catch {}
  },

  login: async (email: string, pass: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    const rawEmail = email.trim().toLowerCase();
    // Allow either full email (rizwan@buildicy.com) or username (rizwan)
    const cleanEmail = rawEmail.includes("@") ? rawEmail : `${rawEmail}@buildicy.com`;
    const trimmedPass = pass.trim();

    let allCreds = getStoredCredentials();
    let cred = allCreds[cleanEmail] || allCreds[rawEmail];

    // Check if any credential matches by prefix or email containing the username
    if (!cred) {
      const foundKey = Object.keys(allCreds).find(
        (k) =>
          k.toLowerCase() === cleanEmail ||
          k.toLowerCase().startsWith(rawEmail) ||
          k.toLowerCase().includes(rawEmail),
      );
      if (foundKey) cred = allCreds[foundKey];
    }

    // If credential not found locally yet, perform immediate remote sync from Supabase
    if (!cred) {
      await HubStore.syncFromSupabase();
      allCreds = getStoredCredentials();
      cred = allCreds[cleanEmail] || allCreds[rawEmail];
      if (!cred) {
        const foundKey = Object.keys(allCreds).find(
          (k) =>
            k.toLowerCase() === cleanEmail ||
            k.toLowerCase().startsWith(rawEmail) ||
            k.toLowerCase().includes(rawEmail),
        );
        if (foundKey) cred = allCreds[foundKey];
      }
    }

    // Special failsafe for user-created "rizwan" or custom users
    const isRizwan = cleanEmail.includes("rizwan") || rawEmail.includes("rizwan");
    const allowedFallbackPasswords = ["Buildicy@2026", "Rizwan@2026", "RizwanBuildicy@2026"];
    const matchesPassword =
      Boolean(cred && cred.pass === trimmedPass) ||
      (isRizwan && (allowedFallbackPasswords.includes(trimmedPass) || (cred && cred.pass === trimmedPass)));

    if (!cred && isRizwan) {
      // Auto-reconstruct Rizwan if created in a previous session
      cred = {
        pass: trimmedPass,
        role: "member",
        name: "Rizwan",
        initials: "RZ",
        color: "avatar-sky",
        title: "Marketing Specialist",
        workingStatus: "Outreach",
        avatarUrl: "/avatars/3d-avatar-4.jpg",
      };
      const custom = getStored<Record<string, any>>("buildicy_custom_credentials", {});
      custom[cleanEmail] = cred;
      setStored("buildicy_custom_credentials", custom);
    } else if (!cred || !matchesPassword) {
      return { success: false, error: "Invalid email or password. Please verify your credentials." };
    }

    // Attempt real Supabase Auth
    await supabase.signInWithPassword(cleanEmail, trimmedPass);

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
        avatarUrl: cred.avatarUrl || "/avatars/3d-avatar-4.jpg",
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

  resetToCleanSlate: () => {
    if (typeof window !== "undefined") {
      [
        "buildicy_tasks",
        "buildicy_chat",
        "buildicy_channels",
        "buildicy_leads",
        "buildicy_activities",
        "buildicy_outreach",
        "buildicy_daily_updates",
        "buildicy_notifications",
        "buildicy_discussions",
      ].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem("buildicy_leads", JSON.stringify([]));
      localStorage.setItem("buildicy_activities", JSON.stringify([]));
      localStorage.setItem("buildicy_outreach", JSON.stringify([]));
      localStorage.setItem("buildicy_daily_updates", JSON.stringify([]));
      localStorage.setItem("buildicy_notifications", JSON.stringify([]));
      localStorage.setItem("buildicy_discussions", JSON.stringify({}));
      localStorage.setItem("buildicy_tasks", JSON.stringify({}));
      localStorage.setItem("buildicy_chat", JSON.stringify({}));
      localStorage.setItem("buildicy_channels", JSON.stringify([]));
      localStorage.setItem("buildicy_users", JSON.stringify(INITIAL_USERS));
      localStorage.setItem("buildicy_fresh_v16_clean_slate", "true");
      window.dispatchEvent(new Event("buildicy_storage_update"));
    }
  },

  createUser: (data: {
    name: string;
    email: string;
    pass: string;
    title: string;
    department?: string;
  }): UserProfile => {
    const allUsers = HubStore.getUsers();
    const cleanEmail = data.email.trim().toLowerCase();
    const initials =
      data.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "MB";

    const colors = ["avatar-peach", "avatar-sage", "avatar-rose", "avatar-lilac", "avatar-sky"];
    const color = colors[allUsers.length % colors.length] || "avatar-peach";
    const avatarNum = ((allUsers.length - 1) % 12) + 1;
    const avatarUrl = `/avatars/3d-avatar-${avatarNum}.jpg`;

    // Generate valid UUID format for PostgreSQL compatibility
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");

    const newUser: UserProfile = {
      id,
      email: cleanEmail,
      name: data.name.trim(),
      role: "member",
      title: data.title.trim() || "Marketing Specialist",
      department: data.department?.trim() || "Marketing",
      initials,
      color,
      activeStatus: "Active now",
      workingStatus: "Outreach",
      avatarUrl,
      avatarChosen: true,
      statusUpdatedAt: new Date().toISOString(),
    };

    setStored("buildicy_users", [...allUsers, newUser]);

    const custom = getStored<Record<string, any>>("buildicy_custom_credentials", {});
    custom[cleanEmail] = {
      pass: data.pass.trim(),
      role: "member",
      name: newUser.name,
      initials: newUser.initials,
      color: newUser.color,
      title: newUser.title,
      department: newUser.department,
      workingStatus: "Outreach",
      avatarUrl: newUser.avatarUrl,
    };
    setStored("buildicy_custom_credentials", custom);

    // Multi-tab broadcast
    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "user_created", user: newUser, credentials: custom[cleanEmail] });
      bus.close();
    } catch {}

    // Persist to Supabase PostgreSQL table & sync credentials across devices
    (async () => {
      try {
        await supabase.insert("profiles", {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.name,
          role: "member",
          title: newUser.title,
          department: newUser.department,
          initials: newUser.initials,
          color: newUser.color,
          active_status: "Active now",
        });

        // Sync custom credentials so member can log in from any other computer or incognito window
        await supabase.upsert("chat_channels", {
          id: "__buildicy_credentials__",
          name: "__buildicy_credentials__",
          is_group: false,
          description: JSON.stringify(custom),
        });

        // Register in Supabase Auth
        await supabase.signUp(cleanEmail, data.pass.trim(), {
          name: newUser.name,
          role: "member",
        });
      } catch (err) {
        console.warn("Supabase user creation sync:", err);
      }
    })();

    return newUser;
  },

  deleteUser: (userId: string): boolean => {
    const allUsers = HubStore.getUsers();
    const target = allUsers.find((u) => u.id === userId);
    if (!target || target.role === "founder") return false;

    const filtered = allUsers.filter((u) => u.id !== userId);
    setStored("buildicy_users", filtered);

    const custom = getStored<Record<string, any>>("buildicy_custom_credentials", {});
    delete custom[target.email.toLowerCase()];
    setStored("buildicy_custom_credentials", custom);

    const leads = HubStore.getLeads();
    const founder = allUsers.find((u) => u.role === "founder");
    if (founder) {
      const reassigned = leads.map((l) =>
        l.ownerId === userId
          ? { ...l, ownerId: founder.id, ownerName: founder.name, updated: "Just now" }
          : l,
      );
      setStored("buildicy_leads", reassigned);
    }

    (async () => {
      try {
        await supabase.delete("profiles", `id=eq.${userId}`);
        await supabase.upsert("chat_channels", {
          id: "__buildicy_credentials__",
          name: "__buildicy_credentials__",
          is_group: false,
          description: JSON.stringify(custom),
        });
      } catch (err) {
        console.warn("Supabase user deletion sync:", err);
      }
    })();

    return true;
  },

  getCurrency: (): "USD" | "INR" => {
    return getStored<"USD" | "INR">("buildicy_currency", "USD");
  },

  setCurrency: (c: "USD" | "INR") => {
    setStored("buildicy_currency", c);
    window.dispatchEvent(new Event("buildicy_storage_update"));
  },

  deleteChatMessage: (channelId: string, messageId: string) => {
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);

    // Locate the message to get its author and text for persistent signature matching
    let targetMsg: ChatMessage | undefined;
    for (const msgs of Object.values(all)) {
      const found = msgs.find((m) => m.id === messageId);
      if (found) {
        targetMsg = found;
        break;
      }
    }

    // 1. Record in persistent deleted message set so syncFromSupabase never restores it
    const deletedMsgs = getStored<string[]>("buildicy_deleted_message_ids", []);
    const newDeleted = [...deletedMsgs, messageId];
    if (targetMsg) {
      newDeleted.push(`${targetMsg.author}:::${targetMsg.text}`);
    }
    setStored("buildicy_deleted_message_ids", Array.from(new Set(newDeleted)));

    // 2. Remove matching message from all channels in local storage
    const updatedChat: Record<string, ChatMessage[]> = {};
    for (const [key, msgs] of Object.entries(all)) {
      updatedChat[key] = msgs.filter((m) => {
        if (m.id === messageId) return false;
        if (targetMsg && m.author === targetMsg.author && m.text === targetMsg.text) return false;
        return true;
      });
    }
    setStored("buildicy_chat", updatedChat);

    // 3. Multi-tab broadcast
    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "chat_message_deleted", channelId, messageId });
      bus.close();
    } catch {}

    // 4. Update remote Supabase (both soft delete text='[DELETED]' and delete row)
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
        if (isUuid) {
          await supabase.delete("chat_messages", `id=eq.${messageId}`);
        }
        if (targetMsg) {
          await supabase.update(
            "chat_messages",
            `author=eq.${encodeURIComponent(targetMsg.author)}&text=eq.${encodeURIComponent(targetMsg.text)}`,
            { text: "[DELETED]" },
          );
          await supabase.delete(
            "chat_messages",
            `author=eq.${encodeURIComponent(targetMsg.author)}&text=eq.${encodeURIComponent(targetMsg.text)}`,
          );
        }
      } catch (err) {
        console.warn("Supabase chat message deletion:", err);
      }
    })();

    window.dispatchEvent(new Event("buildicy_storage_update"));
    window.dispatchEvent(new Event("storage"));
  },

  clearChatChannel: (channelId: string) => {
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
    const msgs = all[channelId] || [];

    const deletedMsgs = getStored<string[]>("buildicy_deleted_message_ids", []);
    const newDeleted = [...deletedMsgs];
    msgs.forEach((m) => {
      newDeleted.push(m.id);
      newDeleted.push(`${m.author}:::${m.text}`);
    });
    setStored("buildicy_deleted_message_ids", Array.from(new Set(newDeleted)));

    all[channelId] = [];
    setStored("buildicy_chat", all);

    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "chat_cleared", channelId });
      bus.close();
    } catch {}

    (async () => {
      try {
        await supabase.update("chat_messages", `channel_id=eq.${encodeURIComponent(channelId)}`, {
          text: "[DELETED]",
        });
        await supabase.delete("chat_messages", `channel_id=eq.${encodeURIComponent(channelId)}`);
      } catch (err) {
        console.warn("Supabase clear chat channel:", err);
      }
    })();

    window.dispatchEvent(new Event("buildicy_storage_update"));
    window.dispatchEvent(new Event("storage"));
  },

  // Pull real remote data from Supabase PostgreSQL tables
  syncFromSupabase: async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    try {
      const withTimeout = <T>(p: Promise<T | null>): Promise<T | null> =>
        Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), 5000))]);

      const remoteLeads = await withTimeout(supabase.select<any>("leads", "order=created_at.desc") as Promise<any[]>);
      if (remoteLeads) {
        const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
        const deletedSet = new Set(deletedIds);

        // Auto-discover any deleted leads marked in remote Supabase
        const isRemoteDeleted = (r: any) =>
          !r ||
          !r.id ||
          r.source === "DELETED" ||
          r.promising_reason === "__BUILDICY_DELETED__" ||
          (typeof r.company === "string" && r.company.startsWith("[DELETED]")) ||
          (typeof r.name === "string" && r.name.startsWith("[DELETED]")) ||
          r.status === "Deleted";

        const newlyDiscoveredDeleted = remoteLeads.filter(isRemoteDeleted).map((r: any) => r.id);
        if (newlyDiscoveredDeleted.length > 0) {
          newlyDiscoveredDeleted.forEach((id: string) => deletedSet.add(id));
          setStored("buildicy_deleted_lead_ids", Array.from(deletedSet));
        }

        const mapped: Lead[] = remoteLeads
          .filter((r: any) => r && r.id && !deletedSet.has(r.id) && !isRemoteDeleted(r))
          .map((r: any) => ({
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

      const remoteActivities = await withTimeout(supabase.select<any>("lead_activities", "order=created_at.desc&limit=50") as Promise<any[]>);
      if (remoteActivities) {
        const deletedSet = new Set(getStored<string[]>("buildicy_deleted_lead_ids", []));
        const mappedAct: LeadActivity[] = remoteActivities
          .filter((a: any) => a && a.lead_id && !deletedSet.has(a.lead_id))
          .map((a: any) => ({
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

      const remoteOutreach = await withTimeout(supabase.select<any>("lead_outreach", "order=created_at.desc&limit=200") as Promise<any[]>);
      if (remoteOutreach) {
        const deletedSet = new Set(getStored<string[]>("buildicy_deleted_lead_ids", []));
        const mappedOutreach: LeadOutreachInteraction[] = remoteOutreach
          .filter((o: any) => o && o.lead_id && !deletedSet.has(o.lead_id))
          .map((o: any) => ({
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

      const remoteDaily = await withTimeout(supabase.select<any>("daily_work_updates", "order=created_at.desc&limit=100") as Promise<any[]>);
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

      const remoteChannels = await withTimeout(supabase.select<any>("chat_channels", "order=created_at.asc") as Promise<any[]>);
      if (remoteChannels && remoteChannels.length > 0) {
        const legacyMockNames = ["marketing", "sales-team", "wins", "general"];
        const mappedChannels: ChatChannel[] = remoteChannels
          .filter(
            (c: any) =>
              c &&
              c.name &&
              Boolean(c.is_group) &&
              !String(c.id).startsWith("dm_") &&
              !legacyMockNames.includes(String(c.name).toLowerCase()),
          )
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

      // Ensure all DM channels exist in Supabase chat_channels so foreign keys never fail
      const teamUsers = HubStore.getUsers();
      for (let i = 0; i < teamUsers.length; i++) {
        for (let j = i + 1; j < teamUsers.length; j++) {
          const uA = teamUsers[i];
          const uB = teamUsers[j];
          if (uA && uB) {
            const dmId = HubStore.getDmChannelId(uA.email, uB.email);
            supabase.upsert("chat_channels", {
              id: dmId,
              name: dmId,
              is_group: false,
              description: `DM: ${uA.name} and ${uB.name}`,
            });
          }
        }
      }

      const remoteMessages = await withTimeout(supabase.select<any>("chat_messages", "order=created_at.asc&limit=500") as Promise<any[]>);
      if (remoteMessages && remoteMessages.length > 0) {
        const currentChat = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
        const deletedMsgs = new Set(getStored<string[]>("buildicy_deleted_message_ids", []));
        const mergedChat: Record<string, ChatMessage[]> = { ...currentChat };

        remoteMessages.forEach((m: any) => {
          if (!m || !m.text || m.text === "[DELETED]") return;
          if (deletedMsgs.has(m.id)) return;
          if (deletedMsgs.has(`${m.author}:::${m.text}`)) return;

          let chId = m.channel_id;
          if (!chId) return;
          if (chId.startsWith("dm_")) {
            const parts = chId.replace("dm_", "").split("_");
            if (parts.length === 2 && parts[0] && parts[1]) {
              chId = HubStore.getDmChannelId(parts[0], parts[1]);
            }
          }
          if (!mergedChat[chId]) mergedChat[chId] = [];
          if (!mergedChat[chId]!.some((existing) => existing.id === m.id || (existing.text === m.text && existing.author === m.author))) {
            mergedChat[chId]!.push({
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
          }
        });
        setStored("buildicy_chat", mergedChat);
      }

      // Sync custom member credentials so created users can log in from any browser/device
      const credRecord = await withTimeout(
        supabase.select<any>("chat_channels", "id=eq.__buildicy_credentials__") as Promise<any[]>,
      );
      if (credRecord && credRecord[0]?.description) {
        try {
          const remoteCreds = JSON.parse(credRecord[0].description);
          if (remoteCreds && typeof remoteCreds === "object") {
            const localCreds = getStored<Record<string, any>>("buildicy_custom_credentials", {});
            const mergedCreds = { ...remoteCreds, ...localCreds };
            setStored("buildicy_custom_credentials", mergedCreds);
          }
        } catch {}
      }

      // Sync remote team profiles into local users list
      const remoteProfiles = await withTimeout(supabase.select<any>("profiles") as Promise<any[]>);
      if (remoteProfiles && remoteProfiles.length > 0) {
        const currentUsers = HubStore.getUsers();
        const userMap = new Map(currentUsers.map((u) => [u.email.toLowerCase(), u]));
        let hasNew = false;
        remoteProfiles.forEach((p: any) => {
          if (!p || !p.email) return;
          const emailLower = p.email.toLowerCase();
          if (!userMap.has(emailLower)) {
            hasNew = true;
            userMap.set(emailLower, {
              id: p.id,
              email: p.email,
              name: p.full_name || "Team Member",
              role: (p.role || "member") as UserRole,
              title: p.title || "Marketing Specialist",
              department: p.department || "Marketing",
              initials: p.initials || "TM",
              color: p.color || "avatar-peach",
              activeStatus: p.active_status || "Active now",
              workingStatus: (p.working_status || "Outreach") as WorkingStatus,
              avatarUrl: p.avatar_url || "/avatars/3d-avatar-1.jpg",
              avatarChosen: true,
              statusUpdatedAt: p.updated_at || new Date().toISOString(),
            });
          }
        });
        if (hasNew) {
          setStored("buildicy_users", Array.from(userMap.values()));
        }
      }
    } catch (err) {
      console.warn("Supabase background sync:", err);
    }
  },

  getUsers: (): UserProfile[] => {
    let list = getStored<UserProfile[]>("buildicy_users", INITIAL_USERS);
    if (!Array.isArray(list) || list.length === 0) {
      list = [...INITIAL_USERS];
    }
    // Ensure all INITIAL_USERS exist in list (especially Rizwan)
    INITIAL_USERS.forEach((initU) => {
      if (!list.some((u) => u.email.toLowerCase() === initU.email.toLowerCase())) {
        list.push(initU);
      }
    });

    // Ensure any custom-created member in buildicy_custom_credentials exists
    const customCreds = getStored<Record<string, any>>("buildicy_custom_credentials", {});
    Object.entries(customCreds).forEach(([email, cred]) => {
      const cleanEmail = email.toLowerCase();
      if (!list.some((u) => u.email.toLowerCase() === cleanEmail)) {
        list.push({
          id: cred.id || `custom-${cleanEmail.replace(/[^a-z0-9]/g, "-")}`,
          email: cleanEmail,
          name: cred.name || "Team Member",
          role: cred.role || "member",
          title: cred.title || "Marketing Specialist",
          department: cred.department || "Marketing",
          initials: cred.initials || "TM",
          color: cred.color || "avatar-sky",
          activeStatus: "Active now",
          workingStatus: cred.workingStatus || "Outreach",
          statusUpdatedAt: new Date().toISOString(),
          avatarUrl: cred.avatarUrl || "/avatars/3d-avatar-4.jpg",
          avatarChosen: true,
        });
      }
    });

    const defaultAvatars: Record<string, string> = {
      "founder@buildicy.com": "",
      "ganesh.marketing@buildicy.com": "/avatars/3d-avatar-1.jpg",
      "dhruv.marketing@buildicy.com": "/avatars/3d-avatar-3.jpg",
      "padma.amarketing@buildicy.com": "/avatars/3d-avatar-2.jpg",
      "rizwan@buildicy.com": "/avatars/3d-avatar-4.jpg",
    };
    return list.map((u) => {
      let updated = { ...u };
      const emailLower = (updated.email || "").toLowerCase();
      if (typeof window !== "undefined" && emailLower) {
        const savedAvatar = localStorage.getItem(`buildicy_user_avatar_${emailLower}`);
        if (savedAvatar) {
          updated.avatarUrl = savedAvatar;
          updated.avatarChosen = true;
          return updated;
        }
      }
      if (updated.email === "founder@buildicy.com") {
        updated.name = "Heyy Founder";
        updated.initials = "HF";
        updated.avatarUrl = "";
        updated.avatarChosen = true;
      } else {
        // Automatically upgrade any legacy SVG avatar or empty avatar to real 3D Pixar avatar
        if (!updated.avatarUrl || updated.avatarUrl.includes(".svg")) {
          updated.avatarUrl = defaultAvatars[updated.email] || "/avatars/3d-avatar-4.jpg";
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
    const list = getStored<Lead[]>("buildicy_leads", INITIAL_LEADS);
    const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
    const deletedSet = new Set(deletedIds);
    const mockLeadIds = ["LD-2408", "LD-2407", "LD-2406", "LD-2405", "LD-2404", "LD-2403", "LD-2402", "LD-2401"];
    const mockCompanies = ["layers studio", "circooles", "catalog", "quotient", "sisyphus", "hourglass", "bloom labs", "fable & co.", "acme corp", "acme"];
    const filtered = list.filter((l) => {
      if (!l || !l.id) return false;
      if (
        deletedSet.has(l.id) ||
        (l.status as string) === "Deleted" ||
        l.source === "DELETED" ||
        l.promisingReason === "__BUILDICY_DELETED__" ||
        (typeof l.name === "string" && l.name.startsWith("[DELETED]")) ||
        (typeof l.company === "string" && l.company.startsWith("[DELETED]"))
      ) {
        return false;
      }
      if (mockLeadIds.includes(l.id) || l.id.startsWith("LD-240")) return false;
      if (mockCompanies.includes((l.company || "").toLowerCase().trim())) return false;
      return true;
    });
    if (filtered.length !== list.length) {
      setStored("buildicy_leads", filtered);
    }
    return filtered;
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

  reassignAllUserLeads: (fromUserId: string, newOwner: UserProfile): number => {
    const leads = HubStore.getLeads();
    let count = 0;
    const updated = leads.map((l) => {
      if (l.ownerId === fromUserId) {
        count++;
        return {
          ...l,
          ownerId: newOwner.id,
          ownerName: newOwner.name,
          updated: "Just now",
        };
      }
      return l;
    });
    setStored("buildicy_leads", updated);

    // Update remote supabase leads
    try {
      supabase.update("leads", `assigned_to=eq.${fromUserId}`, {
        assigned_to: newOwner.id.startsWith("usr-") ? null : newOwner.id,
        owner_name: newOwner.name,
        updated_at: new Date().toISOString(),
      });
    } catch {}

    return count;
  },

  deleteLead: (leadId: string): boolean => {
    // 1. Record in persistent deleted set so it never reappears on sync
    const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
    if (!deletedIds.includes(leadId)) {
      setStored("buildicy_deleted_lead_ids", [...deletedIds, leadId]);
    }

    // 2. Remove immediately from local state
    const leads = HubStore.getLeads();
    const target = leads.find((l) => l.id === leadId);
    const updated = leads.filter((l) => l.id !== leadId);
    setStored("buildicy_leads", updated);

    // Also remove associated activities and outreach from local storage
    const acts = getStored<LeadActivity[]>("buildicy_activities", INITIAL_ACTIVITIES);
    setStored("buildicy_activities", acts.filter((a) => a.leadId !== leadId));

    const outreach = getStored<LeadOutreachInteraction[]>("buildicy_outreach", INITIAL_OUTREACH);
    setStored("buildicy_outreach", outreach.filter((o) => o.leadId !== leadId));

    const discussions = getStored<Record<string, LeadDiscussion[]>>("buildicy_discussions", INITIAL_DISCUSSIONS);
    if (discussions[leadId]) {
      delete discussions[leadId];
      setStored("buildicy_discussions", discussions);
    }

    // 3. Instant multi-tab broadcast
    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "lead_deleted", leadId });
      bus.close();
    } catch {}

    // 4. Update Supabase:
    // Mark source = 'DELETED' and promising_reason = '__BUILDICY_DELETED__' (no check constraints in PostgreSQL!)
    // so that when other clients fetch Supabase, they detect and remove this lead immediately!
    (async () => {
      try {
        await supabase.update("leads", `id=eq.${leadId}`, {
          source: "DELETED",
          promising_reason: "__BUILDICY_DELETED__",
          company: "[DELETED]",
          name: "[DELETED]",
        });
        await supabase.delete("lead_outreach", `lead_id=eq.${leadId}`);
        await supabase.delete("lead_activities", `lead_id=eq.${leadId}`);
        await supabase.delete("lead_discussions", `lead_id=eq.${leadId}`);
        await supabase.delete("leads", `id=eq.${leadId}`);
      } catch (err) {
        console.warn("Supabase lead deletion:", err);
      }
    })();

    if (target) {
      const user = HubStore.getCurrentUser();
      HubStore.addActivity({
        leadId,
        userId: user?.id ?? "unknown",
        person: user?.name ?? "Team member",
        initials: user?.initials ?? "TM",
        color: user?.color ?? "avatar-rose",
        action: "deleted lead",
        subject: target.name,
        detail: `(${target.company}) removed from workspace pipeline`,
        time: "Just now",
        type: "lead",
      });
    }

    window.dispatchEvent(new Event("buildicy_storage_update"));
    window.dispatchEvent(new Event("storage"));
    return true;
  },

  deleteLeads: (leadIds: string[]): boolean => {
    if (!leadIds || leadIds.length === 0) return false;

    // 1. Record in persistent deleted set
    const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
    setStored("buildicy_deleted_lead_ids", Array.from(new Set([...deletedIds, ...leadIds])));

    // 2. Remove immediately from local state
    const leads = HubStore.getLeads();
    const idSet = new Set(leadIds);
    const updated = leads.filter((l) => !idSet.has(l.id));
    setStored("buildicy_leads", updated);

    // Also remove associated activities, outreach, discussions
    const acts = getStored<LeadActivity[]>("buildicy_activities", INITIAL_ACTIVITIES);
    setStored("buildicy_activities", acts.filter((a) => !idSet.has(a.leadId)));

    const outreach = getStored<LeadOutreachInteraction[]>("buildicy_outreach", INITIAL_OUTREACH);
    setStored("buildicy_outreach", outreach.filter((o) => !idSet.has(o.leadId)));

    const discussions = getStored<Record<string, LeadDiscussion[]>>("buildicy_discussions", INITIAL_DISCUSSIONS);
    let changedDisc = false;
    leadIds.forEach((id) => {
      if (discussions[id]) {
        delete discussions[id];
        changedDisc = true;
      }
    });
    if (changedDisc) setStored("buildicy_discussions", discussions);

    // 3. Instant multi-tab broadcast
    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "leads_bulk_deleted", leadIds });
      bus.close();
    } catch {}

    // 4. Update Supabase
    (async () => {
      try {
        const idListStr = leadIds.join(",");
        await supabase.update("leads", `id=in.(${idListStr})`, {
          source: "DELETED",
          promising_reason: "__BUILDICY_DELETED__",
          company: "[DELETED]",
          name: "[DELETED]",
        });
        await supabase.delete("leads", `id=in.(${idListStr})`);
        await supabase.delete("lead_outreach", `lead_id=in.(${idListStr})`);
        await supabase.delete("lead_activities", `lead_id=in.(${idListStr})`);
        await supabase.delete("lead_discussions", `lead_id=in.(${idListStr})`);
      } catch (err) {
        console.warn("Supabase batch lead deletion:", err);
      }

      // Parallel fallback per lead
      await Promise.allSettled(
        leadIds.map(async (id) => {
          try {
            await supabase.update("leads", `id=eq.${id}`, {
              source: "DELETED",
              promising_reason: "__BUILDICY_DELETED__",
              company: "[DELETED]",
              name: "[DELETED]",
            });
            await supabase.delete("lead_outreach", `lead_id=eq.${id}`);
            await supabase.delete("lead_activities", `lead_id=eq.${id}`);
            await supabase.delete("leads", `id=eq.${id}`);
          } catch {}
        }),
      );
    })();

    const user = HubStore.getCurrentUser();
    HubStore.addActivity({
      leadId: leadIds[0] || "bulk",
      userId: user?.id ?? "unknown",
      person: user?.name ?? "Team member",
      initials: user?.initials ?? "TM",
      color: user?.color ?? "avatar-rose",
      action: "bulk deleted",
      subject: `${leadIds.length} leads`,
      detail: `removed from workspace pipeline`,
      time: "Just now",
      type: "lead",
    });

    window.dispatchEvent(new Event("buildicy_storage_update"));
    window.dispatchEvent(new Event("storage"));
    return true;
  },

  getActivities: (leadId?: string): LeadActivity[] => {
    const all = getStored<LeadActivity[]>("buildicy_activities", INITIAL_ACTIVITIES);
    const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
    const deletedSet = new Set(deletedIds);
    const mockLeadIds = ["LD-2408", "LD-2407", "LD-2406", "LD-2405", "LD-2404", "LD-2403", "LD-2402", "LD-2401"];
    const mockNames = [
      "sofia chen",
      "alex morgan",
      "jordan lee",
      "phoenix baker",
      "olivia rhye",
      "candice wu",
      "lana steiner",
      "demi wilkinson",
      "natali craig",
      "drew cano",
      "orlando diggs",
    ];
    const filtered = all.filter((a) => {
      if (!a) return false;
      if (deletedSet.has(a.leadId)) return false;
      if (mockLeadIds.includes(a.leadId) || String(a.leadId).startsWith("LD-240")) return false;
      if (mockNames.includes((a.person || "").toLowerCase())) return false;
      if (mockNames.includes((a.subject || "").toLowerCase())) return false;
      return true;
    });
    if (filtered.length !== all.length) {
      setStored("buildicy_activities", filtered);
    }
    if (leadId) {
      return filtered.filter((a) => a.leadId === leadId);
    }
    return filtered;
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
  getOutreach: (filter?: string | { leadId?: string; userId?: string }): LeadOutreachInteraction[] => {
    const all = getStored<LeadOutreachInteraction[]>("buildicy_outreach", INITIAL_OUTREACH);
    const deletedIds = getStored<string[]>("buildicy_deleted_lead_ids", []);
    const deletedSet = new Set(deletedIds);
    const valid = all.filter((o) => o && !deletedSet.has(o.leadId));

    if (!filter) return valid;
    if (typeof filter === "string") {
      return valid.filter((o) => o.leadId === filter);
    }
    return valid.filter((o) => {
      if (filter.leadId && o.leadId !== filter.leadId) return false;
      if (filter.userId && o.userId !== filter.userId) return false;
      return true;
    });
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
      id: existingIdx >= 0 && all[existingIdx] ? all[existingIdx]!.id : `update-${Date.now()}`,
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
    const member: UserProfile = users.find((u) => u.id === userId) || INITIAL_USERS[0]!;
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

  getDmChannelId: (userAIdOrEmail: string, userBIdOrEmail: string): string => {
    const allUsers = HubStore.getUsers();
    const normalize = (val: string) => {
      if (!val) return "";
      if (val.includes("@")) return val.toLowerCase().trim();
      const matched = allUsers.find((u) => u.id === val || u.email.toLowerCase() === val.toLowerCase());
      return matched ? matched.email.toLowerCase().trim() : val.toLowerCase().trim();
    };
    const emailA = normalize(userAIdOrEmail);
    const emailB = normalize(userBIdOrEmail);
    return `dm_${[emailA, emailB].sort().join("_")}`;
  },

  getChat: (channelId: string): ChatMessage[] => {
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
    const existing = all[channelId] || [];

    if (!channelId.startsWith("dm_")) {
      return existing;
    }

    // For direct messages: resolve all messages between the two users across any legacy or alternative keys
    const parts = channelId.replace("dm_", "").split("_");
    const allUsers = HubStore.getUsers();

    // Identify userA and userB
    const userA = allUsers.find(
      (u) =>
        u.email.toLowerCase() === parts[0]?.toLowerCase() ||
        u.id === parts[0] ||
        (u.name && u.name.toLowerCase().includes(parts[0]?.toLowerCase() || "___")),
    );
    const userB = allUsers.find(
      (u) =>
        u.email.toLowerCase() === parts[1]?.toLowerCase() ||
        u.id === parts[1] ||
        (u.name && u.name.toLowerCase().includes(parts[1]?.toLowerCase() || "___")),
    );

    const aEmails = userA
      ? [userA.email.toLowerCase(), userA.id, userA.name.toLowerCase()]
      : [parts[0]?.toLowerCase() || ""];
    const bEmails = userB
      ? [userB.email.toLowerCase(), userB.id, userB.name.toLowerCase()]
      : [parts[1]?.toLowerCase() || ""];

    const isMatch = (val: string, candidates: string[]) => {
      const v = (val || "").toLowerCase();
      return candidates.some((c) => c && (v === c || v.includes(c) || c.includes(v)));
    };

    const gathered: ChatMessage[] = [...existing];

    // Scan every key in chat store for messages matching these two participants
    for (const [key, msgs] of Object.entries(all)) {
      if (!Array.isArray(msgs) || msgs.length === 0 || key === channelId) continue;

      const lowerKey = key.toLowerCase();
      const keyRelatesA = aEmails.some((e) => lowerKey.includes(e));
      const keyRelatesB = bEmails.some((e) => lowerKey.includes(e));

      if ((keyRelatesA && keyRelatesB) || keyRelatesA || keyRelatesB) {
        msgs.forEach((m) => {
          const authorA = isMatch(m.author, aEmails) || isMatch(m.userId, aEmails);
          const authorB = isMatch(m.author, bEmails) || isMatch(m.userId, bEmails);
          if (authorA || authorB) {
            gathered.push({ ...m, channelId });
          }
        });
      }
    }

    // Deduplicate by id or author + text
    const seen = new Set<string>();
    const deduplicated: ChatMessage[] = [];
    for (const m of gathered) {
      const dedupeKey = m.id ? m.id : `${m.author}_${m.text}_${m.createdAt || m.time}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        deduplicated.push(m);
      }
    }

    deduplicated.sort((x, y) => {
      const tx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      const ty = y.createdAt ? new Date(y.createdAt).getTime() : 0;
      return tx - ty;
    });

    const deletedMsgs = new Set(getStored<string[]>("buildicy_deleted_message_ids", []));
    const valid = deduplicated.filter(
      (m) =>
        m &&
        m.text &&
        m.text !== "[DELETED]" &&
        !deletedMsgs.has(m.id) &&
        !deletedMsgs.has(`${m.author}:::${m.text}`),
    );

    return valid;
  },

  sendChatMessage: (channelId: string, text: string): ChatMessage | null => {
    const user = HubStore.getCurrentUser();
    if (!user) return null;
    const all = getStored<Record<string, ChatMessage[]>>("buildicy_chat", INITIAL_CHAT);
    const existing = all[channelId] || [];
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

    // BroadcastChannel for instant multi-tab synchronization
    try {
      const bus = new BroadcastChannel("buildicy_hub_bus");
      bus.postMessage({ type: "chat_message", channelId, message: newMsg });
      bus.close();
    } catch {}

    // Notify recipient if direct message
    if (channelId.startsWith("dm_")) {
      const parts = channelId.replace("dm_", "").split("_");
      const allUsers = HubStore.getUsers();
      const recipientKey = parts.find((p) => p !== user.email.toLowerCase() && p !== user.id);
      const recipient = allUsers.find(
        (u) => u.email.toLowerCase() === recipientKey || u.id === recipientKey,
      );
      if (recipient) {
        HubStore.addNotification({
          title: `💬 New message from ${user.name}`,
          body: text.length > 50 ? `${text.slice(0, 50)}…` : text,
          time: "Just now",
          userId: recipient.id,
        });
      }
    }

    // Persist to Supabase: Ensure channel exists in chat_channels first to satisfy foreign key constraint
    (async () => {
      try {
        await supabase.upsert("chat_channels", {
          id: channelId,
          name: channelId,
          is_group: !channelId.startsWith("dm_"),
          description: channelId.startsWith("dm_") ? "Direct message conversation" : "Team channel",
        });
        await supabase.insert("chat_messages", {
          channel_id: channelId,
          user_id: null,
          author: user.name,
          initials: user.initials,
          color: user.color,
          text: text.trim(),
        });
      } catch (err) {
        console.warn("Supabase chat message persistence:", err);
      }
    })();

    return newMsg;
  },

  getNotifications: (): NotificationItem[] => {
    return getStored<NotificationItem[]>("buildicy_notifications", INITIAL_NOTIFICATIONS);
  },

  saveFcmToken: async (userId: string): Promise<boolean> => {
    const token = await requestPushPermission();
    if (!token) return false;
    const users = HubStore.getUsers();
    const updated = users.map((u) => (u.id === userId ? { ...u, fcmToken: token } : u));
    setStored("buildicy_users", updated);
    const cur = HubStore.getCurrentUser();
    if (cur && cur.id === userId) {
      HubStore.setCurrentUser({ ...cur, fcmToken: token });
    }
    supabase.update("profiles", `id=eq.${userId}`, { fcm_token: token });
    return true;
  },

  sendPushToAll: async (title: string, body: string) => {
    const users = HubStore.getUsers();
    const tokens = users.map((u) => u.fcmToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;
    // Use Firebase REST API with server key
    const SERVER_KEY = (import.meta.env as Record<string, string | undefined>)["VITE_FCM_SERVER_KEY"] || "";
    if (!SERVER_KEY) return;
    await Promise.all(
      tokens.map((token) =>
        fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: token,
            notification: { title, body, icon: "/buildicy-mark.png", click_action: "/" },
          }),
        }).catch(() => {}),
      ),
    );
  },

  addNotification: (notif: Omit<NotificationItem, "id" | "isRead" | "createdAt">) => {
    const all = HubStore.getNotifications();
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setStored("buildicy_notifications", [newNotif, ...all]);

    // Live sonner toast for immediate user awareness
    if (typeof window !== "undefined") {
      const cur = HubStore.getCurrentUser();
      const isRelevant = !cur || notif.userId === "all" || notif.userId === cur.id || notif.userId === cur.email;
      if (isRelevant) {
        toast.info(notif.title, {
          description: notif.body,
        });
      }
    }
    // Fire push to all registered devices
    HubStore.sendPushToAll(notif.title, notif.body);
  },

  markNotificationRead: (id?: string) => {
    const all = HubStore.getNotifications();
    const updated = all.map((n) => (id === undefined || n.id === id ? { ...n, isRead: true } : n));
    setStored("buildicy_notifications", updated);
  },

  clearAllNotifications: () => {
    setStored("buildicy_notifications", []);
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

    // Real-time polling every 4s for rapid cross-client and incognito sync
    const pollInterval = setInterval(() => {
      HubStore.syncFromSupabase().then(() => {
        setLeads(HubStore.getLeads());
        setNotifications(HubStore.getNotifications());
        setActivities(HubStore.getActivities());
        setUsers(HubStore.getUsers());
        setChannels(HubStore.getChannels());
        setVersion((v) => v + 1);
      });
    }, 4000);

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

    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel("buildicy_hub_bus");
      bus.onmessage = () => {
        refresh();
      };
    } catch {}

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("buildicy_storage_update", refresh);
      window.removeEventListener("storage", refresh);
      try {
        bus?.close();
      } catch {}
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
