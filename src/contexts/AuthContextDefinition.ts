import { createContext } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '@/models/definitions';

export interface AuthContextType {
  user: User | null; 
  userProfile: UserProfile | null; 
  loading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
