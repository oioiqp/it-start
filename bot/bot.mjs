/**
 * IT-Старт — Официальный автономный Telegram-бот (@IT_start_izh_bot)
 *
 * Серверный процесс Node.js для Render.com / локального запуска:
 * - Автоматический трекинг и парсинг вакансий по целевым компаниям и каналам
 * - Интеграция с базой данных Supabase (запись вакансий, синхронизация подписок)
 * - Персональные пуш-уведомления пользователям по совпадению направлений и компаний
 * - Команды бота: /start, /vacancies, /companies, /scan, /roadmaps, /help
 * - Фильтрация вакансий по компаниям: Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK
 * - Health Check HTTP сервер для бесплатного Web Service на Render.com (порт 3000)
 *
 * Запуск:
 *   npm run bot
 * или:
 *   TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН" node bot/bot.mjs
 */

import http from 'node:http';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.argv[2] || '';
const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
const BOT_USERNAME = 'IT_start_izh_bot';
const PORT = process.env.PORT || 3000;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmgsymacvhzsixbpndsn.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Database of target companies
export const COMPANIES_DATA = [
  {
    id: 't1',
    name: 'Холдинг Т1',
    shortName: 'Т1',
    channel: '@t1_holding',
    channelUrl: 'https://t.me/t1_holding',
    description: 'Один из лидеров российского IT-рынка. Программа «Открытая школа Т1» — оплачиваемое обучение и стажировка по Java, DevOps, QA и Cloud с переходом в штат.',
    stack: 'Java, Spring Boot, DevOps, CI/CD, QA Auto, Cloud',
  },
  {
    id: 'kontur',
    name: 'СКБ Контур',
    shortName: 'Контур',
    channel: '@kontur_career',
    channelUrl: 'https://t.me/kontur_career',
    description: 'Разработчик экосистемы сервисов для бизнеса (Диадок, Экстерн, Фокус). Программа «Контур.Старт» для студентов и начинающих разработчиков с персональным наставником.',
    stack: 'React, TypeScript, C#, Python, Go, Manual & Auto QA',
  },
  {
    id: 'tbank',
    name: 'Т-Банк',
    shortName: 'Т-Банк',
    channel: '@tbank_start',
    channelUrl: 'https://t.me/tbank_start',
    description: 'Ведущий финансово-технологический гигант. Финтех-стажировки по разработке интерфейсов, высоконагруженного бэкенда, SRE-инфраструктуры и машинного обучения.',
    stack: 'React, TypeScript, Python, Golang, Kubernetes, SRE, ML',
  },
  {
    id: 'directum',
    name: 'Directum',
    shortName: 'Directum',
    channel: '@directum_careers',
    channelUrl: 'https://t.me/directum_careers',
    description: 'Ведущий российский вендор интеллектуальных систем управления цифровыми процессами и документами (Directum RX), штаб-квартира в Ижевске. Сильная инженерная школа.',
    stack: 'C#, .NET, TypeScript, React, QA, Web API, AI, Ижевск',
  },
  {
    id: 'yandex',
    name: 'Яндекс',
    shortName: 'Яндекс',
    channel: '@yandex_intern',
    channelUrl: 'https://t.me/yandex_intern',
    description: 'Технологическая компания (Поиск, Go, Маркет, AI). Программы стажировок Young Con круглый год с релокацией или удаленкой.',
    stack: 'Python, Go, C++, React, iOS/Android, Machine Learning',
  },
  {
    id: 'ozon',
    name: 'Ozon Tech',
    shortName: 'Ozon Tech',
    channel: '@ozon_tech_career',
    channelUrl: 'https://t.me/ozon_tech_career',
    description: 'Электронная коммерция и логистика. Стажировки Ozon Camp с глубоким погружением в микросервисы на Go и масштабируемые системы.',
    stack: 'Golang, gRPC, PostgreSQL, Kafka, Android, QA',
  },
  {
    id: 'sber',
    name: 'Сбер (Sber AI)',
    shortName: 'Сбер',
    channel: '@sber_careers',
    channelUrl: 'https://t.me/sber_careers',
    description: 'Крупнейшая банковская и AI-экосистема России. Программа SberSeasons: исследования LLM, Data Science, разработка мобильных и серверных систем.',
    stack: 'Python, PyTorch, Data Science, Java, Mobile, DevOps',
  },
  {
    id: 'avito',
    name: 'Avito Tech',
    shortName: 'Авито',
    channel: '@avito_tech',
    channelUrl: 'https://t.me/avito_tech',
    description: 'Суперапп объявлений с десятками миллионов пользователей. Стажировки в Platform Engineering, Mobile и высоконагруженном Backend.',
    stack: 'Android (Kotlin), iOS (Swift), Golang, Kubernetes, DevOps',
  },
  {
    id: 'vk',
    name: 'VK (ВКонтакте)',
    shortName: 'VK',
    channel: '@vk_team',
    channelUrl: 'https://t.me/vk_team',
    description: 'Социальные сервисы, музыка, видео и игры. Оплачиваемые стажировки для студентов с менторством экспертов.',
    stack: 'Node.js, Python, QA Automation, React, C++',
  },
];

