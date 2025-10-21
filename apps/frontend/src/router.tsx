import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Attendance from './pages/Attendance';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Workers from './pages/Workers';
import Profile from './pages/Profile';
import TasksAdmin from './pages/TasksAdmin';
import MyTasks from './pages/MyTasks';
import MessagesPage from './pages/Messages';
import AdminSettings from './pages/AdminSettings';
import Navbar from './components/Navbar';
import AdminShell from './components/AdminShell';
import { WorkersMap } from './pages/WorkersMap';

function RootLayout(){
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}

function WithAuth(){
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}

function Protected({ children, role }:{ children: JSX.Element; role?: 'ADMIN'|'USER' }){
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function AdminSwitch(){
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminShell><AdminPanel/></AdminShell>;
  return (<><Navbar /><Dashboard/></>);
}

function MessagesRoute(){
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminShell><MessagesPage/></AdminShell>;
  return <MessagesPage/>;
}

function InventoryRoute(){
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminShell><Inventory/></AdminShell>;
  return <><Navbar /><Inventory/></>;
}

const futureFlags = { v7_startTransition: true, v7_relativeSplatPath: true } as any;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WithAuth />,
    children: [
      { index: true, element: <Protected><AdminSwitch/></Protected> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'workers', element: <Protected role="ADMIN"><AdminShell><Workers/></AdminShell></Protected> },
      { path: 'messages', element: <Protected><MessagesRoute/></Protected> },
      { path: 'profile', element: <Protected><><Navbar /><Profile /></></Protected> },
      { path: 'admin-settings', element: <Protected role="ADMIN"><AdminShell><AdminSettings/></AdminShell></Protected> },
      { path: 'attendance', element: <Protected role="ADMIN"><AdminShell><Attendance /></AdminShell></Protected> },
      { path: 'inventory', element: <Protected><InventoryRoute /></Protected> },
      { path: 'finance', element: <Protected role="ADMIN"><AdminShell><Finance /></AdminShell></Protected> },
      { path: 'tasks-admin', element: <Protected role="ADMIN"><AdminShell><TasksAdmin /></AdminShell></Protected> },
      { path: 'my-tasks', element: <Protected><><Navbar /><MyTasks /></></Protected> },
      { path: 'mapa-trabajadores', element: <Protected role="ADMIN"><AdminShell><WorkersMap /></AdminShell></Protected> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], { future: futureFlags });

export default router;
