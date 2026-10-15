import { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Layers,
  SlidersHorizontal,
  Code,
  PenTool,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, Question, SubTrackId, UserProgress } from '../types';
import { DIRECTIONS } from '../data/directions';
import { FlashcardsTrainer } from './FlashcardsTrainer';
import { SelfCheckTrainer } from './SelfCheckTrainer';
import { triggerHaptic } from '../lib/telegram';

interface QuestionsViewerProps {
  questions: Question[];
  userProgress: UserProgress;
  onToggleQuestion: (questionId: string) => void;
  onMarkRepeat: (questionId: string) => void;
  onMarkLearned: (questionId: string) => void;
}

export const QuestionsViewer: React.FC<QuestionsViewerProps> = ({
  questions,
  userProgress,
  onToggleQuestion,
  onMarkRepeat,
  onMarkLearned,
}) => {
  const [viewMode, setViewMode] = useState<'accordion' | 'self_check' | 'flashcards'>('self_check');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<DirectionId | 'all'>('all');
  const [selectedSubTrack, setSelectedSubTrack] = useState<SubTrackId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'repeat' | 'completed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inlineAnswers, setInlineAnswers] = useState<Record<string, string>>({});
  const [inlineChecked, setInlineChecked] = useState<Record<string, boolean>>({});

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    // Direction filter
    if (selectedDirection !== 'all' && q.directionId !== selectedDirection) {
      return false;
    }

    // Sub-track filter
    if (
      selectedSubTrack !== 'all' &&
      q.subTrackId !== selectedSubTrack &&
      q.subTrackId !== 'core'
    ) {
      return false;
    }

    // Status filter
    if (statusFilter === 'completed' && !userProgress.completedQuestions.includes(q.id)) {
      return false;
    }
    if (statusFilter === 'repeat' && !userProgress.repeatQuestions.includes(q.id)) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(qLower);
      const matchQuestion = q.question.toLowerCase().includes(qLower);
      const matchAnswer = q.answer.toLowerCase().includes(qLower);
      const matchCategory = q.category.toLowerCase().includes(qLower);
      return matchTitle || matchQuestion || matchAnswer || matchCategory;
    }

    return true;
  });

  const completedCount = questions.filter((q) =>
    userProgress.completedQuestions.includes(q.id)
  ).length;

  const repeatCount = questions.filter((q) =>
    userProgress.repeatQuestions.includes(q.id)
  ).length;

  const handleToggle = (id: string) => {
    triggerHaptic('selection');
    onToggleQuestion(id);
    if (!userProgress.completedQuestions.includes(id)) {
      confetti({ particleCount: 40, spread: 50 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats - Minimalist Tech */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Тренажёр вопросов к собеседованию
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {questions.length} вопросов
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Реальные вопросы с интервью стажёров: пишите ответ, сверяйте с эталоном и тренируйте насмотренность.
          </p>
        </div>

        {/* View Mode Switcher: 3 Modes */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('self_check');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'self_check'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Самопроверка</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('accordion');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'accordion'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Список</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('flashcards');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'flashcards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Карточки</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросу, ключевому слову или коду..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-indigo-500 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Все ({questions.length})
            </button>
            <button
              onClick={() => setStatusFilter('repeat')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'repeat'
                  ? 'bg-amber-600 text-white border-amber-400'
                  : 'bg-slate-950 border-slate-800 text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Повторить ({repeatCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Изучено ({completedCount})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Directions pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => {
              setSelectedDirection('all');
              setSelectedSubTrack('all');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedDirection === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Все направления
          </button>
          {DIRECTIONS.map((dir) => (
            <button
              key={dir.id}
              onClick={() => {
                setSelectedDirection(dir.id);
                setSelectedSubTrack('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedDirection === dir.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {dir.title.split('-')[0]}
            </button>
          ))}
        </div>

        {/* Row 3: Sub-tracks pills if direction chosen */}
        {selectedDirection !== 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/60">
            <button
              onClick={() => setSelectedSubTrack('all')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                selectedSubTrack === 'all'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Все ветки
            </button>
            {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSubTrack(st.id)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                  selectedSubTrack === st.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Self-Check Trainer, Flashcards, or Accordion */}
      {viewMode === 'self_check' ? (
        <SelfCheckTrainer
          questions={filteredQuestions}
          userProgress={userProgress}
          userAnswers={inlineAnswers}
          submittedQuestions={inlineChecked}
          onAnswerChange={(qid, ans) => setInlineAnswers((prev) => ({ ...prev, [qid]: ans }))}
          onSubmitQuestion={(qid) => setInlineChecked((prev) => ({ ...prev, [qid]: true }))}
          onResetQuestion={(qid) => setInlineChecked((prev) => ({ ...prev, [qid]: false }))}
          onMarkLearned={onMarkLearned}
          onMarkRepeat={onMarkRepeat}
        />
      ) : viewMode === 'flashcards' ? (
        <FlashcardsTrainer
          questions={filteredQuestions}
          userProgress={userProgress}
          onMarkLearned={onMarkLearned}
          onMarkRepeat={onMarkRepeat}
        />
      ) : (
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <SlidersHorizontal className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white mb-1">Ничего не найдено</h3>
              <p className="text-xs text-slate-400">
                Попробуйте изменить поисковый запрос или сбросить фильтры.
              </p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isCompleted = userProgress.completedQuestions.includes(q.id);
              const isRepeat = userProgress.repeatQuestions.includes(q.id);
              const isExpanded = expandedId === q.id;
              const isChecked = !!inlineChecked[q.id];
              const userAnswer = inlineAnswers[q.id] || '';

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-slate-900/90 border-emerald-800/40'
                      : isRepeat
                      ? 'bg-slate-900/90 border-amber-800/40'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggle(q.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                        title={isCompleted ? 'Отметить как неизученное' : 'Отметить как изученное'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400" />
                        )}
                      </button>

                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-semibold text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/50">
                            {q.category}
                          </span>
                          <span className="text-[11px] text-slate-400">{q.difficulty}</span>
                          {isRepeat && (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
                              В повторении
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white hover:text-indigo-300 transition-colors">
                          {q.title}
                        </h3>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/40 rounded-b-2xl space-y-4">
                      {/* Full Question text */}
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium">
                        <strong className="text-sky-300 block mb-1">Вопрос интервьюера:</strong>
                        {q.question}
                      </div>

                      {/* Code Snippet if present */}
                      {q.codeSnippet && (
                        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                          <div className="bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-400 border-b border-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 text-indigo-400" />
                              {q.codeLanguage || 'code'}
                            </span>
                          </div>
                          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        </div>
                      )}

                      {/* Interactive Self-Check Field */}
                      {!isChecked ? (
                        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                              Самопроверка: попробуйте ответить самостоятельно
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Показать ответ сразу</span>
                            </button>
                          </div>

                          <textarea
                            value={userAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInlineAnswers((prev) => ({ ...prev, [q.id]: val }));
                            }}
                            rows={2}
                            placeholder="Введите ваш ответ для сверки..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Сверить с эталоном</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userAnswer.trim() && (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-slate-400 text-[11px] uppercase">Ваш ответ:</strong>
                                <button
                                  type="button"
                                  onClick={() => setInlineChecked((prev) => ({ ...prev, [q.id]: false }))}
                                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Изменить
                                </button>
                              </div>
                              <p className="text-slate-300 font-mono whitespace-pre-wrap">{userAnswer}</p>
                            </div>
                          )}

                          {/* Detailed Answer */}
                          <div className="p-4 bg-slate-900 rounded-xl border border-emerald-900/40 text-xs sm:text-sm text-slate-200 leading-relaxed">
                            <strong className="text-emerald-400 block mb-1.5 font-bold">Развернутый ответ:</strong>
                            {q.answer}
                          </div>

                          {/* Key Takeaways */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                              Что важно запомнить:
                            </span>
                            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                              {q.keyTakeaways.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onMarkRepeat(q.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isRepeat
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isRepeat ? 'В повторении' : 'Отправить на повторение'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggle(q.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'Изучено' : 'Отметить изученным'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
