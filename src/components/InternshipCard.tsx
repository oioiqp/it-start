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

interface InternshipCardProps {
  internship: Internship;
  userProgress: UserProgress;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  onOpenPlan: (internship: Internship) => void;
}

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

  return (
    <div className="group relative rounded-3xl p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between
      bg-white/80 border border-neutral-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.08)] hover:border-neutral-300
      dark:bg-neutral-900/60 dark:border-neutral-800/80 dark:hover:border-neutral-700/80 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden transition-colors
              bg-neutral-100 border border-neutral-200/60 text-neutral-800
              dark:bg-neutral-800 dark:border-neutral-700/60 dark:text-neutral-200"
            >
              {internship.company.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 font-sans">
                  {internship.company}
                </span>
                {internship.isHot && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                    bg-rose-500/10 text-rose-600 border border-rose-500/20
                    dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                  >
                    <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
                    HOT
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/60 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700/60">
                  Верифицировано
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex-wrap">
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

          {/* Salary */}
          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-semibold block text-neutral-900 dark:text-white">
              {internship.salary}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
              оплата
            </span>
          </div>
        </div>

        {/* Position Title */}
        <h3 className="text-sm sm:text-base font-semibold transition-colors tracking-tight line-clamp-2 mb-2
          text-neutral-900 group-hover:text-neutral-700
          dark:text-white dark:group-hover:text-neutral-300 font-sans"
        >
          {internship.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs line-clamp-2 mb-3.5 leading-relaxed text-neutral-600 dark:text-neutral-400">
          {internship.description}
        </p>

        {/* Tags (Capsule Pills) */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {internship.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors
                bg-neutral-100/90 text-neutral-700 border border-neutral-200/60
                dark:bg-neutral-800/80 dark:text-neutral-300 dark:border-neutral-700/60"
            >
              {tag}
            </span>
          ))}
          {internship.tags.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-neutral-500 bg-neutral-100/80 border border-neutral-200/50 dark:text-neutral-400 dark:bg-neutral-800/60 dark:border-neutral-700/50">
              +{internship.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3.5 border-t border-neutral-200/70 dark:border-neutral-800/70 space-y-3">
        {/* Readiness Bar */}
        <div className="rounded-2xl p-2.5 transition-colors
          bg-neutral-50/90 border border-neutral-200/60
          dark:bg-neutral-850/60 dark:border-neutral-800/60"
        >
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <Sparkles className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              Готовность к стеку:
            </span>
            <span className="font-semibold text-neutral-900 dark:text-white">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full rounded-full transition-all duration-500 bg-neutral-900 dark:bg-white"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        {/* Source and Actions */}
        <div className="flex items-center justify-between gap-2">
          {internship.sourceChannel.startsWith('@') ? (
            <a
              href={`https://t.me/${internship.sourceChannel.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium truncate text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              title={`Открыть Telegram-канал ${internship.sourceChannel}`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="truncate underline decoration-neutral-300 dark:decoration-neutral-700">
                {internship.sourceChannel}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
              <Bot className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{internship.sourceChannel}</span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenPlan}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95
                bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/80 shadow-xs
                dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-700"
            >
              <GraduationCap className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>План</span>
            </button>

            <a
              href={internship.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95
                bg-neutral-900 hover:bg-black text-white shadow-xs
                dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950"
              title={`Подать заявку на официальном сайте ${internship.company}`}
            >
              <span>Отклик</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
