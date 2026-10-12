import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  CircularProgress,
  Stack,
  IconButton,
} from '@mui/material';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachWeekOfInterval, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import FullScreenLoader from '@/components/FullScreenLoader';
import { processaMese, RisultatoCalcoloGiornaliero } from '@/services/BustaPagaService';
import { toDateSafe } from '@/utils/dateUtils';
import { Dipendente, SaldiContatori, Rapportino } from '@/models/definitions';
import { strutturaPaga } from '@/config/payrollStructure';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ShareIcon from '@mui/icons-material/Share';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { ResiduiModal } from '@/components/common/ResiduiModal';
import { shareOrDownload } from '@/services/shareService';
import { exportDatiToExcel } from '@/services/excelExporter';
import ExcelPreviewModal from '@/components/common/ExcelPreviewModal';


// Main Component
const DatiPage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { masterData, loading: masterDataLoading } = useMasterData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [saldiIniziali, setSaldiIniziali] = useState<SaldiContatori | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [residuiModalOpen, setResiduiModalOpen] = useState(false);
  const [excelPreviewBlob, setExcelPreviewBlob] = useState<Blob | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);


  const fetchSaldi = async () => {
    if (userProfile?.tecnicoId) {
      const saldiDb = await db.saldi.get({ dipendenteId: userProfile.tecnicoId, anno: currentMonth.getFullYear() });
      if (saldiDb) {
        setSaldiIniziali(saldiDb);
      } else {
        setSaldiIniziali({ dipendenteId: userProfile.tecnicoId, anno: currentMonth.getFullYear(), ferie: 160, rol: 80, exFestivita: 32, bancaOre: 0, malattiaGiorniAnno: 0 });
      }
    }
  };

  useEffect(() => {
    fetchSaldi();
  }, [userProfile?.tecnicoId, currentMonth.getFullYear()]);

  const allUserRapportini = useLiveQuery(() => {
    if (!userProfile?.tecnicoId) return [];
    return db.rapportini
      .filter(r => !r.isDeleted && (r.tecnicoId === userProfile.tecnicoId || (r.presenze || []).includes(userProfile.tecnicoId)))
      .toArray();
  }, [userProfile?.tecnicoId]);

  const rapportiniDelMese = useMemo(() => {
    if (!allUserRapportini) return [];
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return allUserRapportini.filter(r => {
        const d = toDateSafe(r.data);
        return d && d >= start && d <= end;
    });
  }, [allUserRapportini, currentMonth]);

  const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);

  const { risultati, saldiFinali, loading: processing } = useMemo(() => {
    if (!userProfile || !rapportiniDelMese || !tipiGiornata || !masterData || !saldiIniziali) {
      return { risultati: [], saldiFinali: null, loading: true };
    }
    const dipendente: Dipendente = { id: userProfile.tecnicoId, nome: userProfile.nome, cognome: userProfile.cognome, livello: 'D1', isTurnista: false, orarioSettimanaleContrattuale: 40, anzianitaAnni: 5 };
    const processedData = processaMese(dipendente, rapportiniDelMese, tipiGiornata, saldiIniziali, currentMonth, masterData);
    return { ...processedData, loading: false };
  }, [userProfile, rapportiniDelMese, tipiGiornata, masterData, currentMonth, saldiIniziali]);

  const totaliMensili = useMemo(() => {
    const totals: { [key: string]: number } = {};
    strutturaPaga.flatMap(s => s.voci).forEach(voce => {
      totals[voce.id] = risultati.reduce((sum, giorno) => sum + (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0), 0);
    });
    return totals;
  }, [risultati]);

  const totaliGenerali = useMemo(() => {
    const oreLavorate = strutturaPaga
      .filter(s => s.titolo === 'Lavoro Ordinario' || s.titolo === 'Lavoro Straordinario')
      .flatMap(s => s.voci)
      .reduce((acc, voce) => acc + (totaliMensili[voce.id] || 0), 0);
    const oreAssenza = strutturaPaga
      .filter(s => s.titolo === 'Assenze Retribuite' || s.titolo === 'Malattia')
      .flatMap(s => s.voci)
      .reduce((acc, voce) => acc + (totaliMensili[voce.id] || 0), 0);
    return { lavorate: oreLavorate, assenze: oreAssenza, retribuite: oreLavorate + oreAssenza };
  }, [totaliMensili]);

  const handleMonthChange = (increment: number) => {
    setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };
  
  const handleGenerateExcel = async () => {
    if (!risultati || !saldiFinali || !saldiIniziali || !userProfile) {
        console.error("Dati non pronti per l'esportazione in Excel.");
        return;
    }
    setIsProcessing(true);
    try {
        const { blob, fileName } = exportDatiToExcel(
            risultati,
            totaliMensili,
            saldiFinali,
            saldiIniziali,
            currentMonth,
            userProfile.cognome
        );
        setExcelPreviewBlob(blob);
        setIsPreviewOpen(true);
    } catch (error) {
        console.error("Errore durante la generazione del file Excel:", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleShareFromPreview = async (blob: Blob, fileName: string) => {
    try {
        await shareOrDownload(blob, fileName);
    } catch (error) {
        console.error("Errore durante la condivisione:", error);
    } finally {
        setIsPreviewOpen(false);
    }
};

  const handleSaldiSave = (saldi: SaldiContatori) => {
      setSaldiIniziali(saldi);
  }

  if (authLoading || masterDataLoading || !saldiIniziali || !userProfile) {
    return <FullScreenLoader />;
  }

  const weeksInMonth = eachWeekOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }, { weekStartsOn: 1 });

  return (
    <>
      <Box sx={{ p: { xs: 1, sm: 2 }, backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
        <Header 
          onMonthChange={handleMonthChange} 
          currentMonth={currentMonth} 
          onShare={handleGenerateExcel} 
          onAddResidui={() => setResiduiModalOpen(true)} 
          isShareDisabled={isProcessing || !risultati || risultati.length === 0}
        />

        {processing ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3}>
            {weeksInMonth.map((weekStart, index) => (
              <WeeklyTable key={index} weekStart={weekStart} risultati={risultati} weekNumber={index + 1} />
            ))}
            <TotalsTable totaliMensili={totaliMensili} totaliGenerali={totaliGenerali} />
            {saldiFinali && <BalancesTable saldiIniziali={saldiIniziali} saldiFinali={saldiFinali} totaliMensili={totaliMensili} />}
          </Stack>
        )}
      </Box>

      {userProfile && (
        <ExcelPreviewModal
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          excelBlob={excelPreviewBlob}
          fileName={`Riepilogo_Dati_${userProfile.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.xlsx`}
          onShare={handleShareFromPreview}
        />
      )}

      {userProfile && (
        <ResiduiModal 
            open={residuiModalOpen} 
            onClose={() => setResiduiModalOpen(false)} 
            onSave={handleSaldiSave} 
            year={currentMonth.getFullYear()} 
            userId={userProfile.tecnicoId}
        />
      )}
    </>
  );
};

