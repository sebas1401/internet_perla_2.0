import { useEffect, useState } from 'react';
import api, { getApiOrigin } from '../services/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type User = { id:string; email:string; name?:string; role:'ADMIN'|'USER' };
type Task = { id:string; title:string; description:string; status:'PENDING'|'COMPLETED'; assignedTo:User; createdAt:string; proofUrl?:string };

export default function TasksAdmin(){
  const [users,setUsers] = useState<User[]>([]);
  const [tasks,setTasks] = useState<Task[]>([]);
  const [form,setForm] = useState({ userId:'', title:'', description:'' });
  const load = async ()=>{
    const [u,t] = await Promise.all([
      api.get('/users'),
      api.get('/tasks')
    ]);
    setUsers(u.data.value || u.data);
    setTasks(t.data);
  };
  useEffect(()=>{ load(); },[]);
  const create = async ()=>{ if(!form.userId||!form.title) return; await api.post('/tasks', form); setForm({ userId:'', title:'', description:'' }); toast.success('Tarea creada'); load(); };

  return (
    <div className="p-6 space-y-6">
      <motion.h1 className="text-2xl font-bold text-primary" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Tareas (Admin)</motion.h1>
      <div className="bg-white rounded shadow p-4 grid md:grid-cols-4 gap-2 animate-fadeInUp">
        <select className="border rounded px-2 py-1" value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})}>
          <option value="">Selecciona trabajador</option>
          {users.filter(u=>u.role==='USER').map(u=> <option key={u.id} value={u.id}>{u.name||u.email}</option>)}
        </select>
        <input className="border rounded px-2 py-1" placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
        <button onClick={create} className="bg-primary text-white rounded px-3">Crear</button>
      </div>
      <div className="bg-white rounded shadow p-4 animate-fadeIn">
        <h2 className="font-semibold mb-2">Listado</h2>
        <ul className="text-sm">
          {tasks.map((t,i)=> (
            <motion.li key={t.id} className="py-2 border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
              <div className="font-medium">{t.title} <span className="text-gray-500">({t.status})</span></div>
              <div className="text-gray-600">{t.description}</div>
              <div className="text-xs text-gray-500">Asignado a: {t.assignedTo?.name||t.assignedTo?.email} • {new Date(t.createdAt).toLocaleString()}</div>
              {t.proofUrl && <div className="mt-1"><a className="text-primary underline" href={`${getApiOrigin()}${t.proofUrl}`} target="_blank">Ver evidencia</a></div>}
            </motion.li>
          ))}
          {tasks.length===0 && <li>Sin tareas</li>}
        </ul>
      </div>
    </div>
  );
}
