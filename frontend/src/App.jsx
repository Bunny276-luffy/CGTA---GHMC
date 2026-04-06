import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import CitizenDashboard from './components/CitizenDashboard';
import AdminDashboard from './components/AdminDashboard';
import OfficerDashboard from './components/officer/OfficerDashboard';
import InteractiveBackground from './components/InteractiveBackground';
import PublicStats from './components/PublicStats';
import { useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ children, requireRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requireRole && role !== requireRole) return <Navigate to="/" />;

  return children;
};

function App() {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-transparent relative">
        <InteractiveBackground />

        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Auth />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Auth />} />
          <Route path="/public-stats" element={<PublicStats onNavigateBack={() => window.location.href = '/login'} />} />

          <Route path="/" element={
            <ProtectedRoute>
              {role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/citizen" />}
            </ProtectedRoute>
          } />

          <Route path="/citizen" element={
            <ProtectedRoute requireRole="citizen">
              <CitizenDashboard />
            </ProtectedRoute>
          } />

          <Route path="/officer" element={
            <ProtectedRoute requireRole="officer">
              <OfficerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
