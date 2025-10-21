import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface WorkerSummary {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'USER';
  isBlocked?: boolean;
}

const ROLE_LABEL: Record<WorkerSummary['role'], string> = {
  ADMIN: 'Administrador',
  USER: 'Trabajador',
};

function generateTempPassword(): string {
  const base = Math.random().toString(36).slice(-8);
  const suffix = Math.random().toString(36).slice(-4);
  return `${base}${suffix}`;
}

export default function AdminSettings() {
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user: currentUser } = useAuth();

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      const list: WorkerSummary[] = (data.value || data) as WorkerSummary[];
      setWorkers(list.filter((u) => u.id !== currentUser?.sub));
    } catch (err) {
      toast.error('No se pudo cargar la lista de trabajadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [currentUser?.sub]);

  const filteredWorkers = useMemo(() => {
    if (!search) return workers;
    const term = search.toLowerCase();
    return workers.filter((w) =>
      [w.name, w.email].some((field) => field?.toLowerCase().includes(term))
    );
  }, [workers, search]);

  const toggleBlock = async (worker: WorkerSummary) => {
    try {
      const { data } = await api.patch(`/users/${worker.id}`, { isBlocked: !worker.isBlocked });
      const patched = (data?.value || data) as WorkerSummary | undefined;
      toast.success(!worker.isBlocked ? 'Acceso bloqueado' : 'Acceso restaurado');
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id
            ? { ...w, isBlocked: patched?.isBlocked ?? !worker.isBlocked }
            : w
        )
      );
    } catch (err) {
      toast.error('No se pudo actualizar el estado de bloqueo');
    }
  };

  const updateRole = async (worker: WorkerSummary, role: WorkerSummary['role']) => {
    if (role === worker.role) return;
    try {
      const { data } = await api.patch(`/users/${worker.id}`, { role });
      const updated = (data?.value || data) as WorkerSummary | undefined;
      toast.success('Rol actualizado');
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id ? { ...w, role: updated?.role ?? role } : w
        )
      );
    } catch (err) {
      toast.error('No se pudo actualizar el rol');
    }
  };

  const resetPassword = async (worker: WorkerSummary) => {
    const tempPassword = generateTempPassword();
    try {
      await api.patch(`/users/${worker.id}`, { password: tempPassword });
      toast.success(`Contraseña temporal generada: ${tempPassword}`);
    } catch (err) {
      toast.error('No se pudo restablecer la contraseña');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Ajustes de Administración</h1>
          <p className="text-sm text-gray-600">
            Controla los accesos de trabajadores, asigna roles y gestiona acciones críticas desde un único lugar.
          </p>
        </div>
        <input
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-72"
          placeholder="Buscar trabajador"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      <section className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Control de accesos</h2>
          <span className="text-xs text-gray-500">Bloquear o reactivar cuentas</span>
        </div>
        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-gray-500">Cargando trabajadores...</div>}
          {!loading && filteredWorkers.length === 0 && (
            <div className="text-sm text-gray-500">No hay trabajadores que coincidan con la búsqueda.</div>
          )}
          {filteredWorkers.map((worker) => (
            <article
              key={worker.id}
              className={`p-4 border rounded-xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition ${
                worker.isBlocked
                  ? 'bg-rose-50 border-rose-100 hover:bg-rose-100'
                  : 'bg-gray-50/60 border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="space-y-1">
                <div className="font-medium text-gray-800">{worker.name || 'Sin nombre'}</div>
                <div className="text-sm text-gray-500">{worker.email}</div>
                <div className={`text-xs font-semibold ${worker.isBlocked ? 'text-rose-500' : 'text-gray-400'}`}>
                  {worker.isBlocked ? 'Acceso bloqueado' : ROLE_LABEL[worker.role]}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  onClick={() => toggleBlock(worker)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition shadow ${
                    worker.isBlocked
                      ? 'bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {worker.isBlocked ? 'Desbloquear acceso' : 'Bloquear acceso'}
                </button>
                <button
                  onClick={() => resetPassword(worker)}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-100"
                >
                  Restablecer contraseña
                </button>
                <select
                  className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700"
                  value={worker.role}
                  onChange={(e) => updateRole(worker, e.target.value as WorkerSummary['role'])}
                >
                  <option value="USER">Trabajador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-3">Buenas prácticas</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>Bloquea las cuentas inactivas para evitar accesos no autorizados.</li>
          <li>Genera contraseñas temporales y comunícalas a los trabajadores por un medio seguro.</li>
          <li>Promueve a administrador solo a personal de confianza y revoca el acceso cuando sea necesario.</li>
        </ul>
      </section>
    </div>
  );
}
