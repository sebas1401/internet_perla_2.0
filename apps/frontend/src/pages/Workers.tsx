import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarDays, TrendingUp, BarChart2, Activity, Sparkles, X } from 'lucide-react';

type User = { id:string; email:string; name?:string; role:'ADMIN'|'USER' };

type WorkerSummary = {
  name: string;
  totalRecords: number;
  totalDaysWorked: number;
  currentWeekDays: number;
  currentMonthDays: number;
  streakDays: number;
  lastIn?: string;
  lastOut?: string;
  firstEntry?: string;
  monthlyBreakdown: { monthLabel: string; totalIn: number; totalOut: number }[];
  notes: { note: string; timestamp: string }[];
  recentActivity: { id: string; tipo: 'IN'|'OUT'; timestamp: string; note: string | null }[];
};

export default function Workers(){
  const [rows,setRows] = useState<User[]>([]);
  const [form,setForm] = useState({ name:'', email:'', password:'' });
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState<{ id:string; email:string; password:string }|null>(null);
  const [summaryLoading,setSummaryLoading] = useState(false);
  const [summaryError,setSummaryError] = useState<string|undefined>();
  const [summary,setSummary] = useState<WorkerSummary|null>(null);
  const [showSummary,setShowSummary] = useState(false);
  const [activeUser,setActiveUser] = useState<User|null>(null);

  const load = async()=>{
    setLoading(true);
    const { data } = await api.get('/users');
    const list: User[] = (data.value || data) as any;
    setRows(list.filter(u=>u.role==='USER'));
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const initials = (value?: string)=>{
    if (!value) return '?';
    return value
      .split(' ')
      .map(part=>part.trim()[0])
      .filter(Boolean)
      .join('')
      .slice(0,2)
      .toUpperCase();
  };

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

  const openSummary = async(user: User)=>{
    if (!user.name) {
      toast.error('Asigna un nombre al trabajador para ver su desempeño');
      return;
    }
    setActiveUser(user);
    setShowSummary(true);
    setSummary(null);
    setSummaryError(undefined);
    setSummaryLoading(true);
    try {
      const { data } = await api.get('/attendance/summary', { params: { name: user.name } });
      setSummary(data);
    } catch (err) {
      setSummaryError('No se pudo cargar el resumen de asistencia.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const closeSummary = ()=>{
    setShowSummary(false);
    setSummary(null);
    setSummaryError(undefined);
    setActiveUser(null);
  };

  const formatDate = (value?: string)=> value ? new Date(value).toLocaleString() : 'Sin datos';

  const maxMonthly = useMemo(()=>{
    if (!summary || summary.monthlyBreakdown.length === 0) return 1;
    return Math.max(...summary.monthlyBreakdown.map(item=>item.totalIn || 0), 1);
  },[summary]);

  return (
    <div className="space-y-6">
      <motion.h1 className="text-3xl font-bold text-primary" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Trabajadores</motion.h1>
      <div className="bg-white rounded-xl shadow p-4 grid md:grid-cols-4 gap-2 animate-fadeInUp">
        <input className="border rounded-lg px-3 py-2" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input className="border rounded-lg px-3 py-2" placeholder="Correo" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input className="border rounded-lg px-3 py-2" placeholder="Contraseña" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <button onClick={create} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg px-4 font-semibold shadow hover:shadow-md transition">Crear</button>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg text-emerald-700 mb-4">Listado de colaboradores</h2>
        <ul className="flex flex-col gap-3">
          {rows.map((u,i)=> (
            <motion.li
              key={u.id}
              className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white px-5 py-4 shadow-sm transition hover:shadow-lg"
              initial={{opacity:0,y:6}}
              animate={{opacity:1,y:0}}
              transition={{delay:i*0.03}}
            >
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition" aria-hidden />
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-700 font-semibold">
                    {initials(u.name || u.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-emerald-900 truncate">{u.name || 'Sin nombre asignado'}</p>
                    <p className="text-sm text-emerald-800/70 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button onClick={()=>openSummary(u)} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 transition">
                    <Sparkles className="h-4 w-4" /> Insights
                  </button>
                  <button onClick={()=>startEdit(u)} className="rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition">Editar</button>
                  <button onClick={()=>remove(u.id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition">Eliminar</button>
                </div>
              </div>
            </motion.li>
          ))}
          {!loading && rows.length===0 && <li className="text-sm text-slate-500">Sin trabajadores aún.</li>}
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

      <AnimatePresence>
        {showSummary && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-6 py-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70">Perfil laboral</p>
                  <h2 className="text-3xl font-bold">{activeUser?.name}</h2>
                  <p className="text-sm text-white/80">{activeUser?.email}</p>
                </div>
                <button onClick={closeSummary} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition">
                  <X className="h-4 w-4" /> Cerrar
                </button>
              </div>
              <div className="space-y-6 px-6 py-6">
                {summaryLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                    <span className="text-xs uppercase tracking-[0.35em] text-white/60">Cargando resumen</span>
                  </div>
                )}

                {summaryError && !summaryLoading && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <p className="text-sm text-white/80">{summaryError}</p>
                    <button onClick={()=> activeUser && openSummary(activeUser)} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-emerald-700 shadow hover:shadow-md transition">Reintentar</button>
                  </div>
                )}

                {summary && !summaryLoading && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {[{
                        label:'Días trabajados', value: summary.totalDaysWorked, icon: CalendarDays,
                      },{
                        label:'Días semana actual', value: summary.currentWeekDays, icon: Activity,
                      },{
                        label:'Días este mes', value: summary.currentMonthDays, icon: BarChart2,
                      },{
                        label:'Racha activa', value: summary.streakDays, icon: TrendingUp,
                      }].map(({ label, value, icon: Icon }, idx)=>(
                        <div key={label} className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 border border-white/10 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-white/60">{label}</span>
                            <Icon className="h-4 w-4 text-emerald-300" />
                          </div>
                          <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                          <p className="text-xs text-white/40 mt-2">{idx===0?'Total de jornadas registradas':idx===3?'Con entradas consecutivas desde hoy':'Actividad basada en entradas'}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-3xl bg-slate-800/60 border border-white/10 p-6">
                        <h3 className="text-lg font-semibold text-white">Actividad reciente</h3>
                        <p className="text-xs text-white/40 mb-4">Ultimos movimientos registrados en asistencia.</p>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                          {summary.recentActivity.map(item=>(
                            <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-3">
                              <div className={`mt-0.5 rounded-full px-2 py-1 text-xs font-semibold ${item.tipo==='IN'?'bg-emerald-500/20 text-emerald-200':'bg-amber-500/20 text-amber-200'}`}>
                                {item.tipo === 'IN' ? 'Entrada' : 'Salida'}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white">{new Date(item.timestamp).toLocaleString()}</p>
                                <p className="text-xs text-white/60">{item.note || 'Sin notas'}</p>
                              </div>
                            </div>
                          ))}
                          {summary.recentActivity.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-white/20 px-4 py-10 text-center text-sm text-white/50">Sin registros de asistencia para este colaborador.</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl bg-slate-800/60 border border-white/10 p-6 space-y-5">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Ritmo mensual</h3>
                          <p className="text-xs text-white/40">Comparativo de entradas registradas en los últimos meses.</p>
                        </div>
                        <div className="space-y-4">
                          {summary.monthlyBreakdown.length === 0 && (
                            <p className="text-sm text-white/50">Sin datos suficientes para mostrar tendencia.</p>
                          )}
                          {summary.monthlyBreakdown.map(item=>(
                            <div key={item.monthLabel} className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-white/60">
                                <span>{item.monthLabel}</span>
                                <span className="text-white font-semibold">{item.totalIn} entradas</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" style={{ width: `${Math.max(6, (item.totalIn / maxMonthly) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4 text-sm text-white/70 space-y-2">
                          <div className="flex items-center gap-2 text-white">
                            <Sparkles className="h-4 w-4 text-emerald-300" />
                            <span className="font-semibold">Fechas clave</span>
                          </div>
                          <p>Primer registro: <span className="font-semibold text-white">{formatDate(summary.firstEntry)}</span></p>
                          <p>Última entrada: <span className="font-semibold text-white">{formatDate(summary.lastIn)}</span></p>
                          <p>Última salida: <span className="font-semibold text-white">{formatDate(summary.lastOut)}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-slate-800/60 border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white">Notas destacadas</h3>
                      <p className="text-xs text-white/40 mb-4">Máximo 4 notas registradas recientemente.</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {summary.notes.map(item=>(
                          <div key={`${item.timestamp}-${item.note}`} className="rounded-2xl bg-white/5 p-4 text-sm text-white/80">
                            <p className="font-semibold text-white">{new Date(item.timestamp).toLocaleString()}</p>
                            <p className="text-sm text-white/70 mt-1">{item.note}</p>
                          </div>
                        ))}
                        {summary.notes.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-white/50">Sin notas asociadas a los registros de este colaborador.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

