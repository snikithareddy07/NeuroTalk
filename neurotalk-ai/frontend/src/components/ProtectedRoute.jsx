import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, token } = useAuth();

  // If there's no auth token, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // If the route requires admin but the user is not an admin, redirect to their dashboard
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render the requested component
  return children;
};

export default ProtectedRoute;
