import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Paperclip } from "lucide-react";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { RecipientInput } from "../components/compose/RecipientInput";
import { RichTextEditor } from "../components/compose/RichTextEditor";
import { SendLaterPopover } from "../components/compose/SendLaterPopover";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatLongDate } from "../lib/format";
import type { ScheduleRequest, Sender } from "../types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-gray-100 py-2.5">
      <span className="w-48 shrink-0 pt-1.5 text-right text-sm text-gray-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function Compose() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: senders } = useAsync(() => api<Sender[]>("/api/senders"));

  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [delay, setDelay] = useState("");
  const [hourly, setHourly] = useState("");
  const [sendAt, setSendAt] = useState(""); // empty = send now
  const [laterOpen, setLaterOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!recipients.length) return toast("error", "Add at least one recipient");
    if (!subject.trim()) return toast("error", "Subject is required");
    if (!text) return toast("error", "Write a message body");

    const payload: ScheduleRequest = {
      subject: subject.trim(),
      body: html,
      recipients,
      startTime: (sendAt ? new Date(sendAt) : new Date()).toISOString(),
      delaySeconds: Number(delay) || 0,
      hourlyLimit: Number(hourly) > 0 ? Number(hourly) : undefined,
      senderId: senderId ? Number(senderId) : undefined,
    };
    setSending(true);
    try {
      const res = await api<{ scheduled: number }>("/api/schedule", { method: "POST", body: JSON.stringify(payload) });
      toast("success", `Scheduled ${res.scheduled} email${res.scheduled === 1 ? "" : "s"}`);
      navigate("/dashboard/scheduled");
    } catch (e) {
      toast("error", (e as Error).message);
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={18} /> Compose New Email
        </button>
        <div className="relative flex items-center gap-3">
          <button
            disabled
            title="Attachments are not supported yet"
            aria-label="Attach"
            className="rounded-full p-2 text-gray-300"
          >
            <Paperclip size={17} />
          </button>
          <button
            onClick={() => setLaterOpen((o) => !o)}
            aria-label="Send later"
            className={`rounded-full p-2 hover:bg-gray-100 ${sendAt ? "text-green-700" : "text-gray-500"}`}
          >
            <Clock size={17} />
          </button>
          <Button variant="outline" onClick={send} loading={sending} className="rounded-full px-5 py-1.5">
            {sendAt ? "Send Later" : "Send"}
          </Button>
          {laterOpen && (
            <SendLaterPopover
              value={sendAt}
              onClose={() => setLaterOpen(false)}
              onDone={(v) => {
                setSendAt(v);
                setLaterOpen(false);
              }}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {sendAt && (
          <p className="mb-3 text-right text-xs text-green-700">Scheduled for {formatLongDate(new Date(sendAt).toISOString())}</p>
        )}
        <Row label="From">
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs focus:outline-none"
          >
            <option value="">Auto (rotate senders)</option>
            {senders?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email}
              </option>
            ))}
          </select>
        </Row>
        <Row label="To">
          <RecipientInput recipients={recipients} onChange={setRecipients} />
        </Row>
        <Row label="Subject">
          <TextInput variant="plain" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </Row>
        <Row label="Delay between 2 emails">
          <div className="flex items-center gap-6">
            <TextInput
              variant="filled"
              type="number"
              min={0}
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              placeholder="00"
              aria-label="Delay in seconds"
              className="!w-16 !py-1.5 text-center"
            />
            <span className="flex items-center gap-3 text-sm text-gray-500">
              Hourly Limit
              <TextInput
                variant="filled"
                type="number"
                min={1}
                value={hourly}
                onChange={(e) => setHourly(e.target.value)}
                placeholder="00"
                aria-label="Hourly limit"
                className="!w-16 !py-1.5 text-center"
              />
            </span>
            <span className="text-xs text-gray-400">delay in seconds · blank hourly limit uses the server default</span>
          </div>
        </Row>
        <div className="mt-4">
          <RichTextEditor
            onChange={(h, t) => {
              setHtml(h);
              setText(t);
            }}
          />
        </div>
      </main>
    </div>
  );
}
