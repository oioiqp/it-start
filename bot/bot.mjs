/**
 * IT-Старт — Официальный автономный Telegram-бот (@IT_start_izh_bot)
 *
 * Почему бот не работает на GitHub Pages?
 * GitHub Pages — это чисто статический хостинг (HTML/CSS/JS).
 * Для работы Telegram-бота требуется постоянно запущенный серверный процесс
 * (Node.js/Python), который либо держит Long Polling соединение с Telegram Bot API,
 * либо принимает входящие вебхуки (HTTP POST).
 *
 * Запуск в 1 команду:
 *   npm run bot
 * или:
 *   node bot/bot.mjs
 *
 * Можно также передать токен через переменную окружения:
 *   TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН" node bot/bot.mjs
 */

import http from 'node:http';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.argv[2] || '';
const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
const BOT_USERNAME = 'IT_start_izh_bot';
const PORT = process.env.PORT || 3000;

// HTTP Health Check сервер для бесплатного Web Service на Render.com
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('IT-Старт Telegram Bot работает 24/7!\n');
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP сервер запущен на порту ${PORT} (Render Health Check)`);
});

const TOP_INTERNSHIPS = [
  {
    company: 'Т-Банк',
    title: 'Стажёр Frontend (React / TypeScript)',
    salary: 'от 75 000 ₽',
    format: 'Удаленно',
    url: 'https://fintech.tbank.ru/start/',
  },
  {
    company: 'Яндекс',
    title: 'Стажёр Python Backend Developer',
    salary: 'от 80 000 ₽',
    format: 'Гибрид (Москва / СПб)',
    url: 'https://yandex.ru/yabackend/',
  },
  {
    company: 'Ozon Tech',
    title: 'Junior Golang Developer',
    salary: 'от 85 000 ₽',
    format: 'Удаленно',
    url: 'https://job.ozon.ru/it/',
  },
  {
    company: 'Сбер AI',
    title: 'Стажёр Data Scientist / Machine Learning',
    salary: 'от 80 000 ₽',
    format: 'Офис (Москва)',
    url: 'https://sbergraduate.ru/',
  },
  {
    company: 'VK',
    title: 'Стажёр QA Engineer (Ручное / Автотестирование)',
    salary: 'от 65 000 ₽',
    format: 'Гибрид',
    url: 'https://internship.vk.company/',
  },
  {
    company: 'Авито',
    title: 'Junior DevOps / SRE Engineer',
    salary: 'от 90 000 ₽',
    format: 'Удаленно',
    url: 'https://career.avito.com/internship/',
  },
];

if (!BOT_TOKEN) {
  console.log('='.repeat(70));
  console.log('⚡ IT-Старт Telegram Bot Runner');
  console.log('='.repeat(70));
  console.log('⚠️  Внимание: TELEGRAM_BOT_TOKEN не указан!');
  console.log('');
  console.log('Чтобы запустить бота, передайте токен одним из способов:');
  console.log('  1) node bot/bot.mjs <ТОКЕН_БОТА>');
  console.log('  2) TELEGRAM_BOT_TOKEN=<ТОКЕН_БОТА> npm run bot');
  console.log('');
  console.log('Токен можно получить у @BotFather в Telegram для @IT_start_izh_bot.');
  console.log('='.repeat(70));
  process.exit(0);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method, payload = {}) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text || '';
  const firstName = msg.from?.first_name || 'Разработчик';

  if (!chatId) return;

  console.log(`[Message] От @${msg.from?.username || chatId}: "${text}"`);

  if (text.startsWith('/start')) {
    const welcomeText = `👋 <b>Привет, ${firstName}!</b>\n\n` +
      `Добро пожаловать в <b>IT-Старт</b> — платформу для подготовки к IT-стажировкам и Junior-вакансиям!\n\n` +
      `🎯 <b>Что доступно прямо сейчас:</b>\n` +
      `• <b>Интерактивный WebApp</b> — роадмапы в стиле roadmap.sh, тренажёр собеседований и база стажировок\n` +
      `• <b>Подготовка к интервью</b> — реальные вопросы с эталонными ответами и самопроверкой\n` +
      `• <b>Стажировки топ-компаний</b> — Т-Банк, Яндекс, Сбер, Ozon, VK, Авито, Контур\n\n` +
      `Нажмите кнопку ниже, чтобы запустить приложение!`;

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Запустить IT-Старт WebApp',
              web_app: { url: GITHUB_PAGES_URL },
            },
          ],
          [
            { text: '💼 Свежие стажировки', callback_data: 'vacancies' },
            { text: '🗺 Роадмапы направлений', callback_data: 'roadmaps' },
          ],
          [
            { text: '❓ Тренажёр собеседований', callback_data: 'questions' },
            { text: 'ℹ️ Помощь', callback_data: 'help' },
          ],
        ],
      },
    });
    return;
  }

  if (text.startsWith('/vacancies') || text.startsWith('/internships')) {
    await sendVacancies(chatId);
    return;
  }

  if (text.startsWith('/roadmaps')) {
    await sendRoadmaps(chatId);
    return;
  }

  if (text.startsWith('/help')) {
    await sendHelp(chatId);
    return;
  }

  // Default response
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: `Я получил ваше сообщение: «${text}».\n\nИспользуйте меню или откройте WebApp платформы:`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Открыть IT-Старт',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

async function sendVacancies(chatId) {
  let text = `🔥 <b>Актуальные IT-стажировки 2026:</b>\n\n`;
  TOP_INTERNSHIPS.forEach((item, idx) => {
    text += `${idx + 1}. <b>${item.company}</b> — ${item.title}\n`;
    text += `   💰 <i>${item.salary}</i> | 📍 ${item.format}\n`;
    text += `   🔗 <a href="${item.url}">Подать заявку на отбор</a>\n\n`;
  });
  text += `Полный интерактивный каталог с фильтрами по стеку доступен в WebApp!`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Смотреть все вакансии в WebApp',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

async function sendRoadmaps(chatId) {
  const text = `🗺 <b>Интерактивные Роадмапы IT-Старт:</b>\n\n` +
    `1. <b>Frontend:</b> Веб-сеть, HTML5, CSS Grid, JS ES6+, TS ➔ React / Angular / Vue\n` +
    `2. <b>Backend:</b> REST API, SQL, HTTP/2, Docker ➔ Python / Go / Java / Node.js\n` +
    `3. <b>Mobile:</b> База мобильных ОС ➔ Android (Kotlin) / iOS (Swift) / Flutter\n` +
    `4. <b>Data Science:</b> Матанализ, Python, SQL ➔ Machine Learning / Analytics\n` +
    `5. <b>QA:</b> Тест-дизайн, баг-трекинг ➔ Manual QA / Auto QA (Python/Playwright)\n` +
    `6. <b>DevOps:</b> Linux, Баш, Сети ➔ CI/CD & Docker / Kubernetes & Terraform\n\n` +
    `Каждый роадмап оформлен в виде дерева (roadmap.sh style) с чекбоксами подтем и подсчетом прогресса в %!`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🗺 Открыть древо роадмапов',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

async function sendHelp(chatId) {
  const text = `ℹ️ <b>Команды бота @${BOT_USERNAME}:</b>\n\n` +
    `/start — Главное меню и запуск WebApp\n` +
    `/vacancies — Список актуальных стажировок\n` +
    `/roadmaps — Список направлений и роадмапов\n` +
    `/help — Список команд бота\n\n` +
    `🌐 <b>Сайт платформы:</b> ${GITHUB_PAGES_URL}`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
}

async function handleCallbackQuery(query) {
  const chatId = query.message?.chat?.id;
  const data = query.data;

  await callTelegram('answerCallbackQuery', { callback_query_id: query.id });

  if (data === 'vacancies') {
    await sendVacancies(chatId);
  } else if (data === 'roadmaps') {
    await sendRoadmaps(chatId);
  } else if (data === 'help') {
    await sendHelp(chatId);
  } else if (data === 'questions') {
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: `❓ <b>Тренажёр вопросов к собеседованию:</b>\n\n` +
        `В приложении доступна база из 70+ детально разобранных вопросов (Event Loop, Fiber, TypeScript infer, CSS Stacking, ACID, Docker и др.).\n` +
        `Доступен интерактивный режим самопроверки со скрытием ответа до ввода своего варианта!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть тренажёр в WebApp',
              web_app: { url: GITHUB_PAGES_URL },
            },
          ],
        ],
      },
    });
  }
}

let offset = 0;
let isRunning = true;

async function pollUpdates() {
  console.log(`🚀 Бот @${BOT_USERNAME} успешно запущен в режиме Long Polling!`);
  console.log(`Нажмите Ctrl+C для остановки.\n`);

  while (isRunning) {
    try {
      const res = await callTelegram('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleMessage(update.message);
          } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          }
        }
      } else if (!res.ok) {
        console.warn('Telegram API Error:', res.description);
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (err) {
      console.warn('Сетевая ошибка при polling (переподключение через 3с):', err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

process.on('SIGINT', () => {
  console.log('\nОстановка бота...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});

pollUpdates();
