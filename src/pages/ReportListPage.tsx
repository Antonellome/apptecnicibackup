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
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Report } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useData } from '@/hooks/useData';

const ReportListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tipiGiornata, loading: dataLoading } = useData();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // CIAO: Corretto il bug del loop infinito e assicurato il caricamento per utente
  useEffect(() => {
    // Eseguiamo il fetch solo se l'ID utente è disponibile e i dati di base sono caricati.
    if (user?.uid && !dataLoading) {
      const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
          const startDate = new Date(selectedYear, selectedMonth, 1);
          const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    
          const reportsQuery = query(
            collection(db, 'rapportini'),
            // Filtro per l'ID del tecnico loggato
            where('tecnicoId', '==', user.uid),
            // Filtro per il range di date selezionato
            where('data', '>=', Timestamp.fromDate(startDate)),
            where('data', '<=', Timestamp.fromDate(endDate)),
            orderBy('data', 'desc')
          );
    
          const reportSnapshot = await getDocs(reportsQuery);
          const reportList = reportSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              data: data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data),
              oreLavoro: data.oreLavoro || 0,
            } as Report;
          });
    
          setReports(reportList);
    
        } catch (err) {
          console.error("Errore nel caricamento dei report:", err);
          setError('Impossibile caricare la lista dei report.');
        } finally {
          setLoading(false);
        }
      };

      fetchReports();
    }
  // La dipendenza user.uid risolve il loop, l'effetto si attiva solo se cambia l'ID utente.
  }, [user?.uid, selectedMonth, selectedYear, dataLoading]);

  const getTipoGiornataNome = (tipoId: string): string => {
    const tipo = tipiGiornata.find(t => t.id === tipoId);
    return tipo ? tipo.nome : 'Non specificato';
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    name: format(new Date(0, i), 'MMMM', { locale: it })
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          I Miei Rapportini
        </Typography>
        <Button variant="contained" onClick={() => navigate('/rapportino/nuovo')}>
          Nuovo Rapportino
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Mese</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as number)}
                label="Mese"
              >
                {months.map(month => (
                  <MenuItem key={month.value} value={month.value}>{month.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Anno</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                label="Anno"
              >
                {years.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {(loading || dataLoading) && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !dataLoading && !error && (
        <List>
          {reports.length > 0 ? (
            reports.map((report) => (
              <ListItem 
                key={report.id} 
                divider 
                button
                onClick={() => navigate(`/rapportino/edit/${report.id}`)}
                sx={{ backgroundColor: 'background.paper', mb: 1, borderRadius: 1 }}
              >
                <ListItemText 
                  primary={`${format(report.data, 'dd/MM/yyyy')} - ${getTipoGiornataNome(report.tipoGiornataId)}`}
                  secondary={`Ore lavorate: ${report.oreLavoro.toFixed(2)}`}
                />
              </ListItem>
            ))
          ) : (
            <Typography sx={{textAlign: 'center', p: 3}}>Nessun report trovato per il periodo selezionato.</Typography>
          )}
        </List>
      )}
    </Box>
  );
};

export default ReportListPage;
