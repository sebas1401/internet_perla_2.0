import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar(){
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur border-b sticky top-0 z-20">
      <Link to="/" className="font-bold text-primary hover:opacity-90 transition">Internet Perla</Link>
      <nav className="flex gap-4 text-sm items-center">
        {user?.role === 'ADMIN' && (
          <>
            <Link to="/customers" className="text-primary">Clientes</Link>
            <Link to="/attendance" className="text-primary">Asistencia</Link>
            <Link to="/inventory" className="text-primary">Inventario</Link>
            <Link to="/finance" className="text-primary">Finanzas</Link>
            <Link to="/tasks-admin" className="text-primary">Tareas</Link>
          </>
        )}
        {user?.role === 'USER' && (
          <Link to="/my-tasks" className="text-primary">Mis Tareas</Link>
        )}
        <Link to="/profile" className="text-primary">Perfil</Link>
        <span className="text-gray-600 hidden md:inline">{user?.email}</span>
        <button onClick={logout} className="text-red-600 hover:opacity-80 transition">Salir</button>
      </nav>
    </header>
  );
}
