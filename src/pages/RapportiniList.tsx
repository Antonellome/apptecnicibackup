import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, getDoc } from 'firebase/firestore';
import type { DocumentReference, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useNavigate } from 'react-router-dom';
import { 
    Paper, Typography, Button, CircularProgress, Box, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Grid, TextField, Autocomplete, IconButton 
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs as DayjsType } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { Rapportino, Tecnico, Cliente, Nave, Luogo } from '@/models/definitions';

dayjs.locale('it');

// Interfaccia "Populated" che conterrà i dati risolti dalle reference
interface RapportinoPopulated {
  id: string;
  data?: Date;
  oreLavorate?: number;
  oraInizio?: Date;
  oraFine?: Date;
  tecnicoScrivente: Tecnico | null;
  nave: Nave | null;
  cliente: Cliente | null;
  luogo: Luogo | null;
}

// Opzioni per i filtri Autocomplete
interface FilterOptions {
    tecnici: Tecnico[];
    clienti: Cliente[];
    navi: Nave[];
    luoghi: Luogo[];
}

// Stato attuale dei filtri
interface FilterState {
    dataDa: DayjsType | null;
    dataA: DayjsType | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    luogo: Luogo | null;
    cliente: Cliente | null;
}

const RapportiniList = () => {
  const [rapportini, setRapportini] = useState<RapportinoPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>({ 
    dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null 
  });

  const [options, setOptions] = useState<FilterOptions>({ tecnici: [], clienti: [], navi: [], luoghi: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        // Caricamento in parallelo di tutte le anagrafiche per i filtri
        const [tecniciSnap, clientiSnap, naviSnap, luoghiSnap] = await Promise.all([
            getDocs(collection(db, 'tecnici')),
            getDocs(collection(db, 'clienti')),
            getDocs(collection(db, 'navi')),
            getDocs(collection(db, 'luoghi')),
        ]);

        const mapSnap = <T extends {id: string}>(snap: DocumentData) => 
            snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as T));

        // Funzioni di ordinamento
        const sortByCognomeNome = (a: Tecnico, b: Tecnico) => (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || '');
        const sortByName = (a: { nome?: string }, b: { nome?: string }) => (a.nome || '').localeCompare(b.nome || '');

        setOptions({ 
            tecnici: mapSnap<Tecnico>(tecniciSnap).sort(sortByCognomeNome), 
            clienti: mapSnap<Cliente>(clientiSnap).sort(sortByName),
            navi: mapSnap<Nave>(naviSnap).sort(sortByName),
            luoghi: mapSnap<Luogo>(luoghiSnap).sort(sortByName),
        });

        // Caricamento dei rapportini
        const rapportiniSnapshot = await getDocs(collection(db, 'rapportini'));
        
        const rapportiniListPromises = rapportiniSnapshot.docs.map(async (doc) => {
            const data = doc.data() as Partial<Rapportino>; // Usiamo Partial per sicurezza
            
            // Funzione di risoluzione reference sicura
            const resolveRef = async <T,>(ref: unknown): Promise<T | null> => {
                if (!(ref instanceof DocumentReference)) return null;
                try {
                    const docSnap = await getDoc(ref);
                    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
                } catch { return null; }
            };
            
            try {
                const [tecnicoScrivente, nave, cliente, luogo] = await Promise.all([
                    resolveRef<Tecnico>(data.tecnicoScriventeId),
                    resolveRef<Nave>(data.naveId),
                    resolveRef<Cliente>(data.clienteId),
                    resolveRef<Luogo>(data.luogoId),
                ]);
                
                // Funzione di conversione Timestamp sicura
                const toDate = (ts: unknown) => ts instanceof Timestamp ? ts.toDate() : undefined;

                return {
                    id: doc.id,
                    data: toDate(data.data),
                    oraInizio: toDate(data.oraInizio),
                    oraFine: toDate(data.oraFine),
                    oreLavorate: data.oreLavorate,
                    tecnicoScrivente,
                    nave,
                    cliente,
                    luogo,
                } as RapportinoPopulated;

            } catch (singleError) {
                console.error(`Impossibile processare il rapportino ${doc.id}:`, singleError);
                return null; // Salta il rapportino che causa errore, non bloccare tutto
            }
        });
        
        // Filtra eventuali rapportini falliti e aggiorna lo stato
        const rapportiniList = (await Promise.all(rapportiniListPromises)).filter(Boolean) as RapportinoPopulated[];
        setRapportini(rapportiniList.sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))); // Ordina per data, più recente prima

    } catch (error) {
        console.error("Errore grave durante il fetch dei dati:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gestione cambiamento filtri
  const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Reset dei filtri
  const resetFilters = () => {
    setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null });
  };

  const filteredRapportini = useMemo(() => {
    return rapportini.filter(r => {
        if (!r.data) return false; // Ignora rapportini senza data
        const rapportinoDate = dayjs(r.data);
        if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
        if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
        if (filters.tecnico && r.tecnicoScrivente?.id !== filters.tecnico.id) return false;
        if (filters.nave && r.nave?.id !== filters.nave.id) return false;
        if (filters.luogo && r.luogo?.id !== filters.luogo.id) return false;
        if (filters.cliente && r.cliente?.id !== filters.cliente.id) return false;
        return true;
    });
  }, [rapportini, filters]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
      <Box sx={{ p: { xs: 1, sm: 2, md: 3} }}>
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" component="h1">Elenco Rapportini</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rapportini/nuovo')}>Nuovo</Button>
            </Box>
            <Typography variant="h6" gutterBottom>Filtri</Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={options.tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(p) => <TextField {...p} label="Tecnico" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={options.clienti} getOptionLabel={(o) => o.nome || ''} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(p) => <TextField {...p} label="Cliente" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(p) => <TextField {...p} label="Nave" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(p) => <TextField {...p} label="Luogo" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} /></Grid>
                <Grid item xs={12} container justifyContent="flex-end" alignItems="center" gap={1}><Button onClick={resetFilters} variant="outlined">Reset</Button></Grid>
            </Grid>
        </Paper>

        <TableContainer component={Paper} elevation={3}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>{['Data', 'Cliente', 'Nave/Luogo', 'Tecnico', 'Ore', 'Azioni'].map(h => <TableCell key={h} sx={{fontWeight: 'bold'}}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {filteredRapportini.length > 0 ? (
                filteredRapportini.map(r => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{r.data ? dayjs(r.data).format('DD/MM/YYYY') : 'N/D'}</TableCell>
                    <TableCell>{r.cliente?.nome || '--'}</TableCell>
                    <TableCell>{r.nave?.nome || r.luogo?.nome || '--'}</TableCell>
                    <TableCell>{r.tecnicoScrivente ? `${r.tecnicoScrivente.cognome} ${r.tecnicoScrivente.nome}` : '--'}</TableCell>
                    <TableCell>{r.oreLavorate != null ? `${r.oreLavorate}h` : (r.oraInizio && r.oraFine ? `${dayjs(r.oraInizio).format('HH:mm')}-${dayjs(r.oraFine).format('HH:mm')}` : '--')}</TableCell>
                    <TableCell><IconButton color="primary" onClick={() => navigate(`/rapportini/${r.id}`)}><EditIcon /></IconButton></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} align="center">Nessun rapportino trovato con i filtri correnti.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </LocalizationProvider>
  );
};

export default RapportiniList;
