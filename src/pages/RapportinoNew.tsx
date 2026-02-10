
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography, TextField, Box,
    FormControlLabel, Switch, Autocomplete, Button, Card, CardContent, CardHeader, CircularProgress
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useAuth } from '../hooks/useAuth';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import dayjs, { Dayjs } from 'dayjs';
import { collection, addDoc, Timestamp, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Rapportino } from '../models/definitions'; 

import InfoOutlined from '@mui/icons-material/InfoOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import WorkOutline from '@mui/icons-material/WorkOutline';
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';

const SectionCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardHeader avatar={icon} title={<Typography variant="h6" component="div">{title}</Typography>} sx={{ borderBottom: 1, borderColor: 'divider' }} />
        <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {children}
            </Box>
        </CardContent>
    </Card>
);

const RapportinoNew = () => {
    const navigate = useNavigate();
    const { currentUser: tecnicoCorrente } = useAuth();

    const { data: tipiGiornata, loading: l_tipiGiornata } = useFirestoreCollection('tipi_giornata_data');
    const { data: navi, loading: l_navi } = useFirestoreCollection('navi_data');
    const { data: luoghi, loading: l_luoghi } = useFirestoreCollection('luoghi_data');
    const { data: veicoli, loading: l_veicoli } = useFirestoreCollection('veicoli_data');
    const { data: tecnici, loading: l_tecnici } = useFirestoreCollection('tecnici_data');

    const [rapportino, setRapportino] = useState<Partial<Rapportino>>({
        data: Timestamp.fromDate(dayjs().startOf('day').toDate()),
        inserimentoManualeOre: false,
        oreLavorate: 8,
        pausa: 60, // Default 60 min
        oraInizio: Timestamp.fromDate(dayjs().hour(7).minute(30).second(0).toDate()),
        oraFine: Timestamp.fromDate(dayjs().hour(16).minute(30).second(0).toDate()),
        tecniciAggiunti: [],
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field: keyof Rapportino, value: any) => {
        setRapportino(prev => ({ ...prev, [field]: value }));
    };
    
    const handleDateChange = (date: Dayjs | null) => {
        if (date) handleChange("data", Timestamp.fromDate(date.toDate()));
    };
    
    const handleTimeChange = (field: keyof Rapportino, time: Dayjs | null) => {
        if (time) {
             const newDate = dayjs(rapportino.data?.toDate()).hour(time.hour()).minute(time.minute()).second(0);
             handleChange(field, Timestamp.fromDate(newDate.toDate()));
        }
    };

    const handleOreLavorateChange = (time: Dayjs | null) => {
        if (time) {
            const hours = time.hour();
            const minutes = time.minute();
            const totalHours = hours + minutes / 60;
            handleChange('oreLavorate', totalHours);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!tecnicoCorrente) return alert("Utente non autenticato.");
        if (!rapportino.giornataId) return alert("Il Tipo Giornata è obbligatorio.");

        setLoading(true);
        try {
            const rapportinoToSave: Omit<Rapportino, 'id'> = {
                ...(rapportino as Partial<Omit<Rapportino, 'id'>>),
                data: rapportino.data!,
                tecnicoScriventeRef: doc(db, 'tecnici_data', tecnicoCorrente.id),
                giornataRef: doc(db, 'tipi_giornata_data', rapportino.giornataId.id),
                naveRef: rapportino.naveId ? doc(db, 'navi_data', rapportino.naveId.id) : null,
                luogoRef: rapportino.luogoId ? doc(db, 'luoghi_data', rapportino.luogoId.id) : null,
                veicoloRef: rapportino.veicoloId ? doc(db, 'veicoli_data', rapportino.veicoloId.id) : null,
                tecniciAggiuntiRefs: rapportino.tecniciAggiunti?.map(t => doc(db, 'tecnici_data', t.id)) || [],
                createdAt: Timestamp.now(),
            };

            delete (rapportinoToSave as any).giornataId;
            delete (rapportinoToSave as any).naveId;
            delete (rapportinoToSave as any).luogoId;
            delete (rapportinoToSave as any).veicoloId;
            delete (rapportinoToSave as any).tecniciAggiunti;

            await addDoc(collection(db, 'rapportini'), rapportinoToSave);
            alert("Report salvato con successo!");
            navigate('/');
        } catch (error) {
            console.error("Errore salvataggio: ", error);
            alert(`Errore: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const altriTecniciOptions = tecnici.filter(t => t.id !== tecnicoCorrente?.id);

    const oreLavorateValue = rapportino.oreLavorate || 8;
    const oreLavorateHours = Math.floor(oreLavorateValue);
    const oreLavorateMinutes = Math.round((oreLavorateValue % 1) * 60);
    const oreLavorateAsDayjs = dayjs().startOf('day').hour(oreLavorateHours).minute(oreLavorateMinutes);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box component="form" noValidate autoComplete="off" sx={{ maxWidth: 700, margin: 'auto' }} onSubmit={handleSubmit}>
                <Typography variant="h4" component="h1" sx={{ mb: 3, textAlign: 'center' }}>Creazione Nuovo Report</Typography>

                <SectionCard title="Dati Principali" icon={<InfoOutlined color="primary" />}>
                    <DatePicker label="Data" value={dayjs(rapportino.data?.toDate())} onChange={handleDateChange} sx={{ width: '100%' }} format="DD/MM/YYYY" />
                    <TextField label="Tecnico Scrivente" value={tecnicoCorrente ? `${tecnicoCorrente.nome} ${tecnicoCorrente.cognome}` : ''} InputProps={{ readOnly: true }} variant="outlined" fullWidth />
                </SectionCard>

                <SectionCard title="Calcolo Ore" icon={<AccessTimeOutlined color="primary" />}>
                    <FormControlLabel control={<Switch checked={rapportino.inserimentoManualeOre} onChange={(e) => handleChange('inserimentoManualeOre', e.target.checked)} />} label="Inserimento manuale ore" />
                    {!rapportino.inserimentoManualeOre ? (
                        <>
                            <TimePicker label="Ora Inizio" value={rapportino.oraInizio ? dayjs(rapportino.oraInizio.toDate()) : null} onChange={(t) => handleTimeChange('oraInizio', t)} sx={{ width: '100%' }} ampm={false} />
                            <TimePicker label="Ora Fine" value={rapportino.oraFine ? dayjs(rapportino.oraFine.toDate()) : null} onChange={(t) => handleTimeChange('oraFine', t)} sx={{ width: '100%' }} ampm={false} />
                            <TextField label="Pausa (minuti)" type="number" value={rapportino.pausa || ''} onChange={(e) => handleChange('pausa', parseInt(e.target.value))} fullWidth variant="outlined"/>
                        </>
                    ) : (
                        <TimePicker
                            label="Ore Lavorate"
                            value={oreLavorateAsDayjs}
                            onChange={handleOreLavorateChange}
                            ampm={false}
                            sx={{ width: '100%' }}
                        />
                    )}
                </SectionCard>

                <SectionCard title="Riferimenti" icon={<AssignmentIndOutlined color="primary" />}>
                    <Autocomplete options={tipiGiornata} value={rapportino.giornataId || null} onChange={(_, val) => handleChange('giornataId', val)} getOptionLabel={(o) => o.nome || ''} loading={l_tipiGiornata} renderInput={(p) => <TextField {...p} label="Tipo Giornata" variant="outlined" required />} />
                    <Autocomplete options={veicoli} value={rapportino.veicoloId || null} onChange={(_, val) => handleChange('veicoloId', val)} getOptionLabel={(o) => o.nome || ''} loading={l_veicoli} renderInput={(p) => <TextField {...p} label="Veicolo" variant="outlined" />} />
                    <Autocomplete options={navi} value={rapportino.naveId || null} onChange={(_, val) => handleChange('naveId', val)} getOptionLabel={(o) => o.nome || ''} loading={l_navi} renderInput={(p) => <TextField {...p} label="Nave" variant="outlined" />} />
                    <Autocomplete options={luoghi} value={rapportino.luogoId || null} onChange={(_, val) => handleChange('luogoId', val)} getOptionLabel={(o) => o.nome || ''} loading={l_luoghi} renderInput={(p) => <TextField {...p} label="Luogo" variant="outlined" />} />
                </SectionCard>

                <SectionCard title="Dettagli Intervento" icon={<WorkOutline color="primary" />}>
                    <TextField label="Breve Descrizione" value={rapportino.descrizioneBreve || ''} onChange={(e) => handleChange('descrizioneBreve', e.target.value)} fullWidth variant="outlined" />
                    <TextField label="Lavoro Eseguito" value={rapportino.lavoroEseguito || ''} onChange={(e) => handleChange('lavoroEseguito', e.target.value)} multiline rows={4} fullWidth variant="outlined" />
                    <TextField label="Materiali Impiegati" value={rapportino.materialiImpiegati || ''} onChange={(e) => handleChange('materialiImpiegati', e.target.value)} multiline rows={2} fullWidth variant="outlined" />
                </SectionCard>

                <SectionCard title="Altri Tecnici Coinvolti" icon={<AssignmentIndOutlined color="primary" />}>
                    <Autocomplete
                        multiple
                        options={altriTecniciOptions}
                        value={rapportino.tecniciAggiunti || []}
                        onChange={(_, newValue) => handleChange('tecniciAggiunti', newValue)}
                        getOptionLabel={(option) => `${option.nome} ${option.cognome}`}
                        loading={l_tecnici}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                label="Aggiungi tecnici"
                                placeholder="Seleziona..."
                            />
                        )}
                    />
                </SectionCard>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, mb: 4 }}>
                    <Button type="submit" variant="contained" color="primary" size="large" startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SaveOutlined />} disabled={loading}>
                        {loading ? 'Salvataggio in corso...' : 'Salva Report'}
                    </Button>
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default RapportinoNew;
