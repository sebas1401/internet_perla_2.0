import { useEffect, useState } from 'react';
import api, { getApiOrigin } from '../services/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type Task = { id:string; title:string; description:string; status:'PENDING'|'COMPLETED'; proofUrl?:string };

export default function MyTasks(){
  const [tasks,setTasks] = useState<Task[]>([]);
  const [files,setFiles] = useState<Record<string, File|undefined>>({});
  const load = async ()=>{ const {data} = await api.get('/tasks/mine'); setTasks(data); };
  useEffect(()=>{ load(); },[]);
  const complete = async (id:string)=>{
    const fd = new FormData();
    const f = files[id];
    if (f) fd.append('proof', f);
    await api.patch(`/tasks/${id}/complete`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Tarea marcada como completada');
    await load();
  };
  return (
    <div className="p-6 space-y-6">
      <motion.h1 className="text-2xl font-bold text-primary" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Mis Tareas</motion.h1>
      <div className="bg-white rounded shadow p-4 animate-fadeIn">
        <ul className="text-sm">
          {tasks.map((t,i)=> (
            <motion.li key={t.id} className="py-2 border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
              <div className="font-medium">{t.title} <span className="text-gray-500">({t.status})</span></div>
              <div className="text-gray-600">{t.description}</div>
              {t.status==='PENDING' && (
                <div className="mt-2 flex gap-2 items-center">
                  <input type="file" onChange={e=>setFiles(prev=>({...prev, [t.id]: e.target.files?.[0]}))} />
                  <button className="bg-primary text-white rounded px-3 py-1" onClick={()=>complete(t.id)}>Marcar Completada</button>
                </div>
              )}
              {t.status==='COMPLETED' && t.proofUrl && <div className="mt-1"><a className="text-primary underline" href={`${getApiOrigin()}${t.proofUrl}`} target="_blank">Ver evidencia</a></div>}
            </motion.li>
          ))}
          {tasks.length===0 && <li>Sin tareas asignadas</li>}
        </ul>
      </div>
    </div>
  );
}
