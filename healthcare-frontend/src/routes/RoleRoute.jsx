import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASH = {
  patient:  '/patient/dashboard',
  doctor:   '/doctor/dashboard',
  hospital: '/hospital/dashboard',
  lab:      '/lab/dashboard',
  admin:    '/admin/dashboard',
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to={DASH[user?.role] || '/login'} replace />;
  }
  return children;
};

export default RoleRoute;
