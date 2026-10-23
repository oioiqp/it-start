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
    <div className="group relative rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col justify-between liquid-glass liquid-glass-interactive overflow-hidden">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {/* Minimalist Matte Glass App Squircle Tile */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 overflow-hidden liquid-glass-tile text-neutral-800 dark:text-neutral-100 transition-transform duration-200 group-hover:scale-[1.02]">
              <span className="relative z-10 select-none">
                {internship.company.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight">
                  {internship.company}
                </span>
                {internship.isHot && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                    <Flame className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                    HOT
                  </span>
                )}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium liquid-glass-pill text-neutral-600 dark:text-neutral-300">
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
            <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold block liquid-glass-pill text-neutral-900 dark:text-white tracking-tight">
              {internship.salary}
            </span>
            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 block mt-0.5 pr-1">
              оплата
            </span>
          </div>
        </div>

        {/* Position Title */}
        <h3 className="text-sm sm:text-base font-bold transition-colors tracking-tight line-clamp-2 mb-2 text-neutral-950 group-hover:text-black dark:text-white dark:group-hover:text-neutral-100 font-sans">
          {internship.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs line-clamp-2 mb-3.5 leading-relaxed text-neutral-600 dark:text-neutral-300 font-normal">
          {internship.description}
        </p>

        {/* Tags (Glass Pills) */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {internship.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors liquid-glass-pill text-neutral-700 dark:text-neutral-300 hover:bg-white/50 cursor-default"
            >
              {tag}
            </span>
          ))}
          {internship.tags.length > 4 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-medium liquid-glass-pill text-neutral-500 dark:text-neutral-400">
              +{internship.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3.5 border-t border-black/5 dark:border-white/5 space-y-3">
        {/* Readiness Bar */}
        <div className="rounded-2xl p-3 liquid-glass-subtle">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              Готовность к стеку:
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 bg-neutral-800 dark:bg-neutral-200"
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
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-800 dark:text-neutral-200"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                    <span>План</span>
                  </button>

                  <a
                    href={verifiedApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-xs"
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
