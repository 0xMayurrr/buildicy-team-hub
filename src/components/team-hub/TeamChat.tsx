import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Hash,
  Send,
  Plus,
  Users,
  Trash2,
  MessageCircle,
  Check,
  Shield,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, PageTitle } from "./shared";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile, ChatChannel, ChatMessage } from "@/lib/supabase/types";
import { getWorkingStatusConfig } from "./performance-constants";

interface TeamChatProps {
  currentUser: UserProfile;
  users: UserProfile[];
}

export function TeamChat({ currentUser, users }: TeamChatProps) {
  const isFounder = currentUser.role === "founder";
  const [channels, setChannels] = useState<ChatChannel[]>(() => HubStore.getChannels());
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() =>
    users.filter((u) => u.id !== currentUser.id).map((u) => u.id),
  );
  const [, setRefreshCount] = useState(0);

  // Filter channels according to RBAC:
  // - Founder sees all created channels
  // - Team members see ONLY channels they have been explicitly added to
  const visibleChannels = useMemo(() => {
    return channels.filter((c) => {
      if (isFounder) return true;
      return Array.isArray(c.memberIds) && c.memberIds.includes(currentUser.id);
    });
  }, [channels, isFounder, currentUser.id]);

  // Direct message contacts (other team members)
  const dmContacts = useMemo(() => {
    return users
      .filter((u) => u.id !== currentUser.id && u.email.toLowerCase() !== currentUser.email.toLowerCase())
      .map((u) => {
        const channelId = HubStore.getDmChannelId(currentUser.email, u.email);
        const msgs = HubStore.getChat(channelId);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        return {
          id: channelId,
          name: u.name,
          member: u,
          msgCount: msgs.length,
          lastMsg,
        };
      });
  }, [users, currentUser]);

  // Active channel/DM state
  const [active, setActive] = useState<string>(() => {
    if (visibleChannels.length > 0 && visibleChannels[0]) return visibleChannels[0].id;
    if (dmContacts.length > 0 && dmContacts[0]) return dmContacts[0].id;
    return "";
  });

  // Ensure active channel is valid
  useEffect(() => {
    const isValidGroup = visibleChannels.some((c) => c.id === active);
    const isValidDm = dmContacts.some((d) => d.id === active);
    if (!isValidGroup && !isValidDm) {
      if (visibleChannels.length > 0 && visibleChannels[0]) {
        setActive(visibleChannels[0].id);
      } else if (dmContacts.length > 0 && dmContacts[0]) {
        setActive(dmContacts[0].id);
      }
    }
  }, [visibleChannels, dmContacts, active]);

  // Listen for storage updates and multi-tab messages
  useEffect(() => {
    const onUpdate = () => {
      setChannels(HubStore.getChannels());
      setRefreshCount((c) => c + 1);
    };

    window.addEventListener("buildicy_storage_update", onUpdate);
    window.addEventListener("storage", onUpdate);

    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel("buildicy_hub_bus");
      bus.onmessage = () => {
        onUpdate();
      };
    } catch {}

    // Polling sync with remote Supabase for cross-device / incognito messaging
    HubStore.syncFromSupabase();
    const interval = setInterval(() => {
      HubStore.syncFromSupabase();
    }, 1500);

    return () => {
      window.removeEventListener("buildicy_storage_update", onUpdate);
      window.removeEventListener("storage", onUpdate);
      clearInterval(interval);
      try {
        bus?.close();
      } catch {}
    };
  }, []);

  // Determine current active item (group channel vs DM)
  const currentGroup = visibleChannels.find((c) => c.id === active);
  const currentDm = dmContacts.find((d) => d.id === active);
  const messages = active ? HubStore.getChat(active) : [];

  // Active verified members in group channel
  const activeGroupMembers = useMemo(() => {
    if (!currentGroup || !Array.isArray(currentGroup.memberIds)) return [];
    return users.filter((u) => currentGroup.memberIds.includes(u.id));
  }, [currentGroup, users]);

  const handleSendMessage = (text: string) => {
    if (!active || !text.trim()) return;
    HubStore.sendChatMessage(active, text.trim());
    setRefreshCount((c) => c + 1);
  };

  const handleCreateGroup = (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name.");
      return;
    }

    const created = HubStore.createChannel({
      name: newGroupName,
      description: newGroupDesc,
      memberIds: selectedMemberIds,
    });

    if (created) {
      toast.success(`Group #${created.name} created with ${created.memberIds.length} members!`);
      setChannels(HubStore.getChannels());
      setActive(created.id);
      setNewGroupName("");
      setNewGroupDesc("");
      setCreateOpen(false);
    }
  };

  const handleDeleteGroup = (channelId: string, name: string) => {
    if (!isFounder) return;
    if (confirm(`Are you sure you want to delete group #${name}? This cannot be undone.`)) {
      HubStore.deleteChannel(channelId);
      setChannels(HubStore.getChannels());
      toast.success(`Group #${name} removed.`);
      if (dmContacts.length > 0 && dmContacts[0]) {
        setActive(dmContacts[0].id);
      }
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <>
      <PageTitle
        eyebrow="Real-Time Workspace Messaging"
        title="Team Chat & Direct Messages"
        description="Fast real-time conversations across custom groups and private direct messages."
        action={
          isFounder ? (
            <Button
              className="primary-pill"
              onClick={() => {
                setSelectedMemberIds(users.filter((u) => u.id !== currentUser.id).map((u) => u.id));
                setCreateOpen(true);
              }}
            >
              <Plus size={14} style={{ marginRight: "6px" }} />
              Create Group Channel
            </Button>
          ) : undefined
        }
      />

      <section className="chat-layout">
        {/* Left Navigation Sidebar */}
        <aside className="chat-list" style={{ display: "flex", flexDirection: "column" }}>
          <div className="chat-items">
            {/* Channels Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 8px 8px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.5px",
                }}
              >
                Channels ({visibleChannels.length})
              </p>
              {isFounder && (
                <button
                  onClick={() => {
                    setSelectedMemberIds(users.filter((u) => u.id !== currentUser.id).map((u) => u.id));
                    setCreateOpen(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                  title="Create group"
                >
                  <Plus size={12} />
                  <span>New</span>
                </button>
              )}
            </div>

            {/* Channels List */}
            {visibleChannels.map((c) => (
              <button
                key={c.id}
                className={active === c.id ? "active" : ""}
                onClick={() => setActive(c.id)}
              >
                <span className="channel-icon">
                  <Hash />
                </span>
                <span>{c.name}</span>
              </button>
            ))}

            {visibleChannels.length === 0 && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "var(--muted)",
                  margin: "4px 6px 12px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {isFounder
                    ? "No custom groups created yet."
                    : "No team channels yet."}
                </p>
                {isFounder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMemberIds(users.filter((u) => u.id !== currentUser.id).map((u) => u.id));
                      setCreateOpen(true);
                    }}
                    style={{
                      marginTop: "8px",
                      width: "100%",
                      fontSize: "11px",
                      height: "28px",
                      borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    <Plus size={12} style={{ marginRight: "4px" }} />
                    Create Group
                  </Button>
                )}
              </div>
            )}

            {/* Direct Messages Header */}
            <p
              style={{
                margin: "20px 8px 8px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
                letterSpacing: "0.5px",
              }}
            >
              Direct Messages
            </p>

            {/* Direct Messages List */}
            {dmContacts.map((d) => (
              <button
                key={d.id}
                className={active === d.id ? "active" : ""}
                onClick={() => setActive(d.id)}
                style={{ position: "relative" }}
              >
                <Avatar initials={d.member.initials} color={d.member.color} avatarUrl={d.member.avatarUrl} size="sm" />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: "12px", fontWeight: 600 }}>{d.name}</strong>
                  <small
                    style={{
                      fontSize: "10px",
                      color: d.lastMsg ? "var(--foreground)" : "var(--muted-foreground)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                  >
                    {d.lastMsg ? `${d.lastMsg.author === currentUser.name ? "You: " : ""}${d.lastMsg.text}` : d.member.title}
                  </small>
                </span>
                {d.msgCount > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      background: active === d.id ? "#0f0f11" : "var(--muted)",
                      color: active === d.id ? "#fff" : "var(--muted-foreground)",
                      borderRadius: "10px",
                      padding: "1px 6px",
                      marginLeft: "auto",
                    }}
                  >
                    {d.msgCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Room Area */}
        <div className="chat-room">
          {/* Room Header */}
          <div
            className="chat-room-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {currentGroup ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="channel-icon" style={{ width: "34px", height: "34px" }}>
                    <Hash size={18} />
                  </span>
                  <div className="avatar-stack" style={{ padding: 0 }}>
                    {activeGroupMembers.slice(0, 4).map((gm) => (
                      <Avatar
                        key={gm.id}
                        initials={gm.initials}
                        color={gm.color}
                        avatarUrl={gm.avatarUrl}
                        size="sm"
                      />
                    ))}
                    {activeGroupMembers.length > 4 && (
                      <span style={{ width: "26px", height: "26px", fontSize: "9px" }}>
                        +{activeGroupMembers.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              ) : currentDm ? (
                <Avatar
                  initials={currentDm.member.initials}
                  color={currentDm.member.color}
                  avatarUrl={currentDm.member.avatarUrl}
                  size="md"
                />
              ) : (
                <span className="channel-icon">
                  <MessageCircle size={16} />
                </span>
              )}

              <div>
                <strong style={{ fontSize: "15px", display: "block" }}>
                  {currentGroup ? `#${currentGroup.name}` : currentDm ? currentDm.name : "Select a conversation"}
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {currentGroup
                    ? currentGroup.description
                      ? `${currentGroup.description} · ${activeGroupMembers.length} members`
                      : `${activeGroupMembers.length} members in this group`
                    : currentDm
                    ? `${currentDm.member.title} (${currentDm.member.email})`
                    : "No conversation selected"}
                </span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {currentDm && (
                <span
                  className="working-status-pill"
                  style={{
                    background: getWorkingStatusConfig(currentDm.member.workingStatus).bgColor,
                    padding: "3px 8px",
                    fontSize: "11px",
                  }}
                >
                  <span
                    className="status-dot"
                    style={{
                      background: getWorkingStatusConfig(currentDm.member.workingStatus).dotColor,
                      color: getWorkingStatusConfig(currentDm.member.workingStatus).dotColor,
                    }}
                  />
                  {currentDm.member.workingStatus || "Outreach"}
                </span>
              )}

              {/* Founder can delete custom group */}
              {isFounder && currentGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGroup(currentGroup.id, currentGroup.name)}
                  style={{ color: "var(--destructive)", height: "30px", fontSize: "11px" }}
                >
                  <Trash2 size={13} style={{ marginRight: "4px" }} />
                  Delete Group
                </Button>
              )}

              {/* Clear conversation messages button */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all messages in this conversation?")) {
                      HubStore.clearChatChannel(active);
                      toast.success("Conversation cleared.");
                    }
                  }}
                  style={{ color: "var(--destructive)", height: "30px", fontSize: "11px" }}
                  title="Clear all messages"
                >
                  <Trash2 size={13} style={{ marginRight: "4px" }} />
                  Clear Chat
                </Button>
              )}
            </div>
          </div>

          {/* Conversation Messages */}
          <ChatConversation
            messages={messages}
            channelId={active}
            currentUser={currentUser}
            users={users}
            placeholder={
              currentGroup
                ? `Message #${currentGroup.name}…`
                : currentDm
                ? `Message ${currentDm.name}…`
                : "Type your message…"
            }
            emptyMessage={
              currentGroup
                ? `Welcome to #${currentGroup.name}! Start the conversation with your team.`
                : currentDm
                ? `This is the start of your direct conversation with ${currentDm.name}. Messages are real-time & private.`
                : "Select a channel or direct message to begin chatting."
            }
            onSend={handleSendMessage}
          />
        </div>
      </section>

      {/* Create Group Dialog (Founder Only) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="hub-dialog" style={{ maxWidth: "480px" }}>
          <DialogHeader>
            <DialogTitle>Create Group Channel</DialogTitle>
            <DialogDescription>
              Create a custom team channel and select which members can view and collaborate in it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroup}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "10px 0" }}>
              <label>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Channel Name
                </span>
                <Input
                  required
                  placeholder="e.g. outreach-squad, q4-campaigns, deals"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ height: "38px" }}
                />
              </label>

              <label>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Description (Optional)
                </span>
                <Input
                  placeholder="e.g. Outbound marketing lead qualification & discussion"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  style={{ height: "38px" }}
                />
              </label>

              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Select Members to Add
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    padding: "4px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  {users
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => {
                      const isSelected = selectedMemberIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleMemberSelection(u.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            background: isSelected ? "var(--accent)" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Avatar initials={u.initials} color={u.color} avatarUrl={u.avatarUrl} size="sm" />
                            <div>
                              <strong style={{ fontSize: "12px", display: "block" }}>{u.name}</strong>
                              <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                                {u.title} · {u.department}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              border: isSelected ? "none" : "1px solid var(--border)",
                              background: isSelected ? "var(--primary)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                            }}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <DialogFooter style={{ marginTop: "12px" }}>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="primary-pill">
                Create Group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChatConversation({
  messages,
  channelId,
  currentUser,
  users,
  placeholder,
  emptyMessage,
  onSend,
}: {
  messages: ChatMessage[];
  channelId: string;
  currentUser: UserProfile;
  users: UserProfile[];
  placeholder: string;
  emptyMessage: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="conversation" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="message-list" style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        {messages.map((m) => {
          const isOwn = m.userId === currentUser.id || m.author === currentUser.name;
          const authorUser = users.find((u) => u.id === m.userId || u.name === m.author);
          return (
            <div key={m.id} className={isOwn ? "message own" : "message"}>
              {!isOwn && (
                <Avatar
                  initials={m.initials}
                  color={m.color}
                  avatarUrl={authorUser?.avatarUrl}
                  size="sm"
                />
              )}
              <div className="msg-content-wrap">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {isOwn ? "You" : m.author} · {m.time}
                  <button
                    className="chat-msg-del"
                    title="Delete message"
                    onClick={() => {
                      if (confirm("Delete this message?")) {
                        HubStore.deleteChatMessage(m.channelId || channelId, m.id);
                        toast.success("Message deleted");
                      }
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
                <p>{m.text}</p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--muted-foreground)",
              fontSize: "13px",
              padding: "40px 20px",
              maxWidth: "340px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "var(--muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
                color: "var(--primary)",
              }}
            >
              <MessageCircle size={20} />
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{emptyMessage}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <Textarea
          aria-label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
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

