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
 * Resolves an application URL, guaranteeing it leads to a working official career portal
 * or verified direct vacancy page instead of a broken Telegram link, shortener, or root page.
 */
export function resolveApplyUrl(rawUrl: string | undefined, companyName = ''): string {
  const companyKey = getCompanyKey(companyName);
  const officialPortal = COMPANY_OFFICIAL_PORTALS[companyKey] || 'https://career.directum.ru/vacancy';

  if (!rawUrl || typeof rawUrl !== 'string') {
    return officialPortal;
  }

  const trimmed = rawUrl.trim();

  // If link is an internal Telegram link (t.me/... or telegram.org/...)
  if (
    trimmed.includes('t.me/') ||
    trimmed.includes('telegram.me/') ||
    trimmed.includes('telegram.org/') ||
    trimmed.startsWith('@')
  ) {
    return officialPortal;
  }

  // If link is an external shortener or non-career blog/pr aggregator
  if (
    trimmed.includes('bit.ly') ||
    trimmed.includes('vk.cc') ||
    trimmed.includes('clck.ru') ||
    trimmed.includes('vc.ru') ||
    trimmed.includes('timepad.ru') ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('digital')
  ) {
    return officialPortal;
  }

  // Directum: root page does not show vacancies, redirect to /vacancy
  if (trimmed === 'https://career.directum.ru/' || trimmed === 'https://career.directum.ru') {
    return 'https://career.directum.ru/vacancy';
  }

  // T-Bank: fintech.tbank.ru DNS often fails, use verified official portal
  if (trimmed.includes('fintech.tbank.ru')) {
    return 'https://www.tbank.ru/career/it/';
  }

  // T1: t1.ru/school returned 404, use verified official portal career.t1.ru
  if (trimmed.includes('t1.ru/school')) {
    return 'https://career.t1.ru/';
  }

  // Yandex: outdated yabackend URL
  if (trimmed === 'https://yandex.ru/yabackend/' || trimmed === 'https://yandex.ru/yabackend') {
    return 'https://yandex.ru/jobs/';
  }

  // Avito: old internship 404 URL
  if (trimmed.includes('career.avito.com/internship')) {
    return 'https://career.avito.com/';
  }

  // Kontur: ensure working career portal
  if (trimmed === 'https://kontur.ru/career/' || trimmed === 'https://kontur.ru/career') {
    return 'https://kontur.ru/career/vacancies';
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
