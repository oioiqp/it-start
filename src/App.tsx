import { useState, useEffect } from 'react';
import {
  Search,
  Briefcase,
  ExternalLink,
  Bot,
  RefreshCw,
  Bell,
  Building2,
} from 'lucide-react';
import type {
  DirectionId,
  Internship,
  SubTrackId,
  TelegramSubscription,
  TelegramUser,
  UserProgress,
  WorkFormat,
} from './types';
import { DIRECTIONS } from './data/directions';
import { ROADMAP_TOPICS } from './data/roadmaps';
import { SEED_INTERNSHIPS } from './data/internships';
import { QUESTIONS } from './data/questions';
import { Navbar } from './components/Navbar';
import { InternshipCard } from './components/InternshipCard';
import { InternshipModal } from './components/InternshipModal';
import { RoadmapViewer } from './components/RoadmapViewer';
import { QuestionsViewer } from './components/QuestionsViewer';
import { TelegramParserTab } from './components/TelegramParserTab';
import { SubscribeModal } from './components/SubscribeModal';
import {
  fetchInternshipsFromSupabase,
  seedInternshipsToSupabase,
  saveUserProgressToSupabase,
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_URL,
  GITHUB_PAGES_URL,
} from './lib/supabase';
import {
  getCachedInternships,
  getLocalProgress,
  getLocalSubscription,
  getLocalTheme,
  saveCachedInternships,
  saveLocalProgress,
  saveLocalTheme,
} from './lib/storage';
import { initTelegramWebApp, triggerHaptic } from './lib/telegram';
import { initVkBridge } from './lib/vkBridge';

