import { createContext } from 'react';
import { Notifica } from '@/models/definitions';

export interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  hideNotification: (notificationId: string) => void;
  loading: boolean;
  error: string | null;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
