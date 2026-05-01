
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { it } from 'date-fns/locale';
import { Box } from '@mui/material';

interface MonthYearPickerProps {
  currentDate: Date;
  onDateChange: (date: Date | null) => void;
}

export const MonthYearPicker = ({ currentDate, onDateChange }: MonthYearPickerProps) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
      <Box sx={{ mb: 2 }}>
        <DatePicker
          views={['year', 'month']}
          label="Seleziona mese e anno"
          value={currentDate}
          onChange={onDateChange}
          // La prop 'renderInput' è deprecata in MUI v5+.
          // L'approccio moderno usa 'slotProps' per personalizzare il campo di testo.
          slotProps={{
            textField: {
              helperText: null, // Rimuove l'helper text come nell'implementazione originale
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};
