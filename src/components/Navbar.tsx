import React from 'react';
import {
  Briefcase,
  Map,
  HelpCircle,
  Send,
  Bot,
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
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  telegramUser,
  onOpenSubscribeModal,
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
    <header className="sticky top-2.5 sm:top-4 z-50 flex items-center justify-center px-3 sm:px-4 w-full pointer-events-none">
      <div
        className="pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full transition-all duration-300 max-w-5xl w-full sm:w-auto liquid-glass-nav shadow-lg"
      >
        {/* Brand / Logo (Minimalist & Clean) */}
        <div
          onClick={() => handleTabClick('internships')}
          className="flex items-center gap-2 pl-2 pr-1.5 sm:pr-2.5 py-1 cursor-pointer select-none group shrink-0"
          title="IT-Старт Главная"
        >
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs tracking-tight transition-transform duration-200 group-hover:scale-105 shadow-sm
              bg-neutral-950 text-white dark:bg-white dark:text-black border border-white/20"
          >
            IT
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-tight hidden sm:inline text-neutral-950 dark:text-white">
            IT-Старт
          </span>
        </div>

        {/* Subtle Divider */}
        <div className="h-4 w-px shrink-0 mx-0.5 bg-black/15 dark:bg-white/15" />

        {/* Center Navigation Tabs - Uniform style, height and rounded-full pill indicator */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-neutral-950 text-white shadow-md dark:bg-white dark:text-black dark:shadow-md border border-white/20 dark:border-white/40'
                    : 'text-neutral-800 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Subtle Divider */}
        <div className="h-4 w-px shrink-0 mx-0.5 bg-black/15 dark:bg-white/15" />

        {/* Right Controls: Telegram Bot / Notifications Action Capsule */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenSubscribeModal();
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all duration-150 active:scale-95 shadow-sm
              bg-neutral-950 hover:bg-black text-white border border-white/20 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
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
