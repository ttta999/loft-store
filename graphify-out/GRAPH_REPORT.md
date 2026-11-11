# Graph Report - LOFT 2  (2026-11-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 844 nodes · 2053 edges · 50 communities (25 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ff0ea6e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Сервер и уведомления
- Корзина и оформление
- Навигация и состояние
- Кэш и ресурсы
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
- Платежи и чеки
- Зависимости интерфейса
- Сборка и сервер
- Команды проекта
- Проверка публикации
- Сроки резервирования
- Настройки TypeScript
- Подтверждение платежа
- Публикация и заголовки

## God Nodes (most connected - your core abstractions)
1. `useStore` - 47 edges
2. `react` - 30 edges
3. `IslandHeader()` - 24 edges
4. `public.store_create_order()` - 22 edges
5. `HttpError` - 21 edges
6. `react-router-dom` - 21 edges
7. `handler()` - 20 edges
8. `AnimatedRoutes()` - 20 edges
9. `App()` - 20 edges
10. `private.store_outbox` - 20 edges

## Surprising Connections (you probably didn't know these)
- `public.store_pending_notifications()` --reads_from--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261106154106_security_architecture.sql → db/01_store_backend.sql
- `public.store_claim_notification()` --writes_to--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261106154106_security_architecture.sql → db/01_store_backend.sql
- `public.store_claim_notification()` --writes_to--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261109132028_abandon_unsubmitted_checkout.sql → db/01_store_backend.sql
- `public.store_pending_notifications()` --reads_from--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261109132028_abandon_unsubmitted_checkout.sql → db/01_store_backend.sql
- `public.store_admin_confirm_payment()` --reads_from--> `private.store_outbox`  [EXTRACTED]
  supabase/migrations/20261111133039_special_order_fulfillment.sql → db/01_store_backend.sql

## Import Cycles
- None detected.

## Communities (50 total, 25 thin omitted)

### Сервер и уведомления - "Сервер и уведомления"
Cohesion: 0.07
Nodes (50): handler(), handler(), handler(), dbError(), handler(), presentOrder(), privatePath(), signedUrl() (+42 more)

### Корзина и оформление - "Корзина и оформление"
Cohesion: 0.06
Nodes (61): IntrinsicImage(), SurfaceDialog(), invalidateStoreData(), peekStoreData(), storeApi(), uploadPrivateImage(), deliveryQuote(), formatUsd() (+53 more)

### Навигация и состояние - "Навигация и состояние"
Cohesion: 0.10
Nodes (56): lucide-react, react, react-router-dom, zustand, BottomNavbar(), BottomNavbarProps, TAB_PATHS, TabType (+48 more)

### Кэш и ресурсы - "Кэш и ресурсы"
Cohesion: 0.06
Nodes (43): react-dom@^19.2.6, sonner@^2.0.7, framer-motion, react-dom, sonner, aspects, PlaneFlight(), ProductPhotoViewer() (+35 more)

### Анимации и прокрутка - "Анимации и прокрутка"
Cohesion: 0.08
Nodes (47): AnimatedRoutes(), RouteFrame(), capturedPositions, captureScrollPosition(), getSavedPositions(), ScrollRestoration(), motionEaseCSS, preloadPage() (+39 more)

### Браузерные проверки - "Браузерные проверки"
Cohesion: 0.11
Nodes (17): checkout(), regularCart(), ADMIN, catalog(), Harness, install(), jwt(), now() (+9 more)

### Маршруты и оболочка - "Маршруты и оболочка"
Cohesion: 0.08
Nodes (42): App(), AppLayout(), MAIN_TAB_PATHS, TabType, TelegramBackButtonManager(), ThemeManager(), AppToaster(), readTheme() (+34 more)

### Доступ и безопасность - "Доступ и безопасность"
Cohesion: 0.08
Nodes (18): private.store_file_referenced(), private.store_guard_registration(), private.store_housekeeping(), private.store_notification_config, private.store_registration_invites, private.store_sessions, private.store_update_popularity(), private.store_wake_worker() (+10 more)

### Остатки и резервирование - "Остатки и резервирование"
Cohesion: 0.17
Nodes (13): private.store_expire_reservations(), public.store_create_order(), public.store_create_order(), public.store_available_sizes(), public.store_product_available(), public.store_create_order(), public.store_create_order(), public.store_admin_save_delivery() (+5 more)

### Зависимости и линтер - "Зависимости и линтер"
Cohesion: 0.09
Nodes (30): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, @playwright/test@1.64.1, @tailwindcss/postcss@^4.3.0 (+22 more)

