import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "../ui/Button";
import { toLocalInput } from "../../lib/format";

interface Props {
  value: string;
  onDone: (value: string) => void;
  onClose: () => void;
}

/** "Tomorrow" at the given hour (or at the current time when hour is omitted). */
function tomorrow(hour?: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
}

const QUICK = [
  { label: "Tomorrow", value: () => tomorrow() },
  { label: "Tomorrow, 10:00 AM", value: () => tomorrow(10) },
  { label: "Tomorrow, 11:00 AM", value: () => tomorrow(11) },
  { label: "Tomorrow, 3:00 PM", value: () => tomorrow(15) },
];

export function SendLaterPopover({ value, onDone, onClose }: Props) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold">Send Later</p>
      <label className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-500">
        <input
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Pick date and time"
          className="w-full bg-transparent text-xs focus:outline-none"
        />
        <Calendar size={13} />
      </label>
      <ul className="mt-2 text-xs">
        {QUICK.map((q) => (
          <li key={q.label}>
            <button type="button" onClick={() => setDraft(q.value())} className="w-full rounded px-1 py-1.5 text-left hover:bg-gray-50">
              {q.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        {value ? (
          <button type="button" onClick={() => onDone("")} className="text-xs text-gray-500 underline">
            Clear
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="px-3 py-1 text-xs">
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={!draft} onClick={() => onDone(draft)} className="px-3 py-1 text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
