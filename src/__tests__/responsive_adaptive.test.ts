// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ROADMAP_TOPICS } from '../data/roadmaps';
import { QUESTIONS } from '../data/questions';
import { SEED_INTERNSHIPS } from '../data/internships';
import type { UserProgress } from '../types';

const mockUserProgress: UserProgress = {
  completedTopics: [],
  completedSubtopics: [],
  completedQuestions: [],
  repeatQuestions: [],
};

describe('16. Comprehensive Responsive & Adaptive Layout Suite', () => {
  describe('Navbar Responsive Adaptation (320px to 1920px & Mini Apps)', () => {
    it('renders with min-w-0 on tab container to prevent flexbox overflow on 320px', async () => {
      const { Navbar } = await import('../components/Navbar');
      const html = renderToString(
        React.createElement(Navbar, {
          activeTab: 'internships',
          setActiveTab: () => {},
          telegramUser: null,
          vkUser: null,
          isVk: false,
          onOpenSubscribeModal: () => {},
        })
      );

      // Flex child min-w-0 ensures container shrinks properly on narrow screens
      expect(html).toContain('min-w-0');
      // Tab buttons have adaptive mobile-to-desktop padding
      expect(html).toContain('px-2 sm:px-4');
      expect(html).toContain('py-1.5 sm:py-2');
    });

    it('incorporates VK safe area inset right to avoid overlapping VK client top-right menu', async () => {
      const { Navbar } = await import('../components/Navbar');
      const html = renderToString(
        React.createElement(Navbar, {
          activeTab: 'internships',
          setActiveTab: () => {},
          telegramUser: null,
          vkUser: { id: 12345, first_name: 'Анна' },
          isVk: true,
          onOpenSubscribeModal: () => {},
        })
      );

      // Must account for VK Mini App system header menu on the right
      expect(html).toContain('var(--vk-safe-area-right');
      expect(html).toContain('pr-[max(84px,var(--vk-safe-area-right,0px))]');
    });

    it('renders compact user profile capsule with truncation on narrow screens', async () => {
      const { Navbar } = await import('../components/Navbar');
      const html = renderToString(
        React.createElement(Navbar, {
          activeTab: 'internships',
          setActiveTab: () => {},
          telegramUser: { id: 112233, first_name: 'Константинопольский', username: 'konstantin' },
          vkUser: null,
          isVk: false,
          onOpenSubscribeModal: () => {},
        })
      );

      expect(html).toContain('truncate');
      expect(html).toContain('max-w-[100px]');
      expect(html).toContain('Константинопольский');
    });
  });

  describe('InternshipCard Responsive Layout', () => {
    it('uses compact p-4 on mobile and p-6 on desktop with flex-1 min-w-0 in header', async () => {
      const { InternshipCard } = await import('../components/InternshipCard');
      const sampleInternship = SEED_INTERNSHIPS[0];

      const html = renderToString(
        React.createElement(InternshipCard, {
          internship: sampleInternship,
          userProgress: mockUserProgress,
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          onOpenPlan: () => {},
        })
      );

      // p-4 mobile padding gives +8px usable width on 320px
      expect(html).toContain('p-4 sm:p-6');
      // Company & title flex container must have min-w-0 to avoid pushing salary badge out
      expect(html).toContain('min-w-0 flex-1');
      // Channel link has min-w-0 and truncate
      expect(html).toContain('min-w-0');
      expect(html).toContain('truncate');
    });
  });

  describe('InternshipModal Responsive Adaptation', () => {
    it('renders full-width stacked buttons on mobile and inline on desktop with responsive text', async () => {
      const { InternshipModal } = await import('../components/InternshipModal');
      const sampleInternship = SEED_INTERNSHIPS[0];

      const html = renderToString(
        React.createElement(InternshipModal, {
          internship: sampleInternship,
          onClose: () => {},
          roadmapTopics: ROADMAP_TOPICS,
          questions: QUESTIONS,
          userProgress: mockUserProgress,
          onToggleTopic: () => {},
          onToggleQuestion: () => {},
        })
      );

      // Modal container responsive constraints
      expect(html).toContain('max-h-[92vh] sm:max-h-[90vh]');
      // Footer buttons wrap and expand on mobile
      expect(html).toContain('w-full sm:w-auto');
      // Safe area padding for notches and native app bars (VK & TG Mini Apps)
      expect(html).toContain('var(--vk-safe-area-top');
      expect(html).toContain('var(--vk-safe-area-bottom');
      // Responsive button text: compact on mobile, detailed on desktop
      expect(html).toContain('sm:hidden truncate');
      expect(html).toContain('hidden sm:inline');
      expect(html).toContain('Откликнуться на');
      expect(html).toContain('Подать заявку на сайте');
      expect(html).toContain(sampleInternship.company);
    });
  });

  describe('SubscribeModal Responsive Stability', () => {
    it('preserves geometry stability while enabling flex-wrap on notification switches for 320px', async () => {
      const { SubscribeModal } = await import('../components/SubscribeModal');
      const html = renderToString(
        React.createElement(SubscribeModal, {
          isOpen: true,
          onClose: () => {},
          telegramUser: null,
          vkUser: { id: 12345, first_name: 'Иван' },
          isVk: true,
          currentSubscription: null,
          onSubscriptionSaved: () => {},
        })
      );

      // Preserves required geometry tokens from Section 15
      expect(html).toContain('min-h-[580px]');
      expect(html).toContain('flex flex-col');
      expect(html).toContain('min(620px, 90vh)');
      // Platform toggle row has flex-wrap to avoid 320px overflow
      expect(html).toContain('px-1 flex-wrap');
      // Safe area padding for notches and native app bars (VK & TG Mini Apps)
      expect(html).toContain('var(--vk-safe-area-top');
      expect(html).toContain('var(--vk-safe-area-bottom');
    });
  });

  describe('RoadmapViewer Responsive Layout', () => {
    it('adapts progress bar and topic headers across 320px to 1024px', async () => {
      const { RoadmapViewer } = await import('../components/RoadmapViewer');
      const html = renderToString(
        React.createElement(RoadmapViewer, {
          topics: ROADMAP_TOPICS,
          userProgress: mockUserProgress,
          onToggleTopic: () => {},
        })
      );

      // Adaptive progress container: full-width on mobile, auto on tablet/desktop
      expect(html).toContain('w-full md:w-auto sm:min-w-[220px]');
      // Responsive topic card padding
      expect(html).toContain('p-4 sm:p-6');
      // Subtitle explanation text gracefully hidden on mobile
      expect(html).toContain('hidden sm:inline');
    });
  });

  describe('QuestionsViewer Responsive Segmented Controls', () => {
    it('renders mode switchers with horizontal scroll resilience on mobile', async () => {
      const { QuestionsViewer } = await import('../components/QuestionsViewer');
      const html = renderToString(
        React.createElement(QuestionsViewer, {
          questions: QUESTIONS,
          userProgress: mockUserProgress,
          onToggleQuestion: () => {},
          onMarkRepeat: () => {},
          onMarkLearned: () => {},
        })
      );

      // Mode pill switcher handles narrow 320px screens cleanly
      expect(html).toContain('max-w-full overflow-x-auto no-scrollbar shrink-0');
      expect(html).toContain('px-2.5 sm:px-3.5');
    });
  });

  describe('TelegramParserTab Responsive Layout', () => {
    it('renders channel filters with touch scroll and adaptive publish button', async () => {
      const { TelegramParserTab } = await import('../components/TelegramParserTab');
      const html = renderToString(
        React.createElement(TelegramParserTab, {
          telegramUser: null,
          currentSubscription: null,
          onSubscriptionSaved: () => {},
          onInternshipAdded: () => {},
        })
      );

      // Filters container
      expect(html).toContain('max-w-full w-full sm:w-fit touch-pan-x overscroll-x-contain');
      // Adaptive publish button labels
      expect(html).toContain('sm:hidden');
      expect(html).toContain('hidden sm:inline');
    });
  });

  describe('FlashcardsTrainer Responsive Adaptation (320px - 1920px)', () => {
    it('renders with flex-wrap controls, compact padding, and adaptive rating labels for narrow screens', async () => {
      const { FlashcardsTrainer } = await import('../components/FlashcardsTrainer');
      const html = renderToString(
        React.createElement(FlashcardsTrainer, {
          questions: QUESTIONS,
          userProgress: mockUserProgress,
          onMarkLearned: () => {},
          onMarkRepeat: () => {},
        })
      );

      // Top control bar has flex-wrap and min-w-0 to prevent button push-out on 320px
      expect(html).toContain('flex items-center justify-between text-xs px-1 text-neutral-600 gap-2 flex-wrap');
      expect(html).toContain('flex items-center gap-2 flex-wrap min-w-0');
      // Compact p-4 on mobile gives usable width
      expect(html).toContain('p-4 sm:p-8');
      // Break-words for long question titles
      expect(html).toContain('break-words');
      // Adaptive action buttons with compact text on ultra-narrow viewports
      expect(html).toContain('min-[380px]:inline');
      expect(html).toContain('min-[380px]:hidden');
      expect(html).toContain('Знаю отлично');
      expect(html).toContain('Знаю');
    });
  });

  describe('SelfCheckTrainer Responsive Adaptation (320px - 1920px)', () => {
    it('adapts header, card padding, and action buttons for 320px screens', async () => {
      const { SelfCheckTrainer } = await import('../components/SelfCheckTrainer');
      const html = renderToString(
        React.createElement(SelfCheckTrainer, {
          questions: QUESTIONS,
          userProgress: mockUserProgress,
          onMarkLearned: () => {},
          onMarkRepeat: () => {},
        })
      );

      // Header navigation bar has flex-wrap
      expect(html).toContain('p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors liquid-glass flex-wrap');
      // Adaptive card padding p-4 sm:p-7
      expect(html).toContain('p-4 sm:p-7');
      // Break-words on title and text
      expect(html).toContain('break-words');
      // Full-width submit button on mobile
      expect(html).toContain('w-full sm:w-auto ml-auto');
      expect(html).toContain('Проверить ответ');
    });
  });

  describe('App Viewport Adaptation & Touch Smoothness', () => {
    it('ensures search container has min-w-0, carousels have mobile touch scrolling, and ambient watermark is resilient', async () => {
      const { App } = await import('../App');
      const html = renderToString(React.createElement(App));

      // Search container min-w-0
      expect(html).toContain('min-w-0');
      // Touch pan x and overscroll contain for smooth swipe gestures on mobile
      expect(html).toContain('touch-pan-x');
      expect(html).toContain('overscroll-x-contain');
      // Footer links centered on mobile
      expect(html).toContain('justify-center md:justify-end');
      // Footer accounts for safe area bottom inset
      expect(html).toContain('safe-area-inset-bottom');
      // Ambient watermark avoids non-standard Tailwind breakpoint and preserves non-breaking hyphen
      expect(html).not.toContain('xs:text-5xl');
      expect(html).toMatch(/IT[\u2011-]СТАРТ/);
    });

    it('renders Mini App profile capsule with rounded-2xl to rounded-full responsive geometry and compact labels', async () => {
      (window as any).Telegram = {
        WebApp: {
          ready: () => {},
          expand: () => {},
          initDataUnsafe: {
            user: {
              id: 998877,
              first_name: 'Алексей',
              username: 'alex_dev',
            },
          },
        },
      };

      const { App } = await import('../App');
      const html = renderToString(React.createElement(App));

      // Profile capsule adapts from rounded-2xl on mobile to rounded-full on desktop
      expect(html).toContain('rounded-2xl sm:rounded-full');
      // Adaptive compact push button labels
      expect(html).toContain('Пуши TG');
      expect(html).toContain('Уведомления TG');

      delete (window as any).Telegram;
    });
  });
});
