import { useEffect, useMemo, useState } from 'react';
import api, { getApiOrigin } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';

type Task = { id:string; title:string; description:string; status:'PENDING'|'IN_PROGRESS'|'COMPLETED'; proofUrl?:string };

export default function MyTasks(){
  const [tasks,setTasks] = useState<Task[]>([]);
  const [files,setFiles] = useState<Record<string, File|undefined>>({});
  const [showReturnAlert, setShowReturnAlert] = useState<string|null>(null);
  const load = async ()=>{ const {data} = await api.get('/tasks/mine'); setTasks(data); };
  const { socket } = useSocket();

  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if (!socket) return;
    const refresh = ()=> load();
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    socket.on('task:completed', refresh);
    return ()=>{ socket.off('task:created', refresh); socket.off('task:updated', refresh); socket.off('task:completed', refresh); };
  },[socket]);

  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }), [tasks]);

  const complete = async (id:string)=>{
    const fd = new FormData();
    const f = files[id];
    if (f) fd.append('proof', f);
    await api.patch(`/tasks/${id}/complete`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Tarea marcada como completada');

    // Show return alert
    const task = tasks.find(t => t.id === id);
    if (task) {
      setShowReturnAlert(id);
      setTimeout(() => setShowReturnAlert(null), 8000);
    }

    await load();
  };

  return (
    <div className="relative p-6 space-y-6 min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.15),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.15),_transparent_60%)]" />

      <div className="relative z-10">
        <motion.h1 className="text-4xl font-extrabold text-slate-900" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
          Mis Tareas
        </motion.h1>
        <p className="mt-2 text-slate-600">Gestiona tus tareas, reporta herramientas y devuelve lo que uses.</p>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-4 shadow">
            <p className="text-xs uppercase tracking-wider text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats.pending}</p>
          </div>
          <div className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-4 shadow">
            <p className="text-xs uppercase tracking-wider text-slate-500">En progreso</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.inProgress}</p>
          </div>
          <div className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-4 shadow">
            <p className="text-xs uppercase tracking-wider text-slate-500">Completadas</p>
            <p className="mt-2 text-3xl font-bold text-sky-600">{stats.completed}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {tasks.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">No tienes tareas asignadas en este momento.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((t, i) => (
                <motion.div
                  key={t.id}
                  className="backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl p-5 shadow hover:shadow-lg transition"
                  initial={{opacity:0,y:6}}
                  animate={{opacity:1,y:0}}
                  transition={{delay:i*0.05}}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'PENDING' ? 'bg-sky-100 text-sky-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.status === 'PENDING' ? 'Pendiente' : t.status === 'IN_PROGRESS' ? 'En Progreso' : 'Completada'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{t.description}</p>
                      {t.status === 'COMPLETED' && t.proofUrl && (
                        <a
                          href={`${getApiOrigin()}${t.proofUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Ver evidencia
                        </a>
                      )}
                    </div>

                    {t.status !== 'COMPLETED' && (
                      <div className="flex flex-col gap-3 lg:w-64">
                        <input
                          type="file"
                          onChange={e=>setFiles(prev=>({...prev, [t.id]: e.target.files?.[0]}))}
                          className="text-xs border border-slate-200 rounded-lg px-3 py-2"
                        />
                        <button
                          onClick={()=>complete(t.id)}
                          className="bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition"
                        >
                          Marcar Completada
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showReturnAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 right-6 z-50 max-w-md"
          >
            <div className="backdrop-blur-xl bg-white/95 border-2 border-amber-300 rounded-2xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">¡Recuerda devolver herramientas!</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Si utilizaste herramientas en esta tarea, regístralas como devueltas en el inventario para mantener el control.
                  </p>
                  <a
                    href="/app/inventory"
                    className="inline-block mt-3 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition"
                  >
                    Ir al Inventario
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
