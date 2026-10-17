import type { DirectionId, SubTrackId } from '../types';

export interface MonitoredChannel {
  id: string;
  name: string;
  handle: string;
  company: string;
  category: string;
  status: 'active' | 'scanning' | 'success' | 'idle';
  postCount: number;
  lastChecked: string;
  url: string;
  avatarColor: string;
}

export interface ParsedChannelPost {
  id: string;
  channelHandle: string;
  channelName: string;
  company: string;
  title: string;
  salary: string;
  location: string;
  format: 'Удаленно' | 'Гибрид' | 'Офис';
  directionId: DirectionId;
  subTrackId: SubTrackId;
  tags: string[];
  snippet: string;
  publishedAt: string;
}

export const MONITORED_CHANNELS_LIST: MonitoredChannel[] = [
  {
    id: 't1',
    name: 'Холдинг Т1 / Открытая школа',
    handle: '@t1career',
    company: 'Холдинг Т1',
    category: 'IT-Стажировки & Интенсивы',
    status: 'active',
    postCount: 14,
    lastChecked: 'Только что',
    url: 'https://t.me/t1career',
    avatarColor: 'from-amber-500 to-red-600',
  },
  {
    id: 'kontur',
    name: 'Технологии в Контуре / СКБ Контур',
    handle: '@KonturTech',
    company: 'Контур',
    category: 'Стажировки студентов & Junior',
    status: 'active',
    postCount: 19,
    lastChecked: '2 мин назад',
    url: 'https://t.me/KonturTech',
    avatarColor: 'from-red-500 to-rose-600',
  },
  {
    id: 'tbank',
    name: 'Работа в Т-Банке & Финтех',
    handle: '@tbank_team',
    company: 'Т-Банк',
    category: 'Финтех-стажировки & Карьера',
    status: 'active',
    postCount: 32,
    lastChecked: '5 мин назад',
    url: 'https://t.me/tbank_team',
    avatarColor: 'from-yellow-400 to-amber-500',
  },
  {
    id: 'directum',
    name: 'Жизнь в Directum (Ижевск)',
    handle: '@Life_in_Directum',
    company: 'Directum',
    category: 'Разработка Directum RX & QA',
    status: 'active',
    postCount: 11,
    lastChecked: '10 мин назад',
    url: 'https://t.me/Life_in_Directum',
    avatarColor: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'yandex',
    name: 'Яндекс для стажёров',
    handle: '@yandex_intern',
    company: 'Яндекс',
    category: 'Young Con & Интерны',
    status: 'active',
    postCount: 27,
    lastChecked: '12 мин назад',
    url: 'https://t.me/yandex_intern',
    avatarColor: 'from-red-600 to-orange-500',
  },
  {
    id: 'ozon',
    name: 'Ozon Tech Career',
    handle: '@ozon_tech_career',
    company: 'Ozon Tech',
    category: 'Camp & Junior вакансии',
    status: 'active',
    postCount: 22,
    lastChecked: '15 мин назад',
    url: 'https://t.me/ozon_tech_career',
    avatarColor: 'from-blue-600 to-sky-400',
  },
  {
    id: 'sber',
    name: 'Сбер Карьера & AI',
    handle: '@sber_careers',
    company: 'Сбер',
    category: 'SberSeasons & Data Science',
    status: 'active',
    postCount: 29,
    lastChecked: '18 мин назад',
    url: 'https://t.me/sber_careers',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'avito',
    name: 'Avito Tech Jobs',
    handle: '@avito_tech',
    company: 'Avito Tech',
    category: 'Mobile, Backend & Platform',
    status: 'active',
    postCount: 18,
    lastChecked: '25 мин назад',
    url: 'https://t.me/avito_tech',
    avatarColor: 'from-violet-500 to-purple-600',
  },
  {
    id: 'tproger',
    name: 'Типичный программист — Вакансии',
    handle: '@tproger_jobs',
    company: 'IT Channels',
    category: 'Junior & Trainee вакансии',
    status: 'active',
    postCount: 45,
    lastChecked: '30 мин назад',
    url: 'https://t.me/tproger_jobs',
    avatarColor: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'normrabota',
    name: 'Норм работа: IT Стажировки',
    handle: '@normrabota',
    company: 'IT Channels',
    category: 'Стажировки с прозрачной вилкой',
    status: 'active',
    postCount: 38,
    lastChecked: '35 мин назад',
    url: 'https://t.me/normrabota',
    avatarColor: 'from-fuchsia-500 to-pink-600',
  },
];

