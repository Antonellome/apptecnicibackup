import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { SaldiContatori } from '@/models/definitions';
import { db } from '@/db/local-db';

interface ResiduiModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (saldi: SaldiContatori) => void;
  year: number;
  userId: string;
}

export const ResiduiModal: React.FC<ResiduiModalProps> = ({ open, onClose, onSave, year, userId }) => {
  const [ferieOre, setFerieOre] = useState<string>('0');
  const [ferieGiorni, setFerieGiorni] = useState<string>('0');
  const [rolOre, setRolOre] = useState<string>('0');
  const [exFestivitaOre, setExFestivitaOre] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSaldi = useCallback(async () => {
    if (userId && year) {
      setLoading(true);
      try {
        const saldiEsistenti = await db.saldi.get({ dipendenteId: userId, anno: year });
        if (saldiEsistenti) {
          const ferieInGiorni = saldiEsistenti.ferie / 8;
          setFerieOre(saldiEsistenti.ferie.toString());
          setFerieGiorni(ferieInGiorni.toString());
          setRolOre(saldiEsistenti.rol.toString());
          setExFestivitaOre(saldiEsistenti.exFestivita.toString());
        } else {
          // Se non ci sono saldi per l'anno, resetta i campi
          setFerieOre('0');
          setFerieGiorni('0');
          setRolOre('0');
          setExFestivitaOre('0');
        }
      } catch (error) {
        console.error("Errore nel caricamento dei saldi:", error);
        // Gestire l'errore, magari resettando i campi o mostrando un messaggio
      } finally {
        setLoading(false);
      }
    }
  }, [userId, year]);

  useEffect(() => {
    if (open) {
      fetchSaldi();
    }
  }, [open, fetchSaldi]);

  const handleFerieOreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ore = e.target.value;
    setFerieOre(ore);
    if (ore === '' || isNaN(parseFloat(ore))) {
        setFerieGiorni('');
        return;
    }
    const giorni = parseFloat(ore) / 8;
    setFerieGiorni(giorni.toString());
  };

  const handleFerieGiorniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const giorni = e.target.value;
    setFerieGiorni(giorni);
     if (giorni === '' || isNaN(parseFloat(giorni))) {
        setFerieOre('');
        return;
    }
    const ore = parseFloat(giorni) * 8;
    setFerieOre(ore.toString());
  };

  const handleSave = async () => {
    const saldiToSave: SaldiContatori = {
      dipendenteId: userId,
      anno: year,
      ferie: parseFloat(ferieOre) || 0,
      rol: parseFloat(rolOre) || 0,
      exFestivita: parseFloat(exFestivitaOre) || 0,
      bancaOre: 0, // Mantenuto a 0 come da logica precedente
      malattiaGiorniAnno: 0, // Mantenuto a 0 come da logica precedente
    };

    try {
      await db.saldi.put(saldiToSave);
      onSave(saldiToSave); // Aggiorna lo stato nell'app principale
      onClose();
    } catch (error) {
      console.error("Errore nel salvataggio dei saldi:", error);
      // Qui potresti voler mostrare un messaggio di errore all'utente
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Imposta Saldi Contatori</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" gutterBottom>
              Inserisci i saldi dei contatori per l'anno <b>{year}</b>. Questi valori saranno usati come base per i calcoli.
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={6}>
                <TextField
                  label="Ferie (giorni)"
                  type="number"
                  value={ferieGiorni}
                  onChange={handleFerieGiorniChange}
                  fullWidth
                  inputProps={{ step: "0.5" }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Ferie (ore)"
                  type="number"
                  value={ferieOre}
                  onChange={handleFerieOreChange}
                  fullWidth
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="ROL (ore)"
                  type="number"
                  value={rolOre}
                  onChange={(e) => setRolOre(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Ex Festività (ore)"
                  type="number"
                  value={exFestivitaOre}
                  onChange={(e) => setExFestivitaOre(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>Salva</Button>
      </DialogActions>
    </Dialog>
  );
};
