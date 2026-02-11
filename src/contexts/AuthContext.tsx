import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  username: string;
  role: string;
  isAdmin: boolean;
  cabang: string | null; // null for admin (sees all), branch name for others
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  isAuthenticated: boolean;
}

// Data user dari tabel yang diberikan
const USERS_DB: { username: string; password: string; role: string }[] = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'semarang1', password: '443', role: 'Semarang 1' },
  { username: 'semarang2', password: '444', role: 'Semarang 2' },
  { username: 'semarang3', password: '', role: 'Semarang 3' },
  { username: 'semarang4', password: '442', role: 'Semarang 4' },
  { username: 'semarang5', password: '461', role: 'Semarang 5' },
  { username: 'semarang6', password: '465', role: 'Semarang 6' },
  { username: 'kendal', password: '448', role: 'Kendal' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'akademik_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = (username: string, password: string): { success: boolean; message: string } => {
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    const found = USERS_DB.find(
      (u) => u.username.toLowerCase() === trimmedUsername
    );

    if (!found) {
      return { success: false, message: 'Username tidak ditemukan' };
    }

    if (found.password !== trimmedPassword) {
      return { success: false, message: 'Password salah' };
    }

    const isAdmin = found.role === 'admin';
    const newUser: User = {
      username: found.username,
      role: found.role,
      isAdmin,
      cabang: isAdmin ? null : found.role, // role = cabang name for non-admin
    };

    setUser(newUser);
    return { success: true, message: 'Login berhasil!' };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
