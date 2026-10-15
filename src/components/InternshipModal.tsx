import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Send,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Internship, Question, RoadmapTopic, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';

interface InternshipModalProps {
  internship: Internship | null;
  onClose: () => void;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  userProgress: UserProgress;
  onToggleTopic: (topicId: string) => void;
  onToggleQuestion: (questionId: string) => void;
}

export const InternshipModal: React.FC<InternshipModalProps> = ({
  internship,
  onClose,
  roadmapTopics,
  questions,
  userProgress,
  onToggleTopic,
  onToggleQuestion,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = React.useState<string | null>(null);

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

  const handleToggleTopic = (topicId: string) => {
    triggerHaptic('selection');
    onToggleTopic(topicId);
    if (!userProgress.completedTopics.includes(topicId) && totalCompleted + 1 === totalItems) {
      confetti({ particleCount: 100, spread: 70 });
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
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
    if (readinessPercent >= 40) {
      return {
        label: 'В активной подготовке 🚀',
        color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      };
    }
    return {
      label: 'Начальный уровень 📚',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 my-8 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="shrink-0 pb-4 border-b border-slate-800 pr-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {internship.company}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {internship.location}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {internship.format}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            План подготовки: {internship.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
              {internship.salary}
            </span>
            <span className="text-xs text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/60">
              Источник: {internship.sourceChannel}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1 custom-scroll">
          {/* Readiness Progress Bar Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-800/40 shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  Ваша готовность к этой стажировке:
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-slate-400">
                Изучено {totalCompleted} из {totalItems} тем и профильных вопросов
              </span>
              <span className="text-2xl font-black text-indigo-300">{readinessPercent}%</span>
            </div>

            <div className="w-full h-3 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-indigo-500"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            <p className="text-xs text-slate-400 mt-2">
              💡 Отмечайте галочками изученные разделы и вопросы прямо в этом окне — ваш прогресс сохраняется синхронно в базе данных!
            </p>
          </div>

          {/* Section 1: Required Roadmap Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Этапы роадмапа для вакансии ({completedTopicsCount}/{relevantTopics.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {relevantTopics.map((topic) => {
                const isCompleted = userProgress.completedTopics.includes(topic.id);
                return (
                  <div
                    key={topic.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTopic(topic.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{topic.title}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {topic.category === 'core' ? 'База' : 'Стек вакансии'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300">
                              {topic.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{topic.description}</p>
                          <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 p-2 rounded-xl">
                            <strong>Совет для интервью:</strong> {topic.interviewTip}
                          </div>
                        </div>
                      </div>

                      <a
                        href={topic.externalDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors shrink-0"
                        title="Открыть документацию"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Profile Interview Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
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
                    className={`rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/15 border-emerald-800/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="p-3.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestion(q.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400" />
                          )}
                        </button>

                        <div className="cursor-pointer flex-1" onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-md">
                              {q.category}
                            </span>
                            <span className="text-xs text-slate-400">{q.difficulty}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100">{q.title}</h4>
                          <p className="text-xs text-slate-300 mt-1">{q.question}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-900/50 rounded-b-2xl space-y-3">
                        <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          <span className="font-semibold text-emerald-400 block mb-1">Ответ:</span>
                          {q.answer}
                        </div>

                        {q.codeSnippet && (
                          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                            <div className="bg-slate-900 px-3 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                              {q.codeLanguage || 'code'}
                            </div>
                            <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                              <code>{q.codeSnippet}</code>
                            </pre>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 block">Главные тезисы:</span>
                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
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
        <div className="shrink-0 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
          >
            Закрыть
          </button>

          <a
            href={internship.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <span>Откликнуться на стажировку</span>
            <Send className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
