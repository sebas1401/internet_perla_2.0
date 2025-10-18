import { useEffect, useMemo, useRef, useState } from 'react';
import { getThread, listContacts, sendMessage, Message as Msg } from '../services/messages';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

export default function MessagesPage(){
  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-12 gap-4">
      <MessagesPane />
    </div>
  );
}

function MessagesPane(){
  const { user } = useAuth();
  const [contacts, setContacts] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const { socket } = useSocket();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(()=>{ (async ()=>{ const cs = await listContacts(); setContacts(cs); if (cs[0]) setSelected(cs[0].id); })(); },[]);
  useEffect(()=>{ if(!selected) return; (async ()=>{ const th = await getThread(selected); setMessages(th); setTimeout(()=> scroller.current?.scrollTo({ top: scroller.current.scrollHeight }), 0); })(); },[selected]);
  useEffect(()=>{
    if (!socket) return;
    const onMsg = (m: Msg)=>{
      // update list if relevant
      if (m.sender.id===selected || m.recipient.id===selected) {
        setMessages(prev => [...prev, m]);
        setTimeout(()=> scroller.current?.scrollTo({ top: scroller.current!.scrollHeight, behavior: 'smooth' }), 0);
      }
      // refresh contacts list minimal approach
      listContacts().then(setContacts).catch(()=>{});
    };
    socket.on('message:created', onMsg);
    return ()=>{ socket.off('message:created', onMsg); };
  },[socket, selected]);

  async function onSend(e: React.FormEvent){
    e.preventDefault(); if(!selected || (!text)) return;
    const m = await sendMessage(selected, text);
    setMessages(prev=>[...prev, m]); setText('');
    setTimeout(()=> scroller.current?.scrollTo({ top: scroller.current!.scrollHeight, behavior: 'smooth' }), 0);
  }

  const title = useMemo(()=>{
    const c = contacts.find(c=>c.id===selected);
    return c ? (c.name || c.email) : 'Conversación';
  },[contacts, selected]);

  return (
    <div className="col-span-12 grid grid-cols-12 gap-4 h-[75vh]">
      <aside className="col-span-12 md:col-span-4 border rounded-lg overflow-hidden bg-white">
        <div className="p-3 border-b font-semibold">Contactos</div>
        <div className="divide-y max-h-[65vh] overflow-auto">
          {contacts.map(c=> (
            <button key={c.id} className={`w-full text-left p-3 hover:bg-gray-50 ${selected===c.id?'bg-gray-100':''}`} onClick={()=>setSelected(c.id)}>
              <div className="font-medium">{c.name || c.email}</div>
              <div className="text-xs text-gray-500 truncate">{c.email}</div>
            </button>
          ))}
          {contacts.length===0 && <div className="p-3 text-sm text-gray-500">Sin contactos aún.</div>}
        </div>
      </aside>
      <section className="col-span-12 md:col-span-8 border rounded-lg flex flex-col bg-white">
        <div className="p-3 border-b font-semibold">{title}</div>
        <div ref={scroller} className="flex-1 overflow-auto p-3 space-y-2 bg-gray-50">
          {messages.map(m => (
            <div key={m.id} className={`max-w-[75%] p-2 rounded-lg ${m.sender.id===user?.sub? 'ml-auto bg-green-100':'mr-auto bg-white border'}`}>
              {m.content && <div className="whitespace-pre-wrap text-sm">{m.content}</div>}
              {/* images disabled */}
              <div className="text-[10px] text-gray-500 text-right">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {messages.length===0 && <div className="text-sm text-gray-500">No hay mensajes.</div>}
        </div>
        <form onSubmit={onSend} className="p-3 border-t flex gap-2 items-center">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe un mensaje" className="flex-1 border rounded px-3 py-2" />
          <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">Enviar</button>
        </form>
      </section>
    </div>
  );
}
