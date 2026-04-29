
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { it } from 'date-fns/locale';
import { Box, TextField } from '@mui/material';

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
          renderInput={(params) => <TextField {...params} helperText={null} />}
        />
      </Box>
    </LocalizationProvider>
  );
};
