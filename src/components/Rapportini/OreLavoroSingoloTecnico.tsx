import React from 'react';
import {
    Box, Typography, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import Grid from '@mui/material/Grid'; // <-- IMPORT CORRETTO (V2)
import { DettaglioOreData } from '@/models/definitions';
import dayjs from 'dayjs';

interface OreLavoroSingoloTecnicoProps {
    datiOre: DettaglioOreData;
    onUpdate: (data: DettaglioOreData) => void;
    isReadOnly: boolean;
    isScrivente?: boolean;
}

// --- GENERAZIONE OPZIONI MENU A TENDINA ---
const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        options.push(`${String(h).padStart(2, '0')}:00`);
        options.push(`${String(h).padStart(2, '0')}:30`);
    }
    return options;
};
const TIME_OPTIONS = generateTimeOptions();

const PAUSA_OPTIONS = [0, 30, 60];

const generateManualHourOptions = () => {
    const options: { value: number; label: string }[] = [];
    for (let i = 0; i <= 8; i += 0.5) {
        options.push({ value: i, label: `${i.toFixed(1)} ore` });
    }
    for (let i = 8.5; i <= 24; i += 0.5) {
        const extra = i - 8;
        options.push({ value: i, label: `8 ore + ${extra.toFixed(1)} ore` });
    }
    return options;
};
const ORE_MANUALI_OPTIONS = generateManualHourOptions();
// --- FINE GENERAZIONE OPZIONI ---


const OreLavoroSingoloTecnico: React.FC<OreLavoroSingoloTecnicoProps> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {

    const handleValueChange = (field: keyof DettaglioOreData, value: any) => {
        const newDati = { ...datiOre, [field]: value };

        if (field === 'isManual') {
            if (value === false) { // Passato a modalità Orario
                const inizio = dayjs(`1970-01-01T${newDati.oraInizio}`);
                const fine = dayjs(`1970-01-01T${newDati.oraFine}`);
                if (fine.isAfter(inizio)) {
                    const diff = fine.diff(inizio, 'minute');
                    const oreCalcolate = (diff - (newDati.pausa || 0)) / 60;
                    newDati.ore = Math.max(0, parseFloat(oreCalcolate.toFixed(2)));
                }
            } else { // Passato a modalità Manuale
                 newDati.ore = 8; // Default a 8 ore
            }
        } else if (!newDati.isManual && (field === 'oraInizio' || field === 'oraFine' || field === 'pausa')) {
            const inizio = dayjs(`1970-01-01T${newDati.oraInizio || '00:00'}`);
            const fine = dayjs(`1970-01-01T${newDati.oraFine || '00:00'}`);
            if (fine.isAfter(inizio)) {
                const diff = fine.diff(inizio, 'minute');
                const oreCalcolate = (diff - (newDati.pausa || 0)) / 60;
                 newDati.ore = Math.max(0, parseFloat(oreCalcolate.toFixed(2)));
            }
        } else if (newDati.isManual && field === 'ore') {
             newDati.ore = value;
        }

        onUpdate(newDati);
    };

    const switchLabel = isScrivente ? "Inserimento Manuale (per tutti)" : "Inserimento Manuale";

    return (
        <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, mt: 1 }}>
            <Grid container spacing={2} alignItems="center">
                 {isScrivente && (
                    <Grid size={12}>
                        <Typography variant="subtitle1" fontWeight="bold">Orario Tecnico Responsabile</Typography>
                     </Grid>
                 )}

                <Grid size={12}>
                    <FormControlLabel 
                        control={
                            <Switch 
                                checked={datiOre.isManual}
                                onChange={(e) => handleValueChange('isManual', e.target.checked)} 
                                disabled={isReadOnly} 
                            />
                        }
                        label={switchLabel} 
                    />
                </Grid>

                {!datiOre.isManual ? (
                    <>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 4
                            }}>
                            <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id="inizio-label">Inizio</InputLabel>
                                <Select
                                    labelId="inizio-label"
                                    value={datiOre.oraInizio || '07:30'}
                                    label="Inizio"
                                    onChange={e => handleValueChange('oraInizio', e.target.value)}
                                >
                                    {TIME_OPTIONS.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 4
                            }}>
                            <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id="fine-label">Fine</InputLabel>
                                <Select
                                    labelId="fine-label"
                                    value={datiOre.oraFine || '16:30'}
                                    label="Fine"
                                    onChange={e => handleValueChange('oraFine', e.target.value)}
                                >
                                    {TIME_OPTIONS.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}>
                            <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id="pausa-label">Pausa (min)</InputLabel>
                                <Select 
                                    labelId="pausa-label"
                                    value={datiOre.pausa ?? 60} 
                                    label="Pausa (min)" 
                                    onChange={e => handleValueChange('pausa', Number(e.target.value))}
                                >
                                    {PAUSA_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                             <TextField
                                label="Totale Ore Calcolato"
                                value={(datiOre.ore ?? 0).toFixed(2)}
                                InputProps={{
                                    readOnly: true,
                                    sx: {
                                        '& input': {
                                            textAlign: 'center'
                                        }
                                    }
                                }}
                                variant="filled"
                                fullWidth
                            />
                        </Grid>
                    </>
                ) : (
                    <Grid size={12}>
                        <FormControl fullWidth disabled={isReadOnly}>
                            <InputLabel id="ore-manuali-label">Ore Lavorate</InputLabel>
                            <Select
                                labelId="ore-manuali-label"
                                value={datiOre.ore ?? 8}
                                label="Ore Lavorate"
                                onChange={e => handleValueChange('ore', Number(e.target.value))}
                            >
                                {ORE_MANUALI_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default OreLavoroSingoloTecnico;
