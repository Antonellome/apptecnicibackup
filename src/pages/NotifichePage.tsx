import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Grid,
    Box,
    Chip
} from '@mui/material';
import { collection, query, where, orderBy, onSnapshot, Query } from 'firebase/firestore';
import { db as firestore } from '@/utils/firebase';
import { markNotificheAsRead } from '@/services/notificationService';
import { NotificationItem } from '@/components/notifiche/NotificationItem';
import type { Notifica } from '@/models/definitions';
import { AuthContext } from '@/contexts/AuthContextDefinition';

const DISMISSED_STORAGE_KEY = 'dismissed_notifications';

const getDismissedNotifiche = (): string[] => {
    try {
        const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Errore nel leggere le notifiche nascoste:", error);
        return [];
    }
};

const NotifichePage: React.FC = () => {
    const authContext = useContext(AuthContext);
    const userProfile = authContext?.userProfile;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifiche, setNotifiche] = useState<Notifica[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedNotifiche);

    useEffect(() => {
        if (!userProfile?.tecnicoId) {
            setLoading(false);
            setError("Profilo utente non caricato o incompleto. Impossibile caricare le notifiche.");
            return;
        }

        setLoading(true);
        const notificheCollection = collection(firestore, 'notifiche');
        const allNotifiche: { [id: string]: Notifica } = {};

        const queries: Query[] = [];

        // 1. Query per notifiche dirette
        queries.push(query(notificheCollection, where('tecnicoId', '==', userProfile.tecnicoId)));

        // 2. Query per notifiche di categoria (se l'utente ha una categoria)
        if (userProfile.categoriaId) {
            queries.push(query(notificheCollection, where('categoriaId', '==', userProfile.categoriaId)));
        }

        // 3. Query per notifiche globali
        queries.push(query(notificheCollection, where('target', '==', 'all')));

        const processSnapshot = (snapshot: any) => {
            snapshot.docs.forEach((doc: any) => {
                // Ignora documenti senza data, potrebbero essere risultati parziali
                if (doc.data().createdAt) {
                    allNotifiche[doc.id] = { id: doc.id, ...doc.data() } as Notifica;
                }
            });

            // Ordina per data (più recente prima)
            const mergedList = Object.values(allNotifiche).sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });

            setNotifiche(mergedList);
            setLoading(false);
        };
        
        const handleError = (err: Error) => {
            console.error("Errore durante l'ascolto delle notifiche:", err);
            setError("Impossibile caricare le notifiche. Il servizio potrebbe essere non disponibile.");
            setLoading(false);
        };

        // Iscrizione a tutte le query
        const unsubscribers = queries.map(q => onSnapshot(q, processSnapshot, handleError));

        // Cleanup
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };

    }, [userProfile]);

    useEffect(() => {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissedIds));
    }, [dismissedIds]);

    const handleMarkAsRead = async (id: string) => {
        const originalNotifiche = [...notifiche];
        setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n));
        try {
            await markNotificheAsRead([id]);
        } catch (error) {
            console.error("Errore server su markAsRead:", error);
            setNotifiche(originalNotifiche);
            setError("Impossibile segnare la notifica come letta.");
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadIds = notifiche.filter(n => !n.letta).map(n => n.id);
        if (unreadIds.length === 0) return;
        
        const originalNotifiche = [...notifiche];
        setNotifiche(prev => prev.map(n => ({ ...n, letta: true })));

        try {
            await markNotificheAsRead(unreadIds);
        } catch (error) {
            console.error("Errore server su markAllAsRead:", error);
            setNotifiche(originalNotifiche); // Ripristina in caso di errore
            setError("Impossibile segnare tutte le notifiche come lette.");
        }
    };

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
    };

    const handleRestoreDismissed = () => {
        setDismissedIds([]);
    };

    const visibleNotifiche = useMemo(() => {
        return notifiche.filter(n => !dismissedIds.includes(n.id));
    }, [notifiche, dismissedIds]);

    const unreadCount = useMemo(() => {
        return visibleNotifiche.filter(n => !n.letta).length;
    }, [visibleNotifiche]);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Centro Notifiche
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {userProfile ? `Ciao ${userProfile.nome}, qui trovi le tue comunicazioni.` : 'Qui trovi le tue comunicazioni.'}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box>
                    {dismissedIds.length > 0 && (
                        <Chip 
                            label={`Hai ${dismissedIds.length} notifiche nascoste`}
                            onDelete={handleRestoreDismissed} 
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Box>
                    <Button onClick={handleMarkAllAsRead} disabled={loading || unreadCount === 0} variant="text">
                        Segna tutte come lette
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Grid container justifyContent="center" sx={{ height: '50vh' }}> <CircularProgress /> </Grid>
            ) : visibleNotifiche.length === 0 ? (
                <Grid container direction="column" alignItems="center" justifyContent="center" sx={{ py: 8, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">Non ci sono nuove notifiche.</Typography>
                    <Typography color="text.secondary">Se hai nascosto delle notifiche, puoi ripristinarle.</Typography>
                </Grid>
            ) : (
                <Grid container spacing={2} sx={{ width: '100%' }}>
                    {visibleNotifiche.map((notification) => (
                        <Grid key={notification.id} size={12}>
                            <NotificationItem
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onDismiss={handleDismiss}
                            />
                        </Grid>
                    ))
                }
                </Grid>
            )}
        </Container>
    );
};

export default NotifichePage;