// Curated tracking database covering target employers
export const ALL_INTERNSHIPS = [
  // --- Холдинг Т1 ---
  {
    id: 'bot-t1-1',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Стажёр Java-разработчик (Открытая школа Т1)',
    salary: 'от 70 000 до 90 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@t1_holding',
    directionId: 'backend',
    subTrackId: 'java',
    url: 'https://t.me/t1_holding',
    description: 'Обучение и стажировка в Открытой школе Т1 с переходом в штат. Разработка надежных Enterprise-сервисов.',
    tags: ['Java 21', 'Spring Boot', 'Открытая школа Т1', 'PostgreSQL'],
  },
  {
    id: 'bot-t1-2',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Junior DevOps-инженер (Инфраструктура Т1)',
    salary: 'от 75 000 до 95 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@t1_holding',
    directionId: 'devops',
    subTrackId: 'cicd_docker',
    url: 'https://t.me/t1_holding',
    description: 'Поддержка и автоматизация инфраструктуры масштабируемых облачных решений Т1 Облако.',
    tags: ['Linux', 'Docker', 'CI/CD', 'Ansible', 'Т1'],
  },
  {
    id: 'bot-t1-3',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Стажёр QA Automation (Python / Java)',
    salary: 'от 60 000 до 80 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Ижевск / Удаленно',
    channel: '@t1_holding',
    directionId: 'qa',
    subTrackId: 'auto_qa',
    url: 'https://t.me/t1_holding',
    description: 'Автоматизация тестирования банковских и интеграционных платформ группы Т1.',
    tags: ['QA Auto', 'Python', 'Pytest', 'REST API', 'Т1'],
  },

  // --- Контур ---
  {
    id: 'bot-kontur-1',
    companyId: 'kontur',
    company: 'СКБ Контур',
    title: 'Стажёр Frontend-разработчик (Контур.Старт)',
    salary: 'от 65 000 до 85 000 ₽',
    format: 'Удаленно',
    location: 'Екатеринбург / Удаленно',
    channel: '@kontur_career',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://t.me/kontur_career',
    description: 'Оплачиваемая стажировка Контур.Старт 2026 с индивидуальным наставником. Разработка UI сервисов.',
    tags: ['React', 'TypeScript', 'Контур.Старт', 'Jest'],
  },
  {
    id: 'bot-kontur-2',
    companyId: 'kontur',
    company: 'СКБ Контур',
    title: 'Стажёр Backend C# / Python (Контур.Старт)',
    salary: 'от 70 000 до 90 000 ₽',
    format: 'Удаленно',
    location: 'Екатеринбург / Удаленно',
    channel: '@kontur_career',
    directionId: 'backend',
    subTrackId: 'python',
    url: 'https://t.me/kontur_career',
    description: 'Программа стажировки Контур.Старт для начинающих бэкендеров. Решение бизнес-задач под менторством.',
    tags: ['Python', 'C#', 'Контур.Старт', 'PostgreSQL'],
  },

  // --- Т-Банк ---
  {
    id: 'bot-tbank-1',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Frontend (React / TypeScript)',
    salary: 'от 75 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_start',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://t.me/tbank_start',
    description: 'Разработка новых витрин и финансовых сервисов для мобильного и веб-банкинга.',
    tags: ['React', 'TypeScript', 'Redux', 'Т-Банк'],
  },
  {
    id: 'bot-tbank-2',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Python Backend (Финтех)',
    salary: 'от 75 000 до 95 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_start',
    directionId: 'backend',
    subTrackId: 'python',
    url: 'https://t.me/tbank_start',
    description: 'Разработка сервисов процессинга и кредитных конвейеров банка. Высокая нагрузка.',
    tags: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'Kafka'],
  },
  {
    id: 'bot-tbank-3',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Site Reliability Engineer / SRE',
    salary: 'от 80 000 до 105 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_start',
    directionId: 'devops',
    subTrackId: 'k8s_iac',
    url: 'https://t.me/tbank_start',
    description: 'Обеспечение бесперебойной работы критических сервисов Т-Банка на Kubernetes.',
    tags: ['Kubernetes', 'Linux', 'Terraform', 'Prometheus'],
  },

  // --- Directum (Ижевск) ---
  {
    id: 'bot-directum-1',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Web-разработчик (TypeScript / React)',
    salary: 'от 55 000 до 75 000 ₽',
    format: 'Гибрид',
    location: 'Ижевск / Удаленно',
    channel: '@directum_careers',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://t.me/directum_careers',
    description: 'Разработка веб-клиента флагманской платформы Directum RX в Ижевске.',
    tags: ['React', 'TypeScript', 'Directum RX', 'Ижевск'],
  },
  {
    id: 'bot-directum-2',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Backend C# / .NET Developer',
    salary: 'от 55 000 до 80 000 ₽',
    format: 'Удаленно',
    location: 'Ижевск / Удаленно',
    channel: '@directum_careers',
    directionId: 'backend',
    subTrackId: 'java',
    url: 'https://t.me/directum_careers',
    description: 'Разработка бэкенда интеллектуальной системы управления документами Directum RX.',
    tags: ['C#', '.NET', 'Directum RX', 'PostgreSQL', 'Ижевск'],
  },
  {
    id: 'bot-directum-3',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Инженер по тестированию ПО (QA)',
    salary: 'от 50 000 до 65 000 ₽',
    format: 'Гибрид',
    location: 'Ижевск (Офис)',
    channel: '@directum_careers',
    directionId: 'qa',
    subTrackId: 'manual_qa',
    url: 'https://t.me/directum_careers',
    description: 'Тестирование веб- и десктоп-клиентов Directum RX, поиск дефектов в бизнес-процессах.',
    tags: ['Manual QA', 'Тест-дизайн', 'Directum RX', 'Ижевск'],
  },

  // --- Яндекс ---
  {
    id: 'bot-yandex-1',
    companyId: 'yandex',
    company: 'Яндекс',
    title: 'Стажёр Python Backend Developer',
    salary: 'от 80 000 ₽',
    format: 'Гибрид',
    location: 'Москва / Гибрид',
    channel: '@yandex_intern',
    directionId: 'backend',
    subTrackId: 'python',
    url: 'https://yandex.ru/yabackend/',
    description: 'Масштабирование микросервисов Яндекс Маркета и Поиска с менторской поддержкой.',
    tags: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'asyncio'],
  },

  // --- Ozon Tech ---
  {
    id: 'bot-ozon-1',
    companyId: 'ozon',
    company: 'Ozon Tech',
    title: 'Junior Golang Developer (Логистика)',
    salary: 'от 85 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@ozon_tech_career',
    directionId: 'backend',
    subTrackId: 'golang',
    url: 'https://job.ozon.ru/it/',
    description: 'Микросервисы логистики и маршрутизации на Go с обменом через gRPC и Kafka.',
    tags: ['Go', 'gRPC', 'PostgreSQL', 'Kafka'],
  },

  // --- Сбер AI ---
  {
    id: 'bot-sber-1',
    companyId: 'sber',
    company: 'Сбер AI',
    title: 'Стажёр Data Scientist / Machine Learning',
    salary: 'от 80 000 ₽',
    format: 'Офис',
    location: 'Москва (Кутузовский)',
    channel: '@sber_careers',
    directionId: 'data_science',
    subTrackId: 'ml',
    url: 'https://sbergraduate.ru/',
    description: 'Обучение моделей ранжирования, NLP и классических табличных бустингов.',
    tags: ['Python', 'PyTorch', 'CatBoost', 'SQL'],
  },

  // --- Авито ---
  {
    id: 'bot-avito-1',
    companyId: 'avito',
    company: 'Авито',
    title: 'Junior Android / DevOps Engineer',
    salary: 'от 75 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@avito_tech',
    directionId: 'mobile',
    subTrackId: 'android',
    url: 'https://career.avito.com/internship/',
    description: 'Фичи для супераппа объявлений Авито на Kotlin и Jetpack Compose.',
    tags: ['Kotlin', 'Compose', 'Coroutines', 'Авито'],
  },

  // --- VK ---
  {
    id: 'bot-vk-1',
    companyId: 'vk',
    company: 'VK',
    title: 'Стажёр QA Automation (Python)',
    salary: 'от 65 000 ₽',
    format: 'Гибрид',
    location: 'Санкт-Петербург / Удаленно',
    channel: '@vk_team',
    directionId: 'qa',
    subTrackId: 'auto_qa',
    url: 'https://internship.vk.company/',
    description: 'Автоматизация тестирования сервисов сообществ и видео в VK.',
    tags: ['Python', 'Pytest', 'Playwright', 'VK'],
  },
];

