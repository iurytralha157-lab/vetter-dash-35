import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading: authLoading } = useAuth();
  const { status, isVetterAdmin, loading: contextLoading } = useUserContext();
  const location = useLocation();

  // Show loading while checking auth
  if (authLoading || contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin users bypass status check
  if (isVetterAdmin) {
    return <>{children}</>;
  }

  // Check user status
  if (status === 'pending') {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  if (status === 'blocked') {
    return <Navigate to="/conta-bloqueada" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isVetterAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
