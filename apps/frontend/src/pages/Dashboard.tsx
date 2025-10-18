import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { listContacts } from '../services/messages';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'sonner';

export default function Dashboard(){
  const { user } = useAuth();
  const [health,setHealth] = useState<any>();
  const [pendingTasks,setPendingTasks] = useState<number>(0);
  const [contactsCount,setContactsCount] = useState<number>(0);
  const [attendanceIn,setAttendanceIn] = useState<string>('No registrada');
  const [attendanceOut,setAttendanceOut] = useState<string>('No registrada');
  const { socket } = useSocket();

  useEffect(()=>{
    api.get('/health').then(r=>setHealth(r.data)).catch(()=>setHealth({status:'error'}));
    api.get('/tasks/mine').then(r=>{
      const list = r.data || [];
      setPendingTasks((list as any[]).filter((t:any)=>t.status==='PENDING').length);
    }).catch(()=>setPendingTasks(0));
    listContacts().then(cs=>setContactsCount(cs.length)).catch(()=>setContactsCount(0));
    api.get('/attendance').then(r=>{
      const me = (user?.name || user?.email)?.toLowerCase();
      const today = new Date().toDateString();
      const list = (r.data as any[]).filter(a=> new Date(a.timestamp).toDateString()===today && (a.name||'').toLowerCase()===me);
      const recIn = list.find(a=>a.tipo==='IN');
      const recOut = list.find(a=>a.tipo==='OUT');
      setAttendanceIn(recIn ? new Date(recIn.timestamp).toLocaleTimeString() : 'No registrada');
      setAttendanceOut(recOut ? new Date(recOut.timestamp).toLocaleTimeString() : 'No registrada');
    }).catch(()=>{ setAttendanceIn('No disponible'); setAttendanceOut('No disponible'); });
  },[]);
  useEffect(()=>{
    if (!socket) return;
    const onNew = (rec:any)=>{
      const me = (user?.name || user?.email)?.toLowerCase();
      const t = new Date(rec.timestamp);
      if ((rec.name||'').toLowerCase()===me && new Date().toDateString()===t.toDateString()){
        if (rec.tipo==='OUT') setAttendanceOut(t.toLocaleTimeString());
        if (rec.tipo==='IN') setAttendanceIn(t.toLocaleTimeString());
      }
    };
    socket.on('attendance:created', onNew);
    return ()=>{ socket.off('attendance:created', onNew); };
  },[socket]);

  return (
    <div className="p-6">
      <motion.h1 className="text-3xl font-extrabold text-primary mb-1" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Dashboard</motion.h1>
      <motion.div className="text-sm text-gray-600 mb-6" initial={{opacity:0}} animate={{opacity:1}}>Bienvenido, {user?.name || user?.email} ({user?.role})</motion.div>
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div className="bg-white p-4 rounded shadow card-hover" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
          <div className="font-semibold">Estado API</div>
          <div className="text-sm text-gray-600">{health?.status||'...'}</div>
        </motion.div>
        <motion.div className="bg-white p-4 rounded shadow card-hover" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.05}}>
          <div className="font-semibold">Mis Tareas</div>
          <div className="text-sm text-gray-600">Pendientes: {pendingTasks}</div>
        </motion.div>
        <motion.div className="bg-white p-4 rounded shadow card-hover" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}>
          <div className="font-semibold">Mensajes</div>
          <div className="text-sm text-gray-600">Contactos: {contactsCount}</div>
        </motion.div>
        <motion.div className="bg-white p-4 rounded shadow card-hover md:col-span-3" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}}>
          <div className="font-semibold mb-1">Asistencia de hoy</div>
          <div className="text-sm text-gray-600">Entrada: {attendanceIn}</div>
          <div className="text-sm text-gray-600">Salida: {attendanceOut}</div>
          {user?.role==='USER' && attendanceOut==='No registrada' && (
            <button
              className="mt-2 inline-flex items-center px-3 py-2 bg-primary text-white rounded hover:opacity-90"
              onClick={async()=>{
                try {
                  const name = (user?.name || user?.email) as string;
                  await api.post('/attendance/check', { name, tipo: 'OUT', note: 'manual-out' });
                  toast.success('Salida registrada');
                  const r = await api.get('/attendance');
                  const me = name.toLowerCase();
                  const today = new Date().toDateString();
                  const list = (r.data as any[]).filter(a=> new Date(a.timestamp).toDateString()===today && (a.name||'').toLowerCase()===me);
                  const recOut2 = list.find(a=>a.tipo==='OUT');
                  setAttendanceOut(recOut2 ? new Date(recOut2.timestamp).toLocaleTimeString() : 'No registrada');
                } catch {
                  toast.error('No se pudo registrar la salida');
                }
              }}
            >Registrar salida</button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
