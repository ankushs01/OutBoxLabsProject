const DAY = 86_400_000;

/** "Tue 8:15:12 PM" for the next week, "Dec 3, 8:15 PM" beyond that (or in the past). */
export function formatBadgeTime(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff > -DAY && diff < 6 * DAY) {
    return d
      .toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", second: "2-digit" })
      .replace(",", "");
  }
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export const formatLongDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "-";

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Value for <input type="datetime-local"> in the user's local time. */
export function toLocalInput(d: Date): string {
  const copy = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return copy.toISOString().slice(0, 16);
}
