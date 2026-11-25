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
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Auto-load .env configuration if present
function autoLoadEnv() {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidateEnvPaths = [
      path.resolve(currentDir, '.env'),
      path.resolve(currentDir, '..', '.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'bot', '.env'),
    ];

    for (const envPath of candidateEnvPaths) {
      if (fs.existsSync(envPath)) {
        if (typeof process.loadEnvFile === 'function') {
          try {
            process.loadEnvFile(envPath);
          } catch {
            parseEnvFile(envPath);
          }
        } else {
          parseEnvFile(envPath);
        }
      }
    }
  } catch {}
}

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

if (process.env.NODE_ENV !== 'test') {
  autoLoadEnv();
}

// Prefer IPv4 to avoid IPv6 connect timeouts on public Telegram web gateways
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const rawCliToken = process.argv.slice(2).find((arg) => typeof arg === 'string' && !arg.startsWith('-')) || '';
export const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || rawCliToken).trim().replace(/^['"]|['"]$/g, '');
const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
export const BACKEND_URL =
  process.env.KOYEB_PUBLIC_URL ||
  (process.env.KOYEB_PUBLIC_DOMAIN ? `https://${process.env.KOYEB_PUBLIC_DOMAIN.replace(/\/+$/, '')}/` : '') ||
  process.env.PUBLIC_URL ||
  process.env.BACKEND_URL ||
  process.env.RENDER_URL ||
  'https://it-start-bot.koyeb.app/';
export const RENDER_URL = BACKEND_URL;
export const PUBLIC_WEB_URL =
  process.env.WEBAPP_URL ||
  process.env.PUBLIC_URL ||
  process.env.KOYEB_PUBLIC_URL ||
  (process.env.KOYEB_PUBLIC_DOMAIN ? `https://${process.env.KOYEB_PUBLIC_DOMAIN.replace(/\/+$/, '')}/` : '') ||
  GITHUB_PAGES_URL;
export const WEBAPP_URL = process.env.WEBAPP_URL || PUBLIC_WEB_URL;
const BOT_USERNAME = 'IT_start_izh_bot';
export const PORT = process.env.PORT ? (Number(process.env.PORT) || 8000) : 8000;
export let isRunning = true;
export function stopBot() {
  isRunning = false;
}
const __botFilename = fileURLToPath(import.meta.url);
const __botDirname = path.dirname(__botFilename);
export const DIST_DIR = path.resolve(__botDirname, '..', 'dist');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmgsymacvhzsixbpndsn.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Database of target companies with search aliases and public channels
export const COMPANIES_DATA = [
  {
    id: 't1',
    name: 'Холдинг Т1',
    shortName: 'Т1',
    channel: '@t1career',
    channelUrl: 'https://t.me/t1career',
    aliases: ['т1', 't1', 'холдинг т1', 'открытая школа', 'открытая школа т1', 't1 holding', 't1-holding'],
    description: 'Один из лидеров российского IT-рынка. Программа «Открытая школа Т1» — оплачиваемое обучение и стажировка по Java, DevOps, QA и Cloud с переходом в штат.',
    stack: 'Java, Spring Boot, DevOps, CI/CD, QA Auto, Cloud',
  },
  {
    id: 'kontur',
    name: 'СКБ Контур',
    shortName: 'Контур',
    channel: '@KonturTech',
    channelUrl: 'https://t.me/KonturTech',
    aliases: ['контур', 'kontur', 'скб контур', 'контур.старт', 'контур старт', 'kontur_career'],
    description: 'Разработчик экосистемы сервисов для бизнеса (Диадок, Экстерн, Фокус). Программа «Контур.Старт» для студентов и начинающих разработчиков с персональным наставником.',
    stack: 'React, TypeScript, C#, Python, Go, Manual & Auto QA',
  },
  {
    id: 'tbank',
    name: 'Т-Банк',
    shortName: 'Т-Банк',
    channel: '@tbank_team',
    channelUrl: 'https://t.me/tbank_team',
    aliases: ['тбанк', 'т-банк', 'tbank', 'тинькофф', 'tinkoff', 't-bank', 'т банк', 'tbank_start'],
    description: 'Ведущий финансово-технологический гигант. Финтех-стажировки по разработке интерфейсов, высоконагруженного бэкенда, SRE-инфраструктуры и машинного обучения.',
    stack: 'React, TypeScript, Python, Golang, Kubernetes, SRE, ML',
  },
  {
    id: 'directum',
    name: 'Directum',
    shortName: 'Directum',
    channel: '@Life_in_Directum',
    channelUrl: 'https://t.me/Life_in_Directum',
    aliases: ['директум', 'директрум', 'directum', 'directum rx', 'директум рх', 'directum_careers', 'ижевск'],
    description: 'Ведущий российский вендор интеллектуальных систем управления цифровыми процессами и документами (Directum RX), штаб-квартира в Ижевске. Сильная инженерная школа.',
    stack: 'C#, .NET, TypeScript, React, QA, Web API, AI, Ижевск',
  },
  {
    id: 'yandex',
    name: 'Яндекс',
    shortName: 'Яндекс',
    channel: '@yandex_intern',
    channelUrl: 'https://t.me/yandex_intern',
    aliases: ['яндекс', 'yandex', 'яша', 'young con', 'yandex_intern'],
    description: 'Технологическая компания (Поиск, Go, Маркет, AI). Программы стажировок Young Con круглый год с релокацией или удаленкой.',
    stack: 'Python, Go, C++, React, iOS/Android, Machine Learning',
  },
  {
    id: 'ozon',
    name: 'Ozon Tech',
    shortName: 'Ozon Tech',
    channel: '@ozon_tech_career',
    channelUrl: 'https://t.me/ozon_tech_career',
    aliases: ['ozon', 'озон', 'ozon tech', 'озон тех', 'ozon camp', 'ozon_tech_career'],
    description: 'Электронная коммерция и логистика. Стажировки Ozon Camp с глубоким погружением в микросервисы на Go и масштабируемые системы.',
    stack: 'Golang, gRPC, PostgreSQL, Kafka, Android, QA',
  },
  {
    id: 'sber',
    name: 'Сбер (Sber AI)',
    shortName: 'Сбер',
    channel: '@sber_careers',
    channelUrl: 'https://t.me/sber_careers',
    aliases: ['сбер', 'sber', 'сбербанк', 'sberseasons', 'sber ai', 'sber_careers'],
    description: 'Крупнейшая банковская и AI-экосистема России. Программа SberSeasons: исследования LLM, Data Science, разработка мобильных и серверных систем.',
    stack: 'Python, PyTorch, Data Science, Java, Mobile, DevOps',
  },
  {
    id: 'avito',
    name: 'Avito Tech',
    shortName: 'Авито',
    channel: '@avito_tech',
    channelUrl: 'https://t.me/avito_tech',
    aliases: ['авито', 'avito', 'avito tech', 'авито тех', 'avito_tech'],
    description: 'Суперапп объявлений с десятками миллионов пользователей. Стажировки в Platform Engineering, Mobile и высоконагруженном Backend.',
    stack: 'Android (Kotlin), iOS (Swift), Golang, Kubernetes, DevOps',
  },
  {
    id: 'vk',
    name: 'VK (ВКонтакте)',
    shortName: 'VK',
    channel: '@vk_team',
    channelUrl: 'https://t.me/vk_team',
    aliases: ['vk', 'вк', 'вконтакте', 'vk team', 'vk_team'],
    description: 'Социальные сервисы, музыка, видео и игры. Оплачиваемые стажировки для студентов с менторством экспертов.',
    stack: 'Node.js, Python, QA Automation, React, C++',
  },
];

/**
 * Fuzzy / synonym matcher for company detection
 */
export function findCompanyByQuery(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  if (!q) return null;

  // 1. Exact matches by id, shortName, channel, name
  for (const c of COMPANIES_DATA) {
    if (c.id === q) return c;
    if (c.shortName.toLowerCase() === q) return c;
    if (c.name.toLowerCase() === q) return c;
    if (c.channel.toLowerCase().replace('@', '') === q.replace('@', '')) return c;
    if (Array.isArray(c.aliases) && c.aliases.includes(q)) return c;
  }

  // 2. Tokenized word boundary or inclusion match
  for (const c of COMPANIES_DATA) {
    if (q.includes(c.shortName.toLowerCase())) return c;
    if (q.length >= 4 && c.name.toLowerCase().includes(q)) return c;
    if (Array.isArray(c.aliases)) {
      for (const alias of c.aliases) {
        if (q.includes(alias)) return c;
        if (q.length >= 4 && alias.includes(q)) return c;
      }
    }
  }

  return null;
}

// Direction aliases dictionary for Russian & English commands
export const DIRECTION_ALIASES = {
  frontend: ['frontend', 'фронтенд', 'фронт', '/frontend', 'react', 'vue', 'angular', 'веб-разработка', 'вебразработка'],
  backend: ['backend', 'бэкенд', 'бек', 'бэк', '/backend', 'python', 'java', 'go', 'golang', 'node', 'nodejs'],
  mobile: ['mobile', 'мобилка', 'мобильная', 'android', 'ios', 'flutter', '/mobile', 'мобайл', 'андроид', 'айос'],
  data_science: ['data_science', 'datascience', 'data science', 'ds', 'ml', 'дата сайнс', 'машинное обучение', '/data_science', 'дс', 'мл'],
  qa: ['qa', 'тестирование', 'тестировщик', 'кьюа', 'тест', '/qa', 'автотесты', 'manual qa'],
  devops: ['devops', 'девопс', 'инфраструктура', 'sre', 'docker', 'кубер', '/devops', 'докер', 'kubernetes'],
};

export const DIRECTION_TITLES = {
  frontend: 'Frontend-разработка (React / Vue / Angular)',
  backend: 'Backend-разработка (Python / Go / Java / Node.js)',
  mobile: 'Mobile-разработка (Android / iOS / Flutter)',
  data_science: 'Data Science & ML / AI',
  qa: 'QA Тестирование (Auto & Manual)',
  devops: 'DevOps & Инфраструктура',
};

export function resolveDirectionByQuery(query = '') {
  const clean = String(query).toLowerCase().trim();
  if (!clean) return null;
  for (const [dirKey, aliases] of Object.entries(DIRECTION_ALIASES)) {
    if (dirKey === clean || aliases.includes(clean)) {
      return dirKey;
    }
  }
  return null;
}

// Curated tracking database covering target employers (using standard unified IDs)
export const ALL_INTERNSHIPS = [
  {
    "id": "int-1",
    "companyId": "tbank",
    "company": "Т-Банк (Тинькофф)",
    "title": "Стажёр Frontend-разработчик (React)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@tbank_team",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://education.tbank.ru/start/frontend/",
    "applyUrl": "https://education.tbank.ru/start/frontend/",
    "sourceChannel": "@tbank_team",
    "description": "Ищем начинающего фронтенд-разработчика в команду Финтех-сервисов. Вы будете создавать современные пользовательские интерфейсы для миллионов клиентов экосистемы.",
    "tags": [
      "React",
      "TypeScript",
      "Redux Toolkit",
      "Tailwind",
      "Next.js"
    ]
  },
  {
    "id": "int-2",
    "companyId": "yandex",
    "company": "Яндекс",
    "title": "Стажёр Backend-разработчик (Python)",
    "salary": "от 70 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Екатеринбург / Удаленно",
    "channel": "@yandex_intern",
    "directionId": "backend",
    "subTrackId": "python",
    "url": "https://yandex.ru/yaintern/backend/",
    "applyUrl": "https://yandex.ru/yaintern/backend/",
    "sourceChannel": "@yandex_intern",
    "description": "Стажировка в сервисах Яндекс Маркета или Поиска. Реальные задачи масштабирования высоконагруженных микросервисов с менторской поддержкой.",
    "tags": [
      "Python 3.12",
      "FastAPI",
      "PostgreSQL",
      "asyncio",
      "Docker"
    ]
  },
  {
    "id": "int-3",
    "companyId": "ozon",
    "company": "Ozon Tech",
    "title": "Junior / Intern Golang Developer",
    "salary": "от 75 000 до 100 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Иннополис / Удаленно",
    "channel": "@ozon_tech_career",
    "directionId": "backend",
    "subTrackId": "golang",
    "url": "https://job.ozon.ru/it/camp/golang/",
    "applyUrl": "https://job.ozon.ru/it/camp/golang/",
    "sourceChannel": "@ozon_tech_career",
    "description": "Команда логистики Ozon ищет стажёра на Go. Мы обрабатываем миллионы заказов в сутки, используя современный стек микросервисов на Go и gRPC.",
    "tags": [
      "Go",
      "gRPC",
      "PostgreSQL",
      "Kafka",
      "Docker"
    ]
  },
  {
    "id": "int-4",
    "companyId": "sber",
    "company": "Сбер (Sber AI)",
    "title": "Стажёр Data Scientist / Machine Learning",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Гибрид",
    "location": "Москва (Кутузовский проспект)",
    "channel": "@sber_careers",
    "directionId": "data_science",
    "subTrackId": "ml",
    "url": "https://sbergraduate.ru/sberseasons-moscow/ml/",
    "applyUrl": "https://sbergraduate.ru/sberseasons-moscow/ml/",
    "sourceChannel": "@sber_careers",
    "description": "Исследования и внедрение ML-моделей в продукты экосистемы Сбера. Работа с передовыми генеративными сетями и табличными данными.",
    "tags": [
      "Python",
      "PyTorch",
      "CatBoost",
      "NLP",
      "SQL"
    ]
  },
  {
    "id": "int-5",
    "companyId": "avito",
    "company": "Avito Tech",
    "title": "Стажёр Android-разработчик (Kotlin)",
    "salary": "от 60 000 до 80 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Санкт-Петербург / Самара",
    "channel": "@avito_tech",
    "directionId": "mobile",
    "subTrackId": "android",
    "url": "https://start.avito.ru/tech",
    "applyUrl": "https://start.avito.ru/tech",
    "sourceChannel": "@avito_tech",
    "description": "Разработка фичей для мобильного приложения Авито с десятками миллионов пользователей. Чистая архитектура, дизайн-система и лучшие инженерные практики.",
    "tags": [
      "Kotlin",
      "Jetpack Compose",
      "Coroutines",
      "Room",
      "Clean Arch"
    ]
  },
  {
    "id": "int-6",
    "companyId": "vk",
    "company": "VK (ВКонтакте)",
    "title": "Junior QA Automation Engineer (Python)",
    "salary": "от 55 000 до 75 000 ₽",
    "format": "Удаленно",
    "location": "Санкт-Петербург / Москва / Удаленно",
    "channel": "@vk_team",
    "directionId": "qa",
    "subTrackId": "auto_qa",
    "url": "https://internship.vk.company/vacancy",
    "applyUrl": "https://internship.vk.company/vacancy",
    "sourceChannel": "@vk_team",
    "description": "Автоматизация тестирования сервисов сообществ и видео в VK. Вы будете создавать надежные автотесты для веба и REST API.",
    "tags": [
      "Python",
      "Pytest",
      "Playwright",
      "Postman",
      "GitLab CI"
    ]
  },
  {
    "id": "int-7",
    "companyId": "sber",
    "company": "Сбер (SberSeasons)",
    "title": "Junior DevOps / SRE Engineer (SberSeasons)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Удаленно",
    "channel": "@sber_careers",
    "directionId": "devops",
    "subTrackId": "cicd_docker",
    "url": "https://sbergraduate.ru/sberseasons-moscow/devops/",
    "applyUrl": "https://sbergraduate.ru/sberseasons-moscow/devops/",
    "sourceChannel": "@sber_careers",
    "description": "Автоматизация сборки и развертывания облачных сервисов Сбера в программе SberSeasons. Практика на реальной высоконагруженной инфраструктуре с персональным ментором.",
    "tags": [
      "Linux",
      "Docker",
      "CI/CD",
      "Kubernetes",
      "SberSeasons"
    ]
  },
  {
    "id": "int-8",
    "companyId": "sber",
    "company": "Сбер (SberSeasons)",
    "title": "Стажёр Java Backend-разработчик (SberSeasons)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@sber_careers",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://sbergraduate.ru/sberseasons-moscow/java/",
    "applyUrl": "https://sbergraduate.ru/sberseasons-moscow/java/",
    "sourceChannel": "@sber_careers",
    "description": "Разработка микросервисов процессинга и цифровой платформы Сбера в рамках стажировки SberSeasons. Обучение под крылом Senior-инженеров.",
    "tags": [
      "Java 21",
      "Spring Boot",
      "PostgreSQL",
      "Kafka",
      "SberSeasons"
    ]
  },
  {
    "id": "int-9",
    "companyId": "kontur",
    "company": "СКБ Контур",
    "title": "Junior Frontend-разработчик (Angular / TS)",
    "salary": "от 60 000 до 80 000 ₽",
    "format": "Удаленно",
    "location": "Екатеринбург / Удаленно",
    "channel": "@KonturTech",
    "directionId": "frontend",
    "subTrackId": "angular",
    "url": "https://kontur.ru/education/internship",
    "applyUrl": "https://kontur.ru/education/internship",
    "sourceChannel": "@KonturTech",
    "description": "Разработка веб-сервисов электронного документооборота и бухгалтерии Контура, которыми пользуются миллионы предпринимателей.",
    "tags": [
      "Angular 18",
      "TypeScript",
      "RxJS",
      "HTML/SCSS",
      "Jest"
    ]
  },
  {
    "id": "int-10",
    "companyId": "tbank",
    "company": "Т-Банк (Тинькофф)",
    "title": "Стажёр Data Analyst / Продуктовый аналитик",
    "salary": "от 60 000 до 80 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@tbank_team",
    "directionId": "data_science",
    "subTrackId": "analytics",
    "url": "https://education.tbank.ru/start/analyst/",
    "applyUrl": "https://education.tbank.ru/start/analyst/",
    "sourceChannel": "@tbank_team",
    "description": "Анализ пользовательских сценариев в мобильном банке, поиск точек роста конверсий и проведение честных A/B-экспериментов.",
    "tags": [
      "SQL",
      "Python",
      "A/B тесты",
      "DataLens",
      "Tableau"
    ]
  },
  {
    "id": "int-11",
    "companyId": "yandex",
    "company": "Яндекс (Яндекс Go)",
    "title": "Стажёр iOS-разработчик (Swift / SwiftUI)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Гибрид",
    "location": "Москва (ул. Льва Толстого)",
    "channel": "@yandex_intern",
    "directionId": "mobile",
    "subTrackId": "ios",
    "url": "https://yandex.ru/yaintern/mobile/",
    "applyUrl": "https://yandex.ru/yaintern/mobile/",
    "sourceChannel": "@yandex_intern",
    "description": "Разработка супераппа Яндекс Go (Такси, Доставка, Самокаты). Работа с плавной анимацией карты, высокими требованиями к отзывчивости UI.",
    "tags": [
      "Swift 6",
      "SwiftUI",
      "UIKit",
      "Combine",
      "ARC"
    ]
  },
  {
    "id": "int-12",
    "companyId": "ozon",
    "company": "Ozon Tech",
    "title": "Стажёр Flutter-разработчик",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@ozon_tech_career",
    "directionId": "mobile",
    "subTrackId": "flutter",
    "url": "https://job.ozon.ru/it/camp/mobile/",
    "applyUrl": "https://job.ozon.ru/it/camp/mobile/",
    "sourceChannel": "@ozon_tech_career",
    "description": "Разработка кроссплатформенных приложений для продавцов Ozon Seller и операторов ПВЗ на Flutter.",
    "tags": [
      "Flutter",
      "Dart",
      "BLoC",
      "REST API",
      "Clean Architecture"
    ]
  },
  {
    "id": "int-13",
    "companyId": "sber",
    "company": "Сбер (Сбербанк)",
    "title": "Junior Manual QA Engineer",
    "salary": "от 50 000 до 70 000 ₽",
    "format": "Офис",
    "location": "Москва / Самара / Новосибирск",
    "channel": "@sber_careers",
    "directionId": "qa",
    "subTrackId": "manual_qa",
    "url": "https://sbergraduate.ru/sberseasons-moscow/qa/",
    "applyUrl": "https://sbergraduate.ru/sberseasons-moscow/qa/",
    "sourceChannel": "@sber_careers",
    "description": "Ручное тестирование веб-версии и мобильного банка СберБизнес. Анализ документации, поиск уязвимостей в бизнес-логике и составление баг-репортов.",
    "tags": [
      "Тест-дизайн",
      "Postman",
      "Charles Proxy",
      "SQL",
      "Jira"
    ]
  },
  {
    "id": "int-14",
    "companyId": "vk",
    "company": "VK (ВКонтакте Музыка)",
    "title": "Junior Node.js / NestJS Backend Developer",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Санкт-Петербург (Зингер) / Удаленно",
    "channel": "@vk_team",
    "directionId": "backend",
    "subTrackId": "nodejs",
    "url": "https://internship.vk.company/vacancy",
    "applyUrl": "https://internship.vk.company/vacancy",
    "sourceChannel": "@vk_team",
    "description": "Разработка микросервисов стриминга и каталога музыки. Асинхронные очереди, кэширование метаданных треков и плейлистов.",
    "tags": [
      "Node.js",
      "NestJS",
      "TypeScript",
      "PostgreSQL",
      "Redis"
    ]
  },
  {
    "id": "int-15",
    "companyId": "avito",
    "company": "Avito Tech",
    "title": "Стажёр Kubernetes & Cloud Platform",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Москва (Лесная)",
    "channel": "@avito_tech",
    "directionId": "devops",
    "subTrackId": "k8s_iac",
    "url": "https://start.avito.ru/tech",
    "applyUrl": "https://start.avito.ru/tech",
    "sourceChannel": "@avito_tech",
    "description": "Команда Core Platform в Авито. Мы развиваем внутреннюю платформу разработки на базе K8s, обслуживающую сотни микросервисов.",
    "tags": [
      "Kubernetes",
      "Terraform",
      "Prometheus",
      "Helm",
      "Golang"
    ]
  },
  {
    "id": "int-16",
    "companyId": "tbank",
    "company": "Т-Банк (Тинькофф)",
    "title": "Junior Frontend-разработчик (Vue.js 3)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@tbank_team",
    "directionId": "frontend",
    "subTrackId": "vue",
    "url": "https://education.tbank.ru/start/frontend/",
    "applyUrl": "https://education.tbank.ru/start/frontend/",
    "sourceChannel": "@tbank_team",
    "description": "Разработка административных панелей и партнерских кабинетов банка на современном Vue 3.",
    "tags": [
      "Vue 3",
      "Composition API",
      "Pinia",
      "TypeScript",
      "Vite"
    ]
  },
  {
    "id": "int-17",
    "companyId": "yandex",
    "company": "Яндекс (Yandex GPT)",
    "title": "Стажёр NLP / LLM Research Engineer",
    "salary": "от 80 000 до 110 000 ₽",
    "format": "Офис",
    "location": "Москва (ул. Льва Толстого)",
    "channel": "@yandex_intern",
    "directionId": "data_science",
    "subTrackId": "ml",
    "url": "https://yandex.ru/yaintern/ml/",
    "applyUrl": "https://yandex.ru/yaintern/ml/",
    "sourceChannel": "@yandex_intern",
    "description": "Участие в обучении и дообучении языковых моделей YandexGPT. Настройка пайплайнов RAG, оценка качества генерации и файнтюнинг.",
    "tags": [
      "PyTorch",
      "Transformers",
      "LLM",
      "RLHF",
      "Python"
    ]
  },
  {
    "id": "int-18",
    "companyId": "kontur",
    "company": "СКБ Контур",
    "title": "Junior Backend Developer (Go / C# / Python)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Екатеринбург / Пермь / Удаленно",
    "channel": "@KonturTech",
    "directionId": "backend",
    "subTrackId": "golang",
    "url": "https://kontur.ru/education/internship",
    "applyUrl": "https://kontur.ru/education/internship",
    "sourceChannel": "@KonturTech",
    "description": "Разработка масштабируемых сервисов Контур.Фокус и Контур.Диадок. Чистая архитектура, code review от признанных экспертов.",
    "tags": [
      "Go",
      "PostgreSQL",
      "Docker",
      "REST API",
      "Git"
    ]
  },
  {
    "id": "int-19",
    "companyId": "t1",
    "company": "Холдинг Т1",
    "title": "Стажёр Java-разработчик (Открытая школа Т1)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@t1career",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://career.t1.ru/vacancies/",
    "applyUrl": "https://career.t1.ru/vacancies/",
    "sourceChannel": "@t1career",
    "description": "Обучение и стажировка в Открытой школе Т1 с переходом в штат. Разработка надежных Enterprise-сервисов для крупнейших корпоративных заказчиков.",
    "tags": [
      "Java 21",
      "Spring Boot",
      "Открытая школа Т1",
      "PostgreSQL",
      "Kafka"
    ]
  },
  {
    "id": "int-20",
    "companyId": "t1",
    "company": "Холдинг Т1",
    "title": "Junior DevOps-инженер (Инфраструктура Т1)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@t1career",
    "directionId": "devops",
    "subTrackId": "cicd_docker",
    "url": "https://career.t1.ru/vacancies/",
    "applyUrl": "https://career.t1.ru/vacancies/",
    "sourceChannel": "@t1career",
    "description": "Поддержка и автоматизация инфраструктуры масштабируемых облачных решений Т1 Облако.",
    "tags": [
      "Linux",
      "Docker",
      "CI/CD",
      "Ansible",
      "Т1 Облако"
    ]
  },
  {
    "id": "int-21",
    "companyId": "t1",
    "company": "Холдинг Т1",
    "title": "Стажёр QA Automation (Python / Java)",
    "salary": "от 60 000 до 80 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Ижевск / Удаленно",
    "channel": "@t1career",
    "directionId": "qa",
    "subTrackId": "auto_qa",
    "url": "https://career.t1.ru/vacancies/",
    "applyUrl": "https://career.t1.ru/vacancies/",
    "sourceChannel": "@t1career",
    "description": "Автоматизация тестирования банковских и интеграционных платформ группы Т1.",
    "tags": [
      "QA Automation",
      "Python",
      "Pytest",
      "REST API",
      "Т1"
    ]
  },
  {
    "id": "int-22",
    "companyId": "directum",
    "company": "Directum",
    "title": "Стажёр Web-разработчик (TypeScript / React)",
    "salary": "от 55 000 до 75 000 ₽",
    "format": "Гибрид",
    "location": "Ижевск / Удаленно",
    "channel": "@Life_in_Directum",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://vk.com/student_directum",
    "applyUrl": "https://vk.com/student_directum",
    "sourceChannel": "@Life_in_Directum",
    "description": "Разработка веб-клиента флагманской платформы управления цифровыми процессами и документами Directum RX в Ижевске.",
    "tags": [
      "React",
      "TypeScript",
      "Directum RX",
      "Web Client",
      "Ижевск",
      "Директум"
    ],
    "isActive": false,
    "status": "closed"
  },
  {
    "id": "int-23",
    "companyId": "directum",
    "company": "Directum",
    "title": "Стажёр Backend-разработчик (.NET / Web API)",
    "salary": "от 55 000 до 80 000 ₽",
    "format": "Удаленно",
    "location": "Ижевск / Удаленно",
    "channel": "@Life_in_Directum",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://vk.com/student_directum",
    "applyUrl": "https://vk.com/student_directum",
    "sourceChannel": "@Life_in_Directum",
    "description": "Разработка масштабируемого бэкенда интеллектуальной системы управления документами Directum RX. Микросервисы, асинхронная обработка и AI-модули.",
    "tags": [
      "C#",
      ".NET",
      "Directum RX",
      "PostgreSQL",
      "Web API",
      "Ижевск",
      "Директум"
    ],
    "isActive": false,
    "status": "closed"
  },
  {
    "id": "int-24",
    "companyId": "directum",
    "company": "Directum",
    "title": "Стажёр Инженер по тестированию ПО (QA)",
    "salary": "от 50 000 до 65 000 ₽",
    "format": "Гибрид",
    "location": "Ижевск (Офис / Гибрид)",
    "channel": "@Life_in_Directum",
    "directionId": "qa",
    "subTrackId": "manual_qa",
    "url": "https://vk.com/student_directum",
    "applyUrl": "https://vk.com/student_directum",
    "sourceChannel": "@Life_in_Directum",
    "description": "Тестирование веб- и десктоп-клиентов Directum RX, поиск дефектов в бизнес-процессах электронного документооборота.",
    "tags": [
      "Manual QA",
      "Тест-дизайн",
      "Directum RX",
      "Postman",
      "Ижевск",
      "Директум"
    ],
    "isActive": false,
    "status": "closed"
  },
  {
    "id": "int-25",
    "companyId": "kontur",
    "company": "Контур",
    "title": "Стажёр Frontend-разработчик (Контур.Старт)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Екатеринбург / Пермь / Удаленно",
    "channel": "@KonturTech",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://kontur.ru/education/internship",
    "applyUrl": "https://kontur.ru/education/internship",
    "sourceChannel": "@KonturTech",
    "description": "Оплачиваемая стажировка Контур.Старт 2026 с индивидуальным наставником. Разработка современных интерфейсов для экосистемы Контура.",
    "tags": [
      "React",
      "TypeScript",
      "Контур.Старт",
      "Jest",
      "Redux"
    ]
  },
  {
    "id": "int-26",
    "companyId": "kontur",
    "company": "Контур",
    "title": "Стажёр Backend-разработчик (Контур.Старт / Python)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Екатеринбург / Удаленно",
    "channel": "@KonturTech",
    "directionId": "backend",
    "subTrackId": "python",
    "url": "https://kontur.ru/education/internship",
    "applyUrl": "https://kontur.ru/education/internship",
    "sourceChannel": "@KonturTech",
    "description": "Программа стажировки Контур.Старт для начинающих бэкендеров. Решение реальных бизнес-задач под менторством Senior-разработчиков.",
    "tags": [
      "Python",
      "Контур.Старт",
      "PostgreSQL",
      "Docker",
      "FastAPI"
    ]
  },
  {
    "id": "int-27",
    "companyId": "tbank",
    "company": "Т-Банк",
    "title": "Стажёр Python Backend (Т-Банк Финтех)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@tbank_team",
    "directionId": "backend",
    "subTrackId": "python",
    "url": "https://education.tbank.ru/start/python/",
    "applyUrl": "https://education.tbank.ru/start/python/",
    "sourceChannel": "@tbank_team",
    "description": "Разработка ключевых сервисов процессинга и кредитных конвейеров банка. Высокая нагрузка и строгие требования к надежности.",
    "tags": [
      "Python 3.12",
      "FastAPI",
      "PostgreSQL",
      "Kafka",
      "Т-Банк Финтех"
    ]
  },
  {
    "id": "int-28",
    "companyId": "tbank",
    "company": "Т-Банк",
    "title": "Стажёр Site Reliability Engineer / DevOps",
    "salary": "от 80 000 до 105 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@tbank_team",
    "directionId": "devops",
    "subTrackId": "k8s_iac",
    "url": "https://education.tbank.ru/start/python/",
    "applyUrl": "https://education.tbank.ru/start/python/",
    "sourceChannel": "@tbank_team",
    "description": "Обеспечение бесперебойной работы критических сервисов Т-Банка. Автоматизация развертывания и мониторинга сотен микросервисов.",
    "tags": [
      "Kubernetes",
      "Linux",
      "Terraform",
      "Prometheus",
      "Т-Банк SRE"
    ]
  },
  {
    "id": "int-29",
    "companyId": "ozon",
    "company": "Ozon Tech",
    "title": "Стажёр Frontend-разработчик (React / TypeScript)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@ozon_tech_career",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://job.ozon.ru/it/camp/frontend/",
    "applyUrl": "https://job.ozon.ru/it/camp/frontend/",
    "sourceChannel": "@ozon_tech_career",
    "description": "Оплачиваемая стажировка Ozon Camp 2026 в командах маркетплейса. Разработка высоконагруженных витрин, чекаута и кабинетов продавцов.",
    "tags": [
      "React 19",
      "TypeScript",
      "Ozon Camp",
      "Next.js",
      "Tailwind"
    ]
  },
  {
    "id": "int-30",
    "companyId": "ozon",
    "company": "Ozon Tech",
    "title": "Стажёр QA Automation (Go / Python / Ozon Camp)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@ozon_tech_career",
    "directionId": "qa",
    "subTrackId": "auto_qa",
    "url": "https://job.ozon.ru/it/camp/qa/",
    "applyUrl": "https://job.ozon.ru/it/camp/qa/",
    "sourceChannel": "@ozon_tech_career",
    "description": "Автоматизация тестирования высоконагруженных микросервисов логистики Ozon. Работа с протоколами gRPC, очередями Kafka и базами PostgreSQL.",
    "tags": [
      "QA Auto",
      "Go",
      "Python",
      "gRPC",
      "Ozon Camp",
      "Kafka"
    ]
  },
  {
    "id": "int-31",
    "companyId": "avito",
    "company": "Avito Tech",
    "title": "Стажёр Frontend-разработчик (Авито Старт)",
    "salary": "от 70 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@avito_tech",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://start.avito.ru/tech",
    "applyUrl": "https://start.avito.ru/tech",
    "sourceChannel": "@avito_tech",
    "description": "Программа стажировки Авито Старт: разработка ключевых разделов Avito.ru с миллионной аудиторией. Дизайн-система, микрофронтенды и высокие стандарты качества.",
    "tags": [
      "React",
      "TypeScript",
      "Авито Старт",
      "SSR",
      "Redux Toolkit"
    ]
  },
  {
    "id": "int-32",
    "companyId": "avito",
    "company": "Avito Tech",
    "title": "Стажёр Backend-разработчик (Python / Go / Авито Старт)",
    "salary": "от 75 000 до 100 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Самара / Удаленно",
    "channel": "@avito_tech",
    "directionId": "backend",
    "subTrackId": "python",
    "url": "https://start.avito.ru/tech",
    "applyUrl": "https://start.avito.ru/tech",
    "sourceChannel": "@avito_tech",
    "description": "Разработка распределенных микросервисов поиска и рекомендаций Авито. Решение алгоритмических задач и обработка терабайтов данных под руководством Senior ментора.",
    "tags": [
      "Python 3.12",
      "Golang",
      "PostgreSQL",
      "Kafka",
      "Авито Старт"
    ]
  },
  {
    "id": "int-33",
    "companyId": "vk",
    "company": "VK (ВКонтакте)",
    "title": "Стажёр Web-разработчик (Frontend React / VK Team)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Санкт-Петербург / Москва / Удаленно",
    "channel": "@vk_team",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://internship.vk.company/vacancy",
    "applyUrl": "https://internship.vk.company/vacancy",
    "sourceChannel": "@vk_team",
    "description": "Оплачиваемая стажировка VK Team: создание веб-интерфейсов ВКонтакте, VK Видео и VK Мессенджера на стеке React, TypeScript и библиотеки VKUI.",
    "tags": [
      "React",
      "TypeScript",
      "VKUI",
      "VK Mini Apps",
      "VK Team"
    ]
  },
  {
    "id": "int-34",
    "companyId": "vk",
    "company": "VK (ВКонтакте)",
    "title": "Стажёр Data Scientist / ML Engineer (VK Team)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Санкт-Петербург / Москва / Гибрид",
    "channel": "@vk_team",
    "directionId": "data_science",
    "subTrackId": "ml",
    "url": "https://internship.vk.company/vacancy",
    "applyUrl": "https://internship.vk.company/vacancy",
    "sourceChannel": "@vk_team",
    "description": "Разработка рекомендательных систем ленты, клипов и музыки ВКонтакте. Обучение моделей ранжирования на огромных графах социальных связей.",
    "tags": [
      "Python",
      "PyTorch",
      "RecSys",
      "NLP",
      "VK Team",
      "BigData"
    ]
  },
  {
    "id": "int-35",
    "companyId": "tbank",
    "company": "Т-Банк",
    "title": "Стажёр Golang Backend-разработчик (Т-Банк Финтех)",
    "salary": "от 80 000 до 105 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@tbank_team",
    "directionId": "backend",
    "subTrackId": "golang",
    "url": "https://education.tbank.ru/start/go/",
    "applyUrl": "https://education.tbank.ru/start/go/",
    "sourceChannel": "@tbank_team",
    "description": "Разработка высокопроизводительных микросервисов платежного контура Т-Банка. Экстремальные нагрузки, строгая отказоустойчивость и менторская программа.",
    "tags": [
      "Go",
      "gRPC",
      "PostgreSQL",
      "Kafka",
      "Т-Банк Финтех"
    ]
  },
  {
    "id": "int-36",
    "companyId": "tbank",
    "company": "Т-Банк",
    "title": "Стажёр QA Automation Engineer (Java / Python / Т-Банк)",
    "salary": "от 65 000 до 85 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@tbank_team",
    "directionId": "qa",
    "subTrackId": "auto_qa",
    "url": "https://education.tbank.ru/start/java/",
    "applyUrl": "https://education.tbank.ru/start/java/",
    "sourceChannel": "@tbank_team",
    "description": "Автоматизация тестирования банковских платформ, инвестиций и мобильного банка. Создание надежных автотестов и интеграция в CI/CD.",
    "tags": [
      "QA Automation",
      "Java",
      "Python",
      "Rest-Assured",
      "Т-Банк"
    ]
  },
  {
    "id": "int-37",
    "companyId": "kontur",
    "company": "Контур",
    "title": "Стажёр QA-инженер (Контур.Старт 2026)",
    "salary": "от 60 000 до 80 000 ₽",
    "format": "Удаленно",
    "location": "Екатеринбург / Пермь / Удаленно",
    "channel": "@KonturTech",
    "directionId": "qa",
    "subTrackId": "manual_qa",
    "url": "https://kontur.ru/education/internship",
    "applyUrl": "https://kontur.ru/education/internship",
    "sourceChannel": "@KonturTech",
    "description": "Программа стажировки Контур.Старт 2026 для инженеров по тестированию. Тестирование веб-сервисов Диадок, Фокус и Бухгалтерия с персональным наставником.",
    "tags": [
      "Контур.Старт",
      "Manual QA",
      "Тест-дизайн",
      "API",
      "Контур"
    ]
  },
  {
    "id": "int-38",
    "companyId": "directum",
    "company": "Directum",
    "title": "Стажёр Backend C# / .NET Developer (Directum RX)",
    "salary": "от 60 000 до 85 000 ₽",
    "format": "Гибрид",
    "location": "Ижевск (Офис / Гибрид)",
    "channel": "@Life_in_Directum",
    "directionId": "backend",
    "subTrackId": "python",
    "url": "https://vk.com/student_directum",
    "applyUrl": "https://vk.com/student_directum",
    "sourceChannel": "@Life_in_Directum",
    "description": "Официальная программа стажировок Directum: разработка ядра интеллектуальной платформы управления цифровыми процессами и документами Directum RX в Ижевске под менторством экспертов.",
    "tags": [
      "Directum RX",
      "C#",
      ".NET Core",
      "PostgreSQL",
      "Ижевск",
      "Директум",
      "Стажировка"
    ],
    "isActive": false,
    "status": "closed"
  },
  {
    "id": "int-39",
    "companyId": "tbank",
    "company": "Т-Банк",
    "title": "Стажёр Java-разработчик (Т-Банк Финтех)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@tbank_team",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://education.tbank.ru/start/java/",
    "applyUrl": "https://education.tbank.ru/start/java/",
    "sourceChannel": "@tbank_team",
    "description": "Оплачиваемая финтех-стажировка Т-Банк Старт: разработка отказоустойчивых бэкенд-микросервисов на Java 21, Spring Boot 3 и Kafka для платежных и расчетных систем с ментором.",
    "tags": [
      "Java 21",
      "Spring Boot 3",
      "Kafka",
      "PostgreSQL",
      "Т-Банк Старт"
    ]
  },
  {
    "id": "int-40",
    "companyId": "yandex",
    "company": "Яндекс",
    "title": "Стажёр Frontend-разработчик (React / TypeScript)",
    "salary": "от 75 000 до 100 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Екатеринбург / Санкт-Петербург",
    "channel": "@yandex_intern",
    "directionId": "frontend",
    "subTrackId": "react",
    "url": "https://yandex.ru/yaintern/frontend/",
    "applyUrl": "https://yandex.ru/yaintern/frontend/",
    "sourceChannel": "@yandex_intern",
    "description": "Оплачиваемая стажировка в Яндексе (Young Con): разработка сложных интерфейсов сервисов Поиска, Маркета и Go на React, TypeScript, SSR и микрофронтендах.",
    "tags": [
      "React",
      "TypeScript",
      "Next.js",
      "Redux",
      "Яндекс Интерны"
    ]
  },
  {
    "id": "int-41",
    "companyId": "ozon",
    "company": "Ozon Tech",
    "title": "Junior / Intern C# Backend Developer (Ozon Camp)",
    "salary": "от 80 000 до 105 000 ₽",
    "format": "Удаленно",
    "location": "Москва / Удаленно",
    "channel": "@ozon_tech_career",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://job.ozon.ru/it/camp/csharp/",
    "applyUrl": "https://job.ozon.ru/it/camp/csharp/",
    "sourceChannel": "@ozon_tech_career",
    "description": "Программа Ozon Camp: разработка высоконагруженных распределенных сервисов финансовой платформы и фулфилмента на C# и .NET 8 с персональным наставником.",
    "tags": [
      "C#",
      ".NET 8",
      "ASP.NET Core",
      "Ozon Camp",
      "PostgreSQL",
      "Kafka"
    ]
  },
  {
    "id": "int-42",
    "companyId": "avito",
    "company": "Avito Tech",
    "title": "Стажёр-аналитик данных / Data Analyst (Авито Старт)",
    "salary": "от 75 000 до 95 000 ₽",
    "format": "Гибрид",
    "location": "Москва / Санкт-Петербург / Удаленно",
    "channel": "@avito_tech",
    "directionId": "data_science",
    "subTrackId": "analytics",
    "url": "https://start.avito.ru/analysts-internship",
    "applyUrl": "https://start.avito.ru/analysts-internship",
    "sourceChannel": "@avito_tech",
    "description": "Оплачиваемая программа стажировки Авито Старт для аналитиков данных: анализ пользовательского поведения, проведение A/B тестов, расчет продуктовых метрик и дашборды.",
    "tags": [
      "SQL",
      "Python",
      "A/B тесты",
      "Аналитика данных",
      "Авито Старт"
    ]
  },
  {
    "id": "int-43",
    "companyId": "vk",
    "company": "VK (ВКонтакте)",
    "title": "Стажёр Mobile-разработчик (Android / iOS / VK Team)",
    "salary": "от 70 000 до 90 000 ₽",
    "format": "Удаленно",
    "location": "Санкт-Петербург / Москва / Удаленно",
    "channel": "@vk_team",
    "directionId": "mobile",
    "subTrackId": "android",
    "url": "https://internship.vk.company/vacancy",
    "applyUrl": "https://internship.vk.company/vacancy",
    "sourceChannel": "@vk_team",
    "description": "Официальная программа стажировок VK Team: разработка ключевых фичей мобильных приложений ВКонтакте, VK Музыка и VK Видео на Kotlin и Swift под менторством экспертов.",
    "tags": [
      "Android",
      "Kotlin",
      "iOS",
      "Swift",
      "VK Team",
      "Стажировка"
    ]
  }
];

export const SEED_INTERNSHIPS = ALL_INTERNSHIPS;


// Target public channels for automated HTTP checking and parsing
export const MONITORED_TG_CHANNELS = [
  'tbank_team',
  'tbank_career',
  'tinkoff_jobs',
  'KonturTech',
  'kontur_career',
  'Life_in_Directum',
  'directum_career',
  't1career',
  't1_holding',
  'yandex_intern',
  'yandex',
  'ozon_tech_career',
  'sber_careers',
  'avito_tech',
  'vk_team',
  'forjunior',
  'it_internships',
  'normrabota',
  'tproger_jobs',
];

// Rich metadata for all monitored Telegram channels (verified real active channels)
export const ALL_TARGET_TG_CHANNELS = [
  // Крупнейшие живые Telegram-агрегаторы стажировок и Junior IT-вакансий
  { handle: '@young_june', companyId: 'aggregator', company: 'Young & Junior', name: 'Young & Junior — вакансии IT', category: 'Живой агрегатор Junior и стажировок в РФ', url: 'https://t.me/young_june' },
  { handle: '@juno_jobs', companyId: 'aggregator', company: 'junojobs', name: 'junojobs → стажировки в IT', category: 'Ежедневные подборки Junior и стажировок', url: 'https://t.me/juno_jobs' },
  { handle: '@yuniorapp', companyId: 'aggregator', company: 'Юниор', name: 'Юниор: стажировки и вакансии', category: 'Стажировки и вакансии для начинающих', url: 'https://t.me/yuniorapp' },
  { handle: '@young_intern', companyId: 'aggregator', company: 'Young Стажёр', name: 'Young Стажёр — подборки', category: 'Свежие стажировки для начинающих', url: 'https://t.me/young_intern' },
  { handle: '@jun_jobs', companyId: 'aggregator', company: 'Junior Jobs', name: 'Junior IT Jobs & Internships', category: 'Вакансии Ozon Tech, hh.ru и прямо в TG', url: 'https://t.me/jun_jobs' },
  { handle: '@stazhirovki_it', companyId: 'aggregator', company: 'Стажировки в IT', name: 'Стажировки в IT', category: 'Прямые стажировки со ссылками на hh.ru', url: 'https://t.me/stazhirovki_it' },
  { handle: '@junior_it_jobs', companyId: 'aggregator', company: 'Junior IT Jobs', name: 'Junior Вакансии / Работа в IT', category: 'Junior-позиции с прямыми ссылками', url: 'https://t.me/junior_it_jobs' },
  { handle: '@junior_vacancies', companyId: 'aggregator', company: 'Junior Vacancies', name: 'Вакансии и стажировки для начинающих', category: 'Разработка, QA и аналитика', url: 'https://t.me/junior_vacancies' },
  { handle: '@careerspace', companyId: 'aggregator', company: 'Careerspace', name: 'Careerspace — IT и Digital', category: 'Вакансии от проверенных IT-компаний', url: 'https://t.me/careerspace' },
  { handle: '@geekjobs', companyId: 'aggregator', company: 'GeekJob', name: 'Job in IT & Digital', category: 'IT-вакансии с прямыми откликами', url: 'https://t.me/geekjobs' },
  { handle: '@itjobsfeed', companyId: 'aggregator', company: 'Jobs Feed', name: 'Jobs Feed IT & Digital', category: 'Прямые IT-вакансии в Telegram', url: 'https://t.me/itjobsfeed' },
  { handle: '@itjobs_ru', companyId: 'aggregator', company: 'IT Jobs Russia', name: 'IT Jobs Russia', category: 'IT-вакансии по РФ', url: 'https://t.me/itjobs_ru' },
  { handle: '@normrabota', companyId: 'aggregator', company: 'Норм работа', name: 'Норм работа: Стажировки и Junior', category: 'Оплачиваемые стажировки и стартапы', url: 'https://t.me/normrabota' },
  { handle: '@habr_career', companyId: 'aggregator', company: 'Хабр Карьера', name: 'Хабр Карьера', category: 'Официальный канал Хабр Карьеры', url: 'https://t.me/habr_career' },
  // Официальные карьерные Telegram-каналы IT-компаний РФ
  { handle: '@avito_career', companyId: 'avito', company: 'Авито', name: 'Avito Career', category: 'Официальный карьерный канал Авито', url: 'https://t.me/avito_career' },
  { handle: '@ozoncamp', companyId: 'ozon', company: 'Ozon Tech', name: 'Ozon Camp & Стажировки', category: 'Стажировки в Ozon Tech', url: 'https://t.me/ozoncamp' },
  { handle: '@ozon_tech', companyId: 'ozon', company: 'Ozon Tech', name: 'Ozon Tech', category: 'Инженерный канал Ozon Tech', url: 'https://t.me/ozon_tech' },
  { handle: '@tbank_team', companyId: 'tbank', company: 'Т-Банк', name: 'Работа в Т-Банке', category: 'Стажировки и карьера в Т-Банке', url: 'https://t.me/tbank_team' },
  { handle: '@t1career', companyId: 't1', company: 'Холдинг Т1', name: 'Команда T1', category: 'Интенсивы и карьера в Т1', url: 'https://t.me/t1career' },
  { handle: '@KonturTech', companyId: 'kontur', company: 'СКБ Контур', name: 'Технологии в Контуре', category: 'Контур.Старт & Junior IT', url: 'https://t.me/KonturTech' },
  { handle: '@Life_in_Directum', companyId: 'directum', company: 'Directum', name: 'Жизнь в Directum (Ижевск)', category: 'Разработка Directum RX в Ижевске', url: 'https://t.me/Life_in_Directum' },
  { handle: '@yandex_intern', companyId: 'yandex', company: 'Яндекс', name: 'Яндекс для стажёров', category: 'Young Con & Интерны', url: 'https://t.me/yandex_intern' },
];

// Target career websites and employer open portals
export const CAREER_WEBSITES_DATA = [
  {
    id: 'site-directum',
    companyId: 'directum',
    company: 'Directum',
    name: 'Карьерный портал Directum (Ижевск)',
    url: 'https://career.directum.ru/',
    category: 'Прямой карьерный сайт вендора Directum RX',
    type: 'direct_site',
    city: 'Ижевск',
  },
  {
    id: 'site-kontur',
    companyId: 'kontur',
    company: 'СКБ Контур',
    name: 'Контур.Старт & Вакансии СКБ Контур',
    url: 'https://kontur.ru/education/internship',
    category: 'Официальный студенческий портал карьеры Контура',
    type: 'direct_site',
    city: 'Екатеринбург / Удаленно',
  },
  {
    id: 'site-tbank',
    companyId: 'tbank',
    company: 'Т-Банк',
    name: 'Т-Банк Финтех Старт',
    url: 'https://education.tbank.ru/start/',
    category: 'Официальные стажировки Т-Банка',
    type: 'direct_site',
    city: 'Москва / Удаленно',
  },
  {
    id: 'site-t1',
    companyId: 't1',
    company: 'Холдинг Т1',
    name: 'Открытая школа Т1 & Карьера',
    url: 'https://career.t1.ru/vacancies/',
    category: 'Официальный образовательный интенсив Т1',
    type: 'direct_site',
    city: 'Москва / Удаленно',
  },
  {
    id: 'habr-directum',
    companyId: 'directum',
    company: 'Directum',
    name: 'Хабр Карьера: Directum',
    url: 'https://career.habr.com/companies/directum/vacancies',
    category: 'Открытый профиль работодателя Directum (Ижевск)',
    type: 'habr_career',
    city: 'Ижевск / Удаленно',
  },
  {
    id: 'habr-kontur',
    companyId: 'kontur',
    company: 'СКБ Контур',
    name: 'Хабр Карьера: СКБ Контур',
    url: 'https://career.habr.com/companies/kontur/vacancies',
    category: 'Открытый профиль работодателя СКБ Контур',
    type: 'habr_career',
    city: 'Екатеринбург / Удаленно',
  },
  {
    id: 'habr-tbank',
    companyId: 'tbank',
    company: 'Т-Банк',
    name: 'Хабр Карьера: Т-Банк',
    url: 'https://career.habr.com/companies/tinkoff/vacancies',
    category: 'Открытый профиль работодателя Т-Банк',
    type: 'habr_career',
    city: 'Москва / Удаленно',
  },
  {
    id: 'habr-t1',
    companyId: 't1',
    company: 'Холдинг Т1',
    name: 'Хабр Карьера: Холдинг Т1',
    url: 'https://career.habr.com/companies/t1-group/vacancies',
    category: 'Открытый профиль работодателя Холдинг Т1',
    type: 'habr_career',
    city: 'Москва / Удаленно',
  },
  {
    id: 'habr-yandex',
    companyId: 'yandex',
    company: 'Яндекс',
    name: 'Хабр Карьера: Яндекс',
    url: 'https://career.habr.com/companies/yandex/vacancies',
    category: 'Открытый профиль работодателя Яндекс',
    type: 'habr_career',
    city: 'Москва / Гибрид',
  },
  {
    id: 'habr-ozon',
    companyId: 'ozon',
    company: 'Ozon Tech',
    name: 'Хабр Карьера: Ozon',
    url: 'https://career.habr.com/companies/ozon/vacancies',
    category: 'Открытый профиль работодателя Ozon Tech',
    type: 'habr_career',
    city: 'Москва / Удаленно',
  },
  {
    id: 'habr-sber',
    companyId: 'sber',
    company: 'Сбер',
    name: 'Хабр Карьера: Сбер',
    url: 'https://career.habr.com/companies/sber/vacancies',
    category: 'Открытый профиль работодателя Сбер',
    type: 'habr_career',
    city: 'Москва / Офис',
  },
  {
    id: 'site-yandex',
    companyId: 'yandex',
    company: 'Яндекс',
    name: 'Яндекс Интерны & Young Con',
    url: 'https://yandex.ru/yaintern/',
    category: 'Официальный портал стажировок Яндекса',
    type: 'direct_site',
    city: 'Москва / Гибрид',
  },
  {
    id: 'site-ozon',
    companyId: 'ozon',
    company: 'Ozon Tech',
    name: 'Ozon Camp & Карьера в IT',
    url: 'https://job.ozon.ru/it/camp/',
    category: 'Официальный карьерный портал Ozon Tech',
    type: 'direct_site',
    city: 'Москва / Удаленно',
  },
  {
    id: 'site-sber',
    companyId: 'sber',
    company: 'Сбер',
    name: 'Сбер Карьера & SberSeasons',
    url: 'https://sbergraduate.ru/sberseasons-moscow/',
    category: 'Официальная программа стажировок Сбера',
    type: 'direct_site',
    city: 'Москва / Офис',
  },
  {
    id: 'site-avito',
    companyId: 'avito',
    company: 'Авито',
    name: 'Карьера в Avito Tech',
    url: 'https://start.avito.ru/internships',
    category: 'Официальная программа стажировок Авито',
    type: 'direct_site',
    city: 'Москва / Санкт-Петербург',
  },
];

// Tracking scan status
export const LAST_SCAN_STATUS = {
  lastScanAt: new Date().toISOString(),
  channelsChecked: ALL_TARGET_TG_CHANNELS.length,
  websitesChecked: CAREER_WEBSITES_DATA.length,
  parsedCount: 16,
  savedCount: 16,
  sentPushes: 0,
  totalActive: 16,
};

// Cache of already notified users to avoid duplicate notifications
const notifiedKeys = new Set();

// In-memory cache for pre-gzipped static assets to optimize TTFB and eliminate CPU spikes on Render
const staticGzipCache = new Map();

// HTTP Health Check and Parser API server for Koyeb / Cloud Web Service
export const server = http.createServer(async (req, res) => {
  // CORS headers for WebApp integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = (req.url || '/').split('?')[0];
  const normalizedPath = urlPath.replace(/\/+$/, '') || '/';

  if (
    normalizedPath === '/health' ||
    normalizedPath === '/healthz' ||
    normalizedPath === '/live' ||
    normalizedPath === '/ready'
  ) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        bot: BOT_USERNAME,
        channelsCount: ALL_TARGET_TG_CHANNELS.length,
        websitesCount: CAREER_WEBSITES_DATA.length,
        lastScan: LAST_SCAN_STATUS,
      })
    );
    return;
  }

  if (urlPath === '/status') {
    let vkInfo = { status: 'standby', bot: 'IT-Старт VK Бот' };
    try {
      const { getVkBotStatus } = await import('./vk_bot.mjs');
      vkInfo = getVkBotStatus();
    } catch {}

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'ok',
        bot: BOT_USERNAME,
        uptime: process.uptime(),
        companiesCount: COMPANIES_DATA.length,
        channelsCount: ALL_TARGET_TG_CHANNELS.length,
        websitesCount: CAREER_WEBSITES_DATA.length,
        lastScan: LAST_SCAN_STATUS,
        vk: vkInfo,
      })
    );
    return;
  }

  if (urlPath === '/scan' || urlPath === '/parse' || urlPath === '/sync') {
    const result = await scanChannelsAndSyncSupabase(true);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'scan_completed', result }));
    return;
  }

  if (urlPath === '/vacancies') {
    const vacancies = await getActiveInternships();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(vacancies));
    return;
  }

  if (urlPath === '/notify' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { chatId, text, platform, applyUrl, url, actionButton } = parsed;
        if (!chatId || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'chatId and text are required' }));
          return;
        }

        const isVkTarget = platform === 'vk' || String(chatId).startsWith('vk_');
        const directUrl = actionButton?.url || applyUrl || url;
        const actionLabel = actionButton?.text || (directUrl?.includes('t.me') ? '🔗 Открыть пост' : '🔗 Откликнуться');

        if (isVkTarget) {
          const { sendVkNotification, createVkKeyboard, VK_APP_ID, registerVkSubscriber, cleanVkPeerId } = await import('./vk_bot.mjs');
          const cleanPeerId = cleanVkPeerId(chatId);

          // Auto-register VK subscriber so future monitoring pushes also deliver
          registerVkSubscriber(cleanPeerId, { first_name: 'Пользователь VK' }).catch((e) =>
            console.warn('[Notify Auto-Sub]', e.message)
          );

          const keyboard = createVkKeyboard({
            inline: true,
            buttons: [
              [{ label: '🚀 Открыть в Mini App', app_id: VK_APP_ID }],
              ...(directUrl
                ? [[{ label: actionLabel || '🔗 Откликнуться на вакансию', link: directUrl }]]
                : [[{ label: '🌐 Веб-сайт', link: PUBLIC_WEB_URL }]]),
            ],
          });
          const vkRes = await sendVkNotification(cleanPeerId, text, { keyboard, checkPermission: false, applyUrl: directUrl });

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              success: vkRes.ok,
              messageId: vkRes.messageId,
              error: vkRes.error,
              errorCode: vkRes.errorCode,
            })
          );
          return;
        }

        const tgKeyboard = [
          [{ text: '🚀 Открыть IT-Старт', web_app: { url: WEBAPP_URL } }],
          ...(directUrl ? [[{ text: actionLabel || '🔗 Откликнуться на вакансию', url: directUrl }]] : [[{ text: '💬 Бот @' + BOT_USERNAME, url: `https://t.me/${BOT_USERNAME}` }]]),
        ];

        const tgRes = await callTelegram('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: tgKeyboard,
          },
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: tgRes.ok, messageId: tgRes.result?.message_id, error: tgRes.description }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/subscribe' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { chatId, username, firstName, directions, sub_tracks, platform } = parsed;
        const isActive = parsed.isActive !== false && parsed.is_active !== false;
        if (!chatId) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'chatId is required' }));
          return;
        }

        const isVkTarget = platform === 'vk' || String(chatId).startsWith('vk_');

        if (isVkTarget) {
          const { registerVkSubscriber, sendVkNotification, cleanVkPeerId } = await import('./vk_bot.mjs');
          const cleanPeerId = cleanVkPeerId(chatId);
          const sub = await registerVkSubscriber(cleanPeerId, {
            username,
            first_name: firstName,
            directions,
            sub_tracks,
            is_active: isActive,
          });

          // Deliver immediate confirmation push in VK only when notifications are enabled
          if (isActive) {
            sendVkNotification(
              cleanPeerId,
              `🎉 Уведомления IT-Старт ВКонтакте успешно активированы!\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `Вы первыми узнаете о новых оплачиваемых стажировках от ведущих работодателей под ваш стек.`
            ).catch(() => {});
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, subscriber: sub }));
          return;
        }

        const sub = await registerTgSubscriber(chatId, {
          username,
          first_name: firstName,
          directions,
          sub_tracks,
          is_active: isActive,
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, subscriber: sub }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/vk/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const { getVkBotStatus } = await import('./vk_bot.mjs');
      res.end(JSON.stringify(getVkBotStatus()));
    } catch {
      res.end(JSON.stringify({ status: 'standby', bot: 'IT-Старт VK Бот' }));
    }
    return;
  }

  if (urlPath === '/vk/latest-user') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const { getLatestVkUser } = await import('./vk_bot.mjs');
      const latest = await getLatestVkUser();
      res.end(JSON.stringify(latest));
    } catch (err) {
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (urlPath === '/vk/check-permission') {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const userId = parsedUrl.searchParams.get('user_id');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    try {
      const { isMessagesFromGroupAllowed } = await import('./vk_bot.mjs');
      const result = await isMessagesFromGroupAllowed(userId);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // -------------------------------------------------------------
  // Static Web File Serving for Render (Enables VPN-free access in Russia & VK Mini App)
  // -------------------------------------------------------------
  if (fs.existsSync(DIST_DIR)) {
    let cleanPath = urlPath.replace(/^\/it-start\/?/, '/');
    if (cleanPath === '' || cleanPath === '/') {
      cleanPath = '/index.html';
    }

    const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
    const candidateFile = path.join(DIST_DIR, safePath);

    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.txt': 'text/plain; charset=utf-8',
    };

    const CSP_FRAME_ANCESTORS =
      "frame-ancestors 'self' https://vk.com https://*.vk.com https://vk.ru https://*.vk.ru https://m.vk.com https://m.vk.ru https://vk-apps.com https://*.vk-apps.com https://mail.ru https://*.mail.ru https://telegram.org https://*.telegram.org https://web.telegram.org;";

    const serveStaticFile = (filePath, contentType, isImmutable, isHtml) => {
      try {
        const stat = fs.statSync(filePath);
        const mtime = stat.mtime.toUTCString();
        if (req.headers['if-modified-since'] === mtime) {
          res.writeHead(304);
          res.end();
          return;
        }

        const headers = {
          'Content-Type': contentType,
          'Last-Modified': mtime,
          'Cache-Control': isImmutable
            ? 'public, max-age=31536000, immutable'
            : isHtml
            ? 'no-cache, must-revalidate'
            : 'public, max-age=3600, must-revalidate',
        };

        if (isHtml) {
          headers['Content-Security-Policy'] = CSP_FRAME_ANCESTORS;
        }

        const acceptEncoding = req.headers['accept-encoding'] || '';
        const ext = path.extname(filePath).toLowerCase();
        const isCompressible = ['.js', '.mjs', '.css', '.html', '.json', '.svg', '.txt'].includes(ext);

        if (isCompressible && /\bgzip\b/.test(acceptEncoding)) {
          headers['Content-Encoding'] = 'gzip';
          headers['Vary'] = 'Accept-Encoding';

          const cacheKey = `${filePath}:${stat.mtimeMs}:${stat.size}`;
          let gzipped = staticGzipCache.get(cacheKey);
          if (!gzipped) {
            const rawContent = fs.readFileSync(filePath);
            gzipped = zlib.gzipSync(rawContent, { level: 6 });
            staticGzipCache.set(cacheKey, gzipped);
          }
          headers['Content-Length'] = gzipped.length;
          res.writeHead(200, headers);
          res.end(gzipped);
        } else {
          headers['Content-Length'] = stat.size;
          res.writeHead(200, headers);
          fs.createReadStream(filePath).pipe(res);
        }
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found\n');
      }
    };

    if (fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
      const ext = path.extname(candidateFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const isImmutableAsset = cleanPath.startsWith('/assets/');
      serveStaticFile(candidateFile, contentType, isImmutableAsset, ext === '.html');
      return;
    }

    // SPA Fallback: if not an asset request (no file extension), return dist/index.html
    const hasExtension = path.extname(cleanPath).length > 0;
    const indexHtml = path.join(DIST_DIR, 'index.html');
    if (!hasExtension && fs.existsSync(indexHtml)) {
      serveStaticFile(indexHtml, 'text/html; charset=utf-8', false, true);
      return;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end('IT-Старт Telegram & VK Bot & Parser работает 24/7! (Koyeb & Cloud Health Check OK)\n');
});

if (process.env.NODE_ENV !== 'test') {
  const isDirectRun =
    Boolean(process.argv[1]) &&
    !process.argv[1].includes('vk_bot') &&
    !process.argv[1].includes('sync') &&
    (path.basename(process.argv[1]) === 'bot.mjs' || path.basename(process.argv[1]) === 'bot.js');

  if (isDirectRun) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 HTTP сервер запущен на порту ${PORT} (Koyeb / Cloud Health Check & Parser API)`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[HTTP] Порт ${PORT} уже занят, процесс продолжает работу.`);
      } else {
        console.error('[HTTP Server Error]', err);
      }
    });

    // Graceful shutdown handling for container environments (Koyeb / Docker / Kubernetes)
    const gracefulShutdown = (signal) => {
      console.log(`[Shutdown] Получен сигнал ${signal}, корректное завершение работы сервиса...`);
      isRunning = false;
      try {
        import('./vk_bot.mjs')
          .then(({ stopVkBot }) => {
            try {
              stopVkBot();
            } catch {}
          })
          .catch(() => {});
      } catch {}

      if (server && server.listening) {
        server.close(() => {
          console.log('[Shutdown] HTTP сервер успешно закрыт.');
          process.exit(0);
        });
        setTimeout(() => {
          console.warn('[Shutdown] Принудительное завершение по таймауту.');
          process.exit(0);
        }, 5000).unref();
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Check if bot tokens are provided
    if (!BOT_TOKEN) {
      console.log('='.repeat(70));
      console.log('⚡ IT-Старт Telegram & VK Bot Runner');
      console.log('='.repeat(70));
      console.log('⚠️  Внимание: TELEGRAM_BOT_TOKEN не указан!');
      console.log('');
      console.log(`HTTP Health Check сервер продолжает работать на порту ${PORT} (Koyeb / Cloud Web Service).`);
      console.log('Чтобы бот отвечал в Telegram, укажите токен в переменных окружения Koyeb (Environment Variables):');
      console.log('  TELEGRAM_BOT_TOKEN=<ТОКЕН_БОТА>');
      console.log('Для VK-бота укажите:');
      console.log('  VK_BOT_TOKEN=<ТОКЕН_СООБЩЕСТВА_VK>');
      console.log('='.repeat(70));
    }
  }
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method, payload = {}) {
  if (!BOT_TOKEN) return { ok: false, description: 'BOT_TOKEN is missing' };
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/**
 * Detect direction and sub-track from vacancy title and body text
 */
export function detectVacancyTrack(title = '', text = '') {
  const combined = `${title} ${text}`.toLowerCase();

  if (
    combined.includes('react') ||
    combined.includes('frontend') ||
    combined.includes('фронтенд') ||
    combined.includes('typescript') ||
    combined.includes('vue') ||
    combined.includes('angular') ||
    combined.includes('веб-разработчик') ||
    combined.includes('web-разработчик')
  ) {
    const subTrackId = combined.includes('vue') ? 'vue' : combined.includes('angular') ? 'angular' : 'react';
    return { directionId: 'frontend', subTrackId };
  }

  if (
    combined.includes('qa') ||
    combined.includes('тестиров') ||
    combined.includes('тестирован') ||
    combined.includes('тест-инженер') ||
    combined.includes('quality assurance')
  ) {
    const subTrackId =
      combined.includes('auto') || combined.includes('автомат') || combined.includes('python')
        ? 'auto_qa'
        : 'manual_qa';
    return { directionId: 'qa', subTrackId };
  }

  if (
    combined.includes('devops') ||
    combined.includes('sre') ||
    combined.includes('kubernetes') ||
    combined.includes('docker') ||
    combined.includes('облак') ||
    combined.includes('cloud') ||
    combined.includes('инфраструктур') ||
    combined.includes('системный администратор')
  ) {
    const subTrackId = combined.includes('k8s') || combined.includes('kubernetes') ? 'k8s_iac' : 'cicd_docker';
    return { directionId: 'devops', subTrackId };
  }

  if (
    combined.includes('data science') ||
    combined.includes('ml') ||
    combined.includes('машинн') ||
    combined.includes('ai') ||
    combined.includes('аналитик') ||
    combined.includes('data engineer')
  ) {
    const subTrackId = combined.includes('ml') || combined.includes('машинн') ? 'ml' : 'analytics';
    return { directionId: 'data_science', subTrackId };
  }

  if (
    combined.includes('android') ||
    combined.includes('ios') ||
    combined.includes('flutter') ||
    combined.includes('мобильн') ||
    combined.includes('mobile')
  ) {
    const subTrackId = combined.includes('ios') ? 'ios' : combined.includes('flutter') ? 'flutter' : 'android';
    return { directionId: 'mobile', subTrackId };
  }

  if (combined.includes('java') || combined.includes('spring')) {
    return { directionId: 'backend', subTrackId: 'java' };
  }

  if (combined.includes('go') || combined.includes('golang')) {
    return { directionId: 'backend', subTrackId: 'golang' };
  }

  if (combined.includes('node') || combined.includes('nest') || combined.includes('express')) {
    return { directionId: 'backend', subTrackId: 'nodejs' };
  }

  return { directionId: 'backend', subTrackId: 'python' };
}

export const COMPANY_OFFICIAL_PORTALS = {
  tbank: 'https://education.tbank.ru/start/',
  kontur: 'https://kontur.ru/education/internship',
  directum: 'https://vk.com/student_directum',
  t1: 'https://career.t1.ru/vacancies/',
  yandex: 'https://yandex.ru/yaintern/',
  ozon: 'https://job.ozon.ru/it/camp/',
  sber: 'https://sbergraduate.ru/sberseasons-moscow/',
  avito: 'https://start.avito.ru/tech',
  vk: 'https://internship.vk.company/vacancy',
};

export function getCompanyKey(companyName = '') {
  const comp = findCompanyByQuery(companyName);
  if (comp) return comp.id;
  const c = companyName.toLowerCase();
  if (c.includes('т-банк') || c.includes('тинькофф') || c.includes('tbank') || c.includes('tinkoff')) return 'tbank';
  if (c.includes('контур') || c.includes('kontur')) return 'kontur';
  if (c.includes('directum') || c.includes('директ')) return 'directum';
  if (c.includes('т1') || c.includes('t1')) return 't1';
  if (c.includes('яндекс') || c.includes('yandex')) return 'yandex';
  if (c.includes('ozon') || c.includes('озон')) return 'ozon';
  if (c.includes('сбер') || c.includes('sber')) return 'sber';
  if (c.includes('авито') || c.includes('avito')) return 'avito';
  if (c.includes('vk') || c.includes('вконтакте')) return 'vk';
  return 'other';
}

export function getDirectVacancyPortalUrl(companyKey, directionId = undefined, fallback = 'https://vk.com/student_directum', subTrackId = undefined) {
  switch (companyKey) {
    case 'avito':
      if (directionId === 'data_science') {
        if (subTrackId === 'analytics') return 'https://start.avito.ru/analysts-internship';
        return 'https://start.avito.ru/datascience-internship';
      }
      return 'https://start.avito.ru/tech';
    case 'tbank':
      if (subTrackId === 'python') return 'https://education.tbank.ru/start/python/';
      if (subTrackId === 'java') return 'https://education.tbank.ru/start/java/';
      if (subTrackId === 'golang' || subTrackId === 'go') return 'https://education.tbank.ru/start/go/';
      if (subTrackId === 'ios') return 'https://education.tbank.ru/start/ios/';
      if (subTrackId === 'android') return 'https://education.tbank.ru/start/android/';
      if (directionId === 'frontend') return 'https://education.tbank.ru/start/frontend/';
      if (directionId === 'data_science') {
        if (subTrackId === 'ml') return 'https://education.tbank.ru/start/ml_engineer/';
        return 'https://education.tbank.ru/start/analyst/';
      }
      if (directionId === 'qa') return 'https://education.tbank.ru/start/quality_engineer/';
      if (directionId === 'devops') return 'https://education.tbank.ru/start/sre_engineer/';
      if (directionId === 'mobile') return 'https://education.tbank.ru/start/android/';
      if (directionId === 'backend') {
        if (subTrackId === 'java') return 'https://education.tbank.ru/start/java/';
        if (subTrackId === 'golang') return 'https://education.tbank.ru/start/go/';
        return 'https://education.tbank.ru/start/python/';
      }
      return 'https://education.tbank.ru/start/';
    case 'kontur':
      return 'https://kontur.ru/education/internship';
    case 'directum':
      return 'https://vk.com/student_directum';
    case 't1':
      return 'https://career.t1.ru/vacancies/';
    case 'yandex':
      if (directionId === 'frontend') return 'https://yandex.ru/yaintern/frontend/';
      if (directionId === 'mobile') return 'https://yandex.ru/yaintern/mobile/';
      if (directionId === 'data_science') return 'https://yandex.ru/yaintern/ml/';
      if (directionId === 'devops') return 'https://yandex.ru/yaintern/devops/';
      if (directionId === 'backend') return 'https://yandex.ru/yaintern/backend/';
      return 'https://yandex.ru/yaintern/';
    case 'ozon':
      if (directionId === 'frontend') return 'https://job.ozon.ru/it/camp/frontend/';
      if (directionId === 'qa') return 'https://job.ozon.ru/it/camp/qa/';
      if (directionId === 'mobile') return 'https://job.ozon.ru/it/camp/mobile/';
      if (directionId === 'backend') return 'https://job.ozon.ru/it/camp/golang/';
      return 'https://job.ozon.ru/it/camp/';
    case 'sber':
      if (directionId === 'backend') return 'https://sbergraduate.ru/sberseasons-moscow/java/';
      if (directionId === 'devops') return 'https://sbergraduate.ru/sberseasons-moscow/devops/';
      if (directionId === 'qa') return 'https://sbergraduate.ru/sberseasons-moscow/qa/';
      if (directionId === 'data_science') return 'https://sbergraduate.ru/sberseasons-moscow/ml/';
      return 'https://sbergraduate.ru/sberseasons-moscow/';
    case 'vk':
      return 'https://internship.vk.company/vacancy';
    default:
      return fallback;
  }
}

export function formatLocation(item) {
  if (!item) return 'Удаленно';
  const format = (item.format || '').trim();
  let rawLoc = (item.location || item.city || '').trim();
  if (!rawLoc) return format || 'Удаленно';
  if (!format) return rawLoc;
  if (rawLoc.toLowerCase() === format.toLowerCase()) return format;

  rawLoc = rawLoc.replace(/Санкт-Петербург/gi, 'СПб');

  if (rawLoc.includes('/')) {
    const parts = rawLoc.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 2) {
      return format === 'Удаленно' ? `${format} (РФ)` : `${format} (${parts[0]}+)`;
    }
    if (parts.length === 2) {
      return format === 'Удаленно' ? `${format} (РФ)` : `${format} (${parts.join(', ')})`;
    }
  }
  if (rawLoc.toLowerCase().includes(format.toLowerCase())) {
    return rawLoc;
  }
  return `${format} (${rawLoc})`;
}

export function formatSalary(salaryInput) {
  if (!salaryInput) return 'По договорённости';

  if (typeof salaryInput === 'object') {
    const from = salaryInput.from;
    const to = salaryInput.to;
    const amount = salaryInput.amount ?? salaryInput.value;
    const currency = salaryInput.currency;
    const numFrom =
      typeof from === 'number' && !isNaN(from)
        ? from
        : typeof from === 'string'
        ? parseInt(from.replace(/\D/g, ''), 10)
        : null;
    const numTo =
      typeof to === 'number' && !isNaN(to)
        ? to
        : typeof to === 'string'
        ? parseInt(to.replace(/\D/g, ''), 10)
        : null;
    const numAmount =
      typeof amount === 'number' && !isNaN(amount)
        ? amount
        : typeof amount === 'string'
        ? parseInt(amount.replace(/\D/g, ''), 10)
        : null;

    if (!numFrom && !numTo && !numAmount) return 'По договорённости';
    const currSymbol = !currency || currency === 'RUR' || currency === 'RUB' ? '₽' : currency;
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    if (numFrom && numTo) {
      if (numFrom === numTo) return `${fmt(numFrom)} ${currSymbol}`;
      return `от ${fmt(numFrom)} до ${fmt(numTo)} ${currSymbol}`;
    }
    if (numFrom) return `от ${fmt(numFrom)} ${currSymbol}`;
    if (numTo) return `до ${fmt(numTo)} ${currSymbol}`;
    if (numAmount) return `${fmt(numAmount)} ${currSymbol}`;
    return 'По договорённости';
  }

  const str = String(salaryInput).trim();
  const lower = str.toLowerCase();

  if (
    !str ||
    lower.includes('договор') ||
    lower.includes('оплачив') ||
    lower.includes('не указан') ||
    lower.includes('согласован') ||
    lower.includes('бесплатн') ||
    lower.includes('не оплачив') ||
    lower.includes('undefined') ||
    lower.includes('null')
  ) {
    return 'По договорённости';
  }

  const cleanFmtRegex =
    /^(?:от\s+\d{1,3}(?:\s\d{3})*(?:\s+до\s+\d{1,3}(?:\s\d{3})*)?|до\s+\d{1,3}(?:\s\d{3})*|\d{1,3}(?:\s\d{3})*)\s*₽$/;
  const normalizedSpaces = str.replace(/[\u00A0\s]+/g, ' ');
  if (cleanFmtRegex.test(normalizedSpaces)) {
    return normalizedSpaces;
  }

  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const rangeMatch = normalizedSpaces.match(
    /(?:от\s*)?(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?\s*(?:до|[-–—])\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i
  );
  if (rangeMatch) {
    let n1 = parseInt(rangeMatch[1].replace(/\s/g, ''), 10);
    let n2 = parseInt(rangeMatch[2].replace(/\s/g, ''), 10);
    if (n1 < 500) n1 *= 1000;
    if (n2 < 500) n2 *= 1000;
    if (n1 >= 10000 && n2 >= 10000) {
      if (n1 === n2) return `от ${fmt(n1)} ₽`;
      return `от ${fmt(n1)} до ${fmt(n2)} ₽`;
    }
  }

  const fromMatch = normalizedSpaces.match(/от\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i);
  if (fromMatch) {
    let n = parseInt(fromMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `от ${fmt(n)} ₽`;
  }

  const toMatch = normalizedSpaces.match(/до\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i);
  if (toMatch) {
    let n = parseInt(toMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `до ${fmt(n)} ₽`;
  }

  const singleMatch = normalizedSpaces.match(/(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?\s*(?:₽|руб)/i);
  if (singleMatch) {
    let n = parseInt(singleMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `${fmt(n)} ₽`;
  }

  return 'По договорённости';
}

export function resolveApplyUrl(rawUrl, companyName = '', sourceChannel = '', directionId = undefined, subTrackId = undefined) {
  const companyKey = getCompanyKey(companyName);
  const directPortal = getDirectVacancyPortalUrl(companyKey, directionId, undefined, subTrackId);

  const hasSpecificPostSource =
    sourceChannel && /^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(sourceChannel.trim());
  const fallbackDirect = hasSpecificPostSource ? sourceChannel.trim() : directPortal;

  if (!rawUrl || typeof rawUrl !== 'string') {
    if (sourceChannel) {
      const trimmedSource = sourceChannel.trim();
      if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmedSource)) {
        return trimmedSource;
      }
    }
    return directPortal;
  }

  const trimmed = rawUrl.trim();
  const lowerUrl = trimmed.toLowerCase();

  // Strictly reject ad click trackers
  if (lowerUrl.includes('adsrv.hh.ru')) {
    return fallbackDirect;
  }

  // 1. Direct Telegram post link
  if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return trimmed.split('?')[0];
  }
  if (/^t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return `https://${trimmed.split('?')[0]}`;
  }

  // 2. Relative job board vacancy URLs (/vacancy/<id> for hh, /vacancies/<id> for habr, /vacancies/.../<id> for avito)
  if (/^\/vacancy\/\d+/i.test(trimmed)) {
    return `https://hh.ru${trimmed.split('?')[0]}`;
  }
  if (/^\/vacancies\/\d+/i.test(trimmed)) {
    return `https://career.habr.com${trimmed.split('?')[0]}`;
  }
  if (/^\/vacancies\/[a-zA-Z0-9_-]+\/\d+\/?/i.test(trimmed)) {
    if (companyKey === 'avito' || trimmed.includes('20803') || trimmed.includes('20812') || trimmed.includes('20816')) {
      return fallbackDirect;
    }
    return `https://career.avito.com${trimmed.split('?')[0]}`;
  }

  // 3. Direct job boards with concrete vacancy ID (handles regional subdomains like samara.hh.ru!)
  const hhSubMatch = trimmed.match(/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?hh\.ru\/vacancy\/(\d+)/i);
  if (hhSubMatch) {
    return `https://hh.ru/vacancy/${hhSubMatch[1]}`;
  }

  const habrMatch = trimmed.match(/^(?:https?:\/\/)?career\.habr\.com\/vacancies\/(\d+)/i);
  if (habrMatch) {
    return `https://career.habr.com/vacancies/${habrMatch[1]}`;
  }

  const yjMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?youngjunior\.ru\/([^/?#]+\/jobs\/\d+)/i);
  if (yjMatch) {
    return `https://youngjunior.ru/${yjMatch[1]}`;
  }

  const csMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?careerspace\.app\/job\/(\d+)/i);
  if (csMatch) {
    return `https://careerspace.app/job/${csMatch[1]}`;
  }

  const gjMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?geekjob\.ru\/vacancy\/([a-zA-Z0-9]+)/i);
  if (gjMatch) {
    return `https://geekjob.ru/vacancy/${gjMatch[1]}`;
  }

  const gmMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?getmatch\.ru\/vacancies\/(\d+[^?#]*)/i);
  if (gmMatch) {
    return `https://getmatch.ru/vacancies/${gmMatch[1]}`;
  }

  const yaJobMatch = trimmed.match(/^(?:https?:\/\/)?yandex\.ru\/jobs\/vacancies\/([a-zA-Z0-9_-]+)/i);
  if (yaJobMatch) {
    return `https://yandex.ru/jobs/vacancies/${yaJobMatch[1]}`;
  }

  const ozTechMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?ozon\.tech\/vacancies\/([a-zA-Z0-9_-]+)/i);
  if (ozTechMatch) {
    return `https://ozon.tech/vacancies/${ozTechMatch[1]}`;
  }

  const hireHiMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?hirehi\.ru\/([a-z0-9_-]+\/[a-z0-9_-]+)/i);
  if (hireHiMatch) {
    return `https://hirehi.ru/${hireHiMatch[1]}`;
  }

  if (
    /^https?:\/\/career\.t1\.ru\/debut\/internship\/[a-z0-9_-]+/i.test(trimmed) ||
    /^https?:\/\/career\.t1\.ru\/vacancies\/vacancy-detail\?id=\d+/i.test(trimmed) ||
    /^https?:\/\/kontur\.ru\/education\/internship(?:[#/].*)?$/i.test(trimmed)
  ) {
    return trimmed;
  }

  // 4. Shorteners and non-career aggregators
  if (
    trimmed.includes('bit.ly') ||
    trimmed.includes('vk.cc') ||
    trimmed.includes('clck.ru') ||
    trimmed.includes('vc.ru') ||
    trimmed.includes('timepad.ru') ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('digital')
  ) {
    return fallbackDirect;
  }

  // 5. Eliminate generic search and root URLs that dump users into general search
  const lower = trimmed.toLowerCase();
  const isGenericSearchOrRoot =
    lower.includes('?search=') ||
    lower.includes('&search=') ||
    lower.includes('?direction=') ||
    lower.includes('&direction=') ||
    lower.includes('?text=') ||
    lower.includes('/search/') ||
    lower.includes('/vacancies/?') ||
    lower.includes('/vacancies?') ||
    // Avito generic & non-internship pages
    lower === 'https://career.avito.com/' ||
    lower === 'https://career.avito.com' ||
    lower === 'https://avito.ru/' ||
    lower === 'https://avito.ru' ||
    lower === 'https://www.avito.ru/' ||
    lower === 'https://www.avito.ru' ||
    lower === 'https://career.avito.com/vacancies' ||
    lower === 'https://career.avito.com/vacancies/' ||
    lower.includes('career.avito.com/internship') ||
    lower.includes('career.avito.com/students') ||
    lower.includes('career.avito.com/start') ||
    // Stale / senior / regular roles that must NEVER be shown as internships:
    lower.includes('/vacancies/razrabotka/20803') ||
    lower.includes('/vacancies/razrabotka/20812') ||
    lower.includes('/vacancies/analitika-dannykh/20816') ||
    lower.includes('/vacancies/razrabotka/20805') ||
    lower.includes('/vacancies/razrabotka/20808') ||
    // Directum generic & empty vacancy list pages
    lower === 'https://career.directum.ru/' ||
    lower === 'https://career.directum.ru' ||
    lower === 'https://career.directum.ru/vacancy' ||
    lower === 'https://career.directum.ru/vacancy/' ||
    lower.includes('career.directum.ru/vacancy') ||
    lower.includes('lead_product_owner') ||
    lower.includes('business_bevelopment') ||
    lower.includes('rukovoditel_proektov') ||
    lower.includes('inzhener_po_informacionnoj_bezopasnosti') ||
    // Kontur generic
    lower === 'https://kontur.ru/career/' ||
    lower === 'https://kontur.ru/career' ||
    lower === 'https://kontur.ru/career/vacancies' ||
    lower === 'https://kontur.ru/career/vacancies/' ||
    // T1 generic
    lower === 'https://career.t1.ru/' ||
    lower === 'https://career.t1.ru' ||
    lower.includes('t1.ru/school') ||
    // Yandex generic
    lower === 'https://yandex.ru/jobs/' ||
    lower === 'https://yandex.ru/jobs' ||
    lower.includes('yabackend') ||
    // Ozon generic
    lower === 'https://job.ozon.ru/it/' ||
    lower === 'https://job.ozon.ru/it' ||
    lower === 'https://job.ozon.ru/' ||
    lower === 'https://job.ozon.ru' ||
    // Sber generic
    lower === 'https://sbergraduate.ru/' ||
    lower === 'https://sbergraduate.ru' ||
    lower === 'https://sbergraduate.ru/sberseasons-moscow/' ||
    lower === 'https://sbergraduate.ru/sberseasons-moscow' ||
    // Obsolete employer links that must be rerouted to live verified portals
    lower.includes('kontur.ru/career/vacancies/intern-') ||
    /education\.tbank\.ru\/start\/sre\/?$/i.test(lower) ||
    lower.includes('fintech.tbank.ru') ||
    lower.includes('/vacancy/web-developer') ||
    lower.includes('/vacancy/backend-csharp') ||
    lower.includes('/vacancy/qa-engineer') ||
    lower.includes('/vacancies/java-developer') ||
    lower.includes('/vacancies/devops-engineer') ||
    lower.includes('/vacancies/qa-automation') ||
    lower.includes('/internship/web') ||
    lower.includes('/internship/backend') ||
    lower.includes('/internship/qa') ||
    lower.includes('/internship/data') ||
    lower.includes('/internship/mobile') ||
    lower.includes('yandex.ru/jobs/pages/internship') ||
    // T-Bank generic
    lower === 'https://education.tbank.ru' ||
    lower === 'https://education.tbank.ru/' ||
    lower === 'https://education.tbank.ru/start' ||
    lower === 'https://education.tbank.ru/start/' ||
    lower === 'https://fintech.tbank.ru' ||
    lower === 'https://fintech.tbank.ru/' ||
    lower === 'https://fintech.tbank.ru/start' ||
    lower === 'https://fintech.tbank.ru/start/' ||
    lower === 'https://www.tbank.ru/career/it/' ||
    lower === 'https://www.tbank.ru/career/it' ||
    lower === 'https://tbank.ru/career/it/' ||
    lower === 'https://tbank.ru/career/it' ||
    // VK generic
    lower === 'https://internship.vk.company/' ||
    lower === 'https://internship.vk.company' ||
    // HH generic
    lower === 'https://hh.ru' ||
    lower === 'https://hh.ru/' ||
    lower.startsWith('https://hh.ru/search') ||
    // Habr generic
    lower === 'https://career.habr.com' ||
    lower === 'https://career.habr.com/' ||
    lower.startsWith('https://career.habr.com/companies/');

  if (isGenericSearchOrRoot) {
    return fallbackDirect;
  }

  // 6. Bare telegram channel without post number
  if (trimmed.startsWith('@') || /^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/i.test(trimmed)) {
    return fallbackDirect;
  }

  // 7. Direct company vacancy detail page with actual vacancy slug or ID
  if (
    trimmed.includes('/yaintern/') ||
    trimmed.includes('start.avito.ru/') ||
    trimmed.includes('career.t1.ru/vacancies') ||
    trimmed.includes('internship.vk.company/internship') ||
    trimmed.includes('internship.vk.company/vacancy') ||
    trimmed.includes('education.tbank.ru/start/') ||
    trimmed.includes('/camp/') ||
    trimmed.includes('/intern-') ||
    trimmed.includes('/students') ||
    trimmed.includes('/sberseasons-moscow/ml/') ||
    trimmed.includes('/sberseasons-moscow/java/') ||
    trimmed.includes('/sberseasons-moscow/devops/') ||
    trimmed.includes('/sberseasons-moscow/qa/')
  ) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  }

  // 8. General absolute vacancy ID pattern (e.g. https://domain.com/vacancies/<category>/<number>/)
  if (/^https?:\/\/[^/]+\/vacancies\/[a-zA-Z0-9_-]+\/\d+\/?/i.test(trimmed)) {
    if (trimmed.includes('20803') || trimmed.includes('20812') || trimmed.includes('20816') || trimmed.includes('avito')) {
      return fallbackDirect;
    }
    return trimmed;
  }

  return fallbackDirect;
}

export const COMPANY_OFFICIAL_CHANNELS = {
  tbank: '@tbank_team',
  kontur: '@KonturTech',
  directum: '@Life_in_Directum',
  t1: '@t1career',
  yandex: '@yandex_intern',
  ozon: '@ozon_tech_career',
  sber: '@sber_careers',
  avito: '@avito_tech',
  vk: '@vk_team',
};

export const AGGREGATOR_TG_HANDLES = new Set([
  'young_june',
  'juno_jobs',
  'yuniorapp',
  'young_intern',
  'jun_jobs',
  'stazhirovki_it',
  'junior_it_jobs',
  'junior_vacancies',
  'careerspace',
  'geekjobs',
  'itjobs_ru',
  'normrabota',
  'myresume_ru',
  'itjobsfeed',
  'yotolabqa',
]);

export function parseTelegramSource(rawSource = '', companyName = '') {
  const str = String(rawSource || '').trim();
  const fullPostMatch = str.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)\/(\d+)/i);
  if (fullPostMatch) {
    const clean = fullPostMatch[1];
    return {
      channelHandle: `@${clean}`,
      channelUrl: `https://t.me/${clean}`,
      postUrl: `https://t.me/${clean}/${fullPostMatch[2]}`,
      postId: fullPostMatch[2],
    };
  }
  const handlePostMatch = str.match(/^@?([a-zA-Z0-9_]+)\/(\d+)$/);
  if (handlePostMatch) {
    const clean = handlePostMatch[1];
    return {
      channelHandle: `@${clean}`,
      channelUrl: `https://t.me/${clean}`,
      postUrl: `https://t.me/${clean}/${handlePostMatch[2]}`,
      postId: handlePostMatch[2],
    };
  }
  const channelHandle = resolveChannelHandle(rawSource, companyName);
  return {
    channelHandle,
    channelUrl: `https://t.me/${channelHandle.replace(/^@/, '')}`,
  };
}

