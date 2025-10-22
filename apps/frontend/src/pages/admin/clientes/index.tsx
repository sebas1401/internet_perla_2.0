import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ClienteFormDrawer from "../../../components/clientes/ClienteFormDrawer";
import ClientesTable from "../../../components/clientes/ClientesTable";
import CsvImportModal from "../../../components/clientes/CsvImportModal";
import {
  createCustomer,
  type CustomerDto,
  importCustomersCsv,
  type InternetPlan,
  listConflicts,
  listCustomers,
  listPlans,
  removeCustomer,
  updateCustomer,
} from "../../../services/clientes";

export default function ClientesAdminPage() {
  const [rows, setRows] = useState<CustomerDto[]>([]);
  const [plans, setPlans] = useState<InternetPlan[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [query, setQuery] = useState("");

  const total = rows.length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.nombreCompleto || "").toLowerCase().includes(q) ||
        (r.direccion || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p, cf] = await Promise.all([
        listCustomers(),
        listPlans().catch(() => []),
        listConflicts().catch(() => []),
      ]);
      setRows(c);
      setPlans(p || []);
      setConflicts(cf || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateOrUpdate = async (input: any, editingId?: string) => {
    if (editingId) {
      await updateCustomer(editingId, input);
      toast.success("Cliente actualizado correctamente");
    } else {
      await createCustomer(input);
      toast.success("Cliente creado correctamente");
    }
    await load();
  };

  const onDelete = async (c: CustomerDto) => {
    if (!confirm(`¿Borrar cliente "${c.nombreCompleto}"?`)) return;
    await removeCustomer(c.id);
    toast.success("Cliente eliminado");
    await load();
  };

  const onImport = async (file: File) => {
    const res = await importCustomersCsv(file);
    toast.success(
      `Importación completada: ${res?.inserted ?? 0} insertados, ${
        res?.conflicts ?? 0
      } conflictos`
    );
    await load();
    return res;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800">
            Clientes{" "}
            <span className="ml-1 text-sm rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
              {total}
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            Administra tus clientes, importa desde CSV y revisa conflictos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded bg-white px-3 py-2 text-sm shadow hover:bg-slate-50"
            onClick={() => setOpenImport(true)}
          >
            Importar CSV
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-2 text-sm text-white shadow hover:bg-emerald-700"
            onClick={() => {
              setEditing(null);
              setOpenDrawer(true);
            }}
          >
            + Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-rose-100 bg-rose-50 p-3 text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded border border-slate-100 bg-white p-4 text-sm text-slate-500">
          Cargando clientes...
        </div>
      ) : (
        <ClientesTable
          rows={filtered}
          onEdit={(c) => {
            setEditing(c);
            setOpenDrawer(true);
          }}
          onDelete={onDelete}
          query={query}
          onQueryChange={setQuery}
        />
      )}

      <div className="rounded border border-slate-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conflictos recientes</h2>
          <button
            className="text-xs text-emerald-700 hover:underline"
            onClick={async () =>
              setConflicts(await listConflicts().catch(() => []))
            }
          >
            Actualizar
          </button>
        </div>
        {conflicts.length === 0 ? (
          <div className="text-sm text-slate-500">
            Sin conflictos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Dirección</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Plan</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">{c.address || "-"}</td>
                    <td className="px-3 py-2">{c.reason || "-"}</td>
                    <td className="px-3 py-2">{c.planName || "-"}</td>
                    <td className="px-3 py-2">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClienteFormDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        onSubmit={onCreateOrUpdate}
        plans={plans}
        editing={editing || null}
      />
      <CsvImportModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onSubmit={onImport}
      />
    </div>
  );
}
