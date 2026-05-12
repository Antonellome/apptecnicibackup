import React, { useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

const SignatureDialog: React.FC<SignatureDialogProps> = ({ open, onClose, onSave }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signature = sigCanvas.current.toDataURL('image/png');
      onSave(signature);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Inserisci Firma</DialogTitle>
      <DialogContent>
        <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', width: '100%', height: 250 }}>
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{ style: { width: '100%', height: '100%' } }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear}>Pulisci</Button>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} variant="contained">Salva</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureDialog;