export function isDirectVacancyUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
  if (
    lower.includes('adsrv.hh.ru') ||
    lower.includes('?search=') ||
    lower.includes('/search/') ||
    lower.includes('kontur.ru/career/students') ||
    lower.includes('career.t1.ru/debut/open-school')
  ) {
    return false;
  }

  return (
    /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?hh\.ru\/vacancy\/\d+/i.test(trimmed) ||
    /^https?:\/\/career\.habr\.com\/vacancies\/\d+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?youngjunior\.ru\/[^/?#]+\/jobs\/\d+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?careerspace\.app\/job\/\d+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?geekjob\.ru\/vacancy\/[a-zA-Z0-9]+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?getmatch\.ru\/vacancies\/\d+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?ozon\.tech\/vacancies\/[a-zA-Z0-9_-]+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?hirehi\.ru\/[a-z0-9_-]+\/[a-z0-9_-]+/i.test(trimmed) ||
    /^https?:\/\/yandex\.ru\/jobs\/vacancies\/[a-zA-Z0-9_-]+/i.test(trimmed) ||
    /^https?:\/\/yandex\.ru\/yaintern\/[a-z_-]+\/?$/i.test(trimmed) ||
    /^https?:\/\/education\.tbank\.ru\/start\/[a-z0-9_-]+\/?$/i.test(trimmed) ||
    /^https?:\/\/career\.t1\.ru\/debut\/internship\/[a-z0-9_-]+/i.test(trimmed) ||
    /^https?:\/\/career\.t1\.ru\/vacancies\/vacancy-detail\?id=\d+/i.test(trimmed) ||
    /^https?:\/\/kontur\.ru\/education\/internship(?:[#/].*)?$/i.test(trimmed) ||
    /^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed) ||
    /^https?:\/\/career\.avito\.com\/vacancies\/[a-zA-Z0-9_-]+\/\d+/i.test(trimmed) ||
    /^https?:\/\/internship\.vk\.company\/vacancy\/\d+/i.test(trimmed) ||
    /^https?:\/\/career\.directum\.ru\/vacancy\/[a-zA-Z0-9_-]+/i.test(trimmed)
  );
}

export function resolveChannelHandle(channel, companyName = '') {
  const normalizedInput = channel
    ? String(channel).trim().replace(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)\/\d+.*$/i, '@$1').replace(/^@?([a-zA-Z0-9_]+)\/\d+$/, '@$1')
    : undefined;

  if (normalizedInput) {
    const cleanRaw = String(normalizedInput).trim().replace(/^@/, '');
    if (AGGREGATOR_TG_HANDLES.has(cleanRaw.toLowerCase())) {
      return `@${cleanRaw}`;
    }
  }

  const compKey = getCompanyKey(companyName);
  const officialChannel = COMPANY_OFFICIAL_CHANNELS[compKey];

  if (officialChannel) {
    if (!normalizedInput) return officialChannel;

    const clean = String(normalizedInput).trim().replace(/^@/, '');
    const lower = clean.toLowerCase();

    if (compKey === 'tbank' && (lower === 'tbank_start' || lower === 'tinkoff_jobs' || lower === 'tbank_career')) {
      return '@tbank_team';
    }
    if (compKey === 'kontur' && (lower === 'kontur_career' || lower === 'konturtech')) {
      return '@KonturTech';
    }
    if (compKey === 'directum' && (lower === 'directum_career' || lower === 'directum_careers' || lower === 'life_in_directum')) {
      return '@Life_in_Directum';
    }
    if (compKey === 't1' && (lower === 't1_holding' || lower === 't1career')) {
      return '@t1career';
    }
    if (compKey === 'yandex' && (lower === 'yaintern' || lower === 'yandex_jobs' || lower === 'yandex_intern')) {
      return '@yandex_intern';
    }
    if (compKey === 'ozon' && (lower === 'ozontech' || lower === 'ozon_career' || lower === 'ozon_tech_career' || lower === 'ozoncamp')) {
      return '@ozon_tech_career';
    }
    if (compKey === 'sber' && (lower === 'sbercareers' || lower === 'sber_tech' || lower === 'sbergraduate' || lower === 'sber_careers')) {
      return '@sber_careers';
    }
    if (compKey === 'avito' && (lower === 'avito_career' || lower === 'avitocareer' || lower === 'avito_jobs' || lower === 'avito_tech')) {
      return '@avito_tech';
    }
    if (compKey === 'vk' && (lower === 'vkteam' || lower === 'vk_internship' || lower === 'vk_team')) {
      return '@vk_team';
    }

    return officialChannel;
  }

  if (!normalizedInput) return '@IT_start_izh_bot';

  const clean = normalizedInput.trim().replace(/^@/, '');
  const lower = clean.toLowerCase();

  if (lower.includes('.') || lower.includes('/')) {
    return '@IT_start_izh_bot';
  }

  return `@${clean}`;
}

