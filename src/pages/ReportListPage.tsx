import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemText, Button, CircularProgress, Alert, Paper, Grid } from '@mui/material';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Report, TipoGiornata } from '@/models/definitions'; // Usiamo Report, che dovrebbe essere più completo
import { format } from 'date-fns';
import { useData } from '@/hooks/useData'; // Importiamo il nostro nuovo hook!

// Filtri rapidi per le date
const dateFilters = [
  { label: 'Oggi', days: 0 },
  { label: 'Ieri', days: 1 },
  { label: 'Ultimi 7 giorni', days: 7 },
  { label: 'Ultimi 30 giorni', days: 30 },
];

const ReportListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tipiGiornata, loading: dataLoading } = useData(); // Otteniamo i tipiGiornata dal contesto globale!

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<number | null>(7); // Default a 7 giorni

  useEffect(() => {
    if (user && !dataLoading) { // Aspettiamo che anche i dati globali siano pronti
      fetchReports();
    }
  }, [user, selectedDateFilter, dataLoading]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const endDate = new Date();
      let startDate = new Date();

      if (selectedDateFilter !== null) {
        startDate.setDate(endDate.getDate() - selectedDateFilter);
      }

      const reportsQuery = query(
        collection(db, 'rapportini'),
        where('tecnicoId', '==', user!.uid),
        where('data', '>=', Timestamp.fromDate(startDate)),
        where('data', '<=', Timestamp.fromDate(endDate))
      );

      const reportSnapshot = await getDocs(reportsQuery);
      const reportList = reportSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Conversione sicura della data
          data: data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data),
          oreLavoro: data.oreLavoro || 0, // Fallback per i numeri
        } as Report;
      });

      setReports(reportList);

    } catch (err) {
      console.error(err);
      setError('Impossibile caricare la lista dei report.');
    } finally {
      setLoading(false);
    }
  };

  const getTipoGiornataNome = (tipoId: string): string => {
    const tipo = tipiGiornata.find(t => t.id === tipoId);
    return tipo ? tipo.nome : 'Non specificato';
  };
  
  // Il JSX rimane strutturalmente identico.
  // Le modifiche riguardano come otteniamo e visualizziamo i dati (es. getTipoGiornataNome)
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          I Miei Rapportini
        </Typography>
        <Button variant="contained" onClick={() => navigate('/report/nuovo')}>
          Nuovo Report
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Filtra per periodo</Typography>
        <Grid container spacing={1}>
          {dateFilters.map(filter => (
            <Grid item key={filter.label}>
              <Button 
                variant={selectedDateFilter === filter.days ? 'contained' : 'outlined'}
                onClick={() => setSelectedDateFilter(filter.days)}
              >
                {filter.label}
              </Button>
            </Grid>
          ))}
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
                onClick={() => navigate(`/report/edit/${report.id}`)}
                sx={{ backgroundColor: 'background.paper', mb: 1, borderRadius: 1 }}
              >
                <ListItemText 
                  primary={`${format(report.data, 'dd/MM/yyyy')} - ${getTipoGiornataNome(report.tipoGiornataId)}`}
                  secondary={`Ore lavorate: ${report.oreLavoro.toFixed(2)}`}
                />
              </ListItem>
            ))
          ) : (
            <Typography>Nessun report trovato per il periodo selezionato.</Typography>
          )}
        </List>
      )}
    </Box>
  );
};

export default ReportListPage;
