import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

// MÃ KÍCH HOẠT DO ADMIN CUNG CẤP (Bạn có thể sửa mã này)
const ADMIN_ACCESS_CODE = "toanthaymanh0973852062";

// Internal type for storing user credentials (simulating a database record)
interface StoredUserAccount extends User {
  password?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, accessCode: string) => Promise<void>;
  logout: () => void;
  verifyAccessCode: (code: string) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Check local storage on mount to restore session
  useEffect(() => {
    const storedSession = localStorage.getItem('doculatex_session');
    if (storedSession) {
      try {
        setUser(JSON.parse(storedSession));
      } catch (e) {
        localStorage.removeItem('doculatex_session');
      }
    }
  }, []);

  // Helper to get all registered users
  const getRegisteredUsers = (): StoredUserAccount[] => {
    const db = localStorage.getItem('doculatex_users_db');
    return db ? JSON.parse(db) : [];
  };

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        const users = getRegisteredUsers();
        const foundUser = users.find(u => u.email === email && u.password === password);

        if (foundUser) {
          // Remove password before setting session state
          const { password, ...safeUser } = foundUser;
          setUser(safeUser);
          localStorage.setItem('doculatex_session', JSON.stringify(safeUser));
          resolve();
        } else {
          reject(new Error("Email hoặc mật khẩu không chính xác."));
        }
      }, 800);
    });
  };

  const register = async (email: string, password: string, name: string, accessCode: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 1. Kiểm tra Mã kích hoạt
        if (accessCode !== ADMIN_ACCESS_CODE) {
          reject(new Error("Mã kích hoạt không đúng. Vui lòng liên hệ Admin để lấy mã."));
          return;
        }

        const users = getRegisteredUsers();
        
        if (users.some(u => u.email === email)) {
          reject(new Error("Email này đã được đăng ký. Vui lòng đăng nhập."));
          return;
        }

        const newUser: StoredUserAccount = {
          id: Date.now().toString(),
          email,
          name,
          password // In a real app, this should be hashed!
        };

        const updatedUsers = [...users, newUser];
        localStorage.setItem('doculatex_users_db', JSON.stringify(updatedUsers));

        // Auto login after register
        const { password: _, ...safeUser } = newUser;
        setUser(safeUser);
        localStorage.setItem('doculatex_session', JSON.stringify(safeUser));
        resolve();
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('doculatex_session');
  };

  const verifyAccessCode = (code: string): boolean => {
    return code === ADMIN_ACCESS_CODE;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, verifyAccessCode, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};