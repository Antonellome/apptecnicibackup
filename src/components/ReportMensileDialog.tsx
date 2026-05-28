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
import type { EnrichedRapportino, Tecnico, Tariffa, TariffaLocale, TipoGiornata } from '@/models/definitions';
import GeneratedReportView from './GeneratedReportView';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const ORE_ORDINARIE_MAX = 8;
const TARIFFA_ORDINARIA = 10;
const TARIFFA_STRAORDINARIO = 15;

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
}

const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, reports, currentMonth }) => {
  const { user } = useAuth();
  const { masterData, loading, error } = useMasterData();

  const { enrichedReportsWithGuadagno, totalGuadagno, selectedTecnico } = useMemo(() => {
      if (!masterData || !user) {
          return { enrichedReportsWithGuadagno: [], totalGuadagno: 0, selectedTecnico: null };
      }

      const { tecnici, impostazioni, tipiGiornata } = masterData;
      
      // Creiamo una mappa per cercare il tipo di giornata in modo efficiente
      const tipiGiornataMap = new Map<string, TipoGiornata>(tipiGiornata.map(tg => [tg.id, tg]));
      
      // CORREZIONE: Trasformiamo Tariffa in TariffaLocale
      const tariffeLocali: TariffaLocale[] = impostazioni.tariffe.map((t: Tariffa) => {
          const tipoGiornata = tipiGiornataMap.get(t.tipoGiornataId);
          return {
              ...t,
              costo: t.tariffa, // Aggiungiamo 'costo'
              unita: tipoGiornata?.tipo === 'giornaliera' ? 'g' : 'h' // Aggiungiamo 'unita'
          };
      });
      
      const tariffeMap = new Map<string, TariffaLocale>(tariffeLocali.map(t => [t.id, t]));

      const calculatedReports = reports.map(report => {
          const oreTotaliGiorno = report.oreGiorno ?? 0;
          // CORREZIONE: Usiamo optional chaining per sicurezza
          const tariffa = tariffeMap.get(report.tipoGiornata?.id ?? '');
          const nomeTariffa = tariffa?.nome.toLowerCase() || '';

          // --- FASE 1: CALCOLO ORE PER VISUALIZZAZIONE (SEMPRE ESPLICITO) ---
          let oreOrdinarie: number;
          let oreStraordinario: number;

          const isAttivitaComplessa = nomeTariffa === 'ordinaria' || nomeTariffa.startsWith('trasferta');

          if (isAttivitaComplessa) {
              oreOrdinarie = Math.min(oreTotaliGiorno, ORE_ORDINARIE_MAX);
              oreStraordinario = Math.max(0, oreTotaliGiorno - ORE_ORDINARIE_MAX);
          } else if (nomeTariffa === 'straordinario') {
              oreOrdinarie = 0;
              oreStraordinario = oreTotaliGiorno;
          } else {
              oreOrdinarie = oreTotaliGiorno;
              oreStraordinario = 0;
          }

          // --- FASE 2: CALCOLO GUADAGNO (BASATO SULLE REGOLE) ---
          let guadagno = 0;
          if (tariffa) {
              if (tariffa.unita === 'g') {
                  guadagno = tariffa.costo;
              } else { // 'h'
                  const costoBase = (nomeTariffa === 'ordinaria' || nomeTariffa.startsWith('trasferta'))
                      ? TARIFFA_ORDINARIA
                      : tariffa.costo;
                  
                  guadagno = (oreOrdinarie * costoBase) + (oreStraordinario * TARIFFA_STRAORDINARIO);

                  if (nomeTariffa.startsWith('trasferta')) {
                      const tariffaBonus = tariffeLocali.find(t => t.nome.toLowerCase() === nomeTariffa && t.unita === 'g');
                      if (tariffaBonus) {
                          guadagno += tariffaBonus.costo;
                      }
                  }
              }
          }
          
          return {
              ...report,
              guadagno,
              oreOrdinarie,
              oreStraordinario,
          };
      });

      const total = calculatedReports.reduce((sum, report) => sum + (report.guadagno ?? 0), 0);
      const tecnico = tecnici.find((t: Tecnico) => t.id === user.uid);

      return { enrichedReportsWithGuadagno: calculatedReports, totalGuadagno: total, selectedTecnico: tecnico };

  }, [masterData, reports, user]);

  const monthString = format(currentMonth, 'MMMM yyyy', { locale: it });

  if (!open) {
    return null;
  }
  
  const renderContent = () => {
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">Errore nel caricamento dei dati master: {error}</Alert>;
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
            anno={currentMonth.getFullYear()}
            mese={currentMonth.getMonth() + 1}
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
