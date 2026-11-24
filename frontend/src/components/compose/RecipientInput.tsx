import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { extractEmails, isEmail } from "../../lib/csv";
import { useToast } from "../ui/Toast";

interface Props {
  recipients: string[];
  onChange: (next: string[]) => void;
}

const VISIBLE = 3;

export function RecipientInput({ recipients, onChange }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");

  const addMany = (list: string[]) => onChange([...new Set([...recipients, ...list.map((e) => e.toLowerCase())])]);

  const commit = () => {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) return;
    const valid = parts.filter(isEmail);
    if (valid.length < parts.length) toast("error", "Some entries are not valid email addresses");
    if (valid.length) addMany(valid);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", ";"].includes(e.key) && text.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !text && recipients.length) {
      onChange(recipients.slice(0, -1));
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const found = extractEmails(await file.text());
    addMany(found);
    setUploadInfo(`${file.name}: ${found.length} email address${found.length === 1 ? "" : "es"} detected`);
    e.target.value = "";
  };

  const shown = expanded ? recipients : recipients.slice(0, VISIBLE);
  const hidden = recipients.length - shown.length;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {shown.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">
              {r}
              <button type="button" aria-label={`Remove ${r}`} onClick={() => onChange(recipients.filter((x) => x !== r))}>
                <X size={11} />
              </button>
            </span>
          ))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800"
            >
              +{hidden}
            </button>
          )}
          {expanded && recipients.length > VISIBLE && (
            <button type="button" onClick={() => setExpanded(false)} className="text-xs text-gray-500 underline">
              show less
            </button>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
            placeholder={recipients.length ? "" : "recipient@example.com"}
            className="min-w-[160px] flex-1 bg-transparent py-1.5 text-sm placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-700 hover:underline"
        >
          <Upload size={13} /> Upload List
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="hidden" />
      </div>
      {(uploadInfo || recipients.length > 0) && (
        <p className="mt-1 text-xs text-gray-500">
          {uploadInfo && <>{uploadInfo} · </>}
          {recipients.length} recipient{recipients.length === 1 ? "" : "s"} total
        </p>
      )}
    </div>
  );
}
