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
        color: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-300',
      };
    }
    if (readinessPercent >= 40) {
      return {
        label: 'В активной подготовке 🚀',
        color: 'dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40 light:bg-sky-50 light:text-sky-700 light:border-sky-300',
      };
    }
    return {
      label: 'Начальный уровень 📚',
      color: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 light:bg-amber-50 light:text-amber-700 light:border-amber-300',
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl p-5 sm:p-7 my-8 max-h-[90vh] flex flex-col cyber-corner transition-colors
        dark:bg-[#0c101c] dark:border dark:border-cyan-500/30 dark:shadow-[0_0_35px_rgba(0,240,255,0.18)] dark:text-slate-100
        light:bg-white light:border light:border-slate-200 light:shadow-2xl light:text-slate-900"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl transition-colors z-10
            dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
            light:text-slate-400 light:hover:text-slate-900 light:hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="shrink-0 pb-4 border-b pr-10 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold
              dark:bg-cyan-500/20 dark:text-cyan-300 dark:border dark:border-cyan-500/40
              light:bg-sky-50 light:text-sky-700 light:border light:border-sky-200"
            >
              {internship.company}
            </span>
            <span className="text-xs dark:text-slate-400 light:text-slate-500 flex items-center gap-1 font-mono">
              <MapPin className="w-3.5 h-3.5" />
              {internship.location}
            </span>
            <span className="text-xs dark:text-slate-400 light:text-slate-500 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {internship.format}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight dark:text-white light:text-slate-900 font-sans">
            План подготовки: {internship.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg
              dark:text-emerald-400 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/60
              light:text-emerald-700 light:bg-emerald-50 light:border light:border-emerald-200"
            >
              {internship.salary}
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg
              dark:text-cyan-400 dark:bg-cyan-950/60 dark:border dark:border-cyan-800/60
              light:text-sky-700 light:bg-sky-50 light:border light:border-sky-200"
            >
              Источник: {internship.sourceChannel}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1 custom-scroll">
          {/* Readiness Progress Bar Card */}
          <div className="p-4 sm:p-5 rounded-2xl border shadow-inner transition-colors
            dark:bg-gradient-to-br dark:from-[#090e1a] dark:to-[#06080f] dark:border-cyan-500/30
            light:bg-slate-50 light:border-slate-200"
          >
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold dark:text-white light:text-slate-900 font-sans">
                  Ваша готовность к этой стажировке:
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-1.5 font-mono">
              <span className="text-xs dark:text-slate-400 light:text-slate-600">
                Изучено {totalCompleted} из {totalItems} тем и профильных вопросов
              </span>
              <span className="text-2xl font-black dark:text-cyan-300 light:text-sky-600">{readinessPercent}%</span>
            </div>

            <div className="w-full h-3 rounded-full overflow-hidden p-0.5 border dark:bg-slate-900 dark:border-slate-700 light:bg-slate-200 light:border-slate-300">
              <div
                className="h-full rounded-full transition-all duration-500
                  dark:bg-gradient-to-r dark:from-cyan-400 dark:via-indigo-400 dark:to-emerald-400 dark:shadow-[0_0_10px_rgba(0,240,255,0.4)]
                  light:bg-gradient-to-r light:from-sky-500 light:to-emerald-500"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            <p className="text-xs mt-2 dark:text-slate-400 light:text-slate-500">
              💡 Отмечайте изученные разделы и вопросы прямо в этом окне — ваш прогресс сохраняется синхронно в базе данных!
            </p>
          </div>

          {/* Section 1: Required Roadmap Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 font-mono dark:text-white light:text-slate-900">
                <Map className="w-4 h-4 dark:text-cyan-400 light:text-sky-600" />
                Этапы роадмапа для вакансии ({completedTopicsCount}/{relevantTopics.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {relevantTopics.map((topic) => {
                const { total, checked, percent, isDone } = getTopicProgress(topic);
                return (
                  <div
                    key={topic.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDone
                        ? 'dark:bg-emerald-950/20 dark:border-emerald-800/40 light:bg-emerald-50/50 light:border-emerald-200'
                        : percent > 0
                        ? 'dark:bg-[#0e1424] dark:border-cyan-500/40 light:bg-sky-50/30 light:border-sky-200'
                        : 'dark:bg-[#06080f]/80 dark:border-slate-800 light:bg-white light:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTopic(topic.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title={isDone ? 'Снять отметку' : 'Отметить тему как изученную'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500 hover:text-cyan-400" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap font-mono">
                            <span className="text-sm font-bold dark:text-white light:text-slate-900 font-sans">{topic.title}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-400 light:bg-slate-100 light:text-slate-600">
                              {topic.category === 'core' ? 'База' : 'Стек'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded dark:bg-cyan-950 dark:text-cyan-300 light:bg-sky-100 light:text-sky-800">
                              {topic.difficulty}
                            </span>
                          </div>
                          <p className="text-xs dark:text-slate-300 light:text-slate-600 mt-1">{topic.description}</p>
                          <div className="mt-2 text-[11px] p-2 rounded-xl dark:text-amber-300/90 dark:bg-amber-950/30 dark:border dark:border-amber-900/40 light:text-amber-900 light:bg-amber-50 light:border light:border-amber-200">
                            <strong>Совет для интервью:</strong> {topic.interviewTip}
                          </div>
                        </div>
                      </div>

                      <a
                        href={topic.externalDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg transition-colors shrink-0
                          dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-cyan-300
                          light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-sky-600"
                        title="Открыть документацию"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Topic Progress Bar */}
                    <div className="rounded-xl p-2.5 my-3 border font-mono
                      dark:bg-[#06080f] dark:border-slate-800
                      light:bg-slate-50 light:border-slate-200"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="dark:text-slate-400 light:text-slate-600">Прогресс раздела:</span>
                        <span className={`font-bold ${isDone ? 'dark:text-emerald-400 light:text-emerald-600' : 'dark:text-cyan-300 light:text-sky-600'}`}>
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden dark:bg-slate-800 light:bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'dark:bg-cyan-500 light:bg-sky-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="pt-2 border-t dark:border-slate-800/60 light:border-slate-100">
                        <div className="text-[11px] font-mono font-semibold uppercase tracking-wider mb-2 dark:text-slate-400 light:text-slate-500">
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
                                    ? 'dark:bg-emerald-950/40 dark:text-emerald-200 dark:border dark:border-emerald-800/50 light:bg-emerald-50 light:text-emerald-800 light:border light:border-emerald-300'
                                    : 'dark:bg-slate-900/70 dark:text-slate-300 dark:border dark:border-slate-800 dark:hover:border-slate-700 light:bg-slate-50 light:text-slate-700 light:border light:border-slate-200'
                                }`}
                              >
                                {isSubDone ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
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
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 font-mono dark:text-white light:text-slate-900">
                <HelpCircle className="w-4 h-4 dark:text-cyan-400 light:text-sky-600" />
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
                        ? 'dark:bg-emerald-950/15 dark:border-emerald-800/40 light:bg-emerald-50/50 light:border-emerald-200'
                        : 'dark:bg-[#06080f]/80 dark:border-slate-800 light:bg-white light:border-slate-200'
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
                            <Circle className="w-5 h-5 text-slate-500 hover:text-cyan-400" />
                          )}
                        </button>

                        <div className="cursor-pointer flex-1" onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}>
                          <div className="flex items-center gap-2 flex-wrap mb-1 font-mono text-[11px]">
                            <span className="font-semibold px-2 py-0.5 rounded-md dark:text-cyan-300 dark:bg-cyan-950/50 light:text-sky-700 light:bg-sky-50">
                              {q.category}
                            </span>
                            <span className="dark:text-slate-400 light:text-slate-500">{q.difficulty}</span>
                          </div>
                          <h4 className="text-sm font-bold dark:text-slate-100 light:text-slate-900 font-sans">{q.title}</h4>
                          <p className="text-xs dark:text-slate-300 light:text-slate-600 mt-1">{q.question}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="p-1.5 rounded-lg transition-colors
                          dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200
                          light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-slate-900"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t space-y-3 dark:border-slate-800/80 dark:bg-slate-900/50 light:border-slate-100 light:bg-slate-50/70 rounded-b-2xl">
                        <div className="text-xs leading-relaxed p-3 rounded-xl border dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-200 light:bg-white light:border-slate-200 light:text-slate-800">
                          <span className="font-bold text-emerald-500 block mb-1">Ответ:</span>
                          {q.answer}
                        </div>

                        {q.codeSnippet && (
                          <div className="rounded-xl overflow-hidden border dark:border-slate-800 dark:bg-[#030712] light:border-slate-200 light:bg-slate-900">
                            <div className="px-3 py-1 text-[11px] font-mono text-slate-400 border-b dark:bg-slate-900 dark:border-slate-800 light:bg-slate-800 light:border-slate-700">
                              {q.codeLanguage || 'code'}
                            </div>
                            <pre className="p-3 text-xs font-mono text-cyan-300 overflow-x-auto">
                              <code>{q.codeSnippet}</code>
                            </pre>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[11px] font-mono font-semibold dark:text-slate-400 light:text-slate-500 block">Главные тезисы:</span>
                          <ul className="list-disc list-inside text-xs space-y-1 dark:text-slate-300 light:text-slate-600">
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
        <div className="shrink-0 pt-4 border-t flex flex-wrap items-center justify-between gap-3 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors
                dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300
                light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700"
            >
              Закрыть
            </button>

            {internship.sourceChannel.startsWith('@') && (
              <a
                href={`https://t.me/${internship.sourceChannel.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-colors
                  dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 dark:border dark:border-cyan-800/50 dark:text-cyan-300
                  light:bg-sky-50 light:hover:bg-sky-100 light:border light:border-sky-200 light:text-sky-700"
                title={`Открыть Telegram-канал ${internship.sourceChannel}`}
              >
                <Bot className="w-4 h-4 text-sky-400" />
                <span>Канал {internship.sourceChannel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <a
            href={internship.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm active:scale-95 transition-all
              dark:bg-gradient-to-r dark:from-cyan-500 dark:to-emerald-400 dark:text-black dark:shadow-[0_0_15px_rgba(0,240,255,0.35)]
              light:bg-slate-900 light:hover:bg-slate-800 light:text-white light:shadow-md"
            title={`Подать заявку на официальном сайте компании ${internship.company}`}
          >
            <span>Подать заявку на сайте {internship.company}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
