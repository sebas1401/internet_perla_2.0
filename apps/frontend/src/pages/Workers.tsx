import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type User = { id:string; email:string; name?:string; role:'ADMIN'|'USER' };

export default function Workers(){
  const [rows,setRows] = useState<User[]>([]);
  const [form,setForm] = useState({ name:'', email:'', password:'' });
  const [loading,setLoading] = useState(true);

  const load = async()=>{
    setLoading(true);
    const { data } = await api.get('/users');
    const list: User[] = (data.value || data) as any;
    setRows(list.filter(u=>u.role==='USER'));
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const create = async()=>{
    if (!form.name || !form.email || !form.password) return toast.error('Completa todos los campos');
    await api.post('/users', { ...form, role: 'USER' });
    toast.success('Trabajador creado');
    setForm({ name:'', email:'', password:'' });
    load();
  };

  const remove = async(id:string)=>{
    await api.delete(`/users/${id}`);
    toast.success('Trabajador eliminado');
    load();
  };

  return (
    <div className="space-y-6">
      <motion.h1 className="text-2xl font-bold text-primary" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Trabajadores</motion.h1>
      <div className="bg-white rounded-xl shadow p-4 grid md:grid-cols-4 gap-2 animate-fadeInUp">
        <input className="border rounded px-3 py-2" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input className="border rounded px-3 py-2" placeholder="Correo" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input className="border rounded px-3 py-2" placeholder="Contraseña" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <button onClick={create} className="bg-primary text-white rounded px-4">Crear</button>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-2">Listado</h2>
        <ul className="text-sm">
          {rows.map((u,i)=> (
            <motion.li key={u.id} className="py-2 border-t flex items-center justify-between" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
              <div>
                <div className="font-medium">{u.name||'-'}</div>
                <div className="text-gray-600">{u.email}</div>
              </div>
              <button onClick={()=>remove(u.id)} className="text-red-600 hover:opacity-80">Eliminar</button>
            </motion.li>
          ))}
          {!loading && rows.length===0 && <li>Sin trabajadores aún.</li>}
        </ul>
      </div>
    </div>
  );
}

