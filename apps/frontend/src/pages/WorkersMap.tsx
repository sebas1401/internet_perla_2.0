import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LoadingState } from '../components/ip/LoadingState';
import { ErrorState } from '../components/ip/ErrorState';
import { getLatestLocations, sendLocation } from '../services/locationService';
import { useAuth } from '../hooks/useAuth';

interface WorkerLocation {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  createdAt: string;
}

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export function WorkersMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<WorkerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingLocation, setReportingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const gmapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Cargar ubicaciones al montar
  useEffect(() => {
    loadLocations();
    // Recargar ubicaciones cada 2 minutos
    const interval = setInterval(loadLocations, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar script de Google Maps
  useEffect(() => {
    const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
    if (!key) {
      console.warn('[WorkersMap] VITE_GOOGLE_MAPS_API_KEY no está configurada');
      setError('API Key de Google Maps no configurada');
      setLoading(false);
      return;
    }

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => initMap();
    script.onerror = () => {
      console.error('[WorkersMap] Error cargando Google Maps');
      setError('Error al cargar Google Maps');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // Inicializar mapa de Google
  const initMap = () => {
    if (!mapRef.current || gmapRef.current) return;

    gmapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 15.5, lng: -88.0 }, // Ubicación inicial: Honduras
      zoom: 12,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    });

    renderMarkers();
  };

  // Actualizar marcadores cuando cambien las ubicaciones
  useEffect(() => {
    if (!gmapRef.current) return;
    renderMarkers();

    // Centrar mapa en la primera ubicación si existen
    if (locations.length > 0) {
      const first = locations[0];
      gmapRef.current.setCenter({ lat: first.lat, lng: first.lng });
    }
  }, [locations]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const renderMarkers = () => {
    clearMarkers();
    if (!gmapRef.current) return;

    locations.forEach((loc) => {
      const marker = new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map: gmapRef.current,
        title: loc.userId,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: inherit; color: #1f2937;">
            <strong style="color: #111827;">Trabajador</strong><br/>
            <small>ID: ${loc.userId.substring(0, 8)}...</small><br/>
            <small>${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</small><br/>
            <small style="color: #6b7280;">
              ${new Date(loc.createdAt).toLocaleString('es-CO')}
            </small>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open({ map: gmapRef.current, anchor: marker });
      });

      markersRef.current.push(marker);
    });
  };

  const loadLocations = async () => {
    try {
      setError(null);
      const data = await getLatestLocations();

      if (data && Array.isArray(data.data) && data.data.length > 0) {
        setLocations(data.data);
      } else {
        setLocations([]);
      }
    } catch (err: any) {
      console.error('[WorkersMap] Error:', err);
      setError(err?.message || 'Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleReportLocation = async () => {
    if (!user?.sub) {
      alert('No hay usuario autenticado');
      return;
    }

    setReportingLocation(true);
    try {
      const success = await sendLocation(user.sub);
      if (success) {
        alert('✅ Ubicación reportada exitosamente');
        setTimeout(loadLocations, 1000);
      } else {
        alert('❌ No se pudo obtener la ubicación. Verifica permisos del navegador.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error al reportar ubicación');
    } finally {
      setReportingLocation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <LoadingState message="Cargando ubicaciones de trabajadores..." />
      </div>
    );
  }

  if (error && !gmapRef.current) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ErrorState message={error} onRetry={loadLocations} />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-emerald-200/30 px-6 py-4 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-extrabold text-slate-900">Mapa de trabajadores</h1>
          <p className="mt-1 text-sm text-slate-600">
            {locations.length} trabajador{locations.length !== 1 ? 'es' : ''} con ubicación reportada
          </p>
        </motion.div>
      </div>

      {/* Contenedor del mapa */}
      <div className="relative flex-1 overflow-hidden">
        {/* Google Maps */}
        <div ref={mapRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* Sin ubicaciones */}
        {locations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">No hay ubicaciones disponibles</p>
              <p className="mt-2 text-sm text-slate-600">
                Los trabajadores no han reportado su ubicación aún
              </p>
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={loadLocations}
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 transition"
                >
                  Actualizar
                </button>
                <button
                  onClick={handleReportLocation}
                  disabled={reportingLocation}
                  className="rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 transition disabled:bg-slate-400"
                >
                  {reportingLocation ? 'Reportando...' : '📍 Reportar mi ubicación'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Botones flotantes */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReportLocation}
            disabled={reportingLocation}
            className="rounded-full bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-600 transition disabled:bg-slate-400 flex items-center gap-2"
            title="Reportar tu ubicación ahora"
          >
            📍 {reportingLocation ? 'Reportando...' : 'Mi ubicación'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadLocations}
            className="rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600 transition"
            title="Actualizar mapa"
          >
            ⟳ Actualizar
          </motion.button>
        </div>
      </div>

      {/* Panel lateral con lista de trabajadores */}
      <div className="absolute left-0 top-20 bottom-0 z-20 w-72 max-h-96 overflow-y-auto bg-white/95 backdrop-blur-xl border-r border-emerald-200/30 shadow-xl rounded-r-2xl">
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Trabajadores conectados</h3>
          <div className="space-y-2">
            {locations.map((location) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-emerald-200/40 bg-emerald-50/50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800 truncate">
                  {location.userId.substring(0, 8)}...
                </p>
                <p className="text-slate-600 mt-1 line-clamp-2">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                <p className="text-slate-500 mt-1">
                  {new Date(location.createdAt).toLocaleTimeString('es-CO')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