export function isStrictVacancyPost(title = '', text = '') {
  const titleLower = title.toLowerCase();
  const combined = `${title} ${text}`.toLowerCase();

  // 1. Strict STOP WORDS (PR, news, celebrations, contests, courses, conferences, video clips, outages)
  const stopWords = [
    'девушки в', 'девушек в',
    'подкаст', 'podcast',
    'опрос', 'голосован', 'голосуйте',
    'вебинар', 'митап', 'meetup', 'круглый стол',
    'поздравл', 'с 8 марта', 'с новым годом', 'с праздником',
    'итоги года', 'розыгрыш', 'дарим', 'мерч', 'футболк',
    'статья на хабр', 'vc.ru', 'habr.com/ru/articles',
    'какая ide', 'какую ide',
    'сегодня важный день', 'нужно только рассказать',
    'где-то ходит один', 'отменяет плату',
    'конкурс школьниц', 'школьниц', 'авиация начинается',
    'всего за 10 недель', 'за 10 недель', 'за 3 месяца', 'курс с нуля',
    'записаться на курс', 'скидка на обучение', 'гарантия трудоустройства',
    'первая линия поддержки', 'холодные звонки', 'исходящие звонки',
    'продажа кредитов', 'оформление полисов', 'первичной документации',
    // Events, games, battles, conferences, video clips, spam, and system outages
    'батл для', 'архитектурная игра', 'архитектурный батл', 'батл разработчиков',
    'dotnext', 'highload', 'joker conf', 'holyjs', 'конференц', 'по следам нашей поездки',
    'сделали ролик', 'посмотрите ролик', 'видеоролик', 'прогуляйтесь по конфе',
    'доля доступных файлов', 'доступ к файлам', 'работают все базовые функции диска',
    'сбой в работе', 'восстановление сервиса',
    'научу собирать', 'чат-ботов по шаблону', 'как пазлы', 'заработал 9 000',
    'трафик-менеджер', 'арбитражн', 'рецепты успеха', 'откладываете ли вы деньги'
  ];

  for (const stop of stopWords) {
    if (combined.includes(stop)) {
      return false;
    }
  }

  // 2. Non-IT roles in title or specific non-tech title keywords
  const nonItTitles = [
    'продаж', 'продавец', 'кассир', 'ритейл', 'торговый',
    'call-центр', 'колл-центр', 'коллцентр', 'телемаркетинг',
    'саппорт', 'support', 'поддержк', 'выездного сервиса', 'сервисный центр', 'в мастерскую',
    'ремонт техники', 'помощник тестировщика', 'тестировщика техники', 'тестировщик оборудования',
    'специалист по работе с клиентами', 'lead generation', 'лидогенерац',
    'юрист', 'юрисконсульт', 'правовед', 'адвокат', 'судебн', 'комплаенс',
    'бухгалтер', 'экономист', 'аудитор', 'налогов', 'первичк',
    'страхование', 'страхован', 'осаго', 'каско', 'андеррайтер',
    'водитель', 'курьер', 'экспедитор', 'склад', 'кладовщик', 'комплектовщик', 'грузчик',
    'мерчендайзер', 'повар', 'уборщик', 'клининг', 'охрана', 'охранник', 'фасовщик',
    'маркетинг', 'маркетолог', 'таргетолог', 'контекстолог', 'копирайтер', 'smm', 'смм', 'пиар', 'seo', 'видеокреатор',
    'контент-мейкер', 'видеограф', 'журналист', 'медицинский отдел', 'экологи', 'маркировщик',
    'супервайзер', 'оператор ввода',
    'ux/ui', 'ui/ux', 'веб-дизайнер', 'графический дизайнер', 'продуктовый дизайнер', 'гейм-дизайнер',
    'партнерств', 'partnerships', 'аккаунт-менеджер',
    'рекрутер', 'recruitment', 'подбор персонала', 'ресёрчер', 'ресечер', 'hr-', 'hr ',
    'администратор', 'офис-менеджер', 'дежурной смены', 'дежурн',
    'модератор', 'модерация', 'фрод-мониторинг', 'фрод', 'антифрод',
    'недвижимост', 'риск-менеджер', 'риск менеджер',
    'менеджер проектов', 'project manager', 'продакт-менеджер', 'product manager', 'scrum-мастер', 'менеджер по запуску',
    'кипиа', 'кип и а', 'инженер-конструктор', '1с', '1c ', 'sap abap',
    'информационной безопасности', 'информационная безопасность', 'инфобез'
  ];

  for (const nonIt of nonItTitles) {
    if (titleLower.includes(nonIt)) {
      return false;
    }
  }

  // 3. Reject senior / middle / lead / architect roles unless explicitly an internship / junior
  const isSeniorOrLeadOrMiddle =
    titleLower.includes('старший') ||
    titleLower.includes('senior') ||
    titleLower.includes('сеньор') ||
    titleLower.includes('руководитель') ||
    titleLower.includes('lead') ||
    titleLower.includes('head of') ||
    titleLower.includes('главный инженер') ||
    titleLower.includes('middle') ||
    titleLower.includes('мидл') ||
    titleLower.includes('миддл') ||
    titleLower.includes('ведущий') ||
    titleLower.includes('архитектор') ||
    titleLower.includes('architect');

  const hasExplicitJuniorOrIntern =
    titleLower.includes('стаж') ||
    titleLower.includes('junior') ||
    titleLower.includes('джун') ||
    titleLower.includes('intern') ||
    titleLower.includes('trainee') ||
    titleLower.includes('младш');

  if (isSeniorOrLeadOrMiddle && !hasExplicitJuniorOrIntern) {
    return false;
  }

  // 4. Must indicate IT / engineering direction or technical skills
  const techKeywords = [
    'разработчик', 'developer', 'инженер', 'engineer',
    'программист', 'тестиров', 'qa', 'devops', 'sre',
    'frontend', 'фронтенд', 'backend', 'бэкенд', 'fullstack',
    'python', 'java', 'c#', '.net', 'golang', 'go', 'react', 'vue', 'angular',
    'javascript', 'typescript', 'sql', 'postgresql', 'docker', 'kubernetes',
    'android', 'ios', 'kotlin', 'swift', 'data science', 'ml', 'machine learning',
    'data analyst', 'аналитик данных', 'продуктовый аналитик', 'системный аналитик',
    'data engineer', 'инженер данных', 'flutter', 'nlp', 'prompt'
  ];
  if (!techKeywords.some((k) => combined.includes(k))) return false;

  // 5. Must indicate trainee / junior / internship program
  const roleKeywords = [
    'стаж', 'стажировк', 'intern', 'trainee',
    'junior', 'джуниор', 'джун', 'младш',
    'открытая школа', 'школа разработк', 'контур.старт', 'контур старт',
    'ozon camp', 'sberseasons', 'авито старт', 'avito start', 'young con',
    'для студентов', 'студенческая практика', 'практикант'
  ];
  if (!roleKeywords.some((k) => combined.includes(k))) return false;

  return true;
}

