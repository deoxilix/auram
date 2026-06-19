import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import LibraryPage from "./pages/LibraryPage";
import PlayerPage from "./pages/PlayerPage";

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={
        "px-3 py-2 rounded-md text-sm font-medium " +
        (active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-200")
      }
    >
      {label}
    </Link>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="mr-4 text-lg font-bold text-brand-600">Auram</span>
          <NavLink to="/" label="Upload" />
          <NavLink to="/library" label="Library" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/podcasts/:id" element={<PlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
