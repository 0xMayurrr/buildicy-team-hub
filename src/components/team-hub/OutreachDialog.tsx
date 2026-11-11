import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail, Phone, MessageSquare, Calendar, Linkedin, MoreHorizontal, Send, Clock } from "lucide-react";
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
import { HubStore } from "@/lib/supabase/store";
import type { Lead, UserProfile, OutreachChannel, ProspectResponse, LeadStatus } from "@/lib/supabase/types";
import { OUTREACH_CHANNELS, PROSPECT_RESPONSES } from "./performance-constants";

interface OutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  currentUser: UserProfile;
  onSuccess?: () => void;
}

const CHANNEL_ICONS: Record<OutreachChannel, typeof Mail> = {
  Email: Mail,
  WhatsApp: MessageSquare,
  Call: Phone,
  Meeting: Calendar,
  LinkedIn: Linkedin,
  Other: MoreHorizontal,
};

const STATUS_OPTIONS: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export function OutreachDialog({
  open,
  onOpenChange,
  lead,
  currentUser,
  onSuccess,
}: OutreachDialogProps) {
  const [channel, setChannel] = useState<OutreachChannel>("Email");
  const [prospectResponse, setProspectResponse] = useState<ProspectResponse>("Positive response");
  const [statusAtTime, setStatusAtTime] = useState<LeadStatus>(
    lead.status === "New" ? "Contacted" : lead.status,
  );
  const [notes, setNotes] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState(
    new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please add outreach notes describing the interaction.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedResp = PROSPECT_RESPONSES.find((r) => r.response === prospectResponse);
      const isPositive = selectedResp ? selectedResp.isPositive : false;

      HubStore.addOutreach({
        leadId: lead.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userInitials: currentUser.initials,
        userColor: currentUser.color,
        channel,
        notes: notes.trim(),
        prospectResponse,
        isPositive,
        statusAtTime,
        nextFollowupDate: nextFollowupDate || undefined,
      });

      toast.success(`${channel} outreach logged for ${lead.name}`);
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to log outreach interaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hub-dialog" style={{ maxWidth: "540px" }}>
        <DialogHeader>
          <DialogTitle>Log Outreach Interaction</DialogTitle>
          <DialogDescription>
            Record touchpoints, prospect reactions, and next follow-up for <strong>{lead.name}</strong> ({lead.company}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="lead-form">
          {/* Communication Channel */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
              Communication Channel
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {OUTREACH_CHANNELS.map((ch) => {
                const Icon = CHANNEL_ICONS[ch];
                const active = channel === ch;
                return (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => setChannel(ch)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: active ? 600 : 500,
                      border: active ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                      background: active ? "color-mix(in oklab, var(--primary) 10%, transparent)" : "var(--background)",
                      color: active ? "var(--primary)" : "var(--foreground)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={14} />
                    <span>{ch}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prospect Response */}
          <label style={{ gridColumn: "1 / -1" }}>
            Prospect's Response
            <select
              value={prospectResponse}
              onChange={(e) => setProspectResponse(e.target.value as ProspectResponse)}
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "8px",
                padding: "0 10px",
                background: "var(--input)",
                border: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              {PROSPECT_RESPONSES.map((r) => (
                <option key={r.response} value={r.response}>
                  {r.label} {r.isPositive ? "✨" : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Outreach Notes */}
          <label style={{ gridColumn: "1 / -1" }}>
            Interaction Notes & Prospect Feedback
            <Textarea
              required
              rows={3}
              placeholder="e.g. Sent pricing structure via Email. Prospect replied interested in Buildicy 2.0 and requested a Zoom demo on Friday."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ fontSize: "13px" }}
            />
          </label>

          {/* Update Lead Status */}
          <label>
            Update Lead Status
            <select
              value={statusAtTime}
              onChange={(e) => setStatusAtTime(e.target.value as LeadStatus)}
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "8px",
                padding: "0 10px",
                background: "var(--input)",
                border: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {/* Next Follow-up Date */}
          <label>
            Next Follow-up Date
            <Input
              type="date"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
              style={{ height: "40px", fontSize: "13px" }}
            />
          </label>

          <DialogFooter className="form-footer" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="primary-pill" disabled={isSubmitting}>
              <Send size={13} style={{ marginRight: "6px" }} />
              {isSubmitting ? "Saving..." : "Save Outreach Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