export function isVacancyActive(item) {
  if (!item) return false;
  if (item.isActive === false || item.is_active === false) return false;
  const statusLower = (item.status || '').toLowerCase();
  if (
    statusLower === 'closed' ||
    statusLower === 'archived' ||
    statusLower === 'expired' ||
    statusLower === 'inactive'
  ) {
    return false;
  }

  const exp = item.expiresAt || item.expires_at;
  if (exp) {
    const expTime = new Date(exp).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) return false;
  }

  const url = (item.applyUrl || item.source_url || item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combinedText = `${title} ${desc}`;

  if (
    combinedText.includes('вакансия закрыта') ||
    combinedText.includes('в архиве') ||
    combinedText.includes('в архив') ||
    combinedText.includes('архивн') ||
    combinedText.includes('набор закрыт') ||
    combinedText.includes('набор завершен') ||
    combinedText.includes('набор завершён') ||
    combinedText.includes('прием заявок окончен') ||
    combinedText.includes('приём заявок окончен')
  ) {
    return false;
  }

  if (
    url.includes('/vacancies/razrabotka/20803') ||
    url.includes('/vacancies/razrabotka/20812') ||
    url.includes('/vacancies/analitika-dannykh/20816') ||
    url.includes('/vacancies/razrabotka/20805') ||
    url.includes('/vacancies/razrabotka/20808')
  ) {
    return false;
  }

  const compLower = (item.company || '').toLowerCase();
  // Kontur broken students link is still blocked, while live /education/internship is allowed when active
  if (url.includes('kontur.ru/career/students')) {
    return false;
  }
  if ((compLower.includes('контур') || compLower.includes('kontur')) && url.includes('kontur.ru/career/') && item.isActive !== true) {
    return false;
  }
  if (compLower.includes('directum') || compLower.includes('директум')) {
    if (
      title.includes('frontend') ||
      title.includes('веб-разработчик') ||
      title.includes('web-разработчик') ||
      url.includes('career.directum.ru/vacancy') ||
      url.includes('lead_product_owner')
    ) {
      if (item.isActive !== true) {
        return false;
      }
    }
  }

  const isAggregator = (item.id || '').startsWith('hh-') || url.includes('hh.ru');
  if (isAggregator) {
    const KNOWN_CLOSED_HH_IDS = [
      '139656665', '139621206', '138386223', '139486039', '138439076',
      '138762873', '139548242', '136870562', '139408637', '139265845',
      '139081220', '138848517', '136870560', '139350426', '138896406',
      '138600055', '138000233', '138843300', '139311364', '138103037',
      '137690459', '138120436', '138892012', '137608896', '138187404',
      '138543206', '138490688', '138745106', '138741112', '138722040'
    ];
    if (
      KNOWN_CLOSED_HH_IDS.some(
        (closedId) => url.includes(closedId) || (item.id || '').includes(closedId)
      )
    ) {
      return false;
    }

    const pub = item.publishedAt || item.published_at;
    if (pub) {
      const pubTime = new Date(pub).getTime();
      if (!isNaN(pubTime)) {
        const ageMs = Date.now() - pubTime;
        const maxAgeMs = 45 * 24 * 60 * 60 * 1000;
        if (ageMs > maxAgeMs) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Parse company and clean title from a digest vacancy anchor string such as:
 * "Стажер разработчик (Python) в МТС" or "QA Manual Trainee (Andersen)"
 */
function extractTitleAndCompany(anchorText, fallbackCompany = 'IT-Компания') {
  let cleanText = String(anchorText || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern 1: "... в Компания" or "... в ООО Компания" or "... в TG @channel"
  const inMatch = cleanText.match(/^(.+?)\s+в\s+([^,]+?)$/i);
  if (inMatch && inMatch[1].length >= 4 && inMatch[2].length >= 2) {
    let comp = inMatch[2].trim();
    if (/^tg\s*@/i.test(comp)) {
      comp = comp.replace(/^tg\s*/i, '');
    }
    return { title: inMatch[1].trim(), company: comp };
  }

  // Pattern 2: "... / Компания"
  const slashMatch = cleanText.match(/^(.+?)\s+\/\s+([^/]{2,40})$/);
  if (slashMatch && slashMatch[1].length >= 6) {
    return { title: slashMatch[1].trim(), company: slashMatch[2].trim() };
  }

  return { title: cleanText, company: fallbackCompany };
}

/**
 * Normalizes a direct job link extracted from a post or website.
 * Rejects tracking/invite/ad links (adsrv.hh.ru, t.me/+, sofi-assistant, etc.).
 */
function normalizeDirectJobHref(rawHref) {
  if (!rawHref) return null;
  const href = rawHref.replace(/&amp;/g, '&').trim();
  const lower = href.toLowerCase();

  if (
    lower.includes('adsrv.hh.ru') ||
    lower.includes('t.me/+') ||
    lower.includes('t.me/ads') ||
    lower.includes('sofi-assistant') ||
    lower.includes('anketolog') ||
    lower.includes('l.mts.ru') ||
    lower.includes('vc.ru') ||
    lower.includes('habr.com/ru/articles')
  ) {
    return null;
  }

  const hhM = href.match(/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?hh\.ru\/vacancy\/(\d+)/i);
  if (hhM) return `https://hh.ru/vacancy/${hhM[1]}`;

  const habrM = href.match(/^(?:https?:\/\/)?career\.habr\.com\/vacancies\/(\d+)/i);
  if (habrM) return `https://career.habr.com/vacancies/${habrM[1]}`;

  const yjM = href.match(/^(?:https?:\/\/)?(?:www\.)?youngjunior\.ru\/([^/?#]+\/jobs\/\d+)/i);
  if (yjM) return `https://youngjunior.ru/${yjM[1]}`;

  const csM = href.match(/^(?:https?:\/\/)?(?:www\.)?careerspace\.app\/job\/(\d+)/i);
  if (csM) return `https://careerspace.app/job/${csM[1]}`;

  const gjM = href.match(/^(?:https?:\/\/)?(?:www\.)?geekjob\.ru\/vacancy\/([a-zA-Z0-9]+)/i);
  if (gjM) return `https://geekjob.ru/vacancy/${gjM[1]}`;

  const gmM = href.match(/^(?:https?:\/\/)?(?:www\.)?getmatch\.ru\/vacancies\/(\d+[^?#]*)/i);
  if (gmM) return `https://getmatch.ru/vacancies/${gmM[1]}`;

  const yaJobMatch = href.match(/^(?:https?:\/\/)?yandex\.ru\/jobs\/vacancies\/([a-zA-Z0-9_-]+)/i);
  if (yaJobMatch) return `https://yandex.ru/jobs/vacancies/${yaJobMatch[1]}`;

  const ozTechMatch = href.match(/^(?:https?:\/\/)?(?:www\.)?ozon\.tech\/vacancies\/([a-zA-Z0-9_-]+)/i);
  if (ozTechMatch) return `https://ozon.tech/vacancies/${ozTechMatch[1]}`;

  const hireHiMatch = href.match(/^(?:https?:\/\/)?(?:www\.)?hirehi\.ru\/([a-z0-9_-]+\/[a-z0-9_-]+)/i);
  if (hireHiMatch) return `https://hirehi.ru/${hireHiMatch[1]}`;

  const avM = href.match(/^(?:https?:\/\/)?career\.avito\.com\/vacancies\/([a-zA-Z0-9_-]+\/\d+)/i);
  if (avM && !avM[1].includes('20803') && !avM[1].includes('20812') && !avM[1].includes('20816')) {
    return `https://career.avito.com/vacancies/${avM[1]}/`;
  }

  return null;
}

function getNextJan31Iso() {
  const now = new Date();
  let year = now.getFullYear();
  let candidate = new Date(Date.UTC(year, 0, 31, 20, 59, 59));
  if (candidate.getTime() < now.getTime() - 86400000) {
    year += 1;
    candidate = new Date(Date.UTC(year, 0, 31, 20, 59, 59));
  }
  return candidate.toISOString();
}

function detectDeadlineFromText(text = '') {
  const norm = String(text || '').replace(/&nbsp;/g, ' ').toLowerCase();
  const m = norm.match(/(?:при[её]м\s+заявок|набор|дедлайн|заполните\s+форму(?:\s+ниже)?|до)\s+(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))/i);
  if (m) {
    const MONTHS = {
      января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
      июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
    };
    const parts = m[1].trim().split(/\s+/);
    const day = parseInt(parts[0], 10);
    const month = MONTHS[parts[1]];
    if (!isNaN(day) && month !== undefined) {
      const now = new Date();
      let year = now.getFullYear();
      let candidate = new Date(Date.UTC(year, month, day, 20, 59, 59));
      if (candidate.getTime() < now.getTime() - 86400000) {
        year += 1;
        candidate = new Date(Date.UTC(year, month, day, 20, 59, 59));
      }
      const deadlineText = `до ${day} ${parts[1]}`;
      return {
        recruitmentType: 'scheduled',
        applicationDeadline: deadlineText,
        deadlineNote: `Приём заявок ${deadlineText}`,
        expiresAt: candidate.toISOString(),
      };
    }
  }
  return {
    recruitmentType: 'constant',
    applicationDeadline: 'Круглый год',
    deadlineNote: 'Постоянный круглогодичный набор',
  };
}

/**
 * Parse public Telegram channel web preview (https://t.me/s/<channel>)
 * Supports BOTH digest posts (multiple vacancy anchors inside one post) AND single vacancy posts.
 */
export async function parseChannelPosts(channelHandle, companyInfo) {
  try {
    const cleanHandle = channelHandle.replace(/^@/, '');
    const url = `https://t.me/s/${cleanHandle}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    if (!html.includes('data-post=')) return [];

    const posts = [];
    const postBlocks = html.split(/<div class="tgme_widget_message\b/i);
    const maxAgeMs = 45 * 24 * 60 * 60 * 1000;

    for (let i = 1; i < postBlocks.length; i++) {
      const block = postBlocks[i];
      const postSlugMatch = block.match(/data-post="([^"]+)"/);
      const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const timeMatch = block.match(/<time datetime="([^"]+)"/);

      if (!postSlugMatch || !textMatch) continue;

      const postSlug = postSlugMatch[1];
      const publishedAt = timeMatch ? timeMatch[1] : new Date().toISOString();

      // Skip posts older than 45 days to guarantee freshness
      const pubTime = new Date(publishedAt).getTime();
      if (!isNaN(pubTime) && Date.now() - pubTime > maxAgeMs) {
        continue;
      }

      const rawHtmlText = textMatch[1];
      const text = rawHtmlText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .trim();

      const textLower = text.toLowerCase();
      const postUrl = `https://t.me/${postSlug}`;

      // Collect ALL concrete job board anchors inside this post
      const anchorMatches = [...rawHtmlText.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const directJobAnchors = [];
      for (const m of anchorMatches) {
        const directUrl = normalizeDirectJobHref(m[1]);
        if (!directUrl) continue;
        const anchorText = m[2]
          .replace(/<[^>]+>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        directJobAnchors.push({ url: directUrl, text: anchorText });
      }

      // A) DIGEST POST: 2+ direct vacancy links in a single message
      if (directJobAnchors.length >= 2) {
        let digestFormat = 'Удаленно';
        if (textLower.includes('в офис')) digestFormat = 'Офис';
        else if (textLower.includes('гибрид')) digestFormat = 'Гибрид';

        let digestLocation = 'Москва / Удаленно';
        if (digestFormat === 'Удаленно') digestLocation = 'Удаленно';

        for (const anchor of directJobAnchors) {
          if (!anchor.text || anchor.text.toLowerCase().includes('откликнуться')) continue;

          const { title: parsedTitle, company: parsedCompany } = extractTitleAndCompany(anchor.text, companyInfo.name || 'IT-Компания');
          const cleanTitle = parsedTitle.length > 75 ? parsedTitle.slice(0, 72) + '...' : parsedTitle;

          // Inject "стажер" context from digest heading if title itself doesn't explicitly say junior/intern
          const contextText = `стажер junior ${digestFormat} ${anchor.text}`;
          if (!isStrictVacancyPost(cleanTitle, contextText)) continue;

          const { directionId, subTrackId } = detectVacancyTrack(cleanTitle, contextText);
          const compObj = findCompanyByQuery(parsedCompany);
          const companyName = compObj ? compObj.name : parsedCompany;
          const companyId = compObj ? compObj.id : (companyInfo.id || 'aggregator');
          const urlSlugId = anchor.url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

          posts.push({
            id: `tg-${urlSlugId}`,
            companyId,
            company: companyName,
            title: cleanTitle,
            salary: 'По договорённости',
            format: digestFormat,
            location: digestLocation,
            channel: '@' + cleanHandle,
            sourceChannel: '@' + cleanHandle,
            directionId,
            subTrackId,
            url: anchor.url,
            applyUrl: anchor.url,
            postUrl,
            sourcePostUrl: postUrl,
            publishedAt,
            description: `Вакансия из Telegram-канала @${cleanHandle}: ${cleanTitle} (${companyName}).`,
            tags: [companyName, subTrackId.toUpperCase(), 'Telegram', 'Стажировка'],
            sourceType: 'telegram',
            recruitmentType: 'constant',
            applicationDeadline: 'Круглый год',
            isActive: true,
          });
        }
        continue;
      }

      // B) SINGLE VACANCY POST: 0 or 1 external job link
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      let firstLine = (lines[0] || '').replace(/^[^\p{L}\p{N}#]+/u, '').trim();
      let isLinkOnlyPost = false;

      // For structured single cards starting with `#вакансия ...`, look for `Вакансия: ...`
      const structuredTitleLine = lines.find((l) => /^вакансия\s*:/i.test(l));
      if (structuredTitleLine) {
        firstLine = structuredTitleLine.replace(/^вакансия\s*:/i, '').trim();
      } else if (/^https?:\/\//i.test(firstLine) && directJobAnchors[0]?.url) {
        const nonUrlLine = lines.find((l) => !/^https?:\/\//i.test(l) && !l.startsWith('#'));
        if (nonUrlLine) {
          firstLine = nonUrlLine.replace(/^[^\p{L}\p{N}]+/u, '').trim();
        } else if (
          directJobAnchors[0].url.includes('ozon.tech/vacancies/') ||
          directJobAnchors[0].url.includes('hh.ru/vacancy/') ||
          directJobAnchors[0].url.includes('hirehi.ru/')
        ) {
          // Link-only post (e.g. @jun_jobs); verifyVacancyUrlLive will fetch the real title/company!
          isLinkOnlyPost = true;
          firstLine = directJobAnchors[0].url.includes('ozon.tech')
            ? 'Стажёр / Junior разработчик в Ozon Tech'
            : 'Junior / Стажёр IT-разработчик';
        }
      } else if (firstLine.startsWith('#') && lines[1]) {
        firstLine = lines[1].replace(/^[^\p{L}\p{N}]+/u, '').trim();
      }

      if (!firstLine) continue;
      const { title: rawCleanTitle, company: extractedCompany } = extractTitleAndCompany(firstLine, companyInfo.name || 'IT-Компания');
      const title = rawCleanTitle.length > 75 ? rawCleanTitle.slice(0, 72) + '...' : rawCleanTitle;

      if (!isLinkOnlyPost && !isStrictVacancyPost(title, text)) {
        continue;
      }

      let applyUrl = directJobAnchors[0]?.url || null;
      if (!applyUrl) {
        // Accept direct Telegram post ONLY if it contains real contact/application instructions (not empty news)
        const hasApplyInstructions =
          /@[a-zA-Z0-9_]{4,}/.test(text) ||
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) ||
          textLower.includes('резюме') ||
          textLower.includes('отклик') ||
          textLower.includes('пишите');

        if (!hasApplyInstructions) continue;
        applyUrl = postUrl;
      }

      // Extract structured company line if present (`Компания: ...`)
      let finalCompany = extractedCompany;
      const structuredComp = lines.find((l) => /^[^a-zа-яё]*компания(?:\s*\/\s*проект)?\s*:/i.test(l));
      if (structuredComp) {
        finalCompany = structuredComp.replace(/^[^:]+:/, '').trim() || finalCompany;
      }
      if (applyUrl.includes('ozon.tech/vacancies/')) finalCompany = 'Ozon Tech';
      const compObj = findCompanyByQuery(finalCompany);
      const companyId = compObj ? compObj.id : (companyInfo.id || 'aggregator');
      const companyName = compObj ? compObj.name : finalCompany;

      const { directionId, subTrackId } = detectVacancyTrack(title, text);

      let format = 'Удаленно';
      if (textLower.includes('гибрид') || textLower.includes('hybrid')) format = 'Гибрид';
      else if (textLower.includes('офис') || textLower.includes('office')) format = 'Офис';

      let location = 'Москва / Удаленно';
      if (companyId === 'directum' || textLower.includes('ижевск')) location = 'Ижевск / Удаленно';
      else if (textLower.includes('екатеринбург')) location = 'Екатеринбург / Удаленно';
      else if (textLower.includes('санкт-петербург') || textLower.includes('питер') || textLower.includes('спб')) location = 'Санкт-Петербург / Удаленно';
      else if (format === 'Удаленно') location = 'Удаленно';

      let salary = 'По договорённости';
      const salaryMatch = text.match(/(?:от\s*(\d+[\s\d]*)|до\s*(\d+[\s\d]*)|(\d+[\s\d]*))\s*(?:₽|руб|тыс|RUR)/i);
      if (salaryMatch) {
        salary = formatSalary(salaryMatch[0].trim());
      }

      const deadlineMeta = detectDeadlineFromText(text);
      const postId = directJobAnchors[0]?.url
        ? directJobAnchors[0].url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 48)
        : postSlug.replace('/', '-');

      posts.push({
        id: `tg-${postId}`,
        companyId,
        company: companyName,
        title,
        salary,
        format,
        location,
        channel: '@' + cleanHandle,
        sourceChannel: '@' + cleanHandle,
        directionId,
        subTrackId,
        url: applyUrl,
        applyUrl,
        postUrl,
        sourcePostUrl: postUrl,
        publishedAt,
        description: text.slice(0, 320) + (text.length > 320 ? '...' : ''),
        tags: [companyName, subTrackId.toUpperCase(), 'Telegram', 'Стажировка'],
        sourceType: 'telegram',
        needsTitleEnrichment: isLinkOnlyPost,
        ...deadlineMeta,
        isActive: true,
      });
    }

    return posts;
  } catch (err) {
    console.warn(`[Parser] Ошибка парсинга @${channelHandle}:`, err.message);
    return [];
  }
}

/**
 * Scan all monitored Telegram channels (official target employers & aggregators)
 */
export async function parseTelegramChannels() {
  console.log(`[Parser] ⚡ Запуск параллельного сканирования ${ALL_TARGET_TG_CHANNELS.length} Telegram-каналов...`);

  const results = await Promise.allSettled(
    ALL_TARGET_TG_CHANNELS.map(async (ch) => {
      try {
        const posts = await parseChannelPosts(ch.handle, {
          id: ch.companyId,
          name: ch.company,
          shortName: ch.company,
        });
        if (posts.length > 0) {
          console.log(`[Parser] @${ch.handle.replace('@', '')} — спарсено ${posts.length} вакансий`);
          return posts;
        }
      } catch (err) {
        console.warn(`[Parser] @${ch.handle} — ${err.message}`);
      }
      return [];
    })
  );

  const parsed = [];
  const seenUrls = new Set();
  for (const item of results) {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
      for (const v of item.value) {
        const normUrl = (v.applyUrl || v.url || '').toLowerCase();
        if (normUrl && !seenUrls.has(normUrl)) {
          seenUrls.add(normUrl);
          parsed.push(v);
        }
      }
    }
  }

  return parsed;
}

export const PORTAL_FALLBACK_VACANCIES = [];

/**
 * Verifies a single vacancy URL live over HTTP and enriches metadata from schema.org JobPosting / DOM.
 * Returns { ok: boolean, reason?: string, enriched?: Partial<Internship> }
 */
export async function verifyVacancyUrlLive(item) {
  const url = (item.applyUrl || item.url || '').trim();
  if (!isDirectVacancyUrl(url)) {
    return { ok: false, reason: 'non_direct_url' };
  }

  // Strip URL hash before server HTTP request
  const urlWithoutHash = url.split('#')[0];

  // Heavy SPA pages (3MB+ JS bundles like yandex.ru/yaintern/*) verify cleanly & fast via HTTP HEAD
  if (/^https?:\/\/yandex\.ru\/yaintern\/[a-z_-]+\/?$/i.test(urlWithoutHash)) {
    try {
      const headRes = await fetch(urlWithoutHash, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (headRes.ok) {
        return {
          ok: true,
          enriched: {
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            recruitmentType: 'constant',
            applicationDeadline: 'Круглый год',
          },
        };
      }
      return { ok: false, reason: `http_${headRes.status}` };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  // Telegram single posts (t.me/channel/123) verify against t.me/channel/123?embed=1
  let fetchUrl = urlWithoutHash;
  const tgMatch = urlWithoutHash.match(/^https?:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/i);
  if (tgMatch) {
    fetchUrl = `https://t.me/${tgMatch[1]}/${tgMatch[2]}?embed=1`;
  }

  try {
    let res;
    try {
      res = await fetch(fetchUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
        signal: AbortSignal.timeout(8500),
      });
    } catch (firstErr) {
      if (String(firstErr?.message || '').toLowerCase().includes('abort') || String(firstErr?.message || '').toLowerCase().includes('timeout')) {
        await new Promise((r) => setTimeout(r, 700));
        res = await fetch(fetchUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept-Language': 'ru-RU,ru;q=0.9',
          },
          signal: AbortSignal.timeout(9500),
        });
      } else {
        throw firstErr;
      }
    }

    if (res.status === 404 || res.status === 410 || res.status >= 500) {
      return { ok: false, reason: `http_${res.status}` };
    }
    if (res.status === 403 && !url.includes('tbank.ru') && !url.includes('kontur.ru') && !url.includes('ozon.tech')) {
      return { ok: false, reason: 'http_403' };
    }

    const html = await res.text();
    const low = html.toLowerCase();
    const normalizedHtml = html.replace(/&nbsp;|\u00a0/gi, ' ');

    // Recognize Kontur ServicePipe challenge (domain is alive 200 in user's browser)
    if (url.includes('kontur.ru/education/internship') && (html.includes('sp-static.kontur.host') || res.status === 200)) {
      return { ok: true, enriched: { isVerified: true, verifiedAt: new Date().toISOString() } };
    }

    // Reject soft-404 on T-Bank
    if (url.includes('education.tbank.ru') && (low.includes('404 |') || low.includes('страница не найдена'))) {
      return { ok: false, reason: 'tbank_404' };
    }

    // Common dead/closed page indicators
    if (
      low.includes('запрашиваемая страница не существует') ||
      low.includes('tgme_widget_message_error') ||
      (low.includes('страница не найдена') && !low.includes('ваканси'))
    ) {
      return { ok: false, reason: 'not_found_content' };
    }

    // Specific HH.ru archive check
    if (url.includes('hh.ru/vacancy/')) {
      if (html.includes('vacancy-archive-description') || !html.includes('vacancy-response-link')) {
        return { ok: false, reason: 'hh_archived' };
      }
    }

    // Specific Habr Career archive check
    if (url.includes('career.habr.com/vacancies/')) {
      if (low.includes('вакансия в архиве') || low.includes('вакансия закрыта')) {
        return { ok: false, reason: 'habr_archived' };
      }
    }

    // Specific portal closed checks
    if (
      url.includes('start.avito.ru') ||
      url.includes('sbergraduate.ru') ||
      url.includes('internship.vk.company')
    ) {
      if (
        low.includes('набор закрыт') ||
        low.includes('приём заявок до 30 августа') ||
        low.includes('скоро тут что-то будет')
      ) {
        return { ok: false, reason: 'portal_closed' };
      }
    }

    // Try extracting rich JobPosting JSON-LD metadata
    const enriched = { isVerified: true, verifiedAt: new Date().toISOString() };
    const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld.validThrough) {
          const validTime = new Date(ld.validThrough).getTime();
          if (!isNaN(validTime) && validTime < Date.now()) {
            return { ok: false, reason: 'expired_validThrough' };
          }
          enriched.expiresAt = ld.validThrough;
        }
        if (ld.title && typeof ld.title === 'string' && !ld.title.toLowerCase().includes('young')) {
          enriched.title = ld.title.trim();
        }
        if (ld.hiringOrganization?.name && !/^tg\s*@/i.test(ld.hiringOrganization.name)) {
          const rawOrg = ld.hiringOrganization.name.replace(/\. IT$/, '').trim();
          const compObj = findCompanyByQuery(rawOrg);
          enriched.company = compObj ? compObj.name : rawOrg;
          enriched.companyId = compObj ? compObj.id : item.companyId;
        }
        if (ld.jobLocationType === 'TELECOMMUTE') {
          enriched.format = 'Удаленно';
        }
        if (ld.jobLocation?.address?.addressLocality) {
          const city = ld.jobLocation.address.addressLocality;
          enriched.location = enriched.format === 'Удаленно' ? `${city} / Удаленно` : city;
        }
        if (ld.baseSalary?.value) {
          const v = ld.baseSalary.value;
          const salObj = {
            from: v.minValue || (v.value && !v.maxValue ? v.value : undefined),
            to: v.maxValue,
            amount: v.value,
            currency: ld.baseSalary.currency || 'RUB',
          };
          const fmt = formatSalary(salObj);
          if (fmt !== 'По договорённости') enriched.salary = fmt;
        }
        if (ld.description && typeof ld.description === 'string') {
          const cleanDesc = ld.description
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanDesc.length > 40) {
            enriched.description = cleanDesc.slice(0, 320) + (cleanDesc.length > 320 ? '...' : '');
          }
        }
        if (ld.datePosted) {
          enriched.publishedAt = ld.datePosted;
        }
      } catch {}
    }

    // Fallback DOM title enrichment for link-only TG posts (e.g. @jun_jobs -> hh.ru / ozon.tech / hirehi.ru)
    if (item.needsTitleEnrichment && !enriched.title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
      const extractedHeading = (h1Match?.[1] || ogTitleMatch?.[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*[-|—]\s*(?:Ozon Tech|Вакансия).*$/i, '')
        .trim();
      if (extractedHeading && extractedHeading.length >= 4) {
        enriched.title = extractedHeading.slice(0, 80);
      }
    }

    // T-Bank Start deadline detection directly from live HTML
    if (url.includes('education.tbank.ru/start/')) {
      if (normalizedHtml.includes('31 января')) {
        enriched.recruitmentType = 'scheduled';
        enriched.applicationDeadline = 'до 31 января';
        enriched.deadlineNote = 'Заявка до 31 января • Экзамен 25–31 января';
        enriched.expiresAt = getNextJan31Iso();
      } else if (!item.recruitmentType) {
        enriched.recruitmentType = 'constant';
        enriched.applicationDeadline = 'Круглый год';
        enriched.deadlineNote = 'Постоянный набор / запись на ближайший поток';
      }
    }

    // Fallback HH.ru salary from DOM
    if (url.includes('hh.ru/vacancy/') && !enriched.salary) {
      const hhSal = html.match(/data-qa="vacancy-salary"[^>]*>([\s\S]*?)<\/span>/);
      if (hhSal) {
        const cleanSal = hhSal[1].replace(/<[^>]+>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim();
        const fmt = formatSalary(cleanSal);
        if (fmt !== 'По договорённости') enriched.salary = fmt;
      }
    }

    return { ok: true, enriched };
  } catch (err) {
    const causeCode = err?.cause?.code || err?.message || '';
    if (
      (String(causeCode).includes('SELF_SIGNED_CERT_IN_CHAIN') || String(causeCode).includes('UNABLE_TO_VERIFY')) &&
      (url.includes('.ru/') || url.includes('.tbank.ru/'))
    ) {
      return { ok: true, enriched: { isVerified: true, verifiedAt: new Date().toISOString() } };
    }
    return { ok: false, reason: err.message };
  }
}

/**
 * Live parsing of target employer career websites, hh.ru, Habr Career API, & Yandex Jobs API
 */
export async function parseCareerWebsites() {
  console.log(`[Parser] 🌐 Запуск парсинга карьерных сайтов и официальных источников (${CAREER_WEBSITES_DATA.length} источников)...`);

  const parsed = [];

  // 1. Directum Career Portal (https://career.directum.ru/vacancy)
  try {
    const res = await fetch('https://career.directum.ru/vacancy', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      const items = [...html.matchAll(/<div class="vacancy-item__content js-vacancy-item">([\s\S]*?)<\/div>\s*<\/div>/g)];

      for (const it of items) {
        const linkMatch = it[1].match(/<a href="([^"]+)" class="vacancy-link">([^<]+)<\/a>/);
        const cityMatch = it[1].match(/data-city="([^"]+)"/);

        if (linkMatch) {
          const rawTitle = linkMatch[2].trim();
          const href = linkMatch[1];
          let city = 'Ижевск';
          if (cityMatch) {
            city = cityMatch[1].replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
          }

          if (!isStrictVacancyPost(rawTitle, '')) continue;
          const { directionId, subTrackId } = detectVacancyTrack(rawTitle);
          const rawUrl = href.startsWith('http') ? href : `https://career.directum.ru${href}`;

          if (!isDirectVacancyUrl(rawUrl)) continue;
          parsed.push({
            id: `site-directum-${href.replace(/[^a-zA-Z0-9_-]/g, '')}`,
            companyId: 'directum',
            company: 'Directum',
            title: rawTitle,
            salary: 'По договорённости',
            format: city.toLowerCase().includes('удал') ? 'Удаленно' : 'Гибрид',
            location: city.includes('Ижевск') ? 'Ижевск (Офис / Гибрид)' : city,
            channel: 'career.directum.ru',
            sourceChannel: 'career.directum.ru',
            directionId,
            subTrackId,
            url: rawUrl,
            applyUrl: rawUrl,
            publishedAt: new Date().toISOString(),
            description: `Официальная вакансия Directum в Ижевске: развитие платформы Directum RX.`,
            tags: ['Directum RX', 'Ижевск', subTrackId.toUpperCase()],
            sourceType: 'portal',
            isActive: true,
          });
        }
      }
      console.log(`[Parser] career.directum.ru — спарсено ${parsed.length} вакансий`);
    }
  } catch (err) {
    console.warn('[Parser] Ошибка парсинга career.directum.ru:', err.message);
  }

  // 1.1 Avito Career Portal (direct vacancy links)
  try {
    const res = await fetch('https://career.avito.com/vacancies/?search=стажер', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      const items = [...html.matchAll(/<a[^>]+href="(\/vacancies\/[a-zA-Z0-9_-]+\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/g)];
      let count = 0;
      const seen = new Set();
      for (const it of items) {
        const rawTitle = it[2].replace(/<[^>]+>/g, '').trim();
        const href = it[1];
        if (!rawTitle || seen.has(href)) continue;
        seen.add(href);

        if (!isStrictVacancyPost(rawTitle, '')) continue;
        const rawUrl = href.startsWith('http') ? href : `https://career.avito.com${href}`;
        if (!isDirectVacancyUrl(rawUrl)) continue;
        count++;

        const { directionId, subTrackId } = detectVacancyTrack(rawTitle);
        const numId = href.replace(/[^0-9]/g, '');
        if (!numId) continue;

        parsed.push({
          id: `site-avito-${numId}`,
          companyId: 'avito',
          company: 'Авито',
          title: rawTitle,
          salary: 'По договорённости',
          format: 'Гибрид',
          location: 'Москва / Санкт-Петербург / Удаленно',
          channel: 'career.avito.com',
          sourceChannel: 'career.avito.com',
          directionId,
          subTrackId,
          url: rawUrl,
          applyUrl: rawUrl,
          publishedAt: new Date().toISOString(),
          description: `Прямая вакансия Avito Tech: участие в развитии сервисов Авито.`,
          tags: ['Авито', 'Avito Tech', subTrackId.toUpperCase()],
          sourceType: 'portal',
          isActive: true,
        });
        if (count >= 5) break;
      }
      if (count > 0) {
        console.log(`[Parser] career.avito.com — спарсено ${count} прямых вакансий`);
      }
    }
  } catch (err) {
    console.warn('[Parser] Ошибка парсинга career.avito.com:', err.message);
  }

  // 2. Official Target Employers: T-Bank Т-Старт, Yandex Internships (yaintern + Jobs API cursor), T1, Kontur
  const isTestModeFast = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  // 2.1 T-Bank Т-Старт (live checks: tracks with "до 31 января" deadline AND constant/open tracks)
  const TBANK_START_TRACKS = [
    { slug: 'frontend', title: 'Стажёр Frontend-разработчик (React / Angular)', directionId: 'frontend', subTrackId: 'react', salary: 'от 65 000 до 85 000 ₽', tags: ['React', 'TypeScript', 'Angular', 'Node.js'], hasJan31: true },
    { slug: 'java', title: 'Стажёр Java-разработчик', directionId: 'backend', subTrackId: 'java', salary: 'от 75 000 до 95 000 ₽', tags: ['Java 21', 'Spring Boot', 'Kafka', 'PostgreSQL'], hasJan31: true },
    { slug: 'dotnet', title: 'Стажёр C# / .NET-разработчик', directionId: 'backend', subTrackId: 'java', salary: 'от 70 000 до 90 000 ₽', tags: ['C#', '.NET', 'ASP.NET Core', 'SQL'], hasJan31: true },
    { slug: 'scala', title: 'Стажёр Scala-разработчик', directionId: 'backend', subTrackId: 'java', salary: 'от 75 000 до 95 000 ₽', tags: ['Scala', 'Functional', 'PostgreSQL', 'Kafka'], hasJan31: true },
    { slug: 'sre_engineer', title: 'Стажёр DevOps / SRE-инженер', directionId: 'devops', subTrackId: 'cicd_docker', salary: 'от 75 000 до 95 000 ₽', tags: ['Linux', 'SRE', 'Docker', 'Kubernetes'], hasJan31: true },
    { slug: 'android', title: 'Стажёр Android-разработчик (Kotlin)', directionId: 'mobile', subTrackId: 'android', salary: 'от 70 000 до 90 000 ₽', tags: ['Kotlin', 'Android SDK', 'Coroutines'], hasJan31: true },
    { slug: 'ios', title: 'Стажёр iOS-разработчик (Swift)', directionId: 'mobile', subTrackId: 'ios', salary: 'от 70 000 до 90 000 ₽', tags: ['Swift', 'UIKit', 'SwiftUI'], hasJan31: true },
    { slug: 'ml_engineer', title: 'Стажёр ML-инженер (Machine Learning)', directionId: 'data_science', subTrackId: 'ml', salary: 'от 75 000 до 95 000 ₽', tags: ['Python', 'ML', 'PyTorch', 'CatBoost'], hasJan31: true },
    { slug: 'analyst', title: 'Стажёр Продуктовый / Бизнес-аналитик', directionId: 'data_science', subTrackId: 'analytics', salary: 'от 65 000 до 85 000 ₽', tags: ['SQL', 'Python', 'A/B тесты', 'Аналитика'], hasJan31: true },
    { slug: 'dwh', title: 'Стажёр ИТ-аналитик / DWH (SQL)', directionId: 'data_science', subTrackId: 'analytics', salary: 'от 65 000 до 85 000 ₽', tags: ['SQL', 'DWH', 'Системный анализ', 'ETL'], hasJan31: true },
    // Tracks on education.tbank.ru/start/ without the 31 Jan cutoff (constant waitlist / ongoing streams)
    { slug: 'python', title: 'Стажёр Backend-разработчик (Python)', directionId: 'backend', subTrackId: 'python', salary: 'от 70 000 до 90 000 ₽', tags: ['Python', 'Flask', 'FastAPI', 'PostgreSQL'], hasJan31: false },
    { slug: 'go', title: 'Стажёр Golang-разработчик', directionId: 'backend', subTrackId: 'golang', salary: 'от 75 000 до 95 000 ₽', tags: ['Golang', 'PostgreSQL', 'gRPC', 'Linux'], hasJan31: false },
    { slug: 'quality_engineer', title: 'Стажёр QA-инженер (Тестирование и автотесты)', directionId: 'qa', subTrackId: 'auto_qa', salary: 'от 60 000 до 80 000 ₽', tags: ['QA', 'Python', 'API', 'Auto QA'], hasJan31: false },
  ];

  let tbankCount = 0;
  const nowIso = new Date().toISOString();
  if (!isTestModeFast) {
    const tbankResults = [];
    for (let i = 0; i < TBANK_START_TRACKS.length; i += 6) {
      const chunk = TBANK_START_TRACKS.slice(i, i + 6);
      const chunkRes = await Promise.allSettled(
        chunk.map(async (tr) => {
          const directUrl = `https://education.tbank.ru/start/${tr.slug}/`;
          let scheduled = tr.hasJan31;
          try {
            const r = await fetch(directUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0', 'Accept-Language': 'ru-RU,ru;q=0.9' },
              signal: AbortSignal.timeout(7000),
            });
            if (!r.ok) return null;
            const html = (await r.text()).replace(/&nbsp;|\u00a0/gi, ' ');
            if (html.includes('404 |')) return null;
            scheduled = html.includes('31 января');
          } catch {
            // Allow Russian CA fallback tracks already curated cleanly
          }
          return { tr, directUrl, scheduled };
        })
      );
      tbankResults.push(...chunkRes);
    }
    for (const r of tbankResults) {
      if (r.status === 'fulfilled' && r.value) {
        const { tr, directUrl, scheduled } = r.value;
        tbankCount++;
        parsed.push({
          id: `tbank-start-${tr.slug}`,
          companyId: 'tbank',
          company: 'Т-Банк',
          title: tr.title,
          salary: tr.salary,
          format: 'Удаленно',
          location: 'Москва / Санкт-Петербург / Удаленно',
          channel: '@tbank_team',
          sourceChannel: '@tbank_team',
          directionId: tr.directionId,
          subTrackId: tr.subTrackId,
          url: directUrl,
          applyUrl: directUrl,
          publishedAt: nowIso,
          description: scheduled
            ? `Оплачиваемая финтех-стажировка Т-Старт (отбор до 31 января, экзамен 25–31 января): ${tr.title}.`
            : `Оплачиваемая финтех-стажировка Т-Старт (постоянный набор и запись на поток): ${tr.title}.`,
          tags: [...tr.tags, scheduled ? 'Набор до 31 января' : 'Постоянный набор'],
          sourceType: 'portal',
          recruitmentType: scheduled ? 'scheduled' : 'constant',
          applicationDeadline: scheduled ? 'до 31 января' : 'Круглый год',
          deadlineNote: scheduled ? 'Заявка до 31 января • Экзамен 25–31 января' : 'Постоянный набор / без фиксированного дедлайна',
          expiresAt: scheduled ? getNextJan31Iso() : undefined,
          isActive: true,
        });
      }
    }
    if (tbankCount > 0) console.log(`[Parser] education.tbank.ru/start/ — спарсено ${tbankCount} треков Т-Банка`);
  }

  // 2.2 Yandex Internships official tracks (yandex.ru/yaintern/*) + Yandex Jobs API (with cursor pagination)
  const YANDEX_YAINTERN_TRACKS = [
    { slug: 'backend', title: 'Стажёр Backend-разработчик (Python / Go / C++ / Java)', directionId: 'backend', subTrackId: 'python', salary: 'от 75 000 до 100 000 ₽', tags: ['Python', 'Golang', 'C++', 'Backend'] },
    { slug: 'frontend', title: 'Стажёр Frontend-разработчик (React / TypeScript)', directionId: 'frontend', subTrackId: 'react', salary: 'от 75 000 до 100 000 ₽', tags: ['React', 'TypeScript', 'JavaScript', 'Frontend'] },
    { slug: 'ml', title: 'Стажёр Machine Learning / AI Engineer', directionId: 'data_science', subTrackId: 'ml', salary: 'от 80 000 до 105 000 ₽', tags: ['Python', 'ML', 'PyTorch', 'Deep Learning'] },
    { slug: 'analytics', title: 'Стажёр Аналитик данных (SQL / A/B тесты)', directionId: 'data_science', subTrackId: 'analytics', salary: 'от 70 000 до 95 000 ₽', tags: ['SQL', 'Python', 'Аналитика данных', 'A/B тесты'] },
    { slug: 'mobile', title: 'Стажёр Mobile-разработчик (iOS / Android)', directionId: 'mobile', subTrackId: 'android', salary: 'от 75 000 до 95 000 ₽', tags: ['Kotlin', 'Swift', 'Android', 'iOS'] },
    { slug: 'devops', title: 'Стажёр DevOps / SRE / Инфраструктура', directionId: 'devops', subTrackId: 'cicd_docker', salary: 'от 75 000 до 95 000 ₽', tags: ['Linux', 'Docker', 'Kubernetes', 'DevOps'] },
    { slug: 'qa', title: 'Стажёр Инженер по тестированию (QA / Auto QA)', directionId: 'qa', subTrackId: 'auto_qa', salary: 'от 65 000 до 85 000 ₽', tags: ['QA', 'Python', 'Тестирование', 'Auto QA'] },
  ];

  let yaTrackCount = 0;
  if (!isTestModeFast) {
    const yaTrackResults = await Promise.allSettled(
      YANDEX_YAINTERN_TRACKS.map(async (tr) => {
        const directUrl = `https://yandex.ru/yaintern/${tr.slug}`;
        const r = await fetch(directUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0', 'Accept-Language': 'ru-RU,ru;q=0.9' },
          signal: AbortSignal.timeout(6000),
        });
        if (!r.ok) return null;
        return { tr, directUrl };
      })
    );
    for (const r of yaTrackResults) {
      if (r.status === 'fulfilled' && r.value) {
        const { tr, directUrl } = r.value;
        yaTrackCount++;
        parsed.push({
          id: `yandex-yaintern-${tr.slug}`,
          companyId: 'yandex',
          company: 'Яндекс',
          title: tr.title,
          salary: tr.salary,
          format: 'Гибрид',
          location: 'Москва / Екатеринбург / Санкт-Петербург / Удаленно',
          channel: '@yandex_intern',
          sourceChannel: '@yandex_intern',
          directionId: tr.directionId,
          subTrackId: tr.subTrackId,
          url: directUrl,
          applyUrl: directUrl,
          publishedAt: nowIso,
          description: `Официальная оплачиваемая стажировка Яндекса (Постоянный набор круглый год): ${tr.title}.`,
          tags: [...tr.tags, 'Постоянный набор'],
          sourceType: 'portal',
          recruitmentType: 'constant',
          applicationDeadline: 'Круглый год',
          deadlineNote: 'Постоянный круглогодичный набор',
          isActive: true,
        });
      }
    }
    if (yaTrackCount > 0) console.log(`[Parser] yandex.ru/yaintern — спарсено ${yaTrackCount} направлений Яндекса`);
  }

  // 2.3 Yandex Jobs Official JSON API (cursor-paginated intern + junior IT roles)
  try {
    let yaApiCount = 0;
    let nextUrl = 'https://yandex.ru/jobs/api/publications?pro_levels=intern&page_size=40';
    for (let page = 0; page < (isTestModeFast ? 1 : 4) && nextUrl; page++) {
      const res = await fetch(nextUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) break;
      const yData = await res.json();
      for (const it of yData.results || []) {
        const title = (it.title || '').trim();
        const summary = (it.short_summary || '').trim();
        if (!title || !isStrictVacancyPost(title, `стажер ${summary}`)) continue;
        const slug = it.publication_slug_url;
        if (!slug) continue;
        const directUrl = `https://yandex.ru/jobs/vacancies/${slug}`;
        const { directionId, subTrackId } = detectVacancyTrack(title, summary);
        const cities = (it.vacancy?.cities || []).map((c) => c.name).filter(Boolean);
        const isRemote = (it.vacancy?.work_modes || []).some((m) => m.slug === 'remote');
        yaApiCount++;

        parsed.push({
          id: `yandex-api-${it.id}`,
          companyId: 'yandex',
          company: 'Яндекс',
          title,
          salary: 'По договорённости',
          format: isRemote ? 'Удаленно' : cities.length > 0 ? 'Гибрид' : 'Удаленно',
          location: cities.slice(0, 2).join(' / ') || 'Москва / Удаленно',
          channel: '@yandex_intern',
          sourceChannel: '@yandex_intern',
          directionId,
          subTrackId,
          url: directUrl,
          applyUrl: directUrl,
          publishedAt: it.modified || nowIso,
          description: summary || `Стажировка в Яндексе (${title}). Постоянный набор.`,
          tags: ['Яндекс', subTrackId.toUpperCase(), 'Стажировка', 'Постоянный набор'],
          sourceType: 'portal',
          recruitmentType: 'constant',
          applicationDeadline: 'Круглый год',
          isActive: true,
        });
      }
      nextUrl = yData.next ? (yData.next.startsWith('http') ? yData.next : `https://yandex.ru${yData.next}`) : null;
    }
    if (yaApiCount > 0) {
      console.log(`[Parser] yandex.ru/jobs API — спарсено ${yaApiCount} IT-стажировок`);
    }
  } catch (err) {
    console.warn('[Parser] Ошибка парсинга Yandex Jobs API:', err.message);
  }

  // 2.4 Холдинг Т1 (Official API + live debut/internship tracks)
  try {
    const t1Res = await fetch('https://career.t1.ru/api/hh/vacancies?employer_id=4649269&per_page=50', {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });
    if (t1Res.ok) {
      const t1Data = await t1Res.json();
      let t1ApiCount = 0;
      for (const v of t1Data.items || []) {
        const title = (v.name || '').trim();
        if (!title || !isStrictVacancyPost(title, v.experience?.name || '')) continue;
        const directUrl = `https://career.t1.ru/vacancies/vacancy-detail?id=${v.id}`;
        const { directionId, subTrackId } = detectVacancyTrack(title);
        t1ApiCount++;
        parsed.push({
          id: `t1-api-${v.id}`,
          companyId: 't1',
          company: 'Холдинг Т1',
          title,
          salary: formatSalary(v.salary),
          format: v.schedule?.id === 'remote' ? 'Удаленно' : 'Гибрид',
          location: v.area?.name || 'Москва / Удаленно',
          channel: '@t1career',
          sourceChannel: '@t1career',
          directionId,
          subTrackId,
          url: directUrl,
          applyUrl: directUrl,
          publishedAt: v.published_at || nowIso,
          description: `Открытая позиция в Холдинге Т1: ${title}.`,
          tags: ['Холдинг Т1', subTrackId.toUpperCase(), 'Постоянный набор'],
          sourceType: 'portal',
          recruitmentType: 'constant',
          applicationDeadline: 'Круглый год',
          isActive: true,
        });
      }
      if (t1ApiCount > 0) console.log(`[Parser] career.t1.ru API — спарсено ${t1ApiCount} вакансий Т1`);
    }
  } catch (err) {
    console.warn('[Parser] Ошибка парсинга T1 API:', err.message);
  }

  if (!isTestModeFast) {
    const T1_DEBUT_TRACKS = [
      { slug: 'java_developer', title: 'Стажёр Java-разработчик (Стажировка Т1)', directionId: 'backend', subTrackId: 'java', tags: ['Java', 'Spring Boot', 'PostgreSQL', 'Постоянный набор'] },
      { slug: 'frontend_developer', title: 'Стажёр Frontend-разработчик (React / Т1)', directionId: 'frontend', subTrackId: 'react', tags: ['React', 'TypeScript', 'JavaScript', 'Постоянный набор'] },
      { slug: 'devops', title: 'Стажёр Прикладной администратор / DevOps (Т1)', directionId: 'devops', subTrackId: 'cicd_docker', tags: ['DevOps', 'Linux', 'Docker', 'CI/CD', 'Постоянный набор'] },
      { slug: 'manual_qa_engineer', title: 'Стажёр Ручной тестировщик (QA / Т1)', directionId: 'qa', subTrackId: 'manual_qa', tags: ['Manual QA', 'API', 'SQL', 'Тест-дизайн', 'Постоянный набор'] },
    ];
    for (const tr of T1_DEBUT_TRACKS) {
      const directUrl = `https://career.t1.ru/debut/internship/${tr.slug}`;
      parsed.push({
        id: `t1-debut-${tr.slug}`,
        companyId: 't1',
        company: 'Холдинг Т1',
        title: tr.title,
        salary: 'от 55 000 до 75 000 ₽',
        format: 'Удаленно',
        location: 'Москва / Санкт-Петербург / Удаленно',
        channel: '@t1career',
        sourceChannel: '@t1career',
        directionId: tr.directionId,
        subTrackId: tr.subTrackId,
        url: directUrl,
        applyUrl: directUrl,
        publishedAt: nowIso,
        description: `Официальная программа стажировок Холдинга Т1 (${tr.title}). Подача анкеты и уведомление о новом наборе на портале Т1.`,
        tags: tr.tags,
        sourceType: 'portal',
        recruitmentType: 'constant',
        applicationDeadline: 'Круглый год',
        deadlineNote: 'Карьерный портал Т1 • Лист ожидания / Потоки',
        isActive: true,
      });
    }

    // 2.5 СКБ Контур (Контур.Старт — рабочая официальная страница стажировок)
    const KONTUR_TRACKS = [
      { hash: 'backend', title: 'Стажёр Backend-разработчик (C# / Python / Контур.Старт)', directionId: 'backend', subTrackId: 'python', tags: ['C#', 'Python', '.NET', 'SQL', 'Постоянный набор'] },
      { hash: 'frontend', title: 'Стажёр Frontend-разработчик (React / TypeScript / Контур.Старт)', directionId: 'frontend', subTrackId: 'react', tags: ['React', 'TypeScript', 'Angular', 'CSS', 'Постоянный набор'] },
      { hash: 'qa', title: 'Стажёр QA-инженер (Тестирование ПО / Контур.Старт)', directionId: 'qa', subTrackId: 'manual_qa', tags: ['QA', 'Тест-дизайн', 'Postman', 'SQL', 'Постоянный набор'] },
      { hash: 'analytics', title: 'Стажёр Системный и бизнес-аналитик (Контур.Старт)', directionId: 'data_science', subTrackId: 'analytics', tags: ['Системный анализ', 'SQL', 'REST API', 'Постоянный набор'] },
    ];
    for (const tr of KONTUR_TRACKS) {
      const directUrl = `https://kontur.ru/education/internship#${tr.hash}`;
      parsed.push({
        id: `kontur-start-${tr.hash}`,
        companyId: 'kontur',
        company: 'СКБ Контур',
        title: tr.title,
        salary: 'от 60 000 до 80 000 ₽',
        format: 'Удаленно',
        location: 'Екатеринбург / Москва / Удаленно',
        channel: '@KonturTech',
        sourceChannel: '@KonturTech',
        directionId: tr.directionId,
        subTrackId: tr.subTrackId,
        url: directUrl,
        applyUrl: directUrl,
        publishedAt: nowIso,
        description: `Официальная оплачиваемая стажировка «Контур.Старт»: ${tr.title}. Приём анкет и запись на потоки на сайте СКБ Контур.`,
        tags: tr.tags,
        sourceType: 'portal',
        recruitmentType: 'constant',
        applicationDeadline: 'Круглый год',
        deadlineNote: 'Контур.Старт • Постоянный приём анкет на поток',
        isActive: true,
      });
    }
  }

  // 3. Habr Career Official JSON API (qid=1 Intern & qid=3 Junior across ALL companies)
  try {
    for (const qid of [1, 3]) {
      const res = await fetch(`https://career.habr.com/api/frontend/vacancies?qid=${qid}&type=all&per_page=35`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        let habrCount = 0;
        for (const v of data.list || []) {
          const title = (v.title || '').trim();
          const skillNames = (v.skills || []).map((s) => s.title).filter(Boolean);
          const qidContext = qid === 1 ? 'стажер intern' : 'junior';
          if (!isStrictVacancyPost(title, `${qidContext} ${skillNames.join(' ')}`)) continue;

          const directUrl = `https://career.habr.com/vacancies/${v.id}`;
          const { directionId, subTrackId } = detectVacancyTrack(title, skillNames.join(' '));
          const rawCompany = (v.company?.title || 'IT-Компания').trim();
          const compObj = findCompanyByQuery(rawCompany);
          const locs = (v.locations || []).map((l) => l.title).filter(Boolean);
          const format = v.remoteWork ? 'Удаленно' : locs.length > 0 ? 'Гибрид' : 'Удаленно';
          const location = locs.length > 0 ? `${locs.slice(0, 2).join(' / ')}${v.remoteWork ? ' / Удаленно' : ''}` : 'Удаленно';
          const salary = formatSalary(v.salary);
          habrCount++;

          parsed.push({
            id: `habr-${v.id}`,
            companyId: compObj ? compObj.id : 'other',
            company: compObj ? compObj.name : rawCompany,
            title,
            salary,
            format,
            location,
            channel: 'career.habr.com',
            sourceChannel: 'career.habr.com',
            directionId,
            subTrackId,
            url: directUrl,
            applyUrl: directUrl,
            publishedAt: v.publishedDate?.date || new Date().toISOString(),
            description: `${qid === 1 ? 'Стажировка' : 'Junior-вакансия'} в ${compObj ? compObj.name : rawCompany} на Хабр Карьере. Стек: ${skillNames.slice(0, 5).join(', ') || subTrackId.toUpperCase()}.`,
            tags: skillNames.length > 0 ? skillNames.slice(0, 5) : [rawCompany, 'Хабр Карьера', subTrackId.toUpperCase()],
            sourceType: 'portal',
            isActive: true,
          });
        }
        if (habrCount > 0) {
          console.log(`[Parser] Хабр Карьера API (qid=${qid}) — спарсено ${habrCount} вакансий`);
        }
      }
    }
  } catch (err) {
    console.warn('[Parser] Ошибка парсинга Хабр Карьера API:', err.message);
  }

  // 4. HeadHunter live search for target employers AND general IT intern queries (fixes subdomains & drops ads)
  const hhSearches = [
    { id: '1740', companyId: 'yandex', company: 'Яндекс', defaultCity: 'Москва', url: 'https://hh.ru/search/vacancy?employer_id=1740&text=стажер+OR+junior&order_by=publication_time' },
    { id: '2180', companyId: 'ozon', company: 'Ozon Tech', defaultCity: 'Москва', url: 'https://hh.ru/search/vacancy?employer_id=2180&text=стажер+OR+junior&order_by=publication_time' },
    { id: '3529', companyId: 'sber', company: 'Сбер', defaultCity: 'Москва', url: 'https://hh.ru/search/vacancy?employer_id=3529&text=стажер+OR+junior&order_by=publication_time' },
    { id: '78638', companyId: 'tbank', company: 'Т-Банк', defaultCity: 'Москва', url: 'https://hh.ru/search/vacancy?employer_id=78638&text=стажер+OR+junior&order_by=publication_time' },
    { id: 'general-dev', companyId: 'other', company: '', defaultCity: 'Москва', url: 'https://hh.ru/search/vacancy?text=стажер+разработчик+OR+junior+developer+OR+стажер+qa&experience=noExperience&order_by=publication_time' },
  ];

  await Promise.allSettled(
    hhSearches.map(async (emp) => {
      try {
        const res = await fetch(emp.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'ru-RU,ru;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const html = await res.text();
          const vacancyRegex = /<a[^>]+data-qa="serp-item__title"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
          let m;
          let count = 0;
          const seenIds = new Set();
          while ((m = vacancyRegex.exec(html)) !== null && count < 8) {
            const rawHref = m[1].split('?')[0];
            if (rawHref.includes('adsrv.hh.ru')) continue;
            const hhIdMatch = rawHref.match(/\/vacancy\/(\d+)/);
            if (!hhIdMatch) continue;
            const numId = hhIdMatch[1];
            if (seenIds.has(numId)) continue;
            seenIds.add(numId);

            const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
            if (!isStrictVacancyPost(rawTitle, '')) continue;

            const canonicalUrl = `https://hh.ru/vacancy/${numId}`;
            const { directionId, subTrackId } = detectVacancyTrack(rawTitle);
            count++;

            parsed.push({
              id: `hh-${numId}`,
              companyId: emp.companyId,
              company: emp.company || 'IT-Компания (hh.ru)',
              title: rawTitle,
              salary: 'По договорённости',
              format: 'Удаленно',
              location: emp.defaultCity ? `${emp.defaultCity} / Удаленно` : 'Москва / Удаленно',
              channel: 'hh.ru',
              sourceChannel: 'hh.ru',
              directionId,
              subTrackId,
              url: canonicalUrl,
              applyUrl: canonicalUrl,
              publishedAt: new Date().toISOString(),
              description: `Открытая позиция на HeadHunter: ${rawTitle}.`,
              tags: [emp.company || 'hh.ru', subTrackId.toUpperCase(), 'hh.ru'],
              sourceType: 'portal',
              isActive: true,
            });
          }
          if (count > 0) {
            console.log(`[Parser] hh.ru (${emp.company || 'IT поиск'}) — спарсено ${count} прямых вакансий`);
          }
        }
      } catch (err) {
        console.warn(`[Parser] Ошибка парсинга hh.ru (${emp.id}):`, err.message);
      }
    })
  );

  return parsed;
}

/**
 * Fetch company-specific vacancies from all sources (channels, career sites, database)
 */
export async function fetchCompanyVacancies(companyId) {
  const allList = await getActiveInternships();
  return allList.filter((item) => {
    if (item.companyId === companyId) return true;
    const comp = findCompanyByQuery(item.company);
    return comp && comp.id === companyId;
  });
}

// In-memory cache for active internships to prevent hammering Supabase on every message/command
let cachedActiveInternships = null;
let lastInternshipsCacheTime = 0;
const INTERNSHIPS_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateInternshipsCache() {
  cachedActiveInternships = null;
  lastInternshipsCacheTime = 0;
}

/**
 * Fetch active internships combining Supabase data with fallback to curated database
 */
export async function getActiveInternships(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedActiveInternships && now - lastInternshipsCacheTime < INTERNSHIPS_CACHE_TTL_MS) {
    return cachedActiveInternships;
  }

  // In test mode, return curated database immediately to prevent network stalls and timeouts
  if (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)) {
    cachedActiveInternships = ALL_INTERNSHIPS;
    lastInternshipsCacheTime = Date.now();
    return ALL_INTERNSHIPS;
  }

  try {
    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .order('published_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const parseArray = (val, fallback) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try {
            if (val.startsWith('[')) return JSON.parse(val);
            return val.split(',').map((s) => s.trim()).filter(Boolean);
          } catch {
            return [val];
          }
        }
        return fallback;
      };

      const mapped = data
        .filter(
          (item) =>
            isStrictVacancyPost(item.title || '', item.description || '') &&
            isVacancyActive(item) &&
            isDirectVacancyUrl(item.source_url || item.url)
        )
        .map((item) => {
          const comp = findCompanyByQuery(item.company) || {};
          const rawUrl = item.source_url || item.url;
          const directionId = item.direction || item.direction_id || 'backend';
          const subTrackId = item.sub_track || item.sub_track_id || 'python';
          const directUrl = resolveApplyUrl(rawUrl, item.company, item.source_name, directionId, subTrackId);
          const parsedTg = parseTelegramSource(item.source_name, item.company);
          const verifiedChannel = parsedTg.channelHandle;
          const postUrl = parsedTg.postUrl || (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(directUrl) ? directUrl : undefined);
          return {
            id: String(item.id),
            companyId: comp.id || item.company_id || 'other',
            company: item.company,
            title: item.title,
            salary: formatSalary(item.salary),
            format: item.format || 'Удаленно',
            location: item.city || item.location || 'Москва / Удаленно',
            channel: verifiedChannel,
            sourceChannel: verifiedChannel,
            sourcePostUrl: postUrl,
            postUrl,
            directionId,
            subTrackId,
            url: directUrl,
            applyUrl: directUrl,
            sourceType: item.source_type || (String(item.source_name || '').startsWith('@') ? 'telegram' : 'portal'),
            description: item.description || '',
            tags: parseArray(item.tags, [item.company, 'Стажировка']),
          };
        });

      cachedActiveInternships = mapped;
      lastInternshipsCacheTime = Date.now();
      return mapped;
    }
  } catch (err) {
    console.warn('[Parser] Ошибка чтения из Supabase, используем ALL_INTERNSHIPS:', err.message);
  }

  cachedActiveInternships = ALL_INTERNSHIPS.filter((i) => isVacancyActive(i));
  lastInternshipsCacheTime = Date.now();
  return cachedActiveInternships;
}

/**
 * Automated tracking & channels/sites parsing module
 * Parses Telegram channels and career sites/APIs, runs live HTTP URL verification
 * & anti-fake cleanup, purges dead rows from Supabase, and notifies subscribers.
 */
export async function scanChannelsAndSyncSupabase(notifySubscribers = true) {
  console.log(`[Parser] ⚡ Запуск полного сканирования ${ALL_TARGET_TG_CHANNELS.length} Telegram-каналов и ${CAREER_WEBSITES_DATA.length} сайтов...`);

  // 1. Parallel execution of Telegram channel parsing and career website parsing
  const [tgResults, siteResults] = await Promise.allSettled([
    parseTelegramChannels(),
    parseCareerWebsites(),
  ]);

  const tgPosts = tgResults.status === 'fulfilled' && Array.isArray(tgResults.value) ? tgResults.value : [];
  const sitePosts = siteResults.status === 'fulfilled' && Array.isArray(siteResults.value) ? siteResults.value : [];
  const newlyParsed = [...tgPosts, ...sitePosts];

  console.log(`[Parser] Спарсено: TG каналы = ${tgPosts.length}, Карьерные сайты/API = ${sitePosts.length}`);

  // 2. Deduplicate candidates before live URL verification
  const seenUrls = new Set();
  const seenTitles = new Set();
  const candidates = [];

  for (const item of newlyParsed) {
    if (!isStrictVacancyPost(item.title || '', item.description || '') || !isVacancyActive(item)) {
      continue;
    }
    const resolvedUrl = resolveApplyUrl(item.url || item.applyUrl, item.company, item.channel, item.directionId, item.subTrackId);
    if (!isDirectVacancyUrl(resolvedUrl)) {
      continue;
    }
    const urlKey = resolvedUrl.toLowerCase();
    const titleKey = `${item.company}_${item.title}`.toLowerCase();
    if (!seenUrls.has(urlKey) && !seenTitles.has(titleKey)) {
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      candidates.push({
        ...item,
        salary: formatSalary(item.salary),
        url: resolvedUrl,
        applyUrl: resolvedUrl,
      });
    }
  }

  // 3. Live HTTP verification & schema.org enrichment (skipped bulk fetch in VITEST test mode for speed)
  const isTestMode = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  let verifiedItems = [];

  if (isTestMode) {
    verifiedItems = candidates.map((c) => ({ ...c, isVerified: true, verifiedAt: new Date().toISOString() }));
  } else {
    // Round-robin helper so no single TG channel (e.g. young_june) or website crowds out others
    const selectBalanced = (list, keyFn, limit) => {
      const buckets = new Map();
      const sorted = [...list].sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
      for (const item of sorted) {
        const k = keyFn(item) || 'other';
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(item);
      }
      const picked = [];
      const keys = [...buckets.keys()];
      let round = 0;
      while (picked.length < limit) {
        let addedAny = false;
        for (const k of keys) {
          const arr = buckets.get(k);
          if (round < arr.length) {
            picked.push(arr[round]);
            addedAny = true;
            if (picked.length >= limit) break;
          }
        }
        if (!addedAny) break;
        round++;
      }
      return picked;
    };

    const tgCandidates = selectBalanced(
      candidates.filter((c) => c.sourceType === 'telegram'),
      (c) => (c.sourceChannel || c.channel || '').toLowerCase(),
      42
    );

    const officialEmployerPrograms = candidates
      .filter((c) => c.sourceType !== 'telegram' && ['tbank', 'yandex', 't1', 'kontur'].includes(c.companyId))
      .slice(0, 40);
    const officialIds = new Set(officialEmployerPrograms.map((i) => i.id));
    const otherWebCandidates = selectBalanced(
      candidates.filter((c) => c.sourceType !== 'telegram' && !officialIds.has(c.id)),
      (c) => (c.sourceChannel || c.channel || 'web').toLowerCase(),
      24
    );
    const webCandidates = [...officialEmployerPrograms, ...otherWebCandidates];

    const orderedCandidates = [];
    const maxLen = Math.max(tgCandidates.length, webCandidates.length);
    for (let k = 0; k < maxLen; k++) {
      if (webCandidates[k]) orderedCandidates.push(webCandidates[k]);
      if (tgCandidates[k]) orderedCandidates.push(tgCandidates[k]);
    }

    console.log(`[Verifier] 🔍 Живая HTTP-проверка ${orderedCandidates.length} ссылок (TG: ${tgCandidates.length}, Сайты и Компании: ${webCandidates.length})...`);
    const BATCH_SIZE = 6;
    for (let i = 0; i < orderedCandidates.length; i += BATCH_SIZE) {
      const batch = orderedCandidates.slice(i, i + BATCH_SIZE);
      const checks = await Promise.all(batch.map((item) => verifyVacancyUrlLive(item)));
      for (let j = 0; j < batch.length; j++) {
        const res = checks[j];
        if (res.ok) {
          const item = batch[j];
          verifiedItems.push({
            ...item,
            ...(res.enriched || {}),
            isVerified: true,
            isActive: true,
          });
        } else {
          console.log(`[Verifier] ❌ Отсеяна битая/архивная вакансия "${batch[j].title}" (${res.reason}): ${batch[j].url}`);
        }
      }
      if (i + BATCH_SIZE < orderedCandidates.length) {
        await new Promise((r) => setTimeout(r, 180));
      }
    }
    console.log(`[Verifier] ✅ Проверено и допущено на сайт: ${verifiedItems.length} из ${orderedCandidates.length} живых вакансий!`);
  }

  // Post-verification deduplication (catches reposts after JSON-LD normalized company/title)
  const finalSeenUrls = new Set();
  const finalSeenTitles = new Set();
  const allToSync = [];
  for (const item of verifiedItems) {
    if (!isStrictVacancyPost(item.title || '', item.description || '') || !isVacancyActive(item)) {
      continue;
    }
    const uKey = (item.url || item.applyUrl || '').toLowerCase();
    const tKey = `${item.company}_${item.title}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!finalSeenUrls.has(uKey) && !finalSeenTitles.has(tKey)) {
      finalSeenUrls.add(uKey);
      finalSeenTitles.add(tKey);
      allToSync.push(item);
    }
  }

  // 4. Sync with Supabase + Cleanup stale/fake/broken rows!
  let savedCount = 0;
  try {
    if (supabase && !isTestMode && allToSync.length > 0) {
      // Purge stale/broken/duplicate records from Supabase before upserting fresh live ones
      const { data: existingRows } = await supabase.from('internships').select('id, source_url, title');
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const freshIds = new Set(allToSync.map((i) => i.id));
        const idsToDelete = existingRows
          .filter((row) => {
            if (!isDirectVacancyUrl(row.source_url)) return true;
            // Remove old static seeds / random-suffix HH duplicates unless verified in current scan
            if (row.id.startsWith('int-') || row.id.startsWith('bot-') || row.id.startsWith('site-')) {
              return !freshIds.has(row.id);
            }
            if (/^hh-\d+-[a-z0-9]{5}$/i.test(row.id) && !freshIds.has(row.id)) return true;
            // Remove any previously synced item that just failed live verification or dropped off live feed
            if (!freshIds.has(row.id)) return true;
            return false;
          })
          .map((r) => r.id);

        if (idsToDelete.length > 0) {
          const { error: delErr } = await supabase.from('internships').delete().in('id', idsToDelete);
          if (delErr) {
            console.warn('[Verifier] Предупреждение при очистке устаревших записей:', delErr.message);
          } else {
            console.log(`[Verifier] 🧹 Удалено ${idsToDelete.length} устаревших/невалидных/фейковых записей из Supabase!`);
          }
        }
      }

      const rows = allToSync.map((item) => {
        const enrichedTags = Array.isArray(item.tags) ? [...item.tags] : [];
        if (item.recruitmentType === 'scheduled' && item.applicationDeadline) {
          const deadlineTag = item.applicationDeadline.startsWith('до ')
            ? `Набор ${item.applicationDeadline}`
            : `Набор до ${item.applicationDeadline}`;
          if (!enrichedTags.includes(deadlineTag)) enrichedTags.push(deadlineTag);
        } else if (item.recruitmentType === 'constant' && !enrichedTags.includes('Постоянный набор')) {
          enrichedTags.push('Постоянный набор');
        }

        let storedSourceName = item.channel;
        if (item.sourceType === 'telegram') {
          const postRef = item.sourcePostUrl || item.postUrl || '';
          const m = postRef.match(/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/i);
          if (m) {
            storedSourceName = `@${m[1]}/${m[2]}`;
          }
        }

        return {
          id: item.id,
          title: item.title,
          company: item.company,
          direction: item.directionId,
          sub_track: item.subTrackId,
          format: item.format,
          city: item.location || 'Москва / Удаленно',
          salary: item.salary,
          source_type: item.sourceType || 'telegram',
          source_name: storedSourceName,
          source_url: item.url,
          description: item.description,
          tags: enrichedTags,
          published_at: item.publishedAt || new Date().toISOString(),
        };
      });

      const { error } = await supabase.from('internships').upsert(rows, { onConflict: 'id' });
      if (error) {
        console.warn('[Parser] Предупреждение при записи в Supabase:', error.message);
      } else {
        savedCount = rows.length;
        invalidateInternshipsCache();
        console.log(`[Parser] ✅ Успешно синхронизировано ${savedCount} проверенных вакансий в Supabase internships`);
      }
    } else {
      savedCount = allToSync.length;
      invalidateInternshipsCache();
      console.log(`[Parser] ✅ Успешно синхронизировано ${savedCount} вакансий (Test/Dry mode)`);
    }
  } catch (err) {
    console.warn('[Parser] Исключение при синхронизации Supabase:', err.message);
  }

  // 4. Match subscribers from `public.tg_subscriptions` and send notifications
  let sentPushesTg = 0;
  let sentPushesVk = 0;
  if (notifySubscribers && BOT_TOKEN) {
    try {
      let subs = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('tg_subscriptions')
          .select('*')
          .eq('is_active', true);
        if (!error && Array.isArray(data)) {
          subs = data;
        }
      }
      if (subs.length === 0 && tgSubscribers.size > 0) {
        subs = Array.from(tgSubscribers.values()).filter((s) => s.is_active);
      }

      // Filter out VK subscribers to prevent sending Telegram messages to VK IDs
      const tgSubs = subs.filter((s) => !String(s.chat_id).startsWith('vk_'));

      if (tgSubs.length > 0) {
        console.log(`[Parser] Найдено ${tgSubs.length} активных Telegram-подписчиков для рассылки.`);

        for (const sub of tgSubs) {
          const subDirs = Array.isArray(sub.directions) ? sub.directions : [];
          const subTracks = Array.isArray(sub.sub_tracks) ? sub.sub_tracks : [];

          const matching = allToSync.filter(
            (v) => subDirs.includes(v.directionId) || subTracks.includes(v.subTrackId)
          );

          let sentForSub = 0;
          for (const item of matching) {
            if (sentForSub >= 2) break;
            const key = `${sub.chat_id}_${item.id}`;
            if (notifiedKeys.has(key)) continue;

            const isWeb = item.sourceType === 'portal' || item.sourceType === 'website';
            const sourceLabel = isWeb ? 'Карьерный сайт' : 'Telegram-канал';
            const sourceChannel = item.sourceChannel || item.channel || (isWeb ? 'Сайт работодателя' : 'Telegram-канал');
            const directApplyUrl = item.applyUrl || item.url || WEBAPP_URL;

            const pushText =
              `🔥 <b>Новая стажировка!</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🏢 <b>${item.company}</b>\n` +
              `💼 <b>${item.title}</b>\n` +
              `💰 <b>${item.salary}</b> | 📍 ${formatLocation(item)}\n` +
              (item.recruitmentType === 'scheduled' && item.applicationDeadline
                ? `⏳ <b>Набор:</b> ${item.applicationDeadline}\n`
                : '') +
              `📢 <code>${sourceChannel}</code> (${sourceLabel})\n\n` +
              `🎯 <i>В IT-Старт подготовлен персональный план вопросов для этого направления!</i>`;

            const linkRow = [
              {
                text: isWeb ? '🔗 Откликнуться на сайте' : '🔗 Открыть вакансию',
                url: directApplyUrl,
              },
            ];
            if (!isWeb && item.sourcePostUrl && item.sourcePostUrl !== directApplyUrl) {
              linkRow.push({ text: '💬 К посту в TG', url: item.sourcePostUrl });
            }

            const sendRes = await callTelegram('sendMessage', {
              chat_id: sub.chat_id,
              text: pushText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🚀 Открыть в WebApp',
                      web_app: { url: `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}vacancyId=${item.id}` },
                    },
                  ],
                  linkRow,
                  [
                    { text: '💼 Вакансии', callback_data: 'vacancies:all' },
                    { text: '🔔 Подписка', callback_data: 'subscribe' },
                  ],
                ],
              },
            });

            if (sendRes.ok) {
              notifiedKeys.add(key);
              sentForSub++;
              sentPushesTg++;
              console.log(`[Parser] Пуш отправлен подписчику ${sub.chat_id} (${item.company})`);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Parser] Ошибка рассылки уведомлений Telegram:', err.message);
    }
  }

  // 5. Match and notify subscribers in VK (full parity with Telegram using allToSync)
  if (notifySubscribers) {
    try {
      const { notifyVkSubscribers, syncSubscribersFromVkConversations, VK_BOT_TOKEN } = await import('./vk_bot.mjs');
      if (VK_BOT_TOKEN || process.env.VK_BOT_TOKEN || process.env.VK_GROUP_TOKEN) {
        await syncSubscribersFromVkConversations().catch(() => {});
      }
      const vkCandidates = allToSync;
      sentPushesVk = await notifyVkSubscribers(vkCandidates);
      if (sentPushesVk > 0) {
        console.log(`[Parser] ✅ Отправлено ${sentPushesVk} уведомлений подписчикам в VK.`);
      }
    } catch (err) {
      console.error('[Parser] ❌ Ошибка рассылки уведомлений ВКонтакте:', err.message);
    }
  }

  const sentPushes = sentPushesTg + sentPushesVk;

  // Update in-memory scan statistics
  LAST_SCAN_STATUS.lastScanAt = new Date().toISOString();
  LAST_SCAN_STATUS.channelsChecked = ALL_TARGET_TG_CHANNELS.length;
  LAST_SCAN_STATUS.websitesChecked = CAREER_WEBSITES_DATA.length;
  LAST_SCAN_STATUS.parsedCount = newlyParsed.length;
  LAST_SCAN_STATUS.savedCount = savedCount;
  LAST_SCAN_STATUS.sentPushesTg = sentPushesTg;
  LAST_SCAN_STATUS.sentPushesVk = sentPushesVk;
  LAST_SCAN_STATUS.sentPushes = sentPushes;
  LAST_SCAN_STATUS.totalActive = allToSync.length;

  return {
    savedCount,
    sentPushes,
    sentPushesTg,
    sentPushesVk,
    channelsChecked: ALL_TARGET_TG_CHANNELS.length,
    websitesChecked: CAREER_WEBSITES_DATA.length,
    parsedCount: newlyParsed.length,
    totalActive: allToSync.length,
    newlyParsed,
    vacancies: allToSync,
  };
}

// In-memory subscribers store for Telegram push notifications (offline fallback)
export const tgSubscribers = new Map();

/**
 * Get all active Telegram subscribers (with Supabase fetch & in-memory fallback)
 */
export async function getTgSubscribers() {
  if (tgSubscribers.size === 0 && supabase && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase.from('tg_subscriptions').select('*').eq('is_active', true);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (!String(row.chat_id).startsWith('vk_')) {
            tgSubscribers.set(String(row.chat_id), {
              chat_id: String(row.chat_id),
              username: row.username || '',
              first_name: row.first_name || 'Пользователь Telegram',
              directions: row.directions || ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'],
              sub_tracks: row.sub_tracks || [],
              is_active: true,
              updated_at: row.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}
  }
  return Array.from(tgSubscribers.values()).filter((s) => s.is_active);
}

/**
 * Register or update a Telegram subscriber in Supabase & memory
 */
export async function registerTgSubscriber(chatId, meta = {}) {
  const id = String(chatId);
  const isActive = meta.is_active !== false;
  const sub = {
    chat_id: id,
    username: meta.username || '',
    first_name: meta.first_name || 'Пользователь Telegram',
    directions: meta.directions || ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'],
    sub_tracks: meta.sub_tracks || ['react', 'python', 'nodejs', 'golang', 'auto_qa', 'cicd_docker'],
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  if (isActive) {
    tgSubscribers.set(id, sub);
  } else {
    tgSubscribers.delete(id);
  }

  try {
    if (supabase && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const { error } = await supabase.from('tg_subscriptions').upsert(sub, { onConflict: 'chat_id' });
      if (error) {
        console.warn('[Telegram Bot] Ошибка сохранения подписчика в Supabase:', error.message);
      } else {
        console.log(`[Telegram Bot] ✅ Подписчик ${id} (@${meta.username || 'unknown'}) успешно сохранен в Supabase`);
      }
    }
  } catch (err) {
    console.warn('[Telegram Bot] Исключение при сохранении подписчика в Supabase:', err.message);
  }

  return sub;
}

/**
 * Unregister a Telegram subscriber
 */
export async function unregisterTgSubscriber(chatId) {
  const id = String(chatId);
  tgSubscribers.delete(id);

  try {
    if (supabase && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const { error } = await supabase.from('tg_subscriptions').update({ is_active: false }).eq('chat_id', id);
      if (error) {
        console.warn('[Telegram Bot] Ошибка отключения подписки в Supabase:', error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Telegram Bot] Исключение при отключении подписки в Supabase:', err.message);
    return false;
  }
}

/**
 * Return current runtime status of Telegram Bot
 */
export function getTgBotStatus() {
  return {
    bot: 'IT-Старт Telegram Бот',
    username: BOT_USERNAME,
    status: BOT_TOKEN ? 'active' : 'fallback',
    mode: BOT_TOKEN ? 'live' : 'fallback',
    uptime: process.uptime(),
    commandsCount: 12,
    subscribersCount: tgSubscribers.size,
    port: PORT,
    renderUrl: RENDER_URL,
    channelsCount: ALL_TARGET_TG_CHANNELS.length,
    websitesCount: CAREER_WEBSITES_DATA.length,
    companiesCount: COMPANIES_DATA.length,
    lastScanAt: LAST_SCAN_STATUS.lastScanAt,
    lastActive: new Date().toISOString(),
  };
}

/**
 * Handle incoming user messages
 */
export async function handleMessage(msg) {
  const chatId = msg.chat?.id || msg.from?.id;
  const textRaw = (msg.text || '').trim();
  const firstName = msg.from?.first_name || 'Разработчик';
  const username = msg.from?.username || '';

  if (!chatId) return { ok: false, error: 'Missing chat_id' };

  console.log(`[Message] От @${username || chatId}: "${textRaw}"`);

  const textLower = textRaw.toLowerCase();
  const textClean = textLower.replace(/[!.,?]+$/g, '').trim();
  const strippedText = textLower.replace(/^[\p{Extended_Pictographic}\p{Emoji}\p{Symbol}\s_.-]+/u, '').trim();

  const isGreeting =
    strippedText === 'здравствуйте' ||
    strippedText === 'здравствуй' ||
    strippedText === 'добрый день' ||
    strippedText === 'добрый вечер' ||
    strippedText === 'доброе утро' ||
    strippedText === 'приветствую' ||
    strippedText === 'салют' ||
    strippedText === 'хай' ||
    strippedText === 'ку' ||
    strippedText.startsWith('здравствуй') ||
    strippedText.startsWith('добрый день') ||
    strippedText.startsWith('добрый вечер') ||
    strippedText.startsWith('доброе утро') ||
    strippedText.startsWith('приветствую');

  // Support numeric menu shortcuts (1..10) matching VK bot main menu
  const numMatch = textClean.match(/^(?:\[(\d+)\]|(\d+)\.?)$/);
  const num = numMatch ? parseInt(numMatch[1] || numMatch[2], 10) : null;
  if (num !== null && num >= 1 && num <= 10) {
    if (num === 1) return sendVacancies(chatId, 'all');
    if (num === 2) return sendCompanies(chatId);
    if (num === 3) return sendRoadmaps(chatId);
    if (num === 4) return sendQuestions(chatId);
    if (num === 5) return sendSubscribe(chatId, firstName, username);
    if (num === 6) return sendSite(chatId);
    if (num === 7) return sendStatus(chatId);
    if (num === 8) return sendHelp(chatId);
    if (num === 9) return sendId(chatId, firstName, username);
    if (num === 10) return runManualScan(chatId);
  }

  // 1. /start command, greetings & main menu
  if (
    textClean === '/start' ||
    textClean.startsWith('/start ') ||
    textClean === 'старт' ||
    textClean === 'начать' ||
    textClean === 'меню' ||
    textClean === 'главное меню' ||
    textClean === 'привет' ||
    textClean === 'hello' ||
    isGreeting
  ) {
    const isAuthOnlyStart = textClean === '/start auth' || textClean.startsWith('/start auth_');
    // Auto-register subscriber in Supabase (without enabling push notifications when opened via ?start=auth)
    await registerTgSubscriber(chatId, {
      username,
      first_name: firstName,
      is_active: !isAuthOnlyStart,
    });

    const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&tg_username=${encodeURIComponent(username || '')}&tg_first_name=${encodeURIComponent(firstName || '')}${isAuthOnlyStart ? '&auth_only=1' : '&subscribed=1'}#tg_chat_id=${chatId}`;

    if (isAuthOnlyStart) {
      const authText =
        `🔑 <b>Авторизация в IT-Старт</b>\n\n` +
        `👤 Профиль: <b>${firstName}</b>${username ? ` (@${username})` : ''}\n` +
        `🆔 Ваш Telegram ID: <code>${chatId}</code>\n` +
        `🔕 Уведомления о вакансиях <b>отключены</b> (можно включить на сайте по желанию).\n\n` +
        `Нажмите кнопку ниже, чтобы сразу войти на сайт или в WebApp под своим профилем — история просмотров, отклики, избранное и прогресс роадмапов будут сохраняться в облаке.`;

      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: authText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Открыть IT-Старт с этим профилем', web_app: { url: webAppUrlWithParams } }],
            [{ text: '🌐 Войти в браузере (с историей)', url: webAppUrlWithParams }],
          ],
        },
      });
      return;
    }

    const welcomeText =
      `👋 <b>Привет, ${firstName}!</b>\n\n` +
      `✅ <b>Вы подписаны на уведомления IT-Старт!</b>\n` +
      `🆔 Telegram Chat ID: <code>${chatId}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Мгновенные персональные пуши о стажировках Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито и VK.\n\n` +
      `🎯 <b>Что доступно прямо сейчас:</b>\n` +
      `• 🚀 <b>WebApp:</b> роадмапы, тренажёр и база вакансий\n` +
      `• 🏢 <b>9 IT-гигантов:</b> мониторинг каналов и сайтов 24/7\n` +
      `• 🗺 <b>Роадмапы:</b> интерактивные деревья навыков\n` +
      `• ❓ <b>Интервью:</b> 55+ вопросов с самопроверкой\n\n` +
      `👇 <i>Запустите приложение кнопкой ниже (ID уже подставлен):</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Запустить IT-Старт WebApp',
            web_app: { url: webAppUrlWithParams },
          },
        ],
        [
          { text: '💼 Стажировки', callback_data: 'vacancies:all' },
          { text: '🏢 Компании', callback_data: 'companies' },
        ],
        [
          { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
          { text: '❓ Тренажёр', callback_data: 'questions' },
        ],
        [
          { text: '🔔 Подписка', callback_data: 'subscribe' },
          { text: '⚡ Скан', callback_data: 'scan' },
        ],
        [
          { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
          { text: 'ℹ️ Помощь', callback_data: 'help' },
        ],
      ],
    };

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return { ok: true, type: 'start', chatId, replyText: welcomeText };
  }

  // 2. /subscribe command
  if (
    textClean === '/subscribe' ||
    textClean.startsWith('/subscribe ') ||
    textClean === 'подписка' ||
    textClean === 'подписаться' ||
    textClean === 'включить уведомления'
  ) {
    return sendSubscribe(chatId, firstName, username);
  }

  // 3. /unsubscribe command
  if (
    textClean === '/unsubscribe' ||
    textClean.startsWith('/unsubscribe ') ||
    textClean === 'отписаться' ||
    textClean === 'отписка' ||
    textClean === 'отключить уведомления'
  ) {
    await unregisterTgSubscriber(chatId);
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text:
        `🔕 <b>Вы отписались от уведомлений IT-Старт.</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Чтобы возобновить подписку в любой момент, отправьте /subscribe или нажмите кнопку ниже.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔔 Подписаться', callback_data: 'subscribe' },
            { text: '💼 Стажировки', callback_data: 'vacancies:all' },
          ],
          [
            {
              text: '🚀 Открыть IT-Старт WebApp',
              web_app: {
                url: `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=0#tg_chat_id=${chatId}`,
              },
            },
          ],
        ],
      },
    });
    return { ok: true, type: 'unsubscribe', chatId };
  }

  // 4. /id or /myid command
  if (
    textClean === '/id' ||
    textClean === '/myid' ||
    textClean === 'id' ||
    textClean === 'мой id' ||
    textClean === 'chat_id' ||
    textClean === 'айди'
  ) {
    return sendId(chatId, firstName, username);
  }

  // 5. /vacancies or /internships or «стажировки» or «вакансии»
  if (
    textClean === '/vacancies' ||
    textClean.startsWith('/vacancies ') ||
    textClean === '/internships' ||
    textClean.startsWith('/internships ') ||
    textClean === 'стажировки' ||
    textClean === 'вакансии' ||
    textClean === 'каталог'
  ) {
    const parts = textRaw.split(/\s+/);
    if (parts.length > 1) {
      const arg = parts.slice(1).join(' ').trim().toLowerCase();
      const matchedComp = findCompanyByQuery(arg);
      const matchedDir = resolveDirectionByQuery(arg);
      if (matchedComp) {
        return sendCompanyVacancies(chatId, matchedComp.id);
      }
      if (matchedDir) {
        return sendVacancies(chatId, matchedDir);
      }
      return sendVacancies(chatId, arg);
    }
    return sendVacancies(chatId, 'all');
  }

  // 6. Direct direction commands (/frontend, /backend, «фронтенд», «бэкенд», etc.)
  const directDirMatch = resolveDirectionByQuery(textClean);
  if (directDirMatch) {
    return sendVacancies(chatId, directDirMatch);
  }

  // 7. /companies or «компании» or «работодатели»
  if (
    textClean === '/companies' ||
    textClean === 'компании' ||
    textClean === 'работодатели' ||
    textClean === 'список компаний'
  ) {
    return sendCompanies(chatId);
  }

  // 8. /company_<id> shortcut commands
  const companyCmdMatch = textClean.match(/^\/company_([a-zA-Z0-9]+)/);
  if (companyCmdMatch) {
    const targetCompanyId = companyCmdMatch[1].toLowerCase();
    return sendCompanyVacancies(chatId, targetCompanyId);
  }

  // 9. /roadmaps or «роадмапы» or «дорожные карты»
  if (
    textClean === '/roadmaps' ||
    textClean === 'роадмапы' ||
    textClean === 'роадмап' ||
    textClean === 'дорожные карты' ||
    textClean === 'план обучения'
  ) {
    return sendRoadmaps(chatId);
  }

  // 10. /questions or /quiz or /trainer or «вопросы» or «тренажёр» or «тренажер» or «собеседование»
  if (
    textClean === '/questions' ||
    textClean === '/quiz' ||
    textClean === '/trainer' ||
    textClean === 'вопросы' ||
    textClean === 'тренажёр' ||
    textClean === 'тренажер' ||
    textClean === 'собеседование' ||
    textClean === 'интервью'
  ) {
    return sendQuestions(chatId);
  }

  // 11. /scan, /track, /parse, or /sync or «сканировать», «скан», «парсинг», «синхронизация»
  if (
    textClean === '/scan' ||
    textClean === '/sync' ||
    textClean === '/parse' ||
    textClean === '/track' ||
    textClean === 'сканировать' ||
    textClean === 'скан' ||
    textClean === 'парсинг' ||
    textClean === 'синхронизация' ||
    textClean === 'обновить'
  ) {
    return runManualScan(chatId);
  }

  // 12. /status or «статус» or «состояние»
  if (
    textClean === '/status' ||
    textClean === 'статус' ||
    textClean === 'состояние' ||
    textClean === 'сервер'
  ) {
    return sendStatus(chatId);
  }

  // 13. /site, /web, /app or «сайт», «веб», «открыть сайт», «платформа»
  if (
    textClean === '/site' ||
    textClean === '/web' ||
    textClean === '/app' ||
    textClean === 'сайт' ||
    textClean === 'веб' ||
    textClean === 'платформа' ||
    textClean.includes('открыть сайт') ||
    textClean.includes('веб-версия')
  ) {
    return sendSite(chatId);
  }

  // 14. /vk or «вк» or «вконтакте»
  if (
    textClean === '/vk' ||
    textClean === 'вк' ||
    textClean === 'вконтакте' ||
    textClean === 'vk bot'
  ) {
    const text =
      `📱 <b>IT-Старт во ВКонтакте:</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>VK Бот:</b> Наш официальный бот сообщества ВКонтакте работает 24/7!\n` +
      `• <b>VK Mini App:</b> Платформа оптимизирована для запуска внутри клиента VK.\n\n` +
      `💬 <b>Диалог с ботом VK:</b> https://vk.com/im?sel=-242573933\n` +
      `👥 <b>Группа ВКонтакте:</b> https://vk.com/club242573933\n` +
      `🚀 <b>VK Mini App:</b> https://vk.com/app54857681\n` +
      `🌐 <b>Веб-сайт:</b> ${PUBLIC_WEB_URL}`;

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Бот ВКонтакте', url: 'https://vk.com/im?sel=-242573933' },
            { text: '🚀 VK Mini App', url: 'https://vk.com/app54857681' },
          ],
          [
            { text: '💼 Стажировки', callback_data: 'vacancies:all' },
            { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
          ],
        ],
      },
    });
    return { ok: true, type: 'vk', chatId };
  }

  // 15. /tg or /telegram
  if (
    textClean === '/tg' ||
    textClean === '/telegram' ||
    textClean === 'тг' ||
    textClean === 'телеграм' ||
    textClean === 'telegram'
  ) {
    const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;
    const text =
      `✈️ <b>IT-Старт в Telegram:</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Вы находитесь в официальном боте <b>@${BOT_USERNAME}</b>!\n\n` +
      `• 🚀 Telegram WebApp: запускается в 1 клик прямо в чате\n` +
      `• 🔔 Персональные пуш-уведомления о новых вакансиях\n` +
      `• 🗺 Роадмапы и тренажёр собеседований\n\n` +
      `🌐 <b>Веб-сайт:</b> ${PUBLIC_WEB_URL}\n` +
      `📱 <b>ВКонтакте Mini App:</b> https://vk.com/app54857681`;
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Запустить WebApp', web_app: { url: webAppUrlWithParams } }],
          [
            { text: '💼 Стажировки', callback_data: 'vacancies:all' },
            { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
          ],
        ],
      },
    });
    return { ok: true, type: 'tg', chatId };
  }

  // 16. /help or «помощь» or «справка»
  if (
    textClean === '/help' ||
    textClean === 'помощь' ||
    textClean === 'справка' ||
    textClean === 'команды'
  ) {
    return sendHelp(chatId);
  }

  // 17. Direct company name lookup («т1», «директум», «контур», «яндекс», etc.)
  const matchedCompany = findCompanyByQuery(textClean) || findCompanyByQuery(textLower);
  if (matchedCompany) {
    return sendCompanyVacancies(chatId, matchedCompany.id);
  }

  // 18. Default response
  const defaultText =
    `Я получил ваше сообщение: «${textRaw.slice(0, 35)}» 🤔\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Используйте меню команд или выберите действие ниже:`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: defaultText,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚀 Запустить IT-Старт WebApp', web_app: { url: webAppUrlWithParams } },
        ],
        [
          { text: '💼 Стажировки', callback_data: 'vacancies:all' },
          { text: '🏢 Компании', callback_data: 'companies' },
        ],
        [
          { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
          { text: '❓ Тренажёр', callback_data: 'questions' },
        ],
        [
          { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
          { text: 'ℹ️ Помощь', callback_data: 'help' },
        ],
      ],
    },
  });
  return { ok: true, type: 'unknown', chatId };
}

