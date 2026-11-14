# Graph Report - LOFT 2  (2026-11-14)

## Corpus Check
- 231 files · ~186,771 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, .example 1, (none) 1)

## Summary
- 1167 nodes · 3043 edges · 73 communities (44 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0612749e`
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
- ChinaPage.tsx
- preferences.ts
- models.ts
- useStore.ts
- package.json
- money.ts
- telegramPhoto.ts
- supabase.ts
- 07_reservation_lifecycle.sql
- public.product_variants

## God Nodes (most connected - your core abstractions)
1. `public.orders` - 76 edges
2. `useStore` - 55 edges
3. `react` - 38 edges
4. `public.china_requests` - 34 edges
5. `test` - 33 edges
6. `storeApi()` - 31 edges
7. `STORE` - 29 edges
8. `ProductPage()` - 26 edges
9. `HttpError` - 25 edges
10. `lucide-react` - 25 edges

## Surprising Connections (you probably didn't know these)
- `china_user_request_key` --indexes--> `public.china_requests`  [EXTRACTED]
  db/01_store_backend.sql → tests/sql/store2-baseline.sql
- `public.store_create_request()` --reads_from--> `public.china_requests`  [EXTRACTED]
  db/01_store_backend.sql → tests/sql/store2-baseline.sql
- `public.store_queue_admin_message()` --reads_from--> `public.china_requests`  [EXTRACTED]
  supabase/migrations/20261106154106_security_architecture.sql → tests/sql/store2-baseline.sql
- `private.store_payment_reviews` --references--> `public.orders`  [EXTRACTED]
  db/09_admin_mfa_and_payment_audit.sql → tests/sql/store2-baseline.sql
- `store_customer_pending_orders` --indexes--> `public.orders`  [EXTRACTED]
  db/07_reservation_lifecycle.sql → tests/sql/store2-baseline.sql

## Import Cycles
- None detected.

## Communities (73 total, 29 thin omitted)

### Community 0 - "ref_node_test"
Cohesion: 0.11
Nodes (7): token, p, record, token, call(), response(), token

### Community 1 - "store.ts"
Cohesion: 0.19
Nodes (27): handler(), dbError(), handler(), presentOrder(), privatePath(), signedUrl(), uuid(), handler() (+19 more)

### Community 2 - "useStore"
Cohesion: 0.15
Nodes (38): lucide-react, react-router-dom, CategoryIcon(), Collapse(), IslandHeader(), IslandHeaderProps, ProductCard, catalogMoney() (+30 more)

### Community 3 - "maintenance.ts"
Cohesion: 0.16
Nodes (25): handler(), actions, managerReminder(), dispatchNotification(), send(), TelegramOptions, cancellationNotification(), escapeHtml() (+17 more)

### Community 4 - "Анимации и прокрутка"
Cohesion: 0.07
Nodes (55): AnimatedRoutes(), RouteFrame(), capturedPositions, captureScrollPosition(), getSavedPositions(), ScrollRestoration(), dialogClip(), dialogOrigin() (+47 more)

### Community 5 - "Браузерные проверки"
Cohesion: 0.06
Nodes (26): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+18 more)

### Community 6 - "Маршруты и оболочка"
Cohesion: 0.07
Nodes (49): App(), AppLayout(), MAIN_TAB_PATHS, ProductRoute(), TabType, TelegramBackButtonManager(), ThemeManager(), AppToaster() (+41 more)

### Community 7 - "Доступ и безопасность"
Cohesion: 0.07
Nodes (21): private.store_file_referenced(), private.store_guard_registration(), private.store_housekeeping(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker() (+13 more)

### Community 8 - "VercelResponse"
Cohesion: 0.20
Nodes (9): handler(), handler(), handler(), CachedRate, exchangeRate(), valid(), VercelRequest, VercelResponse (+1 more)

### Community 9 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, typescript-eslint@^8.59.2, eslint, @eslint/js (+4 more)

### Community 10 - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Community 11 - "ProductPage.tsx"
Cohesion: 0.17
Nodes (21): ProductPhotoViewer(), RestockControl(), useProductVariants(), productParameter(), cacheProduct(), cacheSizes(), getCachedProduct(), getCachedSizes() (+13 more)

### Community 12 - "public.china_requests"
Cohesion: 0.14
Nodes (21): private.store_expire_reservations(), private.store_uploads, public.store_admin_request_status(), public.store_create_request(), public.store_orphan_files(), private.store_queue_order_notifications(), private.store_queue_special_status(), public.store_admin_cancel_order() (+13 more)

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
Nodes (12): devDependencies, @playwright/test@1.64.1, @tailwindcss/postcss@^4.3.0, @types/node@^24.12.3, @types/react@^19.2.14, @types/react-dom@^19.2.3, typescript@~6.0.2, @tailwindcss/postcss (+4 more)

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
Cohesion: 0.15
Nodes (13): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-dom@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, sharp@0.35.5 (+5 more)

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
Cohesion: 0.12
Nodes (22): CampaignJob, deliverCampaign(), DeliveryResult, PreparationError, prepareCampaignDelivery(), runCampaignBatch(), launchParameter(), miniAppBase() (+14 more)

### Community 25 - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

### Community 26 - "public.orders"
Cohesion: 0.09
Nodes (36): public.get_product_popularity(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), public.store_claim_notification(), public.store_pending_notifications(), public.store_admin_order_status(), private.store_queue_order_notifications(), public.store_admin_confirm_payment() (+28 more)

### Community 28 - "vercel.json"
Cohesion: 0.33
Nodes (5): maxDuration, functions, api/campaignWorker.ts, headers, rewrites

### Community 51 - "public.store_create_order"
Cohesion: 0.13
Nodes (21): private.store_expire_reservations(), public.store_create_order(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery() (+13 more)

### Community 53 - "20261113170735_store2_history_and_tasks.sql"
Cohesion: 0.09
Nodes (21): public.store_data_revisions, private.store_admin_action_audit, private.store_journal_changed(), private.store_order_events, private.store_reminder_settings, private.store_tasks(), private.store_within_work_hours(), public.store_admin_order_history() (+13 more)

### Community 54 - "ProfilePage.tsx"
Cohesion: 0.11
Nodes (27): sonner, IntrinsicImage(), MarketingConsent(), invalidateStoreData(), peekStoreData(), cancelOrder(), cartAdditionError(), Line (+19 more)

### Community 55 - "sql/package.json"
Cohesion: 0.33
Nodes (6): @electric-sql/pglite, devDependencies, @electric-sql/pglite@0.5.16, name, private, type

### Community 56 - "01_store_backend.sql"
Cohesion: 0.17
Nodes (7): china_user_request_key, orders_user_request_key, private.store_limits, private.store_outbox, public.store_create_order(), public.store_create_request(), public.store_save_screenshot()

### Community 60 - "20261113173520_store2_campaigns.sql"
Cohesion: 0.09
Nodes (37): private.store_customer_preferences, public.size_charts, public.store_admin_size_chart(), public.store_customer_preferences(), store_data_revision, campaign_recipients_expired, campaign_recipients_pending, campaign_tests_pending (+29 more)

### Community 61 - "CartPage.tsx"
Cohesion: 0.13
Nodes (25): ProductSizeChart(), sizeChartColumns, SurfaceDialog(), needsContactSave(), normalizedPhone(), normalizedText(), CartPageResource, formatCardNumber() (+17 more)

### Community 62 - "20261112120358_order_refunds.sql"
Cohesion: 0.13
Nodes (15): private.store_expire_reservations(), private.store_prepare_refund(), private.store_queue_cancellation(), private.store_queue_ordinary_order(), private.store_queue_special_order(), private.store_refund_audit, public.refunds, public.store_admin_cancel_order_reason() (+7 more)

### Community 63 - "ChinaPage.tsx"
Cohesion: 0.29
Nodes (10): framer-motion, react, aspects, PlaneFlight(), uploadPrivateImage(), motionDistance, motionEase, motionExitEase (+2 more)

### Community 64 - "preferences.ts"
Cohesion: 0.18
Nodes (13): react-dom, CustomerPreferences(), SavedSizes(), getSizesLabelRu(), SizeSelector(), SizeSelectorProps, SizeType, emptyPreferences (+5 more)

### Community 66 - "useStore.ts"
Cohesion: 0.13
Nodes (16): zustand, BottomNavbarProps, TAB_PATHS, TabType, CategoryTree, AppState, CachedCategories, CachedProducts (+8 more)

### Community 67 - "package.json"
Cohesion: 0.22
Nodes (8): @tailwindcss/vite@4.3.3, name, overrides, minimatch, private, type, version, @tailwindcss/vite

### Community 68 - "money.ts"
Cohesion: 0.19
Nodes (14): escape(), specialNotification(), SpecialSnapshot, escape(), specialOrderNotification(), SpecialOrderSnapshot, deliveryQuote(), formatUsd() (+6 more)

### Community 69 - "telegramPhoto.ts"
Cohesion: 0.36
Nodes (7): @supabase/supabase-js@2.108.0, sharp, @supabase/supabase-js, approvedProductImage(), compatiblePhoto(), pending, productTelegramPhoto()

### Community 70 - "supabase.ts"
Cohesion: 0.18
Nodes (17): ProductRecommendations(), RestockSubscriptions(), storeApi(), createDataFetch(), readAll(), recommendProducts(), dataCache, createOrder() (+9 more)

### Community 72 - "public.product_variants"
Cohesion: 0.15
Nodes (16): private.store_restock_candidates, private.store_restock_changed(), private.store_restock_subscriptions, product_recommendations_target, public.product_recommendations, public.store_pending_notifications(), public.store_queue_restocks(), public.store_restock() (+8 more)

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ChinaPage.tsx` to `preferences.ts`, `useStore.ts`, `package.json`, `Анимации и прокрутка`, `useStore`, `Маршруты и оболочка`, `supabase.ts`, `Иконки категорий`, `ProductPage.tsx`, `Зависимости интерфейса`, `ProfilePage.tsx`, `CartPage.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `ref_node_test` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `devDependencies`, `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `useStore` be split into smaller, more focused modules?**
  _Cohesion score 0.14823529411764705 - nodes in this community are weakly interconnected._
- **Why does `public.orders` connect `public.orders` to `07_reservation_lifecycle.sql`, `Доступ и безопасность`, `public.product_variants`, `public.china_requests`, `Сессии и MFA`, `public.store_create_order`, `store_payment_confirmation_guard`, `20261113170735_store2_history_and_tasks.sql`, `store2-baseline.sql`, `01_store_backend.sql`, `20261113173520_store2_campaigns.sql`, `20261112120358_order_refunds.sql`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Анимации и прокрутка` be split into smaller, more focused modules?**
  _Cohesion score 0.06778846153846153 - nodes in this community are weakly interconnected._
- **Should `Браузерные проверки` be split into smaller, more focused modules?**
  _Cohesion score 0.055043859649122805 - nodes in this community are weakly interconnected._