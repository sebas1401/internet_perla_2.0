import { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { EmptyState } from '../components/ip/EmptyState';
import { ErrorState } from '../components/ip/ErrorState';

type Customer = { id:string; name:string; email:string; phone?:string };

export default function Customers(){
  const [rows,setRows] = useState<Customer[]>([]);
  const [form,setForm] = useState({ name:'', email:'', phone:'' });
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|undefined>();
  const load = ()=> {
    setLoading(true); setError(undefined);
    api.get('/customers').then(r=>setRows(r.data)).catch(e=>setError(e?.response?.data?.message||'Error')).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);
  const create = async ()=>{ if(!form.name||!form.email) return; await api.post('/customers',form); setForm({name:'',email:'',phone:''}); load(); };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-4">Clientes</h1>
      {loading && <LoadingState message="Cargando clientes..." />}
      {error && <div className="mb-4"><ErrorState message={error} onRetry={load} /></div>}
      {!loading && !error && rows.length===0 && (
        <div className="mb-6"><EmptyState title="Sin clientes" description="Crea tu primer cliente para comenzar." action={{label:'Crear cliente', onClick: create}} /></div>
      )}
      <div className="bg-white rounded shadow p-4 mb-6 grid md:grid-cols-4 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input className="border rounded px-3 py-2" placeholder="Teléfono" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
        <button onClick={create} className="bg-primary text-white rounded px-4">Crear</button>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Teléfono</th></tr></thead>
          <tbody>
            {rows.map(c=> (
              <tr key={c.id} className="border-t"><td className="px-3 py-2">{c.name}</td><td className="px-3 py-2">{c.email}</td><td className="px-3 py-2">{c.phone}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
