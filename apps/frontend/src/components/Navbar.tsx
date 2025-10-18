import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar(){
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between p-4 brand-gradient text-white sticky top-0 z-20 shadow">
      <Link to="/" className="font-bold hover:opacity-90 transition">Internet Perla</Link>
      <nav className="flex gap-4 text-sm items-center">
        {user?.role === 'ADMIN' && (
          <>
            <Link to="/workers" className="text-white/80 hover:text-white">Trabajadores</Link>
            <Link to="/attendance" className="text-white/80 hover:text-white">Asistencia</Link>
            <Link to="/inventory" className="text-white/80 hover:text-white">Inventario</Link>
            <Link to="/finance" className="text-white/80 hover:text-white">Finanzas</Link>
            <Link to="/tasks-admin" className="text-white/80 hover:text-white">Tareas</Link>
          </>
        )}
        {user?.role === 'USER' && (
          <Link to="/my-tasks" className="text-white/80 hover:text-white">Mis Tareas</Link>
        )}
        <Link to="/profile" className="text-white/80 hover:text-white">Perfil</Link>
        <span className="text-white/80 hidden md:inline">{user?.email}</span>
        <button onClick={logout} className="text-red-100 hover:text-white transition">Salir</button>
      </nav>
    </header>
  );
}
