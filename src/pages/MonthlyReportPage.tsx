import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Report, TipoGiornata, EnrichedReport } from '@/models/definitions';
import { format } from 'date-fns';
import ReportMensileDialog from '@/components/ReportMensileDialog';

// Funzione helper per convertire in modo sicuro a Date
const toDate = (date: any): Date => {
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  if (date instanceof Date) {
    return date;
  }
  // Prova a parsare stringhe o numeri, anche se Firestore dovrebbe dare Timestamp
  return new Date(date);
};

const MonthlyReportPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReports(currentMonth);
    }
  }, [user, currentMonth]);

  const fetchReports = async (date: Date) => {
    setLoading(true);
    setError('');
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const reportsQuery = query(
        collection(db, 'rapportini'),
        where('tecnicoId', '==', user!.uid),
        where('data', '>=', Timestamp.fromDate(startOfMonth)),
        where('data', '<=', Timestamp.fromDate(endOfMonth))
      );

      const reportSnapshot = await getDocs(reportsQuery);
      const reportList = reportSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Report[];

      const tipiGiornataSnapshot = await getDocs(collection(db, 'tipiGiornata'));
      const tipiGiornataMap = new Map<string, TipoGiornata>();
      tipiGiornataSnapshot.forEach(doc => {
          tipiGiornataMap.set(doc.id, doc.data() as TipoGiornata);
      });

      const enrichedReports = reportList.map(report => {
        const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId);
        
        return {
          ...report,
          data: toDate(report.data), // Conversione sicura
          // Forniamo un fallback per tipoGiornata per evitare errori se non trovato
          tipoGiornata: tipoGiornata || { nome: 'Non definito', colore: '#808080', lavorativo: false, icona: 'help' },
          // Forniamo un fallback per i valori numerici per i calcoli
          oreLavoro: report.oreLavoro || 0,
          costoTrasferta: report.costoTrasferta || 0,
        };
      });

      setReports(enrichedReports);
    } catch (err) {
      console.error("Errore nel fetchReports:", err);
      setError('Impossibile caricare i report mensili.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calculateTotals = () => {
    return reports.reduce((acc, report) => {
        acc.oreLavoro += report.oreLavoro;
        acc.costoTrasferta += report.costoTrasferta;
        return acc;
    }, { oreLavoro: 0, costoTrasferta: 0 });
  };

  const totals = calculateTotals();

  // La struttura del componente (il JSX) rimane identica a prima.
  // Le modifiche sono solo nella logica di recupero e preparazione dei dati.
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Report Mensile
      </Typography>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={handlePreviousMonth}>Mese Precedente</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy')}</Typography>
        <Button variant="outlined" onClick={handleNextMonth}>Mese Successivo</Button>
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo Giornata</TableCell>
                  <TableCell align="right">Ore Lavoro</TableCell>
                  <TableCell align="right">Costo Trasferta (&euro;)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{format(report.data, 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: report.tipoGiornata.colore, mr: 1 }} />
                        {report.tipoGiornata.nome}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{report.oreLavoro.toFixed(2)}</TableCell>
                    <TableCell align="right">{report.costoTrasferta.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                 <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                    <TableCell colSpan={2} align="right">Totale</TableCell>
                    <TableCell align="right">{totals.oreLavoro.toFixed(2)}</TableCell>
                    <TableCell align="right">{totals.costoTrasferta.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => setModalOpen(true)}>Visualizza Consuntivo</Button>
          </Box>
          <ReportMensileDialog 
              open={isModalOpen} 
              onClose={() => setModalOpen(false)}
              reports={reports}
              month={format(currentMonth, 'MMMM yyyy')}
          />
        </>
      )}
    </Box>
  );
};

export default MonthlyReportPage;
