import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard(){
  const { user } = useAuth();
  const [health,setHealth] = useState<any>();
  useEffect(()=>{ api.get('/health').then(r=>setHealth(r.data)).catch(()=>setHealth({status:'error'})); },[]);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-2">Dashboard</h1>
      <div className="text-sm text-gray-600 mb-4">Bienvenido, {user?.name || user?.email} ({user?.role})</div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow"><div className="font-semibold">Estado API</div><div className="text-sm">{health?.status||'...'}</div></div>
        <div className="bg-white p-4 rounded shadow"><div className="font-semibold">Clientes</div><div className="text-sm">Gestiona tus clientes en la sección correspondiente</div></div>
        <div className="bg-white p-4 rounded shadow"><div className="font-semibold">Perfil</div><div className="text-sm">Actualiza tu información y credenciales</div></div>
      </div>
    </div>
  );
}

