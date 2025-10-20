import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "../components/ip/ErrorState";
import { LoadingState } from "../components/ip/LoadingState";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";

type Entry = {
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
type CashCut = {
  date: string;
  incomes: number;
  expenses: number;
  balance: number;
  entries: Entry[];
  closedBy?: string;
};

function fmtMoney(q: number) {
  if (Number.isNaN(q)) q = 0;
  return `Q ${q.toFixed(2)}`;
}

function todayISO() {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

function fmtISODate(dateStr: string) {
  // Render YYYY-MM-DD as DD/MM/YYYY without timezone conversion
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function CashCut() {
  const [date, setDate] = useState<string>(todayISO());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<CashCut | null>(null);
  const { socket } = useSocket();

  const [inDesc, setInDesc] = useState("");
  const [inAmt, setInAmt] = useState<string>("");
  const [outDesc, setOutDesc] = useState("");
  const [outAmt, setOutAmt] = useState<string>("");
  const [formError, setFormError] = useState<string | undefined>();

  const reload = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { data } = await api.get("/finance/cash-cut", { params: { date } });
      // normalizar amounts a number
      const entries = (data.entries || []).map((e: Entry) => ({
        ...e,
        amount:
          typeof e.amount === "string" ? parseFloat(e.amount as any) : e.amount,
      }));
      setData({ ...data, entries });
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "Error al cargar el corte de caja"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [date]);
  useEffect(() => {
    if (!socket) return;
    const maybeRefresh = (payload: any) => {
      if (payload?.date === date) reload();
    };
    socket.on("cash:entry-added", maybeRefresh);
    socket.on("cash:day-closed", maybeRefresh);
    return () => {
      socket.off("cash:entry-added", maybeRefresh);
      socket.off("cash:day-closed", maybeRefresh);
    };
  }, [socket, date]);

  const totals = useMemo(() => {
    const incomes = (data?.entries || [])
      .filter((e) => e.type === "INCOME")
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const expenses = (data?.entries || [])
      .filter((e) => e.type === "EXPENSE")
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    return { incomes, expenses, balance: incomes - expenses };
  }, [data]);

  const addIncome = async () => {
    setFormError(undefined);
    const amount = parseFloat(inAmt || "0");
    if (!inDesc || !amount || amount <= 0) {
      setFormError("Ingresa una descripción y un monto mayor a 0.");
      return;
    }
    try {
      await api.post("/finance/cash-entry", {
        entryDate: date,
        type: "INCOME",
        description: inDesc,
        amount,
      });
      setInDesc("");
      setInAmt("");
      reload();
    } catch (e: any) {
      setFormError(
        e?.response?.data?.message || "No se pudo registrar el ingreso"
      );
    }
  };
  const addExpense = async () => {
    setFormError(undefined);
    const amount = parseFloat(outAmt || "0");
    if (!outDesc || !amount || amount <= 0) {
      setFormError("Ingresa una descripción y un monto mayor a 0.");
      return;
    }
    try {
      await api.post("/finance/cash-entry", {
        entryDate: date,
        type: "EXPENSE",
        description: outDesc,
        amount,
      });
      setOutDesc("");
      setOutAmt("");
      reload();
    } catch (e: any) {
      setFormError(
        e?.response?.data?.message || "No se pudo registrar el egreso"
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Corte de Caja</h1>
        <label className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">Fecha</span>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {loading && <LoadingState message="Cargando corte de caja..." />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!!data?.closedBy && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded">
          Día cerrado por {data.closedBy}. No se pueden registrar nuevos
          movimientos.
        </div>
      )}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded">
          {formError}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-2">Ingresos</h3>
              <div className="text-2xl text-green-600 font-bold">
                {fmtMoney(totals.incomes)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Recaudado en el día
              </div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-2">Egresos</h3>
              <div className="text-2xl text-red-600 font-bold">
                {fmtMoney(totals.expenses)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Registrado en el día
              </div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-2">Resultado del día</h3>
              <div className="text-2xl text-emerald-700 font-bold">
                {fmtMoney(totals.balance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Fecha base: {fmtISODate(date)}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-2">Registrar ingreso</h3>
              <input
                className="border rounded px-3 py-2 mb-2 w-full"
                placeholder="Descripción"
                value={inDesc}
                onChange={(e) => setInDesc(e.target.value)}
                disabled={!!data?.closedBy}
              />
              <input
                type="number"
                className="border rounded px-3 py-2 mb-2 w-full"
                placeholder="Monto"
                value={inAmt}
                onChange={(e) => setInAmt(e.target.value)}
                disabled={!!data?.closedBy}
              />
              <button
                onClick={addIncome}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2"
                disabled={!!data?.closedBy}
              >
                Agregar ingreso
              </button>
            </div>
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-2">Registrar egreso</h3>
              <input
                className="border rounded px-3 py-2 mb-2 w-full"
                placeholder="Descripción"
                value={outDesc}
                onChange={(e) => setOutDesc(e.target.value)}
                disabled={!!data?.closedBy}
              />
              <input
                type="number"
                className="border rounded px-3 py-2 mb-2 w-full"
                placeholder="Monto"
                value={outAmt}
                onChange={(e) => setOutAmt(e.target.value)}
                disabled={!!data?.closedBy}
              />
              <button
                onClick={addExpense}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-3 py-2"
                disabled={!!data?.closedBy}
              >
                Agregar egreso
              </button>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-3">Movimientos del día</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Ingresos</h4>
                <ul className="space-y-1">
                  {data?.entries.filter((e) => e.type === "INCOME").length ===
                    0 && (
                    <li className="text-gray-500">Sin ingresos registrados.</li>
                  )}
                  {data?.entries
                    .filter((e) => e.type === "INCOME")
                    .map((e) => (
                      <li
                        key={e.id}
                        className="border-t pt-1 flex justify-between"
                      >
                        <span>
                          {e.description}{" "}
                          <span className="text-gray-500">
                            — {e.createdByName || e.createdBy || ""}
                          </span>
                        </span>
                        <span className="font-medium">
                          {fmtMoney(Number(e.amount) || 0)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Egresos</h4>
                <ul className="space-y-1">
                  {data?.entries.filter((e) => e.type === "EXPENSE").length ===
                    0 && (
                    <li className="text-gray-500">Sin egresos registrados.</li>
                  )}
                  {data?.entries
                    .filter((e) => e.type === "EXPENSE")
                    .map((e) => (
                      <li
                        key={e.id}
                        className="border-t pt-1 flex justify-between"
                      >
                        <span>
                          {e.description}{" "}
                          <span className="text-gray-500">
                            — {e.createdByName || e.createdBy || ""}
                          </span>
                        </span>
                        <span className="font-medium">
                          {fmtMoney(Number(e.amount) || 0)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
