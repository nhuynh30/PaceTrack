import { createContext, useState, useEffect } from 'react';
import { api, setApiToken } from '../lib/api';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: attempt to restore session via the HTTP-only refresh token cookie.
  // If the cookie is missing or expired the call 401s and we stay logged out.
  useEffect(() => {
    api.post<{ accessToken: string; user: UserInfo }>('/auth/refresh')
      .then(res => {
        setApiToken(res.data.accessToken);
        setToken(res.data.accessToken);
        setUser(res.data.user);
      })
      .catch(() => {
        // No valid session — user will need to log in
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Global 401 interceptor: any protected API call that gets a 401 (expired
  // access token that wasn't refreshed in time) clears the session so
  // ProtectedRoute immediately redirects to /login.
  useEffect(() => {
    const id = api.interceptors.response.use(
      res => res,
      err => {
        if (err?.response?.status === 401) {
          setApiToken(null);
          setToken(null);
          setUser(null);
        }
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  function login(newToken: string, newUser: UserInfo) {
    setApiToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
    setApiToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: token !== null, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
