import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Box,
    AlertTitle,
    Stack
} from '@mui/material';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '@/utils/firebase';
import { markNotificheAsRead } from '@/services/notificationService';
import { NotificationItem } from '@/components/notifiche/NotificationItem';
import type { Notifica } from '@/models/definitions';
import { AuthContext } from '@/contexts/AuthContextDefinition';

const DISMISSED_STORAGE_KEY = 'dismissed_notifications';
const DELETED_STORAGE_KEY = 'deleted_notifications';

const getStoredIds = (key: string): string[] => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error(`Errore lettura da localStorage (${key}):`, error);
        return [];
    }
};

const NotifichePage: React.FC = () => {
    // CORREZIONE: Gestione sicura del contesto che potrebbe essere undefined
    const authContext = useContext(AuthContext);
    const userProfile = authContext?.userProfile;

    const [notifiche, setNotifiche] = useState<Notifica[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => getStoredIds(DISMISSED_STORAGE_KEY));
    const [deletedIds, setDeletedIds] = useState<string[]>(() => getStoredIds(DELETED_STORAGE_KEY));
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userProfile?.tecnicoId) {
            setLoading(false);
            setError("Profilo utente non disponibile.");
            return;
        }

        setLoading(true);
        const q = query(collection(firestore, "notifiche"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serverNotifiche = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
            
            const userNotifiche = serverNotifiche.filter(n => 
                n.target === 'all' || 
                n.tecnicoId === userProfile.tecnicoId ||
                (n.categoriaId && n.categoriaId === userProfile.categoriaId)
            ).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            setNotifiche(userNotifiche);
            setLoading(false);
        }, (err) => {
            console.error("Errore ricezione notifiche:", err);
            setError("Impossibile caricare le notifiche.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    useEffect(() => {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissedIds));
    }, [dismissedIds]);

    useEffect(() => {
        localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedIds));
    }, [deletedIds]);

    const handleMarkAsRead = useCallback(async (id: string) => {
        // Aggiornamento ottimistico: UI aggiornata subito
        setNotifiche(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await markNotificheAsRead([id]);
        } catch (error) {
            console.error("DB Error - Mark as read failed:", error);
            // Rollback in caso di fallimento
            setNotifiche(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
        }
    }, []);

    const handleDismiss = useCallback((id: string) => {
        setDismissedIds(prev => [...new Set([...prev, id])]);
    }, []);

    const handleRestoreDismissed = useCallback(() => {
        setDismissedIds([]);
    }, []);
    
    const handleClearDismissed = useCallback(() => {
        // Sposta gli ID da "nascosti" a "cancellati"
        setDeletedIds(prev => [...new Set([...prev, ...dismissedIds])]);
        // Svuota la lista dei nascosti
        setDismissedIds([]);
    }, [dismissedIds]);

    const visibleNotifiche = useMemo(() => {
        // Mostra solo le notifiche che NON sono né nascoste né cancellate
        return notifiche.filter(n => !dismissedIds.includes(n.id) && !deletedIds.includes(n.id));
    }, [notifiche, dismissedIds, deletedIds]);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>Centro Notifiche</Typography>
            
            {dismissedIds.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Hai {dismissedIds.length} notifiche nascoste.</AlertTitle>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={handleRestoreDismissed} color="inherit" size="small">Ripristina</Button>
                        <Button onClick={handleClearDismissed} color="inherit" size="small">Cancella</Button>
                    </Stack>
                </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
            ) : visibleNotifiche.length === 0 ? (
                <Box textAlign="center" py={5}>
                    <Typography variant="h6" color="text.secondary">Non ci sono nuove notifiche.</Typography>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {visibleNotifiche.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDismiss={handleDismiss}
                        />
                    ))}
                </Stack>
            )}
        </Container>
    );
};

export default NotifichePage;
