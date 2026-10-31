import { describe, it, expect } from 'vitest';
import {
  formatSalary,
  isStrictVacancyPost,
  resolveApplyUrl,
  detectVacancyTrack,
} from '../lib/vacancyUrl';
import { SEED_INTERNSHIPS } from '../data/internships';

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
      expect(resolveApplyUrl('https://fintech.tbank.ru/start/?direction=sre', 'Т-Банк', undefined, 'devops'))
        .not.toContain('?direction=');
      expect(resolveApplyUrl('https://kontur.ru/career/vacancies?search=react', 'Контур', undefined, 'frontend'))
        .not.toContain('?search=');
    });

    it('resolves relative job board and Avito vacancy URLs properly without triple slashes', () => {
      expect(resolveApplyUrl('/vacancy/138722040?query=sber', 'Сбер', undefined, 'backend'))
        .toBe('https://hh.ru/vacancy/138722040');
      expect(resolveApplyUrl('/vacancies/1000168452', 'Яндекс', undefined, 'backend'))
        .toBe('https://career.habr.com/vacancies/1000168452');
      expect(resolveApplyUrl('/vacancies/razrabotka/20805/', 'Авито', undefined, 'mobile'))
        .toBe('https://career.avito.com/vacancies/razrabotka/20805/');
    });

    it('resolves generic homepages to directional direct portals', () => {
      const avitoDirect = resolveApplyUrl('https://career.avito.com/', 'Авито', undefined, 'mobile');
      expect(avitoDirect).toBe('https://career.avito.com/vacancies/razrabotka/20805/');

      const avitoDevops = resolveApplyUrl('https://career.avito.com', 'Авито', undefined, 'devops');
      expect(avitoDevops).toBe('https://career.avito.com/vacancies/razrabotka/20803/');

      const avitoSearch = resolveApplyUrl('https://career.avito.com/vacancies/?search=стажер', 'Авито', undefined, 'frontend');
      expect(avitoSearch).toBe('https://career.avito.com/vacancies/razrabotka/20808/');

      const tbankDirect = resolveApplyUrl('https://tbank.ru', 'Т-Банк', undefined, 'frontend');
      expect(tbankDirect).toBe('https://fintech.tbank.ru/start/frontend/');

      const konturDirect = resolveApplyUrl('https://kontur.ru', 'Контур', undefined, 'frontend');
      expect(konturDirect).toBe('https://kontur.ru/career/vacancies/intern-frontend');

      const sberDirect = resolveApplyUrl('https://sbergraduate.ru', 'Сбер', undefined, 'data_science');
      expect(sberDirect).toBe('https://sbergraduate.ru/sberseasons-moscow/ml/');

      const directumDirect = resolveApplyUrl('https://career.directum.ru', 'Directum', undefined, 'frontend');
      expect(directumDirect).toBe('https://career.directum.ru/vacancy/web-developer');

      const directumLead = resolveApplyUrl('https://career.directum.ru/lead_product_ownerRX', 'Directum', undefined, 'backend');
      expect(directumLead).toBe('https://career.directum.ru/vacancy/backend-csharp');
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
});
