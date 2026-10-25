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
import { getLocalProgress, saveLocalProgress, getLocalTheme, saveLocalTheme } from '../lib/storage';

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
    expect(channels).toContain('@t1career');
    expect(channels).toContain('@Life_in_Directum');
    expect(channels).toContain('@KonturTech');
    expect(channels).toContain('@tbank_team');
  });

  it('verifies Directum vacancies have Izhevsk location and valid fields', () => {
    const directumItems = SEED_INTERNSHIPS.filter(
      (i) => i.company.toLowerCase().includes('directum') || i.company.toLowerCase().includes('директум')
    );
    expect(directumItems.length).toBeGreaterThanOrEqual(3);

    directumItems.forEach((item) => {
      expect(item.location).toContain('Ижевск');
      expect(item.sourceChannel).toBe('@Life_in_Directum');
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
    expect(handles).toContain('@t1career');
    expect(handles).toContain('@KonturTech');
    expect(handles).toContain('@tbank_team');
    expect(handles).toContain('@Life_in_Directum');
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
    expect(botModule.SEED_INTERNSHIPS).toBeDefined();
    expect(botModule.PORTAL_FALLBACK_VACANCIES).toBeDefined();
    expect(botModule.PORTAL_FALLBACK_VACANCIES.length).toBeGreaterThanOrEqual(8);

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

  it('validates Telegram channels and career websites parser modules in bot.mjs', async () => {
    // @ts-ignore
    const botModule: any = await import('../../bot/bot.mjs');

    expect(typeof botModule.detectVacancyTrack).toBe('function');
    expect(botModule.detectVacancyTrack('Стажёр Frontend React').directionId).toBe('frontend');
    expect(botModule.detectVacancyTrack('Стажёр Frontend React').subTrackId).toBe('react');
    expect(botModule.detectVacancyTrack('Инженер по тестированию (Auto QA)').directionId).toBe('qa');
    expect(botModule.detectVacancyTrack('Junior DevOps / SRE').directionId).toBe('devops');
    expect(botModule.detectVacancyTrack('Стажёр ML Engineer').directionId).toBe('data_science');
    expect(botModule.detectVacancyTrack('Junior Android Developer').directionId).toBe('mobile');
    expect(botModule.detectVacancyTrack('Java Software Engineer').directionId).toBe('backend');

    expect(Array.isArray(botModule.ALL_TARGET_TG_CHANNELS)).toBe(true);
    expect(botModule.ALL_TARGET_TG_CHANNELS.length).toBeGreaterThanOrEqual(15);
    const tgHandles = botModule.ALL_TARGET_TG_CHANNELS.map((c: any) => c.handle);
    expect(tgHandles).toContain('@tbank_team');
    expect(tgHandles).toContain('@KonturTech');
    expect(tgHandles).toContain('@Life_in_Directum');
    expect(tgHandles).toContain('@t1career');
    expect(tgHandles).toContain('@yandex_intern');
    expect(tgHandles).toContain('@ozon_tech_career');
    expect(tgHandles).toContain('@forjunior');
    expect(tgHandles).toContain('@it_internships');
    expect(tgHandles).toContain('@normrabota');

    expect(Array.isArray(botModule.CAREER_WEBSITES_DATA)).toBe(true);
    expect(botModule.CAREER_WEBSITES_DATA.length).toBeGreaterThanOrEqual(10);
    const siteUrls = botModule.CAREER_WEBSITES_DATA.map((s: any) => s.url);
    expect(siteUrls.some((u: string) => u.includes('career.directum.ru'))).toBe(true);
    expect(siteUrls.some((u: string) => u.includes('kontur.ru'))).toBe(true);
    expect(siteUrls.some((u: string) => u.includes('fintech.tbank.ru'))).toBe(true);
    expect(siteUrls.some((u: string) => u.includes('t1.ru'))).toBe(true);

    expect(typeof botModule.parseTelegramChannels).toBe('function');
    expect(typeof botModule.parseCareerWebsites).toBe('function');
    expect(typeof botModule.fetchCompanyVacancies).toBe('function');
    expect(typeof botModule.scanChannelsAndSyncSupabase).toBe('function');
  });
});

describe('12. VKontakte (VK) Bot & VK Mini App Integration', () => {
  it('validates VK Bridge adapter and launch parameters parser', async () => {
    const { parseVkLaunchParams, isVkMiniApp, initVkBridge, triggerVkHaptic } = await import('../lib/vkBridge');

    const sampleQuery =
      '?vk_user_id=87654321&vk_app_id=51820000&vk_platform=mobile_web&vk_language=ru&vk_is_app_user=1';
    const parsed = parseVkLaunchParams(sampleQuery);

    expect(parsed.vk_user_id).toBe(87654321);
    expect(parsed.vk_app_id).toBe(51820000);
    expect(parsed.vk_platform).toBe('mobile_web');
    expect(parsed.vk_language).toBe('ru');
    expect(parsed.vk_is_app_user).toBe(1);

    // Empty search string returns empty object
    expect(parseVkLaunchParams('')).toEqual({});

    // Parse from hash string (for SPA and GitHub Pages 404 routing)
    const hashParsed = parseVkLaunchParams('#/?vk_user_id=777666&vk_app_id=51800000&vk_platform=desktop_web');
    expect(hashParsed.vk_user_id).toBe(777666);
    expect(hashParsed.vk_app_id).toBe(51800000);
    expect(hashParsed.vk_platform).toBe('desktop_web');

    // Detect VK environment when window.vkBridge is present
    (window as any).vkBridge = {
      send: async (method: string) => {
        if (method === 'VKWebAppInit') return { result: true };
        if (method === 'VKWebAppGetUserInfo') return { id: 87654321, first_name: 'Иван' };
        return {};
      },
    };

    expect(isVkMiniApp()).toBe(true);
    const initRes = await initVkBridge();
    expect(initRes.success).toBe(true);
    expect(initRes.user?.id).toBe(87654321);

    // Haptic calls should not throw
    expect(() => triggerVkHaptic('impact')).not.toThrow();
    expect(() => triggerVkHaptic('notification')).not.toThrow();
    expect(() => triggerVkHaptic('selection')).not.toThrow();

    // Clean up
    delete (window as any).vkBridge;
  });

  it('validates VK client storage and bot commands helpers in lib/vk.ts', async () => {
    const {
      getSavedVkToken,
      saveVkToken,
      getSavedVkPeerId,
      saveVkPeerId,
      getVkBotCommands,
      sendVkMessage,
      VK_BOT_NAME,
      VK_COMMUNITY_URL,
      getSavedVkGroupId,
      saveVkGroupId,
      getVkBotDialogUrl,
      getVkCommunityUrl,
    } = await import('../lib/vk');

    expect(VK_BOT_NAME).toContain('VK');
    expect(VK_COMMUNITY_URL).toContain('vk.com');

    // Token storage
    saveVkToken('vk1.a.test_token_12345');
    expect(getSavedVkToken()).toBe('vk1.a.test_token_12345');
    saveVkToken('');
    expect(getSavedVkToken()).toBe('');

    // Peer ID storage
    saveVkPeerId('12345678');
    expect(getSavedVkPeerId()).toBe('12345678');
    saveVkPeerId('');
    expect(getSavedVkPeerId()).toBe('');

    // Group ID storage and dynamic URLs
    saveVkGroupId('987654321');
    expect(getSavedVkGroupId()).toBe('987654321');
    expect(getVkBotDialogUrl()).toContain('sel=-987654321');
    expect(getVkCommunityUrl()).toContain('club987654321');

    saveVkGroupId('club987654321');
    expect(getSavedVkGroupId()).toBe('club987654321');
    expect(getVkBotDialogUrl()).toContain('sel=-987654321');
    expect(getVkCommunityUrl()).toContain('club987654321');

    saveVkGroupId('');
    expect(getSavedVkGroupId()).toBe('');

    // Bot Commands catalog
    const commands = getVkBotCommands();
    expect(commands.length).toBeGreaterThanOrEqual(8);
    const cmdNames = commands.map((c) => c.command);
    expect(cmdNames.some((c) => c.includes('start'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('vacancies'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('companies'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('roadmaps'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('questions'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('subscribe'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('status'))).toBe(true);
    expect(cmdNames.some((c) => c.includes('help'))).toBe(true);

    // sendVkMessage returns error if token is missing
    const sendRes = await sendVkMessage('123456', 'Hello', '');
    expect(sendRes.success).toBe(false);
    expect(sendRes.error).toContain('Token');
  });

  it('validates bot/vk_bot.mjs core functions, keyboards and HTML sanitizer', async () => {
    // @ts-ignore
    const vkBotModule: any = await import('../../bot/vk_bot.mjs');

    expect(vkBotModule).toBeDefined();

    // 1. cleanHtmlForVk
    expect(typeof vkBotModule.cleanHtmlForVk).toBe('function');
    const dirtyHtml = '🔥 <b>Новая стажировка!</b><br>Компания:&nbsp;<a href="https://t1.ru">Т1</a> &amp; <code>Java</code> &quot;Открытая школа&quot;';
    const cleaned = vkBotModule.cleanHtmlForVk(dirtyHtml);
    expect(cleaned).toContain('Новая стажировка!');
    expect(cleaned).not.toContain('<b>');
    expect(cleaned).not.toContain('</b>');
    expect(cleaned).not.toContain('<code>');
    expect(cleaned).not.toContain('&nbsp;');
    expect(cleaned).not.toContain('&amp;');
    expect(cleaned).not.toContain('&quot;');
    expect(cleaned).toContain('Т1 (https://t1.ru)');
    expect(cleaned).toContain('"Открытая школа"');

    // 2. createVkKeyboard
    expect(typeof vkBotModule.createVkKeyboard).toBe('function');
    const kbJson = vkBotModule.createVkKeyboard({
      inline: true,
      buttons: [
        [
          { label: 'Стажировки', payload: { cmd: 'vacancies' }, color: 'primary' },
          { label: 'Открыть IT-Старт', link: 'https://oioiqp.github.io/it-start/' },
        ],
      ],
    });
    const kb = JSON.parse(kbJson);
    expect(kb.inline).toBe(true);
    expect(kb.buttons.length).toBe(1);
    expect(kb.buttons[0][0].action.type).toBe('text');
    expect(kb.buttons[0][0].action.label).toBe('Стажировки');
    expect(kb.buttons[0][1].action.type).toBe('open_link');
    expect(kb.buttons[0][1].action.link).toBe('https://oioiqp.github.io/it-start/');

    // 3. formatVkVacancyMessage
    expect(typeof vkBotModule.formatVkVacancyMessage).toBe('function');
    const msg = vkBotModule.formatVkVacancyMessage({
      company: 'Холдинг Т1',
      title: 'Стажёр Java',
      salary: 'от 70 000 ₽',
      format: 'Удаленно',
      location: 'Москва',
      sourceChannel: '@t1career',
      tags: ['Java', 'Spring'],
      url: 'https://t1.ru/school/',
    });
    expect(msg).toContain('Холдинг Т1');
    expect(msg).toContain('Стажёр Java');
    expect(msg).toContain('от 70 000 ₽');
    expect(msg).toContain('https://t1.ru/school/');

    // 4. Predefined keyboards and VK API Inline 10-button limit
    expect(vkBotModule.MAIN_VK_KEYBOARD).toBeDefined();
    expect(vkBotModule.VACANCIES_VK_KEYBOARD).toBeDefined();
    expect(vkBotModule.COMPANIES_VK_KEYBOARD).toBeDefined();

    const mainKbParsed = JSON.parse(vkBotModule.MAIN_VK_KEYBOARD);
    expect(mainKbParsed.buttons.length).toBeGreaterThanOrEqual(3);

    const vacKbParsed = JSON.parse(vkBotModule.VACANCIES_VK_KEYBOARD);
    const vacTotalButtons = vacKbParsed.buttons.flat().length;
    expect(vacTotalButtons).toBeLessThanOrEqual(10); // VK inline keyboard hard limit

    const compKbParsed = JSON.parse(vkBotModule.COMPANIES_VK_KEYBOARD);
    const compTotalButtons = compKbParsed.buttons.flat().length;
    expect(compTotalButtons).toBeLessThanOrEqual(10); // VK inline keyboard hard limit
  });

  it('validates VK bot command handlers in bot/vk_bot.mjs (start, vacancies, companies, roadmaps, questions, subscribe, status, help)', async () => {
    // @ts-ignore
    const vkBotModule: any = await import('../../bot/vk_bot.mjs');

    // 1. «Начать» / /start
    const startRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/start' });
    expect(startRes.ok).toBe(true);
    expect(startRes.type).toBe('start');
    expect(startRes.reply.message).toContain('Привет');
    expect(startRes.reply.message).toContain('IT-Старт');
    expect(startRes.reply.keyboard).toBe(vkBotModule.MAIN_VK_KEYBOARD);

    // 2. «Стажировки» / /vacancies
    const vacRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'Стажировки' });
    expect(vacRes.ok).toBe(true);
    expect(vacRes.type).toBe('vacancies');
    expect(vacRes.reply.message).toContain('стажировки');
    expect(vacRes.count).toBeGreaterThan(0);

    // 3. Direction filtering (frontend, backend, mobile)
    const dirRes = await vkBotModule.handleVkMessage({
      peer_id: 1001,
      text: '',
      payload: JSON.stringify({ cmd: 'direction', id: 'frontend' }),
    });
    expect(dirRes.ok).toBe(true);
    expect(dirRes.type).toBe('direction');
    expect(dirRes.reply.message).toContain('Frontend');

    // 4. «Компании» / /companies
    const compRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/companies' });
    expect(compRes.ok).toBe(true);
    expect(compRes.type).toBe('companies');
    expect(compRes.reply.message).toContain('Холдинг Т1');
    expect(compRes.reply.message).toContain('Контур');
    expect(compRes.reply.message).toContain('Directum');

    // 5. Specific company aliases (e.g. «директум», «т1», «контур», «тбанк»)
    const directumRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'директум' });
    expect(directumRes.ok).toBe(true);
    expect(directumRes.type).toBe('company_details');
    expect(directumRes.company).toBe('directum');
    expect(directumRes.reply.message).toContain('Directum');

    const t1Res = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/company_t1' });
    expect(t1Res.ok).toBe(true);
    expect(t1Res.type).toBe('company_details');
    expect(t1Res.company).toBe('t1');

    // 6. «Роадмапы» / /roadmaps
    const roadmapsRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'Роадмапы' });
    expect(roadmapsRes.ok).toBe(true);
    expect(roadmapsRes.type).toBe('roadmaps');
    expect(roadmapsRes.reply.message).toContain('роадмапы');

    // 7. «Вопросы» / /questions
    const questionsRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/questions' });
    expect(questionsRes.ok).toBe(true);
    expect(questionsRes.type).toBe('questions');
    expect(questionsRes.reply.message).toContain('вопросов');

    // 8. «Подписка» / /subscribe & «Отписаться» / /unsubscribe
    const subRes = await vkBotModule.handleVkMessage({ peer_id: 1002, text: '/subscribe' });
    expect(subRes.ok).toBe(true);
    expect(subRes.type).toBe('subscribed');
    expect(subRes.reply.message).toContain('подписались');

    const unsubRes = await vkBotModule.handleVkMessage({ peer_id: 1002, text: '/unsubscribe' });
    expect(unsubRes.ok).toBe(true);
    expect(unsubRes.type).toBe('unsubscribed');
    expect(unsubRes.reply.message).toContain('отписались');

    // 9. «Статус» / /status
    const statusRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/status' });
    expect(statusRes.ok).toBe(true);
    expect(statusRes.type).toBe('status');
    expect(statusRes.reply.message).toContain('Bots Long Poll');

    // 10. «Помощь» / /help
    const helpRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: '/help' });
    expect(helpRes.ok).toBe(true);
    expect(helpRes.type).toBe('help');
    expect(helpRes.reply.message).toContain('Команды');

    // 11. Russian direction keyword commands («фронтенд», «бэкенд»)
    const frontRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'фронтенд' });
    expect(frontRes.ok).toBe(true);
    expect(frontRes.type).toBe('direction');
    expect(frontRes.directionId).toBe('frontend');

    const backRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'бэкенд' });
    expect(backRes.ok).toBe(true);
    expect(backRes.type).toBe('direction');
    expect(backRes.directionId).toBe('backend');

    // 12. Group conversation mention stripping: [club225890000|IT-Старт] /vacancies & @mention
    const groupMentionRes = await vkBotModule.handleVkMessage({
      peer_id: 2000000001,
      text: '[club225890000|IT-Старт] /vacancies',
    });
    expect(groupMentionRes.ok).toBe(true);
    expect(groupMentionRes.type).toBe('vacancies');

    const atMentionRes = await vkBotModule.handleVkMessage({
      peer_id: 2000000001,
      text: '@it_start_platform стажировки',
    });
    expect(atMentionRes.ok).toBe(true);
    expect(atMentionRes.type).toBe('vacancies');

    // 13. Russian aliases with punctuation («Привет!», «Старт»)
    const privetExclRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'Привет!' });
    expect(privetExclRes.ok).toBe(true);
    expect(privetExclRes.type).toBe('start');

    const startRusRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'Старт' });
    expect(startRusRes.ok).toBe(true);
    expect(startRusRes.type).toBe('start');

    // 14. Edge cases: null message, empty message, missing peer_id
    expect((await vkBotModule.handleVkMessage(null)).ok).toBe(false);
    expect((await vkBotModule.handleVkMessage({})).ok).toBe(false);

    // 15. Unknown command fallback
    const unknownRes = await vkBotModule.handleVkMessage({ peer_id: 1001, text: 'абракадабра123' });
    expect(unknownRes.ok).toBe(true);
    expect(unknownRes.type).toBe('unknown');
  }, 15000);

  it('validates VK subscribers management and notification push in bot/vk_bot.mjs', async () => {
    // @ts-ignore
    const vkBotModule: any = await import('../../bot/vk_bot.mjs');

    // Reset deduplication cache
    if (typeof vkBotModule.clearVkNotifiedCache === 'function') {
      vkBotModule.clearVkNotifiedCache();
    }

    // Register subscriber
    await vkBotModule.registerVkSubscriber('999901', { first_name: 'Тестер' });
    const subs = await vkBotModule.getVkSubscribers();
    expect(subs.some((s: any) => s.peer_id === '999901')).toBe(true);

    const testVacancy = {
      id: 'test-vac-001',
      company: 'Холдинг Т1',
      title: 'Стажёр Java (Открытая школа)',
      salary: '80 000 ₽',
      format: 'Удаленно',
      sourceChannel: '@t1career',
      url: 'https://t1.ru/school/',
    };

    // First push notification to subscribers
    const sentCount1 = await vkBotModule.notifyVkSubscribers([testVacancy]);
    expect(sentCount1).toBeGreaterThanOrEqual(1);

    // Second push with same vacancy should be deduplicated (sentCount === 0)
    const sentCount2 = await vkBotModule.notifyVkSubscribers([testVacancy]);
    expect(sentCount2).toBe(0);

    // Unregister
    await vkBotModule.unregisterVkSubscriber('999901');
    const subsAfter = await vkBotModule.getVkSubscribers();
    expect(subsAfter.some((s: any) => s.peer_id === '999901')).toBe(false);
  });

  it('validates fallback mode and runtime status of VK bot without token', async () => {
    // @ts-ignore
    const vkBotModule: any = await import('../../bot/vk_bot.mjs');

    const status = vkBotModule.getVkBotStatus();
    expect(status.bot).toContain('VK');
    expect(status.commandsCount).toBeGreaterThanOrEqual(8);
    expect(['live', 'fallback', 'configured']).toContain(status.mode);

    // Starting bot without token enters safe fallback mode without crashing
    const startRes = await vkBotModule.startVkBot('');
    expect(startRes.running).toBe(true);
    expect(startRes.mode).toBe('fallback');

    expect(() => vkBotModule.stopVkBot()).not.toThrow();
  });

  it('validates VK bot status and cross-integration with server bot', async () => {
    // @ts-ignore
    const botModule: any = await import('../../bot/bot.mjs');
    expect(botModule.LAST_SCAN_STATUS).toBeDefined();

    // @ts-ignore
    const vkBotModule: any = await import('../../bot/vk_bot.mjs');
    const vkStatus = vkBotModule.getVkBotStatus();
    expect(vkStatus.bot).toBe('IT-Старт VK Бот');
    expect(vkStatus.commandsCount).toBe(8);
    expect(vkStatus.version).toBe('5.199');
  });
});

