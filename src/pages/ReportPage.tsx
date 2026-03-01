import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Report, EnrichedReport, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Row = ({ report }: { report: EnrichedReport }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {format(report.data, 'dd/MM/yyyy', { locale: it })}
        </TableCell>
        <TableCell>{report.nave?.nome || report.luogo?.nome || 'N/D'}</TableCell>
        <TableCell>{report.tipoGiornata.nome}</TableCell>
        <TableCell align="right">{report.oreLavoro.toFixed(2)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Dettagli Rapportino
              </Typography>
              <Typography variant="body2"><strong>Descrizione:</strong> {report.descrizioneBreve}</Typography>
              <Typography variant="body2"><strong>Ore Viaggio:</strong> {report.oreViaggio?.toString() || '-'}</Typography>
              <Typography variant="body2"><strong>Note:</strong> {report.note || '-'}</Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ReportPage = () => {
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // CIAO: Stati per mese e anno
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { navi, luoghi, tipiGiornata } = useMemo(() => {
    // Dati che potremmo voler caricare una sola volta
    return {
        navi: [] as Nave[], // da caricare
        luoghi: [] as Luogo[], // da caricare
        tipiGiornata: new Map<string, TipoGiornata>() // da caricare
    };
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const naviSnapshot = await getDocs(collection(db, 'navi'));
            const naviData = naviSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Nave[];

            const luoghiSnapshot = await getDocs(collection(db, 'luoghi'));
            const luoghiData = luoghiSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Luogo[];

            const tipiGiornataSnapshot = await getDocs(collection(db, 'tipiGiornata'));
            const tipiGiornataMap = new Map<string, TipoGiornata>();
            tipiGiornataSnapshot.forEach(doc => {
                tipiGiornataMap.set(doc.id, doc.data() as TipoGiornata);
            });
            
            return { naviData, luoghiData, tipiGiornataMap };
        } catch (err) {
            console.error("Errore nel caricamento dati iniziali:", err);
            setError('Impossibile caricare i dati di supporto.');
            return null;
        }
    };

    const fetchReports = async () => {
      setLoading(true);
      setError('');

      const initialData = await fetchInitialData();
      if (!initialData) {
        setLoading(false);
        return;
      }
      const { naviData, luoghiData, tipiGiornataMap } = initialData;

      try {
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        const reportsQuery = query(
          collection(db, 'rapportini'),
          where('data', '>=', Timestamp.fromDate(startDate)),
          where('data', '<=', Timestamp.fromDate(endDate)),
          orderBy('data', 'desc')
        );

        const reportSnapshot = await getDocs(reportsQuery);
        const reportList = reportSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Report[];

        const enrichedReports = reportList.map(report => ({
          ...report,
          data: (report.data as Timestamp).toDate(),
          nave: naviData.find(n => n.id === report.naveId),
          luogo: luoghiData.find(l => l.id === report.luogoId),
          tipoGiornata: tipiGiornataMap.get(report.tipoGiornataId) || { nome: 'Non definito', colore: '#808080', lavorativo: false, icona: 'help' },
          oreLavoro: report.oreLavoro || 0,
        }));

        setReports(enrichedReports);
      } catch (err) {
        console.error("Errore nel fetchReports:", err);
        setError('Impossibile caricare i report.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedMonth, selectedYear]); // CIAO: Eseguo il fetch quando cambiano mese o anno

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    name: format(new Date(0, i), 'MMMM', { locale: it })
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Elenco Report
      </Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Mese</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as number)}
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
              >
                {years.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table aria-label="collapsible table">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Data</TableCell>
                <TableCell>Nave / Luogo</TableCell>
                <TableCell>Tipo Giornata</TableCell>
                <TableCell align="right">Ore Lavoro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length > 0 ? (
                reports.map((report) => <Row key={report.id} report={report} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nessun report trovato per il periodo selezionato.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ReportPage;
