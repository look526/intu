import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../utils/auth';

export default function AuthRoute() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
