import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('salase_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('salase_token');
      if (savedToken) {
        try {
          const res = await authAPI.getMe();
          if (res.data.success && (res.data.user.role === 'ADMIN' || res.data.user.role === 'WAREHOUSE')) {
            setUser(res.data.user);
            setToken(savedToken);
          } else {
            logout();
          }
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.login(phone, password);
      if (res.data.success) {
        const u = res.data.user;
        if (u.role !== 'ADMIN' && u.role !== 'WAREHOUSE') {
          setError('This portal is for Boss & Warehouse Management only. Salesmen & Shop Owners must use the Mobile App.');
          setLoading(false);
          return false;
        }
        setToken(res.data.token);
        setUser(u);
        localStorage.setItem('salase_token', res.data.token);
        setLoading(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid phone number or password');
      setLoading(false);
      return false;
    }
  };

  const loginAs = async (role) => {
    const phone = role === 'ADMIN' ? '9898011111' : '9898022222';
    const password = role === 'ADMIN' ? 'admin123' : 'warehouse123';
    return await login(phone, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('salase_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
