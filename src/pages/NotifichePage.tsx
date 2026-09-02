import React, { useState, useEffect, useMemo } from 'react';
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
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { markNotificheAsRead } from '@/services/notificationService';
import { NotificationItem } from '@/components/notifiche/NotificationItem';
import type { Notifica } from '@/models/definitions';
import { useAuth } from '@/hooks/useAuth';

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
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifiche, setNotifiche] = useState<Notifica[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedNotifiche);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Devi essere autenticato per vedere le notifiche.");
            return;
        }

        setLoading(true);
        const notificheCollection = collection(db, 'notifiche');
        const q = query(
            notificheCollection,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
            setNotifiche(data);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Impossibile caricare le notifiche in tempo reale. Riprova più tardi.");
            setLoading(false);
        });

        // Cleanup: disiscrizione dal listener quando il componente viene smontato
        return () => unsubscribe();
    }, [user]);

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
            setNotifiche(originalNotifiche); // Ripristina lo stato ottimistico in caso di errore
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
            setNotifiche(originalNotifiche); // Ripristina lo stato ottimistico
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
                        <Grid size={12} key={notification.id}>
                            <NotificationItem
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onDismiss={handleDismiss}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default NotifichePage;
