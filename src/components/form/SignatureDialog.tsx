
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
    const signaturePadRef = useRef<SignaturePad | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const resizeCanvas = () => {
        if (signaturePadRef.current && signaturePadRef.current.canvas && containerRef.current) {
            const canvas = signaturePadRef.current.canvas.current;
            if (canvas) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                canvas.width = width;
                canvas.height = height;
                signaturePadRef.current.clear();
            }
        }
    };

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);
            }, 150);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, [open]);

    const handleClear = () => {
        signaturePadRef.current?.clear();
    };

    const handleSave = () => {
        if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
            const signatureData = signaturePadRef.current.toDataURL('image/png');
            onSave(signatureData);
            onClose();
        } else {
            onClose();
        }
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    display: 'flex',
                    flexDirection: 'row',
                    backgroundColor: '#fff',
                    overflow: 'hidden'
                }
            }}
        >
            <Box
                ref={containerRef}
                sx={{ 
                    flexGrow: 1, 
                    height: '100%', 
                    width: 'calc(100% - 80px)'
                }}
            >
                <SignaturePad
                    ref={signaturePadRef}
                    options={{ 
                        penColor: 'black',
                        minWidth: 2.5,
                        maxWidth: 3,
                     }}
                />
            </Box>

            <Box
                sx={{
                    width: '80px',
                    flexShrink: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    padding: '10px',
                    gap: '20px',
                    borderLeft: '1px solid #ddd'
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
                        onClick={onClose}
                        sx={{ color: 'red', backgroundColor: 'rgba(255, 0, 0, 0.1)' }}
                        size="large"
                    >
                        <ClearIcon fontSize="large"/>
                    </IconButton>
                </Tooltip>
            </Box>
        </Dialog>
    );
};

export default SignatureDialog;
