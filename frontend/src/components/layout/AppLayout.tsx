import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAsync } from "../../hooks/useAsync";
import { api } from "../../lib/api";
import type { Counts } from "../../types";

export function AppLayout() {
  const { data: counts } = useAsync(() => api<Counts>("/api/emails/counts"), [], 5000);
  return (
    <div className="flex h-screen bg-white">
      <Sidebar counts={counts} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
