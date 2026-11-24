import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";
import type { SlackStatus } from "../types";

export function SlackConnect() {
  const toast = useToast();
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => api<SlackStatus>("/api/slack/status").then(setStatus).catch(() => setStatus(null));

  useEffect(() => {
    refresh();
    const flag = new URLSearchParams(window.location.search).get("slack");
    if (flag === "connected") toast("success", "Slack connected");
    if (flag === "error") toast("error", "Slack connection failed");
    if (flag) window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/api/slack/connect");
      window.location.href = url;
    } catch (e) {
      toast("error", (e as Error).message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api("/api/slack", { method: "DELETE" });
      toast("success", "Slack disconnected");
      await refresh();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  return status.connected ? (
    <Button variant="ghost" onClick={disconnect} loading={busy} title="Click to disconnect" className="w-full justify-start text-xs">
      Slack: {status.channel ?? "connected"} ✓
    </Button>
  ) : (
    <Button variant="secondary" onClick={connect} loading={busy} className="w-full text-xs">
      Connect Slack
    </Button>
  );
}
