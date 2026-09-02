import { Box, Skeleton, List, ListItem, Divider } from '@mui/material';

const ReportListItemSkeleton = () => (
    <Box sx={{ py: 2, px: 2 }}>
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Sinistra */}
            <Box sx={{ flex: '0 0 25%' }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="50%" height={18} />
            </Box>

            {/* Centro */}
            <Box sx={{ flex: '1 1 auto', px: 2 }}>
                <Skeleton variant="text" width="90%" />
            </Box>

            {/* Destra */}
            <Box sx={{ flex: '0 0 30%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                 <Skeleton variant="text" width="60%" height={20} />
                 <Skeleton variant="text" width="40%" height={16} />
            </Box>
        </Box>
    </Box>
);

const ReportListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <List disablePadding>
      {[...Array(count)].map((_, index) => (
        <Box key={index}>
            <ListItem>
                <ReportListItemSkeleton />
            </ListItem>
            {index < count - 1 && <Divider component="li" />}
        </Box>
      ))}
    </List>
  );
};

export default ReportListSkeleton;
