
import { useEffect, useMemo } from 'react';
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

  // Usiamo useMemo per derivare pdfUrl da pdfBlob. 
  // Questo elimina le chiamate a setState dentro useEffect, risolvendo il problema di linting.
  const pdfUrl = useMemo(() => {
    if (!open || !pdfBlob) {
      return null;
    }
    return URL.createObjectURL(pdfBlob);
  }, [open, pdfBlob]);

  // Questo useEffect si occupa esclusivamente della pulizia (cleanup) dell'URL
  // quando il componente viene smontato o l'URL cambia.
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleShare = () => {
    if (pdfBlob) {
      onShare(pdfBlob, fileName);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Anteprima PDF
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
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
            open && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress />
                </Box>
            )
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
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
