import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();

  // Validate existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      success(`Welcome back, ${receivedUser.name}!`);
      return { success: true, user: receivedUser };
    } catch (err) {
      toastError(err.message || 'Login failed');
      return { success: false, message: err.message };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authAPI.register(userData);
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      success('Account registered successfully! Welcome to MediQueue.');
      return { success: true, user: receivedUser };
    } catch (err) {
      toastError(err.message || 'Registration failed');
      return { success: false, message: err.message };
    }
  };

  const registerOrganisation = async (organisationData) => {
    try {
      const res = await authAPI.registerOrganisation(organisationData);
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      success('Organisation submitted for platform approval.');
      return { success: true, user: receivedUser };
    } catch (err) {
      toastError(err.message || 'Organisation registration failed');
      return { success: false, message: err.message };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    success('Logged out successfully.');
  }, [success]);

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isPatient: !loading && !!token && user?.role === 'patient',
    isStaff:
      ['receptionist', 'admin', 'superadmin', 'orgAdmin'].includes(user?.role) ||
      user?.roles?.includes('orgAdmin'),
    loading,
    login,
    register,
    registerOrganisation,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
