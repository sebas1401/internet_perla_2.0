import { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';

type Item = { id:string; sku:string; name:string; category:string; minStock:number };
type Warehouse = { id:string; name:string; location?:string };
type Movement = { id:string; item:Item; type:'IN'|'OUT'; quantity:number; note:string; timestamp:string };
type Stock = { id:string; item:Item; warehouse:Warehouse; quantity:number };

export default function Inventory(){
  const [items,setItems] = useState<Item[]>([]);
  const [whs,setWhs] = useState<Warehouse[]>([]);
  const [stocks,setStocks] = useState<Stock[]>([]);
  const [movs,setMovs] = useState<Movement[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|undefined>();
  const [formItem,setFormItem] = useState({ sku:'', name:'', category:'', minStock:0 });
  const [formWh,setFormWh] = useState({ name:'', location:'' });
  const [formMove,setFormMove] = useState({ itemId:'', warehouseId:'', type:'IN' as 'IN'|'OUT', quantity:1, note:'' });

  const load = async ()=>{
    try{
      setLoading(true); setError(undefined);
      const [i,w,s,m] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/warehouses'),
        api.get('/inventory/stocks'),
        api.get('/inventory/movements'),
      ]);
      setItems(i.data); setWhs(w.data); setStocks(s.data); setMovs(m.data);
    } catch(e:any){ setError('Error al cargar inventario'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const createItem = async ()=>{ await api.post('/inventory/items', formItem); setFormItem({ sku:'', name:'', category:'', minStock:0 }); load(); };
  const createWh = async ()=>{ await api.post('/inventory/warehouses', formWh); setFormWh({ name:'', location:'' }); load(); };
  const createMove = async ()=>{ await api.post('/inventory/movements', formMove); setFormMove({ itemId:'', warehouseId:'', type:'IN', quantity:1, note:'' }); load(); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Inventario</h1>
      {loading && <LoadingState message="Cargando inventario..." />}
      {error && <ErrorState message={error} onRetry={load} />}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Items</h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <input className="border rounded px-2 py-1" placeholder="SKU" value={formItem.sku} onChange={e=>setFormItem({...formItem,sku:e.target.value})} />
            <input className="border rounded px-2 py-1" placeholder="Nombre" value={formItem.name} onChange={e=>setFormItem({...formItem,name:e.target.value})} />
            <input className="border rounded px-2 py-1" placeholder="Categoría" value={formItem.category} onChange={e=>setFormItem({...formItem,category:e.target.value})} />
            <input type="number" className="border rounded px-2 py-1" placeholder="Min" value={formItem.minStock} onChange={e=>setFormItem({...formItem,minStock:parseInt(e.target.value||'0')})} />
          </div>
          <button onClick={createItem} className="bg-primary text-white rounded px-3 py-1">Crear</button>
          <ul className="mt-3 text-sm">
            {items.map(i=> (<li key={i.id} className="py-1 border-t">{i.name} <span className="text-gray-500">({i.sku})</span> • {i.category} • Min: {i.minStock}</li>))}
          </ul>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Almacenes</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input className="border rounded px-2 py-1" placeholder="Nombre" value={formWh.name} onChange={e=>setFormWh({...formWh,name:e.target.value})} />
            <input className="border rounded px-2 py-1" placeholder="Ubicación" value={formWh.location} onChange={e=>setFormWh({...formWh,location:e.target.value})} />
          </div>
          <button onClick={createWh} className="bg-primary text-white rounded px-3 py-1">Crear</button>
          <ul className="mt-3 text-sm">{whs.map(w=> (<li key={w.id} className="py-1 border-t">{w.name} {w.location && `• ${w.location}`}</li>))}</ul>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Movimiento de Stock</h2>
        <div className="grid md:grid-cols-5 gap-2 mb-3">
          <select className="border rounded px-2 py-1" value={formMove.itemId} onChange={e=>setFormMove({...formMove,itemId:e.target.value})}><option value="">Item</option>{items.map(i=> <option key={i.id} value={i.id}>{i.name}</option>)}</select>
          <select className="border rounded px-2 py-1" value={formMove.warehouseId} onChange={e=>setFormMove({...formMove,warehouseId:e.target.value})}><option value="">Almacén</option>{whs.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</select>
          <select className="border rounded px-2 py-1" value={formMove.type} onChange={e=>setFormMove({...formMove,type:e.target.value as any})}><option>IN</option><option>OUT</option></select>
          <input type="number" className="border rounded px-2 py-1" value={formMove.quantity} onChange={e=>setFormMove({...formMove,quantity:parseInt(e.target.value||'1')})} />
          <input className="border rounded px-2 py-1" placeholder="Nota" value={formMove.note} onChange={e=>setFormMove({...formMove,note:e.target.value})} />
        </div>
        <button onClick={createMove} className="bg-primary text-white rounded px-3 py-1">Registrar</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Stocks</h2>
          <ul className="text-sm max-h-64 overflow-auto">
            {stocks.map(s=> (<li key={s.id} className="py-1 border-t">{s.item.name} • {s.warehouse.name} • Cant: {s.quantity}</li>))}
          </ul>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Movimientos</h2>
          <ul className="text-sm max-h-64 overflow-auto">
            {movs.map(m=> (<li key={m.id} className="py-1 border-t">{new Date(m.timestamp).toLocaleString()} • {m.item.name} • {m.type} • {m.quantity} • {m.note}</li>))}
          </ul>
        </div>
      </div>
    </div>
  );
}

