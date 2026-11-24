import { useState } from "react";

const KEY = "starred-emails";
const read = (): Set<string> => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set<string>();
  }
};

/** Stars are a per-browser convenience, kept in localStorage. */
export function useStarred() {
  const [starred, setStarred] = useState<Set<string>>(read);
  const toggle = (id: string) =>
    setStarred((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { isStarred: (id: string) => starred.has(id), toggle };
}
