import React from 'react';
import {
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
  Bot,
  GraduationCap,
} from 'lucide-react';
import type { Internship, Question, RoadmapTopic, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { resolveApplyUrl, resolveChannelHandle } from '../lib/vacancyUrl';

interface InternshipCardProps {
  internship: Internship;
  userProgress: UserProgress;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  onOpenPlan: (internship: Internship) => void;
}

// Brand accents for authentic Apple App Library Squircle Tiles
const getCompanyTileStyle = (companyName: string) => {
  const c = companyName.toLowerCase();
  if (c.includes('т-банк') || c.includes('тиньк') || c.includes('tbank')) {
    return {
      bg: 'from-amber-400/30 via-yellow-300/20 to-amber-500/10',
      text: 'text-amber-950',
      glow: 'shadow-[0_0_16px_rgba(251,191,36,0.22)]',
    };
  }
  if (c.includes('т1') || c.includes('t1')) {
    return {
      bg: 'from-indigo-500/30 via-blue-400/20 to-indigo-600/10',
      text: 'text-indigo-950',
      glow: 'shadow-[0_0_16px_rgba(99,102,241,0.22)]',
    };
  }
  if (c.includes('контур') || c.includes('kontur')) {
    return {
      bg: 'from-purple-500/30 via-fuchsia-400/20 to-purple-600/10',
      text: 'text-purple-950',
      glow: 'shadow-[0_0_16px_rgba(168,85,247,0.22)]',
    };
  }
  if (c.includes('directum') || c.includes('директ')) {
    return {
      bg: 'from-teal-500/30 via-cyan-400/20 to-emerald-500/10',
      text: 'text-teal-950',
      glow: 'shadow-[0_0_16px_rgba(20,184,166,0.22)]',
    };
  }
  if (c.includes('яндекс') || c.includes('yandex')) {
    return {
      bg: 'from-rose-500/30 via-red-400/20 to-orange-500/10',
      text: 'text-rose-950',
      glow: 'shadow-[0_0_16px_rgba(244,63,94,0.22)]',
    };
  }
  if (c.includes('ozon') || c.includes('озон')) {
    return {
      bg: 'from-blue-600/30 via-cyan-400/20 to-sky-500/10',
      text: 'text-blue-950',
      glow: 'shadow-[0_0_16px_rgba(37,99,235,0.22)]',
    };
  }
  if (c.includes('сбер') || c.includes('sber')) {
    return {
      bg: 'from-emerald-500/30 via-green-400/20 to-teal-500/10',
      text: 'text-emerald-950',
      glow: 'shadow-[0_0_16px_rgba(16,185,129,0.22)]',
    };
  }
  if (c.includes('авито') || c.includes('avito')) {
    return {
      bg: 'from-violet-500/30 via-purple-400/20 to-pink-500/10',
      text: 'text-violet-950',
      glow: 'shadow-[0_0_16px_rgba(139,92,246,0.22)]',
    };
  }
  if (c.includes('vk') || c.includes('вк')) {
    return {
      bg: 'from-sky-500/30 via-blue-400/20 to-indigo-500/10',
      text: 'text-sky-950',
      glow: 'shadow-[0_0_16px_rgba(14,165,233,0.22)]',
    };
  }
  return {
    bg: 'from-slate-400/25 via-zinc-300/20 to-slate-500/10',
    text: 'text-neutral-950',
    glow: 'shadow-xs',
  };
};

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  userProgress,
  roadmapTopics,
  questions,
  onOpenPlan,
}) => {
  // Compute readiness percentage
  const relevantTopics = roadmapTopics.filter(
    (t) =>
      t.directionId === internship.directionId &&
      (t.category === 'core' || t.subTrackId === internship.subTrackId)
  );

  const relevantQuestions = questions.filter(
    (q) =>
      q.directionId === internship.directionId &&
      (q.subTrackId === 'core' || q.subTrackId === internship.subTrackId)
  );

  const totalItems = relevantTopics.length + relevantQuestions.length;
  const completedCount =
    relevantTopics.filter((t) => userProgress.completedTopics.includes(t.id)).length +
    relevantQuestions.filter((q) => userProgress.completedQuestions.includes(q.id)).length;

  const readinessPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const handleOpenPlan = () => {
    triggerHaptic('medium');
    onOpenPlan(internship);
  };

  const tileStyle = getCompanyTileStyle(internship.company);

  return (
    <div className="group relative rounded-[32px] sm:rounded-[36px] p-5 sm:p-6 flex flex-col justify-between liquid-glass liquid-glass-interactive overflow-hidden shadow-lg">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {/* Apple Squircle Glass App Tile (matches App Library folders in reference image) */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 overflow-hidden liquid-glass-tile ${tileStyle.text} ${tileStyle.glow} transition-all duration-300 group-hover:scale-105 group-hover:rotate-1`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${tileStyle.bg} pointer-events-none`} />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/35 to-white/70 pointer-events-none" />
              <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                {internship.company.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight">
                  {internship.company}
                </span>
                {internship.isHot && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold liquid-glass-pill bg-rose-500/20 text-rose-700 border border-rose-500/40 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-400/40 shadow-xs">
                    <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
                    HOT
                  </span>
                )}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200 border border-white/70 dark:border-white/20">
                  Верифицировано
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 opacity-70" />
                  {internship.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-70" />
                  {internship.format}
                </span>
              </div>
            </div>
          </div>

          {/* Salary Glass Pill */}
          <div className="text-right shrink-0">
            <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold block liquid-glass-pill border border-white/80 dark:border-white/25 text-neutral-950 dark:text-white tracking-tight shadow-xs">
              {internship.salary}
            </span>
            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 block mt-0.5 pr-1">
              оплата
            </span>
          </div>
        </div>

        {/* Position Title */}
        <h3 className="text-sm sm:text-base font-extrabold transition-colors tracking-tight line-clamp-2 mb-2 text-neutral-950 group-hover:text-black dark:text-white dark:group-hover:text-neutral-100 font-sans">
          {internship.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs line-clamp-2 mb-3.5 leading-relaxed text-neutral-700 dark:text-neutral-300 font-normal">
          {internship.description}
        </p>

        {/* Tags (Glass Pills) */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {internship.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all liquid-glass-pill text-neutral-800 dark:text-neutral-200 hover:bg-white/60 dark:hover:bg-white/20 border border-white/60 dark:border-white/20 active:scale-95 cursor-default"
            >
              {tag}
            </span>
          ))}
          {internship.tags.length > 4 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-600 dark:text-neutral-400 border border-white/40 dark:border-white/15">
              +{internship.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3.5 border-t border-white/60 dark:border-white/10 space-y-3">
        {/* Readiness Bar */}
        <div className="rounded-2xl p-3 transition-colors liquid-glass-subtle border border-white/60 dark:border-white/15">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-semibold">
              <Sparkles className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              Готовность к стеку:
            </span>
            <span className="font-extrabold text-neutral-950 dark:text-white">{readinessPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/15 p-0.5 border border-white/40 dark:border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        {/* Source and Actions */}
        <div className="flex items-center justify-between gap-2">
          {(() => {
            const verifiedApplyUrl = resolveApplyUrl(internship.applyUrl, internship.company);
            const verifiedChannel = resolveChannelHandle(internship.sourceChannel, internship.company);
            const cleanChannel = verifiedChannel.replace(/^@/, '');

            return (
              <>
                {verifiedChannel.startsWith('@') ? (
                  <a
                    href={`https://t.me/${cleanChannel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold truncate text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                    title={`Открыть проверенный Telegram-канал ${verifiedChannel}`}
                  >
                    <Bot className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <span className="truncate underline decoration-neutral-300 dark:decoration-neutral-700">
                      {verifiedChannel}
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium truncate">
                    <Bot className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{verifiedChannel}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenPlan}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 liquid-glass-pill hover:bg-white/60 dark:hover:bg-white/25 text-neutral-900 dark:text-white border border-white/80 dark:border-white/25 shadow-xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                    <span>План</span>
                  </button>

                  <a
                    href={verifiedApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs font-extrabold transition-all active:scale-95 bg-neutral-950 hover:bg-black text-white shadow-md dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 border border-white/30 dark:border-white/80"
                    title={`Подать заявку на официальном сайте ${internship.company}`}
                  >
                    <span>Отклик</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
