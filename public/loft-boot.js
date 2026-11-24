(() => {
  const root = document.getElementById('root');
  const status = document.getElementById('loft-boot-status');
  const retry = document.getElementById('loft-boot-retry');
  if (!root || !status || !retry) return;
  performance.mark('loft:startup:boot');
  let timer;
  function announceRecovery() {
    const webApp = window.Telegram?.WebApp;
    if (!webApp || retry.hidden || root.hasChildNodes() || document.documentElement.dataset.telegramReady) return;
    webApp.ready();
    document.documentElement.dataset.telegramReady = 'true';
    performance.mark('loft:startup:recovery-ready');
  }
  document.getElementById('telegram-sdk')?.addEventListener('load', announceRecovery, { once: true });
  function revealError() {
    clearTimeout(timer);
    if (root.hasChildNodes()) return;
    status.textContent = 'Не удалось открыть магазин / Do‘kon ochilmadi';
    status.setAttribute('role', 'alert');
    retry.hidden = false;
    announceRecovery();
  }
  function handleAssetError(event) {
    const asset = event.target;
    if ((asset instanceof HTMLScriptElement && asset.type === 'module') ||
        (asset instanceof HTMLLinkElement && asset.rel === 'stylesheet')) revealError();
  }
  function handleChunkError() {
    if (!root.hasChildNodes()) revealError();
    else {
      document.getElementById('loft-boot').hidden = false;
      status.textContent = 'Магазин обновился. Повторите загрузку / Do‘konni qayta yuklang';
      status.setAttribute('role', 'alert');
      retry.hidden = false;
      retry.focus();
    }
  }
  window.addEventListener('error', handleAssetError, true);
  window.addEventListener('vite:preloadError', handleChunkError);
  window.addEventListener('loft:boot-error', revealError);
  // A fast failed module request can finish before this listener is installed.
  const checkEntry = () => {
    if (!performance.getEntriesByName('loft:startup:entry', 'mark').length) revealError();
  };
  if (document.readyState === 'complete') checkEntry();
  else window.addEventListener('load', checkEntry, { once: true });
  retry.addEventListener('click', () => location.reload());
  timer = setTimeout(revealError, 15000);
  const observer = new MutationObserver(() => {
    if (!root.hasChildNodes()) return;
    clearTimeout(timer);
    document.getElementById('loft-boot').hidden = true;
    observer.disconnect();
  });
  observer.observe(root, { childList: true });
})();
