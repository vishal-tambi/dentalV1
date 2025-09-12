import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import AdminDashboardPage from './pages/AdminDashboard'; // Fixed import name

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/patient" />;
  }

  return children;
};

// Main App Component
function AppContent() {
  const { isAuthenticated, isAdmin, isPatient } = useAuth();

  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? (
            isAdmin ? <Navigate to="/admin" /> : <Navigate to="/patient" />
          ) : (
            <Login />
          )} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? (
            isAdmin ? <Navigate to="/admin" /> : <Navigate to="/patient" />
          ) : (
            <Register />
          )} 
        />

        {/* Protected Routes */}
        <Route 
          path="/patient" 
          element={
            <ProtectedRoute>
              {isPatient ? <PatientDashboard /> : <Navigate to="/admin" />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } 
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin" /> : <Navigate to="/patient" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;