import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { AddCircle, ListAlt, CalendarMonth, SpeakerNotes } from '@mui/icons-material';

// --- Stile per i riquadri ---
const Riquadro = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  width: '100%',
  height: '100%',
  aspectRatio: '1 / 1',
  cursor: 'pointer',
  color: theme.palette.text.primary,
  transition: 'background-color 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.grey[700],
  },
  '& .MuiSvgIcon-root': {
    fontSize: 48,
    marginBottom: theme.spacing(1.5),
    color: theme.palette.text.primary,
  },
}));

// --- Voci del menu come da blueprint ---
const vociMenu = [
  {
    titolo: 'Nuovo Report',
    percorso: '/rapportino/nuovo',
    icona: <AddCircle />,
  },
  {
    titolo: 'Report',
    percorso: '/rapportini',
    icona: <ListAlt />,
  },
  {
    titolo: 'Report Mensili',
    percorso: '/monthly-report',
    icona: <CalendarMonth />,
  },
  {
    titolo: 'Note',
    percorso: '/notes',
    icona: <SpeakerNotes />,
  },
];

// --- Componente Dashboard ---
const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      flexGrow: 1,
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: { xs: 2, sm: 4 },
    }}>
      <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: '700px', width: '100%' }}>
        {vociMenu.map((voce) => (
          <Grid size={6} key={voce.titolo} sx={{ display: 'flex' }}>
            <Riquadro onClick={() => navigate(voce.percorso)}>
              {voce.icona}
              <Typography variant="h6" component="h2" sx={{ textAlign: 'center' }}>
                {voce.titolo}
              </Typography>
            </Riquadro>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardPage;
