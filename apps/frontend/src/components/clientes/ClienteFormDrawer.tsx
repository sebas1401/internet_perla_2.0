import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type {
  CreateCustomerInput,
  CustomerDto,
  InternetPlan,
} from "../../services/clientes";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput, editingId?: string) => Promise<void>;
  plans: InternetPlan[];
  editing?: CustomerDto | null;
}

export default function ClienteFormDrawer({
  open,
  onClose,
  onSubmit,
  plans,
  editing,
}: Props) {
  const [name, setName] = useState("");
  const [ipAsignada, setIpAsignada] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("active");
  const [planId, setPlanId] = useState<string>("");
  const [planName, setPlanName] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.nombreCompleto || "");
      setIpAsignada(editing.ipAsignada || "");
      setAddress(editing.direccion || "");
      setStatus(editing.estadoCliente || "active");
      setPlanId(editing.plan?.id || "");
      setPlanName(editing.plan?.name || editing.planDeInternet || "");
      setPhone(editing.telefono || "");
      setLatitud(editing.latitud || "");
      setLongitud(editing.longitud || "");
      setNotes(editing.notas || "");
    } else {
      setName("");
      setIpAsignada("");
      setAddress("");
      setStatus("active");
      setPlanId("");
      setPlanName("");
      setPhone("");
      setLatitud("");
      setLongitud("");
      setNotes("");
    }
    setErrors(null);
  }, [editing, open]);

  const handleSubmit = async () => {
    setErrors(null);
    if (!name.trim()) return setErrors("El nombre completo es requerido.");
    if (!address.trim()) return setErrors("La dirección es requerida.");
    if (!status.trim()) return setErrors("El estado del cliente es requerido.");
    if (!planId && !planName.trim())
      return setErrors(
        "El plan de internet es requerido (elige uno o escribe un nombre)."
      );
    if (latitud && !/^[-+]?\d+(\.\d{1,6})?$/.test(latitud))
      return setErrors(
        "Latitud debe ser un número decimal con hasta 6 decimales."
      );
    if (longitud && !/^[-+]?\d+(\.\d{1,6})?$/.test(longitud))
      return setErrors(
        "Longitud debe ser un número decimal con hasta 6 decimales."
      );

    const payload: CreateCustomerInput = {
      nombreCompleto: name.trim(),
      ipAsignada: ipAsignada.trim() || undefined,
      direccion: address.trim(),
      estadoCliente: status.trim(),
      telefono: phone.trim() || undefined,
      latitud: latitud.trim() || undefined,
      longitud: longitud.trim() || undefined,
      notas: notes.trim() || undefined,
    };
    if (planId) payload.planId = planId;
    else payload.planDeInternet = planName.trim();

    setSubmitting(true);
    try {
      await onSubmit(payload, editing?.id);
      onClose();
    } catch (e: any) {
      setErrors(e?.response?.data?.message || "Error al guardar el cliente");
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
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                {editing ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>
            <div className="p-4 space-y-3">
              {errors && (
                <div className="rounded bg-rose-50 p-2 text-sm text-rose-700">
                  {errors}
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500">Dirección IP</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={ipAsignada}
                  onChange={(e) => setIpAsignada(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Nombre completo
                </label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Teléfono</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Dirección</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Estado del cliente
                </label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Plan de internet
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select
                    className="rounded border px-3 py-2"
                    value={planId}
                    onChange={(e) => {
                      setPlanId(e.target.value);
                      if (e.target.value) setPlanName("");
                    }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="o escribir nombre de plan"
                    value={planName}
                    onChange={(e) => {
                      setPlanName(e.target.value);
                      if (e.target.value) setPlanId("");
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Elige un plan existente o escribe un nombre para crear uno
                  nuevo automáticamente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Latitud</label>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="0.000000"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Longitud</label>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="0.000000"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Notas</label>
                <textarea
                  className="mt-1 w-full rounded border px-3 py-2"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
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
                {submitting
                  ? "Guardando..."
                  : editing
                  ? "Guardar cambios"
                  : "Crear cliente"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
