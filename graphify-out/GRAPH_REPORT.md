# Graph Report - LOFT 2  (2026-11-16)

## Corpus Check
- 240 files · ~196,984 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, .example 1, (none) 1)

## Summary
- 1203 nodes · 3131 edges · 71 communities (42 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0aa1a8ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sharing.ts
- store.ts
- react
- ref_node_assert
- Анимации и прокрутка
- Браузерные проверки
- useStore
- Доступ и безопасность
- SizeSelector.tsx
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
- 07_reservation_lifecycle.sql
- Настройки TypeScript
- public.orders
- vercel.json
- public.products
- store_payment_confirmation_guard
- 20261113170735_store2_history_and_tasks.sql
- ProfilePage.tsx
- sql/package.json
- public
- ResourceCache
- 20261113173520_store2_campaigns.sql
- 20261114162041_store2_telegram_photos.sql
- 20261112120358_order_refunds.sql
- preferences.ts
- package.json
- supabase.ts
- 20261113165503_store2_catalog_growth.sql
- public.store_campaign_claim
- 20261114162026_store2_reminder_intervals.sql
- private.store_admin_campaign_action_base
- catalog-growth.test.ts

## God Nodes (most connected - your core abstractions)
1. `public.orders` - 76 edges
2. `useStore` - 55 edges
3. `react` - 39 edges
4. `test` - 37 edges
5. `public.china_requests` - 34 edges
6. `STORE` - 32 edges
7. `storeApi()` - 31 edges
8. `HttpError` - 25 edges
9. `ProfilePage()` - 25 edges
10. `public.products` - 25 edges

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

## Communities (71 total, 29 thin omitted)

### Community 0 - "sharing.ts"
Cohesion: 0.36
Nodes (7): LaunchTarget(), authenticate(), decodeLaunch(), productParameter(), productLink(), shareConfig(), shareProduct()

### Community 1 - "store.ts"
Cohesion: 0.05
Nodes (65): handler(), handler(), handler(), handler(), dbError(), handler(), presentOrder(), privatePath() (+57 more)

### Community 2 - "react"
Cohesion: 0.19
Nodes (16): react-dom@^19.2.6, framer-motion, react, react-dom, aspects, IntrinsicImage(), PlaneFlight(), ProductPhotoViewer() (+8 more)

### Community 3 - "ref_node_assert"
Cohesion: 0.06
Nodes (47): handler(), admin, artifacts, root, servers, installed, pg, actions (+39 more)

### Community 4 - "Анимации и прокрутка"
Cohesion: 0.07
Nodes (57): AnimatedRoutes(), RouteFrame(), capturedPositions, captureScrollPosition(), getSavedPositions(), ScrollRestoration(), SurfaceDialog(), dialogClip() (+49 more)

### Community 5 - "Браузерные проверки"
Cohesion: 0.07
Nodes (20): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+12 more)

### Community 6 - "useStore"
Cohesion: 0.05
Nodes (99): lucide-react, react-router-dom, zustand, App(), AppLayout(), MAIN_TAB_PATHS, ProductRoute(), TabType (+91 more)

