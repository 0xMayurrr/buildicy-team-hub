import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HubStore } from "@/lib/supabase/store";
import type { UserProfile } from "@/lib/supabase/types";

export interface AvatarOption {
  id: string;
  name: string;
  url: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "avatar-1", name: "Spiky Beard", url: "/avatars/3d-avatar-1.jpg" },
  { id: "avatar-2", name: "Wavy Chestnut", url: "/avatars/3d-avatar-2.jpg" },
  { id: "avatar-3", name: "Textured Quiff", url: "/avatars/3d-avatar-3.jpg" },
  { id: "avatar-4", name: "Curly Afro", url: "/avatars/3d-avatar-4.jpg" },
  { id: "avatar-5", name: "Violet Bob", url: "/avatars/3d-avatar-5.jpg" },
  { id: "avatar-6", name: "Red Cap", url: "/avatars/3d-avatar-6.jpg" },
  { id: "avatar-7", name: "Topknot Scholar", url: "/avatars/3d-avatar-7.jpg" },
  { id: "avatar-8", name: "Curly Specs", url: "/avatars/3d-avatar-8.jpg" },
  { id: "avatar-9", name: "Classic Specs", url: "/avatars/3d-avatar-9.jpg" },
  { id: "avatar-10", name: "Casual Green", url: "/avatars/3d-avatar-10.jpg" },
  { id: "avatar-11", name: "Executive Specs", url: "/avatars/3d-avatar-11.jpg" },
  { id: "avatar-12", name: "Caramel Waves", url: "/avatars/3d-avatar-12.jpg" },
];

interface AvatarPickerModalProps {
  open: boolean;
  currentUser: UserProfile;
  isCompulsory?: boolean;
  onClose?: () => void;
  onSelectSuccess?: (newAvatarUrl: string) => void;
}

export function AvatarPickerModal({
  open,
  currentUser,
  isCompulsory = false,
  onClose,
  onSelectSuccess,
}: AvatarPickerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(
    currentUser?.avatarUrl || AVATAR_OPTIONS[0]?.url || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.avatarUrl) {
      setSelectedUrl(currentUser.avatarUrl);
    }
  }, [currentUser?.avatarUrl]);

  if (!currentUser) return null;

  const handleConfirm = () => {
    if (!selectedUrl) {
      toast.error("Please pick an avatar to continue.");
      return;
    }

    setIsSaving(true);
    try {
      HubStore.updateUserAvatar(currentUser.id, selectedUrl);
      toast.success("Avatar updated successfully! Looking sharp 🚀");
      onSelectSuccess?.(selectedUrl);
      onClose?.();
    } catch {
      toast.error("Failed to save avatar. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // If compulsory on first login, prevent closing via click-outside or ESC
        if (!next && isCompulsory) return;
        if (!next) onClose?.();
      }}
    >
      <DialogContent
        className="hub-dialog avatar-picker-dialog sm:max-w-[680px]"
        style={{
          maxWidth: "680px",
          width: "min(680px, 95vw)",
          maxHeight: "min(680px, 92vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "20px 24px",
          borderRadius: "18px",
          boxSizing: "border-box",
        }}
      >
        <DialogHeader style={{ textAlign: "center", marginBottom: "4px", flexShrink: 0 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "color-mix(in oklab, var(--primary) 12%, transparent)",
              color: "var(--primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 8px",
            }}
          >
            <User size={20} strokeWidth={2.2} />
          </div>
          <DialogTitle style={{ fontSize: "19px", fontWeight: 700 }}>
            {isCompulsory ? "Welcome! Choose Your Avatar" : "Change Your Avatar"}
          </DialogTitle>
          <DialogDescription style={{ fontSize: "12.5px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {isCompulsory
              ? "Select an avatar that represents you across Buildicy Team Hub."
              : "Select an avatar for your Buildicy profile."}
          </DialogDescription>
        </DialogHeader>

        {/* Selected Preview Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px 0 12px",
            marginBottom: "8px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              boxShadow: "0 0 0 3px var(--primary), 0 6px 20px color-mix(in oklab, var(--primary) 28%, transparent)",
              overflow: "hidden",
              background: "var(--card)",
            }}
          >
            <img
              src={selectedUrl}
              alt="Selected Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", marginTop: "6px" }}>
            {AVATAR_OPTIONS.find((a) => a.url === selectedUrl)?.name || "Selected Avatar"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }}>
            {currentUser.name} · {currentUser.role === "founder" ? "Founder & CEO" : currentUser.title}
          </span>
        </div>

        {/* Scrollable 12 Avatar Grid with visible scrollbar */}
        <div className="avatar-scroll-container" style={{ flex: 1, minHeight: "180px", overflowY: "auto", overflowX: "hidden", paddingRight: "6px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>
              Choose your avatar:
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--muted-foreground)",
                fontWeight: 500,
              }}
            >
              12 options (scroll down to see all)
            </span>
          </div>

          <div
            className="avatar-grid-container"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              width: "100%",
            }}
          >
            {AVATAR_OPTIONS.map((opt) => {
              const isSelected = selectedUrl === opt.url;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedUrl(opt.url)}
                  className="avatar-card-btn"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 4px 8px",
                    borderRadius: "14px",
                    border: isSelected
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                    background: isSelected
                      ? "color-mix(in oklab, var(--primary) 8%, var(--card))"
                      : "var(--card)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.16s ease",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                    minHeight: "108px",
                    boxShadow: isSelected
                      ? "0 4px 16px color-mix(in oklab, var(--primary) 22%, transparent)"
                      : "0 1px 3px rgba(0,0,0,0.03)",
                    outline: "none",
                  }}
                >
                  {/* Avatar circle + unclipped checkmark badge */}
                  <div
                    style={{
                      position: "relative",
                      width: "52px",
                      height: "52px",
                      margin: "0 auto",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "var(--muted)",
                        boxShadow: isSelected
                          ? "0 0 0 2px var(--primary)"
                          : "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      <img
                        src={opt.url}
                        alt={opt.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-2px",
                          right: "-2px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "var(--primary)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid var(--card)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                          zIndex: 3,
                        }}
                      >
                        <Check size={11} strokeWidth={3.5} />
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "var(--primary)" : "var(--foreground)",
                      marginTop: "6px",
                      textAlign: "center",
                      lineHeight: "1.25",
                      height: "26px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      padding: "0 2px",
                      overflow: "hidden",
                    }}
                  >
                    {opt.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: isCompulsory ? "center" : "flex-end",
            paddingTop: "14px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            marginTop: "6px",
          }}
        >
          {!isCompulsory && (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            className="primary-pill"
            onClick={handleConfirm}
            disabled={isSaving || !selectedUrl}
            style={{ minWidth: isCompulsory ? "220px" : "140px", height: "40px" }}
          >
            {isSaving ? "Saving..." : isCompulsory ? "Confirm & Enter Workspace →" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
