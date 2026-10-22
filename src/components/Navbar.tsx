import React from 'react';
import {
  Briefcase,
  Map,
  HelpCircle,
  Send,
  Bell,
  ExternalLink,
  Bot,
  Globe,
  CheckCircle,
  Sun,
  Moon,
} from 'lucide-react';
import type { TelegramUser, UserProgress } from '../types';
import { TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_URL } from '../lib/supabase';
import { triggerHaptic } from '../lib/telegram';

interface NavbarProps {
  activeTab: 'internships' | 'roadmaps' | 'questions' | 'telegram';
  setActiveTab: (tab: 'internships' | 'roadmaps' | 'questions' | 'telegram') => void;
  telegramUser: TelegramUser | null;
  userProgress: UserProgress;
  totalTopicsCount: number;
  totalQuestionsCount: number;
  onOpenSubscribeModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  telegramUser,
  userProgress,
  totalTopicsCount,
  totalQuestionsCount,
  onOpenSubscribeModal,
  theme,
  onToggleTheme,
}) => {
  const isTg = !!telegramUser;
  const progressPercent = Math.min(
    100,
    Math.round(
      ((userProgress.completedTopics.length + userProgress.completedQuestions.length) /
        Math.max(1, totalTopicsCount + totalQuestionsCount)) *
        100
    )
  );

  const handleTabClick = (tab: 'internships' | 'roadmaps' | 'questions' | 'telegram') => {
    triggerHaptic('selection');
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel transition-colors duration-200 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/75 dark:bg-[#09090b]/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      {/* Top micro bar */}
      <div className="px-3 py-1.5 text-xs transition-colors duration-200 border-b border-black/[0.04] dark:border-white/[0.05] bg-neutral-100/50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            {isTg ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                TG Mini App: {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name} [UID:{telegramUser.id}]
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                <Globe className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span className="font-medium text-neutral-900 dark:text-neutral-200">IT-Старт Web</span>
                <span className="hidden sm:inline opacity-70">• 100% реальные стажировки топ-компаний РФ</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Feed
            </span>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 active:scale-95
                bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/80 shadow-xs
                dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-750"
            >
              <Bot className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>{isTg ? `@${TELEGRAM_BOT_USERNAME}` : `Бот @${TELEGRAM_BOT_USERNAME}`}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div
            onClick={() => handleTabClick('internships')}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm tracking-tight shadow-sm transition-all duration-200
              bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
            >
              IT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
                  IT-Старт
                </span>
                <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-full font-medium transition-colors
                  bg-neutral-100 text-neutral-600 border border-neutral-200/60
                  dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700/60"
                >
                  2026
                </span>
              </div>
              <p className="text-[11px] hidden sm:block tracking-tight text-neutral-500 dark:text-neutral-400">
                Т-Банк • Контур • Directum • Т1 • VK • Яндекс
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Segmented Capsule Control) */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full transition-colors
            bg-neutral-100/90 border border-neutral-200/80
            dark:bg-neutral-900/90 dark:border-neutral-800/80"
          >
            <button
              onClick={() => handleTabClick('internships')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'internships'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Стажировки</span>
            </button>

            <button
              onClick={() => handleTabClick('roadmaps')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'roadmaps'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Роадмапы</span>
            </button>

            <button
              onClick={() => handleTabClick('questions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'questions'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Вопросы (55+)</span>
            </button>

            <button
              onClick={() => handleTabClick('telegram')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'telegram'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Боты & Парсер</span>
            </button>
          </nav>

          {/* Right Action buttons: Theme Toggle, Progress & Subscribe */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Minimalist Apple Theme Switcher */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full transition-all active:scale-95
                bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80 shadow-xs
                dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-750"
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-neutral-200 transition-transform" />
              ) : (
                <Sun className="w-4 h-4 text-neutral-700 transition-transform" />
              )}
            </button>

            {/* Progress pill */}
            <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs transition-colors
              bg-neutral-100/90 border border-neutral-200/70 text-neutral-700
              dark:bg-neutral-850/80 dark:border-neutral-800 dark:text-neutral-300"
            >
              <CheckCircle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Прогресс:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{progressPercent}%</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 ml-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-neutral-900 dark:bg-white"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Notify Button (Apple Solid Pill) */}
            <button
              onClick={onOpenSubscribeModal}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm active:scale-95 transition-all
                bg-neutral-900 hover:bg-black text-white shadow-xs
                dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950"
              title="Настроить пуш-уведомления в Telegram"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Уведомления в TG</span>
              <span className="sm:hidden font-medium text-xs">TG</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar (Scrollable capsule pills) */}
        <div className="flex md:hidden items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-t text-xs
          border-black/[0.05] dark:border-white/[0.06]"
        >
          <button
            onClick={() => handleTabClick('internships')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
              activeTab === 'internships'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200/80 dark:text-neutral-400 dark:bg-neutral-850'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Стажировки</span>
          </button>
          <button
            onClick={() => handleTabClick('roadmaps')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
              activeTab === 'roadmaps'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200/80 dark:text-neutral-400 dark:bg-neutral-850'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Роадмапы</span>
          </button>
          <button
            onClick={() => handleTabClick('questions')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
              activeTab === 'questions'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200/80 dark:text-neutral-400 dark:bg-neutral-850'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Вопросы</span>
          </button>
          <button
            onClick={() => handleTabClick('telegram')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
              activeTab === 'telegram'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200/80 dark:text-neutral-400 dark:bg-neutral-850'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Боты & Парсер</span>
          </button>
        </div>
      </div>
    </header>
  );
};