### Community 7 - "Доступ и безопасность"
Cohesion: 0.08
Nodes (19): private.store_file_referenced(), private.store_guard_registration(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker(), public.get_product_popularity() (+11 more)

### Community 8 - "SizeSelector.tsx"
Cohesion: 0.31
Nodes (6): SavedSizes(), getSizesLabelRu(), SizeSelector(), SizeSelectorProps, SizeType, owners

### Community 9 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, typescript-eslint@^8.59.2, eslint, @eslint/js (+4 more)

### Community 10 - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Community 11 - "ProductPage.tsx"
Cohesion: 0.20
Nodes (13): ProductPageResource, cacheSizes(), getCachedProduct(), getCachedSizes(), getOpeningPhoto(), LETTER_ORDER, sizeSortKey(), sortSizes() (+5 more)

### Community 12 - "public.china_requests"
Cohesion: 0.15
Nodes (20): private.store_expire_reservations(), private.store_housekeeping(), private.store_uploads, public.store_create_request(), public.store_orphan_files(), store_upload_customer, private.store_queue_order_notifications(), private.store_queue_special_status() (+12 more)

### Community 13 - "Сессии и MFA"
Cohesion: 0.09
Nodes (15): china_user_request_key, orders_user_request_key, private.store_admins, private.store_limits, private.store_outbox, public.store_create_order(), public.store_create_request(), public.store_is_admin() (+7 more)

### Community 14 - "Типы клиентского кода"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 15 - "Типы инструментов сборки"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 16 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @playwright/test@1.64.1, @tailwindcss/vite@4.3.3, @types/node@^24.12.3, @types/react@^19.2.14, @types/react-dom@^19.2.3, typescript@~6.0.2, @tailwindcss/vite (+4 more)

### Community 17 - "Интеграция Telegram"
Cohesion: 0.12
Nodes (3): Telegram, WebApp, Window

### Community 18 - "Типы серверного кода"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters (+5 more)

### Community 19 - "store2-baseline.sql"
Cohesion: 0.12
Nodes (8): public.store_finish_upload(), cron.job, cron.schedule(), private.store_outbox, public.brands, public.refunds, public.store_admin_save_product(), storage.buckets

### Community 20 - "Зависимости интерфейса"
Cohesion: 0.17
Nodes (12): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, sharp@0.35.5, sonner@^2.0.7 (+4 more)

### Community 21 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.0.12, @vitejs/plugin-react@^6.0.1, vite, @vitejs/plugin-react

### Community 22 - "Команды проекта"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:all, test:csp (+1 more)

### Community 23 - "Проверка публикации"
Cohesion: 0.22
Nodes (5): data, env, params, secret, token

### Community 25 - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

### Community 26 - "public.orders"
Cohesion: 0.08
Nodes (37): public.get_product_popularity(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), public.store_claim_notification(), public.store_pending_notifications(), public.store_admin_order_status(), private.store_queue_order_notifications(), public.store_admin_confirm_payment() (+29 more)

### Community 28 - "vercel.json"
Cohesion: 0.33
Nodes (5): maxDuration, functions, api/campaignWorker.ts, headers, rewrites

### Community 51 - "public.products"
Cohesion: 0.14
Nodes (28): private.store_expire_reservations(), public.store_create_order(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery() (+20 more)

### Community 53 - "20261113170735_store2_history_and_tasks.sql"
Cohesion: 0.12
Nodes (16): public.store_data_revisions, private.store_admin_action_audit, private.store_journal_changed(), private.store_order_events, private.store_reminder_settings, private.store_tasks(), private.store_within_work_hours(), public.store_admin_order_history() (+8 more)

### Community 54 - "ProfilePage.tsx"
Cohesion: 0.06
Nodes (67): sonner, MarketingConsent(), RefundSummary(), RestockSubscriptions(), invalidateStoreData(), storeApi(), needsContactSave(), normalizedPhone() (+59 more)

### Community 55 - "sql/package.json"
Cohesion: 0.33
Nodes (6): @electric-sql/pglite, devDependencies, @electric-sql/pglite@0.5.16, name, private, type

### Community 56 - "public"
Cohesion: 0.21
Nodes (7): public.store_admin_request_status(), public.size_charts, public.store_admin_size_chart(), public.store_customer_preferences(), store_data_revision, public.store_reminder_ready(), public.store_admin_campaign_tests()

### Community 60 - "20261113173520_store2_campaigns.sql"
Cohesion: 0.14
Nodes (28): private.store_customer_preferences, campaign_recipients_expired, campaign_recipients_pending, campaign_tests_pending, campaigns_due, private.store_bot_delivery_state, private.store_campaign_audience(), private.store_campaign_freeze() (+20 more)

### Community 62 - "20261112120358_order_refunds.sql"
Cohesion: 0.13
Nodes (15): private.store_expire_reservations(), private.store_prepare_refund(), private.store_queue_cancellation(), private.store_queue_ordinary_order(), private.store_queue_special_order(), private.store_refund_audit, public.refunds, public.store_admin_cancel_order_reason() (+7 more)

### Community 64 - "preferences.ts"
Cohesion: 0.29
Nodes (8): CustomerPreferences(), emptyPreferences, Preferences, SavedAddress, SavedSize, usePreferences(), matchesSize(), PublicVariant

### Community 67 - "package.json"
Cohesion: 0.22
Nodes (8): @tailwindcss/postcss@^4.3.0, name, overrides, minimatch, private, type, version, @tailwindcss/postcss

### Community 70 - "supabase.ts"
Cohesion: 0.20
Nodes (14): ProductRecommendations(), RestockControl(), peekStoreData(), peekStoreResponse(), createDataFetch(), readAll(), recommendProducts(), dataCache (+6 more)

### Community 72 - "20261113165503_store2_catalog_growth.sql"
Cohesion: 0.28
Nodes (7): private.store_restock_changed(), product_recommendations_target, public.product_recommendations, public.store_pending_notifications(), public.store_restock_delivery(), store_data_revision, store_restock_changed

### Community 74 - "public.store_campaign_claim"
Cohesion: 0.33
Nodes (3): public.store_admin_campaign_tests(), public.store_campaign_claim(), public.store_customer_language()

### Community 76 - "20261114162026_store2_reminder_intervals.sql"
Cohesion: 0.38
Nodes (6): private.store_reminder_deliveries, public.store_admin_reminder_settings(), public.store_queue_manager_reminders(), public.store_reminder_delivered(), public.store_reminder_ready(), store_reminder_deliveries_stage

### Community 78 - "private.store_admin_campaign_action_base"
Cohesion: 0.29
Nodes (3): private.store_admin_campaign_action_base(), private.store_within_work_hours(), public.store_admin_reminder_settings()

### Community 81 - "catalog-growth.test.ts"
Cohesion: 0.27
Nodes (7): ProductSizeChart(), sizeChartColumns, chooseSizeChart(), a, products, saved, variants

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `preferences.ts`, `sharing.ts`, `package.json`, `Анимации и прокрутка`, `useStore`, `supabase.ts`, `SizeSelector.tsx`, `Иконки категорий`, `ProductPage.tsx`, `catalog-growth.test.ts`, `Зависимости интерфейса`, `ProfilePage.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053189577717879605 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `devDependencies`, `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `ref_node_assert` be split into smaller, more focused modules?**
  _Cohesion score 0.05581395348837209 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `store.ts` to `package.json`, `supabase.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Анимации и прокрутка` be split into smaller, more focused modules?**
  _Cohesion score 0.06672519754170325 - nodes in this community are weakly interconnected._
- **Should `Браузерные проверки` be split into smaller, more focused modules?**
  _Cohesion score 0.07375844842785777 - nodes in this community are weakly interconnected._