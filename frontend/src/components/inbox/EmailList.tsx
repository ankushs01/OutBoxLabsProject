import { Inbox } from "lucide-react";
import { EmailBadge } from "./EmailBadge";
import { StarButton } from "./StarButton";
import { stripHtml } from "../../lib/format";
import type { EmailRow, Folder } from "../../types";

interface Props {
  emails: EmailRow[] | null;
  loading: boolean;
  error: string | null;
  folder: Folder;
  searching: boolean;
  onOpen: (email: EmailRow) => void;
  isStarred: (id: string) => boolean;
  onStar: (id: string) => void;
}

function Skeleton() {
  return (
    <ul className="divide-y divide-gray-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
          <div className="h-3 w-40 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded bg-gray-200" />
          <div className="h-3 flex-1 rounded bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}

export function EmailList({ emails, loading, error, folder, searching, onOpen, isStarred, onStar }: Props) {
  if (loading) return <Skeleton />;
  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!emails?.length) {
    return (
      <div className="flex flex-col items-center py-20 text-center text-gray-500">
        <Inbox size={36} className="mb-3 text-gray-300" />
        <p className="font-medium text-gray-700">
          {searching ? "No emails match your search" : folder === "scheduled" ? "No scheduled emails" : "No sent emails yet"}
        </p>
        {!searching && (
          <p className="mt-1 text-sm">
            {folder === "scheduled" ? "Click Compose to schedule a campaign." : "Sent emails will appear here."}
          </p>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {emails.map((e) => (
        <li
          key={e.id}
          onClick={() => onOpen(e)}
          className="flex cursor-pointer items-center gap-4 px-4 py-3 text-sm hover:bg-gray-50"
        >
          <span className="w-52 shrink-0 truncate text-gray-800">To: {e.to}</span>
          <EmailBadge email={e} />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{e.subject}</span>
            <span className="text-gray-500"> - {stripHtml(e.body)}</span>
          </span>
          <StarButton active={isStarred(e.id)} onToggle={() => onStar(e.id)} />
        </li>
      ))}
    </ul>
  );
}
