import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import api, { getApiOrigin } from "../services/api";
import { listMyTasks, updateTask, type Task } from "../services/tasks";

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"COMPLETE" | "OBJECT" | null>(
    null
  );
  const [commentText, setCommentText] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  useAuth();

  const load = async () => {
    const data = await listMyTasks();
    setTasks(data as any);
  };
  const { socket } = useSocket();
  useEffect(() => {
    load();
  }, []);
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

  const openComplete = (id: string) => {
    setActionTaskId(id);
    setActionType("COMPLETE");
    setCommentText("");
  };
  const openObjection = (id: string) => {
    setActionTaskId(id);
    setActionType("OBJECT");
    setCommentText("");
  };
  const handleComplete = (t: Task) => openComplete(t.id);
  const handleObject = (t: Task) => openObjection(t.id);
  const submitAction = async () => {
    if (!actionTaskId || !actionType) return;
    if (!commentText.trim()) {
      toast.error("Agrega un comentario");
      return;
    }
    try {
      if (actionType === "COMPLETE") {
        await updateTask(actionTaskId, {
          status: "COMPLETADA",
          comentarioFinal: commentText.trim(),
        } as any);
        toast.success("Tarea completada");
      } else {
        await updateTask(actionTaskId, {
          status: "OBJETADA",
          motivoObjecion: commentText.trim(),
        } as any);
        toast.success("Tarea objetada");
      }
      setActionTaskId(null);
      setActionType(null);
      setCommentText("");
      setSelectedTask(null);
      await load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "No se pudo enviar el comentario"
      );
    }
  };

  const counts = useMemo(() => {
    const pendientes = tasks.filter((t) => t.status !== "COMPLETADA").length;
    const completadas = tasks.filter((t) => t.status === "COMPLETADA").length;
    const objetadas = tasks.filter((t) => t.status === "OBJETADA").length;
    return { pendientes, completadas, objetadas };
  }, [tasks]);

  // Solo mostrar en la tabla tareas activas para el trabajador
  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === "PENDIENTE" || t.status === "EN_PROCESO"
      ),
    [tasks]
  );
  // TODO: Agregar acción rápida de asistencia/check-in desde esta vista

  // Marcado automático de asistencia cuando no quedan tareas activas
  const { user } = useAuth();
  const markAttendance = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const todayKey = `attendance_${today}`;
      if (localStorage.getItem(todayKey)) return;

      const completedTasks = tasks.filter(
        (t) => t.status === "COMPLETADA"
      ).length;
      const totalTasks = tasks.length;
      if (!user?.sub) return;

      await api.post("/attendance", {
        userId: user.sub,
        date: today,
        completedTasks,
        totalTasks,
      });
      localStorage.setItem(todayKey, "done");
      toast.success("Asistencia registrada automáticamente");
    } catch (err) {
      // Silencioso para no spamear al usuario; se puede observar en consola si es necesario
      console.warn("Auto-attendance failed", err);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && visibleTasks.length === 0) {
      markAttendance();
    }
  }, [tasks, visibleTasks]);

  return (
    <div className="p-6 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-primary">Mis Tareas</h1>
        <div className="flex gap-6 text-sm">
          <div>
            Pendientes #{" "}
            <span className="font-semibold">{counts.pendientes}</span>
          </div>
          <div>
            Completas #{" "}
            <span className="font-semibold">{counts.completadas}</span>
          </div>
          <div>
            Objetadas #{" "}
            <span className="font-semibold">{counts.objetadas}</span>
          </div>
        </div>
      </motion.div>

      <div className="bg-white rounded shadow p-0 animate-fadeIn overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">NombreCompleto (Cliente)</th>
              <th className="p-3">Dirección (cliente)</th>
              <th className="p-3">Título (tareas)</th>
              <th className="p-3">Latitud y longitud (Cliente)</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t, i) => (
              <motion.tr
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="border-t"
              >
                <td className="p-3">
                  <div className="font-medium">
                    {t.customer?.nombreCompleto || "-"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    IP: {t.customer?.ipAsignada || "-"} | Tel:{" "}
                    {t.customer?.telefono || "-"}
                  </div>
                </td>
                <td className="p-3 text-slate-600">
                  {t.customer?.direccion || "-"}
                </td>
                <td className="p-3 text-slate-600">{t.title}</td>
                <td className="p-3">
                  <div
                    className="truncate text-slate-600 text-sm"
                    title={
                      t.customer?.latitud && t.customer?.longitud
                        ? `${t.customer.latitud}, ${t.customer.longitud}`
                        : undefined
                    }
                  >
                    {t.customer?.latitud && t.customer?.longitud
                      ? `${t.customer.latitud}, ${t.customer.longitud}`
                      : "-"}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setSelectedTask(t)}
                    >
                      Ver más detalles...
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {visibleTasks.length === 0 && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={5}>
                  Sin tareas activas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setSelectedTask(null)}
          />
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">Detalles de la tarea</h2>
              <button
                className="text-sm text-slate-500 hover:underline"
                onClick={() => setSelectedTask(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <div className="text-xs text-slate-500">
                    Nombre completo (cliente)
                  </div>
                  <div className="font-medium">
                    {selectedTask.customer?.nombreCompleto || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    IP asignada (cliente)
                  </div>
                  <div className="font-medium">
                    {selectedTask.customer?.ipAsignada || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Teléfono (cliente)
                  </div>
                  <div className="font-medium">
                    {selectedTask.customer?.telefono || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Dirección (cliente)
                  </div>
                  <div className="font-medium">
                    {selectedTask.customer?.direccion || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Latitud y longitud (cliente)
                  </div>
                  <div className="font-medium">
                    {selectedTask.customer?.latitud &&
                    selectedTask.customer?.longitud
                      ? `${selectedTask.customer.latitud}, ${selectedTask.customer.longitud}`
                      : "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <div className="text-xs text-slate-500">Título (tarea)</div>
                  <div className="font-medium">{selectedTask.title}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Descripción (tarea)
                  </div>
                  <div className="font-medium whitespace-pre-wrap">
                    {selectedTask.description || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Estado</div>
                  <div className="font-medium">{selectedTask.status}</div>
                </div>
                {selectedTask.comentarioFinal && (
                  <div>
                    <div className="text-xs text-slate-500">
                      Comentario final
                    </div>
                    <div className="font-medium whitespace-pre-wrap">
                      {selectedTask.comentarioFinal}
                    </div>
                  </div>
                )}
                {selectedTask.motivoObjecion && (
                  <div>
                    <div className="text-xs text-slate-500">
                      Motivo de objeción
                    </div>
                    <div className="font-medium whitespace-pre-wrap">
                      {selectedTask.motivoObjecion}
                    </div>
                  </div>
                )}
                {(selectedTask as any).proofUrl && (
                  <div>
                    <div className="text-xs text-slate-500">Evidencia</div>
                    <a
                      className="text-primary underline"
                      href={`${getApiOrigin()}${
                        (selectedTask as any).proofUrl
                      }`}
                      target="_blank"
                    >
                      Ver evidencia
                    </a>
                  </div>
                )}
              </div>
            </div>
            {selectedTask.status !== "COMPLETADA" &&
              selectedTask.status !== "OBJETADA" && (
                <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                  <button
                    onClick={() => handleComplete(selectedTask)}
                    className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                  >
                    Marcar completada
                  </button>
                  <button
                    onClick={() => handleObject(selectedTask)}
                    className="px-3 py-2 rounded bg-rose-600 text-white text-sm hover:bg-rose-700"
                  >
                    Objetar tarea
                  </button>
                </div>
              )}
          </motion.div>
        </div>
      )}

      {actionTaskId && actionType && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setActionTaskId(null);
              setActionType(null);
              setCommentText("");
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl p-4"
          >
            <h3 className="text-lg font-semibold mb-2">Agrega un comentario</h3>
            <p className="text-xs text-slate-600 mb-2">
              Describe cómo se completó o por qué no pudo hacerse.
            </p>
            <textarea
              className="w-full border rounded px-2 py-1"
              rows={4}
              placeholder="Describe cómo se completó o por qué no pudo hacerse"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded border"
                onClick={() => {
                  setActionTaskId(null);
                  setActionType(null);
                  setCommentText("");
                }}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1 rounded bg-primary text-white"
                onClick={submitAction}
              >
                Enviar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