/**
 * Send subscription confirmation and WebApp link
 */
export async function sendSubscribe(chatId, firstName = 'Разработчик', username = '') {
  await registerTgSubscriber(chatId, {
    username,
    first_name: firstName,
  });
  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&tg_username=${encodeURIComponent(username || '')}&tg_first_name=${encodeURIComponent(firstName || '')}&subscribed=1#tg_chat_id=${chatId}`;
  const text =
    `🔔 <b>Уведомления успешно подключены!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 Telegram Chat ID: <code>${chatId}</code>\n` +
    `Вы подписаны на все направления стажировок (Frontend, Backend, Mobile, QA, DevOps, Data Science).\n\n` +
    `Новые позиции будут приходить мгновенно в этот чат!\n` +
    `Настроить конкретные компании и стек можно в WebApp:`;
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Настроить фильтры в WebApp',
            web_app: { url: webAppUrlWithParams },
          },
        ],
        [
          { text: '💼 Стажировки', callback_data: 'vacancies:all' },
          { text: '🏢 Компании', callback_data: 'companies' },
        ],
        [
          { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
          { text: '🔕 Отписаться', callback_data: 'unsubscribe' },
        ],
      ],
    },
  });
  return { ok: true, type: 'subscribe', chatId };
}

/**
 * Send user Telegram Chat ID and details
 */
