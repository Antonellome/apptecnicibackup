import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportFormPage from './ReportFormPage';
import { BrowserRouter } from 'react-router-dom';
import { aggiungiAllaCoda } from '@/services/offlineSync';

// ============== MOCKING DEPENDENCIES ============== 

// 1. react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: undefined }),
  };
});

// 2. Auth Hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid', email: 'test@test.com', displayName: 'Test User' },
    loading: false,
  }),
}));

// 3. Master Data Hook
const mockMasterData = {
    clienti: [{ id: 'cli1', nome: 'Cliente Prova' }],
    destinazioni: [{ id: 'dest1', nome: 'Destinazione Prova' }],
    tecnici: [{ id: 'tec1', nome: 'Tecnico Prova' }],
    tipiFatturazione: [{ id: 'tf1', nome: 'Tipo Fatt Prova' }],
    tipiLavoro: [{ id: 'tl1', nome: 'Tipo Lavoro Prova' }],
    veicoli: [{ id: 'vei1', marca: 'Fiat', modello: 'Doblò', targa: 'AB123CD' }],
    tipiGiornata: [{ id: 'tg1', nome: 'Ordinaria', tipo: 'oraria', tariffa: 10 }],
};
vi.mock('@/hooks/useMasterData', () => ({
  useMasterData: () => ({ masterData: mockMasterData, loading: false, error: null }),
}));

// 4. Snackbar Context
vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: vi.fn() }),
}));

// 5. Firebase / Offline Sync
vi.mock('@/services/offlineSync');
vi.mock('@/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), getDoc: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), collection: vi.fn(),
  Timestamp: { fromDate: (date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }) },
}));

// 6. Signature Canvas (Corretto per Hoisting)
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
  default: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

// ============== TEST SUITE ============== 

describe('ReportFormPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('dovrebbe corrispondere allo snapshot nello stato iniziale', () => {
    const { container } = render(<BrowserRouter><ReportFormPage /></BrowserRouter>);
    expect(container).toMatchSnapshot();
  });

  it('dovrebbe compilare il modulo intero e inviare i dati correttamente', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><ReportFormPage /></BrowserRouter>);

    // 1. Compilare campi
    await user.click(screen.getByRole('combobox', { name: /cliente/i }));
    await user.click(await screen.findByText('Cliente Prova'));
    await user.type(screen.getByRole('textbox', { name: /descrizione lavoro/i }), 'Test descrizione lavoro');
    
    // 2. Firma
    await user.click(screen.getByRole('button', { name: /aggiungi firma/i }));
    await user.click(await screen.findByRole('button', { name: /salva firma/i }));

    // 3. Salva
    await user.click(screen.getByRole('button', { name: /salva/i }));

    // 4. Verifica
    await waitFor(() => {
        expect(aggiungiAllaCoda).toHaveBeenCalledOnce();
    });

    const submittedData = (aggiungiAllaCoda as any).mock.calls[0][0];
    expect(submittedData).toEqual(expect.objectContaining({
        userId: 'test-uid',
        userEmail: 'test@test.com',
        cliente: expect.objectContaining({ id: 'cli1', nome: 'Cliente Prova' }),
        descrizioneLavoro: 'Test descrizione lavoro',
        isNew: true,
        firmaCliente: 'data:image/png;base64,fakesignature',
    }));
  });
});
