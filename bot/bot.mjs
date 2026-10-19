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
import { createClient } from '@supabase/supabase-js';

// Prefer IPv4 to avoid IPv6 connect timeouts on public Telegram web gateways
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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
    if (q.includes(c.shortName.toLowerCase()) || c.name.toLowerCase().includes(q)) return c;
    if (Array.isArray(c.aliases)) {
      for (const alias of c.aliases) {
        if (q.includes(alias) || alias.includes(q)) return c;
      }
    }
  }

  return null;
}

// Curated tracking database covering target employers (using standard unified IDs)
export const ALL_INTERNSHIPS = [
  // --- Холдинг Т1 ---
  {
    id: 'int-19',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Стажёр Java-разработчик (Открытая школа Т1)',
    salary: 'от 70 000 до 90 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@t1career',
    directionId: 'backend',
    subTrackId: 'java',
    url: 'https://t1.ru/school/',
    description: 'Обучение и стажировка в Открытой школе Т1 с переходом в штат. Разработка надежных Enterprise-сервисов.',
    tags: ['Java 21', 'Spring Boot', 'Открытая школа Т1', 'PostgreSQL', 'Т1'],
  },
  {
    id: 'int-20',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Junior DevOps-инженер (Инфраструктура Т1)',
    salary: 'от 75 000 до 95 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@t1career',
    directionId: 'devops',
    subTrackId: 'cicd_docker',
    url: 'https://t1.ru/school/',
    description: 'Поддержка и автоматизация инфраструктуры масштабируемых облачных решений Т1 Облако.',
    tags: ['Linux', 'Docker', 'CI/CD', 'Ansible', 'Т1'],
  },
  {
    id: 'int-21',
    companyId: 't1',
    company: 'Холдинг Т1',
    title: 'Стажёр QA Automation (Python / Java)',
    salary: 'от 60 000 до 80 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Ижевск / Удаленно',
    channel: '@t1career',
    directionId: 'qa',
    subTrackId: 'auto_qa',
    url: 'https://t1.ru/school/',
    description: 'Автоматизация тестирования банковских и интеграционных платформ группы Т1.',
    tags: ['QA Auto', 'Python', 'Pytest', 'REST API', 'Т1'],
  },

  // --- Контур ---
  {
    id: 'int-25',
    companyId: 'kontur',
    company: 'СКБ Контур',
    title: 'Стажёр Frontend-разработчик (Контур.Старт)',
    salary: 'от 65 000 до 85 000 ₽',
    format: 'Удаленно',
    location: 'Екатеринбург / Удаленно',
    channel: '@KonturTech',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://kontur.ru/career',
    description: 'Оплачиваемая стажировка Контур.Старт 2026 с индивидуальным наставником. Разработка UI сервисов.',
    tags: ['React', 'TypeScript', 'Контур.Старт', 'Jest', 'Контур'],
  },
  {
    id: 'int-26',
    companyId: 'kontur',
    company: 'СКБ Контур',
    title: 'Стажёр Backend C# / Python (Контур.Старт)',
    salary: 'от 70 000 до 90 000 ₽',
    format: 'Удаленно',
    location: 'Екатеринбург / Удаленно',
    channel: '@KonturTech',
    directionId: 'backend',
    subTrackId: 'python',
    url: 'https://kontur.ru/career',
    description: 'Программа стажировки Контур.Старт для начинающих бэкендеров. Решение бизнес-задач под менторством.',
    tags: ['Python', 'C#', 'Контур.Старт', 'PostgreSQL', 'Контур'],
  },

  // --- Т-Банк ---
  {
    id: 'int-1',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Frontend (React / TypeScript)',
    salary: 'от 75 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_team',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://fintech.tbank.ru/start/',
    description: 'Разработка новых витрин и финансовых сервисов для мобильного и веб-банкинга.',
    tags: ['React', 'TypeScript', 'Redux', 'Т-Банк', 'Финтех'],
  },
  {
    id: 'int-27',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Python Backend (Финтех)',
    salary: 'от 75 000 до 95 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_team',
    directionId: 'backend',
    subTrackId: 'python',
    url: 'https://fintech.tbank.ru/start/',
    description: 'Разработка сервисов процессинга и кредитных конвейеров банка. Высокая нагрузка.',
    tags: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'Kafka', 'Т-Банк'],
  },
  {
    id: 'int-28',
    companyId: 'tbank',
    company: 'Т-Банк',
    title: 'Стажёр Site Reliability Engineer / SRE',
    salary: 'от 80 000 до 105 000 ₽',
    format: 'Удаленно',
    location: 'Москва / Удаленно',
    channel: '@tbank_team',
    directionId: 'devops',
    subTrackId: 'k8s_iac',
    url: 'https://fintech.tbank.ru/start/',
    description: 'Обеспечение бесперебойной работы критических сервисов Т-Банка на Kubernetes.',
    tags: ['Kubernetes', 'Linux', 'Terraform', 'Prometheus', 'Т-Банк'],
  },

  // --- Directum (Ижевск) ---
  {
    id: 'int-22',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Web-разработчик (TypeScript / React)',
    salary: 'от 55 000 до 75 000 ₽',
    format: 'Гибрид',
    location: 'Ижевск / Удаленно',
    channel: '@Life_in_Directum',
    directionId: 'frontend',
    subTrackId: 'react',
    url: 'https://career.directum.ru/',
    description: 'Разработка веб-клиента флагманской платформы Directum RX в Ижевске.',
    tags: ['React', 'TypeScript', 'Directum RX', 'Ижевск', 'Директум'],
  },
  {
    id: 'int-23',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Backend C# / .NET Developer',
    salary: 'от 55 000 до 80 000 ₽',
    format: 'Удаленно',
    location: 'Ижевск / Удаленно',
    channel: '@Life_in_Directum',
    directionId: 'backend',
    subTrackId: 'java',
    url: 'https://career.directum.ru/',
    description: 'Разработка бэкенда интеллектуальной системы управления документами Directum RX.',
    tags: ['C#', '.NET', 'Directum RX', 'PostgreSQL', 'Ижевск', 'Директум'],
  },
  {
    id: 'int-24',
    companyId: 'directum',
    company: 'Directum',
    title: 'Стажёр Инженер по тестированию ПО (QA)',
    salary: 'от 50 000 до 65 000 ₽',
    format: 'Гибрид',
    location: 'Ижевск (Офис)',
    channel: '@Life_in_Directum',
    directionId: 'qa',
    subTrackId: 'manual_qa',
    url: 'https://career.directum.ru/',
    description: 'Тестирование веб- и десктоп-клиентов Directum RX, поиск дефектов в бизнес-процессах.',
    tags: ['Manual QA', 'Тест-дизайн', 'Directum RX', 'Ижевск', 'Директум'],
  },

  // --- Яндекс ---
  {
    id: 'int-2',
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
    tags: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'asyncio', 'Яндекс'],
  },

  // --- Ozon Tech ---
  {
    id: 'int-3',
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
    tags: ['Go', 'gRPC', 'PostgreSQL', 'Kafka', 'Ozon'],
  },

  // --- Сбер AI ---
  {
    id: 'int-4',
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
    tags: ['Python', 'PyTorch', 'CatBoost', 'SQL', 'Сбер'],
  },

  // --- Авито ---
  {
    id: 'int-6',
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
    id: 'int-5',
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
    url: 'https://t1.ru/school/',
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
    url: 'https://yandex.ru/yabackend/',
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
    url: 'https://career.avito.com/internship/',
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

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('IT-Старт Telegram Bot & Parser работает 24/7! (Render Health Check OK)\n');
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${PORT} (Render Health Check & Parser API)`);
  });

  // Check if bot token is provided
  if (!BOT_TOKEN) {
    console.log('='.repeat(70));
    console.log('⚡ IT-Старт Telegram Bot Runner');
    console.log('='.repeat(70));
    console.log('⚠️  Внимание: TELEGRAM_BOT_TOKEN не указан!');
    console.log('');
    console.log('HTTP Health Check сервер продолжает работать на порту ' + PORT + ' (Render Web Service).');
    console.log('Чтобы бот отвечал в Telegram, укажите токен в переменных окружения Render:');
    console.log('  TELEGRAM_BOT_TOKEN=<ТОКЕН_БОТА>');
    console.log('='.repeat(70));
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

      // Extract external apply/vacancy link if present in message
      const linkMatch = rawHtmlText.match(/href="((?:https?:\/\/)(?!t\.me|telegram\.org)[^"]+)"/i);
      const applyUrl = linkMatch ? linkMatch[1] : `https://t.me/${postSlug}`;

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
      // Filter for junior/intern/it vacancy keywords
      const isVacancy =
        textLower.includes('стаж') ||
        textLower.includes('junior') ||
        textLower.includes('джуниор') ||
        textLower.includes('интенсив') ||
        textLower.includes('школ') ||
        textLower.includes('ваканси') ||
        textLower.includes('ищем') ||
        textLower.includes('разработчик') ||
        textLower.includes('инженер') ||
        textLower.includes('qa') ||
        textLower.includes('тестиров') ||
        textLower.includes('devops') ||
        textLower.includes('camp') ||
        textLower.includes('start');

      if (!isVacancy) continue;

      // Extract first meaningful line as title candidate
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLine = (lines[0] || 'IT-Стажировка').replace(/^[^\p{L}\p{N}]+/u, '');
      const title = firstLine.length > 70 ? firstLine.slice(0, 67) + '...' : firstLine;

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
        directionId,
        subTrackId,
        url: applyUrl,
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

          parsed.push({
            id: `site-directum-${href.replace(/[^a-zA-Z0-9_-]/g, '')}`,
            companyId: 'directum',
            company: 'Directum',
            title: rawTitle,
            salary: 'от 55 000 до 85 000 ₽',
            format: city.toLowerCase().includes('удал') ? 'Удаленно' : 'Гибрид',
            location: city.includes('Ижевск') ? 'Ижевск (Офис / Гибрид)' : city,
            channel: 'career.directum.ru',
            directionId,
            subTrackId,
            url: href.startsWith('http') ? href : `https://career.directum.ru${href}`,
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
            count++;
            const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
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
              directionId,
              subTrackId,
              url: cleanUrl,
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

              parsed.push({
                id: `habr-${comp.alias}-${numId}`,
                companyId: comp.companyId,
                company: comp.company,
                title: rawTitle,
                salary: 'По договоренности',
                format: 'Гибрид',
                location: comp.companyId === 'directum' ? 'Ижевск / Удаленно' : 'Москва / Удаленно',
                channel: `career.habr.com/${comp.alias}`,
                directionId,
                subTrackId,
                url: `https://career.habr.com${href}`,
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

  // 4. High-fidelity career portals data for key employers (guaranteed presence)
  const portalVacancies = [
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
      url: 'https://kontur.ru/career/vacancies',
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
      url: 'https://fintech.tbank.ru/start/',
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
      url: 'https://t1.ru/school/',
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
      url: 'https://career.directum.ru/vacancy',
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
      url: 'https://yandex.ru/yabackend/',
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
      url: 'https://job.ozon.ru/it/',
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
      url: 'https://sbergraduate.ru/',
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
      url: 'https://career.avito.com/internship/',
      description: 'Стажировка в командах мобильной разработки Авито: создание фичей супераппа на Kotlin, Jetpack Compose и Coroutines.',
      tags: ['Авито', 'Android', 'Kotlin', 'Compose'],
      sourceType: 'portal',
    },
  ];

  for (const item of portalVacancies) {
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

/**
 * Fetch active internships combining Supabase data with fallback to curated database
 */
export async function getActiveInternships() {
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
        return {
          id: String(item.id),
          companyId: comp.id || item.company_id || 'other',
          company: item.company,
          title: item.title,
          salary: item.salary || 'По договоренности',
          format: item.format || 'Удаленно',
          location: item.city || item.location || 'Москва / Удаленно',
          channel: item.source_name || '@IT_start_izh_bot',
          directionId: item.direction || item.direction_id || 'backend',
          subTrackId: item.sub_track || item.sub_track_id || 'python',
          url: item.source_url || item.url || GITHUB_PAGES_URL,
          description: item.description || '',
          tags: parseArray(item.tags, [item.company, 'Стажировка']),
        };
      });

      const idSet = new Set(mapped.map((m) => m.id));
      const remaining = ALL_INTERNSHIPS.filter((i) => !idSet.has(i.id));
      return [...mapped, ...remaining];
    }
  } catch (err) {
    console.warn('[Parser] Ошибка чтения из Supabase, используем ALL_INTERNSHIPS:', err.message);
  }
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

  // 4. Match subscribers from `public.tg_subscriptions` and send notifications
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

          const matching = allToSync.filter(
            (v) => subDirs.includes(v.directionId) || subTracks.includes(v.subTrackId)
          );

          for (const item of matching.slice(0, 2)) {
            const key = `${sub.chat_id}_${item.id}`;
            if (!notifiedKeys.has(key)) {
              notifiedKeys.add(key);

              const isWeb = item.sourceType === 'portal' || item.sourceType === 'website';
              const pushText =
                `🔥 <b>Новая стажировка из мониторинга ${isWeb ? 'карьерных сайтов' : 'Telegram-каналов'}!</b>\n\n` +
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
                        text: isWeb ? '🔗 Страница вакансии' : '🔗 Канал источника',
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

  // Update in-memory scan statistics
  LAST_SCAN_STATUS.lastScanAt = new Date().toISOString();
  LAST_SCAN_STATUS.channelsChecked = ALL_TARGET_TG_CHANNELS.length;
  LAST_SCAN_STATUS.websitesChecked = CAREER_WEBSITES_DATA.length;
  LAST_SCAN_STATUS.parsedCount = newlyParsed.length;
  LAST_SCAN_STATUS.savedCount = savedCount;
  LAST_SCAN_STATUS.sentPushes = sentPushes;
  LAST_SCAN_STATUS.totalActive = allToSync.length;

  return {
    savedCount,
    sentPushes,
    channelsChecked: ALL_TARGET_TG_CHANNELS.length,
    websitesChecked: CAREER_WEBSITES_DATA.length,
    parsedCount: newlyParsed.length,
    totalActive: allToSync.length,
    newlyParsed,
    vacancies: allToSync,
  };
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
      `• <b>Отслеживание компаний</b> — Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK\n` +
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

  // /vacancies or /internships with optional company argument
  if (text.startsWith('/vacancies') || text.startsWith('/internships')) {
    const parts = text.trim().split(/\s+/);
    if (parts.length > 1) {
      const queryCompany = parts.slice(1).join(' ');
      const matched = findCompanyByQuery(queryCompany);
      if (matched) {
        await sendCompanyVacancies(chatId, matched.id);
        return;
      }
    }
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

  // /scan, /track, /parse, or /sync
  if (
    text.startsWith('/scan') ||
    text.startsWith('/track') ||
    text.startsWith('/parse') ||
    text.startsWith('/sync')
  ) {
    await runManualScan(chatId);
    return;
  }

  // /status
  if (text.startsWith('/status')) {
    await sendStatus(chatId);
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

  // Check if text directly matches company name/alias (e.g. "директум", "директрум", "t1", "контур", "тбанк")
  const matchedCompany = findCompanyByQuery(text);
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
  const allList = await getActiveInternships();
  let list = allList;
  let titleHeader = '🔥 <b>Актуальные IT-стажировки 2026:</b>\n\n';

  if (filterCompanyId !== 'all') {
    list = allList.filter(
      (i) => i.companyId === filterCompanyId || findCompanyByQuery(i.company)?.id === filterCompanyId
    );
    const company = COMPANIES_DATA.find((c) => c.id === filterCompanyId);
    if (company) {
      titleHeader = `🏢 <b>Вакансии компании ${company.name} (${company.channel}):</b>\n\n`;
    }
  }

  let text = titleHeader;
  if (list.length === 0) {
    text += `На данный момент новых вакансий в этой категории не найдено.\n\nПроверьте полный каталог в WebApp или выберите другую компанию ниже:`;
  } else {
    list.slice(0, 6).forEach((item, idx) => {
      text += `${idx + 1}. <b>${item.company}</b> — ${item.title}\n`;
      text += `   💰 <i>${item.salary}</i> | 📍 ${item.format} (${item.location || 'РФ'})\n`;
      text += `   📢 Источник: <code>${item.channel}</code> | <a href="${item.url}">Подать заявку</a>\n\n`;
    });
    if (list.length > 6) {
      text += `<i>... и ещё ${list.length - 6} вакансий доступно в WebApp!</i>\n\n`;
    }
    text += `⚡ Полный интерактивный каталог, фильтры по стеку и роадмапы доступны в WebApp!`;
  }

  if (text.length > 3900) {
    text = text.slice(0, 3850) + '\n\n<i>(Список сокращен, откройте WebApp для полного просмотра)</i>';
  }

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
          { text: 'VK', callback_data: 'vacancies:vk' },
          { text: '⚡ Сканировать каналы', callback_data: 'scan' },
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
          { text: 'VK (ВКонтакте)', callback_data: 'company:vk' },
          { text: '💼 Все вакансии', callback_data: 'vacancies:all' },
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

  const allList = await getActiveInternships();
  const list = allList.filter(
    (i) => i.companyId === companyId || findCompanyByQuery(i.company)?.id === companyId
  );

  let text = `🏢 <b>Компания: ${company.name}</b>\n`;
  text += `📢 Telegram-канал: <code>${company.channel}</code>\n`;
  text += `ℹ️ ${company.description}\n\n`;
  text += `🔥 <b>Открытые стажировки (${list.length}):</b>\n\n`;

  if (list.length === 0) {
    text += `На данный момент новых вакансий в канале не обнаружено. Проверьте WebApp!\n`;
  } else {
    list.slice(0, 7).forEach((item, idx) => {
      text += `${idx + 1}. <b>${item.title}</b>\n`;
      text += `   💰 <i>${item.salary}</i> | 📍 ${item.format} (${item.location || 'РФ'})\n`;
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
 * Trigger manual channels & career sites scan and report back
 */
async function runManualScan(chatId) {
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

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: reportText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💼 Смотреть вакансии', callback_data: 'vacancies:all' },
          { text: '📊 Статус системы', callback_data: 'status' },
        ],
        [
          { text: '🚀 Открыть WebApp', web_app: { url: GITHUB_PAGES_URL } },
        ],
      ],
    },
  });
}

/**
 * Send full parser, bot, and sources status
 */
async function sendStatus(chatId) {
  const uptimeMinutes = Math.floor(process.uptime() / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeFormatted = uptimeHours > 0 ? `${uptimeHours} ч ${uptimeMinutes % 60} мин` : `${uptimeMinutes} мин`;

  const statusText =
    `📊 <b>Статус IT-Старт Парсера & Сервера:</b>\n\n` +
    `• <b>Бот:</b> @${BOT_USERNAME} (Long Polling 24/7)\n` +
    `• <b>Аптайм сервера:</b> ${uptimeFormatted} (порт ${PORT})\n` +
    `• <b>Всего активных вакансий в базе:</b> <b>${LAST_SCAN_STATUS.totalActive || 16}</b>\n` +
    `• <b>Telegram-каналов в мониторинге:</b> <b>${ALL_TARGET_TG_CHANNELS.length}</b> источников\n` +
    `  <i>(@tbank_team, @KonturTech, @Life_in_Directum, @t1career, @yandex_intern, @forjunior, @normrabota...)</i>\n` +
    `• <b>Карьерных сайтов & API:</b> <b>${CAREER_WEBSITES_DATA.length}</b> источников\n` +
    `  <i>(career.directum.ru, kontur.ru, fintech.tbank.ru, t1.ru, Habr Career...)</i>\n` +
    `• <b>Последняя синхронизация:</b> <code>${new Date(LAST_SCAN_STATUS.lastScanAt).toLocaleTimeString('ru-RU')}</code>\n` +
    `• <b>Синхронизировано в Supabase:</b> ${LAST_SCAN_STATUS.savedCount || 0} вакансий\n` +
    `• <b>Разослано пуш-уведомлений:</b> ${LAST_SCAN_STATUS.sentPushes || 0}\n\n` +
    `💡 Для принудительного запуска обновления отправьте команду /parse или /sync`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: statusText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⚡ Запустить парсинг', callback_data: 'parse' },
          { text: '💼 Свежие вакансии', callback_data: 'vacancies:all' },
        ],
        [
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
    `/vacancies — Каталог стажировок с фильтром по компаниям (например: <code>/vacancies t1</code> или <code>/vacancies directum</code>)\n` +
    `/companies — Список целевых IT-компаний и каналов\n` +
    `/parse, /sync — Запустить сканирование Telegram-каналов и сайтов с синхронизацией\n` +
    `/status — Статус парсера, источников и сервера бота\n` +
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
    `/company_avito — Avito Tech\n` +
    `/company_vk — VK\n\n` +
    `💡 <i>Вы также можете просто отправить боту название компании (например: «директум», «t1», «тбанк», «контур»), и бот сразу покажет её стажировки!</i>\n\n` +
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
  } else if (data === 'scan' || data === 'parse' || data === 'sync') {
    await runManualScan(chatId);
  } else if (data === 'status') {
    await sendStatus(chatId);
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
