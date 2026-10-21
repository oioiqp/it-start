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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md transition-colors duration-200 border-b dark:bg-[#06080f]/92 dark:border-cyan-500/20 dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] light:bg-white/95 light:border-slate-200 light:shadow-sm">
      {/* Top micro bar for Telegram Mini App / External Bot link */}
      <div className="px-3 py-1.5 text-xs transition-colors duration-200 border-b dark:bg-[#090d18]/80 dark:border-slate-800/80 dark:text-slate-300 light:bg-slate-100/90 light:border-slate-200 light:text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            {isTg ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold dark:bg-emerald-500/15 dark:border dark:border-emerald-500/30 dark:text-emerald-400 light:bg-emerald-50 light:border light:border-emerald-200 light:text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                TG Mini App: {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name} [UID:{telegramUser.id}]
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] dark:text-slate-400 light:text-slate-600">
                <Globe className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
                <span className="font-semibold">IT-Старт Web</span>
                <span className="hidden sm:inline opacity-70">• 100% реальные стажировки топ-компаний РФ</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded dark:bg-cyan-950/40 dark:border dark:border-cyan-500/30 dark:text-cyan-300 light:bg-sky-50 light:border light:border-sky-200 light:text-sky-700">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              LIVE FEED
            </span>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 active:scale-95
                dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border dark:border-cyan-500/30 dark:hover:border-cyan-400 dark:hover:shadow-[0_0_10px_rgba(0,240,255,0.25)]
                light:bg-white light:hover:bg-slate-50 light:text-slate-700 light:border light:border-slate-300 light:hover:border-sky-500 light:shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
              <span>{isTg ? `@${TELEGRAM_BOT_USERNAME}` : `Бот @${TELEGRAM_BOT_USERNAME}`}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div
            onClick={() => handleTabClick('internships')}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm tracking-wider shadow-sm transition-all duration-200
              dark:bg-gradient-to-br dark:from-cyan-400 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.4)]
              light:bg-slate-900 light:text-white light:shadow-md"
            >
              IT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight dark:text-white light:text-slate-900 font-sans">
                  IT-Старт
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-bold transition-colors
                  dark:bg-cyan-500/15 dark:text-cyan-300 dark:border dark:border-cyan-500/30
                  light:bg-sky-100 light:text-sky-800 light:border light:border-sky-200"
                >
                  {theme === 'dark' ? 'NEO-HUD' : 'LAB'}
                </span>
              </div>
              <p className="text-[11px] hidden sm:block font-mono tracking-tight dark:text-slate-400 light:text-slate-500">
                Т-Банк • Контур • Directum • Т1 • VK
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl transition-colors
            dark:bg-[#0c101c]/90 dark:border dark:border-slate-800
            light:bg-slate-100 light:border light:border-slate-200"
          >
            <button
              onClick={() => handleTabClick('internships')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'internships'
                  ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.35)] light:bg-white light:text-sky-700 light:shadow-sm light:border light:border-slate-200'
                  : 'dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Стажировки</span>
            </button>

            <button
              onClick={() => handleTabClick('roadmaps')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'roadmaps'
                  ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.35)] light:bg-white light:text-sky-700 light:shadow-sm light:border light:border-slate-200'
                  : 'dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/60'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Роадмапы</span>
            </button>

            <button
              onClick={() => handleTabClick('questions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'questions'
                  ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.35)] light:bg-white light:text-sky-700 light:shadow-sm light:border light:border-slate-200'
                  : 'dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/60'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Вопросы (55+)</span>
            </button>

            <button
              onClick={() => handleTabClick('telegram')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'telegram'
                  ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.35)] light:bg-white light:text-sky-700 light:shadow-sm light:border light:border-slate-200'
                  : 'dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-800/50 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200/60'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Боты & Парсер</span>
            </button>
          </nav>

          {/* Right Action buttons: Theme Toggle, Progress & Subscribe */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Cyberpunk Theme Switcher */}
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95
                dark:bg-[#0c101c] dark:border dark:border-cyan-500/40 dark:text-cyan-300 dark:hover:border-cyan-300 dark:hover:shadow-[0_0_14px_rgba(0,240,255,0.35)]
                light:bg-white light:border light:border-slate-300 light:text-slate-700 light:hover:border-sky-500 light:hover:text-sky-700 light:shadow-sm"
              title={theme === 'dark' ? 'Переключить на светлую кибер-тему (High-Tech Lab)' : 'Переключить на тёмную кибер-тему (Obsidian HUD)'}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-cyan-400 transition-transform group-hover:rotate-12" />
                  <span className="hidden xl:inline text-[11px] tracking-wider">[DARK]</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500 transition-transform group-hover:rotate-45" />
                  <span className="hidden xl:inline text-[11px] tracking-wider">[LIGHT]</span>
                </>
              )}
            </button>

            {/* Progress pill */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors
              dark:bg-[#0c101c] dark:border dark:border-slate-800 dark:text-slate-300
              light:bg-slate-100 light:border light:border-slate-200 light:text-slate-700"
            >
              <CheckCircle className="w-4 h-4 dark:text-emerald-400 light:text-emerald-600" />
              <div>
                <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
                  <span>База знаний</span>
                  <span className="font-bold dark:text-cyan-400 light:text-sky-600">{progressPercent}%</span>
                </div>
                <div className="w-20 h-1.5 rounded-full overflow-hidden mt-1 dark:bg-slate-800 light:bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-emerald-400 light:bg-gradient-to-r light:from-sky-500 light:to-emerald-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Notify Button */}
            <button
              onClick={onOpenSubscribeModal}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl font-medium text-xs sm:text-sm active:scale-95 transition-all
                dark:bg-gradient-to-r dark:from-cyan-500 dark:via-indigo-600 dark:to-sky-500 dark:hover:from-cyan-400 dark:hover:to-sky-400 dark:text-white dark:shadow-[0_0_15px_rgba(0,240,255,0.3)]
                light:bg-slate-900 light:hover:bg-slate-800 light:text-white light:shadow-sm"
              title="Настроить пуш-уведомления в Telegram"
            >
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span className="hidden sm:inline">Уведомления в TG</span>
              <span className="sm:hidden font-mono text-xs">TG</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar (Scrollable tabs) */}
        <div className="flex md:hidden items-center gap-1.5 py-2 overflow-x-auto no-scrollbar border-t text-xs
          dark:border-slate-800/60
          light:border-slate-200"
        >
          <button
            onClick={() => handleTabClick('internships')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'internships'
                ? 'dark:bg-cyan-500 dark:text-black dark:font-bold light:bg-slate-900 light:text-white'
                : 'dark:text-slate-400 dark:bg-slate-900/60 light:text-slate-600 light:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Стажировки</span>
          </button>
          <button
            onClick={() => handleTabClick('roadmaps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'roadmaps'
                ? 'dark:bg-cyan-500 dark:text-black dark:font-bold light:bg-slate-900 light:text-white'
                : 'dark:text-slate-400 dark:bg-slate-900/60 light:text-slate-600 light:bg-slate-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Роадмапы</span>
          </button>
          <button
            onClick={() => handleTabClick('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'questions'
                ? 'dark:bg-cyan-500 dark:text-black dark:font-bold light:bg-slate-900 light:text-white'
                : 'dark:text-slate-400 dark:bg-slate-900/60 light:text-slate-600 light:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Вопросы</span>
          </button>
          <button
            onClick={() => handleTabClick('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'telegram'
                ? 'dark:bg-cyan-500 dark:text-black dark:font-bold light:bg-slate-900 light:text-white'
                : 'dark:text-slate-400 dark:bg-slate-900/60 light:text-slate-600 light:bg-slate-100'
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
