import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import PasswordResetPage from './pages/PasswordResetPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminLayout from './layouts/AdminLayout';
import MemberLayout from './layouts/MemberLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import UserImport from './pages/admin/UserImport';
import RequestManagement from './pages/admin/RequestManagement';
import ServiceManagement from './pages/admin/ServiceManagement';
import AdminProfile from './pages/admin/AdminProfile';
import MemberDashboard from './pages/member/MemberDashboard';
import MemberProfile from './pages/member/MemberProfile';
import FamilyManagement from './pages/member/FamilyManagement';
import ServiceRequest from './pages/member/ServiceRequest';
import RequestHistory from './pages/member/RequestHistory';
import FirebaseStatus from './components/FirebaseStatus';
import DatabaseInitializer from './components/DatabaseInitializer';

// Composant pour gérer les erreurs de navigation
function NavigationErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  React.useEffect(() => {
    // Log pour débugger les problèmes de navigation
    console.log('Navigation vers:', location.pathname);
  }, [location]);
  
  return <>{children}</>;
}

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }
  
  // Rediriger vers le changement de mot de passe si c'est la première connexion
  if (user.firstLogin && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Routes publiques */}
      <Route 
        path="/login" 
        element={
          user ? (
            user.firstLogin ? (
              <Navigate to="/change-password" replace />
            ) : (
              <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
            )
          ) : (
            <LoginPage />
          )
        } 
      />
      <Route path="/password-reset" element={<PasswordResetPage />} />
      
      {/* Route de changement de mot de passe */}
      <Route 
        path="/change-password" 
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Routes Admin */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="import" element={<UserImport />} />
        <Route path="requests" element={<RequestManagement />} />
        <Route path="services" element={<ServiceManagement />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      
      {/* Routes Membre */}
      <Route path="/member" element={
        <ProtectedRoute requiredRole="member">
          <MemberLayout />
        </ProtectedRoute>
      }>
        <Route index element={<MemberDashboard />} />
        <Route path="profile" element={<MemberProfile />} />
        <Route path="family" element={<FamilyManagement />} />
        <Route path="request" element={<ServiceRequest />} />
        <Route path="history" element={<RequestHistory />} />
      </Route>
      
      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Route 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <NavigationErrorBoundary>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <FirebaseStatus />
            <DatabaseInitializer />
          </div>
        </NavigationErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;