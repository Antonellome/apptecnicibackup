import { Grid, Paper, Skeleton, Typography } from '@mui/material';

const MonthlyReportSkeleton = () => {
  return (
    <Grid container spacing={3}>
      {/* Colonna Calendario */}
      <Grid
        size={{
          xs: 12,
          md: 4
        }}>
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
          <Typography variant="h5" gutterBottom>
            <Skeleton width="60%" />
          </Typography>
          <Skeleton variant="rectangular" width="100%" height={280} />
        </Paper>
      </Grid>
      {/* Colonna Dettagli */}
      <Grid
        size={{
          xs: 12,
          md: 8
        }}>
        <Grid container spacing={3}>
          {/* Riepilogo Skeleton */}
          <Grid
            size={{
              xs: 12,
              lg: 6
            }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                <Skeleton width="50%" />
              </Typography>
              <Skeleton variant="rectangular" width="100%" height={120} />
            </Paper>
          </Grid>

          {/* Dettaglio Ore Skeleton */}
          <Grid
            size={{
              xs: 12,
              lg: 6
            }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                <Skeleton variant="text" width="80%" height={30} sx={{mb: 2}}/>
                <Skeleton variant="rectangular" width="100%" height={90} />
            </Paper>
          </Grid>

          {/* Activity Breakdown Skeleton */}
          <Grid sx={{ mt: 2 }} size={12}>
             <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                <Skeleton variant="text" width="40%" height={30} sx={{mb: 1}}/>
                <Skeleton variant="rectangular" width="100%" height={60} />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default MonthlyReportSkeleton;
