// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TELEGRAM_BOT_USERNAME,
  GITHUB_PAGES_URL,
  TELEGRAM_BOT_URL,
} from '../lib/supabase';
import { DIRECTIONS } from '../data/directions';
import { ROADMAP_TOPICS } from '../data/roadmaps';
import { SEED_INTERNSHIPS } from '../data/internships';
import { QUESTIONS } from '../data/questions';
import { TEAM_MEMBERS } from '../data/team';
import { getLocalProgress, saveLocalProgress } from '../lib/storage';

describe('1. Configuration & Embedded Constants', () => {
  it('has exact Supabase URL matching requirements', () => {
    expect(SUPABASE_URL).toBe('https://pmgsymacvhzsixbpndsn.supabase.co');
  });

  it('has valid Supabase Anon JWT key', () => {
    expect(SUPABASE_ANON_KEY).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('has correct Telegram Bot username and URL', () => {
    expect(TELEGRAM_BOT_USERNAME).toBe('IT_start_izh_bot');
    expect(TELEGRAM_BOT_URL).toBe('https://t.me/IT_start_izh_bot');
  });

  it('has correct GitHub Pages and Telegram Mini App URL', () => {
    expect(GITHUB_PAGES_URL).toBe('https://oioiqp.github.io/it-start/');
  });
});

describe('2. Directions & Sub-Tracks Knowledge Base', () => {
  it('contains exactly 6 main directions', () => {
    expect(DIRECTIONS).toHaveLength(6);
    const ids = DIRECTIONS.map((d) => d.id);
    expect(ids).toEqual(['frontend', 'backend', 'mobile', 'data_science', 'qa', 'devops']);
  });

  it('each direction has Core metadata and Sub-tracks', () => {
    DIRECTIONS.forEach((dir) => {
      expect(dir.title).toBeTruthy();
      expect(dir.coreTitle).toBeTruthy();
      expect(dir.coreDesc).toBeTruthy();
      expect(dir.subTracks.length).toBeGreaterThan(0);
      dir.subTracks.forEach((st) => {
        expect(st.id).toBeTruthy();
        expect(st.name).toBeTruthy();
        expect(st.shortDesc).toBeTruthy();
      });
    });
  });

  it('covers all specified subtracks (React, Angular, Vue, Python, Go, Java, Node, Android, iOS, Flutter, ML, Analytics, QA, DevOps)', () => {
    const allSubTrackIds = DIRECTIONS.flatMap((d) => d.subTracks.map((s) => s.id));
    expect(allSubTrackIds).toContain('react');
    expect(allSubTrackIds).toContain('angular');
    expect(allSubTrackIds).toContain('vue');
    expect(allSubTrackIds).toContain('python');
    expect(allSubTrackIds).toContain('golang');
    expect(allSubTrackIds).toContain('java');
    expect(allSubTrackIds).toContain('nodejs');
    expect(allSubTrackIds).toContain('android');
    expect(allSubTrackIds).toContain('ios');
    expect(allSubTrackIds).toContain('flutter');
    expect(allSubTrackIds).toContain('ml');
    expect(allSubTrackIds).toContain('analytics');
    expect(allSubTrackIds).toContain('manual_qa');
    expect(allSubTrackIds).toContain('auto_qa');
    expect(allSubTrackIds).toContain('cicd_docker');
    expect(allSubTrackIds).toContain('k8s_iac');
  });
});

describe('3. Roadmaps Structure & Content', () => {
  it('contains roadmaps for all 6 directions with core and subtrack categories', () => {
    const dirIds = new Set(ROADMAP_TOPICS.map((t) => t.directionId));
    expect(dirIds.size).toBe(6);

    const coreTopics = ROADMAP_TOPICS.filter((t) => t.category === 'core');
    expect(coreTopics.length).toBeGreaterThanOrEqual(10);

    ROADMAP_TOPICS.forEach((t) => {
      expect(t.title).toBeTruthy();
      expect(t.subtopics.length).toBeGreaterThan(0);
      expect(t.interviewTip).toBeTruthy();
      expect(t.externalDocUrl).toBeTruthy();
    });
  });
});

describe('4. Internships Aggregator Feed', () => {
  it('has at least 16 prefilled internships (requirement: 16+)', () => {
    expect(SEED_INTERNSHIPS.length).toBeGreaterThanOrEqual(16);
  });

  it('all internships have valid companies, formats, and Telegram channel sources', () => {
    const validFormats = ['Удаленно', 'Гибрид', 'Офис'];
    SEED_INTERNSHIPS.forEach((item) => {
      expect(item.title).toBeTruthy();
      expect(item.company).toBeTruthy();
      expect(validFormats).toContain(item.format);
      expect(item.salary).toBeTruthy();
      expect(item.requirements.length).toBeGreaterThan(0);
      expect(item.responsibilities.length).toBeGreaterThan(0);
      expect(item.sourceChannel.startsWith('@')).toBe(true);
      expect(item.tags.length).toBeGreaterThan(0);
    });
  });

  it('includes top Russian IT employers: Т-Банк, Яндекс, Сбер, Ozon, VK, Avito, Контур', () => {
    const companies = SEED_INTERNSHIPS.map((i) => i.company.toLowerCase());
    expect(companies.some((c) => c.includes('т-банк') || c.includes('тинькофф'))).toBe(true);
    expect(companies.some((c) => c.includes('яндекс'))).toBe(true);
    expect(companies.some((c) => c.includes('сбер'))).toBe(true);
    expect(companies.some((c) => c.includes('ozon'))).toBe(true);
    expect(companies.some((c) => c.includes('vk'))).toBe(true);
    expect(companies.some((c) => c.includes('avito') || c.includes('авито'))).toBe(true);
    expect(companies.some((c) => c.includes('контур'))).toBe(true);
  });

  it('correctly maps Supabase columns for seed, add, progress, and subscriptions', async () => {
    const {
      seedInternshipsToSupabase,
      fetchInternshipsFromSupabase,
      addInternshipToSupabase,
      saveUserProgressToSupabase,
      saveSubscriptionToSupabase,
      fetchSubscriptionsFromSupabase,
    } = await import('../lib/supabase');

    // 1. Seed & fetch
    const seeded = await seedInternshipsToSupabase(SEED_INTERNSHIPS);
    expect(seeded).toBe(true);

    const fetched = await fetchInternshipsFromSupabase();
    expect(fetched).not.toBeNull();
    expect(fetched!.length).toBeGreaterThanOrEqual(16);

    const first = fetched![0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.company).toBeTruthy();
    expect(first.directionId).toBeTruthy();
    expect(first.subTrackId).toBeTruthy();
    expect(first.format).toBeTruthy();
    expect(first.location).toBeTruthy();

    // 2. Add custom internship (simulate parser)
    const testNewId = 'test-new-' + Date.now();
    const added = await addInternshipToSupabase({
      id: testNewId,
      title: 'Стажёр AI / ML',
      company: 'Тестовая Компания',
      location: 'Москва',
      format: 'Удаленно',
      salary: 'от 90 000 ₽',
      directionId: 'data_science',
      subTrackId: 'ml',
      tags: ['ML', 'Python'],
      description: 'Тестовое описание вакансии',
      requirements: ['Python'],
      responsibilities: ['Разработка'],
      sourceChannel: '@test_channel',
      sourceType: 'telegram',
      applyUrl: 'https://t.me/test_channel',
      publishedAt: new Date().toISOString(),
    });
    expect(added).toBe(true);

    // 3. User progress sync
    const progressSaved = await saveUserProgressToSupabase('test-user-vitest', {
      completedTopics: ['fe-core-1', 'fe-core-2'],
      completedQuestions: ['q-fe-1'],
      repeatQuestions: [],
    });
    expect(progressSaved).toBe(true);

    // 4. Subscription sync
    const subSaved = await saveSubscriptionToSupabase({
      chat_id: '999888777',
      username: 'test_subscriber',
      first_name: 'Test',
      directions: ['frontend'],
      sub_tracks: ['react'],
      is_active: true,
    });
    expect(subSaved).toBe(true);

    const subs = await fetchSubscriptionsFromSupabase();
    expect(subs.some((s) => String(s.chat_id) === '999888777')).toBe(true);
  }, 20000);
});

describe('5. Questions Database (Trainer)', () => {
  it('has at least 55 detailed questions (requirement: минимум 55 вопросов)', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(55);
  });

  it('every question has complete answer, takeaways, difficulty, and valid structure', () => {
    QUESTIONS.forEach((q) => {
      expect(q.id).toBeTruthy();
      expect(q.title).toBeTruthy();
      expect(q.question).toBeTruthy();
      expect(q.answer).toBeTruthy();
      expect(q.answer.length).toBeGreaterThan(30);
      expect(q.category).toBeTruthy();
      expect(['Junior', 'Junior+', 'Middle']).toContain(q.difficulty);
      expect(q.keyTakeaways.length).toBeGreaterThan(0);
    });
  });

  it('covers all subtracks with specific targeted questions', () => {
    const coveredSubTracks = new Set(QUESTIONS.map((q) => q.subTrackId));
    expect(coveredSubTracks.has('react')).toBe(true);
    expect(coveredSubTracks.has('angular')).toBe(true);
    expect(coveredSubTracks.has('vue')).toBe(true);
    expect(coveredSubTracks.has('python')).toBe(true);
    expect(coveredSubTracks.has('golang')).toBe(true);
    expect(coveredSubTracks.has('java')).toBe(true);
    expect(coveredSubTracks.has('nodejs')).toBe(true);
    expect(coveredSubTracks.has('android')).toBe(true);
    expect(coveredSubTracks.has('ios')).toBe(true);
    expect(coveredSubTracks.has('flutter')).toBe(true);
    expect(coveredSubTracks.has('ml')).toBe(true);
    expect(coveredSubTracks.has('analytics')).toBe(true);
    expect(coveredSubTracks.has('manual_qa')).toBe(true);
    expect(coveredSubTracks.has('auto_qa')).toBe(true);
    expect(coveredSubTracks.has('cicd_docker')).toBe(true);
    expect(coveredSubTracks.has('k8s_iac')).toBe(true);
  });
});

describe('6. Project Team Members Information', () => {
  it('contains all 5 required team members with their roles', () => {
    expect(TEAM_MEMBERS).toHaveLength(5);
    const names = TEAM_MEMBERS.map((m) => m.name);
    expect(names).toContain('Акрамов Артём');
    expect(names).toContain('Латыпов Тимур');
    expect(names).toContain('Федоров Ярослав');
    expect(names).toContain('Шубин Егор');
    expect(names).toContain('Ведерников Максим');

    TEAM_MEMBERS.forEach((m) => {
      expect(m.role).toBeTruthy();
      expect(m.responsibility).toBeTruthy();
      expect(m.techStack.length).toBeGreaterThan(0);
    });
  });
});

describe('7. Local Storage and Progress State Management', () => {
  it('loads default empty progress when nothing is saved', () => {
    const progress = getLocalProgress();
    expect(progress).toHaveProperty('completedTopics');
    expect(progress).toHaveProperty('completedQuestions');
    expect(progress).toHaveProperty('repeatQuestions');
  });

  it('can save and read user progress', () => {
    saveLocalProgress({
      completedTopics: ['fe-core-1'],
      completedQuestions: ['q-fe-1'],
      repeatQuestions: ['q-fe-2'],
    });
    const loaded = getLocalProgress();
    expect(loaded.completedTopics).toContain('fe-core-1');
    expect(loaded.completedQuestions).toContain('q-fe-1');
  });
});

describe('8. Telegram WebApp & Bot Integration Features', () => {
  it('handles bot token saving and loading from localStorage', async () => {
    const { getSavedBotToken, saveBotToken } = await import('../lib/telegram');
    saveBotToken('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    expect(getSavedBotToken()).toBe('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    saveBotToken('');
    expect(getSavedBotToken()).toBe('');
  });

  it('detects Telegram WebApp environment when window.Telegram is present', async () => {
    const { isTelegramWebApp, initTelegramWebApp } = await import('../lib/telegram');
    (window as any).Telegram = {
      WebApp: {
        ready: () => {},
        expand: () => {},
        initData: '',
        initDataUnsafe: {
          user: {
            id: 987654321,
            first_name: 'Тимур',
            username: 'timur_test',
          },
        },
      },
    };

    expect(isTelegramWebApp()).toBe(true);
    const user = initTelegramWebApp();
    expect(user).toBeDefined();
    expect(user?.id).toBe(987654321);
    expect(user?.first_name).toBe('Тимур');

    // Clean up
    delete (window as any).Telegram;
    expect(isTelegramWebApp()).toBe(false);
  });

  it('verifies roadmap coverage for every specialized subtrack', () => {
    const subTrackTopics = ROADMAP_TOPICS.filter((t) => t.category === 'subtrack');
    const coveredSubTracks = new Set(subTrackTopics.map((t) => t.subTrackId));

    const expectedSubTracks = [
      'react', 'angular', 'vue',
      'python', 'golang', 'java', 'nodejs',
      'android', 'ios', 'flutter',
      'ml', 'analytics',
      'manual_qa', 'auto_qa',
      'cicd_docker', 'k8s_iac'
    ];

    expectedSubTracks.forEach((st) => {
      expect(coveredSubTracks.has(st as any)).toBe(true);
    });
  });

  it('calculates internship readiness correctly matching vacancy stack', () => {
    const testInternship = SEED_INTERNSHIPS[0]; // Frontend React
    const relevantTopics = ROADMAP_TOPICS.filter(
      (t) =>
        t.directionId === testInternship.directionId &&
        (t.category === 'core' || t.subTrackId === testInternship.subTrackId)
    );
    const relevantQuestions = QUESTIONS.filter(
      (q) =>
        q.directionId === testInternship.directionId &&
        (q.subTrackId === 'core' || q.subTrackId === testInternship.subTrackId)
    );

    expect(relevantTopics.length).toBeGreaterThan(0);
    expect(relevantQuestions.length).toBeGreaterThan(0);

    const totalItems = relevantTopics.length + relevantQuestions.length;
    // With 0 completed
    const zeroCompleted = 0;
    expect(Math.round((zeroCompleted / totalItems) * 100)).toBe(0);

    // With 1 topic completed
    const completedCount = 1;
    const percent = Math.round((completedCount / totalItems) * 100);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThanOrEqual(100);
  });
});

describe('9. Roadmap Subtopics Granular Progress & Two-Way Sync', () => {
  const feCore1 = ROADMAP_TOPICS.find((t) => t.id === 'fe-core-1')!;

  it('verifies fe-core-1 contains all subtopics requested by user (DNS, TCP 3-way handshake, HTTP/HTTPS, etc.)', () => {
    expect(feCore1).toBeDefined();
    expect(feCore1.subtopics.length).toBeGreaterThanOrEqual(5);
    const subtopicsText = feCore1.subtopics.join(' ');
    expect(subtopicsText).toContain('клиент-сервер');
    expect(subtopicsText).toContain('DNS');
    expect(subtopicsText).toContain('TCP');
    expect(subtopicsText).toContain('HTTP');
  });

  it('correctly calculates subtopic checked status and section progress percent', () => {
    const userProgress = {
      completedTopics: [] as string[],
      completedSubtopics: ['fe-core-1__sub_0', 'fe-core-1__sub_1', 'fe-core-1__sub_2'],
      completedQuestions: [] as string[],
      repeatQuestions: [] as string[],
    };

    const isSubtopicChecked = (topicId: string, subIdx: number) => {
      const subId = `${topicId}__sub_${subIdx}`;
      return Boolean(
        userProgress.completedSubtopics?.includes(subId) ||
        userProgress.completedTopics.includes(topicId)
      );
    };

    expect(isSubtopicChecked('fe-core-1', 0)).toBe(true);
    expect(isSubtopicChecked('fe-core-1', 1)).toBe(true);
    expect(isSubtopicChecked('fe-core-1', 2)).toBe(true);
    expect(isSubtopicChecked('fe-core-1', 3)).toBe(false);

    const checkedCount = feCore1.subtopics.filter((_, idx) => isSubtopicChecked('fe-core-1', idx)).length;
    expect(checkedCount).toBe(3);
    const percent = Math.round((checkedCount / feCore1.subtopics.length) * 100);
    expect(percent).toBe(Math.round((3 / feCore1.subtopics.length) * 100));
  });

  it('simulates two-way sync: marking all subtopics completes the topic (100%)', () => {
    let progress = {
      completedTopics: [] as string[],
      completedSubtopics: [] as string[],
      completedQuestions: [] as string[],
      repeatQuestions: [] as string[],
    };

    const simulateToggleSubtopic = (topicId: string, subIdx: number) => {
      const topic = ROADMAP_TOPICS.find((t) => t.id === topicId)!;
      const total = topic.subtopics.length;
      const allSubIds = topic.subtopics.map((_, i) => `${topicId}__sub_${i}`);
      const targetSubId = `${topicId}__sub_${subIdx}`;

      const set = new Set(progress.completedSubtopics);
      if (progress.completedTopics.includes(topicId)) {
        allSubIds.forEach((sid) => set.add(sid));
      }

      if (set.has(targetSubId)) {
        set.delete(targetSubId);
      } else {
        set.add(targetSubId);
      }

      const nextSubtopics = Array.from(set);
      const doneCount = allSubIds.filter((sid) => set.has(sid)).length;
      const isAllDone = total > 0 && doneCount === total;

      let nextTopics = [...progress.completedTopics];
      if (isAllDone && !nextTopics.includes(topicId)) {
        nextTopics.push(topicId);
      } else if (!isAllDone && nextTopics.includes(topicId)) {
        nextTopics = nextTopics.filter((id) => id !== topicId);
      }

      progress = { ...progress, completedTopics: nextTopics, completedSubtopics: nextSubtopics };
    };

    // Toggle all subtopics of fe-core-1
    feCore1.subtopics.forEach((_, idx) => simulateToggleSubtopic('fe-core-1', idx));
    expect(progress.completedTopics).toContain('fe-core-1');
    expect(progress.completedSubtopics.length).toBe(feCore1.subtopics.length);

    // Uncheck one subtopic
    simulateToggleSubtopic('fe-core-1', 0);
    expect(progress.completedTopics).not.toContain('fe-core-1');
    expect(progress.completedSubtopics.length).toBe(feCore1.subtopics.length - 1);
  });

  it('simulates marking topic completed automatically marks all its subtopics', () => {
    let progress = {
      completedTopics: [] as string[],
      completedSubtopics: [] as string[],
      completedQuestions: [] as string[],
      repeatQuestions: [] as string[],
    };

    const simulateToggleTopic = (topicId: string) => {
      const isCompleted = progress.completedTopics.includes(topicId);
      const topic = ROADMAP_TOPICS.find((t) => t.id === topicId)!;
      const allSubIds = topic.subtopics.map((_, i) => `${topicId}__sub_${i}`);
      const set = new Set(progress.completedSubtopics);

      if (!isCompleted) {
        allSubIds.forEach((sid) => set.add(sid));
        progress = {
          ...progress,
          completedTopics: [...progress.completedTopics, topicId],
          completedSubtopics: Array.from(set),
        };
      } else {
        allSubIds.forEach((sid) => set.delete(sid));
        progress = {
          ...progress,
          completedTopics: progress.completedTopics.filter((id) => id !== topicId),
          completedSubtopics: Array.from(set),
        };
      }
    };

    simulateToggleTopic('fe-core-1');
    expect(progress.completedTopics).toContain('fe-core-1');
    expect(progress.completedSubtopics.length).toBe(feCore1.subtopics.length);

    simulateToggleTopic('fe-core-1');
    expect(progress.completedTopics).not.toContain('fe-core-1');
    expect(progress.completedSubtopics.length).toBe(0);
  });
});

describe('10. Interactive Self-Check Questions Trainer', () => {
  it('contains Event Loop question with exact order code snippet', () => {
    const eventLoopQ = QUESTIONS.find((q) => q.id === 'q-fe-1');
    expect(eventLoopQ).toBeDefined();
    expect(eventLoopQ!.title).toContain('Event Loop');
    expect(eventLoopQ!.codeSnippet).toContain('setTimeout');
    expect(eventLoopQ!.codeSnippet).toContain('Promise.resolve()');
    expect(eventLoopQ!.answer).toContain('1, 4, 3, 2');
    expect(eventLoopQ!.keyTakeaways.length).toBeGreaterThan(0);
  });

  it('supports self-evaluation flow: marking learned vs repeat', () => {
    let progress = {
      completedTopics: [],
      completedSubtopics: [],
      completedQuestions: [] as string[],
      repeatQuestions: [] as string[],
    };

    const markLearned = (qid: string) => {
      progress = {
        ...progress,
        completedQuestions: Array.from(new Set([...progress.completedQuestions, qid])),
        repeatQuestions: progress.repeatQuestions.filter((id) => id !== qid),
      };
    };

    const markRepeat = (qid: string) => {
      progress = {
        ...progress,
        repeatQuestions: Array.from(new Set([...progress.repeatQuestions, qid])),
        completedQuestions: progress.completedQuestions.filter((id) => id !== qid),
      };
    };

    markLearned('q-fe-1');
    expect(progress.completedQuestions).toContain('q-fe-1');
    expect(progress.repeatQuestions).not.toContain('q-fe-1');

    markRepeat('q-fe-1');
    expect(progress.repeatQuestions).toContain('q-fe-1');
    expect(progress.completedQuestions).not.toContain('q-fe-1');
  });
});

describe('11. Target Companies & Telegram Channels Tracking', () => {
  it('covers key employer vacancies: Холдинг Т1, Directum, СКБ Контур, Т-Банк', () => {
    const companies = SEED_INTERNSHIPS.map((i) => i.company.toLowerCase());

    // Т1
    expect(companies.some((c) => c.includes('т1') || c.includes('t1'))).toBe(true);
    // Directum
    expect(companies.some((c) => c.includes('directum') || c.includes('директум'))).toBe(true);
    // Контур
    expect(companies.some((c) => c.includes('контур'))).toBe(true);
    // Т-Банк
    expect(companies.some((c) => c.includes('т-банк'))).toBe(true);

    // Channels
    const channels = SEED_INTERNSHIPS.map((i) => i.sourceChannel);
    expect(channels).toContain('@t1_holding');
    expect(channels).toContain('@directum_careers');
    expect(channels).toContain('@kontur_career');
    expect(channels).toContain('@tbank_start');
  });

  it('verifies Directum vacancies have Izhevsk location and valid fields', () => {
    const directumItems = SEED_INTERNSHIPS.filter(
      (i) => i.company.toLowerCase().includes('directum') || i.company.toLowerCase().includes('директум')
    );
    expect(directumItems.length).toBeGreaterThanOrEqual(3);

    directumItems.forEach((item) => {
      expect(item.location).toContain('Ижевск');
      expect(item.sourceChannel).toBe('@directum_careers');
      expect(item.salary).toBeTruthy();
      expect(item.requirements.length).toBeGreaterThan(0);
      expect(item.responsibilities.length).toBeGreaterThan(0);
    });
  });

  it('verifies Холдинг Т1 vacancies cover Open School (Открытая школа), DevOps and QA', () => {
    const t1Items = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('т1'));
    expect(t1Items.length).toBeGreaterThanOrEqual(3);

    const hasJava = t1Items.some((i) => i.subTrackId === 'java');
    const hasDevOps = t1Items.some((i) => i.directionId === 'devops');
    const hasQA = t1Items.some((i) => i.directionId === 'qa');

    expect(hasJava).toBe(true);
    expect(hasDevOps).toBe(true);
    expect(hasQA).toBe(true);
  });

  it('exports valid MONITORED_CHANNELS_LIST and INITIAL_PARSED_POSTS from TelegramParserTab', async () => {
    const { MONITORED_CHANNELS_LIST, INITIAL_PARSED_POSTS } = await import(
      '../data/channels'
    );

    expect(MONITORED_CHANNELS_LIST.length).toBeGreaterThanOrEqual(8);
    const handles = MONITORED_CHANNELS_LIST.map((c) => c.handle);
    expect(handles).toContain('@t1_holding');
    expect(handles).toContain('@kontur_career');
    expect(handles).toContain('@tbank_start');
    expect(handles).toContain('@directum_careers');
    expect(handles).toContain('@yandex_intern');
    expect(handles).toContain('@ozon_tech_career');
    expect(handles).toContain('@sber_careers');
    expect(handles).toContain('@avito_tech');

    expect(INITIAL_PARSED_POSTS.length).toBeGreaterThanOrEqual(5);
    const parsedCompanies = INITIAL_PARSED_POSTS.map((p) => p.company.toLowerCase());
    expect(parsedCompanies.some((c) => c.includes('т1'))).toBe(true);
    expect(parsedCompanies.some((c) => c.includes('контур'))).toBe(true);
    expect(parsedCompanies.some((c) => c.includes('directum'))).toBe(true);
    expect(parsedCompanies.some((c) => c.includes('т-банк'))).toBe(true);
  });

  it('tests company filtering logic matching internships correctly', () => {
    const filterByCompany = (items: typeof SEED_INTERNSHIPS, selectedComp: string) => {
      if (selectedComp === 'all') return items;
      return items.filter((item) => {
        const compLower = item.company.toLowerCase();
        const selLower = selectedComp.toLowerCase();
        return compLower.includes(selLower) || selLower.includes(compLower);
      });
    };

    const t1Results = filterByCompany(SEED_INTERNSHIPS, 'Холдинг Т1');
    expect(t1Results.length).toBeGreaterThanOrEqual(3);
    t1Results.forEach((i) => expect(i.company).toContain('Т1'));

    const directumResults = filterByCompany(SEED_INTERNSHIPS, 'Directum');
    expect(directumResults.length).toBeGreaterThanOrEqual(3);
    directumResults.forEach((i) => expect(i.company).toContain('Directum'));

    const konturResults = filterByCompany(SEED_INTERNSHIPS, 'Контур');
    expect(konturResults.length).toBeGreaterThanOrEqual(3);
    konturResults.forEach((i) => expect(i.company.toLowerCase()).toContain('контур'));

    const allResults = filterByCompany(SEED_INTERNSHIPS, 'all');
    expect(allResults.length).toBe(SEED_INTERNSHIPS.length);
  });

  it('validates bot server companies database and internships data', async () => {
    // Set NODE_ENV to test before import
    const nodeProcess = (globalThis as unknown as { process: { env: Record<string, string> } }).process;
    if (nodeProcess?.env) {
      nodeProcess.env.NODE_ENV = 'test';
    }
    // @ts-ignore
    const botModule: any = await import('../../bot/bot.mjs');
    expect(botModule.COMPANIES_DATA).toBeDefined();
    expect(botModule.COMPANIES_DATA.length).toBeGreaterThanOrEqual(8);

    const botCompanyIds = botModule.COMPANIES_DATA.map((c: any) => c.id);
    expect(botCompanyIds).toContain('t1');
    expect(botCompanyIds).toContain('kontur');
    expect(botCompanyIds).toContain('tbank');
    expect(botCompanyIds).toContain('directum');
    expect(botCompanyIds).toContain('yandex');
    expect(botCompanyIds).toContain('ozon');
    expect(botCompanyIds).toContain('sber');
    expect(botCompanyIds).toContain('avito');

    expect(botModule.ALL_INTERNSHIPS).toBeDefined();
    expect(botModule.ALL_INTERNSHIPS.length).toBeGreaterThanOrEqual(14);

    // Verify all ALL_INTERNSHIPS IDs match SEED_INTERNSHIPS to avoid database duplication
    const seedIds = new Set(SEED_INTERNSHIPS.map((i) => i.id));
    botModule.ALL_INTERNSHIPS.forEach((item: any) => {
      expect(seedIds.has(item.id)).toBe(true);
    });

    // Test findCompanyByQuery matching russian and english synonyms
    expect(botModule.findCompanyByQuery).toBeDefined();
    expect(botModule.findCompanyByQuery('директум')?.id).toBe('directum');
    expect(botModule.findCompanyByQuery('директрум')?.id).toBe('directum');
    expect(botModule.findCompanyByQuery('directum')?.id).toBe('directum');
    expect(botModule.findCompanyByQuery('t1')?.id).toBe('t1');
    expect(botModule.findCompanyByQuery('т1')?.id).toBe('t1');
    expect(botModule.findCompanyByQuery('контур')?.id).toBe('kontur');
    expect(botModule.findCompanyByQuery('kontur')?.id).toBe('kontur');
    expect(botModule.findCompanyByQuery('тбанк')?.id).toBe('tbank');
    expect(botModule.findCompanyByQuery('тинькофф')?.id).toBe('tbank');
    expect(botModule.findCompanyByQuery('сбер')?.id).toBe('sber');
    expect(botModule.findCompanyByQuery('ozon')?.id).toBe('ozon');
    expect(botModule.findCompanyByQuery('авито')?.id).toBe('avito');
    expect(botModule.findCompanyByQuery('vk')?.id).toBe('vk');
  });

  it('verifies search query matching handles transliterated company names for Directum, T1, Kontur, T-Bank', () => {
    const searchFilter = (query: string) => {
      const q = query.toLowerCase().trim();
      const isDirectum = q.includes('директ') || q.includes('direct');
      const isT1 = q.includes('т1') || q.includes('t1');
      const isTBank = q.includes('тбанк') || q.includes('т-банк') || q.includes('tbank') || q.includes('тиньк');
      const isKontur = q.includes('контур') || q.includes('kontur');

      return SEED_INTERNSHIPS.filter((item) => {
        const compLower = item.company.toLowerCase();
        const matchCompany =
          compLower.includes(q) ||
          (isDirectum && compLower.includes('directum')) ||
          (isT1 && (compLower.includes('т1') || compLower.includes('t1'))) ||
          (isTBank && (compLower.includes('т-банк') || compLower.includes('тинькофф') || compLower.includes('tbank'))) ||
          (isKontur && (compLower.includes('контур') || compLower.includes('kontur')));

        const matchTitle = item.title.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchDesc = item.description.toLowerCase().includes(q);
        return matchCompany || matchTitle || matchTags || matchDesc;
      });
    };

    expect(searchFilter('директум').length).toBeGreaterThanOrEqual(3);
    expect(searchFilter('директрум').length).toBeGreaterThanOrEqual(3);
    expect(searchFilter('t1').length).toBeGreaterThanOrEqual(3);
    expect(searchFilter('тбанк').length).toBeGreaterThanOrEqual(3);
    expect(searchFilter('контур').length).toBeGreaterThanOrEqual(3);
  });
});
