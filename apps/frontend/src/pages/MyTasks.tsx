import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, ClipboardList, UploadCloud, Paperclip } from 'lucide-react';

import api, { getApiOrigin } from '../services/api';
import { useSocket } from '../hooks/useSocket';

type Task = { id:string; title:string; description:string; status:'PENDING'|'COMPLETED'; proofUrl?:string };

const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

export default function MyTasks(){
  const [tasks,setTasks] = useState<Task[]>([]);
  const [files,setFiles] = useState<Record<string, File|undefined>>({});

  const load = async ()=>{ 
    try {
      const {data} = await api.get('/tasks/mine'); 
      setTasks(data); 
    } catch (err) {
      toast.error('No se pudieron cargar las tareas.');
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

  const complete = async (id:string)=>{
    const fd = new FormData();
    const f = files[id];
    if (f) fd.append('proof', f);
    else {
      toast.warning('Debes adjuntar una prueba para completar la tarea.');
      return;
    }
    try {
      await api.patch(`/tasks/${id}/complete`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Tarea marcada como completada');
      await load();
    } catch (err) {
      toast.error('No se pudo completar la tarea.');
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

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
            Mis Tareas Asignadas
          </motion.h1>
          <motion.p
            className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Aquí puedes ver tus tareas pendientes y completadas. Sube la evidencia de tu trabajo para marcar una tarea como finalizada.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.section 
            className={`${glassCard} rounded-3xl p-6`} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <ClipboardList className="h-6 w-6 text-amber-600" />
              <h2 className="text-xl font-bold text-slate-900">Pendientes</h2>
            </div>
            <ul className="space-y-4">
              {pendingTasks.map((t,i)=> (
                <motion.li 
                  key={t.id} 
                  className="bg-white/70 p-4 rounded-2xl border border-white/50 shadow-sm"
                  initial={{opacity:0,y:6}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:i*0.05}}
                >
                  <div className="font-semibold text-slate-800">{t.title}</div>
                  <p className="text-sm text-slate-600 mt-1">{t.description}</p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
                    <label className="relative cursor-pointer rounded-full bg-white border border-emerald-200/70 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 w-full sm:w-auto text-center">
                      <span className="flex items-center justify-center gap-2"><UploadCloud className="h-4 w-4" /> {files[t.id] ? 'Archivo seleccionado' : 'Adjuntar prueba'}</span>
                      <input type="file" className="sr-only" onChange={e=>setFiles(prev=>({...prev, [t.id]: e.target.files?.[0]}))} />
                    </label>
                    <button 
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-50"
                      onClick={()=>complete(t.id)}
                      disabled={!files[t.id]}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marcar Completada
                    </button>
                  </div>
                  {files[t.id] && <p className='text-xs text-emerald-700 mt-2'>Archivo: {files[t.id]?.name}</p>}
                </motion.li>
              ))}
              {pendingTasks.length===0 && <li className="text-center text-slate-500 py-4">No tienes tareas pendientes.</li>}
            </ul>
          </motion.section>

          <motion.section 
            className={`${glassCard} rounded-3xl p-6`} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Completadas</h2>
            </div>
            <ul className="space-y-4">
              {completedTasks.map((t,i)=> (
                <motion.li 
                  key={t.id} 
                  className="bg-white/70 p-4 rounded-2xl border border-white/50 shadow-sm opacity-80"
                  initial={{opacity:0,y:6}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:i*0.05}}
                >
                  <div className="font-semibold text-slate-700">{t.title}</div>
                  <p className="text-sm text-slate-500 mt-1">{t.description}</p>
                  {t.proofUrl && 
                    <div className="mt-3">
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
                </motion.li>
              ))}
              {completedTasks.length===0 && <li className="text-center text-slate-500 py-4">Aún no has completado tareas.</li>}
            </ul>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