describe('13. Real Employer Positions & Liquid Glass Bento Dark/Light Theme System', () => {
  it('covers 100% of required real programs for all 9 target employers', () => {
    // 1. Т-Банк: Frontend, Backend Python, Backend Go, Backend Java, QA, Analytics
    const tbankItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('т-банк'));
    expect(tbankItems.length).toBeGreaterThanOrEqual(6);
    expect(tbankItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(tbankItems.some((i) => i.directionId === 'backend' && i.subTrackId === 'python')).toBe(true);
    expect(tbankItems.some((i) => i.directionId === 'backend' && i.subTrackId === 'golang')).toBe(true);
    expect(tbankItems.some((i) => i.directionId === 'backend' && i.subTrackId === 'java')).toBe(true);
    expect(tbankItems.some((i) => i.directionId === 'qa')).toBe(true);
    expect(tbankItems.some((i) => i.subTrackId === 'analytics')).toBe(true);
    tbankItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@tbank_team');
      expect(i.applyUrl).toContain('fintech.tbank.ru');
    });

    // 2. СКБ Контур: Frontend React/TS, Backend C#/Python, QA
    const konturItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('контур'));
    expect(konturItems.length).toBeGreaterThanOrEqual(4);
    expect(konturItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(konturItems.some((i) => i.directionId === 'backend')).toBe(true);
    expect(konturItems.some((i) => i.directionId === 'qa')).toBe(true);
    konturItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@KonturTech');
      expect(i.applyUrl).toContain('kontur.ru');
    });

    // 3. Directum: Directum RX, C#, Web, QA
    const directumItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('directum'));
    expect(directumItems.length).toBeGreaterThanOrEqual(4);
    expect(directumItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(directumItems.some((i) => i.directionId === 'backend')).toBe(true);
    expect(directumItems.some((i) => i.directionId === 'qa')).toBe(true);
    directumItems.forEach((i) => {
      expect(i.location).toContain('Ижевск');
      expect(i.sourceChannel).toBe('@Life_in_Directum');
      expect(i.applyUrl).toContain('directum.ru');
    });

    // 4. Холдинг Т1: Java, DevOps/Linux, QA Auto
    const t1Items = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('т1'));
    expect(t1Items.length).toBeGreaterThanOrEqual(3);
    expect(t1Items.some((i) => i.directionId === 'backend' && i.subTrackId === 'java')).toBe(true);
    expect(t1Items.some((i) => i.directionId === 'devops')).toBe(true);
    expect(t1Items.some((i) => i.directionId === 'qa')).toBe(true);
    t1Items.forEach((i) => {
      expect(i.sourceChannel).toBe('@t1career');
      expect(i.applyUrl).toContain('t1.ru');
    });

    // 5. Яндекс: Frontend, Backend, ML
    const yandexItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('яндекс'));
    expect(yandexItems.length).toBeGreaterThanOrEqual(4);
    expect(yandexItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(yandexItems.some((i) => i.directionId === 'backend' && i.subTrackId === 'python')).toBe(true);
    expect(yandexItems.some((i) => i.directionId === 'data_science')).toBe(true);
    yandexItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@yandex_intern');
      expect(i.applyUrl).toContain('yandex.ru');
    });

    // 6. Ozon Tech: Go, C#, Frontend, QA
    const ozonItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('ozon'));
    expect(ozonItems.length).toBeGreaterThanOrEqual(4);
    expect(ozonItems.some((i) => i.subTrackId === 'golang')).toBe(true);
    expect(ozonItems.some((i) => i.title.includes('C#'))).toBe(true);
    expect(ozonItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(ozonItems.some((i) => i.directionId === 'qa')).toBe(true);
    ozonItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@ozon_tech_career');
      expect(i.applyUrl).toContain('job.ozon.ru');
    });

    // 7. Сбер: Java, Data Science, DevOps
    const sberItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('сбер'));
    expect(sberItems.length).toBeGreaterThanOrEqual(4);
    expect(sberItems.some((i) => i.directionId === 'backend' && i.subTrackId === 'java')).toBe(true);
    expect(sberItems.some((i) => i.directionId === 'data_science')).toBe(true);
    expect(sberItems.some((i) => i.directionId === 'devops')).toBe(true);
    sberItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@sber_careers');
      expect(i.applyUrl).toContain('sbergraduate.ru');
    });

    // 8. Авито: Frontend, Backend, Analytics
    const avitoItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('avito') || i.company.toLowerCase().includes('авито'));
    expect(avitoItems.length).toBeGreaterThanOrEqual(5);
    expect(avitoItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(avitoItems.some((i) => i.directionId === 'backend')).toBe(true);
    expect(avitoItems.some((i) => i.subTrackId === 'analytics')).toBe(true);
    avitoItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@avito_tech');
      expect(i.applyUrl).toContain('avito.com');
    });

    // 9. VK: Web, Mobile, Data
    const vkItems = SEED_INTERNSHIPS.filter((i) => i.company.toLowerCase().includes('vk'));
    expect(vkItems.length).toBeGreaterThanOrEqual(5);
    expect(vkItems.some((i) => i.directionId === 'frontend')).toBe(true);
    expect(vkItems.some((i) => i.directionId === 'mobile')).toBe(true);
    expect(vkItems.some((i) => i.directionId === 'data_science')).toBe(true);
    vkItems.forEach((i) => {
      expect(i.sourceChannel).toBe('@vk_team');
      expect(i.applyUrl).toContain('vk.company');
    });
  });

  it('validates theme persistence with getLocalTheme and saveLocalTheme', () => {
    localStorage.removeItem('it_start_theme');
    // Default fallback is dark
    expect(getLocalTheme()).toBe('dark');

    saveLocalTheme('light');
    expect(getLocalTheme()).toBe('light');

    saveLocalTheme('dark');
    expect(getLocalTheme()).toBe('dark');
  });
});


