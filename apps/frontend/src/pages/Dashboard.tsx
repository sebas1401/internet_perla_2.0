import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function Dashboard(){
  const { user } = useAuth();
  const [health,setHealth] = useState<any>();
  useEffect(()=>{ api.get('/health').then(r=>setHealth(r.data)).catch(()=>setHealth({status:'error'})); },[]);
  return (
    <div className="p-6">
      <motion.h1 className="text-3xl font-extrabold text-primary mb-1" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>Dashboard</motion.h1>
      <motion.div className="text-sm text-gray-600 mb-6" initial={{opacity:0}} animate={{opacity:1}}>Bienvenido, {user?.name || user?.email} ({user?.role})</motion.div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title:'Estado API', body:health?.status||'...' },
          { title:'Clientes', body:'Gestiona tus clientes en la sección correspondiente' },
          { title:'Perfil', body:'Actualiza tu información y credenciales' },
        ].map((c,i)=> (
          <motion.div key={i} className="bg-white p-4 rounded shadow card-hover" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
            <div className="font-semibold">{c.title}</div>
            <div className="text-sm text-gray-600">{c.body}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
