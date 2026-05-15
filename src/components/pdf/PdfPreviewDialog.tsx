
import React from 'react';
import {
    Dialog,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Button,
    CircularProgress,
    Slide
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface PdfPreviewDialogProps {
    open: boolean;
    pdfDataUrl: string | null; // Il PDF come stringa data URL
    isGenerating: boolean;
    onClose: () => void;
    onShare: () => void; // La funzione per la condivisione finale
    fileName: string;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({
    open,
    pdfDataUrl,
    isGenerating,
    onClose,
    onShare,
    fileName
}) => {

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            aria-labelledby="pdf-preview-dialog-title"
        >
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={onClose}
                        aria-label="Chiudi anteprima"
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Anteprima: {fileName}
                    </Typography>
                    <Button
                        autoFocus
                        color="inherit"
                        onClick={onShare}
                        disabled={!pdfDataUrl || isGenerating}
                        startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <ShareIcon />}
                    >
                        Condividi
                    </Button>
                </Toolbar>
            </AppBar>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.500', overflow: 'auto' }}>
                {isGenerating && (
                    <Box sx={{textAlign: 'center', color: 'white'}}>
                        <CircularProgress color="inherit" />
                        <Typography sx={{mt: 2}}>Generazione del PDF in corso...</Typography>
                    </Box>
                )}
                {!isGenerating && pdfDataUrl ? (
                    <iframe
                        src={pdfDataUrl}
                        title="Anteprima PDF"
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                        }}
                    />
                ) : !isGenerating && (
                     <Typography sx={{color: 'white'}}>Errore: impossibile visualizzare l'anteprima.</Typography>
                )}
            </Box>
        </Dialog>
    );
};

export default PdfPreviewDialog;
