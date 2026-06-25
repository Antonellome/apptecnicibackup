import React, { useEffect, useCallback, useState } from 'react';
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Grid
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { syncNotifiche, marcaNotificaComeLetta } from '@/services/notification-service';
import { NotificationItem } from '@/components/notifiche/NotificationItem';
import { db } from '@/db/local-db';
import { useLiveQuery } from 'dexie-react-hooks';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const notifiche = useLiveQuery(() => db.notifiche.orderBy('createdAt').reverse().toArray(), []);

    const handleSync = useCallback(async () => {
        setLoading(true);
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
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handleSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await marcaNotificaComeLetta(id);
        } catch (error) {
            console.error("Impossibile segnare la notifica come letta:", error);
        }
    };

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
                    <Button onClick={handleSync} disabled={loading} variant="outlined">
                        {loading ? <CircularProgress size={24} /> : 'Aggiorna'}
                    </Button>
                </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading && !notifiche ? (
                 <Grid container justifyContent="center" alignItems="center" sx={{ height: '50vh' }}>
                    <CircularProgress />
                </Grid>
            ) : notifiche && notifiche.length === 0 ? (
                <Grid container justifyContent="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Non ci sono notifiche per te.</Typography>
                </Grid>
            ) : (
                <Grid container spacing={2} sx={{ width: '100%' }}>
                    {notifiche?.map((notification) => (
                        // *** LA VERA CORREZIONE V2 ***
                        // Sostituito `xs={12}` con `size={12}` per aderire alla spec v2
                        <Grid size={12} key={notification.id}>
                            <NotificationItem 
                                notification={notification} 
                                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default NotifichePage;
