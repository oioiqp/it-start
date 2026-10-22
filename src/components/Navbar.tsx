import React from 'react';
import {
  Briefcase,
  Map,
  HelpCircle,
  Send,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import type { TelegramUser, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';

interface NavbarProps {
  activeTab: 'internships' | 'roadmaps' | 'questions' | 'telegram';
  setActiveTab: (tab: 'internships' | 'roadmaps' | 'questions' | 'telegram') => void;
  telegramUser?: TelegramUser | null;
  userProgress?: UserProgress;
  totalTopicsCount?: number;
  totalQuestionsCount?: number;
  onOpenSubscribeModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  telegramUser,
  onOpenSubscribeModal,
  theme,
  onToggleTheme,
}) => {
  const handleTabClick = (tab: 'internships' | 'roadmaps' | 'questions' | 'telegram') => {
    triggerHaptic('selection');
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navTabs = [
    { id: 'internships' as const, label: 'Стажировки', icon: Briefcase },
    { id: 'roadmaps' as const, label: 'Роадмапы', icon: Map },
    { id: 'questions' as const, label: 'Тренажёр', icon: HelpCircle },
    { id: 'telegram' as const, label: 'Парсер', icon: Send },
  ];

  return (
    <header className="sticky top-2 sm:top-4 z-50 flex items-center justify-center px-2.5 sm:px-4 w-full pointer-events-none">
      <div
        className="pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full transition-all duration-300 max-w-5xl w-full sm:w-auto liquid-glass-nav"
      >
        {/* Brand / Logo (Minimalist & Clean) */}
        <div
          onClick={() => handleTabClick('internships')}
          className="flex items-center gap-2 pl-2 pr-1.5 sm:pr-2.5 py-1 cursor-pointer select-none group shrink-0"
          title="IT-Старт Главная"
        >
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-200 group-hover:scale-105 shadow-sm
              bg-neutral-900 text-white dark:bg-white dark:text-black"
          >
            IT
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight hidden sm:inline text-neutral-900 dark:text-white">
            IT-Старт
          </span>
        </div>

        {/* Subtle Divider */}
        <div className="h-4 w-px shrink-0 mx-0.5 bg-black/10 dark:bg-white/10" />

        {/* Center Navigation Tabs - Uniform style, height and rounded-full pill indicator */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-black dark:shadow-md'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Subtle Divider */}
        <div className="h-4 w-px shrink-0 mx-0.5 bg-black/10 dark:bg-white/10" />

        {/* Right Controls: Theme Switcher + Telegram Bot / Notifications Pill */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pr-1">
          {/* Apple Minimalist Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90
              text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60
              dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/[0.1]"
            title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-white" />
            ) : (
              <Sun className="w-4 h-4 text-neutral-800" />
            )}
          </button>

          {/* Solid Pill Action Button (Matches Reference Image "Download" Button) */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenSubscribeModal();
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs transition-all duration-200 active:scale-95 shadow-md
              bg-neutral-900 hover:bg-black text-white
              dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            title={telegramUser ? `Telegram: ${telegramUser.username ? '@' + telegramUser.username : telegramUser.first_name || 'Подключен'}` : 'Telegram-бот и уведомления'}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Бот в TG</span>
            <span className="sm:hidden font-medium">TG</span>
          </button>
        </div>
      </div>
    </header>
  );
};
