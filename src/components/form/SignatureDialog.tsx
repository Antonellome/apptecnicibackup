
import React, { useRef, useEffect } from 'react';
import {
    Dialog,
    Box,
    IconButton,
    Tooltip
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
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

    // Pulisce il canvas quando il dialogo si apre
    useEffect(() => {
        if (open && sigCanvas.current) {
            // Un piccolo timeout per assicurarsi che il canvas sia visibile prima di pulirlo
            setTimeout(() => sigCanvas.current?.clear(), 100); 
        }
    }, [open]);

    const handleClear = () => {
        sigCanvas.current?.clear();
    };

    const handleSave = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const signatureData = sigCanvas.current.toDataURL('image/png');
            onSave(signatureData);
        } else {
            // Se non c'è firma, consideralo come un annullamento o non salvare nulla
            onClose();
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    // Layout principale per contenere il canvas e i controlli
                    display: 'flex',
                    flexDirection: 'row', // Layout orizzontale
                    backgroundColor: '#fff', // Sfondo bianco pulito
                    overflow: 'hidden' // Nasconde lo scroll
                }
            }}
        >
            {/* Contenitore principale per il SignaturePad */}
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <SignaturePad
                    ref={sigCanvas}
                    options={{
                        penColor: '#000000', // Colore della penna
                        backgroundColor: '#ffffff' // Sfondo del canvas stesso
                    }}
                    canvasProps={{
                        style: {
                            width: '100%',
                            height: '100%',
                        }
                    }}
                />
                
                {/* Barra delle icone posizionata verticalmente a destra */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)', // Sfondo traslucido
                        padding: '10px',
                        gap: '15px',
                        borderLeft: '1px solid #eee'
                    }}
                >
                    <Tooltip title="Salva" placement="left">
                        <IconButton
                            onClick={handleSave}
                            sx={{ color: 'green', backgroundColor: 'rgba(0, 255, 0, 0.1)' }}
                            size="large"
                        >
                            <CheckIcon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Pulisci" placement="left">
                        <IconButton
                            onClick={handleClear}
                            sx={{ color: 'blue', backgroundColor: 'rgba(0, 0, 255, 0.1)' }}
                            size="large"
                        >
                            <ReplayIcon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Annulla" placement="left">
                        <IconButton
                            onClick={handleClose}
                            sx={{ color: 'red', backgroundColor: 'rgba(255, 0, 0, 0.1)' }}
                            size="large"
                        >
                            <ClearIcon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Dialog>
    );
};

export default SignatureDialog;
