import { useState } from "react";
import { ListFilter, RefreshCw, Search } from "lucide-react";

export type StatusFilter = "all" | "sent" | "failed";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onRefresh: () => Promise<void>;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  showFilter: boolean;
}

export function InboxToolbar({ query, onQuery, onRefresh, status, onStatus, showFilter }: Props) {
  const [spin, setSpin] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    setSpin(true);
    try {
      await onRefresh();
    } finally {
      setSpin(false);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
      <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        <Search size={15} className="text-gray-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>
      {showFilter && (
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Filter"
            className={`rounded-full p-2 hover:bg-gray-100 ${status !== "all" ? "text-green-700" : "text-gray-500"}`}
          >
            <ListFilter size={17} />
          </button>
          {open && (
            <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border bg-white py-1 text-sm shadow-lg">
              {(["all", "sent", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onStatus(s);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left capitalize hover:bg-gray-50 ${status === s ? "font-medium text-green-700" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={refresh} aria-label="Refresh" className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
        <RefreshCw size={16} className={spin ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
