import { useMemo } from "react";
import type { CustomerDto } from "../../services/clientes";

interface Props {
  rows: CustomerDto[];
  onEdit: (c: CustomerDto) => void;
  onDelete: (c: CustomerDto) => void;
  query: string;
  onQueryChange: (v: string) => void;
}

export default function ClientesTable({
  rows,
  onEdit,
  onDelete,
  query,
  onQueryChange,
}: Props) {
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as CustomerDto[];
    const filtered = rows.filter(
      (r) =>
        (r.nombreCompleto || "").toLowerCase().includes(q) ||
        (r.direccion || "").toLowerCase().includes(q)
    );
    return filtered.slice(0, 3);
  }, [rows, query]);

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-80"
          placeholder="Buscar por nombre o dirección..."
        />
        {query && suggestions.length > 0 && (
          <div className="text-xs text-slate-500">
            Sugerencias: {suggestions.map((s) => s.nombreCompleto).join(", ")}
          </div>
        )}
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Dirección IP</th>
            <th className="px-3 py-2 text-left">Nombre</th>
            <th className="px-3 py-2 text-left">Teléfono</th>
            <th className="px-3 py-2 text-left">Dirección</th>
            <th className="px-3 py-2 text-left">Latitud</th>
            <th className="px-3 py-2 text-left">Longitud</th>
            <th className="px-3 py-2 text-left">Plan</th>
            <th className="px-3 py-2 text-left">Estado</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-3 py-2">{c.ipAsignada || "-"}</td>
              <td className="px-3 py-2">{c.nombreCompleto}</td>
              <td className="px-3 py-2">{c.telefono || "-"}</td>
              <td className="px-3 py-2">{c.direccion || "-"}</td>
              <td className="px-3 py-2">{c.latitud || "-"}</td>
              <td className="px-3 py-2">{c.longitud || "-"}</td>
              <td className="px-3 py-2">{c.plan?.name || "-"}</td>
              <td className="px-3 py-2">{c.estadoCliente || "-"}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => onEdit(c)}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    className="px-3 py-1 rounded bg-rose-600 text-white text-xs hover:bg-rose-700"
                  >
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
