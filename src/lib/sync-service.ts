import { db } from '@/db/local-db';
import { SyncEvent } from '@/models/definitions';

// Aggiunge un evento alla coda di sincronizzazione
export const aggiungiAllaCoda = async (evento: Omit<SyncEvent, 'id' | 'timestamp' | 'syncStatus'>) => {
  const eventoCompleto: SyncEvent = {
    ...evento,
    id: Date.now(), // Un ID semplice basato sul timestamp
    timestamp: new Date(),
    syncStatus: 'pending',
  };

  await db.syncQueue.add(eventoCompleto);
  console.log('Evento aggiunto alla coda di sincronizzazione:', eventoCompleto);
};

// Funzione per avviare il processo di sincronizzazione (può essere espansa)
export const triggerSync = () => {
  // In futuro, questo potrebbe inviare un evento al service worker 
  // o avviare direttamente il processo se online.
  console.log('Sincronizzazione triggerata...');
  // Per ora, ci affidiamo al service worker che periodicamente controlla la coda.
};
