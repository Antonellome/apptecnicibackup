
import React from 'react';
import {
    Box, Typography, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { DettaglioOreData } from '@/models/definitions';

interface OreLavoroSingoloTecnicoProps {
    datiOre: DettaglioOreData;
    onUpdate: (data: DettaglioOreData) => void;
    isReadOnly: boolean;
    isScrivente?: boolean;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
});

const PAUSA_OPTIONS = [0, 30, 60, 90, 120];

const ORE_MANUALI_OPTIONS = Array.from({ length: 29 }, (_, i) => {
    const value = i * 0.5;
    const hours = Math.floor(value);
    const minutes = (value % 1) * 60;
    const timeLabel = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    let label = '';
    if (value <= 8) {
        label = `${timeLabel} ore`;
    } else {
        const straordinarioHours = Math.floor(value - 8);
        const straordinarioMinutes = ((value - 8) % 1) * 60;
        const straordinarioLabel = `${String(straordinarioHours).padStart(2, '0')}:${String(straordinarioMinutes).padStart(2, '0')}`;
        label = `8:00 + ${straordinarioLabel} ore`;
    }
    return { value, label };
});

const OreLavoroSingoloTecnico: React.FC<OreLavoroSingoloTecnicoProps> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {

    const handleGenericChange = (field: keyof DettaglioOreData, value: any) => {
        onUpdate({ ...datiOre, [field]: value });
    };
    
    // Genera ID unici per evitare conflitti quando il componente è usato più volte
    const uniqueId = React.useId();

    return (
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            {isScrivente && (
                <Typography variant="h6" gutterBottom>
                    Dettaglio Orario Scrivente
                </Typography>
            )}
            <Grid container spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <Grid size={12}>
                    <FormControlLabel
                        control={<Switch
                            checked={datiOre.isManual}
                            onChange={e => handleGenericChange('isManual', e.target.checked)}
                            disabled={isReadOnly}
                        />}
                        label="Inserimento Ore Manuale"
                    />
                </Grid>

                {datiOre.isManual ? (
                    <Grid size={12}>
                        <FormControl fullWidth disabled={isReadOnly}>
                            <InputLabel id={`${uniqueId}-ore-lavorate-label`}>Ore Lavorate</InputLabel>
                            <Select
                                labelId={`${uniqueId}-ore-lavorate-label`}
                                value={(datiOre.ore ?? '').toString()}
                                onChange={e => handleGenericChange('ore', parseFloat(e.target.value) || 0)}
                                label="Ore Lavorate"
                            >
                                {ORE_MANUALI_OPTIONS.map(option => (
                                    <MenuItem key={option.value} value={option.value.toString()}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                ) : (
                    <>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id={`${uniqueId}-ora-inizio-label`}>Ora Inizio</InputLabel>
                                <Select
                                    labelId={`${uniqueId}-ora-inizio-label`}
                                    value={datiOre.oraInizio || ''}
                                    onChange={e => handleGenericChange('oraInizio', e.target.value)}
                                    label="Ora Inizio"
                                >
                                    {TIME_OPTIONS.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id={`${uniqueId}-ora-fine-label`}>Ora Fine</InputLabel>
                                <Select
                                    labelId={`${uniqueId}-ora-fine-label`}
                                    value={datiOre.oraFine || ''}
                                    onChange={e => handleGenericChange('oraFine', e.target.value)}
                                    label="Ora Fine"
                                >
                                    {TIME_OPTIONS.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                             <FormControl fullWidth disabled={isReadOnly}>
                                <InputLabel id={`${uniqueId}-pausa-label`}>Pausa (min)</InputLabel>
                                <Select
                                    labelId={`${uniqueId}-pausa-label`}
                                    value={(datiOre.pausa ?? '').toString()}
                                    onChange={e => handleGenericChange('pausa', parseInt(e.target.value as string, 10))}
                                    label="Pausa (min)"
                                >
                                    {PAUSA_OPTIONS.map(p => <MenuItem key={p} value={p.toString()}>{p}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </>
                )}
            </Grid>
        </Box>
    );
};

export default OreLavoroSingoloTecnico;
