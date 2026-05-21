import { createContext, useState } from 'react';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  function login(newToken: string, newUser: UserInfo) {
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
