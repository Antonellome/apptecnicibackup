import { createContext, useContext } from 'react';
import type { Notifica } from '@/models/definitions';

export interface NotificationContextType {
  notifications: Notifica[];
  loading: boolean;
  error: Error | null;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  loading: true,
  error: null,
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
