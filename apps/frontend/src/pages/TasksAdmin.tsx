import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";
import { getCustomers } from "../services/customers";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type Task,
  type TaskStatus,
} from "../services/tasks";

type User = {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "USER";
};
type Customer = {
  id: string;
  nombreCompleto: string;
  direccion?: string;
  telefono?: string;
};

const statusColors: Record<TaskStatus, string> = {
  PENDIENTE: "bg-gray-200 text-gray-700",
  EN_PROCESO: "bg-amber-100 text-amber-700",
  COMPLETADA: "bg-emerald-100 text-emerald-700",
  OBJETADA: "bg-rose-100 text-rose-700",
};

export default function TasksAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reassignFor, setReassignFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    Customer | undefined
  >();
  const [form, setForm] = useState({
    assignedToId: "",
    title: "",
    description: "",
  });
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const { socket } = useSocket();

  const load = async () => {
    const [u, t] = await Promise.all([
      api.get("/users"),
      listTasks(filterStatus ? { status: filterStatus } : undefined),
    ]);
    setUsers(u.data.value || u.data);
    setTasks(t as Task[]);
  };
  // Load customers when drawer opens to ensure token is present and reduce load
  useEffect(() => {
    if (!open) return;
    getCustomers()
      .then((data) => setCustomers(data as Customer[]))
      .catch(() => setCustomers([]));
  }, [open]);

  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("task:created", refresh);
    socket.on("task:updated", refresh);
    socket.on("tasks:update", refresh);
    return () => {
      socket.off("task:created", refresh);
      socket.off("task:updated", refresh);
      socket.off("tasks:update", refresh);
    };
  }, [socket]);

  const workerUsers = useMemo(
    () => users.filter((u) => u.role === "USER"),
    [users]
  );
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers.slice(0, 50);
    return customers
      .filter(
        (c) =>
          (c.nombreCompleto || "").toLowerCase().includes(term) ||
          (c.direccion || "").toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [customers, search]);

  const onCreate = async () => {
    if (!selectedCustomer) return toast.error("Selecciona un cliente");
    if (!form.assignedToId) return toast.error("Selecciona un trabajador");
    if (!form.title.trim()) return toast.error("Titulo requerido");
    if (!telefonoContacto.trim())
      return toast.error("El teléfono de contacto es obligatorio");
    await createTask({
      title: form.title,
      description: form.description || undefined,
      customerId: selectedCustomer.id,
      assignedToId: form.assignedToId,
      telefonoContacto: telefonoContacto.trim(),
    });
    toast.success("Tarea creada");
    setOpen(false);
    setSearch("");
    setSelectedCustomer(undefined);
    setForm({ assignedToId: "", title: "", description: "" });
    setTelefonoContacto("");
    await load();
  };

  const onChangeStatus = async (id: string, next: TaskStatus) => {
    const prev = tasks.slice();
    setTasks((curr) =>
      curr.map((t) => (t.id === id ? { ...t, status: next } : t))
    );
    try {
      await updateTask(id, { status: next });
    } catch {
      setTasks(prev);
    }
  };
  const onEdit = (t: Task) => {
    setEditingTaskId(t.id);
    setSelectedCustomer((t as any).customer);
    setForm({
      assignedToId: (t.assignedTo as any)?.id || "",
      title: t.title,
      description: t.description || "",
    });
    setTelefonoContacto(((t as any).telefonoContacto as string) || "");
    setOpen(true);
  };

  const onUpdate = async () => {
    if (!editingTaskId) return;
    try {
      await updateTask(editingTaskId, {
        description: form.description || undefined,
        assignedToId: form.assignedToId || undefined,
        telefonoContacto: telefonoContacto.trim() || undefined,
      } as any);
      toast.success("Tarea actualizada");
      setOpen(false);
      setEditingTaskId(null);
      setSelectedCustomer(undefined);
      setForm({ assignedToId: "", title: "", description: "" });
      setTelefonoContacto("");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo actualizar");
    }
  };
  const onReassign = async (id: string, newUserId: string) => {
    const prev = tasks.slice();
    const user = users.find((u) => u.id === newUserId);
    setTasks((curr) =>
      curr.map((t) =>
        t.id === id
          ? {
              ...t,
              assignedTo: user
                ? ({ id: user.id, name: user.name, email: user.email } as any)
                : (t as any).assignedTo,
              status: "PENDIENTE" as TaskStatus,
              motivoObjecion: undefined,
            }
          : t
      )
    );
    try {
      await updateTask(id, {
        assignedToId: newUserId,
        status: "PENDIENTE" as TaskStatus,
      } as any);
      toast.success("Tarea reasignada y reiniciada a PENDIENTE");
    } catch (e: any) {
      setTasks(prev);
      toast.error(
        e?.response?.data?.message || "No se pudo reasignar la tarea"
      );
    } finally {
      setReassignFor(null);
    }
  };
  const onDelete = async (id: string) => {
    const prev = tasks.slice();
    setTasks((curr) => curr.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
      toast.success("Tarea eliminada");
    } catch {
      setTasks(prev);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-2xl font-bold text-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Tareas (Admin)
        </motion.h1>
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1"
            value={filterStatus}
            onChange={(e) => setFilterStatus((e.target.value || "") as any)}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="COMPLETADA">Completada</option>
            <option value="OBJETADA">Objetada</option>
          </select>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary text-white rounded px-3 py-1"
          >
            ➕ Agregar tarea
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-0 animate-fadeIn overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">Cliente</th>
              <th className="p-3">Dirección</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Asignado a</th>
              <th className="p-3">Teléfono contacto</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Comentario</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <motion.tr
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`border-t ${
                  t.status === "COMPLETADA"
                    ? "bg-green-50 border-green-200 opacity-75"
                    : t.status === "OBJETADA"
                    ? "bg-red-50 border-red-200"
                    : ""
                }`}
              >
                <td className="p-3">
                  <div className="font-medium flex items-center gap-2">
                    {(t.customer as any)?.nombreCompleto || "-"}
                    {t.status === "OBJETADA" && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-semibold">
                        OBJETADA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{t.title}</div>
                </td>
                <td className="p-3 text-slate-600">
                  {(t.customer as any)?.direccion || "-"}
                </td>
                <td className="p-3 text-slate-600">
                  {(t.customer as any)?.telefono || "-"}
                </td>
                <td className="p-3 relative">
                  <div className="flex items-center gap-2">
                    <span>{t.assignedTo?.name || t.assignedTo?.email}</span>
                    <button
                      className="text-xs text-primary underline"
                      onClick={() =>
                        setReassignFor(reassignFor === t.id ? null : t.id)
                      }
                    >
                      Reasignar
                    </button>
                  </div>
                  {reassignFor === t.id && (
                    <div className="absolute z-10 mt-2 w-56 bg-white border rounded shadow p-2">
                      <div className="text-[11px] text-slate-500 mb-1">
                        Selecciona trabajador
                      </div>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        defaultValue=""
                        onChange={(e) =>
                          e.target.value && onReassign(t.id, e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Elegir…
                        </option>
                        {workerUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
                <td className="p-3 text-slate-600 min-w-[9rem]">
                  {(t as any).telefonoContacto || "-"}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      statusColors[t.status]
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                  <div className="mt-1">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={t.status}
                      disabled={
                        t.status === "COMPLETADA" || t.status === "OBJETADA"
                      }
                      onChange={(e) =>
                        onChangeStatus(t.id, e.target.value as TaskStatus)
                      }
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_PROCESO">En proceso</option>
                      <option value="COMPLETADA">Completada</option>
                    </select>
                  </div>
                </td>
                <td
                  className="p-3 text-xs text-slate-600 max-w-xs truncate"
                  title={
                    (t.status === "COMPLETADA"
                      ? t.comentarioFinal
                      : t.motivoObjecion) || ""
                  }
                >
                  {t.status === "COMPLETADA"
                    ? t.comentarioFinal
                      ? t.comentarioFinal.length > 80
                        ? t.comentarioFinal.slice(0, 80) + "…"
                        : t.comentarioFinal
                      : "-"
                    : t.motivoObjecion
                    ? t.motivoObjecion.length > 80
                      ? t.motivoObjecion.slice(0, 80) + "…"
                      : t.motivoObjecion
                    : "-"}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-primary hover:underline text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-rose-600 hover:underline text-xs"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={7}>
                  Sin tareas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingTaskId ? "Editar tarea" : "Agregar tarea"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Buscar cliente</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Nombre o dirección"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto mt-2 border rounded">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      className={`block w-full text-left px-2 py-1 text-sm hover:bg-slate-50 ${
                        selectedCustomer?.id === c.id ? "bg-emerald-50" : ""
                      }`}
                      onClick={() => !editingTaskId && setSelectedCustomer(c)}
                      disabled={!!editingTaskId}
                    >
                      {c.nombreCompleto}{" "}
                      <span className="text-xs text-slate-500">
                        — {c.direccion || "-"}
                      </span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="p-2 text-xs text-slate-500">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
              {selectedCustomer && (
                <div className="rounded border p-2 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold">Dirección:</span>{" "}
                    {selectedCustomer.direccion || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Teléfono:</span>{" "}
                    {selectedCustomer.telefono || "-"}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500">
                  Asignar trabajador
                </label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={form.assignedToId}
                  onChange={(e) =>
                    setForm({ ...form, assignedToId: e.target.value })
                  }
                >
                  <option value="">Selecciona trabajador</option>
                  {workerUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-xs text-slate-500"
                  htmlFor="telefonoContacto"
                >
                  Teléfono de contacto *
                </label>
                <input
                  id="telefonoContacto"
                  className="w-full border rounded px-2 py-1"
                  placeholder="Ej. 5523456789"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Es el número desde el que llamó el cliente. No edita el
                  teléfono maestro del cliente.
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Título</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Ej. Revisar instalación"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={!!editingTaskId}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Descripción (opcional)
                </label>
                <textarea
                  className="w-full border rounded px-2 py-1"
                  rows={3}
                  placeholder="Detalles adicionales"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-3 py-1 rounded border"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingTaskId ? onUpdate : onCreate}
                  className="px-3 py-1 rounded bg-primary text-white"
                >
                  {editingTaskId ? "Guardar" : "Agregar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
