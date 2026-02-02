import { createContext } from 'react';
import { type User } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isTecnicoAbilitato: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
