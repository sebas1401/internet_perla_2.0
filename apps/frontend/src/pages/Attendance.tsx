import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, RefreshCw, Search, CheckCircle, User, Type, FileText } from 'lucide-react';
import { toast } from 'sonner';

import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';
import { useSocket } from '../hooks/useSocket';

type Rec = { id:string; name:string; tipo:'IN'|'OUT'; timestamp:string; note?:string };

const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

export default function Attendance(){
  const [rows,setRows] = useState<Rec[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|undefined>();
  const [form,setForm] = useState({ name:'', tipo:'IN' as 'IN'|'OUT', note:'' });
  const [filter,setFilter] = useState<'ALL'|'WEEK'|'MONTH'>('ALL');
  const [search,setSearch] = useState('');
  const { socket } = useSocket();

  const load = ()=>{
    setLoading(true);
    setError(undefined);
    api.get('/attendance')
      .then(r=>setRows(r.data))
      .catch(()=>setError('Error al cargar asistencia'))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if (!socket) return;
    const onNew = ()=> {
      toast.info('Nuevo registro de asistencia recibido.');
      load();
    };
    socket.on('attendance:created', onNew);
    return ()=>{ socket.off('attendance:created', onNew); };
  },[socket]);

  const check = async ()=>{
    if (!form.name.trim()) {
      toast.warning('El nombre es obligatorio.');
      return;
    }
    await api.post('/attendance/check', form);
    toast.success(`Registro de ${form.tipo} para ${form.name} guardado.`);
    setForm({ name:'', tipo:'IN', note:'' });
    load();
  };

  const filtered = useMemo(()=>{
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return rows.filter(r=>{
      const t = new Date(r.timestamp);
      const byRange = filter==='ALL' || (filter==='WEEK' && t>=startOfWeek) || (filter==='MONTH' && t>=startOfMonth);
      const byName = !search || r.name.toLowerCase().includes(search.toLowerCase());
      return byRange && byName;
    });
  },[rows,filter,search]);

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
            Control de Asistencia
          </motion.h1>
          <motion.p
            className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Registra entradas y salidas del personal. Filtra y busca registros históricos con facilidad.
          </motion.p>
        </header>

        {loading && <LoadingState message="Cargando asistencia..." />}
        {error && <ErrorState message={error} onRetry={load} />}

        <motion.section
          className={`${glassCard} rounded-3xl p-6`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Nuevo Registro</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <input className="w-full rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" placeholder="Nombre del colaborador" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            </div>
            <div className="relative">
              <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <select className="w-full appearance-none rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value as any})}><option>IN</option><option>OUT</option></select>
            </div>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <input className="w-full rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" placeholder="Nota (opcional)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
            </div>
            <button onClick={check} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600">
              <CheckCircle className="h-4 w-4" /> Registrar
            </button>
          </div>
        </motion.section>

        <motion.section
          className={`${glassCard} flex flex-1 flex-col rounded-3xl p-6`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Registros de Asistencia</h2>
              <p className="text-sm text-slate-500">Visualiza, filtra y busca en el historial de asistencia.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <input className="w-64 rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none" placeholder="Buscar por nombre" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700">
                <Filter className="h-3.5 w-3.5" />
                <select className="appearance-none bg-transparent focus:outline-none" value={filter} onChange={e=>setFilter(e.target.value as any)}>
                  <option value="ALL">Todo</option>
                  <option value="WEEK">Semana actual</option>
                  <option value="MONTH">Mes actual</option>
                </select>
              </div>
              <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-700 shadow hover:bg-emerald-50">
                <RefreshCw className="h-4 w-4" /> Recargar
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/40">
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Fecha/Hora</th>
                    <th className="px-4 py-3">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50/60 bg-white/70">
                  {filtered.map(r=> (
                    <tr key={r.id} className="transition hover:bg-emerald-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-500">{r.tipo}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(r.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">{r.note}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

