import React, { useEffect, useCallback, useState } from 'react';
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAuth } from '@/hooks/useAuth';
import { syncNotifiche, marcaNotificaComeLetta, eliminaNotifica } from '@/services/notification-service'; // Aggiunto importa eliminaNotifica
import { NotificationItem } from '@/components/notifiche/NotificationItem';
import { db } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const notifiche = useLiveQuery(() => db.notifiche.orderBy('createdAt').reverse().toArray());

    const handleSync = useCallback(async () => {
        setIsSyncing(true);
        setError(null);
        try {
            const success = await syncNotifiche();
            if (!success) {
                setError("Sincronizzazione fallita. Riprova più tardi.");
            }
        } catch (err) {
            setError("Errore critico durante la sincronizzazione.");
            console.error(err);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        handleSync();
    }, [handleSync]);

    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await marcaNotificaComeLetta(id);
        } catch (error) {
            console.error("Impossibile segnare la notifica come letta:", error);
        }
    }, []);

    // Funzione per gestire l'eliminazione, passata al componente figlio
    const handleDelete = useCallback(async (id: string) => {
        try {
            // La reattività di useLiveQuery rimuoverà l'elemento dalla UI
            await eliminaNotifica(id);
        } catch (error) {
            console.error("Impossibile eliminare la notifica:", error);
        }
    }, []);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Centro Notifiche
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {userProfile ? `Ciao ${userProfile.nome}, qui trovi tutte le tue comunicazioni.` : 'Qui trovi tutte le tue comunicazioni.'}
            </Typography>

            <Grid container sx={{ mb: 2 }} justifyContent="flex-end">
                <Grid>
                    <Button onClick={handleSync} disabled={isSyncing} variant="outlined">
                        {isSyncing ? <CircularProgress size={24} /> : 'Aggiorna'}
                    </Button>
                </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {notifiche === undefined ? (
                <Grid container justifyContent="center" alignItems="center" sx={{ height: '50vh' }}>
                    <CircularProgress />
                </Grid>
            ) : notifiche.length === 0 ? (
                <Grid container justifyContent="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Non ci sono notifiche per te.</Typography>
                </Grid>
            ) : (
                <Grid container spacing={2} sx={{ width: '100%' }}>
                    {notifiche.map((notification) => (
                        <Grid size={12} key={notification.id}>
                            <NotificationItem
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onDelete={handleDelete} // Passiamo la nuova funzione
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default NotifichePage;
