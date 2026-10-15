# Серверная часть Telegram-бота IT-Старт (@IT_start_izh_bot)

## Почему бот не может работать прямо на GitHub Pages?

**GitHub Pages — это статический хостинг файлов (HTML, CSS, JavaScript, картинки).**
- На GitHub Pages нет бэкенд-сервера (Node.js, Python, Go) и нет базы данных.
- Серверы Telegram не могут отправить HTTP POST запрос (Webhook) на статический сайт, потому что GitHub Pages не может обработать входящий запрос и выполнить серверный код.
- Аналогично, GitHub Pages не может держать фоновый процесс `polling` (непрерывный опрос новых сообщений).

**Архитектура IT-Старт:**
1. **Фронтенд & Telegram Mini App (WebApp):** Размещен на GitHub Pages (`https://oioiqp.github.io/it-start/`).
2. **База данных и прогресс:** Supabase.
3. **Telegram-бот:** Серверный скрипт `bot/bot.mjs`, который обрабатывает команды `/start`, `/vacancies`, `/roadmaps` и открывает WebApp.

---

## Быстрый запуск бота (Локально в 1 команду)

Скрипт написан на чистом Node.js (ES Modules) с использованием нативного `fetch` (не требует дополнительных сторонних npm-зависимостей).

```bash
# Вариант 1: Через npm-скрипт (если токен задан в переменной окружения)
TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН_ОТ_BOTFATHER" npm run bot

# Вариант 2: Передача токена аргументом
node bot/bot.mjs ВАШ_ТОКЕН_ОТ_BOTFATHER
```

---

## Бесплатный деплой бота в облако 24/7

### Вариант 1: Render.com (Бесплатно)
1. Зарегистрируйтесь на [render.com](https://render.com).
2. Нажмите **New +** -> **Web Service** или **Background Worker**.
3. Подключите ваш GitHub-репозиторий `it-start`.
4. Укажите:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run bot`
5. В разделе **Environment Variables** добавьте переменную:
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота.
6. Нажмите **Deploy**. Бот будет работать 24/7.

### Вариант 2: Railway.app
1. Зайдите на [railway.app](https://railway.app).
2. Нажмите **New Project** -> **Deploy from GitHub repo**.
3. Добавьте переменную `TELEGRAM_BOT_TOKEN`.
4. Railway автоматически запустит `npm run bot`.

### Вариант 3: Собственный VPS (Ubuntu / Debian с systemd)
Создайте systemd-сервис для непрерывной работы бота:
```ini
# /etc/systemd/system/it-start-bot.service
[Unit]
Description=IT-Start Telegram Bot Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/it-start
Environment="TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН"
ExecStart=/usr/bin/node bot/bot.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Запуск сервиса:
```bash
sudo systemctl daemon-reload
sudo systemctl enable it-start-bot
sudo systemctl start it-start-bot
```
