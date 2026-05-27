
import React, { useRef, useEffect } from 'react';
import {
    Dialog,
    Box,
    Stack,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import SignaturePad from 'react-signature-pad-wrapper';

// Definiamo le props che il componente riceverà
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

    // Hook che si attiva quando lo stato di 'open' cambia.
    useEffect(() => {
        // Se il dialogo è aperto e il riferimento al canvas esiste...
        if (open && sigCanvas.current) {
            // ...pulisci il canvas per presentare una tela bianca all'utente.
            sigCanvas.current.clear();
        }
    }, [open]); // La dipendenza [open] assicura che questo codice venga eseguito solo quando il dialogo si apre o si chiude.


    const handleClear = () => {
        sigCanvas.current?.clear();
    };

    const handleSave = () => {
        if (sigCanvas.current) {
            if (sigCanvas.current.isEmpty()) {
                onClose(); // Se vuota, chiudi senza salvare
                return;
            }
            const signatureData = sigCanvas.current.toDataURL('image/png');
            onSave(signatureData);
        }
    };

    return (
        <Dialog
            fullScreen // Dialogo sempre a schermo intero
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    // Sfondo nero semitrasparente per dare l'idea di un "overlay"
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            {/* Contenitore principale che occupa tutto lo spazio */}
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                
                {/* La lavagna per la firma occupa l'intero contenitore */}
                <SignaturePad
                    ref={sigCanvas}
                    options={{
                        penColor: '#FFFFFF', // Penna bianca per contrasto con lo sfondo scuro
                    }} 
                    canvasProps={{
                        style: {
                            width: '100%',
                            height: '100%',
                            background: 'transparent' // Sfondo trasparente
                        }
                    }}
                />

                {/* Icone di controllo posizionate in alto a destra */}
                <Stack
                    direction="column"
                    spacing={2} // Aumentato lo spazio per un tocco migliore
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 10
                    }}
                >
                    <IconButton
                        aria-label="Annulla"
                        onClick={onClose}
                        sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
                        }}
                    >
                        <CloseIcon fontSize="large" />
                    </IconButton>
                     <IconButton
                        aria-label="Pulisci Firma"
                        onClick={handleClear}
                        sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
                        }}
                    >
                        <ReplayIcon fontSize="large" />
                    </IconButton>
                    <IconButton
                        aria-label="Salva Firma"
                        onClick={handleSave}
                        sx={{ 
                            backgroundColor: '#4CAF50', // Verde per l'azione di salvataggio
                            color: 'white',
                             '&:hover': { backgroundColor: '#45a049' }
                        }}
                    >
                        <CheckIcon fontSize="large" />
                    </IconButton>
                </Stack>
            </Box>
        </Dialog>
    );
};

export default SignatureDialog;
