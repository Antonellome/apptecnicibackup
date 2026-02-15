import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    Grid, 
    TextField, 
    Button, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    Checkbox, 
    ListItemText, 
    OutlinedInput,
    CircularProgress
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

// Placeholder data - replace with actual data fetching
interface Technician {
    id: string;
    name: string;
}

const ReportPage = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
    const [status, setStatus] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechnicians = async () => {
            try {
                // This should point to your actual collection of users/technicians
                const usersCollectionRef = collection(db, 'users'); 
                const snapshot = await getDocs(usersCollectionRef);
                const techList = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    name: doc.data().displayName || doc.id 
                }));
                setTechnicians(techList);
            } catch (error) {
                console.error("Error fetching technicians:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTechnicians();
    }, []);

    const handleTechChange = (event: any) => {
        const { target: { value } } = event;
        setSelectedTechIds(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleGenerateReport = () => {
        console.log("Generating report with filters:", { startDate, endDate, selectedTechIds, status });
        // Report generation logic will be implemented here
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Filtri Report</Typography>
                <Grid container spacing={3}>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <TextField
                            label="Dal"
                            type="date"
                            fullWidth
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <TextField
                            label="Al"
                            type="date"
                            fullWidth
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 6
                        }}>
                        <FormControl fullWidth>
                            <InputLabel id="tech-select-label">Tecnici</InputLabel>
                            <Select
                                labelId="tech-select-label"
                                multiple
                                value={selectedTechIds}
                                onChange={handleTechChange}
                                input={<OutlinedInput label="Tecnici" />}
                                renderValue={(selected) => 
                                    (selected as string[]).map(id => technicians.find(t => t.id === id)?.name).join(', ')
                                }
                            >
                                {technicians.map((tech) => (
                                    <MenuItem key={tech.id} value={tech.id}>
                                        <Checkbox checked={selectedTechIds.indexOf(tech.id) > -1} />
                                        <ListItemText primary={tech.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 6
                        }}>
                        <FormControl fullWidth>
                            <InputLabel id="status-select-label">Stato</InputLabel>
                            <Select
                                labelId="status-select-label"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                label="Stato"
                            >
                                <MenuItem value="all">Tutti</MenuItem>
                                <MenuItem value="open">Aperto</MenuItem>
                                <MenuItem value="closed">Chiuso</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid sx={{ textAlign: 'right' }} size={12}>
                        <Button variant="contained" color="primary" onClick={handleGenerateReport}>
                            Genera Report
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
            {/* Placeholder for report results and totals */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Risultati</Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography>I dati del report verranno visualizzati qui.</Typography>
                </Box>
                 <Box sx={{ mt: 4, textAlign: 'right' }}>
                    <Typography variant="h6">Totale Ore: 0</Typography>
                    <Typography variant="h6">Totale Costi: 0.00 €</Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default ReportPage;
