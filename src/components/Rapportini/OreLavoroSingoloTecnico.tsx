
import React from 'react';
import { FormControlLabel, Switch, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Paper, Box } from '@mui/material';
import Grid from '@mui/material/Grid';

// Interfaccia per i dati delle ore, garantisce la coerenza con il componente padre
interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null; // in minuti
    ore: number | null;
}

// Interfaccia per le props del componente
interface OreLavoroSingoloTecnicoProps {
    datiOre: DettaglioOreData;
    onUpdate: (data: DettaglioOreData) => void;
    isReadOnly: boolean;
    isScrivente: boolean;
}

// Funzione per generare le fasce orarie, rende il componente auto-contenuto
const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = h.toString().padStart(2, '0');
            const minute = m.toString().padStart(2, '0');
            slots.push(`${hour}:${minute}`);
        }
    }
    return slots;
};
const fasceOrarie = generateTimeSlots();
const pauseOpzioni = [0, 30, 60, 90, 120]; // in minuti

const OreLavoroSingoloTecnico: React.FC<OreLavoroSingoloTecnicoProps> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {
    // Se non ci sono dati, non renderizzare nulla per evitare errori
    if (!datiOre) {
        return null;
    }

    // Funzione per calcolare le ore totali in base a inizio, fine e pausa
    const calculateOre = (inizio: string | null, fine: string | null, pausa: number | null): number | null => {
        if (!inizio || !fine) return null;
        try {
            const start = new Date(`1970-01-01T${inizio}:00`);
            const end = new Date(`1970-01-01T${fine}:00`);
            // Se l'orario di fine è precedente o uguale a quello di inizio, le ore sono 0
            if (end <= start) return 0;
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / 60000;
            const totalHours = (diffMinutes - (pausa || 0)) / 60;
            // Arrotonda a due cifre decimali
            return Math.round(totalHours * 100) / 100;
        } catch (e) {
            console.error("Errore nel calcolo delle ore:", e);
            return null;
        }
    };

    // Handler unico per aggiornare i campi e notificare il genitore
    const handleFieldChange = <K extends keyof DettaglioOreData>(field: K, value: DettaglioOreData[K]) => {
        const newData = { ...datiOre, [field]: value };
        
        // Se non siamo in modalità manuale, ricalcola le ore ogni volta che inizio, fine o pausa cambiano
        if (field === 'oraInizio' || field === 'oraFine' || field === 'pausa') {
            const oreCalcolate = calculateOre(
                field === 'oraInizio' ? value as string : newData.oraInizio,
                field === 'oraFine' ? value as string : newData.oraFine,
                field === 'pausa' ? value as number : newData.pausa
            );
            newData.ore = oreCalcolate;
        }
        
        // Se si passa da manuale ad automatico, ricalcola le ore
        if (field === 'isManual' && value === false) {
             const oreCalcolate = calculateOre(newData.oraInizio, newData.oraFine, newData.pausa);
             newData.ore = oreCalcolate;
        }

        // Invia i dati aggiornati al componente padre
        onUpdate(newData);
    };

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: isScrivente ? '4px solid' : 'none', borderColor: 'primary.main' }}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
                {datiOre.nome} {isScrivente && '(Responsabile)'}
            </Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid size={12}>
                    <FormControlLabel
                        control={<Switch checked={datiOre.isManual} onChange={(e) => handleFieldChange('isManual', e.target.checked)} disabled={isReadOnly || !isScrivente} />}
                        label={isScrivente ? "Inserimento Ore Manuale (per tutti i tecnici)" : "Inserimento Ore Manuale"}
                    />
                </Grid>

                {datiOre.isManual ? (
                    <Grid size={12}>
                        <TextField
                            label="Ore Lavorate"
                            type="number"
                            value={datiOre.ore === null ? '' : datiOre.ore}
                            onChange={(e) => handleFieldChange('ore', e.target.value === '' ? null : parseFloat(e.target.value))}
                            fullWidth
                            disabled={isReadOnly}
                            InputProps={{
                                inputProps: {
                                    step: 0.5,
                                    min: 0,
                                },
                            }}
                        />
                    </Grid>
                ) : (
                    <>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Inizio</InputLabel>
                                <Select
                                    value={datiOre.oraInizio || ''}
                                    label="Inizio"
                                    onChange={(e) => handleFieldChange('oraInizio', e.target.value as string)}
                                    disabled={isReadOnly || !isScrivente}
                                >
                                    {fasceOrarie.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Fine</InputLabel>
                                <Select
                                    value={datiOre.oraFine || ''}
                                    label="Fine"
                                    onChange={(e) => handleFieldChange('oraFine', e.target.value as string)}
                                    disabled={isReadOnly || !isScrivente}
                                >
                                    {fasceOrarie.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Pausa (min)</InputLabel>
                                <Select
                                    value={datiOre.pausa === null ? '' : datiOre.pausa}
                                    label="Pausa (min)"
                                    onChange={(e) => handleFieldChange('pausa', e.target.value === '' ? null : Number(e.target.value))}
                                    disabled={isReadOnly || !isScrivente}
                                >
                                    {pauseOpzioni.map(p => <MenuItem key={p} value={p}>{p} min</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}>
                             <Typography variant="body2" sx={{ mt: 1, textAlign: 'right' }}>
                                Totale Ore: <strong>{datiOre.ore !== null ? datiOre.ore.toFixed(2) : 'N/A'}</strong>
                             </Typography>
                        </Grid>
                    </>
                )}
            </Grid>
        </Paper>
    );
};

export default OreLavoroSingoloTecnico;