export function App() {
  // Theme state: 'dark' (Liquid Obsidian) vs 'light' (Liquid Glass Canvas)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getLocalTheme());

  // Navigation
  const [activeTab, setActiveTab] = useState<'internships' | 'roadmaps' | 'questions' | 'telegram'>('internships');

  // Telegram User & Subscription
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<TelegramSubscription | null>(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState<boolean>(false);

  // User Progress
  const [userProgress, setUserProgress] = useState<UserProgress>(() => getLocalProgress());

  // Internships state
  const [internships, setInternships] = useState<Internship[]>(() => {
    const cached = getCachedInternships();
    return cached.length > 0 ? cached : SEED_INTERNSHIPS;
  });
  const [isLoadingInternships, setIsLoadingInternships] = useState<boolean>(false);
  const [selectedInternshipForPlan, setSelectedInternshipForPlan] = useState<Internship | null>(null);

  // Internships Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<DirectionId | 'all'>('all');
  const [selectedSubTrack, setSelectedSubTrack] = useState<SubTrackId | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<WorkFormat | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'telegram' | 'portal'>('all');

  const TARGET_COMPANIES = [
    'Т-Банк',
    'Холдинг Т1',
    'Контур',
    'Directum',
    'Яндекс',
    'Ozon Tech',
    'Сбер',
    'Авито',
    'VK',
  ];

  // Sync theme with document element and persistence
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
    saveLocalTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    triggerHaptic('selection');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initialize Telegram WebApp & Supabase
  useEffect(() => {
    // 1. Detect Telegram WebApp or VK Mini App
    const user = initTelegramWebApp();
    if (user) {
      setTelegramUser(user);
    }
    initVkBridge().catch(() => {});

    // 2. Load cached subscription
    const localSub = getLocalSubscription();
    if (localSub) {
      setCurrentSubscription(localSub);
    }

    // 3. Fetch internships from Supabase & Seed if empty
    const syncInternships = async () => {
      setIsLoadingInternships(true);
      const data = await fetchInternshipsFromSupabase();

      if (data && data.length > 0) {
        setInternships(data);
        saveCachedInternships(data);
      } else if (data && data.length === 0) {
        // Table is empty, seed initial data
        console.log('Seeding initial internships to Supabase...');
        await seedInternshipsToSupabase(SEED_INTERNSHIPS);
        setInternships(SEED_INTERNSHIPS);
        saveCachedInternships(SEED_INTERNSHIPS);
      } else {
        // Fallback to seed data
        setInternships(SEED_INTERNSHIPS);
      }
      setIsLoadingInternships(false);
    };

    syncInternships();
  }, []);

  // Save progress helper
  const updateProgress = (updater: (prev: UserProgress) => UserProgress) => {
    setUserProgress((prev) => {
      const next = updater(prev);
      saveLocalProgress(next);

      const userId = telegramUser?.id || currentSubscription?.chat_id || 'anonymous';
      saveUserProgressToSupabase(userId, next);

      return next;
    });
  };

  const handleToggleTopic = (topicId: string) => {
    updateProgress((prev) => {
      const isCompleted = prev.completedTopics.includes(topicId);
      const topic = ROADMAP_TOPICS.find((t) => t.id === topicId);
      const subtopicIds = topic ? topic.subtopics.map((_, idx) => `${topicId}__sub_${idx}`) : [];
      const currentSubSet = new Set(prev.completedSubtopics || []);

      if (!isCompleted) {
        subtopicIds.forEach((sid) => currentSubSet.add(sid));
        return {
          ...prev,
          completedTopics: prev.completedTopics.includes(topicId)
            ? prev.completedTopics
            : [...prev.completedTopics, topicId],
          completedSubtopics: Array.from(currentSubSet),
        };
      } else {
        subtopicIds.forEach((sid) => currentSubSet.delete(sid));
        return {
          ...prev,
          completedTopics: prev.completedTopics.filter((id) => id !== topicId),
          completedSubtopics: Array.from(currentSubSet),
        };
      }
    });
  };

  const handleToggleSubtopic = (topicId: string, subtopicIndex: number) => {
    updateProgress((prev) => {
      const topic = ROADMAP_TOPICS.find((t) => t.id === topicId);
      const totalSubtopics = topic?.subtopics.length || 0;
      const allTopicSubIds = topic?.subtopics.map((_, idx) => `${topicId}__sub_${idx}`) || [];
      const targetSubId = `${topicId}__sub_${subtopicIndex}`;

      const currentSubSet = new Set(prev.completedSubtopics || []);
      const wasTopicCompleted = prev.completedTopics.includes(topicId);

      if (wasTopicCompleted) {
        allTopicSubIds.forEach((sid) => currentSubSet.add(sid));
      }

      if (currentSubSet.has(targetSubId)) {
        currentSubSet.delete(targetSubId);
      } else {
        currentSubSet.add(targetSubId);
      }

      const nextSubtopics = Array.from(currentSubSet);
      const completedCount = allTopicSubIds.filter((sid) => currentSubSet.has(sid)).length;
      const isAllDone = totalSubtopics > 0 && completedCount === totalSubtopics;

      let nextCompletedTopics = [...prev.completedTopics];
      if (isAllDone && !nextCompletedTopics.includes(topicId)) {
        nextCompletedTopics.push(topicId);
      } else if (!isAllDone && nextCompletedTopics.includes(topicId)) {
        nextCompletedTopics = nextCompletedTopics.filter((id) => id !== topicId);
      }

      return {
        ...prev,
        completedTopics: nextCompletedTopics,
        completedSubtopics: nextSubtopics,
      };
    });
  };

  const handleToggleQuestion = (questionId: string) => {
    updateProgress((prev) => {
      const exists = prev.completedQuestions.includes(questionId);
      return {
        ...prev,
        completedQuestions: exists
          ? prev.completedQuestions.filter((id) => id !== questionId)
          : [...prev.completedQuestions, questionId],
        repeatQuestions: prev.repeatQuestions.filter((id) => id !== questionId),
      };
    });
  };

  const handleMarkQuestionRepeat = (questionId: string) => {
    updateProgress((prev) => ({
      ...prev,
      repeatQuestions: Array.from(new Set([...prev.repeatQuestions, questionId])),
      completedQuestions: prev.completedQuestions.filter((id) => id !== questionId),
    }));
  };

  const handleMarkQuestionLearned = (questionId: string) => {
    updateProgress((prev) => ({
      ...prev,
      completedQuestions: Array.from(new Set([...prev.completedQuestions, questionId])),
      repeatQuestions: prev.repeatQuestions.filter((id) => id !== questionId),
    }));
  };

  const handleInternshipAdded = (newInternship: Internship) => {
    setInternships((prev) => {
      const next = [newInternship, ...prev];
      saveCachedInternships(next);
      return next;
    });
  };

  // Helper for matching companies with synonyms
  const matchesCompanyFilter = (companyName: string, targetCompany: string): boolean => {
    if (targetCompany === 'all') return true;
    const c = companyName.toLowerCase();
    const t = targetCompany.toLowerCase();
    if (c.includes(t) || t.includes(c)) return true;
    if (t.includes('directum') || t.includes('директ')) return c.includes('directum') || c.includes('директ');
    if (t.includes('т1') || t.includes('t1')) return c.includes('т1') || c.includes('t1');
    if (t.includes('контур') || t.includes('kontur')) return c.includes('контур') || c.includes('kontur');
    if (t.includes('т-банк') || t.includes('тбанк') || t.includes('тиньк')) return c.includes('т-банк') || c.includes('тинькофф') || c.includes('тбанк');
    if (t.includes('авито') || t.includes('avito')) return c.includes('авито') || c.includes('avito');
    if (t.includes('ozon') || t.includes('озон')) return c.includes('ozon') || c.includes('озон');
    if (t.includes('сбер') || t.includes('sber')) return c.includes('сбер') || c.includes('sber');
    if (t.includes('vk') || t.includes('вк') || t.includes('вконтакт')) return c.includes('vk') || c.includes('вк') || c.includes('вконтакт');
    if (t.includes('яндекс') || t.includes('yandex')) return c.includes('яндекс') || c.includes('yandex');
    return false;
  };

  // Filtered internships for feed
  const filteredInternships = internships.filter((item) => {
    if (selectedCompany !== 'all' && !matchesCompanyFilter(item.company, selectedCompany)) {
      return false;
    }
    if (selectedDirection !== 'all' && item.directionId !== selectedDirection) return false;
    if (selectedSubTrack !== 'all' && item.subTrackId !== selectedSubTrack) return false;
    if (selectedFormat !== 'all' && item.format !== selectedFormat) return false;
    if (selectedSource === 'telegram' && item.sourceType !== 'telegram') return false;
    if (selectedSource === 'portal' && item.sourceType !== 'portal') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const isDirectum = q.includes('директ') || q.includes('direct');
      const isT1 = q.includes('т1') || q.includes('t1');
      const isTBank = q.includes('тбанк') || q.includes('т-банк') || q.includes('tbank') || q.includes('тиньк');
      const isKontur = q.includes('контур') || q.includes('kontur');
      const isOzon = q.includes('озон') || q.includes('ozon');
      const isSber = q.includes('сбер') || q.includes('sber');
      const isAvito = q.includes('авито') || q.includes('avito');
      const isYandex = q.includes('яндекс') || q.includes('yandex');
      const isVk = q.includes('вк') || q.includes('vk') || q.includes('вконтакт');

      const compLower = item.company.toLowerCase();
      const matchCompany =
        compLower.includes(q) ||
        (isDirectum && compLower.includes('directum')) ||
        (isT1 && (compLower.includes('т1') || compLower.includes('t1'))) ||
        (isTBank && (compLower.includes('т-банк') || compLower.includes('тинькофф') || compLower.includes('tbank'))) ||
        (isKontur && (compLower.includes('контур') || compLower.includes('kontur'))) ||
        (isOzon && compLower.includes('ozon')) ||
        (isSber && compLower.includes('сбер')) ||
        (isAvito && compLower.includes('avito')) ||
        (isYandex && compLower.includes('яндекс')) ||
        (isVk && compLower.includes('vk'));

      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchTitle || matchCompany || matchTags || matchDesc;
    }

    return true;
  });

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-250 ${
      theme === 'dark'
        ? 'dark bg-[#09090b] text-neutral-100 liquid-ambient-dark selection:bg-white selection:text-neutral-950'
        : 'light bg-[#f4f5f7] text-neutral-900 liquid-ambient-light selection:bg-neutral-900 selection:text-white'
    }`}>
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telegramUser={telegramUser}
        userProgress={userProgress}
        totalTopicsCount={ROADMAP_TOPICS.length}
        totalQuestionsCount={QUESTIONS.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSubscribeModal={() => {
          triggerHaptic('medium');
          setIsSubscribeModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* TAB 1: INTERNSHIPS FEED */}
        {activeTab === 'internships' && (
          <div className="space-y-6">
            {/* Hero Header - Apple Liquid Glass Bento */}
            <div className="rounded-3xl p-6 sm:p-8 space-y-4 transition-all duration-200
              bg-white/80 border border-neutral-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]
              dark:bg-neutral-900/60 dark:border-neutral-800/80 dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                  bg-neutral-100 text-neutral-800 border border-neutral-200/80
                  dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                >
                  <Briefcase className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                  Стажировки 2026
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                  bg-emerald-500/10 text-emerald-700 border border-emerald-500/20
                  dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Верифицированные вакансии
                </span>
              </div>

              <div className="max-w-3xl space-y-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight font-sans text-neutral-900 dark:text-white">
                  Агрегатор IT-стажировок, интерактивные роадмапы и тренажёр
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed max-w-2xl text-neutral-600 dark:text-neutral-300">
                  Подлинные позиции для стажёров и Junior-разработчиков: Т-Банк, Яндекс, Сбер, Ozon Tech, VK, Авито, Контур, Холдинг Т1 и Directum. Выбирайте вакансию для автоматического расчёта готовности по стеку и тренируйтесь перед интервью.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsSubscribeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-xs sm:text-sm active:scale-95 transition-all
                    bg-neutral-900 hover:bg-black text-white shadow-xs
                    dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Уведомления в Telegram</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setActiveTab('roadmaps');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors
                    bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/80
                    dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-neutral-200 dark:border-neutral-700"
                >
                  <span>Роадмапы</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>

                {!telegramUser && (
                  <a
                    href={TELEGRAM_BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors
                      bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80
                      dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-neutral-300 dark:border-neutral-700"
                  >
                    <Bot className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Бот @{TELEGRAM_BOT_USERNAME}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Filter and Search Panel */}
            <div className="rounded-3xl p-5 sm:p-6 space-y-4 transition-all duration-200
              bg-white/80 border border-neutral-200/80 shadow-xs
              dark:bg-neutral-900/60 dark:border-neutral-800/80"
            >
              {/* Row 1: Search & Reset */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию, компании или технологиям (React, Python, Go, C#, QA)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs sm:text-sm transition-colors focus:outline-none
                      bg-neutral-100/80 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400
                      dark:bg-neutral-850/80 dark:border-neutral-750 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCompany('all');
                      setSelectedDirection('all');
                      setSelectedSubTrack('all');
                      setSelectedFormat('all');
                      setSelectedSource('all');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs font-medium transition-colors
                      bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200/80
                      dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-neutral-300 dark:border-neutral-700"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>

              {/* Row 2: Company Filter */}
              <div className="space-y-1.5 pt-1 border-t border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                    Работодатель (Топ IT-компании):
                  </span>
                  {selectedCompany !== 'all' && (
                    <button
                      onClick={() => setSelectedCompany('all')}
                      className="text-xs text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white normal-case font-normal underline"
                    >
                      Показать все
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedCompany('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCompany === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200/70 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-750'
                    }`}
                  >
                    Все ({internships.length})
                  </button>
                  {TARGET_COMPANIES.map((company) => {
                    const isSelected = selectedCompany === company;
                    const count = internships.filter((item) => matchesCompanyFilter(item.company, company)).length;
                    return (
                      <button
                        key={company}
                        onClick={() => setSelectedCompany(isSelected ? 'all' : company)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-xs'
                            : 'bg-neutral-100/80 hover:bg-neutral-200/80 border-neutral-200/70 text-neutral-700 dark:bg-neutral-850/80 dark:border-neutral-750 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span>{company}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            isSelected
                              ? 'bg-white/20 text-white dark:bg-black/10 dark:text-neutral-950'
                              : 'bg-neutral-200/70 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Direction tabs */}
              <div className="space-y-1.5 pt-1 border-t border-neutral-200/70 dark:border-neutral-800">
                <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Направление:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => {
                      setSelectedDirection('all');
                      setSelectedSubTrack('all');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedDirection === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200/70 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-750'
                    }`}
                  >
                    Все направления ({internships.length})
                  </button>
                  {DIRECTIONS.map((dir) => (
                    <button
                      key={dir.id}
                      onClick={() => {
                        setSelectedDirection(dir.id);
                        setSelectedSubTrack('all');
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                        selectedDirection === dir.id
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-xs'
                          : 'bg-neutral-100/80 hover:bg-neutral-200/80 border-neutral-200/70 text-neutral-700 dark:bg-neutral-850/80 dark:border-neutral-750 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {dir.title.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Sub-tracks */}
              {selectedDirection !== 'all' && (
                <div className="space-y-1.5 pt-1 border-t border-neutral-200/70 dark:border-neutral-800">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Специализация:
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setSelectedSubTrack('all')}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedSubTrack === 'all'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300'
                      }`}
                    >
                      Все ветки
                    </button>
                    {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedSubTrack(st.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          selectedSubTrack === st.id
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-850 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 5: Format & Source selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-800 text-xs">
                {/* Format Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Формат:</span>
                  {(['all', 'Удаленно', 'Гибрид', 'Офис'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-3 py-1 rounded-full transition-colors font-medium ${
                        selectedFormat === fmt
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      {fmt === 'all' ? 'Все' : fmt}
                    </button>
                  ))}
                </div>

                {/* Source Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Источник:</span>
                  {(['all', 'telegram', 'portal'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-3 py-1 rounded-full transition-colors font-medium ${
                        selectedSource === src
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      {src === 'all' ? 'Все' : src === 'telegram' ? 'Telegram-каналы' : 'Карьерные порталы'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Internships Feed Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
                <span>
                  Найдено стажировок: <strong className="text-neutral-900 dark:text-white">{filteredInternships.length}</strong>
                </span>
                {isLoadingInternships && (
                  <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Синхронизация с Supabase...
                  </span>
                )}
              </div>

              {filteredInternships.length === 0 ? (
                <div className="p-12 text-center rounded-3xl space-y-3
                  bg-white/80 border border-neutral-200/80 text-neutral-700 shadow-xs
                  dark:bg-neutral-900/60 dark:border-neutral-800 dark:text-neutral-300"
                >
                  <Briefcase className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto" />
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white font-sans">
                    Стажировки по заданным фильтрам не найдены
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                    Попробуйте сбросить фильтры или добавьте новую вакансию в симуляторе парсера!
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCompany('all');
                      setSelectedDirection('all');
                      setSelectedSubTrack('all');
                      setSelectedFormat('all');
                      setSelectedSource('all');
                    }}
                    className="px-5 py-2 rounded-full text-xs font-semibold transition-all
                      bg-neutral-900 text-white hover:bg-black
                      dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 shadow-xs"
                  >
                    Сбросить все фильтры
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredInternships.map((internship) => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                      userProgress={userProgress}
                      roadmapTopics={ROADMAP_TOPICS}
                      questions={QUESTIONS}
                      onOpenPlan={(item) => setSelectedInternshipForPlan(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROADMAPS */}
        {activeTab === 'roadmaps' && (
          <RoadmapViewer
            topics={ROADMAP_TOPICS}
            userProgress={userProgress}
            onToggleTopic={handleToggleTopic}
            onToggleSubtopic={handleToggleSubtopic}
          />
        )}

        {/* TAB 3: QUESTIONS */}
        {activeTab === 'questions' && (
          <QuestionsViewer
            questions={QUESTIONS}
            userProgress={userProgress}
            onToggleQuestion={handleToggleQuestion}
            onMarkRepeat={handleMarkQuestionRepeat}
            onMarkLearned={handleMarkQuestionLearned}
          />
        )}

        {/* TAB 4: TELEGRAM & PARSER */}
        {activeTab === 'telegram' && (
          <TelegramParserTab
            telegramUser={telegramUser}
            currentSubscription={currentSubscription}
            onSubscriptionSaved={(sub) => setCurrentSubscription(sub)}
            onInternshipAdded={handleInternshipAdded}
          />
        )}
      </main>

      {/* Preparation Plan Modal */}
      <InternshipModal
        internship={selectedInternshipForPlan}
        onClose={() => setSelectedInternshipForPlan(null)}
        roadmapTopics={ROADMAP_TOPICS}
        questions={QUESTIONS}
        userProgress={userProgress}
        onToggleTopic={handleToggleTopic}
        onToggleSubtopic={handleToggleSubtopic}
        onToggleQuestion={handleToggleQuestion}
      />

      {/* Subscribe to Telegram Modal */}
      <SubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        telegramUser={telegramUser}
        currentSubscription={currentSubscription}
        onSubscriptionSaved={(sub) => setCurrentSubscription(sub)}
      />

      {/* Footer */}
      <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 text-xs mt-12 transition-colors border-t
        bg-white/60 border-neutral-200/80 text-neutral-500
        dark:bg-[#09090b]/60 dark:border-neutral-800/80 dark:text-neutral-400 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shadow-xs
              bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
            >
              IT
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-200 font-sans">IT-Старт © 2026</span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                100% реальные IT-стажировки • Роадмапы • Telegram & VK Боты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>TG: @{TELEGRAM_BOT_USERNAME}</span>
            </a>
            <span>•</span>
            <a
              href={GITHUB_PAGES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors"
            >
              GitHub Pages
            </a>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Supabase Connected
            </span>
            <span>•</span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium
              bg-neutral-100 text-neutral-600 border border-neutral-200/80
              dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
            >
              Liquid Bento v3.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
