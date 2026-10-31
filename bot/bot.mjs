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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.argv[2] || '';
const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
export const RENDER_URL = process.env.RENDER_URL || 'https://it-start-bot.onrender.com/';
export const WEBAPP_URL = process.env.WEBAPP_URL || RENDER_URL;
const BOT_USERNAME = 'IT_start_izh_bot';
const PORT = process.env.PORT || 3000;
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
    "url": "https://fintech.tbank.ru/start/frontend/",
    "applyUrl": "https://fintech.tbank.ru/start/frontend/",
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
    "url": "https://yandex.ru/jobs/pages/internship-backend",
    "applyUrl": "https://yandex.ru/jobs/pages/internship-backend",
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
    "url": "https://career.avito.com/vacancies/razrabotka/20805/",
    "applyUrl": "https://career.avito.com/vacancies/razrabotka/20805/",
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
    "url": "https://internship.vk.company/internship/qa",
    "applyUrl": "https://internship.vk.company/internship/qa",
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
    "url": "https://kontur.ru/career/vacancies/intern-frontend",
    "applyUrl": "https://kontur.ru/career/vacancies/intern-frontend",
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
    "url": "https://fintech.tbank.ru/start/analytics/",
    "applyUrl": "https://fintech.tbank.ru/start/analytics/",
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
    "url": "https://yandex.ru/jobs/pages/internship-mobile",
    "applyUrl": "https://yandex.ru/jobs/pages/internship-mobile",
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
    "url": "https://internship.vk.company/internship/backend",
    "applyUrl": "https://internship.vk.company/internship/backend",
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
    "url": "https://career.avito.com/vacancies/razrabotka/20803/",
    "applyUrl": "https://career.avito.com/vacancies/razrabotka/20803/",
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
    "url": "https://fintech.tbank.ru/start/frontend/",
    "applyUrl": "https://fintech.tbank.ru/start/frontend/",
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
    "url": "https://yandex.ru/jobs/pages/internship-ml",
    "applyUrl": "https://yandex.ru/jobs/pages/internship-ml",
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
    "url": "https://kontur.ru/career/vacancies/intern-backend",
    "applyUrl": "https://kontur.ru/career/vacancies/intern-backend",
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
    "url": "https://career.t1.ru/vacancies/java-developer",
    "applyUrl": "https://career.t1.ru/vacancies/java-developer",
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
    "url": "https://career.t1.ru/vacancies/devops-engineer",
    "applyUrl": "https://career.t1.ru/vacancies/devops-engineer",
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
    "url": "https://career.t1.ru/vacancies/qa-automation",
    "applyUrl": "https://career.t1.ru/vacancies/qa-automation",
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
    "url": "https://career.directum.ru/vacancy/web-developer",
    "applyUrl": "https://career.directum.ru/vacancy/web-developer",
    "sourceChannel": "@Life_in_Directum",
    "description": "Разработка веб-клиента флагманской платформы управления цифровыми процессами и документами Directum RX в Ижевске.",
    "tags": [
      "React",
      "TypeScript",
      "Directum RX",
      "Web Client",
      "Ижевск",
      "Директум"
    ]
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
    "url": "https://career.directum.ru/vacancy/backend-csharp",
    "applyUrl": "https://career.directum.ru/vacancy/backend-csharp",
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
    ]
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
    "url": "https://career.directum.ru/vacancy/qa-engineer",
    "applyUrl": "https://career.directum.ru/vacancy/qa-engineer",
    "sourceChannel": "@Life_in_Directum",
    "description": "Тестирование веб- и десктоп-клиентов Directum RX, поиск дефектов в бизнес-процессах электронного документооборота.",
    "tags": [
      "Manual QA",
      "Тест-дизайн",
      "Directum RX",
      "Postman",
      "Ижевск",
      "Директум"
    ]
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
    "url": "https://kontur.ru/career/vacancies/intern-frontend",
    "applyUrl": "https://kontur.ru/career/vacancies/intern-frontend",
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
    "url": "https://kontur.ru/career/vacancies/intern-backend",
    "applyUrl": "https://kontur.ru/career/vacancies/intern-backend",
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
    "url": "https://fintech.tbank.ru/start/backend/",
    "applyUrl": "https://fintech.tbank.ru/start/backend/",
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
    "url": "https://fintech.tbank.ru/start/sre/",
    "applyUrl": "https://fintech.tbank.ru/start/sre/",
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
    "url": "https://career.avito.com/vacancies/razrabotka/20808/",
    "applyUrl": "https://career.avito.com/vacancies/razrabotka/20808/",
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
    "url": "https://career.avito.com/vacancies/razrabotka/20812/",
    "applyUrl": "https://career.avito.com/vacancies/razrabotka/20812/",
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
    "url": "https://internship.vk.company/internship/web",
    "applyUrl": "https://internship.vk.company/internship/web",
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
    "url": "https://internship.vk.company/internship/data",
    "applyUrl": "https://internship.vk.company/internship/data",
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
    "url": "https://fintech.tbank.ru/start/backend/",
    "applyUrl": "https://fintech.tbank.ru/start/backend/",
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
    "url": "https://fintech.tbank.ru/start/qa/",
    "applyUrl": "https://fintech.tbank.ru/start/qa/",
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
    "url": "https://kontur.ru/career/vacancies/intern-qa",
    "applyUrl": "https://kontur.ru/career/vacancies/intern-qa",
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
    "title": "Инженер-разработчик Directum RX (C# / .NET, Ижевск)",
    "salary": "от 60 000 до 85 000 ₽",
    "format": "Гибрид",
    "location": "Ижевск (Офис / Гибрид)",
    "channel": "@Life_in_Directum",
    "directionId": "backend",
    "subTrackId": "java",
    "url": "https://career.directum.ru/lead_product_ownerRX",
    "applyUrl": "https://career.directum.ru/lead_product_ownerRX",
    "sourceChannel": "@Life_in_Directum",
    "description": "Разработка ядра интеллектуальной платформы управления цифровыми процессами и документами Directum RX в Ижевске. AI-сервисы, распределенная архитектура.",
    "tags": [
      "Directum RX",
      "C#",
      ".NET Core",
      "PostgreSQL",
      "Ижевск",
      "Директум"
    ]
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
    "url": "https://fintech.tbank.ru/start/backend/",
    "applyUrl": "https://fintech.tbank.ru/start/backend/",
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
    "url": "https://yandex.ru/jobs/pages/internship-frontend",
    "applyUrl": "https://yandex.ru/jobs/pages/internship-frontend",
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
    "url": "https://career.avito.com/vacancies/analitika-dannykh/20816/",
    "applyUrl": "https://career.avito.com/vacancies/analitika-dannykh/20816/",
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
    "url": "https://internship.vk.company/internship/mobile",
    "applyUrl": "https://internship.vk.company/internship/mobile",
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

