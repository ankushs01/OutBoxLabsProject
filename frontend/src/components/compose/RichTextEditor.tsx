import { useRef } from "react";
import {
  AlignCenter, AlignLeft, Bold, Indent, Italic, List, ListOrdered, Outdent, Quote, Redo2, Strikethrough, Underline, Undo2,
  type LucideIcon,
} from "lucide-react";

interface Props {
  onChange: (html: string, text: string) => void;
}

type Cmd = { icon: LucideIcon; cmd: string; arg?: string; label: string };
const GROUPS: Cmd[][] = [
  [
    { icon: Undo2, cmd: "undo", label: "Undo" },
    { icon: Redo2, cmd: "redo", label: "Redo" },
  ],
  [
    { icon: Bold, cmd: "bold", label: "Bold" },
    { icon: Italic, cmd: "italic", label: "Italic" },
    { icon: Underline, cmd: "underline", label: "Underline" },
  ],
  [
    { icon: AlignLeft, cmd: "justifyLeft", label: "Align left" },
    { icon: AlignCenter, cmd: "justifyCenter", label: "Align center" },
  ],
  [
    { icon: List, cmd: "insertUnorderedList", label: "Bullet list" },
    { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered list" },
    { icon: Outdent, cmd: "outdent", label: "Outdent" },
    { icon: Indent, cmd: "indent", label: "Indent" },
  ],
  [
    { icon: Quote, cmd: "formatBlock", arg: "blockquote", label: "Quote" },
    { icon: Strikethrough, cmd: "strikeThrough", label: "Strikethrough" },
  ],
];

const SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
];

/** Lightweight rich-text editor (contentEditable + execCommand); emits HTML and plain text. */
export function RichTextEditor({ onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const emit = () => {
    const el = ref.current;
    if (el) onChange(el.innerHTML, el.innerText.trim());
  };
  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 py-1.5 text-gray-600">
        {GROUPS.map((group, i) => (
          <div key={i} className="flex items-center gap-0.5 border-r border-gray-200 pr-2 last:border-0">
            {i === 1 && (
              <select
                aria-label="Font size"
                defaultValue="3"
                onChange={(e) => run("fontSize", e.target.value)}
                className="mr-1 rounded bg-transparent px-1 text-xs hover:bg-gray-100 focus:outline-none"
              >
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            {group.map(({ icon: Icon, cmd, arg, label }) => (
              <button
                key={cmd}
                type="button"
                title={label}
                aria-label={label}
                onMouseDown={(e) => e.preventDefault()} // keep the selection in the editor
                onClick={() => run(cmd, arg)}
                className="rounded p-1.5 hover:bg-gray-100"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        data-placeholder="Type Your Reply..."
        className="min-h-[300px] px-4 py-3 text-sm focus:outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"
      />
    </div>
  );
}
