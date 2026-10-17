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
    <div className="group relative bg-slate-900 hover:bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm shrink-0 overflow-hidden">
              {internship.company.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-slate-200">{internship.company}</span>
                {internship.isHot && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Flame className="w-3 h-3 text-rose-400" />
                    HOT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {internship.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {internship.format}
                </span>
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-bold text-emerald-400 block">
              {internship.salary}
            </span>
            <span className="text-[10px] text-slate-500">оплата</span>
          </div>
        </div>

        {/* Position Title */}
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-2 mb-2">
          {internship.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {internship.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {internship.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-950 border border-slate-800 text-slate-300"
            >
              {tag}
            </span>
          ))}
          {internship.tags.length > 4 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-500 bg-slate-950">
              +{internship.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        {/* Readiness Bar */}
        <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Готовность к стеку:
            </span>
            <span className="font-bold text-indigo-300">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
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
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 transition-colors font-medium truncate group"
              title={`Открыть Telegram-канал ${internship.sourceChannel}`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0 text-sky-400/80 group-hover:text-sky-300" />
              <span className="truncate underline decoration-slate-700 group-hover:decoration-sky-400">{internship.sourceChannel}</span>
            </a>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
              <Bot className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{internship.sourceChannel}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOpenPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 text-xs font-medium transition-all active:scale-95"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>План подготовки</span>
            </button>

            <a
              href={internship.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all active:scale-95"
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
