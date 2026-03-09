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
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino, TipoGiornata, EnrichedRapportino, Tecnico } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import ReportMensileDialog from '@/components/ReportMensileDialog';

const convertTimestamp = (ts: unknown): Date | undefined => {
  if (ts instanceof Timestamp) {
    return ts.toDate();
  }
  return undefined;
};

const MonthlyReportPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<EnrichedRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setModalOpen] = useState(false);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  const [tariffe, setTariffe] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.uid) {
        try {
            const savedTariffeJSON = localStorage.getItem(`tariffe_${user.uid}`);
            if (savedTariffeJSON) {
                setTariffe(JSON.parse(savedTariffeJSON));
            }
        } catch (error) {
            console.error("Errore nel caricamento delle tariffe da localStorage:", error);
        }
    }
}, [user]);

  useEffect(() => {
    const fetchReports = async (date: Date) => {
      setLoading(true);
      setError('');
      try {
        if (!user) return;

        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const reportsQuery = query(
          collection(db, 'rapportini'),
          where('tecnicoId', '==', user.uid),
          where('data', '>=', Timestamp.fromDate(startOfMonth)),
          where('data', '<=', Timestamp.fromDate(endOfMonth))
        );

        const [reportSnapshot, tipiGiornataSnapshot, tecniciSnapshot] = await Promise.all([
          getDocs(reportsQuery),
          getDocs(collection(db, 'tipiGiornata')),
          getDocs(collection(db, 'tecnici'))
        ]);

        const reportList = reportSnapshot.docs.map(doc => ({ ...(doc.data() as Omit<Rapportino, 'id'>), id: doc.id }));

        const tipiGiornataMap = new Map<string, TipoGiornata>();
        const tipiGiornataList: TipoGiornata[] = [];
        tipiGiornataSnapshot.forEach(doc => {
          const data = { ...(doc.data() as Omit<TipoGiornata, 'id'>), id: doc.id };
          tipiGiornataMap.set(doc.id, data);
          tipiGiornataList.push(data);
        });
        setTipiGiornata(tipiGiornataList);

        const tecniciMap = new Map<string, Tecnico>();
        tecniciSnapshot.forEach(doc => {
            const data = { ...(doc.data() as Omit<Tecnico, 'id'>), id: doc.id };
            tecniciMap.set(doc.id, data);
        });

        const enrichedReports = reportList.map(report => {
          const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId);
          const tecnicoId = report.tecnicoId || report.tecnicoScriventeId;
          const tecnicoScrivente = tecnicoId ? tecniciMap.get(tecnicoId) : undefined;
          const presenze = report.presenze?.map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);

          return {
            ...report,
            data: (report.data as unknown as Timestamp).toDate(),
            oraInizio: convertTimestamp(report.oraInizio),
            oraFine: convertTimestamp(report.oraFine),
            tipoGiornata: tipoGiornata || { id: 'non-definito', nome: 'Non definito', colore: '#808080', lavorativo: false, icona: 'help' },
            oreLavoro: report.oreLavoro || 0,
            tecnicoScrivente,
            presenze,
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

    if (user) {
      fetchReports(currentMonth);
    }
  }, [user, currentMonth]);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calculateTotals = () => {
    return reports.reduce((acc, report) => {
        acc.oreLavoro += report.oreLavoro;
        return acc;
    }, { oreLavoro: 0 });
  };

  const totals = calculateTotals();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Report Mensile
      </Typography>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={handlePreviousMonth}>Mese Precedente</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
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
                  </TableRow>
                ))}
                 <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                    <TableCell colSpan={2} align="right">Totale</TableCell>
                    <TableCell align="right">{totals.oreLavoro.toFixed(2)}</TableCell>
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
              currentMonth={currentMonth}
              tipiGiornata={tipiGiornata}
              tariffe={tariffe}
          />
        </>
      )}
    </Box>
  );
};

export default MonthlyReportPage;
