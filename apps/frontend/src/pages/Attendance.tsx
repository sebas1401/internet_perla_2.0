import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, ClipboardList, Filter, NotebookPen, PlusCircle, RefreshCw, Search, Sparkles, UserCheck, UserMinus, Users2 as Users } from 'lucide-react';
import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';
import { useSocket } from '../hooks/useSocket';

type Rec = { id: string; name: string; tipo: 'IN' | 'OUT'; timestamp: string; note?: string };

const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

const StatCard = ({
  icon: Icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: ElementType;
  title: string;
  value: string;
  hint: string;
  accent: string;
}) => (
  <motion.div
    whileHover={{ translateY: -6, scale: 1.015 }}
    transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    className={`${glassCard} relative overflow-hidden rounded-3xl p-6 text-slate-900`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10" />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-700/80">{title}</p>
        <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </motion.div>
);

const TimelineBadge = ({ label, type }: { label: string; type: 'IN' | 'OUT' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${
      type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}
  >
    {label}
  </span>
);

export default function Attendance() {
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', tipo: 'IN' as 'IN' | 'OUT', note: '' });
  const [filter, setFilter] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH'>('ALL');
  const [search, setSearch] = useState('');
  const [activePanel, setActivePanel] = useState<'timeline' | 'profiles' | 'notes'>('timeline');
  const [expandedNotes, setExpandedNotes] = useState(false);
  const { socket } = useSocket();

  const load = () => {
    setLoading(true);
    setError(undefined);
    api
      .get('/attendance')
      .then((response) => setRows(response.data))
      .catch(() => setError('Error al cargar asistencia'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => load();
    socket.on('attendance:created', onNew);
    return () => {
      socket.off('attendance:created', onNew);
    };
  }, [socket]);

  const check = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/attendance/check', form);
      setForm({ name: '', tipo: 'IN', note: '' });
      load();
    } catch {
      setError('No se pudo registrar la asistencia. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return rows.filter((record) => {
      const t = new Date(record.timestamp);
      const byRange =
        filter === 'ALL' ||
        (filter === 'DAY' && t >= startOfDay) ||
        (filter === 'WEEK' && t >= startOfWeek) ||
        (filter === 'MONTH' && t >= startOfMonth);
      const byName = !search || record.name.toLowerCase().includes(search.toLowerCase());
      return byRange && byName;
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(5, 0, 0, 0);
    let todayIn = 0;
    let todayOut = 0;
    for (const record of rows) {
      const t = new Date(record.timestamp);
      if (t >= todayStart) {
        if (record.tipo === 'IN') todayIn += 1;
        else todayOut += 1;
      }
    }
    const net = todayIn - todayOut;
    return { total: rows.length, todayIn, todayOut, net };
  }, [rows]);

  const roster = useMemo(() => {
    const map = new Map<string, { in: number; out: number; balance: number; last?: string }>();
    for (const record of rows) {
      const entry = map.get(record.name) || { in: 0, out: 0, balance: 0 };
      if (record.tipo === 'IN') {
        entry.in += 1;
        entry.balance += 1;
      } else {
        entry.out += 1;
        entry.balance = Math.max(0, entry.balance - 1);
      }
      entry.last = record.timestamp;
      map.set(record.name, entry);
    }
    return Array.from(map.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => (b.last ? new Date(b.last).getTime() : 0) - (a.last ? new Date(a.last).getTime() : 0));
  }, [rows]);

  const notes = useMemo(() => rows.filter((record) => !!record.note?.trim()), [rows]);

  const timeline = useMemo(
    () =>
      filtered
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, expandedNotes ? filtered.length : 10),
    [filtered, expandedNotes]
  );

  const quickFilters: { value: typeof filter; label: string }[] = [
    { value: 'ALL', label: 'Todo' },
    { value: 'DAY', label: 'Hoy' },
    { value: 'WEEK', label: 'Semana' },
    { value: 'MONTH', label: 'Mes' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-5 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[120%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.12),rgba(14,165,233,0.05),rgba(16,185,129,0.12))] blur-3xl opacity-40" />

      <div className="relative z-10 space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <motion.span
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-white/70 px-4 py-1 text-xs font-semibold text-emerald-700 shadow-sm"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Ritmo de asistencia impecable
            </motion.span>
            <motion.h1
              className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Panel de Asistencias
            </motion.h1>
            <motion.p
              className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              Control total de ingresos y salidas con métricas calculadas en vivo, flujos inteligentes y experiencias interactivas para tu equipo de operaciones.
            </motion.p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-full bg-white/80 px-3 py-3 text-xs font-semibold shadow-inner shadow-emerald-100">
            {quickFilters.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-4 py-2 transition ${
                  filter === option.value
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : 'text-emerald-700 hover:bg-emerald-100/70'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={load}
              className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-emerald-600 shadow hover:bg-emerald-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        </header>

        {loading && <LoadingState message="Cargando asistencia..." />}
        {error && <ErrorState message={error} onRetry={load} />}

        <section className="grid gap-6 lg:grid-cols-4">
          <StatCard
            icon={Users}
            title="Registros históricos"
            value={`${stats.total}`}
            hint="Eventos sincronizados sin pérdidas"
            accent="bg-emerald-500/20 text-emerald-700"
          />
          <StatCard
            icon={UserCheck}
            title="Entradas de hoy"
            value={`${stats.todayIn}`}
            hint="Talento presente desde las 5:00 am"
            accent="bg-sky-500/20 text-sky-700"
          />
          <StatCard
            icon={UserMinus}
            title="Salidas de hoy"
            value={`${stats.todayOut}`}
            hint="Movimientos registrados a tiempo"
            accent="bg-amber-500/20 text-amber-700"
          />
          <StatCard
            icon={ClipboardList}
            title="Balance activo"
            value={`${stats.net}`}
            hint="Colaboradores actualmente en planta"
            accent="bg-emerald-500/20 text-emerald-700"
          />
        </section>

        <section className={`${glassCard} rounded-3xl p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Registrar asistencia en segundos</h2>
              <p className="text-xs text-slate-500">Captura nuevas entradas o salidas con notas contextuales para auditorías futuras.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <Calendar className="h-3.5 w-3.5" />
              {new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              placeholder="Nombre del colaborador"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <motion.select
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              value={form.tipo}
              onChange={(event) => setForm({ ...form, tipo: event.target.value as 'IN' | 'OUT' })}
            >
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
            </motion.select>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              placeholder="Nota opcional (motivo, área, etc.)"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={check}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300 transition disabled:bg-emerald-300"
            >
              <PlusCircle className="h-4 w-4" />
              {submitting ? 'Registrando...' : 'Registrar asistencia'}
            </motion.button>
          </div>
        </section>

        <section className={`${glassCard} rounded-3xl p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Explora la actividad</h2>
              <p className="text-xs text-slate-500">Filtra por períodos, busca personas y alterna entre diferentes vistas analíticas.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <Filter className="h-3.5 w-3.5" /> Filtros inteligentes activos
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <input
                className="w-full rounded-2xl border border-emerald-200/70 bg-white py-3 pl-9 pr-4 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
                placeholder="Buscar por nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-emerald-700 shadow-inner">
              {['timeline', 'profiles', 'notes'].map((panel) => (
                <button
                  key={panel}
                  onClick={() => setActivePanel(panel as typeof activePanel)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    activePanel === panel ? 'bg-emerald-500 text-white shadow' : 'hover:bg-emerald-100/60'
                  }`}
                >
                  {panel === 'timeline' ? 'Linea de tiempo' : panel === 'profiles' ? 'Colaboradores' : 'Notas' }
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {activePanel === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-3"
                >
                  {timeline.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between rounded-2xl border border-emerald-100/80 bg-white/80 px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-slate-800">{record.name}</p>
                        <p className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleString()}</p>
                      </div>
                      <TimelineBadge label={record.tipo === 'IN' ? 'Entrada' : 'Salida'} type={record.tipo} />
                    </motion.div>
                  ))}
                  {filtered.length > 10 && (
                    <button
                      onClick={() => setExpandedNotes((prev) => !prev)}
                      className="flex items-center gap-2 text-xs font-semibold text-emerald-600"
                    >
                      <ChevronDown className={`h-4 w-4 transition ${expandedNotes ? 'rotate-180' : ''}`} />
                      {expandedNotes ? 'Mostrar menos' : 'Ver toda la actividad filtrada'}
                    </button>
                  )}
                  {timeline.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-6 text-center text-sm text-slate-400">
                      Sin registros que coincidan con el criterio seleccionado.
                    </div>
                  )}
                </motion.div>
              )}

              {activePanel === 'profiles' && (
                <motion.div
                  key="profiles"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  {roster.map((person) => (
                    <motion.div
                      key={person.name}
                      whileHover={{ translateY: -6 }}
                      className="rounded-2xl border border-emerald-100/80 bg-white/80 px-5 py-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{person.name}</p>
                          <p className="text-[11px] text-slate-500">Último movimiento {person.last ? new Date(person.last).toLocaleString() : '—'}</p>
                        </div>
                        <NotebookPen className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <TimelineBadge label={`${person.in} entradas`} type="IN" />
                        <TimelineBadge label={`${person.out} salidas`} type="OUT" />
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600">Balance {person.balance}</span>
                      </div>
                    </motion.div>
                  ))}
                  {roster.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-6 text-center text-sm text-slate-400 md:col-span-2 xl:col-span-3">
                      Aún no hay colaboradores registrados en el rango elegido.
                    </div>
                  )}
                </motion.div>
              )}

              {activePanel === 'notes' && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-3"
                >
                  {notes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-6 text-center text-sm text-slate-400">
                      Ninguna nota asociada a los registros actuales.
                    </div>
                  )}
                  {notes.map((record) => (
                    <motion.div
                      key={record.id}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-2xl border border-emerald-100/80 bg-white/85 px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{record.name}</p>
                          <p className="text-[11px] text-slate-500">{new Date(record.timestamp).toLocaleString()}</p>
                        </div>
                        <TimelineBadge label={record.tipo === 'IN' ? 'Entrada' : 'Salida'} type={record.tipo} />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{record.note}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className={`${glassCard} overflow-hidden rounded-3xl`}>
          <div className="flex items-center justify-between border-b border-white/40 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tabla completa de asistencia</h2>
              <p className="text-xs text-slate-500">Consulta el historial completo según los filtros activos.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-100/60 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <ClipboardList className="h-3.5 w-3.5" /> {filtered.length} registros visibles
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/70 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50/80">
                {filtered.map((record, index) => (
                  <tr key={record.id} className={index % 2 === 0 ? 'bg-white/90' : 'bg-emerald-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{record.name}</td>
                    <td className="px-4 py-3">
                      <TimelineBadge label={record.tipo === 'IN' ? 'Entrada' : 'Salida'} type={record.tipo} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(record.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{record.note || '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                      Sin registros que coincidan con el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

