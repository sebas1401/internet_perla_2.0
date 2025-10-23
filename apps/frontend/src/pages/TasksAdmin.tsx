import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ClipboardList, User, Type, FileText, PlusCircle, Paperclip } from 'lucide-react';

import api, { getApiOrigin } from '../services/api';
import { useSocket } from '../hooks/useSocket';

type User = { id:string; email:string; name?:string; role:'ADMIN'|'USER' };
type Task = { id:string; title:string; description:string; status:'PENDING'|'COMPLETED'; assignedTo:User; createdAt:string; proofUrl?:string };

const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

export default function TasksAdmin(){
  const [users,setUsers] = useState<User[]>([]);
  const [tasks,setTasks] = useState<Task[]>([]);
  const [form,setForm] = useState({ userId:'', title:'', description:'' });

  const load = async ()=>{
    try {
      const [u,t] = await Promise.all([
        api.get('/users'),
        api.get('/tasks')
      ]);
      setUsers(u.data.value || u.data);
      setTasks(t.data);
    } catch (err) {
      toast.error('No se pudieron cargar los datos.');
    }
  };

  const { socket } = useSocket();
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if (!socket) return;
    const refresh = ()=> load();
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    return ()=>{ socket.off('task:created', refresh); socket.off('task:updated', refresh); };
  },[socket]);

  const create = async ()=>{ 
    if(!form.userId||!form.title) {
      toast.warning('Selecciona un trabajador y escribe un título.');
      return;
    } 
    try {
      await api.post('/tasks', form); 
      setForm({ userId:'', title:'', description:'' }); 
      toast.success('Tarea creada exitosamente'); 
      load(); 
    } catch (err) {
      toast.error('No se pudo crear la tarea.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-3 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[140%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.12),rgba(14,165,233,0.08),rgba(16,185,129,0.12))] blur-3xl opacity-35" />

      <div className="relative z-10 flex flex-1 flex-col gap-8 overflow-hidden">
        <header>
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Administración de Tareas
          </motion.h1>
          <motion.p
            className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Asigna nuevas tareas a los colaboradores y supervisa el progreso y las evidencias de trabajo.
          </motion.p>
        </header>

        <motion.section 
          className={`${glassCard} rounded-3xl p-6`} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Asignar Nueva Tarea</h2>
          <div className="grid md:grid-cols-4 gap-4 items-center">
            <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <select className="w-full appearance-none rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})}>
                    <option value="">Selecciona trabajador</option>
                    {users.filter(u=>u.role==='USER').map(u=> <option key={u.id} value={u.id}>{u.name||u.email}</option>)}
                </select>
            </div>
            <div className="relative">
                <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <input className="w-full rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" placeholder="Título de la tarea" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            </div>
            <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <input className="w-full rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            </div>
            <button onClick={create} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600">
              <PlusCircle className="h-4 w-4" />
              Crear Tarea
            </button>
          </div>
        </motion.section>

        <motion.section 
          className={`${glassCard} flex-1 rounded-3xl p-6`} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Historial de Tareas</h2>
          </div>
          <div className="overflow-y-auto custom-scrollbar max-h-[60vh]">
            <ul className="space-y-4 pr-2">
              {tasks.map((t,i)=> (
                <motion.li 
                  key={t.id} 
                  className="bg-white/70 p-4 rounded-2xl border border-white/50 shadow-sm"
                  initial={{opacity:0,y:6}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:i*0.03}}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{t.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{t.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status === 'COMPLETED' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-100/80 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                      Asignado a: <span className="font-medium text-slate-600">{t.assignedTo?.name||t.assignedTo?.email}</span> • {new Date(t.createdAt).toLocaleString()}
                    </div>
                    {t.proofUrl && 
                      <div>
                        <a 
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
                          href={`${getApiOrigin()}${t.proofUrl}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Paperclip className="h-3 w-3" />
                          Ver evidencia
                        </a>
                      </div>
                    }
                  </div>
                </motion.li>
              ))}
              {tasks.length===0 && <li className="text-center text-slate-500 py-8">No hay tareas registradas.</li>}
            </ul>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
