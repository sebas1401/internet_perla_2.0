import { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';

type Period = { id:string; startDate:string; endDate:string; status:'OPEN'|'CLOSED' };
type Loan = { id:string; employeeName:string; total:number; installments:number; balance:number };
type Debt = { id:string; employeeName:string; description:string; amount:number; balance:number };

export default function Finance(){
  const [periods,setPeriods] = useState<Period[]>([]);
  const [loans,setLoans] = useState<Loan[]>([]);
  const [debts,setDebts] = useState<Debt[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|undefined>();
  const [pform,setPform] = useState({ startDate:'', endDate:'' });
  const [lform,setLform] = useState({ employeeName:'', total:0, installments:1 });
  const [dform,setDform] = useState({ employeeName:'', description:'', amount:0 });

  const load = async ()=>{
    try{
      setLoading(true); setError(undefined);
      const [p,l,d] = await Promise.all([
        api.get('/finance/periods'),
        api.get('/finance/loans'),
        api.get('/finance/debts'),
      ]);
      setPeriods(p.data); setLoans(l.data); setDebts(d.data);
    } catch(e:any){ setError('Error al cargar finanzas'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const createPeriod = async ()=>{ await api.post('/finance/periods', pform); setPform({ startDate:'', endDate:'' }); load(); };
  const createLoan = async ()=>{ await api.post('/finance/loans', lform); setLform({ employeeName:'', total:0, installments:1 }); load(); };
  const createDebt = async ()=>{ await api.post('/finance/debts', dform); setDform({ employeeName:'', description:'', amount:0 }); load(); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Finanzas</h1>
      {loading && <LoadingState message="Cargando finanzas..." />}
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Crear Período</h2>
          <input type="date" className="border rounded px-2 py-1 mb-2 w-full" value={pform.startDate} onChange={e=>setPform({...pform,startDate:e.target.value})} />
          <input type="date" className="border rounded px-2 py-1 mb-2 w-full" value={pform.endDate} onChange={e=>setPform({...pform,endDate:e.target.value})} />
          <button onClick={createPeriod} className="bg-primary text-white rounded px-3 py-1">Crear</button>
          <ul className="text-sm mt-3">{periods.map(p=> (<li key={p.id} className="py-1 border-t">{p.startDate} → {p.endDate} • {p.status}</li>))}</ul>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Préstamos</h2>
          <input className="border rounded px-2 py-1 mb-2 w-full" placeholder="Empleado" value={lform.employeeName} onChange={e=>setLform({...lform,employeeName:e.target.value})} />
          <input type="number" className="border rounded px-2 py-1 mb-2 w-full" placeholder="Total" value={lform.total} onChange={e=>setLform({...lform,total:parseFloat(e.target.value||'0')})} />
          <input type="number" className="border rounded px-2 py-1 mb-2 w-full" placeholder="Cuotas" value={lform.installments} onChange={e=>setLform({...lform,installments:parseInt(e.target.value||'1')})} />
          <button onClick={createLoan} className="bg-primary text-white rounded px-3 py-1">Crear</button>
          <ul className="text-sm mt-3 max-h-48 overflow-auto">{loans.map(l=> (<li key={l.id} className="py-1 border-t">{l.employeeName} • Total {l.total} • Saldo {l.balance} • Cuotas {l.installments}</li>))}</ul>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Deudas Internas</h2>
          <input className="border rounded px-2 py-1 mb-2 w-full" placeholder="Empleado" value={dform.employeeName} onChange={e=>setDform({...dform,employeeName:e.target.value})} />
          <input className="border rounded px-2 py-1 mb-2 w-full" placeholder="Descripción" value={dform.description} onChange={e=>setDform({...dform,description:e.target.value})} />
          <input type="number" className="border rounded px-2 py-1 mb-2 w-full" placeholder="Monto" value={dform.amount} onChange={e=>setDform({...dform,amount:parseFloat(e.target.value||'0')})} />
          <button onClick={createDebt} className="bg-primary text-white rounded px-3 py-1">Crear</button>
          <ul className="text-sm mt-3 max-h-48 overflow-auto">{debts.map(d=> (<li key={d.id} className="py-1 border-t">{d.employeeName} • {d.description} • Monto {d.amount} • Saldo {d.balance}</li>))}</ul>
        </div>
      </div>
    </div>
  );
}

