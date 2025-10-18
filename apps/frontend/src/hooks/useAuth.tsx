import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuth } from '../services/api';

type UserPayload = { sub: string; email: string; role: 'ADMIN'|'USER'; name?: string } | null;

type AuthContextType = { user: UserPayload; token?: string; login: (e:string,p:string)=>Promise<void>; register:(n:string,e:string,p:string)=>Promise<void>; logout:()=>void };

const AuthContext = createContext<AuthContextType>({} as any);

function parseJwt(token: string): UserPayload { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } }

export const AuthProvider: React.FC<{children:React.ReactNode}> = ({ children }) => {
  const [token,setToken] = useState<string|undefined>();
  const [user,setUser] = useState<UserPayload>(null);
  useEffect(()=>{ const t = localStorage.getItem('ip_token')||undefined; if (t){ setToken(t); setAuth(t); setUser(parseJwt(t)); } },[]);
  const login = async (email:string,password:string) => { const {data} = await api.post('/auth/login',{email,password}); localStorage.setItem('ip_token',data.access_token); setAuth(data.access_token); setToken(data.access_token); setUser(parseJwt(data.access_token)); };
  const register = async (name:string,email:string,password:string) => { await api.post('/auth/register',{name,email,password}); await login(email,password); };
  const logout = ()=>{ localStorage.removeItem('ip_token'); setAuth(undefined); setToken(undefined); setUser(null); };
  const value = useMemo(()=>({user,token,login,register,logout}),[user,token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

