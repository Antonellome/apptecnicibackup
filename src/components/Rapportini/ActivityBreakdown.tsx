import React from 'react';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Tooltip,
  Paper
} from '@mui/material';
import { RiepilogoMese } from '@/pages/MonthlyReportPage'; // Import the interface

interface ActivityBreakdownProps {
  riepilogo: RiepilogoMese;
}

const ActivityBreakdown: React.FC<ActivityBreakdownProps> = ({ riepilogo }) => {
    // Calcoliamo il totale dei giorni su cui basare le percentuali.
    // Usiamo i giorni e non le ore per avere una metrica consistente anche per ferie/malattia.
    const totalDays = Array.from(riepilogo.dettaglio.values()).reduce((acc, item) => acc + item.giorni, 0);

    if (totalDays === 0) {
        return <Typography>Nessuna attività registrata.</Typography>;
    }

    const sortedActivities = Array.from(riepilogo.dettaglio.values()).sort((a, b) => b.giorni - a.giorni);

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Distribuzione Attività Mensili</Typography>
            <Box sx={{ flexGrow: 1 }}>
                {sortedActivities.map((activity) => {
                    const percentage = (activity.giorni / totalDays) * 100;
                    return (
                        <Tooltip title={`${activity.giorni} ${activity.giorni > 1 ? 'giorni' : 'giorno'} / ${activity.ore.toFixed(1)} ore`} placement="top" key={activity.nome}>
                            <Grid container alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                                <Grid size={{ xs: 3, sm: 2 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: '500' }}>
                                        {activity.nome}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 7, sm: 9 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={percentage}
                                        sx={{
                                            height: '8px',
                                            borderRadius: '4px',
                                            backgroundColor: (theme) => theme.palette.grey[200],
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: (theme) => theme.palette.primary.main,
                                            },
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 2, sm: 1 }}>
                                    <Typography variant="body2" align="right" sx={{ fontWeight: 'bold' }}>
                                        {`${percentage.toFixed(0)}%`}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Tooltip>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default ActivityBreakdown;
