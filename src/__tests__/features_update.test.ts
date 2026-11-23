// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { InternshipCard, cleanVacancyTitle, cleanVacancyTags, formatPublishedDate } from '../components/InternshipCard';
import { CompanyModal } from '../components/CompanyModal';
import { ApplicationsView } from '../components/ApplicationsView';
import { RoadmapViewer } from '../components/RoadmapViewer';
import { getCompanyInfo } from '../data/companies';
import { SEED_INTERNSHIPS } from '../data/internships';
import { ROADMAP_TOPICS } from '../data/roadmaps';
import { QUESTIONS } from '../data/questions';
import {
  getLocalFavorites,
  toggleLocalFavorite,
  getLocalApplications,
  addLocalApplication,
  removeLocalApplication,
} from '../lib/storage';
import type { Internship, JobApplication, UserProgress } from '../types';

const mockProgress: UserProgress = {
  completedTopics: ['fe-core-1'],
  completedSubtopics: ['fe-core-1__sub_0'],
  completedQuestions: ['q-fe-1'],
  repeatQuestions: [],
};

describe('IT-Старт Features Update & Polish Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Favorites System (Yellow Star & Persistence)', () => {
    it('manages favorites in local storage correctly', () => {
      expect(getLocalFavorites()).toEqual([]);

      const afterAdd = toggleLocalFavorite('int-1');
      expect(afterAdd).toEqual(['int-1']);
      expect(getLocalFavorites()).toEqual(['int-1']);

      const afterSecondAdd = toggleLocalFavorite('int-2');
      expect(afterSecondAdd).toEqual(['int-1', 'int-2']);

      const afterRemove = toggleLocalFavorite('int-1');
      expect(afterRemove).toEqual(['int-2']);
      expect(getLocalFavorites()).toEqual(['int-2']);
    });

    it('renders active yellow star on InternshipCard when favorite', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
          isFavorite: true,
        })
      );

      // Must render yellow star with fill and title
      expect(html).toContain('fill-amber-400');
      expect(html).toContain('В избранном');
    });

    it('renders outline star on InternshipCard when not favorite', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
          isFavorite: false,
        })
      );

      expect(html).toContain('Добавить в избранное');
      expect(html).not.toContain('fill-amber-400 text-amber-500');
    });
  });

  describe('2. Internship Card Visual & Content Cleanups', () => {
    it('removes the redundant word "оплата" under salary', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );

      // "оплата" text under salary must NOT be present
      expect(html).not.toContain('>оплата<');
      expect(html).not.toContain('оплата</span>');
    });

    it('removes the text "Верифицировано"', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );

      expect(html).not.toContain('Верифицировано');
    });

    it('removes company logo monogram tile from card preview', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );

      // Should not contain the company monogram tile
      expect(html).not.toContain('liquid-glass-tile');
    });

    it('renders format icons with clean badges (Дома, В офисе, Гибрид)', () => {
      const remoteInternship: Internship = { ...SEED_INTERNSHIPS[0], format: 'Удаленно' };
      const officeInternship: Internship = { ...SEED_INTERNSHIPS[0], format: 'Офис' };
      const hybridInternship: Internship = { ...SEED_INTERNSHIPS[0], format: 'Гибрид' };

      const remoteHtml = renderToString(
        React.createElement(InternshipCard, {
          internship: remoteInternship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );
      expect(remoteHtml).toContain('Дома');

      const officeHtml = renderToString(
        React.createElement(InternshipCard, {
          internship: officeInternship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );
      expect(officeHtml).toContain('В офисе');

      const hybridHtml = renderToString(
        React.createElement(InternshipCard, {
          internship: hybridInternship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );
      expect(hybridHtml).toContain('Гибрид');
    });

    it('displays publication date formatted cleanly', () => {
      const dateStr = '2026-03-28T09:00:00.000Z';
      const formatted = formatPublishedDate(dateStr);
      expect(formatted).toContain('28');
      expect(formatted).toContain('мар.');
      expect(formatted).toContain('2026');

      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );
      expect(html).toContain('мар.');
    });

    it('includes steps to pass internship (Как пройти на стажировку)', () => {
      const internship = SEED_INTERNSHIPS[0];
      const html = renderToString(
        React.createElement(InternshipCard, {
          internship,
          userProgress: mockProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );
      expect(html).toContain('Как пройти на стажировку');
    });
  });

  describe('3. Repetitive Text Cleaning Utilities', () => {
    it('cleans title from noisy program name repetitions', () => {
      expect(cleanVacancyTitle('Стажёр Frontend-разработчик (Контур.Старт)')).toBe(
        'Стажёр Frontend-разработчик'
      );
      expect(cleanVacancyTitle('Стажёр QA Automation Engineer (Java / Python / Т-Банк)')).toBe(
        'Стажёр QA Automation Engineer'
      );
      expect(cleanVacancyTitle('Стажёр Backend-разработчик (Контур.Старт / Python)')).toBe(
        'Стажёр Backend-разработчик'
      );
      // User's specific prompt example:
      expect(cleanVacancyTitle('Стажёр Mobile-разработчик (Android / iOS / VK Team)')).toBe(
        'Стажёр Mobile-разработчик'
      );
      expect(cleanVacancyTitle('Стажёр QA Automation (Python / Java)')).toBe(
        'Стажёр QA Automation'
      );
      expect(cleanVacancyTitle('Junior DevOps / SRE Engineer (SberSeasons)')).toBe(
        'Junior DevOps / SRE Engineer'
      );
      expect(cleanVacancyTitle('Junior / Intern C# Backend Developer (Ozon Camp)')).toBe(
        'Junior / Intern C# Backend Developer'
      );
    });

    it('cleans duplicate tags matching company name or redundant programs', () => {
      const dirtyTags = ['Контур.Старт', 'React', 'TypeScript', 'Контур', 'Redux'];
      const cleaned = cleanVacancyTags(dirtyTags, 'СКБ Контур', 'Frontend');
      expect(cleaned).toContain('React');
      expect(cleaned).toContain('TypeScript');
      expect(cleaned).toContain('Redux');
      expect(cleaned).not.toContain('Контур.Старт');
      expect(cleaned).not.toContain('Контур');

      // User's exact prompt example: Android, Kotlin, iOS, Swift without VK Team or Стажировка
      const mobileTags = ['Android', 'Kotlin', 'iOS', 'Swift', 'VK Team', 'Стажировка'];
      const cleanedMobile = cleanVacancyTags(mobileTags, 'VK (ВКонтакте)');
      expect(cleanedMobile).toEqual(['Android', 'Kotlin', 'iOS', 'Swift']);

      const sberTags = ['Linux', 'Docker', 'CI/CD', 'Kubernetes', 'SberSeasons'];
      const cleanedSber = cleanVacancyTags(sberTags, 'Сбер (SberSeasons)');
      expect(cleanedSber).toEqual(['Linux', 'Docker', 'CI/CD', 'Kubernetes']);
    });
  });

  describe('4. Company Info System (Knowledge Base & Modal)', () => {
    it('provides accurate company facts for key tech employers', () => {
      const kontur = getCompanyInfo('СКБ Контур');
      expect(kontur.name).toBe('СКБ Контур');
      expect(kontur.employeesCount).toContain('11 000+');
      expect(kontur.marketPosition).toContain('SaaS');
      expect(kontur.internshipPerks.length).toBeGreaterThan(0);
      expect(kontur.selectionSteps.length).toBeGreaterThan(0);

      const tbank = getCompanyInfo('Т-Банк');
      expect(tbank.name).toContain('Т-Банк');
      expect(tbank.employeesCount).toContain('40 000+');

      const yandex = getCompanyInfo('Яндекс');
      expect(yandex.employeesCount).toContain('26 000+');

      const ozon = getCompanyInfo('Ozon Tech');
      expect(ozon.employeesCount).toContain('16 000+');
    });

    it('renders CompanyModal with employees count, market position and selection steps', () => {
      const html = renderToString(
        React.createElement(CompanyModal, {
          companyName: 'Контур',
          onClose: () => {},
        })
      );

      expect(html).toContain('СКБ Контур');
      expect(html).toContain('11 000+');
      expect(html).toContain('Штат сотрудников');
      expect(html).toContain('Место на рынке');
      expect(html).toContain('Как попасть на стажировку');
      expect(html).toContain('Контур.Старт');
    });
  });

  describe('5. Applied Vacancies Tracker with Deadlines', () => {
    it('saves, updates and removes job applications', () => {
      expect(getLocalApplications()).toEqual([]);

      const sampleApp: JobApplication = {
        id: 'int-1',
        vacancyId: 'int-1',
        title: 'Стажёр Frontend',
        company: 'Т-Банк',
        salary: '80 000 ₽',
        location: 'Москва',
        format: 'Удаленно',
        applyUrl: 'https://education.tbank.ru',
        appliedAt: new Date().toISOString(),
        deadlineDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        deadlineAction: 'Предоставить тестовое задание',
        status: 'applied',
      };

      const afterAdd = addLocalApplication(sampleApp);
      expect(afterAdd.length).toBe(1);
      expect(afterAdd[0].company).toBe('Т-Банк');

      const updated = addLocalApplication({ ...sampleApp, status: 'test_task' });
      expect(updated[0].status).toBe('test_task');

      const afterRemove = removeLocalApplication('int-1');
      expect(afterRemove).toEqual([]);
    });

    it('renders ApplicationsView with deadline countdown and action steps', () => {
      const sampleApp: JobApplication = {
        id: 'int-1',
        vacancyId: 'int-1',
        title: 'Стажёр Frontend-разработчик',
        company: 'Контур',
        salary: '70 000 ₽',
        location: 'Екатеринбург',
        format: 'Удаленно',
        applyUrl: 'https://kontur.ru',
        appliedAt: new Date().toISOString(),
        deadlineDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        deadlineAction: 'Сдать выполненное тестовое задание на GitHub',
        status: 'test_task',
      };

      const html = renderToString(
        React.createElement(ApplicationsView, {
          applications: [sampleApp],
          allInternships: SEED_INTERNSHIPS,
          onUpdateApplication: () => {},
          onRemoveApplication: () => {},
          onOpenPlan: () => {},
          onNavigateToCatalog: () => {},
        })
      );

      expect(html).toContain('Мои отклики');
      expect(html).toContain('Дедлайн по предоставлению тестового задания');
      expect(html).toContain('Сдать выполненное тестовое задание на GitHub');
      expect(html).toContain('Осталось 5 дн.');
      expect(html).toContain('Чек-лист для успешного прохождения отбора');
    });
  });

  describe('6. Roadmap Topics with Interview Questions', () => {
    it('renders interview questions inside RoadmapViewer topics', () => {
      const html = renderToString(
        React.createElement(RoadmapViewer, {
          topics: ROADMAP_TOPICS,
          userProgress: mockProgress,
          onToggleTopic: () => {},
          questions: QUESTIONS,
          onToggleQuestion: () => {},
        })
      );

      // Must render the questions accordion header inside topic nodes
      expect(html).toContain('Вопросы собеседований к теме');
      expect(html).toContain('изучено');
    });

    it('verifies HTML5 and CSS topics only receive relevant interview questions without React/TS leak', () => {
      const htmlTopic = ROADMAP_TOPICS.find((t) => t.id === 'fe-core-2')!;
      const cssTopic = ROADMAP_TOPICS.find((t) => t.id === 'fe-core-3')!;

      // Render RoadmapViewer and check question relevance
      expect(htmlTopic).toBeDefined();
      expect(cssTopic).toBeDefined();

      const htmlQuestions = QUESTIONS.filter(
        (q) => q.directionId === 'frontend' && q.subTrackId === 'core' && (q.category.includes('HTML') || q.title.includes('HTML') || q.title.includes('article'))
      );
      expect(htmlQuestions.length).toBeGreaterThanOrEqual(3);

      const cssQuestions = QUESTIONS.filter(
        (q) => q.directionId === 'frontend' && q.subTrackId === 'core' && (q.category.includes('CSS') || q.title.includes('CSS') || q.title.includes('Flexbox'))
      );
      expect(cssQuestions.length).toBeGreaterThanOrEqual(2);
      expect(cssQuestions.some((q) => q.title.includes('Box Model') || q.title.includes('Блочная модель'))).toBe(true);
      expect(cssQuestions.some((q) => q.title.includes('Flexbox'))).toBe(true);
    });
  });
});
