import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, ClipboardList, Clock, Filter, Layers, PlusCircle, RefreshCw, Search, Sparkles, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api, { getApiOrigin } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';

type User = { id: string; email: string; name?: string; role: 'ADMIN' | 'USER' };
type Task = {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED';
  assignedTo: User;
  createdAt: string;
  proofUrl?: string;
};

const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

const statusStyles: Record<Task['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

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

const toISODate = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 10);
};

export default function TasksAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: '', title: '', description: '' });
  const [statusFilter, setStatusFilter] = useState<'ALL' | Task['status']>('ALL');
  const [userFilter, setUserFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'timeline' | 'calendar' | 'board'>('timeline');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { socket } = useSocket();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, tasksRes] = await Promise.all([api.get('/users'), api.get('/tasks')]);
      setUsers(usersRes.data.value || usersRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.warn('No se pudo cargar el panel de tareas', err);
      setError('No se pudieron cargar las tareas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    return () => {
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
    };
  }, [socket]);

  const create = async () => {
    if (!form.userId || !form.title.trim()) {
      toast.warning('Selecciona un colaborador e ingresa un título.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/tasks', form);
      setForm({ userId: '', title: '', description: '' });
      toast.success('Tarea creada');
      load();
    } catch (err) {
      console.error('No se pudo crear la tarea', err);
      toast.error('No se pudo crear la tarea. Inténtalo de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const userOptions = useMemo(() => users.filter((user) => user.role === 'USER'), [users]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => (statusFilter === 'ALL' ? true : task.status === statusFilter))
      .filter((task) => (!userFilter ? true : task.assignedTo?.id === userFilter))
      .filter((task) =>
        !query
          ? true
          : `${task.title} ${task.description} ${task.assignedTo?.name || ''}`.toLowerCase().includes(query)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, statusFilter, userFilter, search]);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => task.status === 'PENDING').length;
    const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
    const total = tasks.length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    const uniqueUsers = new Set(tasks.map((task) => task.assignedTo?.id).filter(Boolean));
    return { total, pending, completed, completionRate, uniqueUsers: uniqueUsers.size };
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const month = new Date(calendarMonth);
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay();
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - startDay);
    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  }, [calendarMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const key = toISODate(task.createdAt);
      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [filteredTasks]);

  const selectedDateKey = selectedDate ? toISODate(selectedDate) : null;
  const selectedDateTasks = selectedDateKey ? tasksByDate.get(selectedDateKey) || [] : [];

  const timelineTasks = filteredTasks.slice(0, Math.min(filteredTasks.length, view === 'timeline' ? 12 : filteredTasks.length));

  const boardColumns = useMemo(() => ({
    PENDING: filteredTasks.filter((task) => task.status === 'PENDING'),
    COMPLETED: filteredTasks.filter((task) => task.status === 'COMPLETED'),
  }), [filteredTasks]);

  const setMonth = (delta: number) => {
    const next = new Date(calendarMonth);
    next.setMonth(calendarMonth.getMonth() + delta);
    setCalendarMonth(next);
  };

  const isSameDay = (left: Date, right: Date) => toISODate(left) === toISODate(right);

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
              <Sparkles className="h-3.5 w-3.5" /> Orquesta de tareas en tiempo real
            </motion.span>
            <motion.h1
              className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Panel de Tareas (Admin)
            </motion.h1>
            <motion.p
              className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              Diseña, asigna y supervisa tareas con visualizaciones inmersivas, calendario interactivo y analítica instantánea sobre tu fuerza operativa.
            </motion.p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-full bg-white/80 px-3 py-3 text-xs font-semibold shadow-inner shadow-emerald-100">
            {['timeline', 'calendar', 'board'].map((key) => (
              <button
                key={key}
                onClick={() => setView(key as typeof view)}
                className={`rounded-full px-4 py-2 transition ${
                  view === key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-emerald-700 hover:bg-emerald-100/70'
                }`}
              >
                {key === 'timeline' ? 'Linea de tiempo' : key === 'calendar' ? 'Calendario' : 'Board'}
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

        {loading && <LoadingState message="Recopilando tareas..." />}
        {error && <ErrorState message={error} onRetry={load} />}

        <section className="grid gap-6 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            title="Tareas totales"
            value={`${stats.total}`}
            hint="Operaciones asignadas al equipo"
            accent="bg-emerald-500/20 text-emerald-700"
          />
          <StatCard
            icon={Clock}
            title="Pendientes"
            value={`${stats.pending}`}
            hint="En seguimiento activo"
            accent="bg-amber-500/20 text-amber-700"
          />
          <StatCard
            icon={CheckCircle2}
            title="Completadas"
            value={`${stats.completed}`}
            hint="Objetivos alcanzados"
            accent="bg-sky-500/20 text-sky-700"
          />
          <StatCard
            icon={Users}
            title="Equipo activo"
            value={`${stats.uniqueUsers}`}
            hint={`Participantes | ${stats.completionRate}% completadas`}
            accent="bg-emerald-500/20 text-emerald-700"
          />
        </section>

        <section className={`${glassCard} rounded-3xl p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Crear nueva tarea</h2>
              <p className="text-xs text-slate-500">Asigna objetivos con contexto claro y seguimiento inmediato.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <CalendarDays className="h-3.5 w-3.5" /> {new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <motion.select
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              value={form.userId}
              onChange={(event) => setForm({ ...form, userId: event.target.value })}
            >
              <option value="">Selecciona colaborador</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </motion.select>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              placeholder="Título impactante"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              placeholder="Descripción detallada"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={create}
              disabled={creating}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300 transition disabled:bg-emerald-300"
            >
              <PlusCircle className="h-4 w-4" /> {creating ? 'Creando...' : 'Crear tarea'}
            </motion.button>
          </div>
        </section>

        <section className={`${glassCard} rounded-3xl p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Explora las tareas</h2>
              <p className="text-xs text-slate-500">Aplica filtros inteligentes para visualizar el trabajo desde diferentes ángulos.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <Filter className="h-3.5 w-3.5" /> Filtros activos
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <input
                className="w-full rounded-2xl border border-emerald-200/70 bg-white py-3 pl-9 pr-4 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
                placeholder="Busca por título, descripción o colaborador"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="ALL">Estado: todos</option>
              <option value="PENDING">Solo pendientes</option>
              <option value="COMPLETED">Solo completadas</option>
            </select>
            <select
              className="rounded-2xl border border-emerald-200/70 bg-white px-4 py-3 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
            >
              <option value="">Todos los colaboradores</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {view === 'timeline' && (
            <motion.section
              key="timeline"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className={`${glassCard} rounded-3xl p-6`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Timeline de actividad</h2>
                <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                  <Clock className="mr-1 inline h-3.5 w-3.5" /> Últimas {timelineTasks.length} tareas
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {timelineTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-2xl border border-emerald-100/80 bg-white/85 px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.assignedTo?.name || task.assignedTo?.email || '—'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[task.status]}`}>
                        {task.status === 'PENDING' ? 'Pendiente' : 'Completada'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{task.description || 'Sin descripción'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>{new Date(task.createdAt).toLocaleString()}</span>
                      {task.proofUrl && (
                        <a
                          href={`${getApiOrigin()}${task.proofUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-emerald-600 underline"
                        >
                          Ver evidencia
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
                {timelineTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-6 text-center text-sm text-slate-400">
                    No hay tareas coincidentes con los filtros actuales.
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {view === 'calendar' && (
            <motion.section
              key="calendar"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className={`${glassCard} rounded-3xl p-6`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Calendario operativo</h2>
                  <p className="text-xs text-slate-500">Explora la carga diaria y descubre patrones de asignación.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonth(-1)}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    ←
                  </button>
                  <span className="text-sm font-semibold text-emerald-700">
                    {calendarMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setMonth(1)}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-3 text-center text-xs font-semibold text-slate-500">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div key={day} className="rounded-2xl bg-emerald-50/60 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-3">
                {calendarDays.map((day) => {
                  const key = toISODate(day);
                  const dayTasks = tasksByDate.get(key) || [];
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedDate(day)}
                      className={`flex h-24 flex-col items-center justify-between rounded-3xl border px-3 py-3 text-xs transition ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                          : 'border-emerald-100/70 bg-white/80'
                      } ${isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}
                    >
                      <span className="text-sm font-semibold">{day.getDate()}</span>
                      <div className="flex flex-col gap-1 text-[11px] font-semibold">
                        {dayTasks.slice(0, 2).map((task) => (
                          <span
                            key={task.id}
                            className={`rounded-full px-2 py-0.5 ${statusStyles[task.status]}`}
                          >
                            {task.title.slice(0, 12)}
                          </span>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                            +{dayTasks.length - 2} más
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-100/70 bg-white/85 px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {selectedDate
                      ? selectedDate.toLocaleString('es-ES', { dateStyle: 'long' })
                      : 'Selecciona un día del calendario'}
                  </h3>
                  <span className="rounded-full bg-emerald-100/60 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    {selectedDateTasks.length} tareas en este día
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedDateTasks.length === 0 && (
                    <p className="text-sm text-slate-500">No hay tareas en la fecha seleccionada.</p>
                  )}
                  {selectedDateTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-emerald-100/80 bg-white/90 px-4 py-3 text-sm shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[task.status]}`}>
                          {task.status === 'PENDING' ? 'Pendiente' : 'Completada'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Asignado a {task.assignedTo?.name || task.assignedTo?.email || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {view === 'board' && (
            <motion.section
              key="board"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className={`${glassCard} rounded-3xl p-6`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Board visual de tareas</h2>
                <Layers className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {(['PENDING', 'COMPLETED'] as Task['status'][]).map((status) => (
                  <div key={status} className="rounded-3xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">
                        {status === 'PENDING' ? 'Pendientes' : 'Completadas'}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
                        {boardColumns[status].length} tareas
                      </span>
                    </div>
                    <div className="space-y-3">
                      {boardColumns[status].length === 0 && (
                        <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-5 text-center text-xs text-slate-400">
                          {status === 'PENDING'
                            ? 'Sin tareas pendientes bajo los filtros actuales.'
                            : 'No hay completadas en este rango.'}
                        </div>
                      )}
                      {boardColumns[status].map((task) => (
                        <div key={task.id} className="rounded-2xl border border-emerald-100/70 bg-white/95 px-4 py-3 text-sm shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-800">{task.title}</p>
                            {task.status === 'PENDING' ? (
                              <XCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {task.assignedTo?.name || task.assignedTo?.email || '—'} • {new Date(task.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">{task.description || 'Sin descripción'}</p>
                          {task.proofUrl && (
                            <a
                              href={`${getApiOrigin()}${task.proofUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 underline"
                            >
                              Ver evidencia
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
