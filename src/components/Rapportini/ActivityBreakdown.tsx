import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Tooltip,
  Paper,
  Grid
} from '@mui/material';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

interface ActivityBreakdownProps {
  riepilogo: RiepilogoMese;
}

const ActivityBreakdown: React.FC<ActivityBreakdownProps> = ({ riepilogo }) => {

    const { displayActivities, totalHoursForChart } = useMemo(() => {
        const activities = Array.from(riepilogo.dettaglio.values())
            .filter(d => d.oreTotali > 0 && d.unita === 'h');
        
        const total = activities.reduce((acc, activity) => acc + activity.oreTotali, 0);

        return { displayActivities: activities, totalHoursForChart: total };

    }, [riepilogo.dettaglio]);

    if (totalHoursForChart === 0 || displayActivities.length === 0) {
        return null; 
    }

    const sortedActivities = displayActivities.sort((a, b) => b.oreTotali - a.oreTotali);

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>Distribuzione Attività Mensili (su base ore)</Typography>
            <Box sx={{ flexGrow: 1 }}>
                {sortedActivities.map((activity) => {
                    const percentage = (activity.oreTotali / totalHoursForChart) * 100;
                    return (
                        <Tooltip title={`${activity.oreTotali.toFixed(2)} ore`} placement="top" key={activity.nome}>
                            <Grid container alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                                <Grid size={{ xs: 5, sm: 4 }}>
                                    <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                        {activity.nome}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 7, sm: 8 }}>
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
                            </Grid>
                        </Tooltip>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default ActivityBreakdown;
