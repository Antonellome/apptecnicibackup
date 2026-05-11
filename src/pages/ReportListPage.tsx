
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
  IconButton,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData'; // CORREZIONE DEFINITIVA
import { Rapportino, EnrichedRapportino } from '@/models/definitions';

const ReportListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // CORREZIONE: Sostituisco il vecchio hook `useMasterData` con `useLocalData`
  const { data: masterData, loading: masterDataLoading } = useLocalData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || masterDataLoading) {
        // Se i dati master non sono ancora caricati, attendiamo.
        if(!masterDataLoading) setLoading(false);
        return;
    }

    if (!masterData) {
        setError("Dati anagrafici non disponibili. Sincronizzazione in corso o fallita.");
        setLoading(false);
        return;
    }

    setLoading(true);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // CORREZIONE: La query ora filtra per `tecnicoId` (l'autore del report) e non più per `presenze`
    const q = query(
      collection(db, "rapportini"), 
      where("tecnicoId", "==", user.uid),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
        const naviMap = new Map(masterData.navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map(l => [l.id, l.nome]));

        const today = new Date();

        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            const reportDate = (data.data as Timestamp).toDate();
            const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Non Definito' };
            const destinazione = data.naveId ? naviMap.get(data.naveId) : (data.luogoId ? luoghiMap.get(data.luogoId) : 'Nessuna');
            
            const reportMonth = startOfMonth(reportDate);
            const currentActiveMonth = startOfMonth(new Date());
            const previousMonth = startOfMonth(subMonths(new Date(), 1));

            let isEditable = false;
            if (user.isAdmin) {
                isEditable = true; // Gli admin possono modificare tutto, sempre.
            } else {
                if (isSameMonth(reportMonth, currentActiveMonth)) {
                    isEditable = true;
                } else if (isSameMonth(reportMonth, previousMonth) && today.getDate() <= 10) {
                    isEditable = true; // Periodo di grazia
                }
            }

            return {
                ...data,
                id: doc.id,
                data: reportDate,
                isEditable: isEditable,
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

    return () => unsubscribe();
  }, [user, masterDataLoading, masterData, currentMonth]);
  
  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  const today = new Date();
  const isNextButtonDisabled = isSameMonth(currentMonth, today);

  const isLoading = loading || masterDataLoading;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          I Miei Report
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')}>
          Nuovo
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
      </Paper>
      
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
                        component={report.isEditable ? ListItemButton : 'div'}
                        onClick={report.isEditable ? () => navigate(`/report/edit/${report.id}`) : undefined}
                        sx={{ opacity: report.isEditable ? 1 : 0.7 }}
                        secondaryAction={
                            report.isEditable ? (
                                <Typography variant="body2" color="text.secondary" sx={{pr: 2}}>
                                    {report.tipoGiornata.nome}
                                </Typography>
                            ) : (
                                <IconButton edge="end" aria-label="locked" disabled>
                                    <LockIcon />
                                </IconButton>
                            )
                        }
                    >
                      <ListItemText 
                        primaryTypographyProps={{ fontWeight: '500' }}
                        secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                        primary={
                            <Typography variant="subtitle1" component="span">
                                {report.descrizioneBreve || report.destinazione}
                            </Typography>
                        }
                        secondary={`Data: ${format(report.data, 'dd/MM/yyyy', { locale: it })} - Ore: ${(() => {
                            const userOreDetail = (report.dettaglioOreTecnici || []).find(d => d.tecnicoId === user.uid);
                            return userOreDetail ? (userOreDetail.ore || 0).toFixed(2) : 'N/A';
                        })()}`}
                      />
                    </ListItem>
                    {index < rapportini.length - 1 && <Divider component="li" />}
                  </Box>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>
                Nessun report trovato per il mese selezionato.
              </Typography>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReportListPage;
