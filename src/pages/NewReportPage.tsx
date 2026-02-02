import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuBar from '../components/MenuBar';

const NewReportPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftType: 'Ordinaria',
    startTime: '07:30',
    endTime: '16:30',
    ship: '',
    location: '',
    description: '',
    workDone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name as string]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logica di salvataggio del report qui
    console.log('Dati inviati:', formData);
    navigate('/'); // Torna alla home dopo l'invio
  };

  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#1a1a1a' }}>
          <MenuBar title="Nuovo Report" />
          <Box sx={{ p: 3, flexGrow: 1, color: '#fff' }}>
            <Paper sx={{ 
                p: 3, 
                backgroundColor: 'rgba(40, 40, 40, 0.9)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px'
            }}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <TextField
                            name="date"
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true, sx: { color: '#fff' } }}
                            sx={{ input: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <FormControl fullWidth sx={{ fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}>
                            <InputLabel sx={{ color: '#fff' }}>Tipo Turno</InputLabel>
                            <Select
                                name="shiftType"
                                value={formData.shiftType}
                                label="Tipo Turno"
                                onChange={handleInputChange as any}
                                sx={{ color: '#fff', '.MuiSvgIcon-root': { color: '#fff' } }}
                            >
                                <MenuItem value="Ordinaria">Ordinaria</MenuItem>
                                <MenuItem value="Straordinaria">Straordinaria</MenuItem>
                                <MenuItem value="Festiva">Festiva</MenuItem>
                                <MenuItem value="Ferie">Ferie</MenuItem>
                                <MenuItem value="Permesso">Permesso</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <TextField
                            name="startTime"
                            label="Ora Inizio"
                            type="time"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true, sx: { color: '#fff' } }}
                            sx={{ input: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6
                        }}>
                        <TextField
                            name="endTime"
                            label="Ora Fine"
                            type="time"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ shrink: true, sx: { color: '#fff' } }}
                            sx={{ input: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            name="ship"
                            label="Nave"
                            value={formData.ship}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ sx: { color: '#fff' } }}
                            sx={{ input: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            name="location"
                            label="Cantiere"
                            value={formData.location}
                            onChange={handleInputChange}
                            fullWidth
                            InputLabelProps={{ sx: { color: '#fff' } }}
                            sx={{ input: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            name="description"
                            label="Descrizione Lavoro"
                            value={formData.description}
                            onChange={handleInputChange}
                            multiline
                            rows={3}
                            fullWidth
                            InputLabelProps={{ sx: { color: '#fff' } }}
                            sx={{ textarea: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            name="workDone"
                            label="Lavoro Svolto"
                            value={formData.workDone}
                            onChange={handleInputChange}
                            multiline
                            rows={3}
                            fullWidth
                            InputLabelProps={{ sx: { color: '#fff' } }}
                            sx={{ textarea: { color: '#fff' }, fieldset: { borderColor: 'rgba(255,255,255,0.3)' } }}
                        />
                    </Grid>
                    <Grid size={12}>
                      <Button type="submit" variant="contained" fullWidth sx={{ 
                          backgroundColor: '#2563eb', 
                          p: 1.5, 
                          fontWeight: 'bold', 
                          letterSpacing: '1px',
                          '&:hover': { backgroundColor: '#1d4ed8' } 
                        }}>
                        Salva Report
                      </Button>
                    </Grid>
                </Grid>
              </form>
            </Paper>
          </Box>
            <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', p: 2 }}>
                by "AS"
            </Typography>
      </Box>
  );
};

export default NewReportPage;