### Иконки категорий - "Иконки категорий"
Cohesion: 0.07
Nodes (28): CategoryIconProps, ICON_MAP, BackpackIcon, BeanieIcon, BeltIcon, BLOCK_ICONS, BootIcon, CapIcon (+20 more)

### Заказы и популярность - "Заказы и популярность"
Cohesion: 0.11
Nodes (21): public.get_product_popularity(), public.store_claim_notification(), public.store_admin_order_status(), private.store_queue_order_notifications(), public.store_admin_confirm_payment(), public.store_claim_notification(), public.store_pending_notifications(), public.store_save_screenshot() (+13 more)

### Заявки и очередь - "Заявки и очередь"
Cohesion: 0.16
Nodes (19): private.store_outbox, private.store_expire_reservations(), private.store_uploads, public.store_admin_request_status(), public.store_create_request(), public.store_orphan_files(), private.store_queue_order_notifications(), private.store_queue_special_status() (+11 more)

### Сессии и MFA - "Сессии и MFA"
Cohesion: 0.10
Nodes (13): china_user_request_key, orders_user_request_key, private.store_admins, private.store_limits, public.store_create_order(), public.store_create_request(), public.store_is_admin(), private.store_audit_payment() (+5 more)

### Типы клиентского кода - "Типы клиентского кода"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Типы инструментов сборки - "Типы инструментов сборки"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Инструменты проверки кода - "Инструменты проверки кода"
Cohesion: 0.16
Nodes (5): typescript@~6.0.2, typescript, admin, env, admin

### Интеграция Telegram - "Интеграция Telegram"
Cohesion: 0.12
Nodes (3): Telegram, WebApp, Window

### Типы серверного кода - "Типы серверного кода"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters (+6 more)

### Платежи и чеки - "Платежи и чеки"
Cohesion: 0.18
Nodes (8): public.store_save_screenshot(), public.store_admin_cancel_order(), public.store_admin_confirm_payment(), public.store_admin_confirm_payment_with_notice(), public.store_admin_delete_product(), public.store_admin_product_visibility(), public.store_finish_upload(), private.store_retire_legacy_notice()

### Зависимости интерфейса - "Зависимости интерфейса"
Cohesion: 0.17
Nodes (12): dependencies, framer-motion@^12.40.0, lucide-react@^1.17.0, react@^19.2.6, react-icons@^5.7.0, react-router-dom@7.18.2, @supabase/supabase-js@2.108.0, @twa-dev/sdk@^8.0.2 (+4 more)

### Сборка и сервер - "Сборка и сервер"
Cohesion: 0.18
Nodes (8): vite@^8.0.12, @vitejs/plugin-react@^6.0.1, vite, @vitejs/plugin-react, admin, artifacts, root, servers

### Команды проекта - "Команды проекта"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:all, test:csp (+1 more)

### Проверка публикации - "Проверка публикации"
Cohesion: 0.22
Nodes (5): data, env, params, secret, token

### Настройки TypeScript - "Настройки TypeScript"
Cohesion: 0.40
Nodes (4): compilerOptions, rewriteRelativeImportExtensions, files, references

## Knowledge Gaps
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Навигация и состояние` to `Корзина и оформление`, `Кэш и ресурсы`, `Анимации и прокрутка`, `Маршруты и оболочка`, `Зависимости и линтер`, `Иконки категорий`, `Зависимости интерфейса`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Сервер и уведомления` be split into smaller, more focused modules?**
  _Cohesion score 0.06741573033707865 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Браузерные проверки` to `Зависимости и линтер`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Корзина и оформление` be split into smaller, more focused modules?**
  _Cohesion score 0.06491228070175438 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Зависимости интерфейса` to `Сервер и уведомления`, `Зависимости и линтер`, `Кэш и ресурсы`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `Навигация и состояние` be split into smaller, more focused modules?**
  _Cohesion score 0.096579476861167 - nodes in this community are weakly interconnected._
- **Should `Кэш и ресурсы` be split into smaller, more focused modules?**
  _Cohesion score 0.06346153846153846 - nodes in this community are weakly interconnected._
## Область индексации

Только локальный структурный анализ кода, без внешней модели и без семантической индексации документов и изображений. SQL-миграции включают исторические определения функций; актуальное поведение базы нужно сверять с последними миграциями и действующими функциями. Файлы без объявлений могут быть представлены только файловым узлом. Стоимость внешних модельных вызовов: 0 токенов.