export async function sendId(chatId, firstName = 'Разработчик', username = '') {
  const text =
    `🆔 <b>Ваш идентификатор Telegram:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• Chat ID: <code>${chatId}</code>\n` +
    `• Username: @${username || 'не указан'}\n` +
    `• Имя: <b>${firstName}</b>\n\n` +
    `Этот ID используется сервисом IT-Старт для отправки персональных пуш-уведомлений о новых стажировках.\n` +
    `В Telegram WebApp ваш ID подставляется автоматически!`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&tg_username=${encodeURIComponent(username || '')}&tg_first_name=${encodeURIComponent(firstName || '')}&subscribed=1#tg_chat_id=${chatId}`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚀 Запустить IT-Старт WebApp', web_app: { url: webAppUrlWithParams } },
        ],
        [
          { text: '💼 Стажировки', callback_data: 'vacancies:all' },
          { text: '🔔 Подписка', callback_data: 'subscribe' },
        ],
        [
          { text: '🏢 Компании', callback_data: 'companies' },
          { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
        ],
      ],
    },
  });
  return { ok: true, type: 'id', chatId };
}

/**
 * Send vacancies list with company and direction filter buttons
 */
export async function sendVacancies(chatId, filter = 'all') {
  const allList = await getActiveInternships();
  let list = allList;
  let titleHeader = '🔥 <b>Актуальные IT-стажировки 2026:</b>\n━━━━━━━━━━━━━━━━━━━━\n\n';

  const dirMatch = filter !== 'all' ? resolveDirectionByQuery(filter) : null;
  const companyMatch = filter !== 'all' && !dirMatch ? (COMPANIES_DATA.find((c) => c.id === filter) || findCompanyByQuery(filter)) : null;

  if (dirMatch) {
    list = allList.filter((i) => (i.directionId || '').toLowerCase() === dirMatch);
    titleHeader = `🔥 <b>Стажировки: ${DIRECTION_TITLES[dirMatch] || dirMatch} (${list.length}):</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  } else if (companyMatch) {
    list = allList.filter((i) => i.companyId === companyMatch.id || findCompanyByQuery(i.company)?.id === companyMatch.id);
    titleHeader = `🏢 <b>Вакансии ${companyMatch.name} (${companyMatch.channel}):</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  } else if (filter !== 'all') {
    list = allList.filter(
      (i) =>
        (i.directionId || '').toLowerCase() === filter.toLowerCase() ||
        (i.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(filter.toLowerCase()))
    );
    titleHeader = `🔍 <b>Стажировки по запросу «${filter}» (${list.length}):</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  let text = titleHeader;
  if (list.length === 0) {
    text += `🔍 По вашему запросу стажировок не найдено.\nПопробуйте выбрать другое направление или компанию ниже!`;
  } else {
    list.slice(0, 5).forEach((item, idx) => {
      const applyUrl = item.applyUrl || item.url || PUBLIC_WEB_URL;
      const webAppVacancyUrl = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}vacancyId=${item.id}`;
      const channel = resolveChannelHandle(item.sourceChannel || item.channel, item.company);
      const stack = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.slice(0, 4).join(' • ') : '';
      const salaryFormatted = formatSalary(item.salary);
      const loc = formatLocation(item);
      const isTgPost = applyUrl.includes('t.me/');
      const isPortal = !isTgPost && !applyUrl.includes('hh.ru');
      const actionText = '🚀 Открыть в WebApp';
      const sourceLabel = isTgPost ? `📢 Пост в ${channel}` : isPortal ? `🌐 Сайт ${item.company}` : `📄 HeadHunter`;

      text += `<b>${idx + 1}. 🏢 ${item.company}</b>\n`;
      text += `💼 <b>${item.title}</b>\n`;
      text += `💰 <b>${salaryFormatted}</b> | 📍 ${loc}\n`;
      if (stack) {
        text += `🏷 <code>${stack}</code>\n`;
      }
      text += `${sourceLabel} ➔ <a href="${webAppVacancyUrl}"><b>${actionText}</b></a>\n`;
      text += `─────────────────────\n`;
    });
    if (list.length > 5) {
      text += `<i>... и ещё ${list.length - 5} стажировок доступно в WebApp!</i>\n\n`;
    }
    text += `💡 <i>Все фильтры, роадмапы и тренажёр доступны в приложении:</i>\n`;
    text += `🌐 <a href="${PUBLIC_WEB_URL}">Веб-сайт</a> • 📱 <a href="https://vk.com/app54857681">VK Mini App</a>`;
  }

  if (text.length > 3900) {
    text = text.slice(0, 3850) + '\n\n<i>(Список сокращен, откройте WebApp для полного просмотра)</i>';
  }

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const isSubscribed = tgSubscribers.has(String(chatId)) && tgSubscribers.get(String(chatId)).is_active;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💻 Frontend', callback_data: 'direction:frontend' },
        { text: '⚙️ Backend', callback_data: 'direction:backend' },
      ],
      [
        { text: '📱 Mobile', callback_data: 'direction:mobile' },
        { text: '🤖 Data Science', callback_data: 'direction:data_science' },
      ],
      [
        { text: '🧪 QA', callback_data: 'direction:qa' },
        { text: '☁️ DevOps', callback_data: 'direction:devops' },
      ],
      [
        { text: '🏢 Т1', callback_data: 'vacancies:t1' },
        { text: '💼 Контур', callback_data: 'vacancies:kontur' },
        { text: '💳 Т-Банк', callback_data: 'vacancies:tbank' },
      ],
      [
        { text: '⚡ Directum', callback_data: 'vacancies:directum' },
        { text: '🔍 Яндекс', callback_data: 'vacancies:yandex' },
        { text: '📦 Ozon', callback_data: 'vacancies:ozon' },
      ],
      [
        { text: '🟢 Сбер', callback_data: 'vacancies:sber' },
        { text: '🟣 Авито', callback_data: 'vacancies:avito' },
        { text: '🔷 VK', callback_data: 'vacancies:vk' },
      ],
      [
        { text: isSubscribed ? '🔕 Отписаться' : '🔔 Подписка', callback_data: isSubscribed ? 'unsubscribe' : 'subscribe' },
        { text: '💼 Вакансии', callback_data: 'vacancies:all' },
        { text: '🏢 Компании', callback_data: 'companies' },
      ],
      [
        { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🌐 Открыть сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });

  return { ok: true, type: 'vacancies', chatId, filter, count: list.length };
}

