(() => {
  const root = document.getElementById('root');
  const status = document.getElementById('loft-boot-status');
  const retry = document.getElementById('loft-boot-retry');
  if (!root || !status || !retry) return;
  let timer;
  function revealError() {
    clearTimeout(timer);
    if (root.hasChildNodes()) return;
    status.textContent = 'Не удалось открыть магазин / Do‘kon ochilmadi';
    status.setAttribute('role', 'alert');
    retry.hidden = false;
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
