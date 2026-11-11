import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, X, Minimize2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile } from "@/lib/supabase/types";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function askGemini(messages: Message[], systemPrompt: string): Promise<string> {
  if (!GEMINI_KEY) {
    return "⚠️ Gemini API key not set. Add `VITE_GEMINI_API_KEY` to your `.env` file.";
  }
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
}

function buildSystemPrompt(user: UserProfile): string {
  const leads = HubStore.getLeads();
  const users = HubStore.getUsers();
  const updates = HubStore.getDailyUpdates(user.id);
  const notifications = HubStore.getNotifications().slice(0, 5);

  const leadsSnippet = leads
    .slice(0, 10)
    .map((l) => `${l.name} (${l.company}) — ${l.status} — $${l.value} — Owner: ${l.ownerName}`)
    .join("\n");

  const teamSnippet = users
    .filter((u) => u.role !== "founder")
    .map((u) => `${u.name} (${u.title}) — Status: ${u.workingStatus || "Active"}`)
    .join("\n");

  const todayUpdate = updates[0];

  if (user.role === "founder") {
    return `You are Buildicy AI, an executive assistant for the Founder & CEO of Buildicy — a marketing agency.
You have full visibility into the team's pipeline, performance, and daily updates.

CURRENT TEAM:
${teamSnippet}

PIPELINE SNAPSHOT (top 10 leads):
${leadsSnippet || "No leads yet."}

RECENT NOTIFICATIONS:
${notifications.map((n) => `• ${n.title}: ${n.body}`).join("\n") || "None"}

YOUR ROLE:
- Give the founder sharp, concise insights on pipeline health, team performance, and priorities
- Help draft messages, follow-up plans, or reassignment decisions
- Summarize daily team updates when asked
- Suggest which leads to prioritize or close
- Be direct, data-driven, and executive-level in tone
- Keep responses under 200 words unless asked for detail`;
  }

  return `You are Buildicy AI, a personal work assistant for ${user.name} (${user.title}) at Buildicy.

YOUR ASSIGNED LEADS:
${leads
  .filter((l) => l.ownerId === user.id || l.ownerName.toLowerCase().includes(user.name.toLowerCase()))
  .slice(0, 8)
  .map((l) => `${l.name} (${l.company}) — ${l.status} — $${l.value}`)
  .join("\n") || "No leads assigned yet."}

TODAY'S UPDATE (if submitted):
${
  todayUpdate
    ? `Outreach: ${todayUpdate.totalOutreachCount}, Responses: ${todayUpdate.responsesReceivedCount}, Meetings: ${todayUpdate.meetingsBookedCount}`
    : "Not submitted yet."
}

YOUR ROLE:
- Help ${user.name} write their daily update — ask for outreach count, responses, meetings, wins, blockers
- Suggest follow-up messages for leads
- Help draft outreach emails or WhatsApp messages
- Remind about pending follow-ups
- Be friendly, motivating, and practical
- Keep responses concise and actionable`;
}

export function GeminiAgent({ currentUser }: { currentUser: UserProfile }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting =
        currentUser.role === "founder"
          ? `Hey! I'm your Buildicy AI assistant 👋\n\nI have full visibility into your team's pipeline and performance. Ask me anything — pipeline health, team updates, lead priorities, or draft a message.`
          : `Hey ${currentUser.name}! I'm your Buildicy AI assistant 👋\n\nI can help you:\n• Write your daily update\n• Draft outreach messages\n• Check your lead pipeline\n• Plan follow-ups\n\nWhat do you need today?`;
      setMessages([{ role: "assistant", text: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const updated: Message[] = [...messages, { role: "user", text }];
    setMessages(updated);
    setLoading(true);
    try {
      const reply = await askGemini(updated, buildSystemPrompt(currentUser));
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `❌ Error: ${err.message || "Something went wrong."}` },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button className="gemini-fab" onClick={() => setOpen(true)} aria-label="Open AI assistant">
          <Sparkles />
          <span>AI</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={`gemini-window ${minimized ? "minimized" : ""}`}>
          <div className="gemini-header">
            <div className="gemini-header-info">
              <span className="gemini-avatar"><Sparkles /></span>
              <div>
                <strong>Buildicy AI</strong>
                <small>Powered by Gemini</small>
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={() => setMinimized((m) => !m)} aria-label="Minimize">
                <Minimize2 />
              </button>
              <button onClick={() => { setOpen(false); setMessages([]); }} aria-label="Close">
                <X />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="gemini-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`gemini-msg ${m.role}`}>
                    {m.role === "assistant" && <span className="gemini-msg-avatar"><Bot size={13} /></span>}
                    <p>{m.text}</p>
                  </div>
                ))}
                {loading && (
                  <div className="gemini-msg assistant">
                    <span className="gemini-msg-avatar"><Bot size={13} /></span>
                    <p className="gemini-typing"><Loader2 size={13} className="spin" /> Thinking...</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <div className="gemini-quick-prompts">
                  {(currentUser.role === "founder"
                    ? ["Pipeline summary", "Team performance today", "Which leads to prioritize?", "Draft a follow-up plan"]
                    : ["Help me write my daily update", "Draft an outreach email", "What leads need follow-up?", "Motivate me 💪"]
                  ).map((p) => (
                    <button key={p} onClick={() => { setInput(p); setTimeout(() => send(), 50); }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <form className="gemini-composer" onSubmit={send}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={loading}
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send size={14} />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
