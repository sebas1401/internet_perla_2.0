import { useEffect, useState, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import api from '../services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Worker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export function WorkersMap() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const mapRef = useRef<any>();

  useEffect(() => {
    api.get('/users/with-location').then((res) => {
      setWorkers(res.data);
    });
  }, []);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    mapRef.current?.flyTo({ center: [worker.longitude, worker.latitude], zoom: 15 });
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '300px', overflowY: 'auto', borderRight: '1px solid #ccc' }}>
        <h2>Trabajadores</h2>
        <ul>
          {workers.map((worker) => (
            <li key={worker.id} onClick={() => handleWorkerClick(worker)} style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #eee' }}>
              {worker.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1 }}>
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: 15.5042,
            longitude: -88.025,
            zoom: 12,
          }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          <NavigationControl position="top-left" />
          {selectedWorker && (
            <Marker latitude={selectedWorker.latitude} longitude={selectedWorker.longitude}>
              <div style={{ color: 'red', fontSize: '24px' }}>📍</div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}