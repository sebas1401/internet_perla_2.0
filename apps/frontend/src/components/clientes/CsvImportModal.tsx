import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    file: File
  ) => Promise<{ inserted: number; conflicts: number } | void>;
}

export default function CsvImportModal({ open, onClose, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setMissing([]);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text =
          String(reader.result || "")
            .split(/\r?\n/)
            .find((l) => l.trim().length > 0) || "";
        const headers = text
          .split(",")
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean);
        const hasAny = (alts: string[]) =>
          alts.some((h) => headers.includes(h));
        const missingList: string[] = [];
        if (!hasAny(["ip", "ipasignada", "ip_asignada"]))
          missingList.push("ip/ipAsignada/ip_asignada");
        if (!hasAny(["name", "nombre"])) missingList.push("name/nombre");
        if (!hasAny(["phone", "telefono"])) missingList.push("phone/telefono");
        if (!hasAny(["address", "direccion"]))
          missingList.push("address/direccion");
        if (!headers.includes("latitud")) missingList.push("latitud");
        if (!headers.includes("longitud")) missingList.push("longitud");
        if (!hasAny(["plan", "plandeinternet", "plan_de_internet"]))
          missingList.push("plan/planDeInternet/plan_de_internet");
        setMissing(missingList);
      } catch {
        setMissing([]);
      }
    };
    reader.readAsText(f);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!file) {
      setError("Selecciona un archivo CSV.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(file);
      onClose();
      setFile(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error al importar CSV");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="border-b p-4">
              <h3 className="text-lg font-semibold">
                Importar clientes desde CSV
              </h3>
              <p className="text-xs text-slate-500">
                Encabezados soportados: ip/ipAsignada/ip_asignada, name/nombre,
                phone/telefono, address/direccion, latitud, longitud,
                plan/planDeInternet/plan_de_internet
              </p>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="rounded bg-rose-50 p-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              {missing.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  Advertencia: faltan columnas {missing.join(", ")}. La
                  importación continuará y los campos faltantes se dejarán
                  vacíos.
                </div>
              )}
              <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-700">
                Los duplicados se detectan por combinación de nombre +
                dirección. Los conflictos se registran para revisión.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t p-4">
              <button
                className="rounded px-4 py-2 text-slate-600 hover:bg-slate-100"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Importando..." : "Importar"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
