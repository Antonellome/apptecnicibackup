import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportFormPage from './ReportFormPage';
import { BrowserRouter } from 'react-router-dom';
import { addDoc } from 'firebase/firestore';

// ============== MOCKING DEPENDENCIES (REVISED) ============== 

// 1. react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ reportId: undefined }), // Corrected from 'id' to 'reportId'
  };
});

// 2. Auth Hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid', email: 'test@test.com', displayName: 'Test User' },
    loading: false,
  }),
}));

// 3. Local Data Hook (CORRECTED from useMasterData)
const mockLocalData = {
    navi: [{ id: 'nave1', nome: 'Nave Prova' }],
    luoghi: [{ id: 'luogo1', nome: 'Luogo Prova' }],
    tecnici: [{ id: 'test-uid', nome: 'Test', cognome: 'User' }],
    veicoli: [{ id: 'vei1', marca: 'Fiat', modello: 'Doblò', targa: 'AB123CD' }],
    tipiGiornata: [{ id: 'tg1', nome: 'Ordinaria'}],
};
vi.mock('@/hooks/useLocalData', () => ({
  useLocalData: () => ({ data: mockLocalData, loading: false, error: null }),
}));

// 4. Snackbar Context
vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: vi.fn() }),
}));

// 5. Firebase / Offline Sync
vi.mock('@/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), 
  getDoc: vi.fn(), 
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })), // Mock addDoc to resolve with a ref
  updateDoc: vi.fn(), 
  collection: vi.fn(),
  writeBatch: vi.fn(() => ({ commit: vi.fn(), set: vi.fn() })),
  Timestamp: { fromDate: (date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }), now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })},
}));

// 6. Signature Canvas
vi.mock('react-signature-canvas', () => {
    const signaturePadMock = {
        clear: vi.fn(),
        isEmpty: vi.fn().mockReturnValue(false),
        getTrimmedCanvas: () => ({ toDataURL: (type) => 'data:image/png;base64,fakesignature' }),
    };
    const MockSignatureCanvas = React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => signaturePadMock);
        return <canvas data-testid="signature-canvas" />;
    });
    return { default: MockSignatureCanvas };
});

// 7. MUI Grid
vi.mock('@mui/material/Grid', () => ({
  default: ({ children, ...props }) => <div data-testid="grid" {...props}>{children}</div>,
}));

// ============== TEST SUITE (REVISED) ============== 

describe('ReportFormPage', () => {
  beforeEach(() => {
     vi.clearAllMocks();
     (addDoc as any).mockClear();
  });

  it('dovrebbe corrispondere allo snapshot nello stato iniziale', async () => {
    const { container } = render(<BrowserRouter><ReportFormPage /></BrowserRouter>);
    await screen.findByText('Ordinaria'); // Wait for async data to load
    expect(container).toMatchSnapshot();
  });

  it('dovrebbe compilare il modulo e salvare i dati', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><ReportFormPage /></BrowserRouter>);

    // Attendere il caricamento dei dati asincroni
    await screen.findByText('Test User');

    // Selezionare Tipo Giornata
    await user.click(screen.getByLabelText(/Tipo Giornata/i));
    await user.click(await screen.findByRole('option', { name: 'Ordinaria' }));

    // Selezionare Nave
    await user.click(screen.getByLabelText(/Nave/i));
    await user.click(await screen.findByRole('option', { name: /Nave Prova/i }));
    
    // Inserire descrizione
    await user.type(screen.getByLabelText(/Breve Descrizione Lavoro/i), 'Test descrizione lavoro');

    // Salvare
    await user.click(screen.getByRole('button', { name: /salva/i }));

    // Verificare che la funzione di salvataggio sia stata chiamata
    await waitFor(() => {
        expect(addDoc).toHaveBeenCalledOnce();
    });

    // Verificare il contenuto dei dati inviati
    const submittedData = (addDoc as any).mock.calls[0][1];
    expect(submittedData).toEqual(expect.objectContaining({
        tecnicoId: 'test-uid',
        tipoGiornataId: 'tg1',
        naveId: 'nave1',
        descrizioneBreve: 'Test descrizione lavoro',
    }));
  });
});
