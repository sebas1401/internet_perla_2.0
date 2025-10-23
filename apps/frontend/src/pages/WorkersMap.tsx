import { useEffect, useState, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import { motion } from 'framer-motion';
import { MapPin, Users, Satellite } from 'lucide-react';
import api from '../services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const glassCard = 'backdrop-blur-xl bg-white/80 shadow-xl shadow-emerald-100/60 border border-white/30';

interface Worker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export function WorkersMap() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v11');
  const mapRef = useRef<any>();

  useEffect(() => {
    api.get('/users/with-location').then((res) => {
      setWorkers(res.data);
      // Center map on the first worker if available
      if (res.data.length > 0) {
        const firstWorker = res.data[0];
        mapRef.current?.flyTo({ center: [firstWorker.longitude, firstWorker.latitude], zoom: 13 });
      }
    });
  }, []);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    mapRef.current?.flyTo({ center: [worker.longitude, worker.latitude], zoom: 15, duration: 2000 });
  };

  const toggleMapStyle = () => {
    setMapStyle(current => 
      current === 'mapbox://styles/mapbox/streets-v11' 
      ? 'mapbox://styles/mapbox/satellite-streets-v12' 
      : 'mapbox://styles/mapbox/streets-v11'
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-3 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[140%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.12),rgba(14,165,233,0.08),rgba(16,185,129,0.12))] blur-3xl opacity-35" />

      <div className="relative z-10 flex flex-1 flex-col gap-8 overflow-hidden">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <motion.h1
                    className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    Mapa de Colaboradores
                </motion.h1>
                <motion.p
                    className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    Visualiza la ubicación en tiempo real de los colaboradores activos en el campo.
                </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <button 
                onClick={toggleMapStyle}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600"
              >
                <Satellite className="h-4 w-4" />
                Cambiar Vista
              </button>
            </motion.div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <motion.div 
            className={`${glassCard} rounded-3xl p-4 flex flex-col`} 
            initial={{ opacity: 0, x: -50 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 p-2 mb-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Colaboradores</h2>
            </div>
            <div className="overflow-y-auto custom-scrollbar pr-2">
              <ul className="space-y-2">
                {workers.map((worker) => (
                  <li 
                    key={worker.id} 
                    onClick={() => handleWorkerClick(worker)} 
                    className={`cursor-pointer p-3 rounded-2xl transition-all duration-300 ${selectedWorker?.id === worker.id ? 'bg-emerald-100/80 shadow-inner' : 'hover:bg-white/70'}`}>
                    <p className="font-semibold text-sm text-slate-800">{worker.name}</p>
                  </li>
                ))}
                {workers.length === 0 && (
                    <li className="p-3 text-center text-sm text-slate-500">No hay colaboradores con ubicación activa.</li>
                )}
              </ul>
            </div>
          </motion.div>

          <motion.div 
            className={`${glassCard} rounded-3xl overflow-hidden`} 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Map
              ref={mapRef}
              initialViewState={{
                latitude: 14.7833, // Central point for Honduras
                longitude: -86.5,
                zoom: 7,
              }}
              mapStyle={mapStyle}
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <NavigationControl position="top-left" />
              {workers.map(worker => (
                  <Marker key={`marker-${worker.id}`} latitude={worker.latitude} longitude={worker.longitude} onClick={() => handleWorkerClick(worker)}>
                      <div className="transform-gpu transition-transform duration-300 hover:scale-125 cursor-pointer">
                        <MapPin className={`h-8 w-8 ${selectedWorker?.id === worker.id ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`} fill="currentColor" />
                      </div>
                  </Marker>
              ))}
            </Map>
          </motion.div>
        </div>
      </div>
    </div>
  );
}