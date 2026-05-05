
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
  Chip,
  IconButton,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/contexts/MasterDataProvider';
import { Rapportino, EnrichedRapportino, Tecnico } from '@/models/definitions';

const ReportListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { masterData, loading: masterDataLoading } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || masterDataLoading) {
        if(!masterDataLoading) setLoading(false);
        return;
    }

    if (!masterData) {
        setError("Dati anagrafici non disponibili.");
        setLoading(false);
        return;
    }

    setLoading(true);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = query(
      collection(db, "rapportini"), 
      where("presenze", "array-contains", user.uid),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
        const naviMap = new Map(masterData.navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map(l => [l.id, l.nome]));
        const tecniciMap = new Map(masterData.tecnici.map(t => [t.id, t]));

        const today = new Date();
        const isGracePeriod = today.getDate() <= 10;
        const currentMonthDate = today;
        const previousMonthDate = subMonths(today, 1);

        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            const reportDate = (data.data as Timestamp).toDate();
            const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Non Definito', colore: '#808080' };
            const destinazione = data.naveId ? naviMap.get(data.naveId) : (data.luogoId ? luoghiMap.get(data.luogoId) : 'Nessuna');
            const presenzeArricchite = (data.presenze || []).map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);
            
            const isReportInCurrentMonth = isSameMonth(reportDate, currentMonthDate);
            const isReportInPreviousMonth = isSameMonth(reportDate, previousMonthDate);
            const isEditable = isReportInCurrentMonth || (isGracePeriod && isReportInPreviousMonth);

            return {
                ...data,
                id: doc.id,
                data: reportDate,
                isEditable: isEditable,
                tipoGiornata: tipoGiornata,
                destinazione: destinazione || 'Non trovato',
                presenze: presenzeArricchite,
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
  const minDate = startOfMonth(subMonths(today, 2));
  const isNextButtonDisabled = isSameMonth(currentMonth, today);
  const isPrevButtonDisabled = isSameMonth(currentMonth, minDate);

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
        <Button variant="outlined" onClick={() => handleMonthChange(-1)} disabled={isPrevButtonDisabled}>Mese Prec.</Button>
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
                        secondary={`Data: ${format(report.data, 'dd/MM/yyyy', { locale: it })} - Ore: ${report.oreLavoro.toFixed(2)}`}
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
