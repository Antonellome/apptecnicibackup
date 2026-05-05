
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { it } from 'date-fns/locale';
import { subMonths, startOfMonth } from 'date-fns'; // Importa le funzioni necessarie
import { Box } from '@mui/material';

interface MonthYearPickerProps {
  currentDate: Date;
  onDateChange: (date: Date | null) => void;
}

export const MonthYearPicker = ({ currentDate, onDateChange }: MonthYearPickerProps) => {
  // Calcola la data massima (oggi)
  const maxDate = new Date();

  // Calcola la data minima (l'inizio del mese di 2 mesi fa)
  const minDate = startOfMonth(subMonths(new Date(), 2));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
      <Box sx={{ mb: 2 }}>
        <DatePicker
          views={['year', 'month']}
          label="Seleziona mese e anno"
          value={currentDate}
          onChange={onDateChange}
          minDate={minDate} // Imposta la data minima selezionabile
          maxDate={maxDate} // Imposta la data massima selezionabile
          // La prop 'renderInput' è deprecata in MUI v5+.
          // L'approccio moderno usa 'slotProps' per personalizzare il campo di testo.
          slotProps={{
            textField: {
              helperText: "Puoi consultare solo gli ultimi 3 mesi", // Aggiunto un testo di aiuto
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};
