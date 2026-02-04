import { createContext, useContext } from 'react';

interface RefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
