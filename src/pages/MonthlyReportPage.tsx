
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow
} from '@mui/material';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/contexts/MasterDataProvider';
import { Rapportino, EnrichedRapportino, Tecnico } from '@/models/definitions';
import MonthlyReportGrid from '@/components/Rapportini/MonthlyReportGrid';
import ReportMensileDialog from '@/components/Rapportini/ReportMensileDialog';

const ReportMensilePage = () => {
  const { user } = useAuth();
  const { masterData, loading: masterDataLoading } = useMasterData();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<EnrichedRapportino | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || masterDataLoading || !masterData) {
        if(!masterDataLoading) setLoading(false);
        return;
    }

    setLoading(true);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = query(
      collection(db, "rapportini"), 
      where("tecnicoId", "==", user.uid),
      where("data", ">=", Timestamp.fromDate(start)),
      where("data", "<=", Timestamp.fromDate(end)),
      orderBy("data", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
        const tecniciMap = new Map(masterData.tecnici.map(t => [t.id, t]));

        const enrichedData = querySnapshot.docs.map(doc => {
            const data = doc.data() as Rapportino;
            const reportDate = (data.data as Timestamp).toDate();
            const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Non Definito', colore: '#808080' };
            const presenzeArricchite = (data.presenze || []).map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);

            return {
                ...data,
                id: doc.id,
                data: reportDate,
                tipoGiornata: tipoGiornata,
                presenze: presenzeArricchite,
            } as EnrichedRapportino;
        });

        setRapportini(enrichedData);
        setError(null);
      } catch(e) {
          console.error("Errore durante l'elaborazione dei report mensili: ", e);
          setError("Impossibile elaborare i dati dei report.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Errore nel listener di Firestore: ", err);
      setError("Impossibile caricare i report in tempo reale.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, masterDataLoading, masterData, currentMonth]);
  
  const handleMonthChange = (increment: number) => {
      setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const handleDayClick = (report: EnrichedRapportino) => {
      setSelectedReport(report);
      setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
      setIsDialogOpen(false);
      setSelectedReport(null);
  };

  const oreTotaliMese = useMemo(() => {
    return rapportini.reduce((total, report) => {
        const reportHours = (report.dettaglioOreTecnici || []).reduce((acc, curr) => acc + (curr.ore || 0), 0);
        return total + reportHours;
    }, 0);
  }, [rapportini]);

  const today = new Date();
  const isNextButtonDisabled = isSameMonth(currentMonth, today);

  const isLoading = loading || masterDataLoading;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Report Mensile
      </Typography>

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

      {!isLoading && !error && masterData && (
        <>
            <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
                <Typography variant="h5" gutterBottom>Riepilogo del Mese</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell><Typography fontWeight="bold">Ore Lavorate Totali</Typography></TableCell>
                                <TableCell align="right"><Typography variant="h6">{oreTotaliMese.toFixed(2)}</Typography></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <MonthlyReportGrid 
                rapportini={rapportini} 
                tipiGiornata={masterData.tipiGiornata}
                currentMonth={currentMonth} 
                onDayClick={handleDayClick}
            />
        </>
      )}

      <ReportMensileDialog 
        open={isDialogOpen}
        onClose={handleCloseDialog}
        report={selectedReport}
      />

    </Box>
  );
};

export default ReportMensilePage;
