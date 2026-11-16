# Graph Report - LOFT 2  (2026-11-16)

## Corpus Check
- 237 files · ~188,989 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, .example 1, (none) 1)

## Summary
- 1197 nodes · 3113 edges · 82 communities (54 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b634f456`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ref_node_test
- store.ts
- useStore
- maintenance.ts
- Анимации и прокрутка
- Браузерные проверки
- Маршруты и оболочка
- Доступ и безопасность
- VercelResponse
- eslint.config.js
- Иконки категорий
- ProductPage.tsx
- public.china_requests
- Сессии и MFA
- Типы клиентского кода
- Типы инструментов сборки
- devDependencies
- Интеграция Telegram
- Типы серверного кода
- store2-baseline.sql
- Зависимости интерфейса
- vite
- Команды проекта
- Проверка публикации
- catalog-growth.test.ts
- Настройки TypeScript
- public.orders
- vercel.json
- public.store_create_order
- store_payment_confirmation_guard
- 20261113170735_store2_history_and_tasks.sql
- ProfilePage.tsx
- sql/package.json
- 01_store_backend.sql
- ResourceCache
- 20261113173520_store2_campaigns.sql
- CartPage.tsx
- 20261112120358_order_refunds.sql
- useStore
- preferences.ts
- models.ts
- useStore.ts
- package.json
- money.ts
- telegramPhoto.ts
- supabase.ts
- dateTime.ts
- public.product_variants
- public.store_create_order
- private.store_customer_preferences
- OrderDetailModal
- 20261114162026_store2_reminder_intervals.sql
- payments.ts
- private.store_admin_campaign_action_base
- public.store_admin_reminder_settings
- architecture.test.ts
- ProductSizeChart.tsx

## God Nodes (most connected - your core abstractions)
1. `public.orders` - 76 edges
2. `useStore` - 55 edges
3. `react` - 39 edges
4. `test` - 34 edges
5. `public.china_requests` - 34 edges
6. `storeApi()` - 31 edges
7. `STORE` - 30 edges
8. `ProductPage()` - 26 edges
9. `ProfilePage()` - 25 edges
10. `HttpError` - 25 edges

## Surprising Connections (you probably didn't know these)
- `china_user_request_key` --indexes--> `public.china_requests`  [EXTRACTED]
  db/01_store_backend.sql → tests/sql/store2-baseline.sql
- `public.store_create_request()` --reads_from--> `public.china_requests`  [EXTRACTED]
  db/01_store_backend.sql → tests/sql/store2-baseline.sql
- `public.store_queue_admin_message()` --reads_from--> `public.china_requests`  [EXTRACTED]
  supabase/migrations/20261106154106_security_architecture.sql → tests/sql/store2-baseline.sql
- `private.store_payment_reviews` --references--> `public.orders`  [EXTRACTED]
  db/09_admin_mfa_and_payment_audit.sql → tests/sql/store2-baseline.sql
- `orders_user_request_key` --indexes--> `public.orders`  [EXTRACTED]
  db/01_store_backend.sql → tests/sql/store2-baseline.sql

## Import Cycles
- None detected.

## Communities (82 total, 28 thin omitted)

### Community 0 - "ref_node_test"
Cohesion: 0.12
Nodes (7): escape(), specialNotification(), SpecialSnapshot, token, call(), response(), token

### Community 1 - "store.ts"
Cohesion: 0.19
Nodes (27): handler(), dbError(), handler(), presentOrder(), privatePath(), signedUrl(), uuid(), handler() (+19 more)

### Community 2 - "useStore"
Cohesion: 0.27
Nodes (20): react, react-router-dom, Collapse(), ProductCard, catalogMoney(), getEffectivePriceUsd(), isProductOnSale(), getBrands() (+12 more)

### Community 3 - "maintenance.ts"
Cohesion: 0.15
Nodes (25): handler(), actions, managerReminder(), dispatchNotification(), send(), TelegramOptions, cancellationNotification(), escapeHtml() (+17 more)

### Community 4 - "Анимации и прокрутка"
Cohesion: 0.06
Nodes (67): framer-motion, AnimatedRoutes(), RouteFrame(), aspects, IntrinsicImage(), PlaneFlight(), capturedPositions, captureScrollPosition() (+59 more)

### Community 5 - "Браузерные проверки"
Cohesion: 0.05
Nodes (26): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+18 more)

### Community 6 - "Маршруты и оболочка"
Cohesion: 0.07
Nodes (47): App(), AppLayout(), MAIN_TAB_PATHS, ProductRoute(), TabType, TelegramBackButtonManager(), ThemeManager(), AppToaster() (+39 more)

### Community 7 - "Доступ и безопасность"
Cohesion: 0.09
Nodes (16): private.store_file_referenced(), private.store_guard_registration(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker(), public.get_product_popularity() (+8 more)

### Community 8 - "VercelResponse"
Cohesion: 0.25
Nodes (6): handler(), handler(), handler(), VercelRequest, VercelResponse, bearer

### Community 9 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, typescript-eslint@^8.59.2, eslint, @eslint/js (+4 more)

### Community 10 - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Community 11 - "ProductPage.tsx"
Cohesion: 0.14
Nodes (25): sonner, ProductPhotoViewer(), RestockControl(), useProductVariants(), productParameter(), ProductPageResource, cacheProduct(), cacheProducts() (+17 more)

### Community 12 - "public.china_requests"
Cohesion: 0.15
Nodes (20): private.store_expire_reservations(), private.store_housekeeping(), private.store_uploads, public.store_create_request(), public.store_orphan_files(), store_upload_customer, private.store_queue_order_notifications(), private.store_queue_special_status() (+12 more)

### Community 13 - "Сессии и MFA"
Cohesion: 0.18
Nodes (8): private.store_admins, public.store_is_admin(), private.store_audit_payment(), private.store_payment_audit, private.store_payment_reviews, public.store_admin_auth_state(), store_payment_audit, public.store_is_admin()

### Community 14 - "Типы клиентского кода"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 15 - "Типы инструментов сборки"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 16 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @playwright/test@1.64.1, @tailwindcss/postcss@^4.3.0, @tailwindcss/vite@4.3.3, @types/node@^24.12.3, @types/react@^19.2.14, typescript@~6.0.2, @tailwindcss/postcss (+4 more)

### Community 17 - "Интеграция Telegram"
Cohesion: 0.12
Nodes (3): Telegram, WebApp, Window

### Community 18 - "Типы серверного кода"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters (+5 more)

### Community 19 - "store2-baseline.sql"
Cohesion: 0.20
Nodes (7): public.store_finish_upload(), cron.job, cron.schedule(), private.store_outbox, public.brands, public.refunds, storage.buckets

### Community 20 - "Зависимости интерфейса"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-dom@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, sharp@0.35.5 (+7 more)

### Community 21 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.0.12, @vitejs/plugin-react@^6.0.1, vite, @vitejs/plugin-react

### Community 22 - "Команды проекта"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:all, test:csp (+1 more)

### Community 23 - "Проверка публикации"
Cohesion: 0.22
Nodes (5): data, env, params, secret, token

### Community 24 - "catalog-growth.test.ts"
Cohesion: 0.16
Nodes (17): CampaignJob, deliverCampaign(), DeliveryResult, PreparationError, prepareCampaignDelivery(), runCampaignBatch(), launchParameter(), miniAppBase() (+9 more)

### Community 25 - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

### Community 26 - "public.orders"
Cohesion: 0.07
Nodes (39): public.get_product_popularity(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), store_customer_pending_orders, store_expiring_reservations, public.store_claim_notification(), public.store_pending_notifications(), public.store_admin_order_status() (+31 more)

### Community 28 - "vercel.json"
Cohesion: 0.33
Nodes (5): maxDuration, functions, api/campaignWorker.ts, headers, rewrites

### Community 51 - "public.store_create_order"
Cohesion: 0.15
Nodes (21): private.store_expire_reservations(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery(), public.store_create_order() (+13 more)

### Community 53 - "20261113170735_store2_history_and_tasks.sql"
Cohesion: 0.22
Nodes (11): private.store_journal_changed(), private.store_order_events, private.store_reminder_settings, private.store_tasks(), private.store_within_work_hours(), public.store_admin_order_history(), public.store_admin_tasks(), public.store_queue_manager_reminders() (+3 more)

### Community 54 - "ProfilePage.tsx"
Cohesion: 0.17
Nodes (16): MarketingConsent(), RestockSubscriptions(), invalidateStoreData(), peekStoreData(), storeApi(), cancelOrder(), STORE_MAP_URL, STORE_NAVIGATOR_URL (+8 more)

### Community 55 - "sql/package.json"
Cohesion: 0.33
Nodes (6): @electric-sql/pglite, devDependencies, @electric-sql/pglite@0.5.16, name, private, type

### Community 56 - "01_store_backend.sql"
Cohesion: 0.09
Nodes (13): china_user_request_key, orders_user_request_key, private.store_limits, private.store_outbox, public.store_create_order(), public.store_create_request(), public.store_save_screenshot(), public.store_admin_confirm_payment_with_notice() (+5 more)

### Community 60 - "20261113173520_store2_campaigns.sql"
Cohesion: 0.17
Nodes (21): campaign_recipients_expired, campaign_recipients_pending, campaign_tests_pending, campaigns_due, private.store_campaign_freeze(), private.store_campaign_recipients, private.store_campaign_recount(), private.store_campaign_tests (+13 more)

### Community 61 - "CartPage.tsx"
Cohesion: 0.19
Nodes (16): needsContactSave(), normalizedPhone(), normalizedText(), CartPageResource, uploadPaymentScreenshot(), Line, specialCheckoutError(), createOrder() (+8 more)

### Community 62 - "20261112120358_order_refunds.sql"
Cohesion: 0.13
Nodes (15): private.store_expire_reservations(), private.store_prepare_refund(), private.store_queue_cancellation(), private.store_queue_ordinary_order(), private.store_queue_special_order(), private.store_refund_audit, public.refunds, public.store_admin_cancel_order_reason() (+7 more)

### Community 63 - "useStore"
Cohesion: 0.18
Nodes (18): lucide-react, CategoryIcon(), IslandHeader(), IslandHeaderProps, CategoryPage(), getSubcategoriesLabelRu(), FavoritesPage(), getItemsLabelRu() (+10 more)

### Community 64 - "preferences.ts"
Cohesion: 0.14
Nodes (17): CustomerPreferences(), SavedSizes(), getSizesLabelRu(), SizeSelector(), SizeSelectorProps, SizeType, emptyPreferences, Preferences (+9 more)

### Community 66 - "useStore.ts"
Cohesion: 0.12
Nodes (17): zustand, BottomNavbarProps, TAB_PATHS, TabType, cartAdditionError(), CategoryTree, AppState, CachedCategories (+9 more)

### Community 67 - "package.json"
Cohesion: 0.22
Nodes (8): @types/react-dom@^19.2.3, name, overrides, minimatch, private, type, version, @types/react-dom

### Community 68 - "money.ts"
Cohesion: 0.25
Nodes (11): escape(), specialOrderNotification(), SpecialOrderSnapshot, deliveryQuote(), formatUsd(), readDeliverySettings(), allocateUzs(), displayMoney() (+3 more)

### Community 69 - "telegramPhoto.ts"
Cohesion: 0.39
Nodes (6): sharp, @supabase/supabase-js, approvedProductImage(), compatiblePhoto(), pending, productTelegramPhoto()

### Community 70 - "supabase.ts"
Cohesion: 0.21
Nodes (12): ProductRecommendations(), createDataFetch(), readAll(), recommendProducts(), dataCache, fetchProductPopularity(), getCategoriesTree(), getProducts() (+4 more)

### Community 71 - "dateTime.ts"
Cohesion: 0.22
Nodes (16): RefundSummary(), dateLocale(), dateTimeOptions, formatLocalDate(), formatLocalDateTime(), formatLocalTime(), getDeviceTimeZone(), localDateKey() (+8 more)

### Community 72 - "public.product_variants"
Cohesion: 0.15
Nodes (16): private.store_restock_candidates, private.store_restock_changed(), private.store_restock_subscriptions, product_recommendations_target, public.product_recommendations, public.store_pending_notifications(), public.store_queue_restocks(), public.store_restock() (+8 more)

### Community 73 - "public.store_create_order"
Cohesion: 0.28
Nodes (4): public.store_create_order(), public.store_create_order(), public.store_create_order(), strict

### Community 74 - "private.store_customer_preferences"
Cohesion: 0.18
Nodes (11): private.store_customer_preferences, private.store_bot_delivery_state, private.store_campaign_audience(), public.store_admin_campaign_action(), public.store_marketing_consent(), store_marketing_opt_in, public.store_campaign_preflight(), public.store_admin_campaign_tests() (+3 more)

### Community 75 - "OrderDetailModal"
Cohesion: 0.26
Nodes (9): nextSpecialStatuses(), SPECIAL_DELIVERY, SPECIAL_PICKUP, specialOrderIds(), specialStatusTone(), usesSpecialFulfillment(), getOrderCurrency(), OrderDetailModal() (+1 more)

### Community 76 - "20261114162026_store2_reminder_intervals.sql"
Cohesion: 0.38
Nodes (6): private.store_reminder_deliveries, public.store_admin_reminder_settings(), public.store_queue_manager_reminders(), public.store_reminder_delivered(), public.store_reminder_ready(), store_reminder_deliveries_stage

### Community 77 - "payments.ts"
Cohesion: 0.36
Nodes (7): formatCardNumber(), parsePaymentCards(), PaymentCard, PaymentCards, PaymentCurrency, getPaymentCards(), MANAGER_TELEGRAM_LINK

### Community 78 - "private.store_admin_campaign_action_base"
Cohesion: 0.29
Nodes (3): private.store_admin_campaign_action_base(), private.store_within_work_hours(), public.store_admin_reminder_settings()

### Community 79 - "public.store_admin_reminder_settings"
Cohesion: 0.25
Nodes (4): public.store_data_revisions, private.store_admin_action_audit, public.store_admin_reminder_settings(), auth.users

### Community 80 - "architecture.test.ts"
Cohesion: 0.32
Nodes (4): CachedRate, exchangeRate(), valid(), token

### Community 81 - "ProductSizeChart.tsx"
Cohesion: 0.38
Nodes (4): ProductSizeChart(), sizeChartColumns, chooseSizeChart(), owners

## Knowledge Gaps
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useStore` to `preferences.ts`, `useStore.ts`, `package.json`, `Анимации и прокрутка`, `Маршруты и оболочка`, `supabase.ts`, `dateTime.ts`, `Иконки категорий`, `ProductPage.tsx`, `ProductSizeChart.tsx`, `Зависимости интерфейса`, `ProfilePage.tsx`, `CartPage.tsx`, `useStore`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `ref_node_test` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `devDependencies`, `package.json`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Анимации и прокрутка` be split into smaller, more focused modules?**
  _Cohesion score 0.05612694681163679 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `telegramPhoto.ts` to `store.ts`, `package.json`, `supabase.ts`, `Зависимости интерфейса`, `catalog-growth.test.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Браузерные проверки` be split into smaller, more focused modules?**
  _Cohesion score 0.05339105339105339 - nodes in this community are weakly interconnected._
- **Should `Маршруты и оболочка` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._