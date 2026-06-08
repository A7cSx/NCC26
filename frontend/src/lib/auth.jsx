import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthToken, login as apiLogin, register as apiRegister, me as apiMe } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ncc_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem('ncc_user', JSON.stringify(user));
    else localStorage.removeItem('ncc_user');
  }, [user]);

  // On mount: if we have a token, validate it via /auth/me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = localStorage.getItem('ncc_token');
      if (tok && !user) {
        try {
          const u = await apiMe();
          if (!cancelled) setUser(u);
        } catch {
          setAuthToken(null);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, []);

  const signIn = async (username, password) => {
    const { token, user: u } = await apiLogin(username, password);
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const signUp = async (payload) => {
    const { token, user: u } = await apiRegister(payload);
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, ready, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
