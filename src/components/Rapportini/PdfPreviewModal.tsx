
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ShareIcon from "@mui/icons-material/Share";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  fileName: string;
  onShare: (blob: Blob, fileName: string) => void;
}

const PdfPreviewModal = ({
  open,
  onClose,
  pdfBlob,
  fileName,
  onShare,
}: PdfPreviewModalProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      // Funzione di cleanup per revocare l'URL quando il componente si smonta o il blob cambia
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
  }, [pdfBlob]);

  const handleShare = () => {
    if (pdfBlob) {
      onShare(pdfBlob, fileName);
    }
  };

  // Gestisce la chiusura e pulisce lo stato se necessario
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Anteprima PDF
        <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 0 }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{ flexGrow: 1, width: "100%", height: "100%", border: "none" }}
            title="Anteprima PDF"
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Button variant="outlined" onClick={handleClose}>
          Chiudi
        </Button>
        <Button
          variant="contained"
          onClick={handleShare}
          startIcon={<ShareIcon />}
          disabled={!pdfBlob}
        >
          Condividi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PdfPreviewModal;
