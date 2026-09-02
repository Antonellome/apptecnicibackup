import { db } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Hook che fornisce il conteggio delle notifiche non lette e si aggiorna in tempo reale.
 */
export const useUnreadNotificationsCount = () => {
  const unreadCount = useLiveQuery(() => db.notifiche.where('isRead').equals(0).count(), []);

  return unreadCount !== undefined ? unreadCount : 0;
};
