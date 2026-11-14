# Graph Report - LOFT 2  (2026-11-14)

## Corpus Check
- 215 files · ~175,156 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, .example 1, (none) 1)

## Summary
- 1119 nodes · 2916 edges · 68 communities (39 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08db0438`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ref_node_test
- store.ts
- Навигация и состояние
- maintenance.ts
- Анимации и прокрутка
- Браузерные проверки
- Маршруты и оболочка
- Доступ и безопасность
- VercelResponse
- Зависимости и линтер
- Иконки категорий
- private.store_outbox
- public.china_requests
- Сессии и MFA
- Типы клиентского кода
- Типы инструментов сборки
- Инструменты проверки кода
- Интеграция Telegram
- Типы серверного кода
- store2-baseline.sql
- Зависимости интерфейса
- Сборка и сервер
- Команды проекта
- Проверка публикации
- campaignDelivery.ts
- Настройки TypeScript
- public.orders
- vercel.json
- public.store_create_order
- store_payment_confirmation_guard
- public.store_create_order
- ProfilePage.tsx
- sql/package.json
- 01_store_backend.sql
- ResourceCache
- 20261113173520_store2_campaigns.sql
- catalog-growth.test.ts
- architecture.test.ts
- test-csp.mjs
- 07_reservation_lifecycle.sql
- specialNotifications.ts
- sortSizes.ts
- models.ts

## God Nodes (most connected - your core abstractions)
1. `public.orders` - 76 edges
2. `useStore` - 53 edges
3. `react` - 38 edges
4. `public.china_requests` - 34 edges
5. `storeApi()` - 31 edges
6. `test` - 28 edges
7. `STORE` - 26 edges
8. `HttpError` - 25 edges
9. `IslandHeader()` - 24 edges
10. `ProductPage()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `store_customer_pending_orders` --indexes--> `public.orders`  [EXTRACTED]
  db/07_reservation_lifecycle.sql → tests/sql/store2-baseline.sql
- `store_expiring_reservations` --indexes--> `public.orders`  [EXTRACTED]
  db/07_reservation_lifecycle.sql → tests/sql/store2-baseline.sql
- `private.store_queue_order_notifications()` --reads_from--> `public.orders`  [EXTRACTED]
  supabase/migrations/20261109132028_abandon_unsubmitted_checkout.sql → tests/sql/store2-baseline.sql
- `public.store_admin_confirm_payment()` --reads_from--> `public.orders`  [EXTRACTED]
  supabase/migrations/20261109132028_abandon_unsubmitted_checkout.sql → tests/sql/store2-baseline.sql
- `public.store_save_screenshot()` --writes_to--> `public.orders`  [EXTRACTED]
  supabase/migrations/20261109132028_abandon_unsubmitted_checkout.sql → tests/sql/store2-baseline.sql

## Import Cycles
- None detected.

## Communities (68 total, 29 thin omitted)

### Community 0 - "ref_node_test"
Cohesion: 0.14
Nodes (4): token, call(), response(), token

### Community 1 - "store.ts"
Cohesion: 0.19
Nodes (27): handler(), dbError(), handler(), presentOrder(), privatePath(), signedUrl(), uuid(), handler() (+19 more)

### Community 2 - "Навигация и состояние"
Cohesion: 0.05
Nodes (103): framer-motion, lucide-react, react, react-dom, react-router-dom, sonner, zustand, CategoryIcon() (+95 more)

### Community 3 - "maintenance.ts"
Cohesion: 0.14
Nodes (27): handler(), actions, managerReminder(), dispatchNotification(), send(), TelegramOptions, cancellationNotification(), escapeHtml() (+19 more)

### Community 4 - "Анимации и прокрутка"
Cohesion: 0.06
Nodes (58): AnimatedRoutes(), RouteFrame(), BottomNavbar(), BottomNavbarProps, TAB_PATHS, TabType, capturedPositions, captureScrollPosition() (+50 more)

### Community 5 - "Браузерные проверки"
Cohesion: 0.11
Nodes (17): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+9 more)

### Community 6 - "Маршруты и оболочка"
Cohesion: 0.07
Nodes (46): App(), AppLayout(), MAIN_TAB_PATHS, TabType, TelegramBackButtonManager(), ThemeManager(), AppToaster(), readTheme() (+38 more)