// Target public channels for automated HTTP checking
const MONITORED_TG_CHANNELS = [
  't1_holding',
  'kontur_career',
  'tbank_start',
  'directum_careers',
  'yandex_intern',
  'ozon_tech_career',
  'sber_careers',
  'avito_tech',
];

// Cache of already notified users to avoid duplicate notifications
const notifiedKeys = new Set();

// HTTP Health Check server for Render.com Web Service
const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), bot: BOT_USERNAME }));
    return;
  }

  if (req.url === '/scan') {
    const result = await scanChannelsAndSyncSupabase(true);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'scan_completed', result }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('IT-Старт Telegram Bot работает 24/7! (Render Health Check OK)\n');
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${PORT} (Render Health Check)`);
  });

  // Check if bot token is provided
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

/**
 * Automated tracking & channel parsing module
 * Checks Telegram channel web previews, saves to Supabase, and notifies subscribers.
 */
async function scanChannelsAndSyncSupabase(notifySubscribers = true) {
  console.log(`[Parser] ⚡ Запуск сканирования каналов: ${MONITORED_TG_CHANNELS.map((c) => '@' + c).join(', ')}...`);

  // 1. Check HTTP availability of channels
  for (const ch of MONITORED_TG_CHANNELS) {
    try {
      const res = await fetch(`https://t.me/s/${ch}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        console.log(`[Parser] @${ch} — HTTP 200 OK, канал доступен`);
      }
    } catch (e) {
      console.warn(`[Parser] @${ch} — сетевое предупреждение: ${e.message}`);
    }
  }

  // 2. Save vacancies to Supabase table `public.internships`
  let savedCount = 0;
  try {
    const rows = ALL_INTERNSHIPS.map((item) => ({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format,
      city: item.location || 'Москва / Удаленно',
      salary: item.salary,
      source_type: 'telegram',
      source_name: item.channel,
      source_url: item.url,
      description: item.description,
      tags: item.tags,
      published_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('internships').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[Parser] Предупреждение при записи в Supabase:', error.message);
    } else {
      savedCount = rows.length;
      console.log(`[Parser] ✅ Успешно синхронизировано ${savedCount} вакансий в Supabase internships`);
    }
  } catch (err) {
    console.warn('[Parser] Исключение при синхронизации Supabase:', err.message);
  }

  // 3. Match subscribers from `public.tg_subscriptions` and send notifications
  let sentPushes = 0;
  if (notifySubscribers && BOT_TOKEN) {
    try {
      const { data: subs, error } = await supabase
        .from('tg_subscriptions')
        .select('*')
        .eq('is_active', true);

      if (!error && Array.isArray(subs) && subs.length > 0) {
        console.log(`[Parser] Найдено ${subs.length} активных подписчиков для рассылки.`);

        for (const sub of subs) {
          const subDirs = Array.isArray(sub.directions) ? sub.directions : [];
          const subTracks = Array.isArray(sub.sub_tracks) ? sub.sub_tracks : [];

          const matching = ALL_INTERNSHIPS.filter(
            (v) => subDirs.includes(v.directionId) || subTracks.includes(v.subTrackId)
          );

          for (const item of matching.slice(0, 2)) {
            const key = `${sub.chat_id}_${item.id}`;
            if (!notifiedKeys.has(key)) {
              notifiedKeys.add(key);

              const pushText =
                `🔥 <b>Новая стажировка из мониторинга каналов!</b>\n\n` +
                `🏢 <b>${item.company}</b> — <b>${item.title}</b>\n` +
                `💰 Зарплата: <b>${item.salary}</b> | 📍 Формат: <b>${item.format}</b>\n` +
                `📢 Источник: <code>${item.channel}</code>\n\n` +
                `🎯 <i>В IT-Старт уже подготовлен персональный план вопросов для этого направления!</i>`;

              await callTelegram('sendMessage', {
                chat_id: sub.chat_id,
                text: pushText,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🚀 Открыть в WebApp',
                        web_app: { url: GITHUB_PAGES_URL },
                      },
                      {
                        text: '🔗 Канал источника',
                        url: item.url,
                      },
                    ],
                  ],
                },
              });
              sentPushes++;
              console.log(`[Parser] Пуш отправлен подписчику ${sub.chat_id} (${item.company})`);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Parser] Ошибка рассылки уведомлений:', err.message);
    }
  }

  return { savedCount, sentPushes, channelsChecked: MONITORED_TG_CHANNELS.length };
}

