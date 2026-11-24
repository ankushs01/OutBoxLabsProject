import { NavLink, Link } from "react-router-dom";
import { Clock, LogOut, Send, type LucideIcon } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { SlackConnect } from "../SlackConnect";
import type { Counts } from "../../types";

function NavItem({ to, icon: Icon, label, count }: { to: string; icon: LucideIcon; label: string; count?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? "bg-green-100 font-medium text-green-900" : "text-gray-600 hover:bg-gray-100"}`
      }
    >
      <Icon size={15} />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-gray-500">{count}</span>}
    </NavLink>
  );
}

export function Sidebar({ counts }: { counts: Counts | null }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-4">
      <div className="mb-5 text-2xl font-black tracking-tight">ONB</div>

      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
        {user.avatar ? (
          <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
            {user.name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-[11px] text-gray-500">{user.email}</p>
        </div>
        <button onClick={logout} title="Logout" aria-label="Logout" className="rounded p-1.5 text-gray-500 hover:bg-gray-200">
          <LogOut size={15} />
        </button>
      </div>

      <Link
        to="/compose"
        className="mt-4 rounded-full border border-green-600 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
      >
        Compose
      </Link>

      <p className="mb-2 mt-6 text-[11px] font-semibold tracking-wider text-gray-400">CORE</p>
      <nav className="space-y-1">
        <NavItem to="/dashboard/scheduled" icon={Clock} label="Scheduled" count={counts?.scheduled} />
        <NavItem to="/dashboard/sent" icon={Send} label="Sent" count={counts?.sent} />
      </nav>

      <div className="mt-auto pt-6">
        <SlackConnect />
      </div>
    </aside>
  );
}
