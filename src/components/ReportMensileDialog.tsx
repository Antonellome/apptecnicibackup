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
import type { EnrichedRapportino, Tecnico } from '@/models/definitions';
import GeneratedReportView from './GeneratedReportView';
import { useMasterData } from '@/contexts/MasterDataProvider';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// --- CORREZIONE --- 
// Rimuovo `tipiGiornata` dalle props. Il componente è ora autosufficiente.
interface ReportMensileDialogProps {
  open: boolean;
  onClose: () => void;
  reports: EnrichedRapportino[];
  currentMonth: Date;
  tariffe: Record<string, number>;
}

// --- CORREZIONE --- 
// Rimuovo `tipiGiornata` dai parametri destrutturati.
const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, reports, currentMonth, tariffe }) => {
  const { user } = useAuth();
  
  // --- CORREZIONE --- 
  // Ora `tipiGiornata` arriva da qui, l'unica fonte di verità per questi dati.
  const { masterData } = useMasterData();
  const { tecnici, navi, luoghi, tipiGiornata } = masterData;

  const selectedTecnico = tecnici.find((t: Tecnico) => t.id === user?.uid);

  const enrichedReportsWithGuadagno = useMemo(() => {
      // Aggiungo un controllo robusto per evitare crash se i dati non sono ancora pronti.
      if (!tipiGiornata || tipiGiornata.length === 0) return [];

      const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
      
      // La logica di fallback per le tariffe rimane, ma ora usa `tipiGiornata` dal contesto.
      const defaultTariffe = tipiGiornata.reduce((acc, tipo) => {
          acc[tipo.nome] = 10.00;
          return acc;
      }, {} as Record<string, number>);

      // La logica delle tariffe che hai voluto è preservata: usa quelle dal localStorage se ci sono.
      const finalTariffe = Object.keys(tariffe).length > 0 ? tariffe : defaultTariffe;

      return reports.map(report => {
          const tipo = tipiGiornataMap.get(report.tipoGiornataId);
          const tariffa = tipo ? (finalTariffe[tipo.nome] ?? 0) : 0;
          const guadagno = (report.oreLavoro ?? 0) * tariffa;
          return {
              ...report,
              guadagno: guadagno,
          };
      });
  // --- CORREZIONE --- 
  // Aggiungo `tipiGiornata` (dal contesto) all'array di dipendenze.
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
