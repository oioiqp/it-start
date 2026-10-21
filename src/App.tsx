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
  // Theme state: 'dark' (Cyberpunk Obsidian HUD) vs 'light' (Cyberpunk Clean Lab)
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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      theme === 'dark'
        ? 'dark bg-[#080b12] text-slate-100 cyber-grid-dark selection:bg-cyan-500 selection:text-black'
        : 'light bg-[#f8fafc] text-slate-900 cyber-grid-light selection:bg-sky-500 selection:text-white'
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
            {/* Hero Header - Cyberpunk Tech Minimal */}
            <div className="rounded-2xl p-6 sm:p-7 space-y-4 transition-all duration-200 cyber-corner
              dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/25 dark:shadow-[0_0_24px_rgba(0,240,255,0.1)] dark:text-cyan-400
              light:bg-white light:border light:border-slate-200 light:shadow-md light:text-sky-600"
            >
              <div className="flex items-center gap-2 flex-wrap font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold
                  dark:bg-cyan-500/15 dark:border dark:border-cyan-500/30 dark:text-cyan-300
                  light:bg-sky-50 light:border light:border-sky-200 light:text-sky-800"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  [SYS::INTERNSHIPS_2026]
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold
                  dark:bg-emerald-500/15 dark:border dark:border-emerald-500/30 dark:text-emerald-400
                  light:bg-emerald-50 light:border light:border-emerald-200 light:text-emerald-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ZERO FAKE DATA • 100% ПОДЛИННЫЕ ВАКАНСИИ
                </span>
              </div>

              <div className="max-w-3xl space-y-2">
                <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-snug font-sans dark:text-white light:text-slate-900">
                  Агрегатор IT-стажировок, интерактивные роадмапы и тренажёр
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed max-w-2xl dark:text-slate-300 light:text-slate-600">
                  Подлинные позиции для стажёров и Junior-разработчиков: Т-Банк, Яндекс, Сбер, Ozon Tech, VK, Авито, Контур, Холдинг Т1 и Directum. Выбирайте вакансию для автоматического расчёта готовности по стеку и тренируйтесь перед интервью.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsSubscribeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-95 transition-all
                    dark:bg-gradient-to-r dark:from-cyan-500 dark:via-indigo-600 dark:to-sky-500 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.35)]
                    light:bg-slate-900 light:hover:bg-slate-800 light:text-white light:shadow-sm"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Уведомления в Telegram</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setActiveTab('roadmaps');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors
                    dark:bg-[#131b2e] dark:hover:bg-[#1a253e] dark:border dark:border-cyan-500/30 dark:text-cyan-200
                    light:bg-slate-100 light:hover:bg-slate-200 light:border light:border-slate-300 light:text-slate-800"
                >
                  <span>Роадмапы</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>

                {!telegramUser && (
                  <a
                    href={TELEGRAM_BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-medium transition-colors
                      dark:bg-[#06080f] dark:hover:bg-[#101626] dark:border dark:border-slate-800 dark:text-slate-300
                      light:bg-white light:hover:bg-slate-50 light:border light:border-slate-200 light:text-slate-700"
                  >
                    <Bot className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
                    <span>Бот @{TELEGRAM_BOT_USERNAME}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Filter and Search Panel */}
            <div className="rounded-2xl p-4 sm:p-5 space-y-4 transition-all duration-200
              dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
              light:bg-white light:border light:border-slate-200 light:shadow-md"
            >
              {/* Row 1: Search & Reset */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-slate-500 light:text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию, компании или технологиям (React, Python, Go, C#, QA)..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono transition-colors
                      dark:bg-[#06080f] dark:border dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-cyan-400
                      light:bg-slate-50 light:border light:border-slate-300 light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-sky-500"
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
                    className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-mono font-medium transition-colors
                      dark:bg-[#06080f] dark:border dark:border-slate-800 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:border-cyan-500/30
                      light:bg-slate-100 light:border light:border-slate-200 light:text-slate-600 light:hover:text-slate-900"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>

              {/* Row 2: Company Filter */}
              <div className="space-y-1.5 pt-1 border-t dark:border-slate-800/60 light:border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider dark:text-slate-400 light:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
                    Работодатель (Топ IT-компании):
                  </span>
                  {selectedCompany !== 'all' && (
                    <button
                      onClick={() => setSelectedCompany('all')}
                      className="text-xs dark:text-cyan-400 dark:hover:text-cyan-300 light:text-sky-600 light:hover:text-sky-700 normal-case font-normal"
                    >
                      Показать все
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedCompany('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCompany === 'all'
                        ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.35)] light:bg-slate-900 light:text-white'
                        : 'dark:bg-[#06080f]/80 dark:border dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:border light:border-slate-200 light:text-slate-700'
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_14px_rgba(0,240,255,0.35)] dark:ring-1 dark:ring-cyan-300 light:bg-slate-900 light:text-white light:ring-1 light:ring-slate-700'
                            : 'dark:bg-[#06080f]/80 dark:border dark:border-slate-800 dark:text-slate-300 dark:hover:text-white dark:hover:border-cyan-500/40 light:bg-slate-50 light:border light:border-slate-200 light:text-slate-700 light:hover:border-slate-300'
                        }`}
                      >
                        <span>{company}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'dark:bg-cyan-950/60 dark:text-cyan-300 light:bg-slate-200 light:text-slate-700'
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
              <div className="space-y-1.5 pt-1 border-t dark:border-slate-800/60 light:border-slate-100">
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider dark:text-slate-400 light:text-slate-500">
                  Направление:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => {
                      setSelectedDirection('all');
                      setSelectedSubTrack('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedDirection === 'all'
                        ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.35)] light:bg-slate-900 light:text-white'
                        : 'dark:bg-[#06080f]/80 dark:border dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:border light:border-slate-200 light:text-slate-700'
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedDirection === dir.id
                          ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.35)] light:bg-slate-900 light:text-white'
                          : 'dark:bg-[#06080f]/80 dark:border dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-50 light:border light:border-slate-200 light:text-slate-700'
                      }`}
                    >
                      {dir.title.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Sub-tracks */}
              {selectedDirection !== 'all' && (
                <div className="space-y-1.5 pt-1 border-t dark:border-slate-800/60 light:border-slate-100">
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-wider dark:text-slate-400 light:text-slate-500">
                    Специализация:
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setSelectedSubTrack('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap ${
                        selectedSubTrack === 'all'
                          ? 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-400/50 light:bg-sky-100 light:text-sky-800 light:border light:border-sky-300'
                          : 'dark:bg-[#06080f] dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:text-slate-700'
                      }`}
                    >
                      Все ветки
                    </button>
                    {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedSubTrack(st.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap ${
                          selectedSubTrack === st.id
                            ? 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-400/50 light:bg-sky-100 light:text-sky-800 light:border light:border-sky-300'
                            : 'dark:bg-[#06080f] dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-100 light:text-slate-700'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 5: Format & Source selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t dark:border-slate-800/60 light:border-slate-100 text-xs font-mono">
                {/* Format Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="dark:text-slate-400 light:text-slate-500">Формат:</span>
                  {(['all', 'Удаленно', 'Гибрид', 'Офис'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        selectedFormat === fmt
                          ? 'dark:bg-cyan-500/25 dark:text-cyan-300 dark:border dark:border-cyan-500/40 font-bold light:bg-slate-900 light:text-white'
                          : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
                      }`}
                    >
                      {fmt === 'all' ? 'Все' : fmt}
                    </button>
                  ))}
                </div>

                {/* Source Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="dark:text-slate-400 light:text-slate-500">Источник:</span>
                  {(['all', 'telegram', 'portal'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        selectedSource === src
                          ? 'dark:bg-cyan-500/25 dark:text-cyan-300 dark:border dark:border-cyan-500/40 font-bold light:bg-slate-900 light:text-white'
                          : 'dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900'
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
              <div className="flex items-center justify-between text-xs dark:text-slate-400 light:text-slate-600 px-1 font-mono">
                <span>
                  Найдено стажировок: <strong className="dark:text-cyan-300 light:text-slate-900">{filteredInternships.length}</strong>
                </span>
                {isLoadingInternships && (
                  <span className="flex items-center gap-1.5 dark:text-cyan-400 light:text-sky-600">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Синхронизация с Supabase...
                  </span>
                )}
              </div>

              {filteredInternships.length === 0 ? (
                <div className="p-12 text-center rounded-3xl space-y-3 cyber-corner
                  dark:bg-[#0c101c] dark:border dark:border-slate-800 dark:text-slate-300
                  light:bg-white light:border light:border-slate-200 light:text-slate-700"
                >
                  <Briefcase className="w-12 h-12 dark:text-slate-600 light:text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold dark:text-white light:text-slate-900 font-sans">
                    Стажировки по заданным фильтрам не найдены
                  </h3>
                  <p className="text-xs dark:text-slate-400 light:text-slate-500 max-w-md mx-auto">
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
                    className="px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all
                      dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white
                      light:bg-slate-900 light:text-white"
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
        dark:bg-[#06080f] dark:border-slate-800/80 dark:text-slate-400
        light:bg-white light:border-slate-200 light:text-slate-600"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm tracking-wider
              dark:bg-gradient-to-br dark:from-cyan-400 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_12px_rgba(0,240,255,0.35)]
              light:bg-slate-900 light:text-white"
            >
              IT
            </div>
            <div>
              <span className="font-bold dark:text-slate-200 light:text-slate-900 font-sans">IT-Старт © 2026</span>
              <p className="text-[11px] font-mono dark:text-slate-500 light:text-slate-500">
                100% реальные IT-стажировки • Роадмапы • Telegram & VK Боты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-cyan-400 dark:hover:text-cyan-300 light:text-sky-600 light:hover:text-sky-700 flex items-center gap-1"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>TG: @{TELEGRAM_BOT_USERNAME}</span>
            </a>
            <span>•</span>
            <a
              href={GITHUB_PAGES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-slate-300 dark:hover:text-white light:text-slate-700 light:hover:text-black"
            >
              GitHub Pages
            </a>
            <span>•</span>
            <span className="flex items-center gap-1 dark:text-emerald-400 light:text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Supabase Connected
            </span>
            <span>•</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded
              dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-800/50
              light:bg-slate-100 light:text-slate-700 light:border light:border-slate-200"
            >
              CYBERPUNK v2.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
