import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { EmailBadge } from "./EmailBadge";
import { StarButton } from "./StarButton";
import { formatLongDate } from "../../lib/format";
import type { EmailRow } from "../../types";

interface Props {
  email: EmailRow;
  onBack: () => void;
  starred: boolean;
  onStar: () => void;
}

export function EmailDetail({ email, onBack, starred, onStar }: Props) {
  const [height, setHeight] = useState(80);
  // Body is rendered in a script-less sandboxed iframe so stored HTML can never run code.
  const doc = `<style>body{font:14px/1.6 system-ui,sans-serif;color:#111;margin:0;display:flow-root}blockquote{border-left:3px solid #ddd;margin:0;padding-left:12px;color:#555}</style>${email.body}`;
  const when = email.status === "scheduled" ? email.scheduledAt : email.sentAt;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} aria-label="Back" className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <StarButton active={starred} onToggle={onStar} />
      </div>

      <h2 className="mt-2 text-xl font-semibold">{email.subject}</h2>

      <div className="mt-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-semibold uppercase text-white">
          {email.fromEmail[0]}
        </div>
        <div className="min-w-0 flex-1 text-sm leading-tight">
          <p className="truncate font-medium">{email.fromEmail}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">to {email.to}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
          <span>{formatLongDate(when)}</span>
          <EmailBadge email={email} />
        </div>
      </div>

      {email.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error: {email.error}</p>}

      <iframe
        title="Email body"
        sandbox="allow-same-origin"
        srcDoc={doc}
        style={{ height }}
        className="mt-5 w-full border-0"
        onLoad={(e) => {
          const h = e.currentTarget.contentDocument?.body.scrollHeight;
          if (h) setHeight(Math.max(60, h + 8));
        }}
      />

      {email.previewUrl && (
        <a
          href={email.previewUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
        >
          View on Ethereal <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}
