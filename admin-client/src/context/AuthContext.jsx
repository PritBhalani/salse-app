import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('salase_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login default Boss account on initial visit if not logged in
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            loginAs('ADMIN');
          }
        } catch (e) {
          loginAs('ADMIN');
        }
      } else {
        loginAs('ADMIN');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginAs = async (role) => {
    setLoading(true);
    try {
      const phone = role === 'ADMIN' ? '9898011111' : '9898022222';
      const password = role === 'ADMIN' ? 'admin123' : 'warehouse123';
      const res = await authAPI.login(phone, password);
      if (res.data.success) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('salase_token', res.data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('salase_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
