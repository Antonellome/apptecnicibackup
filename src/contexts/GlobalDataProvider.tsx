
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { 
    Rapportino, 
    Tecnico, 
    Ditta, 
    Categoria, 
    Veicolo, 
    Cliente, 
    TipoGiornata, 
    Nave, 
    Luogo, 
    WebAppUser, 
    Qualifica, 
    Documento
} from '@/models/definitions';

// Definizione del tipo Notification per coerenza
export interface Notification {
  id: string;
  title: string;
  message: string;
  recipientId: string;
  status: 'read' | 'unread';
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// Interfaccia del contesto unificata
export interface IGlobalDataContext {
  // Dati Master
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  ditte: Ditta[];
  categorie: Categoria[];
  veicoli: Veicolo[];
  clienti: Cliente[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  webAppUsers: WebAppUser[];
  qualifiche: Qualifica[];
  documenti: Documento[];
  
  // Mappe derivate
  ditteMap: Map<string, Ditta>;
  categorieMap: Map<string, Categoria>;
  tecniciMap: Map<string, Tecnico>;
  
  // Stato di caricamento
  loading: boolean;
  
  // Dati Notifiche
  notifications: Notification[];
  unreadNotificationsCount: number;

  // Funzioni
  markNotificationAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const GlobalDataContext = createContext<IGlobalDataContext | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData deve essere usato all\'interno di un GlobalDataProvider');
  }
  return context;
};

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stato per i dati master
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [ditte, setDitte] = useState<Ditta[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [webAppUsers, setWebAppUsers] = useState<WebAppUser[]>([]);
  const [qualifiche, setQualifiche] = useState<Qualifica[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  // Stato per le notifiche
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { user } = useAuth();

  // Effetto per il caricamento dei dati master
  useEffect(() => {
    const collections = [
      { name: 'rapportini', setter: setRapportini },
      { name: 'tecnici', setter: setTecnici },
      { name: 'ditte', setter: setDitte },
      { name: 'categorie', setter: setCategorie },
      { name: 'veicoli', setter: setVeicoli },
      { name: 'clienti', setter: setClienti },
      { name: 'tipiGiornata', setter: setTipiGiornata },
      { name: 'navi', setter: setNavi },
      { name: 'luoghi', setter: setLuoghi },
      { name: 'webAppUsers', setter: setWebAppUsers },
      { name: 'qualifiche', setter: setQualifiche },
      { name: 'documenti', setter: setDocumenti },
    ];

    let initialLoads = collections.length;
    const unsubscribes = collections.map(({ name, setter }) => {
      const collRef = collection(db, name as string);
      return onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any[]);
        if (initialLoads > 0) {
            initialLoads--;
            if (initialLoads === 0) setLoading(false);
        }
      }, (error) => {
        console.error(`Errore nel fetch di ${name}:`, error);
        initialLoads--;
        if (initialLoads === 0) setLoading(false);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Effetto per le notifiche, dipende dall'utente loggato
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    // *** NUOVA LOGICA: Carica TUTTE le notifiche per l'utente ***
    const q = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      setNotifications(userNotifications);
    }, (error) => {
      console.error("Errore nel fetch delle notifiche:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Mappe memoizzate per performance
  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  // Calcolo memoizzato delle notifiche non lette
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => n.status === 'unread').length;
  }, [notifications]);

  // Funzione per segnare come letta
  const markNotificationAsRead = useCallback(async (id: string) => {
    const notificationRef = doc(db, 'notifications', id);
    await updateDoc(notificationRef, {
      status: 'read',
      readAt: Timestamp.now(),
    });
  }, []);

  // *** NUOVA LOGICA: Funzione per eliminare una notifica ***
  const deleteNotification = useCallback(async (id: string) => {
    const notificationRef = doc(db, 'notifications', id);
    await deleteDoc(notificationRef);
  }, []);

  // Valore completo del contesto
  const value: IGlobalDataContext = {
    rapportini, tecnici, ditte, categorie, veicoli, clienti, tipiGiornata, navi, luoghi, webAppUsers, qualifiche, documenti,
    ditteMap, categorieMap, tecniciMap,
    loading,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    deleteNotification, // Esponiamo la nuova funzione
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
};
