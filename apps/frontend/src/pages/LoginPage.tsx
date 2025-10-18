import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage(){
  const [email,setEmail]=useState('admin@example.com');
  const [password,setPassword]=useState('123456');
  const [error,setError]=useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  const submit = async (e:React.FormEvent)=>{ e.preventDefault(); try{ await login(email,password); nav('/'); } catch(err:any){ setError(err?.response?.data?.message||'Error'); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold text-primary mb-4">Acceso</h1>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="text-sm">Correo</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-sm">Contraseña</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-primary text-white py-2 rounded">Ingresar</button>
        <div className="text-xs text-gray-600 mt-3">¿Sin cuenta? <Link to="/register" className="text-primary">Regístrate</Link></div>
      </form>
    </div>
  );
}