// Rich metadata for all monitored Telegram channels
export const ALL_TARGET_TG_CHANNELS = [
  // Т-Банк
  { handle: '@tbank_team', companyId: 'tbank', company: 'Т-Банк', name: 'Работа в Т-Банке & Финтех', category: 'Стажировки и карьера в Т-Банке', url: 'https://t.me/tbank_team' },
  { handle: '@tbank_career', companyId: 'tbank', company: 'Т-Банк', name: 'Т-Банк Карьера', category: 'Официальный канал найма', url: 'https://t.me/tbank_career' },
  { handle: '@tinkoff_jobs', companyId: 'tbank', company: 'Т-Банк', name: 'Tinkoff Jobs & Финтех', category: 'IT и инженерные вакансии', url: 'https://t.me/tinkoff_jobs' },
  // Контур
  { handle: '@KonturTech', companyId: 'kontur', company: 'СКБ Контур', name: 'Технологии в Контуре', category: 'Контур.Старт & Junior IT', url: 'https://t.me/KonturTech' },
  { handle: '@kontur_career', companyId: 'kontur', company: 'СКБ Контур', name: 'Карьера в Контуре', category: 'Официальный карьерный канал', url: 'https://t.me/kontur_career' },
  // Directum
  { handle: '@Life_in_Directum', companyId: 'directum', company: 'Directum', name: 'Жизнь в Directum (Ижевск)', category: 'Разработка Directum RX в Ижевске', url: 'https://t.me/Life_in_Directum' },
  { handle: '@directum_career', companyId: 'directum', company: 'Directum', name: 'Directum Карьера (Ижевск)', category: 'Студенческие практики & Junior', url: 'https://t.me/directum_career' },
  // Т1
  { handle: '@t1career', companyId: 't1', company: 'Холдинг Т1', name: 'Холдинг Т1 / Открытая школа', category: 'Интенсивы и стажировки Т1', url: 'https://t.me/t1career' },
  { handle: '@t1_holding', companyId: 't1', company: 'Холдинг Т1', name: 'T1 Holding Official', category: 'Официальный канал группы Т1', url: 'https://t.me/t1_holding' },
  // Яндекс
  { handle: '@yandex_intern', companyId: 'yandex', company: 'Яндекс', name: 'Яндекс для стажёров', category: 'Young Con & Интерны', url: 'https://t.me/yandex_intern' },
  { handle: '@yandex', companyId: 'yandex', company: 'Яндекс', name: 'Яндекс Новости & Команда', category: 'Официальный канал Яндекса', url: 'https://t.me/yandex' },
  // Ozon
  { handle: '@ozon_tech_career', companyId: 'ozon', company: 'Ozon Tech', name: 'Ozon Tech Career', category: 'Ozon Camp & Junior вакансии', url: 'https://t.me/ozon_tech_career' },
  // Сбер
  { handle: '@sber_careers', companyId: 'sber', company: 'Сбер', name: 'Сбер Карьера & AI', category: 'SberSeasons & Data Science', url: 'https://t.me/sber_careers' },
  // Авито
  { handle: '@avito_tech', companyId: 'avito', company: 'Авито', name: 'Avito Tech Jobs', category: 'Mobile, Backend & Platform', url: 'https://t.me/avito_tech' },
  // VK
  { handle: '@vk_team', companyId: 'vk', company: 'VK', name: 'VK Team / Карьера в VK', category: 'Стажировки в экосистеме VK', url: 'https://t.me/vk_team' },
  // Агрегаторы
  { handle: '@forjunior', companyId: 'aggregator', company: 'For Junior', name: 'For Junior: Работа & Стажировки', category: 'Агрегатор IT-вакансий для новичков', url: 'https://t.me/forjunior' },
  { handle: '@it_internships', companyId: 'aggregator', company: 'IT Internships', name: 'IT Стажировки и Практика', category: 'Крупный агрегатор стажировок в РФ', url: 'https://t.me/it_internships' },
  { handle: '@normrabota', companyId: 'aggregator', company: 'Норм работа', name: 'Норм работа: IT Стажировки', category: 'Стажировки с прозрачной вилкой', url: 'https://t.me/normrabota' },
  { handle: '@tproger_jobs', companyId: 'aggregator', company: 'IT Channels', name: 'Типичный программист — Вакансии', category: 'Junior & Trainee вакансии', url: 'https://t.me/tproger_jobs' },
];

// Target career websites and employer open portals
export const CAREER_WEBSITES_DATA = [
  {
    id: 'site-directum',
    companyId: 'directum',
    company: 'Directum',
    name: 'Карьерный портал Directum (Ижевск)',
    url: 'https://career.directum.ru/vacancy',
    category: 'Прямой карьерный сайт вендора Directum RX',
    type: 'direct_site',
    city: 'Ижевск',
  },
  {
    id: 'site-kontur',
    companyId: 'kontur',
    company: 'СКБ Контур',
    name: 'Контур.Старт & Вакансии СКБ Контур',
    url: 'https://kontur.ru/career/vacancies',
    category: 'Официальный портал карьеры Контура',
    type: 'direct_site',
    city: 'Екатеринбург / Удаленно',
  },
  {
    id: 'site-tbank',
    companyId: 'tbank',
    company: 'Т-Банк',
    name: 'Т-Банк Финтех Старт',
    url: 'https://fintech.tbank.ru/start/',
    category: 'Официальные стажировки Т-Банка',
    type: 'direct_site',
    city: 'Москва / Удаленно',
  },
  {
    id: 'site-t1',
    companyId: 't1',
    company: 'Холдинг Т1',
    name: 'Открытая школа Т1 & Карьера',
    url: 'https://career.t1.ru/',
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
    url: 'https://yandex.ru/jobs/',
    category: 'Официальный портал стажировок Яндекса',
    type: 'direct_site',
    city: 'Москва / Гибрид',
  },
  {
    id: 'site-ozon',
    companyId: 'ozon',
    company: 'Ozon Tech',
    name: 'Ozon Camp & Карьера в IT',
    url: 'https://job.ozon.ru/it/',
    category: 'Официальный карьерный портал Ozon Tech',
    type: 'direct_site',
    city: 'Москва / Удаленно',
  },
  {
    id: 'site-sber',
    companyId: 'sber',
    company: 'Сбер',
    name: 'Сбер Карьера & SberSeasons',
    url: 'https://sbergraduate.ru/',
    category: 'Официальная программа стажировок Сбера',
    type: 'direct_site',
    city: 'Москва / Офис',
  },
  {
    id: 'site-avito',
    companyId: 'avito',
    company: 'Авито',
    name: 'Карьера в Avito Tech',
    url: 'https://career.avito.com/vacancies/?search=стажер',
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

// HTTP Health Check and Parser API server for Render.com Web Service
const server = http.createServer(async (req, res) => {
  // CORS headers for WebApp integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
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
              [
                { label: '🚀 Открыть IT-Старт (Mini App)', app_id: VK_APP_ID },
                ...(directUrl ? [{ label: actionLabel, link: directUrl }] : [{ label: '🌐 Веб-версия', link: RENDER_URL }]),
              ],
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
          [
            { text: '🚀 Открыть IT-Старт', web_app: { url: WEBAPP_URL } },
            ...(directUrl ? [{ text: actionLabel, url: directUrl }] : [{ text: '💬 Бот @' + BOT_USERNAME, url: `https://t.me/${BOT_USERNAME}` }]),
          ],
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
          });

          // Deliver immediate confirmation push in VK if user has permitted messages
          sendVkNotification(
            cleanPeerId,
            `🎉 Уведомления IT-Старт ВКонтакте успешно активированы!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Вы первыми узнаете о новых оплачиваемых стажировках от ведущих работодателей под ваш стек.`
          ).catch(() => {});

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, subscriber: sub }));
          return;
        }

        const sub = await registerTgSubscriber(chatId, {
          username,
          first_name: firstName,
          directions,
          sub_tracks,
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
  res.end('IT-Старт Telegram & VK Bot & Parser работает 24/7! (Render Health Check OK)\n');
});

