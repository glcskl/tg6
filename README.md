# WorkDo Demo Bot (tg6)

November 2026, workdo.ru. Task: let potential clients explore WorkDo ERP inside Telegram instead of only on the landing page. Solution: tg6 - a grammY FAQ and demo bot with role-based access, seven interactive sections, shifts, incidents, finance, reports, real CSV exports, a guided checklist and webhook hosting on Render.

Демо перенесено из публичного лендинга [glcskl/workdo-landing](https://github.com/glcskl/workdo-landing) (`src/App.jsx`, `src/data.js`) и адаптировано под inline-интерфейс Telegram.

## Что умеет

### Справочная часть

- Меню с inline-кнопками: Тарифы / Возможности / О платформе / Поддержка / Живое демо.
- Команды: `/start`, `/help`, `/prices`, `/features`, `/about`, `/support`, `/demo`.
- Ответы по ключевым словам, включая «демо», «стоимость», «тарифы», «возможности», «поддержка».
- Если вопрос не распознан — подсказка с кнопками меню.

### Живое демо WorkDo

Демо открывается командой `/demo` или кнопкой «Живое демо» в главном меню. Это не ссылка на сайт, а интерактивная модель системы внутри чата.

- **Роли:** владелец (19 разделов), администратор (17), начальник смены (11), охранник (6). Переключение роли сразу меняет доступные разделы; попытка открыть закрытый раздел показывает сообщение об отказе.
- **Разделы:** обзор, смены, кадры, объекты, инциденты, финансы, отчёты.
- **Обзор:** KPI компании, статистика инцидентов, ближайшая выплата зарплаты, последние инциденты и кто на смене.
- **Смены:** календарь недели, список смен, кнопки «Добавить смену» и «Завершить» — количество смен и табель меняются прямо в демо.
- **Инциденты:** создание нового инцидента текстом, перевод в расследование и закрытие. У инцидента есть категория, серьёзность, ущерб и корневая причина.
- **Финансы:** план/факт по месяцам, бюджет по статьям, выгрузка CSV.
- **Отчёты:** шесть типов отчётов, каждый присылается настоящим `.csv`-файлом (UTF-8, разделитель `;`), плюс журнал аудита «было → стало».
- **Чек-лист:** четыре действия (роль, смена, инцидент, экспорт) с прогрессом 0/3 — как в демо на лендинге.
- **Сброс:** состояние демо хранится отдельно для каждого чата и сбрасывается кнопкой «Сбросить демо».

Данные вымышленные: ЧОП «Редут», 17 ноября 2026.

## Стек

Node.js 18+, TypeScript, grammY, Express. В проде — webhook на Render, локально — long polling.

## Запуск локально

```bash
npm install
cp .env.example .env
# заполните BOT_TOKEN, полученный от @BotFather
npm run dev      # или: npm run build && npm start
```

Альтернатива без `.env`: скопируйте `bot.config.example.json` в `bot.config.json` и заполните поля. Файл `bot.config.json` добавлен в `.gitignore` и никогда не попадает в репозиторий.

## Деплой на Render

1. Создайте **New → Web Service** и подключите репозиторий `glcskl/tg6`.
2. Build Command: `npm install`
3. Start Command: `npm run build && npm start`
4. Environment:
   - `BOT_TOKEN` — токен от @BotFather;
   - `WEBHOOK_URL` — `https://<имя-сервиса>.onrender.com`;
   - `WEBHOOK_SECRET` — случайная строка для защиты вебхука;
   - `HOOK_PATH` — необязательно, по умолчанию `/webhook`.
5. После деплоя откройте `/healthz` — ответ должен быть `ok`.
6. Напишите боту `/start` и `/demo`.

Для бесплатного тарифа Render можно запускать `npm run keepalive` отдельно или добавить внешний мониторинг на `/healthz`.

## Структура

```text
tg6/
├── src/
│   ├── index.ts      # команды, меню, webhook/polling, маршрутизация callback-кнопок
│   ├── demo.ts       # состояние, данные, экраны и действия демо, генерация CSV
│   └── faq.ts        # тексты ответов и ключевые слова
├── keepalive.mjs     # пингер для Render
├── bot.config.example.json
├── .env.example
├── render.yaml
├── Procfile
└── README.md
```

## Безопасность

Токен бота хранится только в `.env` или в локальном `bot.config.json`, оба файла исключены из Git. В репозитории лежат только шаблоны с заглушками.

## Ссылки

- Продукт: [workdo.ru](https://workdo.ru)
- Исходник демо: [glcskl/workdo-landing](https://github.com/glcskl/workdo-landing)
- Автор: [@glebentired](https://t.me/glebentired)
