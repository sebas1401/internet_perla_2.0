import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getThread, listContacts, sendMessage, Message as Msg } from '../services/messages';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

// Bubble individual de mensaje
function Message({ message }: { message: Msg }) {
  const { user } = useAuth();
  const isMine = message.sender.id === user?.sub;
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow ${
          isMine
            ? 'bg-emerald-600 text-emerald-50'
            : 'bg-white border border-slate-200 text-slate-800'
        }`}
      >
        {message.content && (
          <div className="whitespace-pre-wrap break-words text-[13px] leading-snug">{message.content}</div>
        )}
        <div className={`mt-2 text-[10px] text-right ${isMine ? 'text-emerald-100' : 'text-slate-400'}`}>{time}</div>
      </div>
    </div>
  );
}

// Página principal de mensajes
export default function MessagesPage() {
  const { user } = useAuth();
  const isWorker = user?.role === 'USER';
  const [contacts, setContacts] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const { socket } = useSocket();
  const scroller = useRef<HTMLDivElement>(null);

  // Cargar contactos al iniciar
  useEffect(() => {
    (async () => {
      const cs = await listContacts();
      setContacts(cs);
      if (cs[0]) setSelected(cs[0].id);
    })();
  }, []);

  // Función scroll hacia abajo
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto') => {
    setTimeout(() => {
      if (scroller.current) {
        scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior });
      }
    }, 50);
  };

  // Cargar mensajes al seleccionar contacto
  useEffect(() => {
    if (!selected) return;
    (async () => {
      const th = await getThread(selected);
      setMessages(th);
      scrollToBottom('auto');
    })();
  }, [selected]);

  // Escuchar mensajes nuevos del socket
useEffect(() => {
  if (!socket) return;

  const onMsg = (m: Msg) => {
    if (m.sender.id === selected || m.recipient.id === selected) {
      setMessages(prev => (prev.some(existing => existing.id === m.id) ? prev : [...prev, m]));
      scrollToBottom('smooth');
    }
    listContacts().then(setContacts).catch(() => {});
  };

  socket.on('message:created', onMsg);

  // ✅ devuelve una función de limpieza, no el socket
  return () => {
    socket.off('message:created', onMsg);
  };
}, [socket, selected]);


  // Enviar mensaje
  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!selected || !value) return;
  const m = await sendMessage(selected, value);
  setMessages(prev => (prev.some(existing => existing.id === m.id) ? prev : [...prev, m]));
    setText('');
    scrollToBottom('smooth');
  }

  // Contacto seleccionado (título)
  const title = useMemo(() => {
    const c = contacts.find((c) => c.id === selected);
    return c ? c.name || c.email : 'Conversación';
  }, [contacts, selected]);

  // Etiquetas de día (Hoy, Ayer, etc.)
  function formatDayLabel(d: Date) {
    const today = new Date();
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((a.getTime() - b.getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    return b.toLocaleDateString();
  }

  const itemsWithSeparators = useMemo(() => {
    const out: Array<{ type: 'sep' | 'msg'; key: string; m?: Msg; label?: string }> = [];
    let last = '';
    for (const m of messages) {
      const label = formatDayLabel(new Date(m.createdAt));
      if (label !== last) {
        out.push({ type: 'sep', key: `sep-${m.id}`, label });
        last = label;
      }
      out.push({ type: 'msg', key: m.id, m });
    }
    return out;
  }, [messages]);

  // Render
  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200">
      {isWorker && (
        <div className="mb-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full bg-white/70 border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition"
          >
            <span>↩</span>
            <span>Regresar al dashboard</span>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Lista de contactos */}
        <aside className="col-span-12 md:col-span-4 flex flex-col h-full overflow-hidden rounded-3xl bg-white/90 shadow-lg border border-white/60 backdrop-blur">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">Contactos</div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
            {contacts.map((c) => (
              <button
                key={c.id}
                className={`w-full text-left px-4 py-3 transition ${
                  selected === c.id
                    ? 'bg-emerald-50/80 text-emerald-800 font-semibold shadow-inner'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelected(c.id)}
              >
                <div className="font-medium">{c.name || c.email}</div>
                <div className="text-xs text-gray-500 truncate">{c.email}</div>
              </button>
            ))}
            {contacts.length === 0 && (
              <div className="p-4 text-sm text-gray-500">Sin contactos aún.</div>
            )}
          </div>
        </aside>

        {/* Panel del chat */}
        <section className="col-span-12 md:col-span-8 flex flex-col h-full overflow-hidden rounded-3xl bg-white/95 shadow-xl border border-white/60 backdrop-blur">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 flex items-center justify-between">
            <span>{title}</span>
          </div>

          {/* Lista de mensajes */}
          <div
            ref={scroller}
            className="flex-1 px-4 py-5 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100 custom-scrollbar"
          >
            <div className="flex flex-col gap-1">
              {itemsWithSeparators.map((item) =>
                item.type === 'sep' ? (
                  <div key={item.key} className="sticky top-2 z-10 flex justify-center my-3">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <Message key={item.key} message={item.m!} />
                )
              )}
              {messages.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-6">No hay mensajes.</div>
              )}
            </div>
          </div>

          {/* Formulario para enviar mensaje */}
          <form
            onSubmit={onSend}
            className="p-4 border-t border-slate-100 flex gap-3 items-center bg-white"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje"
              className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            <button className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium shadow hover:bg-emerald-700 transition">
              Enviar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