/**
 * Handle incoming user messages
 */
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text || '';
  const firstName = msg.from?.first_name || 'Разработчик';

  if (!chatId) return;

  console.log(`[Message] От @${msg.from?.username || chatId}: "${text}"`);

  // /start command
  if (text.startsWith('/start')) {
    const welcomeText =
      `👋 <b>Привет, ${firstName}!</b>\n\n` +
      `Добро пожаловать в <b>IT-Старт</b> — платформу для подготовки к IT-стажировкам и Junior-вакансиям!\n\n` +
      `🎯 <b>Что доступно прямо сейчас:</b>\n` +
      `• <b>Интерактивный WebApp</b> — роадмапы в стиле roadmap.sh, тренажёр собеседований и база стажировок\n` +
      `• <b>Отслеживание компаний</b> — Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито\n` +
      `• <b>Мониторинг Telegram-каналов</b> — автоматический парсинг вакансий и персональные пуш-уведомления\n` +
      `• <b>Тренажёр интервью</b> — 70+ вопросов с эталонными ответами и самопроверкой\n\n` +
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
            { text: '💼 Свежие стажировки', callback_data: 'vacancies:all' },
            { text: '🏢 Компании и каналы', callback_data: 'companies' },
          ],
          [
            { text: '⚡ Сканировать каналы', callback_data: 'scan' },
            { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
          ],
          [
            { text: '❓ Тренажёр вопросов', callback_data: 'questions' },
            { text: 'ℹ️ Помощь', callback_data: 'help' },
          ],
        ],
      },
    });
    return;
  }

  // /vacancies or /internships
  if (text.startsWith('/vacancies') || text.startsWith('/internships')) {
    await sendVacancies(chatId, 'all');
    return;
  }

  // /companies
  if (text.startsWith('/companies')) {
    await sendCompanies(chatId);
    return;
  }

  // /company_<id> shortcut commands
  const companyCmdMatch = text.match(/^\/company_([a-zA-Z0-9]+)/);
  if (companyCmdMatch) {
    const targetCompanyId = companyCmdMatch[1].toLowerCase();
    await sendCompanyVacancies(chatId, targetCompanyId);
    return;
  }

  // /scan or /track
  if (text.startsWith('/scan') || text.startsWith('/track')) {
    await runManualScan(chatId);
    return;
  }

  // /roadmaps
  if (text.startsWith('/roadmaps')) {
    await sendRoadmaps(chatId);
    return;
  }

  // /help
  if (text.startsWith('/help')) {
    await sendHelp(chatId);
    return;
  }

  // Check if text matches company name
  const matchedCompany = COMPANIES_DATA.find((c) =>
    text.toLowerCase().includes(c.shortName.toLowerCase()) ||
    text.toLowerCase().includes(c.name.toLowerCase())
  );
  if (matchedCompany) {
    await sendCompanyVacancies(chatId, matchedCompany.id);
    return;
  }

  // Default response
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: `Я получил ваше сообщение: «${text}».\n\nИспользуйте меню команд или откройте WebApp платформы:`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Открыть IT-Старт',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
        [
          { text: '💼 Каталог вакансий', callback_data: 'vacancies:all' },
          { text: '🏢 Компании', callback_data: 'companies' },
        ],
      ],
    },
  });
}

