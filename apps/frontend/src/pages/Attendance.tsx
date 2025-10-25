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

  const [filter,setFilter] = useState<'ALL'|'WEEK'|'MONTH'>('ALL');
  const [search,setSearch] = useState('');
  const { socket } = useSocket();

  // State for weekly view
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    // Fetch users for the dropdown
    api.get('/users').then(r => setUsers(r.data)).catch(() => toast.error('No se pudo cargar la lista de trabajadores.'));
  }, []);

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

  const { weeklyData, bonusEligible } = useMemo(() => {
    if (!selectedUser) return { weeklyData: [], bonusEligible: false };

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = Array.from({ length: 6 }).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return {
        date: day,
        dayName: day.toLocaleDateString('es-ES', { weekday: 'long' }),
        records: [] as Rec[]
      };
    });

    const selectedUserName = users.find(u => u.id === selectedUser)?.name;
    if (!selectedUserName) return { weeklyData: [], bonusEligible: false };

    const userRecords = rows.filter(r => {
      if (r.name !== selectedUserName) return false;
      const recordDate = new Date(r.timestamp);
      return recordDate >= startOfWeek && recordDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    });

    userRecords.forEach(rec => {
      const recDay = new Date(rec.timestamp).getDay(); // 0=Sun, 1=Mon...
      const dayIndex = recDay === 0 ? 6 : recDay - 1;
      if (dayIndex < 6) { // Only Mon-Sat
        weekDays[dayIndex].records.push(rec);
      }
    });

    const processedData = weekDays.map(day => {
      const checkIn = day.records.find(r => r.tipo === 'IN');
      const checkOut = day.records.find(r => r.tipo === 'OUT');
      return {
        dayName: day.dayName,
        date: day.date.toISOString().slice(0, 10),
        checkIn: checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '---',
        checkOut: checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '---',
        attended: !!checkIn
      };
    });

    const bonusEligible = processedData.length === 6 && processedData.every(day => day.attended);

    return { weeklyData: processedData, bonusEligible };
  }, [selectedUser, users, rows]);

  // --- Editing Logic ---
  const [editingCell, setEditingCell] = useState<{date: string, field: 'checkIn' | 'checkOut' | 'bonus' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleSave = async () => {
    if (!editingCell) return;

    const user = users.find(u => u.id === selectedUser);
    if (!user) return;

    try {
      // NOTE: This endpoint does not exist yet and needs to be created in the backend.
      // It should handle creating/updating attendance records manually.
      await api.post('/attendance/manual-entry', {
        name: user.name,
        date: editingCell.date,
        type: editingCell.field, // 'checkIn', 'checkOut', 'bonus'
        value: editValue
      });
      toast.success('Cambio guardado exitosamente.');
      load(); // Refresh data
    } catch (err) {
      toast.error('No se pudo guardar el cambio.');
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditClick = (day: any, field: 'checkIn' | 'checkOut' | 'bonus') => {
    setEditingCell({ date: day.date, field });
    const currentValue = day[field];
    // For time, we need HH:MM format for the input
    if (currentValue.includes(':')) {
      setEditValue(currentValue);
    } else {
      setEditValue(''); // For '---' or bonus placeholder
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



        {/* Weekly View Section */}
        <motion.section
          className={`${glassCard} rounded-3xl p-6`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Vista Semanal por Trabajador</h2>
          <div className="relative max-w-xs">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <select 
              className="w-full appearance-none rounded-full border border-emerald-200/70 bg-white px-9 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">Seleccione un trabajador</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Weekly table */}
          {selectedUser && (
            <div className="mt-6">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-white/60 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Día</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida</th>
                      {bonusEligible && <th className="px-4 py-3">Bonificación</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50/60 bg-white/70">
                    {weeklyData.map(day => (
                      <tr key={day.date}>
                        <td className="px-4 py-3 font-semibold text-slate-800 capitalize">{day.dayName} <span className="text-xs text-slate-400">{day.date}</span></td>
                        
                        {/* Check-in Cell */}
                        <td className="px-4 py-3 text-slate-600">
                          {editingCell?.date === day.date && editingCell?.field === 'checkIn' ? (
                            <input 
                              type="time" 
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={e => e.key === 'Enter' && handleSave()}
                              autoFocus
                              className="w-24 rounded border-emerald-300 bg-white px-1 py-0.5 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
                            />
                          ) : (
                            <div onClick={() => handleEditClick(day, 'checkIn')} className="cursor-pointer w-full h-full">{day.checkIn}</div>
                          )}
                        </td>

                        {/* Check-out Cell */}
                        <td className="px-4 py-3 text-slate-600">
                          {editingCell?.date === day.date && editingCell?.field === 'checkOut' ? (
                            <input 
                              type="time" 
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={e => e.key === 'Enter' && handleSave()}
                              autoFocus
                              className="w-24 rounded border-emerald-300 bg-white px-1 py-0.5 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
                            />
                          ) : (
                            <div onClick={() => handleEditClick(day, 'checkOut')} className="cursor-pointer w-full h-full">{day.checkOut}</div>
                          )}
                        </td>

                        {bonusEligible && (
                          <td className="px-4 py-3 text-emerald-600 font-semibold">
                            {editingCell?.date === day.date && editingCell?.field === 'bonus' ? (
                              <input 
                                type="text" 
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                autoFocus
                                placeholder="Monto"
                                className="w-24 rounded border-emerald-300 bg-white px-1 py-0.5 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
                              />
                            ) : (
                              <div onClick={() => handleEditClick(day, 'bonus')} className="cursor-pointer w-full h-full">{day.bonus || 'Aplicar'}</div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {weeklyData.length === 0 && (
                      <tr>
                        <td colSpan={bonusEligible ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-400">
                          No hay datos de asistencia para esta semana.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {bonusEligible && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800">
                  <p><span className="font-semibold">¡Bonificación Desbloqueada!</span> Este trabajador ha cumplido con la asistencia de la semana completa.</p>
                </div>
              )}
            </div>
          )}
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

