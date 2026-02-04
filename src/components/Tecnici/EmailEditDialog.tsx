import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

interface EmailEditDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (email: string) => void;
    email: string;
}

// --- Componente Interno per la logica e lo stato del form ---
const InnerEmailEditForm: React.FC<Omit<EmailEditDialogProps, 'open'>> = ({ onClose, onSave, email }) => {
    // Lo stato viene inizializzato con la prop. Poiché questo componente viene
    // montato ogni volta che il dialog si apre, lo stato è sempre aggiornato.
    const [currentEmail, setCurrentEmail] = useState(email);

    const handleSave = () => {
        onSave(currentEmail);
    };

    return (
        <>
            <DialogTitle>Modifica Email Tecnico</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Indirizzo Email"
                    type="email"
                    fullWidth
                    variant="standard"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSave();
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annulla</Button>
                <Button onClick={handleSave} variant="contained">Salva</Button>
            </DialogActions>
        </>
    );
};


// --- Componente Contenitore che gestisce solo la visibilità del Dialog ---
const EmailEditDialog: React.FC<EmailEditDialogProps> = ({ open, onClose, onSave, email }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            {/* Renderizza il form solo quando il dialog è aperto, 
                garantendo che il suo stato venga resettato al mount */}
            {open && <InnerEmailEditForm onClose={onClose} onSave={onSave} email={email} />}
        </Dialog>
    );
};

export default EmailEditDialog;
