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
    <div className="group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between cyber-corner
      dark:bg-[#0b0f1a]/95 dark:border dark:border-cyan-500/20 dark:hover:border-cyan-400/80 dark:hover:shadow-[0_0_24px_rgba(0,240,255,0.22)] dark:text-cyan-400
      light:bg-white light:border light:border-slate-200 light:hover:border-sky-400 light:hover:shadow-xl light:shadow-sm light:text-sky-600"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 overflow-hidden transition-colors
              dark:bg-[#12192c] dark:border dark:border-cyan-500/30 dark:text-cyan-300
              light:bg-slate-100 light:border light:border-slate-200 light:text-slate-800"
            >
              {internship.company.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm dark:text-slate-100 light:text-slate-900 font-sans">
                  {internship.company}
                </span>
                {internship.isHot && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase
                    dark:bg-rose-500/15 dark:text-rose-400 dark:border dark:border-rose-500/30
                    light:bg-rose-50 light:text-rose-600 light:border light:border-rose-200"
                  >
                    <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
                    HOT
                  </span>
                )}
                <span className="font-mono text-[9px] px-1 py-0.2 rounded uppercase dark:bg-slate-800/80 dark:text-slate-400 light:bg-slate-100 light:text-slate-500">
                  REAL
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs dark:text-slate-400 light:text-slate-500 mt-0.5 flex-wrap font-mono text-[11px]">
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
            <span className="text-xs sm:text-sm font-mono font-bold block
              dark:text-emerald-400 dark:drop-shadow-[0_0_8px_rgba(0,255,157,0.3)]
              light:text-emerald-700"
            >
              {internship.salary}
            </span>
            <span className="text-[10px] font-mono uppercase dark:text-slate-500 light:text-slate-400">
              оплата
            </span>
          </div>
        </div>

        {/* Position Title */}
        <h3 className="text-sm sm:text-base font-bold transition-colors tracking-tight line-clamp-2 mb-2
          dark:text-white dark:group-hover:text-cyan-300
          light:text-slate-900 light:group-hover:text-sky-600 font-sans"
        >
          {internship.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs line-clamp-2 mb-3 leading-relaxed dark:text-slate-300 light:text-slate-600">
          {internship.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {internship.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors
                dark:bg-[#06080f] dark:border dark:border-slate-800 dark:text-slate-300 dark:group-hover:border-cyan-500/30
                light:bg-slate-50 light:border light:border-slate-200 light:text-slate-700"
            >
              {tag}
            </span>
          ))}
          {internship.tags.length > 4 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono dark:text-slate-500 dark:bg-[#06080f] light:text-slate-400 light:bg-slate-100">
              +{internship.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3 border-t transition-colors space-y-3
        dark:border-slate-800/80
        light:border-slate-100"
      >
        {/* Readiness Bar */}
        <div className="rounded-xl p-2.5 transition-colors
          dark:bg-[#06080f] dark:border dark:border-slate-800/80
          light:bg-slate-50 light:border light:border-slate-200"
        >
          <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
            <span className="flex items-center gap-1 dark:text-slate-300 light:text-slate-600">
              <Sparkles className="w-3 h-3 dark:text-cyan-400 light:text-sky-600" />
              Готовность к стеку:
            </span>
            <span className="font-bold dark:text-cyan-300 light:text-sky-600">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden dark:bg-slate-800 light:bg-slate-200">
            <div
              className="h-full rounded-full transition-all duration-500
                dark:bg-gradient-to-r dark:from-cyan-400 dark:to-emerald-400 dark:shadow-[0_0_8px_rgba(0,240,255,0.4)]
                light:bg-gradient-to-r light:from-sky-500 light:to-emerald-500"
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
              className="flex items-center gap-1 text-[11px] font-mono transition-colors font-medium truncate group/ch
                dark:text-slate-400 dark:hover:text-cyan-300
                light:text-slate-500 light:hover:text-sky-600"
              title={`Открыть Telegram-канал ${internship.sourceChannel}`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0 dark:text-cyan-400 light:text-sky-600" />
              <span className="truncate underline dark:decoration-slate-700 dark:group-hover/ch:decoration-cyan-400 light:decoration-slate-300 light:group-hover/ch:decoration-sky-500">
                {internship.sourceChannel}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-mono dark:text-slate-400 light:text-slate-500 font-medium truncate">
              <Bot className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{internship.sourceChannel}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOpenPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95
                dark:bg-[#131b2e] dark:hover:bg-[#1a253e] dark:border dark:border-cyan-500/30 dark:hover:border-cyan-400 dark:text-cyan-200 dark:hover:shadow-[0_0_10px_rgba(0,240,255,0.25)]
                light:bg-slate-100 light:hover:bg-slate-200 light:border light:border-slate-300 light:text-slate-800"
            >
              <GraduationCap className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
              <span>План</span>
            </button>

            <a
              href={internship.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95
                dark:bg-gradient-to-r dark:from-cyan-500 dark:to-emerald-400 dark:hover:from-cyan-400 dark:hover:to-emerald-300 dark:text-black dark:shadow-[0_0_14px_rgba(0,240,255,0.35)]
                light:bg-slate-900 light:hover:bg-slate-800 light:text-white light:shadow-sm"
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
