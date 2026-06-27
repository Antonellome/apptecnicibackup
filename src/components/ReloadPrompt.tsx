import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line no-console
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
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
              <span>Nuovo contenuto disponibile, clicca sul pulsante "Aggiorna" per applicare.</span>
            )}
          </div>
          {needRefresh && (
            <button className="ReloadPrompt-button" onClick={() => updateServiceWorker(true)}>
              Aggiorna
            </button>
          )}
          <button className="ReloadPrompt-button" onClick={() => close()}>
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}

export default ReloadPrompt;
