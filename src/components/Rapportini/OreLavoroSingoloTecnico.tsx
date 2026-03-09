import React, { useState, useEffect, useMemo } from 'react';
import {
    FormControlLabel,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Paper,
    SelectChangeEvent
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Import corretto per MUI v7

// --- Definizioni e Tipi ---
interface OreLavoroData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null; // in minuti
    ore: number | null; // in ore (es. 8.5)
}

interface Props {
    datiOre: OreLavoroData;
    onUpdate: (data: OreLavoroData) => void;
    isReadOnly: boolean;
    isScrivente: boolean;
}

// --- Funzioni Helper (pure, fuori dal componente) ---
const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = (i % 2 === 0 ? '00' : '30');
    return `${h}:${m}`;
});

const manualTotalHoursOptions = Array.from({ length: 48 }, (_, i) => {
    const ore = (i + 1) * 0.5;
    return { value: ore, label: ore.toString().replace('.5', ':30') };
});

const formatOreLavorate = (ore: number | null): string => {
    if (ore === null || ore <= 0) {
        return '0';
    }

    if (ore <= 8) {
        const hours = Math.floor(ore);
        const minutes = (ore % 1) * 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else {
        const straordinario = ore - 8;
        return `8+${straordinario}`;
    }
};

const parseTime = (timeStr: string | null): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// --- Componente Principale ---
const OreLavoroSingoloTecnico: React.FC<Props> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {

    const [datiInterni, setDatiInterni] = useState<OreLavoroData>(datiOre);

    useEffect(() => {
        setDatiInterni(datiOre);
    }, [datiOre]);

    const oreCalcolate = useMemo(() => {
        if (datiInterni.isManual) {
            return datiInterni.ore;
        }
        const start = parseTime(datiInterni.oraInizio);
        const end = parseTime(datiInterni.oraFine);
        const breakTime = datiInterni.pausa || 0;

        if (end <= start) return 0;
        
        const durationInMinutes = end - start - breakTime;
        return Math.max(0, durationInMinutes / 60);

    }, [datiInterni.isManual, datiInterni.oraInizio, datiInterni.oraFine, datiInterni.pausa, datiInterni.ore]);

    useEffect(() => {
        const finalData = { ...datiInterni, ore: oreCalcolate };
        if (JSON.stringify(finalData) !== JSON.stringify(datiOre)) {
            onUpdate(finalData);
        }
    }, [datiInterni, oreCalcolate, onUpdate, datiOre]);

    const handleFieldChange = (field: keyof OreLavoroData, value: any) => {
        setDatiInterni(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSelectChange = (field: keyof OreLavoroData) => (event: SelectChangeEvent<any>) => {
        handleFieldChange(field, event.target.value);
    };

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: isScrivente ? '4px solid' : 'none', borderColor: 'primary.main' }}>
            <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                {datiInterni.nome} {isScrivente && '(Responsabile)'}
            </Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                        control={<Switch checked={datiInterni.isManual} onChange={(e) => handleFieldChange('isManual', e.target.checked)} disabled={isReadOnly || !isScrivente} />}
                        label={isScrivente ? "Inserimento Manuale per Tutti" : "Inserimento Manuale Ore"}
                    />
                </Grid>
                {!datiInterni.isManual ? (
                    <>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Inizio</InputLabel>
                                <Select value={datiInterni.oraInizio || ''} label="Inizio" onChange={handleSelectChange('oraInizio')} disabled={isReadOnly}>
                                    {timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Fine</InputLabel>
                                <Select value={datiInterni.oraFine || ''} label="Fine" onChange={handleSelectChange('oraFine')} disabled={isReadOnly}>
                                    {timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Pausa (min)</InputLabel>
                                <Select value={datiInterni.pausa ?? ''} label="Pausa (min)" onChange={(e) => handleFieldChange('pausa', Number(e.target.value))} disabled={isReadOnly}>
                                    <MenuItem value={0}>0</MenuItem>
                                    <MenuItem value={15}>15</MenuItem>
                                    <MenuItem value={30}>30</MenuItem>
                                    <MenuItem value={45}>45</MenuItem>
                                    <MenuItem value={60}>60</MenuItem>
                                    <MenuItem value={90}>90</MenuItem>
                                    <MenuItem value={120}>120</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }} sx={{mt: 2}}>
                            <TextField label="Totale Ore Calcolato" value={formatOreLavorate(oreCalcolate)} fullWidth InputProps={{ readOnly: true }} variant="filled" />
                        </Grid>
                    </>
                ) : (
                    <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Totale Ore</InputLabel>
                            <Select
                                value={datiInterni.ore ?? ''}
                                label="Totale Ore"
                                onChange={(e) => handleFieldChange('ore', Number(e.target.value))}
                                disabled={isReadOnly}
                            >
                                {manualTotalHoursOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
};

export default OreLavoroSingoloTecnico;
