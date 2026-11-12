# Graph Report - LOFT 2  (2026-11-12)

## Corpus Check
- 167 files · ~151,337 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, .example 1, (none) 1)

## Summary
- 908 nodes · 2215 edges · 53 communities (27 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9a3bee2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Сервер и уведомления
- Корзина и оформление
- Навигация и состояние
- ProductPage.tsx
- Анимации и прокрутка
- Браузерные проверки
- Маршруты и оболочка
- Доступ и безопасность
- Остатки и резервирование
- Зависимости и линтер
- Иконки категорий
- Заказы и популярность
- Заявки и очередь
- Сессии и MFA
- Типы клиентского кода
- Типы инструментов сборки
- Инструменты проверки кода
- Интеграция Telegram
- Типы серверного кода
- 01_store_backend.sql
- Зависимости интерфейса
- Сборка и сервер
- Команды проекта
- Проверка публикации
- Сроки резервирования
- Настройки TypeScript
- 20261112120358_order_refunds.sql
- Публикация и заголовки
- public.store_create_order
- store_payment_confirmation_guard

## God Nodes (most connected - your core abstractions)
1. `useStore` - 47 edges
2. `react` - 30 edges
3. `private.store_outbox` - 25 edges
4. `IslandHeader()` - 24 edges
5. `public.store_create_order()` - 22 edges
6. `HttpError` - 21 edges
7. `react-router-dom` - 21 edges
8. `test` - 21 edges
9. `handler()` - 20 edges
10. `AnimatedRoutes()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `public.store_pending_notifications()` --reads_from--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261112120358_order_refunds.sql → db/01_store_backend.sql
- `public.store_claim_custom_notification()` --reads_from--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261112120358_order_refunds.sql → db/01_store_backend.sql
- `private.store_cancel_order_internal()` --writes_to--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261112120358_order_refunds.sql → db/01_store_backend.sql
- `private.store_queue_order_notifications()` --writes_to--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261112120358_order_refunds.sql → db/01_store_backend.sql
- `public.store_claim_notification()` --writes_to--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261112120358_order_refunds.sql → db/01_store_backend.sql

## Import Cycles
- None detected.

## Communities (53 total, 26 thin omitted)

### Community 0 - "Сервер и уведомления"
Cohesion: 0.06
Nodes (58): handler(), handler(), handler(), dbError(), handler(), presentOrder(), privatePath(), signedUrl() (+50 more)

### Community 1 - "Корзина и оформление"
Cohesion: 0.06
Nodes (47): IntrinsicImage(), RefundSummary(), invalidateStoreData(), peekStoreData(), storeApi(), createDataFetch(), canClientCancel(), formatMoney() (+39 more)

### Community 2 - "Навигация и состояние"
Cohesion: 0.07
Nodes (76): lucide-react, react, react-router-dom, zustand, BottomNavbarProps, TAB_PATHS, TabType, CategoryIcon() (+68 more)

### Community 3 - "ProductPage.tsx"
Cohesion: 0.09
Nodes (37): react-dom@^19.2.6, sonner@^2.0.7, framer-motion, react-dom, sonner, aspects, PlaneFlight(), ProductPhotoViewer() (+29 more)

### Community 4 - "Анимации и прокрутка"
Cohesion: 0.07
Nodes (56): AnimatedRoutes(), RouteFrame(), capturedPositions, captureScrollPosition(), getSavedPositions(), ScrollRestoration(), SurfaceDialog(), dialogClip() (+48 more)

### Community 5 - "Браузерные проверки"
Cohesion: 0.11
Nodes (17): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+9 more)

### Community 6 - "Маршруты и оболочка"
Cohesion: 0.08
Nodes (43): App(), AppLayout(), MAIN_TAB_PATHS, TabType, TelegramBackButtonManager(), ThemeManager(), AppToaster(), readTheme() (+35 more)

### Community 7 - "Доступ и безопасность"
Cohesion: 0.07
Nodes (21): private.store_file_referenced(), private.store_guard_registration(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker(), public.get_product_popularity() (+13 more)

### Community 8 - "Остатки и резервирование"
Cohesion: 0.27
Nodes (10): private.store_expire_reservations(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery(), public.store_create_order() (+2 more)

### Community 9 - "Зависимости и линтер"
Cohesion: 0.09
Nodes (30): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, @playwright/test@1.64.1, @tailwindcss/postcss@^4.3.0 (+22 more)

### Community 10 - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Community 11 - "Заказы и популярность"
Cohesion: 0.09
Nodes (28): private.store_outbox, public.get_product_popularity(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), public.store_claim_notification(), public.store_pending_notifications(), public.store_admin_order_status(), private.store_queue_order_notifications() (+20 more)

### Community 12 - "Заявки и очередь"
Cohesion: 0.18
Nodes (16): private.store_expire_reservations(), private.store_housekeeping(), private.store_uploads, public.store_create_request(), public.store_orphan_files(), store_upload_customer, private.store_queue_order_notifications(), private.store_queue_special_status() (+8 more)

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
Cohesion: 0.16
Nodes (5): typescript@~6.0.2, typescript, admin, env, admin

### Community 17 - "Интеграция Telegram"
Cohesion: 0.12
Nodes (3): Telegram, WebApp, Window

### Community 18 - "Типы серверного кода"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters (+5 more)

### Community 19 - "01_store_backend.sql"
Cohesion: 0.18
Nodes (6): china_user_request_key, orders_user_request_key, private.store_limits, public.store_create_order(), public.store_create_request(), public.store_save_screenshot()

### Community 20 - "Зависимости интерфейса"
Cohesion: 0.17
Nodes (12): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, @supabase/supabase-js@2.108.0, @twa-dev/sdk@^8.0.2 (+4 more)

### Community 21 - "Сборка и сервер"
Cohesion: 0.18
Nodes (8): vite@^8.0.12, @vitejs/plugin-react@^6.0.1, vite, @vitejs/plugin-react, admin, artifacts, root, servers

### Community 22 - "Команды проекта"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:all, test:csp (+1 more)

### Community 23 - "Проверка публикации"
Cohesion: 0.22
Nodes (5): data, env, params, secret, token

### Community 25 - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

### Community 26 - "20261112120358_order_refunds.sql"
Cohesion: 0.10
Nodes (23): private.store_cancel_order_internal(), private.store_expire_reservations(), private.store_prepare_refund(), private.store_queue_cancellation(), private.store_queue_order_notifications(), private.store_queue_ordinary_order(), private.store_queue_special_order(), private.store_refund_audit (+15 more)

### Community 51 - "public.store_create_order"
Cohesion: 0.27
Nodes (4): public.store_create_order(), public.store_create_order(), public.store_create_order(), strict

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Навигация и состояние` to `Корзина и оформление`, `ProductPage.tsx`, `Анимации и прокрутка`, `Маршруты и оболочка`, `Зависимости и линтер`, `Иконки категорий`, `Зависимости интерфейса`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `Сервер и уведомления` be split into smaller, more focused modules?**
  _Cohesion score 0.06246134817563389 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `Зависимости и линтер`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Корзина и оформление` be split into smaller, more focused modules?**
  _Cohesion score 0.062111801242236024 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Зависимости интерфейса` to `Сервер и уведомления`, `Зависимости и линтер`, `Навигация и состояние`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Навигация и состояние` be split into smaller, more focused modules?**
  _Cohesion score 0.06900904691773617 - nodes in this community are weakly interconnected._
- **Should `ProductPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08865248226950355 - nodes in this community are weakly interconnected._