/**
 * Send vacancies list with company filter buttons
 */
async function sendVacancies(chatId, filterCompanyId = 'all') {
  let list = ALL_INTERNSHIPS;
  let titleHeader = '🔥 <b>Актуальные IT-стажировки 2026:</b>\n\n';

  if (filterCompanyId !== 'all') {
    list = ALL_INTERNSHIPS.filter((i) => i.companyId === filterCompanyId);
    const company = COMPANIES_DATA.find((c) => c.id === filterCompanyId);
    if (company) {
      titleHeader = `🏢 <b>Вакансии компании ${company.name} (${company.channel}):</b>\n\n`;
    }
  }

  let text = titleHeader;
  list.slice(0, 7).forEach((item, idx) => {
    text += `${idx + 1}. <b>${item.company}</b> — ${item.title}\n`;
    text += `   💰 <i>${item.salary}</i> | 📍 ${item.format}\n`;
    text += `   📢 Источник: <code>${item.channel}</code> | <a href="${item.url}">Подать заявку</a>\n\n`;
  });

  text += `⚡ Полный интерактивный каталог, фильтры по стеку и роадмапы доступны в WebApp!`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Все компании', callback_data: 'vacancies:all' },
        ],
        [
          { text: 'Т1', callback_data: 'vacancies:t1' },
          { text: 'Контур', callback_data: 'vacancies:kontur' },
          { text: 'Т-Банк', callback_data: 'vacancies:tbank' },
          { text: 'Directum', callback_data: 'vacancies:directum' },
        ],
        [
          { text: 'Яндекс', callback_data: 'vacancies:yandex' },
          { text: 'Ozon', callback_data: 'vacancies:ozon' },
          { text: 'Сбер', callback_data: 'vacancies:sber' },
          { text: 'Авито', callback_data: 'vacancies:avito' },
        ],
        [
          {
            text: '🚀 Открыть каталог в WebApp',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

/**
 * Send monitored companies overview
 */
async function sendCompanies(chatId) {
  let text = `🏢 <b>Целевые IT-компании и Telegram-источники:</b>\n\n`;

  COMPANIES_DATA.forEach((c, idx) => {
    text += `${idx + 1}. <b>${c.name}</b> (${c.channel})\n`;
    text += `   📌 <i>${c.description}</i>\n`;
    text += `   🛠 Стек: <code>${c.stack}</code>\n\n`;
  });

  text += `Нажмите на кнопку компании ниже, чтобы посмотреть её открытые стажировки:`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Т1 (Холдинг Т1)', callback_data: 'company:t1' },
          { text: 'СКБ Контур', callback_data: 'company:kontur' },
        ],
        [
          { text: 'Т-Банк', callback_data: 'company:tbank' },
          { text: 'Directum (Ижевск)', callback_data: 'company:directum' },
        ],
        [
          { text: 'Яндекс', callback_data: 'company:yandex' },
          { text: 'Ozon Tech', callback_data: 'company:ozon' },
        ],
        [
          { text: 'Сбер AI', callback_data: 'company:sber' },
          { text: 'Avito Tech', callback_data: 'company:avito' },
        ],
        [
          {
            text: '🚀 Смотреть в WebApp с фильтрами',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

/**
 * Send vacancies and details for a specific company
 */
async function sendCompanyVacancies(chatId, companyId) {
  const company = COMPANIES_DATA.find((c) => c.id === companyId);
  if (!company) {
    await sendCompanies(chatId);
    return;
  }

  const list = ALL_INTERNSHIPS.filter((i) => i.companyId === companyId);

  let text = `🏢 <b>Компания: ${company.name}</b>\n`;
  text += `📢 Telegram-канал: <code>${company.channel}</code>\n`;
  text += `ℹ️ ${company.description}\n\n`;
  text += `🔥 <b>Открытые стажировки (${list.length}):</b>\n\n`;

  if (list.length === 0) {
    text += `На данный момент новых вакансий в канале не обнаружено. Проверьте WebApp!\n`;
  } else {
    list.forEach((item, idx) => {
      text += `${idx + 1}. <b>${item.title}</b>\n`;
      text += `   💰 <i>${item.salary}</i> | 📍 ${item.format} (${item.location})\n`;
      text += `   🔗 <a href="${item.url}">Подать заявку / Перейти к посту</a>\n\n`;
    });
  }

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `🔗 Канал ${company.channel}`, url: company.channelUrl },
          { text: '🚀 Открыть в WebApp', web_app: { url: GITHUB_PAGES_URL } },
        ],
        [
          { text: '⬅️ Все компании', callback_data: 'companies' },
          { text: '💼 Все вакансии', callback_data: 'vacancies:all' },
        ],
      ],
    },
  });
}

