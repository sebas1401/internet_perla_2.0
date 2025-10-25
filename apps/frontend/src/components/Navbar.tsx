import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const logoSrc = "/perla-logo.svg";
  return (
    <header className="flex items-center justify-between p-4 brand-gradient text-white sticky top-0 z-20 shadow">
      <Link to="/" className="group flex items-center gap-2 font-bold transition hover:opacity-90">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inset-0 rounded-2xl bg-emerald-200/30 blur-sm" />
          <span className="absolute inset-0 rounded-2xl border border-emerald-400/50" />
          <span
            className="absolute -inset-1 rounded-3xl border border-emerald-400/30 animate-ping"
            style={{ animationDuration: "3s" }}
          />
          <span
            className="absolute -inset-2.5 rounded-[1.75rem] border border-emerald-300/20 animate-ping"
            style={{ animationDuration: "4.5s" }}
          />
          <img src={logoSrc} alt="Internet Perla" className="relative z-10 h-7 w-7 object-contain" />
        </span>
        <span className="leading-tight">Internet Perla</span>
      </Link>
      <nav className="flex gap-4 text-sm items-center">
        {user?.role === "ADMIN" && (
          <>
            <Link to="/workers" className="text-white/80 hover:text-white">
              Trabajadores
            </Link>
            <Link to="/attendance" className="text-white/80 hover:text-white">
              Asistencia
            </Link>
            <Link to="/inventory" className="text-white/80 hover:text-white">
              Inventario
            </Link>
            <Link to="/finanzas" className="text-white/80 hover:text-white">
              Finanzas
            </Link>
            <Link to="/tasks-admin" className="text-white/80 hover:text-white">
              Tareas
            </Link>
            <Link to="/messages" className="text-white/80 hover:text-white">
              Mensajes
            </Link>
          </>
        )}
        {user?.role === "USER" && (
          <>
            <Link to="/my-tasks" className="text-white/80 hover:text-white">
              Mis Tareas
            </Link>
            <Link to="/inventory" className="text-white/80 hover:text-white">
              Inventario
            </Link>
            <Link to="/messages" className="text-white/80 hover:text-white">
              Mensajes
            </Link>
            <Link to="/finanzas" className="text-white/80 hover:text-white">
              Finanzas
            </Link>
          </>
        )}
        <Link to="/profile" className="text-white/80 hover:text-white">
          Perfil
        </Link>
        <span className="text-white/80 hidden md:inline">{user?.email}</span>
        <button
          onClick={logout}
          className="text-red-100 hover:text-white transition"
        >
          Salir
        </button>
      </nav>
    </header>
  );
}