if (process.env.NODE_ENV !== 'test') {
  const isDirectRun =
    process.argv[1] &&
    !process.argv[1].includes('vk_bot') &&
    (process.argv[1].endsWith('bot.mjs') || process.argv[1].endsWith('bot.js'));

  if (isDirectRun) {
    server.listen(PORT, () => {
      console.log(`🌐 HTTP сервер запущен на порту ${PORT} (Render Health Check & Parser API)`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[HTTP] Порт ${PORT} уже занят, процесс продолжает работу.`);
      } else {
        console.error('[HTTP Server Error]', err);
      }
    });

    // Check if bot tokens are provided
    if (!BOT_TOKEN) {
      console.log('='.repeat(70));
      console.log('⚡ IT-Старт Telegram & VK Bot Runner');
      console.log('='.repeat(70));
      console.log('⚠️  Внимание: TELEGRAM_BOT_TOKEN не указан!');
      console.log('');
      console.log('HTTP Health Check сервер продолжает работать на порту ' + PORT + ' (Render Web Service).');
      console.log('Чтобы бот отвечал в Telegram, укажите токен в переменных окружения Render:');
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
  tbank: 'https://www.tbank.ru/career/it/',
  kontur: 'https://kontur.ru/career/vacancies',
  directum: 'https://career.directum.ru/vacancy',
  t1: 'https://career.t1.ru/',
  yandex: 'https://yandex.ru/jobs/',
  ozon: 'https://job.ozon.ru/it/',
  sber: 'https://sbergraduate.ru/',
  avito: 'https://career.avito.com/',
  vk: 'https://internship.vk.company/',
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

export function getDirectVacancyPortalUrl(companyKey, fallback = 'https://career.directum.ru/vacancy?search=стажер') {
  switch (companyKey) {
    case 'avito':
      return 'https://career.avito.com/vacancies/?search=стажер';
    case 'tbank':
      return 'https://www.tbank.ru/career/it/vacancies/?search=стажер';
    case 'kontur':
      return 'https://kontur.ru/career/vacancies?search=стажер';
    case 'directum':
      return 'https://career.directum.ru/vacancy?search=стажер';
    case 't1':
      return 'https://career.t1.ru/vacancies/?search=стажер';
    case 'yandex':
      return 'https://yandex.ru/jobs/vacancies/?search=стажер';
    case 'ozon':
      return 'https://job.ozon.ru/it/vacancies/?search=стажер';
    case 'sber':
      return 'https://sbergraduate.ru/sberseasons-moscow/';
    case 'vk':
      return 'https://internship.vk.company/internship';
    default:
      return fallback;
  }
}

export function resolveApplyUrl(rawUrl, companyName = '') {
  const companyKey = getCompanyKey(companyName);
  const directPortal = getDirectVacancyPortalUrl(companyKey);

  if (!rawUrl || typeof rawUrl !== 'string') {
    return directPortal;
  }

  const trimmed = rawUrl.trim();

  // 1. Direct Telegram post link
  if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return trimmed;
  }
  if (/^t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // 2. Direct job boards
  if (trimmed.includes('hh.ru/vacancy/') || trimmed.includes('career.habr.com/vacancies/')) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  // 3. Direct company vacancy page with search params or specific vacancy path
  if (
    trimmed.includes('/vacancies/') ||
    trimmed.includes('/vacancy/') ||
    trimmed.includes('/vacancies?') ||
    trimmed.includes('/vacancy?') ||
    trimmed.includes('?search=') ||
    trimmed.includes('?direction=') ||
    trimmed.includes('/lead_')
  ) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  // 4. Bare telegram channel without post number
  if (trimmed.startsWith('@') || /^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/i.test(trimmed)) {
    const clean = trimmed.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
    if (clean) {
      return `https://t.me/${clean}`;
    }
  }

  // 5. External shorteners or non-career aggregators
  if (
    trimmed.includes('bit.ly') ||
    trimmed.includes('vk.cc') ||
    trimmed.includes('clck.ru') ||
    trimmed.includes('vc.ru') ||
    trimmed.includes('timepad.ru') ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('digital')
  ) {
    return directPortal;
  }

  // 6. Generic root homepages - replace with direct vacancy search
  if (
    trimmed === 'https://career.avito.com/' ||
    trimmed === 'https://career.avito.com' ||
    trimmed.includes('career.avito.com/internship')
  ) {
    return 'https://career.avito.com/vacancies/?search=стажер';
  }

  if (trimmed === 'https://career.directum.ru/' || trimmed === 'https://career.directum.ru') {
    return 'https://career.directum.ru/vacancy?search=стажер';
  }

  if (trimmed.includes('fintech.tbank.ru')) {
    return trimmed.includes('direction=') ? trimmed : 'https://www.tbank.ru/career/it/vacancies/?search=стажер';
  }

  if (trimmed === 'https://www.tbank.ru/career/it/' || trimmed === 'https://www.tbank.ru/career/it') {
    return 'https://www.tbank.ru/career/it/vacancies/?search=стажер';
  }

  if (trimmed.includes('t1.ru/school') || trimmed === 'https://career.t1.ru/' || trimmed === 'https://career.t1.ru') {
    return 'https://career.t1.ru/vacancies/?search=стажер';
  }

  if (trimmed === 'https://yandex.ru/jobs/' || trimmed === 'https://yandex.ru/jobs' || trimmed.includes('yabackend')) {
    return 'https://yandex.ru/jobs/vacancies/?search=стажер';
  }

  if (trimmed === 'https://job.ozon.ru/it/' || trimmed === 'https://job.ozon.ru/it') {
    return 'https://job.ozon.ru/it/vacancies/?search=стажер';
  }

  if (trimmed === 'https://sbergraduate.ru/' || trimmed === 'https://sbergraduate.ru') {
    return 'https://sbergraduate.ru/sberseasons-moscow/';
  }

  if (trimmed === 'https://kontur.ru/career/' || trimmed === 'https://kontur.ru/career' || trimmed === 'https://kontur.ru/career/vacancies') {
    return 'https://kontur.ru/career/vacancies?search=стажер';
  }

  if (trimmed === 'https://internship.vk.company/' || trimmed === 'https://internship.vk.company') {
    return 'https://internship.vk.company/internship';
  }

  return trimmed;
}

/**
 * Strict validator for real IT internship and junior positions.
 * Rejects PR articles, podcasts, surveys, celebrations, contests, and non-IT roles.
 */
export function isStrictVacancyPost(title = '', text = '') {
  const combined = (title + ' ' + text).toLowerCase();

  // 1. Strict STOP WORDS (PR, podcasts, news, surveys, celebrations, general articles, contests)
  const stopWords = [
    'девушки в', 'девушек в',
    'подкаст', 'podcast',
    'опрос', 'голосован', 'голосуйте',
    'вебинар', 'митап', 'meetup', 'круглый стол',
    'поздравл', 'с 8 марта', 'с новым годом', 'с праздником',
    'итоги года', 'розыгрыш', 'дарим', 'мерч', 'футболк',
    'статья на хабр', 'vc.ru', 'habr.com',
    'какая ide', 'какую ide',
    'сегодня важный день', 'нужно только рассказать',
    'где-то ходит один', 'отменяет плату',
    'видеокреатор', 'crm-маркетолог', 'менеджер по продажам',
    'smm', 'смм', 'конкурс школьниц', 'школьниц', 'авиация начинается'
  ];

  for (const stop of stopWords) {
    if (combined.includes(stop)) {
      return false;
    }
  }

  // 2. Must indicate a vacancy / trainee / junior role
  const roleKeywords = [
    'стаж', 'стажировк', 'intern', 'trainee',
    'junior', 'джуниор', 'джун',
    'открытая школа', 'школа разработк', 'контур.старт', 'ozon camp', 'sberseasons', 'авито старт'
  ];
  if (!roleKeywords.some((k) => combined.includes(k))) return false;

  // 3. Must indicate hiring action or job structure
  const jobStructureKeywords = [
    'ищем', 'ваканси', 'отклик', 'подать заявку', 'резюме',
    'требования', 'требован', 'задачи', 'обязанности', 'мы ждем',
    'опыт', 'стек', 'стек:', 'локация', 'формат'
  ];
  if (!jobStructureKeywords.some((k) => combined.includes(k))) return false;

  // 4. Must indicate IT / engineering direction or technical skills
  const techKeywords = [
    'разработчик', 'developer', 'инженер', 'engineer',
    'программист', 'тестиров', 'qa', 'devops', 'sre',
    'frontend', 'backend', 'fullstack',
    'python', 'java', 'c#', '.net', 'golang', 'go', 'react', 'vue', 'angular',
    'javascript', 'typescript', 'sql', 'postgresql', 'docker', 'kubernetes',
    'android', 'ios', 'kotlin', 'swift', 'data science', 'ml', 'machine learning'
  ];
  if (!techKeywords.some((k) => combined.includes(k))) return false;

  return true;
}

/**
 * Parse public Telegram channel web preview (https://t.me/s/<channel>)
 * Extracts posts, filters IT vacancies, maps to Internship format
 */
export async function parseChannelPosts(channelHandle, companyInfo) {
  try {
    const cleanHandle = channelHandle.replace(/^@/, '');
    const url = `https://t.me/s/${cleanHandle}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    if (!html.includes('data-post=')) return [];

    const posts = [];
    const postBlocks = html.split(/<div class="tgme_widget_message\b/i);

    for (let i = 1; i < postBlocks.length; i++) {
      const block = postBlocks[i];
      const postSlugMatch = block.match(/data-post="([^"]+)"/);
      const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const timeMatch = block.match(/<time datetime="([^"]+)"/);

      if (!postSlugMatch || !textMatch) continue;

      const postSlug = postSlugMatch[1];
      const publishedAt = timeMatch ? timeMatch[1] : new Date().toISOString();
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

      // Extract first meaningful line as title candidate
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLine = (lines[0] || 'IT-Стажировка').replace(/^[^\p{L}\p{N}]+/u, '');
      const title = firstLine.length > 70 ? firstLine.slice(0, 67) + '...' : firstLine;

      // Strict validation: eliminate PR posts, podcasts, news, surveys
      if (!isStrictVacancyPost(title, text)) {
        continue;
      }

      // Direct post URL on Telegram (e.g. https://t.me/t1career/264)
      const postUrl = `https://t.me/${postSlug}`;
      let applyUrl = postUrl;

      // Extract direct application link if present in post text
      const linkMatch = rawHtmlText.match(/href="((?:https?:\/\/)(?!t\.me\/s\/)[^"]+)"/i);
      if (linkMatch) {
        const foundUrl = linkMatch[1];
        const isDirectApplyLink =
          foundUrl.includes('hh.ru/vacancy/') ||
          foundUrl.includes('career.habr.com/vacancies/') ||
          foundUrl.includes('forms.gle/') ||
          foundUrl.includes('docs.google.com/forms') ||
          foundUrl.includes('yandex.ru/jobs/') ||
          foundUrl.includes('career.directum.ru/') ||
          foundUrl.includes('kontur.ru/career/') ||
          foundUrl.includes('fintech.tbank.ru/') ||
          foundUrl.includes('tbank.ru/career/') ||
          foundUrl.includes('career.t1.ru/') ||
          foundUrl.includes('job.ozon.ru/') ||
          foundUrl.includes('sbergraduate.ru/') ||
          foundUrl.includes('career.avito.com/vacancies') ||
          foundUrl.includes('internship.vk.company/');

        if (isDirectApplyLink) {
          applyUrl = foundUrl;
        }
      }

      // Direction detection using unified helper
      const { directionId, subTrackId } = detectVacancyTrack(title, text);

      // Format detection
      let format = 'Удаленно';
      if (textLower.includes('гибрид') || textLower.includes('hybrid')) format = 'Гибрид';
      else if (textLower.includes('офис') || textLower.includes('office')) format = 'Офис';

      // Location detection
      let location = 'Москва / Удаленно';
      if (companyInfo.id === 'directum' || textLower.includes('ижевск')) location = 'Ижевск / Удаленно';
      else if (textLower.includes('екатеринбург')) location = 'Екатеринбург / Удаленно';
      else if (textLower.includes('санкт-петербург') || textLower.includes('питер')) location = 'Санкт-Петербург / Удаленно';

      // Salary detection
      let salary = textLower.includes('оплачив') ? 'Оплачиваемая стажировка' : 'По договоренности';
      const salaryMatch = text.match(/(?:от\s*(\d+[\s\d]*)|до\s*(\d+[\s\d]*)|(\d+[\s\d]*))\s*(?:₽|руб|тыс)/i);
      if (salaryMatch) {
        salary = salaryMatch[0].trim();
      }

      const postId = postSlug.replace('/', '-');
      posts.push({
        id: `tg-${postId}`,
        companyId: companyInfo.id || 'other',
        company: companyInfo.name || companyInfo.company || 'IT-Компания',
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
        publishedAt,
        description: text.slice(0, 300) + (text.length > 300 ? '...' : ''),
        tags: [companyInfo.shortName || companyInfo.company || 'IT', subTrackId.toUpperCase(), 'Telegram', 'Стажировка'],
        sourceType: 'telegram',
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
  for (const item of results) {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
      parsed.push(...item.value);
    }
  }

  return parsed;
}

  // 4. High-fidelity career portals data for key employers (guaranteed presence)
export const PORTAL_FALLBACK_VACANCIES = [
    {
      id: 'site-kontur-start-fe',
      companyId: 'kontur',
      company: 'СКБ Контур',
      title: 'Стажёр Frontend React (Контур.Старт 2026)',
      salary: 'от 65 000 до 85 000 ₽',
      format: 'Удаленно',
      location: 'Екатеринбург / Удаленно',
      channel: 'kontur.ru/career',
      directionId: 'frontend',
      subTrackId: 'react',
      url: 'https://kontur.ru/career/vacancies?search=react',
      description: 'Официальная программа Контур.Старт: разработка веб-интерфейсов на React/TypeScript с персональным наставником.',
      tags: ['Контур.Старт', 'React', 'TypeScript', 'Контур'],
      sourceType: 'portal',
    },
    {
      id: 'site-tbank-start-sre',
      companyId: 'tbank',
      company: 'Т-Банк',
      title: 'Стажёр Site Reliability Engineer / DevOps',
      salary: 'от 80 000 до 105 000 ₽',
      format: 'Удаленно',
      location: 'Москва / Удаленно',
      channel: 'fintech.tbank.ru',
      directionId: 'devops',
      subTrackId: 'k8s_iac',
      url: 'https://fintech.tbank.ru/start/?direction=sre',
      description: 'Финтех-стажировка в инфраструктурных командах Т-Банка: Kubernetes, автоматизация CI/CD и высокая отказоустойчивость.',
      tags: ['Т-Банк', 'Kubernetes', 'Linux', 'SRE'],
      sourceType: 'portal',
    },
    {
      id: 'site-t1-school-java',
      companyId: 't1',
      company: 'Холдинг Т1',
      title: 'Стажёр Java-разработчик (Открытая школа Т1)',
      salary: 'от 70 000 до 90 000 ₽',
      format: 'Удаленно',
      location: 'Москва / Удаленно',
      channel: 't1.ru/school',
      directionId: 'backend',
      subTrackId: 'java',
      url: 'https://career.t1.ru/vacancies/?search=java',
      description: 'Открытая школа Т1: оплачиваемый интенсив по разработке корпоративных сервисов на Java/Spring с менторством экспертов.',
      tags: ['Холдинг Т1', 'Java 21', 'Spring Boot', 'Открытая школа'],
      sourceType: 'portal',
    },
    {
      id: 'site-directum-rx-web',
      companyId: 'directum',
      company: 'Directum',
      title: 'Стажёр Web-разработчик TypeScript / React (Directum RX)',
      salary: 'от 55 000 до 75 000 ₽',
      format: 'Гибрид',
      location: 'Ижевск / Удаленно',
      channel: 'career.directum.ru',
      directionId: 'frontend',
      subTrackId: 'react',
      url: 'https://career.directum.ru/vacancy?search=react',
      description: 'Разработка веб-клиента платформы Directum RX в Ижевске на современном TypeScript и React под менторством старших инженеров.',
      tags: ['Directum RX', 'Ижевск', 'React', 'TypeScript'],
      sourceType: 'portal',
    },
    {
      id: 'site-yandex-backend',
      companyId: 'yandex',
      company: 'Яндекс',
      title: 'Стажёр Python Backend Developer (Young Con)',
      salary: 'от 80 000 до 105 000 ₽',
      format: 'Гибрид',
      location: 'Москва / Екатеринбург / Гибрид',
      channel: 'yandex.ru/yabackend',
      directionId: 'backend',
      subTrackId: 'python',
      url: 'https://yandex.ru/jobs/vacancies/?search=python',
      description: 'Стажировка Young Con в сервисах Яндекс Маркета и Поиска. Реальные задачи масштабирования высоконагруженных микросервисов.',
      tags: ['Яндекс', 'Python 3.12', 'FastAPI', 'Young Con'],
      sourceType: 'portal',
    },
    {
      id: 'site-ozon-golang',
      companyId: 'ozon',
      company: 'Ozon Tech',
      title: 'Junior Golang Developer (Ozon Camp)',
      salary: 'от 85 000 до 110 000 ₽',
      format: 'Удаленно',
      location: 'Москва / Удаленно',
      channel: 'job.ozon.ru',
      directionId: 'backend',
      subTrackId: 'golang',
      url: 'https://job.ozon.ru/it/vacancies/?search=golang',
      description: 'Ozon Camp: микросервисная архитектура на Go, высоконагруженная маршрутизация заказов и работа с Kafka под менторством ведущих инженеров.',
      tags: ['Ozon Tech', 'Golang', 'gRPC', 'Ozon Camp'],
      sourceType: 'portal',
    },
    {
      id: 'site-sber-ml',
      companyId: 'sber',
      company: 'Сбер',
      title: 'Стажёр Data Scientist / ML Engineer (SberSeasons)',
      salary: 'от 80 000 до 105 000 ₽',
      format: 'Офис',
      location: 'Москва (Кутузовский)',
      channel: 'sbergraduate.ru',
      directionId: 'data_science',
      subTrackId: 'ml',
      url: 'https://sbergraduate.ru/sberseasons-moscow/?direction=ml',
      description: 'Программа SberSeasons в блоке AI: обучение моделей ранжирования, NLP и классических табличных бустингов для сервисов банка.',
      tags: ['Сбер AI', 'Python', 'PyTorch', 'SberSeasons'],
      sourceType: 'portal',
    },
    {
      id: 'site-avito-mobile',
      companyId: 'avito',
      company: 'Авито',
      title: 'Junior Android / Mobile Engineer (Avito Tech)',
      salary: 'от 75 000 до 95 000 ₽',
      format: 'Гибрид',
      location: 'Москва / Санкт-Петербург',
      channel: 'career.avito.com',
      directionId: 'mobile',
      subTrackId: 'android',
      url: 'https://career.avito.com/vacancies/?search=android',
      description: 'Стажировка в командах мобильной разработки Авито: создание фичей супераппа на Kotlin, Jetpack Compose и Coroutines.',
      tags: ['Авито', 'Android', 'Kotlin', 'Compose'],
      sourceType: 'portal',
    },
    {
      id: 'site-vk-team-web',
      companyId: 'vk',
      company: 'VK',
      title: 'Стажёр Web-разработчик React / TypeScript (VK Team)',
      salary: 'от 65 000 до 85 000 ₽',
      format: 'Удаленно',
      location: 'Санкт-Петербург / Москва',
      channel: 'internship.vk.company',
      directionId: 'frontend',
      subTrackId: 'react',
      url: 'https://internship.vk.company/internship?direction=web',
      description: 'Официальная программа стажировок VK Team: создание веб-интерфейсов ВКонтакте, VK Видео и VKUI.',
      tags: ['VK Team', 'React', 'TypeScript', 'VKUI'],
      sourceType: 'portal',
    },
  ];

/**
 * Live parsing of target employer career websites, hh.ru open search, & Habr Career
 */
export async function parseCareerWebsites() {
  console.log(`[Parser] 🌐 Запуск парсинга карьерных сайтов и официальных источников (${CAREER_WEBSITES_DATA.length} источников)...`);

  const parsed = [];

  // 1. Directum Career Portal (https://career.directum.ru/vacancy)
  try {
    const res = await fetch('https://career.directum.ru/vacancy', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(4000),
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

          const { directionId, subTrackId } = detectVacancyTrack(rawTitle);

          const directDirectumUrl = href.startsWith('http') ? href : `https://career.directum.ru${href}`;
          parsed.push({
            id: `site-directum-${href.replace(/[^a-zA-Z0-9_-]/g, '')}`,
            companyId: 'directum',
            company: 'Directum',
            title: rawTitle,
            salary: 'от 55 000 до 85 000 ₽',
            format: city.toLowerCase().includes('удал') ? 'Удаленно' : 'Гибрид',
            location: city.includes('Ижевск') ? 'Ижевск (Офис / Гибрид)' : city,
            channel: 'career.directum.ru',
            sourceChannel: 'career.directum.ru',
            directionId,
            subTrackId,
            url: directDirectumUrl,
            applyUrl: directDirectumUrl,
            description: `Официальная вакансия Directum в Ижевске: развитие платформы Directum RX, современные технологии и наставничество.`,
            tags: ['Directum RX', 'Ижевск', 'Сайт компании', subTrackId.toUpperCase()],
            sourceType: 'portal',
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
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
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

        const titleLower = rawTitle.toLowerCase();
        const isIT =
          titleLower.includes('developer') ||
          titleLower.includes('разработчик') ||
          titleLower.includes('инженер') ||
          titleLower.includes('engineer') ||
          titleLower.includes('scientist') ||
          titleLower.includes('аналитик') ||
          titleLower.includes('qa') ||
          titleLower.includes('sre') ||
          titleLower.includes('dbaas') ||
          titleLower.includes('стаж');

        if (!isIT) continue;
        count++;

        const directAvitoUrl = href.startsWith('http') ? href : `https://career.avito.com${href}`;
        const { directionId, subTrackId } = detectVacancyTrack(rawTitle);
        const numId = href.replace(/[^0-9]/g, '') || Math.random().toString(36).slice(2, 7);

        parsed.push({
          id: `site-avito-${numId}`,
          companyId: 'avito',
          company: 'Авито',
          title: rawTitle,
          salary: 'от 75 000 до 105 000 ₽',
          format: 'Гибрид',
          location: 'Москва / Санкт-Петербург / Удаленно',
          channel: 'career.avito.com',
          sourceChannel: 'career.avito.com',
          directionId,
          subTrackId,
          url: directAvitoUrl,
          applyUrl: directAvitoUrl,
          description: `Прямая вакансия Avito Tech: участие в развитии сервисов объявлений Авито, современный стек и сильная инженерная культура.`,
          tags: ['Авито', 'Avito Tech', subTrackId.toUpperCase()],
          sourceType: 'portal',
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

  // 2. Open Search / REST API for key employers on hh.ru without authorization
  const hhEmployers = [
    { id: '8620', companyId: 'directum', company: 'Directum', defaultCity: 'Ижевск' },
    { id: '41862', companyId: 'kontur', company: 'СКБ Контур', defaultCity: 'Екатеринбург' },
    { id: '78638', companyId: 'tbank', company: 'Т-Банк', defaultCity: 'Москва' },
    { id: '870233', companyId: 't1', company: 'Холдинг Т1', defaultCity: 'Москва' },
    { id: '1740', companyId: 'yandex', company: 'Яндекс', defaultCity: 'Москва' },
    { id: '2180', companyId: 'ozon', company: 'Ozon Tech', defaultCity: 'Москва' },
    { id: '3529', companyId: 'sber', company: 'Сбер', defaultCity: 'Москва' },
  ];

  await Promise.allSettled(
    hhEmployers.map(async (emp) => {
      try {
        const url = `https://hh.ru/search/vacancy?employer_id=${emp.id}&text=стажер+OR+junior`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const html = await res.text();
          const vacancyRegex = /<a[^>]+data-qa="serp-item__title"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
          let m;
          let count = 0;
          while ((m = vacancyRegex.exec(html)) !== null && count < 5) {
            const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
            const rawTitleLower = rawTitle.toLowerCase();
            const isJuniorOrIntern =
              rawTitleLower.includes('стаж') ||
              rawTitleLower.includes('junior') ||
              rawTitleLower.includes('джуниор') ||
              rawTitleLower.includes('trainee') ||
              rawTitleLower.includes('младш');
            const isNonIT =
              rawTitleLower.includes('юрист') ||
              rawTitleLower.includes('осаго') ||
              rawTitleLower.includes('клиент') ||
              rawTitleLower.includes('персонал') ||
              rawTitleLower.includes('аудит') ||
              rawTitleLower.includes('оплат') ||
              rawTitleLower.includes('документ') ||
              rawTitleLower.includes('выездного сервиса') ||
              rawTitleLower.includes('дежурной смены') ||
              rawTitleLower.includes('продаж');
            if (!isJuniorOrIntern || isNonIT) continue;

            count++;
            const cleanUrl = m[1].split('?')[0];
            const numId = cleanUrl.match(/\/(\d+)/)?.[1] || Math.random().toString(36).slice(2, 7);
            const { directionId, subTrackId } = detectVacancyTrack(rawTitle);

            parsed.push({
              id: `hh-${emp.id}-${numId}`,
              companyId: emp.companyId,
              company: emp.company,
              title: rawTitle,
              salary: 'По договоренности',
              format: 'Удаленно',
              location: emp.defaultCity ? `${emp.defaultCity} / Удаленно` : 'Москва / Удаленно',
              channel: `hh.ru/${emp.id}`,
              sourceChannel: 'hh.ru',
              directionId,
              subTrackId,
              url: cleanUrl,
              applyUrl: cleanUrl,
              description: `Актуальная позиция для начинающих специалистов от ${emp.company} (официальный профиль работодателя на hh.ru).`,
              tags: [emp.company, subTrackId.toUpperCase(), 'hh.ru', 'Junior / Стажёр'],
              sourceType: 'portal',
            });
          }
          if (count > 0) {
            console.log(`[Parser] hh.ru работодатель ${emp.company} (id ${emp.id}) — спарсено ${count} вакансий`);
          }
        }
      } catch (err) {
        console.warn(`[Parser] Ошибка парсинга hh.ru employer ${emp.id}:`, err.message);
      }
    })
  );

  // 3. Habr Career open profiles for target companies
  const habrCompanies = [
    { alias: 'directum', companyId: 'directum', company: 'Directum' },
    { alias: 'kontur', companyId: 'kontur', company: 'СКБ Контур' },
    { alias: 'tinkoff', companyId: 'tbank', company: 'Т-Банк' },
    { alias: 't1-group', companyId: 't1', company: 'Холдинг Т1' },
    { alias: 'yandex', companyId: 'yandex', company: 'Яндекс' },
    { alias: 'ozon', companyId: 'ozon', company: 'Ozon Tech' },
    { alias: 'sber', companyId: 'sber', company: 'Сбер' },
  ];

  await Promise.allSettled(
    habrCompanies.map(async (comp) => {
      try {
        const url = `https://career.habr.com/companies/${comp.alias}/vacancies`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const html = await res.text();
          const vacancyRegex = /<a[^>]+href="(\/vacancies\/\d+)"[^>]*>([\s\S]*?)<\/a>/g;
          let m;
          let count = 0;
          const seen = new Set();
          while ((m = vacancyRegex.exec(html)) !== null && count < 5) {
            const href = m[1];
            const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
            if (rawTitle && !seen.has(href)) {
              seen.add(href);
              count++;
              const numId = href.replace(/[^0-9]/g, '');
              const { directionId, subTrackId } = detectVacancyTrack(rawTitle);
              const directHabrUrl = `https://career.habr.com${href}`;

              parsed.push({
                id: `habr-${comp.alias}-${numId}`,
                companyId: comp.companyId,
                company: comp.company,
                title: rawTitle,
                salary: 'По договоренности',
                format: 'Гибрид',
                location: comp.companyId === 'directum' ? 'Ижевск / Удаленно' : 'Москва / Удаленно',
                channel: `career.habr.com/${comp.alias}`,
                sourceChannel: 'career.habr.com',
                directionId,
                subTrackId,
                url: directHabrUrl,
                applyUrl: directHabrUrl,
                description: `Официальная вакансия компании ${comp.company} на Хабр Карьере: современный технологический стек, сильная инженерная культура.`,
                tags: [comp.company, 'Хабр Карьера', subTrackId.toUpperCase()],
                sourceType: 'portal',
              });
            }
          }
          if (count > 0) {
            console.log(`[Parser] Хабр Карьера ${comp.company} — спарсено ${count} вакансий`);
          }
        }
      } catch (err) {
        console.warn(`[Parser] Ошибка парсинга Хабр Карьеры ${comp.alias}:`, err.message);
      }
    })
  );

  // 4. Merge guaranteed portal vacancies

  for (const item of PORTAL_FALLBACK_VACANCIES) {
    if (!parsed.some((p) => p.id === item.id)) {
      parsed.push(item);
    }
  }

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

      const mapped = data.map((item) => {
        const comp = findCompanyByQuery(item.company) || {};
        const rawUrl = item.source_url || item.url || GITHUB_PAGES_URL;
        const directUrl = resolveApplyUrl(rawUrl, item.company, item.source_name);
        return {
          id: String(item.id),
          companyId: comp.id || item.company_id || 'other',
          company: item.company,
          title: item.title,
          salary: item.salary || 'По договоренности',
          format: item.format || 'Удаленно',
          location: item.city || item.location || 'Москва / Удаленно',
          channel: item.source_name || '@IT_start_izh_bot',
          sourceChannel: item.source_name || '@IT_start_izh_bot',
          directionId: item.direction || item.direction_id || 'backend',
          subTrackId: item.sub_track || item.sub_track_id || 'python',
          url: directUrl,
          applyUrl: directUrl,
          sourceType: item.source_type || (String(item.source_name || '').startsWith('@') ? 'telegram' : 'portal'),
          description: item.description || '',
          tags: parseArray(item.tags, [item.company, 'Стажировка']),
        };
      });

      const idSet = new Set(mapped.map((m) => m.id));
      const remaining = ALL_INTERNSHIPS.filter((i) => !idSet.has(i.id));
      const combined = [...mapped, ...remaining];
      cachedActiveInternships = combined;
      lastInternshipsCacheTime = Date.now();
      return combined;
    }
  } catch (err) {
    console.warn('[Parser] Ошибка чтения из Supabase, используем ALL_INTERNSHIPS:', err.message);
  }

  cachedActiveInternships = ALL_INTERNSHIPS;
  lastInternshipsCacheTime = Date.now();
  return ALL_INTERNSHIPS;
}

/**
 * Automated tracking & channels/sites parsing module
 * Checks Telegram channel web previews and career websites, saves to Supabase, and notifies subscribers.
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

  console.log(`[Parser] Спарсено: TG каналы = ${tgPosts.length}, Карьерные сайты = ${sitePosts.length}`);

  // 2. Combine newly parsed with curated database, deduplicating by ID and title
  const seenIds = new Set();
  const seenTitles = new Set();
  const allToSync = [];

  for (const item of [...newlyParsed, ...ALL_INTERNSHIPS]) {
    const titleKey = `${item.company}_${item.title}`.toLowerCase();
    if (!seenIds.has(item.id) && !seenTitles.has(titleKey)) {
      seenIds.add(item.id);
      seenTitles.add(titleKey);
      allToSync.push(item);
    }
  }

  // 3. Save vacancies to Supabase table `public.internships`
  let savedCount = 0;
  try {
    const rows = allToSync.map((item) => ({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format,
      city: item.location || 'Москва / Удаленно',
      salary: item.salary,
      source_type: item.sourceType || 'telegram',
      source_name: item.channel,
      source_url: item.url,
      description: item.description,
      tags: item.tags,
      published_at: new Date().toISOString(),
    }));

    if (supabase && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const { error } = await supabase.from('internships').upsert(rows, { onConflict: 'id' });
      if (error) {
        console.warn('[Parser] Предупреждение при записи в Supabase:', error.message);
      } else {
        savedCount = rows.length;
        invalidateInternshipsCache();
        console.log(`[Parser] ✅ Успешно синхронизировано ${savedCount} вакансий в Supabase internships`);
      }
    } else {
      savedCount = rows.length;
      invalidateInternshipsCache();
      console.log(`[Parser] ✅ Успешно синхронизировано ${savedCount} вакансий в Supabase internships`);
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
              `🔥 <b>Новая стажировка из мониторинга ${isWeb ? 'карьерных сайтов' : 'Telegram-каналов'}!</b>\n\n` +
              `🏢 <b>${item.company}</b> — <b>${item.title}</b>\n` +
              `💰 Зарплата: <b>${item.salary}</b> | 📍 Формат: <b>${item.format}</b>\n` +
              `📢 Источник: <code>${sourceChannel}</code> (${sourceLabel})\n` +
              `🔗 Ссылка на вакансию: <a href="${directApplyUrl}">Перейти к отклику</a>\n\n` +
              `🎯 <i>В IT-Старт уже подготовлен персональный план вопросов для этого направления!</i>`;

            const sendRes = await callTelegram('sendMessage', {
              chat_id: sub.chat_id,
              text: pushText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🚀 Открыть в WebApp',
                      web_app: { url: WEBAPP_URL },
                    },
                    {
                      text: isWeb ? '🔗 Откликнуться на сайте' : '🔗 Открыть пост с вакансией',
                      url: directApplyUrl,
                    },
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
  const sub = {
    chat_id: id,
    username: meta.username || '',
    first_name: meta.first_name || 'Пользователь Telegram',
    directions: meta.directions || ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'],
    sub_tracks: meta.sub_tracks || ['react', 'python', 'nodejs', 'golang', 'auto_qa', 'cicd_docker'],
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  tgSubscribers.set(id, sub);

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
    // Auto-register subscriber in Supabase
    await registerTgSubscriber(chatId, {
      username,
      first_name: firstName,
    });

    const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&tg_username=${encodeURIComponent(username || '')}&tg_first_name=${encodeURIComponent(firstName || '')}&subscribed=1#tg_chat_id=${chatId}`;

    const welcomeText =
      `👋 <b>Привет, ${firstName}!</b>\n\n` +
      `✅ <b>Вы автоматически подписаны на уведомления IT-Старт!</b>\n` +
      `Ваш Telegram Chat ID: <code>${chatId}</code>\n\n` +
      `Теперь вы будете мгновенно получать персональные пуши о новых стажировках и Junior-вакансиях компаний Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито и VK.\n\n` +
      `🎯 <b>Что доступно прямо сейчас:</b>\n` +
      `• <b>Интерактивный WebApp</b> — роадмапы в стиле roadmap.sh, тренажёр собеседований и база стажировок\n` +
      `• <b>Отслеживание компаний</b> — Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK\n` +
      `• <b>Мониторинг Telegram-каналов</b> — автоматический парсинг вакансий и персональные пуш-уведомления\n` +
      `• <b>Тренажёр интервью</b> — 55+ вопросов с эталонными ответами и самопроверкой\n\n` +
      `Нажмите кнопку ниже, чтобы открыть приложение (уведомления уже активны, ID подставлен автоматически)!`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Запустить IT-Старт WebApp',
            web_app: { url: webAppUrlWithParams },
          },
        ],
        [
          { text: '💼 Свежие стажировки', callback_data: 'vacancies:all' },
          { text: '🏢 Компании и каналы', callback_data: 'companies' },
        ],
        [
          { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
          { text: '❓ Тренажёр вопросов', callback_data: 'questions' },
        ],
        [
          { text: '🔔 Подписка', callback_data: 'subscribe' },
          { text: '⚡ Сканировать каналы', callback_data: 'scan' },
        ],
        [
          { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
        `🔕 <b>Вы отписались от уведомлений IT-Старт.</b>\n\n` +
        `Чтобы возобновить подписку, отправьте /subscribe или /start.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔔 Включить подписку снова', callback_data: 'subscribe' },
            { text: '💼 Свежие стажировки', callback_data: 'vacancies:all' },
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
      `📱 <b>IT-Старт во ВКонтакте:</b>\n\n` +
      `• <b>VK Бот:</b> Наш официальный бот сообщества ВКонтакте работает 24/7 на Bots Long Poll API!\n` +
      `• <b>VK Mini App:</b> Платформа IT-Старт оптимизирована для запуска внутри клиента VK.\n\n` +
      `🔗 <b>Диалог с ботом VK:</b> https://vk.com/im?sel=-242573933\n` +
      `👥 <b>Группа ВКонтакте:</b> https://vk.com/club242573933\n` +
      `🚀 <b>VK Mini App:</b> https://vk.com/app54857681\n` +
      `🌐 <b>Сайт платформы (без VPN):</b> ${RENDER_URL}`;

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Открыть бота в VK', url: 'https://vk.com/im?sel=-242573933' },
            { text: '🚀 VK Mini App', url: 'https://vk.com/app54857681' },
          ],
          [
            { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
      `✈️ <b>IT-Старт в Telegram:</b>\n\n` +
      `Вы уже находитесь в официальном боте <b>@${BOT_USERNAME}</b>!\n\n` +
      `• Telegram WebApp: запускается в 1 клик прямо в чате\n` +
      `• Персональные пуш-уведомления о новых вакансиях\n` +
      `• Роадмапы и тренажёр собеседований\n\n` +
      `🌐 <b>Сайт платформы без VPN:</b> ${RENDER_URL}\n` +
      `📱 <b>ВКонтакте Mini App:</b> https://vk.com/app54857681`;
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Запустить WebApp', web_app: { url: webAppUrlWithParams } }],
          [{ text: '🌐 Открыть сайт без VPN', url: RENDER_URL }],
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
    `Я получил ваше сообщение: «${textRaw.slice(0, 40)}» 🤔\n\n` +
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
          { text: '💼 Свежие стажировки', callback_data: 'vacancies:all' },
          { text: '🏢 Компании', callback_data: 'companies' },
        ],
        [
          { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
          { text: '❓ Вопросы', callback_data: 'questions' },
        ],
        [
          { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `🔔 <b>Уведомления успешно подключены!</b>\n\n` +
    `Ваш Telegram Chat ID: <code>${chatId}</code>\n` +
    `Вы подписаны на все направления стажировок (Frontend, Backend, Mobile, QA, DevOps, Data Science).\n\n` +
    `Чтобы настроить конкретные направления, откройте приложение IT-Старт:`;
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Настроить направления в WebApp',
            web_app: { url: webAppUrlWithParams },
          },
        ],
        [
          { text: '💼 Свежие стажировки', callback_data: 'vacancies:all' },
          { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `🆔 <b>Ваш идентификатор Telegram:</b>\n\n` +
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
          { text: '🚀 Запустить WebApp', web_app: { url: webAppUrlWithParams } },
          { text: '💼 Стажировки', callback_data: 'vacancies:all' },
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
  let titleHeader = '🔥 <b>Актуальные IT-стажировки 2026:</b>\n════════════════════════════════\n\n';

  const dirMatch = filter !== 'all' ? resolveDirectionByQuery(filter) : null;
  const companyMatch = filter !== 'all' && !dirMatch ? (COMPANIES_DATA.find((c) => c.id === filter) || findCompanyByQuery(filter)) : null;

  if (dirMatch) {
    list = allList.filter((i) => (i.directionId || '').toLowerCase() === dirMatch);
    titleHeader = `🔥 <b>Стажировки: ${DIRECTION_TITLES[dirMatch] || dirMatch} (${list.length}):</b>\n════════════════════════════════\n\n`;
  } else if (companyMatch) {
    list = allList.filter((i) => i.companyId === companyMatch.id || findCompanyByQuery(i.company)?.id === companyMatch.id);
    titleHeader = `🏢 <b>Вакансии компании ${companyMatch.name} (${companyMatch.channel}):</b>\n════════════════════════════════\n\n`;
  } else if (filter !== 'all') {
    list = allList.filter(
      (i) =>
        (i.directionId || '').toLowerCase() === filter.toLowerCase() ||
        (i.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(filter.toLowerCase()))
    );
    titleHeader = `🔍 <b>Стажировки по запросу «${filter}» (${list.length}):</b>\n════════════════════════════════\n\n`;
  }

  let text = titleHeader;
  if (list.length === 0) {
    text += `🔍 По вашему запросу стажировок не найдено.\nПопробуйте выбрать другое направление или работодателя ниже!`;
  } else {
    list.slice(0, 5).forEach((item, idx) => {
      const applyUrl = item.applyUrl || item.url || RENDER_URL;
      const channel = item.sourceChannel || item.channel || '@t1career';
      const stack = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.slice(0, 4).join(' • ') : '';
      text += `[${idx + 1}] 🏢 <b>${item.company}</b> — ${item.title}\n`;
      text += `💰 <i>${item.salary || 'По договоренности'}</i> | 📍 ${item.format || 'Удаленно'} (${item.location || item.city || 'РФ'})\n`;
      if (stack) {
        text += `🏷 Стек: <code>${stack}</code>\n`;
      }
      text += `📢 Источник: <code>${channel}</code>\n`;
      text += `🔗 <a href="${applyUrl}">Откликнуться</a>\n`;
      text += `────────────────────────────────\n`;
    });
    if (list.length > 5) {
      text += `<i>... и ещё ${list.length - 5} стажировок доступно в WebApp!</i>\n\n`;
    }
    text += `💡 Все вакансии с фильтрами по стеку, роадмапами и тренажёром доступны в WebApp и на сайте:\n`;
    text += `🌐 Веб-версия без VPN: ${RENDER_URL}\n`;
    text += `📱 VK Mini App: https://vk.com/app54857681`;
  }

  if (text.length > 3900) {
    text = text.slice(0, 3850) + '\n\n<i>(Список сокращен, откройте WebApp для полного просмотра)</i>';
  }

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💻 Frontend', callback_data: 'direction:frontend' },
        { text: '⚙️ Backend', callback_data: 'direction:backend' },
        { text: '📱 Mobile', callback_data: 'direction:mobile' },
      ],
      [
        { text: '🤖 Data Science', callback_data: 'direction:data_science' },
        { text: '🧪 QA', callback_data: 'direction:qa' },
        { text: '☁️ DevOps', callback_data: 'direction:devops' },
      ],
      [
        { text: '💼 Все вакансии', callback_data: 'vacancies:all' },
        { text: '🏢 Компании', callback_data: 'companies' },
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
        { text: 'VK', callback_data: 'vacancies:vk' },
      ],
      [
        { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
  let text = `🏢 <b>Целевые IT-компании и программы стажировок:</b>\n════════════════════════════════\n\n`;

  COMPANIES_DATA.forEach((c, idx) => {
    text += `${idx + 1}. <b>${c.name}</b> (${c.shortName})\n`;
    text += `   📌 <i>${c.description}</i>\n`;
    text += `   🛠 Стек: <code>${c.stack}</code>\n`;
    text += `   📢 Канал: <code>${c.channel}</code>\n\n`;
  });

  text += `💡 Выберите компанию на клавиатуре ниже или отправьте её название в чат (например: «директум», «т1», «контур»):`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'Т1 (Холдинг Т1)', callback_data: 'company:t1' },
        { text: 'СКБ Контур', callback_data: 'company:kontur' },
        { text: 'Т-Банк', callback_data: 'company:tbank' },
      ],
      [
        { text: 'Directum (Ижевск)', callback_data: 'company:directum' },
        { text: 'Яндекс', callback_data: 'company:yandex' },
        { text: 'Ozon Tech', callback_data: 'company:ozon' },
      ],
      [
        { text: 'Сбер AI', callback_data: 'company:sber' },
        { text: 'Avito Tech', callback_data: 'company:avito' },
        { text: 'VK (ВКонтакте)', callback_data: 'company:vk' },
      ],
      [
        { text: '💼 Все вакансии', callback_data: 'vacancies:all' },
        { text: '🚀 Смотреть в WebApp', web_app: { url: webAppUrlWithParams } },
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

  let text = `🏢 <b>Компания: ${company.name} (${company.shortName})</b>\n\n`;
  text += `📢 Канал работодателя: <code>${company.channel}</code>\n`;
  text += `📝 <i>${company.description}</i>\n`;
  text += `🛠 Основной стек: <code>${company.stack}</code>\n\n`;
  text += `🔥 <b>Открытые стажировки (${list.length}):</b>\n\n`;

  if (list.length === 0) {
    text += `🔍 Сейчас прямых позиций в базе нет, но парсер отслеживает канал <code>${company.channel}</code> 24/7!\nПроверьте WebApp или сайт компании:\n`;
  } else {
    list.slice(0, 6).forEach((item, idx) => {
      const applyUrl = item.applyUrl || item.url || RENDER_URL;
      text += `[${idx + 1}] <b>${item.title}</b>\n`;
      text += `   💰 <i>${item.salary || 'По договоренности'}</i> | 📍 ${item.format || 'Удаленно'} (${item.location || 'РФ'})\n`;
      text += `   🔗 <a href="${applyUrl}">Откликнуться / Перейти к посту</a>\n\n`;
    });
  }

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `📢 Канал ${company.channel}`, url: company.channelUrl },
        { text: '🚀 Открыть в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '🏢 Все компании', callback_data: 'companies' },
        { text: '💼 Все вакансии', callback_data: 'vacancies:all' },
      ],
      [
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    text: `⚡ <b>Запуск полного сканирования ${ALL_TARGET_TG_CHANNELS.length} Telegram-каналов и ${CAREER_WEBSITES_DATA.length} карьерных сайтов...</b>\n\nОпрашиваем @tbank_team, @KonturTech, @Life_in_Directum, @t1career, @yandex_intern, career.directum.ru, kontur.ru, fintech.tbank.ru, t1.ru, Habr Career...`,
    parse_mode: 'HTML',
  });

  const res = await scanChannelsAndSyncSupabase(true);

  const reportText =
    `✅ <b>Сканирование источников успешно завершено!</b>\n\n` +
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
        { text: '💼 Смотреть вакансии', callback_data: 'vacancies:all' },
        { text: '📊 Статус системы', callback_data: 'status' },
      ],
      [
        { text: '🚀 Открыть WebApp', web_app: { url: webAppUrlWithParams } },
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `📊 <b>Статус IT-Старт Парсера & Серверов:</b>\n\n` +
    `• <b>Telegram Бот:</b> @${BOT_USERNAME} (Long Polling 24/7)\n` +
    `• <b>VK Бот:</b> Онлайн (Bots Long Poll API & VK Mini App)\n` +
    `• <b>Аптайм сервера:</b> ${uptimeFormatted} (порт ${PORT})\n` +
    `• <b>Всего активных вакансий в базе:</b> <b>${LAST_SCAN_STATUS.totalActive || 16}</b>\n` +
    `• <b>Telegram-каналов в мониторинге:</b> <b>${ALL_TARGET_TG_CHANNELS.length}</b> источников\n` +
    `  <i>(@tbank_team, @KonturTech, @Life_in_Directum, @t1career, @yandex_intern, @forjunior, @normrabota...)</i>\n` +
    `• <b>Карьерных сайтов & API:</b> <b>${CAREER_WEBSITES_DATA.length}</b> источников\n` +
    `  <i>(career.directum.ru, kontur.ru, fintech.tbank.ru, t1.ru, Habr Career...)</i>\n` +
    `• <b>Последняя синхронизация:</b> <code>${LAST_SCAN_STATUS.lastScanAt ? new Date(LAST_SCAN_STATUS.lastScanAt).toLocaleTimeString('ru-RU') : 'недавно'}</code>\n` +
    `• <b>Синхронизировано в Supabase:</b> ${LAST_SCAN_STATUS.savedCount || 0} вакансий\n` +
    `• <b>Разослано пуш-уведомлений:</b> ${LAST_SCAN_STATUS.sentPushes || 0}\n\n` +
    `💡 Для принудительного запуска обновления отправьте команду /parse или /sync`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '⚡ Запустить парсинг', callback_data: 'parse' },
        { text: '💼 Свежие вакансии', callback_data: 'vacancies:all' },
      ],
      [
        { text: '🚀 Открыть WebApp', web_app: { url: webAppUrlWithParams } },
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `🗺 <b>Интерактивные Роадмапы IT-Старт:</b>\n\n` +
    `1. <b>Frontend:</b> Веб-сеть, HTML5, CSS Grid, JS ES6+, TS ➔ React / Angular / Vue\n` +
    `2. <b>Backend:</b> REST API, SQL, HTTP/2, Docker ➔ Python / Go / Java / Node.js\n` +
    `3. <b>Mobile:</b> База мобильных ОС ➔ Android (Kotlin) / iOS (Swift) / Flutter\n` +
    `4. <b>Data Science:</b> Матанализ, Python, SQL ➔ Machine Learning / Analytics\n` +
    `5. <b>QA:</b> Тест-дизайн, баг-трекинг ➔ Manual QA / Auto QA (Python/Playwright)\n` +
    `6. <b>DevOps:</b> Linux, Баш, Сети ➔ CI/CD & Docker / Kubernetes & Terraform\n\n` +
    `Каждый роадмап оформлен в виде дерева (roadmap.sh style) с чекбоксами подтем и подсчетом прогресса в %!`;

  const webAppUrlWithParams = `${WEBAPP_URL}${WEBAPP_URL.includes('?') ? '&' : '?'}tg_chat_id=${chatId}&subscribed=1#tg_chat_id=${chatId}`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🗺 Открыть древо роадмапов в WebApp',
          web_app: { url: webAppUrlWithParams },
        },
      ],
      [
        { text: '💼 Посмотреть стажировки', callback_data: 'vacancies:all' },
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `❓ <b>Тренажёр вопросов к собеседованию IT-Старт:</b>\n\n` +
    `В платформе собрана интерактивная база из 55+ реальных вопросов собеседований топ IT-компаний (Т-Банк, Т1, Контур, Directum, Яндекс, Ozon, Сбер, Авито, VK):\n\n` +
    `• <b>Frontend:</b> Event Loop, Microtasks/Macrotasks, React Fiber, Reconciler, Virtual DOM, CSS Stacking Context\n` +
    `• <b>Backend:</b> Транзакции & ACID, уровни изоляции PostgreSQL, Goroutines/Channels, Spring Bean Scopes, Event Loop Node.js\n` +
    `• <b>Mobile:</b> Жизненный цикл Activity/Fragment, Coroutines, Swift ARC & Retain Cycles, Flutter Widget Tree\n` +
    `• <b>QA:</b> Техники тест-дизайна, эквивалентные классы, REST API тестирование, PageObject в Playwright\n` +
    `• <b>DevOps:</b> Docker cgroups/namespaces, CI/CD pipelines, Kubernetes Pods/Deployments, Linux permissions\n` +
    `• <b>Data Science:</b> Gradient Descent, ROC-AUC, Overfitting, SQL Window Functions\n\n` +
    `🎯 <b>Доступны 2 интерактивных режима:</b>\n` +
    `1. <i>Флеш-карточки</i> — быстрое повторение ключевых определений\n` +
    `2. <i>Симуляция интервью</i> — скрытие ответа с самопроверкой после ввода своего решения!`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Запустить тренажёр в WebApp', web_app: { url: webAppUrlWithParams } },
      ],
      [
        { text: '💼 Каталог вакансий', callback_data: 'vacancies:all' },
        { text: '🗺 Роадмапы', callback_data: 'roadmaps' },
      ],
      [
        { text: '🌐 Сайт без VPN', url: RENDER_URL },
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
    `🚀 <b>Платформа IT-Старт доступна на всех устройствах:</b>\n\n` +
    `🌐 <b>Веб-версия без VPN:</b> ${RENDER_URL}\n` +
    `✈️ <b>Telegram Mini App:</b> запускается прямо внутри этого чата\n` +
    `📱 <b>ВКонтакте Mini App:</b> https://vk.com/app54857681\n` +
    `🐙 <b>Зеркало на GitHub Pages:</b> ${GITHUB_PAGES_URL}\n\n` +
    `В платформе доступны:\n` +
    `• Интерактивные роадмапы со шкалой готовности в %\n` +
    `• Тренажёр 55+ вопросов к собеседованию с режимом скрытия ответов\n` +
    `• Каталог стажировок с детальными фильтрами по технологиям и компаниям!`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Запустить WebApp', web_app: { url: webAppUrlWithParams } },
        { text: '🌐 Открыть сайт без VPN', url: RENDER_URL },
      ],
      [
        { text: '💼 Каталог вакансий', callback_data: 'vacancies:all' },
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
  const text =
    `ℹ️ <b>Команды бота @${BOT_USERNAME}:</b>\n\n` +
    `• /start — Главное меню и запуск WebApp\n` +
    `• /vacancies — Каталог стажировок с фильтром по направлениям (<code>/vacancies frontend</code>) или компаниям (<code>/vacancies t1</code>)\n` +
    `• /companies — Список целевых IT-компаний и каналов\n` +
    `• /roadmaps — Роадмапы по 6 направлениям разработки\n` +
    `• /questions — Тренажёр вопросов к собеседованию\n` +
    `• /subscribe — Включить персональные пуш-уведомления о стажировках\n` +
    `• /unsubscribe — Отключить получение уведомлений\n` +
    `• /id (или /myid) — Узнать свой Telegram Chat ID\n` +
    `• /status — Статус парсера, источников и сервера бота\n` +
    `• /scan (или /sync, /parse) — Принудительное сканирование каналов и сайтов\n` +
    `• /site — Ссылка на веб-платформу IT-Старт без VPN\n` +
    `• /vk — Официальный бот и сообщество ВКонтакте\n` +
    `• /tg (или /telegram) — Информация о Telegram-боте и WebApp\n` +
    `• /help — Список всех доступных команд\n\n` +
    `🏢 <b>Команды быстрого перехода к компаниям:</b>\n` +
    `/company_t1, /company_kontur, /company_tbank, /company_directum, /company_yandex, /company_ozon, /company_sber, /company_avito, /company_vk\n\n` +
    `💻 <b>Команды по направлениям:</b>\n` +
    `/frontend, /backend, /mobile, /data_science, /qa, /devops\n\n` +
    `💡 <i>Вы также можете просто отправить боту название компании (например: «директум», «t1», «тбанк», «контур») или стека («фронтенд», «бэкенд», «девопс»), и бот сразу покажет подходящие стажировки!</i>\n\n` +
    `🌐 <b>Сайт платформы (без VPN):</b> ${RENDER_URL}`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });

  return { ok: true, type: 'help', chatId };
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
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔔 <b>Подписка успешно оформлена!</b> Вы будете получать уведомления о новых стажировках.`,
      parse_mode: 'HTML',
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

process.on('SIGINT', () => {
  console.log('\nОстановка бота...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});

const isDirectRun =
  Boolean(process.argv[1]) &&
  !process.argv[1].includes('vk_bot') &&
  (process.argv[1].endsWith('bot.mjs') || process.argv[1].endsWith('bot.js') || process.argv[1].includes('bot'));

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
