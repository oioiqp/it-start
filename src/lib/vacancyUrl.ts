import type { DirectionId, SubTrackId } from '../types';

/**
 * Official verified direct career portals and links for target companies
 */
export const COMPANY_OFFICIAL_PORTALS: Record<string, string> = {
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
  fallback = 'https://vk.com/student_directum',
  subTrackId?: string
): string {
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
      if (directionId === 'data_science') return 'https://education.tbank.ru/start/analyst/';
      if (directionId === 'qa') return 'https://education.tbank.ru/start/java/';
      if (directionId === 'devops') return 'https://education.tbank.ru/start/python/';
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

/**
 * Resolves an application URL, guaranteeing it leads strictly to a working direct vacancy page,
 * specific Telegram post, or direct job board item instead of a generic homepage
 * (e.g. root avito.ru, career.avito.com), empty search query (?search=), or broken shortener.
 */
export function resolveApplyUrl(
  rawUrl: string | undefined,
  companyName = '',
  sourceChannel = '',
  directionId?: string,
  subTrackId?: string
): string {
  const companyKey = getCompanyKey(companyName);
  const directPortal = getDirectVacancyPortalUrl(companyKey, directionId, undefined, subTrackId);

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

  // 2. Relative job board vacancy URLs (/vacancy/<id> for hh, /vacancies/<id> for habr, /vacancies/.../<id> for avito)
  if (/^\/vacancy\/\d+/i.test(trimmed)) {
    return `https://hh.ru${trimmed.split('?')[0]}`;
  }
  if (/^\/vacancies\/\d+/i.test(trimmed)) {
    return `https://career.habr.com${trimmed.split('?')[0]}`;
  }
  if (/^\/vacancies\/[a-zA-Z0-9_-]+\/\d+\/?/i.test(trimmed)) {
    // Relative Avito URL: if company is Avito or known senior/regular IDs, resolve to direct Avito portal
    if (companyKey === 'avito' || trimmed.includes('20803') || trimmed.includes('20812') || trimmed.includes('20816')) {
      return fallbackDirect;
    }
    return `https://career.avito.com${trimmed.split('?')[0]}`;
  }

  // 3. Direct job boards with concrete vacancy ID (hh.ru/vacancy/<id>, career.habr.com/vacancies/<id>)
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
    lower.includes('career.avito.com') ||
    lower === 'https://avito.ru/' ||
    lower === 'https://avito.ru' ||
    lower === 'https://www.avito.ru/' ||
    lower === 'https://www.avito.ru' ||
    lower === 'https://start.avito.ru/internships' ||
    lower === 'https://start.avito.ru/internships/' ||
    lower === 'https://start.avito.ru' ||
    lower === 'https://start.avito.ru/' ||
    // Stale / senior / regular roles that must NEVER be shown as internships:
    lower.includes('/vacancies/razrabotka/20803') ||
    lower.includes('/vacancies/razrabotka/20812') ||
    lower.includes('/vacancies/analitika-dannykh/20816') ||
    lower.includes('/vacancies/razrabotka/20805') ||
    lower.includes('/vacancies/razrabotka/20808') ||
    lower.includes('senior') ||
    (lower.includes('sre') && !lower.includes('intern') && !lower.includes('стаж')) ||
    // Directum: all career.directum.ru pages are redirected to verified student community
    lower.includes('career.directum.ru') ||
    lower.includes('lead_product_owner') ||
    lower.includes('business_bevelopment') ||
    lower.includes('rukovoditel_proektov') ||
    lower.includes('inzhener_po_informacionnoj_bezopasnosti') ||
    // Kontur generic
    lower === 'https://kontur.ru/career/' ||
    lower === 'https://kontur.ru/career' ||
    lower.includes('kontur.ru/career/vacancies') ||
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
    // Obsolete employer links that must be rerouted to live verified portals
    lower.includes('career.t1.ru/debut/open-school') ||
    lower.includes('kontur.ru/career/students') ||
    lower.includes('kontur.ru/career/vacancies/intern-') ||
    lower.includes('education.tbank.ru/start/sre') ||
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
    lower === 'https://internship.vk.company/internship/' ||
    lower === 'https://internship.vk.company/internship' ||
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

/**
 * Official verified Telegram channels for target employers
 */
export const COMPANY_OFFICIAL_CHANNELS: Record<string, string> = {
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

/**
 * Resolves Telegram channel handles to valid existing public channels.
 * Guarantees that every target company vacancy always points to its verified company channel,
 * and eliminates web domains/job board names being prepended with '@' (like @hh.ru or @career.avito.com).
 */
export function resolveChannelHandle(channel: string | undefined, companyName = ''): string {
  const compKey = getCompanyKey(companyName);
  const officialChannel = COMPANY_OFFICIAL_CHANNELS[compKey];

  // If company is one of the 9 target employers, always map to its canonical verified channel
  if (officialChannel) {
    if (!channel) return officialChannel;

    const clean = channel.trim().replace(/^@/, '');
    const lower = clean.toLowerCase();

    // Check if channel is an official subchannel or alias for this company
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

    // If channel is a website domain (hh.ru, career.avito.com, t1.ru, etc.) or another random channel,
    // enforce the company's verified official channel:
    return officialChannel;
  }

  // For other/external companies or aggregators
  if (!channel) return '@IT_start_izh_bot';

  const clean = channel.trim().replace(/^@/, '');
  const lower = clean.toLowerCase();

  // If it looks like a web domain, don't prepend @
  if (lower.includes('.') || lower.includes('/')) {
    return '@IT_start_izh_bot';
  }

  return `@${clean}`;
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
    lower.includes('бесплатн') ||
    lower.includes('не оплачив') ||
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
      if (n1 === n2) return `от ${fmt(n1)} ₽`;
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
    // Events, games, battles, conferences, video clips, and system outages
    'батл для', 'архитектурная игра', 'архитектурный батл', 'батл разработчиков',
    'dotnext', 'highload', 'joker conf', 'holyjs', 'конференц', 'по следам нашей поездки',
    'сделали ролик', 'посмотрите ролик', 'видеоролик', 'прогуляйтесь по конфе',
    'доля доступных файлов', 'доступ к файлам', 'работают все базовые функции диска',
    'сбой в работе', 'восстановление сервиса'
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
    'кипиа', 'кип и а', 'инженер-конструктор', '1с', '1c ',
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

/**
 * Structured details about vacancy source (Telegram post vs Official Portal vs HeadHunter).
 * Guarantees that users are never misinformed about channel sources or generic homepages.
 */
export interface VacancySourceDetails {
  type: 'telegram_post' | 'portal' | 'hh';
  badgeLabel: string;
  badgeUrl: string;
  badgeTooltip: string;
  actionLabel: string;
  actionMobileLabel: string;
  applyUrl: string;
  officialChannelHandle: string;
  officialChannelUrl: string;
}

export function getVacancySourceDetails(
  rawApplyUrl: string | undefined,
  companyName = '',
  sourceChannel = '',
  directionId?: string,
  subTrackId?: string
): VacancySourceDetails {
  const compKey = getCompanyKey(companyName);
  const resolvedUrl = resolveApplyUrl(rawApplyUrl, companyName, sourceChannel, directionId, subTrackId);
  const officialChannelHandle = COMPANY_OFFICIAL_CHANNELS[compKey] || resolveChannelHandle(sourceChannel, companyName);
  const officialChannelUrl = `https://t.me/${officialChannelHandle.replace(/^@/, '')}`;

  // 1. Direct Telegram post (e.g. https://t.me/channel/123)
  const tgPostMatch = resolvedUrl.match(/https?:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/i);
  if (tgPostMatch) {
    const postChannel = `@${tgPostMatch[1]}`;
    return {
      type: 'telegram_post',
      badgeLabel: `Пост в ${postChannel}`,
      badgeUrl: resolvedUrl,
      badgeTooltip: `Открыть публикацию с вакансией в Telegram: ${resolvedUrl}`,
      actionLabel: 'Перейти к вакансии в Telegram',
      actionMobileLabel: 'Пост в Telegram',
      applyUrl: resolvedUrl,
      officialChannelHandle: postChannel,
      officialChannelUrl: `https://t.me/${postChannel.replace(/^@/, '')}`,
    };
  }

  // 2. HeadHunter direct vacancy
  if (resolvedUrl.includes('hh.ru/vacancy/')) {
    return {
      type: 'hh',
      badgeLabel: 'HeadHunter (hh.ru)',
      badgeUrl: resolvedUrl,
      badgeTooltip: `Открыть вакансию на HeadHunter: ${resolvedUrl}`,
      actionLabel: 'Откликнуться на hh.ru',
      actionMobileLabel: 'На hh.ru',
      applyUrl: resolvedUrl,
      officialChannelHandle,
      officialChannelUrl,
    };
  }

  // 3. Official employer career portal
  return {
    type: 'portal',
    badgeLabel: `Сайт ${companyName || 'работодателя'}`,
    badgeUrl: resolvedUrl,
    badgeTooltip: `Открыть страницу вакансии на официальном сайте ${companyName}: ${resolvedUrl}`,
    actionLabel: `Подать заявку на сайте ${companyName || ''}`.trim(),
    actionMobileLabel: `Откликнуться на ${companyName || 'сайте'}`.trim(),
    applyUrl: resolvedUrl,
    officialChannelHandle,
    officialChannelUrl,
  };
}

export interface VacancyFreshnessInput {
  id?: string;
  title?: string;
  company?: string;
  applyUrl?: string;
  source_url?: string;
  url?: string;
  description?: string;
  publishedAt?: string;
  published_at?: string;
  isActive?: boolean;
  is_active?: boolean;
  status?: string;
  expiresAt?: string;
  expires_at?: string;
}

/**
 * Validates vacancy relevance, freshness (TTL), and active recruitment status.
 * Rejects expired, closed, archived, or dead-end vacancy positions where recruitment
 * has ended or where target career pages have no open internships.
 */
export function isVacancyActive(item: VacancyFreshnessInput | null | undefined): boolean {
  if (!item) return false;

  // 1. Explicit inactive flag or archived/closed status
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

  // 2. Explicit expiration date
  const exp = item.expiresAt || item.expires_at;
  if (exp) {
    const expTime = new Date(exp).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) return false;
  }

  // 3. Reject known closed/archived IDs and dead patterns in text
  const url = (item.applyUrl || item.source_url || item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const combinedText = `${title} ${desc}`;

  // Check text flags for closed/archived
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

  // 4. Stale senior / closed Avito links
  if (
    url.includes('/vacancies/razrabotka/20803') ||
    url.includes('/vacancies/razrabotka/20812') ||
    url.includes('/vacancies/analitika-dannykh/20816') ||
    url.includes('/vacancies/razrabotka/20805') ||
    url.includes('/vacancies/razrabotka/20808')
  ) {
    return false;
  }

  // 5. Reject programs that are currently between seasons, closed, or have 0 openings
  const compLower = (item.company || '').toLowerCase();

  // Avito Tech closed on Aug 30 (screenshot: "Приём заявок до 30 августа")
  if ((compLower.includes('avito') || compLower.includes('авито')) && item.isActive !== true) {
    return false;
  }
  // Ozon Camp currently between seasons (screenshot: "Скоро тут что-то будет...")
  if ((compLower.includes('ozon') || compLower.includes('озон')) && item.isActive !== true) {
    return false;
  }
  // VK Internship currently has 0 vacancies (screenshot: "0 из 0 вакансий")
  if ((compLower.includes('vk') || compLower.includes('вконтакт')) && item.isActive !== true) {
    return false;
  }
  // Directum currently has no open student internships
  if ((compLower.includes('directum') || compLower.includes('директум')) && item.isActive !== true) {
    return false;
  }
  // Kontur off-season: seasonal round closed (screenshot: "Набор закрыт")
  if ((compLower.includes('контур') || compLower.includes('kontur')) && item.isActive !== true) {
    return false;
  }
  // Sber off-season
  if ((compLower.includes('сбер') || compLower.includes('sber')) && item.isActive !== true) {
    return false;
  }

  // 6. TTL Check & known closed aggregator vacancies (e.g. HeadHunter)
  // Job aggregator vacancies (hh.ru) close very fast (typically within 30-45 days).
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

export interface InternshipRecruitmentStatus {
  type: 'scheduled' | 'constant';
  deadline: string;
  note: string;
  displayBadge: string;
}

/**
 * Returns normalized recruitment status (scheduled vs constant year-round) with deadlines.
 * Guarantees that users clearly see whether a vacancy is continuous or has a strict cutoff date.
 */
export function getInternshipRecruitmentStatus(internship: {
  recruitmentType?: 'constant' | 'scheduled' | 'seasonal';
  applicationDeadline?: string;
  deadlineNote?: string;
  company?: string;
}): InternshipRecruitmentStatus {
  if (internship.recruitmentType === 'scheduled') {
    const deadline = internship.applicationDeadline || 'до 31 января';
    const note = internship.deadlineNote || 'Подача заявки и вступительные испытания';
    return {
      type: 'scheduled',
      deadline,
      note,
      displayBadge: `Приём заявок ${deadline} • ${note}`,
    };
  }

  if (internship.recruitmentType === 'constant') {
    const deadline = internship.applicationDeadline || 'Круглый год';
    const note = internship.deadlineNote || 'Постоянный круглогодичный набор';
    return {
      type: 'constant',
      deadline,
      note,
      displayBadge: `Постоянный набор • ${note}`,
    };
  }

  const comp = (internship.company || '').toLowerCase();
  if (comp.includes('т-банк') || comp.includes('тинькофф') || comp.includes('tbank')) {
    return {
      type: 'scheduled',
      deadline: 'до 31 января',
      note: 'Экзамен с 25 по 31 января включительно',
      displayBadge: 'Приём заявок до 31 января • Экзамен с 25 по 31 января',
    };
  }

  if (comp.includes('сбер') || comp.includes('sber')) {
    return {
      type: 'scheduled',
      deadline: 'до 28 февраля',
      note: 'Весенний сезон стажировок SberSeasons',
      displayBadge: 'Приём заявок до 28 февраля • SberSeasons',
    };
  }

  if (comp.includes('контур') || comp.includes('kontur')) {
    return {
      type: 'scheduled',
      deadline: 'Набор закрыт',
      note: 'Сезон стажировок завершён • Ожидается новый сезон',
      displayBadge: 'Набор закрыт • Ожидается новый сезон',
    };
  }

  if (comp.includes('т1') || comp.includes('t1')) {
    return {
      type: 'constant',
      deadline: 'Круглый год',
      note: 'Карьерный портал Т1 • Вакансии и стажировки',
      displayBadge: 'Постоянный набор • Вакансии Т1',
    };
  }

  if (comp.includes('directum') || comp.includes('директ')) {
    return {
      type: 'constant',
      deadline: 'Круглый год',
      note: 'Студенческое IT-сообщество Directum',
      displayBadge: 'Постоянный набор • Студенты Directum',
    };
  }

  return {
    type: 'constant',
    deadline: 'Круглый год',
    note: 'Постоянный круглогодичный набор',
    displayBadge: 'Постоянный набор • Круглый год',
  };
}



