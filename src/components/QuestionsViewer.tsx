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
      <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 liquid-glass">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 font-sans text-neutral-900 dark:text-white">
              Тренажёр вопросов к собеседованию
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium liquid-glass-pill text-neutral-700 dark:text-neutral-200">
              {questions.length} вопросов
            </span>
          </div>
          <p className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
            Реальные вопросы с интервью стажёров: пишите ответ, сверяйте с эталоном и тренируйте насмотренность.
          </p>
        </div>

        {/* View Mode Switcher: 3 Modes (Segmented Capsule Control) */}
        <div className="flex items-center p-1 rounded-full shrink-0 text-xs transition-colors liquid-glass-subtle">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('self_check');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all duration-150 active:scale-95 ${
              viewMode === 'self_check'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white'
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
                : 'text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white'
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
                : 'text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Карточки</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-[28px] sm:rounded-[32px] p-4 sm:p-5 space-y-3.5 transition-all duration-300 liquid-glass">
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросу, ключевому слову или коду..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-xs sm:text-sm transition-all focus:outline-none liquid-glass-subtle focus:bg-white/60 text-neutral-950 placeholder:text-neutral-600 dark:text-white dark:placeholder:text-neutral-400"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              Все ({questions.length})
            </button>
            <button
              onClick={() => setStatusFilter('repeat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                statusFilter === 'repeat'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-amber-800 dark:text-amber-300'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Повторить ({repeatCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-emerald-800 dark:text-emerald-300'
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
              selectedDirection === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                selectedDirection === dir.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              {dir.title.split('-')[0]}
            </button>
          ))}
        </div>

        {/* Row 3: Sub-tracks pills if direction chosen */}
        {selectedDirection !== 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-black/5 dark:border-white/5">
            <button
              onClick={() => setSelectedSubTrack('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                selectedSubTrack === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              Все ветки
            </button>
            {DIRECTIONS.find((d) => d.id === selectedDirection)?.subTracks.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSubTrack(st.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  selectedSubTrack === st.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
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
            <div className="p-8 text-center rounded-[32px] sm:rounded-[36px] transition-colors liquid-glass">
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-2 text-neutral-400 dark:text-neutral-500" />
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
                  className={`rounded-[28px] border transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/35 liquid-glass-interactive'
                      : isRepeat
                      ? 'bg-amber-500/10 border-amber-500/25 dark:bg-amber-500/15 dark:border-amber-500/35 liquid-glass-interactive'
                      : 'liquid-glass liquid-glass-interactive'
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
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                            {q.category}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">{q.difficulty}</span>
                          {isRepeat && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border
                              bg-amber-500/15 text-amber-800 border-amber-500/30
                              dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
                            >
                              В повторении
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold transition-colors font-sans
                          text-neutral-950 group-hover:text-black
                          dark:text-white dark:group-hover:text-neutral-100"
                        >
                          {q.title}
                        </h3>

                        <p className="text-xs mt-1.5 line-clamp-2 text-neutral-700 dark:text-neutral-300 font-normal">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-2 rounded-full transition-all duration-150 active:scale-95 shrink-0 liquid-glass-pill hover:bg-white/70 text-neutral-800 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t rounded-b-3xl space-y-4 border-black/5 dark:border-white/5 liquid-glass-subtle">
                      {/* Full Question text */}
                      <div className="p-3.5 rounded-2xl liquid-glass-pill text-xs leading-relaxed text-neutral-900">
                        <strong className="block mb-1 text-neutral-950 font-bold">Вопрос интервьюера:</strong>
                        {q.question}
                      </div>

                      {/* Code Snippet if present */}
                      {q.codeSnippet && (
                        <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-neutral-950 text-neutral-100 shadow-sm">
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
                        <div className="p-4 rounded-2xl liquid-glass-pill space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-neutral-900">
                              <PenTool className="w-3.5 h-3.5 text-neutral-700" />
                              Самопроверка: попробуйте ответить самостоятельно
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="text-[11px] font-semibold flex items-center gap-1 text-neutral-800 hover:text-neutral-950 transition-colors"
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
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none liquid-glass-subtle bg-white/40 focus:bg-white/70 text-neutral-950 placeholder:text-neutral-500 shadow-xs"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                setInlineChecked((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs bg-neutral-900 text-white hover:bg-black cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Сверить с эталоном</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userAnswer.trim() && (
                            <div className="p-3.5 rounded-2xl liquid-glass-pill text-xs shadow-xs">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[11px] uppercase tracking-wider text-neutral-800 font-bold">Ваш ответ:</strong>
                                <button
                                  type="button"
                                  onClick={() => setInlineChecked((prev) => ({ ...prev, [q.id]: false }))}
                                  className="text-[10px] font-bold flex items-center gap-1 text-neutral-800 hover:text-black transition-colors"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Изменить
                                </button>
                              </div>
                              <p className="whitespace-pre-wrap text-neutral-900 font-medium">{userAnswer}</p>
                            </div>
                          )}

                          {/* Detailed Answer */}
                          <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-neutral-900 text-xs sm:text-sm leading-relaxed shadow-xs">
                            <strong className="block mb-1.5 font-bold text-emerald-800">Развернутый эталонный ответ:</strong>
                            {q.answer}
                          </div>

                          {/* Key Takeaways */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider block text-neutral-800 dark:text-neutral-200">
                              Что важно запомнить:
                            </span>
                            <ul className="text-xs space-y-1 list-disc list-inside text-neutral-800 dark:text-neutral-200">
                              {q.keyTakeaways.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onMarkRepeat(q.id);
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer ${
                            isRepeat
                              ? 'bg-amber-500 text-white'
                              : 'liquid-glass-pill text-amber-800 hover:bg-amber-500/15'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isRepeat ? 'В повторении' : 'Повторить позже'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggle(q.id)}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer ${
                            isCompleted
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                              : 'liquid-glass-pill text-neutral-800 hover:bg-white/50 dark:text-neutral-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'Изучено ✓' : 'Отметить изученным'}</span>
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
