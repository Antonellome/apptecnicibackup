import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportFormPage from './ReportFormPage';
import { BrowserRouter } from 'react-router-dom';
import { addDoc } from 'firebase/firestore';

// ============== PROVIDERS & THEME SETUP (CORRECTED) ============== 
import { ThemeProvider } from '@/contexts/ThemeContext'; // <-- THE CORRECT ONE
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Helper to render components with all necessary providers
const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider> {/** Correct Provider for useTheme hook */}
        <SnackbarProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Custom render function that uses the wrapper
const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });


// ============== MOCKING DEPENDENCIES ============== 

// 1. react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ reportId: undefined }),
  };
});

// 2. Auth Hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid', email: 'test@test.com', displayName: 'Test User' },
    loading: false,
  }),
}));

// 3. Local Data Hook
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

// 4. Snackbar Context - Mock is kept, but provider is now correctly wrapping
vi.mock('@/contexts/SnackbarContext', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useSnackbar: () => ({ showSnackbar: vi.fn() }),
    }
});


// 5. Firebase / Offline Sync
vi.mock('@/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), 
  getDoc: vi.fn(), 
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
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

// ============== TEST SUITE ============== 

describe('ReportFormPage', () => {
  beforeEach(() => {
     vi.clearAllMocks();
     (addDoc as any).mockClear();
  });

  it('dovrebbe corrispondere allo snapshot nello stato iniziale', async () => {
    const { container } = customRender(<ReportFormPage />);
    await screen.findByText('Ordinaria'); // Wait for async data to load
    expect(container).toMatchSnapshot();
  });

  it('dovrebbe compilare il modulo e salvare i dati', async () => {
    const user = userEvent.setup();
    customRender(<ReportFormPage />);

    // Wait for async data to load
    await screen.findByText('Test User');

    // Select a value
    await user.click(screen.getByLabelText(/Tipo Giornata/i));
    await user.click(await screen.findByRole('option', { name: 'Ordinaria' }));

    // Select another value
    await user.click(screen.getByLabelText(/Nave/i));
    await user.click(await screen.findByRole('option', { name: /Nave Prova/i }));
    
    // Type in a field
    await user.type(screen.getByLabelText(/Breve Descrizione Lavoro/i), 'Test descrizione lavoro');

    // Save
    await user.click(screen.getByRole('button', { name: /salva/i }));

    // Verify that the save function was called
    await waitFor(() => {
        expect(addDoc).toHaveBeenCalledOnce();
    });

    // Verify the content of the submitted data
    const submittedData = (addDoc as any).mock.calls[0][1];
    expect(submittedData).toEqual(expect.objectContaining({
        tecnicoId: 'test-uid',
        tipoGiornataId: 'tg1',
        naveId: 'nave1',
        descrizioneBreve: 'Test descrizione lavoro',
    }));
  });
});
