
import React from 'react';
import Grid from '@mui/material/Grid';
import { Paper, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { AddCircle, ListAlt, CalendarMonth, SpeakerNotes } from '@mui/icons-material';

const Riquadro = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  minHeight: '180px',
  transition: 'box-shadow 0.3s',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const vociMenu = [
  {
    titolo: 'Nuovo Report',
    percorso: '/rapportini/nuovo',
    icona: <AddCircle sx={{ fontSize: 40 }} />,
  },
  {
    titolo: 'Report (Elenco)',
    percorso: '/rapportini',
    icona: <ListAlt sx={{ fontSize: 40 }} />,
  },
  {
    titolo: 'Report Mensili',
    percorso: '/monthly-report',
    icona: <CalendarMonth sx={{ fontSize: 40 }} />,
  },
  {
    titolo: 'Note',
    percorso: '/notes',
    icona: <SpeakerNotes sx={{ fontSize: 40 }} />,
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',      // Centra orizzontalmente
      justifyContent: 'center', // Centra verticalmente
      flexGrow: 1,               // Occupa lo spazio disponibile
      height: '100%'
    }}>
      <Grid container spacing={2} sx={{ maxWidth: 600, width: '100%' }}>
        {vociMenu.map((voce) => (
          <Grid size={{ xs: 6 }} key={voce.titolo}>
            <Riquadro onClick={() => navigate(voce.percorso)}>
              {voce.icona}
              <Typography variant="h6" component="h3" sx={{ mt: 1.5, fontSize: '1rem' }}>
                {voce.titolo}
              </Typography>
            </Riquadro>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" sx={{ mt: 5, color: 'text.secondary' }}>
        by AS
      </Typography>
    </Box>
  );
};

export default DashboardPage;
