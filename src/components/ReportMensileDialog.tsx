import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { Close as CloseIcon } from '@mui/icons-material';
import type { EnrichedRapportino, Tecnico } from '@/models/definitions';
import GeneratedReportView from './GeneratedReportView';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface ReportMensileDialogProps {
  open: boolean;
  onClose: () => void;
  reports: EnrichedRapportino[];
  currentMonth: Date;
  tariffe: Record<string, number>;
}

// =========================================================================
// --- APPLICAZIONE DELLA STRATEGIA DI UNIFICAZIONE DATI ---
// =========================================================================
const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, reports, currentMonth, tariffe }) => {
  const { user } = useAuth();
  
  // 1. UTILIZZO DEL PROVIDER CANONICO: Recupero dati e stati dal nostro Single Source of Truth.
  const { masterData, loading, error } = useMasterData();

  // 2. CALCOLI MEMORIZZATI: La logica di arricchimento viene eseguita solo quando i dati necessari sono pronti.
  const { enrichedReportsWithGuadagno, totalGuadagno, selectedTecnico } = useMemo(() => {
      // 3. GUARDIA DI CONTROLLO (NULL-SAFETY): Se i dati master non sono ancora caricati, si esce immediatamente.
      // Questa è la correzione cruciale che previene il crash.
      if (!masterData) {
          return { enrichedReportsWithGuadagno: [], totalGuadagno: 0, selectedTecnico: null };
      }

      const { tecnici, tipiGiornata } = masterData;
      
      const defaultTariffe = tipiGiornata.reduce((acc, tipo) => {
          acc[tipo.nome] = 10.00;
          return acc;
      }, {} as Record<string, number>);

      const finalTariffe = Object.keys(tariffe).length > 0 ? tariffe : defaultTariffe;

      const calculatedReports = reports.map(report => {
          // CORREZIONE: Il report in ingresso è già un EnrichedRapportino, quindi usiamo l'oggetto tipoGiornata direttamente.
          const tipo = report.tipoGiornata;
          const tariffa = tipo ? (finalTariffe[tipo.nome] ?? 0) : 0;
          const guadagno = (report.oreLavoro ?? 0) * tariffa;
          return {
              ...report,
              guadagno: guadagno,
          };
      });

      const total = calculatedReports.reduce((sum, report) => sum + (report.guadagno ?? 0), 0);
      const tecnico = tecnici.find((t: Tecnico) => t.id === user?.uid);

      return { enrichedReportsWithGuadagno: calculatedReports, totalGuadagno: total, selectedTecnico: tecnico };

  }, [masterData, reports, tariffe, user?.uid]); // Dipendenza esplicita da masterData

  const anno = currentMonth.getFullYear();
  const mese = currentMonth.getMonth() + 1;
  const monthString = format(currentMonth, 'MMMM yyyy', { locale: it });

  // Se il dialog non è aperto, non renderizzare nulla.
  if (!open) {
    return null;
  }
  
  // --- VISTA DI CONTENUTO CONDIZIONALE ---
  // Mostra stati diversi in base al caricamento o a errori.
  const renderContent = () => {
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">Errore nel caricamento dei dati master: {error.message}</Alert>;
    }

    if (!selectedTecnico) {
        return <Alert severity="warning">Impossibile trovare i dati del tecnico. Prova a ricaricare.</Alert>;
    }

    return (
        <GeneratedReportView 
            rapportini={enrichedReportsWithGuadagno}
            tecnico={selectedTecnico}
            navi={masterData?.navi ?? []}
            luoghi={masterData?.luoghi ?? []}
            anno={anno}
            mese={mese}
            totalGuadagno={totalGuadagno}
        />
    );
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {selectedTecnico ? `Consuntivo per ${selectedTecnico.nome} ${selectedTecnico.cognome}` : 'Consuntivo'} - {monthString}
          </Typography>
        </Toolbar>
      </AppBar>
      <DialogContent>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportMensileDialog;
