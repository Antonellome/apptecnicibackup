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
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { Close as CloseIcon } from '@mui/icons-material';
import type { EnrichedRapportino, Tecnico, TipoGiornata } from '@/models/definitions';
import GeneratedReportView from './GeneratedReportView';
// CORRECTED: Import the global data hook
import { useGlobalData } from '@/contexts/GlobalDataProvider';
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
  tipiGiornata: TipoGiornata[];
}

const loadTariffe = (userId: string): Record<string, number> => {
    try {
        const savedTariffeJSON = localStorage.getItem(`tariffe_${userId}`);
        if (savedTariffeJSON) {
            const parsedTariffe = JSON.parse(savedTariffeJSON);
            Object.keys(parsedTariffe).forEach(key => {
                parsedTariffe[key] = Number(parsedTariffe[key]) || 0;
            });
            return parsedTariffe;
        }
    } catch (error) {
        console.error("Errore nel caricamento o parsing delle tariffe:", error);
    }
    return {};
};

const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, reports, currentMonth, tipiGiornata }) => {
  const { user } = useAuth();
  // CORRECTED: Use the correct global data hook
  const { tecnici, navi, luoghi } = useGlobalData();

  const selectedTecnico = tecnici.find((t: Tecnico) => t.id === user?.uid);

  const tariffe = useMemo(() => {
      if (user?.uid) {
          return loadTariffe(user.uid);
      }
      return {};
  }, [user]);

  const enrichedReportsWithGuadagno = useMemo(() => {
      const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
      return reports.map(report => {
          const tipo = tipiGiornataMap.get(report.tipoGiornataId);
          const tariffa = tipo ? (tariffe[tipo.nome] ?? (tipo.lavorativo ? 10 : 0)) : 0;
          const guadagno = (report.oreLavoro ?? 0) * tariffa;
          return {
              ...report,
              guadagno: guadagno,
          };
      });
  }, [reports, tariffe, tipiGiornata]);

  const totalGuadagno = useMemo(() => {
      return enrichedReportsWithGuadagno.reduce((sum, report) => sum + (report.guadagno ?? 0), 0);
  }, [enrichedReportsWithGuadagno]);

  const anno = currentMonth.getFullYear();
  const mese = currentMonth.getMonth() + 1;
  const monthString = format(currentMonth, 'MMMM yyyy', { locale: it });

  if (!open || !selectedTecnico) {
    return null;
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
            Consuntivo per {selectedTecnico?.nome} {selectedTecnico?.cognome} - {monthString}
          </Typography>
        </Toolbar>
      </AppBar>
      <DialogContent>
        <GeneratedReportView 
            rapportini={enrichedReportsWithGuadagno}
            tecnico={selectedTecnico}
            navi={navi}
            luoghi={luoghi}
            anno={anno}
            mese={mese}
            totalGuadagno={totalGuadagno}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportMensileDialog;
