import { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Briefcase,
  Bot,
  RefreshCw,
  X,
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
  saveCachedInternships,
  saveLocalProgress,
  saveLocalTheme,
} from './lib/storage';
import { initTelegramWebApp, triggerHaptic } from './lib/telegram';
import { initVkBridge } from './lib/vkBridge';

export function App() {
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

  // Enforce pure serene light mode (Apple Platinum Minimalist)
  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    root.classList.add('light');
    root.classList.remove('dark');
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#b8c1ce');
    saveLocalTheme('light');
  }, []);

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
    <div className="min-h-screen flex flex-col relative light bg-[#b8c1ce] text-neutral-900 liquid-ambient selection:bg-neutral-950 selection:text-white">
      {/* Soft atmospheric diffused ambient light for frosted glass */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Top subtle sheen */}
        <div className="absolute top-0 inset-x-0 h-[360px] bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />

        {/* Ambient diffusion spheres */}
        <div className="absolute -top-[10%] -right-[5%] w-[680px] h-[680px] sm:w-[900px] sm:h-[900px] rounded-full bg-gradient-to-br from-white/40 via-slate-300/30 to-slate-400/20 blur-[90px] transform-gpu pointer-events-none" />
        <div className="absolute top-[20%] -left-[10%] w-[640px] h-[640px] sm:w-[850px] sm:h-[850px] rounded-full bg-gradient-to-tr from-slate-400/25 via-zinc-300/20 to-slate-300/25 blur-[90px] transform-gpu pointer-events-none" />
        <div className="absolute top-[50%] -right-[6%] w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-gradient-to-bl from-zinc-300/30 via-slate-300/20 to-slate-400/20 blur-[90px] transform-gpu pointer-events-none" />
        <div className="absolute -bottom-[8%] left-[8%] w-[620px] h-[620px] sm:w-[850px] sm:h-[850px] rounded-full bg-gradient-to-tr from-slate-400/25 via-zinc-300/20 to-slate-300/20 blur-[90px] transform-gpu pointer-events-none" />
      </div>

      {/* Content Layer floating on top of ambient canvas */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telegramUser={telegramUser}
        userProgress={userProgress}
        totalTopicsCount={ROADMAP_TOPICS.length}
        totalQuestionsCount={QUESTIONS.length}
        onOpenSubscribeModal={() => {
          triggerHaptic('medium');
          setIsSubscribeModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        {/* TAB 1: INTERNSHIPS FEED */}
        {activeTab === 'internships' && (
          <div className="relative space-y-6">
            {/* Ambient typography watermark behind cards */}
            <div className="absolute inset-x-0 -top-6 h-96 flex items-center justify-center -z-10 pointer-events-none overflow-hidden select-none opacity-[0.03] blur-[0.5px]">
              <span className="text-8xl sm:text-[160px] md:text-[200px] font-black tracking-tighter uppercase select-none leading-none text-slate-700">
                IT-СТАРТ
              </span>
            </div>

            {/* Hero Header - Apple Liquid Glass Minimalist */}
            <div className="relative pt-2 sm:pt-6 pb-2 sm:pb-3 text-center space-y-2.5 select-none">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400" />
                <span>IT Start Web • Агрегатор стажировок IT-компаний РФ</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans text-neutral-900 dark:text-white">
                Агрегатор IT-стажировок
              </h1>
              <p className="text-xs sm:text-sm font-medium leading-relaxed max-w-xl mx-auto text-neutral-800 dark:text-neutral-200">
                Интерактивная дорожная карта • Тренажёры • Проверенные позиции
              </p>
            </div>

            {/* Filter and Search Panel - Liquid Glass Capsule */}
            <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 space-y-4 liquid-glass">
              {/* Row 1: Search & Reset */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1 group">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400 pointer-events-none transition-colors group-focus-within:text-neutral-950 dark:group-focus-within:text-white" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию, компании или технологиям (React, Python, Go, C#, QA)..."
                    className="w-full pl-11 pr-10 py-3 rounded-full text-xs sm:text-sm font-normal transition-all focus:outline-none liquid-glass-subtle focus:bg-white/60 text-neutral-950 placeholder:text-neutral-600 dark:text-white dark:placeholder:text-neutral-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-600 hover:text-neutral-950 dark:hover:text-white transition-colors"
                      title="Очистить поиск"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                    className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>

              {/* Row 2: Company Filter */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                    Работодатель (Топ IT-компании):
                  </span>
                  {selectedCompany !== 'all' && (
                    <button
                      onClick={() => setSelectedCompany('all')}
                      className="text-xs text-neutral-900 hover:text-black dark:text-neutral-200 dark:hover:text-white normal-case font-semibold underline decoration-neutral-400"
                    >
                      Показать все
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedCompany('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                      selectedCompany === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
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
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                            : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        <span>{company}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white dark:bg-black/10 dark:text-neutral-950'
                              : 'bg-black/5 text-neutral-800 dark:bg-white/10 dark:text-neutral-200'
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
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Направление:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => {
                      setSelectedDirection('all');
                      setSelectedSubTrack('all');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                      selectedDirection === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
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
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                        selectedDirection === dir.id
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {dir.title.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Sub-tracks */}
              {selectedDirection !== 'all' && (
                <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Специализация:
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setSelectedSubTrack('all')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                        selectedSubTrack === 'all'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      Все ветки
                    </button>
                    {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedSubTrack(st.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                          selectedSubTrack === st.id
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                            : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 5: Format & Source selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-black/5 dark:border-white/5 text-xs">
                {/* Format Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-semibold">Формат:</span>
                  {(['all', 'Удаленно', 'Гибрид', 'Офис'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-3 py-1 rounded-full transition-all duration-150 active:scale-95 font-semibold ${
                        selectedFormat === fmt
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {fmt === 'all' ? 'Все' : fmt}
                    </button>
                  ))}
                </div>

                {/* Source Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-semibold">Источник:</span>
                  {(['all', 'telegram', 'portal'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-3 py-1 rounded-full transition-all duration-150 active:scale-95 font-semibold ${
                        selectedSource === src
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
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
                <div className="p-12 text-center rounded-[28px] sm:rounded-[32px] space-y-3 liquid-glass text-neutral-700 dark:text-neutral-300">
                  <Briefcase className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto" />
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
                      dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 shadow-xs"
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
      <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 text-xs mt-12 transition-colors border-t border-black/5 dark:border-white/5 liquid-glass-subtle text-neutral-800 dark:text-neutral-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shadow-xs
              bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
            >
              IT
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 font-sans">IT-Старт © 2026</span>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                100% реальные IT-стажировки • Роадмапы • Telegram & VK Боты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-800 hover:text-black dark:text-neutral-200 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>TG: @{TELEGRAM_BOT_USERNAME}</span>
            </a>
            <span>•</span>
            <a
              href={GITHUB_PAGES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-800 hover:text-black dark:text-neutral-200 dark:hover:text-white transition-colors"
            >
              GitHub Pages
            </a>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Supabase Connected
            </span>
            <span>•</span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
              Liquid Glass iOS
            </span>
          </div>
        </div>
      </footer>
    </div>
  </div>
);
}

export default App;
