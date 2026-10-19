# Серверная часть Telegram-бота IT-Старт (@IT_start_izh_bot)

## Почему бот не может работать прямо на GitHub Pages?

**GitHub Pages — это статический хостинг файлов (HTML, CSS, JavaScript, картинки).**
- На GitHub Pages нет бэкенд-сервера (Node.js, Python, Go) и нет базы данных.
- Серверы Telegram не могут отправить HTTP POST запрос (Webhook) на статический сайт, потому что GitHub Pages не может обработать входящий запрос и выполнить серверный код.
- Аналогично, GitHub Pages не может держать фоновый процесс `polling` (непрерывный опрос новых сообщений).

**Архитектура IT-Старт:**
1. **Фронтенд & Telegram Mini App (WebApp):** Размещен на GitHub Pages (`https://oioiqp.github.io/it-start/`).
2. **База данных и прогресс:** Supabase (`public.internships`, `public.tg_subscriptions`, `public.user_progress`).
3. **Telegram-бот:** Серверный скрипт `bot/bot.mjs`, работающий на Render.com (`https://it-start-bot.onrender.com`), который:
   - Непрерывно отслеживает целевые Telegram-каналы: `@tbank_team`, `@KonturTech`, `@Life_in_Directum`, `@t1career`, `@yandex_intern`, `@ozon_tech_career`, `@forjunior`, `@normrabota` и карьерные сайты/API компаний (Directum, hh.ru, Habr Career).
   - Автоматически записывает найденные вакансии в Supabase (`public.internships`).
   - Рассылает персональные пуш-уведомления подписчикам по совпадению направлений и компаний.
   - Поддерживает команды `/vacancies`, `/companies`, `/parse`, `/sync`, `/status`, `/scan`, быстрые команды `/company_<id>` и интерактивные кнопки.

---

## Команды бота

- `/start` — Приветствие, главное меню и кнопка запуска WebApp
- `/vacancies` — Каталог свежих стажировок с кнопками фильтрации по компаниям (Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито)
- `/companies` — Полный обзор отслеживаемых IT-компаний и их Telegram-источников
- `/scan` — Ручной запуск сканирования всех целевых каналов и синхронизации с базой
- `/company_t1` — Вакансии Холдинга Т1 (Открытая школа Т1)
- `/company_kontur` — Вакансии СКБ Контур (Контур.Старт 2026)
- `/company_tbank` — Вакансии Т-Банка (Финтех)
- `/company_directum` — Вакансии Directum (Ижевск / РФ)
- `/roadmaps` — Список интерактивных роадмапов
- `/help` — Справка по командам

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

### Вариант 1: Render.com (Бесплатный Web Service 24/7)

1. Зайдите в панель управления на [dashboard.render.com](https://dashboard.render.com/).
2. Нажмите кнопку **New +** (в правом верхнем углу) и выберите **Web Service**.
3. В списке репозиториев выберите **`oioiqp/it-start`** (или вставьте ссылку `https://github.com/oioiqp/it-start`).
4. Заполните основные настройки:
   - **Name:** `it-start-bot` (любое удобное имя)
   - **Region:** Frankfurt (EU) или любой другой
   - **Branch:** `main`
   - **Root Directory:** оставить пустым (или `IT Start`, если репозиторий развернут из корня)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node bot/bot.mjs` (или `npm run bot`)
   - **Instance Type:** выберите **Free** ($0 / month)
5. Прокрутите вниз до раздела **Environment Variables** (Переменные окружения) и добавьте:
   - **Key:** `TELEGRAM_BOT_TOKEN`
   - **Value:** *ваш токен бота от @BotFather*
6. Нажмите **Create Web Service** (или **Deploy Web Service**).
7. Через 1–2 минуты статус сменится на **Live**, а в логах появится:
   ```text
   🌐 HTTP сервер запущен на порту 10000 (Render Health Check)
   🚀 Бот @IT_start_izh_bot успешно запущен в режиме Long Polling!
   ```
8. **Чтобы бесплатный сервис не уходил в спящий режим через 15 минут:**
   Скопируйте полученный URL от Render (например: `https://it-start-bot.onrender.com`) и добавьте бесплатный пинг раз в 10 минут в [cron-job.org](https://cron-job.org) или [uptimerobot.com](https://uptimerobot.com) на этот URL. Бот будет работать без пауз 24/7!

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
