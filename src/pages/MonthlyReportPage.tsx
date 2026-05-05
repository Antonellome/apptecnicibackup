
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { doc, onSnapshot, collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths, isBefore, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import ReportMensileDialog from '@/components/ReportMensileDialog';
import { Rapportino, Tecnico, EnrichedRapportino, TipoGiornata } from '@/models/definitions';
import { useMasterData } from '@/contexts/MasterDataProvider';

interface RiepilogoMensile {
  totalOreLavoro: number;
  totalGiorniFerie: number;
  totalGiorniAltro: number;
  updatedAt: Timestamp;
}

const MonthlyReportPage = () => {
  const { user } = useAuth();
  const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [summary, setSummary] = useState<RiepilogoMensile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [details, setDetails] = useState<EnrichedRapportino[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsVisible, setDetailsVisible] = useState(false);
  
  const [isModalOpen, setModalOpen] = useState(false);

  const monthId = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError('');
    setDetailsVisible(false);
    setDetails([]);
    setSummary(null);

    const summaryDocId = `${monthId}_${user.uid}`;
    const summaryRef = doc(db, 'riepiloghiMensili', summaryDocId);

    const unsubscribe = onSnapshot(summaryRef, (doc) => {
        setLoading(false);
        if (doc.exists()) {
            setSummary(doc.data() as RiepilogoMensile);
        } else {
            setSummary(null);
        }
    }, (err) => {
        console.error("Errore in onSnapshot:", err);
        setError("Errore durante l'ascolto degli aggiornamenti.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, monthId]);

  const handleShowDetails = async () => {
    if (!user || !masterData) return;
    
    setDetailsVisible(true);
    setLoadingDetails(true);
    setDetailsError('');
    try {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const reportsQuery = query(
            collection(db, 'rapportini'),
            where('presenze', 'array-contains', user.uid),
            where('data', '>=', Timestamp.fromDate(start)),
            where('data', '<=', Timestamp.fromDate(end))
        );

        const reportSnapshot = await getDocs(reportsQuery);
        
        const { tipiGiornata, tecnici, navi, luoghi, clienti, sedi } = masterData;
        const tipiGiornataMap = new Map(tipiGiornata.map(doc => [doc.id, doc]));
        const tecniciMap = new Map(tecnici.map(doc => [doc.id, doc]));
        const naviMap = new Map(navi.map(doc => [doc.id, doc]));
        const luoghiMap = new Map(luoghi.map(doc => [doc.id, doc]));
        const clientiMap = new Map(clienti.map(doc => [doc.id, doc]));
        const sediMap = new Map(sedi.map(doc => [doc.id, doc]));


        const enrichedReports: EnrichedRapportino[] = reportSnapshot.docs.map(doc => {
          const report = { ...doc.data(), id: doc.id } as Rapportino;
          const dettaglioPersonale = report.dettaglioOreTecnici?.find(d => d.tecnicoId === user.uid);
          const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId) as TipoGiornata;

          return {
            ...report,
            data: (report.data as Timestamp).toDate(),
            tipoGiornata: tipoGiornata,
            oreLavoro: dettaglioPersonale?.ore ?? report.oreLavoro,
            tecnicoScrivente: report.tecnicoId ? tecniciMap.get(report.tecnicoId) : undefined,
            presenze: report.presenze?.map(id => tecniciMap.get(id)).filter(Boolean) as Tecnico[],
            nave: report.naveId ? naviMap.get(report.naveId) : undefined,
            luogo: report.luogoId ? luoghiMap.get(report.luogoId) : undefined,
            cliente: report.clienteId ? clientiMap.get(report.clienteId) : undefined,
            sede: report.sedeId ? sediMap.get(report.sedeId) : undefined,
          };
        });
        setDetails(enrichedReports);
    } catch (err) {
        console.error("Errore handleShowDetails:", err);
        setDetailsError("Impossibile caricare il dettaglio dei rapportini.");
    } finally {
        setLoadingDetails(false);
    }
  };

  const handleMonthChange = (increment: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1));
  };

  // Logica per disabilitare i pulsanti
  const today = new Date();
  const minDate = startOfMonth(subMonths(today, 2));
  const isNextButtonDisabled = isSameMonth(currentMonth, today);
  const isPrevButtonDisabled = isSameMonth(currentMonth, minDate) || isBefore(currentMonth, minDate);
  
  const renderContent = () => {
      if (loading || masterDataLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
      if (error || masterDataError) return <Alert severity="error">{error || masterDataError?.message}</Alert>;

      const savedTariffeJSON = user ? localStorage.getItem(`tariffe_${user.uid}`) : null;
      const tariffe = savedTariffeJSON ? JSON.parse(savedTariffeJSON) : {};
      const hasTariffe = Object.keys(tariffe).length > 0;

      return (
        <>
          {summary ? (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>Riepilogo Ore</Typography>
                <Grid container spacing={2}>
                   <Grid size={{ xs: 12, sm: 4 }}><Typography variant="h6">{summary.totalOreLavoro.toFixed(2)}</Typography><Typography color="text.secondary">Ore Lavorate</Typography></Grid>
                   <Grid size={{ xs: 12, sm: 4 }}><Typography variant="h6">{summary.totalGiorniFerie}</Typography><Typography color="text.secondary">Giorni di Ferie</Typography></Grid>
                   <Grid size={{ xs: 12, sm: 4 }}><Typography variant="h6">{summary.totalGiorniAltro}</Typography><Typography color="text.secondary">Altri Giorni di Assenza</Typography></Grid>
                </Grid>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Ultimo agg: {summary.updatedAt ? format(summary.updatedAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}</Typography>
              </CardContent>
            </Card>
          ) : (
            null
          )}
          {!detailsVisible ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><Button variant="text" onClick={handleShowDetails}>Mostra Dettaglio Giornaliero</Button></Box>
          ) : (
            <>
              {loadingDetails && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
              {detailsError && <Alert severity="error">{detailsError}</Alert>}
              {!loadingDetails && !detailsError && (
                <>
                  <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table><TableHead><TableRow><TableCell>Data</TableCell><TableCell>Tipo Giornata</TableCell><TableCell align="right">Ore</TableCell></TableRow></TableHead>
                      <TableBody>
                        {details.map((r) => (<TableRow key={r.id}><TableCell>{format(r.data, 'dd/MM/yyyy')}</TableCell><TableCell>{r.tipoGiornata.nome}</TableCell><TableCell align="right">{r.oreLavoro.toFixed(2)}</TableCell></TableRow>))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ mt: 3, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Resoconto Analitico</Typography>
                    {!hasTariffe ? (
                        <Alert severity="warning">
                            Per visualizzare il resoconto analitico dei guadagni, devi prima impostare le tue tariffe orarie.
                            <Button component={Link} to="/impostazioni" color="primary" sx={{ ml: 2 }}>Vai a Impostazioni</Button>
                        </Alert>
                    ) : (
                        <Button variant="contained" onClick={() => setModalOpen(true)} disabled={details.length === 0}>Visualizza Consuntivo Guadagni</Button>
                    )}
                  </Box>

                  {hasTariffe && <ReportMensileDialog open={isModalOpen} onClose={() => setModalOpen(false)} reports={details} currentMonth={currentMonth} tariffe={tariffe} />}
                </>
              )}
            </>
          )}
        </>
      );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Report Mensile</Typography>
      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)} disabled={isPrevButtonDisabled}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
      </Paper>
      {renderContent()}
    </Box>
  );
};

export default MonthlyReportPage;
