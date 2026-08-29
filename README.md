# WorkDo FAQ-бот (Telegram)

FAQ-бот для лендинга WorkDo: отвечает на типовые вопросы — тарифы (BYN),
возможности платформы, пробный период и демонстрация.

Стек: **Node.js + TypeScript + grammY + Express**.

## Возможности

- Меню с inline-кнопками: Тарифы / Возможности / Попробовать бесплатно / Демо / О платформе
- Команды: `/start`, `/help`, `/prices`, `/features`, `/trial`, `/demo`, `/about`
- Ответы по ключевым словам (например, «сколько стоит», «демо», «бесплатно»)
- Если вопрос не понятен — подсказка с кнопкой в меню

## Как создать бота

1. Откройте @BotFather в Telegram → `/newbot`
2. Получите токен вида `123456789:AAE...`
3. Положите токен в файл `.env` (см. `.env.example`):

```
BOT_TOKEN=123456789:AAE...
```

## Запуск локально

```bash
npm install
npm run build
npm run start      # long polling, бот отвечает сразу
```

Или в режиме разработки: `npm run dev` (автоперезагрузка).

## Деплой на Render (вебхук)

1. Залейте этот проект в GitHub-репозиторий.
2. В Render: **New → Web Service** → подключите репозиторий.
3. Настройки:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
4. Переменные окружения (Environment):
   - `BOT_TOKEN` — токен от BotFather
   - `WEBHOOK_URL` — адрес сервиса, в Render это `https://<имя-сервиса>.onrender.com`
   - `WEBHOOK_SECRET` — любая случайная строка (защита вебхука), например `vkQ3xT9pLm`
   - `HOOK_PATH` — не обязательно, по умолчанию `/webhook`
5. Deploy. Render сам поставит webhook, бот начнёт отвечать.

## Проверка после деплоя

- Откройте `https://<имя-сервиса>.onrender.com/healthz` → ответ `ok`
- Напишите боту в Telegram `/start`
- Webhook можно проверить вручную:
  `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

## Важно

- Токен (`BOT_TOKEN`) хранится в `.env` и **не коммитится** (в `.gitignore`).
- На бесплатном тарифе Render веб-сервис «засыпает» после ~15 минут простоя —
  бот отвечает только пока сервис активен (первый запрос может пробудить его с задержкой).
- Цены и условия легко править в `src/faq.ts` — тексты ответов собраны там одним словарём.