import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Tooltip,
  Paper
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

interface ActivityBreakdownProps {
  riepilogo: RiepilogoMese;
}

interface DisplayActivity {
    nome: string;
    ore: number;
}

const ActivityBreakdown: React.FC<ActivityBreakdownProps> = ({ riepilogo }) => {

    const { displayActivities, totalHours } = useMemo(() => {
        const newActivities: DisplayActivity[] = [];
        let totalOvertimeHours = 0;

        for (const activity of riepilogo.dettaglio.values()) {
            totalOvertimeHours += activity.oreStraordinario;

            if (activity.oreOrdinarie > 0) {
                newActivities.push({
                    nome: activity.nome,
                    ore: activity.oreOrdinarie,
                });
            } else if (activity.oreStraordinario === 0 && activity.giorni > 0) {
                 newActivities.push({
                    nome: activity.nome,
                    ore: activity.giorni * 8, 
                });
            }
        }

        if (totalOvertimeHours > 0) {
            newActivities.push({
                nome: 'Straordinario',
                ore: totalOvertimeHours,
            });
        }
        
        const totalHoursForChart = newActivities.reduce((acc, item) => acc + item.ore, 0);

        return { displayActivities: newActivities, totalHours: totalHoursForChart };

    }, [riepilogo.dettaglio]);

    if (totalHours === 0) {
        return null; 
    }

    const sortedActivities = displayActivities.filter(a => a.ore > 0).sort((a, b) => b.ore - a.ore);

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>Distribuzione Attività Mensili (su base ore)</Typography>
            <Box sx={{ flexGrow: 1 }}>
                {sortedActivities.map((activity) => {
                    const percentage = (activity.ore / totalHours) * 100;
                    return (
                        <Tooltip title={`${activity.ore.toFixed(1)} ore`} placement="top" key={activity.nome}>
                            <Grid container alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                                <Grid
                                    size={{
                                        xs: 3,
                                        sm: 2
                                    }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: '500' }}>
                                        {activity.nome}
                                    </Typography>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 7,
                                        sm: 9
                                    }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={percentage}
                                        sx={{
                                            height: '8px',
                                            borderRadius: '4px',
                                            backgroundColor: (theme) => theme.palette.grey[200],
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: (theme) => theme.palette.primary.main, // RIPRISTINO COLORE BLU UNIFORME
                                            },
                                        }}
                                    />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 2,
                                        sm: 1
                                    }}>
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
