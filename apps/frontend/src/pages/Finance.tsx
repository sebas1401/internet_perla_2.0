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

type SalaryCandidate = {
  userId: string;
  userName: string;
  dailySalary: number;
};
type SalaryAccrual = {
  id: string;
  date: string;
  userId: string;
  userName?: string;
  amount: number;
};
// Weekly payroll summary types removed

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
  // Week number for "Semana" mode; derived from baseDate year/week
  const [weekNumber, setWeekNumber] = useState<number>(() => {
    const { week } = isoWeekInfo(new Date(baseDate + "T00:00:00"));
    return Math.min(Math.max(week, 1), 52);
  });
  // Admin-only user filter
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Day detail
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailEntries, setDetailEntries] = useState<CashEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | undefined>();

  // Salaries section removed; keep only weekly payroll summary
  // Weekly payroll/attendance section removed completely

  // Movimientos del día
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | undefined>();
  const [dayIncomes, setDayIncomes] = useState<CashEntry[]>([]);
  const [dayExpenses, setDayExpenses] = useState<CashEntry[]>([]);

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

  // Removed daily salaries loader

  // Weekly attendance fetcher (Mon-Sun for week of baseDate)
  // Weekly attendance removed

  // Load weekly attendance summary (Mon-Sun) for the week of baseDate
  // Weekly attendance effect removed

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

  // Movements (by date and user filter)
  async function loadMovements(date: string) {
    try {
      setMovementsLoading(true);
      setMovementsError(undefined);
      const params: any = {};
      if (authUser?.role === "ADMIN" && selectedUserId)
        params.userId = selectedUserId;
      if (filterMode === "DAY") {
        params.date = date;
        const { data } = await api.get("/finance/cash-cut", { params });
        const entries: CashEntry[] = (data.entries || []).map((e: any) => ({
          ...e,
          amount:
            typeof e.amount === "string" ? parseFloat(e.amount) : e.amount,
        }));
        setDayIncomes(entries.filter((e) => e.type === "INCOME"));
        setDayExpenses(entries.filter((e) => e.type === "EXPENSE"));
      } else {
        // Semana: llamadas por cada día del rango y agregación
        const { from, to } = weekRange(date);
        const days = isoDatesBetween(from, to);
        const results = await Promise.all(
          days.map((d) =>
            api.get("/finance/cash-cut", {
              params: {
                date: d,
                ...(params.userId ? { userId: params.userId } : {}),
              },
            })
          )
        );
        const allEntriesRaw = results.flatMap((r) => r.data?.entries || []);
        const entries: CashEntry[] = allEntriesRaw.map((e: any) => ({
          ...e,
          amount:
            typeof e.amount === "string" ? parseFloat(e.amount) : e.amount,
        }));
        setDayIncomes(entries.filter((e) => e.type === "INCOME"));
        setDayExpenses(entries.filter((e) => e.type === "EXPENSE"));
      }
    } catch (e: any) {
      setMovementsError(
        e?.response?.data?.message || "Error al cargar movimientos del día"
      );
      setDayIncomes([]);
      setDayExpenses([]);
    } finally {
      setMovementsLoading(false);
    }
  }

  function weekShortLabel(dateStr: string) {
    const { from, to } = weekRange(dateStr);
    const d1 = new Date(from + "T00:00:00");
    const d2 = new Date(to + "T00:00:00");
    if (
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    ) {
      return `${d1.getDate()}–${d2.getDate()} ${
        MONTHS_ES_ABBR[d1.getMonth()]
      } ${d1.getFullYear()}`;
    }
    return `${d1.getDate()} ${
      MONTHS_ES_ABBR[d1.getMonth()]
    } ${d1.getFullYear()}–${d2.getDate()} ${
      MONTHS_ES_ABBR[d2.getMonth()]
    } ${d2.getFullYear()}`;
  }

  // Refresh open detail when user filter changes
  useEffect(() => {
    if (detailDate) loadDetail(detailDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  // Load movements whenever baseDate or selectedUserId changes
  useEffect(() => {
    if (baseDate) loadMovements(baseDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDate, selectedUserId]);

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
    const refreshMovements = (payload?: any) => {
      if (!payload?.date) return loadMovements(baseDate);
      if (filterMode === "DAY") {
        if (payload.date === baseDate) loadMovements(baseDate);
      } else {
        const { from, to } = weekRange(baseDate);
        if (payload.date >= from && payload.date <= to) {
          loadMovements(baseDate);
        }
      }
    };
    // Weekly attendance listeners removed
    socket.on("cash:entry-added", refresh);
    socket.on("cash:day-closed", refresh);
    socket.on("cash:day-reopened", refresh);
    socket.on("cash:entry-added", refreshDetail);
    socket.on("cash:day-closed", refreshDetail);
    socket.on("cash:day-reopened", refreshDetail);
    socket.on("cash:entry-added", refreshMovements);
    socket.on("cash:day-closed", refreshMovements);
    socket.on("cash:day-reopened", refreshMovements);
    // Weekly attendance listeners removed
    return () => {
      socket.off("cash:entry-added", refresh);
      socket.off("cash:day-closed", refresh);
      socket.off("cash:day-reopened", refresh);
      socket.off("cash:entry-added", refreshDetail);
      socket.off("cash:day-closed", refreshDetail);
      socket.off("cash:day-reopened", refreshDetail);
      socket.off("cash:entry-added", refreshMovements);
      socket.off("cash:day-closed", refreshMovements);
      socket.off("cash:day-reopened", refreshMovements);
      // Weekly attendance listeners removed
    };
  }, [socket, filterMode, baseDate, detailDate, selectedUserId]);

  // Helpers
  function isoWeekInfo(date: Date) {
    // ISO-8601: weeks start on Monday; week 1 is the week with Jan 4.
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    // Move to nearest Thursday
    const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    d.setUTCDate(d.getUTCDate() + 3 - dayNum); // now on Thursday of this week
    const isoYear = d.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - firstDayNum); // Thursday of week 1
    const week =
      1 + Math.round((d.getTime() - firstThursday.getTime()) / 604800000); // 7*24*3600*1000
    return { week, year: isoYear };
  }

  function mondayOfISOWeek(week: number, year: number) {
    // ISO-8601 week calculation anchored at Jan 4; Monday is start of the week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4DayNum = (jan4.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4DayNum); // Monday of week 1
    const monday = new Date(mondayWeek1);
    monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
    return monday;
  }

  function toIsoDate(d: Date) {
    // Always produce YYYY-MM-DD in UTC by zeroing time; avoid double TZ compensation
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.toISOString().slice(0, 10);
  }

  function weekRange(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toIsoDate(monday), to: toIsoDate(sunday) };
  }

  function isoDatesBetween(from: string, to: string) {
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    const out: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(toIsoDate(d));
    }
    return out;
  }

  // Keep weekNumber in sync with baseDate
  useEffect(() => {
    const info = isoWeekInfo(new Date(baseDate + "T00:00:00"));
    const next = Math.min(Math.max(info.week, 1), 52);
    setWeekNumber((prev) => (prev === next ? prev : next));
  }, [baseDate]);

  // Format helpers for dynamic text
  const MONTHS_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const MONTHS_ES_ABBR = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  function formatDateEs(d: Date) {
    const day = d.getDate();
    const month = MONTHS_ES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  function dynamicFilterText() {
    if (filterMode === "DAY") {
      const d = new Date(baseDate + "T00:00:00");
      return `Mostrando datos del ${d.toLocaleDateString()}.`;
    } else {
      const { from, to } = weekRange(baseDate);
      const d1 = new Date(from + "T00:00:00");
      const d2 = new Date(to + "T00:00:00");
      if (
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
      ) {
        // Same month/year
        return `Semana ${weekNumber}: del ${d1.getDate()} al ${d2.getDate()} de ${
          MONTHS_ES[d1.getMonth()]
        } de ${d1.getFullYear()}.`;
      }
      // Different months/years
      return `Semana ${weekNumber}: del ${formatDateEs(d1)} al ${formatDateEs(
        d2
      )}.`;
    }
  }

  function weekOptionLabel(week: number, year: number) {
    const monday = mondayOfISOWeek(week, year);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const d1 = monday;
    const d2 = sunday;
    const sameMonth =
      d1.getUTCMonth() === d2.getUTCMonth() &&
      d1.getUTCFullYear() === d2.getUTCFullYear();
    if (sameMonth) {
      return `Semana ${week} (${d1.getUTCDate()}–${d2.getUTCDate()} ${
        MONTHS_ES_ABBR[d1.getUTCMonth()]
      })`;
    }
    // Cross-month or cross-year
    return `Semana ${week} (${d1.getUTCDate()} ${
      MONTHS_ES_ABBR[d1.getUTCMonth()]
    }–${d2.getUTCDate()} ${MONTHS_ES_ABBR[d2.getUTCMonth()]})`;
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
      // Debug: verify computed range matches selection
      // eslint-disable-next-line no-console
      console.debug("Semana seleccionada", { baseDate: dateStr, from, to });
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
    await api.post("/finance/cash-summaries/close-day", { date });
    const s = await fetchSummaries(filterMode, baseDate);
    setSummaries(normalizeSummaries(s));
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
            <p className="text-xs text-gray-500">Filtra por día o semana.</p>
            <p className="text-xs text-gray-500 mt-1">
              Recuerda filtrar por dia o semana
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
            {filterMode === "DAY" ? (
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <label
                  className="text-xs text-gray-600"
                  title="Número de semana (1-52)"
                >
                  Semana:
                </label>
                <select
                  className="border rounded px-2 py-1"
                  value={weekNumber}
                  onChange={(e) => {
                    const next = Math.min(
                      Math.max(parseInt(e.target.value || "1", 10), 1),
                      52
                    );
                    setWeekNumber(next);
                    // compute Monday from week/year based on current baseDate year
                    const { year } = isoWeekInfo(
                      new Date(baseDate + "T00:00:00")
                    );
                    const monday = mondayOfISOWeek(next, year);
                    // Avoid manual timezone compensation; use ISO date directly
                    setBaseDate(monday.toISOString().slice(0, 10));
                  }}
                >
                  {Array.from({ length: 52 }).map((_, i) => {
                    const { year } = isoWeekInfo(
                      new Date(baseDate + "T00:00:00")
                    );
                    const w = i + 1;
                    return (
                      <option key={w} value={w}>
                        {weekOptionLabel(w, year)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
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
          {/* Dynamic filter text */}
          <div className="text-xs text-gray-600 mt-2">
            {dynamicFilterText()}
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
                  <td className="px-3 py-2">
                    {s.closedBy
                      ? s.closedBy === "system@auto-close"
                        ? "auto (20:00)"
                        : s.closedBy
                      : "-"}
                  </td>
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

      {/* Sueldos del día: eliminado */}

      {/* Resumen semanal de sueldos eliminado */}

      {/* Movimientos del día / semana */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {filterMode === "DAY"
              ? "Movimientos del día"
              : `Movimientos de la semana (${weekShortLabel(baseDate)})`}
          </h2>
          <div className="text-sm text-gray-600">
            {filterMode === "DAY"
              ? new Date(baseDate).toLocaleDateString()
              : weekShortLabel(baseDate)}
          </div>
        </div>
        {movementsLoading ? (
          <div className="text-sm text-gray-600">Cargando movimientos...</div>
        ) : movementsError ? (
          <div className="text-sm text-red-600">{movementsError}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">Ingresos</div>
              {dayIncomes.length === 0 ? (
                <div className="text-sm text-gray-500">Sin ingresos.</div>
              ) : (
                <ul className="divide-y">
                  {dayIncomes.map((e) => {
                    const showUser =
                      authUser?.role === "ADMIN" && !selectedUserId;
                    const who = e.createdByName || e.createdBy || "";
                    return (
                      <li key={e.id} className="py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-gray-800 truncate">
                            {e.description}
                            {showUser && who ? (
                              <span className="text-gray-500"> — {who}</span>
                            ) : null}
                          </div>
                          <div className="text-sm font-medium text-gray-900 min-w-[6rem] text-right">
                            {fmt(Number(e.amount) || 0)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Egresos</div>
              {dayExpenses.length === 0 ? (
                <div className="text-sm text-gray-500">Sin egresos.</div>
              ) : (
                <ul className="divide-y">
                  {dayExpenses.map((e) => {
                    const showUser =
                      authUser?.role === "ADMIN" && !selectedUserId;
                    const who = e.createdByName || e.createdBy || "";
                    return (
                      <li key={e.id} className="py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-gray-800 truncate">
                            {e.description}
                            {showUser && who ? (
                              <span className="text-gray-500"> — {who}</span>
                            ) : null}
                          </div>
                          <div className="text-sm font-medium text-gray-900 min-w-[6rem] text-right">
                            {fmt(Number(e.amount) || 0)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

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
