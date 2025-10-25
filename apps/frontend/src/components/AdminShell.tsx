﻿import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Boxes,
  ClipboardList,
  Clock,
  DollarSign,
  Home,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Settings,
  Users,
  Users2,
  X,
} from "lucide-react";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";
import { listContacts, type Contact } from "../services/messages";

type AdminNotificationType = "inventory" | "tasks" | "messages";

interface NotificationItem {
  id: AdminNotificationType;
  title: string;
  description: string;
  createdAt: string;
  count: number;
  route: string;
  signature?: string;
}

interface SeenRecord {
  time: number;
  signature?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status:
    | "PENDIENTE"
    | "EN_PROCESO"
    | "COMPLETADA"
    | "OBJETADA"
    | "PENDING"
    | "COMPLETED";
  createdAt?: string;
  updatedAt?: string;
}

const getTimestamp = (value?: string) =>
  value ? new Date(value).getTime() : 0;

const navItems = [

  { to: "/", label: "Dashboard", icon: Home },
  { to: "/attendance", label: "Asistencia", icon: Clock },
  { to: "/finance", label: "Finanzas", icon: DollarSign },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/tasks-admin", label: "Tareas", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/workers", label: "Trabajadores", icon: Users2 },
  { to: "/mapa-de-ubicacion", label: "Mapa de Ubicacion", icon: Map },
  { to: "/messages", label: "Mensajes", icon: MessageSquare },
];


