import { useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getApiOrigin } from '../services/api';

export function useSocket(){
  const { token } = useAuth();
  const sockRef = useRef<Socket|null>(null);

  useEffect(()=>{
    if (!token) { sockRef.current?.disconnect(); sockRef.current = null; return; }
    const s = io(getApiOrigin(), { transports: ['websocket'], auth: { token } });
    sockRef.current = s;
    return () => { s.disconnect(); sockRef.current = null; };
  }, [token]);

  return useMemo(()=>({ socket: sockRef.current }), [sockRef.current]);
}

