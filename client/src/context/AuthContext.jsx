import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('helpdesk_token') || null);
  const [loading, setLoading] = useState(true);

  // Synchronize authentication status on startup
  const initAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('helpdesk_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
        setToken(storedToken);
      } else {
        localStorage.removeItem('helpdesk_token');
        localStorage.removeItem('helpdesk_user');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.warn('[Auth] Session validation failed, clearing stored credentials');
      localStorage.removeItem('helpdesk_token');
      localStorage.removeItem('helpdesk_user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /**
   * Log in user with credentials
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success && response.data.data) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        
        localStorage.setItem('helpdesk_token', receivedToken);
        localStorage.setItem('helpdesk_user', JSON.stringify(receivedUser));
        
        setToken(receivedToken);
        setUser(receivedUser);
        
        return { success: true, user: receivedUser };
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unable to connect to server';
      throw new Error(errorMessage);
    }
  };

  /**
   * Log out current user
   */
  const logout = () => {
    localStorage.removeItem('helpdesk_token');
    localStorage.removeItem('helpdesk_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  /**
   * Refresh current user profile from backend
   */
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
        localStorage.setItem('helpdesk_user', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh user profile', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshUser,
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
