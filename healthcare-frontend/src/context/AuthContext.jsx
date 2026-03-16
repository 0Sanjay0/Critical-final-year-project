import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('hms_token');
    const storedUser  = localStorage.getItem('hms_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
      }
    }
    setLoading(false);
  }, []);

  const persist = (token, user) => {
    localStorage.setItem('hms_token', token);
    localStorage.setItem('hms_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    const { token, user } = res.data.data;
    persist(token, user);
    toast.success(`Welcome back, ${user.firstName}!`);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authService.register(data);
    const { token, user } = res.data.data;
    persist(token, user);
    toast.success(res.data.message || 'Registration successful!');
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully.');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getMe();
      const updated = res.data.data.user;
      setUser(updated);
      localStorage.setItem('hms_user', JSON.stringify(updated));
      return updated;
    } catch {
      logout();
    }
  }, [logout]);

  const isAuthenticated = !!token && !!user;
  const isRole = (role) => user?.role === role;
  const isApproved = user?.verificationStatus === 'approved';

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated, isApproved, isRole,
      login, register, logout, refreshUser, setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
