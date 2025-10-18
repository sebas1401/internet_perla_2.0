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
import Profile from './Profile';
import TasksAdmin from './TasksAdmin';
import MyTasks from './MyTasks';
import Navbar from '../components/Navbar';

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
        <Route path="/" element={<Protected><><Navbar /><RoleSwitch /></></Protected>} />
        <Route path="/customers" element={<Protected role="ADMIN"><><Navbar /><Customers /></></Protected>} />
        <Route path="/profile" element={<Protected><><Navbar /><Profile /></></Protected>} />
        <Route path="/attendance" element={<Protected role="ADMIN"><><Navbar /><Attendance /></></Protected>} />
        <Route path="/inventory" element={<Protected role="ADMIN"><><Navbar /><Inventory /></></Protected>} />
        <Route path="/finance" element={<Protected role="ADMIN"><><Navbar /><Finance /></></Protected>} />
        <Route path="/tasks-admin" element={<Protected role="ADMIN"><><Navbar /><TasksAdmin /></></Protected>} />
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
