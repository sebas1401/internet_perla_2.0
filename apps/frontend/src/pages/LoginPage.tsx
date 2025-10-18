import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { motion } from 'framer-motion';

export default function LoginPage(){
  const [email,setEmail]=useState('admin@example.com');
  const [password,setPassword]=useState('123456');
  const [error,setError]=useState('');
  const [apiOk,setApiOk]=useState<boolean|undefined>(undefined);
  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(()=>{
    (async()=>{
      try { const { data } = await api.get('/health'); setApiOk(data?.status==='ok'); }
      catch (e:any) { console.error('API health failed', e?.message); setApiOk(false); }
    })();
  },[]);

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    try{
      await login(email.trim(),password);
      nav('/');
    } catch(err:any){
      const msg = err?.response?.data?.message || err?.message || 'Error de conexión';
      console.error('Login error:', err);
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.form onSubmit={submit} className="bg-white p-6 rounded shadow w-full max-w-sm animate-fadeInUp" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
        <h1 className="text-2xl font-bold text-primary mb-4">Acceso</h1>
        {apiOk===false && <div className="text-red-600 mb-2">No hay conexión con la API ({import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'})</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="text-sm">Correo</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-sm">Contraseña</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-primary text-white py-2 rounded">Ingresar</button>
        <div className="text-xs text-gray-600 mt-3">¿Sin cuenta? <Link to="/register" className="text-primary">Regístrate</Link></div>
      </motion.form>
    </div>
  );
}
