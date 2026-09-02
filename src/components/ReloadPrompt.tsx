import { useRegisterSW } from 'virtual:pwa-register/react';
import './ReloadPrompt.css';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
       
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
       
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="ReloadPrompt-container">
      {(offlineReady || needRefresh) && (
        <div className="ReloadPrompt-toast">
          <div className="ReloadPrompt-message">
            {offlineReady ? (
              <span>App pronta per funzionare offline</span>
            ) : (
              <span>Nuovo contenuto disponibile, clicca sul pulsante &ldquo;Aggiorna&rdquo; per applicare.</span>
            )}
          </div>
          <div className="ReloadPrompt-buttons">
            {needRefresh && (
              <button className="ReloadPrompt-button primary" onClick={() => updateServiceWorker(true)}>
                Aggiorna
              </button>
            )}
            <button className="ReloadPrompt-button secondary" onClick={() => close()}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReloadPrompt;
