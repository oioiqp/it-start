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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  telegramUser,
  userProgress,
  totalTopicsCount,
  totalQuestionsCount,
  onOpenSubscribeModal,
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/90 border-b border-slate-800 transition-all">
      {/* Top micro bar for Telegram Mini App / External Bot link */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 py-1.5 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            {isTg ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Telegram Mini App: {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name} (ID: {telegramUser.id})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Веб-версия IT-Старт
                <span className="hidden sm:inline text-slate-500">• Доступен официальный бот</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors font-medium text-xs"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
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
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
              IT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">
                  IT-Старт
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  WebApp
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Стажировки • Роадмапы • TG-бот
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleTabClick('internships')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'internships'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Стажировки</span>
            </button>

            <button
              onClick={() => handleTabClick('roadmaps')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'roadmaps'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Роадмапы</span>
            </button>

            <button
              onClick={() => handleTabClick('questions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'questions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Вопросы (55+)</span>
            </button>

            <button
              onClick={() => handleTabClick('telegram')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'telegram'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Боты & Парсер</span>
            </button>
          </nav>

          {/* Right Action buttons: Progress & Subscribe */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Progress pill */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="flex items-center justify-between gap-3 text-slate-300">
                  <span className="font-medium">Прогресс базы</span>
                  <span className="font-bold text-emerald-400">{progressPercent}%</span>
                </div>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Notify Button */}
            <button
              onClick={onOpenSubscribeModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              title="Настроить пуш-уведомления в Telegram"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="hidden sm:inline">Уведомления в TG</span>
              <span className="sm:hidden">В TG</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar (Scrollable tabs) */}
        <div className="flex md:hidden items-center gap-1.5 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/60 text-xs">
          <button
            onClick={() => handleTabClick('internships')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'internships'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 bg-slate-900/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Стажировки</span>
          </button>
          <button
            onClick={() => handleTabClick('roadmaps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'roadmaps'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 bg-slate-900/60'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Роадмапы</span>
          </button>
          <button
            onClick={() => handleTabClick('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 bg-slate-900/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Вопросы</span>
          </button>
          <button
            onClick={() => handleTabClick('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === 'telegram'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 bg-slate-900/60'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>Боты & Парсер</span>
          </button>
        </div>
      </div>
    </header>
  );
};
