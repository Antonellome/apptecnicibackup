
import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid,
    FormControlLabel,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Paper,
} from '@mui/material';

// Definizioni di tipi per le props
interface OreLavoroData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

interface Props {
    datiOre: OreLavoroData;
    onUpdate: (data: OreLavoroData) => void;
    isReadOnly: boolean;
    isScrivente: boolean; // Per distinguere il tecnico principale
}

// Opzioni per i selettori di tempo
const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = (i % 2 === 0 ? '00' : '30');
    return `${h}:${m}`;
});

const generateManualHoursOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 24; i += 0.5) {
        options.push({ value: i, label: i.toString().replace('.5', ':30') });
    }
    return options;
};
const manualTotalHoursOptions = generateManualHoursOptions();

const formatOreLavorate = (ore: number | null): string => {
    if (ore === null || ore <= 0) return '0';
    return ore.toString().replace('.5', ':30');
};

const parseTime = (timeStr: string | null): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const OreLavoroSingoloTecnico: React.FC<Props> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {
    const [isManual, setIsManual] = useState(datiOre.isManual);
    const [oraInizio, setOraInizio] = useState(datiOre.oraInizio);
    const [oraFine, setOraFine] = useState(datiOre.oraFine);
    const [pausa, setPausa] = useState(datiOre.pausa);
    const [oreLavoro, setOreLavoro] = useState(datiOre.ore);

    const memoizedOnUpdate = useCallback(onUpdate, []);

    // Calcolo automatico delle ore
    useEffect(() => {
        let newOre: number;
        if (isManual) {
            newOre = oreLavoro || 0;
        } else {
            const start = parseTime(oraInizio);
            const end = parseTime(oraFine);
            const breakTime = pausa || 0;
            const duration = end > start ? end - start - breakTime : 0;
            newOre = Math.max(0, duration / 60);
        }
        
        if (newOre !== oreLavoro) {
            setOreLavoro(newOre);
        }

    }, [oraInizio, oraFine, pausa, isManual, oreLavoro]);

    // Propagazione degli aggiornamenti al componente padre
    useEffect(() => {
        memoizedOnUpdate({
            ...datiOre,
            isManual,
            oraInizio,
            oraFine,
            pausa,
            ore: oreLavoro,
        });
    }, [isManual, oraInizio, oraFine, pausa, oreLavoro, memoizedOnUpdate, datiOre]);
    
    // Sincronizza lo stato se le props cambiano dall'esterno
    useEffect(() => {
        setIsManual(datiOre.isManual);
        setOraInizio(datiOre.oraInizio);
        setOraFine(datiOre.oraFine);
        setPausa(datiOre.pausa);
        setOreLavoro(datiOre.ore);
    }, [datiOre]);


    return (
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: isScrivente ? '4px solid' : 'none', borderColor: 'primary.main' }}>
            <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                {datiOre.nome} {isScrivente && '(Responsabile)'}
            </Typography>
            <Grid container spacing={2}>
                <Grid size={12}>
                    <FormControlLabel
                        control={<Switch checked={isManual} onChange={(e) => setIsManual(e.target.checked)} disabled={isReadOnly || !isScrivente} />}
                        label={isScrivente ? "Inserimento Manuale per Tutti" : "Inserimento Manuale Ore"}
                    />
                </Grid>
                {!isManual ? (
                    <>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Inizio</InputLabel>
                                <Select value={oraInizio || ''} label="Inizio" onChange={(e) => setOraInizio(e.target.value)} disabled={isReadOnly}>
                                    {timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Fine</InputLabel>
                                <Select value={oraFine || ''} label="Fine" onChange={(e) => setOraFine(e.target.value)} disabled={isReadOnly}>
                                    {timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Pausa</InputLabel>
                                <Select value={pausa ?? ''} label="Pausa" onChange={(e) => setPausa(Number(e.target.value))} disabled={isReadOnly}>
                                    <MenuItem value={0}>0 min</MenuItem>
                                    <MenuItem value={30}>30 min</MenuItem>
                                    <MenuItem value={60}>60 min</MenuItem>
                                    <MenuItem value={90}>90 min</MenuItem>
                                    <MenuItem value={120}>120 min</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Totale Ore Calcolato" value={formatOreLavorate(oreLavoro)} fullWidth disabled />
                        </Grid>
                    </>
                ) : (
                    <Grid size={12}>
                        <FormControl fullWidth required>
                            <InputLabel>Totale Ore</InputLabel>
                            <Select
                                value={oreLavoro ?? ''}
                                label="Totale Ore"
                                onChange={(e) => setOreLavoro(Number(e.target.value))}
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
