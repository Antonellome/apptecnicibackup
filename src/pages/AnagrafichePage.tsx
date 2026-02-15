// CIAO. Questa pagina mostrerà le anagrafiche (tecnici, navi, clienti, etc.).

import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';

const AnagrafichePage: React.FC = () => {
    const { tipo } = useParams<{ tipo: string }>();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Gestione Anagrafica: {tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : ''}
            </Typography>
            <Alert severity="info">
                CIAO: L'interfaccia per la gestione di questa anagrafica verrà implementata qui.
            </Alert>
        </Box>
    );
};

export default AnagrafichePage;
