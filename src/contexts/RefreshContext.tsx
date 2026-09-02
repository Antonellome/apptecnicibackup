import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface RefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// QUESTO COMPONENTE MANCAVA E CAUSAVA UN ERRORE DI BUILD
export const RefreshProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prevKey => prevKey + 1);

  const value = useMemo(() => ({ refreshKey, triggerRefresh }), [refreshKey]);

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
