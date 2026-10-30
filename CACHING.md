# Browser and page data caching

Versioned Vite JS/CSS under `/assets/` use a one-year immutable browser cache. The SPA HTML revalidates on every navigation/reload, including nested routes. Missing assets return 404 instead of the SPA HTML. Authenticated API responses remain `no-store`; their short-lived history cache is in application memory only.

The shared `ResourceCache` bounds memory, deduplicates pending loads, expires entries from their original fetch time, and prevents invalidated requests from overwriting newer entries. Empty lists are valid cached results; errors are not cached.

Storefront routes share the persisted public catalog/category snapshot (5 minutes). Brands share a 5-minute memory cache between catalog, search and brand pages. Product details expire after 5 minutes, colors after 60 seconds, and available sizes after 30 seconds, keyed by product and color. Short HTTP read caching prevents duplicate requests across loaders. Product stock validation bypasses both this cache and the browser HTTP cache. Checkout forces fresh product and delivery/price settings before reviewing the total; the server still validates the actual transaction.

Customer order/request history is cached for 15 seconds in memory, scoped to the verified Telegram identity. Mutations invalidate history and size availability; changed/expired Telegram sessions clear private history. A delayed response from an earlier identity cannot repopulate the current session. No customer history is added to localStorage.

Cart, favorites, theme and language retain their existing persistence. Static legal pages have no server data to cache. This is not an offline/service-worker cache.

Run `npm test`, `npm run build`, then `node scripts/verify-deployment.mjs <store-origin> <admin-origin>` after deployment. The smoke check verifies HTML/asset/API cache headers without creating orders or sending messages.