export const INITIAL_PARSED_POSTS: ParsedChannelPost[] = [
  {
    id: 'scan-t1-java',
    channelHandle: '@t1career',
    channelName: 'Холдинг Т1 / Открытая школа',
    company: 'Холдинг Т1',
    title: 'Стажёр Java-разработчик (Открытая школа Т1)',
    salary: 'от 70 000 до 90 000 ₽',
    location: 'Москва / Удаленно',
    format: 'Удаленно',
    directionId: 'backend',
    subTrackId: 'java',
    tags: ['Java 21', 'Spring Boot', 'Открытая школа Т1', 'PostgreSQL'],
    snippet: 'Холдинг Т1 открывает регистрацию в Открытую школу: оплачиваемый интенсив по разработке на Java/Spring с менторством ведущих архитекторов холдинга и трудоустройством в штат.',
    publishedAt: '2026-03-29T10:00:00.000Z',
  },
  {
    id: 'scan-kontur-fe',
    channelHandle: '@KonturTech',
    channelName: 'Технологии в Контуре / СКБ Контур',
    company: 'Контур',
    title: 'Стажёр Frontend-разработчик (Контур.Старт 2026)',
    salary: 'от 65 000 до 85 000 ₽',
    location: 'Екатеринбург / Пермь / Удаленно',
    format: 'Удаленно',
    directionId: 'frontend',
    subTrackId: 'react',
    tags: ['React', 'TypeScript', 'Контур.Старт', 'Jest', 'Redux'],
    snippet: 'Контур.Старт 2026: ищем начинающих фронтендеров на React/TypeScript. Реальные продуктовые задачи, персональный наставник и стипендия во время стажировки.',
    publishedAt: '2026-03-29T13:15:00.000Z',
  },
  {
    id: 'scan-directum-web',
    channelHandle: '@Life_in_Directum',
    channelName: 'Жизнь в Directum (Ижевск)',
    company: 'Directum',
    title: 'Стажёр Web-разработчик (TypeScript / React)',
    salary: 'от 55 000 до 75 000 ₽',
    location: 'Ижевск / Удаленно',
    format: 'Гибрид',
    directionId: 'frontend',
    subTrackId: 'react',
    tags: ['React', 'TypeScript', 'Directum RX', 'Ижевск'],
    snippet: 'Directum приглашает студентов и начинающих разработчиков в команду веб-клиента Directum RX в Ижевске. Комфортный офис, гибкий график под учебу и помощь ментора.',
    publishedAt: '2026-03-29T11:00:00.000Z',
  },
  {
    id: 'scan-tbank-sre',
    channelHandle: '@tbank_team',
    channelName: 'Работа в Т-Банке & Финтех',
    company: 'Т-Банк',
    title: 'Стажёр Site Reliability Engineer / DevOps',
    salary: 'от 80 000 до 105 000 ₽',
    location: 'Москва / Удаленно',
    format: 'Удаленно',
    directionId: 'devops',
    subTrackId: 'k8s_iac',
    tags: ['Kubernetes', 'Linux', 'Terraform', 'Prometheus', 'Т-Банк SRE'],
    snippet: 'Стажировка в инфраструктурных командах Т-Банка: управление кластерами Kubernetes, автоматизация пайплайнов развертывания и обеспечение высокой доступности сервисов.',
    publishedAt: '2026-03-29T11:45:00.000Z',
  },
  {
    id: 'scan-directum-qa',
    channelHandle: '@Life_in_Directum',
    channelName: 'Жизнь в Directum (Ижевск)',
    company: 'Directum',
    title: 'Стажёр Инженер по тестированию ПО (QA)',
    salary: 'от 50 000 до 65 000 ₽',
    location: 'Ижевск (Офис / Гибрид)',
    format: 'Гибрид',
    directionId: 'qa',
    subTrackId: 'manual_qa',
    tags: ['Manual QA', 'Тест-дизайн', 'Directum RX', 'Postman', 'Ижевск'],
    snippet: 'Стажировка в отделе тестирования Directum в Ижевске: функциональное тестирование экосистемы Directum RX, проектирование тест-кейсов и работа с API. Опыт работы не требуется.',
    publishedAt: '2026-03-28T16:00:00.000Z',
  },
  {
    id: 'scan-ozon-go',
    channelHandle: '@ozon_tech_career',
    channelName: 'Ozon Tech Career',
    company: 'Ozon Tech',
    title: 'Junior Golang Developer (Логистика)',
    salary: 'от 85 000 до 105 000 ₽',
    location: 'Москва / Удаленно',
    format: 'Удаленно',
    directionId: 'backend',
    subTrackId: 'golang',
    tags: ['Go', 'gRPC', 'PostgreSQL', 'Docker', 'Kafka'],
    snippet: 'Ozon Camp: микросервисная архитектура на Go, высоконагруженная маршрутизация заказов и работа с очередями Kafka под руководством опытных инженеров.',
    publishedAt: '2026-03-29T14:00:00.000Z',
  },
];
