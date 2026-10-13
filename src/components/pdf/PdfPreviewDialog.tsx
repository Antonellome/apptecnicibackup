import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme,
} from '@mui/material';
import { PDFViewer, BlobProvider } from '@react-pdf/renderer';
import { RiepilogoPDF } from './RiepilogoPDF';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import { RisultatoCalcoloGiornaliero } from '@/models/definitions';

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  risultati: RisultatoCalcoloGiornaliero[];
  dipendenteNome: string;
  periodo: string;
}

export const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({ open, onClose, risultati, dipendenteNome, periodo }) => {
  const theme = useTheme();

  const handleShare = async (blob: Blob | null) => {
    if (!blob) {
      alert('Impossibile generare il file per la condivisione.');
      return;
    }

    const file = new File([blob], `Riepilogo_${periodo.replace(' ', '_')}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Riepilogo Ore - ${periodo}`,
          text: `Ecco il riepilogo ore per ${dipendenteNome} nel periodo ${periodo}.`,
          files: [file],
        });
      } catch (error) {
        console.error('Errore durante la condivisione:', error);
      }
    } else {
      alert('La condivisione di file non è supportata su questo browser o dispositivo.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}>
        Anteprima Riepilogo PDF
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, height: 'calc(100vh - 110px)' }}>
        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
          <RiepilogoPDF risultati={risultati} dipendenteNome={dipendenteNome} periodo={periodo} />
        </PDFViewer>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        <BlobProvider document={<RiepilogoPDF risultati={risultati} dipendenteNome={dipendenteNome} periodo={periodo} />}>
            {({ blob, loading }) => (
                <Button 
                    variant="contained" 
                    startIcon={<ShareIcon />} 
                    onClick={() => handleShare(blob)}
                    disabled={loading}
                >
                    {loading ? 'Genero il PDF...' : 'Condividi Riepilogo'}
                </Button>
            )}
        </BlobProvider>
      </DialogActions>
    </Dialog>
  );
};
