import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  MapPin,
  Settings,
  Activity,
} from "lucide-react";
import { TopBar } from "./TopBar";

const navItems = [
  { to: "/", label: "Daily", icon: LayoutDashboard, end: true },
  { to: "/range", label: "Range", icon: CalendarRange, end: false },
  { to: "/places", label: "Places", icon: MapPin, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function Shell() {
  return (
    <div className="flex h-full min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold leading-tight">
            atomik
            <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
              activity
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-500"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
