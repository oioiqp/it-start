import { describe, it, expect } from 'vitest';
import {
  formatSalary,
  isStrictVacancyPost,
  isVacancyActive,
  resolveApplyUrl,
  resolveChannelHandle,
  detectVacancyTrack,
  COMPANY_OFFICIAL_PORTALS,
  getDirectVacancyPortalUrl,
} from '../lib/vacancyUrl';
import { SEED_INTERNSHIPS } from '../data/internships';
import { MONITORED_WEBSITES_LIST } from '../data/channels';

describe('Vacancy Quality & Link Integrity Verification', () => {
  describe('1. formatSalary', () => {
    it('returns standard "По договорённости" for empty / null / non-salary markers', () => {
      expect(formatSalary(null)).toBe('По договорённости');
      expect(formatSalary(undefined)).toBe('По договорённости');
      expect(formatSalary('')).toBe('По договорённости');
      expect(formatSalary('По договоренности')).toBe('По договорённости');
      expect(formatSalary('По договорённости')).toBe('По договорённости');
      expect(formatSalary('договорная')).toBe('По договорённости');
      expect(formatSalary('Оплачиваемая стажировка')).toBe('По договорённости');
      expect(formatSalary('оплачиваемая')).toBe('По договорённости');
      expect(formatSalary('не указана')).toBe('По договорённости');
    });

    it('formats salary object ranges cleanly', () => {
      expect(formatSalary({ from: 50000, to: 75000 })).toBe('от 50 000 до 75 000 ₽');
      expect(formatSalary({ from: 60000 })).toBe('от 60 000 ₽');
      expect(formatSalary({ to: 80000 })).toBe('до 80 000 ₽');
      expect(formatSalary({ amount: 70000 })).toBe('70 000 ₽');
    });

    it('formats raw string ranges with proper spaces and ₽ symbol', () => {
      expect(formatSalary('от 50 000 до 75 000 руб')).toBe('от 50 000 до 75 000 ₽');
      expect(formatSalary('60-80k')).toBe('от 60 000 до 80 000 ₽');
      expect(formatSalary('от 70 тыс руб')).toBe('от 70 000 ₽');
      expect(formatSalary('до 100 000 ₽')).toBe('до 100 000 ₽');
      expect(formatSalary('85000 ₽')).toBe('85 000 ₽');
    });

    it('preserves already clean ranges', () => {
      expect(formatSalary('от 65 000 до 85 000 ₽')).toBe('от 65 000 до 85 000 ₽');
    });
  });

  describe('2. isStrictVacancyPost', () => {
    it('accepts all 43 canonical SEED_INTERNSHIPS', () => {
      for (const item of SEED_INTERNSHIPS) {
        const isValid = isStrictVacancyPost(item.title, item.description);
        expect(isValid, `SEED item ${item.id} (${item.title}) should pass validator`).toBe(true);
      }
    });

    it('rejects marketing, courses, webinars and PR celebrations', () => {
      expect(isStrictVacancyPost('Стать аналитиком данных всего за 10 недель', 'Курс с гарантией трудоустройства')).toBe(false);
      expect(isStrictVacancyPost('Подкаст про IT карьеру', 'Слушайте новый выпуск')).toBe(false);
      expect(isStrictVacancyPost('Поздравляем с 8 марта!', 'Дарим мерч и подарки')).toBe(false);
      expect(isStrictVacancyPost('Опрос: какую IDE вы используете?', 'Голосуйте в канале')).toBe(false);
      // Real Telegram news / conference / event / outage posts
      expect(isStrictVacancyPost('По следам нашей поездки на DotNext ребята сами, без ИИ, сделали ролик...', 'За два дня конференции мы выступили с докладами')).toBe(false);
      expect(isStrictVacancyPost('Делаем в Новосибирске батл для backend-разработчиков 🎉', 'Kontur Verse — архитектурная игра')).toBe(false);
      expect(isStrictVacancyPost('В ближайшие дни доля доступных файлов будет увеличиваться . При это...', 'Инженеры Яндекса делают всё возможное')).toBe(false);
    });

    it('rejects non-IT roles (sales, support, legal, accounting, logistics, HR, infosec)', () => {
      expect(isStrictVacancyPost('Младший специалист по продажам', 'B2B продажи')).toBe(false);
      expect(isStrictVacancyPost('Оператор call-центра', 'Прием входящих звонков')).toBe(false);
      expect(isStrictVacancyPost('Младший юрист', 'Договорная работа')).toBe(false);
      expect(isStrictVacancyPost('Помощник бухгалтера', 'Первичная документация')).toBe(false);
      expect(isStrictVacancyPost('Курьер на доставку', 'Доставка заказов')).toBe(false);
      expect(isStrictVacancyPost('Младший рекрутер в HR', 'Подбор персонала')).toBe(false);
      expect(isStrictVacancyPost('Младший специалист по фрод-мониторингу', 'Антифрод')).toBe(false);
      expect(isStrictVacancyPost('Младший риск-менеджер (недвижимость)', 'Оценка рисков')).toBe(false);
      expect(isStrictVacancyPost('Младший инженер КИПиА', 'Автоматика')).toBe(false);
      expect(isStrictVacancyPost('1С-программист стажер', 'Доработка конфигураций 1С')).toBe(false);
      expect(isStrictVacancyPost('Инженер по информационной безопасности', 'Защита данных')).toBe(false);
      expect(isStrictVacancyPost('Младший инженер по информационной безопасности', 'Безопасность')).toBe(false);
    });

    it('rejects senior/lead/middle roles without internship indicator', () => {
      expect(isStrictVacancyPost('Senior Python Developer', 'Разработка сервисов')).toBe(false);
      expect(isStrictVacancyPost('Старший разработчик React', 'Команда разработки')).toBe(false);
      expect(isStrictVacancyPost('Руководитель группы тестирования', 'Управление QA')).toBe(false);
      expect(isStrictVacancyPost('Middle Java Developer', 'Разработка бэкенда')).toBe(false);
      expect(isStrictVacancyPost('Мидл бэкенд разработчик', 'Сервисы')).toBe(false);
      expect(isStrictVacancyPost('Ведущий инженер по качеству', 'QA')).toBe(false);
      // General non-internship developer positions without junior/intern keywords
      expect(isStrictVacancyPost('Scala разработчик', 'Разработка на Scala')).toBe(false);
      expect(isStrictVacancyPost('Go-разработчик, Товародвижение и коммерция', 'Микросервисы')).toBe(false);
      expect(isStrictVacancyPost('Бэкенд разработчик Java | Python | Go | C++', 'Высокие нагрузки')).toBe(false);
      expect(isStrictVacancyPost('Разработчик на Java в команду B2B-платформы Яндекс 360', 'B2B')).toBe(false);
    });

    it('accepts legitimate junior / internship engineering roles across 6 directions', () => {
      expect(isStrictVacancyPost('Стажёр Frontend разработчик', 'React, TypeScript')).toBe(true);
      expect(isStrictVacancyPost('Junior Backend Engineer', 'Python, FastAPI, PostgreSQL')).toBe(true);
      expect(isStrictVacancyPost('Стажёр Flutter разработчик', 'Мобильная разработка')).toBe(true);
      expect(isStrictVacancyPost('Junior QA Automation', 'Автоматизация тестирования на Java')).toBe(true);
      expect(isStrictVacancyPost('Стажёр DevOps / SRE', 'Kubernetes, CI/CD, Docker')).toBe(true);
      expect(isStrictVacancyPost('Стажёр Data Scientist', 'ML, Python, PyTorch')).toBe(true);
      expect(isStrictVacancyPost('Стажёр Backend C# / .NET Developer (Directum RX)', 'Разработка ядра платформы')).toBe(true);
    });
  });

  describe('3. resolveApplyUrl & direct portals', () => {
    it('strips all search and direction query parameters', () => {
      expect(resolveApplyUrl('https://career.avito.com/vacancies/?search=android', 'Авито', undefined, 'mobile'))
        .not.toContain('?search=');
      expect(resolveApplyUrl('https://career.t1.ru/vacancies/?search=java', 'Холдинг Т1', undefined, 'backend'))
        .not.toContain('?search=');
      expect(resolveApplyUrl('https://education.tbank.ru/start/?direction=sre', 'Т-Банк', undefined, 'devops'))
        .not.toContain('?direction=');
      expect(resolveApplyUrl('https://kontur.ru/career/vacancies?search=react', 'Контур', undefined, 'frontend'))
        .not.toContain('?search=');
    });

    it('resolves relative job board and Avito vacancy URLs properly without triple slashes', () => {
      expect(resolveApplyUrl('/vacancy/138722040?query=sber', 'Сбер', undefined, 'backend'))
        .toBe('https://hh.ru/vacancy/138722040');
      expect(resolveApplyUrl('/vacancies/1000168452', 'Яндекс', undefined, 'backend'))
        .toBe('https://career.habr.com/vacancies/1000168452');
      expect(resolveApplyUrl('/vacancies/razrabotka/20812/', 'Авито', undefined, 'backend'))
        .toBe('https://start.avito.ru/tech');
    });

    it('resolves generic homepages to directional direct portals', () => {
      const avitoDirect = resolveApplyUrl('https://career.avito.com/', 'Авито', undefined, 'mobile');
      expect(avitoDirect).toBe('https://start.avito.ru/tech');

      const avitoDevops = resolveApplyUrl('https://career.avito.com', 'Авито', undefined, 'devops');
      expect(avitoDevops).toBe('https://start.avito.ru/tech');

      const avitoSearch = resolveApplyUrl('https://career.avito.com/vacancies/?search=стажер', 'Авито', undefined, 'frontend');
      expect(avitoSearch).toBe('https://start.avito.ru/tech');

      const tbankDirect = resolveApplyUrl('https://tbank.ru', 'Т-Банк', undefined, 'frontend');
      expect(tbankDirect).toBe('https://education.tbank.ru/start/frontend/');

      const konturDirect = resolveApplyUrl('https://kontur.ru', 'Контур', undefined, 'frontend');
      expect(konturDirect).toBe('https://kontur.ru/career/vacancies/intern-frontend');

      const sberDirect = resolveApplyUrl('https://sbergraduate.ru', 'Сбер', undefined, 'data_science');
      expect(sberDirect).toBe('https://sbergraduate.ru/sberseasons-moscow/ml/');

      const directumDirect = resolveApplyUrl('https://career.directum.ru', 'Directum', undefined, 'frontend');
      expect(directumDirect).toBe('https://career.directum.ru/');

      const directumLead = resolveApplyUrl('https://career.directum.ru/lead_product_ownerRX', 'Directum', undefined, 'backend');
      expect(directumLead).toBe('https://career.directum.ru/');

      const directumVacancySlash = resolveApplyUrl('https://career.directum.ru/vacancy/', 'Directum', undefined, 'backend');
      expect(directumVacancySlash).toBe('https://career.directum.ru/');

      const directumVacancyNoSlash = resolveApplyUrl('https://career.directum.ru/vacancy', 'Directum', undefined, 'qa');
      expect(directumVacancyNoSlash).toBe('https://career.directum.ru/');
    });

    it('resolves official internship portals for target companies according to specifications', () => {
      // 1. Company official portals configuration
      expect(COMPANY_OFFICIAL_PORTALS.tbank).toBe('https://education.tbank.ru/start/');
      expect(COMPANY_OFFICIAL_PORTALS.kontur).toBe('https://kontur.ru/career/students');
      expect(COMPANY_OFFICIAL_PORTALS.directum).toBe('https://career.directum.ru/');
      expect(COMPANY_OFFICIAL_PORTALS.t1).toBe('https://career.t1.ru/vacancies/');
      expect(COMPANY_OFFICIAL_PORTALS.yandex).toBe('https://yandex.ru/yaintern/');
      expect(COMPANY_OFFICIAL_PORTALS.ozon).toBe('https://job.ozon.ru/it/camp/');
      expect(COMPANY_OFFICIAL_PORTALS.sber).toBe('https://sbergraduate.ru/sberseasons-moscow/');
      expect(COMPANY_OFFICIAL_PORTALS.avito).toBe('https://start.avito.ru/internships');
      expect(COMPANY_OFFICIAL_PORTALS.vk).toBe('https://internship.vk.company/internship/');

      // 2. Avito specialized internship endpoints
      expect(getDirectVacancyPortalUrl('avito', 'mobile')).toBe('https://start.avito.ru/tech');
      expect(getDirectVacancyPortalUrl('avito', 'frontend')).toBe('https://start.avito.ru/tech');
      expect(getDirectVacancyPortalUrl('avito', 'backend')).toBe('https://start.avito.ru/tech');
      expect(getDirectVacancyPortalUrl('avito', 'devops')).toBe('https://start.avito.ru/tech');
      expect(getDirectVacancyPortalUrl('avito', 'qa')).toBe('https://start.avito.ru/tech');
      expect(getDirectVacancyPortalUrl('avito', 'data_science')).toBe('https://start.avito.ru/datascience-internship');
      expect(getDirectVacancyPortalUrl('avito', 'data_science', undefined, 'analytics')).toBe('https://start.avito.ru/analysts-internship');
      expect(getDirectVacancyPortalUrl('avito')).toBe('https://start.avito.ru/internships');

      // 3. Stale / senior Avito links are strictly intercepted
      expect(resolveApplyUrl('https://career.avito.com/vacancies/razrabotka/20803/', 'Авито', undefined, 'mobile'))
        .toBe('https://start.avito.ru/tech');
      expect(resolveApplyUrl('https://career.avito.com/vacancies/razrabotka/20812/', 'Авито', undefined, 'backend'))
        .toBe('https://start.avito.ru/tech');
      expect(resolveApplyUrl('https://career.avito.com/vacancies/analitika-dannykh/20816/', 'Авито', undefined, 'data_science', 'analytics'))
        .toBe('https://start.avito.ru/analysts-internship');
      expect(resolveApplyUrl('https://career.avito.com/vacancies/razrabotka/20803/', 'Авито'))
        .toBe('https://start.avito.ru/internships');

      // 4. Kontur student portal fallback
      expect(getDirectVacancyPortalUrl('kontur')).toBe('https://kontur.ru/career/students');
      expect(resolveApplyUrl('https://kontur.ru/career/', 'Контур')).toBe('https://kontur.ru/career/students');

      // 5. Directum portal fallback
      expect(getDirectVacancyPortalUrl('directum')).toBe('https://career.directum.ru/');
      expect(resolveApplyUrl('https://career.directum.ru/vacancy/', 'Directum')).toBe('https://career.directum.ru/');

      // 6. Yandex internship portal
      expect(getDirectVacancyPortalUrl('yandex')).toBe('https://yandex.ru/yaintern/');
      expect(resolveApplyUrl('https://yandex.ru/jobs/', 'Яндекс')).toBe('https://yandex.ru/yaintern/');

      // 7. Ozon Camp portal
      expect(getDirectVacancyPortalUrl('ozon')).toBe('https://job.ozon.ru/it/camp/');
      expect(resolveApplyUrl('https://job.ozon.ru/it/', 'Ozon')).toBe('https://job.ozon.ru/it/camp/');

      // 8. T1 career portal
      expect(getDirectVacancyPortalUrl('t1')).toBe('https://career.t1.ru/vacancies/');
      expect(resolveApplyUrl('https://career.t1.ru/', 'Холдинг Т1')).toBe('https://career.t1.ru/vacancies/');

      // 9. Sber Seasons portal
      expect(getDirectVacancyPortalUrl('sber')).toBe('https://sbergraduate.ru/sberseasons-moscow/');

      // 10. VK internship portal
      expect(getDirectVacancyPortalUrl('vk')).toBe('https://internship.vk.company/internship/');
      expect(resolveApplyUrl('https://internship.vk.company/', 'VK')).toBe('https://internship.vk.company/internship/');

      // 11. Monitored websites list canonical URLs for all target employers
      const siteMap = Object.fromEntries(MONITORED_WEBSITES_LIST.map((w) => [w.id, w.url]));
      expect(siteMap['site-kontur']).toBe('https://kontur.ru/career/students');
      expect(siteMap['site-tbank']).toBe('https://education.tbank.ru/start/');
      expect(siteMap['site-t1']).toBe('https://career.t1.ru/vacancies/');
      expect(siteMap['site-directum']).toBe('https://career.directum.ru/');
      expect(siteMap['site-yandex']).toBe('https://yandex.ru/yaintern/');
      expect(siteMap['site-ozon']).toBe('https://job.ozon.ru/it/camp/');
      expect(siteMap['site-sber']).toBe('https://sbergraduate.ru/sberseasons-moscow/');
      expect(siteMap['site-avito']).toBe('https://start.avito.ru/internships');
    });

    it('preserves valid Telegram post URLs with post IDs', () => {
      const tgUrl = 'https://t.me/t1career/264';
      expect(resolveApplyUrl(tgUrl, 'Холдинг Т1', '@t1career', 'backend')).toBe(tgUrl);
    });

    it('preserves valid direct company vacancy URLs with ID or slug', () => {
      const directHabr = 'https://career.habr.com/vacancies/1000168452';
      expect(resolveApplyUrl(directHabr, 'Яндекс', undefined, 'backend')).toBe(directHabr);

      const directHh = 'https://hh.ru/vacancy/119567843';
      expect(resolveApplyUrl(directHh, 'СКБ Контур', undefined, 'qa')).toBe(directHh);
    });
  });

  describe('4. detectVacancyTrack', () => {
    it('detects Frontend tracks accurately', () => {
      expect(detectVacancyTrack('Стажёр Frontend React').directionId).toBe('frontend');
      expect(detectVacancyTrack('Junior Angular Developer').directionId).toBe('frontend');
      expect(detectVacancyTrack('Vue.js веб-разработчик').directionId).toBe('frontend');
    });

    it('detects Backend tracks accurately', () => {
      expect(detectVacancyTrack('Стажёр Python Backend').directionId).toBe('backend');
      expect(detectVacancyTrack('Junior Golang Developer').directionId).toBe('backend');
      expect(detectVacancyTrack('Java Spring Boot стажёр').directionId).toBe('backend');
    });

    it('detects Mobile tracks accurately', () => {
      expect(detectVacancyTrack('Junior Android Kotlin Developer').directionId).toBe('mobile');
      expect(detectVacancyTrack('Стажёр iOS Swift Developer').directionId).toBe('mobile');
      expect(detectVacancyTrack('Flutter Mobile Developer').directionId).toBe('mobile');
    });

    it('detects QA tracks accurately', () => {
      expect(detectVacancyTrack('Стажёр QA-инженер (ручное тестирование)').directionId).toBe('qa');
      expect(detectVacancyTrack('Junior QA Automation Python').directionId).toBe('qa');
    });

    it('detects DevOps tracks accurately', () => {
      expect(detectVacancyTrack('Стажёр SRE / DevOps').directionId).toBe('devops');
      expect(detectVacancyTrack('Junior Kubernetes Engineer').directionId).toBe('devops');
    });

    it('detects Data Science tracks accurately', () => {
      expect(detectVacancyTrack('Стажёр ML / Data Science').directionId).toBe('data_science');
      expect(detectVacancyTrack('Junior Аналитик данных').directionId).toBe('data_science');
    });
  });

  describe('5. resolveChannelHandle & target employer parity', () => {
    it('always maps target employers to their verified official channels regardless of raw input', () => {
      // 1. Sberbank
      expect(resolveChannelHandle('hh.ru/3529', 'Сбер')).toBe('@sber_careers');
      expect(resolveChannelHandle(undefined, 'Сбер (SberSeasons)')).toBe('@sber_careers');
      expect(resolveChannelHandle('sbergraduate.ru', 'Сбер AI')).toBe('@sber_careers');

      // 2. Avito
      expect(resolveChannelHandle('career.avito.com', 'Авито')).toBe('@avito_tech');
      expect(resolveChannelHandle(undefined, 'Avito Tech')).toBe('@avito_tech');
      expect(resolveChannelHandle('@avito_career', 'Авито')).toBe('@avito_tech');

      // 3. Ozon
      expect(resolveChannelHandle('hh.ru/2180', 'Ozon Tech')).toBe('@ozon_tech_career');
      expect(resolveChannelHandle('job.ozon.ru', 'Ozon')).toBe('@ozon_tech_career');
      expect(resolveChannelHandle(undefined, 'Ozon Tech')).toBe('@ozon_tech_career');

      // 4. VK
      expect(resolveChannelHandle('internship.vk.company', 'VK')).toBe('@vk_team');
      expect(resolveChannelHandle(undefined, 'VK (ВКонтакте)')).toBe('@vk_team');

      // 5. Т-Банк
      expect(resolveChannelHandle('education.tbank.ru', 'Т-Банк')).toBe('@tbank_team');
      expect(resolveChannelHandle('@tbank_start', 'Т-Банк (Тинькофф)')).toBe('@tbank_team');

      // 6. СКБ Контур
      expect(resolveChannelHandle('kontur.ru/career', 'СКБ Контур')).toBe('@KonturTech');
      expect(resolveChannelHandle('kontur_career', 'Контур')).toBe('@KonturTech');

      // 7. Directum
      expect(resolveChannelHandle('career.directum.ru', 'Directum')).toBe('@Life_in_Directum');
      expect(resolveChannelHandle(undefined, 'Directum')).toBe('@Life_in_Directum');

      // 8. Холдинг Т1
      expect(resolveChannelHandle('t1.ru/school', 'Холдинг Т1')).toBe('@t1career');
      expect(resolveChannelHandle(undefined, 'Холдинг Т1')).toBe('@t1career');

      // 9. Яндекс
      expect(resolveChannelHandle('yandex.ru/yabackend', 'Яндекс')).toBe('@yandex_intern');
      expect(resolveChannelHandle(undefined, 'Яндекс')).toBe('@yandex_intern');
    });

    it('handles external aggregator channels without mangling web domains', () => {
      expect(resolveChannelHandle('@normrabota', 'IT Channels')).toBe('@normrabota');
      expect(resolveChannelHandle('hh.ru/other', 'Неизвестная компания')).toBe('@IT_start_izh_bot');
      expect(resolveChannelHandle(undefined, '')).toBe('@IT_start_izh_bot');
    });
  });

  describe('6. isVacancyActive & freshness / relevance engine', () => {
    it('approves legitimate active 2026 internships with direct portals', () => {
      expect(
        isVacancyActive({
          title: 'Стажёр Frontend-разработчик (React)',
          company: 'Т-Банк (Тинькофф)',
          applyUrl: 'https://education.tbank.ru/start/frontend/',
          publishedAt: '2026-11-20T00:00:00.000Z',
          isActive: true,
        })
      ).toBe(true);

      expect(
        isVacancyActive({
          title: 'Стажёр Backend-разработчик (Python)',
          company: 'Яндекс',
          applyUrl: 'https://yandex.ru/yaintern/backend/',
          publishedAt: '2026-11-20T00:00:00.000Z',
          isActive: true,
        })
      ).toBe(true);

      expect(
        isVacancyActive({
          title: 'Стажёр Frontend-разработчик (Авито Старт)',
          company: 'Avito Tech',
          applyUrl: 'https://start.avito.ru/tech',
          publishedAt: '2026-11-20T00:00:00.000Z',
          isActive: true,
        })
      ).toBe(true);
    });

    it('rejects vacancies explicitly marked inactive, closed or archived', () => {
      expect(isVacancyActive({ title: 'Frontend intern', isActive: false })).toBe(false);
      expect(isVacancyActive({ title: 'Frontend intern', is_active: false })).toBe(false);
      expect(isVacancyActive({ title: 'Frontend intern', status: 'closed' })).toBe(false);
      expect(isVacancyActive({ title: 'Frontend intern', status: 'archived' })).toBe(false);
      expect(isVacancyActive({ title: 'Frontend intern', status: 'expired' })).toBe(false);
    });

    it('rejects expired vacancies by expiresAt date', () => {
      expect(
        isVacancyActive({
          title: 'Python Intern',
          expiresAt: '2020-01-01T00:00:00.000Z',
        })
      ).toBe(false);
    });

    it('rejects stale senior or archived Avito links (20803, 20812, 20816)', () => {
      expect(
        isVacancyActive({
          title: 'Стажёр Frontend',
          company: 'Авито',
          applyUrl: 'https://career.avito.com/vacancies/razrabotka/20803/',
        })
      ).toBe(false);

      expect(
        isVacancyActive({
          title: 'Стажёр Аналитик',
          company: 'Авито',
          applyUrl: 'https://career.avito.com/vacancies/analitika-dannykh/20816/',
        })
      ).toBe(false);
    });

    it('rejects inactive Directum frontend positions where target page has no internships', () => {
      expect(
        isVacancyActive({
          title: 'Стажёр Web-разработчик (TypeScript / React)',
          company: 'Directum',
          applyUrl: 'https://career.directum.ru/',
          isActive: false,
        })
      ).toBe(false);

      expect(
        isVacancyActive({
          title: 'Стажёр Web-разработчик (TypeScript / React)',
          company: 'Directum',
          applyUrl: 'https://career.directum.ru/vacancy/',
        })
      ).toBe(false);
    });

    it('rejects closed and archived HeadHunter positions', () => {
      expect(
        isVacancyActive({
          id: 'hh-3529-139656665',
          company: 'Сбер',
          title: 'Стажер QA',
          applyUrl: 'https://hh.ru/vacancy/139656665',
        })
      ).toBe(false);

      expect(
        isVacancyActive({
          id: 'hh-2180-138386223',
          company: 'Ozon Tech',
          title: 'Стажёр-разработчик Golang',
          applyUrl: 'https://hh.ru/vacancy/138386223',
        })
      ).toBe(false);
    });

    it('rejects closed aggregator postings exceeding 45-day TTL', () => {
      expect(
        isVacancyActive({
          id: 'hh-999-12345678',
          company: 'Some Company',
          title: 'Junior Go Developer',
          applyUrl: 'https://hh.ru/vacancy/12345678',
          publishedAt: '2026-01-01T00:00:00.000Z',
        })
      ).toBe(false);
    });

    it('rejects posts containing archive / closed notification phrases', () => {
      expect(
        isVacancyActive({
          title: 'Стажёр Frontend (набор закрыт)',
          description: 'Прием заявок окончен',
        })
      ).toBe(false);

      expect(
        isVacancyActive({
          title: 'Стажёр QA',
          description: 'Вакансия перенесена в архив',
        })
      ).toBe(false);
    });
  });
});
