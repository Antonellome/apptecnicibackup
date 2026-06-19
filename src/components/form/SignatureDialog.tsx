
import React, { useRef, useEffect } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Button,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import SignaturePad from 'react-signature-pad-wrapper';

interface SignatureDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (signature: string) => void;
}

const SignatureDialog: React.FC<SignatureDialogProps> = ({
    open,
    onClose,
    onSave,
}) => {
    const sigCanvas = useRef<SignaturePad>(null);

    useEffect(() => {
        if (open && sigCanvas.current) {
            setTimeout(() => sigCanvas.current?.clear(), 100); 
        }
    }, [open]);

    const handleClear = () => {
        sigCanvas.current?.clear();
    };

    const handleSave = () => {
        if (sigCanvas.current) {
            if (sigCanvas.current.isEmpty()) {
                onClose();
                return;
            }
            const signatureData = sigCanvas.current.toDataURL('image/png');
            onSave(signatureData);
        }
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    backgroundColor: '#f5f5f5', // Sfondo grigio chiaro per la leggibilità
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <DialogTitle sx={{ 
                backgroundColor: 'primary.main', 
                color: 'white', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                Apponi la tua Firma
                <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, flexGrow: 1, display: 'flex' }}>
                <Box sx={{ border: '2px dashed #ccc', borderRadius: '4px', width: '100%', height: '100%' }}>
                    <SignaturePad
                        ref={sigCanvas}
                        options={{ penColor: '#000000' }}
                        canvasProps={{
                            style: {
                                width: '100%',
                                height: '100%',
                                background: 'transparent'
                            }
                        }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-around', p: 2, backgroundColor: 'background.paper' }}>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleClear}
                    startIcon={<ReplayIcon />}
                    size="large"
                >
                    Pulisci
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<CheckIcon />}
                    size="large"
                >
                    Salva Firma
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SignatureDialog;
