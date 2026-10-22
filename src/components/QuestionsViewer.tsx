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
      {/* Top Banner & Stats - Apple Minimalist Liquid Glass */}
      <div className="rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300
        bg-white/80 border border-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)]
        dark:bg-white/[0.035] dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)]"
      >
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 font-sans text-neutral-900 dark:text-white">
              Тренажёр вопросов к собеседованию
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium
              bg-neutral-100 text-neutral-700 border border-neutral-200/70
              dark:bg-white/[0.06] dark:text-neutral-300 dark:border-white/[0.08]"
            >
              {questions.length} вопросов
            </span>
          </div>
          <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            Реальные вопросы с интервью стажёров: пишите ответ, сверяйте с эталоном и тренируйте насмотренность.
          </p>
        </div>

        {/* View Mode Switcher: 3 Modes (Segmented Capsule Control) */}
        <div className="flex items-center p-1 rounded-full shrink-0 text-xs transition-colors
          bg-neutral-100/90 border border-neutral-200/80
          dark:bg-white/[0.04] dark:border-white/10"
        >
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('self_check');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all duration-150 active:scale-95 ${
              viewMode === 'self_check'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all duration-150 active:scale-95 ${
              viewMode === 'accordion'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all duration-150 active:scale-95 ${
              viewMode === 'flashcards'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Карточки</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-3xl p-4 sm:p-5 space-y-3.5 transition-all duration-300
        bg-white/80 border border-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)]
        dark:bg-white/[0.035] dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)]"
      >
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросу, ключевому слову или коду..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-xs sm:text-sm transition-all focus:outline-none
                bg-neutral-100/90 border border-neutral-200/90 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white
                dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30 dark:focus:bg-white/[0.07]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-sm'
                  : 'bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-neutral-300 dark:border-white/[0.08]'
              }`}
            >
              Все ({questions.length})
            </button>
            <button
              onClick={() => setStatusFilter('repeat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 active:scale-95 ${
                statusFilter === 'repeat'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-neutral-100/90 hover:bg-neutral-200/80 text-amber-700 border-neutral-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-amber-400 dark:border-white/[0.08]'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Повторить ({repeatCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 active:scale-95 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-neutral-100/90 hover:bg-neutral-200/80 text-emerald-700 border-neutral-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-emerald-400 dark:border-white/[0.08]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
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
            className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedDirection === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'bg-neutral-100/90 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/80 dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08]'
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
              className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDirection === dir.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'bg-neutral-100/90 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/80 dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.08]'
              }`}
            >
              {dir.title.split('-')[0]}
            </button>
          ))}
        </div>

        {/* Row 3: Sub-tracks pills if direction chosen */}
        {selectedDirection !== 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              onClick={() => setSelectedSubTrack('all')}
              className={`px-3 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSubTrack === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              Все ветки
            </button>
            {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSubTrack(st.id)}
                className={`px-3 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedSubTrack === st.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
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
            <div className="p-8 text-center rounded-3xl transition-colors
              bg-white/80 border border-neutral-200/80 shadow-xs
              dark:bg-neutral-900/60 dark:border-neutral-800"
            >
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
              <h3 className="text-base font-bold mb-1 font-sans text-neutral-900 dark:text-white">Ничего не найдено</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                  className={`rounded-3xl border transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/30'
                      : isRepeat
                      ? 'bg-amber-500/10 border-amber-500/25 dark:bg-amber-500/15 dark:border-amber-500/30'
                      : 'bg-white/85 border-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:bg-white/[0.035] dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-neutral-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="p-5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggle(q.id)}
                        className="mt-0.5 text-neutral-400 hover:text-emerald-500 transition-colors shrink-0"
                        title={isCompleted ? 'Отметить как неизученное' : 'Отметить как изученное'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" />
                        )}
                      </button>

                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border
                            bg-neutral-100 text-neutral-700 border-neutral-200/70
                            dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/70"
                          >
                            {q.category}
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{q.difficulty}</span>
                          {isRepeat && (
                            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border
                              bg-amber-500/10 text-amber-700 border-amber-500/20
                              dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                            >
                              В повторении
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-semibold transition-colors font-sans
                          text-neutral-900 group-hover:text-neutral-700
                          dark:text-white dark:group-hover:text-neutral-200"
                        >
                          {q.title}
                        </h3>

                        <p className="text-xs mt-1.5 line-clamp-2 text-neutral-600 dark:text-neutral-400">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-full transition-colors shrink-0
                        bg-neutral-100 hover:bg-neutral-200 text-neutral-600
                        dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-neutral-400"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t rounded-b-3xl space-y-4 transition-colors
                      border-neutral-200/80 bg-neutral-50/50
                      dark:border-neutral-800/80 dark:bg-neutral-950/40"
                    >
                      {/* Full Question text */}
                      <div className="p-3.5 rounded-2xl border text-xs leading-relaxed transition-colors
                        bg-white border-neutral-200/80 text-neutral-800
                        dark:bg-neutral-850 dark:border-neutral-800 dark:text-neutral-200"
                      >
                        <strong className="block mb-1 text-neutral-900 dark:text-white">Вопрос интервьюера:</strong>
                        {q.question}
                      </div>

                      {/* Code Snippet if present */}
                      {q.codeSnippet && (
                        <div className="rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-950 text-neutral-100 dark:border-neutral-800 dark:bg-black">
                          <div className="px-3.5 py-1.5 text-xs font-mono border-b border-neutral-800 flex items-center justify-between bg-neutral-900 text-neutral-400">
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 text-neutral-400" />
                              {q.codeLanguage || 'code'}
                            </span>
                          </div>
                          <pre className="p-3.5 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        </div>
                      )}

                      {/* Interactive Self-Check Field */}
                      {!isChecked ? (
                        <div className="p-4 rounded-2xl border space-y-3 transition-colors
                          bg-white border-neutral-200/80
                          dark:bg-neutral-850 dark:border-neutral-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                              <PenTool className="w-3.5 h-3.5 text-neutral-500" />
                              Самопроверка: попробуйте ответить самостоятельно
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
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
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-colors focus:outline-none
                              bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400
                              dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs
                                bg-neutral-900 text-white hover:bg-black
                                dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Сверить с эталоном</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userAnswer.trim() && (
                            <div className="p-3.5 rounded-2xl border text-xs transition-colors
                              bg-white border-neutral-200/80
                              dark:bg-neutral-850 dark:border-neutral-800"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[11px] uppercase text-neutral-500 dark:text-neutral-400">Ваш ответ:</strong>
                                <button
                                  type="button"
                                  onClick={() => setInlineChecked((prev) => ({ ...prev, [q.id]: false }))}
                                  className="text-[10px] flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Изменить
                                </button>
                              </div>
                              <p className="whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">{userAnswer}</p>
                            </div>
                          )}

                          {/* Detailed Answer */}
                          <div className="p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed transition-colors
                            bg-emerald-500/5 border-emerald-500/25 text-neutral-800
                            dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-neutral-200"
                          >
                            <strong className="block mb-1.5 font-semibold text-emerald-700 dark:text-emerald-400">Развернутый ответ:</strong>
                            {q.answer}
                          </div>

                          {/* Key Takeaways */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider block text-neutral-500 dark:text-neutral-400">
                              Что важно запомнить:
                            </span>
                            <ul className="text-xs space-y-1 list-disc list-inside text-neutral-600 dark:text-neutral-400">
                              {q.keyTakeaways.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onMarkRepeat(q.id);
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isRepeat
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                              : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200/70 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-750'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isRepeat ? 'В повторении' : 'Отправить на повторение'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggle(q.id)}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isCompleted
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-xs'
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
