import { useContext } from 'react';
import {
  NotificationContext,
  NotificationContextType,
} from '@/contexts/NotificationContextDefinition';

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere usato dentro un NotificationProvider');
  }
  return context;
};
