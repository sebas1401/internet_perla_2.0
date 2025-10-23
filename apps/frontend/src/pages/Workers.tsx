import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type User = { id:string; email:string; name?:string; role:'ADMIN'|'USER' };

export default function Workers(){
  const [rows,setRows] = useState<User[]>([]);
  const [form,setForm] = useState({ name:'', email:'', password:'' });
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState<{ id:string; email:string; password:string }|null>(null);

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

  const startEdit = (u:User)=> setEditing({ id: u.id, email: u.email, password: '' });
  const cancelEdit = ()=> setEditing(null);
  const saveEdit = async()=>{
    if (!editing) return;
    if (!editing.email) return toast.error('Correo es requerido');
    const payload: any = { email: editing.email };
    if (editing.password) payload.password = editing.password;
    await api.patch(`/users/${editing.id}`, payload);
    toast.success('Trabajador actualizado');
    setEditing(null);
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
            <motion.li key={u.id} className="py-2 border-t flex items-center justify-between gap-2" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.name||'-'}</div>
                <div className="text-gray-600 truncate">{u.email}</div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <button onClick={()=>startEdit(u)} className="text-primary hover:opacity-80">Editar</button>
                <button onClick={()=>remove(u.id)} className="text-red-600 hover:opacity-80">Eliminar</button>
              </div>
            </motion.li>
          ))}
          {!loading && rows.length===0 && <li>Sin trabajadores aún.</li>}
        </ul>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow p-4 grid md:grid-cols-4 gap-2">
          <div className="md:col-span-4 font-semibold">Editar trabajador</div>
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Correo" value={editing.email} onChange={e=>setEditing({...editing!, email: e.target.value})} />
          <input className="border rounded px-3 py-2 md:col-span-2" type="password" placeholder="Nueva contraseña (opcional)" value={editing.password} onChange={e=>setEditing({...editing!, password: e.target.value})} />
          <div className="md:col-span-4 flex gap-2">
            <button onClick={saveEdit} className="bg-primary text-white rounded px-4">Guardar</button>
            <button onClick={cancelEdit} className="border rounded px-4">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

