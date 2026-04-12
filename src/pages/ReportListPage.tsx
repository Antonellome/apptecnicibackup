import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Paper,
  ListItemButton,
  Divider,
  Chip
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/contexts/MasterDataProvider'; // CORREZIONE: Uso del nuovo MasterDataProvider
import { Rapportino, EnrichedRapportino } from '@/models/definitions';

const ReportListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { masterData, loading: masterDataLoading } = useMasterData(); // CORREZIONE: Chiamata al nuovo hook
  
  const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || masterDataLoading) { // CORREZIONE: Verifica del nuovo stato di caricamento
        if(!masterDataLoading) setLoading(false);
        return;
    }

    setLoading(true);

    const q = query(
      collection(db, "rapportini"), 
      where("presenze", "array-contains", user.uid),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        // CORREZIONE: Le mappe ora usano i dati da masterData
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
        const naviMap = new Map(masterData.navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map(l => [l.id, l.nome]));

        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Non Definito', colore: '#808080' };
            const destinazione = data.naveId ? naviMap.get(data.naveId) : (data.luogoId ? luoghiMap.get(data.luogoId) : 'Nessuna');

            return {
                ...data,
                id: doc.id,
                data: (data.data as Timestamp).toDate(),
                tipoGiornata: tipoGiornata,
                destinazione: destinazione || 'Non trovato',
            } as EnrichedRapportino;
        });

        setRapportini(enrichedData);
        setError(null);
      } catch(e) {
          console.error("Errore durante l'elaborazione dei rapportini: ", e);
          setError("Impossibile elaborare i dati dei rapportini.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Errore nel listener di Firestore: ", err);
      setError("Impossibile caricare i rapportini in tempo reale.");
      setLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [user, masterDataLoading, masterData]); // CORREZIONE: Dipendenze aggiornate

  const isLoading = loading || masterDataLoading; // CORREZIONE: Logica di caricamento aggiornata

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          I Miei Rapportini
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>
          Nuovo
        </Button>
      </Box>
      
      {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}>
              <CircularProgress />
          </Box>
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!isLoading && !error && (
        <Paper elevation={3} sx={{ mt: 2 }}>
          <List disablePadding>
            {rapportini.length > 0 ? (
              rapportini.map((report, index) => (
                  <Box key={report.id}>
                    <ListItem 
                        component={ListItemButton}
                        onClick={() => navigate(`/report/edit/${report.id}`)}
                    >
                      <ListItemText 
                        primaryTypographyProps={{ fontWeight: '500' }}
                        secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                        primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" component="span">
                                    {report.descrizioneBreve || report.destinazione}
                                </Typography>
                                <Chip 
                                    label={report.tipoGiornata.nome} 
                                    size="small"
                                    sx={{ backgroundColor: report.tipoGiornata.colore, color: 'white' }}
                                />
                            </Box>
                        }
                        secondary={`Data: ${format(report.data, 'dd/MM/yyyy', { locale: it })} - Ore: ${report.oreLavoro.toFixed(2)}`}
                      />
                    </ListItem>
                    {index < rapportini.length - 1 && <Divider component="li" />}
                  </Box>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
                Nessun rapportino trovato per te.
              </Typography>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReportListPage;
