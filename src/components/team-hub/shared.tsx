import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Clock3, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadStatus } from "@/lib/supabase/types";
import { HubStore } from "@/lib/supabase/store";

export const formatMoney = (amount: number, currencyOverride?: "USD" | "INR") => {
  const currency = currencyOverride || (typeof window !== "undefined" ? HubStore.getCurrency() : "USD");
  const safeAmount = Number(amount) || 0;
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(safeAmount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeAmount);
};

export function Avatar({
  initials,
  color = "avatar-lilac",
  size = "md",
  avatarUrl,
}: {
  initials: string;
  color?: string | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  avatarUrl?: string | undefined;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (avatarUrl && !imgFailed) {
    return (
      <span className={`avatar avatar-${size} avatar-img-wrap`} aria-label={initials} title={initials}>
        <img
          src={avatarUrl}
          alt={initials}
          className="avatar-img"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={`avatar ${color} avatar-${size}`} aria-label={initials} title={initials}>
      {initials}
    </span>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="min-w-0">
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  trend = "up",
  icon,
  footnote,
  onClick,
}: {
  label: string;
  value: string;
  change: string;
  trend?: "up" | "down";
  icon: ReactNode;
  footnote: string;
  onClick?: () => void;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <article
      className="metric-card"
      onClick={onClick}
      style={onClick ? { cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" } : undefined}
    >
      <div className="metric-card-top">
        <span className="metric-icon">{icon}</span>
        <Button
          variant="ghost"
          size="icon"
          className="metric-menu"
          aria-label={`More about ${label}`}
        >
          <MoreHorizontal />
        </Button>
      </div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <strong>{value}</strong>
        <span className={`metric-change ${trend}`}>
          <TrendIcon />
          {change}
        </span>
      </div>
      <p className="metric-footnote">{footnote}</p>
    </article>
  );
}

const statusClass: Record<LeadStatus, string> = {
  New: "status-new",
  Contacted: "status-contacted",
  Qualified: "status-qualified",
  Proposal: "status-proposal",
  Won: "status-won",
  Lost: "status-lost",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className={`status-pill ${statusClass[status]}`}>
      <span />
      {status}
    </span>
  );
}

export function FollowUp({
  name,
  initials,
  color,
  company,
  time,
  note,
  onClick,
}: {
  name: string;
  initials: string;
  color: string;
  company: string;
  time: string;
  note: string;
  onClick?: () => void;
}) {
  return (
    <div className="followup-row">
      <Avatar initials={initials} color={color} size="sm" />
      <div className="followup-copy">
        <strong>{name}</strong>
        <span>
          {company} · {note}
        </span>
      </div>
      <span className="followup-time">
        <Clock3 />
        {time}
      </span>
      <Button variant="outline" size="sm" className="followup-done" onClick={onClick}>
        <Check />
        Done
      </Button>
    </div>
  );
}
