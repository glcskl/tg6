# WorkDo Demo Bot (tg6)

November 2026, workdo.ru. Task: let potential clients explore the WorkDo business management system inside Telegram instead of only on the landing page. Solution: tg6 - a grammY FAQ bot plus a Telegram Mini App with role-based access, seven interactive sections, shifts, incidents, finance, reports, real CSV exports, a guided checklist and webhook hosting on Render.

Демо и справочные ответы синхронизированы с актуальным лендингом [glcskl/workdo-landing](https://github.com/glcskl/workdo-landing) (`src/App.jsx`, `src/data.js`): тарифы в ₽, текущие контакты и позиционирование «WorkDo: бизнес под контролем». Демо адаптировано под интерфейс Telegram — работает и в чате, и в полноэкранной мини-аппе.

## Что умеет

### Справочная часть

- Меню с inline-кнопками: Тарифы / Возможности / О платформе / Поддержка / Демо в чате / Демо / Сайт / Открыть мини-аппу.
- Команды: `/start`, `/help`, `/prices`, `/features`, `/about`, `/support`, `/demo`, `/app`, `/site`.
- Кнопки «Демо» и «Сайт» ведут на [лендинг WorkDo](https://glcskl.github.io/workdo-landing/): «Демо» открывает его внутри Telegram как Web App, «Сайт» — внешней ссылкой. Они есть в главном меню, в ответе про демо и после команды `/site`.
- Ответы по ключевым словам, включая «демо», «стоимость», «тарифы», «возможности», «поддержка».
- Если вопрос не распознан — подсказка с кнопками меню.

### Telegram Mini App

Команда `/app` или кнопка «Открыть мини-аппу» открывает полноэкранное демо WorkDo внутри Telegram. Оно работает на Telegram Web App SDK: подстраивается под тему клиента, использует `MainButton`, `HapticFeedback`, `showPopup` и `close`, а состояние хранится в `localStorage`.

Мини-аппа доступна и по прямой ссылке `https://workdo-demo-bot.onrender.com/app/` — в обычном браузере она тоже работает (без вызовов Telegram SDK).

### Живое демо WorkDo

Демо открывается командой `/demo` или кнопкой «Демо в чате» в главном меню. Это не ссылка на сайт, а интерактивная модель системы внутри чата. Та же модель доступна и в мини-аппе; кнопка «Демо» рядом открывает полную версию на лендинге.

- **Роли:** владелец (19 разделов), администратор (17), начальник смены (11), охранник (6). Переключение роли сразу меняет доступные разделы; попытка открыть закрытый раздел показывает сообщение об отказе.
- **Разделы:** обзор, смены, кадры, объекты, инциденты, финансы, отчёты.
- **Обзор:** KPI компании, статистика инцидентов, ближайшая выплата зарплаты, последние инциденты и кто на смене.
- **Смены:** календарь недели, список смен, кнопки «Добавить смену» и «Завершить» — количество смен и табель меняются прямо в демо.
- **Инциденты:** создание нового инцидента текстом, перевод в расследование и закрытие. У инцидента есть категория, серьёзность, ущерб и корневая причина.
- **Финансы:** план/факт по месяцам, бюджет по статьям, выгрузка CSV.
- **Отчёты:** шесть типов отчётов, каждый присылается настоящим `.csv`-файлом (UTF-8, разделитель `;`), плюс журнал аудита «было → стало» с записью от системы.
- **Чек-лист:** четыре действия (роль, смена, инцидент, экспорт) с прогрессом 0/3 — как в демо на лендинге.
- **Сброс:** состояние демо хранится отдельно для каждого чата и сбрасывается кнопкой «Сбросить демо».

Данные вымышленные: ЧОП «Редут», 17 ноября 2026.

## Стек

Node.js 18+, TypeScript, grammY, Express. Мини-аппа — ванильный HTML/CSS/JS без сборки (Telegram Web App SDK). В проде — webhook на Render, локально — long polling.

## Запуск локально

```bash
npm install
cp .env.example .env
# заполните BOT_TOKEN, полученный от @BotFather
npm run dev      # или: npm run build && npm start
```

После запуска мини-аппа открывается на `http://localhost:3000/app/`. Бот при локальном запуске работает через long polling и сам снимет webhook с прода.

Альтернатива без `.env`: скопируйте `bot.config.example.json` в `bot.config.json` и заполните поля. Файл `bot.config.json` добавлен в `.gitignore` и никогда не попадает в репозиторий.

## Деплой на Render

1. Создайте **New → Web Service** и подключите репозиторий `glcskl/tg6`.
2. Build Command: `npm install`
3. Start Command: `npm run build && npm start`
4. Environment:
   - `BOT_TOKEN` — токен от @BotFather;
   - `WEBHOOK_URL` — `https://<имя-сервиса>.onrender.com`;
   - `WEBHOOK_SECRET` — случайная строка для защиты вебхука;
   - `HOOK_PATH` — необязательно, по умолчанию `/webhook`;
   - `MINI_APP_URL` — необязательно, по умолчанию `WEBHOOK_URL + /app/`.
5. После деплоя откройте `/healthz` — ответ должен быть `ok`, а `/app/` — мини-аппу.
6. Напишите боту `/start`, `/demo` и `/app`.

Бесплатный тариф Render засыпает без входящих запросов, поэтому в репозитории есть `.github/workflows/keepalive.yml`: GitHub Actions пингует `/healthz` и `/app/` каждые 5 минут. Альтернатива — `npm run keepalive` на отдельном always-on хосте (по умолчанию пингует `https://workdo-demo-bot.onrender.com/healthz`).

Если бот «не отвечает», сначала проверьте `GET /healthz`: код 503/502 с заголовком `x-render-routing: no-deploy` означает, что инстанс Render ещё просыпается или перезапускается, а не ошибку в коде бота.

## Структура

```text
tg6/
├── src/
│   ├── index.ts      # команды, меню, webhook/polling, раздача мини-аппы
│   ├── demo.ts       # состояние, данные, экраны и действия демо в чате, генерация CSV
│   └── faq.ts        # тексты ответов и ключевые слова
├── public/
│   ├── index.html    # каркас мини-аппы
│   ├── styles.css    # тема Telegram + адаптивная вёрстка
│   ├── data.js       # данные демо (синхронизированы с src/demo.ts)
│   └── app.js        # логика мини-аппы: роли, разделы, CSV, localStorage
├── .github/workflows/keepalive.yml  # пинг Render каждые 5 минут
├── keepalive.mjs     # пингер для Render
├── bot.config.example.json
├── .env.example
├── render.yaml
├── Procfile
└── README.md
```

## Безопасность

Токен бота хранится только в `.env` или в локальном `bot.config.json`, оба файла исключены из Git. В репозитории лежат только шаблоны с заглушками.

## Деплой

Бот развёрнут на Render: **https://workdo-demo-bot.onrender.com** (`/healthz` → `ok`). Webhook Telegram установлен автоматически при старте.

## Ссылки

- Продукт: [workdo.ru](https://workdo.ru)
- Демо и лендинг: [glcskl.github.io/workdo-landing](https://glcskl.github.io/workdo-landing/)
- Исходник демо: [glcskl/workdo-landing](https://github.com/glcskl/workdo-landing)
- Автор: [@glebentired](https://t.me/glebentired)