/**
 * Send monitored companies overview
 */
export async function sendCompanies(chatId) {
  let text = `🏢 <b>Целевые IT-компании и программы стажировок:</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  COMPANIES_DATA.forEach((c, idx) => {
    text += `<b>${idx + 1}. 🏢 ${c.name}</b> (${c.shortName})\n`;
    text += `🛠 <code>${c.stack}</code>\n`;
    text += `📢 ${c.channel}\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 <i>Выберите компанию ниже, чтобы посмотреть открытые стажировки и подробности:</i>`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🏢 Т1', callback_data: 'company:t1' },
        { text: '💼 Контур', callback_data: 'company:kontur' },
        { text: '💳 Т-Банк', callback_data: 'company:tbank' },
      ],
      [
        { text: '⚡ Directum', callback_data: 'company:directum' },
        { text: '🔍 Яндекс', callback_data: 'company:yandex' },
        { text: '📦 Ozon', callback_data: 'company:ozon' },
      ],
      [
        { text: '🟢 Сбер', callback_data: 'company:sber' },
        { text: '🟣 Авито', callback_data: 'company:avito' },
        { text: '🔷 VK', callback_data: 'company:vk' },
      ],
      [
        { text: '💼 Вакансии', callback_data: 'vacancies:all' },
        { text: '🔔 Подписка', callback_data: 'subscribe' },
      ],
      [
        { text: '🚀 Смотреть в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });

  return { ok: true, type: 'companies', chatId, count: COMPANIES_DATA.length };
}

/**
 * Send vacancies and details for a specific company
 */
export async function sendCompanyVacancies(chatId, companyId) {
  const company = COMPANIES_DATA.find((c) => c.id === companyId) || findCompanyByQuery(companyId);
  if (!company) {
    return sendCompanies(chatId);
  }

  const allList = await getActiveInternships();
  const list = allList.filter(
    (i) => i.companyId === company.id || findCompanyByQuery(i.company)?.id === company.id
  );

  let text = `🏢 <b>Компания: ${company.name} (${company.shortName})</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📝 <i>${company.description}</i>\n\n`;
  text += `🛠 <b>Стек:</b> <code>${company.stack}</code>\n`;
  text += `📢 <b>Канал:</b> <code>${company.channel}</code>\n\n`;
  text += `🔥 <b>Открытые стажировки (${list.length}):</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (list.length === 0) {
    text += `🔍 Сейчас прямых позиций в базе нет, но парсер отслеживает <code>${company.channel}</code> 24/7!\nПроверьте WebApp или сайт компании:\n`;
  } else {
    list.slice(0, 5).forEach((item, idx) => {
      const applyUrl = item.applyUrl || item.url || PUBLIC_WEB_URL;
      const salaryFormatted = formatSalary(item.salary);
      const loc = formatLocation(item);
      const stack = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.slice(0, 4).join(' • ') : '';

      text += `<b>${idx + 1}. ${item.title}</b>\n`;
      text += `💰 <b>${salaryFormatted}</b> | 📍 ${loc}\n`;
      if (stack) {
        text += `🏷 <code>${stack}</code>\n`;
      }
      text += `🔗 <a href="${applyUrl}"><b>Откликнуться →</b></a>\n`;
      text += `─────────────────────\n`;
    });
  }

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `📢 Канал ${company.channel}`, url: company.channelUrl },
      ],
      [
        { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🏢 Компании', callback_data: 'companies' },
        { text: '💼 Вакансии', callback_data: 'vacancies:all' },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });

  return { ok: true, type: 'company_details', chatId, companyId: company.id, count: list.length };
}