export function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const storageBase = useMemo(
    () => (user ? `ip_admin_seen_${user.sub}` : ""),
    [user?.sub]
  );

  const readSeen = useCallback(
    (type: AdminNotificationType): SeenRecord => {
      if (!storageBase || typeof window === "undefined") return { time: 0 };
      try {
        const raw = window.localStorage.getItem(`${storageBase}_${type}`);
        if (!raw) return { time: 0 };
        const parsed = JSON.parse(raw) as SeenRecord;
        return { time: parsed.time || 0, signature: parsed.signature };
      } catch {
        return { time: 0 };
      }
    },
    [storageBase]
  );

  const writeSeen = useCallback(
    (type: AdminNotificationType, record: SeenRecord) => {
      if (!storageBase || typeof window === "undefined") return;
      const key = `${storageBase}_${type}`;
      const previous = readSeen(type);
      const next: SeenRecord = {
        time: Math.max(record.time || 0, previous.time || 0),
        signature:
          record.signature !== undefined
            ? record.signature
            : previous.signature,
      };
      window.localStorage.setItem(key, JSON.stringify(next));
    },
    [storageBase, readSeen]
  );

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setItems([]);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [stocksRes, itemsRes, tasksRes, contactsRes] = await Promise.all([
        api.get("/inventory/stocks"),
        api.get("/inventory/items"),
        api.get<Task[]>("/tasks/mine"),
        listContacts(),
      ]);

      const stocks = stocksRes.data || [];
      const inventoryItems = itemsRes.data || [];
      const totals: Record<string, number> = {};

      for (const stock of stocks as any[]) {
        const itemId = stock.item?.id || stock.itemId;
        if (!itemId) continue;
        totals[itemId] = (totals[itemId] || 0) + (stock.quantity || 0);
      }

      const lowStockItems = (inventoryItems as any[]).filter((item) => {
        const quantity = totals[item.id] || 0;
        return typeof item.minStock === "number" && quantity <= item.minStock;
      });

      let latestInventoryTs = 0;
      const inventorySignature = lowStockItems
        .map((item) => {
          const quantity = totals[item.id] || 0;
          const timestamp = getTimestamp(item.updatedAt || item.createdAt);
          if (timestamp > latestInventoryTs) latestInventoryTs = timestamp;
          return `${item.id}:${quantity}`;
        })
        .sort()
        .join("|");

      if (latestInventoryTs === 0 && lowStockItems.length > 0) {
        latestInventoryTs = Date.now();
      }

      if (lowStockItems.length === 0) {
        const seenInventory = readSeen("inventory");
        if (seenInventory.signature) {
          writeSeen("inventory", {
            time: seenInventory.time || Date.now(),
            signature: "",
          });
        }
      }

      const notifications: NotificationItem[] = [];

      if (lowStockItems.length > 0) {
        const seenInventory = readSeen("inventory");
        if (inventorySignature !== seenInventory.signature) {
          notifications.push({
            id: "inventory",
            title: `Inventario con stock bajo (${lowStockItems.length})`,
            description:
              "Revisa el modulo de inventario para reabastecer productos criticos.",
            createdAt: new Date(latestInventoryTs).toISOString(),
            count: lowStockItems.length,
            route: "/inventory",
            signature: inventorySignature,
          });
        }
      }

      const tasks = (tasksRes.data || []) as Task[];
      const pendingTasks = tasks.filter(
        (task) => task.status === "PENDING" || task.status === "PENDIENTE"
      );
      const latestTaskTs = pendingTasks.reduce((max, task) => {
        const timestamp = getTimestamp(task.updatedAt || task.createdAt);
        return timestamp > max ? timestamp : max;
      }, 0);

      if (pendingTasks.length > 0 && latestTaskTs > 0) {
        const seenTasks = readSeen("tasks");
        if (latestTaskTs > seenTasks.time) {
          notifications.push({
            id: "tasks",
            title: `Tienes ${pendingTasks.length} tarea${
              pendingTasks.length === 1 ? "" : "s"
            } pendiente${pendingTasks.length === 1 ? "" : "s"}`,
            description: "Revisa el modulo de tareas para administrarlas.",
            createdAt: new Date(latestTaskTs).toISOString(),
            count: pendingTasks.length,
            route: "/tasks-admin",
          });
        }
      }

      const contacts = contactsRes as Contact[];
      const seenMessages = readSeen("messages");
      let latestMessageTs = 0;

      const conversationsWithNew = contacts.filter((contact) => {
        if (!contact.lastAt) return false;
        const timestamp = new Date(contact.lastAt).getTime();
        if (timestamp > seenMessages.time) {
          if (timestamp > latestMessageTs) latestMessageTs = timestamp;
          return true;
        }
        return false;
      });

      if (conversationsWithNew.length > 0 && latestMessageTs > 0) {
        notifications.push({
          id: "messages",
          title: `Tienes mensajes pendientes (${conversationsWithNew.length})`,
          description:
            "Visita la bandeja de mensajes para responder a tu equipo.",
          createdAt: new Date(latestMessageTs).toISOString(),
          count: conversationsWithNew.length,
          route: "/messages",
        });
      }

      setPendingCount(notifications.length);
      if (openRef.current) {
        setItems(notifications);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError("No se pudieron cargar las notificaciones.");
      setItems([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [listContacts, readSeen, user, writeSeen]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadNotifications();
    socket.on("task:created", refresh);
    socket.on("task:updated", refresh);
    socket.on("message:created", refresh);
    return () => {
      socket.off("task:created", refresh);
      socket.off("task:updated", refresh);
      socket.off("message:created", refresh);
    };
  }, [socket, loadNotifications]);

  const togglePopover = () => {
    const next = !openRef.current;
    openRef.current = next;
    setOpen(next);
    if (next) {
      loadNotifications();
    } else {
      setItems([]);
    }
  };

  const handleAccess = (item: NotificationItem) => {
    const time = getTimestamp(item.createdAt) || Date.now();
    writeSeen(item.id, { time, signature: item.signature });
    setPendingCount((current) => Math.max(0, current - 1));
    openRef.current = false;
    setOpen(false);
    setItems([]);
  };

  if (!user) return null;

  return (
    <div className="relative z-[9999]">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={togglePopover}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <Bell size={18} />
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {pendingCount}
          </span>
        )}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-1/2 z-[99999] mt-4 w-80 -translate-x-1/2 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-emerald-700">
                Panel de notificaciones
              </span>
              <button
                type="button"
                onClick={loadNotifications}
                className="text-xs text-emerald-600 transition hover:text-emerald-700"
              >
                Actualizar
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-4">
              {loading && (
                <div className="py-6 text-xs text-slate-400">
                  Cargando avisos...
                </div>
              )}
              {!loading && error && (
                <div className="py-6 text-xs text-rose-500">{error}</div>
              )}
              {!loading && !error && pendingCount === 0 && (
                <div className="py-6 text-xs text-slate-400">
                  Todo en orden, sin novedades recientes.
                </div>
              )}
              {!loading && !error && items.length > 0 && (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.route}
                        onClick={() => handleAccess(item)}
                        className="block rounded-2xl border border-slate-100 px-4 py-3 shadow-sm transition hover:scale-[1.01] hover:bg-emerald-50/70"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.title}
                          </p>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {item.count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.description}
                        </p>
                        <div className="mt-2 text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-emerald-700">
              <Link
                to="/tasks-admin"
                className="transition hover:text-emerald-900"
              >
                Gestion de tareas
              </Link>
              <Link
                to="/messages"
                className="transition hover:text-emerald-900"
              >
                Mensajes
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavLinkClick = () => {
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const linkCls = ({ isActive }: any) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2 transition ${
      isActive
        ? "bg-white/10 text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const sidebarContent = (
    <>
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 font-semibold shadow-lg">
            IP
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-wide">InternetPerla</p>
            <p className="text-xs text-white/60">Control centralizado</p>
          </div>
        </div>
        <div className="md:hidden">
          <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="hidden md:block">
          <NotificationBell />
        </div>
      </div>
      <nav className="relative z-10 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkCls} end={to === "/"} onClick={handleNavLinkClick}>
            <motion.span
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 transition group-hover:bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={18} />
            </motion.span>
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="relative z-10 mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          onClick={() => {
            handleNavLinkClick();
            nav("/admin-settings");
          }}
        >
          <span className="rounded-lg bg-white/10 p-2">
            <Settings size={16} />
          </span>
          <span className="font-medium">Configuracion</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-red-300 transition hover:bg-red-500/20 hover:text-white"
          onClick={logout}
        >
          <span className="rounded-lg bg-red-500/10 p-2">
            <LogOut size={16} />
          </span>
          <span className="font-medium">Salir</span>
        </motion.button>
        <div className="text-xs text-white/60">{user?.email}</div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col gap-4 overflow-y-auto bg-[#0a2a06] p-6 text-white md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar for desktop */}
      <aside className="relative hidden h-full w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto bg-[#0a2a06] p-6 text-white md:flex">
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.8 }}
          style={{
            background:
              "radial-gradient(circle at top, rgba(46,204,113,0.25), transparent 60%), radial-gradient(circle at bottom right, rgba(46,204,113,0.2), transparent 55%)",
          }}
        />
        {sidebarContent}
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm md:hidden">
          <span className="font-semibold">Internet Perla</span>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600 hover:text-black">
              <Menu size={24} />
            </button>
          </div>
        </header>
        <motion.main
          className="flex-1 p-4 lg:p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
