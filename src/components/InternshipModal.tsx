import React from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Trophy,
  CheckSquare,
  Square,
  Map,
  HelpCircle,
  Bot,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Internship, Question, RoadmapTopic, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { resolveApplyUrl, resolveChannelHandle, getCompanyMonogram } from '../lib/vacancyUrl';
import { useScrollLock } from '../lib/useScrollLock';

interface InternshipModalProps {
  internship: Internship | null;
  onClose: () => void;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  userProgress: UserProgress;
  onToggleTopic: (topicId: string) => void;
  onToggleSubtopic?: (topicId: string, subtopicIndex: number) => void;
  onToggleQuestion: (questionId: string) => void;
}

export const InternshipModal: React.FC<InternshipModalProps> = ({
  internship,
  onClose,
  roadmapTopics,
  questions,
  userProgress,
  onToggleTopic,
  onToggleSubtopic,
  onToggleQuestion,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = React.useState<string | null>(null);

  // Lock background scroll on mobile and desktop while modal is open
  useScrollLock(Boolean(internship));

  // Close on Escape key press
  React.useEffect(() => {
    if (!internship) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [internship, onClose]);

  if (!internship) return null;

  // Filter relevant roadmap topics matching direction and subtrack
  const relevantTopics = roadmapTopics.filter(
    (t) =>
      t.directionId === internship.directionId &&
      (t.category === 'core' || t.subTrackId === internship.subTrackId)
  );

  // Filter relevant profile questions
  const relevantQuestions = questions.filter(
    (q) =>
      q.directionId === internship.directionId &&
      (q.subTrackId === 'core' || q.subTrackId === internship.subTrackId)
  );

  // Compute readiness score
  const totalItems = relevantTopics.length + relevantQuestions.length;
  const completedTopicsCount = relevantTopics.filter((t) =>
    userProgress.completedTopics.includes(t.id)
  ).length;
  const completedQuestionsCount = relevantQuestions.filter((q) =>
    userProgress.completedQuestions.includes(q.id)
  ).length;
  const totalCompleted = completedTopicsCount + completedQuestionsCount;

  const readinessPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  const isSubtopicChecked = (topicId: string, subIdx: number) => {
    const subtopicKey = `${topicId}__sub_${subIdx}`;
    return Boolean(
      userProgress.completedSubtopics?.includes(subtopicKey) ||
      userProgress.completedTopics.includes(topicId)
    );
  };

  const getTopicProgress = (topic: RoadmapTopic) => {
    const total = topic.subtopics.length;
    if (total === 0) {
      const done = userProgress.completedTopics.includes(topic.id);
      return { total: 0, checked: done ? 1 : 0, percent: done ? 100 : 0, isDone: done };
    }
    const checked = topic.subtopics.filter((_, sIdx) => isSubtopicChecked(topic.id, sIdx)).length;
    const percent = Math.round((checked / total) * 100);
    const isDone = checked === total || userProgress.completedTopics.includes(topic.id);
    return { total, checked, percent, isDone };
  };

  const handleToggleTopic = (topicId: string) => {
    triggerHaptic('selection');
    onToggleTopic(topicId);
    if (!userProgress.completedTopics.includes(topicId) && totalCompleted + 1 === totalItems) {
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const handleToggleSubtopic = (topicId: string, subIdx: number) => {
    triggerHaptic('selection');
    if (onToggleSubtopic) {
      onToggleSubtopic(topicId, subIdx);
    } else {
      onToggleTopic(topicId);
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    triggerHaptic('selection');
    onToggleQuestion(questionId);
    if (!userProgress.completedQuestions.includes(questionId) && totalCompleted + 1 === totalItems) {
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const getStatusBadge = () => {
    if (readinessPercent >= 80) {
      return {
        label: 'Готов к собеседованию! 🔥',
        color: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      };
    }
    if (readinessPercent >= 40) {
      return {
        label: 'В активной подготовке 🚀',
        color: 'bg-neutral-100 text-neutral-800 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10',
      };
    }
    return {
      label: 'Начальный уровень 📚',
      color: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] liquid-modal-overlay overflow-y-auto overscroll-contain touch-pan-y modal-overlay-animation"
    >
      <div
        className="relative w-full max-w-3xl rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 my-auto sm:my-8 max-h-[92vh] sm:max-h-[90vh] flex flex-col modal-enter-animation liquid-glass-modal text-neutral-900 dark:text-neutral-100 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 min-w-[44px] min-h-[44px] p-2.5 rounded-full transition-transform duration-150 z-10 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white cursor-pointer flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="shrink-0 pb-4 border-b pr-10 border-black/5 dark:border-white/5">
          <div className="flex items-start gap-3.5 mb-2">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 overflow-hidden liquid-glass-tile text-neutral-800 dark:text-neutral-100">
              <span className="relative z-10 select-none tracking-tight">
                {getCompanyMonogram(internship.company)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight">
                  {internship.company}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 opacity-70" />
                  {internship.location}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                  {internship.format}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
                План подготовки: {internship.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full liquid-glass-pill text-neutral-800 dark:text-neutral-200">
              {internship.salary}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full liquid-glass-pill text-neutral-600 dark:text-neutral-400">
              Источник: {internship.sourceChannel}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1 custom-scroll touch-pan-y overscroll-contain">
          {/* Readiness Progress Bar Card */}
          <div className="p-4 sm:p-5 rounded-2xl liquid-glass-subtle transition-colors">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-white font-sans">
                  Ваша готовность к этой стажировке:
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Изучено {totalCompleted} из {totalItems} тем и профильных вопросов
              </span>
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">{readinessPercent}%</span>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500 bg-neutral-800 dark:bg-neutral-200"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            <p className="text-xs mt-2 text-neutral-500 dark:text-neutral-400">
              💡 Отмечайте изученные разделы и вопросы прямо в этом окне — ваш прогресс сохраняется синхронно в базе данных!
            </p>
          </div>

          {/* Section 1: Required Roadmap Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 font-sans text-neutral-900 dark:text-white">
                <Map className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                Этапы роадмапа для вакансии ({completedTopicsCount}/{relevantTopics.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {relevantTopics.map((topic) => {
                const { total, checked, percent, isDone } = getTopicProgress(topic);
                return (
                  <div
                    key={topic.id}
                    className={`p-3.5 sm:p-4 rounded-2xl transition-colors duration-150 ${
                      isDone
                        ? 'bg-emerald-500/10 border border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/35'
                        : 'liquid-glass-subtle'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTopic(topic.id)}
                          className="mt-0.5 text-neutral-400 hover:text-emerald-500 transition-colors"
                          title={isDone ? 'Снять отметку' : 'Отметить тему как изученную'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-white font-sans">{topic.title}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full liquid-glass-pill text-neutral-700 dark:text-neutral-200">
                              {topic.category === 'core' ? 'База' : 'Стек'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-pill text-neutral-700 dark:text-neutral-200">
                              {topic.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">{topic.description}</p>
                          <div className="mt-2 text-[11px] p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                            <strong>Совет для интервью:</strong> {topic.interviewTip}
                          </div>
                        </div>
                      </div>

                      <a
                        href={topic.externalDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-full transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200"
                        title="Открыть документацию"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Topic Progress Bar */}
                    <div className="rounded-xl p-2.5 my-3 liquid-glass-pill">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-600 dark:text-neutral-400">Прогресс раздела:</span>
                        <span className={`font-semibold ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-900/10 dark:bg-white/15">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-neutral-900 dark:bg-white'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="text-[11px] font-medium uppercase tracking-wider mb-2 text-neutral-500 dark:text-neutral-400">
                          Ключевые подтемы (отметьте изученные):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {topic.subtopics.map((sub, sIdx) => {
                            const isSubDone = isSubtopicChecked(topic.id, sIdx);
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleToggleSubtopic(topic.id, sIdx)}
                                className={`flex items-start gap-2 p-2 rounded-xl text-left text-xs transition-colors select-none ${
                                  isSubDone
                                    ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/35'
                                    : 'liquid-glass-pill text-neutral-700 hover:bg-white/80 dark:text-neutral-300 dark:hover:bg-white/15'
                                }`}
                              >
                                {isSubDone ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                                )}
                                <span className={isSubDone ? 'line-through opacity-80' : ''}>
                                  {sub}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Profile Interview Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-neutral-900 dark:text-white">
                <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                Профильные вопросы собеседования ({completedQuestionsCount}/{relevantQuestions.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {relevantQuestions.map((q) => {
                const isCompleted = userProgress.completedQuestions.includes(q.id);
                const isExpanded = expandedQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl transition-colors duration-150 ${
                      isCompleted
                        ? 'bg-emerald-500/10 border border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/35'
                        : 'liquid-glass-subtle'
                    }`}
                  >
                    <div className="p-3.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestion(q.id)}
                          aria-label={isCompleted ? 'Отметить как неизученный' : 'Отметить как изученный'}
                          className="min-w-[40px] min-h-[40px] -ml-2 -mt-1.5 flex items-center justify-center text-neutral-400 hover:text-emerald-500 transition-colors shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" />
                          )}
                        </button>

                        <div className="cursor-pointer flex-1" onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}>
                          <div className="flex items-center gap-2 flex-wrap mb-1 text-[11px]">
                            <span className="font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-300">
                              {q.category}
                            </span>
                            <span className="text-neutral-500 dark:text-neutral-400">{q.difficulty}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white font-sans">{q.title}</h4>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{q.question}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-700 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t space-y-3 border-black/5 dark:border-white/5 liquid-glass-subtle rounded-b-2xl">
                        <div className="text-xs leading-relaxed p-3.5 rounded-xl liquid-glass-pill text-neutral-900">
                          <span className="font-bold text-emerald-700 block mb-1">Эталонный ответ:</span>
                          {q.answer}
                        </div>

                        {q.codeSnippet && (
                          <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-neutral-950 text-neutral-100 shadow-sm">
                            <div className="px-3 py-1 text-[11px] font-mono text-neutral-400 border-b border-neutral-800 bg-neutral-900">
                              {q.codeLanguage || 'code'}
                            </div>
                            <pre className="p-3 text-xs font-mono text-neutral-200 overflow-x-auto">
                              <code>{q.codeSnippet}</code>
                            </pre>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-neutral-700 block">Главные тезисы:</span>
                          <ul className="list-disc list-inside text-xs space-y-1 text-neutral-700">
                            {q.keyTakeaways.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 pt-3 sm:pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-800 cursor-pointer text-center"
            >
              Закрыть
            </button>

            {(() => {
              const verifiedChannel = resolveChannelHandle(internship.sourceChannel, internship.company);
              const cleanChannel = verifiedChannel.replace(/^@/, '');

              return verifiedChannel.startsWith('@') ? (
                <a
                  href={`https://t.me/${cleanChannel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-800 truncate"
                  title={`Открыть проверенный Telegram-канал ${verifiedChannel}`}
                >
                  <Bot className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
                  <span className="truncate">Канал {verifiedChannel}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : null;
            })()}
          </div>

          {(() => {
            const verifiedApplyUrl = resolveApplyUrl(internship.applyUrl, internship.company);
            return (
              <a
                href={verifiedApplyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-full font-semibold text-xs sm:text-sm active:scale-95 transition-transform duration-150 bg-neutral-900 hover:bg-black text-white shadow-xs cursor-pointer text-center"
                title={`Подать заявку на официальном сайте компании ${internship.company}`}
              >
                <span className="sm:hidden truncate">Откликнуться на {internship.company}</span>
                <span className="hidden sm:inline">Подать заявку на сайте {internship.company}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
