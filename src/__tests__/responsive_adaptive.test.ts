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

  describe('App Viewport Adaptation & Touch Smoothness', () => {
    it('ensures search container has min-w-0 and carousels have mobile touch scrolling classes', async () => {
      const { App } = await import('../App');
      const html = renderToString(React.createElement(App));

      // Search container min-w-0
      expect(html).toContain('min-w-0');
      // Touch pan x and overscroll contain for smooth swipe gestures on mobile
      expect(html).toContain('touch-pan-x');
      expect(html).toContain('overscroll-x-contain');
      // Footer links centered on mobile
      expect(html).toContain('justify-center md:justify-end');
    });
  });
});
