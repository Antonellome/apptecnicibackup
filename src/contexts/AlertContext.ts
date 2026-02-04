import { createContext, useContext } from 'react';

// --- 1. DEFINIZIONE DEI TIPI ---

export interface AlertOptions {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface ConfirmOptions {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertContextType {
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (options: ConfirmOptions) => void;
}

// --- 2. CREAZIONE DEL CONTESTO ---

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

// --- 3. CREAZIONE DELL'HOOK ---

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
