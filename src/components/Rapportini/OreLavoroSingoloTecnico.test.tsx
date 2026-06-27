import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OreLavoroSingoloTecnico from './OreLavoroSingoloTecnico';
import type { DettaglioOreData } from '@/models/definitions';
import React from 'react';

// Mock per il componente Grid per semplificare lo snapshot
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    // Mock super semplice: renderizza solo i figli dentro un div.
    // Ignora tutte le props di layout che causavano errori di tipo.
    Grid: ({ children }: { children: React.ReactNode }) => <div data-grid-mock="true">{children}</div>,
  };
});

describe('OreLavoroSingoloTecnico', () => {

  // Test di Snapshot: Modalità ORARIO
  it('dovrebbe corrispondere allo snapshot in modalità ORARIO', () => {
    const mockDatiOre: DettaglioOreData = {
      tecnicoId: 'test-id',
      nome: 'Test Nome',
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
      tecnicoId: 'test-id',
      nome: 'Test Nome',
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
      tecnicoId: 'test-id',
      nome: 'Test Nome',
      isManual: false,
      oraInizio: '07:30',
      oraFine: '16:30',
      pausa: 60,
      ore: 8,
    };

    const { rerender } = render(
      <OreLavoroSingoloTecnico datiOre={initialData} onUpdate={mockOnUpdate} isReadOnly={false} isScrivente={true} />
    );

    // Aspetta che gli elementi appaiano
    expect(screen.getByLabelText(/Ora Inizio/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ore Lavorate/i)).not.toBeInTheDocument();

    const aSwitch = screen.getByRole('switch', { name: 'Inserimento Ore Manuale' });
    fireEvent.click(aSwitch);

    expect(mockOnUpdate).toHaveBeenCalledOnce();
    const updatedData = mockOnUpdate.mock.calls[0][0];
    expect(updatedData.isManual).toBe(true);

    rerender(
        <OreLavoroSingoloTecnico datiOre={updatedData} onUpdate={mockOnUpdate} isReadOnly={false} isScrivente={true} />
    );

    expect(screen.getByLabelText(/Ore Lavorate/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ora Inizio/i)).not.toBeInTheDocument();
  });
});