/**
 * Trigger manual channels & career sites scan and report back
 */
export async function runManualScan(chatId) {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: `⚡ <b>Запуск полного сканирования...</b>\n\nОпрашиваем ${ALL_TARGET_TG_CHANNELS.length} Telegram-каналов и ${CAREER_WEBSITES_DATA.length} карьерных сайтов...`,
    parse_mode: 'HTML',
  });

  const res = await scanChannelsAndSyncSupabase(true);

  const reportText =
    `✅ <b>Сканирование источников успешно завершено!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• Проверено Telegram-каналов: <b>${res.channelsChecked}</b>\n` +
    `• Проверено карьерных сайтов/API: <b>${res.websitesChecked}</b>\n` +
    `• Спарсено новых вакансий: <b>${res.parsedCount}</b>\n` +
    `• Всего активных стажировок в базе: <b>${res.totalActive}</b>\n` +
    `• Синхронизировано с Supabase: <b>${res.savedCount}</b>\n` +
    `• Отправлено пуш-уведомлений: <b>${res.sentPushes}</b>\n\n` +
    `Все свежие стажировки доступны по команде /vacancies и в WebApp!`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💼 Вакансии', callback_data: 'vacancies:all' },
        { text: '📊 Статус', callback_data: 'status' },
      ],
      [
        { text: '🚀 Открыть WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: reportText,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'scan', chatId, result: res };
}

/**
 * Send full parser, bot, and sources status
 */
export async function sendStatus(chatId) {
  const uptimeMinutes = Math.floor(process.uptime() / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeFormatted = uptimeHours > 0 ? `${uptimeHours} ч ${uptimeMinutes % 60} мин` : `${uptimeMinutes} мин`;

  const statusText =
    `📊 <b>Статус IT-Старт Парсера & Серверов:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• <b>Telegram Бот:</b> @${BOT_USERNAME} (Long Polling 24/7)\n` +
    `• <b>VK Бот:</b> Онлайн (Bots Long Poll API & VK Mini App)\n` +
    `• <b>Аптайм сервера:</b> ${uptimeFormatted} (порт ${PORT})\n` +
    `• <b>Всего активных вакансий в базе:</b> <b>${LAST_SCAN_STATUS.totalActive || 16}</b>\n` +
    `• <b>Telegram-каналов в мониторинге:</b> <b>${ALL_TARGET_TG_CHANNELS.length}</b> источников\n` +
    `  <i>(@tbank_team, @KonturTech, @Life_in_Directum, @t1career, @yandex_intern, @forjunior...)</i>\n` +
    `• <b>Карьерных сайтов & API:</b> <b>${CAREER_WEBSITES_DATA.length}</b> источников\n` +
    `  <i>(career.directum.ru, kontur.ru, fintech.tbank.ru, t1.ru, Habr Career...)</i>\n` +
    `• <b>Последняя синхронизация:</b> <code>${LAST_SCAN_STATUS.lastScanAt ? new Date(LAST_SCAN_STATUS.lastScanAt).toLocaleTimeString('ru-RU') : 'недавно'}</code>\n` +
    `• <b>Синхронизировано в Supabase:</b> ${LAST_SCAN_STATUS.savedCount || 0} вакансий\n` +
    `• <b>Разослано пуш-уведомлений:</b> ${LAST_SCAN_STATUS.sentPushes || 0}\n\n` +
    `💡 <i>Для обновления отправьте команду /parse или /sync</i>`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '⚡ Скан', callback_data: 'parse' },
        { text: '💼 Стажировки', callback_data: 'vacancies:all' },
      ],
      [
        { text: '🚀 Открыть WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: statusText,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'status', chatId };
}

/**
 * Send roadmaps summary
 */
export async function sendRoadmaps(chatId) {
  const text =
    `🗺 <b>Интерактивные Роадмапы IT-Старт:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `1. 💻 <b>Frontend:</b> JS / TS ➔ React, Vue, Angular\n` +
    `2. ⚙️ <b>Backend:</b> REST, SQL, Docker ➔ Python, Go, Java\n` +
    `3. 📱 <b>Mobile:</b> Архитектура ➔ Android, iOS, Flutter\n` +
    `4. 🤖 <b>Data Science:</b> Python, SQL ➔ ML, LLM & AI\n` +
    `5. 🧪 <b>QA:</b> Тест-дизайн ➔ Manual & Auto (Playwright)\n` +
    `6. ☁️ <b>DevOps:</b> Linux, CI/CD ➔ Docker & Kubernetes\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <i>Интерактивное древо (roadmap.sh style) с чекбоксами навыков и подсчетом прогресса в % доступно в WebApp!</i>`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🗺 Открыть роадмапы в WebApp',
          web_app: { url: webAppUrlWithParams },
        },
      ],
      [
        { text: '💼 Стажировки', callback_data: 'vacancies:all' },
        { text: '❓ Тренажёр', callback_data: 'questions' },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
        { text: '🏠 Меню', callback_data: 'help' },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'roadmaps', chatId };
}

/**
 * Send interview questions trainer overview
 */
export async function sendQuestions(chatId) {
  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const text =
    `❓ <b>Тренажёр вопросов к собеседованию IT-Старт:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `55+ реальных вопросов от Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK:\n\n` +
    `• 💻 <b>Frontend:</b> Event Loop, Microtasks, React Fiber\n` +
    `• ⚙️ <b>Backend:</b> ACID, изоляция PostgreSQL, Goroutines\n` +
    `• 📱 <b>Mobile:</b> Lifecycle, Coroutines, Swift ARC\n` +
    `• 🧪 <b>QA:</b> Тест-дизайн, REST API, Playwright\n` +
    `• ☁️ <b>DevOps:</b> Docker cgroups, CI/CD, Kubernetes\n` +
    `• 🤖 <b>Data Science:</b> Gradient Descent, ROC-AUC, SQL\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <b>Доступны 2 режима:</b> флеш-карточки и симуляция интервью со скрытием ответа!`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Запустить тренажёр в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '💼 Стажировки', callback_data: 'vacancies:all' },
        { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
      ],
      [
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
        { text: '🔔 Подписка', callback_data: 'subscribe' },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'questions', chatId };
}

/**
 * Send website & cross-platform apps links
 */
export async function sendSite(chatId) {
  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const text =
    `🚀 <b>Платформа IT-Старт доступна на всех устройствах:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 <b>Веб-сайт:</b> ${PUBLIC_WEB_URL}\n` +
    `✈️ <b>Telegram Mini App:</b> запускается прямо внутри этого чата\n` +
    `📱 <b>ВКонтакте Mini App:</b> https://vk.com/app54857681\n` +
    `🐙 <b>Зеркало на GitHub Pages:</b> ${GITHUB_PAGES_URL}\n\n` +
    `🎯 <b>В платформе доступны:</b>\n` +
    `• Интерактивные роадмапы со шкалой готовности в %\n` +
    `• Тренажёр 55+ вопросов к собеседованию с режимом скрытия ответов\n` +
    `• Каталог стажировок с детальными фильтрами по технологиям и компаниям!`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Запустить Telegram WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🌐 Открыть сайт', url: PUBLIC_WEB_URL },
      ],
      [
        { text: '💼 Стажировки', callback_data: 'vacancies:all' },
        { text: '🏢 Компании', callback_data: 'companies' },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'site', chatId };
}

/**
 * Send help message
 */
export async function sendHelp(chatId) {
  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const text =
    `ℹ️ <b>Команды бота @${BOT_USERNAME}:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• /start — Главное меню и WebApp\n` +
    `• /vacancies — Каталог стажировок\n` +
    `• /companies — Список IT-работодателей\n` +
    `• /roadmaps — Карты развития (6 треков)\n` +
    `• /questions — 55+ вопросов собеседования\n` +
    `• /subscribe — Включить пуши вакансий\n` +
    `• /unsubscribe — Отключить пуши\n` +
    `• /status — Состояние парсера и базы\n` +
    `• /id — Ваш Telegram Chat ID\n` +
    `• /scan — Запуск сканирования\n` +
    `• /site — Веб-платформа без VPN\n` +
    `• /vk — Официальный бот ВКонтакте\n` +
    `• /help — Список всех команд\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 <b>Быстрый переход к работодателям:</b>\n` +
    `• /company_t1 • /company_kontur • /company_tbank\n` +
    `• /company_directum • /company_yandex • /company_ozon\n` +
    `• /company_sber • /company_avito • /company_vk\n\n` +
    `💻 <b>Быстрый переход по направлениям:</b>\n` +
    `• /frontend • /backend • /mobile\n` +
    `• /data_science • /qa • /devops\n\n` +
    `💡 <i>Вы также можете отправить название («яндекс», «т1», «контур», «директум») или стека («фронтенд», «бэкенд»)!</i>\n\n` +
    `🌐 <b>Веб-сайт:</b> ${PUBLIC_WEB_URL}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Запустить IT-Старт WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '💼 Стажировки', callback_data: 'vacancies:all' },
        { text: '🏢 Компании', callback_data: 'companies' },
      ],
      [
        { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
        { text: '❓ Тренажёр', callback_data: 'questions' },
      ],
      [
        { text: '🔔 Подписка', callback_data: 'subscribe' },
        { text: '🌐 Веб-сайт', url: PUBLIC_WEB_URL },
      ],
    ],
  };

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  return { ok: true, type: 'help', chatId };
}


export function getSubscriptionKeyboard(isSubscribed) {
  return [
    [{ text: '📋 Все вакансии', callback_data: 'vacancies:all' }],
    [{ text: isSubscribed ? '🔕 Отписаться' : '🔔 Подписка', callback_data: isSubscribed ? 'unsubscribe' : 'subscribe' }],
  ];
}

/**
 * Handle inline button callback queries
 */
export async function handleCallbackQuery(query) {
  const chatId = query.message?.chat?.id;
  const data = query.data;

  await callTelegram('answerCallbackQuery', { callback_query_id: query.id });

  if (!chatId) return { ok: false, error: 'Missing chatId' };

  if (data === 'vacancies' || data === 'vacancies:all') {
    return sendVacancies(chatId, 'all');
  } else if (data.startsWith('direction:') || data.startsWith('vacancies:direction:')) {
    const dirId = data.replace(/^vacancies:direction:/, '').replace(/^direction:/, '');
    return sendVacancies(chatId, dirId);
  } else if (data.startsWith('vacancies:')) {
    const compId = data.replace('vacancies:', '');
    return sendVacancies(chatId, compId);
  } else if (data === 'companies') {
    return sendCompanies(chatId);
  } else if (data.startsWith('company:')) {
    const compId = data.replace('company:', '');
    return sendCompanyVacancies(chatId, compId);
  } else if (data === 'scan' || data === 'parse' || data === 'sync') {
    return runManualScan(chatId);
  } else if (data === 'status') {
    return sendStatus(chatId);
  } else if (data === 'roadmaps') {
    return sendRoadmaps(chatId);
  } else if (data === 'help') {
    return sendHelp(chatId);
  } else if (data === 'questions') {
    return sendQuestions(chatId);
  } else if (data === 'site') {
    return sendSite(chatId);
  } else if (data === 'subscribe') {
    await registerTgSubscriber(chatId, {
      username: query.from?.username || '',
      first_name: query.from?.first_name || 'Разработчик',
    });
    
    // Update keyboard
    if (query.message) {
        const isSubscribed = true;
        // Reconstruct keyboard for the vacancies list
        const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=${isSubscribed ? '1' : '0'}#tg_chat_id=${chatId}`;
        const keyboard = {
            inline_keyboard: [
              [
                { text: '💻 Frontend', callback_data: 'direction:frontend' },
                { text: '⚙️ Backend', callback_data: 'direction:backend' },
              ],
              [
                { text: '📱 Mobile', callback_data: 'direction:mobile' },
                { text: '🤖 Data Science', callback_data: 'direction:data_science' },
              ],
              [
                { text: '🧪 QA', callback_data: 'direction:qa' },
                { text: '☁️ DevOps', callback_data: 'direction:devops' },
              ],
              [
                { text: '🏢 Т1', callback_data: 'vacancies:t1' },
                { text: '💼 Контур', callback_data: 'vacancies:kontur' },
                { text: '💳 Т-Банк', callback_data: 'vacancies:tbank' },
              ],
              [
                { text: '⚡ Directum', callback_data: 'vacancies:directum' },
                { text: '🔍 Яндекс', callback_data: 'vacancies:yandex' },
                { text: '📦 Ozon', callback_data: 'vacancies:ozon' },
              ],
              [
                { text: '🟢 Сбер', callback_data: 'vacancies:sber' },
                { text: '🟣 Авито', callback_data: 'vacancies:avito' },
                { text: '🔷 VK', callback_data: 'vacancies:vk' },
              ],
              [
                { text: isSubscribed ? '🔕 Отписаться' : '🔔 Подписка', callback_data: isSubscribed ? 'unsubscribe' : 'subscribe' },
                { text: '💼 Вакансии', callback_data: 'vacancies:all' },
                { text: '🏢 Компании', callback_data: 'companies' },
              ],
              [
                { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
              ],
              [
                { text: '🌐 Открыть сайт', url: PUBLIC_WEB_URL },
              ],
            ],
          };

        await callTelegram('editMessageReplyMarkup', {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: keyboard
        });
    }

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔔 <b>Подписка успешно оформлена!</b> Вы будете получать уведомления о новых стажировках.`,
      parse_mode: 'HTML',
    });
  } else if (data === 'unsubscribe') {
    await unregisterTgSubscriber(chatId);
    
    // Update keyboard
    if (query.message) {
        const isSubscribed = false;
        // Reconstruct keyboard for the vacancies list
        const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=${isSubscribed ? '1' : '0'}#tg_chat_id=${chatId}`;
        const keyboard = {
            inline_keyboard: [
              [
                { text: '💻 Frontend', callback_data: 'direction:frontend' },
                { text: '⚙️ Backend', callback_data: 'direction:backend' },
              ],
              [
                { text: '📱 Mobile', callback_data: 'direction:mobile' },
                { text: '🤖 Data Science', callback_data: 'direction:data_science' },
              ],
              [
                { text: '🧪 QA', callback_data: 'direction:qa' },
                { text: '☁️ DevOps', callback_data: 'direction:devops' },
              ],
              [
                { text: '🏢 Т1', callback_data: 'vacancies:t1' },
                { text: '💼 Контур', callback_data: 'vacancies:kontur' },
                { text: '💳 Т-Банк', callback_data: 'vacancies:tbank' },
              ],
              [
                { text: '⚡ Directum', callback_data: 'vacancies:directum' },
                { text: '🔍 Яндекс', callback_data: 'vacancies:yandex' },
                { text: '📦 Ozon', callback_data: 'vacancies:ozon' },
              ],
              [
                { text: '🟢 Сбер', callback_data: 'vacancies:sber' },
                { text: '🟣 Авито', callback_data: 'vacancies:avito' },
                { text: '🔷 VK', callback_data: 'vacancies:vk' },
              ],
              [
                { text: isSubscribed ? '🔕 Отписаться' : '🔔 Подписка', callback_data: isSubscribed ? 'unsubscribe' : 'subscribe' },
                { text: '💼 Вакансии', callback_data: 'vacancies:all' },
                { text: '🏢 Компании', callback_data: 'companies' },
              ],
              [
                { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
              ],
              [
                { text: '🌐 Открыть сайт', url: PUBLIC_WEB_URL },
              ],
            ],
          };

        await callTelegram('editMessageReplyMarkup', {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: keyboard
        });
    }

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔕 <b>Вы отписались от уведомлений IT-Старт.</b>\nЧтобы возобновить, отправьте /subscribe.`,
      parse_mode: 'HTML',
    });
  }
}

let offset = 0;

/**
 * Main long polling loop
 */
async function pollUpdates() {
  console.log(`🚀 Бот @${BOT_USERNAME} успешно запущен в режиме Long Polling!`);
  console.log(`Нажмите Ctrl+C для остановки.\n`);

  // Ensure Telegram persistent menu button points to live GitHub Pages WebApp (never dead Koyeb 404)
  if (BOT_TOKEN) {
    callTelegram('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'IT-Старт',
        web_app: { url: WEBAPP_URL },
      },
    }).catch(() => {});
  }

  // Initial channel sync on startup (delayed by 4s to let HTTP server start)
  setTimeout(() => {
    scanChannelsAndSyncSupabase(true).catch((e) => console.warn('[Startup Sync]', e.message));
  }, 4000);

  // Periodic channel tracking every 15 minutes (ensures active monitoring within Render lifecycle)
  setInterval(() => {
    scanChannelsAndSyncSupabase(true).catch((e) => console.warn('[Periodic Sync]', e.message));
  }, 15 * 60 * 1000);

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

// Clean signal handling for SIGTERM/SIGINT is registered above with graceful server shutdown

const isDirectRun =
  Boolean(process.argv[1]) &&
  !process.argv[1].includes('vk_bot') &&
  !process.argv[1].includes('sync') &&
  (path.basename(process.argv[1]) === 'bot.mjs' || path.basename(process.argv[1]) === 'bot.js');

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  if (BOT_TOKEN) {
    pollUpdates();
  } else {
    // When running without Telegram token, still schedule background vacancy monitoring
    setTimeout(() => {
      scanChannelsAndSyncSupabase(true).catch((e) => console.warn('[Startup Sync]', e.message));
    }, 4000);
    setInterval(() => {
      scanChannelsAndSyncSupabase(true).catch((e) => console.warn('[Periodic Sync]', e.message));
    }, 15 * 60 * 1000);
  }
}

// Start VK bot concurrently unless explicitly disabled via --no-vk
if (
  isDirectRun &&
  process.env.NODE_ENV !== 'test' &&
  !process.argv.includes('--no-vk')
) {
  import('./vk_bot.mjs')
    .then(({ startVkBot }) => {
      startVkBot().catch((err) => console.warn('[VK Bot Startup]', err.message));
    })
    .catch((err) => console.warn('[VK Bot Import]', err.message));
}
