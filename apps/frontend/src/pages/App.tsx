import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import Attendance from './Attendance';
import Inventory from './Inventory';
import Finance from './Finance';
import Customers from './Customers';
import Workers from './Workers';
import Profile from './Profile';
import TasksAdmin from './TasksAdmin';
import MyTasks from './MyTasks';
import MessagesPage from './Messages';
import Navbar from '../components/Navbar';
import AdminShell from '../components/AdminShell';

function Protected({ children, role }:{ children: JSX.Element; role?: 'ADMIN'|'USER' }){
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App(){
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Protected><AdminSwitch /></Protected>} />
        <Route path="/workers" element={<Protected role="ADMIN"><AdminShell><Workers /></AdminShell></Protected>} />
        <Route path="/messages" element={<Protected><MessagesRoute/></Protected>} />
        <Route path="/profile" element={<Protected><><Navbar /><Profile /></></Protected>} />
        <Route path="/attendance" element={<Protected role="ADMIN"><AdminShell><Attendance /></AdminShell></Protected>} />
        <Route path="/inventory" element={<Protected role="ADMIN"><AdminShell><Inventory /></AdminShell></Protected>} />
        <Route path="/finance" element={<Protected role="ADMIN"><AdminShell><Finance /></AdminShell></Protected>} />
        <Route path="/tasks-admin" element={<Protected role="ADMIN"><AdminShell><TasksAdmin /></AdminShell></Protected>} />
        <Route path="/my-tasks" element={<Protected><><Navbar /><MyTasks /></></Protected>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}

function RoleSwitch(){
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminPanel/>;
  return <Dashboard/>;
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
