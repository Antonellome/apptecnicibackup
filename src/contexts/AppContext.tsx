import React, { createContext, useState, ReactNode } from 'react';

interface AppContextType {
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;
}

// Crea il contesto con un valore di default che corrisponda all'interfaccia
export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const value = {
    isMenuOpen,
    setMenuOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
