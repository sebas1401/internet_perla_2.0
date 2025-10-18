import { useAuth } from '../hooks/useAuth';

export default function Profile(){
  const { user } = useAuth();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-4">Perfil</h1>
      <div className="bg-white rounded shadow p-4">
        <div className="mb-2"><span className="font-semibold">Nombre:</span> {user?.name || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Correo:</span> {user?.email}</div>
        <div className="mb-2"><span className="font-semibold">Rol:</span> {user?.role}</div>
      </div>
    </div>
  );
}

