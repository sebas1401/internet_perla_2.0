import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const userRoleLinks = (isMobile: boolean) => {
    const linkClasses = isMobile
      ? "block py-2 px-3 rounded hover:bg-white/10"
      : "text-white/80 hover:text-white";

    if (user?.role === "ADMIN") {
      return (
        <>
          <Link to="/workers" className={linkClasses} onClick={handleLinkClick}>
            Trabajadores
          </Link>
          <Link to="/attendance" className={linkClasses} onClick={handleLinkClick}>
            Asistencia
          </Link>
          <Link to="/inventory" className={linkClasses} onClick={handleLinkClick}>
            Inventario
          </Link>
          <Link to="/finanzas" className={linkClasses} onClick={handleLinkClick}>
            Finanzas
          </Link>
          <Link to="/tasks-admin" className={linkClasses} onClick={handleLinkClick}>
            Tareas
          </Link>
          <Link to="/messages" className={linkClasses} onClick={handleLinkClick}>
            Mensajes
          </Link>
        </>
      );
    }

    if (user?.role === "USER") {
      return (
        <>
          <Link to="/my-tasks" className={linkClasses} onClick={handleLinkClick}>
            Mis Tareas
          </Link>
          <Link to="/messages" className={linkClasses} onClick={handleLinkClick}>
            Mensajes
          </Link>
          <Link to="/finanzas" className={linkClasses} onClick={handleLinkClick}>
            Finanzas
          </Link>
        </>
      );
    }

    return null;
  };

  return (
    <>
      <header className="brand-gradient text-white sticky top-0 z-30 shadow">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="font-bold hover:opacity-90 transition">
            Internet Perla
          </Link>

          <nav className="hidden md:flex gap-4 text-sm items-center">
            {userRoleLinks(false)}
            <Link to="/profile" className="text-white/80 hover:text-white">
              Perfil
            </Link>
            <span className="text-white/80">{user?.email}</span>
            <button onClick={logout} className="text-red-100 hover:text-white transition">
              Salir
            </button>
          </nav>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.nav
            className="fixed top-0 left-0 h-full w-4/5 max-w-sm bg-[#0a2a06] z-50 p-6 md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col gap-4 text-base h-full text-white">
              <div className="pb-4 border-b mb-4">
                <span className="font-bold text-lg">Menú</span>
              </div>
              {userRoleLinks(true)}
              <Link
                to="/profile"
                className="block py-2 px-3 rounded hover:bg-white/10"
                onClick={handleLinkClick}
              >
                Perfil
              </Link>
              <div className="border-t pt-4 mt-auto">
                <div className="text-sm text-gray-500 mb-2">{user?.email}</div>
                <button
                  onClick={() => {
                    logout();
                    handleLinkClick();
                  }}
                  className="w-full text-left block py-2 px-3 rounded text-red-300 hover:bg-red-500/20"
                >
                  Salir
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}