import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportFormPage from './ReportFormPage';
import { BrowserRouter } from 'react-router-dom';
import type { Veicolo } from '@/models/definitions';

// ============== PROVIDERS SETUP ============== 
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SnackbarProvider } from '@/providers/SnackbarProvider';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <SnackbarProvider>{children}</SnackbarProvider>
    </ThemeProvider>
  </BrowserRouter>
);
AllTheProviders.displayName = 'AllTheProviders';

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// ============== MOCKING DEPENDENCIES ============== 

const mockHandleSave = vi.fn();
const mockSetDataInizio = vi.fn();

// 1. Mock the entire custom hook
vi.mock('@/hooks/useReportForm', () => ({
  useReportForm: () => ({
    isEditMode: false,
    isReadOnly: false,
    lockReason: null,
    pageLoading: false,
    isSaving: false,
    isSharing: false,
    isGeneratingPdf: false,
    dataInizio: new Date('2023-10-27T10:00:00Z'),
    setDataInizio: mockSetDataInizio,
    dataFine: new Date('2023-10-27T10:00:00Z'),
    setDataFine: vi.fn(),
    isMultiDay: false,
    tipoGiornataId: 'tg1',
    trasfertaId: '',
    setTrasfertaId: vi.fn(),
    includeTrasferta: false,
    setIncludeTrasferta: vi.fn(),
    isLavorativo: true,
    veicoloId: 'Nessuno',
    setVeicoloId: vi.fn(),
    naveId: 'Nessuna',
    setNaveId: vi.fn(),
    luogoId: 'Nessuno',
    setLuogoId: vi.fn(),
    descrizioneBreve: '',
    setDescrizioneBreve: vi.fn(),
    lavoroEseguito: '',
    setLavoroEseguito: vi.fn(),
    materialiImpiegati: '',
    setMaterialiImpiegati: vi.fn(),
    dettaglioOre: [],
    firmaFirmatarioNome: '',
    setFirmaFirmatarioNome: vi.fn(),
    firmaFirmatarioSocieta: '',
    setFirmaFirmatarioSocieta: vi.fn(),
    firmaVettoriale: null,
    tecnicoScrivente: { id: 'test-uid' },
    tipiGiornataFiltrati: [{ id: 'tg1', nome: 'Ordinaria', lavorativo: true }],
    tipiGiornataTrasferta: [],
    selectedTecnicos: [],
    otherTecnicos: [],
    scriventeDettaglio: { tecnicoId: 'test-uid', nome: 'Test User' },
    handleMultiDayToggle: vi.fn(),
    handleTipoGiornataChange: vi.fn(),
    handleAltriTecniciChange: vi.fn(),
    removeTecnico: vi.fn(),
    handleOpenModal: vi.fn(),
    handleSave: mockHandleSave,
    handleSaveAndShare: vi.fn(),
    handleShare: vi.fn(),
    handleCancel: vi.fn(),
    handleOpenSignatureModal: vi.fn(),
    isModalOpen: false,
    handleCloseModal: vi.fn(),
    handleSaveFromModal: vi.fn(),
    editingTecnico: null,
    tempDettaglioOre: null,
    setTempDettaglioOre: vi.fn(),
    isSignatureModalOpen: false,
    setIsSignatureModalOpen: vi.fn(),
    handleSaveSignature: vi.fn(),
    isPdfPreviewOpen: false,
    setIsPdfPreviewOpen: vi.fn(),
    pdfUrl: null,
    handleFinalShare: vi.fn(),
    isConfirmSaveDialogOpen: false,
    setIsConfirmSaveDialogOpen: vi.fn(),
    handleConfirmSave: vi.fn(),
    disableActions: false,
    sortedVeicoli: [{ id: 'vei1', marca: 'Fiat', modello: 'Doblò', targa: 'AB123CD' }],
    sortedNavi: [{ id: 'nave1', nome: 'Nave Prova' }],
    sortedLuoghi: [{ id: 'luogo1', nome: 'Luogo Prova' }],
    getVeicoloLabel: (v: Veicolo | undefined) => v ? `${v.marca} ${v.modello} (${v.targa})` : 'Nessuno',
  }),
}));

// 2. Mock Signature Canvas (UI component)
vi.mock('react-signature-canvas', () => {
    // Rimosso React.forwardRef perché il ref non è utilizzato in questo mock, risolvendo il warning.
    const MockSignatureCanvas = (props: any) => <canvas data-testid="signature-canvas" {...props} />;
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
    // Usa una query specifica per verificare che il rendering sia avvenuto
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('dovrebbe compilare il modulo e chiamare la funzione di salvataggio', async () => {
    const user = userEvent.setup();
    customRender(<ReportFormPage />);

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Nave/i));
    await user.click(await screen.findByRole('option', { name: /Nave Prova/i }));
    
    const descrizioneInput = screen.getByLabelText(/Breve Descrizione Lavoro/i);
    await user.type(descrizioneInput, 'Test descrizione lavoro');

    // Usa una regex precisa per il pulsante "Salva"
    await user.click(screen.getByRole('button', { name: /^Salva$/i }));

    await waitFor(() => {
        expect(mockHandleSave).toHaveBeenCalledOnce();
    });
  });
});
