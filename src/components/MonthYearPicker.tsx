
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { it } from 'date-fns/locale';
import { subMonths, startOfMonth } from 'date-fns';
import { Box } from '@mui/material';

interface MonthYearPickerProps {
  currentDate: Date;
  onDateChange: (date: Date | null) => void;
}

export const MonthYearPicker = ({ currentDate, onDateChange }: MonthYearPickerProps) => {
  const maxDate = new Date();
  const minDate = startOfMonth(subMonths(new Date(), 2));

  // Corretto: Rimosso il parametro `_context` non utilizzato.
  const handleChange = (newValue: Date | null) => {
    onDateChange(newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
      <Box sx={{ mb: 2 }}>
        <DatePicker
          views={['year', 'month']}
          label="Seleziona mese e anno"
          value={currentDate}
          onChange={handleChange}
          minDate={minDate}
          maxDate={maxDate}
          slotProps={{
            textField: {
              helperText: "Puoi consultare solo gli ultimi 3 mesi",
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};
