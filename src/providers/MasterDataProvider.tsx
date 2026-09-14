import React, { createContext, useContext } from 'react';

const MasterDataContext = createContext<null>(null);

export const MasterDataProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MasterDataContext.Provider value={null}>
      {children}
    </MasterDataContext.Provider>
  );
};

export const useMasterData = () => useContext(MasterDataContext);
