/**
 * Official verified career portals and links for target companies
 */
export const COMPANY_OFFICIAL_PORTALS: Record<string, string> = {
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
 * Returns a direct vacancy search or internship catalog URL on official company career portals
 */
export function getDirectVacancyPortalUrl(companyKey: string, fallback = 'https://career.directum.ru/vacancy?search=стажер'): string {
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

/**
 * Resolves an application URL, guaranteeing it leads to a working direct vacancy page,
 * specific Telegram post, job board page, or targeted vacancy search on employer's portal
 * instead of a generic homepage (e.g. root avito.com) or broken shortener.
 */
export function resolveApplyUrl(rawUrl: string | undefined, companyName = '', sourceChannel = ''): string {
  const companyKey = getCompanyKey(companyName);
  const directPortal = getDirectVacancyPortalUrl(companyKey);

  if (!rawUrl || typeof rawUrl !== 'string') {
    if (sourceChannel) {
      const trimmedSource = sourceChannel.trim();
      if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(trimmedSource)) {
        return trimmedSource;
      }
      if (trimmedSource.startsWith('@')) {
        return `https://t.me/${trimmedSource.replace(/^@/, '')}`;
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

  // 2. Direct job boards (hh.ru vacancy, habr career vacancy)
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

  // 4. Handle bare telegram channel without post number
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

  // 6. Generic root homepages - replace with direct vacancy search for the employer
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
 * Strict validator for real IT internship and junior positions.
 * Rejects PR articles, podcasts, surveys, celebrations, contests, and non-IT roles.
 */
export function isStrictVacancyPost(title = '', text = ''): boolean {
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
