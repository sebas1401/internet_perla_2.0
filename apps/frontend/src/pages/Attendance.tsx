import { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';

type Rec = { id:string; name:string; tipo:'IN'|'OUT'; timestamp:string; note?:string };

export default function Attendance(){
  const [rows,setRows] = useState<Rec[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|undefined>();
  const [form,setForm] = useState({ name:'', tipo:'IN' as 'IN'|'OUT', note:'' });
  const load = ()=>{ setLoading(true); setError(undefined); api.get('/attendance').then(r=>setRows(r.data)).catch(e=>setError('Error al cargar asistencia')).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);
  const check = async ()=>{ await api.post('/attendance/check', form); setForm({ name:'', tipo:'IN', note:'' }); load(); };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-4">Asistencia</h1>
      {loading && <LoadingState message="Cargando asistencia..." />}
      {error && <ErrorState message={error} onRetry={load} />}
      <div className="bg-white rounded shadow p-4 mb-4 grid md:grid-cols-4 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <select className="border rounded px-3 py-2" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value as any})}><option>IN</option><option>OUT</option></select>
        <input className="border rounded px-3 py-2" placeholder="Nota" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
        <button onClick={check} className="bg-primary text-white rounded px-4">Registrar</button>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Fecha/Hora</th><th className="px-3 py-2 text-left">Nota</th></tr></thead><tbody>
          {rows.map(r=> (<tr key={r.id} className="border-t"><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.tipo}</td><td className="px-3 py-2">{new Date(r.timestamp).toLocaleString()}</td><td className="px-3 py-2">{r.note}</td></tr>))}
        </tbody></table>
      </div>
    </div>
  );
}

