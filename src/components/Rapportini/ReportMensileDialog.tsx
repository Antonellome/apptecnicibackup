
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip, Divider
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino, Tecnico } from '@/models/definitions';

interface ReportMensileDialogProps {
  open: boolean;
  onClose: () => void;
  report: EnrichedRapportino | null;
  tecnici: Tecnico[];
}

const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, report, tecnici }) => {
  if (!report) return null;

  const oreTotali = (report.dettaglioOreTecnici || []).reduce((acc, curr) => acc + (curr.ore || 0), 0);
  const reportDate = (report.data as any).toDate ? (report.data as any).toDate() : report.data;

  const getTecnicoNome = (tecnicoId: string) => {
    const tecnico = tecnici.find(t => t.id === tecnicoId);
    return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'Sconosciuto';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Dettaglio Report</Typography>
          <Chip label={format(reportDate, 'eeee dd/MM/yyyy', { locale: it })} />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
            <Chip label={report.tipoGiornata?.nome || 'N/D'} sx={{ bgcolor: report.tipoGiornata?.colore || 'grey', color: 'white', mb: 2 }} />
        </Box>

        <Typography variant="subtitle1" gutterBottom><b>Destinazione:</b> {report.descrizioneBreve || 'Non specificata'}</Typography>
        <Typography variant="subtitle1" gutterBottom><b>Ore Totali:</b> {oreTotali.toFixed(2)}</Typography>
        
        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Tecnici Presenti</Typography>
        {report.presenze.map(tecnicoId => (
            <Box key={tecnicoId} sx={{ mb: 1 }}>
                <Typography variant="body1">- {getTecnicoNome(tecnicoId)}</Typography>
            </Box>
        ))}

        {report.lavoroEseguito && (
            <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Lavoro Eseguito</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{report.lavoroEseguito}</Typography>
            </>
        )}

        {report.materialiImpiegati && (
            <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Materiali Impiegati</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{report.materialiImpiegati}</Typography>
            </>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportMensileDialog;
