import { useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getApiOrigin } from '../services/api';

export function useSocket(){
  const { token, logout } = useAuth();
  const sockRef = useRef<Socket|null>(null);
  const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim() || getApiOrigin();

  useEffect(()=>{
    if (!token) { sockRef.current?.disconnect(); sockRef.current = null; return; }
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    const onConnectError = () => { 
      // Solo logout si es error crítico, no por desconexión temporal
      console.debug('[Socket] Conexión con error, reintentando...');
    };
    const onDisconnect = (reason: string) => { 
      if (reason === 'io server disconnect') { 
        try { logout(); } catch {} 
      } 
    };
    s.on('connect_error', onConnectError);
    s.on('disconnect', onDisconnect);
    sockRef.current = s;
    return () => { s.off('connect_error', onConnectError); s.off('disconnect', onDisconnect); s.disconnect(); sockRef.current = null; };
  }, [token, logout, socketUrl]);

  return useMemo(()=>({ socket: sockRef.current }), [sockRef.current]);
}

