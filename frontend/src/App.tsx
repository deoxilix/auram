import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import LibraryPage from "./pages/LibraryPage";
import PlayerPage from "./pages/PlayerPage";
import SessionPage from "./pages/SessionPage";

function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navItems = [
    { to: "/", label: "Upload", icon: "↑" },
    { to: "/library", label: "Library", icon: "▤" },
  ];

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400 text-sm font-bold text-white">
          A
        </div>
        <span className="text-lg font-bold text-brand-500">Auram</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition " +
                (active
                  ? "bg-brand-50 text-brand-500"
                  : "text-[#565e74] hover:bg-slate-100")
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Create button */}
      <div className="px-3 pb-4">
        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98]"
        >
          <span>✦</span>
          Create Podcast
        </button>
      </div>

      {/* Bottom links */}
      <div className="border-t border-slate-100 px-3 py-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100">
          <span>⚙</span>
          Settings
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
            <input
              type="text"
              placeholder="Search podcasts..."
              className="w-full rounded-xl border border-slate-200 bg-surface py-2 pl-9 pr-4 text-sm text-[#0b1c30] placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100">
              <span className="text-lg">🔔</span>
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-500">
              U
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/podcasts/:id" element={<PlayerPage />} />
              <Route path="/podcasts/:id/live" element={<SessionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
