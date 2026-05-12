
import { useMemo } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import type { Tecnico, FormField, Ditta, Categoria } from '@/models/definitions';
import { useMasterData } from '@/hooks/useMasterData'; // AGGIORNATO
import { safeGetDayjs } from '@/utils/dateUtils';
import logo from '@/assets/react.svg';

interface PrintableTechnicianListProps {
    data: Tecnico[];
    fields: FormField[];
}

// Oggetto per abbreviazioni, più manutenibile
const abbreviations: Record<string, string> = {
    'Ditta Appartenenza': 'Ditta',
    'Categoria': 'Cat.',
    'Attivo / Inattivo': 'Stato',
    'Sincronizzazione': 'Sync',
    'Telefono': 'Tel.',
    'Email': 'Email',
    'Data Assunzione': 'Assunto il',
    'Data Licenziamento': 'Licenz. il',
    'Scadenza Contratto': 'Sc. Ctr.',
    'Scadenza Visita Medica': 'Sc. V.M.',
    'Tipo Contratto': 'Contratto',
    'Note / Descrizione': 'Note',
    'Accesso App': 'App',
};

const PrintableTechnicianList = ({ data, fields }: PrintableTechnicianListProps) => {
    // USARE L'HOOK CORRETTO
    const { masterData } = useMasterData();

    // Creare mappe solo una volta
    const ditteMap = useMemo(() => 
        masterData?.ditte.reduce((acc, d) => {
            acc.set(d.id, d);
            return acc;
        }, new Map<string, Ditta>()) 
    , [masterData?.ditte]);

    const categorieMap = useMemo(() => 
        masterData?.categorie.reduce((acc, c) => {
            acc.set(c.id, c);
            return acc;
        }, new Map<string, Categoria>()) 
    , [masterData?.categorie]);


    // Funzione robusta per ottenere il valore da visualizzare
    const getDisplayValue = (field: FormField, value: any): string | null => {
        if (value === null || typeof value === 'undefined' || value === '') return null;

        // Gestione booleani
        if (typeof value === 'boolean') {
            return value ? 'Sì' : 'No';
        }

        // Gestione date
        if (field.type === 'date') {
            const date = safeGetDayjs(value as string);
            return date ? date.format('DD/MM/YYYY') : null;
        }
        
        // Gestione FK
        if (field.name === 'dittaId') return ditteMap?.get(value as string)?.nome || null;
        if (field.name === 'categoriaId') return categorieMap?.get(value as string)?.nome || null;
        
        // Gestione select generiche
        if (field.type === 'select' && field.options && field.options.length > 0) {
            // Controlla se le opzioni sono oggetti o stringhe
            if (typeof field.options[0] === 'object' && field.options[0] !== null) {
                const foundOption = (field.options as { id: string; nome: string }[]).find(opt => opt.id === value);
                return foundOption?.nome || String(value);
            } else {
                const stringValue = String(value);
                return (field.options as string[]).includes(stringValue) ? stringValue : null;
            }
        }

        const stringValue = String(value);
        return stringValue.trim() === '' ? null : stringValue;
    };

    const nameFields = ['nome', 'cognome'];
    const noteField = fields.find(f => f.name === 'noteInterne'); // Assumiamo si chiami così
    const otherFields = fields.filter(f => !nameFields.includes(f.name) && f.name !== 'noteInterne');

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid black', pb: 1, mb: 2 }}>
                <img src={logo} alt="Logo" style={{ width: 40, height: 40, marginRight: 16 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Scheda Tecnico</Typography>
                    <Typography variant="caption">R.I.S.O. Masre Office - Report Individuali Sincronizzati Online</Typography>
                </Box>
            </Box>
            {data.map((tecnico, index) => {
                const fullName = `${tecnico.cognome || ''}, ${tecnico.nome || ''}`.replace(/^,|,$/g, '').trim();
                const noteValue = tecnico.noteInterne as string; // Cast per sicurezza

                return (
                    <Box key={tecnico.id} sx={{ pageBreakInside: 'avoid', pt: 1, pb: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ minWidth: '200px', pr: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {fullName}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', rowGap: '4px', columnGap: '16px' }}>
                                {otherFields.map(field => {
                                    const displayValue = getDisplayValue(field, tecnico[field.name as keyof Tecnico]);
                                    const label = abbreviations[field.label] || field.label;
                                    return (
                                        <Box key={`${tecnico.id}-${field.name}`} sx={{ display: 'flex', alignItems: 'baseline' }}>
                                            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', mr: 0.5 }}>
                                                {label}:
                                            </Typography>
                                            <Typography variant="body2" component="span">
                                                {displayValue !== null ? displayValue : '-'}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {noteField && (
                            <Box sx={{ pl: '216px', mt: 1 }}>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                                    {abbreviations[noteField.label] || noteField.label}:
                                </Typography>
                                {noteValue ? (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                                        {noteValue.split('\n').map((line: string, i: number) => (
                                            line.trim() && <li key={i}>{line.trim()}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Typography variant="body2" component="span">-</Typography>
                                )}
                            </Box>
                        )}

                        {index < data.length - 1 && <Divider sx={{ mt: 2, mb: 1 }} />}
                    </Box>
                );
            })}
        </Box>
    );
};

export default PrintableTechnicianList;
