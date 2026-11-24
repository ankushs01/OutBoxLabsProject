import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmailList } from "../components/inbox/EmailList";
import { EmailDetail } from "../components/inbox/EmailDetail";
import { InboxToolbar, StatusFilter } from "../components/inbox/InboxToolbar";
import { Spinner } from "../components/ui/Button";
import { useAsync } from "../hooks/useAsync";
import { useStarred } from "../hooks/useStarred";
import { api } from "../lib/api";
import { stripHtml } from "../lib/format";
import type { EmailRow, Folder } from "../types";

export default function Inbox() {
  const { folder: folderParam, id } = useParams();
  const folder: Folder = folderParam === "sent" ? "sent" : "scheduled";
  const navigate = useNavigate();
  const { isStarred, toggle } = useStarred();

  const { data, loading, error, reload } = useAsync(() => api<EmailRow[]>(`/api/emails/${folder}`), [folder], 5000);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    setQuery("");
    setStatus("all");
  }, [folder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return `${e.to} ${e.subject} ${stripHtml(e.body)}`.toLowerCase().includes(q);
    });
  }, [data, query, status]);

  const back = () => navigate(`/dashboard/${folder}`);

  if (id) {
    const email = data?.find((e) => e.id === id);
    if (loading)
      return (
        <div className="flex justify-center py-24 text-green-600">
          <Spinner />
        </div>
      );
    if (!email)
      return (
        <div className="py-24 text-center text-sm text-gray-500">
          Email not found.{" "}
          <button onClick={back} className="text-green-700 underline">
            Back
          </button>
        </div>
      );
    return <EmailDetail email={email} onBack={back} starred={isStarred(email.id)} onStar={() => toggle(email.id)} />;
  }

  return (
    <>
      <InboxToolbar
        query={query}
        onQuery={setQuery}
        onRefresh={reload}
        status={status}
        onStatus={setStatus}
        showFilter={folder === "sent"}
      />
      <EmailList
        emails={filtered}
        loading={loading}
        error={error}
        folder={folder}
        searching={!!query.trim() || status !== "all"}
        onOpen={(e) => navigate(`/dashboard/${folder}/${e.id}`)}
        isStarred={isStarred}
        onStar={toggle}
      />
    </>
  );
}
