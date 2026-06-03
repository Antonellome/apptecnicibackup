import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportFormPage from './ReportFormPage';
import { BrowserRouter } from 'react-router-dom';
import { addDoc } from 'firebase/firestore'; // Import collection

// ============== PROVIDERS & THEME SETUP (CORRECTED) ============== 
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Helper to render components with all necessary providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SnackbarProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};
AllTheProviders.displayName = 'AllTheProviders';

// Custom render function that uses the wrapper
const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });


// ============== MOCKING DEPENDENCIES ============== 

// 1. react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
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
    userProfile: { tecnicoId: 'test-uid', nome: 'Test', cognome: 'User' }
  }),
}));

// 3. Local Data Hook
const mockLocalData = {
    navi: [{ id: 'nave1', nome: 'Nave Prova' }],
    luoghi: [{ id: 'luogo1', nome: 'Luogo Prova' }],
    tecnici: [{ id: 'test-uid', nome: 'Test', cognome: 'User', tecnicoId: 'test-uid' }],
    veicoli: [{ id: 'vei1', marca: 'Fiat', modello: 'Doblò', targa: 'AB123CD' }],
    tipiGiornata: [{ id: 'tg1', nome: 'Ordinaria', lavorativo: true }],
    clienti: [], 
    categorie: [], 
};
vi.mock('@/hooks/useLocalData', () => ({
  useLocalData: () => ({ data: mockLocalData, loading: false, error: null }),
}));

// 4. Snackbar Context
vi.mock('@/contexts/SnackbarContext', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useSnackbar: () => ({ showSnackbar: vi.fn() }),
    }
});

// 5. Firebase / Offline Sync
vi.mock('@/firebase', () => ({}));
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        doc: vi.fn(), 
        getDoc: vi.fn(), 
        addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
        updateDoc: vi.fn(), 
        collection: vi.fn(),
        runTransaction: vi.fn((_db, callback) => callback({})), // Corrected: unused _db
        Timestamp: { fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }), now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })},
    }
});

// 6. Signature Canvas
vi.mock('react-signature-canvas', () => {
    const signaturePadMock = {
        clear: vi.fn(),
        isEmpty: vi.fn().mockReturnValue(false),
        getTrimmedCanvas: () => ({ toDataURL: () => 'data:image/png;base64,fakesignature' }),
    };
    // Assign the component to a variable with a name.
    const MockSignatureCanvas = React.forwardRef((props: any, ref: any) => {
        React.useImperativeHandle(ref, () => signaturePadMock);
        return <canvas data-testid="signature-canvas" {...props} />;
    });
    // Add the display name.
    MockSignatureCanvas.displayName = 'MockSignatureCanvas';
    return { default: MockSignatureCanvas };
});


// ============== TEST SUITE ============== 

describe('ReportFormPage', () => {
  beforeEach(() => {
     vi.clearAllMocks();
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
    await screen.findByText('User Test'); // Corrected name based on mock

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
    const submittedData = (vi.mocked(addDoc)).mock.calls[0][1];
    expect(submittedData).toEqual(expect.objectContaining({
        tecnicoId: 'test-uid',
        tipoGiornataId: 'tg1',
        naveId: 'nave1',
        descrizioneBreve: 'Test descrizione lavoro',
    }));
  });
});
