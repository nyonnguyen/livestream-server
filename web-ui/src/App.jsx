import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PublicIpNotification from './components/PublicIpNotification';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Streams from './pages/Streams';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import MobileStream from './pages/MobileStream';
import Help from './pages/Help';
import About from './pages/About';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import StreamHistory from './pages/StreamHistory';
import SessionManagement from './pages/SessionManagement';
import SetupWizard from './pages/SetupWizard';
import BugReport from './pages/BugReport';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* IP change notification for authenticated users */}
      {isAuthenticated && <PublicIpNotification />}

      <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      {/* Public route for mobile QR code scanning */}
      <Route
        path="/mobile/:streamKey"
        element={<MobileStream />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/streams"
        element={
          <ProtectedRoute>
            <Layout>
              <Streams />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Layout>
              <Sessions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <Layout>
              <Help />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <Layout>
              <About />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bug-report"
        element={
          <ProtectedRoute>
            <Layout>
              <BugReport />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <AuditLog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/streams/history"
        element={
          <ProtectedRoute>
            <Layout>
              <StreamHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/manage"
        element={
          <ProtectedRoute>
            <Layout>
              <SessionManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <SetupWizard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
