import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function UpdateNotification() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line no-console
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.log('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div className="mr-4">
          <h4 className="font-bold">Aggiornamento disponibile!</h4>
          <p className="text-sm">È disponibile una nuova versione dell&apos;app.</p>
        </div>
        <div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md mr-2"
          >
            Aggiorna
          </button>
          <button
            onClick={close}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