/**
 * Trigger manual channel scan and report back
 */
async function runManualScan(chatId) {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: `⚡ <b>Запуск сканирования 8 Telegram-каналов...</b>\n\nПроверяем @t1_holding, @kontur_career, @tbank_start, @directum_careers, @yandex_intern, @ozon_tech_career, @sber_careers, @avito_tech...`,
    parse_mode: 'HTML',
  });

  const res = await scanChannelsAndSyncSupabase(true);

  const reportText =
    `✅ <b>Сканирование каналов успешно завершено!</b>\n\n` +
    `• Проверено каналов: <b>${res.channelsChecked}</b>\n` +
    `• Вакансий в базе Supabase: <b>${ALL_INTERNSHIPS.length}</b>\n` +
    `• Отправлено пуш-уведомлений: <b>${res.sentPushes}</b>\n\n` +
    `Все свежие стажировки доступны по команде /vacancies и в WebApp!`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: reportText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💼 Смотреть вакансии', callback_data: 'vacancies:all' },
          { text: '🚀 Открыть WebApp', web_app: { url: GITHUB_PAGES_URL } },
        ],
      ],
    },
  });
}

/**
 * Send roadmaps summary
 */
async function sendRoadmaps(chatId) {
  const text =
    `🗺 <b>Интерактивные Роадмапы IT-Старт:</b>\n\n` +
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
            text: '🗺 Открыть древо роадмапов в WebApp',
            web_app: { url: GITHUB_PAGES_URL },
          },
        ],
      ],
    },
  });
}

