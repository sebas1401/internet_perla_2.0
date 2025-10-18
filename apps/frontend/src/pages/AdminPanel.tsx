import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Attendance from './Attendance';
import Inventory from './Inventory';
import Finance from './Finance';

type Att = { id:string };
type Cust = { id:string };
type Stock = { id:string; quantity:number; item:{ id:string } };
type Item = { id:string; name:string; minStock:number };

export default function AdminPanel(){
  const [tab,setTab] = useState<string>('dashboard');
  const [att,setAtt] = useState<Att[]>([]);
  const [cust,setCust] = useState<Cust[]>([]);
  const [stocks,setStocks] = useState<Stock[]>([]);
  const [items,setItems] = useState<Item[]>([]);
  const [loading,setLoading] = useState(true);

  const lowStock = useMemo(()=>{
    const totals: Record<string, number> = {};
    for (const s of stocks) totals[s.item.id] = (totals[s.item.id]||0) + (s.quantity||0);
    return items.filter(i => (totals[i.id]||0) <= i.minStock);
  }, [stocks, items]);

  const load = async ()=>{
    setLoading(true);
    const [a,c,s,i] = await Promise.all([
      api.get('/attendance'),
      api.get('/customers'),
      api.get('/inventory/stocks'),
      api.get('/inventory/items'),
    ]);
    setAtt(a.data);
    setCust(c.data);
    setStocks(s.data);
    setItems(i.data);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  if (tab === 'attendance') return <Attendance/>;
  if (tab === 'inventory') return <Inventory/>;
  if (tab === 'finance') return <Finance/>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Panel Administrativo</h1>
        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1 rounded ${tab==='dashboard'?'bg-primary text-white':'bg-white border'}`} onClick={()=>setTab('dashboard' as any)}>Dashboard</button>
          <button className={`px-3 py-1 rounded ${tab==='attendance'?'bg-primary text-white':'bg-white border'}`} onClick={()=>setTab('attendance' as any)}>Asistencia</button>
          <button className={`px-3 py-1 rounded ${tab==='inventory'?'bg-primary text-white':'bg-white border'}`} onClick={()=>setTab('inventory' as any)}>Inventario</button>
          <button className={`px-3 py-1 rounded ${tab==='finance'?'bg-primary text-white':'bg-white border'}`} onClick={()=>setTab('finance' as any)}>Finanzas</button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded shadow p-4">
          <div className="text-xs text-gray-500">Registros de asistencia</div>
          <div className="text-2xl font-bold">{loading ? '...' : att.length}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-xs text-gray-500">Clientes</div>
          <div className="text-2xl font-bold">{loading ? '...' : cust.length}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-xs text-gray-500">Items en inventario</div>
          <div className="text-2xl font-bold">{loading ? '...' : items.length}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-xs text-gray-500">Items en alerta</div>
          <div className="text-2xl font-bold">{loading ? '...' : lowStock.length}</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Alertas de Stock Mínimo</h2>
        {lowStock.length===0 && <div className="text-sm text-gray-600">Sin alertas.</div>}
        <ul className="text-sm">
          {lowStock.map(i=> (
            <li key={i.id} className="py-1 border-t">{i.name} — mínimo {i.minStock}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
