import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { Hash, Send, Plus, Trash2, MessageCircle, Check, UserPlus, Copy, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, PageTitle } from "./shared";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile, ChatChannel, ChatMessage } from "@/lib/supabase/types";
import { getWorkingStatusConfig } from "./performance-constants";

interface TeamChatProps {
  currentUser: UserProfile;
  users: UserProfile[];
}

// ── Invite helpers (internal workspace only) ─────────────────────────────────
const INVITES_KEY = "buildicy_dm_invites";
interface DmInvite { code: string; fromId: string; fromName: string; toId: string; toName: string; accepted: boolean; }

function getInvites(): DmInvite[] {
  try { return JSON.parse(localStorage.getItem(INVITES_KEY) || "[]"); } catch { return []; }
}
function saveInvites(list: DmInvite[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("buildicy_storage_update"));
}
function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function unlockedMemberIds(myId: string): Set<string> {
  const s = new Set<string>();
  getInvites().forEach((inv) => {
    if (!inv.accepted) return;
    if (inv.fromId === myId) s.add(inv.toId);
    if (inv.toId === myId) s.add(inv.fromId);
  });
  return s;
}

export function TeamChat({ currentUser, users }: TeamChatProps) {
  const isFounder = currentUser.role === "founder";
  const [channels, setChannels] = useState<ChatChannel[]>(() => HubStore.getChannels());
  const [, setTick] = useState(0);
  const refresh = () => { setChannels(HubStore.getChannels()); setTick((t) => t + 1); };

  // invite state
  const [invitePickOpen, setInvitePickOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [inviteTarget, setInviteTarget] = useState<UserProfile | null>(null);
  const [enterCodeOpen, setEnterCodeOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");

  // group create
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const unlocked = useMemo(() => unlockedMemberIds(currentUser.id), [currentUser.id]);

  const visibleChannels = useMemo(() =>
    channels.filter((c) => isFounder || (Array.isArray(c.memberIds) && c.memberIds.includes(currentUser.id))),
    [channels, isFounder, currentUser.id]
  );

  // Founder sees all members as DM contacts.
  // Members see: founder always + any unlocked peers.
  const dmContacts = useMemo(() => {
    const eligible = users.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (isFounder) return true;
      if (u.role === "founder") return true; // always unlocked for members
      return unlocked.has(u.id);
    });
    return eligible.map((u) => {
      const chId = HubStore.getDmChannelId(currentUser.email, u.email);
      const msgs = HubStore.getChat(chId);
      return { id: chId, name: u.name, member: u, lastMsg: msgs[msgs.length - 1] ?? null, msgCount: msgs.length };
    });
  }, [users, currentUser, isFounder, unlocked]);

  // Members who can be invited (not yet unlocked, not founder, not self)
  const invitableMembers = useMemo(() =>
    isFounder ? [] : users.filter((u) => u.id !== currentUser.id && u.role !== "founder" && !unlocked.has(u.id)),
    [users, currentUser, isFounder, unlocked]
  );

  // Pending invites sent TO me
  const pendingForMe = useMemo(() =>
    getInvites().filter((inv) => inv.toId === currentUser.id && !inv.accepted),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser.id, unlocked]
  );

  const [active, setActive] = useState<string>(() =>
    dmContacts[0]?.id ?? visibleChannels[0]?.id ?? ""
  );

  useEffect(() => {
    const valid = visibleChannels.some((c) => c.id === active) || dmContacts.some((d) => d.id === active);
    if (!valid) setActive(dmContacts[0]?.id ?? visibleChannels[0]?.id ?? "");
  }, [visibleChannels, dmContacts, active]);

  useEffect(() => {
    window.addEventListener("buildicy_storage_update", refresh);
    window.addEventListener("storage", refresh);
    let bus: BroadcastChannel | null = null;
    try { bus = new BroadcastChannel("buildicy_hub_bus"); bus.onmessage = refresh; } catch {}
    HubStore.syncFromSupabase();
    const iv = setInterval(() => HubStore.syncFromSupabase(), 1500);
    return () => {
      window.removeEventListener("buildicy_storage_update", refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(iv);
      try { bus?.close(); } catch {}
    };
  }, []);

  const currentGroup = visibleChannels.find((c) => c.id === active);
  const currentDm = dmContacts.find((d) => d.id === active);
  const messages = active ? HubStore.getChat(active) : [];
  const activeGroupMembers = useMemo(() =>
    currentGroup ? users.filter((u) => currentGroup.memberIds?.includes(u.id)) : [],
    [currentGroup, users]
  );

  // ── handlers ──
  const handleSend = (text: string) => { if (active && text.trim()) { HubStore.sendChatMessage(active, text.trim()); refresh(); } };

  const handleCreateGroup = (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) { toast.error("Enter a group name."); return; }
    const created = HubStore.createChannel({ name: newGroupName, description: newGroupDesc, memberIds: selectedMemberIds });
    if (created) { toast.success(`#${created.name} created!`); setChannels(HubStore.getChannels()); setActive(created.id); setNewGroupName(""); setNewGroupDesc(""); setCreateOpen(false); }
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (!isFounder || !confirm(`Delete #${name}?`)) return;
    HubStore.deleteChannel(id); setChannels(HubStore.getChannels()); toast.success(`#${name} deleted.`);
    setActive(dmContacts[0]?.id ?? "");
  };

  // Send invite: generate code, store pending invite, show code dialog
  const handleSendInvite = (target: UserProfile) => {
    const code = genCode();
    const all = getInvites();
    // remove any old pending invite between same pair
    const filtered = all.filter((i) => !(i.fromId === currentUser.id && i.toId === target.id && !i.accepted));
    filtered.push({ code, fromId: currentUser.id, fromName: currentUser.name, toId: target.id, toName: target.name, accepted: false });
    saveInvites(filtered);
    // also push a workspace notification so target sees it
    HubStore.addNotification({ title: `💬 Chat invite from ${currentUser.name}`, body: `Use code ${code} to unlock DM with ${currentUser.name}`, time: "Just now", userId: target.id });
    setInviteTarget(target);
    setGeneratedCode(code);
    setInvitePickOpen(false);
    setCodeDialogOpen(true);
  };

  const handleAcceptCode = () => {
    const code = enteredCode.trim().toUpperCase();
    const all = getInvites();
    const idx = all.findIndex((i) => i.code === code && i.toId === currentUser.id && !i.accepted);
    if (idx === -1) { toast.error("Invalid or already used code."); return; }
    all[idx]!.accepted = true;
    saveInvites(all);
    toast.success(`Chat with ${all[idx]!.fromName} unlocked!`);
    setEnterCodeOpen(false); setEnteredCode(""); refresh();
  };

  const handleAcceptPending = (inv: DmInvite) => {
    const all = getInvites();
    const idx = all.findIndex((i) => i.code === inv.code);
    if (idx !== -1) { all[idx]!.accepted = true; saveInvites(all); }
    toast.success(`Chat with ${inv.fromName} unlocked!`); refresh();
  };

  const toggleMember = (id: string) =>
    setSelectedMemberIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <>
      <PageTitle
        eyebrow="Real-Time Workspace Messaging"
        title="Team Chat & Direct Messages"
        description={isFounder ? "Chat with all team members directly." : "Chat with the founder. Invite workspace members to unlock peer DMs."}
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            {!isFounder && invitableMembers.length > 0 && (
              <Button variant="outline" style={{ fontSize: "12px", height: "34px", borderColor: "var(--primary)", color: "var(--primary)" }}
                onClick={() => setInvitePickOpen(true)}>
                <UserPlus size={13} style={{ marginRight: "5px" }} /> Invite to Chat
              </Button>
            )}
            {!isFounder && (
              <Button variant="outline" style={{ fontSize: "12px", height: "34px" }} onClick={() => setEnterCodeOpen(true)}>
                <Unlock size={13} style={{ marginRight: "5px" }} /> Enter Invite Code
              </Button>
            )}
            {isFounder && (
              <Button className="primary-pill" onClick={() => { setSelectedMemberIds(users.filter((u) => u.id !== currentUser.id).map((u) => u.id)); setCreateOpen(true); }}>
                <Plus size={14} style={{ marginRight: "6px" }} /> Create Group Channel
              </Button>
            )}
          </div>
        }
      />

      {/* Pending invites banner */}
      {!isFounder && pendingForMe.length > 0 && (
        <div style={{ background: "color-mix(in oklab, var(--primary) 8%, white)", border: "1px solid color-mix(in oklab, var(--primary) 25%, transparent)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <strong style={{ fontSize: "12px", color: "var(--primary)" }}>📬 Pending Chat Invites</strong>
          {pendingForMe.map((inv) => (
            <div key={inv.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: "8px", padding: "8px 12px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "13px" }}><strong>{inv.fromName}</strong> wants to chat with you</span>
              <Button size="sm" className="primary-pill" style={{ height: "28px", fontSize: "11px" }} onClick={() => handleAcceptPending(inv)}>
                <Check size={12} style={{ marginRight: "4px" }} /> Accept
              </Button>
            </div>
          ))}
        </div>
      )}

      <section className="chat-layout">
        <aside className="chat-list" style={{ display: "flex", flexDirection: "column" }}>
          <div className="chat-items">
            {/* Channels */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 8px" }}>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>
                Channels ({visibleChannels.length})
              </p>
              {isFounder && (
                <button onClick={() => { setSelectedMemberIds(users.filter((u) => u.id !== currentUser.id).map((u) => u.id)); setCreateOpen(true); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "var(--primary)", fontSize: "11px", fontWeight: 600, cursor: "pointer", padding: "2px 6px", borderRadius: "4px" }}>
                  <Plus size={12} /><span>New</span>
                </button>
              )}
            </div>
            {visibleChannels.map((c) => (
              <button key={c.id} className={active === c.id ? "active" : ""} onClick={() => setActive(c.id)}>
                <span className="channel-icon"><Hash /></span><span>{c.name}</span>
              </button>
            ))}
            {visibleChannels.length === 0 && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--muted)", margin: "4px 6px 12px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--muted-foreground)" }}>{isFounder ? "No groups yet." : "No channels yet."}</p>
              </div>
            )}

            {/* DMs */}
            <p style={{ margin: "20px 8px 8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>
              Direct Messages
            </p>
            {dmContacts.map((d) => (
              <button key={d.id} className={active === d.id ? "active" : ""} onClick={() => setActive(d.id)}>
                <Avatar initials={d.member.initials} color={d.member.color} avatarUrl={d.member.avatarUrl} size="sm" />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: "12px", fontWeight: 600 }}>{d.name}</strong>
                  <small style={{ fontSize: "10px", color: d.lastMsg ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                    {d.lastMsg ? `${d.lastMsg.author === currentUser.name ? "You: " : ""}${d.lastMsg.text}` : d.member.title}
                  </small>
                </span>
              </button>
            ))}
            {dmContacts.length === 0 && !isFounder && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--muted)", margin: "4px 6px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--muted-foreground)" }}>Only founder is available by default. Invite teammates to unlock peer DMs.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat room */}
        <div className="chat-room">
          <div className="chat-room-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {currentGroup ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="channel-icon" style={{ width: "34px", height: "34px" }}><Hash size={18} /></span>
                  <div className="avatar-stack" style={{ padding: 0 }}>
                    {activeGroupMembers.slice(0, 4).map((gm) => <Avatar key={gm.id} initials={gm.initials} color={gm.color} avatarUrl={gm.avatarUrl} size="sm" />)}
                    {activeGroupMembers.length > 4 && <span style={{ width: "26px", height: "26px", fontSize: "9px" }}>+{activeGroupMembers.length - 4}</span>}
                  </div>
                </div>
              ) : currentDm ? (
                <Avatar initials={currentDm.member.initials} color={currentDm.member.color} avatarUrl={currentDm.member.avatarUrl} size="md" />
              ) : (
                <span className="channel-icon"><MessageCircle size={16} /></span>
              )}
              <div>
                <strong style={{ fontSize: "15px", display: "block" }}>
                  {currentGroup ? `#${currentGroup.name}` : currentDm ? currentDm.name : "Select a conversation"}
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {currentGroup ? `${currentGroup.description ? currentGroup.description + " · " : ""}${activeGroupMembers.length} members`
                    : currentDm ? `${currentDm.member.title} · ${currentDm.member.email}` : "No conversation selected"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {currentDm && (
                <span className="working-status-pill" style={{ background: getWorkingStatusConfig(currentDm.member.workingStatus).bgColor, padding: "3px 8px", fontSize: "11px" }}>
                  <span className="status-dot" style={{ background: getWorkingStatusConfig(currentDm.member.workingStatus).dotColor }} />
                  {currentDm.member.workingStatus || "Outreach"}
                </span>
              )}
              {isFounder && currentGroup && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteGroup(currentGroup.id, currentGroup.name)} style={{ color: "var(--destructive)", height: "30px", fontSize: "11px" }}>
                  <Trash2 size={13} style={{ marginRight: "4px" }} /> Delete Group
                </Button>
              )}
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Clear all messages?")) { HubStore.clearChatChannel(active); toast.success("Cleared."); } }} style={{ color: "var(--destructive)", height: "30px", fontSize: "11px" }}>
                  <Trash2 size={13} style={{ marginRight: "4px" }} /> Clear Chat
                </Button>
              )}
            </div>
          </div>
          <ChatConversation
            messages={messages} channelId={active} currentUser={currentUser} users={users}
            placeholder={currentGroup ? `Message #${currentGroup.name}…` : currentDm ? `Message ${currentDm.name}…` : "Select a conversation…"}
            emptyMessage={currentGroup ? `Welcome to #${currentGroup.name}!` : currentDm ? `Start your private conversation with ${currentDm.name}.` : "Select a conversation to begin."}
            onSend={handleSend}
          />
        </div>
      </section>

      {/* Create Group Dialog (Founder only) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="hub-dialog" style={{ maxWidth: "480px" }}>
          <DialogHeader><DialogTitle>Create Group Channel</DialogTitle><DialogDescription>Select members to add to this channel.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreateGroup}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "10px 0" }}>
              <label>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Channel Name</span>
                <Input required placeholder="e.g. outreach-squad" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ height: "38px" }} />
              </label>
              <label>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Description (Optional)</span>
                <Input placeholder="Short description" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} style={{ height: "38px" }} />
              </label>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Select Members</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", padding: "4px", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  {users.filter((u) => u.id !== currentUser.id).map((u) => {
                    const sel = selectedMemberIds.includes(u.id);
                    return (
                      <div key={u.id} onClick={() => toggleMember(u.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "6px", background: sel ? "var(--accent)" : "transparent", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar initials={u.initials} color={u.color} avatarUrl={u.avatarUrl} size="sm" />
                          <div><strong style={{ fontSize: "12px", display: "block" }}>{u.name}</strong><span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{u.title}</span></div>
                        </div>
                        <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: sel ? "none" : "1px solid var(--border)", background: sel ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                          {sel && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter style={{ marginTop: "12px" }}>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="primary-pill">Create Group</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pick who to invite dialog */}
      <Dialog open={invitePickOpen} onOpenChange={setInvitePickOpen}>
        <DialogContent className="hub-dialog" style={{ maxWidth: "400px" }}>
          <DialogHeader><DialogTitle>Invite to Chat</DialogTitle><DialogDescription>Select a workspace member to send a chat invite code.</DialogDescription></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 0", maxHeight: "280px", overflowY: "auto" }}>
            {invitableMembers.map((u) => (
              <div key={u.id} onClick={() => handleSendInvite(u)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Avatar initials={u.initials} color={u.color} avatarUrl={u.avatarUrl} size="sm" />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "13px", display: "block" }}>{u.name}</strong>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{u.title}</span>
                </div>
                <UserPlus size={15} style={{ color: "var(--primary)" }} />
              </div>
            ))}
            {invitableMembers.length === 0 && <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "13px" }}>All workspace members are already connected!</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setInvitePickOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show generated invite code */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="hub-dialog" style={{ maxWidth: "380px" }}>
          <DialogHeader><DialogTitle>Invite Code Generated</DialogTitle><DialogDescription>Share this code with <strong>{inviteTarget?.name}</strong> inside the workspace.</DialogDescription></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
            <div style={{ background: "var(--muted)", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: "11px", color: "var(--muted-foreground)" }}>Invite code for {inviteTarget?.name}</p>
              <strong style={{ fontSize: "32px", letterSpacing: "8px", color: "var(--primary)", fontFamily: "monospace" }}>{generatedCode}</strong>
            </div>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success("Code copied!"); }} style={{ gap: "6px" }}>
              <Copy size={14} /> Copy Code
            </Button>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>
              {inviteTarget?.name} will also see a notification. They can click "Enter Invite Code" to unlock your DM.
            </p>
          </div>
          <DialogFooter><Button className="primary-pill" onClick={() => setCodeDialogOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enter invite code dialog */}
      <Dialog open={enterCodeOpen} onOpenChange={setEnterCodeOpen}>
        <DialogContent className="hub-dialog" style={{ maxWidth: "360px" }}>
          <DialogHeader><DialogTitle>Enter Invite Code</DialogTitle><DialogDescription>Paste the 6-character code your teammate shared with you.</DialogDescription></DialogHeader>
          <div style={{ padding: "10px 0" }}>
            <Input placeholder="A3B9XZ" value={enteredCode} onChange={(e) => setEnteredCode(e.target.value.toUpperCase())} maxLength={6}
              style={{ height: "48px", fontSize: "22px", letterSpacing: "6px", textAlign: "center", fontFamily: "monospace" }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEnterCodeOpen(false); setEnteredCode(""); }}>Cancel</Button>
            <Button className="primary-pill" onClick={handleAcceptCode} disabled={enteredCode.length < 6}>
              <Unlock size={13} style={{ marginRight: "5px" }} /> Unlock Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChatConversation({ messages, channelId, currentUser, users, placeholder, emptyMessage, onSend }: {
  messages: ChatMessage[]; channelId: string; currentUser: UserProfile; users: UserProfile[];
  placeholder: string; emptyMessage: string; onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim()); setText("");
  };

  return (
    <div className="conversation" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="message-list" style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        {messages.map((m) => {
          const isOwn = m.userId === currentUser.id || m.author === currentUser.name;
          const authorUser = users.find((u) => u.id === m.userId || u.name === m.author);
          return (
            <div key={m.id} className={isOwn ? "message own" : "message"}>
              {!isOwn && <Avatar initials={m.initials} color={m.color} avatarUrl={authorUser?.avatarUrl} size="sm" />}
              <div className="msg-content-wrap">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {isOwn ? "You" : m.author} · {m.time}
                  <button className="chat-msg-del" title="Delete" onClick={() => { if (confirm("Delete this message?")) { HubStore.deleteChatMessage(m.channelId || channelId, m.id); toast.success("Deleted"); } }}>
                    <Trash2 size={11} />
                  </button>
                </span>
                <p>{m.text}</p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "13px", padding: "40px 20px", maxWidth: "340px", margin: "0 auto" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "10px", color: "var(--primary)" }}>
              <MessageCircle size={20} />
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{emptyMessage}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={submit}>
        <Textarea aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <Button type="submit" size="icon" aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}
