// Register the terminal handlers before asking the WebView to load the SDK.
(() => {
  const sdk = document.createElement('script');
  sdk.id = 'telegram-sdk';
  sdk.async = true;
  function record(event) {
    const result = event.type === 'load' ? 'loaded' : 'failed';
    document.documentElement.dataset.loftSdk = result;
    performance.mark('loft:startup:sdk-' + result);
    window.dispatchEvent(new Event('loft:sdk-settled'));
  }
  sdk.addEventListener('load', record, { once: true });
  sdk.addEventListener('error', record, { once: true });
  sdk.src = 'https://telegram.org/js/telegram-web-app.js';
  document.head.append(sdk);
})();