// Header Component
const Header: React.FC<{ onMonthChange: (inc: number) => void; currentMonth: Date; onShare: () => void; onAddResidui: () => void; isShareDisabled: boolean; }> = ({ onMonthChange, currentMonth, onShare, onAddResidui, isShareDisabled }) => (
  <Paper sx={{ p: 1, mb: 3, backgroundColor: '#1e1e1e', border: '1px solid #424242' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
       <IconButton onClick={onShare} sx={{ color: 'white' }} disabled={isShareDisabled}>
         {isShareDisabled ? <CircularProgress size={24} /> : <ShareIcon />}
       </IconButton>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => onMonthChange(-1)} sx={{ color: 'white' }}><ArrowBackIosNewIcon /></IconButton>
        <Typography variant="h6" component="h1" sx={{ textTransform: 'capitalize' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </Typography>
        <IconButton onClick={() => onMonthChange(1)} sx={{ color: 'white' }}><ArrowBackIosNewIcon sx={{ transform: 'rotate(180deg)' }} /></IconButton>
      </Stack>
       <IconButton onClick={onAddResidui} sx={{ color: 'white' }}>
         <AddCircleOutlineIcon />
       </IconButton>
    </Stack>
  </Paper>
);


// Section Header Renderer
const renderSectionHeader = (title: string, colSpan: number) => (
  <TableRow>
    <TableCell colSpan={colSpan} sx={{
      color: '#64b5f6',
      fontWeight: 'bold',
      borderBottom: `2px solid #64b5f6`,
      py: 1,
      px: 2
    }}>
      {title.toUpperCase()}
    </TableCell>
  </TableRow>
);

// Weekly Table Component
const WeeklyTable: React.FC<{ weekStart: Date; risultati: RisultatoCalcoloGiornaliero[], weekNumber: number }> = ({ weekStart, risultati, weekNumber }) => {
  const theme = useTheme();
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekResults = risultati.filter(r => {
    const d = toDateSafe(r.data);
    return d && d >= weekStart && d <= weekEnd;
  });

  const hasData = weekResults.some(r => Object.values(r).some(val => typeof val === 'number' && val > 0));
  if (!hasData) return null;

  return (
    <Paper sx={{ overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #424242' }}>
      <Typography variant="h6" sx={{ p: 2, backgroundColor: '#333' }}>{`Settimana ${weekNumber}`}</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '25%' }}>Tipo Ora</TableCell>
              {daysOfWeek.map(day => {
                const dayIndex = getDay(day);
                const isWeekend = dayIndex === 0 || dayIndex === 6;
                return (
                  <TableCell key={day.toISOString()} align="center" sx={{ color: 'white', p: 0.5 }}>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{format(day, 'E', { locale: it }).charAt(0)}</Typography>
                      <Box sx={{ 
                          backgroundColor: isWeekend ? '#673ab7' : '#00796b', 
                          color: 'white', 
                          borderRadius: '4px', 
                          width: 28, height: 28, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                        {format(day, 'd')}
                      </Box>
                    </Stack>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {strutturaPaga.map(sezione => {
              const sectionHasData = sezione.voci.some(voce => weekResults.some(giorno => (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) > 0));
              if (!sectionHasData) return null;

              return (
                <React.Fragment key={`week-sec-${sezione.titolo}`}>
                  {renderSectionHeader(sezione.titolo, 8)}
                  {sezione.voci.map(voce => {
                    const rowHasData = weekResults.some(giorno => (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) > 0);
                    if (!rowHasData) return null;

                    return (
                      <TableRow key={voce.id}>
                        <TableCell sx={{ color: '#e0e0e0' }}>{voce.label}</TableCell>
                        {daysOfWeek.map(day => {
                          const giornoDati = weekResults.find(r => r.data === format(day, 'yyyy-MM-dd'));
                          const value = giornoDati ? (giornoDati[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) : 0;
                          return <TableCell key={day.toISOString()} align="center" sx={{ color: '#e0e0e0' }}>{value > 0 ? value.toFixed(2) : '-'}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// Totals Table Component
const TotalsTable: React.FC<{ totaliMensili: { [key: string]: number }, totaliGenerali: { lavorate: number, assenze: number, retribuite: number } }> = ({ totaliMensili, totaliGenerali }) => (
  <Paper sx={{ overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #424242' }}>
    <Typography variant="h6" sx={{ p: 2, backgroundColor: '#333' }}>Totali Mensili</Typography>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo Ora</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Totale</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {strutturaPaga.map(sezione => {
            const sectionHasData = sezione.voci.some(voce => (totaliMensili[voce.id] || 0) > 0);
            if (!sectionHasData) return null;

            return (
              <React.Fragment key={`total-sec-${sezione.titolo}`}>
                {renderSectionHeader(sezione.titolo, 2)}
                {sezione.voci.map(voce => {
                  const total = totaliMensili[voce.id] || 0;
                  if (total === 0) return null;
                  return (
                    <TableRow key={`total-row-${voce.id}`}>
                      <TableCell sx={{ color: '#e0e0e0' }}>{voce.label}</TableCell>
                      <TableCell align="right" sx={{ color: '#e0e0e0' }}>{total.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
           <TableRow sx={{ '& .MuiTableCell-root': { borderTop: '1px solid #424242', fontWeight: 'bold', color: 'white' } }}>
                <TableCell>Totale Ore Lavorate</TableCell>
                <TableCell align="right">{totaliGenerali.lavorate.toFixed(2)}</TableCell>
            </TableRow>
             <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', color: 'white' } }}>
                <TableCell>Totale Ore Assenza</TableCell>
                <TableCell align="right">{totaliGenerali.assenze.toFixed(2)}</TableCell>
            </TableRow>
             <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', fontSize: '1.1rem', color: 'white' } }}>
                <TableCell>Totale Ore Retribuite</TableCell>
                <TableCell align="right">{totaliGenerali.retribuite.toFixed(2)}</TableCell>
            </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

// Balances Table Component
const BalancesTable: React.FC<{ saldiIniziali: SaldiContatori, saldiFinali: SaldiContatori, totaliMensili: { [key: string]: number } }> = ({ saldiIniziali, saldiFinali, totaliMensili }) => (
  <Paper sx={{ overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #424242' }}>
    <Typography variant="h6" sx={{ p: 2, backgroundColor: '#333' }}>Contatori e Saldi Residui</Typography>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ '& .MuiTableCell-root': { color: 'white', fontWeight: 'bold' } }}>
            <TableCell>Contatore</TableCell>
            <TableCell align="right">Saldo iniziale</TableCell>
            <TableCell align="right">Utilizzato nel Mese</TableCell>
            <TableCell align="right">Saldo Finale</TableCell>
          </TableRow>
        </TableHead>
        <TableBody sx={{ '& .MuiTableCell-root': { color: '#e0e0e0' } }}>
          <TableRow>
            <TableCell>Ferie</TableCell>
            <TableCell align="right">{(saldiIniziali.ferie).toFixed(2)}h</TableCell>
            <TableCell align="right">-{(totaliMensili.ferieScalate || 0).toFixed(2)}h</TableCell>
            <TableCell align="right">{(saldiFinali.ferie).toFixed(2)}h</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ROL</TableCell>
            <TableCell align="right">{(saldiIniziali.rol).toFixed(2)}h</TableCell>
            <TableCell align="right">-{(totaliMensili.rolScalati || 0).toFixed(2)}h</TableCell>
            <TableCell align="right">{(saldiFinali.rol).toFixed(2)}h</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Ex Festività</TableCell>
            <TableCell align="right">{(saldiIniziali.exFestivita).toFixed(2)}h</TableCell>
            <TableCell align="right">-{(totaliMensili.exFestivitaScalate || 0).toFixed(2)}h</TableCell>
            <TableCell align="right">{(saldiFinali.exFestivita).toFixed(2)}h</TableCell>
          </TableRow>
           <TableRow>
            <TableCell>Permessi L. 104</TableCell>
            <TableCell align="right">24.00h</TableCell> 
            <TableCell align="right">-{(totaliMensili.legge104Scalate || 0).toFixed(2)}h</TableCell>
            <TableCell align="right">24.00h</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default DatiPage;