### Community 7 - "Доступ и безопасность"
Cohesion: 0.07
Nodes (20): private.store_file_referenced(), private.store_guard_registration(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker(), public.get_product_popularity() (+12 more)

### Community 8 - "VercelResponse"
Cohesion: 0.25
Nodes (6): handler(), handler(), handler(), VercelRequest, VercelResponse, bearer

### Community 9 - "Зависимости и линтер"
Cohesion: 0.10
Nodes (28): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, @playwright/test@1.64.1, @tailwindcss/vite@4.3.3 (+20 more)

### Community 10 - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Community 11 - "private.store_outbox"
Cohesion: 0.10
Nodes (19): public.store_claim_notification(), public.store_pending_notifications(), private.store_queue_order_notifications(), public.store_admin_confirm_payment(), public.store_claim_notification(), public.store_pending_notifications(), public.store_save_screenshot(), public.store_pending_notifications() (+11 more)

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

### Community 16 - "Инструменты проверки кода"
Cohesion: 0.15
Nodes (4): typescript@~6.0.2, typescript, installed, pg

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
Cohesion: 0.14
Nodes (14): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-dom@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, sonner@^2.0.7 (+6 more)

### Community 21 - "Сборка и сервер"
Cohesion: 0.16
Nodes (9): @tailwindcss/postcss@^4.3.0, vite@^8.0.12, @vitejs/plugin-react@^6.0.1, @tailwindcss/postcss, vite, @vitejs/plugin-react, admin, env (+1 more)

### Community 22 - "Команды проекта"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:all, test:csp (+1 more)

### Community 23 - "Проверка публикации"
Cohesion: 0.22
Nodes (5): data, env, params, secret, token

### Community 24 - "campaignDelivery.ts"
Cohesion: 0.20
Nodes (11): CampaignJob, deliverCampaign(), DeliveryResult, PreparationError, prepareCampaignDelivery(), runCampaignBatch(), StoreTarget, CampaignContent (+3 more)

### Community 25 - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

### Community 26 - "public.orders"
Cohesion: 0.09
Nodes (33): public.get_product_popularity(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), public.store_admin_order_status(), public.store_admin_confirm_payment(), private.store_queue_order_notifications(), private.store_queue_special_order(), public.store_admin_cancel_order() (+25 more)

### Community 28 - "vercel.json"
Cohesion: 0.33
Nodes (5): maxDuration, functions, api/campaignWorker.ts, headers, rewrites

### Community 51 - "public.store_create_order"
Cohesion: 0.14
Nodes (28): private.store_expire_reservations(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery(), public.store_create_order() (+20 more)

### Community 53 - "public.store_create_order"
Cohesion: 0.27
Nodes (5): public.store_create_order(), public.store_create_order(), public.store_create_order(), public.product_colors, strict

### Community 54 - "ProfilePage.tsx"
Cohesion: 0.06
Nodes (66): escape(), specialOrderNotification(), SpecialOrderSnapshot, IntrinsicImage(), MarketingConsent(), RestockSubscriptions(), SurfaceDialog(), invalidateStoreData() (+58 more)

### Community 55 - "sql/package.json"
Cohesion: 0.33
Nodes (6): @electric-sql/pglite, devDependencies, @electric-sql/pglite@0.5.16, name, private, type

### Community 56 - "01_store_backend.sql"
Cohesion: 0.17
Nodes (7): china_user_request_key, orders_user_request_key, private.store_limits, private.store_outbox, public.store_create_order(), public.store_create_request(), public.store_save_screenshot()

### Community 60 - "20261113173520_store2_campaigns.sql"
Cohesion: 0.06
Nodes (50): public.store_data_revisions, private.store_customer_preferences, public.size_charts, public.store_admin_size_chart(), public.store_customer_preferences(), store_data_revision, private.store_admin_action_audit, private.store_journal_changed() (+42 more)

### Community 61 - "catalog-growth.test.ts"
Cohesion: 0.27
Nodes (9): launchParameter(), miniAppBase(), STORE_ORIGIN, targetLink(), webTarget(), a, products, saved (+1 more)

### Community 62 - "architecture.test.ts"
Cohesion: 0.32
Nodes (4): CachedRate, exchangeRate(), valid(), token

### Community 63 - "test-csp.mjs"
Cohesion: 0.33
Nodes (4): admin, artifacts, root, servers

### Community 65 - "specialNotifications.ts"
Cohesion: 0.60
Nodes (3): escape(), specialNotification(), SpecialSnapshot

### Community 66 - "sortSizes.ts"
Cohesion: 0.60
Nodes (4): LETTER_ORDER, sizeSortKey(), sortSizes(), sortSizeStrings()

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Навигация и состояние` to `Анимации и прокрутка`, `Маршруты и оболочка`, `Зависимости и линтер`, `Иконки категорий`, `Зависимости интерфейса`, `ProfilePage.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `ref_node_test` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `Зависимости и линтер`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Навигация и состояние` be split into smaller, more focused modules?**
  _Cohesion score 0.05354573484069887 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Зависимости интерфейса` to `campaignDelivery.ts`, `Зависимости и линтер`, `Навигация и состояние`, `store.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `maintenance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14102564102564102 - nodes in this community are weakly interconnected._
- **Should `Анимации и прокрутка` be split into smaller, more focused modules?**
  _Cohesion score 0.06180733162830349 - nodes in this community are weakly interconnected._