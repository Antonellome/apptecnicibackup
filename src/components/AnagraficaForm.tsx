import React from 'react';
import { TextField, Button, Box, Autocomplete } from '@mui/material';
import { FormField, BaseAnagrafica } from '@/models/definitions';

interface AnagraficaFormProps<T extends BaseAnagrafica> {
    fields: FormField[];
    formData: T;
    onFormChange: (name: string, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    isEditing: boolean;
    autocompleteOptions?: { [key: string]: any[] };
    getAutocompleteLabel?: (option: any) => string;
}

const AnagraficaForm = <T extends BaseAnagrafica>({ 
    fields, 
    formData, 
    onFormChange, 
    onSave, 
    onCancel, 
    isEditing,
    autocompleteOptions = {},
    getAutocompleteLabel = (option: any) => option.nome || '',
}: AnagraficaFormProps<T>) => {

    const renderField = (field: FormField) => {
        if (autocompleteOptions[field.id]) {
            return (
                <Autocomplete
                    key={field.id}
                    options={autocompleteOptions[field.id]}
                    getOptionLabel={getAutocompleteLabel}
                    value={autocompleteOptions[field.id].find(opt => opt.id === formData[field.id]) || null}
                    onChange={(_, newValue) => {
                        onFormChange(field.id, newValue ? newValue.id : '');
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={field.label}
                            variant="outlined"
                            margin="normal"
                        />
                    )}
                />
            );
        }

        return (
            <TextField
                key={field.id}
                name={field.id}
                label={field.label}
                value={formData[field.id] || ''}
                onChange={(e) => onFormChange(e.target.name, e.target.value)}
                fullWidth
                margin="normal"
            />
        );
    };

    return (
        <Box component="form" noValidate autoComplete="off">
            {fields.map(renderField)}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={onCancel} sx={{ mr: 1 }}>Annulla</Button>
                <Button onClick={onSave} variant="contained">{isEditing ? 'Salva Modifiche' : 'Crea'}</Button>
            </Box>
        </Box>
    );
};

export default AnagraficaForm;
