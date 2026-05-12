import React from 'react';
import { useFieldArray, Control, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Grid, Box, Typography, Button, IconButton, Autocomplete, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tecnico } from '@/models/definitions';

interface DettaglioOreSectionProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  tecnici: Tecnico[];
}

const DettaglioOreSection: React.FC<DettaglioOreSectionProps> = ({ control, register, setValue, tecnici }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'dettaglioOreTecnici',
  });

  return (
    <Grid size={12}>
      <Typography variant="h6" gutterBottom>Dettaglio Ore Altri Tecnici</Typography>
      {fields.map((item, index) => (
        <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={tecnici}
                getOptionLabel={(option) => option.nome || ''}
                onChange={(_, value) => setValue(`dettaglioOreTecnici.${index}.tecnicoId`, value?.id || '')}
                renderInput={(params) => 
                  <TextField {...params} label="Seleziona Tecnico" />
                }
              />
            </Grid>
            <Grid size={{ xs: 10, sm: 4 }}>
               {/* Placeholder for OreLavoroSingoloTecnico - logic will be more complex here */}
              <TextField 
                fullWidth
                label="Ore"
                type="number"
                {...register(`dettaglioOreTecnici.${index}.ore`)}
              />
            </Grid>
            <Grid size={{ xs: 2, sm: 2 }}>
              <IconButton onClick={() => remove(index)}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button onClick={() => append({ tecnicoId: '', ore: 8, tipoOrario: 'manuale', inizio: '', fine: '', pausa: '' })}>
        Aggiungi Tecnico
      </Button>
    </Grid>
  );
};

export default DettaglioOreSection;
