import { Clock } from "lucide-react";
import { formatBadgeTime } from "../../lib/format";
import type { EmailRow } from "../../types";

/** Orange clock pill for scheduled mail; "Sent" / "Failed" pills otherwise. */
export function EmailBadge({ email }: { email: EmailRow }) {
  const base = "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium";
  if (email.status === "scheduled") {
    return (
      <span className={`${base} border border-orange-200 bg-orange-50 text-orange-700`}>
        <Clock size={11} />
        {formatBadgeTime(email.scheduledAt)}
      </span>
    );
  }
  if (email.status === "failed") return <span className={`${base} bg-red-100 text-red-700`}>Failed</span>;
  return <span className={`${base} bg-gray-100 text-gray-600`}>Sent</span>;
}