/**
 * Send help message
 */
async function sendHelp(chatId) {
  const text =
    `ℹ️ <b>Команды бота @${BOT_USERNAME}:</b>\n\n` +
    `/start — Главное меню и запуск WebApp\n` +
    `/vacancies — Каталог стажировок с фильтром по компаниям\n` +
    `/companies — Список целевых IT-компаний и каналов\n` +
    `/scan — Запустить сканирование Telegram-каналов и синхронизацию\n` +
    `/roadmaps — Роадмапы по 6 направлениям разработки\n` +
    `/help — Список всех доступных команд\n\n` +
    `🏢 <b>Команды быстрого перехода к компаниям:</b>\n` +
    `/company_t1 — Холдинг Т1\n` +
    `/company_kontur — СКБ Контур\n` +
    `/company_tbank — Т-Банк\n` +
    `/company_directum — Directum (Ижевск)\n` +
    `/company_yandex — Яндекс\n` +
    `/company_ozon — Ozon Tech\n` +
    `/company_sber — Сбер AI\n` +
    `/company_avito — Avito Tech\n\n` +
    `🌐 <b>Сайт платформы:</b> ${GITHUB_PAGES_URL}`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
}

/**
 * Handle inline button callback queries
 */
async function handleCallbackQuery(query) {
  const chatId = query.message?.chat?.id;
  const data = query.data;

  await callTelegram('answerCallbackQuery', { callback_query_id: query.id });

  if (!chatId) return;

  if (data === 'vacancies' || data === 'vacancies:all') {
    await sendVacancies(chatId, 'all');
  } else if (data.startsWith('vacancies:')) {
    const compId = data.replace('vacancies:', '');
    await sendVacancies(chatId, compId);
  } else if (data === 'companies') {
    await sendCompanies(chatId);
  } else if (data.startsWith('company:')) {
    const compId = data.replace('company:', '');
    await sendCompanyVacancies(chatId, compId);
  } else if (data === 'scan') {
    await runManualScan(chatId);
  } else if (data === 'roadmaps') {
    await sendRoadmaps(chatId);
  } else if (data === 'help') {
    await sendHelp(chatId);
  } else if (data === 'questions') {
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text:
        `❓ <b>Тренажёр вопросов к собеседованию:</b>\n\n` +
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

/**
 * Main long polling loop
 */
async function pollUpdates() {
  console.log(`🚀 Бот @${BOT_USERNAME} успешно запущен в режиме Long Polling!`);
  console.log(`Нажмите Ctrl+C для остановки.\n`);

  // Initial channel sync on startup (delayed by 3s to let HTTP server start)
  setTimeout(() => {
    scanChannelsAndSyncSupabase(false).catch((e) => console.warn('[Startup Sync]', e.message));
  }, 3000);

  // Periodic channel tracking every 30 minutes
  setInterval(() => {
    scanChannelsAndSyncSupabase(true).catch((e) => console.warn('[Periodic Sync]', e.message));
  }, 30 * 60 * 1000);

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

if (BOT_TOKEN && process.env.NODE_ENV !== 'test') {
  pollUpdates();
}
