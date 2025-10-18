import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar(){
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <Link to="/" className="font-bold text-primary">Internet Perla</Link>
      <nav className="flex gap-4 text-sm">
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
        <span className="text-gray-600">{user?.email}</span>
        <button onClick={logout} className="text-red-600">Salir</button>
      </nav>
    </header>
  );
}
