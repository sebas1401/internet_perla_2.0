import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "../components/ip/ErrorState";
import { LoadingState } from "../components/ip/LoadingState";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";

type CashSummary = {
  id: string;
  date: string;
  incomes: number | string;
  expenses: number | string;
  balance: number | string;
  createdAt: string;
  closedBy?: string;
};

type CashEntry = {
  id: string;
  entryDate: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number | string;
  createdAt: string;
  createdBy?: string;
  createdById?: string;
  createdByName?: string;
};

type User = {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "USER";
};

type SalaryCandidate = { userId: string; userName: string; dailySalary: number };
type SalaryAccrual = { id: string; date: string; userId: string; userName?: string; amount: number };

export default function Finance() {
  const { user: authUser } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Summaries and filters
  const [summaries, setSummaries] = useState<CashSummary[]>([]);
  const [filterMode, setFilterMode] = useState<"DAY" | "WEEK">("WEEK");
  const [baseDate, setBaseDate] = useState<string>(() => {
    const d = new Date();
    const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tz.toISOString().slice(0, 10);
  });
  // Admin-only user filter
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Day detail
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailEntries, setDetailEntries] = useState<CashEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | undefined>();

  // Salaries (admin)
  const [salaryCandidates, setSalaryCandidates] = useState<SalaryCandidate[]>([]);
  const [salaryInclude, setSalaryInclude] = useState<Record<string, boolean>>({});
  const [salaryAccruals, setSalaryAccruals] = useState<SalaryAccrual[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Fetch users for admin filter
  useEffect(() => {
    if (authUser?.role !== "ADMIN") return;
    (async () => {
      try {
        const { data } = await api.get("/users");
        const list = (data?.value || data) as User[];
        setUsers(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, [authUser?.role]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchSummaries(filterMode, baseDate);
        setSummaries(normalizeSummaries(s));
      } catch {}
    })();
  }, [filterMode, baseDate, selectedUserId]);

  async function load() {
    try {
      setLoading(true);
      setError(undefined);
      const s = await fetchSummaries(filterMode, baseDate);
      setSummaries(normalizeSummaries(s));
    } catch (e: any) {
      setError("Error al cargar finanzas");
    } finally {
      setLoading(false);
    }
  }

  // Load salary candidates for selected day (admin)
  useEffect(() => {
    if (authUser?.role !== "ADMIN") return;
    (async () => {
      setSalaryLoading(true);
      try {
        const { data } = await api.get("/finance/daily-salaries", { params: { date: baseDate } });
        const list = Array.isArray(data) ? data : [];
        setSalaryCandidates(list);
        // initialize include map to true for all
        const map: Record<string, boolean> = {};
        for (const c of list) map[c.userId] = true;
        setSalaryInclude(map);
        // if already closed, fetch accruals
        const isClosed = summaries.some((s) => s.date === baseDate && !!s.closedBy);
        if (isClosed) {
          const { data: acc } = await api.get("/finance/daily-salaries/accruals", { params: { date: baseDate } });
          setSalaryAccruals(Array.isArray(acc) ? acc : []);
        } else {
          setSalaryAccruals([]);
        }
      } catch {
        setSalaryCandidates([]);
        setSalaryInclude({});
        setSalaryAccruals([]);
      } finally {
        setSalaryLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.role, baseDate, summaries]);

  // Detail
  async function loadDetail(date: string) {
    try {
      setDetailLoading(true);
      setDetailError(undefined);
      const params: any = { date };
      if (authUser?.role === "ADMIN" && selectedUserId)
        params.userId = selectedUserId;
      const { data } = await api.get("/finance/cash-cut", { params });
      const entries = (data.entries || []).map((e: any) => ({
        ...e,
        amount: typeof e.amount === "string" ? parseFloat(e.amount) : e.amount,
      }));
      setDetailEntries(entries);
      setDetailDate(date);
    } catch (e: any) {
      setDetailError(
        e?.response?.data?.message || "Error al cargar el detalle del día"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  // Refresh open detail when user filter changes
  useEffect(() => {
    if (detailDate) loadDetail(detailDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  // Realtime
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      (async () => {
        try {
          const s = await fetchSummaries(filterMode, baseDate);
          setSummaries(normalizeSummaries(s));
        } catch {}
      })();
    };
    const refreshDetail = (payload?: any) => {
      if (detailDate && payload?.date === detailDate) loadDetail(detailDate);
    };
    socket.on("cash:entry-added", refresh);
    socket.on("cash:day-closed", refresh);
    socket.on("cash:entry-added", refreshDetail);
    socket.on("cash:day-closed", refreshDetail);
    return () => {
      socket.off("cash:entry-added", refresh);
      socket.off("cash:day-closed", refresh);
      socket.off("cash:entry-added", refreshDetail);
      socket.off("cash:day-closed", refreshDetail);
    };
  }, [socket, filterMode, baseDate, detailDate, selectedUserId]);

  // Helpers
  function weekRange(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const toISO = (x: Date) => {
      const tz = new Date(x.getTime() - x.getTimezoneOffset() * 60000);
      return tz.toISOString().slice(0, 10);
    };
    return { from: toISO(monday), to: toISO(sunday) };
  }

  async function fetchSummaries(mode: "DAY" | "WEEK", dateStr: string) {
    const baseParams: any = {};
    if (authUser?.role === "ADMIN" && selectedUserId)
      baseParams.userId = selectedUserId;
    if (mode === "DAY") {
      const { data } = await api.get("/finance/cash-summaries", {
        params: { from: dateStr, to: dateStr, ...baseParams },
      });
      return data as CashSummary[];
    } else {
      const { from, to } = weekRange(dateStr);
      const { data } = await api.get("/finance/cash-summaries", {
        params: { from, to, ...baseParams },
      });
      return data as CashSummary[];
    }
  }

  function normalizeSummaries(list: any) {
    return (list || []).map((r: CashSummary) => ({
      ...r,
      incomes:
        typeof r.incomes === "string"
          ? parseFloat(r.incomes as any)
          : r.incomes,
      expenses:
        typeof r.expenses === "string"
          ? parseFloat(r.expenses as any)
          : r.expenses,
      balance:
        typeof r.balance === "string"
          ? parseFloat(r.balance as any)
          : r.balance,
    }));
  }

  const totals = useMemo(() => {
    const inc = summaries.reduce((a, r) => a + (Number(r.incomes) || 0), 0);
    const exp = summaries.reduce((a, r) => a + (Number(r.expenses) || 0), 0);
    return { inc, exp, bal: inc - exp };
  }, [summaries]);

  const closeDay = async (date: string) => {
    const ok = window.confirm(
      `Vas a cerrar el día ${new Date(date).toLocaleDateString()}. ¿Confirmas?`
    );
    if (!ok) return;
    const payload: any = { date };
    if (authUser?.role === "ADMIN") {
      const includeUserIds = Object.entries(salaryInclude)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (includeUserIds.length) payload.includeUserIds = includeUserIds;
    }
    await api.post("/finance/cash-summaries/close-day", payload);
    const s = await fetchSummaries(filterMode, baseDate);
    setSummaries(normalizeSummaries(s));
    // refresh accruals post-close
    if (authUser?.role === "ADMIN") {
      try {
        const { data: acc } = await api.get("/finance/daily-salaries/accruals", { params: { date } });
        setSalaryAccruals(Array.isArray(acc) ? acc : []);
      } catch {}
    }
  };

  const fmt = (n: number) => `Q ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Finanzas</h1>
      {loading && <LoadingState message="Cargando finanzas..." />}
      {error && <ErrorState message={error} onRetry={load} />}

  <div className="bg-white rounded shadow p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
          <div>
            <h2 className="font-semibold mb-1">Cortes de Caja</h2>
            <p className="text-xs text-gray-500">
              Filtra por día o semana; cierra el día para guardar el snapshot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded px-2 py-1"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
            >
              <option value="DAY">Día</option>
              <option value="WEEK">Semana</option>
            </select>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
            />
            {authUser?.role === "ADMIN" && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Usuario:</label>
                <select
                  className="border rounded px-2 py-1"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  title="Filtra resúmenes y detalle por usuario"
                >
                  <option value="">Todos</option>
                  {users
                    .filter((u) => u.role === "USER")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-600">Ingresos</div>
            <div className="text-xl text-green-600 font-bold">
              {fmt(totals.inc)}
            </div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-600">Egresos</div>
            <div className="text-xl text-red-600 font-bold">
              {fmt(totals.exp)}
            </div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-600">Balance</div>
            <div className="text-xl text-emerald-700 font-bold">
              {fmt(totals.bal)}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Ingresos</th>
                <th className="px-3 py-2 text-left">Egresos</th>
                <th className="px-3 py-2 text-left">Balance</th>
                <th className="px-3 py-2 text-left">Cerrado por</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {authUser?.role === "ADMIN" && selectedUserId && (
                <tr className="bg-amber-50">
                  <td className="px-3 py-2 text-sm text-amber-700" colSpan={6}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block rounded-full bg-amber-200 text-amber-800 px-2 py-0.5 text-xs font-medium">
                        Usuario
                      </span>
                      <span>
                        {users.find((u) => u.id === selectedUserId)?.name ||
                          users.find((u) => u.id === selectedUserId)?.email ||
                          selectedUserId}
                      </span>
                    </span>
                  </td>
                </tr>
              )}
              {summaries.map((s) => (
                <tr key={s.id || s.date} className="border-t">
                  <td className="px-3 py-2">
                    <button
                      className="text-primary hover:underline"
                      onClick={() => loadDetail(s.date)}
                      title="Ver detalle diario"
                    >
                      {new Date(s.date).toLocaleDateString()}
                    </button>
                  </td>
                  <td className="px-3 py-2">{fmt(Number(s.incomes) || 0)}</td>
                  <td className="px-3 py-2">{fmt(Number(s.expenses) || 0)}</td>
                  <td className="px-3 py-2 font-medium">
                    {fmt(Number(s.balance) || 0)}
                  </td>
                  <td className="px-3 py-2">{s.closedBy || "-"}</td>
                  <td className="px-3 py-2">
                    <button
                      className={
                        s.closedBy
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-primary hover:underline"
                      }
                      onClick={() => !s.closedBy && closeDay(s.date)}
                      disabled={!!s.closedBy}
                      title={s.closedBy ? "Ya cerrado" : "Cerrar día"}
                    >
                      Cerrar día
                    </button>
                  </td>
                </tr>
              ))}
              {summaries.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={6}>
                    Sin resúmenes para el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sueldos del día (solo ADMIN) */}
      {authUser?.role === "ADMIN" && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Sueldos del día</h2>
              <p className="text-xs text-gray-500">Empleados con movimientos en {new Date(baseDate).toLocaleDateString()}.</p>
            </div>
            <div className="text-sm text-gray-600">
              Fecha: {new Date(baseDate).toLocaleDateString()}
            </div>
          </div>
          {salaryLoading ? (
            <div className="text-sm text-gray-600">Cargando sueldos...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Incluir</th>
                      <th className="px-3 py-2 text-left">Empleado</th>
                      <th className="px-3 py-2 text-right">Sueldo diario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryCandidates.map((c) => {
                      const included = !!salaryInclude[c.userId];
                      return (
                        <tr key={c.userId} className="border-t">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={included}
                              disabled={summaries.some((s) => s.date === baseDate && !!s.closedBy)}
                              onChange={(e) =>
                                setSalaryInclude((m) => ({ ...m, [c.userId]: e.target.checked }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2">{c.userName}</td>
                          <td className="px-3 py-2 text-right">{fmt(Number(c.dailySalary) || 0)}</td>
                        </tr>
                      );
                    })}
                    {salaryCandidates.length === 0 && (
                      <tr>
                        <td className="px-3 py-3 text-gray-500" colSpan={3}>
                          Sin empleados con movimientos hoy.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-700">
                  Total sueldos: {(() => {
                    const total = salaryCandidates.reduce((a, c) => a + ((salaryInclude[c.userId] ? Number(c.dailySalary) : 0) || 0), 0);
                    return fmt(total);
                  })()}
                  <span className="ml-2 text-xs text-gray-500">Impacto en balance: disminuye en ese monto al cerrar.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-sm text-primary hover:underline"
                    disabled={summaries.some((s) => s.date === baseDate && !!s.closedBy) || salaryCandidates.length === 0}
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      for (const c of salaryCandidates) all[c.userId] = true;
                      setSalaryInclude(all);
                    }}
                  >
                    Incluir todos
                  </button>
                  <button
                    className="text-sm text-red-600 hover:underline"
                    disabled={summaries.some((s) => s.date === baseDate && !!s.closedBy) || salaryCandidates.length === 0}
                    onClick={() => {
                      const none: Record<string, boolean> = {};
                      for (const c of salaryCandidates) none[c.userId] = false;
                      setSalaryInclude(none);
                    }}
                  >
                    Excluir todos
                  </button>
                </div>
              </div>
              {salaryAccruals.length > 0 && (
                <div className="mt-4 text-xs text-gray-600">
                  Día ya cerrado: {salaryAccruals.length} sueldos registrados. Total: {fmt(salaryAccruals.reduce((a, x) => a + (Number(x.amount) || 0), 0))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {detailDate && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Detalle del día: {new Date(detailDate).toLocaleDateString()}{" "}
              {authUser?.role === "ADMIN" && selectedUserId && (
                <span className="text-sm text-gray-500">
                  • Usuario:{" "}
                  {users.find((u) => u.id === selectedUserId)?.name ||
                    users.find((u) => u.id === selectedUserId)?.email ||
                    selectedUserId}
                </span>
              )}
            </h2>
            <button
              className="text-sm text-gray-600 hover:underline"
              onClick={() => setDetailDate(null)}
            >
              Cerrar
            </button>
          </div>
          {detailLoading && (
            <div className="text-sm text-gray-600">Cargando...</div>
          )}
          {detailError && (
            <div className="text-sm text-red-600">{detailError}</div>
          )}
          {!detailLoading && !detailError && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-left">Registrado por</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {detailEntries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">
                        {e.type === "INCOME" ? "Ingreso" : "Egreso"}
                      </td>
                      <td className="px-3 py-2">{e.description}</td>
                      <td className="px-3 py-2">
                        {e.createdByName || e.createdBy || ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt(Number(e.amount) || 0)}
                      </td>
                    </tr>
                  ))}
                  {detailEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-gray-500">
                        Sin movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
