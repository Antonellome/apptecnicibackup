import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OreLavoroSingoloTecnico from './OreLavoroSingoloTecnico';
import type { DettaglioOreData } from '@/models/definitions';

// Mock per il componente Grid, per semplificare lo snapshot
vi.mock('@mui/material/Grid', () => ({
    // Usiamo la versione 2 della Grid API per coerenza
    default: (props) => <div {...props} />
}));

describe('OreLavoroSingoloTecnico', () => {

  // Test di Snapshot: Modalità ORARIO
  it('dovrebbe corrispondere allo snapshot in modalità ORARIO', () => {
    const mockDatiOre: DettaglioOreData = {
      isManual: false,
      oraInizio: '07:30',
      oraFine: '16:30',
      pausa: 60,
      ore: 8,
    };
    const { container } = render(
      <OreLavoroSingoloTecnico datiOre={mockDatiOre} onUpdate={vi.fn()} isReadOnly={false} isScrivente={true} />
    );
    expect(container).toMatchSnapshot();
  });

  // Test di Snapshot: Modalità MANUALE
  it('dovrebbe corrispondere allo snapshot in modalità MANUALE', () => {
    const mockDatiOre: DettaglioOreData = {
      isManual: true,
      oraInizio: '07:30',
      oraFine: '16:30',
      pausa: 60,
      ore: 9.5,
    };
    const { container } = render(
      <OreLavoroSingoloTecnico datiOre={mockDatiOre} onUpdate={vi.fn()} isReadOnly={false} isScrivente={false} />
    );
    expect(container).toMatchSnapshot();
  });

  // Test Funzionale: Logica dello Switch
  it('dovrebbe cambiare tra modalità orario e manuale al click dello switch', () => {
    const mockOnUpdate = vi.fn();
    const initialData: DettaglioOreData = {
      isManual: false,
      oraInizio: '07:30',
      oraFine: '16:30',
      pausa: 60,
      ore: 8,
    };

    const { rerender } = render(
      <OreLavoroSingoloTecnico datiOre={initialData} onUpdate={mockOnUpdate} isReadOnly={false} isScrivente={true} />
    );

    expect(screen.getByRole('combobox', { name: 'Inizio' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Ore Lavorate' })).not.toBeInTheDocument();

    // CORREZIONE DEFINITIVA: Un Material-UI Switch ha il ruolo "switch", non "checkbox".
    const aSwitch = screen.getByRole('switch', { name: 'Inserimento Manuale (per tutti)' });
    fireEvent.click(aSwitch);

    expect(mockOnUpdate).toHaveBeenCalledOnce();
    const updatedData = mockOnUpdate.mock.calls[0][0];
    expect(updatedData.isManual).toBe(true);

    rerender(
        <OreLavoroSingoloTecnico datiOre={updatedData} onUpdate={mockOnUpdate} isReadOnly={false} isScrivente={true} />
    );

    expect(screen.getByRole('combobox', { name: 'Ore Lavorate' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Inizio' })).not.toBeInTheDocument();
  });
});
