import React from 'react';
import {
  Briefcase,
  Map,
  HelpCircle,
  Send,
  Bot,
} from 'lucide-react';
import type { TelegramUser, UserProgress } from '../types';
import type { VkUser } from '../lib/vkBridge';
import { triggerHaptic } from '../lib/telegram';

interface NavbarProps {
  activeTab: 'internships' | 'roadmaps' | 'questions' | 'telegram';
  setActiveTab: (tab: 'internships' | 'roadmaps' | 'questions' | 'telegram') => void;
  telegramUser?: TelegramUser | null;
  vkUser?: VkUser | null;
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
  vkUser,
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
        className="pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full transition-all duration-300 max-w-5xl w-full sm:w-auto liquid-glass-nav"
      >
        {/* Brand / Logo (Minimalist & Clean) */}
        <div
          onClick={() => handleTabClick('internships')}
          className="flex items-center gap-2 pl-2 pr-1.5 sm:pr-2.5 py-1 cursor-pointer select-none group shrink-0"
          title="IT-Старт Главная"
        >
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-200 group-hover:scale-105 shadow-xs
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
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10'
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

        {/* Right Controls: User Profile & Bot / Notifications Action Capsule */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          {vkUser ? (
            <div
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-blue-500/20 text-neutral-900 dark:text-white select-none shrink-0"
              title={`VK: ${vkUser.first_name || ''} ${vkUser.last_name || ''} (ID: ${vkUser.id})`}
            >
              {vkUser.photo_100 || vkUser.photo_200 ? (
                <img
                  src={vkUser.photo_100 || vkUser.photo_200}
                  alt={vkUser.first_name || 'VK'}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-blue-500/40"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  VK
                </div>
              )}
              <span className="text-xs font-semibold hidden md:inline truncate max-w-[100px]">
                {vkUser.first_name || 'VK'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Mini App
              </span>
            </div>
          ) : telegramUser ? (
            <div
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-sky-50/80 dark:bg-sky-950/40 border border-sky-500/20 text-neutral-900 dark:text-white select-none shrink-0"
              title={`Telegram: ${telegramUser.first_name || ''} (@${telegramUser.username || ''})`}
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center">
                TG
              </div>
              <span className="text-xs font-semibold hidden md:inline truncate max-w-[100px]">
                {telegramUser.first_name || 'Telegram'}
              </span>
            </div>
          ) : null}

          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenSubscribeModal();
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs transition-all duration-150 active:scale-95 shadow-xs
              bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            title={
              vkUser
                ? `VK: ${vkUser.first_name || ''} ${vkUser.last_name || ''} (ID: ${vkUser.id}) • Уведомления`
                : telegramUser
                ? `Telegram: ${telegramUser.username ? '@' + telegramUser.username : telegramUser.first_name || 'Подключен'}`
                : 'Боты и уведомления'
            }
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{vkUser ? 'VK Бот' : 'Бот в TG'}</span>
            <span className="sm:hidden font-medium">{vkUser ? 'VK' : 'TG'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
