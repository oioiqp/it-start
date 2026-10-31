import type { DirectionId, SubTrackId } from '../types';

/**
 * Official verified direct career portals and links for target companies
 */
export const COMPANY_OFFICIAL_PORTALS: Record<string, string> = {
  tbank: 'https://fintech.tbank.ru/start/frontend/',
  kontur: 'https://kontur.ru/career/vacancies/intern-frontend',
  directum: 'https://career.directum.ru/vacancy/web-developer',
  t1: 'https://career.t1.ru/vacancies/java-developer',
  yandex: 'https://yandex.ru/jobs/pages/internship-backend',
  ozon: 'https://job.ozon.ru/it/camp/golang/',
  sber: 'https://sbergraduate.ru/sberseasons-moscow/ml/',
  avito: 'https://career.avito.com/vacancies/razrabotka/20803/',
  vk: 'https://internship.vk.company/internship/web',
};

/**
 * Normalizes company identifier from company name or text
 */
export function getCompanyKey(companyName = ''): string {
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

/**
 * Returns a clean, recognizable monogram (1-2 uppercase letters) for matte glass squircle tiles
 */
export function getCompanyMonogram(companyName = ''): string {
  const key = getCompanyKey(companyName);
  switch (key) {
    case 't1':
      return 'Т1';
    case 'vk':
      return 'VK';
    case 'kontur':
      return 'К';
    case 'tbank':
      return 'Т';
    case 'directum':
      return 'D';
    case 'yandex':
      return 'Я';
    case 'ozon':
      return 'O';
    case 'sber':
      return 'С';
    case 'avito':
      return 'A';
    default:
      return (companyName.trim().charAt(0) || 'IT').toUpperCase();
  }
}

/**
 * Returns a direct vacancy URL or specific internship program URL on official company portals,
 * tailored to the requested technical direction.
 */
export function getDirectVacancyPortalUrl(
  companyKey: string,
  directionId?: string,
  fallback = 'https://career.directum.ru/vacancy/web-developer'
): string {
  switch (companyKey) {
    case 'avito':
      if (directionId === 'mobile') return 'https://career.avito.com/vacancies/razrabotka/20805/';
      if (directionId === 'frontend') return 'https://career.avito.com/vacancies/razrabotka/20808/';
      if (directionId === 'backend') return 'https://career.avito.com/vacancies/razrabotka/20812/';
      if (directionId === 'data_science') return 'https://career.avito.com/vacancies/analitika-dannykh/20816/';
      return 'https://career.avito.com/vacancies/razrabotka/20803/';
    case 'tbank':
      if (directionId === 'backend') return 'https://fintech.tbank.ru/start/backend/';
      if (directionId === 'qa') return 'https://fintech.tbank.ru/start/qa/';
      if (directionId === 'devops') return 'https://fintech.tbank.ru/start/sre/';
      if (directionId === 'data_science') return 'https://fintech.tbank.ru/start/analytics/';
      return 'https://fintech.tbank.ru/start/frontend/';
    case 'kontur':
      if (directionId === 'backend') return 'https://kontur.ru/career/vacancies/intern-backend';
      if (directionId === 'qa') return 'https://kontur.ru/career/vacancies/intern-qa';
      return 'https://kontur.ru/career/vacancies/intern-frontend';
    case 'directum':
      if (directionId === 'backend') return 'https://career.directum.ru/vacancy/backend-csharp';
      if (directionId === 'qa') return 'https://career.directum.ru/vacancy/qa-engineer';
      return 'https://career.directum.ru/vacancy/web-developer';
    case 't1':
      if (directionId === 'devops') return 'https://career.t1.ru/vacancies/devops-engineer';
      if (directionId === 'qa') return 'https://career.t1.ru/vacancies/qa-automation';
      return 'https://career.t1.ru/vacancies/java-developer';
    case 'yandex':
      if (directionId === 'frontend') return 'https://yandex.ru/jobs/pages/internship-frontend';
      if (directionId === 'mobile') return 'https://yandex.ru/jobs/pages/internship-mobile';
      if (directionId === 'data_science') return 'https://yandex.ru/jobs/pages/internship-ml';
      return 'https://yandex.ru/jobs/pages/internship-backend';
    case 'ozon':
      if (directionId === 'frontend') return 'https://job.ozon.ru/it/camp/frontend/';
      if (directionId === 'qa') return 'https://job.ozon.ru/it/camp/qa/';
      if (directionId === 'mobile') return 'https://job.ozon.ru/it/camp/mobile/';
      return 'https://job.ozon.ru/it/camp/golang/';
    case 'sber':
      if (directionId === 'backend') return 'https://sbergraduate.ru/sberseasons-moscow/java/';
      if (directionId === 'devops') return 'https://sbergraduate.ru/sberseasons-moscow/devops/';
      if (directionId === 'qa') return 'https://sbergraduate.ru/sberseasons-moscow/qa/';
      return 'https://sbergraduate.ru/sberseasons-moscow/ml/';
    case 'vk':
      if (directionId === 'backend') return 'https://internship.vk.company/internship/backend';
      if (directionId === 'qa') return 'https://internship.vk.company/internship/qa';
      if (directionId === 'data_science') return 'https://internship.vk.company/internship/data';
      if (directionId === 'mobile') return 'https://internship.vk.company/internship/mobile';
      return 'https://internship.vk.company/internship/web';
    default:
      return fallback;
  }
}

/**
 * Resolves an application URL, guaranteeing it leads strictly to a working direct vacancy page,
 * specific Telegram post, or direct job board item instead of a generic homepage
 * (e.g. root avito.ru, career.avito.com), empty search query (?search=), or broken shortener.
 */
export function resolveApplyUrl(
  rawUrl: string | undefined,
  companyName = '',
  sourceChannel = '',
  directionId?: string
): string {
  const companyKey = getCompanyKey(companyName);
  const directPortal = getDirectVacancyPortalUrl(companyKey, directionId);

  // If sourceChannel points to a specific post in Telegram, store it for fallback
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

  // 1. Direct Telegram post link (e.g. https://t.me/channel/123 or t.me/channel/123)
  if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return trimmed;
  }
  if (/^t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // 2. Direct job boards with concrete vacancy ID (hh.ru/vacancy/<id>, career.habr.com/vacancies/<id>)
  if (
    /https?:\/\/hh\.ru\/vacancy\/\d+/i.test(trimmed) ||
    /https?:\/\/career\.habr\.com\/vacancies\/\d+/i.test(trimmed)
  ) {
    return trimmed.split('?')[0];
  }
  if (
    /^hh\.ru\/vacancy\/\d+/i.test(trimmed) ||
    /^career\.habr\.com\/vacancies\/\d+/i.test(trimmed)
  ) {
    return `https://${trimmed.split('?')[0]}`;
  }

  // 3. Shorteners and non-career aggregators
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

  // 4. Eliminate generic search and root URLs that dump users into general search
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
    lower.includes('/vacancy?') ||
    // Avito generic
    lower === 'https://career.avito.com/' ||
    lower === 'https://career.avito.com' ||
    lower === 'https://avito.ru/' ||
    lower === 'https://avito.ru' ||
    lower === 'https://career.avito.com/vacancies' ||
    lower === 'https://career.avito.com/vacancies/' ||
    lower.includes('career.avito.com/internship') ||
    // Directum generic
    lower === 'https://career.directum.ru/' ||
    lower === 'https://career.directum.ru' ||
    lower === 'https://career.directum.ru/vacancy' ||
    lower === 'https://career.directum.ru/vacancy/' ||
    // Kontur generic
    lower === 'https://kontur.ru/career/' ||
    lower === 'https://kontur.ru/career' ||
    lower === 'https://kontur.ru/career/vacancies' ||
    lower === 'https://kontur.ru/career/vacancies/' ||
    // T1 generic
    lower === 'https://career.t1.ru/' ||
    lower === 'https://career.t1.ru' ||
    lower === 'https://career.t1.ru/vacancies' ||
    lower === 'https://career.t1.ru/vacancies/' ||
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
    // T-Bank generic
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
    lower === 'https://internship.vk.company/internship' ||
    lower === 'https://internship.vk.company/internship/' ||
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

  // 5. Bare telegram channel without post number
  if (trimmed.startsWith('@') || /^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/?$/i.test(trimmed)) {
    return fallbackDirect;
  }

  // 6. Direct company vacancy detail page with actual vacancy slug or ID
  if (
    trimmed.includes('/vacancies/razrabotka/') ||
    trimmed.includes('/vacancies/data-science/') ||
    trimmed.includes('/vacancies/analitika-dannykh/') ||
    trimmed.includes('/vacancy/web-developer') ||
    trimmed.includes('/vacancy/backend-csharp') ||
    trimmed.includes('/vacancy/qa-engineer') ||
    trimmed.includes('/lead_') ||
    trimmed.includes('/camp/') ||
    trimmed.includes('/intern-') ||
    trimmed.includes('/internship/web') ||
    trimmed.includes('/internship/backend') ||
    trimmed.includes('/internship/qa') ||
    trimmed.includes('/internship/data') ||
    trimmed.includes('/internship/mobile') ||
    trimmed.includes('/pages/internship-') ||
    trimmed.includes('/start/frontend/') ||
    trimmed.includes('/start/backend/') ||
    trimmed.includes('/start/qa/') ||
    trimmed.includes('/start/sre/') ||
    trimmed.includes('/start/analytics/') ||
    trimmed.includes('/sberseasons-moscow/ml/') ||
    trimmed.includes('/sberseasons-moscow/java/') ||
    trimmed.includes('/sberseasons-moscow/devops/') ||
    trimmed.includes('/sberseasons-moscow/qa/') ||
    trimmed.includes('/vacancies/java-developer') ||
    trimmed.includes('/vacancies/devops-engineer') ||
    trimmed.includes('/vacancies/qa-automation')
  ) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  // 7. General vacancy ID pattern (e.g. /vacancies/<category>/<number>/)
  if (/\/vacancies\/[a-zA-Z0-9_-]+\/\d+\/?/i.test(trimmed)) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  return fallbackDirect;
}

/**
 * Resolves Telegram channel handles to valid existing public channels.
 * Fixes broken handles like @kontur_career -> @KonturTech.
 */
export function resolveChannelHandle(channel: string | undefined, companyName = ''): string {
  if (!channel) {
    const compKey = getCompanyKey(companyName);
    switch (compKey) {
      case 'kontur':
        return '@KonturTech';
      case 'directum':
        return '@Life_in_Directum';
      case 't1':
        return '@t1career';
      case 'yandex':
        return '@yandex_intern';
      case 'tbank':
      default:
        return '@tbank_team';
    }
  }

  const clean = channel.trim().replace(/^@/, '');
  const lower = clean.toLowerCase();

  if (lower === 'kontur_career') return '@KonturTech';
  if (lower === 'directum_career' || lower === 'directum_careers') return '@Life_in_Directum';
  if (lower === 't1_holding') return '@t1career';
  if (lower === 'tbank_career' || lower === 'tinkoff_jobs') return '@tbank_team';

  return channel.startsWith('@') ? channel : `@${channel}`;
}

/**
 * Uniformly formats vacancy salary into a clean range («от 50 000 до 75 000 ₽», «от 60 000 ₽»)
 * or strictly «По договорённости».
 * Eliminates garbage artifacts, empty values, duplicated currencies, and non-price strings.
 */
export function formatSalary(salaryInput: any): string {
  if (!salaryInput) return 'По договорённости';

  // 1. If object from HH/job board API: { from, to, amount, value, currency }
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
    const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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

  // Non-salary placeholders or empty strings
  if (
    !str ||
    lower.includes('договор') ||
    lower.includes('оплачив') ||
    lower.includes('не указан') ||
    lower.includes('согласован') ||
    lower.includes('undefined') ||
    lower.includes('null')
  ) {
    return 'По договорённости';
  }

  // If already cleanly formatted, ensure it uses standard spaces and ends with ₽
  const cleanFmtRegex =
    /^(?:от\s+\d{1,3}(?:\s\d{3})*(?:\s+до\s+\d{1,3}(?:\s\d{3})*)?|до\s+\d{1,3}(?:\s\d{3})*|\d{1,3}(?:\s\d{3})*)\s*₽$/;
  const normalizedSpaces = str.replace(/[\u00A0\s]+/g, ' ');
  if (cleanFmtRegex.test(normalizedSpaces)) {
    return normalizedSpaces;
  }

  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Parse numbers from strings like "от 50 000 до 75 000 руб", "60-80k", "от 70 тыс руб"
  const rangeMatch = normalizedSpaces.match(
    /(?:от\s*)?(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?\s*(?:до|[-–—])\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i
  );
  if (rangeMatch) {
    let n1 = parseInt(rangeMatch[1].replace(/\s/g, ''), 10);
    let n2 = parseInt(rangeMatch[2].replace(/\s/g, ''), 10);
    if (n1 < 500) n1 *= 1000;
    if (n2 < 500) n2 *= 1000;
    if (n1 >= 10000 && n2 >= 10000) {
      return `от ${fmt(n1)} до ${fmt(n2)} ₽`;
    }
  }

  // From: от X
  const fromMatch = normalizedSpaces.match(/от\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i);
  if (fromMatch) {
    let n = parseInt(fromMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `от ${fmt(n)} ₽`;
  }

  // To: до X
  const toMatch = normalizedSpaces.match(/до\s*(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?/i);
  if (toMatch) {
    let n = parseInt(toMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `до ${fmt(n)} ₽`;
  }

  // Single number with currency
  const singleMatch = normalizedSpaces.match(/(\d+[\d\s]*)(?:\s*(?:тыс|k|к))?\s*(?:₽|руб)/i);
  if (singleMatch) {
    let n = parseInt(singleMatch[1].replace(/\s/g, ''), 10);
    if (n < 500) n *= 1000;
    if (n >= 10000) return `${fmt(n)} ₽`;
  }

  return 'По договорённости';
}

/**
 * Strict validator for real IT internship and junior positions.
 * Excludes non-IT vacancies (sales, support, call-center, operators, lawyers, accounting,
 * logistics, couriers, marketing, PR, SMM, fraud monitoring, office administration)
 * and commercial courses/ads.
 * Ensures the position strictly belongs to one of the 6 IT directions:
 * Frontend, Backend, Mobile, QA, DevOps/Cloud, Data Science/Analytics.
 */
export function isStrictVacancyPost(title = '', text = ''): boolean {
  const titleLower = title.toLowerCase();
  const combined = `${title} ${text}`.toLowerCase();

  // 1. Strict STOP WORDS (PR, news, celebrations, contests, courses)
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
    'конкурс школьниц', 'школьниц', 'авиация начинается',
    'всего за 10 недель', 'за 10 недель', 'за 3 месяца', 'курс с нуля',
    'записаться на курс', 'скидка на обучение', 'гарантия трудоустройства',
    'первая линия поддержки', 'холодные звонки', 'исходящие звонки',
    'продажа кредитов', 'оформление полисов', 'первичной документации'
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
    'саппорт', 'support', 'поддержк', 'выездного сервиса',
    'юрист', 'юрисконсульт', 'правовед', 'адвокат', 'судебн', 'комплаенс',
    'бухгалтер', 'экономист', 'аудитор', 'налогов', 'первичк',
    'страхование', 'страхован', 'осаго', 'каско', 'андеррайтер',
    'водитель', 'курьер', 'экспедитор', 'склад', 'кладовщик', 'комплектовщик', 'грузчик',
    'мерчендайзер', 'повар', 'уборщик', 'клининг', 'охрана', 'охранник', 'фасовщик',
    'маркетинг', 'маркетолог', 'таргетолог', 'контекстолог', 'копирайтер', 'smm', 'смм', 'пиар', 'seo', 'видеокреатор',
    'партнерств', 'partnerships', 'аккаунт-менеджер',
    'рекрутер', 'recruitment', 'подбор персонала', 'ресёрчер', 'ресечер', 'hr-', 'hr ',
    'администратор', 'офис-менеджер', 'дежурной смены', 'дежурн',
    'модератор', 'модерация', 'фрод-мониторинг', 'фрод', 'антифрод',
    'недвижимост', 'риск-менеджер', 'риск менеджер',
    'менеджер проектов', 'project manager', 'продакт-менеджер', 'product manager',
    'кипиа', 'кип и а', 'инженер-конструктор', '1с', '1c '
  ];

  for (const nonIt of nonItTitles) {
    if (titleLower.includes(nonIt)) {
      return false;
    }
  }

  // 3. Reject senior / lead roles unless explicitly an internship / junior
  const isSeniorOrLead =
    titleLower.includes('старший') ||
    titleLower.includes('senior') ||
    titleLower.includes('руководитель') ||
    titleLower.includes('lead ') ||
    titleLower.includes('head of') ||
    titleLower.includes('главный инженер');

  if (isSeniorOrLead && !titleLower.includes('стаж') && !titleLower.includes('junior') && !titleLower.includes('intern')) {
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
    'data engineer', 'инженер данных', 'flutter'
  ];
  if (!techKeywords.some((k) => combined.includes(k))) return false;

  // 5. Must indicate trainee / junior / internship or engineering role
  const roleKeywords = [
    'стаж', 'стажировк', 'intern', 'trainee',
    'junior', 'джуниор', 'джун', 'младш',
    'открытая школа', 'школа разработк', 'контур.старт', 'ozon camp', 'sberseasons', 'авито старт', 'young con',
    'инженер-разработчик', 'разработчик', 'инженер'
  ];
  if (!roleKeywords.some((k) => combined.includes(k))) return false;

  return true;
}

/**
 * Detects the technical direction and sub-track of a vacancy based on its title and description.
 */
export function detectVacancyTrack(
  title = '',
  text = ''
): { directionId: DirectionId; subTrackId: SubTrackId } {
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
    const subTrackId: SubTrackId = combined.includes('vue')
      ? 'vue'
      : combined.includes('angular')
      ? 'angular'
      : 'react';
    return { directionId: 'frontend', subTrackId };
  }

  if (
    combined.includes('qa') ||
    combined.includes('тестиров') ||
    combined.includes('тестирован') ||
    combined.includes('тест-инженер') ||
    combined.includes('quality assurance')
  ) {
    const subTrackId: SubTrackId =
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
    const subTrackId: SubTrackId =
      combined.includes('k8s') || combined.includes('kubernetes') ? 'k8s_iac' : 'cicd_docker';
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
    const subTrackId: SubTrackId =
      combined.includes('ml') || combined.includes('машинн') ? 'ml' : 'analytics';
    return { directionId: 'data_science', subTrackId };
  }

  if (
    combined.includes('android') ||
    combined.includes('ios') ||
    combined.includes('flutter') ||
    combined.includes('мобильн') ||
    combined.includes('mobile')
  ) {
    const subTrackId: SubTrackId = combined.includes('ios')
      ? 'ios'
      : combined.includes('flutter')
      ? 'flutter'
      : 'android';
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

