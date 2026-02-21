import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Fetch active sessions for already logged in user
        refreshSessions();
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      // Fetch active sessions after successful login
      await refreshSessions();

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      await authAPI.changePassword({ oldPassword, newPassword });

      // Update user to clear must_change_password flag
      const updatedUser = { ...user, must_change_password: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      return { success: false, error: message };
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;

    // Admin has all permissions
    if (user.permissions.includes('all')) return true;

    // Check for specific permission
    return user.permissions.includes(permission);
  };

  // Check if user has a specific role
  const hasRole = (roleName) => {
    if (!user || !user.role) return false;
    return user.role.name === roleName;
  };

  // Fetch user's active sessions
  const refreshSessions = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/user-sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setActiveSessions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Revoke a specific session
  const revokeSession = async (sessionId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/user-sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh sessions list
      await refreshSessions();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to revoke session';
      return { success: false, error: message };
    }
  };

  // Revoke all other sessions
  const revokeAllOtherSessions = async () => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/user-sessions`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh sessions list
      await refreshSessions();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to revoke sessions';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!user,
    // RBAC
    permissions: user?.permissions || [],
    role: user?.role || null,
    hasPermission,
    hasRole,
    // Session management
    activeSessions,
    refreshSessions,
    revokeSession,
    revokeAllOtherSessions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
