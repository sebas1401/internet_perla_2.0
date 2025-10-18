import { PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Home, Clock, Boxes, DollarSign, ClipboardList, Users2, LogOut, Settings } from 'lucide-react';

export default function AdminShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const linkCls = ({ isActive }: any) => `flex items-center gap-2 px-3 py-2 rounded-md transition ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`;

  return (
    <div className="min-h-screen grid grid-cols-12">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-[#0a2a06] text-white p-4 lg:p-6 sticky top-0 h-screen hidden md:flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">IP</div>
          <div>
            <div className="font-semibold">InternetPerla</div>
            <div className="text-xs text-white/60">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          <NavLink to="/" className={linkCls}><Home size={16}/> Dashboard</NavLink>
          <NavLink to="/attendance" className={linkCls}><Clock size={16}/> Asistencia</NavLink>
          <NavLink to="/finance" className={linkCls}><DollarSign size={16}/> Finanzas</NavLink>
          <NavLink to="/inventory" className={linkCls}><Boxes size={16}/> Inventario</NavLink>
          <NavLink to="/tasks-admin" className={linkCls}><ClipboardList size={16}/> Tareas</NavLink>
          <NavLink to="/workers" className={linkCls}><Users2 size={16}/> Trabajadores</NavLink>
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10" onClick={()=>nav('/profile')}><Settings size={16}/> Configuración</button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-red-300 hover:text-white hover:bg-red-500/20" onClick={logout}><LogOut size={16}/> Salir</button>
          <div className="text-xs text-white/60 mt-2 truncate">{user?.email}</div>
        </div>
      </aside>
      {/* Content */}
      <div className="col-span-12 md:col-span-9 lg:col-span-10 bg-gray-50 min-h-screen">
        <header className="brand-gradient shadow text-white px-4 lg:px-6 py-3 md:hidden sticky top-0">Internet Perla</header>
        <motion.main
          className="p-4 lg:p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .35 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
